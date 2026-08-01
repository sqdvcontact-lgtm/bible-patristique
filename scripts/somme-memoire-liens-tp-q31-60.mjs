import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation Tertia Pars, questions 31 à 60 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 1 712 segments des questions 31 à 60 ont été lus intégralement. L'ensemble Tertia Pars Q1–60 compte désormais 3 457 segments relus et 1 851 liens vérifiés (1 619 T1, 49 T2, 135 T3, 48 T4), sans doublon, cible morte ou ambiguë, motif vide ni témoin local manquant.\n- Tous les T4 initiaux ont été contrôlés ; les références interprétées sont passées en T3, les reprises narratives en T2 et les citations explicites en T1.\n- Les cibles de chapitre maintenues sont fonctionnelles et portent de vraies unités : le Décalogue d'EXO 20, l'argument sacerdotal de HEB 7 et la loi de pureté animale de LEV 11.\n- Le surnuméraire vulgate Si 24,45 est représenté par verset_v2_id ; aucun canon commun n'a été inventé.\n- Corrections structurantes : GAL.3.16, WIS.7.25, 1CO.12.4, ROM.1.4, DEU.32.6, 1CO.15.46, MAT.24.27, JHN.1.31, ISA.62.2, EXO.13.2, ACT.19.4 et LUK.3.22.\n- La reprise fiable peut continuer à Tertia Pars Q61. Avancement global contigu : 24 959 / 32 367, soit 77,11 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Tertia Pars Q31–60 enregistrée.');
