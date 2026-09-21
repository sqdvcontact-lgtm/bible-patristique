import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * ⛔ La modale de signalement ne porte AUCUNE couleur écrite (reprise du 2026-09-21) :
 * sa forme vit dans globals.css, ses trois niveaux d'importance ont leurs jetons, et ces
 * jetons sont déclinés dans les DEUX thèmes, avec une encre lisible sur leur fond.
 */
const feuille = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
const source = readFileSync(join(process.cwd(), 'app/components/ModalSignalement.tsx'), 'utf8')

const blocCuir = feuille.slice(feuille.indexOf(':root[data-theme="sombre"] {'))
const valeur = (bloc: string, jeton: string) => bloc.match(new RegExp(`--${jeton}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0)
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('la modale de signalement, dans les deux thèmes', () => {
  it('le composant n’écrit aucune couleur', () => {
    const code = source.replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(code).not.toMatch(/rgba?\(/)
  })

  it('chaque niveau porte ses jetons au Clair et en Cuir, encre lisible sur son fond', () => {
    for (const niveau of ['mineur', 'important', 'bloquant']) {
      for (const bloc of [feuille, blocCuir]) {
        const fond = valeur(bloc, `cs-importance-${niveau}-fond`)
        const encre = valeur(bloc, `cs-importance-${niveau}-encre`)
        expect(fond, niveau).toBeTruthy()
        expect(encre, niveau).toBeTruthy()
        expect(contraste(fond!, encre!)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('la feuille pose un niveau retenu sur ses jetons, et le calque sur celui des fenêtres', () => {
    for (const niveau of ['mineur', 'important', 'bloquant']) {
      expect(feuille).toContain(`background: var(--cs-importance-${niveau}-fond);`)
    }
    const calque = feuille.slice(feuille.indexOf('.cs-signalement-calque {'))
    expect(calque.slice(0, calque.indexOf('}'))).toContain('background: var(--cs-calque-modale);')
  })
})
