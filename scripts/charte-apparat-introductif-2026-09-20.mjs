/**
 * Pose la charte, § 35.27 : L'APPARAT INTRODUCTIF D'UN LIVRE.
 *
 * Quatre réglages demandés par l'auteur le 20 septembre 2026 sur l'« Apparat
 * introductif » de la Fillion — le titre plus gros, la subdivision en manchette,
 * la numérotation imprimée qui ne paraît plus, le blanc proportionné —, et le
 * défaut de registre qu'ils ont fait paraître : un style à rôle de titre qui ne
 * disait nulle part le RANG de son titre.
 *
 * La section s'INSÈRE avant le § 36 ; elle ne remplace rien. ⛔ Le script refuse
 * d'écrire si l'ancre ne se trouve pas exactement une fois dans CHACUN des deux
 * exemplaires, ou si le numéro 35.27 y est déjà pris.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains,
 * et une lecture suivie d'une écriture sans garde effacerait le travail d'un autre.
 *
 * Usage : node scripts/charte-apparat-introductif-2026-09-20.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '\n\n\n## 36. Le modèle d’onglets\n'
const NUMERO = '### 35.27.'

const SECTION = [
  '### 35.27. L’apparat introductif d’un livre',
  '',
  'Fillion ouvre chaque livre par une introduction que son imprimeur divise en développements : « 1° La personne de l’auteur », « Le sujet et le but », « Plan et division ». La donnée en fait DEUX blocs par développement — un bloc de TITRE, puis un ou plusieurs blocs de CORPS qui le nomment pour parent.',
  '',
  '⛔ **UNE SUBDIVISION D’INTRODUCTION SE COMPOSE EN MANCHETTE**, posée en tête de son développement, à gauche, en haut, que le texte habille — exactement le repère d’un commentaire de rang bas (§ 35.9). C’est la disposition du fac-similé, et elle rend au blanc sa mesure : le développement suivant ne rouvre plus le blanc d’un rang de titre, il ouvre celui d’une subdivision.',
  '',
  '⛔ **LA DONNÉE DÉCIDE, ET ELLE SEULE.** Une subdivision se reconnaît à ce que son titre DÉCLARE une introduction pour parent (`semantic_parent_key`) et qu’il porte le rang T4 ; jamais à la forme de son intitulé ni à sa place dans la page. Les autres titres d’une introduction n’en sont pas et ne bougent pas : un `titre_livre`, qui ne paraît jamais, ou l’« Introduction » de Daniel, qui est un T2 et titre la pièce entière. ⚠️ Un titre dont le développement MANQUE — bloc absent du chapitre chargé, corps qui porte déjà son propre intitulé — n’est pas absorbé : il garde sa composition de titre. Une manchette qui n’a pas où se poser doit se voir, non disparaître.',
  '',
  '⛔ **LA NUMÉROTATION IMPRIMÉE NE PARAÎT PLUS** (décision de l’auteur, 20 septembre 2026), et la donnée la GARDE : c’est un témoin de la page composée, comme la mention de chapitre. Elle ne dit rien que la suite des manchettes ne dise déjà, et elle divisait le corpus en deux — « 1. La personne de l’auteur » chez Matthieu contre « Le sujet et le but » à la Genèse, pour la même chose. ⚠️ Le chiffre est ARABE : « I — L’état d’innocence » n’est pas une numérotation mais une DÉSIGNATION, qui se compose en titre et chapeau.',
  '',
  '⛔ **LE BLANC D’UNE SUBDIVISION N’EST PAS CELUI D’UN RANG DE TITRE.** Il ouvre le développement suivant à l’intérieur d’une même introduction, là où le rang de la sous-section sépare deux parties d’un livre : 2,25 rem contre 6,25, soit 137 px sur l’écran de l’auteur à l’intérieur d’une seule introduction de trois pages (« anormalement grand ; il faut un espace beaucoup plus petit, proportionné »). Il reste franchement sous le plus bas des rangs de titre, une subdivision d’introduction rompant moins qu’une péricope neuve. ⚠️ Il se pose sur les TROIS surfaces du § 35.17.3, et l’on FERME celui du bloc d’avant : sur l’axe de texte, qui est une grille, les marges s’ADDITIONNENT au lieu de fusionner (§ 35.12).',
  '',
  '⛔ **LE TITRE PORTÉ D’UNE INTRODUCTION DE LIVRE MONTE D’UN RANG** (décision de l’auteur, 20 septembre 2026 : « doit être plus gros »). C’est la première chose qu’on lit avant le premier verset, et elle se composait au rang d’une PARTIE, dont elle n’est pas. Elle prend donc le corps du rang T1, que `titre_livre` laisse VACANT puisqu’il ne paraît jamais — la page nomme déjà le livre dans son fil d’Ariane (§ 35.1). ⚠️ L’introduction ne prend pas ce rang pour autant : elle reste un bloc d’INFORMATION de portée I1 qui PORTE un titre T2, et c’est sa seule composition qui change. Le chapeau monte avec elle, d’un cran : sous une tête de 1,625 rem, le corps des rangs hauts faisait du nom du livre une légende.',
  '',
  '⛔ **UN STYLE À RÔLE DE TITRE DIT LE RANG DE SON TITRE À CHAQUE RANG D’INFORMATION.** `introduction_titree` déclarait `heading_role: "title"` sans dire nulle part quel titre elle porte : faute d’`embedded_title_level` sur le bloc, le rendu ne trouvait aucun rang et retombait sur la RUBRIQUE grise. Seul son alias `introduction_livre` portait ce rang, si bien que la même introduction se composait en T2 à la Genèse et en rubrique chez Matthieu, selon le code que l’import avait écrit. ⛔ **Un code canonique vaut son alias, toujours** : le registre porte donc `heading_levels`, un rang de titre par rang d’information, et le validateur REFUSE un style d’information à rôle de titre qui ne sait pas composer son titre à chaque rang. ⚠️ Chaque rang d’information porte le titre de la PORTÉE qu’il explique ; I1 → T2 est la seule exception doctrinale, `titre_livre` (T1) ne paraissant jamais.',
  '',
  '⚠️ **Le défaut ne se voyait NI dans la donnée, NI dans un test, NI dans le registre lu seul** : les deux codes sont canoniques, les deux blocs sont sains, et c’est leur RENCONTRE avec le rendu qui les séparait. Mesuré au jour de la correction : 55 blocs du corpus retrouvent leur titre, 44 introductions de livre et 11 de péricope.',
].join('\n')

function inserer(texte, source) {
  const ancres = texte.split(ANCRE).length - 1
  if (ancres !== 1) throw new Error(`[${source}] ancre du § 36 : ${ancres} occurrence(s), 1 attendue.`)
  if (texte.includes(NUMERO)) throw new Error(`[${source}] le numéro 35.27 est déjà pris.`)
  return texte.split(ANCRE).join(`\n\n${SECTION}${ANCRE}`)
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

// ⛔ Les DEUX d'abord, l'écriture ensuite : si l'un des deux exemplaires ne porte
// pas exactement l'ancre attendue, on n'en corrige aucun.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = inserer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = inserer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  section: { signes: SECTION.length },
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

// Verrou optimiste : la ligne ne doit pas avoir bougé depuis la lecture.
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

// Double relecture : la section est là, une seule fois, à sa place.
const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
const posees = relue.valeur.split(NUMERO).length - 1
if (posees !== 1) throw new Error(`Relecture : § 35.27 posé ${posees} fois.`)
if (relue.valeur.indexOf(NUMERO) > relue.valeur.indexOf('## 36. Le modèle d’onglets')) {
  throw new Error('Relecture : § 35.27 est posé APRÈS le § 36.')
}
console.log('§ 35.27 posé dans les deux exemplaires, et la relecture le confirme.')
