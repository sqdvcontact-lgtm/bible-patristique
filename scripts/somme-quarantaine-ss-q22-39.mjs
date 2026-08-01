import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const questions = Array.from({ length: 18 }, (_, i) => `Question ${i + 22}`)
const quoted = questions.map((q) => `'${q}'`).join(',')

const sql = `do $q$
declare n_links integer; n_segments integer;
begin
  update liens_bibliques l
  set fiabilite='probable', arbitrage_requis=true,
      motif=coalesce(l.motif,'') || ' — QUARANTAINE 2026-07-29 : contrôle aléatoire post-passe en échec ; cible à revérifier.'
  from segments s
  where l.segment_id=s.id and s.id_oeuvre='A0013O0002'
    and s.ref_niv1='Secunda Secundae' and s.ref_niv2 in (${quoted})
    and l.fiabilite='vérifié' and l.provenance='lecture';
  get diagnostics n_links = row_count;

  update segments
  set liens_revus_le=null, liens_revus_par=null
  where id_oeuvre='A0013O0002' and ref_niv1='Secunda Secundae'
    and ref_niv2 in (${quoted}) and liens_revus_par='IA-lecture';
  get diagnostics n_segments = row_count;

  if n_links <> 455 then raise exception 'Quarantaine liens : %/455', n_links; end if;
  if n_segments <> 1100 then raise exception 'Quarantaine segments : %/1100', n_segments; end if;
end $q$;`

const { error } = await sb.rpc('exec_sql', { sql })
if (error) throw error
console.log(JSON.stringify({ quarantined_links: 455, review_marks_cleared: 1100 }, null, 2))
