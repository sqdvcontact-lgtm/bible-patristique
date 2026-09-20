/**
 * Charte : la GRILLE DES TITRES (§ 35.28), la MANCHETTE à trois états (§ 35.29),
 * et deux contradictions préexistantes résolues.
 *
 * 1. § 48 — la ponctuation haute des headings prescrivait U+202F avant `:`, contre
 *    les §§ 3.2 et 35.0, et contre la matrice de clôture du même § 48.
 * 2. § 35 — quatre passages imposaient la casse imprimée DANS L'AFFICHAGE en citant
 *    le § 3.5, lequel dit exactement l'inverse depuis qu'il porte la double couche.
 *    Le § 3.5 prévaut, comme il l'énonce lui-même.
 * 3. §§ 35.28 et 35.29 — la grille et la manchette, posées dans l'unique norme et
 *    non dans un protocole concurrent.
 * 4. § 48.4 — les deux contrôles correspondants.
 *
 * ⛔ Le script refuse d'écrire si un motif ne se trouve pas exactement une fois dans
 * CHACUN des deux exemplaires. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-grille-titres-2026-09-20.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 48 — U+00A0 avant le deux-points',
    avant: '**Ponctuation haute des headings.** Dans une projection éditoriale française, l’espace précédant `;`, `:`, `!` et `?` est l’espace fine insécable U+202F lorsque la charte générale prévoit une espace. Le postcontrôle recherche explicitement U+0020 et U+00A0 avant ces signes, dans tous les headings du périmètre déjà traité et pas seulement dans les objets écrits pendant le lot. ⛔ **La forme source demeure inchangée.**',
    apres: '**Ponctuation haute des headings.** Dans une projection éditoriale française, l’espace précédant `;`, `!` et `?` est la fine insécable U+202F, et celle qui précède `:` est l’insécable pleine chasse U+00A0. ⛔ **Les deux ne s’échangent pas**, et cette règle est celle des §§ 3.2 et 35.0 : un heading n’a pas de typographie à lui. Le postcontrôle recherche donc U+0020 avant les quatre signes, U+202F avant `:` et U+00A0 avant `;`, `!` et `?`, dans tous les headings du périmètre déjà traité et pas seulement dans les objets écrits pendant le lot. ⚠️ Ce paragraphe a prescrit U+202F avant `:` jusqu’au 20 septembre 2026, contre la matrice de clôture du présent chapitre, qui écrivait déjà la bonne règle. ⛔ **La forme source demeure inchangée.**',
  },
  {
    nom: '§ 35 — casse : le § 3.5 prévaut (synthèse, point 4)',
    avant: '**4. Casse, titres et petites capitales.** Dans Fillion comme ailleurs, un titre qui transcrit un heading imprimé conserve exactement la casse du témoin conformément au § 3.5 ; `facsimile_heading`, `source_markup` ou une provenance équivalente servent à la preuve, non à autoriser une autre casse dans la lecture. Seuls les titres réellement composés par Corpus Scriptura suivent la casse française. Aucun titre biblique n’est composé en petites capitales. Les petites capitales de la source appliquées aux noms d’auteurs sont conservées en provenance mais ne sont pas reproduites dans la forme normalisée : les noms d’auteurs restent en romain. Les autres petites capitales sémantiques restent soumises à leurs règles propres et ne doivent jamais être simulées par une transformation de casse.',
    apres: '**4. Casse, titres et petites capitales.** ⛔ **LE § 3.5 PRÉVAUT, ET IL IMPOSE DEUX COUCHES** : la forme diplomatique exacte — casse comprise — est conservée dans `facsimile_heading`, `source_markup` ou une provenance équivalente, et la forme RENDUE au lecteur reçoit la casse française. On conserve donc parfaitement le témoin, et l’on ne sert pas nécessairement au lecteur ses longues capitales de composition. ⚠️ Ce point a dit l’inverse jusqu’au 20 septembre 2026, en citant le § 3.5 pour ce que le § 3.5 refuse ; la contradiction est close dans ce sens. ⛔ **L’application aux données Fillion déjà saisies est une MISSION à part** : rien ne se normalise par ricochet, et un heading dont la forme source n’est pas encore recopiée en provenance ne se réécrit pas. Aucun titre biblique n’est composé en petites capitales. Les petites capitales de la source appliquées aux noms d’auteurs sont conservées en provenance mais ne sont pas reproduites dans la forme normalisée : les noms d’auteurs restent en romain. Les autres petites capitales sémantiques restent soumises à leurs règles propres et ne doivent jamais être simulées par une transformation de casse.',
  },
  {
    nom: '§ 35.5.1 — têtes liminaires',
    avant: 'Dans la couche éditoriale Fillion, les têtes liminaires qui transcrivent le nom du livre ou une mention d’introduction conservent la casse imprimée : `ÉVANGILE SELON SAINT LUC` reste `ÉVANGILE SELON SAINT LUC` ; `INTRODUCTION` reste `INTRODUCTION`. Une variante en casse française n’est admise que pour un libellé distinct composé par Corpus Scriptura et ne remplace jamais le heading source.',
    apres: 'Dans la couche SOURCE, les têtes liminaires qui transcrivent le nom du livre ou une mention d’introduction conservent exactement la casse imprimée : `ÉVANGILE SELON SAINT LUC` reste `ÉVANGILE SELON SAINT LUC` ; `INTRODUCTION` reste `INTRODUCTION`. ⛔ La couche de LECTURE, elle, porte la casse française (§ 3.5) : « Évangile selon saint Luc », « Introduction ». La forme imprimée demeure dans `facsimile_heading` ou une provenance équivalente, et elle ne s’efface jamais pour améliorer le rendu.',
  },
  {
    nom: '§ 35 — désignations structurelles de section',
    avant: 'Les désignations structurelles de section qui transcrivent un titre imprimé conservent sa formulation, sa casse et sa ponctuation : `SECTION I. — LES DEUX ANNONCIATIONS` reste `SECTION I. — LES DEUX ANNONCIATIONS`. Le repère (`Section I`, etc.) peut être analysé séparément pour la hiérarchie, mais cette analyse ne réécrit pas le titre source. Une formulation normalisée n’est possible que comme objet éditorial distinct et explicitement qualifié.',
    apres: 'Les désignations structurelles de section conservent la FORMULATION et la PONCTUATION du titre imprimé ; seule la casse suit le § 3.5 : `SECTION I. — LES DEUX ANNONCIATIONS` se lit « Section I. — Les deux Annonciations » et se conserve tel quel en provenance. ⛔ Ce qui ne se réécrit jamais est le MOT : ni l’ordre, ni le repère, ni la ponctuation ne s’ajustent au goût du jour. Le repère (`Section I`, etc.) peut être analysé séparément pour la hiérarchie, mais cette analyse ne réécrit pas le titre source.',
  },
  {
    nom: '§ 35 — la composition ne repose plus sur la capitale imprimée',
    avant: 'La casse imprimée par Fillion se rend donc telle qu’elle est écrite, et les rangs se séparent autrement : le corps d’abord, puis la POSE — les rangs hauts centrés en romain, la péricope au fer en ITALIQUE. ⚠️ L’italique fait ici le travail que faisait la capitale : elle distingue sans peser, et un titre de péricope ne doit pas peser plus que ce qu’il annonce. Les rubriques suivent, et leur chasse tombe de moitié : une chasse large n’a de sens que sous des capitales.',
    apres: 'Les rangs se séparent donc SANS la capitale : le corps d’abord, puis la POSE — les rangs hauts centrés en romain, la péricope au fer en ITALIQUE. ⚠️ L’italique fait ici le travail que faisait la capitale : elle distingue sans peser, et un titre de péricope ne doit pas peser plus que ce qu’il annonce. Les rubriques suivent, et leur chasse tombe de moitié : une chasse large n’a de sens que sous des capitales. ⛔ C’est ce qui rend la casse française du § 3.5 sans conséquence sur la hiérarchie : aucun rang de cette grille ne se lit à ses majuscules.',
  },
  {
    nom: '§ 48.4 — les contrôles de la grille',
    avant: '- aucun faux `verse_note` ne compense un commentaire mal classé ;\n- aucune validation humaine n’est créée automatiquement.',
    apres: '- aucun faux `verse_note` ne compense un commentaire mal classé ;\n- la grille des titres ne porte ni déclaration de rang irrecevable, ni inversion, ni rang plat (§ 35.28) — `scripts/fillion/controle-grille-titres.mts` ;\n- les fratries hétérogènes et les sauts de rang sont RELEVÉS et tranchés livre par livre, jamais corrigés en masse ;\n- aucune validation humaine n’est créée automatiquement.',
  },
]

const ANCRE = '\n\n\n## 36. Le modèle d’onglets\n'
const NUMEROS = ['### 35.28.', '### 35.29.']

const SECTIONS = [
  '### 35.28. La grille des titres — le rang est une PROFONDEUR',
  '',
  '⛔ **LE RANG D’UN TITRE EST SA PLACE DANS L’ARBRE DES TITRES**, et rien d’autre. Ni son nom de style, ni son `scope_kind`, ni son marqueur imprimé ne le déterminent. Un « § I » est un T3 dans un livre et un T5 dans un autre ; ce qui décide est : sous quel titre se range-t-il, et combien de niveaux analytiques le séparent de la tête de son livre.',
  '',
  '**Les six rangs.**',
  '',
  '- **T1 — le livre.** ⛔ Il ne paraît jamais : la navigation nomme déjà le livre (§ 35.1). Il structure, il ne se compose pas.',
  '- **T2 — la grande division** : une partie du livre, ou le titre que porte l’introduction du livre. ⚠️ Aucune forme numérique n’est requise. « Introduction » est ici le titre, et « Genèse » ou « Évangile selon saint Matthieu » son chapeau (§ 35.13).',
  '- **T3 — la grande section interne** : « Livre I », « Section I », suivant la structure réelle.',
  '- **T4 — la sous-section analytique.** « I — Prélude : la généalogie de Notre-Seigneur Jésus-Christ (1, 1-17) » aussi bien que « La création (1, 1 - 2, 3) » : les deux formes sont également légitimes.',
  '- **T5 — la première division analytique sous un T4.**',
  '- **T6 — le niveau réellement subordonné à un T5.**',
  '',
  '⛔ **LA NUMÉROTATION EST UNE CONSÉQUENCE, JAMAIS UN CRITÈRE.** Dire « T5 égale chiffre arabe » ou « T6 égale numérotation décimale » serait faux : un T5 porte un repère romain si telle est la structure du passage, et la décimale (`2.1`, `2.2`) ne devient nécessaire que lorsque deux niveaux numériques successifs risqueraient de se confondre. La graphie observée se note au carnet ; elle n’entre pas dans la norme.',
  '',
  '⛔ **T6 NE SE DONNE PAS PARCE QUE `scope_kind` VAUT `pericope`.** Le `scope_kind` dit la PORTÉE d’un bloc, le rang dit sa PLACE, et les deux ne se déduisent pas l’un de l’autre. C’est l’anomalie mesurée sur Matthieu le 20 septembre 2026 : « I — Prélude » y est un T4 et ses subdivisions, marquées `titre_pericope`, tombaient directement en T6, quand la Genèse encode la même profondeur T4 → T5 → T6.',
  '',
  '⛔ **LE BLOC DÉCLARE SON RANG (`metadata.semantic_level`), LE REGISTRE N’EN DONNE QUE LE DÉFAUT.** C’est ce qui permet de tenir la grille sans renommer les styles : **on ne change pas ce qu’un bloc EST pour corriger où il se TIENT.** L’ordre est le même sur les deux axes — l’alias hérité d’abord, la déclaration du bloc ensuite, le registre en dernier. ⚠️ Une déclaration hors de la famille du style, un titre déclaré `I3` par exemple, est ÉCARTÉE et le défaut reprend la main : les deux échelles ne se mélangent pas (§ 7.1). ⚠️ Le rendu a ignoré ces déclarations jusqu’au 20 septembre 2026 : 4 948 titres sur 6 316 en portaient une, et 39 en portaient une que le registre contredisait.',
  '',
  '**Quatre relevés, du plus dur au plus souple.** ⛔ Les trois premiers sont des défauts, le quatrième est une QUESTION.',
  '',
  '1. **Déclaration irrecevable** — un titre qui déclare un rang d’information, ou l’inverse. Le rendu l’écarte déjà ; c’est une faute de donnée pure, et elle doit valoir zéro.',
  '2. **Inversion** — un titre à un rang SUPÉRIEUR à celui de son parent. Incohérent par construction : un enfant ne domine pas son père.',
  '3. **Rang plat** — un titre au MÊME rang que son parent. Une hiérarchie qui ne descend pas n’en est pas une.',
  '4. **Saut** — un enfant à plus d’un rang sous son parent. ⚠️ Ce n’est PAS une faute en soi : une édition peut n’avoir qu’un seul niveau analytique sous une section. C’est une question à poser au livre, et le nombre dit s’il faut la poser.',
  '',
  '⚠️ **La fratrie hétérogène** — des titres frères d’un même parent à des rangs différents — se relève avec eux : deux frères qui n’ont pas le même poids rendent le plan illisible.',
  '',
  '⛔ **ON REPREND LIVRE PAR LIVRE, JAMAIS EN MASSE.** Relevé du 20 septembre 2026 sur les 6 316 titres du corpus Fillion : **62 inversions, 294 rangs plats, 140 fratries hétérogènes, 1 579 sauts**, et zéro déclaration irrecevable. Une règle qui demanderait de justifier quinze cents sauts au cas par cas ne serait pas une règle mais un arriéré ; on corrige un livre quand on le reprend, et le contrôle dit où en est chacun.',
  '',
  '**Le contrôle est `scripts/fillion/controle-grille-titres.mts`** (`--livre=`, `--detail`, `--strict`). ⛔ Il n’a aucune règle à lui : le rang de chaque bloc vient de `resoudreStyleSemantique`, la fonction que la page emploie. Il n’écrit rien.',
  '',
  '### 35.29. La manchette d’un commentaire — trois états, et aucun autre',
  '',
  '⛔ Un repère de commentaire de rang bas est une MANCHETTE : jamais un titre, jamais une entrée du plan (§ 35.9). À la clôture d’un livre, chaque commentaire de rang I4 à I6 susceptible d’en porter une se trouve dans **exactement l’un de trois états** :',
  '',
  '1. **Manchette source** — l’intitulé est attesté par le témoin, et il est conservé.',
  '2. **Manchette éditoriale** — composée par Corpus Scriptura, explicitement marquée comme telle, lorsque le commentaire est autonome, sa portée certaine et son intitulé bref, neutre et fiable.',
  '3. **Absence justifiée** — bloc de continuation, portée incertaine, ou aucun intitulé bref et neutre ne peut être établi.',
  '',
  '⛔ **ON NE FABRIQUE JAMAIS UN INTITULÉ POUR RÉGULARISER LA PAGE.** Le troisième état est un état de clôture à part entière, non un échec : une page dont trois commentaires sur dix portent une manchette est close si les sept autres ont leur raison.',
  '',
  '⛔ **UNE MANCHETTE ÉDITORIALE NE REÇOIT JAMAIS DE `facsimile_heading`**, et la raison n’est pas une convention de champ : `facsimile_heading` ATTESTE une forme imprimée. Lui donner une forme qu’aucun témoin ne porte, ce n’est pas remplir un champ, c’est falsifier le témoin.',
].join('\n')

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  const ancres = sortie.split(ANCRE).length - 1
  if (ancres !== 1) throw new Error(`[${source}] ancre du § 36 : ${ancres} occurrence(s), 1 attendue.`)
  for (const n of NUMEROS) if (sortie.includes(n)) throw new Error(`[${source}] le numéro ${n} est déjà pris.`)
  return sortie.split(ANCRE).join(`\n\n${SECTIONS}${ANCRE}`)
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

// ⛔ Les DEUX d'abord, l'écriture ensuite.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  remplacements: REMPLACEMENTS.length,
  sections_posees: NUMEROS,
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase. Le fichier local, lui, est corrigé — relancer après avoir tiré le miroir.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, avant, apres } of REMPLACEMENTS) {
  if (relue.valeur.includes(avant)) throw new Error(`Relecture : « ${nom} » porte encore l’ancien texte.`)
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
for (const n of NUMEROS) {
  const posees = relue.valeur.split(n).length - 1
  if (posees !== 1) throw new Error(`Relecture : ${n} posé ${posees} fois.`)
  if (relue.valeur.indexOf(n) > relue.valeur.indexOf('## 36. Le modèle d’onglets')) {
    throw new Error(`Relecture : ${n} est posé APRÈS le § 36.`)
  }
}
console.log('§§ 35.28 et 35.29 posés, cinq passages corrigés, et la relecture le confirme.')
