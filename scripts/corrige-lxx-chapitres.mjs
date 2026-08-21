// SEPTANTE — chapitres décalés : origine, contrôle, correction.
//
// La vérification par le contenu est impossible ici : le grec ne se compare pas
// lexicalement au français. On contrôle donc par un autre biais, indépendant de la
// corrélation de forme qui a signalé ces chapitres — **l'écart de longueur à la
// médiane du créneau**, mesuré verset par verset avant et après le déplacement.
// Si le grec se rapproche du régime attendu, le déplacement est bon.
//
//   node scripts/corrige-lxx-chapitres.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const REGIME = 0.93;          // régime propre de la Septante, mesuré sur tout le corpus

const CAS = JSON.parse(readFileSync('scripts/_chapitres_decales.json', 'utf8'))
  .filter((s) => s.trad === 'Septante');

// longueurs des autres témoins, pour la médiane du créneau
const AUTRES = ['TR0001', 'TR0002', 'TR0003', 'TR0004'];
async function longueurs(tr, livre, ch) {
  const { data } = await sb.from('versets_v2').select('canon_id, texte')
    .eq('trad_id', tr).eq('livre', livre).in('ch_orig', [ch - 1, ch, ch + 1]);
  const m = new Map();
  for (const r of data || []) {
    if (!r.canon_id) continue;
    const t = (r.texte || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) m.set(r.canon_id, (m.get(r.canon_id) || 0) + t.length);
  }
  return m;
}
const mediane = (a) => { const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };

for (const c of CAS) {
  const [livre, ch] = c.ch.split('.');
  const chn = +ch;
  const parTrad = {};
  for (const tr of AUTRES) parTrad[tr] = await longueurs(tr, livre, chn);
  const { data: G } = await sb.from('versets_v2').select('id, canon_id, texte')
    .eq('trad_id', 'TR0005').eq('livre', livre).eq('ch_orig', chn).order('v_orig');
  const grec = new Map();
  for (const r of G || []) {
    if (!r.canon_id) continue;
    const t = (r.texte || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) grec.set(r.canon_id, t.length);
  }
  // écart moyen au régime, en place puis décalé
  const ecart = (d) => {
    let s = 0, n = 0;
    for (const [id, L] of grec) {
      const v = +id.split('.')[2] - d;                    // destination
      const cible = `${livre}.${ch}.${v}`;
      const autres = AUTRES.map((tr) => parTrad[tr].get(cible)).filter(Boolean);
      if (autres.length < 2) continue;
      const med = mediane(autres);
      if (!med) continue;
      s += Math.abs((L / med) / REGIME - 1); n++;
    }
    return n ? s / n : null;
  };
  const e0 = ecart(0), e1 = ecart(c.decalage);
  console.log(`\n${c.ch} — Septante  décalage ${c.decalage > 0 ? '+' : ''}${c.decalage} · ${grec.size} versets`);
  if (e0 === null || e1 === null) { console.log('   → trop peu de témoins comparables, on ne touche pas'); continue; }
  console.log(`   écart moyen au régime : ${e0.toFixed(2)} en place → ${e1.toFixed(2)} décalé`);
  if (!(e1 < e0 * 0.6)) { console.log('   → amélioration insuffisante, on ne touche pas'); continue; }
  if (DRY) { console.log('   (--dry) — serait corrigé'); continue; }
  const NOTE = `Créneau corrigé : la Septante était décalée d'un cran sur tout ce chapitre. Contrôlé par l'écart de longueur à la médiane des autres témoins (${e0.toFixed(2)} → ${e1.toFixed(2)}), le grec ne se comparant pas lexicalement au français.`;
  let ok = 0;
  const rows = (G || []).filter((r) => r.canon_id);
  rows.sort((a, b) => c.decalage > 0 ? (+b.canon_id.split('.')[2]) - (+a.canon_id.split('.')[2]) : (+a.canon_id.split('.')[2]) - (+b.canon_id.split('.')[2]));
  for (const r of rows) {
    const v = +r.canon_id.split('.')[2] - c.decalage;
    if (v < 1) continue;
    const { error } = await sb.from('versets_v2').update({ canon_id: `${livre}.${ch}.${v}`, ordre_slot: 1, alignement_verifie: false, notes: NOTE }).eq('id', r.id);
    if (!error) ok++;
  }
  console.log(`   ✓ ${ok} versets recréneautés`);
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
