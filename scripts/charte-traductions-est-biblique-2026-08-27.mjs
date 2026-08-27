/**
 * § 15.5 : `traductions` tient deux natures de ligne, et `est_biblique` les
 * sépare. Relevé de l'auteur du 27 août 2026 : quatre traductions patristiques
 * paraissaient dans un menu de traduction biblique.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-traductions-est-biblique-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Toute opération conserve exactement la couverture matérielle, l’ordre des unités, les empreintes des couches source et les invariants de séquence.'

const AJOUT = `

### 15.5 Une table, deux natures — \`traductions.est_biblique\`

La table \`traductions\` tient deux choses. Les traductions de la BIBLE, qui portent un texte versifié et se choisissent dans les menus de lecture. Et la notice bibliographique de la traduction employée pour une œuvre PATRISTIQUE — Jeannin pour Jean Chrysostome, Barreau et Charpentier pour la Cité de Dieu, Guillon pour Cyprien, Claude de Seyssel pour Eusèbe —, à laquelle renvoient \`oeuvres.trad_id\` et \`oeuvre_textes.id_traduction\`.

⛔ Rien ne les distinguait, et les secondes paraissaient dans les sélecteurs de traduction biblique — jusque dans le menu de la page d’une œuvre patristique, qui offrait de lire ses citations bibliques dans la traduction même dont elle affiche le texte. La colonne \`est_biblique\` le dit désormais, et c’est elle, et elle seule, que filtre tout sélecteur de traduction.

⚠️ Deux discriminants en tenaient lieu, et aucun ne disait ce QU’EST la ligne. \`schema_numerotation\` dit si le TEXTE est monté, non ce qu’il est ; la page publique des traductions filtre dessus à bon droit, mais pour une autre question. La FORME de l’identifiant — un numéro pour les bibliques, un intitulé parlant pour les autres — aurait cédé au premier identifiant dérogeant. ⛔ Et \`type_objet\` ne répond pas davantage : il dit la nature philologique de l’objet — traduction, recension, édition critique —, non le corpus auquel il appartient.

⛔ Ces lignes ne se SUPPRIMENT pas. Elles sont référencées : vingt œuvres pour la seule traduction Jeannin de Jean Chrysostome. Un invariant interdit désormais la ligne incohérente plutôt que de la surveiller — une traduction non biblique ne peut pas porter de schéma de numérotation, puisqu’un schéma décrit une versification et qu’il n’y en a pas hors de la Bible.`

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
if (avant.includes('est_biblique')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
