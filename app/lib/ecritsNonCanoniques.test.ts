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

  it('⛔ chaque écrit lisible est à sa PLACE, auprès du livre dont il relève', () => {
    const rang = (code: string) => LIVRES.findIndex(l => l.code === code)
    // 1 Esdras suit Esdras-Néhémie, 3 et 4 Maccabées suivent les deux Maccabées, le
    // Psaume 151, les Odes et les Psaumes de Salomon suivent le Psautier, la Lettre de
    // Jérémie suit Baruch, et le Daniel du vieux grec suit Daniel.
    expect(rang('1ES')).toBe(rang('NEH') + 1)
    expect(rang('3MA')).toBe(rang('2MA') + 1)
    expect(rang('4MA')).toBe(rang('3MA') + 1)
    expect(rang('PS2')).toBe(rang('PSA') + 1)
    expect(rang('LJE')).toBe(rang('BAR') + 1)
    expect(rang('DAG')).toBe(rang('DAN') + 1)
    // ⛔ Et ils ne sont PLUS dans la troisième colonne : le testament dit la place, non
    // le statut, et les y laisser les renverrait au bas de la liste.
    for (const code of ['1ES', '3MA', '4MA', 'DAG', 'ODA', 'PS2', 'PSS', 'LJE']) {
      expect(LIVRES.find(l => l.code === code)?.testament, code).toBe('AT')
    }
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
    // ⛔ Sur le STATUT, jamais sur le testament : ces livres vivent au milieu de l'Ancien
    // Testament, et le testament ne les distinguerait plus de leurs voisins.
    expect(nav).toContain('estLivreNonCanonique(livre.code) && <MarqueNonCanonique />')
    expect(nav).not.toContain("livre.testament === 'AUTRES' && <MarqueNonCanonique />")
    expect(texte).toContain('estLivreNonCanonique(livreActif) && <MarqueNonCanonique />')
  })

  it('la marque est DEUX MOTS, et l’infobulle dit vis-à-vis de quoi', () => {
    const marque = lire('../components/MarqueNonCanonique.tsx')
    // « Non canonique » tout court serait un jugement : plusieurs de ces livres sont
    // reçus en Orient. L'infobulle nomme donc le canon de référence.
    expect(marque).toContain("const TEXTE = 'non canonique'")
    expect(marque).toContain('canon catholique')
    // ⛔ Plus d'obèle : un signe qu'il faut apprendre ne dit rien à qui ne l'a pas appris.
    expect(marque).not.toContain('†')
    // ⚠️ Taille ABSOLUE : la marque accompagne deux corps très différents.
    expect(marque).toContain('0.5625rem')
    expect(marque).not.toContain('em}')
  })
})
