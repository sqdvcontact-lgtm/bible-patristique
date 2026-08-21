import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const WORK_ID = 'A0418O0003'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const before = await db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID).single()
if (before.error) throw new Error(`Lecture de l'œuvre impossible : ${before.error.message}`)
if (before.data.titre !== 'Du mépris du monde') throw new Error('Œuvre inattendue : migration interrompue.')

const snapshotPath = `tmp/eucher-import-2026-07-30/eucher-before-continuous-reading-${new Date().toISOString().replaceAll(':', '-')}.json`
writeFileSync(snapshotPath, `${JSON.stringify(before.data, null, 2)}\n`, 'utf8')

const sql = readFileSync('sql/add_lecture_texte_entier.sql', 'utf8')
const applied = await db.rpc('exec_sql', { sql })
if (applied.error) throw new Error(`Migration annulée : ${applied.error.message}`)

const after = await db.from('oeuvres')
  .select('id_oeuvre,titre,lecture_texte_entier,niveaux_sommaire,niveaux_corps')
  .eq('id_oeuvre', WORK_ID).single()
if (after.error) throw new Error(`Contrôle final impossible : ${after.error.message}`)
if (after.data.lecture_texte_entier !== true) throw new Error('Le mode continu n’est pas activé.')

console.log(JSON.stringify({ ok: true, snapshot: snapshotPath, work: after.data }, null, 2))
