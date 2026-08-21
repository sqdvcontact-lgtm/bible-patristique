import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 58 à 81 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 1 134 segments des questions 58 à 81 ont été lus intégralement, en cinq lots, puis contrôlés ensemble. État final de ce palier : 478 liens vérifiés (331 type 1, 25 type 2, 120 type 3, 2 type 4), sans doublon, cible morte, motif vide, arbitrage ni cible de chapitre provisoire.\n- Toujours borner les contrôles par ref_niv1 = « Secunda Secundae » en plus des numéros de questions : les mêmes numéros existent dans Prima Pars, Prima Secundae, Tertia Pars et le Supplément.\n- Les numéros imprimés ne doivent jamais être transposés sans lecture du témoin local : exemples corrigés dans ce palier, Ex 22,1 imprimé vers EXO.21.37 canonique, Dt 23,19 vers DEU.23.20, Is 33,16 vers ISA.33.15 et Mt 7,9 vers MAT.7.19.\n- Les types ne s’excluent pas lorsque leurs fonctions sont réellement distinctes : au segment 15750, Jc 2,1 porte un type 1 pour la référence éditoriale explicite et un type 3 séparé pour son application argumentative à l’acception des personnes. Ne pas créer cette coexistence sans lecture du raisonnement local.\n- Le contrôle final Q58–81 porte sur 1 134 segments et 478 liens ; 20 types 1, 15 types 2, 20 types 3 et les 2 types 4 ont été sondés sans erreur. La reprise fiable peut continuer à la question 82. Avancement global nominal : 16 553 / 32 367 segments, soit 51,14 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q58–81 enregistrée.');
