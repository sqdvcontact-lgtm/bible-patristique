// CORRECTION DES CHAPITRES DÉCALÉS — méthode éprouvée sur 2 Ch 2 le 24/07/2026.
//
// Procédé, dans cet ordre :
//   1. trouver dans le LIVRE ENTIER où naît l'écart de comptage (chapitre déficitaire) ;
//   2. en déduire le sens du glissement ;
//   3. VÉRIFIER PAR LE CONTENU contre un témoin resté juste, avant toute écriture ;
//   4. appliquer, puis déclarer le créneau qui reste sans texte — jamais le combler.
//
// Chaque entrée porte son témoin de contrôle : une traduction dont on sait qu'elle
// est bien placée sur ce passage, et contre laquelle on mesure l'accord lexical.
//   node scripts/corrige-chapitres-decales.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

// decal = ce qu'il faut AJOUTER au créneau actuel pour obtenir le bon.
const CAS = [
  { livre: '2KI', ch: 12, trad: 'TR0002', temoin: 'TR0003', decal: +1, vide: '2KI.12.1',
    motif: 'Segond compte un verset de moins que l’ossature au ch. 12 : son v. 1 est le créneau 12, 2. Tout le chapitre montait d’un cran.' },
  { livre: '1SA', ch: 21, trad: 'TR0002', temoin: 'TR0003', decal: +1, vide: '1SA.21.1',
    motif: 'Segond compte un verset de moins que l’ossature au ch. 21 : son v. 1 est le créneau 21, 2.' },
  { livre: 'DEU', ch: 13, trad: 'TR0002', temoin: 'TR0003', decal: +1, vide: 'DEU.13.1',
    motif: 'Segond compte un verset de moins que l’ossature au ch. 13 : son v. 1 est le créneau 13, 2.' },
  { livre: 'MIC', ch: 5, trad: 'TR0004', temoin: 'TR0003', decal: -1, vide: 'MIC.5.14', horsChap: 'MIC.4.14',
    motif: 'La Vulgate compte un verset de moins au ch. 4 : son 5, 1 est le créneau 4, 14 — frontière Michée 4/5.' },
];

const sac = (s) => new Set((s || '').replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z]+/g, ' ').split(' ').filter((w) => w.length > 3).map((w) => w.slice(0, 5)));
const acc = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const w of a) if (b.has(w)) i++; return i / Math.min(a.size, b.size); };

for (const c of CAS) {
  const { data: V } = await sb.from('versets_v2').select('id, v_orig, canon_id, texte')
    .eq('trad_id', c.trad).eq('livre', c.livre).eq('ch_orig', c.ch).order('v_orig');
  const { data: T } = await sb.from('versets_v2').select('canon_id, texte')
    .eq('trad_id', c.temoin).eq('livre', c.livre).in('ch_orig', [c.ch - 1, c.ch]);
  const tem = new Map((T || []).map((r) => [r.canon_id, r.texte]));

  const mv = (V || []).filter((r) => r.canon_id).map((r) => {
    const n = +r.canon_id.split('.')[2] + c.decal;
    const vers = n < 1 ? c.horsChap : `${c.livre}.${c.ch}.${n}`;
    return { ...r, vers };
  });
  // contrôle : accord avec le témoin, en place puis à la destination
  let gainTotal = 0, n = 0;
  for (const m of mv.slice(0, 6)) {
    const a = sac(m.texte);
    const ici = acc(a, sac(tem.get(m.canon_id) || '')), la = acc(a, sac(tem.get(m.vers) || ''));
    gainTotal += la - ici; n++;
  }
  const gain = n ? gainTotal / n : 0;
  console.log(`\n${c.livre} ${c.ch} — ${c.trad}  décalage ${c.decal > 0 ? '+' : ''}${c.decal}  · ${mv.length} versets`);
  console.log(`   accord moyen : gain de ${gain >= 0 ? '+' : ''}${gain.toFixed(2)} à la destination`);
  if (gain < 0.25) { console.log('   → gain insuffisant : on n’écrit pas'); continue; }
  if (DRY) { console.log('   (--dry)'); continue; }

  let ok = 0;
  for (const m of mv.sort((a, b) => c.decal > 0 ? b.v_orig - a.v_orig : a.v_orig - b.v_orig)) {
    const { error } = await sb.from('versets_v2')
      .update({ canon_id: m.vers, ordre_slot: 1, alignement_verifie: false, notes: `Créneau corrigé. ${c.motif} Vérifié par le contenu.` })
      .eq('id', m.id);
    if (!error) ok++;
  }
  const { data: occ } = await sb.from('versets_v2').select('id').eq('trad_id', c.trad).eq('canon_id', c.vide);
  if (!occ?.length) {
    await sb.from('versets_v2').insert({ trad_id: c.trad, livre: c.livre, ch_orig: c.ch, v_orig: 0, texte: '',
      canon_id: c.vide, ordre_slot: 1, alignement_verifie: false,
      notes: `Créneau sans texte : cette édition compte un verset de moins que l’ossature ici. ${c.motif} Manque réel, non comblé (charte §4).` });
  }
  console.log(`   ✓ ${ok} versets recréneautés · ${c.vide} déclaré vide`);
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
