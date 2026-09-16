import { describe, expect, it } from 'vitest'
import {
  LONGUEUR_MOT, LONGUEUR_NOTE, filtrerMots, formeFautive, grouperParLettre, lettreDe, lireEntree, motValide, noteNettoyee, replier, trierMots,
} from './accentuation'

const mot = (m: string, faux_positif = false, note: string | null = null) => ({ mot: m, faux_positif, note })

describe('le mot qui s’enregistre', () => {
  it('compose en NFC, rogne les bords et réduit les blancs', () => {
    expect(motValide('  Élie ')).toBe('Élie')
    expect(motValide('Saint   Esprit')).toBe('Saint Esprit')
  })

  it('rend l’apostrophe typographique', () => {
    expect(motValide("Aujourd'hui")).toBe('Aujourd’hui')
  })

  it('admet une lettre seule, et le trait d’union', () => {
    expect(motValide('À')).toBe('À')
    expect(motValide('Ô')).toBe('Ô')
    expect(motValide('Saint-Esprit')).toBe('Saint-Esprit')
  })

  it('refuse ce qui n’est pas un mot', () => {
    expect(motValide('')).toBeNull()
    expect(motValide('   ')).toBeNull()
    expect(motValide('É3')).toBeNull()
    expect(motValide('-Élie')).toBeNull()
    expect(motValide('Élie.')).toBeNull()
    expect(motValide(42)).toBeNull()
    expect(motValide('É'.repeat(LONGUEUR_MOT + 1))).toBeNull()
    expect(motValide('É'.repeat(LONGUEUR_MOT))).toBe('É'.repeat(LONGUEUR_MOT))
  })
})

describe('la note', () => {
  it('rogne, et vaut null quand elle est vide', () => {
    expect(noteNettoyee('  Nom propre.  ')).toBe('Nom propre.')
    expect(noteNettoyee('   ')).toBeNull()
    expect(noteNettoyee(undefined)).toBeNull()
  })
})

describe('le corps d’une requête', () => {
  it('rend l’entrée, faux positif seulement s’il est dit vrai', () => {
    expect(lireEntree({ mot: 'Esther', faux_positif: true, note: ' Nom hébreu. ' }))
      .toEqual({ mot: 'Esther', faux_positif: true, note: 'Nom hébreu.' })
    expect(lireEntree({ mot: 'Élie', faux_positif: 'oui' })).toEqual({ mot: 'Élie', faux_positif: false, note: null })
  })

  it('rend une erreur lisible, sans rien tronquer', () => {
    expect(lireEntree({ mot: '' })).toHaveProperty('erreur')
    expect(lireEntree(null)).toHaveProperty('erreur')
    expect(lireEntree({ mot: 'Élie', note: 'x'.repeat(LONGUEUR_NOTE + 1) })).toHaveProperty('erreur')
    expect(lireEntree({ mot: 'Élie', note: 'x'.repeat(LONGUEUR_NOTE) })).not.toHaveProperty('erreur')
  })
})

describe('la forme fautive', () => {
  it('ôte l’accent de l’initiale, et d’elle seule', () => {
    expect(formeFautive('Élie')).toBe('Elie')
    expect(formeFautive('Évangéliste')).toBe('Evangéliste')
    expect(formeFautive('À')).toBe('A')
    expect(formeFautive('Îles')).toBe('Iles')
    expect(formeFautive('âme')).toBe('ame')
    expect(formeFautive('Ça')).toBe('Ca')
  })

  it('ouvre la ligature', () => {
    expect(formeFautive('Œuvre')).toBe('Oeuvre')
  })

  it('n’en a pas quand l’initiale n’a rien à perdre', () => {
    expect(formeFautive('Esther')).toBeNull()
    expect(formeFautive('')).toBeNull()
  })
})

describe('l’ordre alphabétique', () => {
  it('range l’initiale accentuée avec sa lettre, non après Z', () => {
    const tries = trierMots([mot('Zacharie'), mot('Élie'), mot('Ecce'), mot('Ève'), mot('Abel'), mot('Ôtez')]).map(m => m.mot)
    expect(tries).toEqual(['Abel', 'Ecce', 'Élie', 'Ève', 'Ôtez', 'Zacharie'])
  })

  it('range chaque mot sous sa lettre, ligature comprise', () => {
    expect(lettreDe('Élie')).toBe('E')
    expect(lettreDe('Œuvre')).toBe('O')
    expect(lettreDe('âme')).toBe('A')
    const groupes = grouperParLettre([mot('Ôtez'), mot('Élie'), mot('À'), mot('Esther'), mot('âme'), mot('Œuvre')])
    expect(groupes.map(g => [g.lettre, g.mots.map(m => m.mot)])).toEqual([
      ['A', ['À', 'âme']],
      ['E', ['Élie', 'Esther']],
      ['O', ['Œuvre', 'Ôtez']],
    ])
  })

  it('ne touche pas à la liste qu’on lui donne', () => {
    const liste = [mot('Zacharie'), mot('Abel')]
    trierMots(liste)
    expect(liste.map(m => m.mot)).toEqual(['Zacharie', 'Abel'])
  })
})

describe('la recherche', () => {
  const liste = [
    mot('Élie', false, 'Relevé dans la Cité de Dieu.'),
    mot('Égypte', false, 'Relevé dans la Segond 1910.'),
    mot('Esther', true, 'Nom propre hébreu. Relevé dans la Segond 1910.'),
    mot('Œuvre'),
  ]

  it('ignore les accents, la casse et la ligature', () => {
    expect(replier('Œuvre d’Élie')).toBe("oeuvre d'elie")
    expect(filtrerMots(liste, 'elie', 'tous').map(m => m.mot)).toEqual(['Élie'])
    expect(filtrerMots(liste, 'OEUV', 'tous').map(m => m.mot)).toEqual(['Œuvre'])
  })

  it('lit aussi la note', () => {
    expect(filtrerMots(liste, 'segond', 'tous').map(m => m.mot)).toEqual(['Égypte', 'Esther'])
  })

  it('borne au régime choisi', () => {
    expect(filtrerMots(liste, '', 'faux_positif').map(m => m.mot)).toEqual(['Esther'])
    expect(filtrerMots(liste, 'segond', 'accentuer').map(m => m.mot)).toEqual(['Égypte'])
    expect(filtrerMots(liste, '  ', 'tous')).toHaveLength(4)
  })
})
