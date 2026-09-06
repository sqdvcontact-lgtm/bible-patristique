/**
 * § 18, correctif du même jour : ce qui gouverne la largeur d'un menu déroulant est sa
 * borne BASSE, et non la haute. La règle posée quelques heures plus tôt décrivait ce
 * qu'on avait voulu, non ce que la cascade fait : la mesure sur le site l'a démenti.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-largeur-menu-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'La borne BASSE d’un menu gouverne sa largeur'

const ANCRE = '⚠️ **Une liste dont rien ne s’aligne se lit mal, et la mesure du menu s’y règle.** Six rubriques dont deux gloses s’enroulaient et une troisième laissait un mot seul sur sa ligne faisaient trois hauteurs de rangée pour un seul objet. La boîte se borne donc à la largeur que demande la plus longue de ses gloses, mesurée à la chasse réelle. ⛔ C’est un MAXIMUM, non une largeur posée : elle rendra la place le jour où les gloses raccourciront, et l’on ne fige pas une mesure qui survivrait au texte qui l’a exigée.'

const TEXTE = [
  '⚠️ **Une liste dont rien ne s’aligne se lit mal, et c’est la GLOSE qu’on reprend, non la boîte qu’on élargit.** Six rubriques dont deux gloses s’enroulaient et une troisième laissait un mot seul sur sa ligne faisaient trois hauteurs de rangée pour un seul objet. La largeur du menu se mesure donc une fois, sur la plus longue de ses gloses et à la chasse réelle ; toute glose s’écrit ensuite pour y tenir. ⛔ Une phrase trop longue est une phrase à reprendre : la reprendre vaut mieux qu’un menu qui s’étire pour elle, et l’une des six passait de moitié la mesure de ses sœurs.',
  '',
  '⛔ **La borne BASSE d’un menu gouverne sa largeur, jamais la haute.** Un menu déroulant est posé en absolu sous son onglet, et c’est l’ONGLET qui lui sert de bloc conteneur : large d’une centaine de pixels, il borne la largeur idéale que la boîte calculerait sur son contenu, laquelle retombe alors sur le minimum déclaré. ⚠️ Une glose qui s’enroule ne se corrige donc pas en relevant le maximum — essayé le 6 septembre 2026, la boîte n’a pas bougé d’un pixel, et il a fallu la mesurer sur le site pour le voir. Le maximum ne sert qu’à borner un menu dont l’onglet serait large.',
  '',
  '⚠️ **Une mesure de menu se vérifie aux DEUX BOUTS de l’échelle typographique.** Le texte se mesure en rem et suit la police racine ; le chrome qui l’entoure — les bords, les rembourrages, l’écart, le pictogramme — est en pixels et ne la suit pas. Il pèse donc près d’un rem de plus sur un petit écran que sur un grand, et une largeur juste à la racine 22 peut faire s’enrouler la même glose à la racine 16.',
].join('\n')

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
if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue.')
const apres = avant.split(ANCRE).join(TEXTE)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_largeur_menu'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.includes('La boîte se borne donc à la largeur que demande la plus longue')) throw new Error('relecture : la règle d’avant subsiste.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
