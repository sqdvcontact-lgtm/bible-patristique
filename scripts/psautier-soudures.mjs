// Localise, dans un psaume où Sacy compte UN verset de plus que le canon, l'unique endroit
// où l'édition a divisé ce que le canon garde d'un seul tenant.
//
// LE PROBLÈME EST CONTRAINT, et c'est ce qui le rend traitable là où l'alignement libre
// échouait : l'ordre des versets est préservé, et l'on sait qu'il y a EXACTEMENT une
// soudure. Il ne reste qu'à choisir où. Pour chaque point de coupe possible k, on aligne
// 1:1 avant k, on soude k et k+1, puis on aligne avec un cran d'écart après — et l'on
// compare les scores.
//
// ⚠️ On ne retient une soudure que si sa MARGE sur la deuxième meilleure est nette.
// L'accord de contenu entre Sacy (Vulgate) et le référent (hébreu) est faible dans la
// poésie : un score élevé ne prouve rien, seul un ÉCART entre candidats est un signal.
//
//   node scripts/psautier-soudures.mjs [--marge 0.02]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}
const MARGE = parseFloat(process.argv[process.argv.indexOf('--marge')+1]) || 0.02

const S = JSON.parse(readFileSync(D + 'psa_PSA_transcrit.json', 'utf8'))
const C = new Map((await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','PSA'))).map(r => [r.canon_id, r.texte]))
const canonIds = (await all(sb.from('versets_canon').select('id,ch_canon,v_canon').like('id','PSA.%')))
const slots = {}; for (const r of canonIds) (slots[r.ch_canon] ??= []).push(r.v_canon)
for (const k in slots) slots[k].sort((a,b)=>a-b)

const sig = t => new Set(((t||'').replace(/<\/?i>/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/f/g,'s').toLowerCase().match(/[a-z]{4,}/g) || []))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.max(a.size,b.size) }
const estTitre = t => /^(au ma[îi]tre de chant|psaume|cantique|chant|de david|des fils de cor[ée]|d’asaph|pri[èe]re|hymne|pour la fin|louange|alleluia)/i.test((t||'').trim())

const parCh = {}; for (const v of S) (parCh[v.ch] ??= []).push(v)
const nets = [], douteux = []
for (let c = 1; c <= 150; c++){
  const vs = (parCh[c]||[]).filter(v => v.v > 0).sort((a,b)=>a.v-b.v)
  const susc = (parCh[c]||[]).some(v => v.v === 0)
  const base = slots[c][0]
  const titreRef = estTitre(C.get(`PSA.${c}.${base}`))
  // Même règle à trois branches que psautier-plan.mjs : le référent met souvent le titre ET
  // le début du texte dans son verset 1. Sans cette distinction, l'algorithme croyait devoir
  // souder les versets 1 et 2 du corps dans une dizaine de psaumes — c'était la suscription
  // qui partageait le créneau, non deux versets à réunir.
  const prem = vs[0]
  const dansV1 = prem ? jac(sig(prem.texte), sig(C.get(`PSA.${c}.${base}`))) : 0
  const dansV2 = prem ? jac(sig(prem.texte), sig(C.get(`PSA.${c}.${base + 1}`))) : 0
  const titreSeul = titreRef && dansV2 > dansV1
  const dec = (titreSeul ? 1 : 0) + (base - 1)
  const cible = slots[c].filter(v => v >= base + (titreSeul ? 1 : 0))   // créneaux du corps
  if (vs.length !== cible.length + 1) continue                                          // seulement l'écart de +1

  const T = cible.map(v => sig(C.get(`PSA.${c}.${v}`)))
  const A = vs.map(v => sig(v.texte))
  const brut = vs.map(v => v.texte)
  const scores = []
  for (let k = 0; k < vs.length - 1; k++){
    let som = 0
    for (let i = 0; i < k; i++) som += jac(A[i], T[i])
    som += jac(sig(brut[k] + ' ' + brut[k+1]), T[k])
    for (let i = k + 2; i < vs.length; i++) som += jac(A[i], T[i-1])
    scores.push({ k, s: som / cible.length })
  }
  scores.sort((a,b) => b.s - a.s)
  const [p1, p2] = scores
  const ligne = { c, k: p1.k, v1: vs[p1.k].v, v2: vs[p1.k+1].v, s: p1.s, marge: p1.s - p2.s,
                  cibleV: cible[p1.k], dec }
  ;(ligne.marge >= MARGE ? nets : douteux).push(ligne)
}
console.log(`psaumes à écart de +1 examinés : ${nets.length + douteux.length}`)
console.log(`  soudure NETTE (marge ≥ ${MARGE}) : ${nets.length}`)
console.log(`  trop serré pour trancher seul   : ${douteux.length}\n`)
for (const l of nets.sort((a,b)=>b.marge-a.marge))
  console.log(`  Ps ${String(l.c).padStart(3)} : souder ${l.v1}+${l.v2} → créneau ${l.cibleV}   marge ${l.marge.toFixed(3)}  (score ${l.s.toFixed(2)})`)
console.log('\n  — trop serrés :')
for (const l of douteux) console.log(`  Ps ${String(l.c).padStart(3)} : meilleur candidat ${l.v1}+${l.v2}, marge ${l.marge.toFixed(3)}`)
