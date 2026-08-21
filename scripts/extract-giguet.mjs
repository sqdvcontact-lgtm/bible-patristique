// Extraction ROBUSTE de la Septante de Giguet (Wikisource, Poussielgue 1872).
// Parsing par blocs <p> (1 verset = 1 paragraphe « N. … »), détection d'anomalies
// de numérotation. Sauvegarde scripts/giguet.json + scripts/giguet-anomalies.json.
import { writeFileSync } from 'node:fs'
import { get } from 'node:https'

const LIVRES = {
  'Genèse':'GEN','Exode':'EXO','Lévitique':'LEV','Nombres':'NUM','Deutéronome':'DEU',
  'Josué':'JOS','Juges':'JDG','Ruth':'RUT','I_Samuel':'1SA','II_Samuel':'2SA',
  'I_Rois':'1KI','II_Rois':'2KI','I_Chroniques':'1CH','II_Chroniques':'2CH',
  'Esdras':'EZR','Néhémie':'NEH','Tobit':'TOB','Judith':'JDT','Esther':'EST','Job':'JOB',
  'Psaumes':'PSA','Proverbes':'PRO','Ecclésiaste':'ECC','Cantique':'SNG','Sagesse':'WIS',
  'Ecclésiastique':'SIR','Osée':'HOS','Amos':'AMO','Michée':'MIC','Joel':'JOL','Abdias':'OBA',
  'Jonas':'JON','Nahum':'NAM','Habacuc':'HAB','Sophonie':'ZEP','Aggée':'HAG','Malachie':'MAL',
  'Zacharie':'ZEC','Isaïe':'ISA','Jérémie':'JER','Baruch':'BAR','Lamentations':'LAM',
  'Lettre_de_Jérémie':'LJE','Ezéchiel':'EZK','Daniel':'DAN','I_Machabées':'1MA','II_Machabées':'2MA',
}
const ROM = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 }
const roman = s => { let n=0; for(let i=0;i<s.length;i++){const v=ROM[s[i]],w=ROM[s[i+1]]; n+=(w>v?-v:v);} return n }
const fetch = url => new Promise((res,rej)=>get(url,{headers:{'User-Agent':'research-giguet'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej))
const clean = h => h
  .replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g,' ').replace(/<span class="pagenum[\s\S]*?<\/span>/g,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/\.mw-parser-output[^}]*\}/g,' ')   // résidus CSS éventuels
  .replace(/&nbsp;|&#160;/g,' ').replace(/&#8217;|&rsquo;/g,'’')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()

function parseChapitre(chHtml) {
  const blocs = [...chHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m => clean(m[1])).filter(Boolean)
  const versets = [], suscription = []
  let seq = []      // numéros bruts rencontrés (pour détecter anomalies)
  let vuVerset = false
  for (const b of blocs) {
    const m = b.match(/^(\d{1,3})\.\s*([\s\S]*)$/)
    if (m) { vuVerset = true; const num = +m[1]; seq.push(num); versets.push({ v: num, text: m[2].trim() }) }
    else if (!vuVerset) suscription.push(b)   // texte avant le 1er verset = suscription
    else if (versets.length) versets[versets.length-1].text += ' ' + b  // suite d'un verset (débordement de <p>)
  }
  // anomalie : la suite doit être 1,2,3,…,max sans doublon/saut/reset
  const attendu = seq.map((_, i) => i + 1)
  const propre = seq.length > 0 && seq.every((n, i) => n === attendu[i])
  let anomalie = null
  if (!propre && seq.length) {
    const dup = seq.length !== new Set(seq).size
    anomalie = { seq, dup, premier: seq[0], max: Math.max(...seq) }
  }
  return { versets, suscription: suscription.join(' ') || null, propre, anomalie, seqLen: seq.length }
}

async function extraire(page) {
  const html = await fetch(`https://fr.wikisource.org/w/index.php?title=Traduction_de_la_Septante_et_du_Nouveau_Testament/${encodeURIComponent(page)}&action=render`)
  const marq = [...html.matchAll(/(?:CHAPITRE|PSAUME)\s+([IVXLCD]+)\b/g)]
  const chapitres = []
  if (!marq.length) {
    const r = parseChapitre(html); chapitres.push({ ch: 1, ...r })
  } else {
    // Numéro ascendant → chapitre normal. Non ascendant PROCHE (doublon ou écart ≤ 2) =
    // chapitre mal étiqueté dans la source (ex. Job a deux « XXV », le 2e est le ch. 26)
    // → renuméroté en séquence. GRAND saut en arrière = parasite (note/renvoi de bas de
    // page, ex. « CHAPITRE XVII » après le ch. 66) → ignoré.
    let maxCh = 0
    for (let i=0;i<marq.length;i++){
      const num = roman(marq[i][1])
      let ch
      if (num > maxCh) ch = num                 // ascendant normal
      else if (num >= maxCh - 2) ch = maxCh + 1 // mal étiqueté → suite de séquence
      else continue                             // parasite → ignoré
      maxCh = ch
      const deb = marq[i].index + marq[i][0].length
      const fin = i+1<marq.length ? marq[i+1].index : html.length
      chapitres.push({ ch, ...parseChapitre(html.slice(deb, fin)) })
    }
  }
  return chapitres
}

async function main(){
  const data = {}, anomalies = []
  for (const [page, code] of Object.entries(LIVRES)) {
    try {
      const chs = await extraire(page)
      data[code] = chs.map(c => ({ ch: c.ch, suscription: c.suscription, versets: c.versets }))
      const nbV = chs.reduce((s,c)=>s+c.versets.length,0)
      const anos = chs.filter(c=>c.anomalie)
      for (const c of anos) anomalies.push({ code, ch: c.ch, ...c.anomalie })
      process.stdout.write(`  ${code}: ${chs.length}ch ${nbV}v${anos.length?` ⚠ ${anos.length} anomalie(s): ch ${anos.map(c=>c.ch).join(',')}`:' ✓'}\n`)
    } catch(e){ process.stdout.write(`  ${code}: ERREUR ${e.message}\n`); anomalies.push({ code, ch:'-', erreur:e.message }) }
    await new Promise(r=>setTimeout(r,150))
  }
  writeFileSync('scripts/giguet.json', JSON.stringify(data))
  writeFileSync('scripts/giguet-anomalies.json', JSON.stringify(anomalies, null, 1))
  const totV = Object.values(data).reduce((s,chs)=>s+chs.reduce((a,c)=>a+c.versets.length,0),0)
  console.log(`\nTotal : ${Object.keys(data).length} livres, ${totV.toLocaleString('fr')} versets.`)
  console.log(`Anomalies de numérotation : ${anomalies.length} → scripts/giguet-anomalies.json`)
}
main().catch(e=>{console.error(e);process.exit(1)})
