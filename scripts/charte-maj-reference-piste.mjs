// Charte — arbitrage du 24/07/2026 : « une référence d'éditeur n'est qu'une piste
// solide ; tout lien exige lecture. » Résout la contradiction entre le §25.1
// (« ce sont des liens déjà établis ») et le §9.5 (« ne vaut pas identification »),
// au profit du §9.5.
//   node scripts/charte-maj-reference-piste.mjs --dry
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', 'charte_ia').single();
if (error) throw error;
let v = data.valeur;
const avant = v.length;
writeFileSync('scripts/_charte_sauvegarde2.md', v, 'utf8');

const REMPLACEMENTS = [
  // 1. Le titre de la passe 1 : elle n'est plus « la plus sûre », elle est la première.
  [`### 25.1 — Passe 1 : les références de l’édition (LA PLUS SÛRE, À FAIRE EN PREMIER)`,
   `### 25.1 — Passe 1 : les références de l’édition (À FAIRE EN PREMIER — MAIS ELLES NE CONCLUENT PAS)`],

  // 2. La phrase qui contredisait le §9.5.
  [`**Ce sont des liens déjà établis** — on ne devine plus, on lit.`,
   `**Ce sont des pistes solides — ce ne sont pas des liens établis.**

*Arbitrage du 24 juillet 2026, qui tranche la contradiction entre cette passe et le §9.5.* Une référence d'éditeur indique **où regarder**, rien de plus : elle ne vaut pas identification, et **tout lien exige lecture**. Trois raisons, toutes constatées :

- **l'éditeur se trompe.** Sur l'Hexaéméron, « Ps. 64, 4 » désignait en réalité Ps 74, 4 ; « Eccl. 1, 14 » visait un créneau existant quand la phrase citée est en Qo 2, 14 — faux parfaitement silencieux ;
- **l'éditeur situe, il ne délimite pas.** Sa parenthèse vient en fin de phrase : le lien posé sur le contexte qui précède atterrit **un segment trop tôt** ;
- **l'éditeur ne signale qu'une part de ce qui est là.** Gn 1, 1 est cité ou commenté quinze fois dans la première homélie de Basile, sans une seule parenthèse.

En conséquence : cette passe pose \`provenance = 'editeur'\` **et \`arbitrage_requis = true\`**, toujours. Elle amorce le travail, elle ne le clôt jamais. Le rendement reste considérable — 3 268 liens sur la Somme — mais c'est un rendement de **candidats**.`],
];

let n = 0;
for (const [av, ap] of REMPLACEMENTS) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 60));
}
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant}) · ${n}/${REMPLACEMENTS.length} modifications`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde2.md');
process.exit(0);
