import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',REF_NIV2='Question XLIX',PREMIER=3092,DERNIER=3159,NB_SEGMENTS=68
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. XLIX-A'
const EMPREINTE_ATTENDUE='56b4ceefc328d2c85d417528fd6ba208e8a81fee083b2c6d3485ec2cb01c75e4',CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES=[
 ['scripts/heptateuque/img/p586.jpg','d3afbcecce0233ec6ebcaf57f146165dee8d49a8f2b5ad33b9436af084497972','Page imprimée 578 : ouverture de la Question XLIX, paragraphes 1-2.'],
 ['scripts/heptateuque/img/p587.jpg','34c89207c4ef2e38bc79f06dd37b29d6fd365c008602961fa00ec64aaad1193f','Page imprimée 579 : paragraphes 2-6.'],
 ['scripts/heptateuque/img/p588.jpg','d08497945d66be642c0f7109188abee54c37ab53caa6256bc1f20916dd30eb7c','Page imprimée 580 : paragraphes 6-9.'],
 ['scripts/heptateuque/img/p589.jpg','c064e0877bddab6841f0456395bc29fdf1faf6c4de92add4aa19cf07ec484b0a','Page imprimée 581 : paragraphes 9-11.'],
 ['scripts/heptateuque/img/p590.jpg','25f20902633f5ca3cdd05b10d67cd90fc8621502d456658e35f2b542506fc3b1','Page imprimée 582 : paragraphes 12-14.'],
 ['scripts/heptateuque/img/p591.jpg','f4840da16798f9e38956a5a6556470ab7166c56fcff778fb1c12ddd0034b9bc6','Page imprimée 583 : fin du paragraphe 14, paragraphe 15 et raccord avec 16.'],
]
const CORRECTIONS_TEXTE=[
 {n:3100,avant:'dieux [[845]]',apres:'dieux[[845]]'},
 {n:3124,avant:'promesses [[853]]',apres:'promesses[[853]]'},
 {n:3127,avant:'6. [<i>sic</i>]',apres:'9.'},
 {n:3127,avant:'Gédéon [[854]]',apres:'Gédéon[[854]]'},
]
const CORRECTIONS_NOTES=new Map([
 [3100,['[[845]] Deu. XII, 29, 31','[[845]] Deut. XII, 29, 31.']],
 [3103,['[[846]] Mat. XXIII, 35','[[846]] Matt. XXIII, 35.']],
 [3104,['[[847]] Sag. III, 6\n[[848]] 2Ti. IV, 6','[[847]] Sag. III, 6.\n[[848]] II Tim. IV, 6.']],
 [3106,['[[849]] Gen. XXII','[[849]] Gen. XXII.']],
 [3112,['[[850]] 9, 17-19.','[[850]] Hebr. XI, 17-19.']],
 [3117,['[[851]] Gen. XXIII, 3','[[851]] Gen. XXIII, 3.']],
 [3119,['[[852]] Ib. XXXV, 2, 15','[[852]] Ib. XXXVIII, 15.']],
 [3124,['[[853]] Heb XI, 32.','[[853]] Hebr. XI, 32.']],
])

const LIENS=[],SANS_CIBLE=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m]),cite=(n,c,m)=>add(n,c,1,m),allusion=(n,c,m)=>add(n,c,2,m),com=(ns,c,m)=>{for(const n of ns)add(n,c,3,m)}
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// 1 — exposition du vœu et objection contre les sacrifices humains.
for(const c of ['JDG.11.30','JDG.11.31'])allusion(3092,c,'Le début de la question résume le vœu de Jephté d’offrir en holocauste le premier être sortant de sa maison après la victoire.')
for(const c of ['JDG.11.32','JDG.11.34','JDG.11.39'])allusion(3093,c,'Le résumé narratif enchaîne la victoire, la rencontre de la fille unique et l’accomplissement du vœu.')
allusion(3094,'EXO.3.6','La formule « Dieu d’Abraham, Dieu d’Isaac, Dieu de Jacob » reprend explicitement la révélation à Moïse.')
com([3094,3095],'DEU.12.31','L’interdiction des sacrifices humains exclut que le Dieu de la Loi y prenne un plaisir charnel.')
allusion(3095,'HEB.10.1','Les sacrifices anciens sont présentés comme figures et ombres des réalités futures, appelées à céder devant leur accomplissement.')

// 2 — rachat des premiers-nés et interdiction d’imiter les nations.
com([3096],'DEU.12.31','L’hypothèse d’un sacrifice humain volontaire est examinée sous l’interdiction explicite de brûler fils et filles.')
for(const c of ['EXO.13.2','EXO.13.12','EXO.13.13'])cite(3097,c,'La note renvoie explicitement à la consécration des premiers-nés et au rachat obligatoire des premiers-nés humains.')
com([3097,3098],'DEU.12.31','Le rachat et la proscription des holocaustes humains prouvent l’horreur divine pour cette pratique.')
for(const c of ['DEU.12.29','DEU.12.30'])cite(3099,c,'Citation continue de l’avertissement à ne pas imiter le culte des nations exterminées.')
cite(3100,'DEU.12.31','Fin de la citation explicite : les nations brûlent leurs fils et leurs filles pour leurs dieux, abomination haïe du Seigneur.')
com([3101],'EXO.13.13','Le rachat des premiers-nés humains est repris comme premier témoignage contre leur immolation.')
com([3101],'DEU.12.31','L’interdiction d’imiter les sacrifices humains des nations est reprise comme second témoignage décisif.')

// 3 — le martyre et l’offrande volontaire du Christ.
allusion(3102,'MAT.5.44','Le juste martyr rend le bien pour le mal et l’amour pour la haine à ceux qui le persécutent.')
cite(3103,'MAT.23.35','La note renvoie explicitement au sang juste répandu depuis Abel jusqu’à Zacharie.')
allusion(3103,'EPH.5.2','Le Christ s’offre lui-même à Dieu pour nous en sacrifice, tout en étant mis à mort par ses ennemis.')
cite(3104,'WIS.3.6','Citation explicite des justes éprouvés comme l’or et agréés comme une hostie d’holocauste.')
cite(3104,'2TI.4.6','Citation explicite de Paul se disant déjà immolé ou offert en libation.')

// 4-5 — différence entre Abraham obéissant et Jephté vouant spontanément.
com([3105],'JDG.11.39','L’immolation de la fille de Jephté est distinguée du martyre : elle accomplit le rite d’un holocauste animal appliqué à un être humain.')
com([3105,3106,3107,3109,3112],'DEU.12.31','La loi interdisant les sacrifices humains demeure la norme à laquelle le vœu spontané de Jephté contrevient.')
cite(3106,'GEN.22.2','Le renvoi à Genèse 22 vise d’abord le commandement spécial d’offrir Isaac en holocauste.')
com([3107,3109,3110],'GEN.22.2','Abraham obéit à un ordre exceptionnel, contrairement au vœu spontané de Jephté.')
com([3107,3109,3110,3112],'JDG.11.30','Jephté formule de lui-même un vœu que Dieu n’a ni commandé ni demandé.')
for(const c of ['GEN.22.10','GEN.22.11','GEN.22.12','GEN.22.13'])com([3108],c,'Dieu arrête le bras d’Abraham et substitue un bélier à Isaac, montrant que l’immolation humaine ne lui agrée pas.')
for(const c of ['HEB.11.17','HEB.11.18','HEB.11.19'])allusion(3111,c,'Abraham pouvait obéir en croyant que Dieu ressusciterait Isaac, lecture explicitée aussitôt par l’Épître aux Hébreux.')
for(const c of ['HEB.11.17','HEB.11.18','HEB.11.19'])cite(3112,c,'La note restaurée renvoie explicitement à la foi d’Abraham en la puissance de Dieu capable de ressusciter Isaac.')
for(const c of ['JDG.11.30','JDG.11.31'])cite(3113,c,'Citation explicite du vœu de Jephté et de l’holocauste promis au retour de la victoire.')

// 6 — le relatif personnel du vœu et l’exemple du masculin générique.
com([3114,3115,3116,3117],'JDG.11.31','Le mot « quiconque » est interprété comme visant une personne humaine, non un animal licite ou impur.')
cite(3117,'GEN.23.3','La note renvoie explicitement à Abraham se levant d’auprès « du mort », bien que le mort soit Sara.')

// 7 — récit sans jugement explicite et hypothèse d’un châtiment de Jephté.
com([3118],'JDG.11.39','L’Écriture rapporte l’accomplissement du vœu sans l’approuver ni le blâmer explicitement.')
com([3118],'HEB.11.17','L’obéissance d’Abraham est, au contraire, explicitement louée par l’Écriture.')
cite(3119,'GEN.38.15','La note corrigée renvoie à Juda prenant Thamar pour une prostituée sans la reconnaître.')
for(const c of ['GEN.38.16','GEN.38.18'])allusion(3119,c,'Le récit résumé reprend Juda allant vers Thamar et ayant commerce avec elle sans savoir qu’elle est sa belle-fille.')
com([3120],'JDG.11.34','La venue de la fille unique est interprétée comme punition providentielle du vœu téméraire.')
com([3120,3122],'JDG.11.39','L’accomplissement du vœu est envisagé comme châtiment de Jephté et avertissement contre de tels vœux.')
cite(3121,'JDG.11.35','Citation explicite de Jephté déchirant ses vêtements et déplorant que sa fille soit devenue un piège pour lui.')
for(const c of ['JDG.11.37','JDG.11.38'])com([3122],c,'Le délai de deux mois accordé à la fille est intégré à l’hypothèse d’un châtiment laissé s’accomplir.')
com([3122],'GEN.22.12','Le contraste porte sur Dieu arrêtant Abraham mais n’arrêtant pas Jephté.')

// 8-9 — deux témoignages : Hébreux 11 et l’Esprit sur Jephté ; parallèle de Gédéon.
com([3123,3126],'HEB.11.32','La présence de Jephté parmi les héros de la foi interdit de condamner sa conduite sans examen approfondi.')
com([3123,3126],'JDG.11.29','La mention de l’Esprit du Seigneur sur Jephté avant le vœu constitue le second témoignage à interpréter.')
for(const c of ['HEB.11.32','HEB.11.33'])cite(3124,c,'Citation explicite de Jephté, Gédéon et les autres héros qui par la foi conquirent des royaumes et exercèrent la justice.')
for(const c of ['JDG.11.29','JDG.11.30'])cite(3125,c,'Citation explicite de l’Esprit sur Jephté, de sa marche contre Ammon puis de son vœu.')
cite(3127,'HEB.11.32','Reprise explicite du passage des Hébreux qui range Gédéon et Jephté parmi les personnages dignes d’éloge.')
cite(3127,'JDG.6.34','La citation « l’Esprit du Seigneur fortifia Gédéon » correspond sémantiquement à Juges 6,34 malgré la note imprimée 6,31.')
cite(3127,'JDG.8.27','La note renvoie explicitement à l’éphod de Gédéon devenu prostitution idolâtre et piège pour sa maison.')
com([3128],'JDG.6.34','La force donnée par l’Esprit pour vaincre les ennemis n’absout pas les fautes ultérieures de Gédéon.')
cite(3129,'HEB.11.33','Reprise explicite de ceux qui, par la foi, ont conquis des royaumes et exercé la justice.')
com([3129],'JDG.8.27','La louange de la foi de Gédéon n’empêche pas l’Écriture de signaler véridiquement sa faute de l’éphod.')

// 9-10 — toison de Gédéon, tentation et victoire de Jephté.
cite(3130,'JDG.6.39','La note renvoie explicitement à la seconde épreuve demandée par Gédéon avec la toison.')
for(const c of ['JDG.6.37','JDG.6.38','JDG.6.40'])com([3130],c,'Les deux états de la toison et de l’aire sont interprétés comme figures d’Israël puis de l’Église.')
cite(3130,'DEU.6.16','Citation explicite du précepte interdisant de tenter le Seigneur.')
for(const c of ['HEB.11.32','HEB.11.33'])com([3131],c,'La vie fidèle de Gédéon justifie sa place parmi les hommes de foi malgré ses fautes particulières.')
cite(3132,'JDG.11.29','Citation explicite de l’Esprit du Seigneur venant sur Jephté.')
for(const c of ['JDG.11.30','JDG.11.32','JDG.11.39'])com([3132,3133],c,'Le vœu, la victoire et l’accomplissement sont examinés pour savoir s’ils relèvent tous de l’action de l’Esprit.')
com([3132],'GEN.22.2','Le sacrifice de Jephté est comparé à celui d’Abraham expressément commandé par Dieu.')
com([3133],'JDG.8.27','La faute postérieure de l’éphod de Gédéon est opposée à la victoire qui suivit le vœu de Jephté.')
for(const c of ['JDG.6.39','JDG.6.40'])com([3134,3136],c,'L’épreuve de la toison, tenue pour possiblement fautive, précède néanmoins le prodige et la victoire de Gédéon.')
com([3134,3136],'JDG.7.22','La grande victoire qui délivre Israël suit l’épreuve de la toison.')
cite(3135,'JDG.6.39','Citation explicite de Gédéon demandant que la colère divine ne s’allume pas et proposant une seconde épreuve de la toison.')
com([3135],'DEU.6.16','La crainte de Gédéon est rapportée au précepte légal de ne pas tenter Dieu.')

// 11 — l’Esprit prophétise par Saül et Caïphe, puis utilise la faiblesse de Gédéon.
for(let v=20;v<=24;v++)cite(3137,`1SA.19.${v}`,'La note renvoie explicitement à l’Esprit saisissant les envoyés de Saül puis Saül lui-même, qui prophétisent pendant la persécution de David.')
for(let v=49;v<=51;v++)cite(3138,`JHN.11.${v}`,'La note renvoie explicitement à Caïphe prophétisant, sans comprendre sa parole, que Jésus devait mourir pour la nation.')
for(const c of ['JDG.6.36','JDG.6.37','JDG.6.38','JDG.6.39','JDG.6.40'])com([3139,3140],c,'La faiblesse de foi manifestée dans les deux épreuves de la toison sert néanmoins à annoncer prophétiquement Israël et l’Église.')

// 12 — hypothèse d’une action prophétique consciente ; cruches et flambeaux.
for(const c of ['GEN.27.15','GEN.27.16'])cite(3141,c,'La note renvoie explicitement au stratagème prophétique de Jacob revêtu des habits d’Ésaü et couvert de peaux de chevreaux.')
com([3141],'JDG.6.39','La demande de Gédéon est admise comme possible action prophétique consciente et exempte de faute.')
cite(3142,'JDG.8.27','L’éphod que l’Écriture condamne demeure une faute, quelle que soit sa signification mystérieuse.')
for(let v=16;v<=22;v++)cite(3143,`JDG.7.${v}`,'La note renvoie explicitement aux trois cents hommes, aux cruches, aux flambeaux et à la déroute de l’armée ennemie.')
cite(3144,'2CO.4.7','Citation explicite du trésor de la lumière évangélique porté dans des vases d’argile.')
for(const c of ['JDG.7.16','JDG.7.19','JDG.7.20'])com([3144],c,'Les flambeaux cachés puis révélés par les cruches brisées sont interprétés par les vases d’argile de l’Apôtre.')
com([3145],'2CO.4.7','Les vases brisés figurent les martyrs dont la lumière évangélique paraît avec plus d’éclat.')
for(const c of ['JDG.7.19','JDG.7.20','JDG.7.21','JDG.7.22'])com([3145],c,'La lumière soudaine des flambeaux et la déroute ennemie figurent la victoire de la prédication évangélique.')

// 13-15 — la Providence tire une figure d’un acte humain sans abolir sa qualification morale.
com([3146],'JDG.11.29','L’Esprit sur Jephté illustre l’action prophétique de Dieu à travers des hommes conscients ou ignorants de ses desseins.')
com([3146],'JHN.11.51','La prophétie inconsciente de Caïphe sert d’exemple à la Providence tirant un bien d’un instrument aveugle.')
com([3146],'JDG.6.39','La possible faute de Gédéon n’empêche pas Dieu d’utiliser la toison comme signe prophétique.')
com([3147,3148,3149],'DEU.12.31','La signification spirituelle éventuelle d’un sacrifice humain n’abolit pas l’interdiction divine de cette pratique.')
com([3147,3150,3151],'JDG.11.39','L’accomplissement du vœu de Jephté est distingué de la figure providentielle que Dieu peut tirer de l’événement.')
com([3149],'WIS.3.6','Le sacrifice interdit d’un homme par un homme est opposé au juste immolé par ses ennemis et agréé comme holocauste.')
allusion(3150,'HEB.10.1','Le mystère du Christ et de l’Église est recherché sous la figure extraordinaire du sacrifice, comme sous les ombres anciennes.')
com([3151,3152],'JDG.11.29','La présence de l’Esprit sur Jephté laisse ouverte l’hypothèse d’un ordre divin non rapporté par l’Écriture.')
com([3151,3152,3153],'JDG.11.30','La conscience morale de Jephté faisant le vœu est distinguée de la Providence qui peut en tirer un bien.')
com([3152,3153],'JDG.11.39','Si Dieu avait commandé le sacrifice, son accomplissement serait obéissance ; sinon il resterait faute humaine.')
nonBiblique(3153,'renvoi patristique','renvoi explicite au livre I, chapitre 21 de la Cité de Dieu sur l’homicide ou le suicide accomplis sur ordre divin ; cible intertextuelle à constituer.')
cite(3154,'JDG.11.35','Citation explicite du début de la lamentation de Jephté lorsqu’il voit sa fille unique.')
cite(3155,'JDG.11.35','Fin de la citation explicite : la fille de Jephté est devenue un piège et la cause de son malheur.')
com([3156],'JDG.11.39','La crainte religieuse de Jephté et son refus de revenir sur le vœu sont distingués de l’erreur initiale.')
com([3156,3157],'GEN.22.12','Jephté pouvait espérer que Dieu arrêterait son bras comme il avait arrêté celui d’Abraham ; la non-immolation d’Isaac manifeste la volonté divine.')
com([3157],'DEU.12.31','La défense formelle de la Loi demeure un argument pour ne pas accomplir le sacrifice humain.')
for(const c of ['JDG.11.34','JDG.11.35','JDG.11.39'])com([3158],c,'La rencontre de la fille, la lamentation du père et l’accomplissement sont interprétés comme soumission à un châtiment providentiel.')
for(const c of ['JDG.11.36','JDG.11.39'])com([3159],c,'La fille vertueuse se soumet au vœu de son père et à ce qu’elle croit être le jugement de Dieu.')

const SANS_LIEN=new Set(),sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
if(sha256('charte/CHARTE_IA.md')!==CHARTE_HASH)throw Error('Charte modifiée : relire avant toute exécution')
for(const[p,h]of PREUVES)if(sha256(p)!==h)throw Error(`Preuve fac-similé modifiée : ${p}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const [{data:segments,error},{data:contexte,error:ec}]=await Promise.all([
 sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).eq('ref_niv2',REF_NIV2).gte('segment_numero',PREMIER).lte('segment_numero',DERNIER).order('segment_numero'),
 sb.from('segments').select('segment_numero,ref_niv1,ref_niv2,segment_texte').eq('id_oeuvre',OEUVRE).gte('segment_numero',3086).lte('segment_numero',3164).order('segment_numero'),
]);if(error||ec)throw error||ec
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.ref_niv2!==REF_NIV2||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
if(contexte.length!==79||contexte[0].segment_numero!==3086||contexte.at(-1).segment_numero!==3164||contexte.slice(0,6).some(s=>s.ref_niv2!=='Question XLVIII')||contexte.slice(6).some(s=>s.ref_niv2!==REF_NIV2))throw Error('Contexte élargi invalide')
for(const{n,avant}of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===n)?.segment_texte.includes(avant))throw Error(`Précondition texte invalide ${n}: ${avant}`)
for(const[n,[avant]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(avant))throw Error(`Précondition note invalide ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(([n])=>n)),nonClasses=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!parNumero.has(n)||t!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m)))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const temoinsParId=new Map(temoins.map(t=>[t.id_verset,t])),invalides=cibles.filter(c=>{const t=temoinsParId.get(c);return!t||(!t.TR0001&&!t.TR0003&&!t.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides}`)
const ids=segments.map(s=>s.id),[{count:liensExistants,error:el},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(el||er)throw el||er;if(liensExistants)throw Error(`${liensExistants} liens existent déjà`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const s of segments){const c=candidats.find(x=>x.segment_numero===s.segment_numero);if(!c||c.ref_niv1!==s.ref_niv1||c.ref_niv2!==s.ref_niv2)throw Error(`Candidat désynchronisé ${s.segment_numero}`)}
for(const{n,avant,apres}of CORRECTIONS_TEXTE){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.segment_texte.includes(avant))throw Error(`Candidat non synchronisable ${n}: ${avant}`);candidat.segment_texte=candidat.segment_texte.replace(avant,apres);const sources=sourceMap.filter(x=>x.first_segment_numero<=n&&x.last_segment_numero>=n&&x.source_clean?.includes(avant));if(sources.length!==1)throw Error(`Source-map non synchronisable ${n}: ${sources.length}`);sources[0].source_clean=sources[0].source_clean.replace(avant,apres)}
for(const[n,[avant,apres]]of CORRECTIONS_NOTES){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.notes?.includes(avant))throw Error(`Note candidate non synchronisable ${n}`);candidat.notes=candidat.notes.replace(avant,apres)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((o,[,,t])=>(o[t]=(o[t]??0)+1,o),{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const bornesParagraphes=[3092,3096,3101,3105,3109,3114,3118,3123,3127,3132,3137,3141,3146,3150,3157,DERNIER+1],paragraphes=bornesParagraphes.slice(0,-1).map((_,i)=>i+1),pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
const sondage=paragraphes.map(p=>{const debut=bornesParagraphes[p-1],fin=bornesParagraphes[p],lot=[...LIENS,...SANS_CIBLE.map(([n,t,m])=>[n,null,t,m])].filter(([n])=>n>=debut&&n<fin),index=parseInt(createHash('sha256').update(`2026-08-02|Juges XLIX-A|${p}`).digest('hex').slice(0,8),16)%lot.length,[n,c,t]=lot[index];return{paragraphe:p,segment:n,cible:c??'sans cible',type:t}})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges XLIX-A',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,paragraphes,corrections_ocr_texte:CORRECTIONS_TEXTE.length,corrections_ocr_notes:CORRECTIONS_NOTES.size,sic_ajoutes:0,sic_parasite_supprime:1,liens_bibliques:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,sondage_par_paragraphe:sondage,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,motif]of LIENS){const temoin=temoinsParId.get(c);console.log({n,c,t,motif,segment:parNumero.get(n).segment_texte,temoin:temoin.TR0003||temoin.TR0001||temoin.TR0004})}if(!WRITE)process.exit(0)

const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q49-a-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const quote=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${quote(c)},${t},'vérifié',${quote(m)},'lecture',false)`),...SANS_CIBLE.map(([n,t,m])=>`(${parNumero.get(n).id},null,${t},'à constituer',${quote(m)},'lecture',true)`) ].join(',\n'),idSql=ids.join(', ')
const correctionsTexteSql=CORRECTIONS_TEXTE.map(({n,avant,apres})=>`update segments set segment_texte=replace(segment_texte,${quote(avant)},${quote(apres)}) where id=${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${n}: %',n; end if;`).join('\n')
const correctionsNotesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes=replace(notes,${quote(a)},${quote(b)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; ${correctionsTexteSql} ${correctionsNotesSql} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3},{data:textes,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes').in('id',ids)]);if(e1||e2||e3||e4)throw e1||e2||e3||e4
const post=new Map(textes.map(s=>[s.segment_numero,s])),mauvaisTexte=CORRECTIONS_TEXTE.some(({n,avant,apres})=>(!apres.includes(avant)&&post.get(n).segment_texte.includes(avant))||!post.get(n).segment_texte.includes(apres)),mauvaisesNotes=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>(!b.includes(a)&&post.get(n).notes.includes(a))||!post.get(n).notes.includes(b))
if(liensApres!==TOTAL||relusApres!==NB_SEGMENTS||mauvaisTexte||mauvaisesNotes||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif)))))throw Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
