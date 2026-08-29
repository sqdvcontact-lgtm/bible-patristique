/**
 * §§ 7.5 et 7.6 : LE CATALOGUE DES STYLES, et la règle pour en créer un.
 *
 * Demande de l'auteur du 29 août 2026 : « Indique l'utilité de chaque style, etc., le
 * fonctionnement du système, dans la charte ; explique qu'on peut créer de nouveaux
 * styles en cas de nécessité extrême ou quand je le demande ; et il faut toujours
 * expliquer dans la charte la fonction des styles nouveaux. »
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-catalogue-styles-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 8. Notes structurées et références présentes dans le texte'

const AJOUT = `### 7.5. Le CATALOGUE des styles — ce que chacun sert

Les deux vocabulaires, style par style, avec ce qu'il sert et ce qu'il ne sert pas.
Les chiffres sont ceux du 29 août 2026 ; ils disent l'emploi réel, non une permission.

#### 7.5.1. Les natures d'un segment patristique — \`segments.nature\`

| Nature | Ce qu'elle sert | ⛔ Ce qu'elle n'est pas | Segments |
|---|---|---|---|
| \`texte\` | la prose de l'auteur : le cas ordinaire, et le défaut | un fourre-tout — 93 % du corpus, mais un lemme ou une citation structurelle méritent leur nom | 88 811 |
| \`vers\` | une ligne de poésie, une par segment | ⛔ pas \`verset\` : un vers est une ligne de MÈTRE, un verset une unité de l'Écriture | 2 325 |
| \`apparat_critique\` | l'apparat de l'ÉDITEUR — variantes, collation | il a sa PROPRE vue dans la page, il n'est pas dans le corps | 1 295 |
| \`citation\` | une citation structurelle, dont le rendu RECOLLE les segments | ⛔ pas une citation en ligne : celle-là reste dans \`texte\` et se détache d'elle-même au delà de 400 signes | 1 221 |
| \`dialogue\` | une réplique, dans un texte qui en compte | ⛔ ne se sort jamais du fil : une réplique est entre guillemets sans être une citation d'auteur | 1 038 |
| \`apparat_editeur\` | préface du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l'œuvre | l'apparat de l'auteur, qui appartient au corps | 323 |
| \`apparat_auteur\` | prologue, avertissement, dédicace écrits par L'AUTEUR | ⛔ pas \`apparat_critique\` : celui-ci appartient au CORPS et se lit à sa place | 96 |
| \`lemme\` | le verset biblique qu'un commentaire pose en tête du paragraphe qu'il commente | ⛔ ne se détache pas : un lemme se lit au fil du texte (décision du 20 août 2026) | 68 |
| \`rubrique\` | une rubrique éditoriale qui n'est PAS un niveau de titre | un titre : elle ne prend ni balise \`h*\` ni place au plan | 43 |
| \`introduction\` | un préambule appartenant au texte | 37 |
| \`verset\` | un verset d'une citation que l'ÉDITION pose verset par verset | ⛔ pas toute citation biblique : c'est la coupure IMPRIMÉE qui le fonde | 12 |
| \`texte absent\` | une lacune du témoin | 1 |
| \`signature\` | approbations, censeurs, souscripteurs : au fer à droite, interligne resserré | 0 |
| \`separateur\` | ⛔ **ÉTEINTE.** Conservée pour d'anciens exports ; ne plus en créer. | 0 |

⚠️ Un second axe dit la FORME et non la fonction : \`segment_metadata.forme = 'vers'\`
(§ 7.4). Il est le seul moyen de déclarer un vers là où la nature est déjà prise —
dans l'apparat.

#### 7.5.2. Les styles du paratexte biblique — \`metadata.semantic_style\`

**Les titres.** Un code par rang : le rang EST leur identité, et il se lit dans leur nom.

| Style | Ce qu'il sert | Blocs |
|---|---|---|
| \`titre_livre\` (T1) | le titre du livre — ⛔ **jamais rendu** : la page le porte dans ses métadonnées | 0 |
| \`titre_partie_livre\` (T2) | « PREMIÈRE PARTIE » | 30 |
| \`titre_section_livre\` (T3) | « Section II », « Le Divin Prélude » | 68 |
| \`titre_sous_section\` (T4) | « 1° La personne de l'auteur » | 248 |
| \`titre_chapitre_livre\` (T5, axe **matériel**) | la mention imprimée « CHAPITRE IX » — ⛔ **jamais affichée**, la navigation nomme déjà le chapitre ; elle reste comme témoin | 117 |
| \`titre_paragraphe_livre\` (T5, axe **analytique**) | la division « § » du commentaire | 34 |
| \`titre_pericope\` (T6) | « 3. Ce qui suivit la mort de Jésus » | 880 |

**Les informations.** Une NATURE ; le rang se déclare à part, en \`I1\` à \`I6\`.

| Style | Ce qu'il sert | ⛔ Ce qu'il n'est pas | Blocs |
|---|---|---|---|
| \`commentaire\` | l'explication suivie, le style le plus employé. Aux rangs I4-I6, son repère devient une MANCHETTE flottante | 3 091 |
| \`introduction_titree\` | une introduction qui porte son PROPRE titre — le rang de ce titre se DÉCLARE, il ne se déduit pas | ⛔ pas un titre : c'est un bloc d'information dont l'intitulé est un titre | 270 |
| \`introduction\` | une introduction dont l'intitulé n'est qu'un repère. Aux rangs I1-I2 elle compose en PRÉAMBULE, centrée et rentrée ; plus bas elle appartient au fil | 156 |
| \`notice\` | l'appoint documentaire, rendu dans un APARTÉ, à côté du fil et jamais dedans. Sa matière se qualifie par \`notice_subtype\` | ⛔ pas un commentaire : celui-ci reste dans le fil | 42 |
| \`note_verset\` | une note de bas de page — ⛔ **pas un bloc de corps** (\`placement: footnote_only\`) | 0 |

**Les axes qui accompagnent un style, sans en être un :** le RANG (\`semantic_level\`),
le RÔLE d'affichage (\`display_role\` — aujourd'hui \`sous_titre\`, qui prend le rang du
titre auquel il s'accroche), la FORME du paragraphe (\`form: prose | verse\`), et le
sous-type d'une notice.

### 7.6. Créer un style neuf

⛔ **On ne crée pas un style parce qu'un cas PARAÎT nouveau.** On en crée un en
NÉCESSITÉ EXTRÊME, ou quand l'auteur le demande. C'est une règle de prudence chèrement
apprise : le registre du paratexte biblique a compté jusqu'à **48 styles pour 13 faits**,
et quatre de ses natures ne se distinguaient par **rien de visible** — un centième d'em,
une italique, ou rien du tout.

**Les trois questions à se poser AVANT, dans cet ordre.**

1. ⛔ **Un style existant ne compose-t-il pas déjà cela ?** Si la réponse est oui, le
   style neuf ne servirait qu'à nommer une nuance que le lecteur ne verra pas.
2. ⛔ **Un AXE ne dirait-il pas la différence sans un nom de plus ?** Le rang, la forme,
   le rôle d'affichage, le sous-type, la place. C'est presque toujours la bonne réponse :
   la portée est un axe, la position en est un, la matière en est un. Un nom qui les
   incorpore fabrique un produit croisé, et un produit croisé dérive.
3. **La différence se VOIT-elle à la lecture ?** Un style qui ne change pas la
   composition n'est pas un style : c'est une note d'atelier, et sa place est ailleurs.

**Si les trois réponses imposent quand même un style neuf, l'ordre est le suivant.**

1. ⛔ **La CHARTE d'abord**, et c'est la règle que l'auteur a fixée le 29 août 2026 :
   **tout style nouveau s'explique ici AVANT d'entrer dans la donnée.** On y écrit sa
   fonction, quand l'employer, ⛔ quand NE PAS l'employer, et comment il compose. Un
   style qui entre dans la donnée sans être expliqué est un style que personne ne saura
   employer dans six mois — et deux personnes l'emploieront alors de deux façons.
2. Le REGISTRE : \`work/fillion/semantic_display_hierarchy.json\` pour le paratexte
   biblique, \`app/lib/naturesSegments.ts\` et \`chk_segments_nature\` pour les segments.
3. Le SEMIS en base (\`scripts/fillion/semer-styles-semantiques.mjs\`), jamais un INSERT
   à la main : deux vocabulaires qui divergent valent moins qu'un seul.
4. La COMPOSITION, en un seul endroit par famille, et la GARDE qui l'éprouve.
5. L'ÉPREUVE sur la planche \`/admin/styles\`, pour qu'on le VOIE à côté de ses voisins.

⚠️ **Et l'inverse est vrai : un style qui ne sert plus se retire.** Quatre natures
d'information ont été fondues le 29 août 2026 parce qu'aucune ne portait un seul bloc
et qu'aucune ne composait autrement. ⛔ Une grille complète n'est pas une vertu : celle
du paratexte biblique comptait 23 styles jamais employés, et c'est elle qui a permis à
deux tomes de nommer différemment la même chose.

`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes('### 7.5. Le CATALOGUE des styles')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes('### 7.5. Le CATALOGUE des styles')) throw new Error('relecture : le texte neuf est absent.')
if (!relu.valeur.includes('### 7.6. Créer un style neuf')) throw new Error('relecture : le § 7.6 est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
