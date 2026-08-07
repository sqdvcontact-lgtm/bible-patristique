// Étape A — aligne les chapitres « manuels » de Giguet par appariement de CONTENU
// au niveau du livre : chaque verset Giguet d'un chapitre manuel cherche son meilleur
// équivalent parmi les slots canon RESTÉS VIDES du livre (Dice ≥ SEUIL), assignation
// gloutonne (chaque slot/verset utilisé une fois). Gère splits internes et réordres
// (Jérémie, Proverbes, Exode 37-39…). Sous le seuil → canon_id null (surnuméraire).
//   node scripts/align-manual.mjs            → tous les livres à chapitres manuels
//   node scripts/align-manual.mjs JER PRO    → livres ciblés
//   node scripts/align-manual.mjs --dry JER  → simulation (n'écrit pas)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
throw new Error('BLOCKED_LEGACY_TR0009: historical Giguet mutator; TR0009 is reserved for Bible française du XIIIe siècle. Migrate this workflow to a distinct validated trad_id.')
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const SAMECH = args.includes('--samech')   // restreint l'appariement au même chapitre (Psautier : psaumes doublons)
const seuls = args.filter(a => !a.startsWith('--'))
const SEUIL = 0.30
const TRAD = 'TR0009'

const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
const nettoie = t => (t||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))

// texte référent Crampon par canon_id
const ref = new Map()
;(await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id'))).forEach(r=>ref.set(r.canon_id,r.texte))

// livres ayant des chapitres manuels
const manuelParLivre = {}
for (const [k,p] of Object.entries(plan)) {
  if (p.action !== 'manual' || p.raison === 'nocanon') continue
  const [code, ch] = k.split(' ')
  ;(manuelParLivre[code] ??= []).push(+ch)
}
// hors étape A : recensions différentes (à décider) + additions grecques (routage dédié)
const EXCLURE = new Set(['TOB','JDT','EST','ESG','DAN','SUS','BEL','S3Y'])
const codes = (seuls.length ? seuls : Object.keys(manuelParLivre).filter(c => !EXCLURE.has(c)))
  .filter(c => manuelParLivre[c])

// libère d'abord les slots des chapitres manuels EN COURS (sinon un re-run se bloque
// lui-même : ses propres mappages précédents apparaîtraient comme « déjà pris »)
if (!DRY) for (const code of codes) for (const ch of manuelParLivre[code])
  await sb.from('versets_v2').delete().eq('trad_id',TRAD).eq('livre',code).eq('ch_orig',ch)

// slots canon déjà occupés par Giguet (hors chapitres manuels en cours, désormais libérés)
const enCours = new Set(codes.flatMap(c => manuelParLivre[c].map(ch => `${c}|${ch}`)))
const dejaPris = new Set()
;(await all(sb.from('versets_v2').select('canon_id,livre,ch_orig').eq('trad_id',TRAD).not('canon_id','is',null).order('id')))
  .forEach(r=>{ if(!enCours.has(`${r.livre}|${r.ch_orig}`)) dejaPris.add(r.canon_id) })

let totMap = 0, totV = 0
for (const code of codes) {
  const chsManuels = new Set(manuelParLivre[code])
  // versets Giguet des chapitres manuels
  const gv = []
  for (const c of gig[code] ?? []) if (chsManuels.has(c.ch))
    for (const v of c.versets) gv.push({ ch: c.ch, label: v.v, text: nettoie(v.text), tok: new Set(norm(v.text)) })
  // slots canon vides du livre (référent existant, non déjà pris par Giguet)
  const cible = []
  for (const [cid, txt] of ref) if (cid.startsWith(code+'.') && !dejaPris.has(cid))
    cible.push({ cid, ch: +cid.split('.')[1], tok: new Set(norm(txt)) })

  // paires au-dessus du seuil, triées décroissant (option : même chapitre uniquement)
  const paires = []
  for (let i=0;i<gv.length;i++) for (let j=0;j<cible.length;j++){
    if (SAMECH && cible[j].ch !== gv[i].ch) continue
    const d = dice(gv[i].tok, cible[j].tok)
    if (d >= SEUIL) paires.push([d, i, j])
  }
  paires.sort((a,b)=>b[0]-a[0])
  const gPris = new Array(gv.length).fill(false), cPris = new Array(cible.length).fill(false)
  const mapCanon = new Array(gv.length).fill(null)
  for (const [d,i,j] of paires){ if(gPris[i]||cPris[j]) continue; gPris[i]=true; cPris[j]=true; mapCanon[i]=cible[j].cid }

  // filtre de cohérence par bloc : un mappage vers un AUTRE chapitre n'est gardé que s'il
  // fait partie d'un bloc (≥2 versets du même ch. d'origine → même ch. canon). Tue les
  // singletons cross-chapitre (faux appariements sur vocabulaire répété : Job, psaumes doublons).
  const compte = {}
  gv.forEach((g,i)=>{ if(!mapCanon[i]) return; const tch=+mapCanon[i].split('.')[1]; if(tch===g.ch) return; (compte[`${g.ch}|${tch}`] ??= 0); compte[`${g.ch}|${tch}`]++ })
  let rejetes = 0
  gv.forEach((g,i)=>{ if(!mapCanon[i]) return; const tch=+mapCanon[i].split('.')[1]; if(tch!==g.ch && compte[`${g.ch}|${tch}`] < 2){ mapCanon[i]=null; rejetes++ } })

  // lignes à insérer (tous les versets des chapitres manuels)
  const rows = gv.map((g,i)=>({ trad_id:TRAD, livre:code, ch_orig:g.ch, v_orig:g.label, texte:g.text,
    canon_id: mapCanon[i], est_suscription:false, alignement_verifie: !!mapCanon[i] }))
  const nMap = rows.filter(r=>r.canon_id).length

  if (!DRY) {
    // (chapitres déjà supprimés en amont) — insertion seule
    for (let i=0;i<rows.length;i+=500){ const {error}=await sb.from('versets_v2').insert(rows.slice(i,i+500)); if(error)throw new Error(`${code}: ${error.message}`) }
    rows.forEach(r=>{ if(r.canon_id) dejaPris.add(r.canon_id) })
  }
  totMap += nMap; totV += rows.length
  console.log(`  ${code}: ${chsManuels.size} ch. manuels · ${rows.length} v. · ${nMap} mappés (${Math.round(100*nMap/rows.length)}%) · ${rows.length-nMap} vides${rejetes?` · ${rejetes} cross-ch. isolés rejetés`:''}`)
}
console.log(`\n${DRY?'[SIMULATION] ':''}Total : ${totV} versets manuels traités, ${totMap} nouvellement mappés au canon.`)
