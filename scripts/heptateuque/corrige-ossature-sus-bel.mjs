import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WRITE = process.argv.includes('--write')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function compte(table, colonne, motif) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).like(colonne, motif)
  if (error) throw error
  return count
}

const avant = {
  canon_dan13: await compte('versets_canon', 'id', 'DAN.13.%'),
  canon_dan14: await compte('versets_canon', 'id', 'DAN.14.%'),
  canon_sus: await compte('versets_canon', 'id', 'SUS.%'),
  canon_bel: await compte('versets_canon', 'id', 'BEL.%'),
  v2_dan13: await compte('versets_v2', 'canon_id', 'DAN.13.%'),
  v2_dan14: await compte('versets_v2', 'canon_id', 'DAN.14.%'),
  liens_dan13: await compte('liens_bibliques', 'canon_id', 'DAN.13.%'),
  liens_dan14: await compte('liens_bibliques', 'canon_id', 'DAN.14.%'),
}
if (avant.canon_dan13 === 0 && avant.canon_dan14 === 0 && avant.canon_sus === 64 && avant.canon_bel === 42) {
  const final = {
    lecture_sus: await compte('versets_lecture', 'id_verset', 'SUS.1.%'),
    lecture_bel: await compte('versets_lecture', 'id_verset', 'BEL.1.%'),
    v2_sus: await compte('versets_v2', 'canon_id', 'SUS.1.%'),
    v2_bel: await compte('versets_v2', 'canon_id', 'BEL.1.%'),
    liens_sus: await compte('liens_bibliques', 'canon_id', 'SUS.1.%'),
    liens_bel: await compte('liens_bibliques', 'canon_id', 'BEL.1.%'),
  }
  if (final.lecture_sus !== 64 || final.lecture_bel !== 42 || final.v2_sus !== 194 || final.v2_bel !== 126) {
    throw new Error(`État migré incomplet : ${JSON.stringify(final)}`)
  }
  console.log(JSON.stringify({ mode: 'audit', deja_migre: true, avant, final }, null, 2))
  process.exit(0)
}
if (avant.canon_dan13 !== 64 || avant.canon_dan14 !== 42 || avant.canon_sus !== 0 || avant.canon_bel !== 0) {
  throw new Error(`Préétat inattendu : ${JSON.stringify(avant)}`)
}
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', avant }, null, 2))
if (!WRITE) process.exit(0)

const sql = `
do $p$
declare n integer;
begin
  if (select count(*) from versets_canon where id like 'DAN.13.%') <> 64
     or (select count(*) from versets_canon where id like 'DAN.14.%') <> 42
     or exists(select 1 from versets_canon where livre in ('SUS','BEL')) then
    raise exception 'Préétat canonique modifié';
  end if;

  insert into versets_canon(id,livre,ch_canon,v_canon,ordre,est_suscription,ch_heb,v_heb,commentaire_ia)
  select 'SUS.1.' || v_canon, 'SUS', 1, v_canon, 37001000 + v_canon,
         est_suscription, 13, v_canon,
         concat_ws(' ', commentaire_ia, 'Migration charte : ancien identifiant DAN.13.')
  from versets_canon where livre='DAN' and ch_canon=13 order by v_canon;
  get diagnostics n=row_count;
  if n<>64 then raise exception 'Insertion SUS : %',n; end if;

  insert into versets_canon(id,livre,ch_canon,v_canon,ordre,est_suscription,ch_heb,v_heb,commentaire_ia)
  select 'BEL.1.' || v_canon, 'BEL', 1, v_canon, 38001000 + v_canon,
         est_suscription, 14, v_canon,
         concat_ws(' ', commentaire_ia, 'Migration charte : ancien identifiant DAN.14.')
  from versets_canon where livre='DAN' and ch_canon=14 order by v_canon;
  get diagnostics n=row_count;
  if n<>42 then raise exception 'Insertion BEL : %',n; end if;

  update liens_bibliques set canon_id='SUS.1.' || split_part(canon_id,'.',3)
  where canon_id like 'DAN.13.%';
  update liens_bibliques set canon_id='BEL.1.' || split_part(canon_id,'.',3)
  where canon_id like 'DAN.14.%';

  update versets_v2 set canon_id='SUS.1.' || split_part(canon_id,'.',3), livre='SUS'
  where canon_id like 'DAN.13.%';
  update versets_v2 set canon_id='BEL.1.' || split_part(canon_id,'.',3), livre='BEL'
  where canon_id like 'DAN.14.%';
  update versets_v2 set canon_id_fin='SUS.1.' || split_part(canon_id_fin,'.',3)
  where canon_id_fin like 'DAN.13.%';
  update versets_v2 set canon_id_fin='BEL.1.' || split_part(canon_id_fin,'.',3)
  where canon_id_fin like 'DAN.14.%';

  update pericope_occurrences
  set canon_id_debut='SUS.1.' || split_part(canon_id_debut,'.',3),
      canon_id_fin='SUS.1.' || split_part(canon_id_fin,'.',3), livre='SUS'
  where canon_id_debut like 'DAN.13.%' and canon_id_fin like 'DAN.13.%';
  update pericope_occurrences
  set canon_id_debut='BEL.1.' || split_part(canon_id_debut,'.',3),
      canon_id_fin='BEL.1.' || split_part(canon_id_fin,'.',3), livre='BEL'
  where canon_id_debut like 'DAN.14.%' and canon_id_fin like 'DAN.14.%';

  delete from versets_canon where livre='DAN' and ch_canon in (13,14);
  get diagnostics n=row_count;
  if n<>106 then raise exception 'Suppression anciens créneaux : %',n; end if;
end $p$;`
const { error: erreurMigration } = await sb.rpc('exec_sql', { sql })
if (erreurMigration) throw erreurMigration

const apres = {
  canon_dan13: await compte('versets_canon', 'id', 'DAN.13.%'),
  canon_dan14: await compte('versets_canon', 'id', 'DAN.14.%'),
  canon_sus: await compte('versets_canon', 'id', 'SUS.1.%'),
  canon_bel: await compte('versets_canon', 'id', 'BEL.1.%'),
  lecture_sus: await compte('versets_lecture', 'id_verset', 'SUS.1.%'),
  lecture_bel: await compte('versets_lecture', 'id_verset', 'BEL.1.%'),
  v2_sus: await compte('versets_v2', 'canon_id', 'SUS.1.%'),
  v2_bel: await compte('versets_v2', 'canon_id', 'BEL.1.%'),
  liens_sus: await compte('liens_bibliques', 'canon_id', 'SUS.1.%'),
  liens_bel: await compte('liens_bibliques', 'canon_id', 'BEL.1.%'),
}
if (apres.canon_dan13 || apres.canon_dan14 || apres.canon_sus !== 64 || apres.canon_bel !== 42
  || apres.lecture_sus !== 64 || apres.lecture_bel !== 42
  || apres.v2_sus !== avant.v2_dan13 || apres.v2_bel !== avant.v2_dan14
  || apres.liens_sus !== avant.liens_dan13 || apres.liens_bel !== avant.liens_dan14) {
  throw new Error(`Postcontrôle invalide : ${JSON.stringify(apres)}`)
}
console.log(JSON.stringify({ avant, apres }, null, 2))
