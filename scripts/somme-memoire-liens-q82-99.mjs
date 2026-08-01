import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 82 à 99 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 942 segments des questions 82 à 99 ont été lus intégralement en trois lots. État final : 493 liens vérifiés (362 type 1, 17 type 2, 111 type 3, 3 type 4), sans doublon, cible morte ou ambiguë, motif vide ni arbitrage. Un unique renvoi de chapitre MAT.6 demeure volontairement pour l’ensemble du Notre Père ; il est attesté par MAT.6.9–13.\n- Une lecture intégrale avec contrôle des témoins justifie fiabilite = « vérifié » ; les scripts préparés en « probable » doivent être corrigés avant application. Le post-contrôle doit exiger le même état.\n- Lorsqu’un ancien lien de chapitre est reciblé vers canon_id, toujours vider verset_v2_id, livre et chapitre. Six liens MAT.* de Q82–87 conservaient sinon des champs secondaires hérités, et la contrainte cible_unique a correctement annulé la première transaction.\n- Une comparaison de préétat doit relire le même ensemble de colonnes que le snapshot. Comparer un select('*') historique à un sous-ensemble de colonnes produit un faux changement concurrent ; ne jamais relâcher la garde, mais harmoniser les schémas comparés.\n- Corrections de vigilance : Joël 2,32 imprimé correspond à JOL.3.5 dans le canon local ; WIS.6.5 faux a été supprimé au profit de WIS.6.4 ; les cibles corrigées comprennent 1PE.2.22 et DEU.18.10. La reprise fiable peut continuer à Q100. Avancement global : 17 495 / 32 367, soit 54,06 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q82–99 enregistrée.');
