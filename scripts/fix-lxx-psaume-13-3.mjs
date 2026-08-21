// Scinde le Ps 13,3 de TR0005 entre verset canonique et addition grecque.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const id = 'ce1cbd2c-80d7-4781-86e1-7d5b56a65276';
const marker = 'τάφος ἀνεῳγμένος';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: row, error } = await sb.from('versets_v2').select('*').eq('id',id).single();
if (error) throw error;
if (row.trad_id !== 'TR0005' || row.livre !== 'PSA' || row.ch_orig !== 13 || row.v_orig !== 3 || row.canon_id !== 'PSA.13.3' || row.v_orig_suffixe != null) throw new Error('Précondition éditoriale inattendue');
const at = row.texte.indexOf(marker);
if (at < 0 || row.texte.indexOf(marker,at+1) >= 0) throw new Error('Marqueur absent ou non unique');
const first = row.texte.slice(0,at).trimEnd();
const second = row.texte.slice(at);
if (`${first} ${second}` !== row.texte) throw new Error('Recomposition inexacte');
if (row.texte.includes('\u00ad')) throw new Error('U+00AD inattendu dans la base');
const newId = randomUUID();
const backup = `${JSON.stringify({ exported_at:new Date().toISOString(), row, sha256:createHash('sha256').update(JSON.stringify(row)).digest('hex') },null,2)}\n`;
writeFileSync('tmp/lxx-psaume-13-3-before.json',backup);
const q=x=>x==null?'null':`'${String(x).replaceAll("'","''")}'`;
const note='Addition grecque transmise après le Ps 13,3 ; parallèle à la chaîne de citations de Rm 3,13-18.';
const structure='Scission éditoriale du verset-source grec 13,3 : fragment a canonique ; fragment b hors ossature AELF.';
const sql=`do $fix$ begin
update versets_v2 set texte=${q(first)},v_orig_suffixe='a',canon_id_fin=null,notes=${q(note)},note_structure=${q(structure)},alignement_verifie=false where id='${id}'::uuid and trad_id='TR0005' and livre='PSA' and ch_orig=13 and v_orig=3 and v_orig_suffixe is null and canon_id='PSA.13.3' and texte=${q(row.texte)}; if not found then raise exception 'Précondition Ps 13,3 échouée'; end if;
insert into versets_v2(id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,est_suscription,texte,canon_id,canon_id_fin,ordre_slot,notes,note_structure,alignement_verifie) values('${newId}'::uuid,'TR0005','PSA',13,3,'b',false,${q(second)},null,null,null,${q(note)},${q(structure)},false);
if (select count(*) from versets_v2 where trad_id='TR0005' and livre='PSA' and ch_orig=13 and v_orig=3)<>2 then raise exception 'Cardinalité finale incorrecte'; end if;
end $fix$;`;
const { error: applyError } = await sb.rpc('exec_sql',{sql});
if (applyError) throw applyError;
console.log(JSON.stringify({updated:id,inserted:newId,recompositionExact:`${first} ${second}`===row.texte,backup:'tmp/lxx-psaume-13-3-before.json'},null,2));
