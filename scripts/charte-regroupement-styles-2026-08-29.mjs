/**
 * § 7.2 : UN STYLE DIT UNE NATURE, LE RANG SE DIT À PART.
 *
 * Suite immédiate du § 7.1, et sa mise à l'épreuve. Les trois axes une fois posés, le
 * relevé a montré que le vocabulaire du paratexte biblique les confondait toujours :
 * quarante de ses quarante-huit styles étaient un produit croisé nature × portée.
 *
 * Demande de l'auteur du 29 août 2026 : « regroupe les styles similaires ou très
 * proches qui ne justifient pas de distinction ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-regroupement-styles-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 8. Notes structurées et références présentes dans le texte'

const AJOUT = `### 7.2. Un style dit une NATURE ; le rang se dit à part

Le § 7.1 pose que le style, la surface et le rang sont trois axes distincts. Le
paratexte biblique les confondait encore : sur ses quarante-huit styles, **quarante
étaient un produit croisé nature × portée** — \`commentaire_pericope\`,
\`introduction_livre\`, \`notice_chapitre\`, sept natures par six niveaux.

⚠️ **Or le rendu ne compose que sur le couple niveau × nature.** Un bloc reçoit deux
classes, \`cs-bible-info--i5\` et \`cs-bible-block--commentary\`, et rien d'autre : le code
du style n'est qu'une clé de recherche. Son suffixe répétait donc ce que la portée
disait déjà, et **ce qui se répète dérive**. La dérive s'était produite : le Pentateuque
et le Nouveau Testament avaient fini par employer des vocabulaires DISJOINTS pour des
fonctions voisines, l'un commentant en \`commentaire_verset\` et \`commentaire_chapitre\`,
l'autre en \`introduction_pericope\` et \`introduction_section\`.

**Ils sont quatre.** \`introduction_titree\` — celle qui porte son propre titre ;
\`introduction\` — celle qui n'en porte pas ; \`commentaire\` ; \`notice\`. Plus
\`note_verset\`, qui n'est pas un bloc de corps.

⚠️ **Les TITRES ne bougent pas**, et l'asymétrie est motivée. Chez eux il n'y a aucun
produit croisé : un code par rang, T1 à T6, plus le second T5 qui vit sur l'axe
matériel. Le rang EST leur identité, et les fondre en un \`titre\` + un rang rendrait
moins lisible précisément ce qui compte le plus, l'échelle des titres et des
sous-titres.

**Quatre natures ont été fondues, et aucune ne se distinguait par rien de visible :**

| Fondue | Dans | Ce qui l'en séparait |
|---|---|---|
| \`excursus\` | \`notice\` | **rien** — même corps, même aparté |
| \`sommaire\` | \`introduction\` | un centième d'em de chasse |
| \`conclusion\` | \`commentaire\` | une italique — or une conclusion est un commentaire PLACÉ à la fin, et la position est un axe à part |
| \`transition\` | \`notice\` | rien : elle portait déjà cette nature |

⚠️ **Aucune des quatre ne portait un seul bloc du corpus.** Le regroupement n'a donc
rien déplacé à l'écran, et c'est ce qui l'a rendu possible sans arbitrage éditorial.

⛔ **Un style d'information sans RANG est refusé**, par la base comme par le rendu. Ce
n'est pas une sévérité gratuite, c'est le sens même du regroupement : le nom dit la
nature, le rang se déclare dans \`metadata.semantic_level\`, et un bloc qui n'en déclare
aucun ne s'en invente pas un.

⚠️ **Les anciens codes vivent comme NOMS HÉRITÉS**, chacun portant le rang qu'il disait
dans son propre nom : \`commentaire_pericope\` se résout en \`commentaire\` + I5. La donnée
n'a rien à migrer pour continuer de paraître. ⛔ Et **le rang d'un nom hérité fait foi
contre un rang déclaré** — sans quoi le regroupement changerait la composition d'un bloc
qui n'a pas bougé.

**Ce que le relevé a trouvé au passage, et qui vaut au delà de ce chantier.** Deux
champs de la donnée disaient un fait que personne ne lisait : \`metadata.semantic_level\`
et \`metadata.embedded_title_level\` étaient écrits, exposés par la vue, et **lus par
aucune ligne du site** — le rendu prenait le rang dans le nom du style. Le même fait
était donc écrit deux fois, et les deux écritures divergeaient déjà : le même code
portait I3 sur soixante-seize blocs et I4 sur onze. ⛔ **Un champ que rien ne lit n'est
pas une réserve pour plus tard : c'est une seconde vérité qui attend de contredire la
première.**

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
if (avant.includes('### 7.2. Un style dit une NATURE')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes('### 7.2. Un style dit une NATURE')) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
