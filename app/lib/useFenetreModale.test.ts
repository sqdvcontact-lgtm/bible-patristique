import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * ⛔ UNE FENÊTRE MODALE PIÈGE LA TABULATION, et cette garde le tient.
 *
 * Toute surface hors de l'administration qui déclare `aria-modal` promet à la synthèse
 * vocale que le reste de la page est hors jeu : elle doit donc le tenir aussi au clavier,
 * par `useFenetreModale`. La garde compte, fichier par fichier, les fenêtres déclarées et
 * les crochets posés.
 *
 * ⚠️ Les exceptions sont NOMMÉES, chacune avec sa raison : une surface qui ne fait que
 * CHERCHER une fenêtre ouverte (`querySelector('[aria-modal="true"]')`) n'en déclare pas.
 */
const RACINE = join(process.cwd(), 'app')
const EXCEPTIONS: Record<string, string> = {
  'components/BibleLayout.tsx': 'cherche une fenêtre ouverte, n’en déclare pas',
  'components/LassoLecture.tsx': 'cherche une fenêtre ouverte, n’en déclare pas',
  'components/CelluleActions.tsx': 'reconnaît une fenêtre ouverte par un de ses boutons',
}

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap(nom => {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) return nom === 'admin' && dossier === RACINE ? [] : fichiers(chemin)
    return chemin.endsWith('.tsx') ? [chemin] : []
  })
}

describe('les fenêtres modales piègent la tabulation', () => {
  it('chaque aria-modal hors de l’administration a son useFenetreModale', () => {
    const fautifs: string[] = []
    let vus = 0
    for (const chemin of fichiers(RACINE)) {
      const nom = relative(RACINE, chemin).split(sep).join('/')
      if (EXCEPTIONS[nom]) continue
      const source = readFileSync(chemin, 'utf8')
      const fenetres = (source.match(/aria-modal=["{]/g) ?? []).length
      if (fenetres === 0) continue
      vus++
      const crochets = (source.match(/useFenetreModale\(/g) ?? []).length
      if (crochets < fenetres) fautifs.push(`${nom} : ${fenetres} fenêtre(s), ${crochets} crochet(s)`)
    }
    expect(vus).toBeGreaterThan(15)
    expect(fautifs).toEqual([])
  })
})
