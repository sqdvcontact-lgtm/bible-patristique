// PORTAGE DU FILET DE RAPPEL — Confessions (A0010O0001).
//
// L'audit a montré un recall partiel : la 1re constitution liait 764 segments
// (propre, 1,6/seg) contre 349 pour moi. Plutôt que relire 602 segments d'un
// bloc, on PORTE les candidats anciens non encore posés comme couche de base EN
// ARBITRAGE (provenance ia, fiabilité douteux, arbitrage_requis) : haute
// couverture, honnêteté sur le statut (non relu). Mes 224 recoupements attestent
// la qualité de la source.
//
// PSAUMES : la 1re constitution numérote en HÉBREU (PSA.35.3) ; l'ossature est en
// GREC (PSA.34.3). Sans conversion, le lien pointerait sur un autre verset. On
// convertit via ch_heb/v_heb ; ce qui ne se convertit pas est signalé et écarté.
//
//   node scripts/liens-confessions-recall.mjs --dry
//   node scripts/liens-confessions-recall.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

async function pageAll(table, sel, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).range(de, de + 999);
    if (filt) q = filt(q);
    const { data } = await q;
    o.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

async function main() {
  // ossature : canonSet + conversion héb→grec (parHebreu) + grec→héb (toHeb)
  const canonSet = new Set(); const parHebreu = new Map(); const toHeb = new Map();
  for (const r of await pageAll('versets_canon', 'id, livre, ch_heb, v_heb')) {
    canonSet.add(r.id);
    if (r.livre === 'PSA' && r.ch_heb != null) { parHebreu.set(`PSA.${r.ch_heb}.${r.v_heb}`, r.id); toHeb.set(r.id, `PSA.${r.ch_heb}.${r.v_heb}`); }
  }
  const norm = (c) => toHeb.get(c) || c; // grec→héb pour comparer

  // convertit un canon_id ancien vers l'ossature grecque (psaumes héb→grec)
  function versOssature(c) {
    if (canonSet.has(c) && !c.startsWith('PSA.')) return c;           // livre non-psaume déjà valide
    if (!c.startsWith('PSA.')) return canonSet.has(c) ? c : null;
    // psaume : l'ancien est en héb → convertir
    const grec = parHebreu.get(c);
    if (grec) return grec;
    return canonSet.has(c) ? c : null; // au cas où déjà grec
  }

  const segs = await pageAll('segments', 'id, segment_numero', (q) => q.eq('id_oeuvre', OEUVRE));
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const ids = segs.map((s) => s.id);

  // posés (normalisés) : segment_id|hébNorm|type
  const deja = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 200));
    for (const l of data || []) if (l.canon_id) deja.add(`${l.segment_id}|${norm(l.canon_id)}|${l.type}`);
  }

  const anc = JSON.parse(readFileSync(new URL('./liens_anciens_controle.json', import.meta.url)));
  const liens = []; const vus = new Set(); const manques = new Map();
  let candidats = 0;
  for (const e of anc.liens) {
    if (e.id_oeuvre !== OEUVRE) continue;
    const sid = parNum.get(e.segment_numero);
    if (!sid) continue;
    for (const l of e.liens) {
      if (!l.canon_id) continue;
      candidats++;
      const cible = versOssature(l.canon_id);
      if (!cible) { manques.set(l.canon_id, (manques.get(l.canon_id) || 0) + 1); continue; }
      const type = l.type || 1;
      const cle = `${sid}|${norm(cible)}|${type}`;
      if (deja.has(cle) || vus.has(cle)) continue;
      vus.add(cle);
      liens.push({
        segment_id: sid, canon_id: cible, type,
        fiabilite: 'douteux', provenance: 'ia', arbitrage_requis: true,
        motif: `Filet de rappel : lien de la première constitution (${l.ref || l.canon_id}) porté en arbitrage, non relu.`,
      });
    }
  }

  const c = (t) => liens.filter((x) => x.type === t).length;
  console.log(`${candidats} candidats anciens · ${liens.length} à porter (nouveaux) — t1:${c(1)} t2:${c(2)} t3:${c(3)} t4:${c(4)}`);
  if (manques.size) console.log('non convertis (écartés) :', [...manques.entries()].map(([k, n]) => `${k}×${n}`).join(', '));
  if (DRY) { console.log('(--dry) rien écrit'); return; }
  for (let i = 0; i < liens.length; i += 500) {
    const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`✓ ${liens.length} liens portés en arbitrage.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
