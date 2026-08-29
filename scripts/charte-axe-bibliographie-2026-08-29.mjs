import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
const racine = 'C:/Corpus Scriptura/bible-patristique'
const ANCIEN = `**Les axes qui accompagnent un style, sans en être un :** le RANG (\`semantic_level\`),
le RÔLE d'affichage (\`display_role\` — aujourd'hui \`sous_titre\`, qui prend le rang du
titre auquel il s'accroche), la FORME du paragraphe (\`form: prose | verse\`), et le
sous-type d'une notice.`
const NOUVEAU = `**Les axes qui accompagnent un style, sans en être un.** Aucun n'est un style : ils
qualifient celui que le bloc porte déjà.

| Axe | Ce qu'il dit | Valeurs |
|---|---|---|
| \`semantic_level\` | le RANG d'une information | \`I1\` à \`I6\` |
| \`display_role\` | le RÔLE d'affichage du bloc | \`sous_titre\` — qui prend le rang du titre auquel il s'accroche |
| \`form\` (paragraphe) | la MATIÈRE du paragraphe | \`prose\`, \`verse\` |
| \`leading_paragraph_style\` | la composition imposée au PREMIER paragraphe d'un bloc | \`bibliographie\`, \`renvois-bible\` |
| \`notice_subtype\` | l'espèce d'une notice | historique, géographique, apparat critique, **bibliographie**, sigles… |
| \`segment_metadata.forme\` | la MATIÈRE d'un segment patristique | \`vers\` |

⚠️ **La BIBLIOGRAPHIE n'est pas un style, et c'est délibéré** : c'est une MATIÈRE, que
deux axes peuvent déclarer — \`notice_subtype = bibliography\` sur une notice entière,
\`leading_paragraph_style = bibliographie\` sur le premier paragraphe d'un bloc. Elle se
compose alors dans la famille \`cs-apparat-bibliographie\`, une seule pour tout
l'apparat (§ 35.6.2), et ses entrées se raccordent au catalogue par \`ouvrage_id\`
(§ 35.6.4). ⛔ Lui donner un style à elle seule aurait mis dans le NOM ce que la
matière dit déjà — c'est le produit croisé qu'on a défait.`
const env = Object.fromEntries(readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
if (data.valeur.includes('La BIBLIOGRAPHIE n’est pas un style')) { console.log('Déjà posé.'); process.exit(0) }
const n = data.valeur.split(ANCIEN).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s)`)
const apres = data.valeur.split(ANCIEN).join(NOUVEAU)
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('ok :', data.valeur.length, '→', apres.length)
