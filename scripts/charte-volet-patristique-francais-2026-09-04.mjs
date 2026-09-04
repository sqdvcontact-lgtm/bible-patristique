/**
 * § 38.8 : le volet patristique se lit en français, d'un trait, et la gouttière
 * d'un verset ne porte pas le nom de son livre.
 *
 * Cinq demandes de l'auteur du 4 septembre 2026, au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-volet-patristique-francais-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.8 Le volet patristique se lit EN FRANÇAIS'

// Ancre : la dernière phrase du § 38.7, recopiée de `parametres.charte_ia`.
const ANCRE = 'un code retenu de longue date peut avoir disparu du canon offert, et la page doit ouvrir tout de même.'

const SECTION = `

${MARQUE}, et d’un trait

Cinq demandes de l’auteur du 4 septembre 2026, au soir.

⚠️ **LE FRANÇAIS OUVRE TOUTE LECTURE EN REGARD** (« sur le Français – Ancien français : le français doit toujours être à gauche »). La règle valait pour Fillion depuis le 20 août ; elle vaut pour toute famille éditoriale. ⛔ C’est une DONNÉE — l’ordre des membres —, jamais une constante du code, et les deux ordres étant sous contrainte d’unicité, l’échange passe par un rang temporaire.

⛔ **LA GOUTTIÈRE D’UN VERSET NE PORTE QUE SA RÉFÉRENCE** (« je trouve “ACT 1,22” comme référence biblique : c’est une erreur ; on indique seulement “1, 22”, avec l’espace et sans le nom abrégé du livre »). La page dit déjà quel livre on lit, en titre et dans le volet. ⚠️ Le code venait d’un REPLI, non d’une donnée voulue : la référence seule vit dans une métadonnée que 28 656 segments portent, et les 18 197 autres retombaient sur le LIBELLÉ humain du segment, qui porte son livre. On corrige à l’affichage ; la donnée reste ce qu’elle est.

⚠️ **UN EXTRAIT PATRISTIQUE COMMENCE PAR UNE CAPITALE**, à l’affichage seul (« toute référence patristique citée dans le volet de droite doit comporter une majuscule en début de phrase »). Un extrait commence là où le lien le prend, c’est-à-dire souvent au milieu d’une phrase de l’édition, et il se lit alors comme une phrase amputée. ⛔ La capitalisation ne change JAMAIS la longueur du texte : les appels de note s’y posent par offset.

⛔ **ON NE SERT PAS DU LATIN À QUI VIENT LIRE LES PÈRES EN FRANÇAIS** (« dans le volet de droite, toujours afficher une traduction française, la plus récente »). Un lien biblique désigne parfois un texte en langue originale — 2 468 segments liés sur 39 823, six œuvres, toutes pourvues d’un français public et d’un alignement qui l’y relie. ⛔ Re-pointer les liens serait le remède le plus simple et le plus faux : le lien a été établi sur le LATIN. La correspondance se fait à l’affichage, par les tables d’alignement, qui sont faites pour cela.

⛔ **ET LA CARDINALITÉ DU GROUPE DÉCIDE, car on n’invente aucune correspondance.** L’alignement est au PARAGRAPHE et rarement un pour un : mesuré, La Cité de Dieu compte 1 039 groupes dont 802 aux effectifs inégaux, 4,8 latins pour 6,0 français en moyenne et 22 au plus. À effectifs ÉGAUX, le nième latin répond au nième français et la contrepartie est un seul paragraphe ; à effectifs INÉGAUX, on rend TOUT l’empan français du groupe. ⚠️ Choisir le premier, ou le nième « à peu près », donnerait un passage que le lien ne désigne pas : une erreur de philologie présentée comme une citation, ce qui est pire qu’un latin qu’on ne lit pas. ⚠️ Le prix est visible et assumé : un empan inégal peut faire une occurrence de plusieurs milliers de signes là où les autres en font trois cents.

⚠️ **LES CITATIONS D’UNE MÊME ŒUVRE SE RÉUNISSENT, L’ÉLISION MARQUÉE D’UN « […] »** (« regrouper les citations d’une même œuvre patristique — seulement, non biblique — comme c’est déjà le cas pour les segments qui se suivent ; il faut remplacer l’élision par un « […] » et que l’élision soit de taille raisonnable, disons au maximum 500 caractères »). ⛔ **On ne réunit que ce qu’on peut MESURER** : un écart se juge en signes élidés, non en nombre de segments — une édition en découpe un en dix, une autre en fait un seul —, il faut donc connaître le texte élidé, c’est-à-dire l’avoir lu. Un écart dont un seul segment manque à l’appel ne se réunit pas : un « […] » qui cacherait une quantité inconnue ne dit rien au lecteur.

⛔ **ET L’ON NE RÉUNIT QUE DANS UN MÊME TEXTE, non dans une même œuvre.** Une œuvre en porte plusieurs — La Cité de Dieu son latin et son français, tous deux liés à des versets — et leurs numéros de segment se recouvrent : le regroupement collait un paragraphe latin à un paragraphe français dès que leurs numéros se suivaient, et le défaut était là depuis l’origine du regroupement. ⚠️ Rien de tout cela ne concerne les VERSETS bibliques : une suite de versets se réunit déjà, et par une tout autre règle — elle garde ses bornes, et une élision y ferait disparaître un verset sans le dire.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_volet_patristique_francais'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
