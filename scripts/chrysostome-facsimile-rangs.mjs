// Recalage des paragraphes/rangs de A0014O0038 sur le fac-similé de 1671.
// Les alinéas commençant au milieu d'un segment sont reportés au segment suivant :
// compromis explicite pour préserver identifiants, notes et 2 983 liens existants.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE=process.argv.includes('--write'),OEUVRE='A0014O0038',SEUIL=.85
const alignes=JSON.parse(readFileSync('tmp/pdfs/chrysostome_facsimile/alineas-alignes.json','utf8'))
const segments=[]
for(let from=0;;from+=1000){const{data,error}=await sb.from('segments').select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,paragraphe,rang,controle_rang_manuel,controle_verifie').eq('id_oeuvre',OEUVRE).order('segment_numero').range(from,from+999);if(error)throw error;segments.push(...data);if(data.length<1000)break}
if(segments.length!==2594)throw new Error(`2594 segments attendus, ${segments.length}`)
const parNumero=new Map(segments.map((s,i)=>[s.segment_numero,{s,i}]))

// Un candidat par segment : le meilleur score. Les pages liminaires restent dans
// l'état prudent antérieur, car leurs titres courants imitent matériellement des alinéas.
const meilleurs=new Map()
for(const a of alignes){if(a.page_pdf<30||a.score<SEUIL)continue;const av=meilleurs.get(a.segment_numero);if(!av||a.score>av.score)meilleurs.set(a.segment_numero,a)}

// Éliminer les rares appariements qui contredisent l'ordre matériel du volume.
let candidats=[...meilleurs.values()].sort((a,b)=>a.page_pdf-b.page_pdf||a.top-b.top)
while(true){let k=-1;for(let i=1;i<candidats.length;i++)if(candidats[i].segment_numero<=candidats[i-1].segment_numero){k=i;break}if(k<0)break;const a=candidats[k-1],b=candidats[k];candidats.splice(a.score<b.score?k-1:k,1)}

const frontieres=new Set()
for(const a of candidats){const hit=parNumero.get(a.segment_numero);if(!hit)continue;let cible=hit.s.segment_numero;if(a.debut_normalise>15){const suivant=segments[hit.i+1];if(suivant?.ref_niv1===hit.s.ref_niv1)cible=suivant.segment_numero}frontieres.add(cible)}
// Toute division commence nécessairement par un paragraphe.
for(const s of segments)if(!segments[segments.indexOf(s)-1]||segments[segments.indexOf(s)-1].ref_niv1!==s.ref_niv1)frontieres.add(s.segment_numero)

const propositions=[]
let division=null,paragraphe=0,rang=0
for(const s of segments){if(s.ref_niv1!==division){division=s.ref_niv1;paragraphe=1;rang=1}else if(frontieres.has(s.segment_numero)){paragraphe++;rang=1}else rang++;const controle=s.segment_numero>=63?'moyen':'critique';propositions.push({...s,nouveau_paragraphe:paragraphe,nouveau_rang:rang,nouveau_controle:controle})}
const modifies=propositions.filter(s=>s.paragraphe!==s.nouveau_paragraphe||s.rang!==s.nouveau_rang||s.controle_rang_manuel!==s.nouveau_controle)
const groupes=new Map();for(const s of propositions){const k=`${s.ref_niv1}\0${s.nouveau_paragraphe}`;groupes.set(k,Math.max(groupes.get(k)??0,s.nouveau_rang))}const tailles=[...groupes.values()]
console.log(`${candidats.length} alinéas homilétiques alignés · ${frontieres.size} frontières avec débuts de divisions`)
console.log(`${groupes.size} paragraphes représentables · rang maximal ${Math.max(...tailles)} · ${modifies.length} segments à modifier`)
console.log(`distribution : 1=${tailles.filter(n=>n===1).length} · 2–3=${tailles.filter(n=>n>=2&&n<=3).length} · 4+=${tailles.filter(n=>n>=4).length}`)
console.log('plus longs : '+[...groupes.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`${k.replace('\0',' §')}:${n}`).join(' · '))
if(!WRITE)process.exit(0)
mkdirSync('tmp/audit-backups',{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=`tmp/audit-backups/${OEUVRE}-avant-rangs-facsimile-${stamp}.json`;writeFileSync(backup,JSON.stringify(segments,null,2))
for(let i=0;i<modifies.length;i+=25)await Promise.all(modifies.slice(i,i+25).map(async s=>{const{error}=await sb.from('segments').update({paragraphe:s.nouveau_paragraphe,rang:s.nouveau_rang,controle_rang_manuel:s.nouveau_controle,controle_verifie:false}).eq('id',s.id);if(error)throw error}))
console.log(`✓ ${modifies.length} segments écrits · sauvegarde ${backup}`)
