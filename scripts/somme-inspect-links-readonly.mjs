import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (!ids.length) throw new Error('Usage: node scripts/somme-inspect-links-readonly.mjs <id> [...]');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: links, error } = await sb.from('liens_bibliques').select('*').in('id', ids).order('id');
if (error) throw error;
const segmentIds = [...new Set(links.map((link) => link.segment_id))];
const { data: segments, error: segmentError } = await sb.from('segments')
  .select('*')
  .in('id', segmentIds).order('segment_numero');
if (segmentError) throw segmentError;
console.log(JSON.stringify({ links, segments }, null, 2));
