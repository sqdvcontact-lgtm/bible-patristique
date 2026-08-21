import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const LOTS_DEFAUT = [
  { nom: 'XLI-L', debut: 129, fin: 148, segments: 20 },
  { nom: 'LI-LX', debut: 149, fin: 185, segments: 37 },
  { nom: 'LXI-LXX', debut: 186, fin: 220, segments: 35 },
]
const argumentLots = process.argv.find((argument) => argument.startsWith('--lots='))
const LOTS = argumentLots
  ? argumentLots.slice('--lots='.length).split(',').map((definition) => {
      const [nom, debutBrut, finBrut] = definition.split(':')
      const debut = Number(debutBrut)
      const fin = Number(finBrut)
      if (!nom || !Number.isInteger(debut) || !Number.isInteger(fin) || fin < debut) {
        throw new Error(`Définition de lot invalide : ${definition}`)
      }
      return { nom, debut, fin, segments: fin - debut + 1 }
    })
  : LOTS_DEFAUT

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function lireToutesLesPages(construireRequete, taille = 1000) {
  const lignes = []
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await construireRequete().range(debut, debut + taille - 1)
    if (error) throw error
    lignes.push(...data)
    if (data.length < taille) return lignes
  }
}

const rapports = []
for (const lot of LOTS) {
  const segments = await lireToutesLesPages(() => supabase.from('segments')
    .select('id,segment_numero,ref_niv2,segment_texte,notes,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE).gte('segment_numero', lot.debut).lte('segment_numero', lot.fin).order('segment_numero'))
  if (segments.length !== lot.segments || segments[0]?.segment_numero !== lot.debut || segments.at(-1)?.segment_numero !== lot.fin) {
    throw new Error(`Bornes inattendues pour ${lot.nom}`)
  }
  const liens = []
  const ids = segments.map((segment) => segment.id)
  // PostgREST refuse les très longues listes `in(...)` lors de l’audit intégral.
  // Découper aussi cette dimension, en plus de la pagination des résultats.
  for (let debutIds = 0; debutIds < ids.length; debutIds += 200) {
    const tranche = ids.slice(debutIds, debutIds + 200)
    liens.push(...await lireToutesLesPages(() => supabase.from('liens_bibliques').select('*')
      .in('segment_id', tranche).order('id')))
  }
  const cle = (lien) => `${lien.segment_id}|${lien.canon_id || lien.verset_v2_id || (lien.livre && lien.chapitre ? `${lien.livre}.${lien.chapitre}` : `sans:${lien.motif}`)}|${lien.type}`
  const cles = liens.map(cle)
  const lies = new Set(liens.map((lien) => lien.segment_id))
  const sansLien = segments.filter((segment) => !lies.has(segment.id))
  const nombreCibles = (lien) => [
    Boolean(lien.canon_id), Boolean(lien.verset_v2_id), Boolean(lien.livre && lien.chapitre),
  ].filter(Boolean).length
  const sansCibleValide = (lien) => nombreCibles(lien) === 0
    && lien.fiabilite === 'à constituer' && Boolean(lien.motif?.trim())
  const marqueur = (segment) => /[[\]«»]|\b(?:Gen|Ex|Lev|Nom|Deut|Jos|Jug|Ps|Is|Jer|Mal|Mat|Rom|Act|Cor|Ch)\.?\s*[IVXLCDM\d]/iu.test(`${segment.segment_texte} ${segment.notes ?? ''}`)
  rapports.push({
    lot: lot.nom,
    segments: segments.length,
    questions: new Set(segments.map((segment) => segment.ref_niv2)).size,
    relus: segments.filter((segment) => segment.liens_revus_le && segment.liens_revus_par).length,
    liens: liens.length,
    types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, liens.filter((lien) => lien.type === type).length])),
    sans_lien: sansLien.map((segment) => segment.segment_numero),
    sans_lien_avec_marqueur: sansLien.filter(marqueur).map((segment) => segment.segment_numero),
    fiabilites: [...new Set(liens.map((lien) => lien.fiabilite))],
    provenances: [...new Set(liens.map((lien) => lien.provenance))],
    arbitrages: liens.filter((lien) => lien.arbitrage_requis).length,
    arbitrages_inattendus: liens.filter((lien) => lien.arbitrage_requis && !sansCibleValide(lien)).length,
    doublons: cles.length - new Set(cles).size,
    sans_cible_a_constituer: liens.filter(sansCibleValide).length,
    cibles_invalides: liens.filter((lien) => nombreCibles(lien) !== 1 && !sansCibleValide(lien)).length,
    motifs_vides: liens.filter((lien) => !lien.motif?.trim()).length,
  })
}

const [{ count: total, error: erreurTotal }, { count: relus, error: erreurRelus }] = await Promise.all([
  supabase.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE),
  supabase.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (erreurTotal) throw erreurTotal
if (erreurRelus) throw erreurRelus
console.log(JSON.stringify({
  global: { segments: total, relus, avancement_pct: Number((100 * relus / total).toFixed(2)) },
  lots: rapports,
}, null, 2))
