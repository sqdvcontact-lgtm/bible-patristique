/**
 * § 7 : le tableau d'ouverture perd `vers`, qui n'est plus une nature.
 *
 * ⛔ Défaut relevé par GPT le 29 août 2026, et c'est un oubli de ma reprise : j'avais
 * corrigé les §§ 7.4 et 7.5.1 sans toucher au tableau qui OUVRE la section, lequel
 * continuait de lister quatorze natures dont `vers`. La charte se contredisait donc
 * d'un paragraphe à l'autre, et c'est le tableau d'ouverture qu'on lit en premier.
 *
 * La règle vive est celle des sections basses, de la contrainte `chk_segments_nature`
 * et de la donnée : treize natures, et le vers se déclare par sa FORME.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-section7-vers-retire-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REPRISES = [
  {
    quoi: "§ 7 · la ligne `vers` du tableau d’ouverture",
    avant: `| \`vers\` | versification réellement présente |
`,
    apres: '',
  },
  {
    quoi: '§ 7 · le renvoi vers la FORME, sous le tableau',
    avant: `Un titre structurel n’est pas un segment de nature \`titre\`. Il appartient aux métadonnées ou aux \`ref_niv\`.`,
    apres: `⛔ **Elles sont TREIZE, et \`vers\` n’en est pas.** La poésie ne se déclare pas par une
nature mais par une FORME, \`segment_metadata.forme = 'vers'\` (§ 7.4) : c’est la seule
écriture qui vaille aussi dans l’apparat, où la nature est déjà prise par
\`apparat_critique\` — c’est par là que le segment y est SÉLECTIONNÉ, et elle ne peut pas
dire en plus qu’il est en vers. La nature \`vers\` a existé jusqu’au 29 août 2026 ; ses
2 325 segments ont migré, et \`chk_segments_nature\` la refuse.

⚠️ **Un segment en vers porte donc la nature de ses FRÈRES** — ce que porte, dans le même
espace, un bloc de même fonction : \`texte\` dans le corps, \`introduction\` dans
l’introduction. Sa forme se déclare à part, sur le second axe.

Un titre structurel n’est pas un segment de nature \`titre\`. Il appartient aux métadonnées ou aux \`ref_niv\`.`,
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

if (avant.includes("Elles sont TREIZE")) { console.log('Déjà posé.'); process.exit(0) }

// ⛔ Toutes les ancres se vérifient AVANT d'écrire : une reprise partielle laisserait
// la charte à moitié dans l'ancienne doctrine, ce qui est le défaut qu'on corrige.
let texte = avant
for (const r of REPRISES) {
  const n = texte.split(r.avant).length - 1
  if (n !== 1) throw new Error(`${r.quoi} : ${n} occurrence(s), 1 attendue.`)
}
for (const r of REPRISES) texte = texte.split(r.avant).join(r.apres)

// Contrôle de clôture : plus AUCUNE ligne de tableau ne déclare `vers` comme nature.
const ligneNature = /^\|\s*`vers`\s*\|/mu
if (ligneNature.test(texte)) throw new Error('une ligne de tableau déclare encore la nature `vers`.')

console.log(JSON.stringify({ avant: avant.length, apres: texte.length, delta: texte.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (relu.valeur.length !== texte.length) throw new Error('relecture : longueur inattendue.')
if (ligneNature.test(relu.valeur)) throw new Error('relecture : la nature `vers` est encore déclarée.')
if (!relu.valeur.includes("Elles sont TREIZE")) throw new Error('relecture : le renvoi à la forme est absent.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
