// Relecture certaine du fac-similé, pages imprimées 63–75 (PDF 92–104).
import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const e=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY),write=process.argv.includes('--write')
const fixes=[
 [470,'ils songent a l’étouffer','ils songent à l’étouffer'],[471,'Dé S. Jean Chrysostome. On apprehende','On apprehende'],
 [473,'qu’il vous échape','qu’il vous échappe'],[475,'nous orendroient','nous prendroient'],
 [480,'n’en reçorve point','n’en reçoive point'],
 [481,'nous avertit[[80]]. de ne pas','nous avertit[[80]] de ne pas'],[481,'la dòuceur ne Je diminuë','la douceur ne le diminuë'],
 [482,'cendres, esi nous','cendres, si nous'],[482,'Ce-n’est[[81]] point','Ce n’est[[81]] point'],
 [483,'même trartement','même traitement'],[483,'la médifance','la médisance'],
 [485,'nôtre Souverain, ce de-S.','nôtre Souverain, ce'],[486,'Jean Chrysostome. n’est pas','n’est pas'],
 [486,'Les coupables & lesinnocens','Les coupables & les innocens'],[486,'sa colere & sajustice','sa colere & sa justice'],[486,'à toute heurc','à toute heure'],
 [490,'sa misesicorde','sa misericorde'],[490,'il suffise, de les avoüer','il suffise de les avoüer'],
 [492,'la fureur du glane','la fureur du glaive'],[492,'moins suportable','moins supportable'],[492,'pour l’a venir','pour l’avenir'],
 [495,'déplorer le desastre, Jugez','déplorer le desastre. Jugez'],
 [496,'Si nous a avons failli','Si nous avons failli'],[496,'à Fimpunité','à l’impunité'],
 [498,'hi à la terre','ni à la terre'],[498,'avec patrence','avec patience'],[498,'que nous laissions toucher','que nous nous laissions toucher'],
 [501,'& la Sagr sse Eternelle','& la Sagesse Eternelle'],[501,'à son mage','à son image'],
 [502,'fait de là même matiere','fait de la même matiere'],[503,'ce qu’elle reptesente','ce qu’elle represente'],
 [507,'vôtre salut, A quoy','vôtre salut. A quoy'],[507,'vôtre salut, A quoy','vôtre salut. A quoy'],
 [508,'retournons a nos desordres','retournons à nos desordres'],[509,'ne nous frape','ne nous frappe'],
 [510,'cét innocent à commis','cét innocent a commis'],[511,'mars quand','mais quand'],[512,'vôtre crime nè soit','vôtre crime ne soit'],
 [513,'à la penitence, Ne dites','à la penitence. Ne dites'],[513,'est échapé','est échappé'],[514,'pour d’autres erimes','pour d’autres crimes'],
 [517,'serieusement a nôtre salut','serieusement à nôtre salut'],
 [518,'& confulte avec','& consulte avec'],[518,'satisfaire a sa taxe','satisfaire à sa taxe'],[518,'songez a satisfaire','songez à satisfaire'],
 [519,'la E fuïte','la fuite'],[519,'du blaspheme','du blasphême'],[521,'bon peutêtre','bon peut-être'],
 [522,'que je vous propofe','que je vous propose'],[524,'vous consóler','vous consoler'],[524,'attention què je','attention que je'],
 [525,'le calme est revenu c’est','le calme est revenu. C’est'],[525,'vous n avez','vous n’avez'],
 [528,'chacun tâche a se sauver','chacun tâche à se sauver'],[529,'Voila l’avantage','Voilà l’avantage'],[529,'voila l’utilité','voilà l’utilité'],[529,'ne s’accorde qua celuy','ne s’accorde qu’à celuy'],
 [530,'encore a l’égard','encore à l’égard'],[532,'pour tecueillir','pour recueillir'],
 [535,'enfonce son contre','enfonce son coûtre'],[535,'avec le contre de l’adversité','avec le coûtre de l’adversité'],
 [540,'si le, ciel se couvre','si le ciel se couvre'],[544,'ne s’ali tere point','ne s’altere point'],[544,'Nous-pouvons dire','Nous pouvons dire'],
 [552,'les mêmes matereaux','les mêmes materiaux'],[552,'commandemens de DInu','commandemens de Dieu'],
 [554,'K iij peuvent être','peuvent être'],[554,'qui l’amime a parler','qui l’anime à parler'],[554,'sont comme[[94]]. autant','sont comme[[94]] autant'],
 [556,'pour la -vertu','pour la vertu'],[557,'les aobres','les arbres'],[559,'ni tréve a esperer','ni tréve à esperer'],[560,'honte pour, des Chrétiens','honte pour des Chrétiens'],
]
const nums=[...new Set(fixes.map(x=>x[0]))],{data,error}=await sb.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre','A0014O0038').in('segment_numero',nums);if(error)throw error;const by=new Map(data.map(s=>[s.segment_numero,s])),changed=new Map()
for(const[n,a,b]of fixes){const s=by.get(n);if(!s)throw Error(`S${n} absent`);const t=changed.get(n)??s.segment_texte;if(t.includes(a)&&!b.includes(a)){changed.set(n,t.replace(a,b));continue}if(t.includes(b))continue;if(t.includes(a))changed.set(n,t.replace(a,b));else throw Error(`S${n}: lecture absente: ${a}`)}
console.log(`${changed.size} segments à modifier (${fixes.length} corrections), mode ${write?'ÉCRITURE':'SIMULATION'}.`);for(const[n,segment_texte]of changed){console.log(`S${n}`);if(write){const{error}=await sb.from('segments').update({segment_texte}).eq('id',by.get(n).id);if(error)throw error}}
