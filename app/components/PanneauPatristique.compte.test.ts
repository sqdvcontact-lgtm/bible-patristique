import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// ── LE VOLET DES PÈRES NE CHANGE PAS DE HAUTEUR EN SE RECHARGEANT ────────────
//
// Demande de l'auteur (14 septembre 2026) : pendant le rechargement, les comptes des cinq
// onglets changeaient ou disparaissaient, et la barre changeait de hauteur ; des lettres
// grecques tiennent désormais la place du compte. Et « Aucune occurrence » a perdu sa
// carapace pour se tenir au centre de la colonne.
//
// ⚠️ La garde lit l'ÉCRITURE du volet : la hauteur d'une ligne ne se mesure pas sans monter
// la page entière, et ce qu'il faut interdire est le retour du compte CONDITIONNEL.

const PANNEAU = readFileSync('app/components/PanneauPatristique.tsx', 'utf8')

describe('les onglets du volet des Pères', () => {
  it('⛔ chaque onglet et chaque sous-onglet rend TOUJOURS sa ligne de compte', () => {
    expect(PANNEAU.match(/<LigneCompte\b/g) ?? []).toHaveLength(2)
    expect(PANNEAU).not.toMatch(/t\.count != null && t\.count > 0 && \(/)
    expect(PANNEAU).not.toMatch(/\{nb > 0 && <span/)
  })

  it('⛔ la ligne de compte porte une hauteur écrite, en em de son propre corps', () => {
    const lignes = [...PANNEAU.matchAll(/<LigneCompte[\s\S]*?\/>/g)].map(m => m[0])
    expect(lignes).toHaveLength(2)
    for (const ligne of lignes) expect(ligne).toMatch(/height: '1(\.2)?em'/)
  })

  it('l’attente se déduit de la demande, et non du seul drapeau de chargement', () => {
    expect(PANNEAU).toContain('const enAttente = loading || (cleDemande !== null && segmentsPour !== cleDemande)')
    expect(PANNEAU).not.toMatch(/!loading && itemsFiltres/)
    expect(PANNEAU).not.toMatch(/enAttente=\{loading\}/)
  })
})

describe('« Aucune occurrence »', () => {
  it('⛔ ne porte plus de carapace : la seule qui reste est celle de l’onglet Commentaires', () => {
    expect(PANNEAU.match(/carapace-posee\.png/g) ?? []).toHaveLength(1)
    expect(PANNEAU).toContain("'Aucune occurrence.'")
  })
})

describe('le filtre et son volet', () => {
  it('⛔ parlent l’or, par jetons, et une seule écriture de pastille', () => {
    expect(PANNEAU).toContain("const OR_ENCRE = 'var(--cs-or-lisible)'")
    expect(PANNEAU.match(/style=\{stylePastilleFiltre\(sel, dispo\)\}/g) ?? []).toHaveLength(3)
    // La sélection portait un or recopié en composantes, qui ne suivait aucun thème.
    expect(PANNEAU).not.toMatch(/rgba\(154,\s*126,\s*61/)
    expect(PANNEAU.match(/className="cs-bouton-lien cs-bouton-lien--or"/g) ?? []).toHaveLength(2)
  })
})
