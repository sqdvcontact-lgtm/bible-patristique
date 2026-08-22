import { describe, expect, it } from 'vitest'
import {
  analyserRequetePericope,
  filtrerCatalogue,
  normaliserRecherche,
  pericopeCouvre,
  premierePhraseNotice,
  trouverLivre,
} from './pericopesRecherche'
import type { PericopeCatalogueItem } from './pericopes'

// Le catalogue des péricopes se cherchait jusqu'ici par le seul titre : « Mt 5 »,
// « Matthieu » ou « psaume 22 » ne donnaient rien, alors que c'est ainsi qu'on
// cherche un passage biblique. Ces tests figent la lecture des références.

const item = (o: Partial<PericopeCatalogueItem> & { id: string }): PericopeCatalogueItem => ({
  nom: '', categorie: 'recit', est_collection: false, livre: 'MAT',
  canon_debut: 'MAT.1.1', canon_fin: null, appellations: [], notice_debut: '', ...o,
})

const CORPUS: PericopeCatalogueItem[] = [
  item({ id: 'a', nom: 'Sermon sur la montagne', livre: 'MAT', canon_debut: 'MAT.5.1', canon_fin: 'MAT.7.29', categorie: 'discours' }),
  item({ id: 'b', nom: 'Béatitudes', livre: 'MAT', canon_debut: 'MAT.5.3', canon_fin: 'MAT.5.12', categorie: 'discours' }),
  item({ id: 'c', nom: 'Le semeur', livre: 'MAT', canon_debut: 'MAT.13.1', canon_fin: 'MAT.13.23', categorie: 'parabole' }),
  item({ id: 'd', nom: 'Jonas et le grand poisson', livre: 'JON', canon_debut: 'JON.2.1', canon_fin: 'JON.2.11', appellations: ['Jonas et la baleine'] }),
  item({ id: 'e', nom: 'Le bon Pasteur', livre: 'JHN', canon_debut: 'JHN.10.1', canon_fin: 'JHN.10.21', categorie: 'discours' }),
  item({ id: 'f', nom: 'Le Bon Pasteur (psaume)', livre: 'PSA', canon_debut: 'PSA.22.1', canon_fin: 'PSA.22.6', categorie: 'psaume' }),
]

describe('normaliserRecherche', () => {
  it('ôte accents et casse, unifie l’apostrophe', () => {
    expect(normaliserRecherche('L’Échelle de Jacob')).toBe("l'echelle de jacob")
  })
})

describe('trouverLivre', () => {
  it('reconnaît le nom exact et l’abréviation', () => {
    expect(trouverLivre('Matthieu')).toBe('MAT')
    expect(trouverLivre('Mt')).toBe('MAT')
    expect(trouverLivre('jn')).toBe('JHN')
    expect(trouverLivre('1 S')).toBe('1SA')
    expect(trouverLivre('1S')).toBe('1SA')
  })
  it('reconnaît un préfixe d’au moins trois lettres', () => {
    expect(trouverLivre('gen')).toBe('GEN')
    expect(trouverLivre('matth')).toBe('MAT')
    expect(trouverLivre('apoc')).toBe('REV')
  })
  it('sur un préfixe ambigu, retient le nom le plus court', () => {
    // « Psaumes », « Psaume 151 » et « Psaumes de Salomon » commencent tous par là.
    expect(trouverLivre('psaume')).toBe('PSA')
  })
  it('refuse un préfixe trop court ou inconnu', () => {
    expect(trouverLivre('jo')).toBeNull()
    expect(trouverLivre('sermon')).toBeNull()
    expect(trouverLivre('')).toBeNull()
  })
})

describe('analyserRequetePericope', () => {
  it('lit « Mt 5 », « Matthieu 5, 3 », « Jn 3.16 »', () => {
    expect(analyserRequetePericope('Mt 5')).toMatchObject({ livre: 'MAT', chapitre: 5, verset: null, texte: '' })
    expect(analyserRequetePericope('Matthieu 5, 3')).toMatchObject({ livre: 'MAT', chapitre: 5, verset: 3 })
    expect(analyserRequetePericope('Jn 3.16')).toMatchObject({ livre: 'JHN', chapitre: 3, verset: 16 })
    expect(analyserRequetePericope('psaume 22')).toMatchObject({ livre: 'PSA', chapitre: 22 })
  })
  it('un nom de livre seul donne le livre SANS chapitre, et reste du texte', () => {
    expect(analyserRequetePericope('Jonas')).toMatchObject({ livre: 'JON', chapitre: null, texte: 'jonas' })
  })
  it('laisse le texte libre intact quand rien n’est reconnu', () => {
    expect(analyserRequetePericope('le semeur')).toMatchObject({ livre: null, chapitre: null, texte: 'le semeur' })
  })
  it('ne prend pas un chiffre isolé pour une référence', () => {
    expect(analyserRequetePericope('22')).toMatchObject({ livre: null, chapitre: null })
  })
})

describe('pericopeCouvre', () => {
  const sermon = CORPUS[0]
  it('couvre les chapitres de la plage', () => {
    expect(pericopeCouvre(sermon, 5, null)).toBe(true)
    expect(pericopeCouvre(sermon, 6, null)).toBe(true)
    expect(pericopeCouvre(sermon, 7, null)).toBe(true)
    expect(pericopeCouvre(sermon, 8, null)).toBe(false)
  })
  it('borne au verset près aux deux extrémités', () => {
    expect(pericopeCouvre(CORPUS[1], 5, 3)).toBe(true)
    expect(pericopeCouvre(CORPUS[1], 5, 12)).toBe(true)
    expect(pericopeCouvre(CORPUS[1], 5, 2)).toBe(false)
    expect(pericopeCouvre(CORPUS[1], 5, 13)).toBe(false)
  })
})

describe('filtrerCatalogue', () => {
  const rien = new Set<string>()
  it('sans requête ni case, rend tout', () => {
    expect(filtrerCatalogue(CORPUS, '', rien, rien).items).toHaveLength(CORPUS.length)
  })
  it('une référence chiffrée ne rend que le passage visé', () => {
    const r = filtrerCatalogue(CORPUS, 'Mt 5', rien, rien)
    expect(r.items.map(i => i.id)).toEqual(['a', 'b'])
    expect(r.reference).toMatchObject({ livre: 'MAT', chapitre: 5 })
  })
  it('une référence au verset resserre encore', () => {
    expect(filtrerCatalogue(CORPUS, 'Mt 5, 20', rien, rien).items.map(i => i.id)).toEqual(['a'])
  })
  it('un nom de livre réunit le livre et les titres qui le portent', () => {
    // « Jonas » est un livre ET le héros du récit : les deux doivent venir.
    expect(filtrerCatalogue(CORPUS, 'Jonas', rien, rien).items.map(i => i.id)).toEqual(['d'])
    expect(filtrerCatalogue(CORPUS, 'Jean', rien, rien).items.map(i => i.id)).toEqual(['e'])
  })
  it('trouve par appellation et note laquelle', () => {
    const r = filtrerCatalogue(CORPUS, 'baleine', rien, rien)
    expect(r.items.map(i => i.id)).toEqual(['d'])
    expect(r.via.d).toBe('Jonas et la baleine')
  })
  it('les cases restreignent la recherche', () => {
    expect(filtrerCatalogue(CORPUS, 'pasteur', rien, new Set(['psaume'])).items.map(i => i.id)).toEqual(['f'])
    expect(filtrerCatalogue(CORPUS, '', new Set(['NT']), rien).items.map(i => i.id)).toEqual(['a', 'b', 'c', 'e'])
  })
  it('ne garde pas une note « trouvé via » sur un item écarté par une case', () => {
    const r = filtrerCatalogue(CORPUS, 'baleine', new Set(['NT']), rien)
    expect(r.items).toHaveLength(0)
    expect(r.via).toEqual({})
  })
})

describe('premierePhraseNotice', () => {
  it('coupe à la première phrase', () => {
    expect(premierePhraseNotice('Jésus conclut le Sermon. La pluie tombe, les torrents viennent.'))
      .toBe('Jésus conclut le Sermon.')
  })
  it('ne coupe pas sur une abréviation ni sur une initiale', () => {
    expect(premierePhraseNotice('Le passage, cf. Mt 5, ouvre le discours. Puis vient la suite.'))
      .toBe('Le passage, cf. Mt 5, ouvre le discours.')
    expect(premierePhraseNotice('Elle cite J. Chrysostome ici. Puis elle conclut.'))
      .toBe('Elle cite J. Chrysostome ici.')
  })
  it('plafonne au dernier mot entier et pose des points de suspension', () => {
    const long = premierePhraseNotice('Aux chênes de Mambré, Abraham accueille trois visiteurs au moment le plus chaud du jour et leur offre un repas.', 40)
    expect(long.endsWith('…')).toBe(true)
    expect(long.length).toBeLessThanOrEqual(41)
    expect(long).not.toMatch(/ …$/)
  })
  it('rend une chaîne vide sur une notice absente', () => {
    expect(premierePhraseNotice(null)).toBe('')
    expect(premierePhraseNotice('   ')).toBe('')
  })
})
