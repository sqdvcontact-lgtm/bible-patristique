import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 171 à 189 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 1 114 segments des questions 171 à 189 ont été lus intégralement. État final : 678 liens vérifiés (572 type 1, 31 type 2, 68 type 3, 7 type 4), sans doublon, cible morte ou ambiguë, motif vide ni cible de chapitre.\n- Les visions, figures et récits doivent être classés selon leur fonction locale : une interprétation explicite est T3 (Lia/Rachel, Marie/Marthe, échelle de Jacob), tandis qu'un simple exemple narratif demeure T4 (Débora, les filles de Philippe, Tabitha, le publicain).\n- Les cibles ont été resserrées sur le verset sémantiquement mobilisé, notamment MAT.7.22-23, MAT.19.21, 1CO.13.2, ACT.10.10, PSA.147.14 et GAL.6.2.\n- Le surnuméraire vulgate de Si 9,11 reste correctement représenté par verset_v2_id, sans invention d'un identifiant canonique commun.\n- La Secunda Secundae est désormais relue jusqu'à son dernier segment. La reprise fiable peut continuer à la Tertia Pars. Avancement global contigu : 21 501 / 32 367, soit 66,43 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q171–189 enregistrée.');
