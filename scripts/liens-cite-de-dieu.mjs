// Passe sémantique par appariement des CITATIONS DÉLIMITÉES — Augustin, « La Cité
// de Dieu » (A0010O0002). Ni référence en parenthèse (l'édition n'en donne pas),
// ni commentaire suivi d'un seul livre : l'ouvrage cite toute l'Écriture ET les
// classiques (Virgile, Cicéron, Varron). Mais chaque citation est entre
// guillemets — le span est donc connu, et l'on peut l'apparier au verset.
//
// MÉTHODE. Pour chaque span « … » d'au moins 5 mots de contenu, on cherche dans
// toute la Bible (versets_v2, toutes traductions) le verset dont le CONTENU est
// le mieux couvert par la citation :
//     rec = poids(V ∩ Q) / poids(V)      (part du verset présente dans la citation)
// Métrique de rappel du verset, et non Dice : une citation dépasse souvent un
// verset (elle en couvre deux) ; c'est la couverture du verset qui compte.
// Les citations classiques ne couvrent aucun verset → rejetées par le seuil.
// Poids = IDF calculé sur le corpus lui-même. Best-of toutes traductions.
//
// Type 1, provenance ia. rec ≥ SEUIL_SUR → probable ; entre les deux → douteux
// + arbitrage. Dédoublonne (segment_id, canon_id, type) contre l'existant.
//
//   node scripts/liens-cite-de-dieu.mjs --dry
//   node scripts/liens-cite-de-dieu.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Méthode réutilisable : id d'œuvre en argument (défaut = La Cité de Dieu).
//   node scripts/liens-cite-de-dieu.mjs A0013O0002 --dry
const OEUVRE = process.argv.find((a) => /^A\d{4}O\d{4}$/.test(a)) || 'A0010O0002';
const DRY = process.argv.includes('--dry');
const SEUIL_SUR = 0.55;   // F-mesure au-delà → probable
const SEUIL_BAS = 0.35;   // entre les deux → douteux/arbitrage ; en-deçà → rejet
const MIN_TOKENS_COMMUNS = 3;
const MIN_MOTS_QUOTE = 5;

// ── Normalisation (identique aux passes Job/Psaumes) ────────────────────────
const ancienneGraphie = (m) => m.replace(/oi/g, 'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants');
const mots = (s) => (s || '')
  .replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter((m) => m.length > 2).map((m) => ancienneGraphie(m).slice(0, 5));
const VIDES = new Set(['les', 'des', 'que', 'qui', 'pour', 'dans', 'avec', 'est', 'son', 'sur', 'plus', 'tout', 'tous', 'par', 'une', 'aux', 'ses', 'leur', 'ils', 'elle', 'vous', 'nous', 'mais', 'comme', 'cette', 'ces', 'pas', 'ont', 'sont', 'lui', 'ne', 'se', 'de', 'du', 'la', 'le', 'et', 'en', 'un', 'il', 'ce', 'sa', 'ils', 'car', 'point', 'donc', 'quand', 'dont', 'fait', 'faire', 'avoir', 'etre']);
const contentTokens = (s) => mots(s).filter((m) => !VIDES.has(m));

async function pageAll(table, sel, filt) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).range(de, de + 999);
    if (filt) q = filt(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  console.log('Chargement du corpus biblique…');
  const versets = await pageAll('versets_v2', 'canon_id, texte', (q) => q.not('canon_id', 'is', null).not('texte', 'is', null));
  console.log(`  ${versets.length} versets (toutes traductions)`);

  // docs = un par ligne versets_v2 ; on garde ses tokens de contenu.
  const docs = [];
  const df = new Map();
  for (const v of versets) {
    const toks = new Set(contentTokens(v.texte));
    if (!toks.size) continue;
    docs.push({ canon: v.canon_id, toks });
    for (const t of toks) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length;
  const idf = (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;

  // index inversé token → indices de docs (on saute les tokens ultra-fréquents)
  const PLAFOND_DF = N * 0.06;
  const index = new Map();
  docs.forEach((d, i) => {
    for (const t of d.toks) {
      if ((df.get(t) || 0) > PLAFOND_DF) continue;
      let a = index.get(t); if (!a) index.set(t, a = []); a.push(i);
    }
  });
  // poids total de chaque doc (pour le dénominateur rec)
  const poidsDoc = docs.map((d) => { let w = 0; for (const t of d.toks) w += idf(t); return w; });

  // ── segments ─────────────────────────────────────────────────────────────
  const segs = await pageAll('segments', 'id, segment_numero, segment_texte', (q) => q.eq('id_oeuvre', OEUVRE));
  const spans = [];
  for (const s of segs) {
    const t = (s.segment_texte || '').replace(/<[^>]+>/g, ' ');
    for (const m of t.matchAll(/«([^»]{4,400})»/g)) {
      const brut = m[1].trim().replace(/\s+/g, ' ');
      const toks = contentTokens(brut);
      if (toks.length < MIN_MOTS_QUOTE) continue;
      spans.push({ sid: s.id, num: s.segment_numero, brut, toks: new Set(toks) });
    }
  }
  console.log(`${spans.length} spans cités (≥ ${MIN_MOTS_QUOTE} mots de contenu)`);

  // ── appariement ────────────────────────────────────────────────────────────
  const liens = [];
  const dist = { sur: 0, douteux: 0, rejet: 0 };
  const echantillon = [];
  for (const sp of spans) {
    // accumuler poids(V ∩ Q) pour tout doc partageant un token de la citation
    const acc = new Map(); // docIndex → {w, n}
    for (const t of sp.toks) {
      const lst = index.get(t); if (!lst) continue;
      const w = idf(t);
      for (const i of lst) { const e = acc.get(i) || { w: 0, n: 0 }; e.w += w; e.n += 1; acc.set(i, e); }
    }
    // Poids de contenu de la citation (dénominateur de précision). On ne compte
    // que les tokens indexés (les ultra-fréquents sont hors index des deux côtés).
    let poidsQuote = 0;
    for (const t of sp.toks) if ((df.get(t) || 0) <= PLAFOND_DF) poidsQuote += idf(t);
    // meilleur doc par F-mesure rec × préc : rec = part du verset couverte,
    // préc = part de la citation qu'est le verset. La précision pénalise le verset
    // trop court (nom propre partagé, verset « aimant ») que rec seul primait.
    let best = null;
    for (const [i, e] of acc) {
      if (e.n < MIN_TOKENS_COMMUNS) continue;
      const rec = e.w / poidsDoc[i];
      const prec = poidsQuote ? e.w / poidsQuote : 0;
      const f = (rec + prec) ? (2 * rec * prec) / (rec + prec) : 0;
      if (!best || f > best.f) best = { i, rec, prec, f, n: e.n };
    }
    if (!best || best.f < SEUIL_BAS) { dist.rejet++; continue; }
    const canon = docs[best.i].canon;
    const fiab = best.f >= SEUIL_SUR ? 'probable' : 'douteux';
    if (fiab === 'probable') dist.sur++; else dist.douteux++;
    liens.push({
      segment_id: sp.sid, canon_id: canon, type: 1,
      fiabilite: fiab, provenance: 'ia', arbitrage_requis: fiab === 'douteux',
      motif: `Appariement de la citation « ${sp.brut.slice(0, 80)}${sp.brut.length > 80 ? '…' : ''} » à ${canon} (couverture ${(best.rec * 100).toFixed(0)} %, précision ${(best.prec * 100).toFixed(0)} %).`,
    });
    if (echantillon.length < 40) echantillon.push({ num: sp.num, canon, f: best.f, q: sp.brut.slice(0, 70) });
  }

  console.log(`\nprobables (rec ≥ ${SEUIL_SUR}) : ${dist.sur}`);
  console.log(`douteux (${SEUIL_BAS}–${SEUIL_SUR})  : ${dist.douteux}`);
  console.log(`rejetés (< ${SEUIL_BAS})     : ${dist.rejet}`);
  // AIMANTS. Un verset qui remporte beaucoup de citations différentes est
  // rarement cité autant : c'est un verset fait de mots courants, sur lequel
  // l'appariement retombe faute de mieux (3 Jn 1, 11 « Bien-aimé… » attire tout
  // « bien-aimé »). On les signale pour relecture ciblée — sans les écarter
  // d'office : certains versets SONT réellement cités en boucle par les Pères.
  const parCanon = new Map();
  for (const l of liens) {
    let a = parCanon.get(l.canon_id); if (!a) parCanon.set(l.canon_id, a = []);
    a.push(l.segment_id);
  }
  const aimants = [...parCanon.entries()].filter(([, a]) => a.length >= 4).sort((x, y) => y[1].length - x[1].length);
  if (aimants.length) {
    console.log(`\n── versets « aimants » (≥ 4 citations distinctes) — à relire en priorité`);
    for (const [c, a] of aimants.slice(0, 20)) console.log(`  ${c.padEnd(12)} ${a.length}×`);
  }

  console.log('\n── échantillon');
  for (const e of echantillon) console.log(`  #${e.num} ${e.canon.padEnd(12)} F${(e.f * 100).toFixed(0)}  ${e.q}`);

  if (DRY) { console.log('\n(--dry : rien écrit)'); return; }

  // dédup contre l'existant
  const ids = [...new Set(liens.map((l) => l.segment_id))];
  const deja = new Set();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 300));
    for (const l of data || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);
  }
  const vus = new Set();
  const aEcrire = liens.filter((l) => {
    const cle = `${l.segment_id}|${l.canon_id}|${l.type}`;
    if (deja.has(cle) || vus.has(cle)) return false;
    vus.add(cle); return true;
  });
  for (let i = 0; i < aEcrire.length; i += 500) {
    const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`\n✓ ${aEcrire.length} écrits · ${liens.length - aEcrire.length} déjà présents`);
}
main().catch((e) => { console.error(e); process.exit(1); });
