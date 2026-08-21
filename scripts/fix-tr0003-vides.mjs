// Correction des 13 vrais vides TR0003 (Crampon 1923)
// Source : bible_databases-master/formats/csv/FreCrampon.csv
// Tous les vides correspondent à des décalages de numérotation Vulgate/Protestant
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))


const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

const CSV = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/csv/FreCrampon.csv'

// Construire un index du CSV Crampon
const idx = {}
for (const line of readFileSync(CSV, 'utf8').split(/\r?\n/)) {
  const comma1 = line.indexOf(','), comma2 = line.indexOf(',', comma1 + 1)
  if (comma1 < 0 || comma2 < 0) continue
  const book = line.slice(0, comma1)
  const ch = parseInt(line.slice(comma1 + 1, comma2))
  const rest = line.slice(comma2 + 1)
  const comma3 = rest.indexOf(',')
  const v = parseInt(rest.slice(0, comma3))
  const text = rest.slice(comma3 + 1).trim().replace(/^"|"$/g, '').replace(/""/g, '"')
  idx[book + '|' + ch + '|' + v] = text
}

function crampon(book, ch, v) {
  return idx[book + '|' + ch + '|' + v] || null
}

// [livre_db, ch_db, v_db, book_csv, ch_csv, v_csv, note_livre, note_ch, note_v]
const corrections = [
  // I Chroniques 11:47 → Crampon 11:46 (fusion dans v46 après "(47 Vulgate)")
  // Le texte Crampon v46 contient les deux versets ; on extrait la partie v47
  ['1CH', 11, 47, null, null, null, 'I Chroniques', 11, 46, 'Eliel, Obed et Jasiel, de Masobia.'],

  // Deutéronome 5:31-33 → Crampon 5:28-30
  ['DEU', 5, 31, 'Deuteronomy', 5, 28, 'Deutéronome', 5, 28, null],
  ['DEU', 5, 32, 'Deuteronomy', 5, 29, 'Deutéronome', 5, 29, null],
  ['DEU', 5, 33, 'Deuteronomy', 5, 30, 'Deutéronome', 5, 30, null],

  // Josué 21:44-45 → Crampon 21:42-43
  ['JOS', 21, 44, 'Joshua', 21, 42, 'Josué', 21, 42, null],
  ['JOS', 21, 45, 'Joshua', 21, 43, 'Josué', 21, 43, null],

  // Juges 21:25 → Crampon 21:24
  ['JDG', 21, 25, 'Judges', 21, 24, 'Juges', 21, 24, null],

  // Ecclésiaste 7:29 → Crampon 7:28
  ['ECC', 7, 29, 'Ecclesiastes', 7, 28, 'Ecclésiaste', 7, 28, null],

  // Isaïe 38:22 → Crampon 38:21
  ['ISA', 38, 22, 'Isaiah', 38, 21, 'Isaïe', 38, 21, null],

  // Matthieu 17:27 → Crampon 17:26
  ['MAT', 17, 27, 'Matthew', 17, 26, 'Matthieu', 17, 26, null],

  // Marc 4:41 → Crampon 4:40 (fusionné)
  ['MRK', 4, 41, 'Mark', 4, 40, 'Marc', 4, 40, null],

  // Jean 11:57 → Crampon 11:56 (fusionné)
  ['JHN', 11, 57, 'John', 11, 56, 'Jean', 11, 56, null],

  // Actes 14:28 → Crampon 14:27
  ['ACT', 14, 28, 'Acts', 14, 27, 'Actes', 14, 27, null],
]

async function main() {
  console.log('=== CORRECTION 13 VIDES TR0003 (Crampon 1923) ===\n')
  let ok = 0, err = 0, notFound = 0

  for (const row of corrections) {
    const [ldb, cdb, vdb, bookCsv, chCsv, vCsv, noteLivre, noteCh, noteV, texteFixe] = row

    let raw
    if (texteFixe) {
      raw = texteFixe
    } else {
      raw = crampon(bookCsv, chCsv, vCsv)
      if (!raw) {
        console.log(`  ? ${ldb} ${cdb}:${vdb} — CSV ${bookCsv} ${chCsv}:${vCsv} introuvable`)
        notFound++
        continue
      }
    }

    const texte = `(${noteLivre} ${noteCh}, ${noteV} dans l'édition de Crampon) ${raw}`

    const { error } = await sb.from('versets')
      .update({ TR0003: texte })
      .eq('livre', ldb).eq('chapitre', cdb).eq('verset', vdb)

    if (error) {
      console.error(`  ✗ ${ldb} ${cdb}:${vdb} — ${error.message}`)
      err++
    } else {
      console.log(`  ✓ ${ldb} ${cdb}:${vdb}: ${texte.slice(0, 80)}…`)
      ok++
    }
  }

  console.log(`\n→ ${ok}/${corrections.length} corrigés, ${notFound} non trouvés, ${err} erreurs DB`)
}

main().catch(console.error)
