// Corrections prudentes issues de l'audit complet de A0014O0038.
// Sauvegarde JSON obligatoire avant --write. Ne modernise pas la langue de 1671.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { corrigerTypographie } from './typographie.mjs'

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),WRITE=process.argv.includes('--write'),OEUVRE='A0014O0038'
const segments=[]
for(let debut=0;;debut+=1000){const{data,error}=await sb.from('segments').select('*').eq('id_oeuvre',OEUVRE).order('segment_numero').range(debut,debut+999);if(error)throw error;segments.push(...data);if(data.length<1000)break}
if(segments.length!==2594)throw new Error(`2594 segments attendus, ${segments.length}`)

// Corrections uniquement lorsqu'avant/après ne souffrent aucune ambiguïté OCR.
const R=new Map([
 [2,[['d̀ un Peuple','à un Peuple']]],[4,[['Cest un','C’est un']]],[6,[["s’otre remply","s’estre remply"]]],[11,[['Lespere,','J’espere,']]],
 [28,[['une cavernc.','une caverne.']]],[29,[['il l’apprenoi: par cœur','il l’apprenoit par cœur']]],[36,[['quelqueunes','quelques-unes'],['sonpaïs','son païs']]],
 [49,[['plusrelevé','plus relevé']]],[53,[["I'Eglise","l’Eglise"],['Tot tantosque Doctores, Lumina Civitatis Dei','*Tot tantosque Doctores, Lumina Civitatis Dei*']]],
 [147,[["f'apprehension","l’apprehension"],['parce qu ij craint','parce qu’il craint']]],[258,[['C’estpourquoy','C’est pourquoy'],['Exod. ». ','']]],[352,[["I'Ecriture","l’Ecriture"]]],[393,[["I'exil","l’exil"]]],
 [413,[["hommes'leurs","hommes leurs"]]],[594,[["I'exemple","l’exemple"]]],[628,[["Job' est","Job est"]]],[678,[["I'image","l’image"]]],[704,[["I'aneantir","l’aneantir"]]],
 [1012,[["I'entretenir","l’entretenir"]]],[1070,[["aux 'autres","aux autres"]]],[1583,[["mieux' aller","mieux aller"]]],[1863,[["bien' subsiste","bien subsiste"]]],
 [1937,[["I'ame","l’ame"]]],[2034,[["êtoit' l’autheur","êtoit l’autheur"]]],[2105,[["un' terme","un terme"]]],[2149,[["pas' tout","pas tout"]]],
 [2308,[["I'entens","J’entens"]]],[2350,[['Plus il il montre','Plus il montre'],["I'éclat","l’éclat"]]],[2517,[["deserteurs 'du Temple","deserteurs du Temple"]]],
 [2525,[["arrivée, 'l’autre","arrivée, l’autre"]]],
 [47,[['Eloquia casta, argentum probatum & purgatum','*Eloquia casta, argentum probatum & purgatum*']]],
 [1049,[['vous. n’en','vous n’en']]],[1050,[["je vous répondray quelle est","je vous répondray qu’elle est"],['tres-necessairé','tres-necessaire']]],
 [2108,[['non Teulement','non seulement']]],[2109,[['quels Threlors','quels Tresors']]],[2111,[['devant les veux','devant les yeux'],['un fi rare','un si rare']]],
 [2126,[[' Tt iij Où',' Où']]],[2133,[['der niere','derniere'],['clemence Dinu','clemence Dieu']]],
 [2144,[['Mais elle dit †eb. I qu’il','Mais elle dit qu’il']]],[2145,[['Crains Ecctes. Dieu','Crains Dieu']]],
 [2150,[['bonne espesance de l’avenit','bonne esperance de l’avenir'],['elle nous met-en possession de-la Grace','elle nous met en possession de la Grace'],['qu’unc clarté','qu’une clarté']]],
 [2151,[['pouvoir fur les rayons','pouvoir sur les rayons'],['de la GraceC’est','de la Grace. C’est']]],
 [2160,[['dans fa main','dans sa main']]],[2161,[['Mysteres fi terribles','Mysteres si terribles'],['des boussonneries','des bouffonneries']]],
 [2170,[['Abraham vst vôtre Pere','Abraham est vôtre Pere']]],[2171,[['se separe','separe']]],
 [2191,[['Jesus-Christ asfiste','Jesus-Christ assiste']]],[2192,[['cachel','cacher'],['il se centente','il se contente']]],[2200,[['Qu ont donc','Qu’ont donc']]],[2205,[['elle n’a point de chac es','elle n’a point de charmes']]],
 [2212,[['ne son pes veritables','ne sont pas de veritables']]],[2213,[['Contiez-les à Jesus-Christ','Confiez-les à Jesus-Christ']]],
 [2231,[['rappelle nos yeux fur','rappelle nos yeux sur']]],[2232,[['les tatuës d’Alexandre','les statuës d’Alexandre']]],[2234,[['Estil possible','Est-il possible']]],
 [2240,[['Nos austeritez & nos jeûnes, ne','Nos austeritez & nos jeûnes ne']]],[2252,[['des inpires','des injures']]],[2257,[['grande frreverence','grande irreverence']]],
 [2258,[['des ijures reciproques','des injures reciproques']]],[2261,[['qui fert de confolation','qui sert de consolation']]],
 [2304,[['Marie fait des Nomb reproches','Marie fait des reproches']]],[2310,[['au sentiment de saint, Paul','au sentiment de saint Paul']]],
 [2328,[['Cest icy','C’est icy']]],[2341,[['ce que l’on aa a paye','ce que l’on a payé']]],[2347,[['reconci iation','reconciliation']]],
 [2359,[['celebrant la colere','celebrant avec la colere']]],[2370,[['reformerent leur vie, eh trois jours','reformerent leur vie, en trois jours']]],
 [2372,[['il n° parle','il ne parle']]],[2373,[['Comment sen retirent-ils','Comment s’en retirent-ils']]],
 [2440,[['dépoüillé ces puerilitez','dépoüillé de ces puerilitez']]],[2460,[['Il fait hommeur','Il fait honneur']]],[2476,[['Y. a-t-il','Y a-t-il']]],
 [2478,[['avantages, sr nous','avantages, si nous'],['nes vous parez','ne vous parez']]],[2490,[['La vie d’un Gcolier','La vie d’un Geolier'],['Ne pelit-il','Ne peut-il']]],
 [2542,[['Saint l’aul','Saint Paul']]],[2562,[['cette pustice','cette justice']]],
])
const changer=(s,a,b)=>{if(s.includes(b))return s;if(!s.includes(a))throw new Error(`Segment : chaîne introuvable « ${a} »`);return s.replace(a,b)}
const updates=[]
for(const s of segments){
 let texte=s.segment_texte
 for(const [a,b] of R.get(s.segment_numero)??[])texte=changer(texte,a,b)
 texte=texte.replaceAll(' — ',' - ')
 texte=corrigerTypographie(texte)
 const m=String(s.ref_niv2??'').match(/§\s*(\d+)/)
 const paragraphe=s.paragraphe??(m?Number(m[1]):s.segment_numero)
 const rang=s.rang??1
 if(texte!==s.segment_texte||paragraphe!==s.paragraphe||rang!==s.rang)updates.push({id:s.id,segment_numero:s.segment_numero,avant:s.segment_texte,segment_texte:texte,paragraphe,rang})
}
console.log(`${updates.length} segments à mettre à jour sur ${segments.length}`)
console.log(`${updates.filter(x=>x.avant!==x.segment_texte).length} textes modifiés · ${updates.filter(x=>x.paragraphe!==null).length} paragraphes/rangs renseignés`)
if(!WRITE)for(const u of updates.filter(x=>x.avant!==x.segment_texte&&R.has(x.segment_numero)))console.log(`S${u.segment_numero}\n- ${u.avant}\n+ ${u.segment_texte}\n`)
if(!WRITE)process.exit(0)
mkdirSync('tmp/audit-backups',{recursive:true})
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const backup=`tmp/audit-backups/${OEUVRE}-avant-corrections-${stamp}.json`
writeFileSync(backup,JSON.stringify(segments.map(({id,segment_numero,segment_texte,notes,paragraphe,rang,ref_niv1,ref_niv2})=>({id,segment_numero,segment_texte,notes,paragraphe,rang,ref_niv1,ref_niv2})),null,2))
for(let i=0;i<updates.length;i+=25)await Promise.all(updates.slice(i,i+25).map(u=>sb.from('segments').update({segment_texte:u.segment_texte,paragraphe:u.paragraphe,rang:u.rang,controle_rang_manuel:'critique'}).eq('id',u.id).then(({error})=>{if(error)throw error})))
console.log(`✓ ${updates.length} segments écrits · sauvegarde ${backup}`)
