/**
 * § 13.11 : les QUATRE FAMILLES de natures d'un bloc de note, et ce que le code
 * en porte depuis le 5 septembre 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-familles-natures-note-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 13.11 Les QUATRE FAMILLES de natures'

// Ancre : la dernière phrase du § 13.10, recopiée de `parametres.charte_ia`.
const ANCRE = '⛔ Jamais un `insert` à la main qui poserait une nature que rien ne sait rendre.'

const SECTION = `


${MARQUE}, et ce qu'elles commandent

Les huit natures du § 13.10 ne forment pas une liste plate. Chacune appartient à une **FAMILLE**, qui dit ce que le bloc FAIT dans l'économie de la note — et c'est la famille, non la nature, qui commande la composition.

⚠️ **Pourquoi une famille plutôt que huit règles.** Une liste plate oblige à trancher huit fois, et rien n'y empêche deux natures voisines de recevoir deux compositions sans raison. La famille pose la règle une seule fois : **deux natures d'une même famille se composent de même, sauf raison NOMMÉE ; deux natures de familles différentes ne se composent jamais de même.** C'est en les rangeant qu'on a vu ce qui sépare réellement les deux renvois : non pas leur forme, qui est la même, mais leur DESTINATION.

| Famille | Ce que le bloc fait | Natures | Ce qu'elle commande à la composition |
|---|---|---|---|
| **ancrage** | ce à quoi la note TIENT | \`lemma\`, \`source_locator\` | discret, et en tête, sur la ligne du propos |
| **propos** | ce que la note DIT d'elle-même | \`commentary\` | la prose ordinaire, pleine mesure |
| **témoignage** | ce qu'elle RAPPORTE d'un tiers | \`quotation\`, \`translation\`, \`attribution\` | les marques de la citation : langue, retrait, filet |
| **renvoi** | ce vers quoi elle ENVOIE | \`reference\`, \`internal_cross_reference\` | la destination décide de la normalisation |

⛔ **L'ANCRAGE EN TÊTE NE FAIT PAS PARAGRAPHE.** Chez Faivre, « (V) pag. 178. — *Avec les démons les plus féroces* — On peut consulter… » tient sur **un seul paragraphe imprimé**. La passe 3 du protocole le fend en trois blocs, parce que ce sont trois fonctions ; mais fendre est une opération de STRUCTURE, et *une opération de structure ne doit pas se voir en lecture*. Les blocs d'ancrage qui OUVRENT une note se composent donc sur la ligne du propos, en repère discret, et non empilés au-dessus de lui. ⚠️ **En tête seulement** : un lemme qui reparaît au milieu d'une note y joue un autre rôle, et une note faite du seul ancrage se rend seule plutôt que de disparaître.

⛔ **DANS LA FAMILLE DU RENVOI, C'EST LA DESTINATION QUI COMMANDE.** Un renvoi vers le DEHORS (\`reference\`) se normalise : il a un auteur, un titre, un locus, et le site sait les composer. Un renvoi vers le DEDANS (\`internal_cross_reference\`) ne le peut pas — il n'a ni auteur ni titre — et le lui appliquer serait une CORRUPTION, non une maladresse : dans « Voyez la note I, p. 150 », le « I » est un numéro de note, que \`normaliserReferencesDansTexte\` convertirait en chapitre arabe. *Deux blocs de même apparence, deux traitements opposés : c'est la nature qui les départage, et rien d'autre ne le pouvait.*

⛔ **UNE NATURE INCONNUE NE FAIT PAS DISPARAÎTRE SON BLOC.** Le vocabulaire se lit avec indulgence : une valeur hors liste retombe sur \`commentary\` et le bloc reste LISIBLE, fût-ce sans sa composition propre. ⚠️ C'est le contraire du défaut payé quatre fois avec \`NATURES_CORPS\`, où le bloc s'évanouissait en silence. *Un vocabulaire en avance sur son rendu est un désagrément ; un texte qui manque à la page est une perte.*

### 13.11.1 Ce que le CODE porte depuis le 5 septembre 2026

⛔ **Le vocabulaire a une SOURCE UNIQUE, et elle est double par nécessité** : \`app/lib/naturesNote.ts\` et la contrainte \`texte_note_blocs_kind_check\`. Les deux se modifient ENSEMBLE, dans l'ordre du § 7.6 — la charte, la contrainte, le vocabulaire du code, la composition, l'épreuve à l'écran, et *seulement ensuite* on sème. Migration \`sql/20260905_natures_bloc_note.sql\`, retour arrière en regard.

⛔ **Le NUMÉRO AFFICHÉ se calcule à la lecture, jamais en base** (\`app/lib/numerotationNotes.ts\`) : \`note_number\` reste l'identité et l'ordre de lecture, dont dépendent 23 569 ancres, et \`texte_note_ancres.marker\` vaut exactement \`[[note_number]]\` — renuméroter en base, ce serait réécrire les deux et perdre l'ancrage.

⚠️ **La division d'une note ne se lit PAS dans \`texte_notes.book\`, qui la porte pourtant.** Mesuré le 5 septembre 2026 : sur les 23 729 notes du corpus, **8 580 (36 %, dans 39 textes sur 47) ont un \`book\` différent du \`ref_niv1\` du segment qu'elles ancrent** ; sur \`A0044O0003TFR-V11\`, les 1 830 notes diffèrent sans une seule exception. \`book\` est une métadonnée d'IMPORT ; la division est une propriété du texte SERVI. **C'est l'ancre qui fait foi**, et les 747 notes dont l'ancre ne porte aucun niveau 1 forment une série à part, comme les liminaires dans la numérotation des paragraphes.

⛔ **Le TYPE s'annonce dans l'en-tête de la fenêtre de note, et nulle part ailleurs** (\`app/lib/typeNote.ts\`) : « Note du traducteur 12 », « Apparat critique 7 ». ⚠️ **Il exige l'unanimité des blocs** : une note mixte — le commentaire de l'édition, puis le renvoi que NOUS ajoutons — n'annonce rien, car *mieux vaut « Note » qu'une attribution à demi fausse*. Le libellé nomme une RESPONSABILITÉ, jamais une position dans la page : « note de l'édition », et non « note de l'éditeur », que la maison d'édition et l'éditeur scientifique se disputent en français.

⛔ **L'ITALIQUE DE LA LANGUE ne porte que sur le bloc ENTIER**, celui dont \`language\` déclare la langue. Le latin ENCHÂSSÉ dans une note française — le cas le plus fréquent et le plus coûteux — n'est pas de ce ressort : aucune donnée ne dit où il commence, et le deviner au rendu italiserait du français. Il s'écrit par marqueur, dans le texte, à la passe 5.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_13_11'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
