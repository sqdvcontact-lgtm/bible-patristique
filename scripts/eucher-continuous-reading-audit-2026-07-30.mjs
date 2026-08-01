import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const WORK_ID = 'A0418O0003'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error, count } = await query
  if (error) throw new Error(`${label} : ${error.message}`)
  return { data, count }
}

const { data: work } = await must(db.from('oeuvres')
  .select('id_oeuvre,titre,lecture_texte_entier,niveaux_sommaire,niveaux_corps,texte_sommaire,texte_corps,afficher_numeros')
  .eq('id_oeuvre', WORK_ID).single(), 'œuvre')
const { data: levels } = await must(db.rpc('get_niv1_list', { p_id_oeuvre: WORK_ID }), 'niveaux 1')
const { count: bodyCount } = await must(db.from('segments').select('id', { count: 'exact', head: true })
  .eq('id_oeuvre', WORK_ID).in('nature', ['texte', 'citation']), 'segments du corps')

const configFields = [
  ['niveaux_sommaire', work.niveaux_sommaire],
  ['niveaux_corps', work.niveaux_corps],
  ['texte_sommaire', work.texte_sommaire],
  ['texte_corps', work.texte_corps],
  ['afficher_numeros', work.afficher_numeros],
]
for (const [field, value] of configFields) {
  await must(db.rpc('admin_update_oeuvre_champ', {
    p_id_oeuvre: WORK_ID,
    p_champ: field,
    p_valeur: value,
  }), `enregistrement du champ ${field}`)
}

const bodyLevels = levels.map(row => row.ref_niv1).filter(level => /^\d+$/.test(level))
const checks = {
  correct_work: work.titre === 'Du mépris du monde',
  continuous_mode_enabled: work.lecture_texte_entier === true,
  display_depths_preserved: work.niveaux_sommaire === 1 && work.niveaux_corps === 1,
  sixty_body_levels: bodyLevels.length === 60 && bodyLevels[0] === '1' && bodyLevels.at(-1) === '60',
  complete_body_unchanged: bodyCount === 547,
  existing_display_fields_writable: true,
}
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key)
console.log(JSON.stringify({ checks, failed, body_segments: bodyCount, body_levels: bodyLevels.length }, null, 2))
if (failed.length) process.exitCode = 2
