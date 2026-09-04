/**
 * § 38.3 : la Bible polyglotte — un réglage n'est pas un bouton, une colonne prise se
 * grise, le menu se range par millésime, et le titre d'une colonne porte sa date.
 *
 * Sept demandes de l'auteur du 4 septembre 2026, sur le volet et sur les en-têtes de
 * colonne de la page « Bible polyglotte ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-polyglotte-reglages-entetes-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.3 La Bible polyglotte'

// Ancre : la dernière phrase du § 38.2, recopiée de `parametres.charte_ia`.
const ANCRE = 'Une référence qu’on DÉDUIT de ce qu’on affiche déjà ne se montre pas. ⚠️ L’en-tête vidé ne laissait qu’une bande de trente-huit pixels et son filet : il ne paraît plus que s’il a quelque chose à porter — une référence reçue, ou la flèche de repli.'

const SECTION = `

${MARQUE} — le réglage, le menu, l’en-tête de colonne

Sept demandes de l’auteur du 4 septembre 2026.

⛔ **UN RÉGLAGE DE VOLET NE SE COMPOSE PAS EN BOUTONS** (« remettre en forme de façon plus élégante, sans effet “bouton” »). « Traductions visibles » alignait cinq pilules bordées et arrondies pour un réglage qu’on touche une fois par visite : cinq cadres, cinq fonds, cinq rayons, dans un volet où la liste des livres n’en porte aucun. Les valeurs se lisent en clair ; la retenue prend l’accent et la demi-graisse, les autres l’encre douce, et le survol ne fonce que ce qui n’est pas retenu. ⛔ Ni cadre, ni fond, ni rayon.

⚠️ **UNE ÉCHELLE se lit en RANG, des interrupteurs INDÉPENDANTS se lisent en COLONNE.** « Auto · 2 · 3 · 4 · 5 » est une échelle de cinq valeurs courtes dont on ne retient qu’une : le rang la donne d’un coup d’œil, et le point médian est le séparateur du site. « Lignes problématiques » et « Surnuméraires » sont deux états qu’on allume ou qu’on éteint, et longs : une option par ligne, comme le volet de la page Bible (§ 38.2). La même forme discrète sert les deux, seule la disposition change.

⛔ **UNE TRADUCTION DÉJÀ AFFICHÉE AILLEURS SE GRISE, elle ne s’annonce pas en OCRE** (« grise légèrement le bloc de l’œuvre déjà utilisée ; n’utilise pas d’ocre pour le texte qui signale ça »). L’ocre est la teinte de l’ATTENTE — « à normaliser », « brouillon » — et une colonne déjà prise n’est ni l’un ni l’autre : c’est un fait, non un défaut. Le bloc prend le fond doux, le nom l’encre grise, la mention d’échange l’encre faible ; le choix reste offert, et les deux colonnes s’échangent alors leur place. ⛔ Une FAMILLE ne se grise pas quand un seul de ses textes est affiché ailleurs : les autres restent libres, et la griser dirait le contraire. Le gris se pose sur les MEMBRES, dans leur volet.

**LE MENU SE RANGE PAR MILLÉSIME**, groupe de langue par groupe de langue, une famille prenant le millésime de son membre principal. ⛔ **On range sur la date QU’ON MONTRE, jamais sur une autre** : la première parution d’une traduction et le millésime de l’édition servie ne coïncident presque jamais — Sacy paraît de 1667 à 1696 et l’on sert l’édition de 1730, la Vulgate clémentine est de 1592 et l’on sert Madrid 1946 —, si bien qu’un menu rangé sur la première et affichant la seconde donnerait à lire 1946, 1730, 1912 dans cet ordre : il passerait pour cassé. ⛔ Une entrée SANS millésime se range à la FIN, jamais au début : on ne devine pas une date, et une date manquante ne vaut pas zéro. Le rang de la base départage deux entrées de même millésime.

**LES NOMS SE COMPOSENT**, dans le menu comme en tête de colonne : « Bible française du XIIIe siècle » y prend ses petites capitales et son exposant, un titre entre astérisques son italique. C’est le module partagé avec les notices d’auteur. ⛔ Jamais un rendu HTML sur une colonne rédigée hors du dépôt. ⚠️ La rubrique d’un volet de famille en est exemptée : elle se compose en capitales espacées, où des petites capitales seraient plus petites que ce qui les entoure.

⛔ **SOUS LE TITRE D’UNE COLONNE, C’EST LA DATE, et rien d’autre ne prend sa place** (« c’est indiqué “Texte du manuscrit” et non une date ; c’est problématique »). L’état du texte s’y substituait dès que l’édition en porte plusieurs, si bien que la Bible du XIIIe siècle était la seule colonne du tableau sans millésime — celle, précisément, dont la date importe le plus. ⚠️ L’état du texte reste NÉCESSAIRE, deux colonnes d’une même édition ne se distinguant pas autrement : il descend d’une ligne, sous la date, dans une encre plus pâle et sans la chasse du millésime — c’est une glose, pas un second repère. La date se rapproche par ailleurs du titre : elle en était écartée de huit pixels, elle l’est de trois.

⚠️ **Le « vers » ACCOLÉ au millésime part avec lui.** La notice du manuscrit Français 899 écrit « Paris, XIIIe siècle (vers 1260) » : rendre « 1260 » tout court donnerait à un témoin daté par approximation la précision d’un colophon. ⛔ Ce n’est pas une lecture de la prose : on ne prend que le qualificatif que la source a écrit devant le millésime. La dérivation et l’ordre vivent dans un module pur, éprouvé sur les dix notices réelles du corpus — lire une date dans de la prose est la partie fragile du dispositif, et elle ne s’éprouve pas depuis une page.

⛔ **PAS DE FILET AUTOUR DU TITRE quand le menu s’ouvre.** Un cadre d’un pixel posé sur un en-tête de colonne redessine une boîte là où la page n’en porte aucune, et il paraissait au CLIC de souris — une règle « focus-within » sur un bouton sans enfant focalisable n’est qu’un « focus ». Le menu ouvert garde le sol du survol : la colonne reste désignée, sans qu’un trait s’ajoute à la réglure du tableau. ⚠️ Le clavier garde son anneau, qui est la règle « focus-visible » globale du site : elle pose un contour, non un cadre intérieur.

⚠️ **ET LE SURVOL DE CE TITRE NE S’APPLIQUAIT PAS**, ce qu’aucune lecture du code ne disait. Le bouton portait son fond dans son style EN LIGNE, et une déclaration en ligne bat toujours une règle de feuille sans « important » : la règle de survol était morte depuis qu’elle avait été écrite, et l’anneau de foyer restait le seul état visible de la colonne — c’est-à-dire précisément ce que l’auteur a relevé comme malvenu. Retirer l’anneau sans voir cela aurait laissé l’en-tête sans aucun état. ⛔ **Le piège du style en ligne ne borne pas les seules média-queries : il bloque TOUTE règle de feuille sur la même propriété.** Avant de retirer un état visible, mesurer celui qui est censé le remplacer.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_polyglotte'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
