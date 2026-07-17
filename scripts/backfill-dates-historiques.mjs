/**
 * Backfill dates historiques structurees.
 * Usage: node scripts/backfill-dates-historiques.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split(/\r?\n/)
    .filter(line => line.includes('=') && !line.trim().startsWith('#'))
    .map(line => {
      const eq = line.indexOf('=')
      return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const LONG_DASHES = /[\u2010-\u2015\u2212]/g
const SPACES = /\s+/g
const PREFIX_VERS = /^(?:v\.?|vers)(?=\s|\d|$)\s*/i
const PREFIX_CIRCA = /^(?:c\.?|ca\.?|circa|env\.?|environ)(?=\s|\d|$)\s*/i

function clean(value) {
  return String(value ?? '')
    .replace(LONG_DASHES, '-')
    .replace(SPACES, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim()
}

function parseBound(value, inheritedPrecision = null, inheritedBeforeChrist = false) {
  const original = clean(value)
  if (!original) return null

  const beforeChrist = inheritedBeforeChrist || /\bav\.?\s*j\.?\s*-?\s*c\.?\b/i.test(original)
  const withoutEra = original.replace(/\bav\.?\s*j\.?\s*-?\s*c\.?\b/ig, '').trim()
  const precision = PREFIX_VERS.test(withoutEra)
    ? 'vers'
    : PREFIX_CIRCA.test(withoutEra)
      ? 'vers'
      : inheritedPrecision || 'exacte'

  const withoutPrefix = withoutEra.replace(PREFIX_VERS, '').replace(PREFIX_CIRCA, '').trim()
  const match = withoutPrefix.match(/\d{1,4}/)
  if (!match) return null

  const annee = Number(match[0]) * (beforeChrist ? -1 : 1)
  return { annee, precision }
}

function parsePeriod(value) {
  const text = clean(value)
  if (!text) return null

  const beforeChrist = /\bav\.?\s*j\.?\s*-?\s*c\.?\b/i.test(text)
  const firstPrecision = PREFIX_VERS.test(text) || PREFIX_CIRCA.test(text) ? 'vers' : null
  const withoutEra = text.replace(/\bav\.?\s*j\.?\s*-?\s*c\.?\b/ig, '').trim()
  const pieces = withoutEra.split('-').map(piece => piece.trim()).filter(Boolean)

  if (pieces.length === 1) {
    const debut = parseBound(pieces[0], null, beforeChrist)
    return debut ? { debut, fin: null } : null
  }

  if (pieces.length === 2) {
    const debut = parseBound(pieces[0], null, beforeChrist)
    const fin = parseBound(pieces[1], firstPrecision, beforeChrist)
    return debut || fin ? { debut, fin } : null
  }

  return null
}

function formatBound(bound) {
  if (!bound) return ''
  const year = String(bound.annee)
  if (bound.precision === 'vers') return `Vers ${year}`
  if (bound.precision === 'circa') return `Vers ${year}`
  return year
}

function normalizeDateText(value) {
  if (value === null || value === undefined || value === '') return null
  const period = parsePeriod(value)
  if (period?.debut && period?.fin) return `${formatBound(period.debut)}-${formatBound(period.fin)}`
  if (period?.debut || period?.fin) return formatBound(period.debut ?? period.fin)
  const text = clean(value)
    .replace(PREFIX_VERS, 'Vers ')
    .replace(PREFIX_CIRCA, 'Vers ')
  return text || null
}

function boundColumns(period, prefix) {
  return {
    [`${prefix}_debut_annee`]: period?.debut?.annee ?? null,
    [`${prefix}_debut_precision`]: period?.debut?.precision ?? null,
    [`${prefix}_fin_annee`]: period?.fin?.annee ?? null,
    [`${prefix}_fin_precision`]: period?.fin?.precision ?? null,
  }
}

async function selectAll(table, columns, orderColumn) {
  const rows = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, to)

    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  return rows
}

async function updateRows({ table, pk, columns, buildPayload }) {
  const rows = await selectAll(table, columns, pk)
  const batchSize = 25
  let changed = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await Promise.all(batch.map(async row => {
      const payload = buildPayload(row)
      if (!payload || Object.keys(payload).length === 0) return

      const { error } = await supabase.from(table).update(payload).eq(pk, row[pk])
      if (error) throw new Error(`${table} ${row[pk]}: ${error.message}`)
      changed += 1
    }))
  }

  console.log(`${table}: ${changed}/${rows.length} lignes mises a jour`)
}

await updateRows({
  table: 'auteurs',
  pk: 'id_auteur',
  columns: 'id_auteur, dates, date_naissance, date_mort',
  buildPayload: row => {
    const naissance = parsePeriod(row.date_naissance)?.debut
    const mort = parsePeriod(row.date_mort)?.debut
    const fallback = parsePeriod(row.dates)
    const period = {
      debut: naissance ?? fallback?.debut ?? null,
      fin: mort ?? fallback?.fin ?? null,
    }

    return {
      dates: normalizeDateText(row.dates),
      date_naissance: normalizeDateText(row.date_naissance),
      date_mort: normalizeDateText(row.date_mort),
      ...boundColumns(period, 'date'),
    }
  },
})

await updateRows({
  table: 'oeuvres',
  pk: 'id_oeuvre',
  columns: 'id_oeuvre, date_publication, date_composition',
  buildPayload: row => ({
    date_publication: normalizeDateText(row.date_publication),
    date_composition: normalizeDateText(row.date_composition),
    ...boundColumns(parsePeriod(row.date_composition), 'composition'),
    ...boundColumns(parsePeriod(row.date_publication), 'publication'),
  }),
})

await updateRows({
  table: 'traductions',
  pk: 'trad_id',
  columns: 'trad_id, dates, date_publication',
  buildPayload: row => ({
    dates: normalizeDateText(row.dates),
    date_publication: normalizeDateText(row.date_publication),
    ...boundColumns(parsePeriod(row.dates), 'traducteur'),
    ...boundColumns(parsePeriod(row.date_publication), 'publication'),
  }),
})

await updateRows({
  table: 'catalogue_notices',
  pk: 'id',
  columns: 'id, dates_auteur, date_oeuvre, annee_edition, date_edition, siecle_edition',
  buildPayload: row => {
    const editionValue = row.date_edition ?? row.annee_edition ?? row.siecle_edition
    return {
      dates_auteur: normalizeDateText(row.dates_auteur),
      date_oeuvre: normalizeDateText(row.date_oeuvre),
      date_edition: normalizeDateText(row.date_edition),
      ...boundColumns(parsePeriod(row.dates_auteur), 'auteur'),
      ...boundColumns(parsePeriod(row.date_oeuvre), 'oeuvre'),
      ...boundColumns(parsePeriod(editionValue), 'edition'),
    }
  },
})

console.log('Backfill termine.')
