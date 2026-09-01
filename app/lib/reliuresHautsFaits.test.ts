import { describe, expect, it } from 'vitest'
import { FAMILLES } from './hautsFaits'
import {
  ANGLE_RELIURE, ENCRE_RELIURE, ENCRE_RELIURE_DOUCE, RELIURES,
  contrasteBlancSur, degradeReliure, teinteLaPlusFaible,
} from './reliuresHautsFaits'

/** L'opacité écrite dans les deux encres, relue plutôt que recopiée : une garde qui
 *  tient sa propre valeur ne garde plus rien le jour où l'encre change. */
function opacite(encre: string): number {
  const m = /rgba\(255,255,255,([\d.]+)\)/.exec(encre)
  if (!m) throw new Error(`Encre hors format : ${encre}`)
  return Number(m[1])
}

describe('les reliures des hauts faits', () => {
  it('couvre les trois familles, dans les deux thèmes', () => {
    for (const famille of FAMILLES) {
      expect(RELIURES[famille].clair).toHaveLength(2)
      expect(RELIURES[famille].sombre).toHaveLength(2)
    }
  })

  // ⛔ La garde centrale. Un cuir se change en repassant CECI, jamais à l'œil seul.
  it('porte son encre à 4,5 sur la teinte la plus claire, dans les deux thèmes', () => {
    for (const famille of FAMILLES) {
      for (const cuir of [false, true]) {
        const fond = teinteLaPlusFaible(famille, cuir)
        for (const encre of [ENCRE_RELIURE, ENCRE_RELIURE_DOUCE]) {
          const rapport = contrasteBlancSur(fond, opacite(encre))
          expect(
            rapport,
            `${famille} ${cuir ? 'Cuir' : 'Clair'} — encre ${encre} sur ${fond} : ${rapport.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  // ⚠️ Le défaut qui a fait reprendre la première version : au Cuir, deux reliures
  // sur trois se confondaient avec le sol brun (#1c1813) ou avec l'emplacement vide.
  // Une reliure doit MONTER sur son sol, la charte le dit des cartons de l'accueil.
  it('monte franchement sur le sol du Cuir', () => {
    const SOL_CUIR = '#1c1813'
    for (const famille of FAMILLES) {
      const rapport = contrasteBlancSur(SOL_CUIR, 0) // repère : le sol contre lui-même
      expect(rapport).toBeCloseTo(1)
      const [haut] = RELIURES[famille].sombre
      // Un cuir plus clair que le sol d'au moins un tiers de luminance relative.
      const ecart = contrasteBlancSur(haut, 1) / contrasteBlancSur(SOL_CUIR, 1)
      expect(ecart, `${famille} : ${haut} contre le sol ${SOL_CUIR}`).toBeLessThan(0.92)
    }
  })

  it('descend franchement sous le papier du Clair', () => {
    // Sur le papier crème, une reliure est au contraire PROFONDE : c'est l'inverse
    // du Cuir, et c'est ce qui fait qu'une case gagnée se voit d'un coup.
    for (const famille of FAMILLES) {
      const [haut] = RELIURES[famille].clair
      expect(contrasteBlancSur(haut, 1), famille).toBeGreaterThan(6)
    }
  })

  it('compose un dégradé à l’angle des cartons de l’accueil', () => {
    expect(ANGLE_RELIURE).toBe(160)
    expect(degradeReliure('ecriture', false)).toBe('linear-gradient(160deg, #2a3d30 0%, #1e2e24 100%)')
    expect(degradeReliure('ecriture', true)).toBe('linear-gradient(160deg, #3b352d 0%, #2e2a23 100%)')
  })

  // ⛔ Trois familles doivent se DISTINGUER, sinon la couleur ne dit plus rien.
  it('sépare les trois familles dans chaque thème', () => {
    for (const cuir of [false, true]) {
      const teintes = FAMILLES.map(f => teinteLaPlusFaible(f, cuir))
      expect(new Set(teintes).size, cuir ? 'Cuir' : 'Clair').toBe(FAMILLES.length)
    }
  })
})
