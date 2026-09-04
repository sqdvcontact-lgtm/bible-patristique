/**
 * § 38.7 : une page de lecture s'ouvre sur un TEXTE, et elle s'y ouvre en fondu.
 *
 * Deux demandes de l'auteur du 4 septembre 2026, au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-ouverture-des-bibles-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.7 Une page de lecture s’ouvre sur un TEXTE'

// Ancre : la dernière phrase du § 38.6, recopiée de `parametres.charte_ia`.
const ANCRE = 'Chacun porte donc sa valeur en clair, et un renvoi vers l’autre : reteinter le carton sans reteinter les jetons ferait dire deux choses au même corpus.'

const SECTION = `

${MARQUE}, et elle s’y ouvre en fondu

Deux demandes de l’auteur du 4 septembre 2026 : « supprimer le dessin et afficher soit le dernier emplacement de lecture de l’utilisateur — il faut donc l’enregistrer — soit la Genèse » ; « à l’ouverture de la page, que ce soit en Polyglotte ou en Classique, faire un affichage plus doux que le texte qui apparaît brutalement ».

⛔ **UNE PAGE DE LECTURE NE S’OUVRE PAS SUR UN ÉCRAN D’ATTENTE.** La Polyglotte montrait la tour de Babel ruinée et l’invite « Ouvrez un livre » tant qu’aucun livre n’était choisi : une gravure pour tout contenu, et un geste à faire avant de lire quoi que ce soit. Elle s’ouvre désormais sur un texte, toujours — le dernier passage lu, à défaut celui de la Bible classique, à défaut la Genèse. ⚠️ La gravure ne disparaît pas du dépôt : elle passe en RÉSERVE, où l’inventaire des illustrations la garde avec son histoire.

⚠️ **LE LECTEUR N’A QU’UNE LECTURE EN COURS, MÊME S’IL LA MÈNE SUR DEUX PAGES.** La Polyglotte retient sa propre place, mais sa PREMIÈRE visite s’ouvre là où la Bible classique en était : ouvrir sur un livre choisi pour lui quand on sait où il lisait serait le renvoyer au commencement. La Genèse ne sert que le tout premier passage. ⛔ Et l’on ne retient JAMAIS « le livre entier » : c’est un geste explicite et coûteux — les Psaumes entiers sur quatre colonnes — et une ouverture de page doit être brève ; un livre entier laissé à la dernière visite rouvre à son premier chapitre.

⛔ **DEUX PAGES S’OUVRENT EN FONDU, ET PAS PAR LE MÊME CHEMIN : C’EST LA PROVENANCE DU TEXTE QUI DÉCIDE.** Le texte de la Bible classique est rendu par le SERVEUR, donc peint avant même que la page s’anime : son fondu se déclare dans le rendu — le HTML servi le porte — et joue dès la première peinture. ⚠️ Poser ce fondu après coup ferait DISPARAÎTRE un texte déjà lisible pour le ramener, c’est-à-dire pire que le défaut qu’on corrige. Le texte de la Polyglotte, lui, vient du NAVIGATEUR : rien n’est à l’écran avant lui, et c’est l’arrivée déjà en place qui se joue — la première n’avait simplement pas de départ pour l’appeler.

⚠️ **L’ouverture n’est pas ÉCHELONNÉE, à la différence d’une arrivée**, et ce n’est pas un choix de goût : le rang d’un bloc se mesure dans le navigateur, ce qui est trop tard pour une page dont le serveur a déjà peint le texte. La colonne entière paraît d’un seul fondu. ⛔ Et ce fondu ne porte QUE l’opacité, quand celui d’une arrivée translate de six pixels : une transformation ferait de la colonne le bloc conteneur des cellules d’actions posées en position fixe.

⚠️ **Une place retenue se relit dans UN SEUL module.** Les deux clés vivaient à la main dans les pages qui les écrivent et dans celles qui les lisent ; le cœur en est désormais pur et prouvé sans navigateur, et le contrôle du livre demandé se fait contre la liste RÉELLEMENT servie — un code retenu de longue date peut avoir disparu du canon offert, et la page doit ouvrir tout de même.`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_ouverture_des_bibles'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
