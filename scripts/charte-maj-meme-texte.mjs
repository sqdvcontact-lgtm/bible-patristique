// Charte — la règle fondatrice de la polyglotte, énoncée par l'auteur du site
// le 24/07/2026 et absente du document : « une ligne = le même texte, traduit
// différemment ». Avec les deux détecteurs qui la rendent contrôlable.
//   node scripts/charte-maj-meme-texte.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde8.md', v, 'utf8');

const ANCRE = `#### Un créneau sans texte : soudure ou manque ? (ajout du 24 juillet 2026)`;
const AJOUT = `#### La règle fondatrice : une ligne, un même texte (24 juillet 2026)

**Un créneau de l'ossature n'est pas un numéro, c'est une UNITÉ DE CONTENU.** Toutes les éditions rangées sur une même ligne doivent y porter **le même passage, traduit différemment**. C'est ce qui fait une polyglotte : sans cela, le lecteur compare des textes qui ne se répondent pas, et un lien biblique posé sur ce créneau vise autre chose que ce qu'il annonce.

Il en découle qu'**une divergence de découpage entre éditions n'est jamais une raison de laisser les lignes en désaccord.** Quand la Vulgate met en fin de verset N ce que l'hébreu ouvre au verset N+1, on ne dit pas « chacune est à son numéro, tout va bien » : on scinde, on reporte, jusqu'à ce que la ligne dise une seule chose. La numérotation propre à chaque édition se conserve dans \`ch_orig\`/\`v_orig\` — elle ne commande pas le placement.

**Deux détecteurs, à croiser.** Aucun ne suffit seul ; ensemble ils ne laissent guère de doute.

| outil | ce qu'il voit | portée |
|---|---|---|
| \`scripts/detecte-longueurs.mjs\` | un témoin bien plus court ou plus long que les autres au même créneau | **toutes les langues** — c'est le signal le plus robuste, visible à l'œil nu |
| \`scripts/detecte-discordances.mjs\` | deux traductions qui s'accordent mal au créneau et bien avec le voisin | français contre français seulement |

Le premier calibre chaque traduction sur son propre régime — le latin est plus bref, le grec plus dense — avant de mesurer l'écart : aucune langue n'est prise pour étalon. Relevé du 24/07/2026 : **884 écarts de longueur, 416 discordances lexicales, 43 signalés par les deux** — ces 43 sont quasi certainement fautifs.

⚠️ **Un écart n'est pas toujours une faute.** Une édition peut légitimement être plus brève : la Septante l'est dans Jérémie, et ses 109 écarts y relèvent du texte, non de l'alignement. **On lit avant de corriger**, et l'on ne corrige que ce qu'on a lu.

`;

if (!v.includes(ANCRE)) { console.log('⚠ ancre introuvable'); process.exit(1); }
v = v.replace(ANCRE, AJOUT + ANCRE);
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant})`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde8.md');
process.exit(0);
