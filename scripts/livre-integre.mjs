// Intègre les tables d'alignement d'un livre quelconque — version générique de
// psautier-integre.mjs, qui ne savait traiter que les psaumes.
//
// LES CHAPITRES SANS ENTRÉE SONT REPRIS UN POUR UN. Un lecteur ne décrit que les chapitres
// en écart ; les autres suivent la correspondance ordinaire. On les complète donc ici, faute
// de quoi la branche « plan » du chargeur les rejetterait comme « absents du plan ».
//
// Les mêmes contrôles que pour le psautier, et pour les mêmes raisons :
//   • chaque verset de l'édition présent une fois — ou deux, mais alors avec un point de
//     coupe déclaré, car il chevauche une frontière ;
//   • les créneaux touchés forment exactement ceux du canon ;
//   • chaque coupe se trouve dans le texte, et une seule fois.
// Un chapitre qui échoue est écarté, jamais rafistolé.
//
//   node scripts/livre-integre.mjs <CODE> <prefixe> <tables.json> [--ecrire]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const [CODE, PREFIXE, TABLES] = process.argv.slice(2)
if (!CODE || !PREFIXE || !TABLES){ console.error('usage : <CODE> <prefixe> <tables.json> [--ecrire]'); process.exit(1) }

const S = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))
const canon = new Set((await all(sb.from('versets_canon').select('id').like('id', CODE+'.%'))).map(r => r.id))
const slots = {}
for (const id of canon){ const [,c,v] = id.split('.'); (slots[+c] ??= []).push(+v) }
for (const k in slots) slots[k].sort((a,b)=>a-b)
const parCh = {}; for (const v of S) (parCh[v.ch] ??= []).push(v)

const apo = s => (s || '').replace(/'/g, '’')
function ancreReelle(texte, ancre){
  const pos = []; let nu = ''
  for (let i = 0; i < texte.length; i++){
    if (texte[i] === '<'){ const j = texte.indexOf('>', i); if (j > 0){ i = j; continue } }
    pos.push(i); nu += texte[i]
  }
  const a = apo(ancre).replace(/<\/?i>/g, '')
  const i0 = nu.indexOf(a)
  if (i0 < 0) return null
  if (nu.indexOf(a, i0 + 1) >= 0) return { ambigu: true }
  return { texte: texte.slice(pos[i0], pos[i0 + a.length - 1] + 1) }
}
function lireTable(t){
  t = t.replace(/\s*\((?:début|debut|fin|1re|2e)[^)]*\)/g, '').replace(/(\d)[a-c](?=\s*(?:[,+]|→|->|$))/g, '$1')
  return t.split(',').map(seg => {
    const sn = seg.trim().match(/^([\d+]+)\s*(?:→|->)\s*(?:surnum|aucun|—|-)/i)
    if (sn) return { vs: sn[1].split('+').map(Number), sl: [] }
    const m = seg.trim().match(/^([\d+]+)\s*(?:→|->)\s*([\d+]+)$/)
    if (!m) throw new Error(`segment illisible : « ${seg.trim()} »`)
    return { vs: m[1].split('+').map(Number), sl: m[2].split('+').map(Number) }
  })
}

const decrits = new Map()
for (const p of JSON.parse(readFileSync(D + TABLES, 'utf8')).chapitres ?? JSON.parse(readFileSync(D + TABLES, 'utf8')).psaumes ?? [])
  decrits.set(p.ch, p)

const plan = [], scissions = [], ecartes = [], signales = []
for (const c of Object.keys(parCh).map(Number).sort((a,b)=>a-b)){
  const p = decrits.get(c)
  if (!p){
    // chapitre non décrit : correspondance ordinaire, un verset pour un créneau
    for (const v of parCh[c]){
      const cible = `${CODE}.${c}.${v.v}`
      plan.push({ ch: c, v: v.v, canon_id: canon.has(cible) ? cible : null })
    }
    continue
  }
  for (const k of ['incertain','reserve','signalement','remarque']) if (p[k]) signales.push(`ch ${c} — ${p[k]}`)
  let paires
  try { paires = lireTable(p.table) } catch (e){ ecartes.push(`ch ${c} : ${e.message}`); continue }

  const vusV = paires.flatMap(x => x.vs)
  const decl = new Set((p.scissions || []).map(s => s.v))
  const doubles = vusV.filter((v,i) => vusV.indexOf(v) !== i)
  if (doubles.some(v => !decl.has(v))){ ecartes.push(`ch ${c} : verset deux fois sans coupe déclarée`); continue }
  const attendu = parCh[c].map(v => v.v).sort((a,b)=>a-b)
  if ([...new Set(vusV)].sort((a,b)=>a-b).join(',') !== attendu.join(',')){
    ecartes.push(`ch ${c} : la table couvre ${[...new Set(vusV)].sort((a,b)=>a-b).join(',')} — l'édition porte ${attendu.join(',')}`); continue }
  const vusS = paires.flatMap(x => x.sl)
  if (vusS.some((n,i) => i && n < vusS[i-1])){ ecartes.push(`ch ${c} : créneaux non croissants`); continue }
  if ([...new Set(vusS)].sort((a,b)=>a-b).join(',') !== slots[c].join(',')){
    ecartes.push(`ch ${c} : créneaux touchés ≠ ceux du canon`); continue }

  const dec = new Map((p.scissions || []).map(s => [s.v, s]))
  const sc = []; let ok = true
  for (const v of new Set(doubles)){
    const touches = paires.filter(x => x.vs.includes(v)).flatMap(x => x.sl)
    const bornes = [Math.min(...touches), Math.max(...touches)]
    paires = paires.map(x => ({ ...x, vs: x.vs.filter(y => y !== v) })).filter(x => x.vs.length)
    const ou = paires.findIndex(x => x.sl[0] > bornes[0])
    paires.splice(ou < 0 ? paires.length : ou, 0, { vs: [v], sl: bornes })
  }
  for (const { vs, sl } of paires){
    if (sl.length <= 1) continue
    if (vs.length !== 1){ ecartes.push(`ch ${c} : ${vs.join('+')}→${sl.join('+')} indécidable`); ok = false; break }
    const d = dec.get(vs[0])
    if (!d?.coupe){ ecartes.push(`ch ${c},${vs[0]} : couvre ${sl.length} créneaux sans coupe`); ok = false; break }
    const r = ancreReelle(apo((parCh[c].find(x => x.v === vs[0]) || {}).texte), d.coupe)
    if (!r){ ecartes.push(`ch ${c},${vs[0]} : coupe introuvable — « ${d.coupe.slice(0,40)} »`); ok = false; break }
    if (r.ambigu){ ecartes.push(`ch ${c},${vs[0]} : coupe AMBIGUË`); ok = false; break }
    sc.push({ ch: c, v: vs[0], coupes: [r.texte], canons: sl.map(n => `${CODE}.${c}.${n}`) })
  }
  if (!ok) continue
  for (const { vs, sl } of paires) for (const v of vs)
    plan.push({ ch: c, v, canon_id: sl.length ? `${CODE}.${c}.${sl[0]}` : null })
  scissions.push(...sc)
}

console.log(`${CODE} — plan ${plan.length} versets (transcrits ${S.length}) · scissions ${scissions.length} · chapitres écartés ${ecartes.length}`)
for (const e of ecartes) console.log('  ✗ ' + e)
for (const s of signales) console.log('  · ' + s.slice(0,150))
if (process.argv.includes('--ecrire')){
  if (plan.length !== S.length){ console.error(`\n${plan.length} entrées pour ${S.length} versets — RIEN N'A ÉTÉ ÉCRIT.`); process.exit(1) }
  writeFileSync(D + `${PREFIXE}${CODE}_plan.json`, JSON.stringify(plan, null, 1))
  writeFileSync(D + `${PREFIXE}${CODE}_scissions.json`, JSON.stringify(scissions, null, 1))
  console.log('  écrit')
}
