/**
 * § 38.9 : l'ouverture en domino, le clic qui choisit, et les blancs de la
 * justification.
 *
 * Quatre demandes de l'auteur du 4 septembre 2026, sur la Polyglotte.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-domino-et-blancs-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.9 Le DOMINO de l’ouverture'

// Ancre : la dernière phrase du § 38.8, recopiée de `parametres.charte_ia`.
const ANCRE = 'une suite de versets se réunit déjà, et par une tout autre règle — elle garde ses bornes, et une élision y ferait disparaître un verset sans le dire.'

const SECTION = `

${MARQUE}, et les BLANCS de la justification

Quatre demandes de l’auteur du 4 septembre 2026, sur la Polyglotte.

⚠️ **À L’OUVERTURE, LE TEXTE TOMBE EN DOMINO** — colonne par colonne, de gauche à droite (« peut-on imaginer que le texte s’affiche progressivement, colonne par colonne, pour donner un effet de domino ? ça peut être joli, mais il faut que ce soit rapide »). C’est le dispositif d’arrivée déjà en place, dont le rang se prend sur la COLONNE au lieu de la hauteur. ⚠️ Le pas DOUBLE : cinq colonnes au pas ordinaire se joueraient en cent vingt millisecondes, et la chute ne se verrait pas. ⛔ Et cela À L’OUVERTURE SEULEMENT : la même chute jouée à chaque chapitre tourné cesserait d’être un accueil pour devenir une attente ; les arrivées suivantes gardent la chute ligne par ligne, qui suit la lecture.

⛔ **UN CLIC QUI NE FAIT RIEN DE PLUS QUE LE SURVOL EST UN CLIC PERDU** (« quand je clique sur le nom d’une traduction qui a un menu déroulant secondaire, ne pas bloquer le clic : afficher la première traduction du menu déroulant »). Cliquer une édition à plusieurs textes ne faisait que déployer le volet, que le survol déployait déjà. Le clic choisit désormais le PREMIER texte, celui que le volet met en tête, et le volet reste ouvert pour en prendre un autre. ⚠️ Le clavier suit le clic : Entrée et Espace choisissent, la flèche déploie — un clavier qui n’aurait plus que le déploiement n’atteindrait jamais le premier texte.

⛔ **LE FLOTTANT QUI OUVRE UN VERSET NE PREND PAS SUR LE TEXTE** (« affiner encore la densité du texte, les césures, renvois, pour éviter les blancs ignobles et contre-natures entre mots »). Mesuré sur la page servie : la lettrine de référence valait 28,8 pixels et sa marge 8, soit 12 % de la mesure — et sur soixante-sept blancs de plus de trois espaces, SOIXANTE étaient sur la ligne qu’elle rétrécit. ⚠️ **La cause d’un blanc ignoble n’est presque jamais la césure : c’est une ligne trop courte.** Une marge gauche négative range le flottant dans le rembourrage de la cellule, qui perd d’autant : le texte retrouve sa mesure pleine dès la première ligne, et le repère reste où l’œil le cherche.

⛔ **ET UNE ESPACE ÉTROITE AGGRAVE LA JUSTIFICATION AU LIEU DE LA SERVIR.** La justification ajoute le MÊME blanc absolu quelle que soit l’espace de départ : resserrer l’espace naturelle ne resserre donc que les lignes déjà justes, et rend l’écart plus criant partout ailleurs. ⚠️ C’est le contraire de ce qu’on croit en la resserrant pour gagner en densité. Mesuré : l’espace remontée d’un demi-cran, le plus grand blanc d’une page passe de 7,5 à 5,6 fois l’espace naturelle, et les blancs de plus du double tombent d’un quart. ⛔ La densité n’y perd rien, le flottant rendu au texte raccourcissant la page d’autant.

⚠️ **Ce qui a été mesuré et ÉCARTÉ, pour n’y pas revenir.** « text-wrap: pretty » fait PIRE sur du texte justifié — le plus grand blanc y triple. Un plafond de césure plus permissif (« hyphenate-limit-chars ») ne change rien du tout. Et une césure française posée à la main sur les mots longs ne gagne presque rien : le dictionnaire du navigateur fait déjà le travail — sans lui, les blancs de plus du double augmentent de moitié —, et ce qui reste est fait de NOMS PROPRES, qu’aucune règle ne coupe sans risque. ⛔ Un blanc résiduel dans une colonne étroite n’est pas un défaut de réglage : c’est le prix d’une colonne étroite justifiée, et l’on ne le paie pas en inventant des coupures.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_domino_et_blancs'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
