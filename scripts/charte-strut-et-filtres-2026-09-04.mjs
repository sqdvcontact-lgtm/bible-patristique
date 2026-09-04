/**
 * § 38.14 : une référence emprunte le STRUT de son texte ; un filtre qui ne compte pas
 * ne sert à rien.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-strut-et-filtres-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.14 Une RÉFÉRENCE emprunte le strut de son texte'

// Ancre : la dernière phrase du § 38.13, recopiée de `parametres.charte_ia`.
const ANCRE = 'Mesuré : ΔE 25,8 de la carte, contre 8,8 pour l’ancien gris, qui s’y noyait.'

const SECTION = `

${MARQUE}, et un FILTRE qui ne compte pas ne sert à rien

⛔ **CE QUI ALIGNE UNE RÉFÉRENCE SUR SA LIGNE DE TEXTE, C'EST UN RAPPORT, NON UN NOMBRE** (relevé de l'auteur, 2026-09-04 : « aligner la référence en marge de gauche avec le texte »). Mesuré sur la Polyglotte servie : la référence canonique en marge ET le numéro d'origine en lettrine tombaient tous deux **2,40 px au-dessus** de la ligne de base du verset. La règle est qu'une référence EMPRUNTE le strut de la cellule qu'elle accompagne — même police, même corps, même interligne, même blanc du haut —, et que son numéro se compose en plus petit DANS cette boîte : un enfant en ligne plus petit se pose sur la ligne de base du strut sans la déplacer. Les deux écarts tombent à 0,00.

⚠️ **LA POLICE COMPTE AUTANT QUE LE CORPS.** L'ascendante d'une sans n'est pas celle d'une sérif : c'est ce qui restait de travers — huit dixièmes de pixel — quand le corps, l'interligne et le rembourrage s'accordaient déjà. Le strut se prend donc dans la police du TEXTE, et la police du numéro ne vit que sur l'enfant qui le porte.

⛔ **ET UN RÉGLAGE EN PIXELS NE PEUT PAS COMPENSER UNE DIFFÉRENCE MESURÉE EN REM.** L'ancien dispositif était un interligne absolu et un rembourrage calibrés une fois au navigateur, avec le tableau des écarts consigné en commentaire. Il n'était juste qu'à une SEULE taille de police racine — le site en a une fluide, de 16 à 22 — et il s'est déréglé le jour même où le blanc de la cellule est passé de 7 à 8 px et l'interligne de 1,36 à 1,34. ⚠️ Le commentaire disait pourtant « à remesurer si l'un des deux corps ou l'interligne change » : *une consigne de remesure est le signe qu'on a posé un nombre là où il fallait poser un rapport.*

⚠️ **UN BLANC DE LISTE SE MESURE DANS L'ENCRE, NON DANS LES BOÎTES** (relevé de l'auteur sur la Bibliothèque : « je devine un déséquilibre ; éloigner un peu la première ligne du titre, et rapprocher les lignes entre elles »). En marges, les trois écarts valaient un pixel et paraissaient égaux ; d'encre à encre, il y avait **4,0 px entre le titre et sa première édition et 8,7 px entre deux éditions** — les sœurs s'écartaient deux fois plus qu'elles ne s'écartaient de leur propre titre, et la liste ne se lisait pas comme un bloc. Les libellés étant plus petits que leur ligne, le demi-interligne ajoute près de deux pixels qu'un calcul en marges ne voit pas. ⛔ Le blanc d'après-titre et le blanc d'entre lignes sont donc DEUX mesures, non une.

⛔ **UN FILTRE DIT CE QU'IL AJOUTERAIT, ou il ne sert à rien.** Chaque pastille porte le nombre d'auteurs qu'elle rendrait, compté sur la recherche et tous les AUTRES filtres, jamais le sien : c'est ainsi qu'une facette dit ce qu'elle ajoute, et non ce qui reste une fois qu'elle a agi. ⚠️ Et une facette qui ne rendrait RIEN ne se montre pas — sauf si elle est active : *on ne cache jamais un filtre qui agit*, sans quoi le lecteur ne saurait plus pourquoi sa liste est courte. ⛔ La période, seule des trois facettes, ne se dérivait pas des données : ses cinq empans s'affichaient toujours, et l'on pouvait cliquer un siècle que la bibliothèque ne porte pas.

⛔ **ET UNE FACETTE N'A PAS BESOIN D'UNE COULEUR À ELLE.** Les trois axes portaient trois teintes — brun, bleu, vert —, ce qui faisait de la couleur une décoration : la rubrique au-dessus de chaque rang dit déjà de quel axe il s'agit. Le bleu était en outre la seule teinte froide de l'écran, hors de la bande du Cuir. ⚠️ Ce n'est pas contraire au § 38.13 : là, la couleur EST l'information — elle dit la série d'une œuvre, que rien d'autre ne dit ; ici, elle répétait une étiquette déjà écrite.

⚠️ **Les espaces fines : rien à faire, et c'est mesuré.** Le tableau porte bien l'insécable pleine chasse devant le deux-points et la fine insécable devant le point-virgule — relevé sur un chapitre servi : 21 U+00A0 et 18 U+202F —, et Source Serif les rend à leur juste chasse, 2,04 px contre 4,06 pour une espace ordinaire, soit 14,6 % du cadratin contre 29,1. Elles ne tombent donc ni à la lecture ni à l'affichage.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_strut_et_filtres'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
