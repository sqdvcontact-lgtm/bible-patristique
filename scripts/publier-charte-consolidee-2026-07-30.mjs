import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const dryRun = process.argv.includes('--dry')
const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'charte', 'CHARTE_IA.md')
const backupPath = resolve(root, 'audit', 'charte-2026-07-30', 'sauvegarde-avant-consolidation.json')
const reportPath = resolve(root, 'audit', 'charte-2026-07-30', dryRun ? 'controle-consolidation-dry-run.json' : 'controle-consolidation-publiee.json')
const charter = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n').trimEnd() + '\n'
const env = Object.fromEntries(readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))

const requiredHeadings = [
  '## 3. Typographie et enrichissement',
  '### 6.1 Identité d’un segment',
  '## 9. Liens bibliques',
  '### 9.0 Protocole obligatoire',
  '### 12.2 Alignement éditorial',
  '## 17. Écritures, droits et sécurité',
  '### 23.7 Respect de l’édition',
  '### 23.10 Sauvegarde obligatoire',
  '### 23.11 Fidélité des caractères',
  '### 24.3 Fiabilité canonique',
  '### 25.0 Règle supérieure',
]
const forbidden = [
  ['ancien chemin de travail', /C:\\Users\\quins/iu],
  ['échappement littéral', /\\n/u],
  ['historique daté', /(?:amendé|ajouté|corrigé) le \d{1,2}\s+[a-zéû]+\s+20\d{2}/iu],
]

const headings = [...charter.matchAll(/^#{2,6}\s+(.+)$/gmu)].map((match) => match[1].trim())
const duplicates = [...new Set(headings.filter((heading, index) => headings.indexOf(heading) !== index))]
const numberedHeadings = headings.map((heading) => heading.match(/^(\d+(?:\.\d+)*)\.?\s/u)?.[1]).filter(Boolean)
const duplicateNumbers = [...new Set(numberedHeadings.filter((number, index) => numberedHeadings.indexOf(number) !== index))]
const missing = requiredHeadings.filter((heading) => !charter.includes(heading))
const forbiddenHits = forbidden.filter(([, regex]) => regex.test(charter)).map(([label]) => label)
const replacementCharacters = (charter.match(/�/gu) ?? []).length

if (duplicates.length || duplicateNumbers.length || missing.length || forbiddenHits.length || replacementCharacters) {
  throw new Error(JSON.stringify({ duplicates, duplicateNumbers, missing, forbiddenHits, replacementCharacters }, null, 2))
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

const sha = (value) => createHash('sha256').update(value, 'utf8').digest('hex')
const baseReport = {
  dry_run: dryRun,
  source: sourcePath,
  before: { updated_at: before.mis_a_jour, characters: before.valeur.length, lines: before.valeur.split('\n').length, sha256: sha(before.valeur) },
  proposed: { characters: charter.length, lines: charter.split('\n').length, headings: headings.length, sha256: sha(charter) },
  checks: { duplicate_headings: duplicates, duplicate_heading_numbers: duplicateNumbers, missing_required_headings: missing, forbidden_hits: forbiddenHits, replacement_characters: replacementCharacters },
}

mkdirSync(dirname(reportPath), { recursive: true })
if (dryRun) {
  writeFileSync(reportPath, JSON.stringify(baseReport, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify(baseReport, null, 2))
} else {
  if (!existsSync(backupPath)) writeFileSync(backupPath, JSON.stringify(before, null, 2) + '\n', 'utf8')
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
    after: { updated_at: reread.mis_a_jour, characters: reread.valeur.length, lines: reread.valeur.split('\n').length, sha256: sha(reread.valeur) },
    exact_match: sha(reread.valeur) === sha(charter),
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify(report, null, 2))
}
