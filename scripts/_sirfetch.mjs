import { writeFileSync } from 'node:fs'
const r = await fetch('http://jesusmarie.free.fr/bible_crampon_ecclesiastique_siracide.html')
const buf = Buffer.from(await r.arrayBuffer())
let html = new TextDecoder('utf-8').decode(buf)
if(/Ã©|Ã¨/.test(html.slice(0,4000))) html = new TextDecoder('windows-1252').decode(buf)
const t = html.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|h\d|tr|td|li)>/gi,'\n\n')
  .replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&#8217;|&rsquo;|&#39;/g,"'")
  .replace(/&laquo;/g,'«').replace(/&raquo;/g,'»').replace(/&amp;/g,'&').replace(/&\w+;/g,' ')
  .replace(/[ \t]+/g,' ')
const idx=[]; const re=/^ ?Chapitre ([0-9]+) ?$/gm; let m
while((m=re.exec(t))) idx.push([+m[1],m.index,re.lastIndex])
const out={}
for(let i=0;i<idx.length;i++){
  const body=t.slice(idx[i][2], i+1<idx.length?idx[i+1][1]:t.length)
  const parts=[...body.matchAll(/^ ?([0-9]+) ([\s\S]*?)(?=^ ?[0-9]+ |$)/gm)]
  const o={}; for(const p of parts) if(!o[p[1]]) o[p[1]]=p[2].replace(/\s+/g,' ').trim()
  out[idx[i][0]]=o
}
writeFileSync('scripts/_sironline.json', JSON.stringify(out))
for(const c of Object.keys(out).map(Number).sort((a,b)=>a-b)){
  const ks=Object.keys(out[c]).map(Number).sort((a,b)=>a-b)
  const gaps=[]; for(let k=1;k<=Math.max(...ks);k++) if(!ks.includes(k)) gaps.push(k)
  if(gaps.length) console.log(`  ch${c} TROUS ${gaps.join(',')}`)
}
console.log('chapitres', Object.keys(out).length, '| versets', Object.values(out).reduce((s,c)=>s+Object.keys(c).length,0))
