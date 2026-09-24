import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// ── LA SYMÉTRIE DES VOLETS (audit d'harmonie, 2026-09-23) ─────────────────────────────
// Ce qui ne se voit pas à la lecture d'un seul fichier : que les chevrons, les rails, les
// poignées et le foyer rendu soient les MÊMES d'une page à l'autre.

const lire = (f: string) => readFileSync(f, 'utf8')
const bible = lire('app/components/EncartTraduction.tsx')
const peres = lire('app/components/PanneauPatristique.tsx')
const livres = lire('app/components/NavLivres.tsx')
const oeuvre = lire('app/oeuvre/[id]/OeuvreClient.tsx')
const tete = lire('app/oeuvre/[id]/TeteVolet.tsx')
const poly = lire('app/polyglotte/page.tsx')
const essai = lire('app/essais/[id]/EssaiClient.tsx')
const rail = lire('app/components/RailVolet.tsx')
const css = lire('app/globals.css')

describe('les chevrons de repli', () => {
  it('portent tous `.cs-volet-reduire`, un seul libellé, et `aria-expanded`', () => {
    for (const source of [bible, peres, oeuvre, poly, essai]) {
      expect(source).toContain('className="cs-volet-reduire"')
      expect(source).toContain('aria-label="Réduire le volet"')
      expect(source).toContain('aria-expanded={true}')
    }
    // Le chevron de gauche d'une œuvre passe par `BoutonVolet`, qui prend la classe.
    expect(tete).toContain("'cs-bouton-volet cs-volet-reduire'")
    expect(oeuvre).toContain('titre="Réduire le volet" repli')
    for (const source of [bible, peres, oeuvre, poly, essai]) {
      expect(source).not.toMatch(/Réduire le (panneau|sommaire)|Rabattre le volet/)
    }
  })

  it('offrent 24 px de cible sans déplacer le glyphe', () => {
    expect(bible).toContain("padding: '5px', margin: '-5px'")
    expect(poly).toContain('padding: "5px", margin: "-2px"')
    expect(essai).toContain("padding: '5px', margin: '-2px'")
  })
})

describe('les rails', () => {
  it('l’essai prend le rail commun, qui nomme l’action, au fond du volet qu’il remplace', () => {
    expect(essai).toContain('<RailVolet ref={refRailVolet} cote="droite" fond="clair" libelle="Ouvrir les commentaires"')
    expect(essai).not.toContain("width: '22px'")
  })

  it('le rail dit qu’il est replié, et son fond suit le volet qu’il remplace', () => {
    expect(rail).toContain('aria-expanded={false}')
    expect(rail).toContain("'cs-rail-volet cs-rail-volet--surface'")
    expect(css).toContain('.cs-rail-volet--surface { background: var(--cs-surface); }')
  })
})

describe('le foyer rendu au repli', () => {
  it('suit le rail et le chevron sur l’œuvre, la Polyglotte et la publication', () => {
    expect(oeuvre).toContain('useFoyerAuRepli(navOuverte, refRailGauche, refChevronGauche)')
    expect(oeuvre).toContain('useFoyerAuRepli(panneauOuvert, refRailDroit, refChevronDroit)')
    expect(poly).toContain('useFoyerAuRepli(!voletReduit, refRailVolet, refChevronVolet)')
    expect(essai).toContain('useFoyerAuRepli(voletOuvert, refRailVolet, refChevronVolet)')
  })
})

describe('les poignées', () => {
  it('sont des séparateurs, par une seule écriture, qui retire son glissement au démontage', () => {
    for (const source of [peres, livres, oeuvre]) expect(source).toContain('usePoigneeVolet({')
    for (const source of [peres, livres, oeuvre]) {
      expect(source).not.toContain("document.addEventListener('mousemove'")
    }
    const hook = lire('app/lib/poigneeVolet.ts')
    expect(hook).toContain("role: 'separator' as const")
    expect(hook).toContain("'aria-orientation': 'vertical' as const")
    expect(hook).toContain('useEffect(() => () => finRef.current?.(), [])')
  })
})

describe('les repères et le code mort', () => {
  it('les volets latéraux sont des `aside`, les sommaires des `nav`', () => {
    expect(peres).toContain('<aside ref={refPanel} id={idVolet}')
    expect(livres).toContain('<aside ref={refPanel} id={idVolet}')
    expect(livres).toContain('<nav ref={scrollRef} aria-label="Liste des livres"')
    expect(oeuvre).toContain('<aside ref={refNav} id={idVoletGauche}')
    expect(oeuvre).toContain('<nav aria-label="Sommaire" data-visite="oeuvre-sommaire"')
    expect(oeuvre).toContain('<aside ref={refAside} id={idVoletDroit}')
    expect(essai).toContain('<aside ref={refVolet} id="essai-volet-commentaires"')
  })

  it('la barre mobile repliée, que plus aucune page n’appelait, est partie', () => {
    for (const source of [peres, livres, lire('app/components/BibleLayout.tsx'), lire('app/pericopes/[id]/page.tsx')]) {
      expect(source).not.toContain('barreMobile')
    }
  })

  it('le volet des Pères d’une péricope ne double plus son filet', () => {
    const pericope = lire('app/pericopes/[id]/page.tsx')
    expect(pericope).toContain("<div style={{ flexShrink: 0, height: '100%' }}>{panneauPatristique}</div>")
  })
})
