import { describe, it, expect } from 'vitest'
import {
  composerSegments,
  detailsRefBiblique,
  extraireVersets,
  extraireVersetsAvecNature,
  grouper,
  indexerVersetsCites,
  numerotationLocale,
  segmentAffichable,
  versetsDuSegment,
  type ContexteProjection,
  type SegmentBrut,
} from './pipelineSegments'

// Un segment écrit court : seuls les champs qui comptent pour le cas éprouvé.
const seg = (p: Partial<SegmentBrut> & { id: number }): SegmentBrut => ({
  id_texte: 'T', segment_key: `k${p.id}`, segment_numero: p.id, segment_texte: 'texte',
  ref_niv1: null, ref_niv2: null, ref_niv3: null, ref_niv4: null, ref_niv5: null,
  ref_niv1_texte: null, ref_niv2_texte: null, ref_niv3_texte: null, ref_niv4_texte: null,
  lien_1: null, lien_2: null, lien_3: null, lien_4: null,
  nature: 'texte', paragraphe: null, rang: null, texte_original: null,
  espace_textuel: null, join_before: null,
  alinea: null, strophe_avant: null, numero_verset: null, forme: null,
  cle_original: null, ouvrage_id: null,
  ...p,
})

describe('extraireVersetsAvecNature', () => {
  it('dédoublonne un verset visé deux fois, et cumule ses natures', () => {
    // Le cas de l'arbitrage n°17 : un verset CITÉ puis COMMENTÉ.
    const v = extraireVersetsAvecNature(seg({ id: 1, lien_1: 'JHN.1.1', lien_3: 'JHN.1.1' }))
    expect(v).toEqual([{ id: 'JHN.1.1', natures: ['citation', 'doctrine'] }])
  })

  it('garde l’ordre de première rencontre, colonne par colonne', () => {
    const v = extraireVersetsAvecNature(seg({ id: 1, lien_1: 'B;A', lien_2: 'C' }))
    expect(v.map(x => x.id)).toEqual(['B', 'A', 'C'])
  })

  it('ne répète pas une nature qu’un verset porte déjà', () => {
    const v = extraireVersetsAvecNature(seg({ id: 1, lien_1: 'A;A' }))
    expect(v).toEqual([{ id: 'A', natures: ['citation'] }])
  })

  it('ignore les blancs et les séparateurs vides', () => {
    expect(extraireVersets(seg({ id: 1, lien_1: ' ; A ;; ' }))).toEqual(['A'])
    expect(extraireVersets(seg({ id: 1 }))).toEqual([])
  })
})

describe('segmentAffichable', () => {
  it('écarte un séparateur, quoi qu’il porte', () => {
    expect(segmentAffichable(seg({ id: 1, nature: 'separateur' }))).toBe(false)
  })

  it('garde un segment SANS TEXTE qui porte un lien biblique', () => {
    // Le volet de droite a alors de quoi répondre : la rangée n'est pas vide.
    expect(segmentAffichable(seg({ id: 1, segment_texte: '   ', lien_1: 'JHN.1.1' }))).toBe(true)
  })

  it('écarte une rubrique vraiment vide', () => {
    expect(segmentAffichable(seg({ id: 1, segment_texte: '  ' }))).toBe(false)
  })
})

describe('numerotationLocale', () => {
  it('REMET LE COMPTEUR À ZÉRO à chaque division', () => {
    // ⛔ C'est la divergence qui a motivé ce module : le client comptait d'un bout à
    // l'autre de ce qu'il avait chargé, si bien qu'un « § 1 » du second livre s'annonçait
    // « § 3 » dès qu'on chargeait les deux.
    const ordinaux = numerotationLocale([
      seg({ id: 1, ref_niv1: 'Livre I' }),
      seg({ id: 2, ref_niv1: 'Livre I' }),
      seg({ id: 3, ref_niv1: 'Livre II' }),
      seg({ id: 4, ref_niv1: 'Livre II' }),
    ])
    expect([...ordinaux.values()]).toEqual([1, 2, 1, 2])
  })

  it('n’indexe ni les introductions ni les séparateurs', () => {
    const ordinaux = numerotationLocale([
      seg({ id: 1, nature: 'introduction' }),
      seg({ id: 2 }),
      seg({ id: 3, nature: 'separateur' }),
      seg({ id: 4 }),
    ])
    expect(ordinaux.get(1)).toBeUndefined()
    expect(ordinaux.get(3)).toBeUndefined()
    expect(ordinaux.get(2)).toBe(1)
    expect(ordinaux.get(4)).toBe(2)
  })
})

describe('grouper', () => {
  it('réunit les segments qui partagent leurs quatre niveaux', () => {
    const g = grouper([
      seg({ id: 1, ref_niv1: 'I', ref_niv2: 'A' }),
      seg({ id: 2, ref_niv1: 'I', ref_niv2: 'A' }),
      seg({ id: 3, ref_niv1: 'I', ref_niv2: 'B' }),
    ])
    expect(g.map(x => x.itemIds)).toEqual([[1, 2], [3]])
    expect(g.map(x => x.anchor)).toEqual(['g0', 'g1'])
  })

  it('prend le préfixe d’ancre de sa surface', () => {
    // Corps et apparat vivent dans le MÊME document : leurs ancres ne peuvent pas se
    // heurter.
    expect(grouper([seg({ id: 1 })], 'a')[0].anchor).toBe('a0')
  })

  it('laisse les introductions hors des groupes', () => {
    const g = grouper([seg({ id: 1, nature: 'introduction' }), seg({ id: 2 })])
    expect(g).toHaveLength(1)
    expect(g[0].itemIds).toEqual([2])
  })

  it('ne rend aucun groupe quand rien n’est affichable', () => {
    expect(grouper([seg({ id: 1, nature: 'separateur' })])).toEqual([])
  })
})

describe('detailsRefBiblique', () => {
  it('compose « Jn 4, 1 » depuis « JHN 4:1 »', () => {
    // ⚠️ L'ABRÉVIATION, non le nom entier : c'est `ABREV_FR` que la fonction consulte,
    // et le volet de droite compose des étiquettes courtes.
    expect(detailsRefBiblique('JHN 4:1')).toEqual({ label: 'Jn 4, 1', livre: 'JHN', chapitre: '4', verset: '1' })
  })

  it('rend le chapitre seul quand il n’y a pas de verset', () => {
    expect(detailsRefBiblique('JHN 4').label).toBe('Jn 4')
  })

  it('garde le code du livre quand il est inconnu du canon', () => {
    expect(detailsRefBiblique('ZZZ 1:2').label).toBe('ZZZ 1, 2')
  })

  it('rend la chaîne telle quelle si elle n’a pas la forme attendue', () => {
    expect(detailsRefBiblique('bizarre')).toEqual({ label: 'bizarre', livre: '', chapitre: '', verset: '' })
  })
})

describe('indexerVersetsCites', () => {
  it('RETOMBE SUR L’IDENTIFIANT quand la ligne n’a pas de référence', () => {
    // ⛔ La régression qui a motivé ce module : `detailsRefBiblique` appelle `trim()`, et
    // une ligne sans `ref` fermait la division. Le repli n'existait que côté serveur.
    const table = indexerVersetsCites([{ id_verset: 'JHN.1.1', ref: null }], [])
    expect(table['JHN.1.1'].label).toBe('JHN.1.1')
  })

  it('range le texte de chaque traduction demandée', () => {
    const table = indexerVersetsCites(
      [{ id_verset: 'JHN.1.1', ref: 'JHN 1:1', TR0001: 'Au commencement' }],
      ['TR0001', 'TR0002'],
    )
    expect(table['JHN.1.1'].textes).toEqual({ TR0001: 'Au commencement', TR0002: '' })
  })
})

describe('versetsDuSegment', () => {
  it('donne une étiquette de repli à un verset qu’on n’a pas chargé', () => {
    const v = versetsDuSegment(seg({ id: 1, lien_1: 'JHN.1.1' }), {})
    expect(v[0]).toMatchObject({ id: 'JHN.1.1', label: 'JHN.1.1', textes: {} })
  })
})

describe('composerSegments', () => {
  const contexte: Omit<ContexteProjection, 'ordinaux'> = {
    versetsCites: {},
    notes: {},
    notesOriginal: {},
    projeterAppels: t => t,
    projeterAppelsOriginal: t => t,
  }

  it('projette, groupe et numérote d’un seul tenant', () => {
    const { segments, groupes } = composerSegments([
      seg({ id: 1, ref_niv1: 'I', segment_texte: 'un' }),
      seg({ id: 2, ref_niv1: 'I', segment_texte: 'deux' }),
      seg({ id: 3, nature: 'separateur' }),
    ], contexte)
    expect(segments.map(s => s.numero)).toEqual([1, 2])
    expect(groupes).toHaveLength(1)
    expect(groupes[0].itemIds).toEqual([1, 2])
  })

  it('rend son NUMÉRO DE SOURCE à une introduction, que la numérotation locale ignore', () => {
    const { segments } = composerSegments([
      seg({ id: 7, segment_numero: 7, nature: 'introduction' }),
      seg({ id: 8, segment_numero: 8 }),
    ], contexte)
    expect(segments.map(s => [s.nature, s.numero])).toEqual([['introduction', 7], ['texte', 1]])
  })

  it('ne pose une notice bibliographique QUE si la surface en veut', () => {
    const brut = [seg({ id: 1, ouvrage_id: '42' })]
    expect(composerSegments(brut, contexte).segments[0].ouvrageId).toBeUndefined()
    expect(composerSegments(brut, { ...contexte, avecOuvrage: true }).segments[0].ouvrageId).toBe(42)
  })

  it('lit les notes structurées par clé de segment, et retombe sur la colonne libre', () => {
    const { segments } = composerSegments([
      seg({ id: 1, segment_key: 'k1' }),
      seg({ id: 2, segment_key: 'k2', notes: '(1) une note libre' }),
    ], { ...contexte, notes: { k1: { '1': 'structurée' } as never } })
    expect(segments[0].notes).toEqual({ '1': 'structurée' })
    expect(Object.keys(segments[1].notes ?? {})).toHaveLength(1)
  })

  it('ne projette l’original que s’il y en a un', () => {
    const { segments } = composerSegments([
      seg({ id: 1 }),
      seg({ id: 2, texte_original: 'in principio', cle_original: 'o2' }),
    ], contexte)
    expect(segments[0].texteOriginalAffichage).toBeUndefined()
    expect(segments[1].texteOriginalAffichage).toBe('in principio')
  })
})

describe('grouper — la projection des CHAMPS DE TITRE', () => {
  const groupeDeux = [
    seg({ id: 1, segment_key: 'a', ref_niv1: 'Premier discours', ref_niv1_texte: 'Sur la Genèse' }),
    seg({ id: 2, segment_key: 'b', ref_niv1: 'Premier discours', ref_niv1_texte: 'Sur la Genèse' }),
  ]

  it('pose l’appel À CÔTÉ du titre, jamais à sa place', () => {
    const [g] = grouper(groupeDeux, 'g', { projeterTitre: (t, _c, champ) => (champ === 'niv1' ? `${t}[[7]]` : t) })
    // ⛔ Le titre CANONIQUE ne bouge pas : c'est lui que la navigation compare.
    expect(g.niv1).toBe('Premier discours')
    expect(g.titresAffichage).toEqual({ niv1: 'Premier discours[[7]]' })
  })

  it('cherche les ancres dans TOUS les segments du groupe, non dans le premier', () => {
    // Le cas des Discours sur la Genèse : l'ancre du chapeau tombe plus loin.
    const vues: string[][] = []
    grouper(groupeDeux, 'g', { projeterTitre: (t, cles) => { vues.push([...cles]); return t } })
    expect(vues[0]).toEqual(['a', 'b'])
  })

  it('ne pose rien quand la projection ne change rien', () => {
    const [g] = grouper(groupeDeux, 'g', { projeterTitre: t => t })
    expect(g.titresAffichage).toBeUndefined()
  })

  it('sans projection, le groupe est celui d’avant', () => {
    const [g] = grouper(groupeDeux)
    expect(g.titresAffichage).toBeUndefined()
    expect(g.niv1).toBe('Premier discours')
  })
})
