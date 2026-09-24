import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import OngletsPage from './OngletsPage'

// ── LA BARRE D'ONGLETS DU SITE, ET CE QU'ELLE PORTE DÉSORMAIS POUR TOUTES ───────────
// Audit d'harmonie (2026-09-23) : le volet des Pères portait sa barre à lui, en capitales,
// avec ses comptes, sa circulation aux flèches et `aria-controls` ; le modèle n'avait rien
// de tout cela. Le modèle prend l'accessibilité, et le volet prend le modèle.

const onglets = [
  { cle: 'a' as const, libelle: 'Pères de l’Église', sous: <span className="compte">12</span> },
  { cle: 'b' as const, libelle: 'Discussion' },
]

describe('OngletsPage', () => {
  it('ne met que l’onglet retenu dans l’ordre de tabulation, et nomme son panneau', () => {
    const html = renderToStaticMarkup(
      <OngletsPage onglets={onglets} actif="b" choisir={() => {}} intitule="Ce que montre le volet"
        idPanneau="panneau" idOnglet={c => `onglet-${c}`} />,
    )
    expect(html).toContain('role="tablist"')
    expect(html).toContain('id="onglet-a"')
    expect(html.match(/aria-controls="panneau"/g)).toHaveLength(2)
    expect(html).toMatch(/id="onglet-a"[^>]*tabindex="-1"/)
    expect(html).toMatch(/id="onglet-b"[^>]*tabindex="0"/)
  })

  it('rend la ligne SOUS le libellé, dans l’onglet, et le dit par sa classe', () => {
    const html = renderToStaticMarkup(
      <OngletsPage onglets={onglets} actif="a" choisir={() => {}} intitule="Ce que montre le volet" />,
    )
    expect(html).toContain('class="cs-onglet cs-onglet--sous"')
    expect(html).toContain('<span class="compte">12</span>')
    expect(html.match(/class="cs-onglet"/g)).toHaveLength(1)
  })

  it('garde aux filtres leurs boutons ordinaires', () => {
    const html = renderToStaticMarkup(
      <OngletsPage onglets={onglets} actif="a" choisir={() => {}} intitule="Filtres" nature="filtres" />,
    )
    expect(html).toContain('role="group"')
    expect(html).not.toContain('tabindex')
    expect(html).not.toContain('aria-controls')
  })

  it('la feuille pose la ligne sous le libellé', () => {
    const css = readFileSync('app/globals.css', 'utf8')
    expect(css).toContain('.cs-onglet--sous { flex-direction: column; gap: 2px; }')
  })

  it('le volet des Pères et la page d’une œuvre passent par le modèle, sous un seul nom', () => {
    const peres = readFileSync('app/components/PanneauPatristique.tsx', 'utf8')
    const oeuvre = readFileSync('app/oeuvre/[id]/OeuvreClient.tsx', 'utf8')
    const livres = readFileSync('app/components/NavLivres.tsx', 'utf8')
    for (const source of [peres, oeuvre, livres]) expect(source).toContain('intitule="Ce que montre le volet"')
    // Plus de barre recomposée à la main dans le volet des Pères.
    expect(peres).not.toContain('<div role="tablist" aria-label="Volet des Pères"')
    expect(peres).toContain('idPanneau={idPanneau}')
    expect(oeuvre).toContain('idPanneau={idPanneauDroit}')
  })
})
