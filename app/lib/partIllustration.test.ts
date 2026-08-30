import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { MESURE_COLONNE, estHabillable, largeurServie, partIllustration } from './bibleEdition'

/**
 * ⛔ LA PART DE LA COLONNE EST ÉCRITE DEUX FOIS, ET LES DEUX DOIVENT S'ACCORDER.
 *
 * La page de lecture la calcule ici ; `scripts/fillion/detourer-gravures.mjs` la
 * recalcule pour savoir à quelle largeur SERVIR le fichier. Un script `.mjs` ne
 * peut pas importer ce module TypeScript, et deux copies d'une mesure ne restent
 * égales que par accident : si elles divergent, la page compose à une taille et
 * le fichier est fabriqué pour une autre, ce qui est exactement le défaut que
 * cette part est censée corriger.
 *
 * Même garde que celle qui tient `get_niv1_texte` accordée à `NATURES_CORPS`.
 */

const SCRIPT = 'scripts/fillion/detourer-gravures.mjs'

function nombreDuScript(nom: string): number {
  const source = readFileSync(SCRIPT, 'utf8')
  const trouve = source.match(new RegExp(`^const ${nom} = ([0-9.]+)$`, 'm'))
  if (!trouve) throw new Error(`${nom} introuvable dans ${SCRIPT}`)
  return Number(trouve[1])
}

describe('la part de la colonne', () => {
  it('⛔ la chaîne d’image emploie EXACTEMENT les mêmes bornes que la page', () => {
    // On éprouve la fonction plutôt que de relire ses constantes : c'est le
    // résultat qui compte, et une borne renommée ne doit pas casser la garde.
    const PLANCHER = nombreDuScript('PLANCHER_VIGNETTE')
    const PLAFOND = nombreDuScript('PLAFOND_VIGNETTE')
    const AU_FIL = nombreDuScript('PART_AU_FIL')
    expect(partIllustration('vignette', 0.01)).toBe(PLANCHER)
    expect(partIllustration('vignette', 0.99)).toBe(PLAFOND)
    expect(partIllustration('au-fil', 0.7)).toBe(AU_FIL)
    expect(nombreDuScript('MESURE_COLONNE')).toBe(MESURE_COLONNE)
  })

  it('suit la largeur imprimée entre ses deux bornes', () => {
    // Fillion imprime ses vignettes de 19,8 % à 57,5 % de sa page.
    expect(partIllustration('vignette', 0.198)).toBe(0.40)
    expect(partIllustration('vignette', 0.402)).toBeCloseTo(0.402, 6)
    expect(partIllustration('vignette', 0.575)).toBeCloseTo(0.575, 6)
  })

  it('⛔ une largeur imprimée INCONNUE retombe sur le plancher, jamais sur zéro', () => {
    // Une découpe du corpus n'a pas de bornes normalisées : elle doit rester
    // lisible, non disparaître.
    expect(partIllustration('vignette', null)).toBe(0.40)
    expect(partIllustration('vignette', undefined)).toBe(0.40)
  })

  it('une PLANCHE prend toute la mesure, une SCÈNE presque toute', () => {
    expect(partIllustration('hors-texte', 0.2)).toBe(1)
    expect(partIllustration('au-fil', 0.847)).toBe(0.90)
  })

  it('⛔ l’habillage cesse au-delà du seuil, et c’est un axe DISTINCT du détourage', () => {
    expect(estHabillable(partIllustration('vignette', 0.402))).toBe(true)
    expect(estHabillable(partIllustration('vignette', 0.575))).toBe(false)
    // ⚠️ « Scène de deuil » est une gravure au TRAIT, donc détourée, et pourtant
    //    trop large pour être habillée. Les deux questions ne se confondent pas.
    expect(estHabillable(partIllustration('au-fil', 0.847))).toBe(false)
  })

  it('sert au DOUBLE de la taille d’affichage, jamais plus', () => {
    expect(largeurServie(0.40)).toBe(Math.round(2 * 0.40 * MESURE_COLONNE))
    expect(largeurServie(0.575)).toBe(575)
    expect(largeurServie(0.90)).toBe(900)
  })
})
