// Valide les 28 divergences Sacy explicitement confirmées « no action » par le lot round 2.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root='tmp/vulgate-preflight-2026-07-29';
const report=JSON.parse(readFileSync(`${root}/TR0004-unverified-residual-250.json`,'utf8'));
const candidates=report.rows.filter(x=>x.reason==='different');
const allowed=x=>(x.livre==='ACT'&&x.ch_orig===14&&x.v_orig>=7&&x.v_orig<=27)||(x.livre==='GEN'&&x.ch_orig===37&&x.v_orig>=28&&x.v_orig<=36);
if(candidates.length!==28)throw new Error(`28 lignes attendues, ${candidates.length}`);
const rejected=candidates.filter(x=>!allowed(x));if(rejected.length)throw new Error(`Hors liste no-action: ${JSON.stringify(rejected)}`);
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const ids=candidates.map(x=>x.id);
const {data:live,error}=await sb.from('versets_v2').select('*').in('id',ids).order('id');if(error)throw error;
if(live.length!==28||live.some(x=>x.trad_id!=='TR0004'||x.alignement_verifie))throw new Error('Préétat vivant inattendu');
const payload=`${JSON.stringify({exported_at:new Date().toISOString(),rows:live},null,2)}\n`;
writeFileSync(`${root}/TR0004-no-action-28-before.json`,payload);
writeFileSync(`${root}/TR0004-no-action-28-before.json.sha256`,`${createHash('sha256').update(payload).digest('hex')}  TR0004-no-action-28-before.json\n`);
const values=ids.map(id=>`('${id}'::uuid)`).join(',');
const sql=`do $v$ declare n integer; begin
with ids(id) as(values ${values}) update versets_v2 v set alignement_verifie=true from ids where v.id=ids.id and v.trad_id='TR0004' and not v.alignement_verifie;
get diagnostics n=row_count; if n<>28 then raise exception '28 validations attendues, %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and alignement_verifie; if n<>35778 then raise exception 'Vérifiées %, attendu 35778',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and not alignement_verifie; if n<>222 then raise exception 'Résiduelles %, attendu 222',n; end if;
update editions_sources set particularites=replace(particularites,'35 750 alignements vérifiés ; 250 restent à contrôler.','35 778 alignements vérifiés ; 222 restent à contrôler.') where trad_id='TR0004' and particularites like '%35 750 alignements vérifiés ; 250 restent à contrôler.%'; if not found then raise exception 'Précondition notice échouée'; end if;
end $v$;`;
const {error:applyError}=await sb.rpc('exec_sql',{sql});if(applyError)throw applyError;
console.log(JSON.stringify({validated:28,verified_total:35778,residual:222,backup:`${root}/TR0004-no-action-28-before.json`},null,2));
