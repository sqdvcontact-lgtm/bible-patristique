import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FleuronDiscret, { FLEURONS_DES_VIDES, HAUTEUR_FLEURON_DISCRET, OPACITE_FLEURON_DISCRET, PLANCHE_FLEURON_DISCRET, poseDuVide, type VideFleuronne } from './FleuronDiscret'
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
  it('déclare les dimensions réelles de sa planche', () => {
    const reelles = dimensionsPng(join(process.cwd(), 'public', PLANCHE_FLEURON_DISCRET.chemin))
    expect(reelles).toEqual({ largeur: PLANCHE_FLEURON_DISCRET.largeur, hauteur: PLANCHE_FLEURON_DISCRET.hauteur })
  })

  it('⛔ se sert au double de sa taille d’affichage, jamais plus', () => {
    const affichee = Number.parseFloat(HAUTEUR_FLEURON_DISCRET) * 16
    const rapport = PLANCHE_FLEURON_DISCRET.hauteur / affichee
    expect(rapport).toBeLessThanOrEqual(2)
    expect(rapport).toBeGreaterThanOrEqual(1.75)
  })

  it('se pose en masque, muet, à l’opacité d’un ornement de vide', () => {
    const html = renderToStaticMarkup(<FleuronDiscret />)
    expect(html).toContain('class="cs-fleuron"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain(`mask-image:url(${PLANCHE_FLEURON_DISCRET.chemin})`)
    expect(OPACITE_FLEURON_DISCRET).toBeGreaterThanOrEqual(0.42)
    expect(OPACITE_FLEURON_DISCRET).toBeLessThanOrEqual(0.5)
  })

  it('⛔ ne suit que « Aucune occurrence » dans le volet des Pères, jamais un filtre qui vide la liste', () => {
    const panneau = readFileSync(join(process.cwd(), 'app/components/PanneauPatristique.tsx'), 'utf8')
    expect(panneau).toContain('{itemsAffiches.length === 0 && <FleuronDiscret />}')
    expect(panneau).toContain('<FleuronDiscret vide="commentaires" />')
    expect(panneau.match(/<FleuronDiscret/g) ?? []).toHaveLength(2)
  })

  it('⛔ chaque vide prend un fleuron du registre, servi au double de sa pose au plus', () => {
    for (const vide of Object.keys(FLEURONS_DES_VIDES) as VideFleuronne[]) {
      const p = poseDuVide(vide)
      expect(dimensionsPng(join(process.cwd(), 'public', p.chemin)), vide).toEqual({ largeur: p.largeur, hauteur: p.hauteur })
      expect(p.hauteur / (Number.parseFloat(p.pose) * 16), vide).toBeLessThanOrEqual(2.05)
      const cle = FLEURONS_DES_VIDES[vide]
      if (cle !== null) expect(FLEURONS.some(f => f.cle === cle), vide).toBe(true)
    }
  })

  it('⛔ plus aucune gravure d’état vide : chaque vide pose son fleuron', () => {
    const poses: [string, string][] = [
      ['app/oeuvre/[id]/OngletCommentaires.tsx', 'commentaires'],
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
