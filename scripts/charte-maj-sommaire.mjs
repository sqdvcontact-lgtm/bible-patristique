// Charte — optimisation prudente (24/07/2026).
//   · carte de lecture en tête : quelle tâche → quelles sections ;
//   · vocabulaire des titres : « lien_1 à lien_4 » (colonnes supprimées) → types ;
//   · date de mise à jour.
// AUCUNE section n'est déplacée : les numéros sont référencés partout, les bouger
// casserait les renvois. On corrige la DISPERSION par une carte, pas par un remaniement.
//   node scripts/charte-maj-sommaire.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde5.md', v, 'utf8');

const CARTE = `
---

## Carte de lecture — à consulter AVANT d'agir

Cette charte compte plus de 150 000 caractères : on ne la lit pas d'un bout à l'autre, on va à la section qui porte la règle. **Mais un sujet y est souvent réparti sur plusieurs sections éloignées** — c'est le piège, et il a déjà coûté cher : le §25 a longtemps contredit le §9.6, qui s'en trouve à cent mille caractères.

| Ce que vous allez faire | Sections à lire, toutes |
|---|---|
| **Constituer ou corriger des liens bibliques** | **§8** (références dans le texte) · **§9** (les quatre types, et surtout **§9.5** règles communes et **§9.6** méthode) · **§10** (fiabilité → renvoie au §24.3) · **§24** (la table) · **§25** (les passes, l'audit, la typologie) |
| Transcrire une œuvre, corriger de l'OCR | §23 en entier, puis §5 à §7 (segmentation, niveaux, apparat) |
| Poser ou reprendre des notes de bas de page | §22, puis §7 |
| Importer ou aligner une traduction biblique | §15 (édition unique) · §16 (alignement) · §18 (numérotation des psaumes) · §4 |
| Toucher à la typographie | §2 · §3 · la charte d'accentuation (\`parametres.charte_accentuation\`) |
| Modifier le schéma, les accès, l'admin | §19 (schéma) · §17 (sécurité) · §14 (pièges techniques) · §15 (carte des fichiers) |

**Trois règles qui priment sur tout, où qu'on travaille :**

1. **§25.0** — un lien absent coûte moins cher qu'un lien faux ; chaque fois qu'on a le choix entre manquer et forcer, on manque.
2. **§9.5** — l'alignement de ce site est **sémantique** : le verset se reconnaît à ce qu'il dit, jamais à un numéro imprimé.
3. **§9.6** — partir du segment, jamais d'une liste de références à caser ; marquer \`liens_revus_le\` même quand rien n'en sort.

**Toute règle chiffrée doit dire sur quoi elle a été mesurée.** Une mesure faite sur une œuvre se généralise toute seule et finit par interdire ce qui marche : c'est arrivé au §25.8, corrigé le 24 juillet 2026. En ajouter une sans son périmètre, c'est préparer la même faute.
`;

const R = [
  ['Mise à jour : 17 juillet 2026', 'Mise à jour : 24 juillet 2026'],
  ['## 9. Liens bibliques (lien_1 à lien_4)', '## 9. Liens bibliques (types 1 à 4)'],
  ['Un terme consacré est toujours lien_3 ou lien_4, jamais lien_1.',
   'Un terme consacré est toujours de type 3 ou 4, jamais de type 1.'],
  ['\n---\n\n## 0. Reprise de contexte', CARTE + '\n---\n\n## 0. Reprise de contexte'],
];

let n = 0;
for (const [av, ap] of R) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 60).replace(/\n/g, '⏎'));
}
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant}) · ${n}/${R.length} modifications`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde5.md');
process.exit(0);
