import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = `do $dependency_audit$
declare details text;
begin
  select coalesce(string_agg(
    format('%I.%I(%s) -> %I.%I(%s); on_update=%s; on_delete=%s',
      src_ns.nspname, src.relname,
      (select string_agg(quote_ident(a.attname), ', ' order by u.ord)
       from unnest(c.conkey) with ordinality u(attnum, ord)
       join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum),
      dst_ns.nspname, dst.relname,
      (select string_agg(quote_ident(a.attname), ', ' order by u.ord)
       from unnest(c.confkey) with ordinality u(attnum, ord)
       join pg_attribute a on a.attrelid=c.confrelid and a.attnum=u.attnum),
      c.confupdtype, c.confdeltype), E'\\n'), 'none')
    into details
  from pg_constraint c
  join pg_class src on src.oid=c.conrelid
  join pg_namespace src_ns on src_ns.oid=src.relnamespace
  join pg_class dst on dst.oid=c.confrelid
  join pg_namespace dst_ns on dst_ns.oid=dst.relnamespace
  where c.contype='f' and c.confrelid='public.oeuvres'::regclass;
  raise exception 'DEPENDENCIES:%', details;
end $dependency_audit$;`;

const { error } = await db.rpc('exec_sql', { sql });
if (!error) throw new Error('Le sondage devait annuler sa transaction par exception.');
const marker = 'DEPENDENCIES:';
const at = error.message.indexOf(marker);
if (at < 0) throw new Error(error.message);
console.log(error.message.slice(at + marker.length));
