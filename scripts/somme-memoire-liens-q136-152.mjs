import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 136 à 152 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 669 segments des questions 136 à 152 ont été lus intégralement. État final : 227 liens vérifiés (142 type 1, 5 type 2, 80 type 3, aucun type 4), sans doublon, cible morte ou ambiguë, motif vide ni arbitrage.\n- Une cible de chapitre n’est admise que si le segment mobilise réellement l’unité entière. Au segment 19372, l’objection vise tout « précepte du décalogue » : EXO 20 demeure légitime. Au segment 19377, le précepte précis de sanctifier le jour du Seigneur impose EXO.20.8 ; la cible de chapitre a été corrigée transversalement.\n- Le numéro imprimé « Ps 62,6 Vg » a été reciblé vers PSA.61.6, seul témoin portant « ab ipso patientia mea ». Cette correction illustre la priorité absolue du contenu textuel sur le numéro.\n- Autres corrections : TIT.2.12 pour l’effet éducateur de la grâce ; PRO.23.13-14 pour la correction de l’enfant ; SIR.11.14, SIR.13.2 et plusieurs références de Jérémie ont été résolues par leur formulation.\n- La reprise fiable peut continuer à Q153. Avancement global : 19 568 / 32 367, soit 60,46 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q136–152 enregistrée.');
