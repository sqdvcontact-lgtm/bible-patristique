// Vérification de l'extraction Giguet : fidélité texte + complétude + recoupement LXX Swete.
import { readFileSync } from 'node:fs'
const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const SW = 'C:/Users/quins/OneDrive/Bureau/lxx-swete-master/lxx-swete-master/data'

function chap(code, ch){ return gig[code]?.find(c=>c.ch===ch) }

// ── 1. Fidélité : Genèse 1 (texte connu) ─────────────────────────────────────
console.log('=== 1. FIDÉLITÉ — Genèse 1 (5 premiers v.) ===')
for (const v of chap('GEN',1).versets.slice(0,5)) console.log(`  ${v.v}. ${v.text.slice(0,70)}`)

// ── 2. Complétude d'un chapitre à anomalie : Deut 5 (33 v. attendus) ─────────
console.log('\n=== 2. COMPLÉTUDE — Deut 5 (glitch v.5→"3") ===')
const d5 = chap('DEU',5)
console.log(`  ${d5.versets.length} versets extraits. Numéros: ${d5.versets.map(v=>v.v).join(',')}`)
console.log(`  v.4: ${d5.versets.find(v=>v.v===4)?.text.slice(0,55)}`)
const apres4 = d5.versets[d5.versets.indexOf(d5.versets.find(v=>v.v===4))+1]
console.log(`  suivant (mal numéroté ${apres4?.v}): ${apres4?.text.slice(0,55)}`)
console.log(`  dernier v.${d5.versets[d5.versets.length-1].v}: ${d5.versets[d5.versets.length-1].text.slice(0,55)}`)

// ── 3. Recoupement des comptes vs LXX Swete (Pentateuque) ───────────────────
console.log('\n=== 3. RECOUPEMENT vs LXX Swete (comptes de versets) ===')
const SWMAP = { GEN:'01.Genesis', EXO:'02.Exodus', LEV:'03.Leviticus', NUM:'04.Numeri', DEU:'05.Deuteronomium' }
for (const [code, f] of Object.entries(SWMAP)) {
  const txt = readFileSync(`${SW}/${f}.txt`,'utf8')
  const set = new Set()
  for (const line of txt.split(/\r?\n/)) { const m = line.match(/^\d+\.(\d+)\.(\d+)\s/); if(m) set.add(m[1]+'.'+m[2]) }
  const sw = set.size
  const g = gig[code].reduce((s,c)=>s+c.versets.length,0)
  const ecart = g - sw
  console.log(`  ${code}: Giguet ${g} v. · Swete ${sw} v. · écart ${ecart>=0?'+':''}${ecart} ${Math.abs(ecart)<=Math.max(8,sw*0.02)?'✓ cohérent':'⚠ à examiner'}`)
}

// ── 4. Résidus de balisage éventuels ────────────────────────────────────────
console.log('\n=== 4. RÉSIDUS DE BALISAGE ===')
let html=0, refs=0, ex=[]
for (const [code,chs] of Object.entries(gig)) for (const c of chs) for (const v of c.versets) {
  if (/<[a-z/]/i.test(v.text)) { html++; if(ex.length<3) ex.push(`${code} ${c.ch}:${v.v}`) }
  if (/\[\d+\]|\bModifier\b|\bwikisource\b/i.test(v.text)) refs++
}
console.log(`  balises HTML résiduelles: ${html}${ex.length?' ('+ex.join(', ')+')':''} · résidus wiki: ${refs}`)
