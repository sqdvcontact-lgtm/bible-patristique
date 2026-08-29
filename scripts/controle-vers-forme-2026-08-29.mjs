/**
 * Centre de contrôle — le verrou de Boèce est levé, la normalisation du vers est faite.
 *
 * Remplace la note « EN ATTENTE D'UN ARBITRAGE » du chantier éditorial par son
 * dénouement. Décision de l'auteur du 29 août 2026 : « le verrou de Boèce ne tient
 * plus, tu peux le défaire. ensuite, corrige ce qui doit l'être. »
 *
 * Usage : node scripts/controle-vers-forme-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const DEBUT = '[STYLES|verrou-boece-20260829]'
const FIN = '[AUDIT|natures-et-styles-20260829]'

const NOUVELLE = `[STYLES|vers-forme-20260829] ✅ FAIT : le verrou de Boèce est levé, et le vers ne se déclare plus que d'une façon.

L'auteur a tranché — « le verrou de Boèce ne tient plus, tu peux le défaire ». Le déclencheur \`trg_guard_boece_source_immutability_v3\` est retiré (migration 20260829140000) ; ⚠️ sa FONCTION est conservée, le reposer ne demande qu'un \`create trigger\`, écrit en tête de la migration.

LA MIGRATION. 2 325 segments ont quitté \`nature = vers\` pour \`segment_metadata.forme = vers\`, la nature retombant sur celle de leurs FRÈRES — ce que porte, dans le même espace, un bloc de même fonction : 1 213 vers de Boèce chez Ceriziers et 1 092 chez Mirandol passent en \`texte\` (espace corps), les 20 du Manuel de Dhuoda en \`introduction\` (espace introduction). Les comptes tombent juste : \`texte\` monte de 88 811 à 91 116, \`introduction\` de 37 à 57. Contrôlé ligne à ligne contre la sauvegarde : zéro autre champ touché, zéro métadonnée altérée hors la clé \`forme\`. \`chk_segments_nature\` refuse désormais \`vers\` (migration 20260829150000, éprouvée en transaction annulée). Sauvegarde \`internal.backup_vers_forme_20260829\`, retour en arrière \`sql/rollback_vers_forme_20260829.sql\`.

⛔ CE QUE LA MIGRATION A TROUVÉ, ET QUI VALAIT MIEUX QUE LA MIGRATION. Trois lecteurs du site jugeaient le vers sur la SEULE nature, sans passer par le prédicat \`estEnVers\` : la lecture bilingue (\`bilingueAlignement.ts\`) et deux endroits des traductions parallèles (\`ComparaisonTraductions.tsx\`). Les deux écritures avaient donc déjà divergé, et c'est l'argument le plus fort contre le fait d'en garder deux. Ni les types, ni les 1 207 tests, ni la relecture du prédicat ne le disaient : c'est le grep sur la nature qui les a trouvés. Ils sont recâblés, et le prédicat lit maintenant la forme sous ses DEUX enveloppes — à plat (\`forme:segment_metadata->>forme\`) et dans la colonne entière —, ce qui est un second TRANSPORT et non une seconde déclaration.

⚠️ ET CE QU'ELLE A COÛTÉ. La base est PARTAGÉE entre le poste de travail et le site en ligne : écrire la donnée avant de pousser le code a rendu faux, à la seconde même, le code déjà déployé. Les traductions parallèles de Boèce ont composé leurs vers en prose le temps du correctif. C'est le piège déjà consigné pour \`oeuvres_auteurs\` — on change le code AVANT la donnée, ou les deux dans le même souffle. Consigné dans AGENTS.md et dans la charte § 7.4.

⛔ LE VERROU N'ÉTAIT CONSIGNÉ NULLE PART — ni charte, ni AGENTS.md, ni ici : on l'a découvert en butant dessus. C'est la leçon à garder de lui, et elle est maintenant écrite aux trois endroits.

Documenté : charte §§ 7.4 et 7.5.1 (la nature \`vers\` a quitté le catalogue, qui compte treize natures), AGENTS.md, planche \`/admin/styles\`. Garde \`app/lib/versQuatreSurfaces.test.ts\`, portée à 10 tests : elle tient la déclaration sous ses deux enveloppes ET le refus de la nature disparue.

`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('controle_sections').select('commentaire_ia').eq('cle', 'chantier_oeuvres').single()
if (error) throw error
const avant = data.commentaire_ia

if (avant.includes('[STYLES|vers-forme-20260829]')) { console.log('Déjà posé.'); process.exit(0) }

const i = avant.indexOf(DEBUT)
const j = avant.indexOf(FIN)
if (i !== 0) throw new Error(`la note du verrou n'ouvre pas la section (index ${i}).`)
if (j <= i) throw new Error('ancre de fin introuvable.')

const apres = NOUVELLE + avant.slice(j)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: err } = await db.from('controle_sections')
  .update({ commentaire_ia: apres, maj_le: new Date().toISOString() }).eq('cle', 'chantier_oeuvres')
if (err) throw err

const { data: relu } = await db.from('controle_sections').select('commentaire_ia').eq('cle', 'chantier_oeuvres').single()
if (!relu.commentaire_ia.startsWith('[STYLES|vers-forme-20260829]')) throw new Error('relecture : la note neuve est absente.')
if (relu.commentaire_ia.includes('EN ATTENTE D’UN ARBITRAGE') || relu.commentaire_ia.includes("EN ATTENTE D'UN ARBITRAGE")) {
  throw new Error('relecture : l’ancienne note est encore là.')
}
console.log('Centre de contrôle à jour, relu.')
