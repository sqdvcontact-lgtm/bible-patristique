// Relecture certaine du fac-similé, pages imprimées 51–62 (PDF 80–91).
import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const e=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY),write=process.argv.includes('--write')
const fixes=[
 [384,'non pas a un homme','non pas à un homme'],[387,'ne persuade pas moin','ne persuade pas moins'],
 [388,'envoloppez-moy dans seur ruïne','enveloppez-moy dans leur ruïne'],[389,'de sa Passon','de sa Passion'],
 [390,'luy dira-tail','luy dira-t-il'],[391,'sous silence[[56]], cét article','sous silence[[56]] cét article'],[391,'comme, nous pardonnons','comme nous pardonnons'],
 [392,'les imnocents','les innocens'],[393,'par la fulte','par la fuite'],
 [396,'nom de Chrétiens, Que','nom de Chrétiens. Que'],[396,'ce nom. sacré','ce nom sacré'],
 [397,'une ville seditteuse','une ville seditieuse'],[399,'& comme Tun est','& comme l’un est'],
 [400,'car commé c’est','car comme c’est'],[401,'vôtre ville acause','vôtre ville à cause'],[403,'J’en ay vù','J’en ay vû'],
 [404,'n’attaquera pòint','n’attaquera point'],[404,'cest fuy qui','c’est luy qui'],[404,'en urt agneau','en un agneau'],
 [406,'nos miscres','nos miseres'],[406,'recourir a sa bonté','recourir à sa bonté'],[407,'des Princés','des Princes'],
 [408,'où je n’ay point[[59]]. été appellé','où je n’ay point été appellé[[59]]'],
 [412,'la même priere a Dieu','la même priere à Dieu'],[412,'Si unc femme','Si une femme'],
 [413,'son çaractere','son caractere'],[413,'priera t-il','priera-t-il'],
 [414,'& non pas, le Prêtre','& non pas le Prêtre'],[414,'la ceinture de verité N’est-il','la ceinture de verité ? N’est-il'],
 [415,'convenable a sa dignité','convenable à sa dignité'],
 [416,'& offrons a Dieu','& offrons à Dieu'],[417,'au commencent de l’Eté','au commencement de l’Eté'],
 [418,'entrons dans Je chemin','entrons dans le chemin'],[420,'comme un luiteur','comme un lutteur'],
 [421,'vous voilà arme','vous voilà armé'],[422,'nous garentir','nous garantir'],
 [424,'ont rebouchec','ont rebouchée'],[429,'que le jesine est','que le jeûne est'],
 [431,'faute du medecin, car','faute du medecin ; car'],[438,'faire miscricorde','faire misericorde'],
 [440,'prés lamême chose','prés la même chose'],[443,'Par ce, dit-il','Parce, dit-il'],
 [444,'Estce le jeûne','Est-ce le jeûne'],[446,'sa gloire confiste','sa gloire consiste'],
 [451,'Votis n’usez','Vous n’usez'],
 [453,'paro[[73]] les vaines & mensongeres','paroles vaines & mensongeres[[73]]'],
 [457,'dans tmn péche','dans un péché'],[460,'tirezle à part','tirez-le à part'],
]
const nums=[...new Set(fixes.map(x=>x[0]))],{data,error}=await sb.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre','A0014O0038').in('segment_numero',nums);if(error)throw error;const by=new Map(data.map(s=>[s.segment_numero,s])),changed=new Map()
for(const[n,a,b]of fixes){const s=by.get(n);if(!s)throw Error(`S${n} absent`);const t=changed.get(n)??s.segment_texte;if(t.includes(b))continue;if(t.includes(a))changed.set(n,t.replace(a,b));else throw Error(`S${n}: lecture absente: ${a}`)}
console.log(`${changed.size} segments à modifier (${fixes.length} corrections), mode ${write?'ÉCRITURE':'SIMULATION'}.`);for(const[n,segment_texte]of changed){console.log(`S${n}`);if(write){const{error}=await sb.from('segments').update({segment_texte}).eq('id',by.get(n).id);if(error)throw error}}
