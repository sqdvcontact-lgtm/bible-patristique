// Contrôle sémantique des liens bibliques CONSTITUÉS de la Somme théologique.
// Compare le texte de Thomas (segment) au texte biblique français réel (versets_v2, toutes
// traductions, meilleur recouvrement des mots pleins). Fort recouvrement + type 1 = citation
// sûre ; recouvrement nul sur un type 1 = suspect (faux ami probable, ou lien mal typé).
// LECTURE SEULE. Produit une distribution + un fichier de scores pour tri.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0013O0002';

const STOP = new Set(('au aux avec ce ces dans de des du elle en et eux il je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous car donc or ni est sont etre ont fut furent avoir cette cet celui celle ceux dont plus tout tous toute toutes quand comme si sans ainsi afin lorsque alors bien meme selon vers chez entre sous ils elles ete a y d l n s c m t qu').split(' '));
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));

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
  const segs = await pageAll('id', 'segments', { id_oeuvre: OEUVRE });
  const segSet = new Set(segs.map((s) => s.id));
  console.log(`segments Somme : ${segs.length}`);

  const liens = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, type, fiabilite').order('id').range(de, de + 999);
    if (!data?.length) break;
    liens.push(...data.filter((l) => segSet.has(l.segment_id) && l.canon_id));
    if (data.length < 1000) break;
  }
  console.log(`liens constitués (canon_id renseigné) : ${liens.length}`);

  const segIds = [...new Set(liens.map((l) => l.segment_id))];
  const segTxt = new Map();
  for (let i = 0; i < segIds.length; i += 150) {
    const { data } = await sb.from('segments').select('id, segment_texte').in('id', segIds.slice(i, i + 150));
    for (const r of data || []) segTxt.set(r.id, new Set(norm(r.segment_texte)));
  }
  const canIds = [...new Set(liens.map((l) => l.canon_id))];
  const verTxt = new Map();
  for (let i = 0; i < canIds.length; i += 150) {
    const { data } = await sb.from('versets_v2').select('canon_id, texte').in('canon_id', canIds.slice(i, i + 150));
    for (const r of data || []) { if (!verTxt.has(r.canon_id)) verTxt.set(r.canon_id, []); verTxt.get(r.canon_id).push(new Set(norm(r.texte))); }
  }

  const rows = [];
  for (const l of liens) {
    const seg = segTxt.get(l.segment_id);
    let score = null, nmots = 0;
    for (const v of verTxt.get(l.canon_id) || []) {
      const mots = [...v]; if (!mots.length) continue;
      const s = mots.filter((w) => seg.has(w)).length / mots.length;
      if (score === null || s > score) { score = s; nmots = mots.length; }
    }
    rows.push({ id: l.id, canon: l.canon_id, type: l.type, fia: l.fiabilite, seg: l.segment_id, score, nmots });
  }

  const avec = rows.filter((r) => r.score !== null);
  const sansTexte = rows.length - avec.length;
  const b = (min, max, f) => avec.filter((r) => r.score >= min && r.score < max && (f ? f(r) : true)).length;
  console.log(`\nsans texte biblique comparable : ${sansTexte}`);
  console.log('recouvrement (tous) :  >=.70', b(0.70, 1.01), ' .40-.70', b(0.40, 0.70), ' .15-.40', b(0.15, 0.40), ' <.15', b(0, 0.15));
  for (const t of [1, 2, 3, 4]) {
    const rt = avec.filter((r) => r.type === t);
    console.log(`  type ${t} (${rt.length}) :  >=.70 ${rt.filter(r=>r.score>=0.7).length}  .40-.70 ${rt.filter(r=>r.score>=0.4&&r.score<0.7).length}  .15-.40 ${rt.filter(r=>r.score>=0.15&&r.score<0.4).length}  <.15 ${rt.filter(r=>r.score<0.15).length}`);
  }
  console.log('\nSUSPECTS (type 1, recouvrement < .12, verset ≥ 5 mots pleins) :',
    avec.filter((r) => r.type === 1 && r.score < 0.12 && r.nmots >= 5).length);
  writeFileSync('scripts/_somme-scores.json', JSON.stringify(rows), 'utf8');
  console.log('scores → scripts/_somme-scores.json');
}
main().catch((e) => { console.error(e); process.exit(1); });
