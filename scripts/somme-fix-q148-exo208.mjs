import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const id = 59173;
const oldMotif = 'Le Décalogue est interprété comme visant directement les injustices ; cible de chapitre EXO.20.';
const motif = 'Thomas rapporte le péché mortel au précepte de sanctifier le jour du Seigneur ; Ex 20,8 est la cible canonique précise de ce commandement.';
const { data: witness, error: witnessError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').eq('id_verset', 'EXO.20.8').single();
if (witnessError || !witness || ![witness.TR0001, witness.TR0003, witness.TR0004].some(Boolean)) throw new Error('Témoin EXO.20.8 absent.');
const { data: before, error: readError } = await sb.from('liens_bibliques').select('*').eq('id', id).single();
if (readError) throw readError;
if (before.segment_id !== 434922 || before.canon_id !== null || before.verset_v2_id !== null || before.livre !== 'EXO'
  || before.chapitre !== 20 || before.type !== 3 || before.fiabilite !== 'vérifié' || before.provenance !== 'lecture'
  || before.arbitrage_requis !== false || before.motif !== oldMotif) throw new Error('Préétat différent ; correction refusée.');
const { data: updated, error: updateError } = await sb.from('liens_bibliques').update({ canon_id: 'EXO.20.8', verset_v2_id: null, livre: null, chapitre: null, motif })
  .eq('id', id).eq('segment_id', 434922).is('canon_id', null).is('verset_v2_id', null).eq('livre', 'EXO').eq('chapitre', 20)
  .eq('type', 3).eq('fiabilite', 'vérifié').eq('provenance', 'lecture').eq('arbitrage_requis', false).eq('motif', oldMotif).select('*');
if (updateError) throw updateError;
if (updated.length !== 1 || updated[0].canon_id !== 'EXO.20.8' || updated[0].livre !== null || updated[0].chapitre !== null) throw new Error('Postétat invalide.');
console.log(JSON.stringify({ applied: true, id, from: 'EXO ch.20', to: 'EXO.20.8', type: 3 }, null, 2));
