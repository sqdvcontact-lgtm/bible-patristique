/**
 * § 38.5 : le RAIL d'un volet replié — un seul dessin, et il nomme l'action.
 *
 * Demande de l'auteur du 4 septembre 2026 : « remettre en place le système
 * permettant de fermer un volet gauche ou droite (existe sur le volet gauche de la
 * Polyglotte ; reprendre le modèle) ; ajouter un titre clair sur la barre quand
 * elle est fermée ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-rail-des-volets-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.5 Le RAIL d’un volet replié'

// Ancre : la dernière phrase du § 38.4, recopiée de `parametres.charte_ia`.
const ANCRE = "La mesure vaut pour TOUTE la famille, l'apparat des bibles comme les listes des notices : il n'y a qu'une composition bibliographique sur le site."

const SECTION = `

${MARQUE} — un seul dessin, et il nomme l’action

Demande de l’auteur du 4 septembre 2026 : « remettre en place le système permettant de fermer un volet gauche ou droite ; ajouter un titre clair sur la barre quand elle est fermée ».

⚠️ **UN VOLET DE LECTURE SE FERME, ET CE QUI RESTE DE LUI EST UN RAIL** : une bande de trente pixels, un chevron en tête, et le nom de l’action écrit en hauteur, dans le sens d’un dos de livre français. Les deux volets de la page Bible — les livres à gauche, les commentaires à droite — et le volet de la Polyglotte le partagent. ⛔ Il y en avait TROIS, voisins et déjà divergents : celui de la Polyglotte portait le passage lu, celui des livres écrivait son nom de bas en haut, celui des Pères de haut en bas et deux crans plus petit. Un seul composant désormais. ⚠️ Le rail se FONCE au survol : une surface qui ne porte ni cadre ni fond propre n’a pas d’autre façon de dire qu’on peut la toucher.

⚠️ **LE RAIL NOMME L’ACTION, JAMAIS LE CONTENU.** « Commentaires » écrit sur une bande fermée décrit ce qu’on ne voit pas ; « Ouvrir les commentaires » dit ce qu’un clic fera, et c’est la seule chose qu’un rail ait à dire. ⚠️ Un repère peut s’y ajouter EN SECOND, dans le sérif de lecture et sans capitales : la Polyglotte y garde le passage ouvert, que le tableau ne nomme plus une fois le volet replié.

⛔ **UN RÉGLAGE DE DISPOSITION MOBILE NE DÉCIDE JAMAIS D’UN CONTRÔLE DE BUREAU**, et c’est la vraie leçon de cette reprise. Le système existait : les deux volets savaient se replier, rail compris. C’est la FLÈCHE qui les repliait qui avait disparu, gardée par une condition sur la présentation mobile — « en onglets ou en tiroir » — juste sur un téléphone, où les onglets font office de navigation, et sans objet sur un bureau. La page Bible passant « onglets » en toutes circonstances, le bureau perdait un contrôle pour une raison qui ne le regardait pas, et rien dans le rendu ne le montrait. **Une condition d’affichage nomme d’abord la surface qu’elle vise.**

⛔ **UN CONTRÔLE DE VOLET NE DÉPEND NI DE L’ONGLET QU’ON REGARDE, NI DE SA PLACE.** La flèche vivait dans la rangée du champ de recherche ; sous l’onglet « Sommaire » ce champ n’a pas d’objet — il cherche des LIVRES — et la rangée disparaissait avec lui, emportant le seul moyen de fermer le volet. Elle paraît désormais tant qu’elle porte la flèche, réduite alors au fer à droite. ⚠️ Et elle se pose EN TÊTE, sous les onglets : rendue après une liste qui prend toute la hauteur restante, elle tombait à deux mille pixels de l’endroit où elle se trouve sous l’autre onglet, et un contrôle qui change de bout d’écran ne s’apprend jamais.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_rail_volets'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
