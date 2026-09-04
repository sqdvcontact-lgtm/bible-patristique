/**
 * § 38.3, rectification du soir : l'échelle en cases, le gris rendu au texte, la
 * date seule sous le nom d'une colonne, et l'anneau posé en dedans.
 *
 * Cinq demandes de l'auteur du 4 septembre 2026, en seconde passe sur la page
 * « Bible polyglotte ». Trois d'entre elles REPRENNENT la passe du matin : on y
 * avait chaque fois retiré un ornement de trop.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * ⚠️ Le texte s'insère APRÈS le § 38.3 et AVANT le § 38.4, à sa place.
 * Usage : node scripts/charte-polyglotte-rectification-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'RECTIFICATION DU MÊME JOUR, AU SOIR'

// Ancre : la dernière phrase du § 38.3, recopiée de `parametres.charte_ia`. Le
// § 38.4 la suit désormais ; le texte neuf se glisse entre les deux.
const ANCRE = 'Avant de retirer un état visible, mesurer celui qui est censé le remplacer.'

const SECTION = `

⛔ **${MARQUE} : trois de ces règles se reprennent, et toutes pour la même raison** — on avait chaque fois retiré un ornement DE TROP. ⚠️ Règle générale, qui vaut au delà de cette page : **retirer un ornement n'est pas gratuit ; il faut regarder ce qui reste**. Cinq pilules valaient mieux qu'un rang de mots, un aplat gris valait mieux qu'un ocre mais moins que rien, et une glose descendue d'une ligne vaut moins que pas de glose. La bonne mesure ne se trouve pas en enlevant tant qu'on peut.

⚠️ **L'ÉCHELLE SE COMPOSE EN CASES, sur toute la largeur du volet** (« pas de points médians moches ; plutôt de jolies cases propres sur l'ensemble de la largeur »). Cinq valeurs en clair séparées par le point médian ne se lisaient plus comme un réglage : elles se lisaient comme une ligne de texte, et rien ne disait qu'on pouvait les toucher. ⛔ Ce n'est PAS le retour des pilules, et la différence est celle d'un objet et de cinq : une pilule est un objet PAR VALEUR — cinq cadres, cinq fonds, cinq rayons —, quand un contrôle segmenté n'a qu'UN cadre et qu'UN rayon pour toutes ses cases, qui n'existent que par le filet qui les sépare. Il occupe la mesure du volet, et l'on voit d'un coup d'œil combien de valeurs il offre et laquelle est retenue. ⚠️ Les interrupteurs INDÉPENDANTS gardent leur colonne et leur clair : ils ne forment pas une échelle, et une case autour de « Lignes problématiques » en referait un bouton.

⛔ **UNE COLONNE DÉJÀ PRISE SE GRISE PAR SON TEXTE, ET PAR RIEN D'AUTRE** (« ne griser que le texte ; pas de fond gris »). L'ocre était faux — c'est la teinte de l'attente —, et le fond doux qui l'avait remplacé l'était aussi : une liste ne se lit plus quand un rang sur deux y porte son propre sol. Le fait se dit dans l'ENCRE du nom et de sa date ; le fond du menu reste d'une seule teinte, où l'accent ne désigne que la ligne retenue.

⛔ **SOUS LE NOM D'UNE COLONNE, IL N'Y A QUE LA DATE** (« “Texte du manuscrit” : ne pas l'indiquer ; seulement indiquer une date »). L'état du texte prenait d'abord la place du millésime ; on l'avait fait descendre d'une ligne dessous, en glose — il n'y est plus du tout. Un en-tête de colonne NOMME et DATE, et une troisième ligne y faisait un second repère. ⚠️ L'état du texte se lit LÀ OÙ L'ON CHOISIT, dans le volet de la famille : c'est le menu qui distingue, l'en-tête qui nomme. ⛔ Conséquence assumée : deux états d'un même témoin ouverts côte à côte portent le même en-tête.

⚠️ **UN BLOC TEINTÉ A BESOIN D'AIR DANS SA CASE.** La cellule d'en-tête n'avait aucun rembourrage vertical — mesuré, le bouton faisait soixante-neuf pixels dans une cellule de soixante-neuf —, si bien que le fond du survol et du menu ouvert courait d'un filet à l'autre et venait toucher la réglure. Un fond qui touche le bord de sa case cesse de se lire comme un ÉTAT : il se lit comme une colonne d'une autre couleur.

⛔ **UN ANNEAU DE FOYER SE POSE DEDANS DÈS QUE LE CHAMP EST SON PROPRE BLOC** (« l'encadrement vert dépasse, mord du texte, ou du texte passe dessus »). L'anneau global du site se pose à un pixel À L'EXTÉRIEUR de la boîte, ce qui convient à un champ posé DANS un bloc rembourré. Le champ de recherche des volets EST son bloc depuis qu'il en occupe toute la mesure — mesuré, 319 sur 45 dans un bloc de 319 sur 46 — et l'anneau tombait donc par-dessus le filet du bas, par-dessus le bloc voisin en haut, et sortait du volet sur les deux côtés, où il se faisait couper. Un décalage NÉGATIF le rend au champ. ⛔ On ne le retire pas : c'est le seul repère du clavier, et un champ sans filet ni fond au repos n'a rien d'autre à montrer. ⚠️ **Règle générale : quand un objet cesse d'être posé DANS un bloc pour DEVENIR le bloc, tout ce qui se dessinait autour de lui se relit.** Le rembourrage, le filet, l'ombre et l'anneau ne visaient pas la même boîte.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_rectification_polyglotte'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
