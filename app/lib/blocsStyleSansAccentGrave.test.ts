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

/** Les DEUX écritures d'un bloc `<style>` de gabarit : le bloc NU, et le bloc dont la
 *  feuille est filtrée au service par « cssServi » (voir app/lib/cssServi.ts).
 *
 *  ⛔ La seconde n'existait pas quand cette garde a été écrite, et elle lui était donc
 *  INVISIBLE : envelopper une feuille dans « cssServi » la faisait sortir du balayage
 *  sans qu'un seul test s'en plaigne. Payé le 2026-09-09 — trois feuilles y sont passées
 *  au filtre le même jour, et quatre accents graves ont vécu dans celle de l'accueil
 *  jusqu'à ce que « tsc » les relève, ce qu'il ne fait que par chance (voir l'en-tête).
 *
 *  ⚠️ Corollaire, et il vaut pour toute garde qui LIT du texte au motif : une écriture
 *  nouvelle du même objet est un angle mort tant qu'on ne l'a pas nommée ici. */
const OUVERTURES = ['<style>{`', '<style>{cssServi(`'] as const
const FERMETURES = ['`}</style>', '`)}</style>'] as const

/** La plus proche des écritures cherchées, à partir d'une position. */
function prochaine(source: string, depuis: number, motifs: readonly string[]): { index: number; motif: string } | null {
  let meilleur: { index: number; motif: string } | null = null
  for (const motif of motifs) {
    const index = source.indexOf(motif, depuis)
    if (index < 0) continue
    if (!meilleur || index < meilleur.index) meilleur = { index, motif }
  }
  return meilleur
}

/** Un fichier porte-t-il une feuille en ligne, sous l'une ou l'autre écriture ? */
function porteUneFeuille(source: string): boolean {
  return OUVERTURES.some(o => source.includes(o))
}

function fichiersTsx(dossier: string): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersTsx(chemin))
    else if (nom.endsWith('.tsx') && !nom.endsWith('.test.tsx')) sortie.push(chemin)
  }
  return sortie
}

/** ⚠️ Une feuille peut vivre dans un module SANS composant — `stylesControle.ts`,
 *  `stylesAudience.ts` — et la posture d'origine, qui ne lisait que les `.tsx`, ne les
 *  aurait jamais ouverts. */
function fichiersTs(dossier: string): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersTs(chemin))
    else if (nom.endsWith('.ts') && !nom.endsWith('.test.ts') && !nom.endsWith('.d.ts')) sortie.push(chemin)
  }
  return sortie
}

/** Les feuilles rangées dans une CONSTANTE et posées par `<style>{NOM}</style>`.
 *
 *  ⛔ La garde ne visait que les gabarits écrits DANS le bloc, et onze feuilles du site
 *  vivent ailleurs — `FEUILLE_ESPACE`, `CSS_CONTROLE`, `STYLES_FICHE`… Elles courent
 *  exactement le même risque, et le trou s'est payé le 2026-09-07 sur « Ma chaîne » : un
 *  commentaire CSS qui nommait une propriété entre accents graves a fermé le gabarit, et
 *  la feuille de la page a disparu. ⚠️ Là, le fichier ne s'est PAS parsé — c'est un
 *  hasard heureux, non la règle : deux accents graves qui se referment sur un texte sans
 *  ponctuation JS passent le parseur, et la feuille s'en va en silence. */
function nomsDesFeuilles(sources: string[]): Set<string> {
  const noms = new Set<string>()
  for (const source of sources) {
    const motif = /<style>\{\s*([A-Za-z_$][\w$]*)\s*\}<\/style>/gu
    let trouve: RegExpExecArray | null
    while ((trouve = motif.exec(source))) noms.add(trouve[1])
  }
  return noms
}

/** Le corps d'une feuille de constante : du gabarit ouvrant à la ligne qui le ferme.
 *
 *  ⚠️ On ne peut pas se fier au « premier accent grave » pour trouver la fin : c'est
 *  justement le défaut qu'on cherche, et il déplacerait la borne avant lui. La borne est
 *  donc la CONVENTION du dépôt, un accent grave seul en tête de ligne. */
function corpsDeFeuille(source: string, nom: string): { debut: number; contenu: string } | null {
  const ouverture = new RegExp(`const\\s+${nom}\\s*=\\s*\``, 'u').exec(source)
  if (!ouverture) return null
  const debut = ouverture.index + ouverture[0].length
  const fin = /^`/mu.exec(source.slice(debut))
  return { debut, contenu: source.slice(debut, fin ? debut + fin.index : source.length) }
}

/** Les blocs `<style>` de gabarit d'un fichier, avec leur position. */
function blocsDeStyle(source: string): { debut: number; contenu: string }[] {
  const blocs: { debut: number; contenu: string }[] = []
  let i = 0
  for (;;) {
    const ouverture = prochaine(source, i, OUVERTURES)
    if (!ouverture) break
    const debutContenu = ouverture.index + ouverture.motif.length
    const fermeture = prochaine(source, debutContenu, FERMETURES)
    // Une ouverture sans fermeture est déjà le défaut qu'on cherche : on la signale en
    // rendant tout ce qui suit, plutôt que de l'ignorer.
    blocs.push({
      debut: debutContenu,
      contenu: source.slice(debutContenu, fermeture ? fermeture.index : source.length),
    })
    i = fermeture ? fermeture.index + fermeture.motif.length : source.length
  }
  return blocs
}

describe('les blocs `<style>` de gabarit', () => {
  const fichiers = fichiersTsx(RACINE)

  it('couvre bien les feuilles en ligne du site', () => {
    const avecStyle = fichiers.filter(f => porteUneFeuille(readFileSync(f, 'utf8')))
    // Un balayage qui ne trouve plus rien est un balayage cassé, non un dépôt propre.
    expect(avecStyle.length).toBeGreaterThan(5)
  })

  // ⛔ Et il couvre les feuilles FILTRÉES, qui sont l'écriture neuve : sans cette
  // exigence, remettre la garde à la seule forme nue passerait inaperçu.
  it('couvre aussi les feuilles passées à cssServi', () => {
    const filtrees = fichiers.filter(f => readFileSync(f, 'utf8').includes(OUVERTURES[1]))
    expect(filtrees.length).toBeGreaterThan(0)
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

  // ⛔ Le même piège sous l'écriture FILTRÉE : c'est celle qui échappait à la garde, et
  // la voir rouge est la seule preuve que le trou est refermé.
  it('le refuse aussi dans une feuille passée à cssServi', () => {
    const piege = '<style>{cssServi(`\n /* le `gap` de la bande */\n .a { color: red; }\n`)}</style>'
    const blocs = blocsDeStyle(piege)
    expect(blocs).toHaveLength(1)
    expect(blocs[0].contenu).toContain('`')
  })
})

describe('les feuilles rangées dans une constante', () => {
  const fichiers = [...fichiersTsx(RACINE), ...fichiersTs(RACINE)]
  const sources = new Map(fichiers.map(f => [f, readFileSync(f, 'utf8')]))
  const noms = nomsDesFeuilles([...sources.values()])

  it('sont bien trouvées, et elles sont nombreuses', () => {
    // Un balayage qui ne trouve plus rien est un balayage cassé, non un dépôt propre.
    expect(noms.size).toBeGreaterThan(5)
  })

  it('ne portent aucun accent grave, qui refermerait le gabarit', () => {
    const fautifs: string[] = []
    for (const [fichier, source] of sources) {
      for (const nom of noms) {
        const corps = corpsDeFeuille(source, nom)
        if (!corps) continue
        const motif = /`/gu
        let trouve: RegExpExecArray | null
        while ((trouve = motif.exec(corps.contenu))) {
          const position = trouve.index
          // Même exception que ci-dessus : un gabarit ÉPISSÉ borde un opérateur.
          if (/^\s*\+/u.test(corps.contenu.slice(position + 1)) || /\+\s*$/u.test(corps.contenu.slice(0, position))) continue
          const ligne = source.slice(0, corps.debut + position).split('\n').length
          const extrait = corps.contenu.slice(Math.max(0, position - 50), position + 20).replace(/\s+/gu, ' ')
          fautifs.push(`${fichier.replace(process.cwd(), '')}:${ligne} (${nom}) — …${extrait}…`)
        }
      }
    }
    expect(fautifs).toEqual([])
  })

  it('refuse l’accent grave posé au milieu d’une feuille de constante', () => {
    const piege = 'const FEUILLE_X = `\n/* la propriété `gap` se pose ici */\n.a { gap: 4px; }\n`\n'
    const corps = corpsDeFeuille(piege, 'FEUILLE_X')
    expect(corps).not.toBeNull()
    expect(corps!.contenu).toContain('`')
  })
})
