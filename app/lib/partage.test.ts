import { describe, it, expect } from 'vitest'
import {
  ligneDePartage, sujetEnClair, messagePartage, adressePartage, CANAUX, MARQUE_PARTAGE,
} from './partage'
import { NOM_SITE } from './metadonneesSeo'

// ⚠️ Le tiret de la ligne est un CADRATIN (U+2014) encadré d'espaces ordinaires. Il
// est repris ici sur la sortie de la fonction, jamais tapé dans une attente : une
// espace insécable glissée à sa place ne se verrait pas, et ferait échouer un test
// sans dire pourquoi (charte, § édition de fichiers).
const TETE = ligneDePartage({ genre: 'page', titre: 'X' }).slice(0, -1)

describe('la ligne de partage', () => {
  it('nomme la maison, puis qui, puis quoi', () => {
    expect(ligneDePartage({ genre: 'oeuvre', auteur: 'Augustin d’Hippone', titre: 'Les Confessions' }))
      .toBe(`${TETE}Augustin d’Hippone, Les Confessions`)
  })

  it('ouvre par la marque et le cadratin', () => {
    expect(TETE).toBe(`${MARQUE_PARTAGE} — `)
  })

  it('commence au titre quand l’œuvre est anonyme — jamais sur une virgule orpheline', () => {
    expect(ligneDePartage({ genre: 'oeuvre', titre: 'La Règle du Maître' }))
      .toBe(`${TETE}La Règle du Maître`)
    expect(ligneDePartage({ genre: 'oeuvre', titre: 'La Règle du Maître', auteur: '  ' }))
      .toBe(`${TETE}La Règle du Maître`)
  })

  it('garde la même forme d’une surface à l’autre', () => {
    expect(sujetEnClair({ genre: 'chapitre', livre: 'Jean', chapitre: 1 })).toBe('Jean, chapitre 1')
    expect(sujetEnClair({ genre: 'verset', reference: 'Jean 1, 14' })).toBe('Jean 1, 14')
    expect(sujetEnClair({ genre: 'auteur', nom: 'Augustin d’Hippone' })).toBe('Augustin d’Hippone')
    expect(sujetEnClair({ genre: 'essai', auteur: 'Marie Durand', titre: 'Le silence de Dieu' }))
      .toBe('Marie Durand, Le silence de Dieu')
  })

  it('met la référence d’une péricope entre parenthèses, ses virgules étant prises', () => {
    expect(sujetEnClair({ genre: 'pericope', nom: 'Les noces de Cana', reference: 'Jean 2, 1-11' }))
      .toBe('Les noces de Cana (Jean 2, 1-11)')
    expect(sujetEnClair({ genre: 'pericope', nom: 'Les noces de Cana' }))
      .toBe('Les noces de Cana')
  })

  it('resserre les blancs, d’où qu’ils viennent', () => {
    expect(sujetEnClair({ genre: 'oeuvre', auteur: ' Boèce ', titre: 'La\n  Consolation ' }))
      .toBe('Boèce, La Consolation')
  })

  it('rend le nom du site en toutes lettres plutôt qu’une marque suivie de rien', () => {
    expect(ligneDePartage({ genre: 'page', titre: '   ' })).toBe(NOM_SITE)
    expect(ligneDePartage({ genre: 'oeuvre', titre: '' })).toBe(NOM_SITE)
  })
})

describe('les canaux', () => {
  const ligne = 'CS — Boèce, La Consolation de la philosophie'
  const url = 'https://corpus-scriptura.fr/oeuvre/A0064O0001?edition=2'

  it('ne s’ouvrent pas tous : copier et la feuille système sont des gestes', () => {
    expect(adressePartage('lien', ligne, url)).toBeNull()
    expect(adressePartage('natif', ligne, url)).toBeNull()
  })

  it('emportent la ligne ET l’adresse, chacun à sa façon', () => {
    const courriel = adressePartage('courriel', ligne, url)!
    expect(courriel.startsWith('mailto:?subject=')).toBe(true)
    expect(decodeURIComponent(courriel.split('subject=')[1].split('&')[0])).toBe(ligne)
    expect(decodeURIComponent(courriel.split('body=')[1])).toBe(messagePartage(ligne, url))

    expect(decodeURIComponent(adressePartage('whatsapp', ligne, url)!.split('text=')[1]))
      .toBe(messagePartage(ligne, url))

    const x = adressePartage('x', ligne, url)!
    expect(decodeURIComponent(x.split('text=')[1].split('&')[0])).toBe(ligne)
    expect(decodeURIComponent(x.split('url=')[1])).toBe(url)

    const telegram = adressePartage('telegram', ligne, url)!
    expect(decodeURIComponent(telegram.split('url=')[1].split('&')[0])).toBe(url)
    expect(decodeURIComponent(telegram.split('text=')[1])).toBe(ligne)
  })

  it('n’envoie que l’adresse à Facebook, qui refuse tout texte prérempli', () => {
    const facebook = adressePartage('facebook', ligne, url)!
    expect(facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
    expect(facebook).not.toContain('Bo%C3%A8ce')
  })

  it('échappe l’adresse : une chaîne de requête ne doit pas couper la sienne', () => {
    const avecParametres = 'https://corpus-scriptura.fr/?livre=JHN&chapitre=1'
    for (const { cle } of CANAUX) {
      const adresse = adressePartage(cle, ligne, avecParametres)
      if (adresse === null) continue
      expect(adresse).toContain(encodeURIComponent(avecParametres))
      // ⛔ Le « & » de l'adresse partagée ne paraît jamais nu : il ouvrirait un
      // paramètre du partageur, et l'adresse arriverait tronquée à « ?livre=JHN ».
      expect(adresse.split('?')[1]).not.toContain('livre=JHN&chapitre')
    }
  })

  it('range le lien nu en tête, et la feuille système en queue', () => {
    expect(CANAUX[0].cle).toBe('lien')
    expect(CANAUX[CANAUX.length - 1].cle).toBe('natif')
    expect(new Set(CANAUX.map(c => c.cle)).size).toBe(CANAUX.length)
  })
})
