/**
 * Import du catalogue bibliographique dans catalogue_notices.
 * Usage : node scripts/seed-catalogue.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// Lire .env.local
const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const eq = l.indexOf('='); return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()] })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  process.exit(1)
}

// ── Parser CSV ────────────────────────────────────────────────────────────────
function parseCSV(content) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field); field = ''
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++
        current.push(field); field = ''
        if (current.length > 1) rows.push(current)
        current = []
      } else {
        field += ch
      }
    }
  }
  if (field || current.length > 0) { current.push(field); if (current.length > 1) rows.push(current) }
  return rows
}

// ── Lire et parser le CSV ─────────────────────────────────────────────────────
const CSV_PATH = 'C:/Users/quins/OneDrive/Bureau/bibliotheque_chretienne_0_1000_traductions_francaises_v29_catalogue_complet_2446_lignes_passe22_fusionnee.csv'
console.log('Lecture du CSV…')
const content = fs.readFileSync(CSV_PATH, 'utf8')
const [headerRow, ...dataRows] = parseCSV(content)

const col = Object.fromEntries(headerRow.map((h, i) => [h.trim(), i]))
const get = (row, name) => (row[col[name]] ?? '').trim()

console.log(`${dataRows.length} lignes à importer`)
console.log(`Colonnes disponibles : ${Object.keys(col).length}`)

const rows = []
for (const r of dataRows) {
  const idLigne = get(r, 'id_ligne_v20')
  const idOeuvre = get(r, 'id_oeuvre_stable')
  const titreStable = get(r, 'titre_oeuvre_stable') || get(r, 'titre_uniformise')
  const auteur = get(r, 'auteur')

  if (!idLigne || !idOeuvre || !titreStable || !auteur) continue

  const urlSource = get(r, 'v25_url_a_utiliser') || get(r, 'url_source_fr') || null
  const anneeRaw = get(r, 'annee_edition_num')
  const annee = anneeRaw && /^\d{4}$/.test(anneeRaw) ? parseInt(anneeRaw) : null
  const presenceBrut = get(r, 'presence_sur_le_site').toLowerCase()
  const surSite = presenceBrut.startsWith('oui') || presenceBrut === 'vrai'
  const scoreRaw = get(r, 'score_fiabilite')
  const score = scoreRaw ? parseFloat(scoreRaw) : null

  rows.push({
    id_ligne:            idLigne,
    id_auteur:           get(r, 'id_auteur') || null,
    auteur,
    dates_auteur:        get(r, 'dates_auteur') || null,
    id_oeuvre_stable:    idOeuvre,
    titre_stable:        titreStable,
    titre_original:      get(r, 'titre_original') || null,
    genre:               get(r, 'genre') || null,
    langue_originale:    get(r, 'langue_originale') || null,
    date_oeuvre:         get(r, 'date_oeuvre') || null,
    authenticite:        get(r, 'authenticite') || null,
    id_traduction:       get(r, 'id_traduction') || null,
    titre_edition:       get(r, 'titre_volume') || null,
    traducteur:          get(r, 'traducteur_uniformise') || get(r, 'traducteur') || null,
    annee_edition:       annee,
    siecle_edition:      get(r, 'siecle_edition') || null,
    editeur:             get(r, 'editeur') || null,
    collection_nom:      get(r, 'collection') || null,
    domaine_public:      get(r, 'domaine_public') || null,
    url_source:          urlSource,
    decision_import:     get(r, 'decision_import_normalisee') || null,
    niveau_verification: get(r, 'niveau_verification') || null,
    score_fiabilite:     isNaN(score) ? null : score,
    presence_sur_le_site: surSite,
    priorite:            get(r, 'priorite_integration') || null,
  })
}

console.log(`${rows.length} notices valides`)

// ── Insérer par lots ──────────────────────────────────────────────────────────
async function insertBatch(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalogue_notices`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erreur ${res.status}: ${err}`)
  }
}

const BATCH = 100
let done = 0
for (let i = 0; i < rows.length; i += BATCH) {
  await insertBatch(rows.slice(i, i + BATCH))
  done += Math.min(BATCH, rows.length - i)
  process.stdout.write(`\r${done}/${rows.length}`)
}
console.log('\nTerminé.')
