// Charte — inscrire le modèle de l'« ornement d'état vide » (cul-de-lampe + légende).
// Même structure sur la page Recherche (aucun terme saisi) et sur la page Bible
// (un livre sans l'ouvrage / la traduction demandée). On fixe UN modèle reproductible.
// Ajouté en sous-section à la fin du §3 (Typographie) : aucune numérotation déplacée.
//   node scripts/charte-maj-ornement-vide.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde11.md', v, 'utf8');

const BLOC = `
**Ornement d'état vide (cul-de-lampe).** Quand une zone n'a rien à montrer - la page Recherche avant toute requête, la page Bible quand le livre choisi ne contient pas l'ouvrage ou la traduction demandée - on ne laisse pas le vide nu : un ornement gravé, discret, surmonte une courte légende. **C'est un ornement, pas une illustration** : il dit « il n'y a rien ici », pas « fin de chapitre ». Un seul modèle, à reprendre tel quel :

1. **Colonne centrée** : \`display:flex; flex-direction:column; align-items:center\`. L'ornement au-dessus, la légende dessous.
2. **L'image** : PNG en noir et blanc, \`opacity\` entre 0.42 et 0.5, \`mixBlendMode:'multiply'\` (le fond blanc du dessin se fond dans le papier de la page), \`width:'min(300px, 55%)'\`, \`alt=""\` + \`aria-hidden="true"\` (purement décoratif). Taille mesurée : la gravure ne doit jamais dominer la zone.
3. **La légende** : une phrase, police serif en italique, gris discret (\`#9a958d\` à \`#c0b8ae\`), \`fontSize:'13px'\`.
4. **L'espace entre les deux** : il faut de l'air, un cul-de-lampe respire. **Rogner le blanc de l'ornement** avec \`node scripts/rogner-ornement.mjs public/ornements/xxx.png\` (l'image épouse alors le dessin), puis régler l'écart par une **marge positive** \`marginBottom\` d'environ 20 px sous l'image. C'est la méthode à suivre. L'ancienne - garder le PNG carré et remonter le texte par une \`margin\` négative (valeur magique propre à chaque image, ex. \`-26px\` pour \`ruines-fumantes.png\` sur la page Bible) - est fragile : à réaligner sur le rognage dès qu'on y retouche.

Tout nouvel ornement arrive dans \`public/ornements/\` ; on le rogne d'abord, on le pose ensuite.
`;

const ANCRE = '\n---\n\n## 4. Traitement des textes bibliques';
if (!v.includes(ANCRE)) { console.error('⚠ ancre §4 introuvable'); process.exit(1); }
v = v.replace(ANCRE, '\n' + BLOC + ANCRE);

console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant})`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde11.md');
process.exit(0);
