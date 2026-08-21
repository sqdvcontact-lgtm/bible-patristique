import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — validation IIa-IIae, questions 118 à 135 (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Les 699 segments des questions 118 à 135 ont été lus intégralement. État final : 279 liens vérifiés (177 type 1, 7 type 2, 95 type 3, aucun type 4), tous canoniques, sans doublon, cible morte ou ambiguë, motif vide ni arbitrage.\n- Les cibles génériques de chapitre sur les Béatitudes et le Décalogue ont été résolues vers les versets effectivement expliqués ou supprimées lorsque le segment ne portait aucun contenu biblique discriminant. Le manque reste préférable au lien propagé depuis un titre ou un segment voisin.\n- Corrections de vigilance : 1JN.3.16 pour « donner notre vie pour nos frères », HEB.11.1 au segment 18552, COL.3.21 pour l’interdiction d’irriter les enfants. Les fausses cibles BAR.4.3, JER.23.23 et EPH.6.4 ont été supprimées.\n- Dans les générateurs SQL compacts, toujours séparer explicitement nombres, mots-clés et opérateurs : une chaîne comme « 100then » fait annuler la transaction avant mutation. Le dry-run JavaScript ne valide pas la syntaxe du bloc SQL dynamique ; la transaction et ses gardes restent indispensables.\n- La reprise fiable peut continuer à Q136. Avancement global : 18 899 / 32 367, soit 58,39 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire Q118–135 enregistrée.');
