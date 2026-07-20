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
// « Vide chez le référent » recouvre DEUX états qu'il ne faut pas confondre : une ligne
// présente mais sans texte, et l'absence pure de ligne — c'est ce second cas que produit un
// remappage, qui saute simplement le créneau. Ne compter que le premier faisait échouer les
// chapitres les mieux corrigés, ce qui est le comble.
const lignesRef = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre', CODE))
const avecLigne = new Set(lignesRef.filter(r => r.canon_id).map(r => r.canon_id))
const videsRef = new Set(lignesRef.filter(r => r.canon_id && !r.texte?.trim()).map(r => r.canon_id))
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
  // LES LECTEURS COMMENTENT LEUR TABLE EN FIN DE LIGNE — « … 34→29 · créneaux 30 et 31 NON
  // COUVERTS (vides chez le référent) ». C'est une bonne habitude : la remarque est là où elle
  // sert. On coupe donc la prose au premier séparateur qui n'appartient pas à la notation.
  // La remarque tombe tantôt APRÈS la table, tantôt avant — « (SIR.20.1 est occupé par Sacy
  // 19,28) · 1→2, 2→3, … ». Prendre le premier fragment revenait alors à lire le commentaire
  // pour la table. On choisit donc le fragment qui RESSEMBLE à une table : il commence par un
  // chiffre et porte une flèche.
  t = t.split(/\s+[·;—]\s+/).find(x => /^\s*\d[\d+]*\s*(?:→|->)/.test(x)) ?? t
  // « … 18→17, [19 vide], 20→18 … » : les lecteurs notent entre crochets les créneaux qu'ils
  // laissent volontairement vides — parce que le référent ne les a pas, et Sacy non plus. Ce
  // n'est pas une correspondance mais une remarque, et le contrôle de couverture sait déjà
  // qu'un créneau vide chez le référent peut rester découvert. On les écarte donc.
  // On retire les remarques entre crochets AVANT de découper sur les virgules : « [1 ← Sacy
  // 19,28] » en contient une, et la découper d'abord laissait deux moitiés illisibles.
  t = t.replace(/\[[^\]]*\]/g, '')
  return t.split(',').filter(seg => seg.trim()).map(seg0 => {
    // On tolère une annotation entre parenthèses et le point final d'une phrase : les
    // lecteurs écrivent des tables lisibles par un humain, non des chaînes machine.
    const seg = seg0.replace(/\s*\([^)]*\)/g, '').replace(/\.\s*$/, '').trim()
    const sn = seg.match(/^([\d+]+)\s*(?:→|->)\s*(?:surnum|aucun|—|-)/i)
    if (sn) return { vs: sn[1].split('+').map(Number), sl: [] }
    // DÉBORDEMENT DE CHAPITRE : « 28→SIR.20.1 ». L'édition fait passer dans le chapitre
    // suivant un verset que le canon y range déjà — Sacy 19,28 EST le SIR 20,1 du référent.
    // Le plan sait l'exprimer depuis toujours, puisqu'il porte un canon_id entier ; c'était
    // le lecteur de tables qui ne savait pas le lire.
    const ext = seg.match(/^([\d+]+)\s*(?:→|->)\s*([A-Z0-9]{3}\.\d+\.\d+)$/)
    if (ext) return { vs: ext[1].split('+').map(Number), sl: [], hors: ext[2] }
    const m = seg.match(/^([\d+]+)\s*(?:→|->)\s*([\d+]+)$/)
    if (!m) throw new Error(`segment illisible : « ${seg0.trim()} »`)
    return { vs: m[1].split('+').map(Number), sl: m[2].split('+').map(Number) }
  })
}

const decrits = new Map()
for (const p of JSON.parse(readFileSync(D + TABLES, 'utf8')).chapitres ?? JSON.parse(readFileSync(D + TABLES, 'utf8')).psaumes ?? [])
  decrits.set(p.ch, p)

// UN CRÉNEAU PEUT ÊTRE COUVERT PAR LE CHAPITRE VOISIN. L'édition fait parfois passer dans le
// chapitre suivant un verset que le canon range déjà là — Sacy 19,28 EST le SIR 20,1. Le
// contrôle de couverture raisonne chapitre par chapitre : sans ce relevé préalable, il
// déclarerait le créneau 20,1 orphelin alors qu'il est rempli, et écarterait tout le chapitre.
const couvertsAilleurs = new Set()
for (const p of JSON.parse(readFileSync(D + TABLES, 'utf8')).chapitres ?? [])
  for (const m of String(p.table || '').matchAll(/(?:→|->)\s*([A-Z0-9]{3}\.\d+\.\d+)/g)) couvertsAilleurs.add(m[1])

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
  // LES CRÉNEAUX NE PROGRESSENT PAS TOUJOURS. J'exigeais une suite croissante — c'était un
  // garde-fou juste pour les psaumes, mais faux pour le Siracide, où la Vulgate TRANSPOSE
  // parfois deux versets (Si 7,9-10 · 9,15-16 · 43,17-18). Les lecteurs ont apparié au
  // contenu et non au rang, ce qui est la bonne lecture. On le signale au lieu d'écarter.
  const vusS = paires.flatMap(x => x.sl)
  const desordre = vusS.filter((n,i) => i && n < vusS[i-1]).length
  if (desordre) signales.push(`ch ${c} — ${desordre} transposition(s) : les créneaux ne progressent pas, appariement au contenu`)

  // UN CRÉNEAU PEUT RESTER DÉCOUVERT S'IL EST VIDE CHEZ LE RÉFÉRENT. Le Siracide en compte
  // 55 : le canon y suit une recension plus longue que Crampon. Exiger une couverture totale
  // ferait échouer vingt chapitres pour une lacune qui n'est pas celle de Sacy.
  const touches = new Set(vusS)
  const manquants = slots[c].filter(n => !touches.has(n))
  const nonExplique = manquants.filter(n => !videsRef.has(`${CODE}.${c}.${n}`) && !couvertsAilleurs.has(`${CODE}.${c}.${n}`) && avecLigne.has(`${CODE}.${c}.${n}`))
  const enTrop = [...touches].filter(n => !slots[c].includes(n))
  if (enTrop.length){ ecartes.push(`ch ${c} : créneaux hors canon ${enTrop.join(',')}`); continue }
  // UNE ÉDITION PEUT SIMPLEMENT NE PAS AVOIR UN VERSET que le canon et le référent portent —
  // Si 22,17 en est le cas : Crampon le rend, Sacy non. J'en faisais un motif de rejet, ce qui
  // revenait à jeter tout un chapitre vérifié pour un verset manquant. On le SIGNALE : le trou
  // reste visible, mais le travail est conservé et le lecteur humain peut trancher.
  if (nonExplique.length) signales.push(`ch ${c} — créneaux ${nonExplique.join(',')} portés par le référent mais non par cette édition : à vérifier`)
  if (manquants.length) signales.push(`ch ${c} — ${manquants.length} créneau(x) laissé(s) vide(s), comme chez le référent`)

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
  for (const { vs, sl, hors } of paires) for (const v of vs)
    plan.push({ ch: c, v, canon_id: hors ?? (sl.length ? `${CODE}.${c}.${sl[0]}` : null) })
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
