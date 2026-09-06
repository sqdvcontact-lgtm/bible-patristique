import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CRAN_MAX, encreDuCran, fondDuCran, libelleDensiteChapitre, libelleDensiteVerset,
} from './densitePatristique'

const lire = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

// La densité patristique (6 septembre 2026). 37 % du canon porte un renvoi, et la page
// biblique n'en laissait rien voir. Ces épreuves gardent les DÉCISIONS — l'échelle par
// rang, la teinte prise aux jetons, ce que la marque compte — non le dessin.
describe('densité patristique', () => {
  it('⛔ l’absence de teinte est un ÉTAT, non un sixième cran', () => {
    for (const rien of [undefined, null, 0, -1]) {
      expect(fondDuCran(rien), String(rien)).toBeUndefined()
      expect(encreDuCran(rien), String(rien)).toBeUndefined()
    }
    expect(libelleDensiteChapitre(undefined)).toBeUndefined()
  })

  it('la teinte vient des JETONS, jamais d’une couleur écrite', () => {
    // ⛔ Une couleur en dur ne suivrait pas le Cuir, où la rampe est plus courte : le
    // vert y est un or clair, et une case teintée à 42 % traverserait la bande médiane
    // où aucune encre ne tient.
    expect(fondDuCran(1)).toBe('var(--cs-densite-1)')
    expect(fondDuCran(CRAN_MAX)).toBe(`var(--cs-densite-${CRAN_MAX})`)
    expect(encreDuCran(3)).toBe('var(--cs-densite-encre)')
    expect(fondDuCran(1)).not.toMatch(/#|rgb|color-mix/)
  })

  it('borne un cran hors échelle au lieu de fabriquer un jeton qui n’existe pas', () => {
    expect(fondDuCran(9)).toBe(`var(--cs-densite-${CRAN_MAX})`)
    expect(fondDuCran(2.4)).toBe('var(--cs-densite-2)')
  })

  it('dit ce qu’il compte, au singulier comme au pluriel', () => {
    expect(libelleDensiteChapitre({ chapitre: 5, cran: 5, versetsCommentes: 47 }))
      .toBe('47 versets commentés par les Pères')
    expect(libelleDensiteChapitre({ chapitre: 5, cran: 1, versetsCommentes: 1 }))
      .toBe('1 verset commenté par les Pères')
    expect(libelleDensiteVerset({ canonId: 'JHN.1.1', oeuvres: 8, commentaires: 5, citations: 3, allusions: 0 }))
      .toBe('8 œuvres en parlent — 5 commentaires, 3 citations')
    expect(libelleDensiteVerset({ canonId: 'RUT.4.1', oeuvres: 1, commentaires: 0, citations: 1, allusions: 0 }))
      .toBe('1 œuvre en parle — 1 citation')
    // Une œuvre dont aucun lien n'est classé ne perd pas sa tête de phrase.
    expect(libelleDensiteVerset({ canonId: 'X.1.1', oeuvres: 2, commentaires: 0, citations: 0, allusions: 0 }))
      .toBe('2 œuvres en parlent')
  })

  it('les cinq jetons sont déclarés dans les DEUX thèmes', () => {
    const feuille = lire('../globals.css')
    for (let i = 1; i <= CRAN_MAX; i++) {
      const occurrences = feuille.split(`--cs-densite-${i}:`).length - 1
      expect(occurrences, `--cs-densite-${i}`).toBe(2)
    }
    expect(feuille.split('--cs-densite-encre:').length - 1).toBe(2)
  })

  it('⛔ la teinte ne se pose qu’AU REPOS, et la marque cède la gouttière aux actions', () => {
    const nav = lire('../components/NavLivres.tsx')
    const texte = lire('../components/TexteBible.tsx')
    // Le chapitre courant et la suggestion de recherche gardent leurs accents : ils
    // répondent à une autre question que la densité.
    expect(nav).toContain("estChapSuggere ? 'rgba(var(--cs-vert-rgb),0.15)'")
    expect(nav).toContain('fondDuCran(densites.get(ch)?.cran)')
    expect(texte).toContain('.verset-row--actif .marque-densite { opacity: 0; }')
  })

  it('⛔ ne recalcule RIEN : les deux échelles viennent du même cache', () => {
    const module = lire('./densitePatristique.ts')
    expect(module).toContain("from('densite_patristique_chapitres')")
    expect(module).toContain("from('versets_plus_cites_mat')")
    // ⚠️ Une seconde façon de compter ferait dire deux choses au même corpus.
    expect(module).not.toContain('liens_bibliques')
  })
})
