import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const chartePath = resolve(root, 'charte', 'CHARTE_IA.md')
const auditRoot = resolve(root, 'audit', 'charte-sync-2026-08-21')
const mode = process.argv.includes('--pull') ? 'pull' : process.argv.includes('--push') ? 'push' : null
const dryRun = process.argv.includes('--dry')

if (!mode) throw new Error('Préciser --pull ou --push (et éventuellement --dry).')

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/gu, '')]),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Variables Supabase absentes.')

const db = createClient(url, key, { auth: { persistSession: false } })
const normaliser = value => String(value ?? '').replace(/\r\n/gu, '\n').trimEnd() + '\n'
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex')
const md5 = value => createHash('md5').update(value, 'utf8').digest('hex')
const resume = value => ({
  characters: value.length,
  lines: value.split('\n').length,
  md5: md5(value),
  sha256: sha256(value),
})

const local = normaliser(readFileSync(chartePath, 'utf8'))
const { data: row, error } = await db
  .from('parametres')
  .select('cle,valeur,mis_a_jour')
  .eq('cle', 'charte_ia')
  .single()
if (error) throw error

const distant = normaliser(row.valeur)
const avant = {
  mode,
  dry_run: dryRun,
  generated_at: new Date().toISOString(),
  local: resume(local),
  supabase: { ...resume(distant), mis_a_jour: row.mis_a_jour },
  already_equal: local === distant,
}

const titres = [...local.matchAll(/^#{2,6}\s+(.+)$/gmu)].map(match => match[1].trim())
// ⚠️ « 9.4 bis » est un numéro à part entière, non un doublon de « 9.4 » : le
//    suffixe fait partie du numéro (relevé le 2026-09-03, il bloquait tout envoi).
const numeros = titres.map(titre => titre.match(/^(\d+(?:\.\d+)*(?: bis| ter)?)\.?\s/u)?.[1]).filter(Boolean)
const controles = {
  duplicate_headings: [...new Set(titres.filter((titre, index) => titres.indexOf(titre) !== index))],
  duplicate_heading_numbers: [...new Set(numeros.filter((numero, index) => numeros.indexOf(numero) !== index))],
  replacement_characters: [...local.matchAll(/�/gu)].length,
  positional_note_rule_once: local.split('Les offsets sont comptés en points de code Unicode et sont indexés à partir de zéro.').length - 1,
}

mkdirSync(auditRoot, { recursive: true })

if (mode === 'pull') {
  const reportPath = resolve(auditRoot, dryRun ? 'pull-dry.json' : 'pull.json')
  if (!dryRun && local !== distant) {
    const backupPath = resolve(auditRoot, 'charte_locale_avant_pull.md')
    if (!existsSync(backupPath)) writeFileSync(backupPath, local, 'utf8')
    const tempPath = `${chartePath}.tmp-sync`
    writeFileSync(tempPath, distant, 'utf8')
    renameSync(tempPath, chartePath)
    if (normaliser(readFileSync(chartePath, 'utf8')) !== distant) {
      throw new Error('La relecture locale diffère de la charte Supabase.')
    }
  }
  const report = { ...avant, after_local: resume(dryRun ? local : distant) }
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
} else {
  if (controles.duplicate_headings.length
    || controles.duplicate_heading_numbers.length
    || controles.replacement_characters
    || controles.positional_note_rule_once !== 1) {
    throw new Error(`La charte locale est invalide : ${JSON.stringify(controles)}`)
  }

  const reportPath = resolve(auditRoot, dryRun ? 'push-dry.json' : 'push.json')
  if (dryRun || local === distant) {
    const report = { ...avant, proposed: resume(local), controles, write_required: local !== distant }
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report, null, 2))
  } else {
    const suffixeSauvegarde = String(row.mis_a_jour ?? 'sans_date').replace(/[^0-9A-Za-z]+/gu, '-')
    const backupPath = resolve(auditRoot, `charte_supabase_avant_push_${suffixeSauvegarde}.json`)
    if (existsSync(backupPath)) throw new Error(`La sauvegarde existe déjà : ${backupPath}`)
    writeFileSync(backupPath, `${JSON.stringify(row, null, 2)}\n`, 'utf8')

    const nextTimestamp = new Date().toISOString()
    const { data: updated, error: updateError } = await db
      .from('parametres')
      .update({ valeur: local, mis_a_jour: nextTimestamp })
      .eq('cle', 'charte_ia')
      .eq('mis_a_jour', row.mis_a_jour)
      .select('cle,valeur,mis_a_jour')
      .single()
    if (updateError) throw updateError
    if (normaliser(updated.valeur) !== local) throw new Error('La relecture immédiate diffère du fichier source.')

    const { data: reread, error: rereadError } = await db
      .from('parametres')
      .select('cle,valeur,mis_a_jour')
      .eq('cle', 'charte_ia')
      .single()
    if (rereadError) throw rereadError
    const final = normaliser(reread.valeur)
    if (final !== local) throw new Error('La relecture finale diffère du fichier source.')

    const report = {
      ...avant,
      controles,
      backup: backupPath,
      after_supabase: { ...resume(final), mis_a_jour: reread.mis_a_jour },
      exact_match: sha256(final) === sha256(local),
    }
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report, null, 2))
  }
}
