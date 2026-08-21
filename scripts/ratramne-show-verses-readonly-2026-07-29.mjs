import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = process.argv.slice(2);
if (!ids.length) throw new Error('Passer au moins un id canonique.');
const { data, error } = await db.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', ids).order('id_verset');
if (error) throw error;
console.log(JSON.stringify(data, null, 2));
