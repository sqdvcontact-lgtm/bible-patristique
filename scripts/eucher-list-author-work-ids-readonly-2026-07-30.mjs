import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};
const [notices, works] = await Promise.all([
  must(db.from('catalogue_notices').select('id,id_ligne,id_oeuvre_stable,titre_stable,id_traduction,presence_sur_le_site,niveau_verification').like('id_oeuvre_stable', 'A0418O%').order('id_oeuvre_stable').order('id'), 'notices'),
  must(db.from('oeuvres').select('id_oeuvre,titre').like('id_oeuvre', 'A0418O%').order('id_oeuvre'), 'œuvres'),
]);
console.log(JSON.stringify({ notices, works }, null, 2));
