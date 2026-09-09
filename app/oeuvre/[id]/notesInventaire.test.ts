import { describe, expect, it } from 'vitest'
import {
  apercuDeLaNote,
  sansMarqueOuverte,
  clesDesNotes,
  comptesParIntitule,
  filtrerNotes,
  grouperParDivision,
  recenserNotes,
  SANS_INTITULE,
  type NoteRecensee,
  type PlaceSegment,
} from './notesInventaire'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

/**
 * L'INVENTAIRE DES NOTES — l'épreuve de ce qu'il PROMET.
 *
 * ⚠️ Les décors sont écrits court : seuls les champs que le recensement lit. Ce qui est
 * chiffré dans les intitulés vient de la base, et il est nommé.
 */

const bloc = (p: Partial<NoteBlocData> & { blockId: string }): NoteBlocData => ({
  rank: 1, kind: 'commentary', form: 'prose', text: '', needsReview: false, ...p,
})

const note = (p: Partial<NoteStructuree> & { noteKey: string; noteNumber: number }): NoteStructuree => ({
  blocks: [bloc({ blockId: `${p.noteKey}-b1` })], ...p,
})

/** Les deux espaces que la charte pose au rendu (paragraphe 3.2). */
const FINE = String.fromCharCode(0x202F)
const INSEC = String.fromCharCode(0x00A0)

const place = (p: Partial<PlaceSegment> & { id: number; segmentKey: string }): PlaceSegment => ({
  division: 'Livre I', segmentNumero: p.id, surface: 'corps', ...p,
})

describe('apercuDeLaNote', () => {
  it('joint les blocs dans l’ordre de leur rang, blancs resserrés', () => {
    const n = note({
      noteKey: 'n1', noteNumber: 1,
      blocks: [
        bloc({ blockId: 'b2', rank: 2, text: '  Isaïe 6, 3.  ' }),
        bloc({ blockId: 'b1', rank: 1, text: 'Voyez\n\nplus haut' }),
      ],
    })
    expect(apercuDeLaNote(n)).toBe('Voyez plus haut Isaïe 6, 3.')
  })

  it('COUPE AU DERNIER MOT ENTIER, jamais au milieu d’un mot', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'alpha beta gamma delta' })] })
    // 14 signes tombent au milieu de « gamma » : on rend « alpha beta ».
    expect(apercuDeLaNote(n, 14)).toBe('alpha beta…')
  })

  it('ne coupe pas au mot quand il ne resterait presque rien', () => {
    // Un seul mot très long : mieux vaut le tronquer que rendre une chaîne vide.
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'abcdefghijklmnopqrst' })] })
    expect(apercuDeLaNote(n, 10)).toBe('abcdefghij…')
  })

  it('rend une chaîne vide sur une note sans texte', () => {
    expect(apercuDeLaNote(note({ noteKey: 'n1', noteNumber: 1, blocks: [] }))).toBe('')
  })

  // ── LA TYPOGRAPHIE DE LA CHARTE, comme au rendu ────────────────────────────
  // L'aperçu joignait les blocs BRUTS : il montrait des espaces ordinaires là où la
  // note rend les insécables du § 3.2, et le resserrement des blancs détruisait au
  // passage celles que la donnée portait déjà. Relevé de l'auteur, 2026-09-09.
  it('pose les espaces de la charte, comme la note rendue', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'Voyez ceci : « un mot » ; et cela !' })] })
    const vu = apercuDeLaNote(n)
    expect(vu).toContain(INSEC + ':')
    expect(vu).toContain('«' + FINE)
    expect(vu).toContain(FINE + ';')
  })

  it('ne détruit pas une insécable que la donnée porte déjà', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'Isaïe 6' + INSEC + ': 3' })] })
    expect(apercuDeLaNote(n)).toContain(INSEC)
  })

  // ⛔ L'APPARAT CRITIQUE ne se normalise pas, ici comme au rendu : « om. F » ne
  // prend pas de point, et la haute ponctuation reste collée.
  it('laisse un apparat critique intact', () => {
    const n = note({
      noteKey: 'n1', noteNumber: 1,
      blocks: [bloc({ blockId: 'b', text: 'plana M; faciunt] fecerunt Q', editorialRole: 'critical_apparatus' })],
    })
    expect(apercuDeLaNote(n)).toBe('plana M; faciunt] fecerunt Q')
  })

  // ── LA COUPE NE CASSE JAMAIS UN ENRICHISSEMENT ─────────────────────────────
  // Une astérisque restée seule se rend TELLE QUELLE : le renderer n'apparie que des
  // paires, et ce qu'il n'apparie pas, il l'imprime.
  it('coupe avant une italique restée ouverte', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'Voyez plus haut *Rétractations et le reste*' })] })
    const vu = apercuDeLaNote(n, 24)
    expect(vu).toBe('Voyez plus haut…')
    expect(vu).not.toContain(String.fromCharCode(42))
  })

  it('garde une italique entière quand elle tient dans la coupe', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: 'Voyez *Job* et puis beaucoup de texte ensuite encore' })] })
    expect(apercuDeLaNote(n, 20)).toBe('Voyez *Job* et puis…')
  })

  it('ne casse ni le gras, ni les petites capitales, ni un lien', () => {
    expect(sansMarqueOuverte('un **gras qui reste')).toBe('un')
    expect(sansMarqueOuverte('un ++capitales')).toBe('un')
    expect(sansMarqueOuverte('voir [le texte](http')).toBe('voir')
    expect(sansMarqueOuverte('un <i>latin')).toBe('un')
  })

  // ⚠️ Une marque ouverte au tout premier signe ne laisserait RIEN : mieux vaut une
  // astérisque orpheline qu'un aperçu vide, qui ferait perdre la note à qui la cherche.
  it('rend tout de même quelque chose quand la coupe ne laisserait rien', () => {
    const n = note({ noteKey: 'n1', noteNumber: 1, blocks: [bloc({ blockId: 'b', text: '*un titre très long et sans fermeture avant la coupe*' })] })
    expect(apercuDeLaNote(n, 12)).not.toBe('…')
  })
})

describe('clesDesNotes', () => {
  it('ne retient que les clés qui portent une note', () => {
    // ⛔ C'est ce qui empêche de charger les 32 367 segments de la Somme théologique.
    expect(clesDesNotes({ a: { m: 1 }, b: {}, c: { m: 1, n: 2 } })).toEqual(['a', 'c'])
  })
})

describe('recenserNotes', () => {
  const places = new Map<string, PlaceSegment>([
    ['s1', place({ id: 1, segmentKey: 's1', division: 'Livre I', segmentNumero: 10 })],
    ['s2', place({ id: 2, segmentKey: 's2', division: 'Livre II', segmentNumero: 20 })],
  ])

  it('range dans l’ORDRE DE LECTURE, non par numéro de note', () => {
    // ⛔ Le numéro affiché repart à 1 à chaque division : trier dessus mêlerait les
    // divisions, et « 1 » du livre II passerait devant « 12 » du livre I.
    const recensees = recenserNotes(
      {
        s2: { '[[1]]': note({ noteKey: 'B', noteNumber: 40, displayNumber: 1 }) },
        s1: { '[[12]]': note({ noteKey: 'A', noteNumber: 12, displayNumber: 12 }) },
      },
      places,
      ['Livre I', 'Livre II'],
    )
    expect(recensees.map(n => n.cle)).toEqual(['A', 'B'])
    expect(recensees.map(n => n.numero)).toEqual([12, 1])
  })

  it('garde le numéro INTERNE à part du numéro affiché', () => {
    const [r] = recenserNotes({ s1: { m: note({ noteKey: 'A', noteNumber: 40, displayNumber: 3 }) } }, places, ['Livre I'])
    expect([r.numero, r.numeroInterne]).toEqual([3, 40])
  })

  it('retombe sur le numéro interne quand la division n’a pas pu être établie', () => {
    const [r] = recenserNotes({ s1: { m: note({ noteKey: 'A', noteNumber: 7 }) } }, places, ['Livre I'])
    expect(r.numero).toBe(7)
  })

  it('⛔ ne recense une note QU’UNE FOIS, fût-elle ancrée deux fois', () => {
    const n = note({ noteKey: 'A', noteNumber: 1 })
    const recensees = recenserNotes({ s1: { m: n }, s2: { m: n } }, places, ['Livre I', 'Livre II'])
    expect(recensees).toHaveLength(1)
    expect(recensees[0].place?.division).toBe('Livre I')
  })

  it('⛔ SIGNALE une ancre dont le segment est introuvable, au lieu de la taire', () => {
    const [r] = recenserNotes({ inconnu: { m: note({ noteKey: 'A', noteNumber: 1 }) } }, places, ['Livre I'])
    expect(r.ancreOrpheline).toBe(true)
    expect(r.place).toBeNull()
  })

  it('range les orphelines EN QUEUE, quel que soit leur numéro', () => {
    const recensees = recenserNotes(
      {
        inconnu: { m: note({ noteKey: 'ORPH', noteNumber: 1 }) },
        s2: { m: note({ noteKey: 'B', noteNumber: 99 }) },
      },
      places,
      ['Livre I', 'Livre II'],
    )
    expect(recensees.map(n => n.cle)).toEqual(['B', 'ORPH'])
  })

  it('relève un bloc qui attend une relecture', () => {
    const n = note({
      noteKey: 'A', noteNumber: 1,
      blocks: [bloc({ blockId: 'b1' }), bloc({ blockId: 'b2', rank: 2, needsReview: true })],
    })
    expect(recenserNotes({ s1: { m: n } }, places, ['Livre I'])[0].aRevoir).toBe(true)
  })

  it('nomme l’intitulé quand la note déclare un type, et se tait sinon', () => {
    const typee = note({
      noteKey: 'A', noteNumber: 1,
      blocks: [bloc({ blockId: 'b', editorialRole: 'translator_note' })],
    })
    expect(recenserNotes({ s1: { m: typee } }, places, ['Livre I'])[0].intitule).toBe('Note du traducteur')
    expect(recenserNotes({ s1: { m: note({ noteKey: 'B', noteNumber: 2 }) } }, places, ['Livre I'])[0].intitule).toBeNull()
  })

  it('range une division inconnue de l’ordre APRÈS celles qu’il nomme', () => {
    const places2 = new Map(places)
    places2.set('s3', place({ id: 3, segmentKey: 's3', division: 'Appendice', segmentNumero: 1 }))
    const recensees = recenserNotes(
      { s3: { m: note({ noteKey: 'C', noteNumber: 1 }) }, s1: { m: note({ noteKey: 'A', noteNumber: 1 }) } },
      places2,
      ['Livre I'],
    )
    expect(recensees.map(n => n.cle)).toEqual(['A', 'C'])
  })
})

describe('filtrerNotes', () => {
  const base: NoteRecensee = {
    cle: 'A', numero: 1, numeroInterne: 1, intitule: null, apercu: 'Voyez Isaïe 6, 3.',
    place: place({ id: 1, segmentKey: 's1' }), ancreOrpheline: false, aRevoir: false, apparatCritique: false,
  }
  const notes: NoteRecensee[] = [
    base,
    { ...base, cle: 'B', numero: 2, numeroInterne: 2, apercu: 'Étude sur l’Évangile', aRevoir: true },
    { ...base, cle: 'C', numero: 42, numeroInterne: 42, apercu: 'Sans place', place: null, ancreOrpheline: true },
    { ...base, cle: 'D', numero: 4, numeroInterne: 4, apercu: 'plana M; faciunt] fecerunt Q', intitule: 'Apparat critique', place: place({ id: 4, segmentKey: 's4', surface: 'apparat' }) },
  ]

  it('cherche SANS ACCENT et sans casse', () => {
    expect(filtrerNotes(notes, { texte: 'EVANGILE' }).map(n => n.cle)).toEqual(['B'])
    expect(filtrerNotes(notes, { texte: 'isaie' }).map(n => n.cle)).toEqual(['A'])
  })

  it('cherche AUSSI par le numéro qu’on a sous les yeux', () => {
    // ⚠️ Le numéro se cherche À L'ÉGALITÉ, quand le texte se cherche par inclusion :
    // « 42 » désigne la note 42, il ne retient pas toutes celles qui portent un 4.
    expect(filtrerNotes(notes, { texte: '42' }).map(n => n.cle)).toEqual(['C'])
  })

  it('retient les notes à relire, et les orphelines', () => {
    expect(filtrerNotes(notes, { aRevoir: true }).map(n => n.cle)).toEqual(['B'])
    expect(filtrerNotes(notes, { sansPlace: true }).map(n => n.cle)).toEqual(['C'])
  })

  it('retient un intitulé, celui des sans-type compris', () => {
    expect(filtrerNotes(notes, { intitule: 'Apparat critique' }).map(n => n.cle)).toEqual(['D'])
    expect(filtrerNotes(notes, { intitule: SANS_INTITULE }).map(n => n.cle)).toEqual(['A', 'B', 'C'])
  })

  it('retient une surface', () => {
    expect(filtrerNotes(notes, { surface: 'apparat' }).map(n => n.cle)).toEqual(['D'])
  })

  it('rend tout quand rien n’est demandé', () => {
    expect(filtrerNotes(notes, {})).toHaveLength(4)
  })
})

describe('comptesParIntitule', () => {
  it('compte par intitulé, le plus nombreux devant', () => {
    const n = (cle: string, intitule: string | null): NoteRecensee => ({
      cle, numero: 1, numeroInterne: 1, intitule, apercu: '', place: null,
      ancreOrpheline: true, aRevoir: false, apparatCritique: false,
    })
    expect(comptesParIntitule([n('a', null), n('b', 'Apparat critique'), n('c', null)])).toEqual([
      { intitule: SANS_INTITULE, n: 2 },
      { intitule: 'Apparat critique', n: 1 },
    ])
  })
})

describe('grouperParDivision', () => {
  it('réunit les notes VOISINES d’une même division, sans réordonner', () => {
    // ⚠️ Le groupement suit l'ordre reçu : c'est celui de la lecture, et le recensement
    // l'a déjà posé. Un groupement par table de hachage ramènerait ensemble des
    // divisions éloignées.
    const n = (cle: string, division: string | null): NoteRecensee => ({
      cle, numero: 1, numeroInterne: 1, intitule: null, apercu: '',
      place: division === null ? null : place({ id: 1, segmentKey: cle, division }),
      ancreOrpheline: division === null, aRevoir: false, apparatCritique: false,
    })
    const groupes = grouperParDivision([n('a', 'I'), n('b', 'I'), n('c', 'II'), n('d', null)])
    expect(groupes.map(g => [g.division, g.notes.length])).toEqual([['I', 2], ['II', 1], ['', 1]])
  })
})
