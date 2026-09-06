import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIVRES, LIVRES_NON_CANONIQUES, estLivreNonCanonique } from './bible'

const lire = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

// Les écrits de la Septante que le canon ne reçoit pas (6 septembre 2026) : ils avaient
// leur texte en base et aucun chemin pour l'atteindre. Ces épreuves gardent les deux
// décisions qui les rendent lisibles, et la marque qui les distingue.
describe('écrits non canoniques', () => {
  it('déclare les sept livres qui n’existaient nulle part ailleurs', () => {
    for (const code of ['1ES', '3MA', '4MA', 'DAG', 'ODA', 'PS2', 'PSS']) {
      expect(estLivreNonCanonique(code), code).toBe(true)
      expect(LIVRES.find(l => l.code === code), code).toBeTruthy()
    }
    // La Lettre de Jérémie s'ajoute à eux : la Septante la transmet d'un seul tenant,
    // et son texte de TR0012 n'avait pas davantage de créneau canonique.
    expect(estLivreNonCanonique('LJE')).toBe(true)
  })

  it('⛔ ne tient JAMAIS un livre du canon pour non canonique', () => {
    for (const code of ['GEN', 'PSA', 'DAN', 'SIR', 'BAR', 'MAT', 'REV']) {
      expect(estLivreNonCanonique(code), code).toBe(false)
    }
    // Le Daniel de l'ossature et le Daniel du vieux grec sont DEUX recensions : l'un
    // est au canon, l'autre non, et les confondre serait les dédoublonner.
    expect(LIVRES_NON_CANONIQUES.has('DAN')).toBe(false)
    expect(LIVRES_NON_CANONIQUES.has('DAG')).toBe(true)
  })

  it('lit la vue parallèle pour un livre sans créneau canonique', () => {
    const page = lire('../page.tsx')
    // ⛔ La bascule tient à un nom de vue parce que le CONTRAT est le même des deux
    // côtés : c'est ce qui permet de ne rien changer au client.
    expect(page).toContain("estLivreNonCanonique(livre) ? 'versets_lecture_apocryphes' : 'versets_lecture'")
  })

  it('marque le nom du livre au volet ET dans le titre du chapitre', () => {
    const nav = lire('../components/NavLivres.tsx')
    const texte = lire('../components/TexteBible.tsx')
    expect(nav).toContain("livre.testament === 'AUTRES' && <MarqueNonCanonique />")
    expect(texte).toContain('estLivreNonCanonique(livreActif) && <MarqueNonCanonique />')
  })

  it('la marque dit VIS-À-VIS DE QUOI, et se lit aux lecteurs d’écran', () => {
    const marque = lire('../components/MarqueNonCanonique.tsx')
    // « Non canonique » tout court serait un jugement : plusieurs de ces livres sont
    // reçus en Orient.
    expect(marque).toContain('canon catholique')
    expect(marque).toContain('sr-only')
    expect(marque).toContain('aria-hidden="true"')
  })
})
