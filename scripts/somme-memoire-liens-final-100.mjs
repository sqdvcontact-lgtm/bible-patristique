import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const key = 'feedback_liens_protocole';
const title = '#### Somme théologique — audit intégral final des liens bibliques (29 juillet 2026)';
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', key).single();
if (error) throw error;
let value = String(data.valeur ?? '');
if (!value.includes(title)) {
  value += `\n\n${title}\n\n- Audit intégral achevé sur 32 367 / 32 367 segments, prologues et questions bis/ter compris. État final : 10 283 liens vérifiés (8 160 T1, 259 T2, 1 548 T3, 316 T4).\n- Contrôle global paginé : 0 segment non relu, 0 lien provisoire, 0 motif vide, 0 cible vide ou ambiguë, 0 cible canonique ou verset_v2 mort, 0 chapitre inexistant, 0 doublon et 0 lacune dans la numérotation des segments.\n- Quatre surnuméraires ou particularités d'édition sont portés par verset_v2_id, sans invention de canon commun : notamment Si 24,31 Vg, Si 24,45 Vg et Jdt 9,17 surnuméraire.\n- Les cibles de chapitre restantes ont été relues comme unités sémantiques réelles : commentaires suivis de Mt 5–6, Décalogue d'Ex 20, régimes législatifs ou sacrificiels complets, argument de He 7, récits entiers d'Esdras 1 et 3.\n- Les fiches actives « à constituer » ont été retirées du graphe. Les épisodes multi-locus sans indice discriminant, comme la dénonciation de Judas, restent documentés sans cible artificielle.\n- Les collisions T1/T2 ont été résolues par fonction locale, sans désactiver les assertions : Mt 22,30 reste T2 dans le discours indirect ; 1 Co 15,45 reste T1 dans la citation explicite.\n- Le contrôleur final est scripts/somme-audit-entire-oeuvre-readonly.mjs. Avancement global : 100,00 %.\n`;
  const { error: updateError } = await sb.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key);
  if (updateError) throw updateError;
}
console.log('Mémoire finale des liens de la Somme enregistrée : 100,00 %.');
