/**
 * § 15.5 : `visible_public` commande la notice publique d'une traduction, et la
 * rangée d'actions de l'administration s'aligne par largeurs réservées.
 * Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visible-public-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Un bouton offert et sans effet est une promesse fausse.'

const AJOUT = `

**La NOTICE publique d’une traduction s’allume et s’éteint depuis l’administration — \`visible_public\`.** La page publique montrait auparavant toute traduction portant un schéma de numérotation : un PROXY, qui dit que le texte est versifié, non qu’on souhaite en publier la notice. ⛔ Cette colonne ne commande QUE la notice : une traduction éteinte reste offerte dans tous les sélecteurs de lecture, et son texte se lit comme avant. Ce n’est pas \`est_privee\`, qui commande la RLS et réserve la TOL/AELF ; ce n’est pas non plus \`est_biblique\`, qui dit la nature de la ligne. Trois colonnes, trois questions distinctes, et l’on ne se sert jamais de l’une pour répondre à l’autre.

⚠️ **La rangée d’actions d’une ligne s’aligne par LARGEURS RÉSERVÉES, non par le hasard des libellés.** Trois défauts s’y logeaient. Les messages d’état — « Envoi… », « ✓ Image ajoutée », « ✓ Téléchargé » — s’écrivaient ENTRE les boutons et les poussaient de côté dès qu’ils paraissaient : l’état s’écrit désormais DANS le bouton qui l’a déclenché. L’identifiant et l’étiquette de nature, de largeur variable — trente signes contre six —, ouvraient la rangée et la décalaient d’une ligne à l’autre : ce qui DIT la ligne se range avec son nom, ce qui AGIT se range à droite. Et un bouton dont le libellé change — « + Bandeau » puis « ✓ Bandeau », « Modifier » puis « Fermer » — ne doit pas changer de largeur pour autant. Les boutons se lisent enfin par familles, séparées d’un blanc plus large que le pas interne : les IMAGES de la notice, le TEXTE de la traduction, la FICHE elle-même.`

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
if (avant.includes('visible_public')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
