// Contrôle sémantique des liens ajoutés par la passe de lecture de la Cité de Dieu.
// Compare le texte d'Augustin (segment) au texte biblique français réel (versets_v2,
// toutes traductions — on garde le meilleur recouvrement) et mesure la part des mots
// pleins du verset qui se retrouvent dans le segment. Fort recouvrement + type 1 =
// citation quasi-littérale (sûr). Faible = inconclusif (rendus français différents) → humain.
// LECTURE SEULE par défaut ; --agit promeut en 'vérifié' les liens au-dessus du seuil.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const AGIT = process.argv.includes('--agit');
const SEUIL = 0.70;          // part minimale des mots pleins du verset retrouvés dans le segment
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu';

const STOP = new Set(('au aux avec ce ces dans de des du elle en et eux il je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous car donc or ni est sont etre ont fut furent avoir cette cet celui celle ceux dont plus tout tous toute toutes quand comme si sans ainsi afin lorsque alors bien meme selon vers chez entre sous ils elles leurs été a y d l n s c m t qu').split(' '));

const norm = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // enlève accents
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));

async function pageAll(sel, tbl, filt, extra) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tbl).select(sel).order('id').range(de, de + 999);
    for (const [k, v] of Object.entries(filt || {})) q = q.eq(k, v);
    if (extra) q = extra(q);
    const { data, error } = await q; if (error) { console.error(tbl, error.message); break; }
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}

async function main() {
  const liens = await pageAll('id, segment_id, canon_id, type, fiabilite', 'liens_bibliques', {},
    (q) => q.like('motif', MOTIF + '%').eq('fiabilite', 'probable'));
  console.log(`liens de la passe de lecture (probable) : ${liens.length}`);

  // textes des segments
  const segIds = [...new Set(liens.map((l) => l.segment_id))];
  const segTxt = new Map();
  for (let i = 0; i < segIds.length; i += 150) {
    const { data } = await sb.from('segments').select('id, segment_texte').in('id', segIds.slice(i, i + 150));
    for (const r of data || []) segTxt.set(r.id, new Set(norm(r.segment_texte)));
  }

  // textes bibliques par canon_id (toutes traductions)
  const canIds = [...new Set(liens.map((l) => l.canon_id))];
  const verTxt = new Map();  // canon_id -> [Set(mots), ...] par traduction
  for (let i = 0; i < canIds.length; i += 150) {
    const { data } = await sb.from('versets_v2').select('canon_id, texte').in('canon_id', canIds.slice(i, i + 150));
    for (const r of data || []) {
      if (!verTxt.has(r.canon_id)) verTxt.set(r.canon_id, []);
      verTxt.get(r.canon_id).push(new Set(norm(r.texte)));
    }
  }

  const rows = [];
  for (const l of liens) {
    const seg = segTxt.get(l.segment_id);
    const versions = verTxt.get(l.canon_id) || [];
    let score = null, nmots = 0;
    for (const v of versions) {
      const mots = [...v];
      if (!mots.length) continue;
      const inter = mots.filter((w) => seg.has(w)).length;
      const s = inter / mots.length;
      if (score === null || s > score) { score = s; nmots = mots.length; }
    }
    rows.push({ id: l.id, canon: l.canon_id, type: l.type, seg: l.segment_id, score, nmots });
  }

  // distribution
  const sansTexte = rows.filter((r) => r.score === null);
  const avec = rows.filter((r) => r.score !== null);
  const bucket = (min, max, t) => avec.filter((r) => r.score >= min && r.score < max && (t ? r.type === t : true)).length;
  console.log(`\nsans texte biblique dans le corpus : ${sansTexte.length}`);
  console.log(`avec texte comparable            : ${avec.length}`);
  console.log('\nrecouvrement lexical (tous types) :');
  console.log(`  >= 0.85 : ${bucket(0.85, 1.01)}`);
  console.log(`  0.70-0.85 : ${bucket(0.70, 0.85)}`);
  console.log(`  0.50-0.70 : ${bucket(0.50, 0.70)}`);
  console.log(`  < 0.50    : ${bucket(0, 0.50)}`);
  // sûr = citation (type 1) confirmée lexicalement, OU reprise (type 2) quasi-littérale
  const estSur = (r) => r.score !== null && ((r.type === 1 && r.score >= 0.55) || (r.type === 2 && r.score >= 0.85));
  const surs = avec.filter(estSur);
  const t1bas = avec.filter((r) => r.type === 1 && r.score < 0.55);
  console.log(`\n→ candidats sûrs (type1≥0.55 ou type2≥0.85) : ${surs.length}`);
  console.log(`   type 1 à bas recouvrement (non confirmable, mais fiable au sondage) : ${t1bas.length}`);
  console.log(`   reste (type 2 lâche) : ${liens.length - surs.length - t1bas.length}`);
  if (process.argv.includes('--tout-type1')) surs.push(...t1bas);

  // échantillon de contrôle : 12 candidats "sûrs" tirés au hasard
  const ech = surs.slice().sort(() => Math.random() - 0.5).slice(0, 12);
  console.log('\néchantillon de candidats sûrs (à ton contrôle) :');
  for (const r of ech) console.log(`   ${r.canon}  score=${r.score.toFixed(2)}  (mots verset=${r.nmots})`);

  writeFileSync(process.env.OUT || 'scripts/_controle-scores.json',
    JSON.stringify(rows, null, 0), 'utf8');
  console.log('\nscores détaillés → scripts/_controle-scores.json');

  if (AGIT) {
    const ids = surs.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await sb.from('liens_bibliques').update({ fiabilite: 'vérifié' }).in('id', ids.slice(i, i + 200));
      if (error) console.error('UPDATE', error.message);
    }
    console.log(`\n✓ promus en 'vérifié' : ${surs.length}`);
  } else console.log('\n(simulation — ajouter --agit pour promouvoir les candidats sûrs)');
}
main().catch((e) => { console.error(e); process.exit(1); });
