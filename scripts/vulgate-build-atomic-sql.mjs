// Construit le lot SQL atomique TR0004 à partir des instantanés validés.
// Ce script n'écrit pas dans Supabase.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'tmp/vulgate-preflight-2026-07-29';
const before = JSON.parse(readFileSync(`${root}/TR0004-before.json`, 'utf8'));
const after = JSON.parse(readFileSync(`${root}/TR0004-simulated-after.json`, 'utf8'));
const byBefore = new Map(before.map(row => [row.id, row]));
const q = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const b = value => value ? 'true' : 'false';
const structural = ['texte','canon_id','canon_id_fin','v_orig_suffixe','est_suscription','notes','note_structure','note_edition','note_travail'];
const changed = after.filter(row => byBefore.has(row.id) && structural.some(k => row[k] !== byBefore.get(row.id)[k]));
const inserted = after.filter(row => !byBefore.has(row.id));
const splitRefs = [
  ['1CH',20,7],['3JN',1,14],['ACT',10,48],['ACT',14,6],['ACT',19,40],['ECC',7,30],['EZK',2,9],['GEN',5,31],['JDG',21,24],['GEN',50,22],['LEV',26,45],['NUM',11,34],['NUM',26,1],['WIS',17,9],['WIS',19,20],['MAT',17,14],['MRK',4,40],['JHN',11,56],['ACT',7,55],['2CO',1,23],['JOS',21,36],['JOS',21,37],['MIC',5,11],['NEH',7,44],['NEH',7,48],['EZK',2,1],['MAL',3,14],['2MA',10,37]
];
const remapIds = [
  '1ae2b63b-37d4-4017-b6bf-d8a285f2279f','54f51e2d-87c0-4cb9-8c6a-e08e548c7327','06602db1-c721-4063-979e-ed2716ee02f3','6fe435d7-4b81-4c56-8787-0151fa96ea95','04dd8de7-dd40-4d2b-9091-3e5dafd2a37f','cb87049c-2dbe-4fdf-bd37-37af8709c849','05396363-43f8-4038-9cee-9f4e4e78a2c4','b1a7f495-981d-42f0-8301-5df38f543df9','1d422b63-7bef-4914-ba11-dddda8956698','277b317d-3110-4f48-80b7-79ca970dd616','356d52a8-220d-4294-afc0-1d426e2c2e3f','93e8050d-b917-48ef-a890-b459aa3b206f','d4d13473-8371-4333-83f3-8b541d9021b4','af99748a-9ea1-4000-817d-c2eeac212df2','8cbc80ee-5182-4194-8694-9596f0d22c2e','398ed770-ace4-4b8e-8d61-79343564b672','5ed4b025-6ec6-42bf-9b38-be15799ac607','bca5d040-1fbc-4fc2-a3c6-05baf067a5a6','9631510e-d8ac-4588-9b2c-a451d6eb04f8','78e2f735-758c-4389-af58-257b67d8a743','6d9e2d3a-6f58-455d-8a21-77dcb8630ec6','6382cc51-258a-4b20-a502-0d62ca4454cc','faa157ac-698f-4201-867d-279662ee8ffb','eac47eb5-6ef3-41b5-849d-8ebf6796de22','a9161cb8-22ef-4eab-b0da-6863b11cc2cb','7704db0f-f34f-4d2b-9e63-592b5d046358','ba0fd3d9-09c6-46d1-8f5f-ef6ea33f9095','e63b4a40-5e52-48f1-94bd-dd766a270030','4f1655ca-897a-45b0-9bd5-83e1c4e5fa9d','dcd35fb3-3a7e-4470-bd16-ac465d6254a6','0a4eb942-50e1-41e1-9bb9-9aa3e39d6dc8','44f8f90f-2780-44cf-9281-11c654c7cce3','1aba0519-d8fa-4d6f-95a7-647d7bd99373','b207b7f3-4eef-4d3f-8d21-88bf424c3100'
];

const lines = [`do $vulgate$`, `declare n integer;`, `begin`, `perform pg_advisory_xact_lock(hashtext('TR0004-vulgate-master-2026-07-29'));`,
  `select count(*) into n from versets_v2 where trad_id='TR0004'; if n<>35821 then raise exception 'TR0004 pre-count %, attendu 35821',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and canon_id_fin is not null; if n<>12 then raise exception 'TR0004 canon_id_fin pré-état %, attendu 12',n; end if;`,
  `update versets_v2 set alignement_verifie=false where trad_id='TR0004';`
];
const preJson = q(JSON.stringify(changed.map(row => byBefore.get(row.id))));
const changedJson = q(JSON.stringify(changed));
const insertedJson = q(JSON.stringify(inserted));
const sameStructural = structural.map(k => `v.${k} is not distinct from p.${k}`).join(' and ');
lines.push(
  `select count(*) into n from jsonb_populate_recordset(null::versets_v2,${preJson}::jsonb) p join versets_v2 v on v.id=p.id and v.trad_id='TR0004' where ${sameStructural}; if n<>${changed.length} then raise exception 'Préconditions structurelles: %/% lignes conformes',n,${changed.length}; end if;`,
  `with d as (select * from jsonb_populate_recordset(null::versets_v2,${changedJson}::jsonb)) update versets_v2 v set texte=d.texte,canon_id=d.canon_id,canon_id_fin=d.canon_id_fin,v_orig_suffixe=d.v_orig_suffixe,est_suscription=d.est_suscription,notes=d.notes,note_structure=d.note_structure,note_edition=d.note_edition,note_travail=d.note_travail from d where v.id=d.id and v.trad_id='TR0004';`,
  `insert into versets_v2(id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,texte,canon_id,canon_id_fin,ordre_slot,est_suscription,alignement_verifie,notes,note_structure,note_edition,note_travail) select id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,texte,canon_id,canon_id_fin,ordre_slot,est_suscription,false,notes,note_structure,note_edition,note_travail from jsonb_populate_recordset(null::versets_v2,${insertedJson}::jsonb);`
);
lines.push(
  `with ranked as (select id,row_number() over(partition by canon_id order by ch_orig,v_orig,coalesce(v_orig_suffixe,''),id)::int rn from versets_v2 where trad_id='TR0004' and canon_id is not null) update versets_v2 v set ordre_slot=r.rn from ranked r where v.id=r.id;`,
  `update versets_v2 set ordre_slot=null where trad_id='TR0004' and canon_id is null;`,
  `with split_refs(livre,ch_orig,v_orig) as (values ${splitRefs.map(x=>`(${q(x[0])},${x[1]},${x[2]})`).join(',')}), remap_ids(id) as (values ${remapIds.map(id=>`(${q(id)}::uuid)`).join(',')}), sacy_map as (select livre,ch_orig,v_orig,coalesce(v_orig_suffixe,'') suffixe,canon_id,bool_or(alignement_verifie) verified from versets_v2 where trad_id='TR0001' group by livre,ch_orig,v_orig,coalesce(v_orig_suffixe,''),canon_id) update versets_v2 v set alignement_verifie=true where v.trad_id='TR0004' and (v.livre in ('PSA','SIR','TOB','JDT') or exists(select 1 from split_refs r where (r.livre,r.ch_orig,r.v_orig)=(v.livre,v.ch_orig,v.v_orig)) or exists(select 1 from remap_ids r where r.id=v.id) or exists(select 1 from sacy_map s where s.livre=v.livre and s.ch_orig=v.ch_orig and s.v_orig=v.v_orig and s.suffixe=coalesce(v.v_orig_suffixe,'') and s.canon_id is not distinct from v.canon_id and s.verified));`,
  `update editions_sources set titre_edition='Vulgata Clementina — texte numérique du Clementine Vulgate Project',editeur='Clementine Vulgate Project / CrossWire Bible Society',annee_edition='1946 (base imprimée) ; module 2.0.1 (2017)',lieu_edition='Madrid (base imprimée)',source_nom='CrossWire VulgClementine 2.0.1',source_url='https://ftp.crosswire.org/sword/modules/ModInfo.jsp?modName=VulgClementine',source_fichier='VulgClementine.zip — SHA-256 4871DD2B2FFBE1B8999C8F1F96E4F36D9EFADC4A6174DB0EE3B98B7C687B2904',date_extraction='2026-07-29',particularites='Texte numérique du Clementine Vulgate Project, dérivé principalement de l’édition A. Colunga et L. Turrado (Madrid, 1946). État aligné : 36 000 lignes ; 35 717 rattachées à l’ossature AELF ; 283 hors ossature, dont 152 fragments de suscription du Psautier et 131 additions ou éléments propres à la tradition latine/grecque-latine. 35 750 alignements vérifiés ; 250 restent à contrôler.',integrite_verifiee=true,notes='Module CrossWire VulgClementine 2.0.1 (2017-10-28), domaine public. Source officielle contrôlée le 2026-07-29. Le fac-similé/texte source et les actions éditoriales sont conservés dans le dossier d’audit.' where id=5 and trad_id='TR0004' and titre_edition='Biblia Sacra Vulgatæ editionis — édition sixto-clémentine' and source_nom='scrollmapper / bible_databases — VulgClementine' and integrite_verifiee=false; if not found then raise exception 'Précondition notice TR0004 échouée'; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004'; if n<>36000 then raise exception 'Post-count %, attendu 36000',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and canon_id is not null; if n<>35717 then raise exception 'Canoniques %, attendu 35717',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and canon_id is null; if n<>283 then raise exception 'Hors canon %, attendu 283',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and est_suscription; if n<>152 then raise exception 'Suscriptions %, attendu 152',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and canon_id_fin is not null; if n<>0 then raise exception 'canon_id_fin résiduels %',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and alignement_verifie; if n<>35750 then raise exception 'Vérifiées %, attendu 35750',n; end if;`,
  `select count(*) into n from versets_v2 where trad_id='TR0004' and not alignement_verifie; if n<>250 then raise exception 'Non vérifiées %, attendu 250',n; end if;`,
  `select count(*) into n from (select v_orig_suffixe,count(*) over(partition by livre,ch_orig,v_orig) cnt,chr(96+row_number() over(partition by livre,ch_orig,v_orig order by coalesce(v_orig_suffixe,''),id)::int) expected from versets_v2 where trad_id='TR0004') s where (cnt=1 and v_orig_suffixe is not null) or (cnt>1 and v_orig_suffixe is distinct from expected); if n<>0 then raise exception 'Lignes à suffixe invalide %',n; end if;`,
  `select count(*) into n from (select canon_id from versets_v2 where trad_id='TR0004' and canon_id is not null group by canon_id having min(ordre_slot)<>1 or max(ordre_slot)<>count(*) or count(distinct ordre_slot)<>count(*)) bad; if n<>0 then raise exception 'Rangs invalides sur % créneaux',n; end if;`,
  `end`, `$vulgate$;`, ``
);
const sql = lines.join('\n');
const output = `${root}/vulgate-atomic-apply.sql`;
writeFileSync(output, sql);
const sha256 = createHash('sha256').update(sql).digest('hex');
writeFileSync(`${output}.sha256`, `${sha256}  ${output}\n`);
console.log(JSON.stringify({ changedExisting: changed.length, inserted: inserted.length, bytes: Buffer.byteLength(sql), sha256, output }, null, 2));
