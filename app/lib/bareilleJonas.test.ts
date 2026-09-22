// Cas réel : Ambroise traduit par Bareille (1879), Jonas 2, segments 254 à 262
// (`TXT_A0051O0022_FR_1879_BAREILLE`), réunis en une seule carte du volet des Pères.
// Deux défauts relevés par l'auteur le 2026-09-22 : les points d'omission entre deux
// citations (« » ;... « ») et la numérotation des appels qui repartait à 108.
import { describe, expect, it } from 'vitest'
import { normaliserPonctuationCitations, normaliserTypographieLecture } from './typographie'
import { composerExtrait } from './extraitVolet'
import { cleNotesDuSegment, type NotesDuSegment } from './notesStructureesChargement'
import type { NoteStructuree } from '../oeuvre/[id]/oeuvreTypes'

const FINE = String.fromCharCode(0x202f)
const NBSP = String.fromCharCode(0x00a0)
const TEXTE = 'TXT_A0051O0022_FR_1879_BAREILLE'

// Les fins de segment telles que la base les porte (espaces doubles compris).
const S257 = 'dans le psaume : « Sauvez-moi, Seigneur, parce que les eaux sont entrées jusque dans mon âme[[109]]  » ;... « et notre âme a traversé le torrent[[110]]  » ;....'
const S258 = '« Que l’ouverture du puits ne m’ensevelisse pas, et que l’enfer ne se ferme point sur moi[[111]]  » ;'
const S262 = 'secrets de Dieu : « Vos jugements sont un abîme très-profond[[115]] » ;... « un abîme appelle un autre abîme, au bruit des cataractes que vous envoyez[[116]]. »'

describe('les points d’omission entre deux citations se rendent « […] » — charte, coupure éditoriale', () => {
  it('segments 257 et 258 joints : chaque omission devient un marqueur autonome', () => {
    const rendu = normaliserTypographieLecture(`${S257} ${S258} qu’il ne me refuse`)
    expect(rendu).toContain(`mon âme[[109]]${FINE}»${NBSP}[…] «${FINE}et notre âme a traversé le torrent[[110]]${FINE}»${NBSP}[…] «${FINE}Que l’ouverture`)
    // Le point-virgule d'avant les points, et le point parasite de « ;.... », disparaissent.
    expect(rendu).not.toMatch(/;\.|\.\.\./)
    // Ce qui n'est pas une omission garde sa ponctuation.
    expect(rendu).toContain(`sur moi[[111]]${FINE}»${FINE}; qu’il ne me refuse`)
  })

  it('segment 262 : le marqueur ne se colle ni au guillemet ni à la citation suivante', () => {
    const rendu = normaliserTypographieLecture(S262)
    expect(rendu).toContain(`très-profond[[115]]${FINE}»${NBSP}[…] «${FINE}un abîme appelle`)
  })

  it('en fin de segment, le marqueur ferme le texte sans espace de queue', () => {
    expect(normaliserTypographieLecture(S257).endsWith(`torrent[[110]]${FINE}»${NBSP}[…]`)).toBe(true)
  })

  it('reconnaît les graphies relevées en base : « »… », « » … », « » ; … », « ».... »', () => {
    expect(normaliserPonctuationCitations(`rien${FINE}»… «${FINE}Mais`)).toBe(`rien${FINE}»${NBSP}[…] «${FINE}Mais`)
    expect(normaliserPonctuationCitations(`bêtes${FINE}» …`)).toBe(`bêtes${FINE}»${NBSP}[…]`)
    expect(normaliserPonctuationCitations(`bête${FINE}» ; … «${FINE}je`)).toBe(`bête${FINE}»${NBSP}[…] «${FINE}je`)
    expect(normaliserPonctuationCitations(`fin${FINE}».... «${FINE}suite`)).toBe(`fin${FINE}»${NBSP}[…] «${FINE}suite`)
  })

  it('ne touche pas aux points de suspension de la prose, ni à ceux suivis d’autre chose qu’un guillemet', () => {
    expect(normaliserPonctuationCitations('il hésita… puis reprit')).toBe('il hésita… puis reprit')
    expect(normaliserPonctuationCitations(`« phrase${FINE}»… et il ajoute`)).toBe(`« phrase${FINE}»… et il ajoute`)
    expect(normaliserPonctuationCitations(`« il dit…${FINE}»`)).toBe(`« il dit…${FINE}»`)
  })

  it('est idempotente', () => {
    const une = normaliserTypographieLecture(`${S257} ${S258}`)
    expect(normaliserTypographieLecture(une)).toBe(une)
  })
})

// ── La numérotation de la carte réunie ──────────────────────────────────────

const note = (noteKey: string, noteNumber: number): NoteStructuree => ({
  noteKey, noteNumber,
  blocks: [{ blockId: 'b', rank: 1, kind: 'reference', form: 'prose', text: noteKey, needsReview: false }],
})
const seg = (numero: number, cle: string, texte: string) => ({
  seg: { id_oeuvre: 'A0051O0022', id_texte: TEXTE, segment_numero: numero, segment_key: `${TEXTE}:${cle}`, segment_texte: texte, notes: null },
})
const charge = (cle: string, notes: Record<string, NoteStructuree>): [string, NotesDuSegment] =>
  [cleNotesDuSegment(TEXTE, `${TEXTE}:${cle}`), { notes, ancres: [] }]

describe('composerExtrait — les marqueurs du latin d’un segment ne volent pas ceux des suivants', () => {
  it('Bareille, Jonas 2 : 112 à 116 ouvrent leurs propres notes, non celles du latin du segment 254', () => {
    const charges = new Map<string, NotesDuSegment | null>([
      // Le segment 254 range sous 112… les notes des ancres de son TEXTE ORIGINAL
      // (N109 à N113, numérotées 108 à 112), et sous 108 celle de son français.
      charge('s125', {
        108: note('JER-JONAS-N109', 108), 112: note('JER-JONAS-N109', 108), 113: note('JER-JONAS-N110', 109),
        114: note('JER-JONAS-N111', 110), 115: note('JER-JONAS-N112', 111), 116: note('JER-JONAS-N113', 112),
      }),
      charge('s126:split03', { 109: note('JER-JONAS-N110', 109), 110: note('JER-JONAS-N111', 110) }),
      charge('s127', { 111: note('JER-JONAS-N112', 111) }),
      charge('s127:split02', { 112: note('JER-JONAS-N113', 112) }),
      charge('s128:split02', { 113: note('JER-JONAS-N114', 113) }),
      charge('s128:split03', { 114: note('JER-JONAS-N115', 114), 115: note('JER-JONAS-N116', 115), 116: note('JER-JONAS-N117', 116) }),
    ])
    const r = composerExtrait([
      seg(254, 's125', '« Je me suis vu jusqu’à l’âme au milieu des eaux qui m’environnaient, l’abîme m’a enveloppé de toutes parts[[108]]. »'),
      seg(257, 's126:split03', S257),
      seg(258, 's127', S258),
      seg(259, 's127:split02', 'afin que s’accomplisse cette promesse : « S’élevant vers les hauteurs, il a emmené la captivité captive[[112]]. »'),
      seg(261, 's128:split02', 'les démons eux-mêmes demandaient à ne pas aller[[113]].'),
      seg(262, 's128:split03', `${S262.replace('[[115]]', '[[114]]').replace('[[116]]', '[[115]]')} Et encore[[116]].`),
    ], charges)
    const numero = (m: string) => (r.notes[m] as NoteStructuree).noteNumber
    expect(['108', '109', '110', '111', '112', '113', '114', '115', '116'].map(numero))
      .toEqual([108, 109, 110, 111, 112, 113, 114, 115, 116])
  })

  it('une note rangée sur un segment voisin sert encore en repli', () => {
    const charges = new Map<string, NotesDuSegment | null>([
      charge('a', { 7: note('N7', 7) }),
      charge('b', {}),
    ])
    const r = composerExtrait([seg(1, 'a', 'premier'), seg(2, 'b', 'second[[7]]')], charges)
    expect((r.notes['7'] as NoteStructuree).noteNumber).toBe(7)
  })
})
