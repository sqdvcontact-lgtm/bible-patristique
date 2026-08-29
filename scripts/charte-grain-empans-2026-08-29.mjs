/**
 * Consigne dans la charte la règle du GRAIN DE L'EMPAN, et remet le miroir à jour.
 *
 * Règle posée par l'auteur le 2026-08-29, en trois temps :
 *   1. quand l'édition traduite paragraphe, l'alignement suit son paragraphage ;
 *   2. à défaut, on pose des frontières à la main, aux jonctions sémantiques ;
 *   3. le paragraphe est une frontière ABSOLUE — aucun groupe ne l'enjambe — mais
 *      l'empan doit rester bref, faute de quoi l'œil ne tient plus les deux colonnes.
 *
 * Le script corrige au passage une règle que la charte donnait encore pour vraie : le
 * choix entre deux ensembles ne se fait plus sur l'étiquette `alignment_level` mais sur
 * le NOMBRE de groupes, depuis le 2026-08-25 (voir `choisirEnsembleBilingue`).
 *
 * ⛔ Il REFUSE d'écrire si un motif ne se trouve pas exactement une fois : mieux vaut ne
 * rien consigner que consigner à moitié.
 *
 * ⚠️ Le miroir `charte/CHARTE_IA.md` avait pris 7 807 signes de retard sur Supabase, la
 * source. Aucune de ses lignes propres n'est absente de la base : ce sont des rédactions
 * antérieures des mêmes passages. Le script le récrit donc en copie EXACTE de la base,
 * comme le veut le § « source unique », et non par la seule application des motifs.
 *
 * Usage : node scripts/charte-grain-empans-2026-08-29.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const cheminMiroir = resolve(racine, 'charte', 'CHARTE_IA.md')
const cleSauvegarde = 'charte_ia_sauvegarde_20260829_avant_grain_empans'
const essaiSeul = process.argv.includes('--dry')

const AVANT_GROUPE_PARAGRAPHE =
  '**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes, et non `paragraphe`, qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Doctrine des Apôtres, 28 enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes. Le niveau retenu est `paragraph`, à défaut `segment`, à défaut `division`, et seulement entre le texte lu et un texte en langue originale : un alignement entre deux traductions françaises n’a rien à mettre dans une colonne de latin.'

const APRES_GROUPE_PARAGRAPHE = [
  '**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes, et non `paragraphe`, qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Doctrine des Apôtres, 28 enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes.',
  '',
  '⛔ **Entre deux ensembles posés sur la même paire de textes, c’est le plus FIN qui porte la lecture, et la finesse se COMPTE** : une ligne de `texte_alignements` vaut un groupe, et le plus grand nombre l’emporte. `alignment_level` est l’étiquette de l’éditeur, non une mesure, et ne départage qu’à finesse inconnue ou égale. La Doctrine des Apôtres l’a montré le 25 août 2026 : son ensemble étiqueté `division` apparie les sections de Funk une à une, quand son ensemble étiqueté `paragraph` en réunit jusqu’à cinq contre cinq. Le choix ne s’ouvre qu’entre le texte lu et un texte en langue originale : un alignement entre deux traductions françaises n’a rien à mettre dans une colonne de latin.',
  '',
  '#### Le grain de l’empan — trois règles, dans cet ordre',
  '',
  '**1. Le paragraphe de l’édition traduite fait loi.** Quand la traduction porte le paragraphage de son édition, l’alignement l’épouse : l’empan naît et meurt avec le paragraphe. ⛔ Le paragraphe est une **frontière sémantique absolue** — aucun groupe ne l’enjambe, jamais, quelque commodité qu’on trouverait à le faire du côté de l’original. La langue originale, elle, n’oppose aucune frontière : ses propres paragraphes, ses sections numérotées et ses divisions se traversent librement, puisque c’est la traduction qui se lit.',
  '',
  '**2. À défaut de paragraphage, on pose les frontières à la main.** Une édition qui ne paragraphe pas, ou dont l’importation n’a pas retenu les alinéas, n’autorise pas pour autant l’empan long. On constitue alors des frontières aux **jonctions sémantiques** de l’ouvrage : changement d’objet, de destinataire, de mouvement de l’argument. Elles sont éditoriales, se justifient dans `texte_alignements.justification`, et ne se déduisent ni d’un compte de signes ni d’une limite de page. Mais la première tâche reste de rendre au texte traduit les paragraphes de son édition lorsque c’est l’importation qui les a perdus : la règle 1 vaut toujours mieux que la règle 2.',
  '',
  '**3. L’empan reste bref.** Un groupe peut être plus petit qu’un paragraphe, jamais plus grand : la règle 1 pose le plafond, la règle 3 dit qu’on n’a pas à l’atteindre. Il faut que l’œil tienne les deux colonnes ensemble et qu’un empan se lise d’un seul regard. **Repère de contrôle : environ 900 signes, 1 500 en limite haute.** Au-delà, l’empan se subdivise à une jonction sémantique, à l’intérieur du paragraphe. Ce repère mesure, il ne tranche pas : c’est le sens qui place la coupe, jamais le compteur.',
  '',
  'Le témoin est l’alignement des *Confessions* : 932 groupes pour 932 paragraphes, aucun chevauchement, 876 signes de médiane. ⛔ **Un ensemble déclaré `division` n’est pas une dispense.** Aligner question contre question ou chapitre contre chapitre est un point de départ, non un état publiable : c’est ainsi que les *Questions sur l’Heptateuque* mettent 56 585 signes en regard d’un seul bloc. Un ensemble reste `candidate` tant que son grain n’a pas été repris.',
].join('\n')

const REMPLACEMENTS = [
  {
    nom: '§12.2 — le grain de l’empan, et le choix par le nombre de groupes',
    avant: AVANT_GROUPE_PARAGRAPHE,
    apres: APRES_GROUPE_PARAGRAPHE,
  },
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

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avantBase = data.valeur
const avantMiroir = readFileSync(cheminMiroir, 'utf8')

// Les motifs doivent se trouver dans les DEUX exemplaires, même si seul celui de la base
// est réécrit par remplacement : c'est la preuve que le miroir n'a pas divergé LÀ.
appliquer(avantMiroir, 'miroir')
const apresBase = appliquer(avantBase, 'base')

const derive = avantBase.length - avantMiroir.length
console.log(`base   : ${avantBase.length} → ${apresBase.length} signes`)
console.log(`miroir : ${avantMiroir.length} signes, soit ${derive} de retard sur la base ; récrit en copie exacte.`)

if (essaiSeul) {
  console.log('Essai seul : rien n’a été écrit.')
  process.exit(0)
}

const { error: erreurSauvegarde } = await db
  .from('parametres')
  .upsert({ cle: cleSauvegarde, valeur: avantBase }, { onConflict: 'cle' })
if (erreurSauvegarde) throw erreurSauvegarde

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apresBase }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture

writeFileSync(cheminMiroir, apresBase, 'utf8')

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (relu.valeur !== apresBase) throw new Error('La charte relue ne correspond pas à ce qui a été écrit.')
if (readFileSync(cheminMiroir, 'utf8') !== apresBase) throw new Error('Le miroir relu ne correspond pas à la base.')

console.log(`Charte consignée. Sauvegarde : ${cleSauvegarde}. Miroir remis à l’identique.`)
