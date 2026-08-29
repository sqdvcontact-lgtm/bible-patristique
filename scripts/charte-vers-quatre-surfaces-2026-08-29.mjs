/**
 * § 7.4 : LE VERS — un style, quatre surfaces.
 *
 * Demande de l'auteur du 29 août 2026 : « je veux un style propre à la poésie », et
 * son équivalent dans l'apparat biblique, l'apparat patristique et le texte biblique,
 * « même s'il ne sera jamais utilisé dans ce dernier ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-vers-quatre-surfaces-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 8. Notes structurées et références présentes dans le texte'

const AJOUT = `### 7.4. Le VERS — un style, quatre surfaces

La poésie est le premier style qui doive exister PARTOUT. Elle sert surtout le corps
des œuvres des Pères — la *Consolation* de Boèce en compte 2 305 vers —, mais un
apparat peut citer un poème, et un livre biblique peut en être un.

⛔ **Ce qui fait qu'un vers est un vers ne dépend d'AUCUNE surface.** On ne le justifie
pas ; on ne le coupe pas — on ne coupe pas un alexandrin ; il porte son alinéa
poétique, sa strophe, et un retrait de suite qui distingue une ligne trop longue du
vers d'après. Cette règle vit en un seul endroit, \`styleLigneDeVers\`
(\`app/lib/compositionVers.ts\`), et les quatre surfaces la partagent.

⚠️ **Seuls la police, le corps et l'encre appartiennent à la surface**, et vivent dans
le BLOC qui porte les lignes. C'est la même distinction que partout ailleurs : le style
dit ce que la chose est, la surface dit comment elle se compose.

| Surface | Comment on déclare le vers | Où le bloc se compose |
|---|---|---|
| Corps d'une œuvre | \`nature = 'vers'\` *(hérité)* ou \`segment_metadata.forme = 'vers'\` | \`styleBlocDeVers\` |
| Apparat d'une œuvre | \`segment_metadata.forme = 'vers'\` **seulement** | \`styleBlocDeVers\` |
| Apparat d'une bible | \`form: 'verse'\` sur le paragraphe | \`STYLE_CORPS\` |
| Texte biblique | *(reste à déclarer — voir plus bas)* | \`styleTexteVerset({ enVers })\` |

#### Deux écritures pour déclarer un vers, et pourquoi

⛔ **Dans l'apparat, la NATURE est déjà prise.** Un segment d'apparat vaut
\`apparat_critique\` — c'est par là qu'il est sélectionné — et il ne peut pas dire en
plus qu'il est en vers. Il fallait donc un second axe : \`segment_metadata.forme\`, qui
dit la MATIÈRE d'un segment sans toucher à sa nature. C'est exactement ce que le
paratexte biblique fait depuis toujours avec son couple \`kind\` × \`form\`.

⚠️ \`nature = 'vers'\` reste la façon HÉRITÉE, et les 2 325 segments qui la portent ne
bougent pas. Le prédicat \`estEnVers\` lit les deux, et \`estBlocDeVers\` applique le
TOUT OU RIEN : un bloc mêlant un vers et de la prose se compose en prose. ⛔ Ne jamais
lire l'une des deux écritures sans l'autre.

#### Ce que la garde impose

⛔ **Une ligne de vers est une BOÎTE, jamais un fragment en ligne.** \`text-indent\` ne
s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après un saut forcé : sans
boîte, l'alinéa ne se poserait que sur le premier vers de la strophe.

⛔ **On ne DÉCOUPE pas en lignes un paragraphe qui porte une locution marquée ou un
appel de note.** Leurs offsets pointent dans le texte ENTIER, et les couper les
déplacerait. Un tel paragraphe garde son \`pre-line\`, qui rend les sauts sans les
indenter. C'est la même garde que sur l'intertitre divisé et sur la citation sortie.

⛔ **Un vers ne prend jamais de lettrine.** Le drop cap est un flottant : posé dans la
boîte d'une ligne, il déborde sur les suivantes, qui sont des boîtes sœurs.

#### Le texte biblique attend sa donnée

Le Psautier est de la poésie, Job et les prophètes aussi. La page Bible les compose
pourtant en paragraphes justifiés, comme de la prose.

⛔ **Et cela ne se corrige pas au rendu.** Relevé le 29 août 2026 : sur les **2 693
versets du Psautier**, AUCUNE des quatre traductions — Sacy, Segond, Crampon, la
Vulgate — ne contient un seul saut de ligne. La coupe des stiques, qui EST le vers d'un
psaume, n'existe pas dans le corpus. ⚠️ Elle ne se devine pas davantage : couper un
verset à la ponctuation reviendrait à inventer une prosodie.

Le style est posé et éprouvé — \`styleTexteVerset({ enVers })\` —, la planche le montre,
et il attend que la donnée porte les stiques. **Poser un style avant sa donnée est
légitime ; deviner la donnée depuis le style ne l'est pas.**

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
if (avant.includes('### 7.4. Le VERS — un style, quatre surfaces')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes('### 7.4. Le VERS — un style, quatre surfaces')) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
