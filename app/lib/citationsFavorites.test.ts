import { describe, expect, it } from 'vitest'
import {
  COLONNE_FAVORITE,
  LONGUEUR_MAX_TEXTE,
  PRELEVEMENTS_MAX,
  composerFavorites,
  couperAuMot,
  favoritePourEcriture,
  lireFavorite,
  oeuvresDesFavorites,
  prelevementsDesFavorites,
  textesDesFavorites,
  type CitationPreferee,
  type PrelevementDeFavorite,
} from './citationsFavorites'

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const INSECABLE = String.fromCharCode(0xa0)

function ligne(p: Partial<PrelevementDeFavorite> & { id: string; type: string }): PrelevementDeFavorite {
  return {
    ref_livre_abr: null, ref_chapitre: null, ref_verset: null, traduction: null,
    auteur: null, titre_oeuvre: null, id_oeuvre: null, id_texte: null, segment_numero: null,
    ref_niv1: null, ref_niv2: null,
    ...p,
  }
}

describe('les colonnes', () => {
  it('une par corpus', () => {
    expect(COLONNE_FAVORITE).toEqual({
      biblique: 'citation_favorite_biblique',
      patristique: 'citation_favorite_patristique',
    })
  })
})

describe('lireFavorite', () => {
  it('lit une favorite bien formée, le prélèvement qui la désigne en tête', () => {
    const lue = lireFavorite({ id: U(2), ids: [U(1), U(2), 'pas-un-uuid'], type: 'biblique', texte: 'Au commencement', traduction: '  Bible de Sacy ' }, 'biblique')
    expect(lue).toEqual({ id: U(2), ids: [U(2), U(1)], type: 'biblique', texte: 'Au commencement', traduction: 'Bible de Sacy' })
  })

  it('refuse ce qui n’a pas la forme attendue', () => {
    expect(lireFavorite(null, 'biblique')).toBeNull()
    expect(lireFavorite([], 'biblique')).toBeNull()
    expect(lireFavorite('texte', 'biblique')).toBeNull()
    expect(lireFavorite({ id: U(1), type: 'patristique', texte: 'x' }, 'biblique')).toBeNull()
    expect(lireFavorite({ id: '12', type: 'biblique', texte: 'x' }, 'biblique')).toBeNull()
    expect(lireFavorite({ id: U(1), type: 'biblique', texte: '   ' }, 'biblique')).toBeNull()
    expect(lireFavorite({ id: U(1), type: 'biblique' }, 'biblique')).toBeNull()
  })

  it('un choix ancien, sans liste de prélèvements, se désigne par son seul identifiant', () => {
    expect(lireFavorite({ id: U(7), type: 'patristique', texte: 'Tu nous as faits pour toi' }, 'patristique')?.ids).toEqual([U(7)])
  })
})

describe('favoritePourEcriture', () => {
  it('borne les prélèvements et les dédoublonne', () => {
    const ids = Array.from({ length: PRELEVEMENTS_MAX + 20 }, (_, i) => U(i + 1))
    const ecrite = favoritePourEcriture({ id: U(1), ids: [U(1), ...ids], type: 'biblique', texte: 'x' })
    expect(ecrite.ids).toHaveLength(PRELEVEMENTS_MAX)
    expect(ecrite.ids?.[0]).toBe(U(1))
  })

  it('borne le texte au dernier mot entier, et le dit', () => {
    const long = 'verbum '.repeat(400)
    const ecrite = favoritePourEcriture({ id: U(1), type: 'patristique', texte: long })
    expect(ecrite.texte.length).toBeLessThanOrEqual(LONGUEUR_MAX_TEXTE + 1)
    expect(ecrite.texte.endsWith('verbum…')).toBe(true)
  })

  it('n’écrit pas un champ vide', () => {
    const ecrite = favoritePourEcriture({ id: U(1), type: 'biblique', texte: 'x', ref: ' ', traduction: '' })
    expect(ecrite).toEqual({ id: U(1), ids: [U(1)], type: 'biblique', texte: 'x' })
  })
})

describe('couperAuMot', () => {
  it('laisse un texte assez court', () => {
    expect(couperAuMot('Au commencement était le Verbe', 80)).toBe('Au commencement était le Verbe')
  })

  it('coupe au dernier mot entier et retire la ponctuation pendante', () => {
    expect(couperAuMot('Au commencement était le Verbe, et le Verbe était auprès de Dieu', 31)).toBe('Au commencement était le Verbe')
  })

  it('ne coupe jamais à une insécable', () => {
    const texte = `Saint${INSECABLE}Augustin, évêque d’Hippone`
    expect(couperAuMot(texte, 10)).toBe(`Saint${INSECABLE}Augu`)
  })
})

describe('les prélèvements et les œuvres à relire', () => {
  it('réunit les prélèvements des deux favorites', () => {
    const favorites: (CitationPreferee | null)[] = [
      { id: U(1), ids: [U(1), U(2)], type: 'biblique', texte: 'a' },
      null,
      { id: U(9), type: 'patristique', texte: 'b' },
    ]
    expect(prelevementsDesFavorites(favorites)).toEqual([U(1), U(2), U(9)])
  })

  it('ne demande que les œuvres des passages patristiques', () => {
    expect(oeuvresDesFavorites([
      ligne({ id: U(1), type: 'patristique', id_oeuvre: 'A0010O0001' }),
      ligne({ id: U(2), type: 'patristique', id_oeuvre: 'A0010O0001' }),
      ligne({ id: U(3), type: 'biblique', id_oeuvre: 'A0000O0000' }),
    ])).toEqual(['A0010O0001'])
  })

  it('ne demande que les textes des passages patristiques qui en retiennent un', () => {
    expect(textesDesFavorites([
      ligne({ id: U(1), type: 'patristique', id_texte: 'A0010O0001T0001' }),
      ligne({ id: U(2), type: 'patristique', id_texte: 'A0010O0001T0001' }),
      ligne({ id: U(3), type: 'patristique' }),
      ligne({ id: U(4), type: 'biblique', id_texte: 'X' }),
    ])).toEqual(['A0010O0001T0001'])
  })
})

describe('composerFavorites — l’Écriture', () => {
  const versets = [
    ligne({ id: U(1), type: 'biblique', ref_livre_abr: 'Jn', ref_chapitre: 3, ref_verset: 16, traduction: 'Bible de Sacy' }),
    ligne({ id: U(2), type: 'biblique', ref_livre_abr: 'Jn', ref_chapitre: 3, ref_verset: 17, traduction: 'Bible de Sacy' }),
    ligne({ id: U(3), type: 'biblique', ref_livre_abr: 'Jn', ref_chapitre: 3, ref_verset: 18, traduction: 'Bible de Sacy' }),
  ]

  it('compose la plage par la règle du site, et mène au premier verset', () => {
    const fav: CitationPreferee = { id: U(1), ids: [U(1), U(2), U(3)], type: 'biblique', texte: 'Car Dieu a tant aimé le monde', traduction: 'Bible Crampon' }
    expect(composerFavorites([fav], versets, new Set())).toEqual([{
      type: 'biblique',
      texte: 'Car Dieu a tant aimé le monde',
      reference: 'Jean 3, 16-18',
      source: 'Bible Crampon',
      lieu: null,
      lien: '/?livre=JHN&chapitre=3&verset=16',
    }])
  })

  it('cite un psaume au singulier', () => {
    const psaume = ligne({ id: U(5), type: 'biblique', ref_livre_abr: 'Ps', ref_chapitre: 23, ref_verset: 1 })
    const [composee] = composerFavorites([{ id: U(5), type: 'biblique', texte: 'Le Seigneur est mon berger' }], [psaume], new Set())
    expect(composee.reference).toBe('Psaume 23, 1')
  })

  it('reprend la traduction du prélèvement, sauf quand elle n’en garde que le code', () => {
    const fav: CitationPreferee = { id: U(1), type: 'biblique', texte: 'x' }
    expect(composerFavorites([fav], [versets[0]], new Set())[0].source).toBe('Bible de Sacy')
    const codee = ligne({ ...versets[0], traduction: 'TR0003' })
    expect(composerFavorites([fav], [codee], new Set())[0].source).toBeNull()
  })

  it('ne montre pas une favorite dont le prélèvement a disparu', () => {
    const fav: CitationPreferee = { id: U(42), ids: [U(42), U(2)], type: 'biblique', texte: 'x' }
    expect(composerFavorites([fav], versets, new Set())).toEqual([])
  })

  it('garde la référence écrite quand le livre ne se reconnaît pas', () => {
    const inconnu = ligne({ id: U(8), type: 'biblique', ref_livre_abr: 'Zz', ref_chapitre: 1, ref_verset: 1 })
    const [composee] = composerFavorites([{ id: U(8), type: 'biblique', texte: 'x', ref: 'Zz 1, 1' }], [inconnu], new Set())
    expect(composee.reference).toBe('Zz 1, 1')
    expect(composee.lien).toBeNull()
  })
})

describe('composerFavorites — les Pères', () => {
  const passages = [
    ligne({ id: U(11), type: 'patristique', auteur: 'Augustin d’Hippone', titre_oeuvre: 'Les Confessions', id_oeuvre: 'A0010O0001', segment_numero: 4, ref_niv1: 'Livre premier[[12]]', ref_niv2: 'I' }),
    ligne({ id: U(12), type: 'patristique', auteur: 'Augustin d’Hippone', titre_oeuvre: 'Les Confessions', id_oeuvre: 'A0010O0001', segment_numero: 5, ref_niv1: 'Livre premier', ref_niv2: 'I' }),
  ]
  const fav: CitationPreferee = { id: U(11), ids: [U(11), U(12)], type: 'patristique', texte: 'Tu nous as faits pour toi' }

  it('nomme le Père, l’œuvre et le lieu, sans appel de note, et mène au segment', () => {
    expect(composerFavorites([fav], passages, new Set(['A0010O0001']))).toEqual([{
      type: 'patristique',
      texte: 'Tu nous as faits pour toi',
      reference: 'Augustin d’Hippone',
      source: 'Les Confessions',
      lieu: 'Livre premier, I',
      lien: '/oeuvre/A0010O0001#s4',
    }])
  })

  it('ne montre rien d’une œuvre retirée de la lecture', () => {
    expect(composerFavorites([fav], passages, new Set())).toEqual([])
  })

  describe('le texte du passage, qui est une édition à part entière', () => {
    const latins = passages.map(p => ({ ...p, id_texte: 'A0010O0001T0001' }))
    const ouvertes = new Set(['A0010O0001'])

    it('mène à l’édition du passage quand elle n’est pas celle par défaut', () => {
      const textes = new Map([['A0010O0001T0001', { is_default: false, is_public: true }]])
      expect(composerFavorites([fav], latins, ouvertes, textes)[0].lien).toBe('/oeuvre/A0010O0001?texte=A0010O0001T0001#s4')
    })

    it('garde l’adresse de l’œuvre pour son texte par défaut', () => {
      const textes = new Map([['A0010O0001T0001', { is_default: true, is_public: true }]])
      expect(composerFavorites([fav], latins, ouvertes, textes)[0].lien).toBe('/oeuvre/A0010O0001#s4')
    })

    it('ne montre rien d’un texte retiré de la lecture, ni d’un texte qu’on n’a pas pu lire', () => {
      const retire = new Map([['A0010O0001T0001', { is_default: false, is_public: false }]])
      expect(composerFavorites([fav], latins, ouvertes, retire)).toEqual([])
      expect(composerFavorites([fav], latins, ouvertes, new Map())).toEqual([])
      expect(composerFavorites([fav], latins, ouvertes)).toEqual([])
    })

    it('ne réunit pas un passage d’un autre texte de la même œuvre', () => {
      const melanges = [latins[0], { ...latins[1], id_texte: 'A0010O0001T0002', segment_numero: 2 }]
      const textes = new Map([['A0010O0001T0001', { is_default: false, is_public: true }]])
      expect(composerFavorites([fav], melanges, ouvertes, textes)[0].lien).toBe('/oeuvre/A0010O0001?texte=A0010O0001T0001#s4')
    })
  })

  it('tait un intitulé de niveau devenu sommaire', () => {
    const passage = ligne({
      id: U(13), type: 'patristique', auteur: 'Jean Chrysostome', titre_oeuvre: 'Homélies sur la Genèse',
      id_oeuvre: 'A0014O0004', segment_numero: 913, ref_niv1: 'Dixième homélie',
      ref_niv2: 'Quant à ce que dit l’écrivain sacré que « Dieu se reposa le septième jour », cela n’implique aucune contradiction avec cette parole de Jésus-Christ.',
    })
    const [composee] = composerFavorites([{ id: U(13), type: 'patristique', texte: 'x' }], [passage], new Set(['A0014O0004']))
    expect(composee.lieu).toBe('Dixième homélie')
  })

  it('pose l’Écriture avant les Pères, dans quelque ordre qu’on les donne', () => {
    const verset = ligne({ id: U(1), type: 'biblique', ref_livre_abr: 'Gn', ref_chapitre: 1, ref_verset: 1 })
    const composees = composerFavorites(
      [fav, { id: U(1), type: 'biblique', texte: 'Au commencement' }],
      [...passages, verset],
      new Set(['A0010O0001']),
    )
    expect(composees.map(c => c.type)).toEqual(['biblique', 'patristique'])
    expect(composees[0].reference).toBe('Genèse 1, 1')
  })
})
