// Charte — règle des créneaux sans texte : soudure ou manque (24/07/2026).
//   node scripts/charte-maj-soudures.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde7.md', v, 'utf8');

const ANCRE = `Les emplacements où une erreur, un décalage ou une divergence a déjà été rencontré sont consignés dans la table \`points_sensibles\`. Ils doivent être **vérifiés systématiquement** à chaque import, et la table **enrichie** dès qu'un nouveau cas est découvert.`;

const AJOUT = ANCRE + `

#### Un créneau sans texte : soudure ou manque ? (ajout du 24 juillet 2026)

Un créneau que l'édition ne remplit pas a **deux causes opposées**, et les confondre fabrique des faux dans les deux sens — soit on laisse un trou réparable, soit on invente un verset.

**SOUDURE** — l'édition imprime **en un seul verset** ce que l'ossature sépare en deux. Le texte n'est pas perdu : il est dans le verset voisin. Exemple relevé : la Vulgate met en son Si 38, 11 l'offrande de farine *et* la place faite au médecin, là où l'ossature ouvre \`SIR.38.11\` et \`SIR.38.12\`.

**MANQUE** — l'édition n'imprime réellement pas ce verset : recension différente, texte grec bref, verset propre à la tradition latine. Crampon en compte 42 dans le seul Siracide.

**Le signe qui les sépare : la continuité de la numérotation PROPRE à l'édition** autour du trou. Si elle passe du v. 10 au v. 11 sans rien sauter, le v. 11 couvre deux créneaux — soudure. Si elle saute un numéro, l'édition ne l'a pas — manque. \`node scripts/detecte-soudures.mjs [TRxxxx]\` fait ce tri (relevé du 24/07 : 182 soudures, 339 manques, sur les quatre traductions).

**Remède d'une soudure : SCINDER le voisin sur les deux créneaux — jamais recopier.** Remplir le créneau vide avec le texte du voisin le duplique et ment sur ce que l'édition imprime. On coupe le verset à l'articulation du sens, les deux moitiés **conservant \`ch_orig\` et \`v_orig\` de l'édition** — elle n'a qu'un verset là, et la trace doit le dire —, chacune portant une note qui l'énonce. Sacy le fait déjà à plusieurs endroits : s'y conformer. Modèle : \`scripts/vulgate-scinder.mjs\`.

**Remède d'un manque : rien.** On laisse le créneau vide, avec une note disant pourquoi. Le §4 l'ordonne : ne jamais combler par conjecture.

⚠️ **La continuité de la numérotation est un INDICE, non une preuve.** Avant toute scission, lire le verset voisin et vérifier qu'il couvre bien les deux créneaux. Une édition peut sauter un numéro par coquille, ou en réunir deux sans que le sens se laisse couper.`;

if (!v.includes(ANCRE)) { console.log('⚠ ancre introuvable'); process.exit(1); }
v = v.replace(ANCRE, AJOUT);
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant})`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde7.md');
process.exit(0);
