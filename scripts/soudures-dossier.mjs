// DOSSIER DE LECTURE DES SOUDURES — de quoi juger chaque cas avant de couper.
//
// Pour chaque créneau vide d'une traduction, on met sous les yeux :
//   · le verset voisin de cette édition, qui contient le texte manquant ;
//   · ce que les AUTRES témoins portent au créneau vide et au suivant — c'est eux
//     qui disent où l'articulation du sens se trouve.
// Rien n'est modifié : on lit, on décide, puis on scinde.
//   node scripts/soudures-dossier.mjs TR0004 [LIVRE]
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TRAD = process.argv[2] || 'TR0004';
const LIVRE = process.argv[3] || null;
const N = { TR0001: 'Sacy', TR0002: 'Segond', TR0003: 'Crampon', TR0004: 'Vulgate' };

const { soudures } = JSON.parse(readFileSync('scripts/_soudures.json', 'utf8'))[TRAD];
const cibles = LIVRE ? soudures.filter((id) => id.startsWith(LIVRE + '.')) : soudures;

const out = [`# Soudures de ${N[TRAD]} — ${cibles.length} créneaux à examiner`,
  `# Le texte manquant est dans le verset VOISIN de cette édition : le couper en deux.`, ''];
for (const id of cibles) {
  const [livre, ch, v] = id.split('.');
  const voisins = [`${livre}.${ch}.${+v - 1}`, id, `${livre}.${ch}.${+v + 1}`];
  const { data } = await sb.from('versets_v2')
    .select('trad_id, ch_orig, v_orig, canon_id, ordre_slot, texte')
    .in('canon_id', voisins);
  out.push(`\n══ ${id} ══`);
  for (const c of voisins) {
    const l = (data || []).filter((r) => r.canon_id === c)
      .sort((a, b) => a.trad_id.localeCompare(b.trad_id) || (a.ordre_slot || 0) - (b.ordre_slot || 0));
    out.push(`  ── ${c}${c === id ? '   ← LE CRÉNEAU VIDE' : ''}`);
    for (const r of l) {
      const t = (r.texte || '').replace(/<[^>]+>/g, '').trim();
      out.push(`     ${(N[r.trad_id] || r.trad_id).padEnd(8)} ${r.ch_orig},${String(r.v_orig).padEnd(3)} ${t ? t.slice(0, 150) : '⟨vide⟩'}`);
    }
  }
}
const f = `scripts/_soudures_${TRAD}${LIVRE ? '_' + LIVRE : ''}.txt`;
writeFileSync(f, out.join('\n'), 'utf8');
console.log(`${cibles.length} créneaux → ${f}`);
process.exit(0);
