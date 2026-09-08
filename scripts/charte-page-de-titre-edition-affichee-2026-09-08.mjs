/**
 * Complète la charte, § 5 : LA PAGE DE TITRE EST CELLE DE L'ÉDITION AFFICHÉE.
 *
 * Le § 5.3 exige déjà d'une notice qu'elle décrive « l'édition réellement transcrite »
 * et ne mêle pas deux témoins. Le frontispice, lui, les mêlait : le repli d'identité se
 * faisait champ par champ, si bien que le silence d'une version passait pour une lacune
 * à combler par l'œuvre. Demande de l'auteur, 8 septembre 2026 : « elle doit
 * correspondre à l'édition qui est affichée ; si on a deux éditions, la latine et la
 * française, il faut faire en conséquence ».
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia` —
 * avec la même table de remplacements. ⛔ Le script REFUSE d'écrire si un motif ne se
 * trouve pas exactement une fois dans chacun : mieux vaut ne rien corriger que corriger
 * à moitié.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains, et
 * une lecture suivie d'une écriture sans garde effacerait le travail d'un autre.
 *
 * Usage : node scripts/charte-page-de-titre-edition-affichee-2026-09-08.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Le traitement passe par l\'abonnement, sans clé d\'interface de programmation, et aucune donnée ne part sans consentement explicite. Toute clé d\'accès à la base employée pour l\'enrichissement demeure locale : elle n\'est ni journalisée ni exportée.'

const SECTION = [
  '',
  '### 5.5 La page de titre du site',
  '',
  '⛔ **LA PAGE DE TITRE EST CELLE DE L’ÉDITION AFFICHÉE** (demande de l’auteur, 8 septembre 2026 : « elle doit correspondre à l’édition qui est affichée ; si on a deux éditions, la latine et la française, il faut faire en conséquence »). Ce que le § 5.3 exige d’une notice vaut du frontispice : il décrit l’édition qu’on lit, et ne mêle pas deux témoins.',
  '',
  '⚠️ **Une version active dit TOUT de son édition, son silence compris.** Le repli sur l’œuvre se faisait champ par champ (`versionActive?.champ ?? oeuvre.champ`), si bien que l’absence d’une donnée passait pour une lacune à combler : le texte latin de Bondurand, qui n’a pas de traducteur, empruntait celui de l’œuvre et sa page de titre annonçait « Traduction par intelligence artificielle sous la direction de Corpus Scriptura ». Dix-neuf textes du corpus étaient dans ce cas, et tous les dix-neuf sont des textes en LANGUE ORIGINALE. L’œuvre ne parle qu’à défaut de version active — ou, quand la version ne porte aucune adresse, pour la version PAR DÉFAUT, seule dont les champs de l’œuvre répondent.',
  '',
  '⛔ **Une adresse se prend ENTIÈRE, ou pas du tout.** Une ville d’une édition et un éditeur d’une autre ne font pas une adresse : « D’après l’édition de Paris, Corpus Scriptura, 2026 » prenait Paris à Picard 1887 et le reste à la traduction française, et ne nommait aucune édition réelle.',
  '',
  '⛔ **Deux éditions à l’écran, deux mentions sur la page de titre.** En lecture bilingue, le texte établi se nomme AVANT la traduction — « Texte latin d’après l’édition de Paris, Alphonse Picard, 1887 », puis « Traduction par… » —, l’ordre du titre d’un bilingue. ⚠️ Il ne se nomme que s’il existe vraiment : une colonne en regard tirée du repli `segments.texte_original` n’est pas une autre édition, c’est la même qui porte son original avec elle, et il n’y a rien de plus à nommer.',
  '',
  '⚠️ **L’invite de l’administrateur suit le crayon.** « Traduction de… » ne paraît que là où le champ se corrige, c’est-à-dire sur l’œuvre : sur une version, elle proposait de remplir un champ qu’on ne peut pas atteindre de là, et sur un texte latin, de lui donner un traducteur qu’il n’a pas.',
  '',
  'La règle vit dans `identiteEdition` (`app/oeuvre/[id]/versionTextuelle.ts`) et sert la page de titre, la fiche « À propos de cette édition », la citation et l’extraction.',
].join('\n')

const REMPLACEMENTS = [
  { nom: '§ 5.5 — la page de titre du site', avant: ANCRE, apres: `${ANCRE}\n${SECTION}` },
]

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
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

// ⛔ Les DEUX d'abord, l'écriture ensuite.
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
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase. Le fichier local, lui, est corrigé — relancer après avoir tiré le miroir.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, apres } of REMPLACEMENTS) {
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires portent la règle, et la relecture les confirme.')
