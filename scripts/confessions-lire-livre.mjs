// Lecture d'un livre des Confessions pour révision des liens : dump compact de
// chaque lien (id, type, fiabilité, référence taguée, texte du segment, texte du
// verset) dans un fichier, pour jugement à la main. Usage :
//   node scripts/confessions-lire-livre.mjs "Livre Premier"
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const LIVRE = process.argv[2];
if (!LIVRE) { console.error('usage: node scripts/confessions-lire-livre.mjs "<Livre ...>"'); process.exit(1); }

const ABR = { GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt','1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',WIS:'Sg',SIR:'Si',ISA:'Is',JER:'Jr',LAM:'Lm',BAR:'Ba',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',TOB:'Tb',JDT:'Jdt','1MA':'1M','2MA':'2M',MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm','2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P','1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap' };
const fr = (c) => { if (!c) return '(à constituer)'; const [b, ch, v] = c.split('.'); return `${ABR[b] || b} ${ch}, ${v}`; };
const clean = (t) => (t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const T = { 1: 'CITATION', 2: 'reprise', 3: 'commentaire', 4: 'écho' };

async function main() {
  const { data: segsL } = await sb.from('segments').select('id, segment_numero, segment_texte')
    .eq('id_oeuvre', OEUVRE).eq('ref_niv1', LIVRE).order('segment_numero');
  const segM = new Map((segsL || []).map((s) => [s.id, s]));
  const ids = [...segM.keys()];
  const liens = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, type, fiabilite').in('segment_id', ids.slice(i, i + 200));
    liens.push(...(data || []));
  }
  liens.sort((a, b) => (segM.get(a.segment_id).segment_numero - segM.get(b.segment_id).segment_numero) || a.type - b.type);
  const canIds = [...new Set(liens.map((l) => l.canon_id).filter(Boolean))];
  const verM = new Map();
  for (let i = 0; i < canIds.length; i += 150) {
    const { data } = await sb.from('versets_v2').select('canon_id, texte, trad_id').in('canon_id', canIds.slice(i, i + 150));
    for (const r of data || []) if (r.texte && !verM.has(r.canon_id)) verM.set(r.canon_id, r.texte);
  }

  const out = [`# ${LIVRE} — ${liens.length} liens\n`];
  let dernier = null;
  for (const l of liens) {
    const s = segM.get(l.segment_id);
    if (s.segment_numero !== dernier) { out.push(`\n[SEG ${s.segment_numero}] ${clean(s.segment_texte).slice(0, 500)}`); dernier = s.segment_numero; }
    out.push(`   · lien ${l.id} [${T[l.type]}/${l.fiabilite}] ${fr(l.canon_id)}  →  ${clean(verM.get(l.canon_id) || '(pas de texte)').slice(0, 180)}`);
  }
  const f = 'scripts/_confessions_livre.txt';
  writeFileSync(f, out.join('\n'), 'utf8');
  console.log(`${liens.length} liens sur ${segM.size} segments → ${f}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
