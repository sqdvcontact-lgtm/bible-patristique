#!/usr/bin/env node
// Vérificateur de la composition des siècles.
//
// La règle est une seule : « IVe siècle » se compose avec le chiffre romain en
// petites capitales et l'ordinal en exposant, et cela vient de app/lib/siecles.tsx.
// Elle a été écrite cinq fois à la main dans le code, de cinq façons
// différentes — dont une qui ne produisait aucun effet (`font-variant:
// small-caps` sur des capitales, qui ne transforme que les bas-de-casse). Ce
// script est là pour que la sixième ne passe pas inaperçue.
//
//   node scripts/audit-siecles.mjs          → signale les écarts
//   node scripts/audit-siecles.mjs --tout   → montre aussi les emplois corrects
//
// Sortie : code 1 s'il reste un écart, de quoi le brancher sur un contrôle
// automatique le jour où l'on en voudra un.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// ⛔ `URL.pathname` rend un chemin PERCENT-ENCODÉ : l'espace de « Corpus Scriptura »
// y devient « %20 », et le script tombait sur ENOENT en cherchant un dossier nommé
// « Corpus%20Scriptura ». Il n'a donc jamais tourné depuis ce poste. `fileURLToPath`
// décode et rend au passage la lettre de lecteur, ce que le retrait manuel du « / »
// initial ne faisait qu'à moitié.
const RACINE = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_UNIQUE = 'app/lib/siecles.tsx'
const TOUT = process.argv.includes('--tout')

// ── Ce qu'on cherche ─────────────────────────────────────────────────────────
// Deux fautes possibles, et elles ne se ressemblent pas.
const SONDES = [
  {
    nom: 'composition à la main',
    // Petites capitales posées à côté d'un <sup> : quelqu'un recompose la règle
    // au lieu de l'importer.
    re: /(small-caps|smallCaps|fontVariantCaps)[\s\S]{0,200}?<sup/g,
    remede: `importer STYLE_ROMAIN / STYLE_ORDINAL, ou <Siecle>, depuis ${SOURCE_UNIQUE}`,
  },
  {
    nom: 'small-caps sans effet',
    // `small-caps` (sans `all-`) ne touche pas les capitales : sur « IV », il ne
    // fait rien.
    //
    // ⛔ MAIS IL NE VAUT QUE POUR UN SIÈCLE, et la sonde doit le dire. Le site
    // emploie les petites capitales pour tout autre chose — l'enrichissement
    // `++texte++`, son bouton d'éditeur, une locution du paratexte — sur du texte
    // en BAS DE CASSE, où `small-caps` fonctionne parfaitement et est l'écriture
    // juste. Non bornée, la sonde rendait onze cas dont dix étaient corrects, et
    // un vérificateur qui crie sur du bruit n'est plus lu (AGENTS.md : « une suite
    // durablement rouge cesse d'être un signal »). Elle exige donc, dans le même
    // voisinage, un indice de siècle.
    re: /(?:(?=[\s\S]{0,240}?(?:siècle|siecle|[Rr]omain|[Oo]rdinal|<sup))|(?<=(?:siècle|siecle|[Rr]omain|[Oo]rdinal)[\s\S]{0,240}?))font-?[Vv]ariant(?!-?[Cc]aps)\s*[:=]\s*['"]?small-caps/g,
    remede: 'employer all-small-caps (fontVariantCaps), sans quoi les capitales restent pleines',
  },
  {
    nom: 'siècle jamais composé',
    // Un siècle fabriqué en chaîne de caractères et affiché tel quel. On tolère
    // les gabarits passés ensuite à rendreSiecles ; d'où la vérification du
    // fichier plus bas.
    re: /`\$\{[^`]*\}e\s+siècle/g,
    remede: 'passer la chaîne à rendreSiecles(), ou employer <Siecle n={…}>',
  },
]

// Les éditeurs de texte enrichi ont un bouton « petites capitales » qui n'a rien
// à voir avec les siècles : c'est une mise en forme demandée par l'utilisateur.
//
// ⚠️ Cette liste n'avait JAMAIS été éprouvée : le script ne tournait pas depuis un
// poste dont le chemin porte une espace (voir RACINE plus haut), et l'on ne pouvait
// donc pas savoir ce qu'il lui manquait. Les fichiers ajoutés le 1er septembre 2026
// rendent l'enrichissement du corpus, non des siècles.
const HORS_SUJET = [
  'app/components/EditeurCommentaire.tsx',
  'app/lib/serialisationEssai.ts',
  'app/lib/texteEnrichiEssai.tsx',
  'app/essais/EditeurEssai.tsx',
  'app/admin/SectionTraductions.tsx',
]

// ⛔ Le GESTE plutôt que le fichier. Exempter TexteBible.tsx en entier renoncerait à
// y voir un vrai siècle mal composé ; on n'écarte donc qu'une occurrence dont le
// voisinage IMMÉDIAT parle d'enrichissement — les marqueurs ++ ^^ du corpus, ou le
// libellé du bouton d'éditeur. C'est ce qui met côte à côte, dans une même fonction,
// des petites capitales et un <sup> sans qu'aucun siècle soit en jeu.
// ⚠️ Les marqueurs sont ÉCHAPPÉS dans le source : le rendu de `++texte++` s'écrit
// `/\+\+(.+?)\+\+/`, où deux « + » ne se suivent jamais. Chercher « ++ » à la lettre
// ne trouvait donc rien là où le geste est précisément une expression régulière.
//
// ⚠️ Le libellé se cherche ENTRE GUILLEMETS, jamais en prose : à l'épreuve, un
// commentaire qui écrivait « petites capitales » pour décrire un défaut désarmait la
// sonde et le défaut passait. Une exemption qu'un commentaire peut poser n'en est pas
// une.
const ENRICHISSEMENT = /(\\?\+){2}|(\\?\^){2}|['"][Pp]etites capitales|petitesCap/
const PORTEE_VOISINAGE = 160

function estEnrichissement(texte, index) {
  return ENRICHISSEMENT.test(texte.slice(Math.max(0, index - PORTEE_VOISINAGE), index + PORTEE_VOISINAGE))
}

function fichiers(dir, acc = []) {
  for (const nom of readdirSync(dir)) {
    if (nom === 'node_modules' || nom === '.next' || nom.startsWith('.')) continue
    const chemin = join(dir, nom)
    if (statSync(chemin).isDirectory()) fichiers(chemin, acc)
    // ⚠️ Les fichiers de TEST sont hors sujet, comme pour la garde chromatique : un
    // test qui vérifie la sortie de `siecles.tsx` en cite forcément la composition,
    // et c'est son office. `HistoricalDate.test.tsx` était signalé pour cela.
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) acc.push(chemin)
  }
  return acc
}

function ligneDe(texte, index) {
  return texte.slice(0, index).split('\n').length
}

const ecarts = []
const corrects = []

for (const chemin of fichiers(join(RACINE, 'app'))) {
  const rel = relative(RACINE, chemin).replace(/\\/g, '/')
  if (rel === SOURCE_UNIQUE) continue
  const texte = readFileSync(chemin, 'utf8')

  if (/from ['"]@\/app\/lib\/siecles['"]/.test(texte)) corrects.push(rel)
  if (HORS_SUJET.includes(rel)) continue

  for (const sonde of SONDES) {
    sonde.re.lastIndex = 0
    let m
    while ((m = sonde.re.exec(texte))) {
      if (estEnrichissement(texte, m.index)) continue
      ecarts.push({ rel, ligne: ligneDe(texte, m.index), sonde })
    }
  }
}

// ── Rapport ──────────────────────────────────────────────────────────────────
console.log(`\nComposition des siècles — source unique : ${SOURCE_UNIQUE}\n`)

if (TOUT) {
  console.log(`${corrects.length} fichier(s) importent la règle :`)
  for (const rel of corrects.sort()) console.log(`  · ${rel}`)
  console.log('')
}

if (!ecarts.length) {
  console.log('Aucun écart. La règle n’est écrite qu’à un endroit.\n')
  process.exit(0)
}

const parSonde = new Map()
for (const e of ecarts) {
  if (!parSonde.has(e.sonde.nom)) parSonde.set(e.sonde.nom, { remede: e.sonde.remede, cas: [] })
  parSonde.get(e.sonde.nom).cas.push(e)
}

for (const [nom, { remede, cas }] of parSonde) {
  console.log(`${nom} — ${cas.length} cas`)
  console.log(`  remède : ${remede}`)
  for (const c of cas) console.log(`  ${c.rel}:${c.ligne}`)
  console.log('')
}

console.log(`${ecarts.length} écart(s) au total.\n`)
process.exit(1)
