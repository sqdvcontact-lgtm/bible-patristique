// CONVERSION VULGATE → OSSATURE (deutérocanoniques : SIR, TOB, JDT, BAR).
//
// La Passe 1 met ces références de côté : leur numéro Vulgate ne désigne PAS le
// même verset que notre ossature, et deux « Vulgate » divergent entre elles — le
// numéro est donc inexploitable (charte §9.5 : l'alignement est SÉMANTIQUE).
//
// Ici on résout la cible par le TEXTE : on apparie la citation adjacente à la
// référence contre les versets du livre visé (recherche restreinte à ce livre),
// et le meilleur recouvrement donne le canon_id. Fiabilité « douteux » +
// arbitrage : la cible vient d'un appariement, à valider. Les références SANS
// citation (numéro seul) ne sont PAS devinées — on les liste pour la lecture.
//
//   node scripts/liens-vulgate-conversion.mjs A0013O0002 --dry [--partie="..."]
//   node scripts/liens-vulgate-conversion.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliser, RENVOIS_INTERNES, RE_PARENTHESE, RE_REF, RE_PAREN_NUM,
  citationAdjacente, VULGATE_A_CONVERTIR, chargerAbrev, chargerOssature, creerResolveur,
  stemmes, construireIdf, profilVerset, profilCitation, scoreProfil } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-vulgate-conversion.mjs <id_oeuvre> [--dry] [--partie="..."]'); process.exit(1) }

const SEUIL = 0.28     // score amélioré (IDF + bigrammes) : seuil sur cette échelle
const MARGE = 0.06     // le meilleur doit devancer nettement le 2ᵉ (garde d'ambiguïté)
const FENETRE_CH = 2   // le n° Vulgate n'est qu'un indice : chapitre visé ± 2 (les
                       // chapitres SIR s'alignent grosso modo, seuls les versets glissent)

const ABREV = await chargerAbrev(sb)
const oss = await chargerOssature(sb)
const { codeLivre, livreEnAmont } = creerResolveur({ ABREV, ...oss })

// ── Textes des livres deutéro (français : Sacy + Crampon), profils précalculés ──
const parStems = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('versets_v2').select('canon_id, livre, texte')
    .in('trad_id', ['TR0001', 'TR0003']).in('livre', [...VULGATE_A_CONVERTIR]).not('canon_id', 'is', null).range(from, from + 999)
  if (!data?.length) break
  for (const v of data) { if (!parStems.has(v.canon_id)) parStems.set(v.canon_id, []); parStems.get(v.canon_id).push(stemmes(v.texte)) }
  if (data.length < 1000) break
}
const idf = construireIdf([...parStems.values()].flat())
const parCanon = new Map()   // canon_id → [profils]
for (const [canon_id, liste] of parStems) parCanon.set(canon_id, liste.map(st => profilVerset(st, idf)))
console.log(`${parCanon.size} créneaux deutéro chargés`)

// ── Segments ──────────────────────────────────────────────────────────────────
const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, segment_numero, segment_texte, texte_original').eq('id_oeuvre', OEUVRE).eq('nature', 'texte')
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data } = await q.order('id').range(from, from + 999)
  if (!data?.length) break; segs.push(...data); if (data.length < 1000) break
}
const ids = segs.map(s => s.id)
const deja = new Set()
for (let i = 0; i < ids.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 300))
  for (const l of data ?? []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`)
}

/** Texte de la citation la plus proche de [start,end] (enchâssante prioritaire). */
function citationProche(texte, start, end) {
  let best = null, bestDist = Infinity, i = 0
  while (true) {
    const o = texte.indexOf('«', i); if (o < 0) break
    const f = texte.indexOf('»', o + 1); if (f < 0) break
    const txt = texte.slice(o + 1, f).trim()
    if (start >= o && end <= f) return txt
    const d = Math.min(Math.abs(o - end), Math.abs(start - f))
    if (d < bestDist) { bestDist = d; best = txt }
    i = f + 1
  }
  return (best && bestDist < 60) ? best : null
}

const liens = []
const stats = { refs: 0, apparies: 0, sousSeuil: 0, sansCitation: 0 }
const sansCitation = []

// Détecte les réfs deutéro (formes a et b), comme la Passe 1 mais ciblées Vulgate.
for (const s of segs) {
  const texte = String(s.texte_original ?? s.segment_texte ?? '')
  const refs = []
  for (const par of texte.matchAll(RE_PARENTHESE)) {
    for (const m of par[1].matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v] = m
      if (RENVOIS_INTERNES.has(normaliser(nom))) continue
      const livre = codeLivre(rang, nom)
      if (livre && VULGATE_A_CONVERTIR.has(livre)) refs.push({ livre, chBrut, v, start: par.index, end: par.index + par[0].length })
    }
  }
  for (const m of texte.matchAll(RE_PAREN_NUM)) {
    const livre = livreEnAmont(texte, m.index)
    if (livre && VULGATE_A_CONVERTIR.has(livre)) refs.push({ livre, chBrut: m[1], v: m[2], start: m.index, end: m.index + m[0].length })
  }

  for (const r of refs) {
    stats.refs++
    const cite = citationAdjacente(texte, r.start, r.end)
    const quote = cite ? citationProche(texte, r.start, r.end) : null
    if (!quote || quote.length < 8) { stats.sansCitation++; sansCitation.push(`#${s.segment_numero} ${r.livre} ${r.chBrut},${r.v ?? '?'}`); continue }
    // Appariement restreint au livre ET au chapitre Vulgate ± FENETRE_CH : le
    // texte tranche le verset, le numéro borne la zone (évite les sauts de chapitre).
    const chVulg = parseInt(r.chBrut, 10)
    const pQ = profilCitation(stemmes(quote))
    let best = 0, second = 0, cible = null
    for (const [canon_id, profils] of parCanon) {
      const [liv, chS] = canon_id.split('.')
      if (liv !== r.livre) continue
      if (Number.isFinite(chVulg) && Math.abs(parseInt(chS, 10) - chVulg) > FENETRE_CH) continue
      let sc = 0
      for (const pv of profils) { const d = scoreProfil(pQ, pv, idf); if (d > sc) sc = d }
      if (sc > best) { second = best; best = sc; cible = canon_id }
      else if (sc > second) { second = sc }
    }
    if (!cible || best < SEUIL) { stats.sousSeuil++; continue }
    if (best - second < MARGE) { stats.sousSeuil++; continue }   // ambigu → rejeté
    if (deja.has(`${s.id}|${cible}|1`)) continue
    stats.apparies++
    liens.push({ segment_id: s.id, canon_id: cible, type: 1, fiabilite: 'douteux', provenance: 'editeur', arbitrage_requis: true,
      motif: `Conversion Vulgate→ossature par le texte : réf éditeur ${r.livre} ${r.chBrut},${r.v ?? '?'} (num. Vulgate), cible ${cible} par recouvrement (${best.toFixed(2)}) de « ${quote.slice(0, 50)} ».`,
      _num: `${s.segment_numero} ${r.livre} ${r.chBrut},${r.v ?? '?'}→${cible} ${best.toFixed(2)}` })
  }
}

console.log(`\n${stats.refs} réfs deutéro · ${stats.apparies} appariées · ${stats.sousSeuil} sous le seuil · ${stats.sansCitation} sans citation`)
if (DRY) {
  console.log('\n── échantillon apparié')
  for (const l of liens.slice(0, 15)) console.log(`  ${l._num}`)
  if (sansCitation.length) console.log(`\n── sans citation (à traiter en lecture) : ${sansCitation.slice(0, 12).join(' · ')}${sansCitation.length > 12 ? ' …' : ''}`)
  console.log('\n(--dry : rien écrit)'); process.exit(0)
}
for (const l of liens) delete l._num
for (let i = 0; i < liens.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${liens.length} liens écrits (Vulgate convertie par le texte, douteux + arbitrage)`)
