// ÉTAT DE SANTÉ DES TRADUCTIONS — mesure avant tout remède.
//
// Pour chaque traduction : couverture de l'ossature, versets vides, versets sans
// créneau, créneaux non couverts, doublons, et livres absents. Rien n'est modifié.
//   node scripts/audit-traductions-sante.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_v2')
      .select('id, livre, ch_orig, v_orig, canon_id, ordre_slot, texte')
      .eq('trad_id', tr).order('id').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
const canon = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre').order('id').range(de, de + 999);
  if (!data?.length) break; canon.push(...data); if (data.length < 1000) break;
}
const canonIds = new Set(canon.map((r) => r.id));
const livresCanon = new Set(canon.map((r) => r.livre));
const parLivreCanon = {};
for (const r of canon) parLivreCanon[r.livre] = (parLivreCanon[r.livre] || 0) + 1;

const { data: trads } = await sb.from('traductions').select('trad_id, nom, langue').order('ordre');
console.log(`ossature : ${canon.length} créneaux · ${livresCanon.size} livres\n`);
console.log('trad    versets  couvre   vides  sans créneau  livres  manquants');
console.log('─'.repeat(78));
const detail = {};
for (const t of trads || []) {
  const V = await page(t.trad_id);
  const vides = V.filter((r) => !r.texte || !String(r.texte).trim()).length;
  const sansCreneau = V.filter((r) => r.canon_id === null).length;
  const couverts = new Set(V.filter((r) => r.canon_id && r.texte && String(r.texte).trim()).map((r) => r.canon_id));
  const livres = new Set(V.map((r) => r.livre));
  const absents = [...livresCanon].filter((l) => !livres.has(l));
  detail[t.trad_id] = { V, couverts, absents };
  console.log(
    `${t.trad_id}  ${String(V.length).padStart(7)}  ${String(Math.round(couverts.size / canonIds.size * 100)).padStart(4)} %  ${String(vides).padStart(6)}  ${String(sansCreneau).padStart(12)}  ${String(livres.size).padStart(6)}  ${absents.length ? absents.join(' ') : '—'}`
  );
}
console.log('\n── livres où une traduction couvre moins de 90 % des créneaux ──');
for (const t of trads || []) {
  const { V, couverts } = detail[t.trad_id];
  const parLivre = {};
  for (const c of couverts) { const l = c.split('.')[0]; parLivre[l] = (parLivre[l] || 0) + 1; }
  const faibles = Object.entries(parLivreCanon)
    .map(([l, n]) => ({ l, pct: Math.round(((parLivre[l] || 0) / n) * 100), n }))
    .filter((x) => x.pct < 90)
    .sort((a, b) => a.pct - b.pct);
  if (!faibles.length) { console.log(`${t.trad_id} : (aucun)`); continue; }
  console.log(`${t.trad_id} : ` + faibles.map((x) => `${x.l} ${x.pct}%`).join(' · '));
}
process.exit(0);
