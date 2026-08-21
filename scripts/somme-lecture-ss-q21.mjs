import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const root='tmp/somme-liens-audit-2026-07-29';mkdirSync(root,{recursive:true});
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const{data:segments,error}=await sb.from('segments').select('*').eq('id_oeuvre','A0013O0002').eq('ref_niv1','Secunda Secundae').eq('ref_niv2','Question 21').order('segment_numero');if(error)throw error;
if(segments.length!==33||segments[0].segment_numero!==13448||segments.at(-1).segment_numero!==13480||segments.some(s=>s.liens_revus_le))throw new Error('Préétat segments Q21');
const{data:links,error:e}=await sb.from('liens_bibliques').select('*').in('segment_id',segments.map(s=>s.id)).order('id');if(e)throw e;
if(links.length!==2||!links.some(l=>l.id===59903&&l.canon_id==='JDT.6.15')||!links.some(l=>l.id===54401&&l.canon_id==='WIS.17.11'))throw new Error('Préétat liens Q21');
const payload=`${JSON.stringify({exported_at:new Date().toISOString(),segments,links},null,2)}\n`;writeFileSync(`${root}/ss-q21-before.json`,payload);writeFileSync(`${root}/ss-q21-before.json.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ss-q21-before.json\n`);
const values=segments.map(s=>`(${s.id})`).join(',');const sql=`do $v$ declare n integer;begin
update liens_bibliques set fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif='Citation directe vérifiée : Dieu abaisse ceux qui présument d’eux-mêmes (Jdt 6,15).' where id=59903 and canon_id='JDT.6.15';if not found then raise exception 'Jdt';end if;
update liens_bibliques set fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif='Citation directe vérifiée selon la Vulgate : la conscience troublée présume toujours le pire (Sg 17,11).' where id=54401 and canon_id='WIS.17.11';if not found then raise exception 'Sg';end if;
with ids(id)as(values ${values})update segments s set liens_revus_le=now()from ids where s.id=ids.id and s.liens_revus_le is null;get diagnostics n=row_count;if n<>33 then raise exception 'Segments %',n;end if;end $v$;`;
const{error:xe}=await sb.rpc('exec_sql',{sql});if(xe)throw xe;console.log(JSON.stringify({question:'Secunda Secundae 21',segments_read:33,links_verified:2,links_added:0},null,2));
