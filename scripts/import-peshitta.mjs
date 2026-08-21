/**
 * Import de la Peshitta (NT syriaque) dans la table versets.
 * Source : bible_databases-master/sources/syr/Peshitta/Peshitta.json (Domaine public)
 * Contenu : NT complet (27 livres, ~7 956 versets) en syriaque classique (Estranghéla).
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

const JSON_PATH = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/sources/syr/Peshitta/Peshitta.json'

const MAPPING_LIVRES = {
  'Matthew':              'MAT',
  'Mark':                 'MRK',
  'Luke':                 'LUK',
  'John':                 'JHN',
  'Acts':                 'ACT',
  'Romans':               'ROM',
  'I Corinthians':        '1CO',
  'II Corinthians':       '2CO',
  'Galatians':            'GAL',
  'Ephesians':            'EPH',
  'Philippians':          'PHP',
  'Colossians':           'COL',
  'I Thessalonians':      '1TH',
  'II Thessalonians':     '2TH',
  'I Timothy':            '1TI',
  'II Timothy':           '2TI',
  'Titus':                'TIT',
  'Philemon':             'PHM',
  'Hebrews':              'HEB',
  'James':                'JAS',
  'I Peter':              '1PE',
  'II Peter':             '2PE',
  'I John':               '1JN',
  'II John':              '2JN',
  'III John':             '3JN',
  'Jude':                 'JUD',
  'Revelation of John':   'REV',
}

async function execSql(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw new Error(`exec_sql: ${error.message}`)
}

async function prochainTradId() {
  const { data } = await supabase.from('traductions').select('trad_id').order('trad_id', { ascending: false }).limit(1)
  if (!data || data.length === 0) return 'TR0001'
  const num = parseInt(data[0].trad_id.replace('TR', ''), 10)
  return `TR${String(num + 1).padStart(4, '0')}`
}

async function chargerIdVersets(livres) {
  console.log('📥 Chargement des id_verset NT depuis Supabase…')
  const map = new Map()
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('versets')
      .select('id_verset,livre,chapitre,verset')
      .in('livre', livres)
      .order('id_verset')
      .range(offset, offset + 999)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data) map.set(`${r.livre}_${r.chapitre}_${r.verset}`, r.id_verset)
    if (data.length < 1000) break
    offset += 1000
  }
  console.log(`  ✓ ${map.size} versets NT en base`)
  return map
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Import Peshitta (NT syriaque) → Corpus Scriptura')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Parser le JSON
  console.log('📖 Lecture de Peshitta.json…')
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
  const paires = []
  let inconnus = []

  for (const book of data.books) {
    const livre = MAPPING_LIVRES[book.name]
    if (!livre) { inconnus.push(book.name); continue }
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        if (!v.text || !v.text.trim()) continue
        paires.push({ livre, chapitre: v.chapter, verset: v.verse, texte: v.text.trim() })
      }
    }
  }
  console.log(`  ✓ ${paires.length} versets extraits`)
  if (inconnus.length) console.log(`  ⚠ Livres non mappés : ${inconnus.join(', ')}`)

  // 2. Charger les id_verset
  const livresUniques = [...new Set(paires.map(p => p.livre))]
  const idMap = await chargerIdVersets(livresUniques)

  // 3. Correspondances
  const lignes = []
  let sansCorre = 0
  for (const p of paires) {
    const id = idMap.get(`${p.livre}_${p.chapitre}_${p.verset}`)
    if (!id) { sansCorre++; continue }
    lignes.push({ id_verset: id, texte: p.texte })
  }
  console.log(`\n📊 ${lignes.length} correspondances, ${sansCorre} sans équivalent en base`)

  // 4. Prochain trad_id
  const tradId = await prochainTradId()
  console.log(`\n🆕 Nouveau trad_id : ${tradId}`)

  // 5. Créer la colonne
  console.log(`\n🏗  Création de la colonne ${tradId}…`)
  await execSql(`ALTER TABLE versets ADD COLUMN IF NOT EXISTS "${tradId}" TEXT;`)
  await execSql(`NOTIFY pgrst, 'reload schema';`)
  await new Promise(r => setTimeout(r, 1000))
  console.log('  ✓ Colonne créée')

  // 6. Métadonnée traduction
  console.log('\n📝 Création de l\'entrée dans traductions…')
  const { error: tradErr } = await supabase.from('traductions').insert({
    trad_id: tradId,
    nom: 'Peshitta',
    auteur: null,
    dates: 'IVe–Ve siècle',
    bio_courte: 'Version syriaque de la Bible, constituée aux IVe–Ve siècles et adoptée comme texte canonique par les Églises syriaques (Antioche, Orient, maronite). Le Nouveau Testament de la Peshitta est le témoin textuel utilisé par les Pères syriaques, au premier rang desquels Éphrem de Nisibe et Aphraate.',
    commentaire_editorial: "La Peshitta (ܦܫܝܛܬܐ, « la simple ») est la version biblique standard des communautés chrétiennes de langue syriaque depuis le IVe siècle. Son NT, proche du texte byzantin, diffère sensiblement du NT grec pour certains passages. Les livres 2 Pierre, 2-3 Jean, Jude et l'Apocalypse n'étaient pas reçus par toutes les traditions et furent ajoutés progressivement au canon syriaque. Texte du domaine public.",
    date_publication: null,
    confession: null,
    langue: 'Syriaque',
    ordre: 11,
  })
  if (tradErr) { console.error('Erreur :', tradErr.message); process.exit(1) }
  console.log('  ✓ Entrée créée')

  // 7. Import par batch de 50
  console.log(`\n⬆️  Import de ${lignes.length} versets (batch 50)…`)
  const sqlEscape = s => s.replace(/'/g, "''")
  let inseres = 0

  for (let i = 0; i < lignes.length; i += 50) {
    const batch = lignes.slice(i, i + 50)
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

  console.log(`\n\n✅ Import terminé — ${inseres} versets NT en syriaque (${tradId})`)

  // 8. Vérification rapide
  const { data: spot } = await supabase
    .from('versets')
    .select(`livre,chapitre,verset,${tradId}`)
    .eq('livre', 'MAT').eq('chapitre', 1).eq('verset', 1).single()
  console.log('\n🔍 Spot check Mt 1:1 :', spot?.[tradId] ?? '(vide)')
}

main().catch(e => { console.error(e); process.exit(1) })
