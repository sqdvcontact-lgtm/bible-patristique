// RELEVÉ DU CORPUS — la mémoire des mesures.
//
// Pourquoi cet outil. Chaque correction se vérifie LOCALEMENT : ce chapitre
// s'améliore-t-il ? Trois garde-fous ont ainsi arrêté des écritures fautives le
// 24/07/2026. Mais aucun ne répondait à l'autre question : **quelque chose s'est-il
// dégradé ailleurs ?** 323 versets ont été déplacés ce jour-là sans qu'on mesure
// jamais l'effet global d'une correction sur le reste.
//
// Ce script rassemble les mesures que les détecteurs savent déjà produire, les range
// dans `releves` avec leur date, et affiche **l'écart depuis la dernière fois** — en
// signalant ce qui empire. Le gain n'est pas dans la mesure, qui existait ; il est
// dans sa mémoire.
//
//   node scripts/releve.mjs            → mesure, compare, enregistre
//   node scripts/releve.mjs --sec      → mesure et compare sans rien enregistrer
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SEC = process.argv.includes('--sec');
const NOM = { TR0001: 'Sacy', TR0002: 'Segond', TR0003: 'Crampon', TR0004: 'Vulgate', TR0005: 'Septante' };

async function pageAll(table, sel, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).order('id').range(de, de + 999);
    if (filt) q = filt(q);
    const { data, error } = await q;
    if (error) throw error;
    o.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

// ── collecte ────────────────────────────────────────────────────────────────
const mesures = [];            // { cle, valeur, sens }
const add = (cle, valeur, sens = -1) => mesures.push({ cle, valeur, sens });

const canon = await pageAll('versets_canon', 'id');
const nCanon = canon.length;
add('ossature.creneaux', nCanon, +1);

const parTrad = {};
for (const tr of Object.keys(NOM)) {
  const V = await pageAll('versets_v2', 'canon_id, texte, ordre_slot', (q) => q.eq('trad_id', tr));
  parTrad[tr] = V;
  const avecTexte = V.filter((r) => r.texte && String(r.texte).trim());
  add(`${tr}.versets`, V.length, +1);
  add(`${tr}.couverture`, new Set(avecTexte.filter((r) => r.canon_id).map((r) => r.canon_id)).size, +1);
  add(`${tr}.sans_creneau`, V.filter((r) => !r.canon_id).length);
  add(`${tr}.vides`, V.length - avecTexte.length);
}

// créneaux que personne ne remplit
const remplis = new Set();
for (const tr of Object.keys(NOM)) for (const r of parTrad[tr]) if (r.canon_id && r.texte?.trim()) remplis.add(r.canon_id);
add('ossature.creneaux_orphelins', canon.filter((r) => !remplis.has(r.id)).length);

// liens
const liens = await pageAll('liens_bibliques', 'fiabilite, provenance, arbitrage_requis');
add('liens.total', liens.length, +1);
for (const f of ['vérifié', 'probable', 'douteux', 'à constituer'])
  add(`liens.${f.replace(/\s/g, '_')}`, liens.filter((l) => l.fiabilite === f).length, f === 'vérifié' ? +1 : -1);
add('liens.en_arbitrage', liens.filter((l) => l.arbitrage_requis).length);
add('liens.lus', liens.filter((l) => l.provenance === 'lecture').length, +1);

// points sensibles, par statut
const pts = await pageAll('points_sensibles', 'statut');
for (const s of [...new Set(pts.map((p) => p.statut || '?'))])
  add(`points.${s}`, pts.filter((p) => (p.statut || '?') === s).length, s === 'resolu' ? +1 : -1);

// segments
const segs = await pageAll('segments', 'id, paragraphe, liens_revus_le');
add('segments.total', segs.length, +1);
add('segments.paragraphes', segs.filter((s) => s.paragraphe != null).length, +1);
add('segments.liens_revus', segs.filter((s) => s.liens_revus_le).length, +1);

// ── comparaison avec le dernier relevé ──────────────────────────────────────
const { data: precedents } = await sb.from('releves').select('cle, valeur, mesure_le').order('mesure_le', { ascending: false }).limit(2000);
const avant = new Map();
for (const r of precedents || []) if (!avant.has(r.cle)) avant.set(r.cle, Number(r.valeur));
const dateAvant = precedents?.[0]?.mesure_le?.slice(0, 16).replace('T', ' ') ?? null;

console.log(`\n╔═ RELEVÉ DU CORPUS — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
console.log(dateAvant ? `║  comparé au relevé du ${dateAvant}\n` : '║  premier relevé : rien à comparer\n');

const empire = [];
let section = '';
for (const m of mesures) {
  const s = m.cle.split('.')[0];
  if (s !== section) { section = s; console.log(`  ── ${NOM[s] ?? s}`); }
  const av = avant.get(m.cle);
  let delta = '';
  if (av != null && av !== m.valeur) {
    const d = m.valeur - av;
    const bon = (d > 0 ? 1 : -1) === m.sens;
    delta = `   ${d > 0 ? '+' : ''}${d}${bon ? '' : '   ⚠ EMPIRE'}`;
    if (!bon) empire.push({ cle: m.cle, av, ap: m.valeur, d });
  }
  console.log(`     ${m.cle.split('.').slice(1).join('.').padEnd(22)} ${String(m.valeur).padStart(7)}${delta}`);
}

console.log(empire.length
  ? `\n⚠ ${empire.length} mesure(s) ont EMPIRÉ depuis le dernier relevé :\n` + empire.map((e) => `     ${e.cle} : ${e.av} → ${e.ap}`).join('\n')
  : (dateAvant ? '\n✓ aucune mesure n’a empiré' : ''));

if (SEC) { console.log('\n(--sec : rien enregistré)'); process.exit(0); }
const { error } = await sb.from('releves').insert(mesures.map((m) => ({ cle: m.cle, valeur: m.valeur, sens: m.sens })));
console.log(error ? `\n✗ ${error.message}` : `\n✓ ${mesures.length} mesures enregistrées`);
process.exit(0);
