import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const proposal = JSON.parse(readFileSync('audit/hexameron-2026-07-30/greek-gaps-proposal.json', 'utf8'));
const hash = (value) => createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase();

for (const row of proposal.rows) {
  const { data: before, error: beforeError } = await db.from('segments')
    .select('id,segment_numero,paragraphe,rang,texte_original').eq('id', row.id).single();
  if (beforeError) throw beforeError;
  if (before.segment_numero !== row.segment_numero || before.paragraphe !== row.paragraphe || before.rang !== 1) {
    throw new Error(`Cible grecque déplacée: ${row.id}`);
  }
  if (before.texte_original === row.texte_original) continue;
  if (before.texte_original) throw new Error(`Cible grecque déjà occupée: ${row.segment_numero}`);
  const { error } = await db.from('segments').update({
    texte_original: row.texte_original,
    controle_verifie: true,
  }).eq('id', row.id).is('texte_original', null);
  if (error) throw error;
}

const checked = [];
for (const row of proposal.rows) {
  const { data, error } = await db.from('segments').select('id,texte_original').eq('id', row.id).single();
  if (error) throw error;
  if (data.texte_original !== row.texte_original) throw new Error(`Échec du contrôle grec: ${row.segment_numero}`);
  checked.push(data.texte_original);
}
console.log(JSON.stringify({ ok: true, segments: checked.length, hash: hash(checked.join('\n')) }, null, 2));
