// Reconstruction TR0004 (Vulgate) — tous les vides restants hors PSA
// Sources : TVTMS (STEPBible, CC BY 4.0) + Vulgate.csv (bible_databases)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))


const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

const CSV = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/csv/Vulgate.csv'

// ─── Index Vulgate.csv ────────────────────────────────────────────────────────
const vulg = {}
for (const line of readFileSync(CSV, 'utf8').split(/\r?\n/)) {
  const p = line.split(',')
  if (p.length < 4) continue
  const book = p[0], ch = parseInt(p[1]), v = parseInt(p[2]), text = p.slice(3).join(',').trim()
  if (!book || isNaN(ch) || isNaN(v) || !text) continue
  if (!vulg[book]) vulg[book] = {}
  if (!vulg[book][ch]) vulg[book][ch] = {}
  vulg[book][ch][v] = text
}

// ─── DB livre → nom dans Vulgate.csv ─────────────────────────────────────────
const BOOK_CSV = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers',
  DEU: 'Deuteronomy', JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth',
  '1SA': 'I Samuel', '2SA': 'II Samuel', '1KI': 'I Kings', '2KI': 'II Kings',
  '1CH': 'I Chronicles', '2CH': 'II Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther',
  TOB: 'Tobit', JDT: 'Judith',
  '1MA': 'I Maccabees', '2MA': 'II Maccabees',
  JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs', ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon', WIS: 'Wisdom', SIR: 'Sirach',
  ISA: 'Isaiah', JER: 'Jeremiah', LAM: 'Lamentations', BAR: 'Baruch',
  EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah',
  NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai',
  ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John',
  ACT: 'Acts', ROM: 'Romans', '1CO': 'I Corinthians', '2CO': 'II Corinthians',
  GAL: 'Galatians', EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians',
  '1TH': 'I Thessalonians', '2TH': 'II Thessalonians',
  '1TI': 'I Timothy', '2TI': 'II Timothy', TIT: 'Titus', PHM: 'Philemon',
  HEB: 'Hebrews', JAS: 'James', '1PE': 'I Peter', '2PE': 'II Peter',
  '1JN': 'I John', '2JN': 'II John', '3JN': 'III John',
  JUD: 'Jude', REV: 'Revelation of John',
}

// ─── Mappings TVTMS (hébreu/protestant → latin/Vulgate) ──────────────────────
// Retourne : { lat_book_csv, lat_ch, lat_v, note } si trouvable avec décalage
//          : null si absent de la Vulgate (avec certitude)
//          : undefined si on ignore → chercher directement dans Vulgate.csv
function mapHebToLat(livre, ch, v) {
  switch (livre) {

    // JOL : Hébreu ch.4 → Vulgate ch.3 (même numéro de verset)
    case 'JOL':
      if (ch === 4 && v >= 1 && v <= 21)
        return { lat_book_csv: 'Joel', lat_ch: 3, lat_v: v,
          note: `(Joël 3, ${v} dans la Vulgate) ` }
      break

    // MAL : Hébreu 3:19-24 → Vulgate 4:1-6
    case 'MAL':
      if (ch === 3 && v >= 19 && v <= 24) {
        const lv = v - 18
        return { lat_book_csv: 'Malachi', lat_ch: 4, lat_v: lv,
          note: `(Malachie 4, ${lv} dans la Vulgate) ` }
      }
      break

    // NUM : Hébreu 17:1-15 → Vulgate 16:36-50 ; Hébreu 17:16-28 → Vulgate 17:1-13
    case 'NUM':
      if (ch === 17 && v >= 1 && v <= 15) {
        const lv = v + 35
        return { lat_book_csv: 'Numbers', lat_ch: 16, lat_v: lv,
          note: `(Nombres 16, ${lv} dans la Vulgate) ` }
      }
      if (ch === 17 && v >= 16 && v <= 28) {
        const lv = v - 15
        return { lat_book_csv: 'Numbers', lat_ch: 17, lat_v: lv,
          note: `(Nombres 17, ${lv} dans la Vulgate) ` }
      }
      // Versets absents : fin de chapitre non repris dans la Vulgate
      if ((ch === 11 && v === 35) || (ch === 12 && v === 16) || (ch === 25 && v === 19))
        return null
      break

    // 1KI : Hébreu 5:19-32 → Vulgate 5:5-18
    // (Vulgate 5:1 = Hébreu 5:15, donc Hébreu 5:v → Vulgate 5:(v-14))
    case '1KI':
      if (ch === 5 && v >= 19 && v <= 32) {
        const lv = v - 14
        return { lat_book_csv: 'I Kings', lat_ch: 5, lat_v: lv,
          note: `(1 Rois 5, ${lv} dans la Vulgate) ` }
      }
      break

    // 1CH : Hébreu 5:27-41 → Vulgate 6:1-15
    case '1CH':
      if (ch === 5 && v >= 27 && v <= 41) {
        const lv = v - 26
        return { lat_book_csv: 'I Chronicles', lat_ch: 6, lat_v: lv,
          note: `(1 Chroniques 6, ${lv} dans la Vulgate) ` }
      }
      if ((ch === 11 && v === 47) || (ch === 12 && v === 41) || (ch === 20 && v === 8))
        return null
      break

    // NEH : décalages multiples
    case 'NEH':
      if (ch === 3 && v === 32) return null  // absent de la Vulgate (ch.3 s'arrête à v.31)
      if (ch === 3 && v >= 33 && v <= 38) {
        const lv = v - 32  // 33→1, …38→6
        return { lat_book_csv: 'Nehemiah', lat_ch: 4, lat_v: lv,
          note: `(Néhémie 4, ${lv} dans la Vulgate) ` }
      }
      if (ch === 10 && v === 40)
        return { lat_book_csv: 'Nehemiah', lat_ch: 10, lat_v: 39,
          note: `(Néhémie 10, 39 dans la Vulgate) ` }
      if (ch === 12 && v === 47)
        return { lat_book_csv: 'Nehemiah', lat_ch: 12, lat_v: 46,
          note: `(Néhémie 12, 46 dans la Vulgate) ` }
      break

    // EXO : décalages de plage + versets absents
    case 'EXO':
      if (ch === 7 && v >= 26 && v <= 29) {
        const lv = v - 25  // 26→1, 27→2, 28→3, 29→4
        return { lat_book_csv: 'Exodus', lat_ch: 8, lat_v: lv,
          note: `(Exode 8, ${lv} dans la Vulgate) ` }
      }
      if (ch === 21 && v === 37)
        return { lat_book_csv: 'Exodus', lat_ch: 22, lat_v: 1,
          note: `(Exode 22, 1 dans la Vulgate) ` }
      if (ch === 40 && (v === 37 || v === 38)) return null  // Vulgate s'arrête à 40:36
      break

    // HAG : Hébreu 1:15 → Vulgate 2:1
    case 'HAG':
      if (ch === 1 && v === 15)
        return { lat_book_csv: 'Haggai', lat_ch: 2, lat_v: 1,
          note: `(Aggée 2, 1 dans la Vulgate) ` }
      break

    // ZEC : Hébreu 2:14-17 → Vulgate 2:10-13
    // (Hébreu 2:5 = Vulgate 2:1 ; décalage = -4)
    case 'ZEC':
      if (ch === 2 && v >= 14 && v <= 17) {
        const lv = v - 4
        return { lat_book_csv: 'Zechariah', lat_ch: 2, lat_v: lv,
          note: `(Zacharie 2, ${lv} dans la Vulgate) ` }
      }
      break

    // MIC : Hébreu 4:14 → Vulgate 5:1
    case 'MIC':
      if (ch === 4 && v === 14)
        return { lat_book_csv: 'Micah', lat_ch: 5, lat_v: 1,
          note: `(Michée 5, 1 dans la Vulgate) ` }
      break

    // NAM : Hébreu 2:14 → Vulgate 2:13
    case 'NAM':
      if (ch === 2 && v === 14)
        return { lat_book_csv: 'Nahum', lat_ch: 2, lat_v: 13,
          note: `(Nahum 2, 13 dans la Vulgate) ` }
      break

    // HOS : deux décalages
    case 'HOS':
      if (ch === 2 && v === 25)
        return { lat_book_csv: 'Hosea', lat_ch: 2, lat_v: 23,
          note: `(Osée 2, 23 dans la Vulgate) ` }
      if (ch === 12 && v === 15)
        return { lat_book_csv: 'Hosea', lat_ch: 12, lat_v: 14,
          note: `(Osée 12, 14 dans la Vulgate) ` }
      break

    // JOB : Hébreu 40:29-32 → Vulgate 41:5-8 ; autres absents
    case 'JOB':
      if (ch === 40 && v >= 29 && v <= 32) {
        const lv = v - 24  // 29→5, 30→6, 31→7, 32→8
        return { lat_book_csv: 'Job', lat_ch: 41, lat_v: lv,
          note: `(Job 41, ${lv} dans la Vulgate) ` }
      }
      if (ch === 41 && v === 26) return null  // Vulgate ch.41 s'arrête à v.25
      if (ch === 42 && v === 17) return null  // Vulgate ch.42 s'arrête à v.16
      break

    // LEV : Hébreu 5:20-26 → Vulgate 6:1-7
    case 'LEV':
      if (ch === 5 && v >= 20 && v <= 26) {
        const lv = v - 19  // 20→1, …26→7
        return { lat_book_csv: 'Leviticus', lat_ch: 6, lat_v: lv,
          note: `(Lévitique 6, ${lv} dans la Vulgate) ` }
      }
      if (ch === 26 && v === 46) return null
      break

    // Cas absents confirmés pour d'autres livres
    case 'GEN':
      if ((ch === 5 && v === 32) || (ch === 32 && v === 33) ||
          (ch === 49 && v === 33) || (ch === 50 && v === 26)) return null
      break
    case '1SA':
      if (ch === 21 && v === 16) return null
      break
    case '2CH':
      if ((ch === 1 && v === 18) || (ch === 13 && v === 23)) return null
      break
    case '2KI':
      if (ch === 12 && v === 22) return null
      break
    case '2SA':
      if (ch === 19 && v === 44) return null
      break
    case 'DEU':
      if ((ch === 13 && v === 19) || (ch === 23 && v === 26) || (ch === 28 && v === 69)) return null
      break
    case 'ISA':
      if (ch === 8 && v === 23) return null  // = Vulgate 9:1 (déjà rempli)
      break
    case 'JER':
      if ((ch === 8 && v === 23) || (ch === 37 && v === 21)) return null
      break
    case 'SNG':
      if ((ch === 1 && v === 17) || (ch === 7 && v === 14)) return null
      break
    case 'SIR':
      if ((ch === 17 && v === 32) || (ch === 19 && v >= 29) || (ch === 26 && v === 29)) return null
      break
    case 'EZK':
      if ((ch === 2 && v === 10) || (ch === 21 && v >= 33)) return null
      break
    case 'JOS':
      if ((ch === 21 && v >= 44)) return null
      break
    case 'JDG':
      if (ch === 21 && v === 25) return null
      break
    case 'DAN':
      if (ch === 6 && v === 29) return null
      break
    case 'TOB':
      if (ch === 10 && v === 14) return null
      break
    case 'WIS':
      if (ch === 19 && v >= 21) return null
      break
    case 'MAT':
      if (ch === 17 && v === 27) return null
      break
    case 'MRK':
      if ((ch === 4 && v === 41) || (ch === 9 && v === 50)) return null
      break
    case 'ACT':
      if ((ch === 7 && v === 60) || (ch === 14 && v === 28)) return null
      break
    case '3JN':
      if (ch === 1 && v === 15) return null  // vide dans Vulgate.csv
      break
  }
  return undefined  // inconnu → tentative de lookup direct
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let vides = [], from = 0
  while (true) {
    const { data } = await sb.from('versets')
      .select('livre,chapitre,verset')
      .neq('livre', 'PSA')
      .is('TR0004', null)
      .not('TR0001', 'is', null)
      .order('livre').order('chapitre').order('verset')
      .range(from, from + 999)
    vides = vides.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  console.log(`=== RECONSTRUCTION TR0004 VIDES (${vides.length} lignes) ===\n`)

  let ok = 0, absent = 0, nocsv = 0, err = 0

  const BATCH = 50
  for (let i = 0; i < vides.length; i += BATCH) {
    const batch = vides.slice(i, i + BATCH)
    for (const row of batch) {
      const { livre, chapitre: ch, verset: v } = row

      const mapped = mapHebToLat(livre, ch, v)

      if (mapped === null) {
        // Absent confirmé de la Vulgate
        const noteText = `(absent de la Vulgate — ${livre} ${ch}, ${v} selon numérotation hébraïque)`
        const { error } = await sb.from('versets')
          .update({ TR0004: noteText })
          .eq('livre', livre).eq('chapitre', ch).eq('verset', v)
        if (error) { console.error(`✗ ${livre} ${ch}:${v} — ${error.message}`); err++ }
        else absent++
        continue
      }

      // Déterminer les coordonnées Vulgate
      let lat_book_csv, lat_ch, lat_v, note
      if (mapped !== undefined) {
        ;({ lat_book_csv, lat_ch, lat_v, note } = mapped)
      } else {
        lat_book_csv = BOOK_CSV[livre]
        lat_ch = ch
        lat_v = v
        note = ''
      }

      if (!lat_book_csv) {
        // Livre non présent dans la Vulgate (Énoch, Jubilés, etc.)
        nocsv++
        continue
      }

      const rawText = vulg[lat_book_csv]?.[lat_ch]?.[lat_v]

      if (!rawText) {
        // Pas trouvé → absent de notre source Vulgate
        const noteText = `(absent de la Vulgate — ${livre} ${ch}, ${v} selon numérotation hébraïque)`
        const { error } = await sb.from('versets')
          .update({ TR0004: noteText })
          .eq('livre', livre).eq('chapitre', ch).eq('verset', v)
        if (error) { console.error(`✗ ${livre} ${ch}:${v} — ${error.message}`); err++ }
        else absent++
        continue
      }

      const newText = (note || '') + rawText
      const { error } = await sb.from('versets')
        .update({ TR0004: newText })
        .eq('livre', livre).eq('chapitre', ch).eq('verset', v)

      if (error) {
        console.error(`✗ ${livre} ${ch}:${v} — ${error.message}`)
        err++
      } else {
        ok++
        if (ok <= 50 || mapped !== undefined)
          console.log(`✓ ${livre} ${ch}:${v}${mapped !== undefined ? ` → ${lat_book_csv} ${lat_ch}:${lat_v}` : ''}: ${newText.slice(0, 70)}`)
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`  ... ${i}/${vides.length} (ok=${ok} absent=${absent} nocsv=${nocsv} err=${err})`)
    }
  }

  console.log(`\n=== RÉSULTAT ===`)
  console.log(`Total vides traités : ${vides.length}`)
  console.log(`✓ Mis à jour (texte Vulgate) : ${ok}`)
  console.log(`~ Absents de la Vulgate      : ${absent}`)
  console.log(`○ Livres hors Vulgate.csv    : ${nocsv}`)
  console.log(`✗ Erreurs                    : ${err}`)
}

main().catch(console.error)
