/**
 * Ajoute à la charte le § 35.9 : le repère d'un commentaire de Fillion se pose
 * en cartouche, que le commentaire habille comme le texte habille une lettrine.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` : la doctrine n'a qu'une source, et
 * `charte/CHARTE_IA.md` s'en régénère (`synchroniser-charte-supabase.mjs --pull`).
 * Refuse d'écrire si l'ancre ne se trouve pas exactement une fois, ou si un § 35.9
 * existe déjà.
 *
 * Usage : node scripts/charte-cartouche-repere-commentaire-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 36. Le modèle d’onglets'
const AJOUT = [
  '### 35.9. Le repère d’un commentaire se pose en cartouche',
  '',
  'Le repère qui ouvre un commentaire de péricope — « 59-61. Jésus est mis au tombeau. » — n’est pas un titre : il n’entre ni dans le plan d’accessibilité ni au sommaire. Il ne prend pas non plus une ligne pleine au-dessus du développement. Il se pose dans un petit cadre carré, au fer à gauche, que le commentaire habille comme le texte habille une lettrine. Le fac-similé compose ainsi : Fillion imprime son repère et enchaîne ses notes dans la foulée, sans lui donner de ligne à lui seul.',
  '',
  'Le cadre est un FILET, jamais un fond teinté ni une couleur d’alerte : un commentaire d’édition n’avertit de rien. Le repère s’y compose centré et sans césure — sur une ligne de dix-sept signes, elle le hacherait plus qu’elle ne le rangerait — dans l’encre du texte second : encadré, il n’a plus besoin de s’effacer pour tenir sa place.',
  '',
  'Deux gardes-fous. Sur une mesure étroite, où le carré ne laisserait qu’une vingtaine de signes par ligne et creuserait le justifié de lézardes, le repère reprend toute la mesure en bandeau et le texte le suit au lieu de l’habiller. Et le bloc contient son flottant, faute de quoi un commentaire plus court que le carré le laisserait déborder sur ce qui suit. ⛔ Ce contexte se pose par `display: flow-root`, jamais par un `container-type` : celui-ci confine la mise en page et ferait du bloc le référent des fenêtres de note, qui sont en position fixe — elles s’y trouveraient enfermées.',
  '',
  'La disposition vaut pour les repères des rangs bas, chapitre, péricope et verset. Les rubriques de large portée — introduction, notice de livre ou de partie — gardent leur composition centrée en petites capitales : ce ne sont pas des repères de développement mais des noms de genre éditorial.',
  '',
  '',
].join('\n')

function appliquer(texte, source) {
  const trouvees = texte.split(ANCRE).length - 1
  if (trouvees !== 1) throw new Error(`[${source}] ancre : ${trouvees} occurrence(s), 1 attendue.`)
  const dejaLa = texte.includes('### 35.9.')
  if (dejaLa) throw new Error(`[${source}] un § 35.9 existe déjà : vérifier avant d’écrire.`)
  // Les deux exemplaires n'ont pas les mêmes fins de ligne : on adopte celles du texte reçu.
  const ajout = /\r\n/u.test(texte) ? AJOUT.replace(/\n/gu, '\r\n') : AJOUT
  return texte.split(ANCRE).join(ajout + ANCRE)
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

const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: distantApres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Supabase porte le § 35.9. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
