import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import postcss from 'postcss'
import { cssServi } from './cssServi'

describe('cssServi', () => {
  it('retire les commentaires et garde les déclarations', () => {
    const r = cssServi('.a {\n  /* une note */\n  color: red;\n}')
    expect(r).not.toContain('une note')
    expect(r).toContain('color: red;')
  })

  it('retire le retrait de gauche, qui ne veut rien dire en CSS', () => {
    expect(cssServi('        .a { color: red; }')).toBe('.a { color: red; }')
  })

  it('ne laisse aucune ligne vide', () => {
    expect(cssServi('.a{}\n\n\n.b{}')).toBe('.a{}\n.b{}')
  })

  it('est idempotent', () => {
    const s = '/* x */\n.a { color: red; }\n'
    expect(cssServi(cssServi(s))).toBe(cssServi(s))
  })
})

/** Les blocs <style> d'un fichier, sous leurs DEUX écritures : le bloc nu, et le bloc
 *  passé à « cssServi ». ⚠️ Découpe par recherche de chaîne plutôt que par expression
 *  régulière : celle-ci demanderait trois niveaux d'échappement et se relit mal. */
function blocsDeStyle(src: string): string[] {
  const out: string[] = []
  let i = 0
  for (;;) {
    const d = src.indexOf('<style>{', i)
    if (d < 0) break
    const f = src.indexOf('}</style>', d)
    if (f < 0) break
    let corps = src.slice(d + '<style>{'.length, f).trim()
    if (corps.startsWith('cssServi(')) corps = corps.slice('cssServi('.length, -1).trim()
    // Le gabarit de chaîne qui reste porte ses accents graves aux deux bouts.
    if (corps.startsWith('`') && corps.endsWith('`')) corps = corps.slice(1, -1)
    out.push(corps)
    i = f + 1
  }
  return out
}

/* ⛔ LA GARDE QUI COMPTE : le CSS SERVI doit rester du CSS que PostCSS accepte, car
   c'est lui que la chaîne de construction emploie. Une accolade perdue dans une feuille
   a déjà fait échouer deux déploiements de suite (AGENTS.md). Et le service ne doit rien
   retirer d'UTILE : autant de déclarations avant qu'après. */
describe('les blocs <style> du site restent du CSS valide une fois SERVIS', () => {
  for (const page of ['app/accueil/page.tsx']) {
    it(page, () => {
      const blocs = blocsDeStyle(fs.readFileSync(page, 'utf8'))
      expect(blocs.length, 'aucun bloc <style> trouvé — le motif a-t-il changé ?').toBeGreaterThan(0)
      for (const b of blocs) {
        expect(() => postcss.parse(cssServi(b))).not.toThrow()
        const declarations = (t: string) => (t.replace(/\/\*[\s\S]*?\*\//g, '').match(/;/g) ?? []).length
        expect(declarations(cssServi(b))).toBe(declarations(b))
      }
    })
  }
})
