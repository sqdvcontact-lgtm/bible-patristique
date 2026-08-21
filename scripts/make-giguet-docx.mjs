// Génère le Word de revue Giguet à partir de l'alignement validé par contenu
// (scripts/giguet-plan.json). Sections : décalages auto-corrigés (à confirmer),
// chapitres à traiter à la main (regroupés + raison), points structurels.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx')

const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))
const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const nomLivre = c => ({GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',JOS:'Josué',JDG:'Juges',RUT:'Ruth','1SA':'1 Samuel','2SA':'2 Samuel','1KI':'1 Rois','2KI':'2 Rois','1CH':'1 Chroniques','2CH':'2 Chroniques',EZR:'Esdras',NEH:'Néhémie',TOB:'Tobie',JDT:'Judith',EST:'Esther',JOB:'Job',PSA:'Psaumes',PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique',WIS:'Sagesse',SIR:'Siracide',HOS:'Osée',AMO:'Amos',MIC:'Michée',JOL:'Joël',OBA:'Abdias',JON:'Jonas',NAM:'Nahum',HAB:'Habacuc',ZEP:'Sophonie',HAG:'Aggée',ZEC:'Zacharie',MAL:'Malachie',ISA:'Isaïe',JER:'Jérémie',BAR:'Baruch',LAM:'Lamentations',LJE:'Lettre de Jérémie',EZK:'Ézéchiel',DAN:'Daniel','1MA':'1 Machabées','2MA':'2 Machabées'}[c]||c)

// tri par livre puis chapitre
const entries = Object.entries(plan).map(([k,p])=>{ const [code,ch]=k.split(' '); return {code,ch:+ch,...p} })
const ORD = Object.keys(gig)
entries.sort((a,b)=> ORD.indexOf(a.code)-ORD.indexOf(b.code) || a.ch-b.ch)
const shifts = entries.filter(e=>e.action==='shift')
const manual = entries.filter(e=>e.action==='manual')

const empties = new Set()   // chapitres vides = bug d'extraction
for (const [code,chs] of Object.entries(gig)) for (const c of chs) if (!c.versets.length) empties.add(`${code} ${c.ch}`)

const K=[]
const P=(t,o={})=>new Paragraph({children:[new TextRun({text:t,...o})],...o.p})
K.push(new Paragraph({text:'Giguet (Septante) — revue d’intégration',heading:HeadingLevel.TITLE}))
K.push(P('Traduction de l’Ancien Testament d’après les Septante, P. Giguet (Poussielgue, 1865-1872), source Wikisource. Alignement sur l’ossature canonique (AELF) validé par comparaison de contenu avec le référent Crampon. Mise à jour du '+new Date().toLocaleDateString('fr')+'.',{italics:true,size:20}))
K.push(P('Bilan : '+entries.filter(e=>e.action==='integrate').length+' chapitres intégrés directement (offset 0, contenu concordant) ; '+shifts.length+' chapitres intégrés avec décalage uniforme auto-détecté (à confirmer) ; '+manual.length+' chapitres à traiter à la main.',{size:20,p:{spacing:{after:200}}}))

// 1. décalages auto-corrigés
K.push(new Paragraph({text:'1. Décalages uniformes auto-corrigés (à confirmer)',heading:HeadingLevel.HEADING_2}))
K.push(P('Le contenu indique un décalage constant entre la numérotation Giguet et le canon (souvent le titre de psaume compté comme v.1 dans la LXX, ou une frontière de chapitre différente). Le décalage a été appliqué automatiquement ; à confirmer par sondage.',{size:20,p:{spacing:{after:120}}}))
let curr=null
for (const e of shifts){ if(e.code!==curr){curr=e.code; K.push(P(nomLivre(e.code),{bold:true,size:22,p:{spacing:{before:100}}}))}
  K.push(P(`— ch. ${e.ch} : décalage ${e.offset>0?'+':''}${e.offset} (concordance ${e.dice}, couverture ${e.cov})`,{size:20,p:{indent:{left:360}}})) }

// 2. à traiter à la main
K.push(new Paragraph({text:'2. Chapitres à traiter à la main',heading:HeadingLevel.HEADING_2,spacing:{before:240}}))
K.push(P('Le contenu ne concorde à aucun décalage simple : remaniement LXX (réordonnancement, versets scindés/fusionnés), recension grecque différente, ou additions/omissions internes. À aligner verset par verset contre le fac-similé.',{size:20,p:{spacing:{after:120}}}))
curr=null
for (const e of manual){ if(e.code!==curr){curr=e.code; K.push(P(nomLivre(e.code),{bold:true,size:22,p:{spacing:{before:100}}}))}
  const vide = empties.has(`${e.code} ${e.ch}`)
  const raison = vide ? 'EXTRACTION VIDE — à ré-extraire (marqueur de chapitre parasite)'
    : e.raison==='nocanon' ? 'pas de chapitre correspondant dans l’ossature (structure canonique différente)'
    : e.dice<0.08 ? 'aucune concordance — remaniement/réordonnancement LXX'
    : 'concordance faible — recension différente ou scission/fusion de versets'
  K.push(P(`— ch. ${e.ch} (${e.nv} v.${e.dice!=null?', concordance '+e.dice:''}) : ${raison}`,{size:20,color:vide?'AA0000':'333333',p:{indent:{left:360}}})) }

// 3. points structurels
K.push(new Paragraph({text:'3. Points structurels à trancher',heading:HeadingLevel.HEADING_2,spacing:{before:240}}))
for (const t of [
  'Suscriptions des Psaumes : le titre (« Psaume de David… ») est capté hors versets numérotés ; décider s’il est stocké comme suscription (canon_id nul) ou ignoré.',
  'Lettre de Jérémie (LJE) : chez Giguet livre séparé (72 v.) ; dans le canon = Baruch 6. À rattacher.',
  'Malachie : Giguet en 4 chapitres (Ml 3,19-24 = ch. 4) ; canon en 3. Fusionner ch. 4 dans ch. 3.',
  'Esther, Daniel : additions grecques (Est 11-16, Dn 3,24-90 / 13-14) ; router additions et aligner le reste.',
  'Jérémie : ordre LXX très différent de l’hébreu (oracles contre les nations déplacés) ; alignement dédié.',
  'Proverbes : la LXX réordonne Pr 24-31 ; ch. 31 Giguet mêle plusieurs sections.',
  'Extraction vide (PSA 14, PRO 7, ISA 17) : bug de découpe par marqueur « CHAPITRE/PSAUME » à corriger dans extract-giguet.mjs.',
  'Psaume 151 (grec, hors canon catholique) : à router en apocryphe, pas dans l’ossature.',
])
  K.push(P('— '+t,{size:20,p:{indent:{left:360}}}))

const doc=new Document({sections:[{properties:{page:{size:{width:12240,height:15840}}},children:K}]})
writeFileSync('C:/Users/quins/OneDrive/Bureau/Giguet - points a verifier.docx', await Packer.toBuffer(doc))
console.log(`Word écrit : ${shifts.length} décalages, ${manual.length} chapitres manuels.`)
