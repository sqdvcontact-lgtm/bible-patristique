// Restitue les frontières de versets que la numérisation FreCrampon a effacées.
//   node scripts/crampon-detasse.mjs TOB [--ecrire]
//
// LE PROBLÈME. La source d'import (scrollmapper / FreCrampon) a été ajustée à une ossature
// trop courte pour Tobie, Judith et Néhémie : le texte excédentaire de chaque chapitre a été
// versé dans le DERNIER verset disponible. Tob 2,14 fait ainsi 1 188 caractères et contient
// les versets 14 à 23 ; Jdt 13,20 en fait 2 084.
//
// CE QU'ON NE FAIT PAS. On ne va pas chercher le texte ailleurs : le texte reste
// intégralement celui de FreCrampon, mot pour mot. On ne redécoupe pas non plus « au
// jugé » : chaque frontière doit être justifiée.
//
// CE QU'ON FAIT. La Bible de Sacy porte le même découpage que le Crampon imprimé (vérifié :
// Tobie 2 y compte 23 versets, Judith 13 en compte 31, dans les deux éditions). Sacy sert
// donc de GABARIT : pour chaque verset que Sacy sépare, on cherche dans le pavé l'endroit où
// son contenu commence. L'alignement est MONOTONE — chaque frontière doit venir après la
// précédente —, ce qui interdit les correspondances fantaisistes.
//
// ⚠️ Les versets ainsi obtenus sont RECONSTITUÉS. Leur texte est authentiquement celui de
// FreCrampon, mais leurs frontières sont déduites de Sacy, non lues sur une édition Crampon.
// Ils sont marqués comme tels dans `notes`.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all = async q => { const o=[]; let f=0; while(true){ const {data,error}=await q.range(f,f+999); if(error)throw error; o.push(...data); if(data.length<1000)break; f+=1000 } return o }

const CODE = process.argv[2]
const ECRIRE = process.argv.includes('--ecrire')
const PREFIXE = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'esd_'

// mots significatifs, insensibles à la graphie de 1730
const mots = t => ((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/f/g,'s')
  .toLowerCase().match(/[a-z]{4,}/g) || [])
// ⚠️ Diviser par la PLUS PETITE des deux tailles est ici un piège mortel : un segment
// réduit à « en disant : » partage son unique mot avec un long verset de Sacy et obtient
// alors un score PARFAIT. La programmation dynamique s'en saisit et coupe n'importe où.
// Le défaut a été écrit en base avant d'être vu. On divise donc par la PLUS GRANDE des
// deux tailles : un segment trop court est immédiatement pénalisé.
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.max(a.size,b.size) }

// ── référent tassé ──
const R = await all(sb.from('versets_v2').select('id,canon_id,ch_orig,v_orig,texte')
  .eq('trad_id','TR0003').eq('livre',CODE).order('canon_id'))
const parCh = new Map()
for (const r of R){ if(!(r.texte||'').trim()) continue
  const [, c, v] = r.canon_id.split('.')
  ;(parCh.get(+c) ?? parCh.set(+c, []).get(+c)).push({ ...r, v: +v }) }
for (const [, vs] of parCh) vs.sort((a,b)=>a.v-b.v)

// ── gabarit : la Bible de Sacy ──
const S = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))
const sacyCh = new Map()
for (const v of S) (sacyCh.get(v.ch) ?? sacyCh.set(v.ch, []).get(v.ch)).push(v)
for (const [, vs] of sacyCh) vs.sort((a,b)=>a.v-b.v)

const nouveaux = [], douteux = []
let chapitresTraites = 0

for (const [ch, cv] of [...parCh].sort((a,b)=>a[0]-b[0])){
  const dernier = cv[cv.length - 1]
  const sv = (sacyCh.get(ch) || []).filter(v => v.v >= dernier.v)
  if (sv.length < 2) continue                      // rien de tassé dans ce chapitre

  // Découper le pavé en PROPOSITIONS, pas en phrases : une frontière de verset tombe
  // souvent au milieu d'une phrase, après un « : » ou un « ; ». Tob 2 sépare ainsi
  // « Ne parlez pas ainsi ; » (v.17) de « car nous sommes enfants des saints… » (v.18).
  // Découper seulement aux points laissait 8 unités pour 10 versets : impossible à aligner.
  // Découpage FIN, virgules comprises : une frontière de verset peut tomber après une
  // simple virgule (Jdt 9,19 s'ouvre sur « et que toutes les nations connaissent… »,
  // rattaché au précédent par une virgule). Ne découper qu'aux ponctuations fortes privait
  // la suite de la seule coupe correcte. Sur-fragmenter est sans risque : la programmation
  // dynamique regroupe les unités qui vont ensemble.
  const phrases = dernier.texte.split(/(?<=[.!?;:»,])\s+/).filter(p => p.trim())
  if (phrases.length < sv.length){
    douteux.push(`ch ${ch} : ${phrases.length} propositions pour ${sv.length} versets attendus — trop peu, non découpé`)
    continue
  }

  // Alignement MONOTONE propositions → versets de Sacy, par PROGRAMMATION DYNAMIQUE.
  // ⚠️ Un choix glouton, verset après verset, dérive sur les longs chapitres : il fixe une
  // coupe qui paraît bonne localement et ne peut plus revenir dessus. Judith 13 (2 085
  // caractères, 11 versets à retrouver) en faisait la démonstration. La DP cherche le
  // découpage qui maximise l'accord TOTAL, et ne se laisse pas piéger par un optimum local.
  const P = phrases.length, K = sv.length
  const motsSacy = sv.map(v => new Set(mots(v.texte)))
  // score[k][i][j] = accord du verset k avec les propositions i..j-1.
  // Deux signaux indépendants : le vocabulaire partagé, et la LONGUEUR relative. Le second
  // est indispensable sur les versets courts, où trop peu de mots sont communs pour que le
  // premier tranche — c'est lui qui départage Tob 2,22 de 2,23.
  const score = (k, i, j) => {
    const bloc = phrases.slice(i, j).join(' ')
    const lex = jac(motsSacy[k], new Set(mots(bloc)))
    const r = bloc.length / Math.max(1, sv[k].texte.replace(/<\/?i>/g,'').length)
    const longueur = r > 1 ? 1 / r : r          // 1 si longueurs égales, décroît des deux côtés
    return lex + 0.35 * longueur
  }
  // best[k][i] = meilleur total pour placer les versets k..K-1 à partir de la proposition i
  const best = Array.from({ length: K + 1 }, () => new Float64Array(P + 1).fill(-Infinity))
  const choix = Array.from({ length: K + 1 }, () => new Int32Array(P + 1).fill(-1))
  best[K][P] = 0
  for (let k = K - 1; k >= 0; k--){
    const restants = K - k - 1
    for (let i = 0; i <= P - 1 - restants; i++){
      for (let j = i + 1; j <= P - restants; j++){
        if (best[k+1][j] === -Infinity) continue
        const t = score(k, i, j) + best[k+1][j]
        if (t > best[k][i]){ best[k][i] = t; choix[k][i] = j }
      }
    }
  }
  const coupes = [0]
  let pos = 0
  for (let k = 0; k < K; k++){ pos = choix[k][pos]; if (pos < 0){ pos = P; } coupes.push(pos) }
  coupes[coupes.length - 1] = P

  // Construire les versets et mesurer chacun contre son homologue de Sacy
  const bruts = []
  for (let k = 0; k < sv.length; k++) bruts.push(phrases.slice(coupes[k], coupes[k+1]).join(' ').trim())
  // Une coupe après « ; » laisse le guillemet fermant en TÊTE du segment suivant :
  // « … ne parlez pas ainsi ; » puis « » car nous sommes… ». On le rend au précédent.
  for (let k = 1; k < bruts.length; k++){
    const m = bruts[k].match(/^([»"’']+)\s*/)
    if (m){ bruts[k-1] += ' ' + m[1]; bruts[k] = bruts[k].slice(m[0].length) }
  }

  for (let k = 0; k < sv.length; k++){
    const texte = bruts[k].trim()
    if (!texte){ douteux.push(`ch ${ch}, v.${sv[k].v} : segment vide`); continue }
    const score = jac(new Set(mots(sv[k].texte)), new Set(mots(texte)))
    nouveaux.push({ ch, v: sv[k].v, texte, score, premier: k === 0, id: k === 0 ? dernier.id : null })
    if (score < 0.25) douteux.push(`ch ${ch}, v.${sv[k].v} : accord ${score.toFixed(2)}\n` +
      `        reconstitué : ${texte.slice(0, 105)}\n` +
      `        Sacy        : ${sv[k].texte.replace(/<\/?i>/g,'').slice(0, 105)}`)
  }
  chapitresTraites++
}

console.log(`╔═ ${CODE} — restitution des frontières effacées par la numérisation\n`)
console.log(`  chapitres au dernier verset tassé : ${chapitresTraites}`)
console.log(`  versets après découpage           : ${nouveaux.length}`)
console.log(`  dont conservent leur créneau      : ${nouveaux.filter(n=>n.premier).length}`)
console.log(`  dont deviennent surnuméraires     : ${nouveaux.filter(n=>!n.premier).length}`)
const scores = nouveaux.map(n=>n.score)
console.log(`  accord moyen avec le gabarit Sacy : ${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(3)}`)
console.log(`\n  ⚠ points douteux : ${douteux.length}`)
douteux.slice(0, 15).forEach(d => console.log(`     ${d}`))

console.log('\n── échantillon ──')
for (const n of nouveaux.filter(x=>x.ch===2).slice(0,4))
  console.log(`  ${CODE} ${n.ch},${n.v} (${n.score.toFixed(2)})${n.premier?' [garde son créneau]':' [surnuméraire]'} : ${n.texte.slice(0,90)}`)

if (!ECRIRE){ console.log('\n[simulation] — relancer avec --ecrire pour appliquer'); process.exit(0) }

// ── écriture ──
const NOTE = 'Verset restitué : la numérisation FreCrampon avait versé ce texte dans le ' +
  'dernier verset du chapitre, l’ossature étant trop courte. Le texte est intégralement ' +
  'celui de FreCrampon ; la frontière est déduite du découpage de la Bible de Sacy, qui ' +
  'coïncide avec celui du Crampon imprimé.'

let modifies = 0, inseres = 0
for (const n of nouveaux){
  if (n.premier){
    const { error } = await sb.from('versets_v2').update({ texte: n.texte, notes: NOTE }).eq('id', n.id)
    if (error) console.error(`ERR ${CODE} ${n.ch},${n.v} : ${error.message}`); else modifies++
  } else {
    const { error } = await sb.from('versets_v2').insert({
      trad_id: 'TR0003', livre: CODE, ch_orig: n.ch, v_orig: n.v,
      texte: n.texte, canon_id: null, est_suscription: false,
      notes: NOTE, alignement_verifie: false })
    if (error) console.error(`ERR ${CODE} ${n.ch},${n.v} : ${error.message}`); else inseres++
  }
}
console.log(`\n${modifies} verset(s) raccourci(s) à leur juste étendue · ${inseres} surnuméraire(s) créé(s)`)
