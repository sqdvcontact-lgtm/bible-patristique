/**
 * Import de la Septante (Swete LXX) dans la table versets.
 * Source : github.com/nathans/lxx-swete (CC BY-SA 4.0)
 *
 * Usage : node scripts/import-lxx.mjs
 *
 * Ce script :
 *  1. Parse les fichiers TXT (un mot par ligne, format `livre.chapitre.verset MOT`)
 *  2. Reconstruit les versets en joignant les mots
 *  3. Requête Supabase pour obtenir tous les id_verset existants
 *  4. Crée la colonne LXX (prochain TR000X) et la ligne dans `traductions`
 *  5. Met à jour les versets par batch de 500
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// ── Lire .env.local ───────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const eq = l.indexOf('='); return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()] })
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Variables Supabase manquantes dans .env.local'); process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Mapping fichiers Swete → codes OSIS de la table versets ──────────────────
// Seuls les livres canoniques présents dans la table versets sont inclus.
// Les deutérocanoniques (Tobie, Judith, Maccabées, etc.) sont ignorés pour
// cette première passe — la table ne les contient pas encore.
const MAPPING = {
  '01.Genesis.txt':               'GEN',
  '02.Exodus.txt':                'EXO',
  '03.Leviticus.txt':             'LEV',
  '04.Numeri.txt':                'NUM',
  '05.Deuteronomium.txt':         'DEU',
  '06.Josue.txt':                 'JOS',
  '08.Judices.txt':               'JDG',
  '10.Ruth.txt':                  'RUT',
  '11.Regnorum_I.txt':            '1SA',
  '12.Regnorum_II.txt':           '2SA',
  '13.Regnorum_III.txt':          '1KI',
  '14.Regnorum_IV.txt':           '2KI',
  '15.Paralipomenon_I.txt':       '1CH',
  '16.Paralipomenon_II.txt':      '2CH',
  '19.Esther.txt':                'EST',
  '27.Psalmi.txt':                'PSA',
  '29.Proverbia.txt':             'PRO',
  '31.Canticum.txt':              'SNG',
  '32.Job.txt':                   'JOB',
  '36.Osee.txt':                  'HOS',
  '37.Amos.txt':                  'AMO',
  '38.Michaeas.txt':              'MIC',
  '39.Joel.txt':                  'JOL',
  '40.Abdias.txt':                'OBA',
  '41.Jonas.txt':                 'JON',
  '42.Nahum.txt':                 'NAM',
  '43.Habacuc.txt':               'HAB',
  '44.Sophonias.txt':             'ZEP',
  '45.Aggaeus.txt':               'HAG',
  '46.Zacharias.txt':             'ZEC',
  '47.Malachias.txt':             'MAL',
  '48.Isaias.txt':                'ISA',
  '49.Jeremias.txt':              'JER',
  '51.Threni_seu_Lamentationes.txt': 'LAM',
  '53.Ezechiel.txt':              'EZK',
  '57.Daniel_Theodotionis_versio.txt': 'DAN',
  // Esdras B = Ezra (ch.1-10) + Néhémie (ch.11-23 en LXX) : géré séparément ci-dessous
  '18.Esdras_B.txt':              '__ESDRAS_B__',
}

const DATA_DIR = path.join(ROOT, '..', 'lxx-swete-master', 'lxx-swete-master', 'data')

// ── Parser un fichier TXT : retourne Map<`chapitre:verset`, string> ───────────
function parseFichier(fichierPath) {
  const contenu = fs.readFileSync(fichierPath, 'utf8')
  const versets = new Map() // clé = "chapitre:verset", valeur = mots[]

  for (const ligne of contenu.split('\n')) {
    const trimmed = ligne.trim()
    if (!trimmed) continue
    const espIdx = trimmed.indexOf(' ')
    if (espIdx === -1) continue
    const ref = trimmed.slice(0, espIdx)       // "1.3.2"
    const mot = trimmed.slice(espIdx + 1).trim()
    if (!mot) continue

    // ref = "bookNum.chapitre.verset" (le bookNum est toujours 1 pour les fichiers mono-livre)
    const parties = ref.split('.')
    if (parties.length !== 3) continue
    const ch  = parseInt(parties[1], 10)
    const ver = parseInt(parties[2], 10)
    if (isNaN(ch) || isNaN(ver)) continue

    const cle = `${ch}:${ver}`
    if (!versets.has(cle)) versets.set(cle, [])
    versets.get(cle).push(mot)
  }

  // Reconstruire le texte de chaque verset
  const result = new Map()
  for (const [cle, mots] of versets) {
    result.set(cle, mots.join(' '))
  }
  return result
}

// ── Construire toutes les paires {livre, chapitre, verset, texte} ─────────────
function construirePaires() {
  const paires = [] // { livre, chapitre, verset, texte }

  for (const [fichier, livreCode] of Object.entries(MAPPING)) {
    const fichierPath = path.join(DATA_DIR, fichier)
    if (!fs.existsSync(fichierPath)) {
      console.warn(`  ⚠ Fichier introuvable : ${fichier}`)
      continue
    }

    const versetsMap = parseFichier(fichierPath)

    if (livreCode === '__ESDRAS_B__') {
      // Esdras B (LXX) = Ezra (ch.1-10) + Néhémie (ch.11-23)
      // Dans le fichier, le chapitre commence à 1 pour Ezra et continue pour Néhémie
      // La table versets a EZR (ch.1-10) et NEH (ch.1-13)
      for (const [cle, texte] of versetsMap) {
        const [chStr, verStr] = cle.split(':')
        const ch  = parseInt(chStr, 10)
        const ver = parseInt(verStr, 10)
        if (ch >= 1 && ch <= 10) {
          paires.push({ livre: 'EZR', chapitre: ch, verset: ver, texte })
        } else {
          // ch 11..23 = Néhémie ch 1..13
          paires.push({ livre: 'NEH', chapitre: ch - 10, verset: ver, texte })
        }
      }
      console.log(`  Esdras B → EZR + NEH : ${versetsMap.size} versets`)
      continue
    }

    for (const [cle, texte] of versetsMap) {
      const [chStr, verStr] = cle.split(':')
      paires.push({ livre: livreCode, chapitre: parseInt(chStr, 10), verset: parseInt(verStr, 10), texte })
    }
    console.log(`  ${fichier.padEnd(45)} → ${livreCode} : ${versetsMap.size} versets`)
  }

  return paires
}

// ── Charger tous les id_verset existants de la table versets ─────────────────
async function chargerIdVersets() {
  console.log('\n📥 Chargement de tous les id_verset depuis Supabase…')
  const map = new Map() // clé = "LIVRE_ch_ver" → id_verset

  let offset = 0
  const taille = 1000
  while (true) {
    const { data, error } = await supabase
      .from('versets')
      .select('id_verset,livre,chapitre,verset')
      .order('id_verset')
      .range(offset, offset + taille - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data) {
      map.set(`${r.livre}_${r.chapitre}_${r.verset}`, r.id_verset)
    }
    console.log(`  ${offset + data.length} versets chargés…`)
    if (data.length < taille) break
    offset += taille
  }

  console.log(`  ✓ ${map.size} versets en base`)
  return map
}

// ── Trouver le prochain trad_id ───────────────────────────────────────────────
async function prochainTradId() {
  const { data } = await supabase.from('traductions').select('trad_id').order('trad_id', { ascending: false }).limit(1)
  if (!data || data.length === 0) return 'TR0001'
  const num = parseInt(data[0].trad_id.replace('TR', ''), 10)
  return `TR${String(num + 1).padStart(4, '0')}`
}

// ── Wrapper RPC ───────────────────────────────────────────────────────────────
async function execSql(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw new Error(`exec_sql: ${error.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Import Septante (Swete LXX) → Corpus Scriptura')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Parser les fichiers
  console.log('📖 Lecture et reconstruction des versets…')
  const paires = construirePaires()
  console.log(`\n  ✓ ${paires.length} versets LXX construits au total\n`)

  // 2. Charger les id_verset existants
  const idMap = await chargerIdVersets()

  // 3. Faire correspondre
  const lignes = []
  let sansCorre = 0
  for (const p of paires) {
    const cle = `${p.livre}_${p.chapitre}_${p.verset}`
    const idVerset = idMap.get(cle)
    if (!idVerset) { sansCorre++; continue }
    lignes.push({ id_verset: idVerset, texte: p.texte })
  }
  console.log(`\n📊 Correspondances : ${lignes.length} versets trouvés en base, ${sansCorre} sans correspondance (LXX-only ou numérotation différente)`)

  if (lignes.length === 0) {
    console.error('Aucune correspondance — vérifier les fichiers et la connexion Supabase.')
    process.exit(1)
  }

  // 4. Déterminer le trad_id (reprendre TR0007 si colonne déjà créée)
  const tradId = 'TR0007'
  console.log(`\n🔄 Reprise de l'import avec trad_id : ${tradId}`)

  // 5. Colonne déjà créée (reprise après timeout) — on saute le DDL
  console.log(`  ✓ Colonne ${tradId} déjà présente`)

  // 6. Traduction déjà insérée — on saute
  console.log('  ✓ Entrée traductions déjà créée')

  // Reprendre à partir du verset 10500 (déjà importés : 0..10499)
  const REPRISE_OFFSET = 10500

  // 7. Mise à jour par batch de 50 (timeout-safe)
  const restants = lignes.slice(REPRISE_OFFSET)
  console.log(`\n⬆️  Reprise à partir du verset ${REPRISE_OFFSET} — ${restants.length} versets restants (batch 50)…`)
  let inseres = REPRISE_OFFSET
  const sqlEscape = s => s.replace(/'/g, "''")

  for (let i = 0; i < restants.length; i += 50) {
    const batch = restants.slice(i, i + 50)
    const values = batch.map(l => `('${sqlEscape(l.id_verset)}', '${sqlEscape(l.texte)}')`).join(',\n')
    await execSql(`
      UPDATE versets AS v
      SET "${tradId}" = data.texte
      FROM (VALUES ${values}) AS data(id_verset, texte)
      WHERE v.id_verset = data.id_verset;
    `)
    inseres += batch.length
    process.stdout.write(`\r  ${inseres}/${lignes.length}`)
  }

  console.log(`\n\n✅ Import terminé — ${inseres} versets mis à jour avec la Septante (${tradId})`)
  console.log('\nNote : les livres non encore présents dans versets (deutérocanoniques :')
  console.log('Tobie, Judith, Maccabées, Sagesse, Siracide, Baruch…) pourront être ajoutés')
  console.log('dans une seconde passe une fois les codes de livres définis dans bible.ts.')
}

main().catch(e => { console.error(e); process.exit(1) })
