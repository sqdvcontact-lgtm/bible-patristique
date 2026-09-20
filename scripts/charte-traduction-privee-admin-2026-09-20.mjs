/**
 * § 50.6 : une traduction privée ne sort que pour l’administrateur.
 * Posé le 20 septembre 2026 : « il faut réserver l’AELF à mon compte admin ».
 *
 * ⛔ N’écrit QUE dans `parametres.charte_ia` ; le miroir se régénère par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 * Usage : node scripts/charte-traduction-privee-admin-2026-09-20.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = "**LE LATIN ET LE FRANÇAIS D’UNE MÊME ÉDITION SONT DEUX COLONNES.** La Fillion imprime la Vulgate en regard de sa traduction : ce sont deux textes, chacun sous SA langue dans le menu, et réunis au survol sous le nom de l’édition (§ 50.1, les familles). On peut donc les lire côte à côte — c’est même là tout l’intérêt d’une polyglotte."

const AJOUT = "\n\n### 50.6 Une traduction PRIVÉE ne sort que pour l’administrateur\n\nDemande de l’auteur du 20 septembre 2026 : « il faut réserver l’AELF à mon compte admin ».\n\nLa traduction officielle liturgique (TR0012) est sous droits : elle sert à l’atelier, à l’alignement et à la relecture, et elle ne se montre à personne d’autre. `traductions.est_privee` porte cette décision, et la RLS de `versets_v2` l’applique fidèlement.\n\n⛔ **UNE VUE `SECURITY DEFINER` DÉFAIT LA RLS EN SILENCE.** Une vue sans `security_invoker` lit avec les droits de son PROPRIÉTAIRE : la politique de la table ne s’applique plus, et tout ce qu’elle rend est offert à qui a le droit de la lire, elle. Le 20 septembre 2026, `v_aelf_polyglotte_cells` servait ainsi le texte AELF à n’importe quel compte connecté — 31 versets pour la seule Genèse 1 — alors que la table le protégeait correctement. Et la fuite se propageait par dépendance, sans que rien ne le dise : `v_aelf_bible_lecture` en tirait ses colonnes `TR0012`, `v_aelf_bible_books_by_translation` les 74 livres de la traduction et leurs comptes.\n\n⚠️ **LA GARDE SE POSE OÙ LA FUITE NAÎT, PAS SUR CHAQUE SURFACE.** Une seule vue nourrissait les trois : la garde y est posée une fois, et les deux autres se referment d’elles-mêmes. ⛔ Et le critère n’est JAMAIS une liste d’identifiants : c’est celui de la RLS, `not est_privee or is_admin()` — rendre un texte public ou privé se décide dans `traductions`, et la garde suit. ⚠️ `is_admin()` est VOLATILE : posée dans la clause d’une vue, elle serait évaluée ligne à ligne ; un sous-select non corrélé la réduit à un calcul unique. Et une vue qui CACHE des lignes se pose en `security_barrier`.\n\n⚠️ **UNE VUE MATÉRIALISÉE NE PORTE NI RLS NI GARDE DYNAMIQUE** : ce qu’on y range est lisible par quiconque la lit. Sa garde se pose donc au RAFRAÎCHISSEMENT, et elle échoue du bon côté — une traduction qui passe en privée sort de la table au refresh suivant, administrateur compris, qui la relit alors par les tables d’origine. C’est la règle de `v_polyglotte_fillion` (§ 50.5).\n\n⛔ **ET LA LECTURE SEULEMENT.** Une vue ne se donne pas en `arwd` au rôle du lecteur : sur une vue automatiquement modifiable, c’est une porte d’écriture dans les tables du dessous. `revoke all`, puis `grant select`.\n\n⚠️ **CELA SE VÉRIFIE EN POUSSANT SUR LA PORTE, pas en relisant la définition.** Le contrôle `supabase/controles/20260920085349_aelf_reserve_a_ladministrateur_controles.sql` prend le rôle du lecteur, puis celui de l’administrateur, et compte ce que chacun obtient ; il vérifie au passage qu’une traduction PUBLIQUE n’a pas été emportée par la garde. ⛔ Il se rejoue après toute reprise de la chaîne AELF : un `create or replace view` emporte la garde sans bruit, comme il emporte `security_invoker` (§ 51.4)."

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
if (avant.includes('### 50.6 Une traduction PRIV')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('§ 50.6 inscrit dans parametres.charte_ia.')
