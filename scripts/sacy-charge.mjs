// Charge un livre de Sacy transcrit dans versets_v2 (TR0001).
// Respecte la versification de l'édition dans ch_orig/v_orig ; la rattache au canon par
// une table explicite. Exporte l'état antérieur avant écriture (charte §23.10).
//   node scripts/sacy-charge.mjs EXO exo_ [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { corrigerTypographie } from './typographie.mjs'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const [CODE, PREFIXE] = process.argv.slice(2)
const DRY = process.argv.includes('--dry')
const NB = ' '
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── corrections de lecture communes à TOUS les livres ──
// Dans les lettrines, le « È » accentué est régulièrement lu comme « E » suivi d'une
// apostrophe : « APRE’s » pour « APRÈS ». Vu en Jos 1,1 puis en 2 R 1,1 — assez pour
// en faire une règle générale plutôt qu'une correction par livre.
// Second cas, plus général : une apostrophe mise pour un « l » ou un « i ». Vu en Jos 7,19
// (« fi’s »), 2 R 11,11 (« I’s »), 1 Par 20,4 (« ce’a ») et 21,12 (« mo’s »). Le défaut ne
// se voit à aucun autre contrôle — le mot reste prononçable et la typographie est correcte.
// Le contrôle « apostrophes mises pour une lettre » de audit-traduction.mjs le débusque.
const LECTURES_COMMUNES = [
  [/\bAPRE’s\b/g, 'Après'], [/\bApre’s\b/g, 'Après'],
  [/\bI’s\b/g, 'Ils'],
]

// ── corrections de lecture vérifiées, par livre ──
const LECTURES = {
  EXO: [[/\bqni\b/g,'qui'], [/\bsils\b/g,'fils']],
  // « an Seigneur » (Lv 1,14) : le lexique ne peut pas l'attraper, « an » étant un mot valide.
  LEV: [[/\bpat\b/g,'par'], [/holocauste an Seigneur/g,'holocauste au Seigneur']],
  // DEU : confusions u/n et t/r confirmées par le lexique, plus les lettres manquantes
  // signalées par les transcripteurs (que la permutation ne peut pas détecter).
  DEU: [
    [/\bcetre\b/g,'cette'], [/\bpenple\b/g,'peuple'], [/\bqni\b/g,'qui'], [/\btont\b/g,'tout'],
    [/\bSeigneut\b/g,'Seigneur'], [/\bpete\b/g,'pere'], [/\bDien\b/g,'Dieu'], [/\bparrie\b/g,'partie'],
    [/\baptès\b/g,'après'], [/\bpleuples\b/g,'peuples'], [/\bprohete\b/g,'prophete'],
    [/\bmaintnant\b/g,'maintenant'], [/l’Egyte/g,'l’Egypte'], [/\bajourd’hui\b/g,'aujourd’hui'],
    [/\bsouliés\b/g,'souliers'], [/venez à dite/g,'venez à dire'], [/\bMai comme\b/g,'Mais comme'],
  ],
  // JOS/JDG/RUT : uniquement des erreurs de LECTURE du fac-similé (ſ lu f, n lu u,
  // apostrophe lue l), chacune vérifiée sur son contexte. Les coquilles propres à
  // l'édition (« mont fait », « aux autres homme », « grans ») sont conservées.
  JOS: [
    [/\bmatcher\b/g,'marcher'], [/\bHafersual\b/g,'Hasersual'],
    [/\bMon fi’s\b/g,'Mon fils'], [/\bver Baala\b/g,'vers Baala'],
    [/extermi-\s+neront/g,'extermineront'],      // césure : soudure absente du lexique moderne
  ],
  JDG: [
    [/\bréponditent\b/g,'répondirent'], [/\bSeignenr\b/g,'Seigneur'],
    [/\bvoulureut\b/g,'voulurent'], [/\bSamsom\b/g,'Samson'],
    [/en-\s+fuyoient/g,'enfuyoient'],            // césure : forme de 1730, absente du lexique
  ],
  RUT: [[/\bMoablite\b/g,'Moabite']],
  '1SA': [
    [/\bSeigneut\b/g,'Seigneur'],
    [/\bli-\s+vterez\b/g,'livrerez'],          // césure + confusion t/r
  ],
  // 2SA : confusions de lecture t/r et u/n. « sies » (12,31) est en revanche CONSERVÉ :
  // la même forme reparaît en 1 R 7,9 (« siés »), ce qui en fait une graphie de l'édition
  // pour « scie / scié » et non une erreur de lecture.
  '2SA': [
    [/la victoire fur changée/g, 'la victoire fut changée'],
    [/\bcoucubines\b/g, 'concubines'],
    [/\bexrrêmement\b/g, 'extrêmement'],
  ],
  // 2KI : « ses ser- teurs » — césure de « serviteurs » dont la seconde moitié a été mal
  // lue ; la soudure « serteurs » n'est pas un mot, le contrôle automatique l'a donc
  // signalée sans la souder.
  '2KI': [
    [/\bser-\s+teurs\b/g, 'serviteurs'],
    [/\baugmen-\s+toit\b/g, 'augmentoit'],   // césure : forme de 1730, absente du lexique
  ],
  // 1CH : confusion u/n, et deux apostrophes mises pour une lettre (voir LECTURES_COMMUNES).
  '1CH': [
    [/\bgenerensement\b/g, 'genereusement'],
    [/Après ce’a\b/g, 'Après cela'],
    [/\btrois mo’s\b/g, 'trois mois'],
  ],
}

// ── correspondance édition → canon, par livre (vérifiée sur le fac-similé) ──
// EXO : l'édition suit la Vulgate, le canon suit l'hébreu.
//   Sacy 8,1-4    → canon 7,26-29      (frontière 7/8 décalée)
//   Sacy 8,5-32   → canon 8,1-28
//   Sacy 22,1     → canon 21,37        (frontière 21/22 décalée)
//   Sacy 22,2-31  → canon 22,1-30
//   Sacy 40,13    → canon 40,13-15     (l'édition condense trois versets en un)
//   Sacy 40,14-36 → canon 40,16-38
const MAP = {
  EXO: v => {
    if (v.ch === 8)  return v.v <= 4 ? `EXO.7.${v.v + 25}` : `EXO.8.${v.v - 4}`
    if (v.ch === 22) return v.v === 1 ? 'EXO.21.37' : `EXO.22.${v.v - 1}`
    if (v.ch === 40 && v.v >= 14) return `EXO.40.${v.v + 2}`
    return `${CODE}.${v.ch}.${v.v}`
  },
}
// LEV : ici c'est l'inverse de l'Exode — l'édition suit l'hébreu, le canon la Vulgate.
//   Sacy 6,1-7   → canon 5,20-26     (19+30 = 26+23 = 49 : les totaux concordent)
//   Sacy 6,8-30  → canon 6,1-23
//   Sacy 26,45   → canon 26,45-46    (l'édition fusionne les deux derniers versets)
MAP.LEV = v => {
  if (v.ch === 6) return v.v <= 7 ? `LEV.5.${v.v + 19}` : `LEV.6.${v.v - 7}`
  return `LEV.${v.ch}.${v.v}`
}

// NUM : l'édition suit l'hébreu, le canon la Vulgate. Deux frontières établies avec
// certitude ; cinq chapitres restent à trancher sur le fac-similé (voir DOUTEUX).
//   Sacy 13,1      → canon 12,16   (alignement de contenu à 0,86)
//   Sacy 13,2-34   → canon 13,1-33
//   Sacy 16,36-50  → canon 17,1-15 (50+13 = 35+28 : les totaux concordent)
//   Sacy 17,1-13   → canon 17,16-28
MAP.NUM = v => {
  if (v.ch === 13) return v.v === 1 ? 'NUM.12.16' : `NUM.13.${v.v - 1}`
  if (v.ch === 16 && v.v >= 36) return `NUM.17.${v.v - 35}`
  if (v.ch === 17) return `NUM.17.${v.v + 15}`
  return `NUM.${v.ch}.${v.v}`
}
// Résolu le 18/07/2026 : le test de rupture (sacy-fusion-point.mjs) a montré un alignement
// 1:1 sur toute la longueur de ces chapitres — seul le DERNIER verset du canon est sans
// équivalent. Vérifié sur le fac-similé p.172 pour Nb 11 : le v.34 de l'édition absorbe
// bien le v.35 du canon (« ils vinrent à Haseroth, où ils demeurerent »).
//   Nb 23 : le v.15 n'est pas imprimé (saut de numérotation de l'édition)
//   Nb 25 : le v.19 du canon est un fragment que la Vulgate rattache au chapitre suivant
//   Nb 26 : le v.66 du canon est vide — rien à aligner
//   Nb 20 : l'édition a un verset de PLUS (20,30), sans slot canon
// DEU : l'édition suit l'hébreu, le canon la Vulgate. Trois frontières décalées, chacune
// vérifiée par le contrôle arithmétique (les totaux de chaque paire de chapitres coïncident).
//   Sacy 12,32 → canon 13,1   · Sacy 13,v → canon 13,v+1   (32+18 = 31+19 = 50)
//   Sacy 22,30 → canon 23,1   · Sacy 23,v → canon 23,v+1   (30+25 = 29+26 = 55)
//   Sacy 29,1  → canon 28,69  · Sacy 29,v → canon 29,v-1   (68+29 = 69+28 = 97)
MAP.DEU = v => {
  if (v.ch === 12 && v.v === 32) return 'DEU.13.1'
  if (v.ch === 13) return `DEU.13.${v.v + 1}`
  if (v.ch === 22 && v.v === 30) return 'DEU.23.1'
  if (v.ch === 23) return `DEU.23.${v.v + 1}`
  if (v.ch === 29) return v.v === 1 ? 'DEU.28.69' : `DEU.29.${v.v - 1}`
  return `DEU.${v.ch}.${v.v}`
}

// JOS : l'édition SCINDE deux versets que le canon garde entiers — cas inverse des livres
// précédents. Deux versets de l'édition partagent alors un seul créneau du canon ; ils y
// sont rangés par ordre_slot, et la Polyglotte les affiche à la suite.
//   Sacy 2,23     → canon 2,23-24   (l'édition fusionne, comme ailleurs)
//   Sacy 4,23+24  → canon 4,23      · Sacy 4,v≥25 → canon 4,v-1
//   Sacy 5,14+15  → canon 5,14      · Sacy 5,16   → canon 5,15
// Jos 21 : l'édition a 43 versets, le canon 45 — mais les créneaux 44 et 45 sont VIDES
// dans la Crampon. L'alignement est donc 1:1 sur toute la longueur, sans rien à décaler.
MAP.JOS = v => {
  if (v.ch === 4) return v.v <= 23 ? 'JOS.4.' + v.v : (v.v === 24 ? 'JOS.4.23' : `JOS.4.${v.v - 1}`)
  if (v.ch === 5) return v.v <= 14 ? 'JOS.5.' + v.v : (v.v === 15 ? 'JOS.5.14' : `JOS.5.${v.v - 1}`)
  return `JOS.${v.ch}.${v.v}`
}

// 1SA : une seule frontière décalée, au passage du ch. 20 au ch. 21. L'édition suit la
// Vulgate (dernier verset de l'entrevue de David et Jonathas rattaché au ch. 20), le canon
// suit l'hébreu (il ouvre le ch. 21). Contrôle arithmétique : 43 + 15 = 42 + 16 = 58.
//   Sacy 20,43 → canon 21,1   ·   Sacy 21,v → canon 21,v+1
// Vérifié mot pour mot : Sacy 20,43 « David en même-tems se retira, & Jonathas rentra dans
// la ville » = Crampon 21,1 ; Sacy 21,1 « David alla à Nobé » = Crampon 21,2.
MAP['1SA'] = v => {
  if (v.ch === 20 && v.v === 43) return '1SA.21.1'
  if (v.ch === 21) return `1SA.21.${v.v + 1}`
  return `1SA.${v.ch}.${v.v}`
}

// 2SA : frontière 18/19 décalée. L'édition suit la Vulgate, qui rattache au ch. 18 le
// verset où David monte pleurer Absalon ; le canon suit l'hébreu, qui en ouvre le ch. 19.
// Contrôle arithmétique : 33 + 43 = 32 + 44 = 76.
//   Sacy 18,33 → canon 19,1   ·   Sacy 19,v → canon 19,v+1
// Vérifié : Sacy 18,33 « Le roi étant donc saisi de douleur, monta à la chambre » = Crampon
// 19,1 ; Sacy 19,43 = Crampon 19,44.
MAP['2SA'] = v => {
  if (v.ch === 18 && v.v === 33) return '2SA.19.1'
  if (v.ch === 19) return `2SA.19.${v.v + 1}`
  return `2SA.${v.ch}.${v.v}`
}

// 1KI : frontière 4/5 décalée, et de quatorze versets. L'édition suit la Vulgate (ch. 4 de
// 34 versets), le canon suit l'hébreu (ch. 4 de 20 versets, le reste ouvrant le ch. 5).
// Contrôle arithmétique : 34 + 18 = 20 + 32 = 52.
//   Sacy 4,21-34 → canon 5,1-14    ·   Sacy 5,v → canon 5,v+14
// Vérifié : Sacy 4,21 « Salomon avoit sous sa domination tous les royaumes » = Crampon 5,1 ;
// Sacy 4,34 = Crampon 5,14 ; Sacy 5,1 « Hiram roi de Tyr envoya » = Crampon 5,15.
MAP['1KI'] = v => {
  if (v.ch === 4 && v.v >= 21) return `1KI.5.${v.v - 20}`
  if (v.ch === 5) return `1KI.5.${v.v + 14}`
  return `1KI.${v.ch}.${v.v}`
}

// 2KI : frontière 11/12 décalée. L'édition suit la Vulgate, qui clôt le ch. 11 sur l'âge
// de Joas ; le canon suit l'hébreu, qui en ouvre le ch. 12.
// Contrôle arithmétique : 21 + 21 = 20 + 22 = 42.
//   Sacy 11,21 → canon 12,1   ·   Sacy 12,v → canon 12,v+1
// Vérifié : Sacy 11,21 « Joas avoit sept ans lorsqu'il commença à regner » = Crampon 12,1.
MAP['2KI'] = v => {
  if (v.ch === 11 && v.v === 21) return '2KI.12.1'
  if (v.ch === 12) return `2KI.12.${v.v + 1}`
  return `2KI.${v.ch}.${v.v}`
}

// 1CH : frontière 5/6 décalée de quinze versets. La Vulgate ouvre son ch. 6 sur la
// généalogie de Lévi, que l'hébreu rattache encore au ch. 5 ; le canon suit l'hébreu.
// Contrôle arithmétique : 26 + 81 = 41 + 66 = 107.
//   Sacy 6,1-15  → canon 5,27-41    ·   Sacy 6,16-81 → canon 6,1-66
// Vérifié : Sacy 6,1 « Les fils de Levi furent Gerson, Caath & Merari » = Crampon 5,27 ;
// Sacy 6,15 « Josedec sortit du païs » = Crampon 5,41 ; Sacy 6,16 = Crampon 6,1.
// ⚠️ L'édition répète bel et bien la liste des fils de Lévi en 6,1 et en 6,16 : ce n'est
// pas un doublon de transcription, la Vulgate porte les deux.
MAP['1CH'] = v => {
  if (v.ch === 6) return v.v <= 15 ? `1CH.5.${v.v + 26}` : `1CH.6.${v.v - 15}`
  return `1CH.${v.ch}.${v.v}`
}

// 2CH : deux frontières décalées, toutes deux d'un verset. La Vulgate rattache au chapitre
// SUIVANT le verset que l'hébreu clôt le chapitre précédent ; le canon suit l'hébreu.
// Contrôles arithmétiques : 17 + 18 = 18 + 17 = 35   et   22 + 15 = 23 + 14 = 37.
//   Sacy 2,1  → canon 1,18   ·   Sacy 2,v≥2  → canon 2,v-1
//   Sacy 14,1 → canon 13,23  ·   Sacy 14,v≥2 → canon 14,v-1
// Vérifié : Sacy 2,1 « Salomon resolut donc de bâtir un temple » = Crampon 1,18 ;
// Sacy 14,1 « Abia s'endormit avec ses peres » = Crampon 13,23 ; Sacy 14,2 = Crampon 14,1.
MAP['2CH'] = v => {
  if (v.ch === 2)  return v.v === 1 ? '2CH.1.18'  : `2CH.2.${v.v - 1}`
  if (v.ch === 14) return v.v === 1 ? '2CH.13.23' : `2CH.14.${v.v - 1}`
  return `2CH.${v.ch}.${v.v}`
}

const DOUTEUX = {}

const COUVRE_DEUX = {
  EXO: { '40.13': 'EXO.40.15' },
  LEV: { '26.45': 'LEV.26.46' },
  NUM: { '11.34': 'NUM.11.35' },
  JOS: { '2.23': 'JOS.2.24' },
  // Sacy 1 Par. 20,7 porte à lui seul les v. 7 et 8 du canon : « … Jonathan le tua. Ce
  // sont-là les enfans des geans qui se trouverent à Geth, & qui furent tués par David. »
  '1CH': { '20.7': '1CH.20.8' },
}

let versets = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))

// Normaliser l'apostrophe AVANT d'appliquer les corrections de lecture. Sans cela, tout
// motif écrit avec l'apostrophe courbe (« Mon fi’s », « ajourd’hui ») ne rencontre jamais
// le texte, qui porte encore l'apostrophe droite du transcripteur — la correction échoue
// alors en silence. Quatre corrections ont été perdues ainsi avant d'être repérées.
for (const v of versets) v.texte = (v.texte || '').replace(/'/g, '’')

let corr = 0
const REGLES = [...LECTURES_COMMUNES, ...(LECTURES[CODE] || [])]
// On ne signale « sans effet » que les règles PROPRES au livre : les règles communes ne
// s'appliquent évidemment pas partout, c'est leur raison d'être.
const inutiles = new Set((LECTURES[CODE] || []).map(([re]) => String(re)))
for (const v of versets) for (const [re, bon] of REGLES){
  const n = v.texte.replace(re, bon); if (n !== v.texte){ corr++; inutiles.delete(String(re)); v.texte = n }
}
if (inutiles.size) console.log(`  ⚠ corrections de lecture sans effet (motif introuvable) : ${[...inutiles].join(' ')}`)

// Passe typographique française — mutualisée avec scripts/typographie.mjs pour qu'aucun
// livre n'y échappe. NE PAS réécrire ici : une constante d'espace insécable saisie en
// littéral s'était révélée être une espace ordinaire, laissant 431 « ; » mal espacés.
const typo = corrigerTypographie

const canon = new Set((await all(sb.from('versets_canon').select('id').like('id', CODE + '.%').order('id'))).map(r => r.id))
const versCanon = MAP[CODE] || (v => `${CODE}.${v.ch}.${v.v}`)
const deux = COUVRE_DEUX[CODE] || {}

const lignes = [], hors = []
for (const v of versets){
  const cid = versCanon(v)
  if (!canon.has(cid)){ hors.push(`${v.ch},${v.v}→${cid}`); continue }
  const fin = deux[`${v.ch}.${v.v}`] ?? null
  lignes.push({ trad_id:'TR0001', livre:CODE, ch_orig:v.ch, v_orig:v.v,
    texte: typo(v.texte), canon_id: cid, canon_id_fin: fin, est_suscription:false,
    notes: fin ? 'Verset unique dans l’édition de 1730, couvrant plusieurs versets du canon.'
      : (DOUTEUX[CODE]?.has(v.ch) ? 'Correspondance au canon à vérifier : ce chapitre compte un verset de moins que la Vulgate, la fusion n’a pas été localisée.' : null),
    alignement_verifie: !DOUTEUX[CODE]?.has(v.ch) })
}
// Plusieurs versets de l'édition peuvent partager un créneau du canon (l'édition scinde là
// où le canon garde un seul verset). NE PAS les dédoublonner : on perdrait du texte. On les
// range par ordre_slot, dans l'ordre de l'édition — la Polyglotte les affiche à la suite.
const parSlot = new Map()
for (const l of lignes) (parSlot.get(l.canon_id) ?? parSlot.set(l.canon_id, []).get(l.canon_id)).push(l)
const finales = []
for (const [, groupe] of parSlot){
  groupe.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig)
  groupe.forEach((l, i) => {
    l.ordre_slot = groupe.length > 1 ? i + 1 : null
    if (groupe.length > 1)
      l.notes = `Verset scindé par l’édition de 1730 : partie ${i + 1} sur ${groupe.length} du verset du canon.`
    finales.push(l)
  })
}
const scindes = [...parSlot.values()].filter(g => g.length > 1)

console.log(`${DRY?'[DRY] ':''}${CODE} — ${finales.length} versets`)
console.log(`  corrections de lecture : ${corr}`)
console.log(`  couvrant plusieurs versets du canon : ${finales.filter(l=>l.canon_id_fin).length}`)
console.log(`  créneaux du canon partagés (versets scindés) : ${scindes.length}` +
  (scindes.length ? '  → ' + scindes.map(g=>g[0].canon_id+' ← '+g.map(l=>l.ch_orig+','+l.v_orig).join(' + ')).join(' · ') : ''))
console.log(`  alignement à vérifier : ${finales.filter(l=>!l.alignement_verifie).length}`)
console.log(`  avec italiques : ${finales.filter(l=>/<i>/.test(l.texte)).length}`)
if (hors.length) console.log(`  ⚠ hors canon, écartés : ${hors.join(' ')}`)

if (!DRY){
  // §23.10 — sauvegarde de l'état antérieur avant écriture
  const avant = await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0001').like('canon_id', CODE+'.%'))
  const f = D + `avant_${CODE}_${new Date().toISOString().slice(0,10)}.json`
  writeFileSync(f, JSON.stringify(avant, null, 1))
  console.log(`  état antérieur sauvegardé : ${avant.length} lignes → ${f.split('/').pop()}`)

  await sb.from('versets_v2').delete().eq('trad_id','TR0001').like('canon_id', CODE+'.%')
  let n = 0
  for (let i=0;i<finales.length;i+=500){
    const { error } = await sb.from('versets_v2').insert(finales.slice(i,i+500))
    if (error){ console.error('ERR ' + error.message); break }
    n += finales.slice(i,i+500).length
  }
  console.log('inséré : ' + n)
}
