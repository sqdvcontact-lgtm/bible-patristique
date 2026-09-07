/**
 * Corrige la charte, § 7.4 : le VERS a une CINQUIÈME surface, l'INTRODUCTION.
 *
 * L'argument hissé en tête d'une division se rend hors des groupes, par un chemin à
 * lui, qui ne savait rien de `forme = vers` : les 79 vers de l'*Epigramma* de Dhuoda
 * s'y composaient en prose justifiée et césurée. Or ce poème demande qu'on lise
 * l'initiale de chaque vers.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia`.
 * ⛔ Le script REFUSE d'écrire si un motif ne se trouve pas exactement une fois dans
 * chacun. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-vers-cinquieme-surface-2026-09-07.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 7.4 — le titre',
    avant: '### 7.4. Le VERS — un style, quatre surfaces',
    apres: '### 7.4. Le VERS — un style, cinq surfaces',
  },
  {
    nom: '§ 7.4 — les cinq surfaces partagent la règle',
    avant: '(`app/lib/compositionVers.ts`), et les quatre surfaces la partagent.',
    apres: '(`app/lib/compositionVers.ts`), et les cinq surfaces la partagent.',
  },
  {
    nom: '§ 7.4 — la table des surfaces',
    avant: '| Apparat d’une bible | `form: \'verse\'` sur le paragraphe | `STYLE_CORPS` |',
    apres: '| **Introduction d’une œuvre** | `segment_metadata.forme = \'vers\'` | `styleBlocArgumentEnVers` |\n| Apparat d’une bible | `form: \'verse\'` sur le paragraphe | `STYLE_CORPS` |',
  },
  {
    nom: '§ 7.4 — l’introduction est une surface',
    avant: '#### Une seule écriture, et c’est l’APPARAT qui l’a imposée',
    apres: [
      '#### L’INTRODUCTION est une surface, et elle a vécu sans le vers',
      '',
      '⛔ **Une surface se reconnaît à son CHEMIN de rendu, non à sa place dans la page.**',
      'L’argument hissé en tête d’une division se rend hors des groupes et hors de la',
      'pagination : c’est un chemin à part, et il ne savait rien de `forme = vers`. Les 79',
      'vers de l’*Epigramma* de Dhuoda (*Manuel pour mon fils*, Bondurand 1887) s’y',
      'composaient en prose justifiée et césurée, un bloc par vers, avec un blanc à chaque',
      'changement de `paragraphe` (relevé de l’auteur, 7 septembre 2026).',
      '',
      '⚠️ Le poème demande pourtant qu’on lise l’INITIALE de chaque vers — « Lector qui',
      'cupis formulam hanc nosse, capita perquiras apta versorum ». La ligne y porte le sens',
      'même, et la justification le détruisait. ⛔ C’est le cas général : un vers est une',
      'unité de SENS autant que de forme, et aucune surface n’a le droit de l’effacer.',
      '',
      '⚠️ Seuls les segments de `nature = \'introduction\'` empruntent ce chemin. Un vers de',
      'l’espace `introduction` qui porte une autre nature — les quatre lignes de dédicace du',
      '*Discours 38*, `apparat_editeur` — reste dans le flux du corps et s’y composait déjà',
      'juste. **Deux segments voisins d’un même espace peuvent donc suivre deux chemins :',
      'c’est la nature qui aiguille, et c’est pourquoi une surface se compte au chemin.**',
      '',
      '#### Une seule écriture, et c’est l’APPARAT qui l’a imposée',
    ].join('\n'),
  },
]

/**
 * ⚠️ Les DEUX exemplaires ont DIVERGÉ sur l'apostrophe : le miroir écrit « Apparat
 * d'une bible » avec l'apostrophe droite là où Supabase porte la courbe. Un motif
 * littéral ne peut donc pas servir les deux. On apparie à l'apostrophe INDIFFÉRENTE,
 * et l'on reprend celle que l'exemplaire employait — corriger la ponctuation au
 * passage serait une seconde correction, non demandée et invisible dans le diff.
 */
function motifIndifferentALApostrophe(avant) {
  const echappe = avant.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return new RegExp(echappe.replace(/['’]/gu, '[\'’]'), 'gu')
}

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const motif = motifIndifferentALApostrophe(avant)
    const trouvees = [...sortie.matchAll(motif)]
    if (trouvees.length !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees.length} occurrence(s), 1 attendue.`)
    const droite = trouvees[0][0].includes("'") && !trouvees[0][0].includes('’')
    sortie = sortie.replace(motif, droite ? apres.replace(/’/gu, "'") : apres)
  }
  return sortie
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
// ⚠️ La relecture apparie à l'apostrophe INDIFFÉRENTE, comme l'écriture : sans cela
// elle crie au défaut sur un exemplaire qui emploie l'apostrophe droite, alors que la
// correction y est bien passée.
for (const { nom, apres } of REMPLACEMENTS) {
  if (!motifIndifferentALApostrophe(apres).test(relue.valeur)) {
    throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
  }
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
