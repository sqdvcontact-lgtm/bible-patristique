import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const repo = process.cwd()
const stage = path.join(repo, 'work', 'boece', 'mirandol', 'supabase_import_effectue_20260809')
const delivery = path.join(stage, 'delivery')

const copies = [
  ['supabase/migrations/20260809143000_version_textuelle_multiversion.sql', 'migrations/20260809143000_version_textuelle_multiversion.sql'],
  ['supabase/migrations/20260809144000_import_mirandol_rpc.sql', 'migrations/20260809144000_import_mirandol_rpc.sql'],
  ['supabase/migrations/20260809145000_indexer_relations_multiversion.sql', 'migrations/20260809145000_indexer_relations_multiversion.sql'],
  ['scripts/mirandol/import-mirandol-1861.mjs', 'importer/import-mirandol-1861.mjs'],
  ['scripts/mirandol/build-import-delivery.mjs', 'importer/build-import-delivery.mjs'],
  ['sql/rollback_import_mirandol.sql', 'rollbacks/rollback_import_mirandol.sql'],
  ['sql/rollback_schema_version_textuelle.sql', 'rollbacks/rollback_schema_version_textuelle.sql'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/import_execution_report.json', 'manifests/import_execution_report.json'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/import_payload_validation.json', 'manifests/import_payload_validation.json'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/input/segmentation_manifest_complete_corrigee.json', 'manifests/segmentation_manifest_complete_corrigee.json'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/input/source_units_mirandol_complete_corrigee.json', 'manifests/source_units_mirandol_complete_corrigee.json'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/input/note_anchor_manifest_complete_corrigee.json', 'manifests/note_anchor_manifest_complete_corrigee.json'],
  ['work/boece/mirandol/supabase_import_effectue_20260809/input/logical_groups_relations.json', 'manifests/logical_groups_relations.json'],
]

for (const [source, target] of copies) {
  const destination = path.join(delivery, target)
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(path.join(repo, source), destination)
}

await copyFile(
  'C:/Users/Sébastien/Downloads/instructions_codex_import_supabase_mirandol_final.txt',
  path.join(delivery, 'reports', 'instructions_codex_import_supabase_mirandol_final.txt'),
)

const appFiles = [
  'app/admin/SectionRemplacerSegments.tsx',
  'app/admin/adminShared.tsx',
  'app/admin/adminTypes.ts',
  'app/admin/page.tsx',
  'app/api/admin/export-segments/route.ts',
  'app/api/admin/import-oeuvre/route.ts',
  'app/api/admin/import-segments/route.ts',
  'app/api/admin/oeuvre-supprimer/route.ts',
  'app/oeuvre/[id]/BoutonsSegment.tsx',
  'app/oeuvre/[id]/OeuvreClient.tsx',
  'app/oeuvre/[id]/oeuvreTypes.ts',
  'app/oeuvre/[id]/page.tsx',
  'app/recherche/RechercheClient.tsx',
]
const diff = execFileSync('git', ['diff', '--', ...appFiles], {
  cwd: repo,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
await writeFile(path.join(delivery, 'app', 'REPOSITORY_DIFF.patch'), diff, 'utf8')

async function filesUnder(root, relative = '') {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(root, child))
    else if (child.replaceAll('\\', '/') !== 'SHA256SUMS.txt') files.push(child)
  }
  return files
}

const allFiles = (await filesUnder(delivery)).sort((a, b) => a.localeCompare(b, 'fr'))
const sums = []
for (const relative of allFiles) {
  const bytes = await readFile(path.join(delivery, relative))
  const digest = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  sums.push(`${digest}  ${relative.replaceAll('\\', '/')}`)
}
await writeFile(path.join(delivery, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`, 'utf8')

process.stdout.write(`${delivery}\n${allFiles.length + 1} files\n`)
