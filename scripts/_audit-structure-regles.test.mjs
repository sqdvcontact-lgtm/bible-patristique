import { describe, expect, it } from 'vitest'
import {
  COUVERTURE_MINIMALE, TEMOINS_MINIMUM,
  absences, compresserChapitres, compresserReference, couperCanonId, couverture, decalages,
  partagerParLot, referenceOrigine, regroupements, scissions, surnumeraires,
} from './_audit-structure-regles.mjs'

// Un livre de complaisance : assez de créneaux pour que la couverture soit acquise.
const canonDe = (livre, ch, n) =>
  Array.from({ length: n }, (_, i) => ({ id: `${livre}.${ch}.${i + 1}`, livre, ch_canon: ch, v_canon: i + 1 }))

const ligneDe = (trad_id, livre, ch, v, extra = {}) => ({
  trad_id, livre, ch_orig: ch, v_orig: v, canon_id: `${livre}.${ch}.${v}`, canon_id_fin: null, ...extra,
})

describe('couverture', () => {
  it('compte les créneaux DISTINCTS, un regroupement ne comptant qu’une fois', () => {
    const lignes = [
      ligneDe('TR0001', 'GEN', 1, 1),
      ligneDe('TR0001', 'GEN', 1, 2),
      { ...ligneDe('TR0001', 'GEN', 1, 3), canon_id: 'GEN.1.2' },
    ]
    expect(couverture(lignes).get('TR0001|GEN')).toBe(2)
  })
  it('ignore les versets sans créneau', () => {
    expect(couverture([{ trad_id: 'TR0005', livre: 'PSA', canon_id: null }]).size).toBe(0)
  })
})

describe('absences', () => {
  const canon = canonDe('GEN', 1, COUVERTURE_MINIMALE + 1)
  const porteur = trad => canon.map(c => ligneDe(trad, 'GEN', 1, c.v_canon))

  it('voit le créneau qui manque à une traduction couvrant le livre', () => {
    const lignes = [
      ...porteur('TR0001').filter(l => l.canon_id !== 'GEN.1.7'),
      ...porteur('TR0002'), ...porteur('TR0003'), ...porteur('TR0004'),
    ]
    const trouves = absences(canon, lignes)
    expect(trouves).toHaveLength(1)
    expect(trouves[0]).toMatchObject({ trad_id: 'TR0001', canon_id: 'GEN.1.7', temoins: 3 })
  })

  it('se tait quand le créneau n’a pas assez de témoins', () => {
    const lignes = [...porteur('TR0002').filter(l => l.canon_id !== 'GEN.1.7'), ...porteur('TR0003')]
    expect(absences(canon, lignes).filter(a => a.canon_id === 'GEN.1.7')).toHaveLength(0)
    expect(TEMOINS_MINIMUM).toBe(3)
  })

  it('se tait sur une traduction qui ne couvre pas le livre', () => {
    const lignes = [
      ...porteur('TR0001'), ...porteur('TR0002'), ...porteur('TR0003'),
      ligneDe('TR0005', 'GEN', 1, 1), ligneDe('TR0005', 'GEN', 1, 2),
    ]
    expect(absences(canon, lignes).some(a => a.trad_id === 'TR0005')).toBe(false)
  })
})

describe('regroupements', () => {
  it('voit deux versets source dans un même créneau, et les rend numérotés', () => {
    const lignes = [
      ligneDe('TR0001', 'PSA', 67, 5),
      { ...ligneDe('TR0001', 'PSA', 67, 6), canon_id: 'PSA.67.5' },
      ligneDe('TR0002', 'PSA', 67, 5),
    ]
    const r = regroupements(lignes)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ trad_id: 'TR0001', canon_id: 'PSA.67.5', versets: ['67,5', '67,6'] })
  })
})

describe('scissions', () => {
  it('voit un verset source étalé sur deux créneaux', () => {
    const lignes = [{ ...ligneDe('TR0005', 'GEN', 3, 1), canon_id_fin: 'GEN.3.2' }, ligneDe('TR0005', 'GEN', 3, 3)]
    expect(scissions(lignes)).toEqual([
      { trad_id: 'TR0005', livre: 'GEN', canon_id: 'GEN.3.1', canon_id_fin: 'GEN.3.2', origine: '3,1' },
    ])
  })
  it('ne prend pas un `canon_id_fin` égal au créneau pour une scission', () => {
    expect(scissions([{ ...ligneDe('TR0005', 'GEN', 3, 1), canon_id_fin: 'GEN.3.1' }])).toEqual([])
  })
})

describe('surnuméraires', () => {
  it('voit le verset source sans créneau, suffixe compris', () => {
    const lignes = [{ ...ligneDe('TR0005', 'DAN', 3, 24), canon_id: null, v_orig_suffixe: 'a' }]
    expect(surnumeraires(lignes)).toEqual([{ trad_id: 'TR0005', livre: 'DAN', origine: '3,24a' }])
  })
})

describe('décalages', () => {
  const canon = canonDe('PSA', 9, 10)

  it('ne dit RIEN d’un décalage constant : c’est la numérotation de l’édition', () => {
    const lignes = canon.map(c => ({ ...ligneDe('TR0004', 'PSA', 9, c.v_canon + 1), canon_id: c.id }))
    expect(decalages(canon, lignes).versets).toEqual([])
  })

  it('voit le verset qui rompt le régime du chapitre', () => {
    const lignes = canon.map(c => ({
      ...ligneDe('TR0004', 'PSA', 9, c.v_canon + (c.v_canon === 7 ? 4 : 1)), canon_id: c.id,
    }))
    const { versets } = decalages(canon, lignes)
    expect(versets).toHaveLength(1)
    expect(versets[0]).toMatchObject({ trad_id: 'TR0004', ch_canon: 9, v_canon: 7, regime: '0/1', ecart: '0/4' })
  })

  it('rend le CHAPITRE, et non ses versets, quand aucun écart ne tient la moitié', () => {
    const lignes = canon.map((c, i) => ({ ...ligneDe('TR0001', 'PSA', 9, c.v_canon + i), canon_id: c.id }))
    const { versets, chapitres } = decalages(canon, lignes)
    expect(versets).toEqual([])
    expect(chapitres).toHaveLength(1)
    expect(chapitres[0]).toMatchObject({ trad_id: 'TR0001', livre: 'PSA', ch_canon: 9, versets: 10 })
  })

  it('écarte les créneaux regroupés : l’écart y varie par construction', () => {
    const lignes = [
      ...canon.map(c => ({ ...ligneDe('TR0001', 'PSA', 9, c.v_canon), canon_id: c.id })),
      { ...ligneDe('TR0001', 'PSA', 9, 99), canon_id: 'PSA.9.3' },
    ]
    expect(decalages(canon, lignes).versets).toEqual([])
  })
})

describe('référence compressée', () => {
  it('replie les versets qui se suivent, et n’écrit le livre qu’une fois', () => {
    const coords = [{ ch: 3, v: 5 }, { ch: 3, v: 6 }, { ch: 3, v: 7 }, { ch: 4, v: 1 }, { ch: 9, v: 14 }]
    expect(compresserReference('JOS', coords)).toBe('JOS 3:5-7, 4:1, 9:14')
  })
  it('trie avant de replier', () => {
    expect(compresserReference('GEN', [{ ch: 2, v: 4 }, { ch: 1, v: 1 }, { ch: 2, v: 3 }])).toBe('GEN 1:1, 2:3-4')
  })
  it('tronque au-delà du nombre de jetons demandé, en disant combien manquent', () => {
    const coords = Array.from({ length: 5 }, (_, i) => ({ ch: 1, v: 2 * i + 1 }))
    expect(compresserReference('PSA', coords, 2)).toBe('PSA 1:1, 1:3, … (+3)')
  })
  it('rend une référence que sait relire la Polyglotte', () => {
    // Même expression que `construireSensibilite` dans `app/polyglotte/page.tsx`.
    const jeton = /^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?(?:\s*-\s*(\d+))?$/
    const ref = compresserReference('1CH', [{ ch: 5, v: 27 }, { ch: 5, v: 28 }, { ch: 6, v: 1 }])
    for (const t of ref.split(',')) expect(jeton.test(t.trim())).toBe(true)
  })
})

describe('référence de chapitres', () => {
  it('replie les chapitres qui se suivent, sans deux-points', () => {
    expect(compresserChapitres('PSA', [9, 17, 18, 19, 40])).toBe('PSA 9, 17-19, 40')
  })
  it('dédoublonne et trie', () => {
    expect(compresserChapitres('SIR', [24, 7, 24])).toBe('SIR 7, 24')
  })
  it('rend une référence que la Polyglotte lit comme des chapitres ENTIERS', () => {
    const jeton = /^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?(?:\s*-\s*(\d+))?$/
    const [premier, second] = compresserChapitres('PSA', [9, 17, 18]).split(',').map(t => t.trim())
    const a = jeton.exec(premier), b = jeton.exec(second)
    expect([a[1], a[2], a[3]]).toEqual(['PSA', '9', undefined])   // chapitre entier
    expect([b[2], b[5]]).toEqual(['17', '18'])                     // plage de chapitres
  })
})

describe('partage systématique / isolé', () => {
  it('sépare le lot d’un livre entier des cas éparpillés', () => {
    const cas = [
      ...Array.from({ length: 9 }, (_, i) => ({ trad_id: 'TR0002', livre: 'EST', canon_id: `EST.10.${i + 1}` })),
      { trad_id: 'TR0001', livre: 'GEN', canon_id: 'GEN.50.23' },
    ]
    const { systematiques, isoles } = partagerParLot(cas)
    expect(systematiques).toHaveLength(9)
    expect(isoles).toHaveLength(1)
    expect(isoles[0].dans_ce_livre).toBe(1)
  })
})

describe('outils de coordonnées', () => {
  it('coupe un identifiant de créneau', () => {
    expect(couperCanonId('1CH.5.27')).toEqual({ livre: '1CH', ch: 5, v: 27 })
    expect(couperCanonId('GEN')).toBeNull()
  })
  it('rend la référence d’origine avec son suffixe', () => {
    expect(referenceOrigine({ ch_orig: 3, v_orig: 24, v_orig_suffixe: 'b' })).toBe('3,24b')
    expect(referenceOrigine({ ch_orig: null, v_orig: null })).toBe('?,?')
  })
})
