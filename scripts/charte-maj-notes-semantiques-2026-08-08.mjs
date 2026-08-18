import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const root = resolve(import.meta.dirname, '..')
const canonicalPath = resolve(root, 'charte', 'CHARTE_IA.md')
const auditDir = resolve(root, 'audit', 'charte-2026-08-08-notes-semantiques')
const backupPath = resolve(auditDir, 'sauvegarde-charte-ia-avant.json')
const proposalPath = resolve(auditDir, 'charte-proposee.md')
const reportPath = resolve(auditDir, apply ? 'rapport-publication.json' : 'rapport-mode-blanc.json')

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/gu, '')]),
)

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variables Supabase absentes')
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: before, error: beforeError } = await db
  .from('parametres')
  .select('cle,valeur,mis_a_jour')
  .eq('cle', 'charte_ia')
  .single()
if (beforeError) throw beforeError

const active = String(before.valeur ?? '').replace(/\r\n/gu, '\n')
if (active.length < 100000) throw new Error('Charte active absente ou tronquée')

const anchor = `### 13.3 Placement

L’appel suit immédiatement le mot, le groupe ou le signe annoté, sans espace. Devant un guillemet fermant, il reste à l’intérieur. Son déplacement ne doit pas modifier la portée de la note.
`

const addition = `
### 13.4 Structure interne et mise en forme sémantique

La mise en forme d’une note suit la fonction de ses éléments, non leur seule position dans la page. La prose de commentaire, les citations, les citations en vers et les références bibliographiques ou attributions doivent rester distinguables dans les artefacts de travail et les exports.

Lorsqu’une note contient une citation en vers, son caractère versifié est une donnée éditoriale. Conserver l’ordre des vers et leurs retours à la ligne ; un vers ne fusionne jamais avec le suivant. Le document de travail et le rendu appliquent à cette citation un style de note versifiée distinct de la prose environnante. Le balisage ou la structure qui porte cette distinction doit survivre jusqu’à la segmentation et à l’import.

Une référence bibliographique courte ou une attribution qui porte sur une citation est placée immédiatement après le passage qu’elle identifie, dans le même bloc logique. Une position isolée, centrée ou alignée à droite dans le fac-similé n’est pas reproduite lorsqu’elle relève seulement de la composition typographique. Le texte de la référence, son ordre et ses enrichissements sémantiques sont conservés.
`

if ((active.match(/### 13\.3 Placement/gu) ?? []).length !== 1) {
  throw new Error('Ancre §13.3 absente ou ambiguë')
}
if (active.includes('### 13.4 Structure interne et mise en forme sémantique')) {
  throw new Error('La règle §13.4 est déjà présente')
}
if (!active.includes(anchor)) throw new Error('Le contenu attendu du §13.3 a changé')

const proposed = active.replace(anchor, anchor + addition)
const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')
const headings = [...proposed.matchAll(/^#{2,6}\s+(.+)$/gmu)].map((match) => match[1].trim())
const duplicateHeadings = [...new Set(headings.filter((heading, index) => headings.indexOf(heading) !== index))]
const numberedHeadings = headings.map((heading) => heading.match(/^(\d+(?:\.\d+)*)\.?\s/u)?.[1]).filter(Boolean)
const duplicateNumbers = [...new Set(numberedHeadings.filter((number, index) => numberedHeadings.indexOf(number) !== index))]
const checks = {
  exact_new_heading_count: (proposed.match(/### 13\.4 Structure interne et mise en forme sémantique/gu) ?? []).length,
  duplicate_headings: duplicateHeadings,
  duplicate_heading_numbers: duplicateNumbers,
  replacement_characters: (proposed.match(/\uFFFD/gu) ?? []).length,
  required_terms: {
    note_versifiee: proposed.includes('style de note versifiée'),
    retours_a_la_ligne: proposed.includes('retours à la ligne'),
    reference_apres_citation: proposed.includes('immédiatement après le passage qu’elle identifie'),
    refus_geometrie: proposed.includes('centrée ou alignée à droite'),
    survie_segmentation_import: proposed.includes('survivre jusqu’à la segmentation et à l’import'),
  },
}

if (
  checks.exact_new_heading_count !== 1 ||
  checks.duplicate_headings.length ||
  checks.duplicate_heading_numbers.length ||
  checks.replacement_characters ||
  Object.values(checks.required_terms).some((value) => !value)
) {
  throw new Error(`Échec des contrôles : ${JSON.stringify(checks, null, 2)}`)
}

mkdirSync(auditDir, { recursive: true })
writeFileSync(proposalPath, proposed, 'utf8')

const localBefore = existsSync(canonicalPath) ? readFileSync(canonicalPath, 'utf8') : ''
const baseReport = {
  mode: apply ? 'publication' : 'mode_blanc',
  source: 'public.parametres[charte_ia]',
  canonical_path: canonicalPath,
  proposal_path: proposalPath,
  before: {
    mis_a_jour: before.mis_a_jour,
    characters: active.length,
    lines: active.split('\n').length,
    sha256: sha256(active),
  },
  local_before: {
    characters: localBefore.length,
    lines: localBefore ? localBefore.split(/\r?\n/u).length : 0,
    sha256: localBefore ? sha256(localBefore.replace(/\r\n/gu, '\n')) : null,
    matches_active: localBefore.replace(/\r\n/gu, '\n') === active,
  },
  proposed: {
    characters: proposed.length,
    lines: proposed.split('\n').length,
    sha256: sha256(proposed),
    added_characters: proposed.length - active.length,
    added_lines: proposed.split('\n').length - active.split('\n').length,
  },
  checks,
}

if (!apply) {
  writeFileSync(reportPath, `${JSON.stringify(baseReport, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(baseReport, null, 2))
} else {
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, `${JSON.stringify(before, null, 2)}\n`, 'utf8')
  }

  const nextTimestamp = new Date().toISOString()
  const { data: updated, error: updateError } = await db
    .from('parametres')
    .update({ valeur: proposed, mis_a_jour: nextTimestamp })
    .eq('cle', 'charte_ia')
    .eq('mis_a_jour', before.mis_a_jour)
    .select('cle,valeur,mis_a_jour')
    .single()
  if (updateError) throw updateError

  const { data: reread, error: rereadError } = await db
    .from('parametres')
    .select('cle,valeur,mis_a_jour')
    .eq('cle', 'charte_ia')
    .single()
  if (rereadError) throw rereadError

  const rereadValue = String(reread.valeur ?? '').replace(/\r\n/gu, '\n')
  if (String(updated.valeur ?? '').replace(/\r\n/gu, '\n') !== proposed || rereadValue !== proposed) {
    throw new Error('La relecture de la charte publiée diffère de la proposition')
  }

  writeFileSync(canonicalPath, rereadValue, 'utf8')

  const report = {
    ...baseReport,
    backup_path: backupPath,
    after: {
      mis_a_jour: reread.mis_a_jour,
      characters: rereadValue.length,
      lines: rereadValue.split('\n').length,
      sha256: sha256(rereadValue),
    },
    exact_database_match: sha256(rereadValue) === sha256(proposed),
    exact_local_match: sha256(readFileSync(canonicalPath, 'utf8').replace(/\r\n/gu, '\n')) === sha256(proposed),
  }
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
}
