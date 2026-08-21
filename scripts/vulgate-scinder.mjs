// SCISSION D'UN VERSET DE LA VULGATE, sur le modèle de Sacy.
//
// La Vulgate réunit parfois en un seul verset ce que l'ossature répartit sur deux
// créneaux — et Sacy, qui la traduit, opère alors la coupure. On la reproduit ici :
// le verset latin est coupé au marqueur, la première part demeure, la seconde
// rejoint le créneau voisin, en regard du Sacy correspondant.
//
// RÈGLE DE TRAÇABILITÉ (mémoire « modification tracée ») : les deux moitiés
// conservent `ch_orig` / `v_orig` de l'édition — la Vulgate n'a qu'un verset là —
// et chacune porte une note disant qu'elle est une part, et de quoi.
//
//   node scripts/vulgate-scinder.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

// Chaque opération : le verset à couper, le marqueur de coupe, et la destination
// de la SECONDE part (créneau + rang). `avant: true` = la seconde part prend le
// rang 1 du créneau visé, et repousse ses occupants latins d'un cran.
const OPS = [
  { ref: 'SIR.12.6',  ch: 12, v: 7,  marqueur: 'quoniam et Altissimus',
    partie: 'premiere', cible: 'SIR.12.5', rang: 2,
    motif: 'La Vulgate réunit ici ce que l’ossature sépare ; Sacy coupe au même endroit (son v. 7 est en deux parts).' },
  { ref: 'SIR.3.21',  ch: 3,  v: 22, marqueur: 'sed quæ præcepit tibi Deus',
    partie: 'seconde',  cible: 'SIR.3.22', rang: 1, avant: true,
    motif: 'Second membre du verset latin, que Sacy place au verset suivant (son v. 22).' },
  { ref: 'SIR.12.13', ch: 12, v: 13, marqueur: 'et sic qui comitatur',
    partie: 'seconde',  cible: 'SIR.12.14', rang: 1,
    motif: 'Second membre du verset latin, que Sacy place au verset suivant (son v. 13, seconde part).' },
];

for (const op of OPS) {
  const { data: rows } = await sb.from('versets_v2')
    .select('id, ch_orig, v_orig, canon_id, ordre_slot, texte, notes')
    .eq('trad_id', 'TR0004').eq('canon_id', op.ref).eq('ch_orig', op.ch).eq('v_orig', op.v);
  const r = rows?.[0];
  if (!r) { console.log(`✗ ${op.ref} — verset ${op.ch},${op.v} introuvable`); continue; }
  const i = r.texte.indexOf(op.marqueur);
  if (i < 0) { console.log(`✗ ${op.ref} — marqueur « ${op.marqueur} » absent`); continue; }

  const tete = r.texte.slice(0, i).trim();
  const queue = r.texte.slice(i).trim();
  // Ce qui part au créneau voisin, et ce qui demeure.
  const deplace = op.partie === 'premiere' ? tete : queue;
  const reste   = op.partie === 'premiere' ? queue : tete;

  console.log(`\n── ${op.ref}  (Vulg ${op.ch},${op.v})`);
  console.log(`   demeure  ${op.ref.padEnd(11)} │ ${reste.slice(0, 88)}`);
  console.log(`   déplacé  ${op.cible.padEnd(11)} │ ${deplace.slice(0, 88)}`);
  if (DRY) continue;

  // 1. le verset d'origine ne garde que sa part
  await sb.from('versets_v2').update({
    texte: reste,
    notes: `Verset latin scindé : ${op.partie === 'premiere' ? 'seconde' : 'première'} part. ${op.motif}`,
  }).eq('id', r.id);

  // 2. faire de la place si la part déplacée doit venir en tête
  if (op.avant) {
    const { data: occ } = await sb.from('versets_v2')
      .select('id, ordre_slot').eq('trad_id', 'TR0004').eq('canon_id', op.cible).order('ordre_slot');
    for (const o of occ || []) await sb.from('versets_v2')
      .update({ ordre_slot: (o.ordre_slot ?? 1) + 1 }).eq('id', o.id);
  }

  // 3. la part déplacée devient une ligne à part, au créneau voisin
  const { error } = await sb.from('versets_v2').insert({
    trad_id: 'TR0004', livre: 'SIR', ch_orig: op.ch, v_orig: op.v,
    texte: deplace, canon_id: op.cible, ordre_slot: op.rang, alignement_verifie: false,
    notes: `Verset latin scindé : ${op.partie} part, portée ici. ${op.motif}`,
  });
  console.log(error ? `   ✗ ${error.message}` : '   ✓ écrit');
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
