import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 100 à 117 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 705 segments des questions 100 à 117 ont été lus intégralement. État final : 296 liens vérifiés (207 type 1, 5 type 2, 83 type 3, 1 type 4), tous canoniques, sans doublon, cible morte ou ambiguë, motif vide ni arbitrage.\n- Corrections de cible particulièrement utiles : GEN.23.16, MAT.15.5, EXO.32.27, HEB.13.17, MAT.9.30, MAT.17.26, ROM.5.19, EXO.20.12, LUK.6.35, EXO.14.28, 2KI.10.25, 1SA.21.14, PSA.140.5 et 1TI.3.3. Toujours viser le contenu du témoin plutôt que le numéro imprimé.\n- Un motif non vide peut rester insuffisant s’il est seulement générique (« cible X, fonction type Y »). Le contrôle transversal doit lire les motifs, surtout les rares types 4, et expliciter le rapport sémantique. Le motif de LUK.12.52 au segment 17614 a ainsi été réécrit pour décrire la division familiale lorsque le culte de Dieu prime les devoirs de parenté.\n- La reprise fiable peut continuer à Q118. Avancement global : 18 200 / 32 367, soit 56,23 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q100–117 enregistrée.');
