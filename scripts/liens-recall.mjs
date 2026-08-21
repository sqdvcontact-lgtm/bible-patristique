// PORTAGE DU FILET DE RAPPEL — générique (une œuvre en argument).
//
// Porte les candidats de la 1re constitution (`liens_anciens_controle.json`) non
// encore posés, comme couche de base EN ARBITRAGE (provenance ia, douteux,
// arbitrage_requis) : haute couverture, honnêteté sur le statut (non relu).
//
// N'À FAIRE QUE SUR UNE SOURCE PROPRE. L'ancienne passe est bruitée sur les œuvres
// sans références (Climaque, Cité, Psaumes : versets « aimants » collés sur 30 %
// des segments). Ici on écarte automatiquement les AIMANTS — tout verset apparu
// sur plus de SEUIL segments = seau thématique, pas citation. Mais si l'œuvre est
// globalement bruitée (ratio > ~2/seg avec longue traîne), NE PAS la porter.
//
// PSAUMES : l'ancien numérote en HÉBREU, l'ossature en GREC → conversion héb→grec.
//
//   node scripts/liens-recall.mjs A0013O0002 --dry
//   node scripts/liens-recall.mjs A0013O0002

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = process.argv.find((a) => /^A\d{4}O\d{4}$/.test(a));
const DRY = process.argv.includes('--dry');
if (!OEUVRE) { console.error('usage : node scripts/liens-recall.mjs <id_oeuvre> [--dry]'); process.exit(1); }

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

  // L'ancienne constitution est DÉJÀ en numérotation d'ossature (grec/Vulgate) —
  // #59 = PSA.18.13 = le bon verset. NE PAS convertir (bug corrigé 21/07 : la
  // conversion héb→grec décalait tous les psaumes d'un cran). On vérifie seulement
  // l'existence dans l'ossature.
  function versOssature(c) { return canonSet.has(c) ? c : null; }

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

  // AIMANTS : versets collés sur trop de segments = seau thématique, pas citation.
  // Fréquence par canon (grec-normalisé) dans l'ancien, pour cette œuvre.
  const SEUIL_AIMANT = Math.max(10, Math.round(0.015 * segs.length));
  const freq = new Map();
  for (const e of anc.liens) {
    if (e.id_oeuvre !== OEUVRE) continue;
    const vus2 = new Set();
    for (const l of e.liens) { if (!l.canon_id) continue; const k = norm(l.canon_id); if (vus2.has(k)) continue; vus2.add(k); freq.set(k, (freq.get(k) || 0) + 1); }
  }
  const aimants = new Set([...freq.entries()].filter(([, n]) => n > SEUIL_AIMANT).map(([k]) => k));
  if (aimants.size) console.log(`aimants écartés (>${SEUIL_AIMANT} seg) : ${[...aimants].slice(0, 8).join(', ')}${aimants.size > 8 ? '…' : ''} (${aimants.size})`);

  const liens = []; const vus = new Set(); const manques = new Map();
  let candidats = 0, ecartesAimant = 0;
  for (const e of anc.liens) {
    if (e.id_oeuvre !== OEUVRE) continue;
    const sid = parNum.get(e.segment_numero);
    if (!sid) continue;
    for (const l of e.liens) {
      if (!l.canon_id) continue;
      candidats++;
      if (aimants.has(norm(l.canon_id))) { ecartesAimant++; continue; }
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
  console.log(`${candidats} candidats anciens · ${ecartesAimant} écartés (aimants) · ${liens.length} à porter (nouveaux) — t1:${c(1)} t2:${c(2)} t3:${c(3)} t4:${c(4)}`);
  if (manques.size) console.log('non convertis (écartés) :', [...manques.entries()].map(([k, n]) => `${k}×${n}`).join(', '));
  if (DRY) { console.log('(--dry) rien écrit'); return; }
  for (let i = 0; i < liens.length; i += 500) {
    const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`✓ ${liens.length} liens portés en arbitrage.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
