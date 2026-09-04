/**
 * § 38.11 : le chapitre vient de l'ossature, et la colonne se charge seule.
 *
 * Huit points de l'auteur du 4 septembre 2026, sur la Bible polyglotte.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-chapitres-ossature-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.11 Le CHAPITRE vient de l’ossature'

// Ancre : la dernière phrase du § 38.10, recopiée de `parametres.charte_ia`.
const ANCRE = 'celui d’une page d’œuvre les a reçus avec sa tranche de texte et ne montre qu’un fondu.'

const SECTION = `

${MARQUE}, et la COLONNE se charge seule

Huit points de l’auteur du 4 septembre 2026, sur la Bible polyglotte.

⛔ **LE NOMBRE DE CHAPITRES VIENT DE L’OSSATURE, jamais d’une table écrite à la main** (« le Siracide ne contient qu’un chapitre ; c’est normal ? »). Elle ne portait que les soixante-six livres protocanoniques, et tout deutérocanonique y retombait sur UN chapitre : le Siracide en a cinquante et un, la Sagesse dix-neuf, les deux livres des Maccabées seize et quinze, Tobie quatorze, Judith seize, Baruch six — quelque vingt-deux mille versets que le volet n’offrait pas d’ouvrir, sur les DEUX pages de lecture. ⚠️ Et elle avait déjà DÉRIVÉ sur ce qu’elle prétendait couvrir : Joël y valait trois chapitres pour quatre, Daniel quatorze pour douze. Elle existait en TROIS exemplaires. C’est la règle déjà payée sur les natures de segment et sur le sommaire d’une œuvre, prise par un troisième bout : **une liste recopiée finit toujours par coûter du texte au lecteur.**

⛔ **UN LIVRE QU’ON NE PEUT PAS OUVRIR NE SE LISTE PAS** (« j’ai un Esther (grec) qui s’affiche dans le sommaire : ça doit disparaître »). Le tableau se compose sur les créneaux canoniques : un livre que l’ossature ne porte pas s’ouvre donc sur une page vide, et l’offrir est un cul-de-sac. ⚠️ La règle vaut pour tous, non pour celui qu’on a nommé : la Lettre de Jérémie et les douze écrits non canoniques encore à charger s’en vont avec lui, et leur rubrique disparaît faute d’entrées. ⛔ Le raisonnement d’avant — « ce sont de vraies œuvres à charger, gardons-leur leur place » — est abandonné : une promesse qui ne s’ouvre pas se lit comme une panne.

⛔ **CHANGER UNE COLONNE NE RECHARGE PAS LA TABLE** (« quand je change de traduction sur une colonne, il ne faut pas tout recharger ; seulement le texte de cette colonne »). L’attente était GLOBALE : elle voilait le tableau entier et rejouait le passage, quand les autres colonnes n’avaient pas bougé et que leur texte était déjà en mémoire. Mêmes livres et même chapitre : la table ne bouge plus, et seule la colonne neuve dit qu’elle arrive. ⚠️ Elle le DIT, au lieu de se donner pour absente : « Absent de cette traduction » sur une colonne qui charge est un mensonge d’une seconde, et c’est celui que le lecteur retient.

⛔ **UNE MARQUE D’ATTENTE SE CENTRE SUR LA PART VISIBLE DE SON BLOC**, et cette part ne commence pas toujours sous la barre de navigation : la Polyglotte pose au-dessus de son tableau un en-tête collant de soixante-douze pixels, sous lequel rien ne se lit. Mesuré sur la page servie, l’anneau tombait trente-six pixels à côté du centre. ⚠️ La LARGEUR n’a jamais demandé de réglage : le voile couvre son bloc, et l’anneau s’y centre. ⚠️ Et le bloc garde la hauteur du tableau tant que rien n’est chargé, sans quoi l’anneau se centrerait dans une bande de douze rem posée en haut d’un écran vide.

⚠️ **Les marges d’une colonne s’ouvrent, l’interligne se resserre** (« augmenter légèrement les marges, y compris pour le numéro de référence non canonique » ; « resserrer très très légèrement l’interligne »). Gouttière de dix à treize pixels, blanc de sept-huit à huit-neuf, interligne de 1,36 à 1,34. ⛔ Et le numéro d’origine reprend trois pixels contre la réglure, qu’il TOUCHAIT : sa marge négative valait exactement la gouttière. Les trois mesures sont nommées une fois et se répondent — elles s’étaient déjà désaccordées.

⛔ **UN CURSEUR QUI PROMET UNE EXPLICATION DOIT EN AVOIR UNE** (« au survol de "Absent de cette traduction" j’ai un curseur avec un point d’interrogation, mais aucun texte ne s’affiche ; ça n’a donc aucun sens »). L’infobulle disait « cette traduction ne porte pas ce verset », c’est-à-dire la mention elle-même en d’autres mots. La mention se suffit : c’est ce pour quoi elle a été écrite, et le curseur s’en va. ⚠️ Là où l’infobulle dit vraiment quelque chose de plus — pourquoi une case deutérocanonique est vide —, les deux restent.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_chapitres_ossature'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
