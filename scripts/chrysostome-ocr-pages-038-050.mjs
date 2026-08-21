// Relecture certaine du fac-similé, pages imprimées 38–50 (PDF 67–79).
import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const e=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY),write=process.argv.includes('--write')
const fixes=[
 [302,'l’execution a son choix','l’execution à son choix'],
 [308,'ainfi que ce Patriarche, Ses','ainsi que ce Patriarche. Ses'],
 [309,'de negliger. Jesus-Christ','de negliger Jesus-Christ'],[309,'ne te suivra pas mais','ne te suivra pas ; mais'],
 [313,'y’y consens','j’y consens'],[313,'qui nous échapent','qui nous échappent'],
 [315,'Voila Jesus-Christ','Voilà Jesus-Christ'],[317,'ce que hous avons','ce que nous avons'],
 [320,'& a réparer','& à réparer'],
 [326,'Il ne-faut','Il ne faut'],[327,'la proprie, té','la proprieté'],
 [328,'qu’il nous échape','qu’il nous échappe'],[330,'point inuriles','point inutiles'],
 [331,'la pau vreté','la pauvreté'],[331,'Les pauvres font à couvert','Les pauvres sont à couvert'],
 [332,'point exposée a de si','point exposée à de si'],[334,'Et sçavez vous','Et sçavez-vous'],
 [336,'exposez a de grands','exposez à de grands'],
 [339,'Car si êtant pernicieuses','Car si étant pernicieuses'],[339,'orphelin échaperoit a nôtre','orphelin échaperoit à nôtre'],
 [342,'des richeffes','des richesses'],[345,'Pour les richés','Pour les riches'],[345,'rien ãpprêter','rien apprêter'],
 [346,'dé[[46]], mentir','démentir[[46]]'],[346,'dans les. Proverbes','dans les Proverbes'],
 [354,'de ses fotces','de ses forces'],
 [358,'dés le commence[[48]] ment du monde','dés le commencement du monde[[48]]'],
 [358,'comme a un châtiment','comme à un châtiment'],[360,'beaucoup a nôtre plaisir','beaucoup à nôtre plaisir'],
 [361,'Lintemperance','L’intemperance'],[361,'leur, attire','leur attire'],
 [362,'on le couvré même','on le couvre même'],[364,'aux atraques du demon','aux attaques du demon'],
 [366,'Ssonôtre corps','Si nôtre corps'],
 [370,'préferer a sa pauvreté','préferer à sa pauvreté'],[370,'aprẽs avoir','aprés avoir'],[370,'eût cu meilleure','eût eu meilleure'],[370,'seule possestion','seule possession'],
 [372,'le seul[[50]] present','le seul[[50]] présent'],[372,'Voila, luy ditil','Voilà, luy dit-il'],[372,'Imitest l’exemple','Imitez l’exemple'],
 [373,'Elisée reçeut','Elisée reçut'],[374,'avons reçû','avons reçu'],[374,'se dépoüïlla','se dépoüilla'],
 [375,'refuseroitil','refuseroit-il'],[378,'L’absence de hôtre Prélat','L’absence de nôtre Prélat'],[379,'Que fi c’est','Que si c’est'],
]
const nums=[...new Set(fixes.map(x=>x[0]))],{data,error}=await sb.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre','A0014O0038').in('segment_numero',nums);if(error)throw error;const by=new Map(data.map(s=>[s.segment_numero,s])),changed=new Map()
for(const[n,a,b]of fixes){const s=by.get(n);if(!s)throw Error(`S${n} absent`);const t=changed.get(n)??s.segment_texte;if(t.includes(b))continue;if(t.includes(a))changed.set(n,t.replace(a,b));else throw Error(`S${n}: lecture absente: ${a}`)}
console.log(`${changed.size} segments à modifier (${fixes.length} corrections), mode ${write?'ÉCRITURE':'SIMULATION'}.`);for(const[n,segment_texte]of changed){console.log(`S${n}`);if(write){const{error}=await sb.from('segments').update({segment_texte}).eq('id',by.get(n).id);if(error)throw error}}
