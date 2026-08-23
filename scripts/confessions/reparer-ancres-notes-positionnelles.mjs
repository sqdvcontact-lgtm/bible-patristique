import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const root = resolve(import.meta.dirname, '..', '..')
const auditRoot = resolve(root, 'audit', 'confessions-notes-2026-08-21')
// Le texte latin s'appelait TXT_A0010O0102_LA_1896_KNOLL_CSEL33 tant qu'il était
// l'œuvre autonome A0010O0110. Depuis sa fusion sous Les Confessions (2026-08-23),
// il porte son numéro de texte. L'ancien identifiant ne renvoie plus rien : le
// script tournait alors sans rien réparer, et sans le dire.
const textId = 'A0010O0001T0001'
const dernierLotSain = 1007
const write = process.argv.includes('--write')

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/gu, '')]),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Variables Supabase absentes.')

const db = createClient(url, key, { auth: { persistSession: false } })
const codepoints = value => Array.from(String(value ?? ''))
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex')

async function toutesLesPages(factory, taille = 1000) {
  const resultat = []
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await factory(debut, debut + taille - 1)
    if (error) throw error
    resultat.push(...(data ?? []))
    if (!data || data.length < taille) return resultat
  }
}

function lots(values, taille = 100) {
  return Array.from({ length: Math.ceil(values.length / taille) }, (_, index) =>
    values.slice(index * taille, (index + 1) * taille))
}

function ecrireAtomiquement(path, contenu) {
  const temporaire = `${path}.tmp`
  writeFileSync(temporaire, contenu, 'utf8')
  renameSync(temporaire, path)
}

async function lireInstantane() {
  const [notes, ancres, blocs] = await Promise.all([
    toutesLesPages((debut, fin) => db.from('texte_notes')
      .select('*').eq('id_texte', textId).order('note_number').range(debut, fin)),
    toutesLesPages((debut, fin) => db.from('texte_note_ancres')
      .select('*').eq('id_texte', textId).order('note_key').range(debut, fin)),
    toutesLesPages((debut, fin) => db.from('texte_note_blocs')
      .select('*').eq('id_texte', textId).order('note_key').order('rank').range(debut, fin)),
  ])

  const notesParCle = new Map(notes.map(note => [note.note_key, note]))
  const anomalies = ancres.filter(ancre => {
    const numero = notesParCle.get(ancre.note_key)?.note_number
    return Number.isInteger(numero)
      && numero > dernierLotSain
      && ancre.source_target === ancre.note_key
      && ancre.anchor_id === `${ancre.note_key}:segment_texte`
  })
  const signature = sha256(JSON.stringify({ notes, ancres, blocs }))
  return { notes, ancres, blocs, notesParCle, anomalies, signature }
}

function resumerInstantane(instantane) {
  const numeros = instantane.notes.map(note => note.note_number).filter(Number.isInteger)
  return {
    notes: instantane.notes.length,
    ancres: instantane.ancres.length,
    blocs: instantane.blocs.length,
    note_min: numeros.length ? Math.min(...numeros) : null,
    note_max: numeros.length ? Math.max(...numeros) : null,
    anomalies_cible: instantane.anomalies.length,
    signature: instantane.signature,
  }
}

const avant = await lireInstantane()
if (!avant.anomalies.length) {
  console.log(JSON.stringify({ mode: write ? 'write' : 'audit', ...resumerInstantane(avant), write_required: false }, null, 2))
  process.exit(0)
}

const segmentKeys = [...new Set(avant.anomalies.map(ancre => ancre.segment_key))]
const segments = (await Promise.all(lots(segmentKeys).map(async batch => {
  const { data, error } = await db.from('segments')
    .select('segment_key,segment_texte').in('segment_key', batch)
  if (error) throw error
  return data ?? []
}))).flat()
const segmentsParCle = new Map(segments.map(segment => [segment.segment_key, segment]))
const blocsParNote = new Map()
for (const bloc of avant.blocs) {
  const liste = blocsParNote.get(bloc.note_key) ?? []
  liste.push(bloc)
  blocsParNote.set(bloc.note_key, liste)
}

const corrections = avant.anomalies.map(ancre => {
  const note = avant.notesParCle.get(ancre.note_key)
  const segment = segmentsParCle.get(ancre.segment_key)
  const blocs = blocsParNote.get(ancre.note_key) ?? []
  if (!note) throw new Error(`Note absente : ${ancre.note_key}`)
  if (!segment) throw new Error(`Segment absent : ${ancre.segment_key}`)
  if (blocs.length !== 1 || ancre.structured_block_count !== 1) {
    throw new Error(`Nombre de blocs invalide : ${ancre.note_key}`)
  }
  if (ancre.marker !== `[[${note.note_number}]]`) {
    throw new Error(`Marqueur invalide : ${ancre.note_key}`)
  }

  const texte = codepoints(segment.segment_texte)
  const offset = ancre.segment_offset_unicode
  if (!Number.isInteger(offset) || offset < 0 || offset > texte.length) {
    throw new Error(`Offset hors limites : ${ancre.note_key}`)
  }

  const longueurGauche = codepoints(ancre.anchor_text_left).length
  const longueurDroite = codepoints(ancre.anchor_text_right).length
  const gauche = texte.slice(Math.max(0, offset - longueurGauche), offset).join('')
  const droite = texte.slice(offset, offset + longueurDroite).join('')
  const metadata = { ...(ancre.metadata ?? {}) }
  const phrase = typeof metadata.anchor_phrase === 'string' ? metadata.anchor_phrase : null
  let phraseCorrigee = false
  if (phrase) {
    const phraseSource = texte.slice(offset, offset + codepoints(phrase).length).join('')
    if (phraseSource !== phrase) {
      if (phraseSource.toLocaleLowerCase('la') !== phrase.toLocaleLowerCase('la')) {
        throw new Error(`Phrase témoin incompatible avec l'offset : ${ancre.note_key}`)
      }
      metadata.anchor_phrase = phraseSource
      phraseCorrigee = true
    }
  }

  return {
    ancre,
    note_number: note.note_number,
    patch: {
      source_target: 'segment_texte',
      anchor_text_left: gauche,
      anchor_text_right: droite,
      metadata,
    },
    contexte_deja_exact: ancre.anchor_text_left === gauche && ancre.anchor_text_right === droite,
    phrase_corrigee: phraseCorrigee,
  }
})

const controle = await lireInstantane()
if (controle.signature !== avant.signature) {
  throw new Error(`L'import a changé pendant l'audit (${avant.signature.slice(0, 12)} → ${controle.signature.slice(0, 12)}). Attendre sa stabilisation et relancer.`)
}

const resume = {
  mode: write ? 'write' : 'audit',
  ...resumerInstantane(avant),
  corrections: corrections.length,
  contextes_a_reconstruire: corrections.filter(item => !item.contexte_deja_exact).length,
  phrases_temoin_a_recasser: corrections.filter(item => item.phrase_corrigee).length,
  notes_concernees: [corrections[0].note_number, corrections.at(-1).note_number],
  segment_texte_modifie: false,
  validation_editoriale_modifiee: false,
}

mkdirSync(auditRoot, { recursive: true })
if (!write) {
  const rapportPath = resolve(auditRoot, 'reparation-ancres-dry.json')
  ecrireAtomiquement(rapportPath, `${JSON.stringify({ ...resume, write_required: true }, null, 2)}\n`)
  console.log(JSON.stringify({ ...resume, write_required: true, rapport: rapportPath }, null, 2))
  process.exit(0)
}

const nomLot = `${resume.notes_concernees[0]}-${resume.notes_concernees[1]}-${avant.signature.slice(0, 12)}`
const sauvegardePath = resolve(auditRoot, `ancres-${nomLot}-avant.json`)
ecrireAtomiquement(sauvegardePath, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  text_id: textId,
  snapshot: resumerInstantane(avant),
  rows: corrections.map(item => item.ancre),
}, null, 2)}\n`)

const progressionPath = resolve(auditRoot, `ancres-${nomLot}-progression.json`)
const corrigees = []
for (const batch of lots(corrections, 10)) {
  const resultats = await Promise.all(batch.map(async item => {
    let requete = db.from('texte_note_ancres')
      .update(item.patch)
      .eq('id_texte', textId)
      .eq('anchor_id', item.ancre.anchor_id)
      .eq('source_target', item.ancre.note_key)
      .eq('segment_offset_unicode', item.ancre.segment_offset_unicode)
    requete = item.ancre.anchor_text_left === null
      ? requete.is('anchor_text_left', null)
      : requete.eq('anchor_text_left', item.ancre.anchor_text_left)
    requete = item.ancre.anchor_text_right === null
      ? requete.is('anchor_text_right', null)
      : requete.eq('anchor_text_right', item.ancre.anchor_text_right)
    const { data, error } = await requete.select('anchor_id')
    if (error) throw error
    if (data?.length !== 1) throw new Error(`Écriture concurrente détectée : ${item.ancre.anchor_id}`)
    return item.ancre.anchor_id
  }))
  corrigees.push(...resultats)
  ecrireAtomiquement(progressionPath, `${JSON.stringify({ sauvegarde: sauvegardePath, corrigees }, null, 2)}\n`)
}

const apres = await lireInstantane()
if (apres.notes.length !== avant.notes.length || apres.ancres.length !== avant.ancres.length || apres.blocs.length !== avant.blocs.length) {
  throw new Error('Le lot a recommencé à croître pendant la correction. Les lignes déjà corrigées sont sauvegardées ; relancer après stabilisation.')
}

const ancresApres = new Map(apres.ancres.map(ancre => [ancre.anchor_id, ancre]))
for (const correction of corrections) {
  const ancre = ancresApres.get(correction.ancre.anchor_id)
  if (!ancre || ancre.source_target !== 'segment_texte'
    || ancre.anchor_text_left !== correction.patch.anchor_text_left
    || ancre.anchor_text_right !== correction.patch.anchor_text_right
    || !isDeepStrictEqual(ancre.metadata ?? {}, correction.patch.metadata)) {
    throw new Error(`Relecture finale invalide : ${correction.ancre.anchor_id}`)
  }
}

const rapportPath = resolve(auditRoot, `ancres-${nomLot}-apres.json`)
const rapport = {
  ...resume,
  sauvegarde: sauvegardePath,
  corrigees: corrigees.length,
  apres: resumerInstantane(apres),
  relecture_exacte: true,
}
ecrireAtomiquement(rapportPath, `${JSON.stringify(rapport, null, 2)}\n`)
console.log(JSON.stringify({ ...rapport, rapport: rapportPath }, null, 2))
