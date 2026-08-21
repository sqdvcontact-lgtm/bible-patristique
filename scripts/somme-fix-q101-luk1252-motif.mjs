import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const id = 55501;
const oldMotif = 'Lien vérifié par lecture intégrale : cible LUK.12.52, fonction sémantique de type 4.';
const motif = 'Écho thématique à Lc 12,52 : Thomas traite de la division possible au sein de la famille lorsque le culte de Dieu doit primer les devoirs de parenté, sans citer littéralement le verset.';
const { data: before, error: readError } = await sb.from('liens_bibliques').select('*').eq('id', id).single();
if (readError) throw readError;
if (before.segment_id !== 433159 || before.canon_id !== 'LUK.12.52' || before.type !== 4 || before.fiabilite !== 'vérifié'
  || before.provenance !== 'lecture' || before.arbitrage_requis !== false || before.motif !== oldMotif) {
  throw new Error('Préétat du lien 55501 différent ; correction refusée.');
}
const { data: updated, error: updateError } = await sb.from('liens_bibliques').update({ motif })
  .eq('id', id).eq('segment_id', 433159).eq('canon_id', 'LUK.12.52').eq('type', 4)
  .eq('fiabilite', 'vérifié').eq('provenance', 'lecture').eq('arbitrage_requis', false).eq('motif', oldMotif)
  .select('*');
if (updateError) throw updateError;
if (updated.length !== 1 || updated[0].motif !== motif) throw new Error('Correction non appliquée exactement une fois.');
console.log(JSON.stringify({ applied: true, id, canon_id: 'LUK.12.52', type: 4, motif }, null, 2));
