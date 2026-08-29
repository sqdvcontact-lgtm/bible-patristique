/**
 * Ouvre la mission « Alignements — le grain de l'empan » dans le centre de contrôle.
 *
 * La règle est à la charte, § 12.2 (« Le grain de l'empan »). La LISTE des œuvres à
 * traiter vit ici, dans `controle_sections`, et non dans la charte ni dans AGENTS.md :
 * une doctrine ne tient pas le compte de ce qui reste à faire.
 *
 * Une tâche par œuvre, comme la mission « Textes originaux », pour que le routage des
 * mutations trouve l'identifiant dans la prose de la tâche.
 *
 * ⛔ Chaque tâche tient sous 600 signes : au-delà, `nettoyerTodos` (app/api/admin/
 * controle-todos/route.ts) la jetterait silencieusement au premier enregistrement fait
 * depuis l'écran. Le script le vérifie avant d'écrire.
 *
 * Usage : node scripts/controle-mission-grain-empans-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const essaiSeul = process.argv.includes('--dry')
const CLE = 'alignements_empans'
const LIMITE_TACHE = 600

const commentaire = [
  "Mission ouverte le 29 août 2026, à la demande de l'auteur. La règle est consignée à la charte, § 12.2, sous « Le grain de l'empan » : quand l'édition traduite paragraphe, l'alignement suit son paragraphage ; à défaut, on pose des frontières à la main aux jonctions sémantiques ; le paragraphe est une frontière ABSOLUE qu'aucun groupe n'enjambe, mais l'empan doit rester bref — environ 900 signes, 1 500 en limite haute — pour que l'œil tienne les deux colonnes ensemble.",
  '',
  "Le CODE compose déjà depuis les groupes et retient le plus fin des ensembles concurrents ; la MESURE de la règle vit désormais dans app/lib/grainAlignement.ts, que rejoue scripts/alignement-grain-controle.mts. Ce sont les DONNÉES qui décrochent. Relevé du 29 août sur les QUATRE ensembles qui portent la lecture : 41 empans enjambent une frontière du texte traduit, 1 051 dépassent 1 500 signes (dont 795 pour la seule Cité de Dieu), et 2 reposent sur des segments sans numéro de paragraphe.",
  '',
  "⚠️ Ce compte ne retient QUE ce que le lecteur subit. Toutes colonnes traduites confondues, ensembles écartés compris, on relève 172 franchissements : l'écart est Boèce, dont l'appariement confronte deux traductions françaises et ne sert aucune colonne originale, et l'ensemble PARAGRAPH de la Didachè, que la règle du plus fin écarte. Ne pas publier l'un pour l'autre.",
  '',
  "Deux défauts distincts, à ne pas confondre. Le premier est une violation : un groupe à cheval sur deux paragraphes défait ce que l'alignement établit. Le second est un excès de grain : la frontière est tenue, mais l'empan est trop long pour se lire en regard, soit que l'édition ait de longs paragraphes, soit que l'importation les ait perdus. Le premier se corrige toujours ; le second se corrige d'abord en rendant au texte traduit les alinéas de son édition, et seulement ensuite à la main.",
  '',
  "⚠️ Rien ne se corrigera tant qu'aucun outil ne saura poser une frontière : le site LIT les trois tables d'alignement, il n'y écrit jamais, et tous les ensembles existants viennent de scripts ou de migrations. L'atelier est le préalable, et il porte sa propre tâche.",
].join('\n')

const taches = [
  "⛔ [A0010O0023|empans-heptateuque] Augustin, Questions sur l'Heptateuque — l'ensemble ZYC1895-POGNON1866 (653 groupes, « candidate ») aligne question contre question : 33 groupes franchissent une frontière du français et 186 dépassent 1 500 signes ; le plus gros, livre II question CLXXVII, en met 56 585 en regard d'un seul bloc, sur 175 segments. Priorité 1 : c'est la seule œuvre qui viole les deux règles à la fois. Reprendre l'ensemble au paragraphe, puis subdiviser aux jonctions sémantiques.",
  "⏳ [A0010O0002|empans-cite-de-dieu] Augustin, Cité de Dieu — l'ensemble VIVES (1 039 groupes, « candidate ») tient la frontière, 2 empans seulement à cheval, mais le grain est trop gros : 2 237 signes de médiane, 795 empans au-dessus de 1 500, le plus long à 9 275, livre XVIII chapitre 32. Le français Vivès ne compte que 1 033 paragraphes pour 665 chapitres : lui rendre d'abord le paragraphage de son édition, puis subdiviser. ⚠️ Les 6 segments des préfaces des livres VI et VII n'ont AUCUN numéro de paragraphe : leur empan ne se juge pas.",
  "⏳ [A0012O0002|empans-didache] Doctrine des Apôtres — l'ensemble …:SECTION porte la lecture et tient le meilleur grain du corpus (100 groupes, 136 signes de médiane), mais 6 de ses groupes franchissent une frontière du français : les y ramener. Trancher en même temps le sort de …:PARAGRAPH (57 groupes, dont 28 à cheval), que la règle du plus fin écarte déjà : le passer en « retired » plutôt que le laisser concourir à chaque chargement.",
  "⏳ [A0064O0001|empans-boece] Boèce, Consolation de la philosophie — l'ensemble Mirandol/Cerisiers confronte deux traductions FRANÇAISES : il ne porte aucune colonne en langue originale, et ses franchissements ne se voient donc nulle part aujourd'hui. Le grain est court, 215 signes de médiane, mais 17 groupes franchissent une frontière chez Cerisiers et 86 chez Mirandol : ils paraîtront le jour où le latin de Migne aura son texte propre, cf. la mission « Textes originaux — une seule occurrence ».",
  "⏳ [A0010O0001|empans-confessions] Augustin, Confessions — TÉMOIN de la règle, et seul ensemble conforme : 932 groupes pour 932 paragraphes, aucun chevauchement, 876 signes de médiane, statut « validated_human ». Seule réserve, à traiter au fil de l'eau sans rouvrir l'ensemble : 70 groupes dépassent 1 500 signes, et un seul dépasse 3 000.",
  "⏳ [empans-atelier] Ouvrir l'atelier d'alignement dans l'administration, préalable à tout le reste : les deux colonnes en regard, couper un groupe à une jonction sémantique, refuser la coupe qui ferait enjamber un paragraphe du texte traduit, écrire la justification, et faire monter l'ensemble de « candidate » à « validated_human ». Aujourd'hui le site ne sait que lire ces tables.",
  "⏳ [empans-invariant] La mesure existe (app/lib/grainAlignement.ts, scripts/alignement-grain-controle.mts) ; reste à la CERTIFIER dans le contrôle v2, pour qu'un alignement ne puisse plus passer en validated_human en franchissant une frontière. Relevé d'ouverture sur les quatre ensembles qui portent la lecture : 41 empans à cheval, 1 051 au-dessus de 1 500 signes, 2 à paragraphe inconnu. ⛔ Ne pas recoder la mesure en SQL : elle divergerait du site.",
]

const trop = taches.filter(t => t.length > LIMITE_TACHE)
if (trop.length > 0) {
  throw new Error(`${trop.length} tâche(s) au-dessus de ${LIMITE_TACHE} signes : ${trop.map(t => t.length).join(', ')}.`)
}
console.log(`${taches.length} tâches, la plus longue à ${Math.max(...taches.map(t => t.length))} signes.`)

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ligne = {
  cle: CLE,
  titre: "Alignements — le grain de l’empan",
  ordre: 11,
  commentaire_ia: commentaire,
  todos: taches.map(texte => ({ texte, fait: false })),
  maj_le: new Date().toISOString(),
}

if (essaiSeul) {
  console.log('Essai seul : rien n’a été écrit.')
  process.exit(0)
}

const { error } = await db.from('controle_sections').upsert(ligne, { onConflict: 'cle' })
if (error) throw error

const { data: relu, error: erreurRelecture } = await db
  .from('controle_sections')
  .select('cle, titre, ordre, todos')
  .eq('cle', CLE)
  .single()
if (erreurRelecture) throw erreurRelecture
if (relu.todos.length !== taches.length) throw new Error('Les tâches relues ne correspondent pas.')

console.log(`Section « ${relu.titre} » ouverte (${relu.todos.length} tâches, ordre ${relu.ordre}).`)
