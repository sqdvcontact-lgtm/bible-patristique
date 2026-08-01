import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const proposal = JSON.parse(readFileSync('audit/hexameron-2026-07-30/notes-orthography-proposal.json', 'utf8'));

for (let offset = 0; offset < proposal.rows.length; offset += 20) {
  await Promise.all(proposal.rows.slice(offset, offset + 20).map(async (row) => {
    const { data: current, error: readError } = await db.from('segments').select('id,notes').eq('id', row.id).single();
    if (readError) throw readError;
    if (current.notes === row.after) return;
    if (current.notes !== row.before) throw new Error(`Note modifiée depuis la proposition: ${row.segment_numero}`);
    const { error } = await db.from('segments').update({ notes: row.after, controle_verifie: true })
      .eq('id', row.id).eq('notes', row.before);
    if (error) throw error;
  }));
}

for (const row of proposal.rows) {
  const { data, error } = await db.from('segments').select('notes').eq('id', row.id).single();
  if (error) throw error;
  if (data.notes !== row.after) throw new Error(`Contrôle de note échoué: ${row.segment_numero}`);
}
console.log(JSON.stringify({ ok: true, segments: proposal.rows.length }, null, 2));
