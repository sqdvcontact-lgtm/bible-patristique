// LIENS DE L'HEXAÉMÉRON RELEVÉS À LA LECTURE — homélie par homélie.
//
// La passe mécanique (références de l'éditeur) ne rendait que 93 liens pour
// 1 798 segments : elle ne voyait QUE ce que l'éditeur avait marqué, et posait
// le lien sur le segment qui PRÉCÈDE la citation, la parenthèse étant en fin de
// phrase. Ici tout est relevé à la lecture, segment par segment.
//
// Types : 1 citation · 2 reprise/paraphrase · 3 commentaire du verset · 4 écho.
// Basile ne cite pas seulement Gn 1, 1 : il l'EXPLIQUE, mot par mot. D'où les
// type 3, qui sont la matière même de l'ouvrage et qu'aucune passe lexicale ne
// pouvait trouver — le commentaire ne ressemble pas au verset.
//
//   node scripts/hexameron-liens-lus.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const HOM = 'Première homélie';

// segment_numero → [ [canon_id, type, motif] ]
const LUS = {
  7: [
    ['ACT.7.20', 1, 'Moïse agréable à Dieu dès la naissance, adopté par la fille de Pharaon — Ac 7, 20-21.'],
    ['ACT.7.22', 2, 'Moïse instruit dans toute la sagesse des Égyptiens — Ac 7, 22.'],
    ['HEB.11.25', 1, 'Préférer être affligé avec le peuple de Dieu plutôt que de jouir de plaisirs passagers — He 11, 25.'],
    ['EXO.2.11', 4, 'Moïse frappant l Égyptien, puis mis en fuite — Ex 2, 11-15.'],
  ],
  8:  [['NUM.12.6', 1, 'Le prophète connu en vision et en songe — Nb 12, 6.']],
  9:  [['NUM.12.7', 1, 'Moïse, serviteur fidèle dans toute la maison de Dieu — Nb 12, 7.']],
  10: [['NUM.12.8', 1, 'Dieu lui parle bouche à bouche, non en figures — Nb 12, 8.']],
  12: [['1CO.2.4', 1, 'Non les discours persuasifs de la sagesse humaine, mais la doctrine de l Esprit — 1 Co 2, 4.']],
  13: [['GEN.1.1', 1, 'Le verset que toute l homélie commente, cité pour la première fois.']],
  20: [['GEN.1.1', 1, 'Cité contre les sages de la Grèce, qui ne savaient pas le dire.']],
  22: [['GEN.1.1', 3, 'Commentaire : le nom de Dieu placé dès les premiers mots pour prévenir l erreur.']],
  24: [['GEN.1.1', 3, 'Commentaire de « au commencement » : le monde n est pas sans commencement.']],
  25: [['GEN.1.1', 3, 'Commentaire du verbe : les choses créées sont la moindre partie de la puissance du Créateur.']],
  28: [['GEN.1.1', 3, 'Le nom de Dieu imprimé comme un sceau, remède contre le mensonge.']],
  29: [['GEN.1.1', 2, 'Reprise : celui qui au commencement créa le ciel et la terre.']],
  33: [['1CO.7.31', 1, 'La figure de ce monde passe — 1 Co 7, 31.']],
  34: [['MAT.24.35', 1, 'Le ciel et la terre passeront — Mt 24, 35.']],
  35: [['GEN.1.1', 3, 'Commentaire : ce peu de mots annonce la consommation et la rénovation du monde.']],
  38: [
    ['ROM.1.21', 1, 'Égarés dans leurs raisonnements, leur cœur insensé rempli de ténèbres — Rm 1, 21.'],
    ['ROM.1.22', 1, 'Devenus fous en s attribuant le nom de sages — Rm 1, 22.'],
  ],
  43: [['GEN.1.1', 3, 'Commentaire de l ordre des mots : le principe précède ce qui en dérive.']],
  47: [['COL.1.16', 2, 'La nature du monde invisible, selon l enseignement de Paul.']],
  48: [['COL.1.16', 1, 'Tout a été créé en lui, trônes, dominations, principautés, puissances — Col 1, 16.']],
  54: [['GEN.1.1', 3, 'Commentaire : « au commencement », c est-à-dire lorsque le temps commença à couler.']],
  56: [['PRO.16.5', 1, 'Le commencement de la bonne voie est de faire la justice — Pr 16, 5 (LXX).']],
  59: [['PRO.1.7', 1, 'Le commencement de la sagesse est la crainte du Seigneur — Pr 1, 7.']],
  61: [
    ['EXO.31.2', 4, 'Béséléel, dont l habileté est le principe des ornements du tabernacle — Ex 31, 2.'],
    ['EXO.31.3', 4, 'Béséléel rempli de l esprit de sagesse pour l ouvrage — Ex 31, 3.'],
  ],
  68: [['ROM.1.20', 1, 'Les perfections invisibles rendues visibles par les ouvrages — Rm 1, 20.']],
  69: [['GEN.1.1', 3, 'Commentaire : ciel et terre créés dans un moment unique, sans espace de temps.']],
  74: [['GEN.1.1', 3, 'Commentaire : la matière du monde a existé par un simple acte de volonté.']],
  82: [['GEN.1.1', 3, 'Commentaire du verbe : il ne dit pas enfanta ni produisit, mais créa.']],
  83: [['GEN.1.1', 3, 'Contre ceux qui font du monde une ombre coéternelle à Dieu.']],
  86: [['GEN.1.1', 1, 'Citation reprise en tête du développement sur les deux extrêmes.']],
  87: [['GEN.1.1', 3, 'Commentaire : en prenant les deux extrêmes, il embrasse tout le monde.']],
  88: [['GEN.1.1', 3, 'Commentaire de l ordre ciel/terre : le privilège de l aînesse au ciel.']],
  93: [['GEN.1.1', 3, 'Commentaire : nommer les deux extrêmes, c est désigner tous les intermédiaires.']],
  95: [['GEN.1.1', 1, 'Citation reprise avant l examen de l essence des êtres.']],
  99: [['ISA.51.6', 1, 'Le ciel étendu comme une fumée — Is 51, 6.']],
  100: [['ISA.40.22', 1, 'Celui qui a établi le ciel comme une voûte — Is 40, 22.']],
  112: [['JOB.38.6', 1, 'Sur quoi ses bases sont-elles affermies ? — Jb 38, 6.']],
  113: [['PSA.74.4', 1, 'J ai affermi ses colonnes — Ps 74, 4.']],
  114: [['PSA.23.2', 1, 'Il l a fondée sur les mers — Ps 23, 2.']],
  117: [['PSA.94.4', 1, 'Les limites de la terre sont dans la main de Dieu — Ps 94, 4.']],
  143: [['GEN.1.1', 2, 'Conclusion : s en tenir à ce que dit Moïse.']],
};

const T = { 1: 'CIT', 2: 'reprise', 3: 'comm', 4: 'écho' };

let segs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero')
    .eq('id_oeuvre', 'A0017O0001').eq('ref_niv1', HOM).order('segment_numero').range(de, de + 999);
  if (!data?.length) break; segs.push(...data); if (data.length < 1000) break;
}
const parNum = new Map(segs.map((s) => [s.segment_numero, s]));

const cibles = [...new Set(Object.values(LUS).flat().map((x) => x[0]))];
const fr = new Map();
for (let i = 0; i < cibles.length; i += 100) {
  const { data } = await sb.from('versets_v2').select('canon_id, texte, trad_id')
    .in('canon_id', cibles.slice(i, i + 100)).in('trad_id', ['TR0003', 'TR0001']);
  for (const r of data || []) if (r.texte && !fr.has(r.canon_id)) fr.set(r.canon_id, r.texte.replace(/<[^>]+>/g, ''));
}

const aEcrire = [], soucis = [];
for (const [num, liste] of Object.entries(LUS)) {
  const s = parNum.get(+num);
  if (!s) { soucis.push('segment ' + num + ' introuvable'); continue; }
  for (const [canon, type, motif] of liste) {
    if (!fr.has(canon)) soucis.push(canon + ' : pas de texte');
    aEcrire.push({ segment_id: s.id, canon_id: canon, type, fiabilite: 'probable',
      provenance: 'ia', arbitrage_requis: false, motif, _num: +num, _t: type });
  }
}
const parType = {};
for (const l of aEcrire) parType[T[l._t]] = (parType[T[l._t]] || 0) + 1;
console.log(`${HOM} — ${aEcrire.length} liens relevés à la lecture`);
console.log('par type : ' + JSON.stringify(parType));
if (soucis.length) console.log('⚠ ' + soucis.join(' · '));
console.log('\n── contrôle : le verset visé, en regard du relevé');
for (const l of aEcrire) {
  console.log(`  [${String(l._num).padStart(3)}] ${T[l._t].padEnd(7)} ${l.canon_id.padEnd(11)} ${(fr.get(l.canon_id) || '(pas de texte)').slice(0, 68)}`);
}
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }

const ids = [...new Set(aEcrire.map((l) => l.segment_id))];
const deja = new Set();
for (let i = 0; i < ids.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 300));
  for (const l of data || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);
}
const vus = new Set();
const net = aEcrire.filter((l) => {
  const c = `${l.segment_id}|${l.canon_id}|${l.type}`;
  if (deja.has(c) || vus.has(c)) return false; vus.add(c); return true;
}).map(({ _num, _t, ...r }) => r);
for (let i = 0; i < net.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(net.slice(i, i + 200));
  if (error) throw error;
}
console.log(`\n✓ ${net.length} écrits · ${aEcrire.length - net.length} déjà présents`);
process.exit(0);
