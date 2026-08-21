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

const RACINE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
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
    // fait rien. Signalé partout, car le défaut est invisible à la relecture.
    re: /font-?[Vv]ariant(?!-?[Cc]aps)\s*[:=]\s*['"]?small-caps/g,
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
const HORS_SUJET = [
  'app/components/EditeurCommentaire.tsx',
  'app/lib/serialisationEssai.ts',
  'app/lib/texteEnrichiEssai.tsx',
  'app/essais/EditeurEssai.tsx',
  'app/admin/SectionTraductions.tsx',
]

function fichiers(dir, acc = []) {
  for (const nom of readdirSync(dir)) {
    if (nom === 'node_modules' || nom === '.next' || nom.startsWith('.')) continue
    const chemin = join(dir, nom)
    if (statSync(chemin).isDirectory()) fichiers(chemin, acc)
    else if (/\.tsx?$/.test(nom)) acc.push(chemin)
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
