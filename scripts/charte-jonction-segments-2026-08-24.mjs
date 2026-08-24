/**
 * Pose le §6.1.1 de la charte : la jonction entre deux segments, et la matérialisation
 * de `join_before`. Règle fixée le 2026-08-24, après le défaut du latin de Zycha
 * (« ut multos gignerent?spacenon enim et Adam ipse »).
 *
 * ⛔ N'écrit que dans `parametres.charte_ia`. Le miroir se régénère ensuite par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * Usage : node scripts/charte-jonction-segments-2026-08-24.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const essaiSeul = process.argv.includes('--dry')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ANCRE = '### 6.2 Niveaux de titre'

const AJOUT = `### 6.1.1 La jonction entre deux segments

\`join_before\` porte le séparateur à poser AVANT le segment courant lorsque plusieurs segments se recomposent en un texte suivi. ⛔ C’est une INSTRUCTION, jamais du texte : sa valeur ne se concatène pas au corps, elle se matérialise. Le défaut relevé le 24 août 2026 est exactement celui-là, et il se lisait à l’écran : le latin de Zycha des « Questions sur l’Heptateuque » composait « ut multos gignerent?spacenon enim et Adam ipse », le mot technique \`space\` paraissant au beau milieu d’Augustin. La donnée était juste, la recomposition stockée dans \`oeuvre_texte_unites.clean_text\` aussi ; seul le rendu concaténait.

⚠️ La colonne admet DEUX conventions, et rien en base ne les départage, puisqu’elle est en texte libre et que les lots d’import se sont succédé. Un JETON symbolique nomme le séparateur sans l’écrire, selon le vocabulaire du modèle éditorial : \`none\`, \`space\`, \`line_break\`, \`paragraph_break\`. C’est celui que la contrainte \`bible_editorial_segment_sources_join_before_check\` impose à la couche biblique éditoriale. Ou bien la colonne porte le SÉPARATEUR LITTÉRAL lui-même, écrit tel qu’il doit paraître : l’espace, la chaîne vide qui recolle un mot coupé, le saut de ligne, l’insécable, le tiret cadratin encadré d’espaces. Les deux se reconnaissent sans ambiguïté, un séparateur littéral ne portant ni lettre ni chiffre.

⛔ La matérialisation vit à UN SEUL endroit, que partagent toutes les surfaces qui recomposent : lecture suivie d’une œuvre, apparat critique, colonne en langue originale de la lecture en regard, traductions parallèles, couche biblique éditoriale. Un vocabulaire recopié à deux endroits finit toujours par matérialiser d’un côté ce que l’autre imprime.

⛔ Une valeur inconnue n’est JAMAIS rendue telle quelle : elle retombe sur le liant par défaut. Le rendu perd alors une intention, ce qui se corrige, au lieu de faire entrer une métadonnée dans le corpus, ce qui se lit.

⚠️ Une valeur nulle dit « l’édition n’a rien prescrit » et vaut l’espace simple, conformément au § 3.2. Ce n’est pas une commodité de rendu : au 24 août 2026, 65 798 segments répartis sur 44 versions n’ont jamais eu la colonne renseignée, et leur rendre la chaîne vide souderait les mots de tout ce fonds.

⛔ La jonction est celle du segment COURANT, et rien ne s’hérite du segment précédent ni de son unité source. Le premier segment d’un bloc affiché ne reçoit aucun préfixe, quelle que soit sa valeur : c’est la surface qui sait où son bloc commence, non la donnée. Une frontière entre deux unités sources n’appelle donc aucune règle particulière, le segment qui ouvre l’unité disant seul ce qu’il faut y poser. ⚠️ Et l’on ne pose pas de règle qui interdirait de joindre deux unités : une phrase court parfois de l’une à l’autre dans un même paragraphe, et 684 premiers segments d’unité chez Mirandol et Ceriziers portent la chaîne vide précisément pour recoller un mot coupé au passage.

La recomposition est LOGIQUE d’abord. Les transformations d’affichage viennent ensuite, et segment par segment : espace fine avant la haute ponctuation, césures conditionnelles, justification. ⛔ Aucune valeur de métadonnée n’entre dans la chaîne remise au moteur typographique.

`

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', 'charte_ia').maybeSingle()
if (error || !data) { console.error('Lecture refusée :', error?.message); process.exit(1) }
const charte = data.valeur

if (charte.includes('### 6.1.1 La jonction entre deux segments')) { console.error('⛔ Le §6.1.1 est déjà posé. Rien à faire.'); process.exit(1) }
if (!charte.includes('### 6.1 Identité d’un segment')) { console.error('⛔ Le §6.1 est introuvable. Rien écrit.'); process.exit(1) }
const occurrences = charte.split(ANCRE).length - 1
if (occurrences !== 1) { console.error(`⛔ L'ancre se trouve ${occurrences} fois, il en faut une. Rien écrit.`); process.exit(1) }

const nouvelle = charte.replace(ANCRE, AJOUT + ANCRE)
console.log(`Charte : ${charte.length} → ${nouvelle.length} signes (+${nouvelle.length - charte.length}).`)
if (essaiSeul) { console.log('Essai seul, rien écrit.'); process.exit(0) }

const { error: e2 } = await sb.from('parametres').update({ valeur: nouvelle }).eq('cle', 'charte_ia')
if (e2) { console.error('Écriture refusée :', e2.message); process.exit(1) }
console.log('✓ §6.1.1 posé. Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
