// Correction des 52 vrais vides TR0002 (Segond 1910) depuis fichiers USFM BibleCorps
// Source : https://github.com/BibleCorps/FRA-B-LSG1910-PD-UBS
// Tous les vides correspondent à des décalages de numérotation (Vulgate/LXX vs Protestant)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
)

const SCRATCHPAD = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/eb51ee95-a901-43b0-85ea-8a337c245bed/scratchpad'

function parseUsfm(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const chapters = {}
  let ch = 0
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line[0] === '\\' && line[1] === 'c' && line[2] === ' ') { ch = parseInt(line.slice(3)); continue }
    if (line[0] === '\\' && line[1] === 'v' && line[2] === ' ') {
      const rest = line.slice(3), si = rest.indexOf(' ')
      if (si < 0) continue
      const v = parseInt(rest.slice(0, si))
      let text = rest.slice(si + 1)
        .replace(/\\x[^\\]*\\x\*/g, '').replace(/\\f[^\\]*\\f\*/g, '')
        .replace(/\\[a-z]+\d*\*/g, '').replace(/\\[a-z]+\d*\s*/g, '')
        .replace(/\+\s*\d+:\d+\s*/g, '').trim()
      if (!chapters[ch]) chapters[ch] = {}
      chapters[ch][v] = text
    }
  }
  return chapters
}

const idx = {
  '1CH': parseUsfm(`${SCRATCHPAD}/LSG_1CH.sfm`),
  'DAN': parseUsfm(`${SCRATCHPAD}/LSG_DAN.sfm`),
  'ECC': parseUsfm(`${SCRATCHPAD}/LSG_ECC.sfm`),
  'HOS': parseUsfm(`${SCRATCHPAD}/LSG_HOS.sfm`),
  'JOB': parseUsfm(`${SCRATCHPAD}/LSG_JOB.sfm`),
  'JOL': parseUsfm(`${SCRATCHPAD}/LSG_JOL.sfm`),
  'MAL': parseUsfm(`${SCRATCHPAD}/LSG_MAL.sfm`),
}

// [livre_db, ch_db, v_db, livre_usfm, ch_usfm, v_usfm, note_livre, note_ch, note_v]
// note_livre/ch/v = référence dans l'édition Segond à indiquer entre parenthèses
const mappings = [
  // 1 Chroniques 5:27-41 → USFM 1CH 6:1-15
  ...Array.from({length: 15}, (_, i) => ['1CH', 5, 27+i, '1CH', 6, 1+i, 'I Chroniques', 6, 1+i]),
  // Daniel 3:31-33 → USFM DAN 4:1-3
  ['DAN', 3, 31, 'DAN', 4, 1, 'Daniel', 4, 1],
  ['DAN', 3, 32, 'DAN', 4, 2, 'Daniel', 4, 2],
  ['DAN', 3, 33, 'DAN', 4, 3, 'Daniel', 4, 3],
  // Ecclésiaste 11:9-10 → USFM ECC 12:1-2
  ['ECC', 11, 9,  'ECC', 12, 1, 'Ecclésiaste', 12, 1],
  ['ECC', 11, 10, 'ECC', 12, 2, 'Ecclésiaste', 12, 2],
  // Osée 14:10 → USFM HOS 14:9
  ['HOS', 14, 10, 'HOS', 14, 9, 'Osée', 14, 9],
  // Job 34:37 → USFM JOB 34:36
  ['JOB', 34, 37, 'JOB', 34, 36, 'Job', 34, 36],
  // Job 38:39-41 → USFM JOB 39:1-3
  ['JOB', 38, 39, 'JOB', 39, 1, 'Job', 39, 1],
  ['JOB', 38, 40, 'JOB', 39, 2, 'Job', 39, 2],
  ['JOB', 38, 41, 'JOB', 39, 3, 'Job', 39, 3],
  // Joël 4:1-21 → USFM JOL 3:1-21
  ...Array.from({length: 21}, (_, i) => ['JOL', 4, 1+i, 'JOL', 3, 1+i, 'Joël', 3, 1+i]),
  // Malachie 3:19-24 → USFM MAL 4:1-6
  ...Array.from({length: 6}, (_, i) => ['MAL', 3, 19+i, 'MAL', 4, 1+i, 'Malachie', 4, 1+i]),
]

async function main() {
  console.log(`=== CORRECTION ${mappings.length} VIDES TR0002 (Segond 1910) ===\n`)
  let ok = 0, err = 0, notFound = 0

  for (const [ldb, cdb, vdb, lusfm, cusfm, vusfm, noteLivre, noteCh, noteV] of mappings) {
    const raw = idx[lusfm]?.[cusfm]?.[vusfm]
    if (!raw) {
      console.log(`  ? ${ldb} ${cdb}:${vdb} — USFM ${lusfm} ${cusfm}:${vusfm} introuvable`)
      notFound++
      continue
    }
    const texte = `(${noteLivre} ${noteCh}, ${noteV} dans l'édition de Segond) ${raw}`

    const { error } = await sb.from('versets')
      .update({ TR0002: texte })
      .eq('livre', ldb).eq('chapitre', cdb).eq('verset', vdb)

    if (error) {
      console.error(`  ✗ ${ldb} ${cdb}:${vdb} — ${error.message}`)
      err++
    } else {
      console.log(`  ✓ ${ldb} ${cdb}:${vdb}: ${texte.slice(0, 70)}…`)
      ok++
    }
  }

  console.log(`\n→ ${ok}/${mappings.length} corrigés, ${notFound} non trouvés, ${err} erreurs DB`)
}

main().catch(console.error)
