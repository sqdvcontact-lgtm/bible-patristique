import { describe, it, expect } from 'vitest'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { ICONES_ONGLET, ILLUSTRATIONS, FONCTIONS } from './inventaire'

// La planche des illustrations ne vaut que si son recensement est COMPLET : une
// image ajoutée dans `public/` sans entrée dans l'inventaire ne s'y verrait pas,
// et la page dirait « voici toutes les images » en en cachant une. Ces tests
// confrontent donc la liste au disque, dans les deux sens.
//
// Ne sont pas confrontés : les fac-similés, les portraits et les polices. Ce sont
// les « familles nombreuses », que la planche compte au lieu de les énumérer.

const RACINE = path.join(__dirname, '..', '..', '..')
const PUBLIC = path.join(RACINE, 'public')
const DOSSIERS_RECENSES = ['ornements', 'icons', 'logo', 'holy-guessr', 'auteurs']
const EXTENSIONS = /\.(png|jpe?g|webp|svg|avif|ico)$/i

/** Tous les fichiers image d'un dossier de `public/`, chemins publics compris.
 *
 *  ⚠️ Rend `null` si le dossier MANQUE, et ce n'est pas une précaution de style :
 *  `public/holy-guessr/` n'est pas versionné (chantier Holy Guessr), donc absent
 *  d'un `checkout` d'intégration continue alors qu'il est bien là sur le poste de
 *  travail. Un test qui l'exigerait serait vert ici et rouge là-bas, ce que la
 *  charte du dépôt consigne déjà comme le piège le plus coûteux de l'outillage. */
async function imagesDe(relatif: string): Promise<string[] | null> {
  const trouvees: string[] = []
  const parcourir = async (sous: string) => {
    const entrees = await readdir(path.join(PUBLIC, sous), { withFileTypes: true })
    for (const e of entrees) {
      const chemin = sous ? `${sous}/${e.name}` : e.name
      if (e.isDirectory()) await parcourir(chemin)
      else if (EXTENSIONS.test(e.name)) trouvees.push(`/${chemin}`)
    }
  }
  try {
    await parcourir(relatif)
  } catch {
    return null
  }
  return trouvees
}

describe('inventaire des illustrations', () => {
  it('recense chaque image des dossiers dessinés, et rien de plus', async () => {
    const surDisque = new Set<string>()
    const absents: string[] = []
    for (const d of DOSSIERS_RECENSES) {
      const images = await imagesDe(d)
      if (images === null) { absents.push(`/${d}/`); continue }
      images.forEach(c => surDisque.add(c))
    }
    // La racine de `public/` porte aussi des images, sans sous-dossier.
    const racine = await readdir(PUBLIC, { withFileTypes: true })
    racine.filter(e => e.isFile() && EXTENSIONS.test(e.name)).forEach(e => surDisque.add(`/${e.name}`))

    const recensees = new Set(ILLUSTRATIONS.map(i => i.chemin))
    const oubliees = [...surDisque].filter(c => !recensees.has(c)).sort()
    // Une entrée qui vise un dossier absent de CET arbre n'est pas un fantôme : le
    // fichier existe ailleurs, et la planche le mesure quand elle le trouve.
    const fantomes = [...recensees]
      .filter(c => !surDisque.has(c) && !absents.some(d => c.startsWith(d)))
      .sort()

    expect(oubliees, 'images présentes dans public/ mais absentes de l’inventaire').toEqual([])
    expect(fantomes, 'entrées de l’inventaire dont le fichier a disparu').toEqual([])
  })

  it('pointe des icônes d’onglet qui existent', async () => {
    for (const icone of ICONES_ONGLET) {
      await expect(stat(path.join(RACINE, icone.fichier)), icone.fichier).resolves.toBeTruthy()
    }
  })

  it('n’emploie que des fonctions déclarées, et les emploie toutes', () => {
    const employees = new Set(ILLUSTRATIONS.map(i => i.fonction))
    // Chaque entrée relève d'une fonction connue : le typage l'impose déjà, mais
    // une clé ajoutée à la volée dans un objet littéral y échapperait.
    for (const i of ILLUSTRATIONS) expect(Object.keys(FONCTIONS), i.chemin).toContain(i.fonction)
    // Et chaque fonction déclarée sert : un intitulé sans image serait un groupe
    // vide sur la planche, donc une rubrique qui promet ce qu'elle n'a pas.
    // « identité » fait exception : ses icônes d'onglet vivent dans `app/`.
    const attendues = Object.keys(FONCTIONS).filter(c => c !== 'identite')
    for (const cle of attendues) expect([...employees], cle).toContain(cle)
  })

  it('ne recense pas deux fois le même fichier', () => {
    const vus = new Map<string, number>()
    ILLUSTRATIONS.forEach(i => vus.set(i.chemin, (vus.get(i.chemin) ?? 0) + 1))
    expect([...vus].filter(([, n]) => n > 1).map(([c]) => c)).toEqual([])
  })

  it('donne à chaque illustration un nom et un emploi rédigés', () => {
    for (const i of ILLUSTRATIONS) {
      expect(i.nom.trim().length, i.chemin).toBeGreaterThan(2)
      expect(i.emploi.trim().length, i.chemin).toBeGreaterThan(10)
    }
  })

  it('renvoie vers une page du site, ou vers rien, mais jamais vers l’extérieur', () => {
    for (const i of ILLUSTRATIONS) {
      if (i.lieu) expect(i.lieu.href.startsWith('/'), i.chemin).toBe(true)
    }
  })

  it('ne prête un lieu qu’aux images effectivement servies', () => {
    for (const i of ILLUSTRATIONS) {
      if (i.fonction === 'reserve' || i.fonction === 'gabarit') {
        expect(i.lieu, `${i.chemin} est en réserve : il ne peut renvoyer nulle part`).toBeUndefined()
      }
    }
  })
})
