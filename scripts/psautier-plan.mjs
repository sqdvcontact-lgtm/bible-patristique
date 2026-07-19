// Construit le plan d'alignement du psautier de Sacy, psaume par psaume.
//
// LA RÈGLE, arrêtée avec l'éditeur : SUIVRE CRAMPON pour le rattachement au canon, et dire
// le réel dans la numérotation d'origine.
//   • Le référent compte la suscription comme le VERSET 1. Quand Sacy en porte une et que le
//     référent ouvre bien sur un titre, la suscription prend le créneau 1 et tout le psaume
//     glisse d'un cran.
//   • Quand Sacy porte une suscription que le référent N'A PAS — la Vulgate met en tête un
//     « Alleluia » que l'hébreu ignore —, cette suscription est SURNUMÉRAIRE : le texte
//     n'apparaît nulle part chez le référent, ce qui est la définition retenue. Le corps du
//     psaume s'aligne alors sans décalage.
//   • Sans suscription de part ni d'autre : aucun décalage.
//
// LE COMPTE DES VERSETS NE PEUT PAS SERVIR D'ARBITRE ici. L'accord de contenu entre Sacy
// (Vulgate) et le référent (hébreu) reste faible sur 134 psaumes sur 150 : la poésie diverge
// trop lexicalement, comme dans l'Ecclésiastique. On s'appuie donc sur un signe FORMEL — la
// nature du premier verset du référent, titre ou non —, qui se vérifie à l'œil.
//
//   node scripts/psautier-plan.mjs [--ecrire]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}

const S = JSON.parse(readFileSync(D + 'psa_PSA_transcrit.json', 'utf8'))
const C = new Map((await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','PSA'))).map(r => [r.canon_id, r.texte]))
const canon = new Set((await all(sb.from('versets_canon').select('id').like('id','PSA.%'))).map(r => r.id))
const maxC = {}; for (const id of canon){ const [,c,v] = id.split('.'); maxC[+c] = Math.max(maxC[+c]||0, +v) }

// Un titre se reconnaît à son vocabulaire liturgique, non à sa ressemblance avec Sacy.
// ⚠️ MAIS CELA NE SUFFIT PAS, et c'est la correction du 19/07/2026 : le référent met souvent
// dans son VERSET 1 le titre ET le début du texte — « Psaume de David. À Yahweh est la terre
// et ce qu'elle renferme » (Ps 23). Sacy, lui, les sépare toujours. Trois cas, donc, et non
// deux : titre seul (le corps glisse d'un cran) · titre AVEC du texte (la suscription
// PARTAGE le créneau 1 avec le premier verset, et le corps ne glisse pas) · pas de titre
// (la suscription est surnuméraire). On les distingue en demandant où le premier verset de
// Sacy trouve son écho : dans le verset 1 du référent, ou dans son verset 2.
const estTitre = t => /^(au ma[îi]tre de chant|psaume|cantique|chant|de david|des fils de cor[ée]|d’asaph|pri[èe]re|hymne|pour la fin|louange|alleluia)/i.test((t||'').trim())

// DEUX PSAUMES NE COMMENCENT PAS AU VERSET 1 DANS LE CANON. Le psaume 116 de l'hébreu est
// coupé en deux par la Vulgate, et le canon conserve à la seconde moitié SES NUMÉROS
// D'ORIGINE : PSA 115 court de 10 à 19, et PSA 147 de 12 à 20. Un décalage calculé depuis 1
// les manquerait entièrement.
const DEPART = { 115: 10, 147: 12 }

const sig = t => new Set(((t||'').replace(/<\/?i>/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/f/g,'s').toLowerCase().match(/[a-z]{4,}/g) || []))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.max(a.size,b.size) }

const parCh = {}; for (const v of S) (parCh[v.ch] ??= []).push(v)
const SEULEMENT_JUSTES = !process.argv.includes("--tout")
const plan = [], justes = [], ecarts = [], parPsaume = {}
for (let c = 1; c <= 150; c++){
  const vs = (parCh[c] || []).sort((a,b) => a.v - b.v)
  const susc = vs.find(v => v.v === 0)
  const titreRef = estTitre(C.get(`PSA.${c}.1`))
  const base = DEPART[c] ?? 1
  // Où le premier verset de Sacy trouve-t-il son écho — dans le v.1 du référent, ou son v.2 ?
  const p1 = vs.find(v => v.v > 0)
  const dansV1 = p1 ? jac(sig(p1.texte), sig(C.get(`PSA.${c}.${base}`))) : 0
  const dansV2 = p1 ? jac(sig(p1.texte), sig(C.get(`PSA.${c}.${base + 1}`))) : 0
  // Titre SEUL chez le référent : le corps glisse d'un cran. Titre AVEC du texte : la
  // suscription partage le créneau et le corps ne glisse pas.
  const titreSeul = titreRef && dansV2 > dansV1
  const decalage = (titreSeul ? 1 : 0) + (base - 1)
  const suscSurnum = Boolean(susc) && !titreRef

  const emis = []
  if (susc) emis.push({ ch: c, v: 0, canon_id: suscSurnum ? null : `PSA.${c}.${base}` })
  for (const v of vs.filter(x => x.v > 0)){
    const cible = `PSA.${c}.${v.v + decalage}`
    emis.push({ ch: c, v: v.v, canon_id: canon.has(cible) ? cible : null })
  }
  parPsaume[c] = emis
  const dernier = Math.max(...vs.filter(v => v.v > 0).map(v => v.v)) + decalage
  const juste = dernier === maxC[c] && !emis.some(e => e.canon_id === null && e.v > 0)
  ;(juste ? justes : ecarts).push(`${c} (${dernier} vs ${maxC[c]})`)
  if (juste || !SEULEMENT_JUSTES) plan.push(...emis)
}
console.log(`plan : ${plan.length} versets · ${plan.filter(p => p.canon_id === null).length} surnuméraires`)
console.log(`psaumes dont le dernier verset tombe juste : ${justes.length} / 150`)
console.log(`psaumes en écart, à trancher un par un     : ${ecarts.length}`)
console.log('  ' + ecarts.join(' · '))
if (process.argv.includes('--ecrire')){
  writeFileSync(D + 'psa_PSA_plan.json', JSON.stringify(plan, null, 1))
  console.log('\nplan écrit : psa_PSA_plan.json')
}
