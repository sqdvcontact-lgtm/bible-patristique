// ============================================================================
// Import de l'ossature canonique (versets_canon) + traduction-référent Crampon
// (versets_v2) depuis FreCrampon.json (dépôt scrollmapper, domaine public).
//
// Numérotation canonique = AELF (grec pour les psaumes, hébraïque ailleurs).
// Crampon = numérotation hébraïque native (ch_orig/v_orig) → mappée au canon.
//
// Lance : node scripts/import-ossature-crampon.mjs
// Credentials lus depuis .env.local (jamais en dur).
// ============================================================================
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RACINE = join(__dirname, '..')
const CRAMPON = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/json/FreCrampon.json'
const TRAD_ID = 'TR0003'

// ── .env.local ──────────────────────────────────────────────────────────────
function chargerEnv() {
  const txt = readFileSync(join(RACINE, '.env.local'), 'utf8')
  const env = {}
  for (const ligne of txt.split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}
const env = chargerEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Mapping noms anglais (Crampon) → codes livres ───────────────────────────
const CODE = {
  "Genesis":"GEN","Exodus":"EXO","Leviticus":"LEV","Numbers":"NUM","Deuteronomy":"DEU",
  "Joshua":"JOS","Judges":"JDG","Ruth":"RUT","I Samuel":"1SA","II Samuel":"2SA",
  "I Kings":"1KI","II Kings":"2KI","I Chronicles":"1CH","II Chronicles":"2CH",
  "Ezra":"EZR","Nehemiah":"NEH","Tobit":"TOB","Judith":"JDT","Esther":"EST",
  "I Maccabees":"1MA","II Maccabees":"2MA","Job":"JOB","Psalms":"PSA","Proverbs":"PRO",
  "Ecclesiastes":"ECC","Song of Solomon":"SNG","Wisdom":"WIS","Sirach":"SIR",
  "Isaiah":"ISA","Jeremiah":"JER","Lamentations":"LAM","Baruch":"BAR","Ezekiel":"EZK",
  "Daniel":"DAN","Hosea":"HOS","Joel":"JOL","Amos":"AMO","Obadiah":"OBA","Jonah":"JON",
  "Micah":"MIC","Nahum":"NAM","Habakkuk":"HAB","Zephaniah":"ZEP","Haggai":"HAG",
  "Zechariah":"ZEC","Malachi":"MAL","Matthew":"MAT","Mark":"MRK","Luke":"LUK","John":"JHN",
  "Acts":"ACT","Romans":"ROM","I Corinthians":"1CO","II Corinthians":"2CO","Galatians":"GAL",
  "Ephesians":"EPH","Philippians":"PHP","Colossians":"COL","I Thessalonians":"1TH",
  "II Thessalonians":"2TH","I Timothy":"1TI","II Timothy":"2TI","Titus":"TIT","Philemon":"PHM",
  "Hebrews":"HEB","James":"JAS","I Peter":"1PE","II Peter":"2PE","I John":"1JN","II John":"2JN",
  "III John":"3JN","Jude":"JUD","Revelation of John":"REV"
}

// ── Correspondance psaumes Hébreu → AELF (grec), vérifiée sur aelf.org ───────
function makePsaMapper(nb9, nb114) {
  return (ch, v) => {
    if (ch <= 8) return [ch, v]
    if (ch === 9) return [9, v]
    if (ch === 10) return [9, v + nb9]          // fusion 9+10
    if (ch >= 11 && ch <= 113) return [ch - 1, v]
    if (ch === 114) return [113, v]
    if (ch === 115) return [113, v + nb114]      // fusion 114+115
    if (ch === 116) return v <= 9 ? [114, v] : [115, v]   // scission ; garde n° héb
    if (ch >= 117 && ch <= 146) return [ch - 1, v]
    if (ch === 147) return v <= 11 ? [146, v] : [147, v]  // scission ; garde n° héb
    return [ch, v]                                // 148-150
  }
}

async function insererParLots(table, rows, taille = 1000) {
  for (let i = 0; i < rows.length; i += taille) {
    const lot = rows.slice(i, i + taille)
    const { error } = await sb.from(table).insert(lot)
    if (error) throw new Error(`${table} [${i}] : ${error.message}`)
    process.stdout.write(`\r  ${table} : ${Math.min(i + taille, rows.length)}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function main() {
  console.log('Lecture de FreCrampon.json…')
  const data = JSON.parse(readFileSync(CRAMPON, 'utf8'))

  // ordre des livres (depuis la table livres)
  const { data: livres, error: eL } = await sb.from('livres').select('code, ordre')
  if (eL) throw new Error(eL.message)
  const ordreLivre = Object.fromEntries(livres.map(l => [l.code, l.ordre]))

  // offsets de fusion (nb versets Héb 9 et Héb 114 chez Crampon)
  const psa = data.books.find(b => b.name === 'Psalms')
  const nbVerses = (c) => (psa.chapters.find(ch => ch.chapter === c)?.verses.length ?? 0)
  const nb9 = nbVerses(9), nb114 = nbVerses(114)
  console.log(`Offsets fusion psaumes : Héb 9 = ${nb9} v, Héb 114 = ${nb114} v`)
  const mapPsa = makePsaMapper(nb9, nb114)

  const canon = []
  const v2 = []
  let ignoresLivres = []

  for (const livre of data.books) {
    const code = CODE[livre.name]
    if (!code) { ignoresLivres.push(livre.name); continue }
    for (const chap of livre.chapters) {
      const ch = chap.chapter
      for (const vs of chap.verses) {
        const v = vs.verse
        const [chCanon, vCanon] = code === 'PSA' ? mapPsa(ch, v) : [ch, v]
        const id = `${code}.${chCanon}.${vCanon}`
        const ordre = (ordreLivre[code] ?? 999) * 1e6 + chCanon * 1000 + vCanon
        canon.push({ id, livre: code, ch_canon: chCanon, v_canon: vCanon, ordre,
                     est_suscription: false, ch_heb: ch, v_heb: v })
        v2.push({ trad_id: TRAD_ID, livre: code, ch_orig: ch, v_orig: v,
                  est_suscription: false, texte: vs.text, canon_id: id,
                  alignement_verifie: false })
      }
    }
  }

  // détection de collisions de canon_id (ne devrait pas arriver)
  const vus = new Set(), collisions = []
  for (const c of canon) { if (vus.has(c.id)) collisions.push(c.id); else vus.add(c.id) }
  if (collisions.length) console.log(`⚠ ${collisions.length} collisions canon_id (ex. ${collisions.slice(0,5).join(', ')})`)

  console.log(`À insérer : ${canon.length} versets_canon, ${v2.length} versets_v2`)
  if (ignoresLivres.length) console.log(`Livres ignorés (non mappés) : ${ignoresLivres.join(', ')}`)

  console.log('Insertion versets_canon…')
  await insererParLots('versets_canon', canon)
  console.log('Insertion versets_v2 (Crampon référent)…')
  await insererParLots('versets_v2', v2)

  // marquer Crampon comme référent
  await sb.from('traductions').update({ est_referent: true, schema_numerotation: 'hebreu' }).eq('trad_id', TRAD_ID)

  console.log('\n✓ Terminé.')
}
main().catch(e => { console.error('\n✗', e.message); process.exit(1) })
