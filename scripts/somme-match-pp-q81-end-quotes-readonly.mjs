import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const R = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${R}/pp-q81-end-raw.json`, 'utf8'))
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const STOP = new Set('alors aussi avec cette comme dans depuis elle elles encore entre est fait leur leurs mais meme nous pour quand sans selon sera sont sous tout tous toute tres une vous votre ainsi avoir celui cette dont etre fait faut plus'.split(' '))
const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w))
const verses = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset,ref,TR0001,TR0003,TR0004').order('id_verset').range(from, from + 999)
  if (error) throw error
  verses.push(...data)
  if (data.length < 1000) break
}
const indexed = verses.map((verse) => ({ verse, sets: [verse.TR0001, verse.TR0003, verse.TR0004].filter(Boolean).map((text) => new Set(norm(text))) }))
const linked = new Map()
for (const link of raw.links) { const set = linked.get(link.segment_id) ?? new Set(); if (link.canon_id) set.add(link.canon_id); linked.set(link.segment_id, set) }
const rows = []
for (const segment of raw.segments) {
  const quotes = [...(segment.segment_texte ?? '').matchAll(/«\s*([^»]{12,400})\s*»/g)].map((x) => x[1]).filter((q) => norm(q).length >= 3)
  for (const quote of quotes) {
    const q = new Set(norm(quote)); const scores = []
    for (const item of indexed) {
      let best = 0
      for (const verseSet of item.sets) { const score = [...q].filter((w) => verseSet.has(w)).length / Math.max(1, q.size); if (score > best) best = score }
      if (best >= 0.35) scores.push({ id_verset: item.verse.id_verset, ref: item.verse.ref, score: Number(best.toFixed(3)) })
    }
    scores.sort((a, b) => b.score - a.score)
    rows.push({ segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, quote, linked: [...(linked.get(segment.id) ?? [])], top: scores.slice(0, 5) })
  }
}
writeFileSync(`${R}/pp-q81-end-quote-matches.json`, JSON.stringify(rows, null, 2) + '\n')
console.log(JSON.stringify({ verses: verses.length, quotes: rows.length, high: rows.filter((x) => x.top[0]?.score >= .65).length, high_unlinked: rows.filter((x) => x.top[0]?.score >= .65 && !x.linked.includes(x.top[0].id_verset)).length }, null, 2))
