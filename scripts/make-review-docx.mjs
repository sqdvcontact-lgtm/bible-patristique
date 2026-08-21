import { readFileSync } from 'node:fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx'

const NOMS = {Gn:'Genèse',Ex:'Exode',Lv:'Lévitique',Jg:'Juges',Rt:'Ruth','1 Ch':'1 Chroniques','2 Ch':'2 Chroniques',Ne:'Néhémie',Tb:'Tobie',Jdt:'Judith',Est:'Esther','1 M':'1 Machabées',Ps:'Psaumes',Is:'Isaïe',Jr:'Jérémie',Lm:'Lamentations',Ez:'Ézéchiel',Dn:'Daniel',Os:'Osée',Jl:'Joël',Mi:'Michée',Jon:'Jonas',Za:'Zacharie',Mt:'Matthieu',Mc:'Marc',Lc:'Luc',Ac:'Actes des Apôtres',Rm:'Romains',He:'Hébreux','1 P':'1 Pierre',Ap:'Apocalypse'}
const data = JSON.parse(readFileSync('scripts/review-guillemets.json','utf8'))

// grouper par livre (dans l'ordre du fichier)
const groupes = []
for (const r of data){ const abbr = r.ref.replace(/ \d+, \d+$/,''); let g = groupes.find(x=>x.abbr===abbr); if(!g){ g={abbr, nom: NOMS[abbr]||abbr, items:[]}; groupes.push(g) } g.items.push(r) }

const H = t => new Paragraph({ text:t, heading:HeadingLevel.HEADING_2, spacing:{before:240, after:120} })
const children = [
  new Paragraph({ text:'Crampon — guillemets à vérifier', heading:HeadingLevel.TITLE, alignment:AlignmentType.CENTER }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:240}, children:[ new TextRun({ text:'149 versets · '+groupes.length+' livres', italics:true, color:'666666' }) ] }),
  new Paragraph({ spacing:{after:120}, children:[ new TextRun({ text:'La quasi-totalité de la Bible a reçu les guillemets français « » (niveau 1) et anglais “ ” (niveau 2) par report fidèle de l’édition Crampon 1923 de Wikisource. Les versets ci-dessous n’ont pas pu être appariés à Wikisource (leur texte diffère de cette édition) : leurs guillemets ont été posés automatiquement d’après le contexte local (deux-points → ouverture ; fin de phrase → fermeture). Ils sont à relire.', size:20 }) ] }),
  new Paragraph({ spacing:{after:240}, children:[ new TextRun({ text:'Rappel : le report reproduit fidèlement l’usage de la Crampon 1923, qui laisse volontairement plus de « ouvrants que de » fermants dans les longs discours (le fermant n’est pas répété). Ce n’est pas un déséquilibre à corriger.', size:20, italics:true, color:'666666' }) ] }),
]

for (const g of groupes){
  children.push(H(g.nom+'  ('+g.items.length+')'))
  const rows = g.items.map(it => new TableRow({ children:[
    new TableCell({ width:{size:1400,type:WidthType.DXA}, margins:{top:40,bottom:40,left:80,right:80}, shading:{type:ShadingType.CLEAR, fill:'F2F0EA'}, children:[ new Paragraph({ children:[ new TextRun({ text:it.ref, bold:true, size:18 }) ] }) ] }),
    new TableCell({ width:{size:7600,type:WidthType.DXA}, margins:{top:40,bottom:40,left:80,right:80}, children:[ new Paragraph({ children:[ new TextRun({ text:it.texte, size:20 }) ] }) ] }),
  ] }))
  children.push(new Table({ columnWidths:[1400,7600], width:{size:9000,type:WidthType.DXA}, rows,
    borders:{ top:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, bottom:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, left:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, right:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'}, insideVertical:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'} } }))
}

const doc = new Document({ sections:[{ properties:{ page:{ size:{ width:12240, height:15840 } } }, children }] })
Packer.toBuffer(doc).then(b => { import('node:fs').then(fs=>fs.writeFileSync('scripts/Crampon-guillemets-a-verifier.docx', b)); console.log('docx écrit.') })
