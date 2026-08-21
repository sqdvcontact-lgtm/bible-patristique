import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — fin de la Tertia Pars et Supplément Q1 à 40 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- La Tertia Pars Q1–90 est entièrement relue : 5 820 segments et 2 677 liens vérifiés (2 340 T1, 61 T2, 202 T3, 74 T4), sans doublon, cible morte ou ambiguë, motif vide ni témoin manquant.\n- Sur Q61–90, toutes les anciennes cibles de chapitre ont été relues ; seules LEV 4 et LEV 5 restent au chapitre parce que l'argument mobilise les régimes sacrificiels entiers.\n- Une citation de la Prière de Manassé reste à constituer faute de support dans versets_lecture et versets_v2 ; aucune cible artificielle n'a été créée.\n- Le Supplément Q1–40, initialement presque vide (18 liens seulement sur 1 611 segments), a été lu intégralement et compte désormais 188 liens certains (131 T1, 42 T3, 15 T4). Une attribution incertaine au Deutéronome reste volontairement non liée.\n- La reprise fiable peut continuer au Supplément Q41. Avancement global contigu : 28 935 / 32 367, soit 89,40 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire fin Tertia Pars et Supplément Q1–40 enregistrée.');
