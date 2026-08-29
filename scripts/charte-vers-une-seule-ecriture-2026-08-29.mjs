/**
 * §§ 7.4 et 7.5.1 : LE VERS NE SE DÉCLARE PLUS QUE D'UNE FAÇON.
 *
 * Décision de l'auteur du 29 août 2026 : « le verrou de Boèce ne tient plus, tu peux
 * le défaire. ensuite, corrige ce qui doit l'être. » Le verrou levé, la nature `vers`
 * a pu migrer vers `segment_metadata.forme`, et la charte doit cesser de décrire deux
 * écritures là où il n'en reste qu'une.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-vers-une-seule-ecriture-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

/** Chaque reprise : une ancre qui doit paraître UNE fois, et son remplacement. */
const REPRISES = [
  // ─── § 7.4 : la table des quatre surfaces ───
  {
    quoi: '§ 7.4 · la ligne « Corps d’une œuvre »',
    avant: `| Corps d'une œuvre | \`nature = 'vers'\` *(hérité)* ou \`segment_metadata.forme = 'vers'\` | \`styleBlocDeVers\` |`,
    apres: `| Corps d'une œuvre | \`segment_metadata.forme = 'vers'\` | \`styleBlocDeVers\` |`,
  },
  // ─── § 7.4 : le paragraphe des deux écritures ───
  {
    quoi: '§ 7.4 · « Deux écritures », qui n’en fait plus qu’une',
    avant: `#### Deux écritures pour déclarer un vers, et pourquoi

⛔ **Dans l'apparat, la NATURE est déjà prise.** Un segment d'apparat vaut
\`apparat_critique\` — c'est par là qu'il est sélectionné — et il ne peut pas dire en
plus qu'il est en vers. Il fallait donc un second axe : \`segment_metadata.forme\`, qui
dit la MATIÈRE d'un segment sans toucher à sa nature. C'est exactement ce que le
paratexte biblique fait depuis toujours avec son couple \`kind\` × \`form\`.

⚠️ \`nature = 'vers'\` reste la façon HÉRITÉE, et les 2 325 segments qui la portent ne
bougent pas. Le prédicat \`estEnVers\` lit les deux, et \`estBlocDeVers\` applique le
TOUT OU RIEN : un bloc mêlant un vers et de la prose se compose en prose. ⛔ Ne jamais
lire l'une des deux écritures sans l'autre.`,
    apres: `#### Une seule écriture, et c'est l'APPARAT qui l'a imposée

⛔ **Dans l'apparat, la NATURE est déjà prise.** Un segment d'apparat vaut
\`apparat_critique\` — c'est par là qu'il est SÉLECTIONNÉ — et il ne peut pas dire en
plus qu'il est en vers. Il fallait donc un second axe : \`segment_metadata.forme\`, qui
dit la MATIÈRE d'un segment sans toucher à sa nature. C'est exactement ce que le
paratexte biblique fait depuis toujours avec son couple \`kind\` × \`form\`.

⚠️ **Et ce que l'apparat impose, le corps l'adopte.** \`nature = 'vers'\` a existé
jusqu'au 29 août 2026 ; elle est sortie du vocabulaire ce jour-là, et ses 2 325
segments ont migré vers la forme — 1 213 vers de Boèce chez Ceriziers, 1 092 chez
Mirandol, 20 du *Manuel* de Dhuoda. La nature retombe sur celle de leurs FRÈRES, ce que
porte un bloc de même fonction dans le même espace : \`texte\` dans le corps,
\`introduction\` dans l'introduction. Aucun n'a changé de composition.

⛔ **Garder les deux aurait été garder deux façons de dire le même fait, et deux façons
de dire un même fait divergent toujours.** Elles avaient DÉJÀ divergé : trois lecteurs
du site jugeaient le vers sur la seule nature, sans passer par \`estEnVers\` — la lecture
bilingue et deux endroits des traductions parallèles. Le prédicat ne lit donc plus que
la forme, et \`estBlocDeVers\` applique le TOUT OU RIEN : un bloc mêlant un vers et de
la prose se compose en prose.

⚠️ **Une déclaration, mais DEUX enveloppes, et il faut lire les deux.** Selon la
requête, la forme arrive à plat (\`forme:segment_metadata->>forme\`, comme le fait
\`SELECT_SEGMENT\`) ou dans la colonne \`segment_metadata\` entière. Ce n'est pas une
seconde façon de DÉCLARER un vers mais une seconde façon de le TRANSPORTER, et c'est
exactement là que le défaut se logeait. ⛔ Ne jamais juger un vers ailleurs que dans
\`estEnVers\`.

⚠️ **Ce que la levée du verrou a coûté, et qu'on ne refera pas.** La base est PARTAGÉE
entre le poste de travail et le site en ligne : la migration des données a donc rendu
faux, à la seconde même, le code DÉJÀ DÉPLOYÉ qui lisait la nature. Les traductions
parallèles de Boèce ont composé leurs vers en prose le temps que le correctif soit
poussé. C'est le piège déjà consigné pour \`oeuvres_auteurs\` — **on change le code
AVANT la donnée, ou bien les deux dans le même souffle.**`,
  },
  // ─── § 7.5.1 : la table des natures ───
  {
    quoi: '§ 7.5.1 · la table des natures',
    avant: `| \`texte\` | la prose de l'auteur : le cas ordinaire, et le défaut | un fourre-tout — 93 % du corpus, mais un lemme ou une citation structurelle méritent leur nom | 88 811 |
| \`vers\` | une ligne de poésie, une par segment | ⛔ pas \`verset\` : un vers est une ligne de MÈTRE, un verset une unité de l'Écriture | 2 325 |`,
    apres: `| \`texte\` | la prose de l'auteur : le cas ordinaire, et le défaut | un fourre-tout — 93 % du corpus, mais un lemme ou une citation structurelle méritent leur nom | 91 116 |`,
  },
  {
    quoi: '§ 7.5.1 · les quatre lignes à trois cellules',
    avant: `| \`introduction\` | un préambule appartenant au texte | 37 |
| \`verset\` | un verset d'une citation que l'ÉDITION pose verset par verset | ⛔ pas toute citation biblique : c'est la coupure IMPRIMÉE qui le fonde | 12 |
| \`texte absent\` | une lacune du témoin | 1 |
| \`signature\` | approbations, censeurs, souscripteurs : au fer à droite, interligne resserré | 0 |
| \`separateur\` | ⛔ **ÉTEINTE.** Conservée pour d'anciens exports ; ne plus en créer. | 0 |

⚠️ Un second axe dit la FORME et non la fonction : \`segment_metadata.forme = 'vers'\`
(§ 7.4). Il est le seul moyen de déclarer un vers là où la nature est déjà prise —
dans l'apparat.`,
    apres: `| \`introduction\` | un préambule appartenant au texte | | 57 |
| \`verset\` | un verset d'une citation que l'ÉDITION pose verset par verset | ⛔ pas toute citation biblique : c'est la coupure IMPRIMÉE qui le fonde | 12 |
| \`texte absent\` | une lacune du témoin | | 1 |
| \`signature\` | approbations, censeurs, souscripteurs : au fer à droite, interligne resserré | | 0 |
| \`separateur\` | ⛔ **ÉTEINTE.** Conservée pour d'anciens exports ; ne plus en créer. | | 0 |

⛔ **Le VERS n'est PAS dans cette table, et c'est le point à retenir** : ce n'est pas
une nature mais une FORME, déclarée par \`segment_metadata.forme = 'vers'\` (§ 7.4).
La nature \`vers\` a existé jusqu'au 29 août 2026 ; ses 2 325 segments ont migré, la
contrainte la refuse, et le compte de \`texte\` a monté d'autant. ⚠️ Un vers reste une
ligne de MÈTRE, à ne pas confondre avec \`verset\`, qui est une unité de l'Écriture.`,
  },
]

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur

if (avant.includes('#### Une seule écriture, et c’est l’APPARAT') || avant.includes("#### Une seule écriture, et c'est l'APPARAT")) {
  console.log('Déjà posé.'); process.exit(0)
}

// ⛔ On vérifie TOUTES les ancres avant d'écrire quoi que ce soit : une reprise
// partielle laisserait la charte à moitié dans l'ancienne doctrine.
let texte = avant
for (const r of REPRISES) {
  const n = texte.split(r.avant).length - 1
  if (n !== 1) throw new Error(`${r.quoi} : ${n} occurrence(s), 1 attendue.`)
}
for (const r of REPRISES) texte = texte.split(r.avant).join(r.apres)

console.log(JSON.stringify({ avant: avant.length, apres: texte.length, delta: texte.length - avant.length, reprises: REPRISES.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (relu.valeur.length !== texte.length) throw new Error('relecture : longueur inattendue.')
if (relu.valeur.includes("| `vers` | une ligne de poésie")) throw new Error('relecture : la nature `vers` est encore au catalogue.')
if (!relu.valeur.includes('Une seule écriture, et c\'est l\'APPARAT')) throw new Error('relecture : le § 7.4 n’est pas repris.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
