import { describe, expect, it } from 'vitest'
import {
  blocsBilingues,
  choisirEnsembleBilingue,
  joindreSegmentsOriginaux,
  originalEnRegard,
  bornesDesGroupes,
  projeterBilingue,
  type MembreAlignement,
  type SegmentOriginal,
} from './bilingueAlignement'
import { FORME_VERS } from '@/app/lib/compositionVers'

const FR = 'A0012O0002T0002'
const GREC = 'A0012O0002T0001'

function membre(alignmentId: string, idTexte: string, cle: string, ordre = 1): MembreAlignement {
  return {
    alignment_id: alignmentId,
    role: idTexte === GREC ? 'reference' : 'aligned',
    member_order: ordre,
    id_texte: idTexte,
    segment_key: cle,
  }
}

function segmentGrec(cle: string, texte: string, nature: string | null = 'texte', joinBefore: string | null = null): SegmentOriginal {
  return { segment_key: cle, segment_texte: texte, nature, join_before: joinBefore }
}

/**
 * Un vers de la colonne originale.
 *
 * ⛔ La poésie se déclare par sa FORME, jamais par sa nature : `nature = 'vers'` est
 * sortie du vocabulaire le 29 août 2026. Un segment d'apparat vaut déjà
 * `apparat_critique` et ne peut pas dire en plus qu'il est en vers.
 */
function versGrec(cle: string, texte: string, joinBefore: string | null = null): SegmentOriginal {
  return { segment_key: cle, segment_texte: texte, nature: 'texte', join_before: joinBefore, forme: FORME_VERS }
}

describe('choix de l’ensemble d’alignement', () => {
  const paragraphe = { alignmentSetId: 'P', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'paragraph' }
  const division = { alignmentSetId: 'D', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'division' }
  const segment = { alignmentSetId: 'S', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'segment' }

  it('préfère le paragraphe à la division, quel que soit l’ordre de chargement', () => {
    expect(choisirEnsembleBilingue([division, paragraphe], FR, GREC)?.alignmentSetId).toBe('P')
    expect(choisirEnsembleBilingue([paragraphe, division], FR, GREC)?.alignmentSetId).toBe('P')
  })

  it('se rabat sur le segment avant la division', () => {
    expect(choisirEnsembleBilingue([division, segment], FR, GREC)?.alignmentSetId).toBe('S')
  })

  it('reconnaît l’ensemble quel que soit le sens des deux faces', () => {
    const inverse = { alignmentSetId: 'I', referenceTextId: FR, alignedTextId: GREC, alignmentLevel: 'paragraph' }
    expect(choisirEnsembleBilingue([inverse], FR, GREC)?.alignmentSetId).toBe('I')
  })

  // Boèce confronte DEUX traductions françaises : cet alignement-là n'a rien à mettre
  // dans une colonne de langue originale, et le retenir y aurait versé du français.
  it('écarte un alignement qui ne touche pas le texte en langue originale', () => {
    const entreTraductions = { alignmentSetId: 'X', referenceTextId: 'MIRANDOL', alignedTextId: 'CERIZIERS', alignmentLevel: 'segment' }
    expect(choisirEnsembleBilingue([entreTraductions], FR, GREC)).toBeNull()
  })

  // ⛔ Le cas de la Doctrine des Apôtres, relevé le 2026-08-25 sur une capture de son
  // chapitre III : l'ensemble ÉTIQUETÉ `division` est celui qui apparie les sections
  // numérotées de Funk une à une (100 groupes), et celui étiqueté `paragraph` en réunit
  // jusqu'à cinq contre cinq (57). Croire l'étiquette retenait le plus grossier, et
  // trois sections grecques paraissaient en regard d'une seule phrase française — le
  // reste de la colonne restant blanc.
  it('retient le plus FIN, quelle que soit l’étiquette de niveau', () => {
    const sections = { alignmentSetId: 'SECTION', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'division', nbGroupes: 100 }
    const paragraphes = { alignmentSetId: 'PARAGRAPH', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'paragraph', nbGroupes: 57 }
    expect(choisirEnsembleBilingue([paragraphes, sections], FR, GREC)?.alignmentSetId).toBe('SECTION')
    expect(choisirEnsembleBilingue([sections, paragraphes], FR, GREC)?.alignmentSetId).toBe('SECTION')
  })

  it('revient à l’étiquette quand la finesse est égale', () => {
    const a = { alignmentSetId: 'D', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'division', nbGroupes: 40 }
    const b = { alignmentSetId: 'P', referenceTextId: GREC, alignedTextId: FR, alignmentLevel: 'paragraph', nbGroupes: 40 }
    expect(choisirEnsembleBilingue([a, b], FR, GREC)?.alignmentSetId).toBe('P')
  })

  // La finesse n'est comptée que lorsque plusieurs alignements se disputent la même
  // paire de textes : partout ailleurs elle est absente, et l'ancien classement doit
  // rendre exactement ce qu'il rendait.
  it('revient à l’étiquette quand la finesse est inconnue', () => {
    expect(choisirEnsembleBilingue([division, paragraphe], FR, GREC)?.alignmentSetId).toBe('P')
    const connu = { ...division, nbGroupes: 12 }
    expect(choisirEnsembleBilingue([connu, paragraphe], FR, GREC)?.alignmentSetId).toBe('D')
  })
})

describe('jonction des segments originaux', () => {
  it('suit `join_before` en prose, et l’espace à défaut', () => {
    expect(joindreSegmentsOriginaux([
      { texte: 'Ὁδοὶ δύο εἰσί', joinBefore: null, estVers: false },
      { texte: 'μία τῆς ζωῆς', joinBefore: ', ', estVers: false },
    ])).toBe('Ὁδοὶ δύο εἰσί, μία τῆς ζωῆς')
  })

  // Un poème joint par des espaces se justifierait en prose pendant que le français
  // d'en face resterait en vers : les deux colonnes cesseraient de dire la même chose.
  it('joint les vers par un saut de ligne, sans égard pour `join_before`', () => {
    expect(joindreSegmentsOriginaux([
      { texte: 'Carmina qui quondam', joinBefore: null, estVers: true },
      { texte: 'flebilis heu maestos', joinBefore: ' ', estVers: true },
    ])).toBe('Carmina qui quondam\nflebilis heu maestos')
  })

  it('rend un segment seul tel quel', () => {
    expect(joindreSegmentsOriginaux([{ texte: 'seul', joinBefore: ', ', estVers: false }])).toBe('seul')
  })

  // La colonne originale rendait le JETON `space` en toutes lettres au milieu du latin
  // de Zycha (« gignerent?spacenon enim et Adam ipse »). `join_before` est une
  // instruction, elle ne se concatène jamais telle quelle.
  it('matérialise le jeton `space` au lieu de l’imprimer', () => {
    const texte = joindreSegmentsOriginaux([
      { texte: 'ut multos gignerent?', joinBefore: null, estVers: false },
      { texte: 'non enim et Adam ipse…', joinBefore: 'space', estVers: false },
    ])
    expect(texte).toBe('ut multos gignerent? non enim et Adam ipse…')
    expect(texte).not.toContain('gignerent?spacenon')
    expect(texte).not.toContain('space')
  })
})

describe('projection bilingue', () => {
  const base = {
    idTexteTraduit: FR,
    idTexteOriginal: GREC,
  }

  it('rassemble sous un même groupe les segments des deux textes', () => {
    const projection = projeterBilingue({
      ...base,
      membres: [
        membre('g1', GREC, 'el-1', 1),
        membre('g1', GREC, 'el-2', 2),
        membre('g1', FR, 'fr-1', 1),
        membre('g1', FR, 'fr-2', 2),
      ],
      segmentsOriginaux: [segmentGrec('el-1', 'Ὁδοὶ δύο'), segmentGrec('el-2', 'εἰσί', 'texte', ' ')],
    })
    expect(projection.groupeParCle.get('fr-1')).toBe('g1')
    expect(projection.groupeParCle.get('fr-2')).toBe('g1')
    expect(projection.blocParGroupe.get('g1')?.texte).toBe('Ὁδοὶ δύο εἰσί')
  })

  // `member_order` fait foi, et l'ordre des lignes rendues par PostgREST n'est pas
  // garanti : sans tri, l'original d'un groupe se composait à l'envers.
  it('rétablit l’ordre des segments originaux depuis `member_order`', () => {
    const projection = projeterBilingue({
      ...base,
      membres: [
        membre('g1', GREC, 'el-2', 2),
        membre('g1', GREC, 'el-1', 1),
        membre('g1', FR, 'fr-1', 1),
      ],
      segmentsOriginaux: [segmentGrec('el-2', 'second', 'texte', ' '), segmentGrec('el-1', 'premier')],
    })
    expect(projection.blocParGroupe.get('g1')?.texte).toBe('premier second')
  })

  // Cardinalité `1:0` : une addition du traducteur, que l'original ne connaît pas. Le
  // rattacher à un bloc vide aurait ouvert une grille bilingue sans rien dedans.
  it('détache un segment traduit dont le groupe n’a pas d’original', () => {
    const projection = projeterBilingue({
      ...base,
      membres: [membre('g1', FR, 'fr-1', 1)],
      segmentsOriginaux: [],
    })
    expect(projection.groupeParCle.has('fr-1')).toBe(false)
    expect(projection.blocParGroupe.size).toBe(0)
  })

  it('marque le groupe entièrement en vers, et lui seul', () => {
    const enVers = projeterBilingue({
      ...base,
      membres: [membre('g1', GREC, 'el-1', 1), membre('g1', GREC, 'el-2', 2), membre('g1', FR, 'fr-1', 1)],
      segmentsOriginaux: [versGrec('el-1', 'un'), versGrec('el-2', 'deux')],
    })
    expect(enVers.blocParGroupe.get('g1')?.toutVers).toBe(true)
    expect(enVers.blocParGroupe.get('g1')?.texte).toBe('un\ndeux')

    const mixte = projeterBilingue({
      ...base,
      membres: [membre('g1', GREC, 'el-1', 1), membre('g1', GREC, 'el-2', 2), membre('g1', FR, 'fr-1', 1)],
      segmentsOriginaux: [versGrec('el-1', 'un'), segmentGrec('el-2', 'deux', 'texte', ' ')],
    })
    expect(mixte.blocParGroupe.get('g1')?.toutVers).toBe(false)
    expect(mixte.blocParGroupe.get('g1')?.texte).toBe('un deux')
  })

  // Les offsets d'ancre se comptent depuis le début de LEUR segment. Projetés sur le
  // texte déjà joint, ils tomberaient d'autant plus loin que le groupe est long.
  it('matérialise les appels de note segment par segment, avant la jonction', () => {
    const projection = projeterBilingue({
      ...base,
      membres: [membre('g1', GREC, 'el-1', 1), membre('g1', GREC, 'el-2', 2), membre('g1', FR, 'fr-1', 1)],
      segmentsOriginaux: [segmentGrec('el-1', 'alpha'), segmentGrec('el-2', 'beta', 'texte', ' ')],
      ancresOriginales: {
        'el-2': [{ noteKey: 'n1', marker: '[[1]]', segmentOffsetUnicode: 4, sourceTarget: 'segment_texte' }],
      },
    })
    expect(projection.blocParGroupe.get('g1')?.texte).toBe('alpha beta')
    expect(projection.blocParGroupe.get('g1')?.texteAffichage).toBe('alpha beta[[1]]')
  })

  it('fond les notes de tous les segments originaux du groupe', () => {
    const note = (n: number) => ({ noteKey: `n${n}`, noteNumber: n, blocks: [] })
    const projection = projeterBilingue({
      ...base,
      membres: [membre('g1', GREC, 'el-1', 1), membre('g1', GREC, 'el-2', 2), membre('g1', FR, 'fr-1', 1)],
      segmentsOriginaux: [segmentGrec('el-1', 'alpha'), segmentGrec('el-2', 'beta', 'texte', ' ')],
      notesOriginales: { 'el-1': { n1: note(1) }, 'el-2': { n2: note(2) } },
    })
    expect(Object.keys(projection.blocParGroupe.get('g1')?.notes ?? {})).toEqual(['n1', 'n2'])
  })
})

describe('les bornes d’un groupe', () => {
  // Cas relevé en ligne le 2026-08-24 sur la Didachè : le groupe PAR:003 couvre deux
  // paragraphes français que sépare un titre de section, et les sections se rendent
  // séparément — le grec paraissait donc deux fois de suite.
  it('donne le premier et le dernier segment, dans l’ordre de lecture', () => {
    const bornes = bornesDesGroupes([
      { id: 10, groupeOriginal: 'g1' },
      { id: 11, groupeOriginal: 'g1' },
      { id: 12, groupeOriginal: 'g2' },
      { id: 13, groupeOriginal: 'g1' },
    ])
    expect(bornes.get('g1')).toEqual({ premier: 10, dernier: 13 })
    expect(bornes.get('g2')).toEqual({ premier: 12, dernier: 12 })
  })

  it('ignore les segments qu’aucun groupe ne couvre', () => {
    const bornes = bornesDesGroupes([
      { id: 10 },
      { id: 11, groupeOriginal: null },
      { id: 12, groupeOriginal: 'g1' },
    ])
    expect(bornes.size).toBe(1)
    expect(bornes.get('g1')).toEqual({ premier: 12, dernier: 12 })
  })

  // Un groupe interrompu puis repris garde sa PREMIÈRE et sa DERNIÈRE apparition : le
  // grec reste en tête, et le filet ne se tire qu'au bout de l'empan.
  it('embrasse un groupe interrompu par un autre', () => {
    const bornes = bornesDesGroupes([{ id: 1, groupeOriginal: 'g1' }, { id: 2, groupeOriginal: 'g2' }, { id: 3, groupeOriginal: 'g1' }])
    expect(bornes.get('g1')).toEqual({ premier: 1, dernier: 3 })
  })
})

describe('l’original mis en regard', () => {
  const bloc = {
    alignmentId: 'g1',
    texte: 'Ὁδοὶ δύο εἰσί',
    texteAffichage: 'Ὁδοὶ δύο εἰσί[[1]]',
    notes: { n1: { noteKey: 'n1', noteNumber: 1, blocks: [] } },
    toutVers: false,
  }
  type Notes = Record<string, unknown>
  const segAvecCopie: { texteOriginal: string; texteOriginalAffichage: string; notesOriginal: Notes } = {
    texteOriginal: 'copie latine',
    texteOriginalAffichage: 'copie latine[[9]]',
    notesOriginal: { n9: 'note du latin' },
  }

  it('compose depuis l’alignement quand le bloc en a un', () => {
    const r = originalEnRegard({ groupe: 'g1', blocs: { g1: bloc }, segmentsDuBloc: [], notesVides: {} })
    expect(r).toEqual({ texte: 'Ὁδοὶ δύο εἰσί', affichage: 'Ὁδοὶ δύο εἰσί[[1]]', notes: bloc.notes, toutVers: false })
  })

  // ⛔ Les Confessions portent les DEUX : le latin comme texte à part entière, et sa
  // copie dans les 932 segments de la traduction. C'est le texte qui fait foi.
  it('préfère l’alignement à la copie quand les deux existent', () => {
    const r = originalEnRegard({ groupe: 'g1', blocs: { g1: bloc }, segmentsDuBloc: [segAvecCopie], notesVides: {} })
    expect(r?.texte).toBe('Ὁδοὶ δύο εἰσί')
  })

  it('retombe sur `texte_original` faute d’alignement', () => {
    const r = originalEnRegard({ groupe: null, blocs: {}, segmentsDuBloc: [segAvecCopie], notesVides: {} })
    expect(r).toEqual({
      texte: 'copie latine', affichage: 'copie latine[[9]]',
      notes: { n9: 'note du latin' }, toutVers: null,
    })
  })

  // Le repli n'a qu'une chaîne : il ne sait pas si l'original est en vers, et c'est la
  // colonne française qui tranchera. `null` porte cette ignorance, `false` la nierait.
  it('ne prononce rien sur les vers en repli, mais le dit en alignement', () => {
    expect(originalEnRegard({ groupe: null, blocs: {}, segmentsDuBloc: [segAvecCopie], notesVides: {} })?.toutVers).toBeNull()
    expect(originalEnRegard({ groupe: 'g1', blocs: { g1: { ...bloc, toutVers: true } }, segmentsDuBloc: [], notesVides: {} })?.toutVers).toBe(true)
  })

  // Un groupe annoncé mais dont l'original n'est pas chargé (division voisine encore en
  // vol) ne doit pas faire perdre la copie qui, elle, est là.
  it('retombe sur la copie quand le groupe annoncé n’a pas encore son bloc', () => {
    expect(originalEnRegard({ groupe: 'g-absent', blocs: {}, segmentsDuBloc: [segAvecCopie], notesVides: {} })?.texte).toBe('copie latine')
  })

  it('rend `null` quand il n’y a rien à mettre en regard', () => {
    expect(originalEnRegard({ groupe: null, blocs: {}, segmentsDuBloc: [{ texteOriginal: '   ' }], notesVides: {} })).toBeNull()
    expect(originalEnRegard({ groupe: null, blocs: {}, segmentsDuBloc: [], notesVides: {} })).toBeNull()
  })

  // La colonne latine porte l'apparat de SON texte ; à défaut seulement, celui de la
  // traduction. Les mêler ferait sortir l'apparat de Knöll chez Arnauld d'Andilly.
  it('ne sert les notes de la traduction que faute de notes propres', () => {
    const propres = originalEnRegard({ groupe: null, blocs: {}, notesVides: {}, segmentsDuBloc: [{ texteOriginal: 'x', notesOriginal: { a: 1 }, notes: { b: 2 } }] })
    expect(propres?.notes).toEqual({ a: 1 })
    const sansPropres = originalEnRegard({ groupe: null, blocs: {}, notesVides: {}, segmentsDuBloc: [{ texteOriginal: 'x', notes: { b: 2 } }] })
    expect(sansPropres?.notes).toEqual({ b: 2 })
  })
})

describe('découpe en blocs de lecture', () => {
  const groupes = new Map([['fr-1', 'g1'], ['fr-2', 'g1'], ['fr-4', 'g2']])
  const cleDe = (id: string) => id

  it('réunit les segments consécutifs d’un même groupe', () => {
    expect(blocsBilingues(['fr-1', 'fr-2'], cleDe, groupes)).toEqual([{ ids: ['fr-1', 'fr-2'], groupe: 'g1' }])
  })

  // Un segment hors alignement ne se fond pas au groupe voisin : ce serait le mettre en
  // regard d'un original qu'il ne traduit pas.
  it('sépare des groupes voisins les segments qu’aucun ne couvre', () => {
    expect(blocsBilingues(['fr-1', 'fr-3', 'fr-4'], cleDe, groupes)).toEqual([
      { ids: ['fr-1'], groupe: 'g1' },
      { ids: ['fr-3'], groupe: null },
      { ids: ['fr-4'], groupe: 'g2' },
    ])
  })

  // Les segments hors alignement sortent en SUITE, pour que l'appelant les redécoupe par
  // `paragraphe` : isolés un par un, ils auraient perdu la coulée de leur paragraphe.
  it('réunit en une suite les segments hors alignement consécutifs', () => {
    expect(blocsBilingues(['fr-3', 'fr-5'], cleDe, groupes)).toEqual([
      { ids: ['fr-3', 'fr-5'], groupe: null },
    ])
  })

  // Un même groupe interrompu puis repris rouvre un bloc : l'ordre de lecture prime.
  it('rouvre un bloc quand un groupe revient après une interruption', () => {
    expect(blocsBilingues(['fr-1', 'fr-3', 'fr-2'], cleDe, groupes)).toEqual([
      { ids: ['fr-1'], groupe: 'g1' },
      { ids: ['fr-3'], groupe: null },
      { ids: ['fr-2'], groupe: 'g1' },
    ])
  })
})
