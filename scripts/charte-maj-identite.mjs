// Charte — corrections d'identité (24/07/2026) :
//   · nom de l'auteur du site : Sébastien Quinsac de Valette ;
//   · domaine canonique : corpus-scriptura.fr (le .com redirige).
//
// Le point du domaine avait DÉJÀ été tranché dans la section « CONTRADICTIONS
// TRANCHÉES » du 12 juillet, mais les passages d'origine n'avaient jamais été
// amendés : la charte disait donc l'inverse d'elle-même à trois endroits. On
// corrige la SOURCE, on ne rajoute pas une couche.
//   node scripts/charte-maj-identite.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde6.md', v, 'utf8');

const R = [
  // en-tête du document
  ['Projet « Corpus Scriptura » — corpus-scriptura.com',
   'Projet « Corpus Scriptura » — corpus-scriptura.fr'],
  // §0
  ['Domaines acquis via OVH (juillet 2026) : corpus-scriptura.com (canonique) et corpus-scriptura.fr (redirection).',
   'Domaines acquis via OVH (juillet 2026) : **corpus-scriptura.fr (canonique)** et corpus-scriptura.com (redirection permanente 308 vers le .fr, faite par `proxy.ts` d’après la variable `SITE_CANONIQUE`).'],
  ['Sébastien Quinson en est le seul développeur',
   'Sébastien Quinsac de Valette en est le seul développeur'],
  // « Identité »
  ['**Identité.** Nom officiel : Corpus Scriptura ; domaine canonique : corpus-scriptura.com (acquis via OVH, juillet 2026, avec corpus-scriptura.fr en redirection).',
   '**Identité.** Nom officiel : Corpus Scriptura ; domaine canonique : **corpus-scriptura.fr** (acquis via OVH, juillet 2026, avec corpus-scriptura.com en redirection).'],
];

let n = 0;
for (const [av, ap] of R) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 64));
}
// contrôle : plus aucune mention du .com comme canonique
const restes = [...v.matchAll(/corpus-scriptura\.com[^\n]{0,40}canonique|canonique[^\n]{0,40}corpus-scriptura\.com/gi)].map(m => m[0]);
console.log(`charte : ${avant} → ${v.length} caractères · ${n}/${R.length} modifications`);
console.log('« Quinson » restant : ' + (v.match(/Quinson/g) || []).length);
console.log('« .com donné pour canonique » restant : ' + (restes.length ? restes.join(' | ') : 'aucun'));
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde6.md');
process.exit(0);
