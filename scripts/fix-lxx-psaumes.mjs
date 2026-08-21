/**
 * Correction du mapping LXX→TM pour les Psaumes (TR0007).
 *
 * Problème : le fichier Swete numérote les Psaumes selon la tradition grecque (LXX).
 * Notre table versets utilise la numérotation hébraïque/protestante (TM).
 * Le script d'import initial a utilisé les numéros LXX directement → mapping faux.
 *
 * Conversion standard LXX → TM :
 *   LXX  1–8        → TM  1–8   (identiques)
 *   LXX  9:1–21     → TM  9:1–21
 *   LXX  9:22–39    → TM 10:1–18  (Ps 9 LXX = Ps 9+10 TM fusionnés)
 *   LXX 10–112      → TM 11–113  (+1)
 *   LXX 113:1–8     → TM 114:1–8
 *   LXX 113:9–26    → TM 115:1–18
 *   LXX 114:1–9     → TM 116:1–9
 *   LXX 115:1–10    → TM 116:10–19
 *   LXX 116:1–2     → TM 117:1–2
 *   LXX 117–145     → TM 118–146  (+1)
 *   LXX 146:1–11    → TM 147:1–11
 *   LXX 147:1–9     → TM 147:12–20
 *   LXX 148–150     → TM 148–150  (identiques)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const q = l.indexOf('='); return [l.slice(0, q).trim(), l.slice(q + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const PSALMI_TXT = path.join(ROOT, '..', 'lxx-swete-master', 'lxx-swete-master', 'data', '27.Psalmi.txt')
const TRAD_ID = 'TR0007'

// ── Conversion numéro LXX → numéro TM ────────────────────────────────────────
function lxxToTM(lxxCh, lxxVer) {
  if (lxxCh <= 8) return [lxxCh, lxxVer]

  // Ps 9 LXX = Ps 9 + Ps 10 TM
  if (lxxCh === 9) {
    if (lxxVer <= 21) return [9, lxxVer]
    return [10, lxxVer - 21]   // 22→1, 23→2, …, 39→18
  }

  if (lxxCh >= 10 && lxxCh <= 112) return [lxxCh + 1, lxxVer]

  // Ps 113 LXX = Ps 114 + Ps 115 TM
  if (lxxCh === 113) {
    if (lxxVer <= 8) return [114, lxxVer]
    return [115, lxxVer - 8]   // 9→1, 10→2, …, 26→18
  }

  // Ps 114 LXX = Ps 116 TM v.1–9
  if (lxxCh === 114) {
    if (lxxVer <= 9) return [116, lxxVer]
    return null   // v.26 = en-tête Alléluia, ignorer
  }

  // Ps 115 LXX = Ps 116 TM v.10–19
  if (lxxCh === 115) {
    if (lxxVer <= 10) return [116, lxxVer + 9]   // 1→10, …, 10→19
    return null
  }

  // Ps 116 LXX = Ps 117 TM (2 versets)
  if (lxxCh === 116) {
    if (lxxVer <= 2) return [117, lxxVer]
    return null   // v.10 = en-tête Alléluia, ignorer
  }

  if (lxxCh >= 117 && lxxCh <= 145) return [lxxCh + 1, lxxVer]

  // Ps 146 LXX = Ps 147 TM v.1–11
  if (lxxCh === 146) return [147, lxxVer]

  // Ps 147 LXX = Ps 147 TM v.12–20
  if (lxxCh === 147) {
    if (lxxVer <= 9) return [147, lxxVer + 11]   // 1→12, …, 9→20
    return null   // v.10 ou 11 = en-tête, ignorer
  }

  if (lxxCh >= 148) return [lxxCh, lxxVer]

  return null
}

// ── Parser Psalmi.txt avec mapping TM ────────────────────────────────────────
function parserPsaumes() {
  const contenu = fs.readFileSync(PSALMI_TXT, 'utf8')
  const mots = new Map()   // clé = "tmCh:tmVer" → mots[]

  for (const ligne of contenu.split('\n')) {
    const trimmed = ligne.trim()
    if (!trimmed) continue
    const espIdx = trimmed.indexOf(' ')
    if (espIdx === -1) continue
    const ref = trimmed.slice(0, espIdx)
    const mot = trimmed.slice(espIdx + 1).trim()
    if (!mot) continue

    const parties = ref.split('.')
    if (parties.length !== 3) continue
    const lxxCh  = parseInt(parties[1], 10)
    const lxxVer = parseInt(parties[2], 10)
    if (isNaN(lxxCh) || isNaN(lxxVer)) continue

    const tm = lxxToTM(lxxCh, lxxVer)
    if (!tm) continue

    const cle = `${tm[0]}:${tm[1]}`
    if (!mots.has(cle)) mots.set(cle, [])
    mots.get(cle).push(mot)
  }

  const versets = new Map()
  for (const [cle, ms] of mots) versets.set(cle, ms.join(' '))
  return versets  // "tmCh:tmVer" → texte grec
}

// ── Charger les id_verset PSA ─────────────────────────────────────────────────
async function chargerPSA() {
  console.log('📥 Chargement des id_verset PSA…')
  const map = new Map()   // "ch:ver" → id_verset

  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('versets')
      .select('id_verset,chapitre,verset')
      .eq('livre', 'PSA')
      .order('id_verset')
      .range(offset, offset + 999)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data) map.set(`${r.chapitre}:${r.verset}`, r.id_verset)
    if (data.length < 1000) break
    offset += 1000
  }
  console.log(`  ✓ ${map.size} versets PSA en base`)
  return map
}

async function execSql(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw new Error(`exec_sql: ${error.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Correction Psaumes LXX (TR0007) : LXX → TM')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Parser avec mapping correct
  console.log('📖 Lecture de Psalmi.txt avec mapping LXX→TM…')
  const versetsLXX = parserPsaumes()
  console.log(`  ✓ ${versetsLXX.size} versets reconstruits\n`)

  // 2. Charger les id_verset PSA
  const idMap = await chargerPSA()

  // 3. Correspondances
  const lignes = []
  let sansCorre = 0
  for (const [cle, texte] of versetsLXX) {
    const id = idMap.get(cle)
    if (!id) { sansCorre++; continue }
    lignes.push({ id_verset: id, texte })
  }
  console.log(`\n📊 ${lignes.length} correspondances, ${sansCorre} sans équivalent TM (normal : en-têtes, versets absents de la LXX)`)

  // 4. (Effacement déjà effectué via MCP — étape sautée)

  // 5. Réimporter par batch de 50
  console.log(`\n⬆️  Réimport de ${lignes.length} versets (batch 50)…`)
  const sqlEscape = s => s.replace(/'/g, "''")
  let inseres = 0

  for (let i = 0; i < lignes.length; i += 50) {
    const batch = lignes.slice(i, i + 50)
    const values = batch.map(l => `('${sqlEscape(l.id_verset)}', '${sqlEscape(l.texte)}')`).join(',\n')
    await execSql(`
      UPDATE versets AS v
      SET "${TRAD_ID}" = data.texte
      FROM (VALUES ${values}) AS data(id_verset, texte)
      WHERE v.id_verset = data.id_verset;
    `)
    inseres += batch.length
    process.stdout.write(`\r  ${inseres}/${lignes.length}`)
  }

  console.log(`\n\n✅ Terminé — ${inseres} versets PSA corrigés.`)

  // 6. Vérification finale
  console.log('\n📊 Vérification :')
  const { data: check } = await supabase
    .from('versets')
    .select('chapitre')
    .eq('livre', 'PSA')
    .not(TRAD_ID, 'is', null)
  const chapsFilled = new Set(check?.map(r => r.chapitre) ?? [])
  console.log(`  Chapitres TM couverts : ${chapsFilled.size}/150`)
  const manquants = []
  for (let c = 1; c <= 150; c++) if (!chapsFilled.has(c)) manquants.push(c)
  if (manquants.length) console.log(`  Chapitres sans texte LXX : Ps ${manquants.join(', ')}`)
  else console.log('  Tous les chapitres ont au moins un verset.')
}

main().catch(e => { console.error(e); process.exit(1) })
