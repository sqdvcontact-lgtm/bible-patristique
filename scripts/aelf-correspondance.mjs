// CORRESPONDANCE AELF ↔ OSSATURE — préparation de l'import (TR0005).
//
// L'ossature du site EST bâtie sur l'AELF (numérotation canonique) : l'alignement
// est donc théoriquement une identité. Ce script le VÉRIFIE livre par livre, et
// relève les écarts avant tout import — c'est ce que la charte appelle un contrôle
// intégral, jamais un sondage.
//
// Aucun texte n'est récupéré ici : uniquement de la structure (codes de livres,
// nombre de chapitres, points de couture du psautier).
//   node scripts/aelf-correspondance.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// slug AELF → code de l'ossature. Relevé sur l'index aelf.org/bible.
const AELF = {
  Gn:'GEN', Ex:'EXO', Lv:'LEV', Nb:'NUM', Dt:'DEU', Jos:'JOS', Jg:'JDG', Rt:'RUT',
  '1S':'1SA', '2S':'2SA', '1R':'1KI', '2R':'2KI', '1Ch':'1CH', '2Ch':'2CH',
  Esd:'EZR', Ne:'NEH', Tb:'TOB', Jdt:'JDT', Est:'EST', '1M':'1MA', '2M':'2MA',
  Jb:'JOB', Ps:'PSA', Pr:'PRO', Qo:'ECC', Ct:'SNG', Sg:'WIS', Si:'SIR',
  Is:'ISA', Jr:'JER', Lm:'LAM', Ba:'BAR', Ez:'EZK', Dn:'DAN',
  Os:'HOS', Jl:'JOL', Am:'AMO', Ab:'OBA', Jon:'JON', Mi:'MIC', Na:'NAM',
  Ha:'HAB', So:'ZEP', Ag:'HAG', Za:'ZEC', Ml:'MAL',
  Mt:'MAT', Mc:'MRK', Lc:'LUK', Jn:'JHN', Ac:'ACT', Rm:'ROM',
  '1Co':'1CO', '2Co':'2CO', Ga:'GAL', Ep:'EPH', Ph:'PHP', Col:'COL',
  '1Th':'1TH', '2Th':'2TH', '1Tm':'1TI', '2Tm':'2TI', Tt:'TIT', Phm:'PHM',
  He:'HEB', Jc:'JAS', '1P':'1PE', '2P':'2PE', '1Jn':'1JN', '2Jn':'2JN',
  '3Jn':'3JN', Jude:'JUD', Ap:'REV',
};

// Psaumes que l'AELF scinde par une lettre, faute d'un numéro propre : ce sont
// les psaumes où l'ossature FUSIONNE deux psaumes hébreux (9 = 9+10, 113 = 114+115).
// Une adresse « Ps 113B » doit donc se résoudre dans le SEUL créneau PSA.113.
const SCINDES_AELF = { 9: [9, 10], 113: [114, 115] };

async function pageAll(t, sel, f) {
  const o = []; for (let de = 0; ; de += 1000) {
    let q = sb.from(t).select(sel).order('id').range(de, de + 999);
    if (f) q = f(q); const { data, error } = await q; if (error) throw error;
    o.push(...(data || [])); if (!data || data.length < 1000) break;
  } return o;
}

const canon = await pageAll('versets_canon', 'id, livre, ch_canon, v_canon, ch_heb');
const parLivre = new Map();
for (const r of canon) {
  let e = parLivre.get(r.livre);
  if (!e) parLivre.set(r.livre, e = { versets: 0, chapitres: new Set() });
  e.versets++; e.chapitres.add(r.ch_canon);
}
const { data: livres } = await sb.from('livres').select('code, nom_fr, categorie').order('ordre');

const codesAelf = new Set(Object.values(AELF));
const manquants = [], surnumeraires = [];
for (const l of livres || []) {
  const dansOssature = parLivre.has(l.code);
  if (!dansOssature) continue;                       // livre déclaré mais sans versets
  if (!codesAelf.has(l.code)) manquants.push(l);     // dans l'ossature, pas d'adresse AELF
}
for (const [slug, code] of Object.entries(AELF)) {
  if (!parLivre.has(code)) surnumeraires.push(`${slug} → ${code}`);
}

console.log(`ossature : ${parLivre.size} livres · ${canon.length} versets`);
console.log(`index AELF : ${Object.keys(AELF).length} livres adressables\n`);

console.log('LIVRES DE L’OSSATURE SANS ADRESSE AELF PROPRE :');
for (const l of manquants) {
  const e = parLivre.get(l.code);
  console.log(`   ${l.code.padEnd(4)} ${String(e.versets).padStart(5)} v.  ${l.nom_fr} (${l.categorie})`);
}
if (!manquants.length) console.log('   (aucun)');
console.log('\nADRESSES AELF SANS LIVRE DANS L’OSSATURE :');
console.log(surnumeraires.length ? '   ' + surnumeraires.join(' · ') : '   (aucune)');

console.log('\nPSAUTIER — points de couture :');
for (const [ch, heb] of Object.entries(SCINDES_AELF)) {
  const e = [...new Set(canon.filter(r => r.livre === 'PSA' && r.ch_canon === +ch).map(r => r.ch_heb))].sort((a,b)=>a-b);
  const ok = JSON.stringify(e) === JSON.stringify(heb);
  console.log(`   AELF « Ps ${ch}A / ${ch}B » → PSA.${ch} (hébreu ${e.join('+')}) ${ok ? '✓' : '✗ ATTENDU ' + heb.join('+')}`);
}

writeFileSync('scripts/_aelf_correspondance.json', JSON.stringify({ AELF, SCINDES_AELF }, null, 1), 'utf8');
console.log('\n→ scripts/_aelf_correspondance.json');
process.exit(0);
