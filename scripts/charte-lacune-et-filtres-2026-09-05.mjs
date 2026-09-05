/**
 * §§ 38.21 et 38.22 : la LACUNE du témoin garde ses crochets et les met en forme ;
 * le panneau de filtres de la bibliothèque met sa rubrique en marge, et un filtre
 * qui agit se montre.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-lacune-et-filtres-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '38.21 La LACUNE du témoin garde ses CROCHETS, et les met en forme'

// Ancre : la dernière phrase de la charte, recopiée de `parametres.charte_ia`.
const ANCRE = 'La décision 4 le prépare — on lit, on juge, on range — et la cible se posera quand le modèle saura la porter.'

const SECTION = `

### ${MARQUE}

Demande de l’auteur, 2026-09-05 : « les “lacunes” doivent être mises en forme : corps légèrement plus petit, léger espace avant et après les crochets, ocre ou maroquin ». Elles s’imprimaient BRUTES dans la traduction moderne de la Bible du XIIIᵉ siècle, où la donnée écrit « […] » quarante-six fois et « [lacune : motif] » neuf fois.

⛔ **Le manque se dit ENTRE CROCHETS**, dans les DEUX membres de l’édition. C’est le signe que la philologie donne depuis toujours à ce qu’un témoin a perdu, et c’est celui que la donnée écrit déjà ; les chevrons « ⟨ Lacune ⟩ » de la colonne du manuscrit y reviennent, de sorte que le même fait se dise du même signe des deux côtés d’une seule édition. Le motif exact — déchirure, fin du manuscrit — reste à l’infobulle, jamais à l’écran.

**La forme** : un cran sous le texte qui l’entoure (0,85 em), l’OCRE des absences, et un léger air de part et d’autre. ⚠️ **Cet air est une MARGE, non une espace du texte.** Une espace serait une occasion de couper la ligne entre le crochet et le mot qui le précède, et elle s’emporterait en copiant le verset ; la marque se garde d’ailleurs d’un seul tenant. ⚠️ La FINE insécable demeure, et pour son seul office : quand la lacune coupe un MOT (« por[…]er »), elle sépare la marque du fragment resté collé, sans l’attacher ni le détacher comme un mot entier.

⛔ **UNE TRADUCTION NON RECOMPOSÉE NE PASSE PAS PAR LE TOKENISEUR DU TÉMOIN.** Celui-ci tolère un crochet fermant orphelin, parce que la recomposition par créneau canonique coupe un marqueur en deux ; la traduction moderne, elle, porte QUATRE-VINGT-CINQ RESTITUTIONS entre crochets (« il [m’exauça] »), qui sont l’usage philologique et doivent s’imprimer telles quelles. Le tokeniseur y verrait autant de fermetures et griserait tout ce qui les précède. On ne reconnaît donc, dans un texte non recomposé, que la LACUNE, et par PAIRES COMPLÈTES.

⚠️ **Le crochet fermant d’une lacune nue n’est pas une fermeture orpheline**, et c’est le défaut que la mise en forme a fait paraître : un verset qui s’ouvre sur « […] » basculait TOUT ENTIER en lecture incertaine. Le début d’un verset se juge donc sur le premier TOKEN, jamais sur la première occurrence d’un crochet.

⚠️ **RESTE À TRANCHER, et c’est une affaire de DONNÉE.** Six cent cinquante-deux versets de cette traduction portent « [lecture incertaine : … ] » et s’impriment bruts, avec une douzaine d’étiquettes de plus que le vocabulaire du témoin ne connaît pas — « lecture difficile », « Fragment », « Suite incertaine », « Suite corrompue », « Restitution incertaine », « Passage altéré », « reprise ». Les rendre demande de savoir les distinguer d’une restitution, ce qui ne se devine pas ; et soixante versets y portent des crochets déséquilibrés, donc des marqueurs à cheval. ⛔ Rien n’a été fait de ce côté sans arbitrage.

### 38.22 Le panneau de FILTRES — la rubrique en marge, et un filtre qui agit se MONTRE

Demande de l’auteur, 2026-09-05 : revoir les filtres de la bibliothèque, en termes esthétiques et pratiques.

⛔ **UNE RUBRIQUE DE FACETTE SE POSE EN MARGE, ELLE NE COIFFE PAS SON RANG.** Les trois rubriques se posaient en bannière CENTRÉE au-dessus de leurs pastilles : trois titres empilés faisaient du panneau une page de titre à trois titres, et chacun coûtait une ligne entière pour un mot de neuf pixels. ⛔ Et les pastilles centrées n’offraient AUCUN BORD GAUCHE où l’œil revienne — cinq larges, deux étroites, sept larges, chaque rang ragué des deux côtés. La rubrique passe donc au fer à droite d’une colonne étroite, les pastilles au fer à gauche, et le panneau perd deux cinquièmes de sa hauteur sans rien retrancher.

⚠️ **Elle se pose sur la LIGNE DE BASE de la première pastille, jamais sur le milieu de sa boîte** : deux corps différents centrés l’un sur l’autre font flotter le plus petit au-dessus de la ligne de l’autre. C’est la grille qui l’aligne, sans un pixel écrit — la règle est déjà celle du lien de la carte de traduction (§ 38.5).

⛔ **UN FILTRE QUI AGIT SE MONTRE.** Refermer le panneau ne laissait qu’une pastille de compte sur le bouton : on savait qu’il agissait deux filtres, jamais LESQUELS, et « Effacer » devenait hors d’atteinte. Les filtres retenus se rappellent donc sous la barre de recherche, chacun retirable d’un clic. C’est la même règle qui garde déjà visible, dans le panneau, une facette active qui ne rendrait rien : *on ne cache jamais un filtre qui agit, sans quoi le lecteur ne sait plus pourquoi sa liste est courte.* ⚠️ Ce rappel ne se double pas du panneau OUVERT, qui montre déjà les mêmes pastilles à l’état actif.

⛔ **ET LE BOUTON CESSE DE COMPTER CE QUE LES JETONS NOMMENT** : « ❷ » se lisait à quarante pixels des deux jetons, soit deux comptes de la même chose sur une seule ligne, dont l’un ne dit pas lesquels. Ce que le bouton doit encore porter — qu’un filtre agit — son encre et son filet le disent.

**La page ne disait nulle part combien d’auteurs répondent** : seul le pied « Page 1 sur 3 » le laissait deviner, et le total ne se lisait qu’en tournant les pages jusqu’au bout. Une ligne discrète le dit dès qu’une recherche ou un filtre restreint la liste — « Trois auteurs sur quinze » —, et elle donne le total au passage. ⛔ Elle ne paraît PAS quand rien ne restreint : un compte qui ne bouge jamais n’est pas une information (§ 38.12).

⚠️ **« Tout effacer » se range sous la COLONNE DES PASTILLES**, non au bord du panneau : posé au fer à gauche sous trois rangs qui commencent cinq rem plus loin, il ne se rattachait à rien et faisait un objet de plus en bas d’écran.

⚠️ **La forme de la pastille s’écrit UNE fois** et sert les deux surfaces, celle où l’on choisit et celle où l’on retire : deux définitions d’un même objet divergent au premier réglage. Et son COMPTE se lit — il était deux rangs sous son libellé et à demi effacé, quand c’est lui qui dit qu’un filtre ne servira à rien avant qu’on l’essaie.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_lacune_et_filtres'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
