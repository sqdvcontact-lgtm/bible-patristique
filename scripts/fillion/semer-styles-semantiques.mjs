/**
 * SÈME le vocabulaire des styles sémantiques en base, depuis le registre.
 *
 * `work/fillion/semantic_display_hierarchy.json` reste LA SOURCE ; la table
 * `bible_styles_semantiques` en est la copie, et c'est elle que le déclencheur
 * interroge pour refuser un style inconnu (migration 20260829100000).
 *
 * ⛔ Ne jamais écrire dans la table à la main : deux vocabulaires qui divergent
 * valent moins qu'un seul. On ajoute un style au REGISTRE, puis on resème.
 * `app/lib/bibleStylesSemantiques.test.ts` refuse la divergence.
 *
 * Usage : node scripts/fillion/semer-styles-semantiques.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const registre = JSON.parse(readFileSync(resolve(racine, 'work/fillion/semantic_display_hierarchy.json'), 'utf8'))

/** Un style de plein droit porte sa définition ; un alias ne porte que son renvoi. */
const lignes = []
for (const [code, s] of Object.entries(registre.styles)) {
  lignes.push({
    code,
    alias_de: null,
    kind: s.kind,
    niveau: s.level,
    nature: s.nature,
    axe: s.hierarchy_axis === 'material' ? 'material' : 'analytic',
    au_plan: s.include_in_outline === true,
    role_intitule: s.heading_role ?? null,
    niveau_intitule: s.heading_level ?? null,
    bloc_de_corps: s.body_block !== false,
    masque_par_navigation: s.redundant_with_reader_navigation === true,
    note: s.note ?? null,
  })
  for (const alias of s.aliases ?? []) {
    lignes.push({
      code: alias, alias_de: code, kind: null, niveau: null, nature: null, axe: null,
      au_plan: false, role_intitule: null, niveau_intitule: null,
      bloc_de_corps: true, masque_par_navigation: false,
      note: `Alias de \`${code}\`.`,
    })
  }
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const canoniques = lignes.filter(l => l.alias_de === null)
const alias = lignes.filter(l => l.alias_de !== null)
console.log(JSON.stringify({
  registre: registre.version, mis_a_jour: registre.updated,
  styles: canoniques.length, alias: alias.length, essai_seul: essaiSeul,
}, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// ⚠️ Les canoniques D'ABORD : un alias renvoie à son style par clé étrangère.
for (const lot of [canoniques, alias]) {
  const { error } = await db.from('bible_styles_semantiques').upsert(lot, { onConflict: 'code' })
  if (error) throw error
}

// Ce que la base porte en trop : un style retiré du registre doit sortir de la table.
const { data: enBase, error: errLecture } = await db.from('bible_styles_semantiques').select('code')
if (errLecture) throw errLecture
const connus = new Set(lignes.map(l => l.code))
const surnumeraires = enBase.map(r => r.code).filter(c => !connus.has(c))
if (surnumeraires.length > 0) {
  const { error } = await db.from('bible_styles_semantiques').delete().in('code', surnumeraires)
  if (error) throw error
  console.log(`${surnumeraires.length} style(s) retiré(s) : ${surnumeraires.join(', ')}`)
}
console.log(`Vocabulaire semé : ${canoniques.length} styles, ${alias.length} alias.`)
