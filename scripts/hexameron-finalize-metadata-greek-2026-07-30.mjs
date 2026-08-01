import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK = 'A0017O0001'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function allSegments() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments')
      .select('id,segment_numero,segment_texte,texte_original,nature')
      .eq('id_oeuvre', WORK).order('id').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const [{ data: work, error: workError }, segments] = await Promise.all([
  db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(),
  allSegments(),
])
if (workError) throw workError
if (segments.length !== 1818) throw new Error(`Segments inattendus : ${segments.length}`)
const nbSignes = segments.reduce((sum, row) => sum + row.segment_texte.length, 0)
if (nbSignes !== 327231) throw new Error(`Compteur inattendu : ${nbSignes}`)

const first = segments.find((row) => row.segment_numero === 1)
if (!first?.texte_original?.includes('γῆν.} Πρέπουσα') || !first.texte_original.includes('λαβοῦσα.Ποία')) {
  throw new Error('Garde grecque du segment 1 non satisfaite')
}
const greekAfter = first.texte_original
  .replace('γῆν.} Πρέπουσα', 'γῆν. Πρέπουσα')
  .replace('λαβοῦσα.Ποία', 'λαβοῦσα. Ποία')

const commentary = 'Traduction d’Athanase Auger publiée à Lyon chez François Guyot en 1827. L’édition ajoute aux neuf homélies sur l’Hexaéméron une « Homélie dixième » sur la création de l’homme, composée par Auger à partir de deux homélies qu’il juge lui-même étrangères à Basile comme à Grégoire de Nysse, avec suppressions et fusion.'
const patch = {
  nb_signes: 327231,
  profondeur_sommaire: 1,
  niveaux_sommaire: 1,
  niveaux_corps: 2,
  texte_sommaire: '1,0,0,0,0',
  texte_corps: '1,0,0,0,0',
  commentaire_traduction: commentary,
}

if (work.titre !== 'Homélies sur l’Hexaéméron' || work.trad_auteur !== 'Athanase Auger'
  || work.nb_signes !== 327231 || work.texte_sommaire !== '10000' || work.texte_corps !== '10000') {
  throw new Error('Préétat de la notice inattendu')
}

console.log(JSON.stringify({ apply: APPLY, work_patch: patch, greek_segment: 1,
  greek_changes: ['suppression d’un résidu HTML }', 'ajout d’une espace après le point'] }, null, 2))
if (!APPLY) process.exit(0)

const { data: greekUpdated, error: greekError } = await db.from('segments')
  .update({ texte_original: greekAfter }).eq('id', first.id)
  .eq('texte_original', first.texte_original).select('id')
if (greekError) throw greekError
if (greekUpdated.length !== 1) throw new Error(`Écriture grecque : ${greekUpdated.length}`)

const { data: workUpdated, error: updateError } = await db.from('oeuvres').update(patch)
  .eq('id_oeuvre', WORK).eq('nb_signes', 327231)
  .eq('texte_sommaire', '10000').eq('texte_corps', '10000').select('*')
if (updateError) throw updateError
if (workUpdated.length !== 1) throw new Error(`Écriture notice : ${workUpdated.length}`)

const [{ data: afterWork, error: afterWorkError }, afterSegments] = await Promise.all([
  db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(),
  allSegments(),
])
if (afterWorkError) throw afterWorkError
for (const [key, value] of Object.entries(patch)) {
  if (afterWork[key] !== value) throw new Error(`Postcontrôle notice : ${key}`)
}
const afterFirst = afterSegments.find((row) => row.segment_numero === 1)
if (afterFirst.texte_original !== greekAfter || /[{}<>�]/u.test(afterFirst.texte_original)) {
  throw new Error('Postcontrôle grec en échec')
}
console.log(JSON.stringify({ applied: true, nb_signes: afterWork.nb_signes,
  texte_sommaire: afterWork.texte_sommaire, texte_corps: afterWork.texte_corps,
  greek_clean: true }, null, 2))
