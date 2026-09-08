/**
 * Corrige la charte, § 13.15 : l'énoncé de la borne était TROP COURT pour le noyau.
 *
 * ⚠️ `charte-noyau.mjs` écarte tout impératif de moins de 32 lettres — « un fragment
 * trop court n'est pas une règle » —, et « ELLE S'ARRÊTE AU VOLET. » n'en fait que
 * vingt. La règle posée le 8 septembre 2026 ne paraissait donc PAS dans le noyau,
 * c'est-à-dire dans le seul document qu'on ouvre pour savoir qu'une règle existe.
 * ⛔ On ne corrige jamais le noyau, qui est dérivé : on écrit l'énoncé entier dans la
 * charte, et le noyau le voit.
 *
 * ⚠️ La leçon est celle qu'AGENTS.md consigne déjà : le noyau MESURE la discipline
 * d'écriture. Un énoncé qui n'y entre pas est un énoncé qui ne se tient pas seul.
 *
 * Usage : node scripts/charte-noyau-voit-la-borne-2026-09-08.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 13.15 — la borne, énoncée en entier',
    avant: '⛔ **ELLE S’ARRÊTE AU VOLET.** La marge se compte jusqu’au bord du BLOC DE LECTURE — ce qui reste entre les deux volets —, non jusqu’au bord de la fenêtre.',
    apres: '⛔ **L’ENCART S’ARRÊTE AU VOLET : la marge se compte jusqu’au bord du BLOC DE LECTURE, non jusqu’au bord de la fenêtre.** Le bloc de lecture est ce qui reste entre les deux volets.',
  },
]

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
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

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantApres = appliquer(data.valeur, 'Supabase')

console.log(JSON.stringify({ delta: localApres.length - localAvant.length, mis_a_jour: data.mis_a_jour, essai_seul: essaiSeul }, null, 2))

// ⚠️ Pas de `process.exit()` : le client Supabase garde des handles, et Windows lève
// une assertion libuv à la sortie forcée (piège déjà consigné).
if (essaiSeul) console.log('Essai seul : rien n’a été écrit.')
else {
  writeFileSync(cheminCharte, localApres)

  const { data: ecrite, error: err2 } = await db
    .from('parametres')
    .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
    .eq('cle', 'charte_ia')
    .eq('mis_a_jour', data.mis_a_jour)
    .select('mis_a_jour')
  if (err2) throw err2
  if (!ecrite || ecrite.length !== 1) throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase.')

  const { data: relue, error: err3 } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
  if (err3) throw err3
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    if (relue.valeur.includes(avant)) throw new Error(`Relecture : « ${nom} » porte encore l’ancien texte.`)
    if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
  }
  console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
}
