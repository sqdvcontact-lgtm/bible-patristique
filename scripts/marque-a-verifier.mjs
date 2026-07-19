// Marque, dans l'Ancien Testament, les versets dont l'alignement ou la lecture REPOSE SUR UN
// JUGEMENT et mérite donc une relecture humaine.
//
// LE CHAMP alignement_verifie NE VOULAIT RIEN DIRE. Le chargeur le mettait à `true` pour les
// 34 173 versets, y compris ceux qu'il venait de couper à l'aveugle sur une ancre de texte.
// Un drapeau toujours levé n'est pas un drapeau. On lui donne ici un sens : `false` = « une
// décision a été prise ici, elle n'a pas été relue ».
//
// CE QUI RESTE À `true` NE SIGNIFIE PAS « vérifié par un humain » : cela signifie « aucun
// facteur de risque connu » — le verset a suivi la correspondance ordinaire, un pour un, sans
// coupe, sans soudure et sans coquille. C'est une absence d'alerte, pas une garantie.
//
// SIX FACTEURS DE RISQUE, tous objectifs — aucun n'est une impression :
//   scission        le verset a été COUPÉ à un point choisi dans le texte
//   créneau partagé plusieurs versets de l'édition sur un même créneau : le point de
//                   jonction est un jugement
//   surnuméraire    on affirme qu'aucun créneau ne correspond — une affirmation négative,
//                   la plus difficile à établir
//   plage           ancien mécanisme canon_id_fin, qui laisse un créneau vide à l'écran
//   coquille        le numéro imprimé a été rétabli ; le rattachement dépend de ce choix
//   lecture         la fusion a signalé un mot douteux, jamais tranché sur l'image
//
//   node scripts/marque-a-verifier.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const NT = new Set(['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL',
  '1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'])

// Les lectures suspectes relevées par la fusion et jamais tranchées : « DAN 7,27 : « royanme » »
const suspects = new Map()
for (const f of readdirSync(D).filter(f => /_suspects\.json$/.test(f))){
  let j; try { j = JSON.parse(readFileSync(D + f, 'utf8')) } catch { continue }
  for (const s of Array.isArray(j) ? j : []){
    const m = String(s).match(/^([A-Z0-9]{3})\s+(\d+),(\d+)\s*:\s*(.*)$/)
    if (m) suspects.set(`${m[1]}.${m[2]}.${m[3]}`, m[4].slice(0, 70))
  }
}

// LES COQUILLES DE L'ANCIEN TESTAMENT N'ONT PAS DE NOTE, et c'est un défaut réel, pas un
// oubli de ce script : elles ont été rétablies AVANT que le chargeur ne sache conserver le
// numéro imprimé (mécanisme introduit avec Luc). Leur v_orig porte donc le numéro CORRIGÉ,
// et rien ne dit plus que la page en imprime un autre — l'inverse de ce qui se fait
// désormais dans le Nouveau Testament. Elles sont signalées ici en attendant que ces livres
// soient rechargés, ce qui leur rendra leur numérotation d'origine.
const COQUILLES_AT_SANS_TRACE = {
  'DAN.5.27': 'imprimé 17', 'OBA.1.6': 'imprimé 9', 'EZK.11.25': 'imprimé 23',
  'BAR.1.18': 'imprimé 28', 'JER.5.4': 'imprimé 3', 'JDT.6.3': 'imprimé 9',
  '1MA.7.26': 'imprimé 29', 'SIR.1.12': 'imprimé 22', 'SIR.6.10': 'imprimé 19',
  'SIR.10.19': 'imprimé 9',
}

const livres = [...new Set((await all(sb.from('versets_canon').select('livre'))).map(r=>r.livre))]
  .filter(l => !NT.has(l))

const rapport = [], aFaux = []
for (const L of livres){
  const V = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,notes,alignement_verifie').eq('trad_id','TR0001').eq('livre', L))
  const parCreneau = {}
  for (const r of V) if (r.canon_id) (parCreneau[r.canon_id] ??= []).push(r)
  for (const r of V){
    const raisons = []
    if (r.v_orig_suffixe) raisons.push('scission')
    if (r.canon_id && parCreneau[r.canon_id].length > 1) raisons.push('créneau partagé')
    if (!r.canon_id) raisons.push('surnuméraire')
    if (r.canon_id_fin) raisons.push('plage')
    // Apostrophe droite OU courbe : la note est écrite par le chargeur avec l'une, et un
    // motif qui n'accepte que l'autre ne trouve rien — en silence. C'est exactement le piège
    // qui avait fait échouer quatre corrections de Jérémie.
    if (/L['’]édition imprime ici le numéro/.test(r.notes || '')) raisons.push('coquille')
    const cq = COQUILLES_AT_SANS_TRACE[r.canon_id]
    if (cq) raisons.push('coquille sans trace : ' + cq)
    const s = suspects.get(`${r.livre}.${r.ch_orig}.${r.v_orig}`)
    if (s) raisons.push('lecture : ' + s)
    if (!raisons.length) continue
    rapport.push({ livre: r.livre, ch: r.ch_orig, v: `${r.v_orig}${r.v_orig_suffixe || ''}`, canon_id: r.canon_id, raisons })
    if (r.alignement_verifie !== false) aFaux.push(r.id)
  }
}

const parRaison = {}
for (const x of rapport) for (const y of x.raisons) { const k = y.split(' :')[0]; parRaison[k] = (parRaison[k]||0)+1 }
const parLivre = {}
for (const x of rapport) parLivre[x.livre] = (parLivre[x.livre]||0)+1

console.log(`${DRY?'[DRY] ':''}ANCIEN TESTAMENT — ${rapport.length} versets à vérifier (${aFaux.length} à basculer)`)
console.log('\npar facteur de risque :')
for (const [k,n] of Object.entries(parRaison).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(18)}${n}`)
console.log('\npar livre (les dix premiers) :')
for (const [k,n] of Object.entries(parLivre).sort((a,b)=>b[1]-a[1]).slice(0,10)) console.log(`  ${k.padEnd(6)}${n}`)

if (!DRY){
  writeFileSync(D + `a_verifier_AT_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(rapport, null, 1))
  for (let i = 0; i < aFaux.length; i += 200){
    const { error } = await sb.from('versets_v2').update({ alignement_verifie: false }).in('id', aFaux.slice(i, i+200))
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log(`\n  ${aFaux.length} versets basculés à « à vérifier » · rapport écrit`)
}
