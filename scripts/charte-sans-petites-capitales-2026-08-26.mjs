/**
 * Deux décisions de l'auteur du 26 août 2026, portées à la charte :
 *   — aucun titre biblique ne se compose en petites capitales ;
 *   — un intervalle de références ne coupe pas un intitulé, et la mention de
 *     chapitre imprimée en tête d'un intitulé ne paraît pas.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-sans-petites-capitales-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 35.9 — les rubriques ne sont plus en petites capitales',
    avant: 'La disposition vaut pour les repères des rangs bas, chapitre, péricope et verset. Les rubriques de large portée — introduction, notice de livre ou de partie — gardent leur composition centrée en petites capitales : ce ne sont pas des repères de développement mais des noms de genre éditorial.',
    apres: 'La disposition vaut pour les repères des rangs bas, chapitre, péricope et verset. Les rubriques de large portée — introduction, notice de livre ou de partie — gardent leur composition centrée et leur petit corps : ce ne sont pas des repères de développement mais des noms de genre éditorial.',
  },
  {
    nom: '§ 35.10 — ni petites capitales, ni coupure sur un intervalle',
    avant: '## 36. Le modèle d’onglets',
    apres: [
      '### 35.10. Aucun titre biblique ne se compose en petites capitales',
      '',
      '⛔ Décision de l’auteur, 26 août 2026 : « laid et pas lisible ». Quatre rangs de titre sur six les portaient, plus les rubriques d’information. Composée à quinze pixels avec de la chasse, une ligne entière en petites capitales devient une bande grise où l’œil ne trouve plus de mot — et c’est précisément le rang qu’on lit le plus, celui des péricopes, qui en souffrait le plus.',
      '',
      'La casse imprimée par Fillion se rend donc telle qu’elle est écrite, et les rangs se séparent autrement : le corps d’abord, puis la POSE — les rangs hauts centrés en romain, la péricope au fer en ITALIQUE. ⚠️ L’italique fait ici le travail que faisait la capitale : elle distingue sans peser, et un titre de péricope ne doit pas peser plus que ce qu’il annonce. Les rubriques suivent, et leur chasse tombe de moitié : une chasse large n’a de sens que sous des capitales.',
      '',
      '⚠️ Cela ne touche pas les petites capitales que la SOURCE demande — un nom d’auteur dans une bibliographie, relevé comme tel dans les enrichissements du texte. Elles portent un sens, et elles ne composent jamais une ligne entière.',
      '',
      '### 35.11. Un intervalle de références ne coupe pas un intitulé',
      '',
      'Un intitulé se coupe en titre et chapeau sur un tiret cadratin, mais ⛔ le tiret joint aussi bien deux références de plage. « § II. Le sermon sur la montagne (5, 1 — 7, 29) » se coupait ainsi en plein milieu d’une parenthèse, dont la fermeture partait seule en chapeau : « 7, 29) ». Cent intitulés du corpus étaient dans ce cas, presque tous dans Matthieu, où la référence de plage est la règle.',
      '',
      'La coupure exige donc que la tête DÉSIGNE une division au lieu de la décrire : moins de vingt-quatre signes, et close par un point (« § III. », « SECTION I. ») ou sans aucun chiffre (« PREMIÈRE PARTIE »). ⚠️ Mesurée sur les 2 651 intitulés du corpus, la règle change exactement les cent cas fautifs et aucun autre.',
      '',
      '⛔ La mention de chapitre imprimée en tête d’un intitulé ne paraît pas, pour la raison qui vaut déjà au § 35.1 : la barre de navigation nomme le chapitre. Enchâssée dans l’intitulé de 58 commentaires — « CHAP. IX. — 1-2. Introduction… » — elle prenait la place du repère, lequel passait en chapeau subordonné : la mention matérielle dominait l’information utile.',
      '',
      '## 36. Le modèle d’onglets',
    ].join('\n'),
  },
]

function appliquer(texte) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const n = sortie.split(avant).length - 1
    if (n !== 1) throw new Error(`« ${nom} » : ${n} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  return sortie
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
const apres = appliquer(avant)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
