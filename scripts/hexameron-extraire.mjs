// EXTRACTION DE L'HEXAÉMÉRON POUR LECTURE — un fichier par homélie, sur le bureau.
//
// On travaille sur le texte, pas sur des sondages. Chaque fichier porte :
//   · le français de NOTRE base (c'est lui qui fait foi, c'est lui qu'on lie),
//     un segment par ligne, numéroté ;
//   · les liens déjà posés, en regard, pour ne pas refaire ;
//   · le grec de l'édition en regard (Basile écrit en grec et cite la Septante :
//     la citation y est souvent littérale, là où le français d'Auger la dilue).
//
//   node scripts/hexameron-extraire.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DEST = 'C:/Users/quins/OneDrive/Bureau/HEXAEMERON';
mkdirSync(DEST, { recursive: true });

const ABR = { GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt','1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',WIS:'Sg',SIR:'Si',ISA:'Is',JER:'Jr',LAM:'Lm',BAR:'Ba',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',TOB:'Tb',JDT:'Jdt','1MA':'1M','2MA':'2M',MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm','2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P','1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap' };
const fr = (c) => { if (!c) return '(à constituer)'; const [b, ch, v] = c.split('.'); return `${ABR[b] || b} ${ch}, ${v}`; };
const T = { 1: 'CIT', 2: 'reprise', 3: 'comm', 4: 'écho' };
const clean = (t) => (t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ── segments et liens ──────────────────────────────────────────────────────
let segs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('segments')
    .select('id, segment_numero, ref_niv1, segment_texte')
    .eq('id_oeuvre', 'A0017O0001').order('segment_numero').range(de, de + 999);
  if (!data?.length) break; segs.push(...data); if (data.length < 1000) break;
}
const ids = segs.map((s) => s.id);
const liens = [];
for (let i = 0; i < ids.length; i += 150) {
  const { data } = await sb.from('liens_bibliques')
    .select('segment_id, canon_id, type, fiabilite').in('segment_id', ids.slice(i, i + 150));
  liens.push(...(data || []));
}
const parSeg = new Map();
for (const l of liens) { let a = parSeg.get(l.segment_id); if (!a) parSeg.set(l.segment_id, a = []); a.push(l); }

// ── grec de l'édition, découpé par homélie ─────────────────────────────────
const grecBrut = readFileSync('scripts/_remacle_hexameron.txt', 'utf8');
// Les titres grecs des homélies servent de bornes : ΟΜΙΛΙΑ + numéro.
// Les numéros d'homélie sont en minuscules grecques (αʹ, βʹ, γʹ…), pas en
// majuscules — l'en-tête « ΟΜΙΛΙΑΙ θʹ » (le titre général) est donc exclu par
// le \s+ suivi d'une seule lettre-chiffre.
// (le signe numéral grec ʹ qui suit varie selon la source : on ne l'exige pas)
const bornes = [...grecBrut.matchAll(/ΟΜΙΛΙΑ\s+[αβγδεϚζηθι]{1,3}/g)].map((m) => m.index);
function grecDe(n) {           // n = 1..10
  if (bornes.length < n) return '';
  const d = bornes[n - 1], f = bornes[n] ?? grecBrut.length;
  return grecBrut.slice(d, f).replace(/[ \t]+/g, ' ').trim();
}

const ordre = ['Première homélie','Deuxième homélie','Troisième homélie','Quatrième homélie','Cinquième homélie',
               'Sixième homélie','Septième homélie','Huitième homélie','Neuvième homélie','Dixième homélie (apocryphe)'];
let recap = ['# Hexaéméron — extraction pour lecture\n'];
ordre.forEach((hom, i) => {
  const sh = segs.filter((s) => s.ref_niv1 === hom);
  if (!sh.length) return;
  const out = [`# ${hom} — ${sh.length} segments`,
    `# format : [n° segment] «liens déjà posés» texte`,
    `# On lit TOUT : chaque segment doit recevoir un verdict, « rien » compris.`, ''];
  for (const s of sh) {
    const d = (parSeg.get(s.id) || []).map((l) => `${T[l.type]} ${fr(l.canon_id)}/${l.fiabilite}`).join(' | ');
    out.push(`[${s.segment_numero}]${d ? ' «' + d + '»' : ''} ${clean(s.segment_texte)}`);
  }
  const g = grecDe(i + 1);
  if (g) out.push('', '', '# ── TEXTE GREC DE L’ÉDITION (Basile cite la Septante ; la citation y est souvent littérale) ──', '', g.slice(0, 60000));
  const nom = `${String(i + 1).padStart(2, '0')}-${hom.replace(/[^a-zA-ZÀ-ÿ]/g, '-')}.txt`;
  writeFileSync(`${DEST}/${nom}`, out.join('\n'), 'utf8');
  const nl = sh.reduce((n, s) => n + (parSeg.get(s.id)?.length || 0), 0);
  recap.push(`${nom.padEnd(42)} ${String(sh.length).padStart(4)} segments · ${String(nl).padStart(3)} liens · grec ${g ? 'oui' : 'NON'}`);
});
writeFileSync(`${DEST}/00-recapitulatif.txt`, recap.join('\n'), 'utf8');
console.log(recap.join('\n'));
console.log(`\n→ ${DEST}`);
process.exit(0);
