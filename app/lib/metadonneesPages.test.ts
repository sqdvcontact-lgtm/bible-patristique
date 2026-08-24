import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Garde des métadonnées. « Un axe sans garde DÉRIVE » (AGENTS.md) : la couleur,
// l'échelle typographique et les rayons d'angle ont chacun la leur, et c'est ce
// qui les tient. Les métadonnées en ont désormais une.
//
// Elle ne juge pas le contenu d'un titre — cela, ce sont les tests de
// `metadonneesSeo.test.ts` et le balayage sur données réelles. Elle refuse deux
// choses qu'on ne peut vérifier qu'en parcourant l'arbre.

const RACINE = join(import.meta.dirname, '..')

function fichiersDeRoute(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersDeRoute(complet, chemins)
    else if (entree === 'page.tsx' || entree === 'layout.tsx') chemins.push(complet)
  }
  return chemins
}

const SOURCES = fichiersDeRoute(RACINE).map(chemin => ({
  chemin: chemin.replace(RACINE, 'app').replace(/\\/g, '/'),
  source: readFileSync(chemin, 'utf8'),
}))

describe('métadonnées des pages', () => {
  it('trouve bien les fichiers de route (garde de la garde)', () => {
    // Une garde qui ne parcourt rien passe toujours. On vérifie donc qu'elle voit
    // l'arbre, et qu'elle y voit les trois familles servies.
    expect(SOURCES.length).toBeGreaterThan(30)
    for (const attendu of ['app/page.tsx', 'app/auteur/[id]/layout.tsx', 'app/oeuvre/[id]/page.tsx']) {
      expect(SOURCES.map(s => s.chemin)).toContain(attendu)
    }
  })

  it('ne pose plus aucune <meta name="keywords">', () => {
    // Google l'ignore depuis 2009. Les variantes de nom passent par le JSON-LD
    // (`alternateName`), qui est lu. Trois pages en portaient jusqu'au 2026-08-24.
    const fautives = SOURCES
      .filter(({ source }) => /^\s*keywords\s*:/m.test(source))
      .map(({ chemin }) => chemin)
    expect(fautives).toEqual([])
  })

  it('tient les espaces personnels et les résultats de recherche hors de l’index', () => {
    // ⛔ Un espace personnel ne regarde que son titulaire, et une page de
    // résultats n'est pas un document mais une vue sur d'autres documents.
    // La consigne se pose une fois pour toutes AVANT l'ouverture : après, il
    // serait trop tard, et rien n'aurait signalé l'oubli.
    const HORS_INDEX_ATTENDU = [
      'app/bienvenue/layout.tsx',
      'app/compte/layout.tsx',
      'app/essais/mes-ecrits/layout.tsx',
      'app/messagerie/layout.tsx',
      'app/prelevements/layout.tsx',
      'app/progression/page.tsx',
      'app/recherche/page.tsx',
    ]
    const manquants = HORS_INDEX_ATTENDU.filter(chemin => {
      const fichier = SOURCES.find(s => s.chemin === chemin)
      return !fichier || !/robots:\s*HORS_INDEX/.test(fichier.source)
    })
    expect(manquants).toEqual([])
  })

  it('ne recompose pas un titre de passage, d’auteur ou d’œuvre hors du module', () => {
    // Les modèles vivent dans `app/lib/metadonneesSeo.ts`, et nulle part ailleurs :
    // c'est ainsi que les formules restent d'accord entre elles. Une page qui
    // écrirait « — Commentaires des Pères de l'Église » à la main serait le début
    // de la dérive.
    const fautives = SOURCES
      .filter(({ source }) => /—\s*(Commentaires|Citations|Échos|Œuvres|Notice biographique|Texte biblique)/.test(source))
      .map(({ chemin }) => chemin)
    expect(fautives).toEqual([])
  })
})
