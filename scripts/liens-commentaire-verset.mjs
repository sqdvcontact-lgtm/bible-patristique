// ─────────────────────────────────────────────────────────────────────────────
// Outil d'ancrage des liens pour un COMMENTAIRE VERSET-PAR-VERSET.
//
// Cas d'emploi : une œuvre où chaque segment cite un verset (lemme entre
// guillemets) puis le commente, la structure portant chapitre (ref_niv1) et
// verset (ref_niv2 « § N »). Il pose, segment par segment :
//   • un lien TYPE 1 (citation) si le segment porte un lemme entre guillemets ;
//   • un lien TYPE 3 (commentaire) SEULEMENT si une glose accompagne la citation.
// La cible se dit en numérotation canonique et n'est écrite que si le créneau
// existe dans versets_canon (sinon lien « à constituer » signalé). fiabilité =
// 'probable', provenance = 'ia' : à confirmer en relecture humaine.
//
// Sûreté : le « § » n'est qu'un indice ; il faut relire (Passe 6). Ici on
// n'INSÈRE que si le créneau existe, on marque 'probable', on est idempotent,
// et on imprime un rapport par chapitre pour audit. Simulation par défaut ;
// « --commit » pour écrire.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ID_OEUVRE = 'A0010O0100'   // Annotations sur Job (Augustin)
const LIVRE = 'JOB'
const COMMIT = process.argv.includes('--commit')

const env = Object.fromEntries(readFileSync('./.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function all(q) { const o = []; let f = 0; for (;;) { const { data, error } = await q.range(f, f + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break; f += 1000 } return o }

const ROM = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 }
function romain(s) { let t = 0, p = 0; for (const c of s.toUpperCase().split('').reverse()) { const v = ROM[c]; if (!v) return null; t += v < p ? -v : v; p = v } return t || null }
function chapitreDe(refNiv1) { const m = (refNiv1 || '').match(/chapitre\s+([IVXLCDM]+)/i); return m ? romain(m[1]) : null }
function versetDe(refNiv2) { const m = (refNiv2 || '').match(/(\d+)/); return m ? parseInt(m[1]) : null }

// Retire les portions entre guillemets « … » pour ne garder que la prose du Père.
function proseHorsCitation(t) { return (t || '').replace(/«[^»]*»/g, ' ').replace(/\s+/g, ' ').replace(/^[\s.,;:—–-]+/, '').trim() }
function aUnLemme(t) { const m = (t || '').match(/«([^»]*)»/); return !!(m && m[1].trim().length >= 3) }
const A_COMMENTAIRE_MIN = 12   // seuil de prose (hors citation) au-delà duquel il y a commentaire

const canon = new Set((await all(sb.from('versets_canon').select('id').eq('livre', LIVRE))).map(r => r.id))
const segs = (await all(sb.from('segments').select('id, ref_niv1, ref_niv2, segment_texte, rang')
  .eq('id_oeuvre', ID_OEUVRE).eq('nature', 'texte'))).sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0) || a.id - b.id)

// Liens déjà présents (idempotence) : clé segment|canon|type
const dejaRows = await all(sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', segs.map(s => s.id)))
const deja = new Set(dejaRows.map(r => `${r.segment_id}|${r.canon_id}|${r.type}`))

const aInserer = []          // liens à créer
const segMarques = new Set() // segments examinés (à marquer liens_revus)
const flags = []             // anomalies à relire
const parChap = {}           // rapport par chapitre

for (const s of segs) {
  const ch = chapitreDe(s.ref_niv1), v = versetDe(s.ref_niv2)
  const stat = (parChap[ch ?? '?'] ??= { seg: 0, t1: 0, t3: 0, aConstituer: 0, flag: 0 })
  stat.seg++
  segMarques.add(s.id)

  if (!ch || !v) { flags.push(`seg ${s.id} : chapitre/verset illisibles (${s.ref_niv1} / ${s.ref_niv2})`); stat.flag++; continue }
  const canonId = `${LIVRE}.${ch}.${v}`
  const lemme = aUnLemme(s.segment_texte)
  const commentaire = proseHorsCitation(s.segment_texte).length >= A_COMMENTAIRE_MIN

  if (!canon.has(canonId)) {
    // Créneau hors ossature (Job 40-42, débordement) : lien « à constituer », sans cible.
    const motif = `Verset visé Jb ${ch}, ${v} absent de l'ossature — à raccrocher`
    if (![...deja].some(k => k.startsWith(`${s.id}|`))) aInserer.push({ segment_id: s.id, canon_id: null, type: lemme ? 1 : 3, fiabilite: 'à constituer', motif, provenance: 'ia' })
    stat.aConstituer++; flags.push(`seg ${s.id} : ${canonId} absent de l'ossature`); continue
  }

  if (lemme && !deja.has(`${s.id}|${canonId}|1`)) { aInserer.push({ segment_id: s.id, canon_id: canonId, type: 1, fiabilite: 'probable', motif: `Citation directe du verset commenté (Jb ${ch}, ${v})`, provenance: 'ia' }); stat.t1++ }
  if (commentaire && !deja.has(`${s.id}|${canonId}|3`)) { aInserer.push({ segment_id: s.id, canon_id: canonId, type: 3, fiabilite: 'probable', motif: `Commentaire suivi du verset (Jb ${ch}, ${v}) par Augustin`, provenance: 'ia' }); stat.t3++ }
  if (!lemme && !commentaire) { flags.push(`seg ${s.id} : ni lemme ni commentaire`); stat.flag++ }
  else if (!lemme) flags.push(`seg ${s.id} : commentaire sans lemme (type 3 seul, Jb ${ch}, ${v})`)
}

// ── Rapport ──
console.log(`\n=== Ancrage ${LIVRE} / ${ID_OEUVRE} — ${COMMIT ? 'COMMIT' : 'SIMULATION'} ===`)
console.log(`Segments: ${segs.length} · déjà en base: ${deja.size} liens · à créer: ${aInserer.length}\n`)
console.log('Chap | seg | type1 | type3 | àConst | flag')
for (const ch of Object.keys(parChap).sort((a, b) => (+a || 999) - (+b || 999))) {
  const s = parChap[ch]
  console.log(`${String(ch).padStart(4)} | ${String(s.seg).padStart(3)} | ${String(s.t1).padStart(5)} | ${String(s.t3).padStart(5)} | ${String(s.aConstituer).padStart(6)} | ${String(s.flag).padStart(4)}`)
}
if (flags.length) { console.log(`\n⚠ ${flags.length} signalements :`); flags.slice(0, 40).forEach(f => console.log('  - ' + f)); if (flags.length > 40) console.log(`  … (+${flags.length - 40})`) }

if (!COMMIT) { console.log('\n(simulation — rien écrit ; relancer avec --commit pour insérer)'); process.exit(0) }

// ── Écriture ──
for (let i = 0; i < aInserer.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aInserer.slice(i, i + 500))
  if (error) { console.error('Erreur insert:', error.message); process.exit(1) }
}
const ids = [...segMarques]
for (let i = 0; i < ids.length; i += 500) {
  const { error } = await sb.from('segments').update({ liens_revus_le: new Date().toISOString(), liens_revus_par: 'IA' }).in('id', ids.slice(i, i + 500))
  if (error) { console.error('Erreur maj segments:', error.message); process.exit(1) }
}
console.log(`\n✓ ${aInserer.length} liens créés · ${ids.length} segments marqués.`)
