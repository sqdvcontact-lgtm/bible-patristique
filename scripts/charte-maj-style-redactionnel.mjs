// Charte — renvoi vers la règle de style rédactionnel (textes du site).
//   Ajoute une ligne à la « Carte de lecture » pointant vers AGENTS.md § Style
//   rédactionnel : pas d'incises entre tirets, faire des phrases. La charte reste
//   l'index ; le détail est dans AGENTS.md.
//   node scripts/charte-maj-style-redactionnel.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde13.md', v, 'utf8');

// Ancre : la ligne « responsive » ajoutée précédemment ; à défaut, la ligne schéma.
const ancreResponsive = "| **Toucher à l'affichage (responsive, mise à l'échelle desktop)** | **`AGENTS.md` § Responsive** — police racine fluide `clamp(16→22px)`, conversion **px→rem** (texte/mesure) en gardant filets 1px et hauteur Navbar (48px) en px ; **purger `.next` après migration du projet** |";
const ancreSchema = "| Modifier le schéma, les accès, l'admin | §19 (schéma) · §17 (sécurité) · §14 (pièges techniques) · §15 (carte des fichiers) |";
const ligne = "| **Rédiger un texte du site (cartes, chapeaux, messages, mentions)** | **`AGENTS.md` § Style rédactionnel** — pas d'incises entre tirets (`— … —`) ; faire des phrases, ou une énumération introduite par deux-points |";

let n = 0;
if (v.includes(ligne)) {
  console.log('• Renvoi style rédactionnel déjà présent — rien à faire.');
} else if (v.includes(ancreResponsive)) {
  v = v.replace(ancreResponsive, ancreResponsive + "\n" + ligne); n++;
} else if (v.includes(ancreSchema)) {
  v = v.replace(ancreSchema, ancreSchema + "\n" + ligne); n++;
} else {
  console.log('⚠ ancre introuvable (ni responsive ni schéma).');
}

console.log(`charte : ${avant} → ${v.length} caractères (${v.length - avant >= 0 ? '+' : ''}${v.length - avant}) · ${n} modification(s)`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
if (n === 0) { console.log('Aucune écriture nécessaire.'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde13.md');
process.exit(0);
