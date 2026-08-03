import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const OEUVRE='A0010O0023', SORTIE='scripts/heptateuque/audit-reprise/liens-genese-q161-q170-lecture.json'
const QUESTIONS=['Question CLXI','Question CLXII','Question CLXIII','Question CLXIV','Question CLXV','Question CLXVI','Question CLXVII','Question CLXVIII','Question CLXIX','Question CLXX']
const CIBLES=['GEN.47.29','GEN.24.2','GEN.24.49','PSA.24.10','PSA.25.10','NUM.19.11','NUM.19.12','NUM.19.13','SIR.34.25','SIR.34.26','SIR.34.30','SIR.34.31','PSA.31.1','PSA.32.1','LUK.3.23','GEN.47.31','GEN.48.4','GEN.48.5','GEN.48.6','GEN.48.7','GEN.35.19','MAT.2.1','GEN.48.14','GEN.48.19','GEN.25.23','GEN.48.22','GEN.33.19','GEN.34.25','GEN.49.6','GEN.35.2','GEN.35.3','GEN.35.4','GEN.49.33','HEB.12.22','SIR.11.28','SIR.11.30','GEN.50.3','EXO.34.28','1KI.19.8','MAT.4.2','JON.3.4','ACT.1.3','ACT.1.9','ROM.4.25','JHN.20.22','ACT.2.2','ACT.2.3','ACT.2.4','1CO.15.4','GEN.50.5']
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const {data:segments,error}=await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1','Livre premier').in('ref_niv2',QUESTIONS).order('segment_numero')
if(error)throw error
const qs=[...new Set(segments.map(s=>s.ref_niv2))]; if(qs.length!==10)throw new Error(`Questions ${qs}`)
const ids=segments.map(s=>s.id); const {data:liens,error:e2}=await sb.from('liens_bibliques').select('*').in('segment_id',ids);if(e2)throw e2
const {data:temoins,error:e3}=await sb.from('versets_lecture').select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset',CIBLES);if(e3)throw e3
const ps=new Set(temoins.map(t=>t.id_verset));const abs=CIBLES.filter(c=>!ps.has(c));if(abs.length)throw new Error(`Absents ${abs}`)
mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(SORTIE,`${JSON.stringify({genere_le:new Date().toISOString(),oeuvre:OEUVRE,lot:'Genèse CLXI-CLXX',cibles_candidates:CIBLES,temoins:temoins.sort((a,b)=>CIBLES.indexOf(a.id_verset)-CIBLES.indexOf(b.id_verset)),liens_existants:liens,segments},null,2)}\n`,'utf8')
console.log(JSON.stringify({sortie:SORTIE,segments:segments.length,bornes:[segments[0]?.segment_numero,segments.at(-1)?.segment_numero],questions:qs,temoins:temoins.length,liens_existants:liens.length,deja_relus:segments.filter(s=>s.liens_revus_le).length},null,2))
