// Relecture certaine du fac-similé, pages imprimées 26–37 (PDF 55–66).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),write=process.argv.includes('--write')
const fixes=[
 [226,'ou dequoy & vous entretiendray-je','ou dequoy vous entretiendray-je'],
 [227,'où il êtoit reduit','où il estoit reduit'],
 [230,'Quel demon enviéust','Quel demon envieux'],
 [231,'d’un êtat','d’un état'],[231,'des excés','des excès'],
 [232,'quand IEmpereur','quand l’Empereur'],[232,'La douleur D ij suspend','La douleur suspend'],
 [235,'de nôtre ville, ce Isaie é. que le Prophete','de nôtre ville, ce que le Prophete'],
 [237,'nous en éloignons','nous nous en éloignons'],
 [238,'& abandonnt tout','& abandonne tout'],[238,'qua se mettre','qu’à se mettre'],[238,'d’une flâme','d’une flamme'],
 [239,'un paradore','un paradoxe'],[239,'Nous s’ãvon : point vû','Nous n’avons point vû'],
 [240,'pas co qui','pas ce qui'],[240,'de Dinu','de Dieu'],
 [241,'qu’ellé se vid','qu’elle se vid'],
 [243,'celle de Caïnnous sommes','celle de Caïn : nous sommes'],[243,'d’une manire','d’une maniere'],[243,'qu’on ne se de peut','qu’on ne se peut'],
 [245,'ceux qu’ona traînez','ceux qu’on a traînez'],[245,'& les coupables, Les maitres','& les coupables. Les maîtres'],
 [248,'Cen est pas','Ce n’est pas'],
 [250,'ne s’ohscurcit','ne s’obscurcit'],[250,'le Propheteveut','le Prophete veut'],
 [252,'une des-beautez','une des beautez'],
 [255,'elle a perdit','elle a perdu'],[255,'sa protection, Aussi','sa protection. Aussi'],
 [256,'SIl n’a pitié','S’il n’a pitié'],[256,'fin a mes paroles','fin à mes paroles'],
 [259,'Mais avant confideré','Mais ayant consideré'],[259,'leur premieré tranquillité','leur premiere tranquillité'],
 [260,'laissez a Dieu','laissez à Dieu'],[260,'cette refignation','cette resignation'],
 [261,'il mêttra','il mettra'],
 [262,'souffrent leur : maux','souffrent leurs maux'],[262,'fondé sut la pierte','fondé sur la pierre'],
 [264,'la rendent ennuyeuse, Que','la rendent ennuyeuse. Que'],[264,'cette même assection','cette même affection'],
 [266,'punition debasphemateurs','punition des blasphemateurs'],
 [267,'ne vint pur de moy','ne vint pas de moy'],
 [268,'funeste ou nous voyons','funeste où nous nous voyons'],
 [270,'nous sertons maintenant','nous serions maintenant'],
 [272,'C’estpourquoy','C’est pourquoy'],
 [274,'outrages qu on faisoit','outrages qu’on faisoit'],[274,'nous ayous outragé','nous ayons outragé'],[274,'qui vangera','qui vengera'],
 [275,'nous opposerons courageusement','nous nous opposerons courageusement'],
 [278,'de l Empereur','de l’Empereur'],
 [279,'Je n’y êtois pas','Je n’y étois pas'],[279,'que n’y êtiez-vous','que n’y étiez-vous'],[279,'que n’empéchiez vous','que n’empéchiez-vous'],
 [282,'jusqu a cette heure','jusqu’à cette heure'],[282,'que deformais','que desormais'],
 [284,'quoi[[40]] : qu’indigent','quoi[[40]]qu’indigent'],
 [285,'jamais Toreille','jamais l’oreille'],
 [288,'tresors de là terre','tresors de la terre'],
 [289,'ils s’échaperont','ils s’échapperont'],
 [291,'ne sçait pourqui','ne sçait pour qui'],
 [292,'embûches a sa vie','embûches à sa vie'],
 [293,'la volcy','la voicy'],
 [295,'les frichesses','les richesses'],
 [297,': ot celuy',': or celuy'],
 [299,'en afsister','en assister'],[299,'ni-les pauvres','ni les pauvres'],[299,'point d’ufage','point d’usage'],
 [301,'de s’élevef a quelque','de s’élever à quelque'],[301,'luy ditil','luy dit-il'],
]
const nums=[...new Set(fixes.map(x=>x[0]))]
const{data,error}=await sb.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre','A0014O0038').in('segment_numero',nums);if(error)throw error
const by=new Map(data.map(s=>[s.segment_numero,s])),changed=new Map()
for(const[n,a,b]of fixes){const s=by.get(n);if(!s)throw Error(`S${n} introuvable`);const t=changed.get(n)??s.segment_texte;if(t.includes(b))continue;if(t.includes(a))changed.set(n,t.replace(a,b));else throw Error(`S${n}: lecture introuvable: ${a}`)}
console.log(`${changed.size} segments à modifier (${fixes.length} corrections), mode ${write?'ÉCRITURE':'SIMULATION'}.`)
for(const[n,segment_texte]of changed){console.log(`S${n}`);if(write){const{error}=await sb.from('segments').update({segment_texte}).eq('id',by.get(n).id);if(error)throw error}}
