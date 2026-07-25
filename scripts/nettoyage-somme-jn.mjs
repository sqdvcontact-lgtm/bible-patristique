// Nettoyage mécanique de la Somme : supprimer les confusions Jn↔1 Jn parmi les
// liens portés « seuls » (filet, douteux, non confirmés indépendamment) — le lien
// pointe JHN.X mais le texte cite « 1 Jn X » au chapitre concordant. --supprime pour agir.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0013O0002';
const SUPPRIME = process.argv.includes('--supprime');

async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}

async function main() {
  const segs = await pageAll('id, segment_numero, segment_texte');
  const byId = new Map(segs.map((s) => [s.id, s]));
  const ids = segs.map((s) => s.id);
  const all = [];
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150);
    for (let de = 0; ; de += 1000) {
      const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, fiabilite, motif').in('segment_id', batch).range(de, de + 999);
      all.push(...(data || [])); if (!data || data.length < 1000) break;
    }
  }
  const indep = new Set();
  for (const l of all) if (l.canon_id && !(l.motif || '').startsWith('Filet de rappel')) indep.add(l.segment_id + '|' + l.canon_id);
  const seuls = all.filter((l) => l.canon_id && l.fiabilite === 'douteux' && (l.motif || '').startsWith('Filet de rappel') && !indep.has(l.segment_id + '|' + l.canon_id));

  // versets 1JN valides dans le canon
  const canon1jn = new Set();
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_canon').select('ch_canon, v_canon').eq('livre', '1JN').range(de, de + 999);
    if (!data?.length) break; for (const r of data) canon1jn.add(`1JN.${r.ch_canon}.${r.v_canon}`); if (data.length < 1000) break;
  }

  const aRetarget = []; const aSupp = []; const ex = [];
  for (const l of seuls) {
    const [b, ch, v] = l.canon_id.split('.');
    if (b !== 'JHN') continue;
    const t = ((byId.get(l.segment_id).segment_texte) || '').replace(/<[^>]+>/g, ' ').toLowerCase();
    const re = new RegExp('1\\s*(?:jn|jean)\\s*\\(?\\s*' + ch + '\\b');
    if (!re.test(t)) continue;
    const cible = `1JN.${ch}.${v}`;
    const num = byId.get(l.segment_id).segment_numero;
    if (canon1jn.has(cible)) { aRetarget.push([l.id, cible]); if (ex.length < 8) ex.push(`#${num} JHN.${ch}.${v} → ${cible}`); }
    else { aSupp.push(l.id); if (ex.length < 8) ex.push(`#${num} JHN.${ch}.${v} → 1Jn absent du canon : SUPPR`); }
  }
  console.log(`portés seuls : ${seuls.length}`);
  console.log(`confusions Jn↔1 Jn : ${aRetarget.length + aSupp.length} (${aRetarget.length} corrigées vers 1JN, ${aSupp.length} sans cible → suppr)`);
  console.log(ex.join('\n'));
  if (SUPPRIME) {
    for (const [id, cible] of aRetarget) await sb.from('liens_bibliques').update({ canon_id: cible }).eq('id', id);
    for (let j = 0; j < aSupp.length; j += 200) await sb.from('liens_bibliques').delete().in('id', aSupp.slice(j, j + 200));
    console.log(`✓ corrigées : ${aRetarget.length} · supprimées : ${aSupp.length}`);
  } else {
    console.log('(simulation — ajouter --supprime pour agir)');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
