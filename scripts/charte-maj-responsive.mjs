// Charte — renvoi vers les règles responsive (mise à l'échelle desktop).
//   Ajoute une ligne à la « Carte de lecture » pointant vers AGENTS.md § Responsive,
//   où vivent les règles complètes (police racine fluide, px→rem, Navbar 48px,
//   purge .next après migration). La charte reste l'index ; le détail est dans AGENTS.md.
//   node scripts/charte-maj-responsive.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde12.md', v, 'utf8');

// Ancre : la dernière ligne du tableau « Carte de lecture ». On ajoute une ligne après.
const ancre = "| Modifier le schéma, les accès, l'admin | §19 (schéma) · §17 (sécurité) · §14 (pièges techniques) · §15 (carte des fichiers) |";
const ajout = ancre + "\n| **Toucher à l'affichage (responsive, mise à l'échelle desktop)** | **`AGENTS.md` § Responsive** — police racine fluide `clamp(16→22px)`, conversion **px→rem** (texte/mesure) en gardant filets 1px et hauteur Navbar (48px) en px ; **purger `.next` après migration du projet** |";

let n = 0;
if (v.includes(ajout.split('\n')[1])) {
  console.log('• Renvoi responsive déjà présent — rien à faire.');
} else if (v.includes(ancre)) {
  v = v.replace(ancre, ajout); n++;
} else {
  console.log('⚠ ancre introuvable : ' + ancre.slice(0, 70));
}

console.log(`charte : ${avant} → ${v.length} caractères (${v.length - avant >= 0 ? '+' : ''}${v.length - avant}) · ${n} modification(s)`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
if (n === 0) { console.log('Aucune écriture nécessaire.'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde12.md');
process.exit(0);
