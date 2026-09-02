/**
 * § 18 : la référence d'édition de la carte « Traduction » paraît entière ou pas
 * du tout, et la notice du traducteur quitte la carte.
 *
 * Décision de l'auteur du 2 septembre 2026 : « Ne pas tronquer le premier texte ;
 * n'afficher, d'ailleurs, que le premier texte ; limiter le nombre de caractères
 * affichés (ou même si ce paragraphe s'affiche) en fonction de la taille de
 * l'écran (déjà en place, mais demande à être optimisé). » Le premier texte est la
 * référence d'édition, le second la notice du traducteur.
 *
 * Deux paragraphes du 31 août sont remplacés : celui qui faisait entrer la notice
 * dans la carte, et celui qui faisait MONTER le nombre de lignes de la référence
 * avec le volet, ce qui la laissait coupée.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-reference-entiere-volet-2026-09-02.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**Un texte long paraît ENTIER ou pas du tout, et la carte n’en porte qu’un**'

const ANCRE_NOTICE = '⛔ **Un volet large en dit PLUS, et ce qu’il ajoute tient ENTIER** (décision de l’auteur, 31 août 2026 : « j’aimerais avoir plus de texte biographique sur grand écran, et aucun sur petit écran »). La carte de la traduction découvre ses textes l’un après l’autre à mesure que le volet s’élargit : le libellé entier du lien, puis la référence de l’édition, puis la notice du traducteur, jusque-là réservée à la fiche « En savoir plus ». ⚠️ Le seuil de chacun se MESURE, il ne se choisit pas : on compte les signes du texte le plus long, on compte ce qu’une ligne en porte à cette largeur, et le seuil est celui au-dessous duquel le texte serait coupé. Les neuf notices comptent de cent six à deux cent trente signes ; les deux plus longues tiennent en six lignes dès deux cent cinquante pixels de volet, et c’est de là qu’elles paraissent. ⛔ Rien ne se RETRANCHE en chemin : l’état de départ est celui du volet le plus étroit, et tout le reste s’y ajoute.'

const ANCRE_LIGNES = '⚠️ **Un texte qu’aucune largeur ne porte entier ne se traite pas ainsi : c’est son NOMBRE DE LIGNES qui monte.** La référence d’édition compte de cent soixante à trois cent cinquante signes ; elle paraît sur deux lignes à deux cent soixante pixels, trois à trois cents, quatre à trois cent cinquante, et quatre lignes de trois cent cinquante pixels rendent enfin sept références sur neuf entières. Le premier seuil dit où elle cesse de ne rien dire ; ceux qui suivent disent où elle redevient une phrase.'

const REMPLACEMENT_NOTICE = `⛔ **Un volet large en dit PLUS, et ce qu’il ajoute tient ENTIER** (décision de l’auteur, 31 août 2026 : « j’aimerais avoir plus de texte biographique sur grand écran, et aucun sur petit écran »). La carte de la traduction découvre ce qu’elle porte à mesure que le volet s’élargit, et le seuil de chaque texte se MESURE, il ne se choisit pas : on compte les signes du texte, on compte ce qu’une ligne en porte à cette largeur, et le texte ne paraît qu’au-dessus de la largeur où il tiendrait coupé. ⛔ Rien ne se RETRANCHE en chemin : l’état de départ est celui du volet le plus étroit, et tout le reste s’y ajoute.`

const REMPLACEMENT_LIGNES = `⛔ ${MARQUE} (décision de l’auteur, 2 septembre 2026 : « ne pas tronquer le premier texte ; n’afficher, d’ailleurs, que le premier texte ; limiter le nombre de caractères affichés, ou même si ce paragraphe s’affiche, en fonction de la taille de l’écran »). Le 31 août, la référence d’édition paraissait sur un nombre de lignes qui MONTAIT avec le volet — deux, trois, quatre —, et les plus longues restaient coupées à toute largeur ; la notice du traducteur, elle, était entrée dans la carte au-dessus de deux cent soixante pixels. ⚠️ La règle est désormais une seule : la feuille accorde à la référence un BUDGET de lignes qui monte avec le volet (cinq dès deux cent soixante pixels, sept à trois cents, huit à trois cent cinquante), la carte compose la référence dans une sonde invisible à la largeur du volet et compte ses lignes, et la référence paraît ENTIÈRE si elle tient dans le budget, PAS DU TOUT sinon — jamais rognée par un \`line-clamp\`. Une requête de conteneur ne sait pas compter les signes d’un texte : la mesure est en JavaScript (\`EncartTraduction\`), la politique reste dans la feuille (\`--volet-ref-lignes\`), et ajouter une bible n’oblige à rien. ⚠️ Le budget plafonne à huit lignes, parce que la liste des livres vit dessous : élargir encore le volet ne rend rien de plus. ⛔ La notice du traducteur a quitté la carte le même jour : elle vit dans la fiche « En savoir plus », d’où elle venait, et la carte ne porte plus qu’un texte long. *La leçon rejoint celle du 28 août : une référence tronquée n’est pas une référence courte, c’est une phrase cassée ; et quand un texte ne tient pas, on le retire, on ne le coupe pas.*`

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

for (const [nom, ancre] of [['notice', ANCRE_NOTICE], ['lignes', ANCRE_LIGNES]]) {
  const n = avant.split(ancre).length - 1
  if (n !== 1) throw new Error(`ancre ${nom} : ${n} occurrence(s), 1 attendue.`)
}
const apres = avant.split(ANCRE_NOTICE).join(REMPLACEMENT_NOTICE).split(ANCRE_LIGNES).join(REMPLACEMENT_LIGNES)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260902_avant_reference_entiere_volet'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
