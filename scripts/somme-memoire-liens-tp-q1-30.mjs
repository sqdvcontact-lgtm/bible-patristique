import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation Tertia Pars, questions 1 à 30 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 1 745 segments des questions 1 à 30 ont été lus intégralement. État final : 712 liens vérifiés (606 type 1, 19 type 2, 75 type 3, 12 type 4), sans doublon, cible morte ou ambiguë, motif vide ni témoin local manquant.\n- Les 43 types 4 initiaux ont tous été relus : aucun ne subsiste en Q1–10, deux seulement en Q11–20 et dix en Q21–30 ; les interprétations explicites ont été reclassées en T3.\n- Corrections structurantes : JHN.3.16, 1TI.1.15, 2CO.5.19, GAL.2.15, LUK.24.39, HEB.2.18, ROM.5.12, JHN.20.27, MAL.3.6, PSA.30.2, PSA.35.10 et COL.2.3.\n- Deux cibles de chapitre T3 sont conservées pour EZR 1 et EZR 3 : l'édition cite expressément « Esdras, chapitres 1 et 3 » et mobilise les récits entiers de l'édit de Cyrus et de la reconstruction, non un énoncé isolé.\n- La reprise fiable peut continuer à Tertia Pars Q31. Avancement global contigu : 23 246 / 32 367, soit 71,82 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Tertia Pars Q1–30 enregistrée.');
