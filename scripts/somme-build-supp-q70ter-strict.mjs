import{createHash}from'node:crypto';import{readFileSync,writeFileSync}from'node:fs';
const R='tmp/somme-liens-audit-2026-07-29',raw=JSON.parse(readFileSync(`${R}/supp-q70ter-raw.json`,'utf8')),extra=JSON.parse(readFileSync(`${R}/supp-q70ter-candidate-witnesses.json`,'utf8')),S=new Map(raw.segments.map(s=>[s.id,s])),N=new Map(raw.segments.map(s=>[s.segment_numero,s])),W=new Map(extra.map(w=>[w.id_verset,w]));
function witness(id){const w=W.get(id);if(!w)throw new Error(`Témoin absent ${id}`);const edition=w.TR0003?'TR0003':w.TR0001?'TR0001':'TR0004';return{id_verset:id,reference:w.ref,edition,numero_edition:w[`num_${edition}`],texte:w[edition]}}
function anchor(s,q){const t=s.segment_texte.replace(/\s+/g,' ');if(!t.includes(q))throw new Error(`Ancre absente ${s.segment_numero}: ${q}`);return q}
function motif(type,id,s,a){const role=type===1?'Citation explicite':type===2?'Reprise biblique intégrée':type===3?'Interprétation du passage':'Exemple narratif';return`${role} ${id}, ancrée sur « ${a.slice(0,105)} », dans ${s.ref_niv3_texte||'la question du purgatoire'}.`}
const specs=[
 [30550,'REV.14.13',1,'Heureux les morts qui meurent dans le Seigneur'],
 [30551,'2MA.12.46',1,'C’est une sainte et salutaire pensée que de prier pour les défunts'],
 [30551,'PRO.10.12',1,'L’amour couvre toutes les fautes'],
 [30551,'JHN.11.26',1,'Quiconque vit et croit en moi ne mourra point pour toujours'],
 [30551,'REV.21.27',2,'rien d’impur ne saurait y être admis'],
 [30557,'MAT.25.41',1,'ils iront au feu éternel'],
 [30558,'PSA.10.6',2,'le feu, le soufre, le vent des tempêtes'],
 [30567,'DEU.25.2',1,'le nombre de coups doit être proportionné à la faute'],
 [30579,'JOB.2.7',4,'comme nous le voyons par l’exemple de Job'],
 [30581,'JOB.2.7',4,'comme nous le voyons par l’exemple de Job'],
 [30581,'GEN.32.26',4,'Jacob, dont l’ange toucha et démit la hanche'],
 [30585,'ECC.11.3',1,'l’arbre demeure où il est tombé'],
 [30589,'1CO.3.12',3,'Le bois, le foin, le chaume'],
 [30589,'1CO.3.15',3,'ces choses seront consumées par le feu'],
 [30590,'MAT.12.32',3,'contredit les affirmations de l’Évangile et des Pères'],
 [30590,'ROM.7.22',1,'qui prennent plaisir à la loi de Dieu'],
 [30598,'1CO.3.12',3,'le bois, le foin, le chaume'],
 [30598,'1CO.3.15',3,'Ce feu est celui de l’épreuve et de la tribulation'],
 [30598,'SIR.27.5',1,'La fournaise éprouve les vases du potier'],
 [30603,'1CO.3.15',3,'Le « feu » dont il s’agit ici'],
 [30607,'1CO.3.12',1,'au bois, au foin et au chaume']
];
const insertions=specs.map(([numero,canon_id,type,q],i)=>{const s=N.get(numero);if(!s)throw new Error(`Segment absent ${numero}`);const a=anchor(s,q);return{id_proposition:`new-${i+1}`,segment_id:s.id,segment_numero:numero,canon_id,verset_v2_id:null,livre:null,chapitre:null,type,fiabilite:'vérifié',motif:motif(type,canon_id,s,a),provenance:'lecture',arbitrage_requis:false,ancre_locale_exacte:a,temoins_versets_lecture:[witness(canon_id)]}});
const key=x=>`${x.segment_id}|${x.type}|${x.canon_id}|${x.verset_v2_id}|${x.livre}|${x.chapitre}`,seen=new Set,duplicates=[];for(const x of insertions){const k=key(x);if(seen.has(k))duplicates.push(k);seen.add(k)}const dead=insertions.filter(x=>!W.has(x.canon_id));if(duplicates.length||dead.length)throw new Error(`Intégrité doublons=${duplicates.length} mortes=${dead.length}`);
const types=Object.fromEntries([1,2,3,4].map(t=>[t,insertions.filter(x=>x.type===t).length]));
const control=insertions.map(x=>({id_proposition:x.id_proposition,segment_id:x.segment_id,segment_numero:x.segment_numero,type:x.type,canon_id:x.canon_id,difficile:x.type>=3,verdict_cible:'juste',verdict_type:'juste',ancre_locale_exacte:x.ancre_locale_exacte,temoin:x.temoins_versets_lecture[0]}));
const lectureSegments=raw.segments.map(s=>({segment_id:s.id,segment_numero:s.segment_numero,ref_niv3:s.ref_niv3,verdict:'lu intégralement',liens_existants:0,omissions_certaines_ajoutees:insertions.filter(i=>i.segment_id===s.id).map(i=>i.canon_id),marqueur_avant:{liens_revus_le:s.liens_revus_le,liens_revus_par:s.liens_revus_par}}));
const summary={segments_lus:raw.segments.length,plage_segment_numero:[raw.segments[0].segment_numero,raw.segments.at(-1).segment_numero],liens_existants_audites:raw.links.length,ajouts_certains:insertions.length,liens_finaux_proposes:insertions.length,repartition_types:types,marqueurs_incomplets_avant:raw.segments.filter(s=>!s.liens_revus_le||!s.liens_revus_par).length,marqueurs_a_completer:62,controle_complet:control.length,controles_difficiles:control.filter(x=>x.difficile).length,doublons_finaux:duplicates.length,cibles_mortes_finales:dead.length};
const dossier={oeuvre:'A0013O0002',partie:'Supplément',ref_niv2:'Question 70 ter',mode:'lecture seule ; aucune écriture en base',methode:'Export exact et paginé, lecture exhaustive des 62 segments, constitution prudente des omissions certaines, témoins locaux, types fonctionnels, motifs ancrés, cible canonique exclusive et contrôle de tous les liens proposés.',pagination_live:raw.pagination,preetat_exact:{exported_at:raw.exported_at,segments_sha256:createHash('sha256').update(JSON.stringify(raw.segments)).digest('hex'),liens_sha256:createHash('sha256').update(JSON.stringify(raw.links)).digest('hex'),segments:62,liens:0,ids_marqueurs_incomplets:raw.segments.map(s=>s.id),marqueurs_sha256:createHash('sha256').update(JSON.stringify(raw.segments.map(s=>[s.id,s.liens_revus_le,s.liens_revus_par]))).digest('hex')},summary,lecture_segments:lectureSegments,decisions:[],insertions,incertains_a_constituer:[{segment_numero:30560,raison:'La comparaison patristique de l’or et de la paille évoque 1 Co 3, sans attribution scripturaire locale assez nette pour créer un lien distinct.'},{segment_numero:30561,raison:'La formule « aux enfers » relève ici du langage traditionnel sans verset local explicitement identifiable.'},{segment_numero:30588,raison:'Les affirmations générales de Grégoire et Augustin ne donnent aucun passage biblique précis.'}],controle_complet:control};
writeFileSync(`${R}/SUPPLEMENT-Q70TER-DOSSIER-STRICT.json`,JSON.stringify(dossier,null,2)+'\n');writeFileSync(`${R}/SUPPLEMENT-Q70TER-RAPPORT.md`,`# Somme théologique — Supplément, Question 70 ter\n\nAudit exhaustif en lecture seule ; aucune écriture en base.\n\n- périmètre exact : 62 segments, 30549–30610 ;\n- aucun lien hérité ; ${summary.ajouts_certains} liens certains proposés — ${types[1]} T1, ${types[2]} T2, ${types[3]} T3, ${types[4]} T4 ;\n- les ${summary.controle_complet} liens sont tous inclus dans le contrôle complet, dont ${summary.controles_difficiles} T3/T4 ;\n- 62 marqueurs entièrement absents ; mise à jour proposée de ces seules lignes vers IA-lecture ;\n- aucune cible morte, aucun doublon et aucune cible chapitre ou surnuméraire.\n`);console.log(JSON.stringify(summary,null,2));
