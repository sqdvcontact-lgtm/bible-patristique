import { describe, expect, it } from 'vitest'
import { BLANC_ENTRE_LEGENDES, calerManchettes } from './manchettes'

/** Deux légendes se recouvrent-elles ? C'est la seule question qui compte. */
function recouvrements(hauts: readonly number[], hauteurs: readonly number[]): number {
  let n = 0
  for (let i = 1; i < hauts.length; i += 1) {
    if (hauts[i] < hauts[i - 1] + hauteurs[i - 1]) n += 1
  }
  return n
}

describe('la règle des manchettes', () => {
  it('cale chaque légende sur le haut de son unité quand la place suffit', () => {
    // Des unités bien plus hautes que leurs légendes : rien ne pousse.
    const { hauts } = calerManchettes([0, 300, 600], [40, 40, 40])
    expect(hauts).toEqual([0, 300, 600])
  })

  it('fait glisser la légende que la précédente rattrape', () => {
    // Le cas relevé par l'auteur : un paragraphe de 30 px, une notice de 150.
    const ancres = [0, 40, 90, 130]
    const hauteurs = [150, 60, 200, 40]
    const { hauts } = calerManchettes(ancres, hauteurs)
    expect(hauts).toEqual([0, 164, 238, 452])
    expect(recouvrements(hauts, hauteurs)).toBe(0)
  })

  it('⛔ ne remonte JAMAIS une légende au-dessus de son unité', () => {
    // La marge peut prendre du retard sur le texte ; elle ne peut pas le devancer,
    // sans quoi le filet de repère pointerait un passage qu'on n'a pas encore lu.
    const ancres = [0, 500, 520]
    const { hauts } = calerManchettes(ancres, [20, 20, 20])
    hauts.forEach((haut, i) => expect(haut, `légende ${i}`).toBeGreaterThanOrEqual(ancres[i]))
  })

  it('garde le blanc voulu entre deux légendes qui se suivent', () => {
    const { hauts } = calerManchettes([0, 10], [100, 30])
    expect(hauts[1] - (hauts[0] + 100)).toBe(BLANC_ENTRE_LEGENDES)
  })

  it('rend la hauteur que l’épreuve doit réserver, blanc final exclu', () => {
    const { hauteurTotale } = calerManchettes([0, 40], [150, 60])
    // 0 + 150 + 14 = 164 pour la seconde, puis 164 + 60 = 224.
    expect(hauteurTotale).toBe(224)
  })

  it('ne rend rien pour une épreuve vide', () => {
    expect(calerManchettes([], [])).toEqual({ hauts: [], hauteurTotale: 0 })
  })

  it('ne recouvre jamais rien, quelles que soient les hauteurs', () => {
    // Une centaine de cas, dont des unités très courtes et des notices très hautes.
    for (let essai = 0; essai < 100; essai += 1) {
      const n = 3 + (essai % 8)
      const ancres = Array.from({ length: n }, (_, i) => i * ((essai % 5) * 20))
      const hauteurs = Array.from({ length: n }, (_, i) => 20 + ((essai * 7 + i * 13) % 180))
      const { hauts } = calerManchettes(ancres, hauteurs)
      expect(recouvrements(hauts, hauteurs), `essai ${essai}`).toBe(0)
    }
  })
})
