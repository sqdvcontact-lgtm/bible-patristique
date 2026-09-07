/**
 * ⛔ AUCUN ACCENT GRAVE DANS UN BLOC `<style>` DE GABARIT.
 *
 * Les feuilles en ligne du site vivent dans des littéraux de gabarit :
 * `<style>{` … `}</style>`. Un accent grave écrit à l'intérieur — pour nommer une
 * propriété, une classe ou une balise dans un commentaire CSS — FERME le gabarit.
 *
 * ⚠️ Et le fichier continue de se parser sans une erreur. Deux accents graves se
 * referment l'un l'autre : le gabarit se clôt, ce qui les sépare se lit comme du code,
 * et l'expression rend un booléen — que React n'imprime pas. La feuille entière
 * disparaît alors, en silence. C'est arrivé le 2026-08-28 sur `globals.css`, le
 * 2026-09-04 sur les blocs de la Polyglotte et de la recherche, et le 2026-09-07 sur la
 * page d'œuvre, où toute la composition de la lecture est tombée pendant huit minutes.
 *
 * ⛔ Ni les types, ni le linter, ni les 2 099 tests ne le voient : cette garde est le
 * SEUL filet. Nommer une propriété entre guillemets français, jamais entre accents
 * graves.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = join(process.cwd(), 'app')
const OUVERTURE = '<style>{`'
const FERMETURE = '`}</style>'

function fichiersTsx(dossier: string): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersTsx(chemin))
    else if (nom.endsWith('.tsx') && !nom.endsWith('.test.tsx')) sortie.push(chemin)
  }
  return sortie
}

/** Les blocs `<style>` de gabarit d'un fichier, avec leur position. */
function blocsDeStyle(source: string): { debut: number; contenu: string }[] {
  const blocs: { debut: number; contenu: string }[] = []
  let i = source.indexOf(OUVERTURE)
  while (i >= 0) {
    const debutContenu = i + OUVERTURE.length
    const fin = source.indexOf(FERMETURE, debutContenu)
    // Une ouverture sans fermeture est déjà le défaut qu'on cherche : on la signale en
    // rendant tout ce qui suit, plutôt que de l'ignorer.
    blocs.push({ debut: debutContenu, contenu: source.slice(debutContenu, fin < 0 ? source.length : fin) })
    i = source.indexOf(OUVERTURE, fin < 0 ? source.length : fin + FERMETURE.length)
  }
  return blocs
}

describe('les blocs `<style>` de gabarit', () => {
  const fichiers = fichiersTsx(RACINE)

  it('couvre bien les feuilles en ligne du site', () => {
    const avecStyle = fichiers.filter(f => readFileSync(f, 'utf8').includes(OUVERTURE))
    // Un balayage qui ne trouve plus rien est un balayage cassé, non un dépôt propre.
    expect(avecStyle.length).toBeGreaterThan(5)
  })

  it('ne porte aucun accent grave, qui refermerait le gabarit', () => {
    const fautifs: string[] = []
    for (const fichier of fichiers) {
      const source = readFileSync(fichier, 'utf8')
      for (const { debut, contenu } of blocsDeStyle(source)) {
        const motif = /`/gu
        let trouve: RegExpExecArray | null
        while ((trouve = motif.exec(contenu))) {
          const position = trouve.index
          // ⚠️ Un gabarit ÉPISSÉ est légitime : `…css…` + expression + `…css…`. L'accent
          // grave y borde un opérateur, et le rédacteur sait ce qu'il fait. Le défaut,
          // lui, tombe au milieu d'une phrase — « le <p> garde son propre blanc ».
          const apres = /^\s*\+/u.test(contenu.slice(position + 1))
          const avant = /\+\s*$/u.test(contenu.slice(0, position))
          if (apres || avant) continue
          const ligne = source.slice(0, debut + position).split('\n').length
          const extrait = contenu.slice(Math.max(0, position - 50), position + 20).replace(/\s+/gu, ' ')
          fautifs.push(`${fichier.replace(process.cwd(), '')}:${ligne} — …${extrait}…`)
        }
      }
    }
    expect(fautifs).toEqual([])
  })

  // ⛔ Une garde se vérifie DANS LES DEUX SENS : verte sur le dépôt, rouge sur le défaut
  // qu'elle prétend arrêter. C'est exactement ce qui a manqué le 2026-09-07.
  it('refuse l’accent grave posé au milieu d’un commentaire CSS', () => {
    const piege = '<style>{`\n /* le `<p>` garde son blanc */\n .a { color: red; }\n`}</style>'
    const blocs = blocsDeStyle(piege)
    expect(blocs).toHaveLength(1)
    expect(blocs[0].contenu).toContain('`')
  })
})
