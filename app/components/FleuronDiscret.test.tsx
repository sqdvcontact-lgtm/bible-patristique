import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FleuronDiscret, { FLEURONS_DES_VIDES, OPACITE_FLEURON_DISCRET, poseDuVide, type VideFleuronne } from './FleuronDiscret'
import { FLEURONS } from '../lib/fleurons'

// ── LE PETIT FLEURON DE « AUCUNE OCCURRENCE » ─────────────────────────────────────────
//
// Demande de l'auteur (14 septembre 2026) : « ajoute un petit fleuron parmi la liste des
// fleurons ; le plus élégant, discret ». La garde tient la planche, sa pose et sa place.

/** Les dimensions d'un PNG se lisent dans son en-tête IHDR : deux entiers de 32 bits. */
function dimensionsPng(chemin: string) {
  const octets = readFileSync(chemin)
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) }
}

describe('le petit fleuron d’un état vide', () => {
  it('⛔ tous les vides prennent la croix à volutes (décision de l’auteur, 21 septembre 2026)', () => {
    for (const cle of Object.values(FLEURONS_DES_VIDES)) expect(cle).toBe('croix-volutes')
  })

  it('se pose en masque, muet, à l’opacité d’un ornement de vide', () => {
    const html = renderToStaticMarkup(<FleuronDiscret />)
    expect(html).toContain('class="cs-fleuron"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain(`mask-image:url(${poseDuVide('peres').chemin})`)
    expect(OPACITE_FLEURON_DISCRET).toBeGreaterThanOrEqual(0.42)
    expect(OPACITE_FLEURON_DISCRET).toBeLessThanOrEqual(0.5)
  })

  it('⛔ ne suit que « Aucune occurrence » dans le volet des Pères, jamais un filtre qui vide la liste', () => {
    const panneau = readFileSync(join(process.cwd(), 'app/components/PanneauPatristique.tsx'), 'utf8')
    expect(panneau).toContain('{itemsAffiches.length === 0 && <FleuronDiscret />}')
    expect(panneau.match(/<FleuronDiscret/g) ?? []).toHaveLength(1)
    // La discussion des lecteurs vit depuis le 2026-09-22 dans son propre onglet : c'est
    // lui qui ferme « Aucun commentaire. » par le fleuron des commentaires, et lui seul.
    const discussion = readFileSync(join(process.cwd(), 'app/components/OngletCommentaires.tsx'), 'utf8')
    expect(discussion).toContain('<FleuronDiscret vide="commentaires" />')
    expect(discussion.match(/<FleuronDiscret/g) ?? []).toHaveLength(1)
    expect(panneau).toContain("const OngletCommentaires = dynamic(() => import('@/app/components/OngletCommentaires'))")
  })

  it('⛔ chaque vide prend un fleuron du registre, servi au double de sa pose au plus', () => {
    for (const vide of Object.keys(FLEURONS_DES_VIDES) as VideFleuronne[]) {
      const p = poseDuVide(vide)
      expect(dimensionsPng(join(process.cwd(), 'public', p.chemin)), vide).toEqual({ largeur: p.largeur, hauteur: p.hauteur })
      expect(p.hauteur / (Number.parseFloat(p.pose) * 16), vide).toBeLessThanOrEqual(2.05)
      const cle = FLEURONS_DES_VIDES[vide]
      expect(FLEURONS.some(f => f.cle === cle), vide).toBe(true)
    }
  })

  it('⛔ plus aucune gravure d’état vide : chaque vide pose son fleuron', () => {
    const poses: [string, string][] = [
      ['app/oeuvre/[id]/OngletCommentaires.tsx', 'commentaires'],
      ['app/components/OngletCommentaires.tsx', 'commentaires'],
      ['app/oeuvre/[id]/OeuvreClient.tsx', 'liensBibliques'],
      ['app/recherche/RechercheClient.tsx', 'recherche'],
      ['app/polyglotte/page.tsx', 'polyglotte'],
    ]
    for (const [f, vide] of poses) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      expect(src, f).toContain(`<FleuronDiscret vide="${vide}" />`)
      expect(src, f).not.toMatch(/carapace-posee|arbre-corbeau|desert-fosse|ordinateur-ardent/)
    }
  })
})
