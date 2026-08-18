import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const dryRun = process.argv.includes('--dry')
const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'charte', 'CHARTE_IA.md')
const auditRoot = resolve(root, 'audit', 'charte-2026-08-12-docx-centralisation')
const backupPath = resolve(auditRoot, 'charte_ia_avant.json')
const reportPath = resolve(auditRoot, dryRun ? 'controle_dry_run.json' : 'controle_publication.json')
const expectedBeforeMd5 = '81c3338c6a208fe4faf56e54a0605f6e'
const marker = '## 32. Centralisation des DOCX finaux'

const charter = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n').trimEnd() + '\n'
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')
const md5 = (value) => createHash('md5').update(value, 'utf8').digest('hex')
const occurrences = (value, needle) => value.split(needle).length - 1

const headings = [...charter.matchAll(/^#{2,6}\s+(.+)$/gmu)].map((match) => match[1].trim())
const duplicateHeadings = [...new Set(headings.filter((heading, index) => headings.indexOf(heading) !== index))]
const headingNumbers = headings.map((heading) => heading.match(/^(\d+(?:\.\d+)*)\.?\s/u)?.[1]).filter(Boolean)
const duplicateNumbers = [...new Set(headingNumbers.filter((number, index) => headingNumbers.indexOf(number) !== index))]
const checks = {
  marker_once: occurrences(charter, marker) === 1,
  copy_not_move: charter.includes('Cette opération est une copie et jamais un déplacement'),
  target_recorded: charter.includes('D:\\OneDrive\\Bureau\\CS - Docx'),
  sha256_verification: charter.includes('vérifier l’égalité SHA-256'),
  duplicate_headings: duplicateHeadings,
  duplicate_heading_numbers: duplicateNumbers,
  replacement_characters: occurrences(charter, '\uFFFD'),
}
if (
  !checks.marker_once || !checks.copy_not_move || !checks.target_recorded ||
  !checks.sha256_verification || duplicateHeadings.length || duplicateNumbers.length ||
  checks.replacement_characters
) {
  throw new Error(`Charte locale invalide : ${JSON.stringify(checks)}`)
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Variables Supabase absentes')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: before, error: beforeError } = await db
  .from('parametres')
  .select('cle,valeur,mis_a_jour')
  .eq('cle', 'charte_ia')
  .single()
if (beforeError) throw beforeError
if (md5(before.valeur) !== expectedBeforeMd5) {
  throw new Error(`Garde Charte vivante : MD5 ${md5(before.valeur)} au lieu de ${expectedBeforeMd5}`)
}

const baseReport = {
  schema: 'charte-docx-centralisation-v1',
  dry_run: dryRun,
  source: sourcePath,
  before: {
    mis_a_jour: before.mis_a_jour,
    characters: before.valeur.length,
    md5: md5(before.valeur),
    sha256: sha256(before.valeur),
  },
  proposed: {
    characters: charter.length,
    md5: md5(charter),
    sha256: sha256(charter),
  },
  checks,
}

mkdirSync(dirname(reportPath), { recursive: true })
if (dryRun) {
  writeFileSync(reportPath, `${JSON.stringify(baseReport, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(baseReport, null, 2))
} else {
  if (existsSync(backupPath)) throw new Error(`La sauvegarde existe déjà : ${backupPath}`)
  writeFileSync(backupPath, `${JSON.stringify(before, null, 2)}\n`, 'utf8')

  const nextTimestamp = new Date().toISOString()
  const { data: updated, error: updateError } = await db
    .from('parametres')
    .update({ valeur: charter, mis_a_jour: nextTimestamp })
    .eq('cle', 'charte_ia')
    .eq('mis_a_jour', before.mis_a_jour)
    .select('cle,valeur,mis_a_jour')
    .single()
  if (updateError) throw updateError
  if (updated.valeur !== charter) throw new Error('La relecture immédiate diffère du fichier source')

  const { data: reread, error: rereadError } = await db
    .from('parametres')
    .select('cle,valeur,mis_a_jour')
    .eq('cle', 'charte_ia')
    .single()
  if (rereadError) throw rereadError
  if (reread.valeur !== charter) throw new Error('La relecture finale diffère du fichier source')

  const report = {
    ...baseReport,
    backup: backupPath,
    after: {
      mis_a_jour: reread.mis_a_jour,
      characters: reread.valeur.length,
      md5: md5(reread.valeur),
      sha256: sha256(reread.valeur),
    },
    exact_match: sha256(reread.valeur) === sha256(charter),
  }
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
}
