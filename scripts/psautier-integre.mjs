// Intègre les tables d'alignement du psautier relevées par lecture en regard.
//
// ON PART DE LA `table`, PAS DES FIGURES. Chaque psaume est décrit par une correspondance
// complète — « 0→1, 1+2→2, 3→3, 6→6+7, … » — qui dit, pour tous les versets et dans l'ordre,
// quel créneau du canon ils occupent. C'est elle que les lecteurs ont vérifiée du premier au
// dernier verset ; les champs `soudures` / `scissions` n'en sont qu'un résumé, et un résumé
// peut diverger de ce qu'il résume. La table est la source, le reste sert de contrôle.
//
// LA VALIDATION EST LE CŒUR DE CE SCRIPT, parce qu'un compte juste ne prouve rien (Ps 86 et
// 97 : deux soudures et une scission qui se compensent). On exige donc, pour chaque psaume :
//   • chaque verset de Sacy apparaît EXACTEMENT une fois ;
//   • les créneaux couverts forment la suite complète de ceux du canon, sans trou ni doublon ;
//   • toute scission déclarée dans la table a bien un point de coupe, et ce point se trouve
//     dans le texte, une seule fois.
// Un psaume qui échoue n'est pas corrigé : il est écarté et signalé.
//
//   node scripts/psautier-integre.mjs [--ecrire]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}

const S = JSON.parse(readFileSync(D + 'psa_PSA_transcrit.json', 'utf8'))
const canon = new Set((await all(sb.from('versets_canon').select('id').like('id','PSA.%'))).map(r => r.id))
const slots = {}
for (const id of canon){ const [,c,v] = id.split('.'); (slots[+c] ??= []).push(+v) }
for (const k in slots) slots[k].sort((a,b)=>a-b)

const parCh = {}; for (const v of S) (parCh[v.ch] ??= []).push(v)
// Le texte est normalisé en apostrophes courbes au chargement ; les ancres recopiées à la
// main portent parfois l'apostrophe droite. Sans cette normalisation le point de coupe est
// introuvable — signalé, donc sans dégât, mais le psaume serait écarté pour rien.
const apo = s => (s || '').replace(/'/g, '’')

// LES ANCRES SONT RECOPIÉES DEPUIS UN AFFICHAGE QUI DÉPOUILLE LES ITALIQUES. Le lecteur voit
// « jugez-les, mon Dieu. » là où le texte porte « jugez-les, <i>mon</i> Dieu. » : l'ancre est
// juste, mais introuvable telle quelle. Dix psaumes ont buté là-dessus.
// On cherche donc l'ancre dans le texte DÉPOUILLÉ, puis on rend la tranche correspondante du
// texte RÉEL, balises comprises — que le chargeur retrouvera exactement.
function ancreReelle(texte, ancre){
  const pos = []            // pos[i] = index, dans le texte réel, du i-ième caractère nu
  let nu = ''
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

// « 0→1, 1+2→2, 6→6+7 » → [{ vs:[0], sl:[1] }, { vs:[1,2], sl:[2] }, { vs:[6], sl:[6,7] }]
function lireTable(t){
  // Certains lecteurs écrivent la scission sous sa forme explicite — « 0+1(début)→1,
  // 1(fin)→2 » — là où d'autres écrivent « 1→1+2 ». Les deux disent la même chose : le verset
  // couvre deux créneaux. On efface l'annotation, le verset se retrouve nommé deux fois, et
  // le traitement des doublons (qui exige un point de coupe déclaré) fait le reste.
  // Mieux vaut apprendre la notation au lecteur de tables que réécrire les tables à la main :
  // une table réécrite est une lecture que je m'approprie, et l'erreur y devient invisible.
  t = t.replace(/\s*\((?:début|debut|fin|1re|2e)[^)]*\)/g, '')
  // « 6+7a→5, 7b→6 » : troisième notation de la scission, par suffixe de lettre. Le suffixe
  // ne désigne pas un autre verset — on l'efface, le verset se retrouve nommé deux fois, et
  // le contrôle des doublons (qui exige un point de coupe) fait le reste, comme pour
  // « 1(début) » et « 1→1+2 ». Trois notations pour la même chose : les lecteurs écrivent
  // comme ils lisent, et c'est au lecteur de tables de s'adapter, pas à eux.
  t = t.replace(/(\d)[a-c](?=\s*(?:[,+]|→|->|$))/g, '$1')
  return t.split(',').map(seg => {
    // Un verset SANS créneau — surnuméraire — s'écrit « 0→surnuméraire » ou « 0→aucun ».
    // Il faut le distinguer d'un verset absent de la table : le premier est une décision, le
    // second un oubli, et seul le second doit faire échouer le contrôle de couverture.
    const sn = seg.trim().match(/^([\d+]+)\s*(?:→|->)\s*(?:surnum|aucun|—|-)/i)
    if (sn) return { vs: sn[1].split('+').map(Number), sl: [] }
    const m = seg.trim().match(/^([\d+]+)\s*(?:→|->)\s*([\d+]+)$/)
    if (!m) throw new Error(`segment illisible : « ${seg.trim()} »`)
    return { vs: m[1].split('+').map(Number), sl: m[2].split('+').map(Number) }
  })
}

// ── tables refaites à la main ────────────────────────────────────────────────────────────
// Trois psaumes dont la table, telle qu'écrite, ne pouvait pas être lue par la machine. On la
// réécrit sans rien changer à la LECTURE du lecteur — seule la notation est normalisée.
const REFAITES = {
  // Ps 49 n'était PAS dans les lots : il tombait juste avant que je ne corrige le référent.
  // En rendant au titre son créneau propre, j'ai décalé le corps d'un cran — et fait
  // apparaître la soudure qui restait à trouver. C'est donc ma correction qui a produit ce
  // cas ; il serait passé inaperçu si le total n'avait pas cessé de tomber juste.
  // R4 réunit « Il vient, notre Dieu… il ne se taira point » (= S3) et « devant lui est un
  // feu dévorant, autour de lui se déchaîne la tempête » (= S4).
  49: '0→1, 1→2, 2→3, 3+4→4, ' + Array.from({length: 20}, (_, i) => `${i+5}→${i+5}`).join(', '),
  // Ps 138 et 145 : deux psaumes que la règle FORMELLE avait déclarés justes à tort. Ils ne
  // portent pas de suscription séparée — le titre est DANS leur verset 1, qui contient en
  // outre les deux premiers versets du référent. La règle, voyant un titre chez le référent,
  // décalait tout le corps d'un cran et laissait le CRÉNEAU 1 VIDE. Le compte tombait juste ;
  // c'est le contrôle de couverture, et lui seul, qui a montré le trou.
  138: '1→1+2, ' + Array.from({length: 22}, (_, i) => `${i+2}→${i+3}`).join(', '),
  145: '1→1+2, ' + Array.from({length: 8},  (_, i) => `${i+2}→${i+3}`).join(', '),
  // Le lecteur avait noté « [19 = 10]→10 » pour dire que le verset imprimé « 19 » est en
  // réalité le 10. C'est une coquille de numérotation, traitée comme telle : le rattachement
  // suit le 10, et le numéro imprimé restera dans la numérotation d'origine.
  40: '0→1, 1→2, 2→3, 3→4, 4→5, 5→6, 6+7→7, 8→8, 9→9, 19→10, 11→11, 12→12, 13→13, 14→14',
  // « 1→2 (seconde moitié) » : S1 est scindé, sa première moitié partageant le créneau 1 avec
  // la suscription. La coupe était déjà déclarée à part.
  86: '0+1→1, 1→2, 2→3, 3+4→4, 5→5, 6→6, 7→7',
  // Le lecteur a travaillé AVANT que le référent ne soit corrigé : Crampon numérote son titre
  // à part, ce que l'import avait manqué, et le psaume comptait alors 8 créneaux au lieu de 9.
  // Sa lecture reste exacte ; elle glisse simplement d'un cran, la suscription prenant le
  // créneau 1 pour elle seule.
  100: '0→1, 1→2, 2+3→3, 4→4, 5→5, 6+7→6, 8→7, 9→8, 10→9',
  // Ps 117 : le lecteur tenait le v. 28 pour un doublon de transcription à supprimer, et
  // affirmait que l'édition ne répétait pas le verset. LA PAGE DIT LE CONTRAIRE : le
  // fac-similé (p. 754) imprime bien deux fois « Je vous rendrai graces de ce que vous m'avez
  // exaucé, & que vous êtes devenu mon salut. », au v. 20 ET au v. 28. On ne supprime donc
  // rien — c'est un fait de l'édition, non une faute de saisie. Le verset est SURNUMÉRAIRE :
  // son texte existe déjà chez le référent (au créneau 21), il n'y a donc pas de second
  // créneau à lui donner, mais il doit rester visible dans la colonne de Sacy.
  // Une assertion sur le fac-similé se vérifie sur le fac-similé.
  117: '0→surnuméraire, ' + Array.from({length: 15}, (_, i) => `${i+1}→${i+1}`).join(', ') +
       ', 16→15+16, 17→17, 18→18, 19→19+20, 20→21, 21→22, 22→23, 23→24, 24→25+26, 25→26+27,' +
       ' 26→27, 27→28, 28→surnuméraire, 29→29',
}

// Les points de coupe des psaumes que seule la table refaite décrit.
const COUPES = {
  138: [{ v: 1, coupe: 'Vous m’avez connu, soit que je fusse assis' }],
  145: [{ v: 1, coupe: 'je louerai le Seigneur pendant ma vie' }],
}

const plan = [], scissions = [], retenus = [], ecartes = [], signales = []
// Les psaumes des huit lots, plus ceux que seule la table refaite décrit (Ps 49, qui ne
// figurait dans aucun lot puisqu'il tombait juste avant la correction du référent).
const aTraiter = []
// On prend TOUS les lots présents, sans borne écrite en dur : un lot ajouté plus tard serait
// sinon ignoré en silence, et le psaume resterait à son ancien alignement sans que rien ne le
// dise. Les lots tardifs (relectures demandées par l'éditeur) écrasent les premiers.
for (const f of readdirSync(D).filter(f => /^psa_align_LOT\d+\.json$/.test(f))
                             .sort((a,b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))))
  for (const p of JSON.parse(readFileSync(D + f, "utf8")).psaumes){
    const i = aTraiter.findIndex(x => x.ch === p.ch)
    if (i >= 0) aTraiter[i] = p; else aTraiter.push(p)
  }
for (const ch of Object.keys(REFAITES).map(Number))
  if (!aTraiter.some(p => p.ch === ch)) aTraiter.push({ ch, table: REFAITES[ch], scissions: COUPES[ch] || [] })

{
  for (const p of aTraiter){
    const c = p.ch
    const notes = [p.incertain, p.reserve, p.signalement, p.remarque, p.anomalie_source].filter(Boolean)
    if (notes.length) signales.push(`Ps ${c} — ${notes.join(' | ')}`)
    let paires
    try { paires = lireTable(REFAITES[c] ?? p.table) }
    catch (e){ ecartes.push(`Ps ${c} : table illisible — ${e.message}`); continue }

    // ── contrôle 1 : les versets de Sacy, chacun une fois et une seule
    // Un verset de Sacy peut figurer dans DEUX paires — miroir exact du créneau partagé :
    // il chevauche une frontière du référent, sa première moitié closant un créneau et la
    // seconde en ouvrant un autre (Ps 86, Ps 96). Ce n'est recevable que si une coupe est
    // déclarée pour lui : sans coupe, on ne saurait pas où séparer, et le doublon serait une
    // faute de table. On exige donc l'un ou l'autre, jamais le doublon nu.
    const vusV = paires.flatMap(x => x.vs)
    const decl = new Set((p.scissions || []).map(s => s.v))
    const doubles = vusV.filter((v, i) => vusV.indexOf(v) !== i)
    const nusansCoupe = doubles.filter(v => !decl.has(v))
    if (nusansCoupe.length){
      ecartes.push(`Ps ${c} : verset(s) ${[...new Set(nusansCoupe)].join(',')} deux fois dans la table, sans coupe déclarée`); continue
    }
    const attenduV = (parCh[c] || []).map(v => v.v).sort((a,b)=>a-b)
    const dit = [...new Set(vusV)].sort((a,b)=>a-b)
    if (dit.join(',') !== attenduV.join(',')){
      ecartes.push(`Ps ${c} : la table couvre ${dit.join(',')} — l'édition porte ${attenduV.join(',')}`); continue
    }
    // ── contrôle 2 : les créneaux du canon, chacun une fois et une seule
    // UN CRÉNEAU PEUT REVENIR D'UNE PAIRE À L'AUTRE, et c'est la notation elle-même qui le
    // dit : « 6→6+7, 7→7+8 » ne décrit pas deux scissions indépendantes mais une CHAÎNE, où
    // chaque verset de Sacy chevauche une frontière du référent et où le créneau 7 reçoit la
    // fin de S6 puis le début de S7. C'est le « décalage d'une demi-clause » que plusieurs
    // lecteurs ont décrit. On exige donc que la suite soit croissante et que l'ENSEMBLE des
    // créneaux touchés soit exactement celui du canon — non que chacun n'apparaisse qu'une fois.
    const vusS = paires.flatMap(x => x.sl)
    if (vusS.some((n, i) => i && n < vusS[i-1])){
      ecartes.push(`Ps ${c} : les créneaux ne progressent pas (${vusS.join(' ')})`); continue
    }
    const uniq = [...new Set(vusS)].sort((a,b)=>a-b)
    if (uniq.join(',') !== slots[c].join(',')){
      ecartes.push(`Ps ${c} : créneaux touchés ${uniq[0]}–${uniq[uniq.length-1]} (${uniq.length}) ` +
                   `contre ${slots[c][0]}–${slots[c][slots[c].length-1]} (${slots[c].length}) au canon`); continue
    }

    // ── contrôle 3 : chaque scission a un point de coupe, présent une seule fois
    const dec = new Map((p.scissions || []).map(s => [s.v, s]))
    const sc = []
    let ok = true
    // Un verset écrit deux fois est une scission dont les deux créneaux sont ceux de ses deux
    // paires : « 0+1→1, 1→2 » se lit « S1 couvre les créneaux 1 et 2 ».
    for (const v of new Set(doubles)){
      // Les créneaux que ce verset touche, du premier au dernier — il les couvre tous.
      const touches = paires.filter(x => x.vs.includes(v)).flatMap(x => x.sl)
      const bornes = [Math.min(...touches), Math.max(...touches)]
      // On le retire partout, puis on le réinsère UNE fois avec ses deux bornes. Le retirer
      // sans le réinsérer le faisait disparaître du plan quand il ne figurait jamais seul :
      // Ps 96,8, écrit « 7+8→7, 8+9→8 », s'était ainsi évaporé en silence.
      paires = paires.map(x => ({ ...x, vs: x.vs.filter(y => y !== v) })).filter(x => x.vs.length)
      const ou = paires.findIndex(x => x.sl[0] > bornes[0])
      paires.splice(ou < 0 ? paires.length : ou, 0, { vs: [v], sl: bornes })
    }
    for (const { vs, sl } of paires){
      if (sl.length <= 1) continue
      if (vs.length !== 1){ ecartes.push(`Ps ${c} : ${vs.join('+')}→${sl.join('+')} — on ne sait ni souder ni couper`); ok = false; break }
      const d = dec.get(vs[0])
      if (!d || !d.coupe){ ecartes.push(`Ps ${c},${vs[0]} : couvre ${sl.length} créneaux sans point de coupe déclaré`); ok = false; break }
      const texte = apo((parCh[c].find(x => x.v === vs[0]) || {}).texte)
      const r = ancreReelle(texte, d.coupe)
      if (!r){ ecartes.push(`Ps ${c},${vs[0]} : coupe introuvable — « ${d.coupe.slice(0,40)} »`); ok = false; break }
      if (r.ambigu){ ecartes.push(`Ps ${c},${vs[0]} : coupe AMBIGUË — « ${d.coupe.slice(0,40)} »`); ok = false; break }
      if (sl.length > 2){ ecartes.push(`Ps ${c},${vs[0]} : ${sl.length} créneaux, une seule coupe déclarée`); ok = false; break }
      sc.push({ ch: c, v: vs[0], coupes: [r.texte], canons: sl.map(n => `PSA.${c}.${n}`) })
    }
    if (!ok) continue

    for (const { vs, sl } of paires) for (const v of vs)
      plan.push({ ch: c, v, canon_id: sl.length ? `PSA.${c}.${sl[0]}` : null })
    scissions.push(...sc)
    retenus.push(c)
  }
}

console.log(`psaumes retenus : ${retenus.length} · écartés : ${ecartes.length}`)
console.log(`  entrées de plan : ${plan.length} · scissions : ${scissions.length}`)
if (ecartes.length){ console.log('\nÉCARTÉS :'); for (const e of ecartes) console.log('  ' + e) }
if (signales.length){ console.log('\nRÉSERVES DES LECTEURS (le psaume est aligné, la remarque reste) :')
  for (const s of signales) console.log('  ' + s.slice(0, 150)) }

// ── SURNUMÉRAIRES arrêtés par l'éditeur ──────────────────────────────────────────────────
// Trois versets que Sacy porte et que le référent n'a NULLE PART — la définition retenue.
// Les lecteurs les avaient rattachés au créneau voisin faute de mieux, en le signalant ;
// l'éditeur a tranché : ils sortent de l'ossature.
const SURNUM = {
  // Interpolation que la Vulgate a reprise de Rm 3,13-18 ; l'hébreu ne l'a pas.
  13: [5, 6, 7],
  // Inclusion finale : le psaume se referme sur la formule de son v. 3. Propre à la Vulgate.
  135: [27],
  // Le verset « Nun ». Ce psaume est alphabétique, et l'hébreu massorétique saute cette
  // lettre — il passe de Mem à Samech. La Septante, la Vulgate et un manuscrit de Qumrân
  // l'ont ; Crampon suit l'hébreu et ne l'a donc pas.
  144: [14],
}
let surnum = 0
for (const e of plan){
  if (SURNUM[e.ch]?.includes(e.v)){ e.canon_id = null; surnum++ }
}
console.log(`\nsurnuméraires posés par décision éditoriale : ${surnum}`)

if (process.argv.includes('--ecrire')){
  // On complète le plan des 56 psaumes déjà établis au lieu de le remplacer : les deux
  // moitiés se recouvrent — ensemble elles doivent faire 150 psaumes, et pas un de plus.
  const F = D + 'psa_PSA_plan.json'
  const deja = JSON.parse(readFileSync(F, 'utf8'))
  const vus = new Set(plan.map(e => e.ch))
  const garde = deja.filter(e => !vus.has(e.ch))
  const total = [...garde, ...plan]
  const psaumes = new Set(total.map(e => e.ch))
  if (psaumes.size !== 150){
    console.error(`\n${psaumes.size} psaumes au total — attendu 150. RIEN N’A ÉTÉ ÉCRIT.`)
    process.exit(1)
  }
  writeFileSync(F, JSON.stringify(total, null, 1))
  writeFileSync(D + 'psa_PSA_scissions.json', JSON.stringify(scissions, null, 1))
  console.log(`plan écrit : ${total.length} versets, ${psaumes.size} psaumes · ${scissions.length} scissions`)
}
