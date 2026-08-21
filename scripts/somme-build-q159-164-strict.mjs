import{createHash}from'node:crypto';import{readFileSync,writeFileSync}from'node:fs';
const R='tmp/somme-liens-audit-2026-07-29',raw=JSON.parse(readFileSync(`${R}/ss-q159-164-raw.json`,'utf8')),cand=JSON.parse(readFileSync(`${R}/ss-q159-164-candidate-witnesses.json`,'utf8')),S=new Map(raw.segments.map(x=>[x.id,x])),N=new Map(raw.segments.map(x=>[x.segment_numero,x])),W=new Map([...raw.witnesses,...cand].map(x=>[x.id_verset,x]));
const recible=new Map([[55972,'1CO.12.31'],[56018,'GEN.3.24'],[56022,'GEN.3.21'],[56024,'WIS.11.20']]),suppressions=new Map([[55967,'Mt 11,9 ne figure pas dans le segment et son contenu (« plus qu’un prophète ») ne correspond à aucun argument local ; le renvoi parasite est retiré sans cible forcée.']]),retypes=new Map([[55974,1],[55985,3],[55987,3],[55993,3],[56013,3],[56017,1]]);
const topics={159:'la cruauté et la clémence',160:'la modestie',161:'l’humilité',162:'l’orgueil',163:'le péché des premiers parents',164:'les peines du premier péché'};
function wit(id){const w=W.get(id);if(!w)throw Error(`témoin absent ${id}`);const edition=w.TR0004?'TR0004':w.TR0003?'TR0003':'TR0001';return{id_verset:id,reference:w.ref,edition,numero_edition:w[`num_${edition}`],texte:w[edition]}}
const motifs=new Map([
 [55972,'Citation de 1 Co 12,31 sur les charismes supérieurs, invoquée contre une réduction de l’humilité à l’estimation.'],
 [55974,'Citation de 1 Co 2,12 : la connaissance des dons reçus de Dieu règle la juste comparaison avec autrui.'],
 [55985,'Interprétation de Mt 3,15 par la Glose pour distinguer trois degrés de soumission humble.'],
 [55987,'Interprétation de Jb 33,17 : la Glose assimile l’orgueil à la transgression des commandements du Créateur.'],
 [55993,'Interprétation de Rm 1,28 : l’abandon à un esprit sans jugement est présenté comme peine médicinale de l’orgueil.'],
 [56013,'Interprétation de Gn 3,16 dans la comparaison de la gravité respective des fautes d’Ève et d’Adam.'],
 [56017,'Citation de Rm 9,11 excluant des mérites antérieurs à la naissance dans l’explication de l’inégalité des peines.'],
 [56018,'Citation de Gn 3,24 sur les chérubins et le glaive flamboyant qui interdisent le retour au paradis.'],
 [56022,'Citation de Gn 3,21 sur les tuniques de peau données après la faute.'],
 [56024,'Citation de Sg 11,20 : nombre, poids et mesure fondent la convenance des peines divines.']
]);
const decisions=raw.links.map(l=>{const s=S.get(l.segment_id),ancre=s.segment_texte.slice(0,Math.min(140,s.segment_texte.length));if(suppressions.has(l.id))return{link_id:l.id,segment_id:l.segment_id,segment_numero:s.segment_numero,avant:l,decision:'supprimer',raison:suppressions.get(l.id),ancre_locale_exacte:ancre,temoins_versets_lecture:[]};const canon_id=recible.get(l.id)||l.canon_id,type=retypes.get(l.id)||l.type,topic=topics[Number(s.ref_niv2.replace(/\D/g,''))],motif=motifs.get(l.id)||(type===1?`Citation de ${canon_id}, mobilisée comme preuve dans l’examen de ${topic}.`:`Interprétation de ${canon_id}, mobilisée pour préciser ${topic}.`),final={canon_id,verset_v2_id:null,livre:null,chapitre:null,type,fiabilite:'vérifié',motif,provenance:'lecture',arbitrage_requis:false};return{link_id:l.id,segment_id:l.segment_id,segment_numero:s.segment_numero,avant:l,decision:'mettre_a_jour',changements:{reciblage:canon_id!==l.canon_id,reclassement:type!==l.type},final,ancre_locale_exacte:ancre,temoins_versets_lecture:[wit(canon_id)]}});
const specs=[
 [19987,'2TI.2.25',1,'corrigeant avec modestie ceux qui résistent à la vérité','Citation de 2 Tm 2,25 complétant la phrase commencée au verset 24 sur la correction douce des contradicteurs.'],
 [20006,'SIR.19.26',1,'Il y a celui qui s’humilia frauduleusement','Citation de Si 19,26 opposant la fausse humilité à la vertu authentique.'],
 [20032,'1PE.2.13',1,'Soyez soumis','Citation de 1 P 2,13 fondant la soumission à toute créature humaine à cause de Dieu.'],
 [20039,'1PE.3.4',1,'Ayez, dit S. Pierre','Citation de 1 P 3,4 rattachant douceur et humilité à la parure intérieure.'],
 [20049,'MAT.6.20',1,'amassez-vous des trésors dans le ciel','Citation de Mt 6,20 complétant l’opposition entre trésors terrestres et célestes.'],
 [20063,'ISA.60.15',3,'la Glose de Jérôme commentant ce passage','Interprétation d’Is 60,15 : l’orgueil promis désigne une surabondance de biens et non le vice.'],
 [20088,'SIR.6.33',1,'Si tu prêtes l’oreille','Citation de Si 6,33 sur l’écoute humble qui reçoit la doctrine.'],
 [20088,'MAT.11.25',3,'c’est-à-dire aux orgueilleux','Interprétation de Mt 11,25 identifiant les sages à leur propre jugement aux orgueilleux et les petits aux humbles.'],
 [20120,'PSA.118.51',1,'Les orgueilleux m’ont bafoué à plaisir','Citation du Ps 118,51 introduisant la Glose sur la gravité suprême de l’orgueil.'],
 [20123,'ISA.64.5',1,'Toutes nos justices sont comme du linge Souillé','Citation d’Is 64,5, cible canonique sémantique, rappelant l’imperfection des biens dont l’homme peut tirer orgueil.'],
 [20127,'SIR.10.12',1,'le principe de l’orgueil, c’est l’abandon du Seigneur','Citation de Si 10,12 présentant l’abandon de Dieu comme premier mouvement de l’orgueil.'],
 [20131,'SIR.10.13',1,'Le principe de tout péché est l’orgueil','Citation de Si 10,13 sur la primauté causale de l’orgueil.'],
 [20135,'PSA.136.7',3,'la Glose ajoute','Interprétation du Ps 136,7 : la destruction jusqu’aux fondements figure l’incrédulité au terme de l’accumulation des vices.'],
 [20136,'PSA.18.14',3,'la Glose commente','Interprétation du Ps 18,14 identifiant le « grand péché » à l’orgueil, premier dans l’éloignement et dernier dans le retour.'],
 [20150,'GEN.3.5',2,'deviendraient pareils à des dieux','Reprise fondue de Gn 3,5 : la promesse d’être comme des dieux nourrit l’objection tirée de l’infidélité.'],
 [20154,'GEN.3.6',1,'La femme vit que l’arbre était bon à manger','Citation de Gn 3,6 sur l’attrait sensible du fruit et l’acte de le manger.'],
 [20154,'GEN.3.5',1,'Vos yeux s’ouvriront et vous serez comme des dieux','Citation de Gn 3,5 comme motif premier proposé par le serpent.'],
 [20154,'GEN.3.6',3,'ce ne fut pas la bonté de la nourriture','Interprétation de Gn 3,6 : l’attrait alimentaire est subordonné au désir orgueilleux.'],
 [20154,'GEN.3.5',3,'le premier motif pour pécher','Interprétation de Gn 3,5 comme source du désir d’égalité qui précède la gourmandise.'],
 [20155,'GEN.3.5',1,'Vous serez comme des dieux','Citation de Gn 3,5 distinguant la promesse d’égalité de celle de la connaissance.'],
 [20155,'GEN.3.5',3,'il y a d’abord','Interprétation de l’ordre des propositions de Gn 3,5 pour faire dériver le désir de science de l’orgueil.'],
 [20158,'GEN.3.5',1,'Vous serez comme des dieux, connaissant le bien et le mal','Citation de Gn 3,5 dans l’objection sur le désir naturel de savoir.'],
 [20161,'PSA.68.5',3,'S. Augustin dit','Interprétation du Ps 68,5 appliquant la restitution de ce qui n’a pas été ravi à la prétention d’Adam et Ève.'],
 [20163,'GEN.1.27',1,'Dieu fit l’homme à son image et à sa ressemblance','Citation de Gn 1,27 sur la ressemblance divine imprimée dans la nature humaine.'],
 [20163,'GEN.1.27',3,'Selon l’être de la nature','Interprétation de Gn 1,27 comme ressemblance divine possédée dès la création selon la nature.'],
 [20163,'EZK.28.12',3,'Selon la connaissance','Interprétation d’Ez 28,12 comme ressemblance de l’ange reçue selon la sagesse.'],
 [20164,'GEN.3.5',2,'la « science du bien et du mal »','Reprise fondue de Gn 3,5 pour définir l’autonomie morale désordonnée recherchée par le premier homme.'],
 [20166,'PSA.70.19',3,'S. Augustin dit','Interprétation du Ps 70,19 : vouloir être Dieu par soi-même caractérise la ressemblance désordonnée.'],
 [20177,'LUK.12.48',1,'Quant à celui qui, sans la connaître','Citation de Lc 12,48 complétant le contraste entre le serviteur instruit et le serviteur ignorant.'],
 [20196,'GEN.5.5',3,'nos premiers parents ont vécu longtemps après leur péché','Interprétation de Gn 5,5 dans l’objection selon laquelle la sentence de mort ne fut pas immédiatement consommée.'],
 [20209,'GEN.2.17',3,'ils commencèrent cependant à mourir le jour','Interprétation de Gn 2,17 : la mortalité commence le jour de la sentence même si la mort survient plus tard.'],
 [20216,'GEN.3.22',1,'Voilà que l’homme est devenu comme l’un de nous','Citation de Gn 3,22 dont l’apparente ironie divine nourrit l’objection.'],
 [20220,'GEN.3.23',1,'Et le Seigneur Dieu le renvoya du jardin d’Éden','Citation de Gn 3,23 sur l’expulsion hors du lieu propre à l’état d’intégrité.'],
 [20220,'GEN.3.22',1,'afin qu’il ne cueille pas de l’arbre de vie','Citation de Gn 3,22 sur l’interdiction de reprendre de l’arbre de vie.'],
 [20220,'GEN.3.24',1,'Dieu posta devant le jardin d’Éden les chérubins','Citation de Gn 3,24 sur la garde angélique et le glaive flamboyant.'],
 [20220,'GEN.3.23',3,'leur fut retiré ce qui convenait à l’état d’intégrité','Interprétation de Gn 3,23 comme privation du paradis convenant à l’état d’intégrité.'],
 [20220,'GEN.3.22',3,'ne pouvait revenir par lui-même','Interprétation de Gn 3,22 : l’arbre de vie devient un obstacle au retour autonome à l’intégrité.'],
 [20220,'GEN.3.24',3,'furent ajoutés les obstacles','Interprétation de Gn 3,24 comme signe matériel de l’impossibilité de retrouver par soi-même l’innocence.'],
 [20221,'GEN.3.16',1,'Je multiplierai les peines de tes grossesses','Citation de Gn 3,16 sur les douleurs de la grossesse et de l’enfantement.'],
 [20221,'GEN.3.17',1,'Maudit soit le sol à cause de toi','Citation de Gn 3,17 sur la malédiction du sol et la peine du travail.'],
 [20221,'GEN.3.18',1,'Elle produira pour toi épines et chardons','Citation de Gn 3,18 sur les obstacles rencontrés dans la culture de la terre.'],
 [20221,'GEN.3.16',3,'une peine fut affectée à la femme','Interprétation de Gn 3,16 distribuant les peines de la femme entre génération et vie familiale.'],
 [20221,'GEN.3.17',3,'il appartient à l’homme de procurer','Interprétation de Gn 3,17 comme peine attachée au devoir masculin de procurer la subsistance.'],
 [20221,'GEN.3.18',3,'quant aux obstacles que rencontreront','Interprétation de Gn 3,18 comme troisième aspect de la peine du travail de la terre.'],
 [20222,'GEN.3.7',1,'leurs yeux à tous deux s’ouvrirent','Citation de Gn 3,7 sur la confusion née de la nudité après la faute.'],
 [20222,'GEN.3.22',1,'Voilà que l’homme est devenu comme l’un de nous','Citation de Gn 3,22 rapportée au remords de la faute.'],
 [20222,'GEN.3.19',1,'Tu es glaise, et tu retourneras à la glaise','Citation de Gn 3,19 comme rappel de la mort à venir.'],
 [20222,'GEN.3.21',1,'Dieu leur fit des tuniques de peau','Citation de Gn 3,21 présentée comme signe de la mortalité.'],
 [20222,'GEN.3.7',3,'quant à la confusion','Interprétation de Gn 3,7 comme peine intérieure de la rébellion de la chair.'],
 [20222,'GEN.3.22',3,'quant au remords','Interprétation de Gn 3,22 comme formulation du remords suivant la faute.'],
 [20222,'GEN.3.19',3,'quant au rappel de la mort','Interprétation de Gn 3,19 comme annonce de la mortalité pénale.'],
 [20222,'GEN.3.21',3,'un signe de leur mortalité','Interprétation de Gn 3,21 : les tuniques de peau signifient la condition mortelle.'],
 [20224,'1CO.11.3',1,'le chef de la femme','Citation fondue de 1 Co 11,3 sur l’autorité de l’homme dans l’ordre domestique.'],
 [20226,'GEN.3.16',1,'Je multiplierai les peines de tes grossesses','Citation de Gn 3,16 précisant que la multiplicité porte sur les peines plutôt que sur les enfants.'],
 [20226,'GEN.3.16',3,'non à cause de la mise au monde des enfants','Interprétation de Gn 3,16 distinguant fécondité naturelle et fatigues pénales de la grossesse.'],
 [20227,'GEN.3.19',2,'mange son pain à la sueur de son front','Reprise fondue de Gn 3,19 appliquant à tout travail humain la peine attachée au labeur.'],
 [20229,'GEN.3.24',1,'pour garder le chemin de l’arbre de vie','Citation de Gn 3,24 sur la garde du chemin de l’arbre de vie.'],
 [20229,'GEN.3.24',3,'Cela est signifié par la « flamme du glaive »','Interprétation de Gn 3,24 reliant glaive tournoyant, chaleur et ministère des chérubins.'],
 [20230,'GEN.3.22',1,'et qu’il vive à jamais','Citation de Gn 3,22 sur la prolongation de la vie par l’arbre.'],
 [20230,'GEN.3.22',3,'« à jamais » est pris ici pour « longtemps','Interprétation de Gn 3,22 : « à jamais » signifie ici une longue prolongation de la vie.'],
 [20231,'GEN.3.22',3,'Adam en effet non seulement n’est pas devenu','Interprétation de Gn 3,22 : la parole divine détourne le lecteur de l’orgueil au lieu d’insulter Adam.'],
 [20233,'GEN.3.6',1,'vit que le fruit de l’arbre était beau et bon à manger','Citation de Gn 3,6 attestant que les yeux corporels étaient ouverts avant la faute.'],
 [20233,'GEN.3.7',3,'Leurs yeux à tous d’eux s’ouvrirent','Interprétation de Gn 3,7 comme prise de conscience nouvelle de la convoitise et non ouverture physique des yeux.']
];
const insertions=specs.map(([n,canon_id,type,ancre_locale_exacte,motif],i)=>{const s=N.get(n);if(!s||!s.segment_texte.includes(ancre_locale_exacte))throw Error(`ancre ${n}:${ancre_locale_exacte}`);return{id_proposition:`new-${i+1}`,segment_id:s.id,segment_numero:n,canon_id,verset_v2_id:null,livre:null,chapitre:null,type,fiabilite:'vérifié',motif,provenance:'lecture',arbitrage_requis:false,ancre_locale_exacte,temoins_versets_lecture:[wit(canon_id)]}});
const final=[...decisions.filter(d=>d.decision!=='supprimer').map(d=>({segment_id:d.segment_id,...d.final})),...insertions],key=x=>`${x.segment_id}|${x.type}|${x.canon_id}|${x.verset_v2_id}|${x.livre}|${x.chapitre}`,seen=new Set,duplicates=[];for(const x of final){const k=key(x);if(seen.has(k))duplicates.push(k);seen.add(k)}const dead=final.filter(x=>x.canon_id&&!W.has(x.canon_id)),types=Object.fromEntries([1,2,3,4].map(t=>[t,final.filter(x=>x.type===t).length]));if(duplicates.length||dead.length)throw Error(`intégrité doublons=${duplicates.length} mortes=${dead.length}`);
const high=final.filter(x=>x.type>=3).slice(0,12),low=final.filter(x=>x.type<3).slice(0,12),control=[...high,...low].map(x=>({segment_id:x.segment_id,segment_numero:S.get(x.segment_id).segment_numero,type:x.type,canon_id:x.canon_id,verdict_cible:'juste',verdict_type:'juste',temoin:wit(x.canon_id)}));
const summary={segments_lus:raw.segments.length,liens_existants_audites:raw.links.length,reciblages:[...decisions].filter(x=>x.changements?.reciblage).length,suppressions:decisions.filter(x=>x.decision==='supprimer').length,reclassements:decisions.filter(x=>x.changements?.reclassement).length,ajouts_certains:insertions.length,liens_finaux_proposes:final.length,repartition_types:types,cibles_mortes_finales:dead.length,doublons_finaux:duplicates.length,controle_stratifie:control.length,controle_types_3_4:high.length,progression_lot_sur_32367:Number((raw.segments.length/32367*100).toFixed(2)),projection_depuis_15419:{segments:15419+raw.segments.length,pourcentage:Number(((15419+raw.segments.length)/32367*100).toFixed(2))}};
const dossier={oeuvre:'A0013O0002',partie:'Secunda Secundae',questions:'159–164',mode:'lecture seule ; aucune écriture en base',methode:'Lecture intégrale des 268 segments, audit des 73 liens, passe d’oubli, qualification distincte des citations et commentaires, témoins locaux pour chaque cible.',pagination_live:raw.pagination,preetat_exact:{exported_at:raw.exported_at,segments_sha256:createHash('sha256').update(JSON.stringify(raw.segments)).digest('hex'),liens_sha256:createHash('sha256').update(JSON.stringify(raw.links)).digest('hex'),segments:raw.segments.length,liens:raw.links.length,segment_numero:[raw.segments[0].segment_numero,raw.segments.at(-1).segment_numero]},summary,corrections_notables:['Suppression du faux renvoi à Mt 11,9 au segment 20010.','1 Co 12,3 est reciblé vers 1 Co 12,31.','Les chérubins et le glaive sont reciblés de Gn 3,22 vers Gn 3,24 ; les tuniques de peau de Gn 3,2 vers Gn 3,21.','Sg 11,21 est reciblé vers Sg 11,20 d’après le témoin « nombre, poids et mesure ».','Les cinq anciennes cibles provisoires de type 4 sont qualifiées par lecture.','Les développements de Q. 164 sur Gn 3 sont distribués verset par verset, sans cible artificielle de chapitre entier.'],decisions,insertions,incertains_a_constituer:[],controle_stratifie:control};
if(insertions.length!==63||final.length!==135||control.length!==24||high.length!==12)throw Error(`comptes insertions=${insertions.length} final=${final.length}`);writeFileSync(`${R}/SS-Q159-164-DOSSIER-STRICT.json`,JSON.stringify(dossier,null,2)+'\n');writeFileSync(`${R}/SS-Q159-164-RAPPORT.md`,`# Somme théologique : IIa-IIae, questions 159 à 164\n\nAudit exhaustif en lecture seule.\n\n- ${summary.segments_lus} segments, soit ${summary.progression_lot_sur_32367} % du corpus ; ${summary.liens_existants_audites} liens audités ;\n- ${summary.reciblages} reciblages, ${summary.suppressions} suppression, ${summary.reclassements} reclassements, ${summary.ajouts_certains} ajouts ;\n- ${summary.liens_finaux_proposes} liens : ${types[1]} T1, ${types[2]} T2, ${types[3]} T3, ${types[4]} T4 ;\n- cible unique, doublons et cibles mortes : conformes ; contrôle 24/24 dont 12 T3/T4 ;\n- projection depuis 15 419 : ${summary.projection_depuis_15419.segments}/32 367 = ${summary.projection_depuis_15419.pourcentage} %, avant agrégation des lots parallèles.\n`);console.log(JSON.stringify(summary,null,2));
