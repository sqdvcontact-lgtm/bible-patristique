// Charte — modèle de segmentation : paragraphe, rang, page (24/07/2026).
// Amende le §5 (séparateurs) et le §6 (le § comme dernier niveau).
//   node scripts/charte-maj-paragraphes.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde9.md', v, 'utf8');

const R = [];

// ── §5 : les séparateurs cèdent la place au paragraphe ──────────────────────
R.push([
`Les retours à la ligne voulus par l'auteur sont matérialisés par une ligne de séparation : non numérotée (segment_numero vide), nature \`separateur\`, segment_texte vide.`,
`**Le paragraphe de la source se conserve, et il commande l'affichage** (modèle arrêté le 24 juillet 2026).

Un paragraphe de l'édition d'origine se découpe en plusieurs segments — c'est nécessaire pour lier finement — mais il doit se **rendre d'un seul tenant** à l'écran, tel que la source l'imprime. Trois colonnes le portent :

| colonne | rôle |
|---|---|
| \`paragraphe\` | le n° du § dans la source. **Jamais affiché** : il sert à joindre les segments d'un même paragraphe. |
| \`rang\` | la place du segment dans ce § (1…k). |
| \`page\` | la page de l'édition où le segment commence. |

L'ordre-segment est donc \`paragraphe.rang\`, toujours bâti sur le même modèle : le § 1 découpé en cinq donne 1.1 à 1.5. **C'est ce qui rend les références stables** : re-couper le § 2 ne décale plus rien ailleurs, alors qu'avec le seul \`segment_numero\`, séquentiel et plat, toute reprise de segmentation décalait la suite de l'œuvre et rompait ce qui pointait dessus.

\`page\` est une **colonne, non une ligne-marqueur** : une ligne « saut de page » se déplacerait à chaque re-segmentation, une colonne survit.

*Les lignes de nature \`separateur\`* — segment vide matérialisant un retour à la ligne — deviennent inutiles dès que \`paragraphe\` est renseigné : la même information s'y dit proprement, comme propriété du segment et non comme fausse ligne. On les conserve dans les œuvres déjà importées, on n'en crée plus.

⚠️ **Ce modèle ne vaut que pour les imports à venir.** Les œuvres déjà en base gardent leurs colonnes nulles et leur affichage segment par segment ; on ne les reprend que si la source est à portée. La pagination, en particulier, **n'a survécu dans aucun des 136 770 segments existants** : elle ne peut venir que d'une ré-extraction.`]);

// ── §6 : le § n'est plus le dernier ref_niv ─────────────────────────────────
R.push([
`Le niveau paragraphe (§) est toujours le dernier niveau, en base uniquement — jamais affiché comme titre.`,
`Le niveau paragraphe (§) **a sa propre colonne \`paragraphe\` depuis le 24 juillet 2026** (cf. §5) : il ne s'empile plus dans les \`ref_niv\`, qui sont désormais réservés à la seule structure éditoriale — parties, livres, chapitres, articles. Il n'est jamais affiché comme titre.

*Les deux conventions de numérotation ci-dessous valent inchangées pour cette colonne.*`]);

let n = 0;
for (const [av, ap] of R) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 70));
}
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant}) · ${n}/${R.length} modifications`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde9.md');
process.exit(0);
