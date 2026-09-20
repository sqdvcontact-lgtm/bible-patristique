/**
 * § 50.5 : une colonne de la Polyglotte dont le texte n’est pas dans `versets_v2`.
 * Posé le 20 septembre 2026, après la Fillion : « il faut que les livres traités de
 * Fillion y apparaissent ; le latin et le français, séparément ».
 *
 * ⛔ N’écrit QUE dans `parametres.charte_ia` ; le miroir se régénère par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 * Usage : node scripts/charte-polyglotte-colonne-hors-versets-2026-09-20.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = "⚠️ **CES NOTES PARAISSENT AUSSI SUR LA PAGE BIBLE** (§ 13.22, 17 septembre 2026). Une note se rédige une fois, pour les deux pages : ce qu’elle dit d’un fragment se lit dans la Polyglotte à côté de ce fragment, et sur la page Bible dans la fenêtre du créneau qui réunit les fragments."

const AJOUT = "\n\n### 50.5 Une colonne dont le texte n’est pas dans `versets_v2`\n\nDemande de l’auteur du 20 septembre 2026 : « il faut que les livres traités de Fillion y apparaissent ; le latin et le français, séparément ».\n\nToutes les bibles ne vivent pas dans `versets_v2`. La Fillion, comme le témoin 899, est une ÉDITION : son texte est recomposé unité par unité depuis les tables éditoriales, puis posé sur l’axe canonique par les alignements vérifiés. Elle a pourtant sa place en colonne, au même titre que les autres.\n\n⚠️ **LA PAGE NE CHANGE QUE DE TABLE.** Ce que la base lui donne porte les MÊMES COLONNES que `versets_v2` — `canon_id`, `livre`, `trad_id`, `ch_orig`, `v_orig`, `texte`, `notes` —, si bien que le cache, les filtres, la grille et les lettrines ne savent rien de la différence. C’est à la BASE de réduire une autre provenance au contrat de lecture, jamais à la page de connaître deux chemins : la Fillion se lit dans `v_polyglotte_fillion`, une vue matérialisée indexée par livre et par chapitre.\n\n⛔ **UNE PAGE NE LIT JAMAIS UNE CHAÎNE DE VUES QUI RECALCULE.** Une CTE lue DEUX FOIS est matérialisée par Postgres : aucun filtre ne descend dedans, et la vue recalcule tout son contenu à chaque requête, quel que soit le chapitre demandé. La chaîne qui compose la Fillion coûtait ainsi 4,9 s pour un chapitre de la Genèse et 22,8 s pour le recensement de ses livres, quand le rôle `authenticated` coupe à 8 s : la couverture arrivait toujours en erreur, et le menu se refermait sur la Fillion — elle n’apparaissait jamais. Le remède n’est pas d’attendre plus longtemps, c’est de FIGER le résultat : 3 ms pour un chapitre, 7 ms pour un livre entier, 6 ms pour la couverture. ⚠️ Une vue matérialisée se périme : un livre qui rejoint le chantier n’entre au menu qu’après `public.rafraichir_polyglotte_fillion()`.\n\n⚠️ **LE MENU N’OFFRE PAS UN TEXTE QUI N’EXISTE PAS ENCORE.** Une bible de `versets_v2` reste toujours offerte, et une case vide s’y lit « absent de cette traduction ». Une édition en cours d’alignement, elle, n’est offerte que dans les livres qu’elle couvre RÉELLEMENT, lus de la base — ⛔ jamais une liste d’identifiants écrite dans la page, qui mentirait dès le livre suivant. Hors de ces livres, la colonne se VIDE sans oublier le choix : il revient de lui-même au retour dans un livre couvert.\n\n⛔ **LE CRAYON D’ÉDITION NE SE POSE PAS SUR UNE COLONNE QU’ON NE PEUT PAS ÉCRIRE.** Ces lignes sont recomposées : les corriger se fait dans les tables éditoriales, et un crayon offert ici écrirait ailleurs ou nulle part.\n\n**LE LATIN ET LE FRANÇAIS D’UNE MÊME ÉDITION SONT DEUX COLONNES.** La Fillion imprime la Vulgate en regard de sa traduction : ce sont deux textes, chacun sous SA langue dans le menu, et réunis au survol sous le nom de l’édition (§ 50.1, les familles). On peut donc les lire côte à côte — c’est même là tout l’intérêt d’une polyglotte."

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
const avant = data.valeur
if (avant.includes('### 50.5 Une colonne dont le texte')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('§ 50.5 inscrit dans parametres.charte_ia.')
