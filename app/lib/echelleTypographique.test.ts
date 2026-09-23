import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ECHELLE_PX, ECHELLE_REM, estSurLEchelle, rangLePlusProche } from './echelleTypographique'

// Le site comptait 112 tailles de texte distinctes, dont une trentaine entre 10 et 14 px
// séparées par des centièmes de pixel. Elles sont rabattues sur les 32 rangs de
// `echelleTypographique.ts`. Ce test est ce qui empêche la dérive de revenir : un module
// pur ne prouve rien tant que rien ne vérifie ce qui entre.

const RACINE = join(import.meta.dirname, '..')

// ⛔ Le PDF d'un essai est composé en POINTS et rendu par PDFKit, pas par un navigateur :
// l'échelle de l'écran ne s'y applique pas (voir l'en-tête d'EssaiPDF.tsx).
const EXEMPTS = [join('essais', '[id]', 'EssaiPDF.tsx')]

// /quiz est neutralisée en production (elle renvoie un 404) et sa version vivante
// évolue sur le chantier Holy Guessr, dont les fichiers ne sont pas versionnés.
// Même exemption, et pour la même raison, que `titresPages.test.ts`. Sans elle,
// la garde tenait tout `npm test` en échec sur un chantier qui n'est pas en ligne :
// une suite durablement rouge cesse d'être un signal. La lever le jour où le quiz
// rejoindra le site, sa palette et son échelle avec.
const DOSSIERS_EXEMPTS = ['quiz']

// ⛔ LA GARDE LIT LA DÉCLARATION ENTIÈRE, NON LA VALEUR QUI SUIT LES DEUX-POINTS.
//
// Elle exigeait la taille immédiatement après `fontSize:`, entre guillemets : un
// TERNAIRE lui échappait donc tout entier. `fontSize: seul ? '0.82rem' : '0.79rem'` a
// vécu ainsi dans la colonne en langue originale de la page d'œuvre, avec DEUX tailles
// hors grille — 13,12 px et 12,64 px, dont aucun rang n'existe — relevées le 7 septembre
// 2026 et rabattues sur 13 et 12,5.
//
// ⚠️ C'est trait pour trait le trou que la garde CHROMATIQUE avait déjà payé, où
// trente-sept teintes se cachaient dans des ternaires, et pour la même raison : le motif
// avait été écrit d'après la forme la plus FRÉQUENTE, non d'après la propriété. On borne
// désormais à la fin de la déclaration, puis on relit chaque valeur en rem à l'intérieur.
const DECLARATION = /(?:fontSize|font-size)\s*:[^;,\n]*/g
const VALEUR_REM = /([0-9]*\.?[0-9]+)rem/g

// ⚠️ Les `clamp(…)` des frontispices restent EXEMPTÉS, comme l'en-tête du module le dit :
// ce sont des compositions, où la taille fait partie du dessin. L'exemption porte sur la
// déclaration entière, et elle est NOMMÉE ici plutôt que subie par un motif trop étroit —
// une exception qu'on voit vaut mieux qu'un angle mort qui n'en signale aucune.
const EST_COMPOSITION = /clamp\(/

// ⚠️ UN COMMENTAIRE QUI CITE UNE TAILLE N'EN POSE AUCUNE, et la garde s'en est prise à
// sa propre note dès qu'elle a su lire une déclaration entière. Même remède que sa sœur
// chromatique, et la même écriture (`couleursEnDur.test.ts`) : on retire les commentaires
// avant de mesurer. ⛔ Le `//` ne se coupe qu'en TÊTE de ligne, jamais au milieu : une
// adresse en porte deux, et l'on emporterait le code qui la précède.
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

function fichiersDeStyle(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersDeStyle(complet, chemins)
    else if (/\.(tsx?|css)$/.test(entree)) chemins.push(complet)
  }
  return chemins
}

describe('échelle typographique', () => {
  it('ne comporte que des rangs croissants et distincts', () => {
    const trie = [...ECHELLE_PX].sort((a, b) => a - b)
    expect(ECHELLE_PX).toEqual(trie)
    expect(new Set(ECHELLE_PX).size).toBe(ECHELLE_PX.length)
  })

  it('rend le rang le plus proche', () => {
    expect(rangLePlusProche(12.65)).toBe(12.5)
    expect(rangLePlusProche(13.8)).toBe(14)
    expect(rangLePlusProche(11.52)).toBe(11.5)
    expect(estSurLEchelle(0.71875)).toBe(true) // 11,5 px
    expect(estSurLEchelle(0.790625)).toBe(false) // 12,65 px, l'ancien doublon
  })

  it('couvre tout le site : aucune taille hors grille', () => {
    const fautives: string[] = []
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (EXEMPTS.some(e => relatif.endsWith(e) || relatif.split(sep).join(sep) === e)) continue
      if (DOSSIERS_EXEMPTS.includes(relatif.split(sep)[0])) continue
      const source = sansCommentaires(readFileSync(chemin, 'utf8'))
      for (const declaration of source.matchAll(DECLARATION)) {
        if (EST_COMPOSITION.test(declaration[0])) continue
        for (const valeur of declaration[0].matchAll(VALEUR_REM)) {
          if (!estSurLEchelle(parseFloat(valeur[1]))) {
            fautives.push(`${relatif} · ${valeur[1]}rem — ${declaration[0].trim()}`)
          }
        }
      }
    }
    expect(fautives, `Tailles hors échelle. Rangs admis : ${ECHELLE_REM.join(', ')}`).toEqual([])
  })
})

// ── LE PLANCHER DES PETITS CORPS (décision de l'auteur, 2026-09-21) ──────────────────
// Le site composait 402 textes entre 8 et 10,5 px. Plancher : 0,6875 rem (11 px) pour ce
// qu'on lit ; 0,625 rem (10 px) toléré pour une CAPITALE ESPACÉE, qui se lit plus gros que
// son corps. Hors plancher, et NOMMÉS ici : l'administration (lecteur unique), les appels
// de note et exposants (ils sont en `em` de leur texte, et ceux qui restent en rem le
// disent par leur `verticalAlign`), les ornements (losange, fleuron) et les pastilles à
// boîte fixe (cercle de moins de 20 px, un pictogramme et non un texte).
const PLANCHER_REM = 0.6875
const PLANCHER_CAPITALES_REM = 0.625
const DOSSIERS_HORS_PLANCHER = ['admin', 'quiz']
const EST_CAPITALE_ESPACEE = (objet: string) =>
  /uppercase|small-caps|smallCaps|fontVariantCaps/.test(objet) ||
  parseFloat(objet.match(/letter-?[sS]pacing\s*:\s*['"]?(0?\.\d+)em/)?.[1] ?? '0') >= 0.06
const EST_HORS_PLANCHER = (tete: string, objet: string) =>
  /verticalAlign\s*:\s*['"](super|top)|vertical-align\s*:\s*(super|top)|[Aa]ppel|[Ee]xposant/.test(tete + objet) ||
  /losange|fleuron|ornement/i.test(tete + objet) ||
  // Décision de l'auteur (2026-09-23) : la référence canonique de la Polyglotte, un cran sous
  // le plancher, parce qu'elle redit le numéro que la cellule porte déjà.
  /poly-marge-ref/.test(tete) ||
  (/border-?[rR]adius\s*:\s*['"]?50%/.test(objet) && /(^|[\s{;,])height\s*:\s*['"]?1\dpx/.test(objet))

/** L'objet de style (ou la règle CSS) qui enveloppe la position `i`. */
function enveloppe(source: string, i: number): [number, number] {
  let prof = 0
  let a = i
  for (; a >= 0; a--) {
    if (source[a] === '}') prof++
    else if (source[a] === '{') { if (prof === 0) break; prof-- }
  }
  prof = 0
  let b = i
  for (; b < source.length; b++) {
    if (source[b] === '{') prof++
    else if (source[b] === '}') { if (prof === 0) break; prof-- }
  }
  return [Math.max(a, 0), b]
}

describe('plancher des petits corps', () => {
  it('aucun texte sous 11 px, ni sous 10 px pour une capitale espacée', () => {
    const fautives: string[] = []
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (/\.test\.tsx?$/.test(relatif) || /899/.test(relatif)) continue
      if (EXEMPTS.some(e => relatif.endsWith(e))) continue
      if (DOSSIERS_HORS_PLANCHER.includes(relatif.split(sep)[0])) continue
      const source = sansCommentaires(readFileSync(chemin, 'utf8'))
      for (const declaration of source.matchAll(DECLARATION)) {
        if (EST_COMPOSITION.test(declaration[0])) continue
        const valeurs = [...declaration[0].matchAll(VALEUR_REM)].map(v => parseFloat(v[1]))
        if (!valeurs.some(v => v < PLANCHER_REM)) continue
        const [a, b] = enveloppe(source, declaration.index ?? 0)
        const objet = source.slice(a, b + 1)
        const tete = source.slice(source.lastIndexOf('\n', a - 1) + 1, a)
        if (EST_HORS_PLANCHER(tete, objet)) continue
        const plancher = EST_CAPITALE_ESPACEE(objet) ? PLANCHER_CAPITALES_REM : PLANCHER_REM
        if (valeurs.some(v => v < plancher)) fautives.push(`${relatif} · ${declaration[0].trim()}`)
      }
    }
    expect(fautives, 'Corps sous le plancher (charte, audit d’ergonomie du 2026-09-21)').toEqual([])
  })

  // ⛔ UNE TAILLE PASSÉE PAR CONSTANTE NE LUI ÉCHAPPE PLUS (audit d'harmonie, 2026-09-23).
  // La garde ne lisait que les déclarations écrites en clair : `fontSize: CORPS_INVITE`
  // laissait passer 10 px, et l'intitulé d'un encart de note vivait à 9 px. On relève donc
  // les CONSTANTES de taille (`const NOM = '0.625rem'`, exportées ou non) et l'on juge
  // chaque EMPLOI (`fontSize: NOM`, ou `font-size:` suivi de NOM interpolé) dans l'objet
  // qui l'enveloppe, par les mêmes règles que ci-dessus. Une constante exportée se résout
  // d'un fichier à l'autre, pourvu que son nom soit unique sur le site.
  it('ni par une constante de taille', () => {
    const CONSTANTE = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"`]([0-9]*\.?[0-9]+)rem['"`]/g
    const EMPLOI = /(?:fontSize|font-size)\s*:\s*(?:\$\{\s*)?([A-Z][A-Z0-9_]*)\b/g
    const fichiers = fichiersDeStyle(RACINE).filter(chemin => {
      const relatif = relative(RACINE, chemin)
      return !/\.test\.tsx?$/.test(relatif) && !/899/.test(relatif)
        && !EXEMPTS.some(e => relatif.endsWith(e))
        && !DOSSIERS_HORS_PLANCHER.includes(relatif.split(sep)[0])
    })
    const sources = new Map(fichiers.map(f => [f, sansCommentaires(readFileSync(f, 'utf8'))]))
    const globales = new Map<string, number[]>()
    for (const source of sources.values()) {
      for (const m of source.matchAll(CONSTANTE)) {
        globales.set(m[1], [...(globales.get(m[1]) ?? []), parseFloat(m[2])])
      }
    }
    const fautives: string[] = []
    let emplois = 0
    for (const [chemin, source] of sources) {
      const locales = new Map([...source.matchAll(CONSTANTE)].map(m => [m[1], parseFloat(m[2])]))
      for (const emploi of source.matchAll(EMPLOI)) {
        const nom = emploi[1]
        const partout = globales.get(nom)
        const valeur = locales.get(nom) ?? (partout?.length === 1 ? partout[0] : undefined)
        if (valeur === undefined) continue
        emplois++
        const relatif = relative(RACINE, chemin)
        if (!estSurLEchelle(valeur)) {
          fautives.push(`${relatif} · ${nom} = ${valeur}rem, hors échelle`)
          continue
        }
        if (valeur >= PLANCHER_REM) continue
        const [a, b] = enveloppe(source, emploi.index ?? 0)
        const objet = source.slice(a, b + 1)
        const tete = source.slice(source.lastIndexOf('\n', a - 1) + 1, a)
        if (EST_HORS_PLANCHER(`${tete} ${nom}`, objet)) continue
        const plancher = EST_CAPITALE_ESPACEE(objet) ? PLANCHER_CAPITALES_REM : PLANCHER_REM
        if (valeur < plancher) fautives.push(`${relatif} · ${emploi[0].trim()} (${valeur}rem)`)
      }
    }
    // La garde doit voir quelque chose : un motif cassé la rendrait muette et verte.
    expect(emplois).toBeGreaterThan(20)
    expect(fautives, 'Corps sous le plancher, passés par une constante').toEqual([])
  })
})
