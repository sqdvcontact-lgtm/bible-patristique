import { describe, it, expect } from 'vitest'
import {
  cleDeParagraphe,
  longueurUnicode,
  mesurerEmpans,
  bilanDuGrain,
  empansARependre,
  LIMITE_EMPAN,
  REPERE_EMPAN,
  type SegmentTraduit,
} from './grainAlignement'

const seg = (
  segmentKey: string,
  paragraphe: number | null,
  longueur: number,
  division: Partial<Pick<SegmentTraduit, 'refNiv1' | 'refNiv2' | 'refNiv3'>> = {},
): SegmentTraduit => ({ segmentKey, paragraphe, longueur, ...division })

const groupes = (paires: readonly [string, string][]) => new Map(paires)

describe('cleDeParagraphe', () => {
  it('distingue le même numéro de paragraphe dans DEUX divisions', () => {
    // Le piège : `paragraphe` repart à 1 dans chaque division. Sans la division, les
    // deux paragraphes 1 se confondraient et un groupe à cheval passerait pour sain.
    const a = cleDeParagraphe(seg('a', 1, 10, { refNiv1: 'Livre premier' }))
    const b = cleDeParagraphe(seg('b', 1, 10, { refNiv1: 'Livre second' }))
    expect(a).not.toBe(b)
  })

  it('réunit deux segments du même paragraphe de la même division', () => {
    const commun = { refNiv1: 'Livre premier', refNiv2: 'I' }
    expect(cleDeParagraphe(seg('a', 3, 10, commun))).toBe(cleDeParagraphe(seg('b', 3, 20, commun)))
  })

  it('descend jusqu’au niveau 3', () => {
    const a = cleDeParagraphe(seg('a', 1, 10, { refNiv1: 'L', refNiv2: 'I', refNiv3: '1' }))
    const b = cleDeParagraphe(seg('b', 1, 10, { refNiv1: 'L', refNiv2: 'I', refNiv3: '2' }))
    expect(a).not.toBe(b)
  })

  it('sans numéro, la clé est NULLE — on ne range ni d’un côté ni de l’autre', () => {
    expect(cleDeParagraphe(seg('a', null, 10))).toBeNull()
  })
})

describe('le paragraphe INCONNU est un troisième état', () => {
  // Les six préfaces des livres VI et VII de la Cité de Dieu ne portent aucun numéro :
  // les fondre en un seul paragraphe laisse passer un chevauchement réel, en faire un
  // chacun crie à la violation. Ni l'un ni l'autre : on dit qu'on ne sait pas.
  const commun = { refNiv1: 'Livre sixième' }

  it('ne compte PAS pour un franchissement', () => {
    const empans = mesurerEmpans(
      [seg('a', 1, 50, commun), seg('b', null, 50, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans[0].aCheval).toBe(false)
    expect(empans[0].paragrapheInconnu).toBe(true)
    expect(empans[0].segmentsSansParagraphe).toBe(1)
  })

  it('deux segments sans numéro ne sont pas fondus en un paragraphe', () => {
    const empans = mesurerEmpans(
      [seg('a', null, 50, commun), seg('b', null, 50, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans[0].paragraphes).toHaveLength(0)
    expect(empans[0].segmentsSansParagraphe).toBe(2)
    expect(empans[0].aCheval).toBe(false)
  })

  it('n’efface pas un franchissement AVÉRÉ par ailleurs', () => {
    const empans = mesurerEmpans(
      [seg('a', 1, 50, commun), seg('b', null, 50, commun), seg('c', 2, 50, commun)],
      groupes([['a', 'g1'], ['b', 'g1'], ['c', 'g1']]),
    )
    expect(empans[0].aCheval).toBe(true)
    expect(empans[0].paragrapheInconnu).toBe(true)
  })
})

describe('longueurUnicode', () => {
  it('compte les POINTS DE CODE, comme `length()` de Postgres', () => {
    const horsBmp = String.fromCodePoint(0x1d11e)
    expect(horsBmp.length).toBe(2)
    expect(longueurUnicode(horsBmp)).toBe(1)
  })

  it('compte le grec sans le déformer', () => {
    expect(longueurUnicode('Διδαχή')).toBe(6)
  })
})

describe('mesurerEmpans', () => {
  it('un groupe tenu dans un paragraphe ne franchit rien', () => {
    const commun = { refNiv1: 'L', refNiv2: 'I' }
    const empans = mesurerEmpans(
      [seg('a', 1, 100, commun), seg('b', 1, 150, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans).toHaveLength(1)
    expect(empans[0]).toMatchObject({ segments: 2, signes: 250, aCheval: false, tropLong: false })
  })

  it('⛔ signale le groupe qui enjambe DEUX paragraphes', () => {
    const commun = { refNiv1: 'L', refNiv2: 'I' }
    const empans = mesurerEmpans(
      [seg('a', 1, 100, commun), seg('b', 2, 100, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans[0].aCheval).toBe(true)
    expect(empans[0].paragraphes).toHaveLength(2)
  })

  it('⛔ signale le groupe qui enjambe deux DIVISIONS au même numéro', () => {
    const empans = mesurerEmpans(
      [seg('a', 1, 100, { refNiv1: 'Livre premier' }), seg('b', 1, 100, { refNiv1: 'Livre second' })],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans[0].aCheval).toBe(true)
  })

  it('ignore les segments qu’aucun groupe ne couvre', () => {
    const empans = mesurerEmpans(
      [seg('a', 1, 100), seg('hors', 1, 5000), seg('b', 1, 100)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans).toHaveLength(1)
    expect(empans[0].signes).toBe(200)
  })

  it('ne trie RIEN : l’ordre de lecture reçu fait foi', () => {
    // Un groupe à cheval revient au premier paragraphe après en avoir traversé un autre.
    const commun = { refNiv1: 'L' }
    const empans = mesurerEmpans(
      [seg('a', 1, 10, commun), seg('b', 2, 10, commun), seg('c', 1, 10, commun)],
      groupes([['a', 'g1'], ['b', 'g1'], ['c', 'g1']]),
    )
    expect(empans[0].paragraphes).toHaveLength(2)
    expect(empans[0].segments).toBe(3)
  })

  it('rend les groupes dans l’ordre où ils paraissent', () => {
    const empans = mesurerEmpans(
      [seg('a', 1, 10), seg('b', 2, 10), seg('c', 3, 10)],
      groupes([['a', 'g1'], ['b', 'g2'], ['c', 'g1']]),
    )
    expect(empans.map(e => e.alignmentId)).toEqual(['g1', 'g2'])
  })

  it('la limite haute se franchit, elle ne s’atteint pas', () => {
    const juste = mesurerEmpans([seg('a', 1, LIMITE_EMPAN)], groupes([['a', 'g1']]))
    expect(juste[0].tropLong).toBe(false)
    const dessus = mesurerEmpans([seg('a', 1, LIMITE_EMPAN + 1)], groupes([['a', 'g1']]))
    expect(dessus[0].tropLong).toBe(true)
  })

  it('un empan trop long se constate sur la SOMME, non sur un segment', () => {
    const commun = { refNiv1: 'L' }
    const empans = mesurerEmpans(
      [seg('a', 1, 800, commun), seg('b', 1, 800, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(empans[0].tropLong).toBe(true)
  })
})

describe('bilanDuGrain', () => {
  const empansDe = (longueurs: readonly number[]) =>
    mesurerEmpans(
      longueurs.map((n, i) => seg(`s${i}`, i, n)),
      groupes(longueurs.map((_, i) => [`s${i}`, `g${i}`] as [string, string])),
    )

  it('prend la médiane BASSE, comme `percentile_disc(0.5)`', () => {
    // Quatre valeurs : la médiane basse est la deuxième, non la moyenne des deux du milieu.
    expect(bilanDuGrain(empansDe([100, 200, 300, 400])).medianeSignes).toBe(200)
    expect(bilanDuGrain(empansDe([100, 200, 300])).medianeSignes).toBe(200)
  })

  it('compte ce qui franchit et ce qui dépasse', () => {
    const bilan = bilanDuGrain(empansDe([100, REPERE_EMPAN, LIMITE_EMPAN + 1, 9000]))
    expect(bilan).toMatchObject({ empans: 4, tropLong: 2, sousLeRepere: 2, maxSignes: 9000 })
    expect(bilan.frontieresTenues).toBe(true)
  })

  it('un ensemble sans empan ne rend pas NaN', () => {
    expect(bilanDuGrain([])).toMatchObject({ empans: 0, medianeSignes: 0, maxSignes: 0, frontieresTenues: true })
  })

  it('⚠️ compte à part ce qui repose sur un paragraphe inconnu', () => {
    // Les frontières sont « tenues », mais sur une donnée muette : lire l'un sans l'autre,
    // c'est prendre une ignorance pour une garantie.
    const empans = mesurerEmpans(
      [seg('a', 1, 50), seg('b', null, 50)],
      groupes([['a', 'g1'], ['b', 'g2']]),
    )
    const bilan = bilanDuGrain(empans)
    expect(bilan).toMatchObject({ empans: 2, aCheval: 0, paragrapheInconnu: 1 })
    expect(bilan.frontieresTenues).toBe(true)
  })

  it('⛔ un seul groupe à cheval suffit à refuser l’ensemble', () => {
    const commun = { refNiv1: 'L' }
    const empans = mesurerEmpans(
      [seg('a', 1, 10, commun), seg('b', 2, 10, commun)],
      groupes([['a', 'g1'], ['b', 'g1']]),
    )
    expect(bilanDuGrain(empans).frontieresTenues).toBe(false)
  })
})

describe('empansARependre', () => {
  it('met le chevauchement AVANT la longueur, puis range par longueur', () => {
    const commun = { refNiv1: 'L' }
    const empans = mesurerEmpans(
      [
        seg('a', 1, 20, commun), seg('b', 2, 20, commun), // g1 : à cheval, court
        seg('c', 5, 9000, commun), // g2 : tenu, très long
        seg('d', 6, 3000, commun), // g3 : tenu, long
        seg('e', 7, 100, commun), // g4 : sain
      ],
      groupes([['a', 'g1'], ['b', 'g1'], ['c', 'g2'], ['d', 'g3'], ['e', 'g4']]),
    )
    expect(empansARependre(empans).map(e => e.alignmentId)).toEqual(['g1', 'g2', 'g3'])
  })
})
