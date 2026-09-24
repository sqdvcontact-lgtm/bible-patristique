import { describe, expect, it } from 'vitest'
import {
  repartirGroupes,
  choisirEnsembleBilingue,
  fondreOriginaux,
  fusionnerBlocsDeVers,
  joindreSegmentsOriginaux,
  originalEnRegard,
  bornesDesGroupes,
  projeterBilingue,
  rattacherNonAlignes,
  partiesNonAlignees,
  marquerNonAligne,
  sansMarqueNonAligne,
  estCorpsLisible,
  type BlocOriginal,
  type SegmentVoisin,
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
    joinBefore: ' ',
  }
  it('compose depuis l’alignement quand le bloc en a un', () => {
    const r = originalEnRegard({ groupes: ['g1'], blocs: { g1: bloc } })
    expect(r).toEqual({ texte: 'Ὁδοὶ δύο εἰσί', affichage: 'Ὁδοὶ δύο εἰσί[[1]]', notes: bloc.notes, toutVers: false })
  })

  it('dit si l’original est en vers', () => {
    expect(originalEnRegard({ groupes: ['g1'], blocs: { g1: { ...bloc, toutVers: true } } })?.toutVers).toBe(true)
  })

  // ⛔ UN SEUL MODE (2026-09-22) : sans groupe, ou sans le bloc d'un groupe annoncé, il n'y
  // a rien à mettre en regard. La copie `segments.texte_original` ne sert plus de repli.
  it('rend `null` sans alignement', () => {
    expect(originalEnRegard({ groupes: [], blocs: {} })).toBeNull()
    expect(originalEnRegard({ groupes: ['g-absent'], blocs: {} })).toBeNull()
  })
})

describe('la répartition des groupes sur les blocs', () => {
  // ⛔ DEUX DÉCOUPES : le paragraphe COMPOSE (filet, blanc, alinéa), le groupe MET EN
  // REGARD (son propre rang de grille). Le Discours 38 a démenti la première règle —
  // 76 groupes rendus en 76 paragraphes — et la seconde l'a été le même jour : fondre
  // le paragraphe en un rang unique ne laissait plus rien en regard.
  const groupeDe = (id: string) => ({
    'fr-1': 'g1', 'fr-2': 'g1', 'fr-3': 'g2', 'fr-4': 'g2', 'fr-5': 'g3',
  } as Record<string, string | undefined>)[id]
  const bornes = new Map([
    ['g1', { premier: 'fr-1', dernier: 'fr-2' }],
    ['g2', { premier: 'fr-3', dernier: 'fr-4' }],
    ['g3', { premier: 'fr-5', dernier: 'fr-5' }],
  ])

  // Un rang par empan : c'est lui qui tient les deux colonnes en face l'une de l'autre.
  it('ouvre un rang par groupe À L’INTÉRIEUR du paragraphe', () => {
    expect(repartirGroupes([{ ids: ['fr-1', 'fr-2', 'fr-3', 'fr-4'] }], groupeDe, bornes)).toEqual([
      { ids: ['fr-1', 'fr-2'], groupes: ['g1'], couvert: true, clot: false },
      { ids: ['fr-3', 'fr-4'], groupes: ['g2'], couvert: true, clot: true },
    ])
  })

  // ⛔ La COUTURE : seul le DERNIER rang d'un paragraphe le ferme. Les autres se touchent
  // — ni filet, ni blanc, ni retrait — et rien ne dit qu'on change de paragraphe.
  it('ne fait clore que le dernier rang du paragraphe', () => {
    const rangs = repartirGroupes([{ ids: ['fr-1', 'fr-3', 'fr-5'] }], groupeDe, bornes)
    expect(rangs.map(r => r.clot)).toEqual([false, false, true])
  })

  // ⛔ Un empan à cheval ne se compose qu'une fois : le grec de la troisième section de la
  // Didachè paraissait deux fois de suite.
  it('ne compose un groupe à cheval que dans le PREMIER rang qu’il touche', () => {
    expect(repartirGroupes([{ ids: ['fr-1', 'fr-3'] }, { ids: ['fr-4'] }], groupeDe, bornes)).toEqual([
      { ids: ['fr-1'], groupes: ['g1'], couvert: true, clot: false },
      { ids: ['fr-3'], groupes: ['g2'], couvert: true, clot: true },
      { ids: ['fr-4'], groupes: [], couvert: true, clot: true },
    ])
  })

  // ⛔ La coupure de l'ÉDITION l'emporte : un paragraphe se ferme même si l'empan continue.
  it('ferme le paragraphe même quand l’empan se poursuit au-delà', () => {
    const [premier] = repartirGroupes([{ ids: ['fr-3'] }, { ids: ['fr-4'] }], groupeDe, bornes)
    expect(premier.clot).toBe(true)
  })

  // Un segment hors alignement fait son rang, sans original en face, mais reste cousu à
  // son paragraphe : rien ne le donne pour un paragraphe à lui.
  it('rend son rang à un segment qu’aucun groupe ne couvre', () => {
    expect(repartirGroupes([{ ids: ['fr-1', 'fr-x', 'fr-2'] }], groupeDe, bornes)).toEqual([
      { ids: ['fr-1'], groupes: ['g1'], couvert: true, clot: false },
      { ids: ['fr-x'], groupes: [], couvert: false, clot: false },
      { ids: ['fr-2'], groupes: [], couvert: true, clot: true },
    ])
  })

  it('rend un rang nu quand aucun groupe ne couvre le paragraphe', () => {
    expect(repartirGroupes([{ ids: ['fr-x', 'fr-y'] }], groupeDe, bornes)).toEqual([
      { ids: ['fr-x', 'fr-y'], groupes: [], couvert: false, clot: true },
    ])
  })

  // Faute de borne — un groupe annoncé dont rien n'est encore chargé — le rang le compose :
  // c'est le seul qu'on lui connaisse.
  it('compose un groupe dont on ne connaît pas les bornes', () => {
    expect(repartirGroupes([{ ids: ['fr-5'] }], groupeDe, new Map())).toEqual([
      { ids: ['fr-5'], groupes: ['g3'], couvert: true, clot: true },
    ])
  })
  // ⛔ L'ARGUMENT, dont le chunk de départ est le SEGMENT et non le paragraphe — « un
  // argument fait bloc à lui seul ». Quatorze blocs d'un seul vers, tous du même empan :
  // UN seul le compose, les treize autres restent couverts. C'est le défaut du *Manuel*
  // de Dhuoda, relevé le 2026-09-07 : ses 94 segments français sont des introductions,
  // lesquelles vivent hors des groupes structurels et ne figuraient donc pas dans la
  // liste où les bornes se comptent. Faute de bornes, le repli ci-dessus s'appliquait à
  // chacun des quatorze rangs, et la colonne latine portait quatorze fois la strophe.
  it('⛔ un ARGUMENT découpé segment par segment ne compose son empan qu’UNE fois', () => {
    const vers = Array.from({ length: 14 }, (_, i) => `v${i + 1}`)
    const blocs = () => vers.map(id => ({ ids: [id] }))
    const rangs = repartirGroupes(blocs(), () => 'g13', new Map([['g13', { premier: 'v1', dernier: 'v14' }]]))
    expect(rangs.filter(r => r.groupes.length > 0)).toEqual([
      { ids: ['v1'], groupes: ['g13'], couvert: true, clot: true },
    ])
    // Les treize autres gardent leur grille : le français ne reprend pas toute la
    // largeur au milieu d'un poème.
    expect(rangs.every(r => r.couvert)).toBe(true)
    // Et voici ce que coûte l'oubli d'une borne, dit en clair.
    expect(repartirGroupes(blocs(), () => 'g13', new Map()).filter(r => r.groupes.length > 0)).toHaveLength(14)
  })
})

describe('le poème refait dans la lecture en regard', () => {
  // Un mètre de Boèce se découpe en quatorze groupes d'alignement. Chacun ouvrait son
  // rang de grille, dans une colonne latine de 209 px où deux vers sur trois
  // s'enroulaient : c'est ce hachage que la fusion défait.
  const enVers = (ids: readonly string[]) => ids.every(id => id.startsWith('v'))
  const bloc = (ids: string[], groupes: string[], clot = true) => ({ ids, groupes, couvert: groupes.length > 0, clot })

  it('réunit les blocs de vers voisins, et retient leurs groupes dans l’ordre', () => {
    expect(fusionnerBlocsDeVers([
      bloc(['v1'], ['g1']),
      bloc(['v2', 'v3'], ['g2']),
      bloc(['v4'], ['g3']),
    ], enVers)).toEqual([
      { ids: ['v1', 'v2', 'v3', 'v4'], groupes: ['g1', 'g2', 'g3'], couvert: true, clot: true },
    ])
  })

  // ⛔ La prose garde son paragraphe : c'est l'unité que l'édition établit, et la fusion
  // ne vaut que là où le paragraphe n'est pas la bonne unité.
  it('ne fond jamais deux blocs de prose', () => {
    expect(fusionnerBlocsDeVers([bloc(['p1'], ['g1']), bloc(['p2'], ['g2'])], enVers)).toEqual([
      { ids: ['p1'], groupes: ['g1'], couvert: true, clot: true },
      { ids: ['p2'], groupes: ['g2'], couvert: true, clot: true },
    ])
  })

  it('s’arrête à la prose qui borde le poème', () => {
    expect(fusionnerBlocsDeVers([
      bloc(['p1'], ['g1']),
      bloc(['v1'], ['g2']),
      bloc(['v2'], ['g3']),
      bloc(['p2'], ['g4']),
    ], enVers)).toEqual([
      { ids: ['p1'], groupes: ['g1'], couvert: true, clot: true },
      { ids: ['v1', 'v2'], groupes: ['g2', 'g3'], couvert: true, clot: true },
      { ids: ['p2'], groupes: ['g4'], couvert: true, clot: true },
    ])
  })

  it('fond un poème dont une strophe échappe à l’alignement', () => {
    expect(fusionnerBlocsDeVers([
      bloc(['v1'], ['g1']),
      bloc(['v2'], []),
      bloc(['v3'], ['g2']),
    ], enVers)).toEqual([
      { ids: ['v1', 'v2', 'v3'], groupes: ['g1', 'g2'], couvert: true, clot: true },
    ])
  })

  // Le filet se tire au bout du DERNIER bloc fondu : c'est lui qui sait si l'empan
  // se poursuit au-delà du poème.
  it('prend le `clot` du dernier bloc fondu', () => {
    expect(fusionnerBlocsDeVers([bloc(['v1'], ['g1']), bloc(['v2'], ['g2'], false)], enVers)[0].clot)
      .toBe(false)
  })
})

describe('les originaux fondus dans un même bloc', () => {
  const strophe = (id: string, texte: string) => ({
    alignmentId: id, texte, texteAffichage: texte,
    notes: { [id]: { noteKey: id, noteNumber: 1, blocks: [] } }, toutVers: true, joinBefore: ' ',
  })
  const blocs = { g1: strophe('g1', 'Carmina qui quondam'), g2: strophe('g2', 'Flebilis, heu!') }

  // ⚠️ Par un SAUT, jamais par une espace : la colonne recompose ligne à ligne, et deux
  // strophes jointes par une espace couleraient en prose.
  it('joint les strophes par un saut de ligne', () => {
    expect(fondreOriginaux(['g1', 'g2'], blocs)?.texte).toBe('Carmina qui quondam\nFlebilis, heu!')
  })

  // ⛔ La PROSE, elle, se joint par `join_before` : un paragraphe qui réunit plusieurs
  // groupes doit couler d'un seul tenant dans la colonne de droite.
  it('joint la prose par `join_before`, comme deux segments d’un même groupe', () => {
    const prose = (id: string, texte: string, joinBefore: string | null) => ({
      alignmentId: id, texte, texteAffichage: texte, notes: {}, toutVers: false, joinBefore,
    })
    const suite = {
      g1: prose('g1', 'ἐκεῖνα μὲν', null),
      g2: prose('g2', 'τῆς εὐδοκίας', ' '),
      g3: prose('g3', ', τὰ δὲ', ''),
    }
    expect(fondreOriginaux(['g1', 'g2', 'g3'], suite)?.texte).toBe('ἐκεῖνα μὲν τῆς εὐδοκίας, τὰ δὲ')
  })

  it('fait suivre les notes de toutes les strophes', () => {
    expect(Object.keys(fondreOriginaux(['g1', 'g2'], blocs)?.notes ?? {})).toEqual(['g1', 'g2'])
  })

  // C'est l'obstacle qui interdisait la fusion en regard : le latin d'une strophe vit
  // sur son vers de rang 1, et fondre les blocs n'en gardait qu'un.
  it('ne perd aucune strophe, ce que la fusion d’avant ne savait pas faire', () => {
    expect(fondreOriginaux(['g1', 'g2'], blocs)?.texte.split('\n')).toHaveLength(2)
  })

  it('rend `null` quand aucun groupe ne porte d’original', () => {
    expect(fondreOriginaux(['g1', 'g2'], {})).toBeNull()
  })

  it('compose depuis TOUS les groupes du bloc, et non depuis le seul premier', () => {
    const r = originalEnRegard({ groupes: ['g1', 'g2'], blocs })
    expect(r?.texte).toBe('Carmina qui quondam\nFlebilis, heu!')
    expect(r?.toutVers).toBe(true)
  })

  it('compose le seul groupe du bloc quand il n’y en a qu’un', () => {
    expect(originalEnRegard({ groupes: ['g1'], blocs })?.texte)
      .toBe('Carmina qui quondam')
  })

  // ⛔ Un bloc COUVERT qui ne compose rien garde sa colonne vide : l'empan est plus haut.
  it('ne compose rien quand l’empan est composé plus haut', () => {
    expect(originalEnRegard({ groupes: [], blocs })).toBeNull()
  })
})

describe('le texte original que l’alignement ne met en face de rien', () => {
  // Deux groupes alignés, g1 (el-1) et g2 (el-4), et deux vers laissés sans vis-à-vis.
  const bloc = (id: string, texte: string, toutVers = false): BlocOriginal => ({
    alignmentId: id, texte, texteAffichage: texte, notes: {}, toutVers, joinBefore: null,
  })
  const voisin = (cle: string, numero: number, nature = 'texte', espace = 'corps'): SegmentVoisin =>
    ({ segment_key: cle, segment_numero: numero, nature, espace_textuel: espace })
  const blocs = () => new Map([['g1', bloc('g1', 'Carmina qui')], ['g2', bloc('g2', 'Flebilis heu')]])
  const aligne = new Map([['el-1', 'g1'], ['el-4', 'g2']])
  const orphelins = new Map([
    ['el-2', segmentGrec('el-2', 'quondam studio', 'texte', ' ')],
    ['el-3', segmentGrec('el-3', 'florente peregi', 'texte', ' ')],
  ])

  it('compose le passage à sa place, à la suite du groupe qui le précède', () => {
    const sortie = rattacherNonAlignes({
      blocParGroupe: blocs(),
      voisinage: [voisin('el-4', 4), voisin('el-2', 2), voisin('el-1', 1), voisin('el-3', 3)],
      groupeAligneDe: aligne,
      nonAlignes: orphelins,
      debutDuTexte: true,
    })
    expect(sortie.get('g1')?.texte).toBe('Carmina qui quondam studio florente peregi')
    expect(sortie.get('g2')?.texte).toBe('Flebilis heu')
  })

  it('grise le passage, et lui seul', () => {
    const sortie = rattacherNonAlignes({
      blocParGroupe: blocs(),
      voisinage: [voisin('el-1', 1), voisin('el-2', 2), voisin('el-4', 4)],
      groupeAligneDe: aligne,
      nonAlignes: orphelins,
      debutDuTexte: true,
    })
    expect(partiesNonAlignees(sortie.get('g1')!.texteAffichage)).toEqual([
      { texte: 'Carmina qui ', nonAligne: false },
      { texte: 'quondam studio', nonAligne: true },
    ])
    // Le texte canonique, qu’on copie, ne porte aucune borne.
    expect(sortie.get('g1')!.texte).toBe('Carmina qui quondam studio')
  })

  it('place en TÊTE du premier groupe ce qui ouvre le texte', () => {
    const sortie = rattacherNonAlignes({
      blocParGroupe: blocs(),
      voisinage: [voisin('el-2', 2), voisin('el-4', 4)],
      groupeAligneDe: aligne,
      nonAlignes: orphelins,
      debutDuTexte: true,
    })
    expect(sortie.get('g2')?.texte).toBe('quondam studio Flebilis heu')
    expect(sortie.get('g2')?.joinBefore).toBe(' ')
  })

  it('laisse au groupe d’avant, hors de l’écran, ce qui ne précède que la page', () => {
    const sortie = rattacherNonAlignes({
      blocParGroupe: blocs(),
      voisinage: [voisin('el-0', 0), voisin('el-2', 2), voisin('el-4', 4)],
      groupeAligneDe: new Map([...aligne, ['el-0', 'g0']]),
      nonAlignes: orphelins,
      debutDuTexte: false,
    })
    expect(sortie.get('g2')?.texte).toBe('Flebilis heu')
    expect(sortie.has('g0')).toBe(false)
  })

  it('n’y mêle ni titre, ni signature, ni apparat', () => {
    expect(estCorpsLisible({ espace_textuel: 'corps', nature: 'texte' })).toBe(true)
    expect(estCorpsLisible({ espace_textuel: 'corps', nature: 'citation' })).toBe(true)
    expect(estCorpsLisible({ espace_textuel: 'corps', nature: 'signature' })).toBe(false)
    expect(estCorpsLisible({ espace_textuel: 'introduction', nature: 'texte' })).toBe(false)
    expect(estCorpsLisible({ espace_textuel: 'apparat_critique', nature: 'apparat_editeur' })).toBe(false)
    const sortie = rattacherNonAlignes({
      blocParGroupe: blocs(),
      voisinage: [voisin('el-1', 1), voisin('el-2', 2, 'signature'), voisin('el-4', 4)],
      groupeAligneDe: aligne,
      nonAlignes: orphelins,
      debutDuTexte: true,
    })
    expect(sortie.get('g1')?.texte).toBe('Carmina qui')
  })

  it('garde le poème en vers, et grise chaque vers pour lui-même', () => {
    const sortie = rattacherNonAlignes({
      blocParGroupe: new Map([['g1', bloc('g1', 'Carmina qui', true)]]),
      voisinage: [voisin('el-1', 1), voisin('el-2', 2)],
      groupeAligneDe: aligne,
      nonAlignes: new Map([['el-2', versGrec('el-2', 'Et fluctibus\nCurat spernere')]]),
      debutDuTexte: true,
    })
    const g1 = sortie.get('g1')!
    expect(g1.toutVers).toBe(true)
    const lignes = g1.texteAffichage.split('\n')
    expect(lignes).toHaveLength(3)
    expect(partiesNonAlignees(lignes[0])).toEqual([{ texte: 'Carmina qui', nonAligne: false }])
    expect(partiesNonAlignees(lignes[2])).toEqual([{ texte: 'Curat spernere', nonAligne: true }])
  })

  it('ne touche à rien quand tout est aligné', () => {
    const entree = blocs()
    const sortie = rattacherNonAlignes({
      blocParGroupe: entree,
      voisinage: [voisin('el-1', 1), voisin('el-4', 4)],
      groupeAligneDe: aligne,
      nonAlignes: new Map(),
      debutDuTexte: true,
    })
    expect(sortie.get('g1')).toBe(entree.get('g1'))
    expect(sortie.get('g2')).toBe(entree.get('g2'))
  })

  it('borne ligne à ligne, et se retire sans reste', () => {
    const marque = marquerNonAligne('un\n\ndeux')
    expect(marque.split('\n')).toHaveLength(3)
    expect(sansMarqueNonAligne(marque)).toBe('un\n\ndeux')
    expect(partiesNonAlignees('sans borne')).toEqual([{ texte: 'sans borne', nonAligne: false }])
  })
})
