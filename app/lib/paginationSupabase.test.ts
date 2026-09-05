import { describe, expect, it } from 'vitest'
import { chargerPagesEnParallele, chargerToutesPagesSupabase, lotsPourClauseIn } from './paginationSupabase'

describe('pagination Supabase', () => {
  it('charge au-delà du plafond et demande la page vide après un multiple exact', async () => {
    const source = [1, 2, 3, 4]
    const appels: [number, number][] = []
    const resultat = await chargerToutesPagesSupabase(async (debut, fin) => {
      appels.push([debut, fin])
      return { data: source.slice(debut, fin + 1), error: null }
    }, 2)
    expect(resultat).toEqual(source)
    expect(appels).toEqual([[0, 1], [2, 3], [4, 5]])
  })

  it('remonte l’erreur au lieu de rendre une liste vide', async () => {
    const erreur = new Error('permission denied')
    await expect(chargerToutesPagesSupabase(async () => ({ data: null, error: erreur })))
      .rejects.toBe(erreur)
  })
})

describe('pagination Supabase en parallèle', () => {
  const source = Array.from({ length: 5 }, (_, i) => i + 1)

  it('demande les pages d’une vague ENSEMBLE, et s’arrête sur une page courte', async () => {
    const debuts: number[] = []
    let enVol = 0
    let volMax = 0
    const resultat = await chargerPagesEnParallele(async (debut, fin) => {
      debuts.push(debut)
      enVol += 1
      volMax = Math.max(volMax, enVol)
      await Promise.resolve()
      enVol -= 1
      return { data: source.slice(debut, fin + 1), error: null }
    }, { taille: 2, vague: 3 })
    expect(resultat).toEqual(source)
    // Une seule vague : 0-1, 2-3, 4-5. La dernière rend une ligne sur deux, donc c’est fini.
    expect(debuts).toEqual([0, 2, 4])
    expect(volMax).toBe(3)
  })

  it('demande une SECONDE vague quand la dernière page était pleine', async () => {
    const long = Array.from({ length: 7 }, (_, i) => i + 1)
    const debuts: number[] = []
    const resultat = await chargerPagesEnParallele(async (debut, fin) => {
      debuts.push(debut)
      return { data: long.slice(debut, fin + 1), error: null }
    }, { taille: 3, vague: 2 })
    expect(resultat).toEqual(long)
    expect(debuts).toEqual([0, 3, 6, 9])
  })

  // ⛔ Une page qui SUIT une page courte se garde : la jeter perdrait des lignes en
  // silence si la table avait bougé entre les deux requêtes.
  it('garde l’ordre des pages, page courte au milieu comprise', async () => {
    const resultat = await chargerPagesEnParallele<number>(async (debut) => ({
      data: debut === 0 ? [1, 2] : debut === 2 ? [3] : [9],
      error: null,
    }), { taille: 2, vague: 3 })
    expect(resultat).toEqual([1, 2, 3, 9])
  })

  it('remonte l’erreur d’une page quelconque de la vague', async () => {
    const erreur = new Error('permission denied')
    await expect(chargerPagesEnParallele(async (debut) => (
      debut === 0 ? { data: [1, 2], error: null } : { data: null, error: erreur }
    ), { taille: 2, vague: 2 })).rejects.toBe(erreur)
  })

  it('refuse une vague qui n’en est pas une', async () => {
    await expect(chargerPagesEnParallele(async () => ({ data: [], error: null }), { vague: 0 }))
      .rejects.toThrow('Taille de vague invalide')
  })
})

describe('lots d’une clause in', () => {
  // Les clés de l’« Explication sur le psaume IV » (Commentaire sur les Psaumes de
  // Jean Chrysostome) : 392 segments, deux familles de clés mêlées. Un lot de 500
  // les prenait toutes et composait une adresse de 29 635 octets, que la passerelle
  // refusait d’un « 400 » nu — d’où « Erreur de chargement. Réessayer » sur cette
  // seule division, le 29 août 2026, pendant que ses voisines s’ouvraient.
  const clesDuPsaumeIV = [
    ...Array.from({ length: 200 }, (_, i) =>
      `TXT_A0014O0089_FR_1865_JEANNIN:review:SJC004-P${String(i).padStart(3, '0')}-S001-P001:001709`),
    ...Array.from({ length: 192 }, (_, i) =>
      `TXT_A0014O0089_FR_1865_JEANNIN:s${String(i).padStart(6, '0')}`),
  ]

  /** L’adresse que PostgREST écrira vraiment pour ce lot. */
  const adresse = (lot: string[]) =>
    `in.${encodeURIComponent(`(${lot.map(c => `"${c}"`).join(',')})`)}`.length

  it('découpe sur la longueur d’adresse, non sur le nombre de valeurs', () => {
    const lots = lotsPourClauseIn(clesDuPsaumeIV)
    expect(lots.flat()).toEqual(clesDuPsaumeIV)
    expect(lots.length).toBeGreaterThan(1)
    for (const lot of lots) expect(adresse(lot)).toBeLessThan(8000)
  })

  it('donne des lots plus courts aux clés longues qu’aux brèves', () => {
    const longues = lotsPourClauseIn(clesDuPsaumeIV.slice(0, 200))
    const breves = lotsPourClauseIn(clesDuPsaumeIV.slice(200))
    expect(longues[0].length).toBeLessThan(breves[0].length)
  })

  it('compte le percent-encodage, non les signes', () => {
    // Un deux-points pèse trois octets une fois écrit dans l’adresse.
    const avecDeuxPoints = lotsPourClauseIn(Array.from({ length: 500 }, (_, i) => `a:b:c:${i}`), 100)
    const sansDeuxPoints = lotsPourClauseIn(Array.from({ length: 500 }, (_, i) => `abc${i}`), 100)
    expect(avecDeuxPoints[0].length).toBeLessThan(sansDeuxPoints[0].length)
  })

  it('laisse partir seule une valeur qui dépasse à elle seule la barre, plutôt que de la perdre', () => {
    const enorme = 'x'.repeat(9000)
    expect(lotsPourClauseIn([enorme, 'court'])).toEqual([[enorme], ['court']])
  })

  it('ne fabrique pas de lot vide', () => {
    expect(lotsPourClauseIn([])).toEqual([])
  })
})
