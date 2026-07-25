// PASSE À PART DES PSAUMES — audit des liens de psaumes d'une œuvre.
//
// Les psaumes sont le terrain le plus miné : trois numérotations (hébraïque,
// grecque/Vulgate = ossature, AELF) et un bug de décalage déjà rencontré. Le texte
// n'étant chargé que pour une partie des psaumes, on ne peut pas tout vérifier par
// le texte : on vérifie la NUMÉROTATION. Pour chaque segment, on affiche tous ses
// liens de psaume avec grec (ossature) ET hébreu (ch_heb/v_heb), la fiabilité, la
// source (filet ou lu), et le span cité. On SIGNALE les segments où les liens de
// psaume divergent (héb différent) — c'est là que se cachent les erreurs de numéro.
//
//   node scripts/audit-psaumes.mjs A0010O0001

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = process.argv.find((a) => /^A\d{4}O\d{4}$/.test(a));
if (!OEUVRE) { console.error('usage : node scripts/audit-psaumes.mjs <id_oeuvre>'); process.exit(1); }

async function pageAll(table, sel, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).range(de, de + 999);
    if (filt) q = filt(q);
    const { data } = await q; o.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

async function main() {
  const heb = new Map();
  for (const r of await pageAll('versets_canon', 'id, ch_heb, v_heb, livre'))
    if (r.livre === 'PSA' && r.ch_heb != null) heb.set(r.id, `${r.ch_heb},${r.v_heb}`);

  const segs = await pageAll('segments', 'id, segment_numero, segment_texte', (q) => q.eq('id_oeuvre', OEUVRE));
  const byId = new Map(segs.map((s) => [s.id, s]));
  const ids = segs.map((s) => s.id);

  const parSeg = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type, fiabilite, motif').in('segment_id', ids.slice(i, i + 200)).like('canon_id', 'PSA.%');
    for (const l of data || []) { if (!parSeg.has(l.segment_id)) parSeg.set(l.segment_id, []); parSeg.get(l.segment_id).push(l); }
  }

  const strip = (t) => (t || '').replace(/<[^>]+>/g, ' ').trim();
  const spanCite = (t) => { const m = strip(t).match(/[«"]([^»"]{6,90})[»"]/); return m ? m[1].trim() : ''; };

  let nSeg = 0, nLien = 0, conflits = [];
  const lignes = [];
  for (const s of segs) {
    const ls = parSeg.get(s.id); if (!ls) continue;
    nSeg++; nLien += ls.length;
    // héb distincts (hors même verset) = conflit potentiel
    const hebs = new Set(ls.map((l) => heb.get(l.canon_id) || l.canon_id));
    const marque = hebs.size > 1 ? ' ⚠CONFLIT' : '';
    if (hebs.size > 1) conflits.push(s.segment_numero);
    const detail = ls.map((l) => `${l.canon_id}(héb ${heb.get(l.canon_id) || '?'};${l.fiabilite[0]}${(l.motif || '').startsWith('Filet') ? ';filet' : ''})`).join('  ');
    lignes.push(`#${s.segment_numero}${marque}  « ${spanCite(s.segment_texte).slice(0, 60)} »\n    ${detail}`);
  }
  console.log(`Œuvre ${OEUVRE} — ${nLien} liens de psaume sur ${nSeg} segments · ${conflits.length} segments à numérotation divergente`);
  if (conflits.length) console.log('CONFLITS (segments) :', conflits.join(', '));
  console.log('\n' + lignes.filter((l) => l.includes('⚠')).join('\n'));
}
main().catch((e) => { console.error(e); process.exit(1); });
