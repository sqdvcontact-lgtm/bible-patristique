/**
 * § 38.9, rectification du soir : la lettrine revient au FER DU TEXTE, et un voile
 * d'attente couvre tout ce qui attend, en-tête compris.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-lettrine-au-fer-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'RECTIFICATION DU MÊME JOUR, ET ELLE PORTE SUR LES DEUX MOITIÉS'

// Ancre : la fin du paragraphe qui posait la règle de la gouttière, recopiée de
// `parametres.charte_ia`.
const ANCRE = 'le texte retrouve sa mesure pleine dès la première ligne, et le repère reste où l’œil le cherche.'

const SECTION = `

⛔ **${MARQUE} DE CETTE RÈGLE** (relevé de l’auteur le soir même : « la référence canonique dans la cellule de chaque verset, celle qui est grise, doit être alignée en marge gauche avec le texte contenu dans la même cellule »). Le flottant est rendu au **FER DU TEXTE**. Mesuré sur la page servie, la marge négative le posait à **−10,00 px** du fer, sur les quarante-huit cellules relevées et sans une exception : chaque verset ouvrait donc sur un repère en saillie, et le bord gauche de la colonne était ragué d’un bout à l’autre.

⛔ **ET LE GAIN N’EN ÉTAIT PAS UN**, mesuré avant et après sur la même page : le plus grand blanc passe de **5,47 à 4,86** espaces naturelles, le neuvième décile de 2,78 à 2,66, et les blancs de plus du triple de **147 à 123**. Rendre le fer au texte n’aggrave pas la justification, il l’améliore d’un cheveu. ⚠️ **Ce qui coûte à la justification est la LARGEUR d’un flottant, non sa POSITION** : la première ligne perd les mêmes pixels de mesure quel que soit le côté où on le range. C’est un RAISONNEMENT, non une mesure, qui avait conclu l’inverse le matin — *une règle tirée d’un raisonnement se vérifie avant d’être écrite, et celle-ci n’aura vécu qu’une matinée.*

⛔ **UN VOILE D’ATTENTE COUVRE TOUT CE QUI ATTEND, EN-TÊTE COMPRIS** (même relevé : « quand on charge un texte, le fond change légèrement de couleur ; c’est ok, mais il faut aussi qu’il change au niveau des en-têtes de colonne »). Il ne couvrait que le corps du tableau : la teinte s’arrêtait net sous le filet, et la bande qui porte le nom des éditions — c’est-à-dire ce qu’on vient précisément de changer — restait la seule chose qui ne bougeait pas. La page se donnait comme à moitié en attente.

⚠️ **C’EST LE BLOC POSITIONNÉ QUI DÉCIDE DE CE QU’UN VOILE COUVRE**, puisqu’un voile s’étend à son parent positionné et à rien d’autre. Le remonter d’un cran suffit, et le corps garde le sien, dont dépendent les cellules d’actions. ⚠️ Un en-tête COLLANT porte un rang d’empilement : le voile monte plus haut que lui et le recouvre donc, à l’arrêt comme au défilement — sans lui prendre ses événements de pointeur, car on doit pouvoir changer une colonne pendant qu’une autre charge. ⛔ Et l’ANNEAU ne bouge pas d’un pixel : il vit dans un enfant collant sous l’en-tête, dont la boîte est bornée par la hauteur restante, que le voile plus haut ne change pas.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_lettrine_au_fer'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
