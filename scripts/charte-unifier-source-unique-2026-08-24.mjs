/**
 * Fait de `parametres.charte_ia` l'UNIQUE boîte à règles, et de `charte/CHARTE_IA.md`
 * son miroir exact.
 *
 * Trois exemplaires de la charte avaient divergé — le commit (116 547 signes), l'arbre de
 * travail (187 384) et Supabase (214 689) — et aucun ne valait les autres. Le relevé du
 * 2026-08-24 a montré que Supabase les contient tous : neuf sections n'existaient que
 * chez lui, dont « 12.3 Résorption des œuvres originales autonomes », et sur les 1 029
 * lignes utiles du fichier local, dix seulement en étaient absentes — huit par un défaut
 * d'échappement, deux par une reformulation plus récente côté Supabase.
 *
 * Le script fait donc trois choses, dans cet ordre :
 *
 * 1. il RÉPARE les 21 suites « antislash + n » que la charte Supabase portait en toutes
 *    lettres, au lieu de vrais sauts de ligne. Elles collaient des listes, des paragraphes
 *    et DEUX titres de niveau 2 (« ## 4. Lacunes… » et « ## 7. Natures de segment ») sur
 *    une seule ligne, que le Markdown ne rendait pas ;
 * 2. il inscrit dans la charte elle-même où elle vit et ce qu'est le fichier ;
 * 3. il écrit le fichier comme copie EXACTE de Supabase, après avoir mis l'ancien à
 *    l'abri hors du dépôt.
 *
 * ⛔ Refuse d'écrire au moindre écart de compte : ni 21 échappées, ni un préambule déjà
 * posé, ni une sauvegarde impossible n'autorisent à continuer.
 *
 * Usage : node scripts/charte-unifier-source-unique-2026-08-24.mjs [--dry]
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const cheminMiroir = resolve(racine, 'charte', 'CHARTE_IA.md')
const cheminSauvegarde = 'C:/Corpus Scriptura/charte-locale-avant-miroir-20260824.md'
const essaiSeul = process.argv.includes('--dry')

// La suite de DEUX caractères — antislash, puis n — écrite sans littéral échappé, pour
// qu'aucune relecture ni aucun outil d'édition ne puisse la transformer en saut de ligne.
const ECHAPPE = String.fromCharCode(92) + 'n'
const ECHAPPES_ATTENDUES = 21

const ANCRE_PREAMBULE = 'Cette charte est la seule version normative. Elle décrit l’état voulu du corpus, de la base et des procédures. Les journaux de chantier, bilans chiffrés, listes d’œuvres traitées et anciennes décisions ne lui appartiennent pas.'
const PREAMBULE = [
  ANCRE_PREAMBULE,
  '',
  'Elle vit dans **`parametres.charte_ia`**, et nulle part ailleurs : c’est l’unique boîte à règles. `charte/CHARTE_IA.md` n’en est qu’un miroir, régénéré par `node scripts/synchroniser-charte-supabase.mjs --pull` ; ⛔ ne jamais l’éditer à la main, une correction portée sur le miroir se perd au premier `--pull`. `AGENTS.md` porte les règles de CODE du dépôt et renvoie ici pour la doctrine.',
].join('\n')

const md5 = v => createHash('md5').update(v, 'utf8').digest('hex')

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur

const trouvees = avant.split(ECHAPPE).length - 1
if (trouvees !== ECHAPPES_ATTENDUES) throw new Error(`${trouvees} suite(s) échappée(s), ${ECHAPPES_ATTENDUES} attendues.`)
if (avant.includes('l’unique boîte à règles')) throw new Error('Le préambule d’autorité est déjà posé : rien à faire.')
if (avant.split(ANCRE_PREAMBULE).length - 1 !== 1) throw new Error('L’ancre du préambule ne se trouve pas exactement une fois.')

const apres = avant.split(ECHAPPE).join('\n').split(ANCRE_PREAMBULE).join(PREAMBULE)

const rapport = {
  supabase: { avant: avant.length, apres: apres.length, md5_avant: md5(avant), md5_apres: md5(apres) },
  echappees_reparees: trouvees,
  titres_rendus: ['## 4. Lacunes, absences et alignement biblique', '## 7. Natures de segment']
    .map(t => ({ titre: t, en_debut_de_ligne: apres.includes('\n' + t + '\n') })),
  miroir: { avant: readFileSync(cheminMiroir, 'utf8').length, apres: apres.length },
  essai_seul: essaiSeul,
}
console.log(JSON.stringify(rapport, null, 2))
if (rapport.titres_rendus.some(t => !t.en_debut_de_ligne)) throw new Error('Un titre de niveau 2 n’a pas retrouvé sa ligne.')

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// La sauvegarde de l'état Supabase d'abord : on ne touche à rien sans filet.
const { error: erreurSauvegarde } = await db.from('parametres')
  .upsert({ cle: 'charte_ia_sauvegarde_20260824_avant_miroir', valeur: avant }, { onConflict: 'cle' })
if (erreurSauvegarde) throw erreurSauvegarde

// Puis l'arbre de travail, dont la réécriture n'est pas commitée : hors du dépôt.
copyFileSync(cheminMiroir, cheminSauvegarde)

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
writeFileSync(cheminMiroir, apres)

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
const miroirRelu = readFileSync(cheminMiroir, 'utf8')
console.log(JSON.stringify({
  supabase_relu: { signes: relu.valeur.length, md5: md5(relu.valeur) },
  miroir_relu: { signes: miroirRelu.length, md5: md5(miroirRelu) },
  identiques: md5(relu.valeur) === md5(miroirRelu),
  sauvegarde_locale: cheminSauvegarde,
}, null, 2))
process.exit(0)
