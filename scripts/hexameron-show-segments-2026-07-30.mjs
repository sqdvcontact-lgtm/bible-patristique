import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const wanted = new Set(process.argv.slice(2).map(Number));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from('segments')
  .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2')
  .eq('id_oeuvre', OEUVRE)
  .in('segment_numero', [...wanted])
  .order('segment_numero');
if (error) throw error;
console.log(JSON.stringify(data, null, 2));
