import { describe, expect, it } from 'vitest'
import { chargerToutesPagesSupabase, lotsPourClauseIn } from './paginationSupabase'

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
