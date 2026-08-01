import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour')
  .in('cle', ['charte_ia', 'feedback_liens_protocole']).order('cle');
if (error) throw error;
mkdirSync('audit/hexameron-2026-07-30', { recursive: true });
for (const row of data) {
  writeFileSync(`audit/hexameron-2026-07-30/${row.cle}.md`, String(row.valeur ?? ''), 'utf8');
}
console.log(JSON.stringify(data.map(({ cle, valeur, mis_a_jour }) => ({ cle, caracteres: String(valeur ?? '').length, mis_a_jour })), null, 2));
