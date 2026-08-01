import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=')
    return [x.slice(0, i), x.slice(i + 1).replace(/^["']|["']$/g, '')]
  }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segment, error: segmentError } = await sb.from('segments').select('*')
  .eq('id_oeuvre', 'A0013O0002').eq('segment_numero', 14758).single()
if (segmentError) throw segmentError
const { data: links, error: linkError } = await sb.from('liens_bibliques').select('*').eq('segment_id', segment.id).order('id')
if (linkError) throw linkError
writeFileSync('tmp/somme-liens-audit-2026-07-29/Q44-seg14758-before.json', `${JSON.stringify({ segment, links }, null, 2)}\n`)
const wrong = links.find((l) => l.canon_id === 'JHN.4.21' && l.type === 1)
if (!wrong || links.some((l) => l.canon_id === '1JN.4.21' && l.type === 1)) throw new Error('Préétat inattendu')
const sql = `do $f$ declare n integer; begin
  update liens_bibliques set canon_id='1JN.4.21',fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,
    motif='Correction après contrôle transversal : « Nous tenons de Dieu ce commandement : celui qui aime Dieu, qu’il aime aussi son frère » vise 1 Jn 4,21, non Jn 4,21.'
  where id=${wrong.id} and segment_id=${segment.id} and canon_id='JHN.4.21' and type=1
    and fiabilite='vérifié' and provenance='lecture' and arbitrage_requis=false;
  get diagnostics n=row_count; if n<>1 then raise exception 'correction %/1',n; end if;
end $f$;`
const { error } = await sb.rpc('exec_sql', { sql })
if (error) throw error
console.log(JSON.stringify({ corrected: wrong.id, from: 'JHN.4.21', to: '1JN.4.21' }, null, 2))
