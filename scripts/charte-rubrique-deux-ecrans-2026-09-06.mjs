/**
 * § 18 : une rubrique de menu se présente de la même façon sur les deux écrans.
 * Demande de l'auteur du 6 septembre 2026 sur « Aller plus loin ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-rubrique-deux-ecrans-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UNE RUBRIQUE SE PRÉSENTE DE LA MÊME FAÇON SUR LES DEUX ÉCRANS'

const ANCRE = '**Les menus d’une même barre ne font qu’une seule forme.** Même cadre, même ombre, même intertitre, même chevron sur l’onglet qui les porte ; seule la LARGEUR varie, parce que le contenu la commande. ⛔ Et une seule mécanique : deux menus voisins gouvernés l’un par une règle `:hover` de la feuille de styles, l’autre par un état de composant, finissent toujours par diverger. La barre de navigation en portait quatre ainsi partagés, dont l’un avait son propre cadre, son propre délai de fermeture, et six pixels de vide entre l’onglet et sa boîte, que le curseur devait franchir sans les voir.'

const TEXTE = [
  ANCRE,
  '',
  '⛔ **UNE RUBRIQUE SE PRÉSENTE DE LA MÊME FAÇON SUR LES DEUX ÉCRANS** (demande de l’auteur, 6 septembre 2026 : « présenter chaque rubrique un peu mieux, avec un petit pictogramme, un petit texte »). Un menu qui GLOSE ses entrées — un pictogramme, le nom de la page, une ligne qui dit ce qu’on y trouve — doit les gloser partout où il les montre. « Aller plus loin » les glosait sur le bureau depuis le 30 août 2026 ; le panneau du téléphone, qui reprend les mêmes pages, n’en gardait que le pictogramme : six mots alignés, sans un indice de ce qu’ils ouvrent. Or c’est là que le lecteur en a le plus besoin, n’ayant ni survol ni place pour tâtonner. ⚠️ Et c’est la MÊME phrase des deux côtés : deux formulations d’une même rubrique divergeraient au premier ajustement.',
  '',
  '⚠️ **Une liste dont rien ne s’aligne se lit mal, et la mesure du menu s’y règle.** Six rubriques dont deux gloses s’enroulaient et une troisième laissait un mot seul sur sa ligne faisaient trois hauteurs de rangée pour un seul objet. La boîte se borne donc à la largeur que demande la plus longue de ses gloses, mesurée à la chasse réelle. ⛔ C’est un MAXIMUM, non une largeur posée : elle rendra la place le jour où les gloses raccourciront, et l’on ne fige pas une mesure qui survivrait au texte qui l’a exigée.',
  '',
  '⚠️ **Le nom d’une rubrique se lève d’un RANG, jamais d’une graisse.** C’est lui qu’on vient chercher, et deux pixels et un gris le séparaient seuls de la glose qui l’explique. La graisse, elle, est déjà prise : elle sert à lever une entrée parmi ses sœurs, dans le menu voisin, et un signal employé à deux choses ne distingue plus rien.',
  '',
  '⛔ **Un pictogramme de menu se mesure en REM, jamais en pixels.** La police racine du site est fluide, et un dessin posé en pixels rapetissait à mesure que le nom qu’il accompagne grandissait. ⚠️ Réglé sur la LIGNE de ce nom, il se cale sur elle de lui-même, et le décalage écrit à la main qui l’y posait n’a plus lieu d’être.',
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

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_rubrique_deux_ecrans'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
