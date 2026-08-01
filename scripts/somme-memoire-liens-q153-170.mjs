import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 153 à 170 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 819 segments des questions 153 à 170 ont été lus intégralement. État final : 358 liens vérifiés (230 type 1, 14 type 2, 114 type 3, aucun type 4), sans doublon, cible morte ou ambiguë, motif vide ni arbitrage.\n- Les citations composées doivent être distribuées vers chaque verset pertinent : EPH.5.3-5, EXO.22.15-16, DEU.22.28-29, SIR.23.22-23 et le récit de Gn 3 ont été traités verset par verset. Les récits repris sont T2 ; leurs réponses exégétiques locales sont T3.\n- Corrections structurantes : SIR.42.11, GAL.5.21, EPH.4.31, 1CO.12.31, GEN.3.24, GEN.3.21, WIS.11.20, ISA.64.5, 1JN.2.16 et 1CO.12.8. Toujours distinguer JHN et 1JN.\n- Six renvois EXO 20 de Q170 restent volontairement au chapitre : chaque segment traite le Décalogue entier comme unité législative, non un commandement isolé.\n- La reprise fiable peut continuer à Q171. Avancement global : 20 387 / 32 367, soit 63,00 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q153–170 enregistrée.');
