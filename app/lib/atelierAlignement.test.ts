import { describe, it, expect } from 'vitest'
import {
  cardinalite,
  colonnesTraduites,
  composerGroupes,
  coupeOriginaleProposee,
  degreDeLEmpan,
  divisionsMesurees,
  empanDuGroupe,
  empansDesMesures,
  jonctionsDeParagraphe,
  lireCleDivision,
  lireMesures,
  memesMembres,
  nouvelIdentifiant,
  planDeCoupe,
  planDeFusion,
  roleDuTraduit,
  type GroupeAtelier,
  type SegmentAtelier,
} from './atelierAlignement'
import { LIMITE_EMPAN, REPERE_EMPAN } from './grainAlignement'

const seg = (cle: string, numero: number, texte: string, paragraphe: number | null = 1, refNiv1 = 'Livre I'): SegmentAtelier =>
  ({ cle, numero, texte, refNiv1, refNiv2: null, refNiv3: null, paragraphe })

const groupe = (id: string, ordre: number, traduits: SegmentAtelier[], originaux: SegmentAtelier[]): GroupeAtelier =>
  ({ alignmentId: id, groupOrder: ordre, cardinality: null, status: 'reviewed_ai', traduits, originaux })

describe('cardinalite', () => {
  it('se lit reference:aligned, comme la table', () => {
    expect(cardinalite(1, 1)).toBe('1:1')
    expect(cardinalite(1, 3)).toBe('1:n')
    expect(cardinalite(3, 1)).toBe('n:1')
    expect(cardinalite(2, 2)).toBe('n:m')
    expect(cardinalite(0, 2)).toBe('0:1')
    expect(cardinalite(2, 0)).toBe('1:0')
    expect(cardinalite(0, 0)).toBeNull()
  })
})

describe('quelle colonne est traduite', () => {
  const langues: Record<string, string> = { LA: 'Latin', FR: 'Français', FR2: 'Français' }
  const langueDe = (id: string) => langues[id]
  it('le français en référence reste la référence (Somme)', () => {
    expect(roleDuTraduit({ referenceTextId: 'FR', alignedTextId: 'LA' }, langueDe, 'Latin')).toBe('reference')
  })
  it('le latin en référence fait du français la colonne alignée', () => {
    expect(roleDuTraduit({ referenceTextId: 'LA', alignedTextId: 'FR' }, langueDe, 'Latin')).toBe('aligned')
  })
  it('deux traductions se mesurent toutes les deux (Boèce)', () => {
    expect(colonnesTraduites({ referenceTextId: 'FR', alignedTextId: 'FR2' }, langueDe, 'Latin')).toEqual(['FR', 'FR2'])
    expect(colonnesTraduites({ referenceTextId: 'LA', alignedTextId: 'FR' }, langueDe, 'Latin')).toEqual(['FR'])
  })
})

describe('lireMesures', () => {
  it('écarte une ligne mal formée au lieu de la deviner', () => {
    const lignes = lireMesures([
      ['a', 'G1', 1, 1, 1, 'Livre I', null, null, 1, 400],
      ['b', 'G1', 1, 1, 1, 'Livre I', null, null, 2, 700],
      ['c', null, 1, 1, 2, null, null, null, null, 10],
      'bruit',
    ])
    expect(lignes.map(l => l.segmentKey)).toEqual(['a', 'b'])
    expect(lireMesures(null)).toEqual([])
  })

  it('mesure par la fonction du contrôle : à cheval, au-dessus du repère', () => {
    const lignes = lireMesures([
      ['a', 'G1', 1, 1, 1, 'Livre I', null, null, 1, 400],
      ['b', 'G1', 1, 1, 1, 'Livre I', null, null, 2, 700],
      ['c', 'G2', 1, 1, 2, 'Livre I', null, null, 3, LIMITE_EMPAN + 1],
      ['d', 'G3', 1, 2, 1, 'Livre II', null, null, 1, 100],
    ])
    const empans = empansDesMesures(lignes)
    const [g1, g2, g3] = empans
    expect(g1.aCheval).toBe(true)
    expect(degreDeLEmpan(g1)).toBe('a-cheval')
    expect(degreDeLEmpan(g2)).toBe('limite')
    expect(degreDeLEmpan({ aCheval: false, signes: REPERE_EMPAN + 1 })).toBe('repere')
    expect(degreDeLEmpan(g3)).toBeNull()
    const divisions = divisionsMesurees(lignes, empans)
    expect(divisions).toHaveLength(2)
    expect(divisions[0]).toMatchObject({ book: 1, division: 1, groupes: 2, aRevoir: 2, aCheval: 1, auDelaLimite: 1 })
    expect(divisions[1]).toMatchObject({ libelle: 'Livre II', groupes: 1, aRevoir: 0 })
  })

  it('relit une clé de division', () => {
    expect(lireCleDivision('3-12')).toEqual({ book: 3, division: 12 })
    expect(lireCleDivision('3-')).toBeNull()
    expect(lireCleDivision(null)).toBeNull()
  })
})

describe('composerGroupes', () => {
  it('range les membres dans l’ordre de lecture, non dans celui des membres', () => {
    const traduits = new Map([['t2', seg('t2', 2, 'deux')], ['t1', seg('t1', 1, 'un')]])
    const originaux = new Map([['o1', seg('o1', 1, 'unus')]])
    const [g] = composerGroupes({
      groupes: [{ alignment_id: 'G', group_order: 1, cardinality: '1:n', status: null }],
      membres: [
        { alignment_id: 'G', role: 'aligned', segment_key: 't2' },
        { alignment_id: 'G', role: 'aligned', segment_key: 't1' },
        { alignment_id: 'G', role: 'reference', segment_key: 'o1' },
      ],
      roleTraduit: 'aligned',
      segmentsTraduits: traduits,
      segmentsOriginaux: originaux,
    })
    expect(g.traduits.map(s => s.cle)).toEqual(['t1', 't2'])
    expect(g.originaux.map(s => s.cle)).toEqual(['o1'])
  })

  it('désigne les jonctions qui tombent sur une frontière de paragraphe', () => {
    const t = [seg('a', 1, 'x', 1), seg('b', 2, 'y', 1), seg('c', 3, 'z', 2), seg('d', 4, 'w', null)]
    expect(jonctionsDeParagraphe(t)).toEqual([false, true, false])
  })

  it('mesure un groupe comme le contrôle', () => {
    const g = groupe('G', 1, [seg('a', 1, 'x'.repeat(600), 1), seg('b', 2, 'y'.repeat(600), 2)], [])
    expect(empanDuGroupe(g)).toMatchObject({ signes: 1200, aCheval: true })
  })
})

describe('coupeOriginaleProposee', () => {
  it('répond à une coupe par la part de signes la plus proche', () => {
    const g = groupe('G', 1,
      [seg('a', 1, 'x'.repeat(100)), seg('b', 2, 'y'.repeat(100))],
      [seg('o1', 1, 'u'.repeat(50)), seg('o2', 2, 'v'.repeat(50)), seg('o3', 3, 'w'.repeat(100))])
    expect(coupeOriginaleProposee(g, 1)).toBe(2)
    expect(coupeOriginaleProposee(g, 0)).toBe(0)
    expect(coupeOriginaleProposee(g, 2)).toBe(3)
  })
  it('rend 0 sans original', () => {
    expect(coupeOriginaleProposee(groupe('G', 1, [seg('a', 1, 'x')], []), 1)).toBe(0)
  })
})

describe('planDeCoupe', () => {
  const g = groupe('G', 4,
    [seg('t1', 1, 'a'), seg('t2', 2, 'b'), seg('t3', 3, 'c')],
    [seg('o1', 1, 'x'), seg('o2', 2, 'y')])

  it('garde la tête, donne la suite au groupe neuf, rôles respectés', () => {
    const r = planDeCoupe({ groupe: g, k: 2, j: 1, roleTraduit: 'aligned', pris: new Set(['G-C1']) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan).toEqual({
      groupe: 'G', nouveau: 'G-C2',
      referenceGarde: ['o1'], alignedGarde: ['t1', 't2'],
      referencePart: ['o2'], alignedPart: ['t3'],
      cardinaliteGarde: '1:n', cardinalitePart: '1:1',
    })
  })

  it('admet une moitié sans original (une addition du traducteur)', () => {
    const r = planDeCoupe({ groupe: g, k: 2, j: 2, roleTraduit: 'reference', pris: new Set() })
    expect(r.ok && r.plan.cardinalitePart).toBe('1:0')
  })

  it('refuse une moitié vide et une jonction hors du groupe', () => {
    expect(planDeCoupe({ groupe: g, k: 0, j: 0, roleTraduit: 'reference', pris: new Set() }).ok).toBe(false)
    expect(planDeCoupe({ groupe: g, k: 3, j: 2, roleTraduit: 'reference', pris: new Set() }).ok).toBe(false)
    expect(planDeCoupe({ groupe: g, k: 4, j: 0, roleTraduit: 'reference', pris: new Set() }).ok).toBe(false)
    expect(planDeCoupe({ groupe: g, k: 1.5, j: 0, roleTraduit: 'reference', pris: new Set() }).ok).toBe(false)
  })

  it('choisit un identifiant libre', () => {
    expect(nouvelIdentifiant('X', new Set(['X-C1', 'X-C2']))).toBe('X-C3')
  })
})

describe('planDeFusion', () => {
  const a = groupe('A', 1, [seg('t2', 2, 'b')], [seg('o1', 1, 'x')])
  const b = groupe('B', 2, [seg('t3', 3, 'c'), seg('t1', 1, 'a')], [seg('o2', 2, 'y')])

  it('réunit les membres dans l’ordre de lecture', () => {
    const r = planDeFusion({ premier: a, second: b, roleTraduit: 'aligned' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan).toEqual({
      groupe: 'A', absorbe: 'B', reference: ['o1', 'o2'], aligned: ['t1', 't2', 't3'], cardinalite: 'n:m',
    })
  })

  it('refuse un second groupe qui ne suit pas le premier', () => {
    expect(planDeFusion({ premier: b, second: a, roleTraduit: 'aligned' }).ok).toBe(false)
    expect(planDeFusion({ premier: a, second: a, roleTraduit: 'aligned' }).ok).toBe(false)
  })
})

describe('memesMembres', () => {
  it('compare sans égard à l’ordre', () => {
    expect(memesMembres(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(memesMembres(['a', 'b'], ['a'])).toBe(false)
    expect(memesMembres(['a', 'a'], ['a', 'b'])).toBe(false)
  })
})
