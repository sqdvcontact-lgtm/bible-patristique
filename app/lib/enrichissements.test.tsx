import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { equilibrerEnrichissements, rendreEnrichi, sansEnrichissements } from './enrichissements'

/** Le texte que rendrait un nœud, marques de composition comprises. */
function texteDe(noeud: unknown): string {
  if (noeud == null || noeud === false) return ''
  if (typeof noeud === 'string' || typeof noeud === 'number') return String(noeud)
  if (Array.isArray(noeud)) return noeud.map(texteDe).join('')
  const el = noeud as ReactElement<{ children?: unknown }>
  return el.props ? texteDe(el.props.children) : ''
}

/** Les seuls passages rendus en `<em>`. */
function italiques(noeud: unknown, sortie: string[] = []): string[] {
  if (Array.isArray(noeud)) { noeud.forEach(n => italiques(n, sortie)); return sortie }
  if (noeud == null || typeof noeud !== 'object') return sortie
  const el = noeud as ReactElement<{ children?: unknown }>
  if (el.type === 'em') sortie.push(texteDe(el.props?.children))
  else italiques(el.props?.children, sortie)
  return sortie
}

describe('sansEnrichissements', () => {
  it('rend le texte nu', () => {
    expect(sansEnrichissements("La *Lettre de Barnabé* est anonyme.")).toBe('La Lettre de Barnabé est anonyme.')
  })
  it('tolère le vide', () => {
    expect(sansEnrichissements(null)).toBe('')
    expect(sansEnrichissements(undefined)).toBe('')
  })
})

describe('equilibrerEnrichissements', () => {
  it('referme une marque restée seule après troncature', () => {
    expect(equilibrerEnrichissements('Il cite la *Cité de Dieu')).toBe('Il cite la *Cité de Dieu*')
  })
  it('ne touche pas à un texte équilibré', () => {
    const t = 'Il cite la *Cité de Dieu* deux fois.'
    expect(equilibrerEnrichissements(t)).toBe(t)
  })
})

describe('rendreEnrichi', () => {
  it('met en italique le seul contenu des marques', () => {
    const n = rendreEnrichi("L'auteur de la *Lettre de Barnabé* est inconnu.")
    expect(italiques(n)).toEqual(['Lettre de Barnabé'])
    expect(texteDe(n)).toBe("L'auteur de la Lettre de Barnabé est inconnu.")
  })

  // Le défaut qu'une expression globale de MODULE aurait introduit : son
  // `lastIndex` survit à l'appel et fait sauter un titre sur deux.
  it('prend TOUS les titres, pas un sur deux', () => {
    const n = rendreEnrichi('Entre *Alpha* puis *Bêta* et enfin *Gamma*.')
    expect(italiques(n)).toEqual(['Alpha', 'Bêta', 'Gamma'])
  })

  it('rend deux fois de suite le même résultat', () => {
    const t = 'Voir *Alpha* et *Bêta*.'
    expect(italiques(rendreEnrichi(t))).toEqual(italiques(rendreEnrichi(t)))
  })

  it('compose les siècles À L INTÉRIEUR comme à l extérieur des italiques', () => {
    const n = rendreEnrichi('Au IIe siècle, la *Supplique du IIIe siècle* parut.')
    // Les chiffres romains sortent dans un span dédié : le texte reste entier.
    expect(texteDe(n)).toBe('Au IIe siècle, la Supplique du IIIe siècle parut.')
    expect(italiques(n)).toEqual(['Supplique du IIIe siècle'])
  })

  it('laisse un texte sans marque strictement intact', () => {
    expect(rendreEnrichi('Aucune marque ici.')).toBe('Aucune marque ici.')
  })

  it('tolère le vide', () => {
    expect(rendreEnrichi(null)).toBe('')
    expect(rendreEnrichi('')).toBe('')
  })

  // On ne passe jamais par du HTML : une balise écrite en base doit ressortir
  // comme du texte, jamais comme un élément.
  it('ne rend pas le HTML écrit dans la notice', () => {
    const n = rendreEnrichi('Un <script>alert(1)</script> et une *œuvre*.')
    expect(texteDe(n)).toContain('<script>alert(1)</script>')
    expect(italiques(n)).toEqual(['œuvre'])
  })
})
