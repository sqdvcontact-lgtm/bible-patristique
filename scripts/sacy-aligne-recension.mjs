// Aligne un livre dont l'édition porte PLUS de texte que le référent (Tobie, Judith :
// la Vulgate de Jérôme traduit un original différent du grec suivi par la Crampon).
//   node scripts/sacy-aligne-recension.mjs TOB esd_ [--seuil 0.30]
//
// Principe : l'appariement se fait PAR NUMÉRO DE VERSET, jamais par rang. Le verset n de
// l'édition va au verset n du canon ; s'il n'existe pas chez le référent, il devient
// surnuméraire (canon_id nul). La numérotation de l'édition reste portée par ch_orig/v_orig.
//
// ⚠️ NE PAS apparier par position. Essayé d'abord, et faux : l'édition saute parfois un
// numéro (Judith 6 n'a pas de v.3). L'appariement positionnel décalait alors TOUT le reste
// du chapitre — 18 versets faussement assignés dans ce seul chapitre, avec l'apparence
// trompeuse d'un « réordonnancement » du texte. Par numéro, tout retombe juste.
//
// ⚠️ On ne se fie PAS non plus à la moyenne du chapitre : un chapitre peut bien s'aligner
// en moyenne et contenir une paire fausse. Chaque paire est mesurée, et toute paire faible
// est signalée pour examen — l'alignement n'est jamais appliqué en aveugle.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all = async q => { const o=[]; let f=0; while(true){ const {data,error}=await q.range(f,f+999); if(error)throw error; o.push(...data); if(data.length<1000)break; f+=1000 } return o }

const [CODE, PREFIXE] = process.argv.slice(2)
const iS = process.argv.indexOf('--seuil')
const SEUIL = iS > 0 ? Number(process.argv[iS + 1]) : 0.30
const REFERENT = 'TR0003'

const sig = t => new Set(((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/f/g,'s')
  .toLowerCase().match(/[a-z]{4,}/g) || []))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.min(a.size,b.size) }

// ── référent : uniquement les versets NON VIDES, dans l'ordre ──
const R = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id',REFERENT).eq('livre',CODE).order('canon_id'))
// Indexé par « chapitre.verset » : c'est le NUMÉRO qui fait la correspondance.
const ref = new Map()
for (const r of R){
  if (!(r.texte||'').trim()) continue
  const [, c, v] = r.canon_id.split('.')
  ref.set(`${+c}.${+v}`, { t: r.texte, id: r.canon_id })
}

// ── édition ──
const S = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))
const par = {}
for (const v of S) (par[v.ch] = par[v.ch] || []).push(v)
for (const c in par) par[c].sort((a,b) => a.v - b.v)

const plan = [], faibles = [], surnumeraires = []
let apparies = 0, somme = 0

for (const c of Object.keys(par).map(Number).sort((a,b)=>a-b)){
  for (const s of par[c]){
    const cible = ref.get(`${s.ch}.${s.v}`)
    if (cible){
      const score = jac(sig(s.texte), sig(cible.t))
      plan.push({ ch: s.ch, v: s.v, canon_id: cible.id, score })
      apparies++; somme += score
      if (score < SEUIL) faibles.push({ ch: s.ch, v: s.v, canon: cible.id, score,
        sacy: s.texte.replace(/<\/?i>/g,''), ref: cible.t })
    } else {
      plan.push({ ch: s.ch, v: s.v, canon_id: null, score: null })
      surnumeraires.push(`${c},${s.v}`)
    }
  }
}

console.log(`╔═ ${CODE} — alignement sur recension divergente\n`)
console.log(`  versets de l'édition        : ${S.length}`)
console.log(`  versets du référent (réels) : ${ref.size}`)
console.log(`  appariés 1 à 1              : ${apparies}`)
console.log(`  surnuméraires (canon_id nul): ${surnumeraires.length}`)
console.log(`  accord moyen des paires     : ${(somme/apparies).toFixed(3)}`)
console.log(`\n  ⚠ paires sous le seuil de ${SEUIL} : ${faibles.length}`)
for (const f of faibles.slice(0, 20)){
  console.log(`\n  ── ${CODE} ${f.ch},${f.v} → ${f.canon}   (accord ${f.score.toFixed(2)})`)
  console.log(`     édition : ${f.sacy.slice(0, 120)}`)
  console.log(`     référent: ${f.ref.slice(0, 120)}`)
}
if (faibles.length > 20) console.log(`\n  … et ${faibles.length - 20} autres paires faibles`)
if (surnumeraires.length) console.log(`\n  surnuméraires : ${surnumeraires.join(' ')}`)

writeFileSync(D + `${PREFIXE}${CODE}_plan.json`, JSON.stringify(plan, null, 1))
console.log(`\nécrit : ${PREFIXE}${CODE}_plan.json`)
console.log(faibles.length
  ? '⚠ Examiner les paires faibles AVANT de charger.'
  : '✓ Aucune paire sous le seuil : le plan peut être chargé.')
