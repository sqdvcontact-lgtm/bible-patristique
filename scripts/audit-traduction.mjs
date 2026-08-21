// Audit d'avancement et de qualité d'une traduction de versets_v2.
//   node scripts/audit-traduction.mjs [TR0001] [--verbeux]
//
// Trois questions, dans cet ordre :
//   1. quelle est la couverture réelle du canon, livre par livre ;
//   2. les créneaux non couverts sont-ils tous justifiés ;
//   3. le texte est-il propre (typographie, balises, césures, capitales).
//
// ⚠️ Le point 2 est le cœur de l'outil. Un livre affiché à « 100 % » peut cacher un
// décalage d'alignement : c'est ainsi qu'on a découvert que l'édition de 1730 fusionne
// Gn 50, 22 et 23, ce qui décalait d'un rang les trois versets suivants. Le script
// distingue donc les créneaux vides chez le référent (rien à aligner, normal) de ceux
// où le référent a du texte (à justifier un par un).
import { readFileSync } from 'node:fs'
import { existsSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all = async q => { const o=[]; let f=0; while(true){ const {data,error}=await q.range(f,f+999); if(error)throw error; o.push(...data); if(data.length<1000)break; f+=1000 } return o }

const TRAD = process.argv.slice(2).find(a => /^TR\d+$/.test(a)) || 'TR0001'
const VERBEUX = process.argv.includes('--verbeux')
const REFERENT = 'TR0003'          // Crampon : sert à distinguer créneau vide / créneau à justifier

const { data: meta } = await sb.from('traductions').select('nom').eq('trad_id', TRAD).single()
const NOM_TRAD = meta?.nom || TRAD

// ── données ──
const V = await all(sb.from('versets_v2')
  .select('livre,ch_orig,v_orig,canon_id,canon_id_fin,texte,notes,alignement_verifie,ordre_slot')
  .eq('trad_id', TRAD).order('canon_id'))
if (!V.length){ console.log(`${TRAD} : aucun verset.`); process.exit(0) }

const C = await all(sb.from('versets_canon').select('id,livre,ordre').order('ordre'))
const ordreLivre = new Map(), slotsCanon = new Map(), rangCanon = new Map(), idsParLivre = new Map()
for (const r of C){
  if (!ordreLivre.has(r.livre)) ordreLivre.set(r.livre, r.ordre)
  slotsCanon.set(r.livre, (slotsCanon.get(r.livre) || 0) + 1)
  rangCanon.set(r.id, r.ordre)
  ;(idsParLivre.get(r.livre) ?? idsParLivre.set(r.livre, []).get(r.livre)).push(r.id)
}

// ── couverture : une plage canon_id → canon_id_fin couvre AUSSI les créneaux intermédiaires.
//    Ne compter que les deux bornes ferait remonter les créneaux intérieurs comme « manquants ».
const couvert = new Set()
for (const v of V){
  couvert.add(v.canon_id)
  if (!v.canon_id_fin) continue
  const a = rangCanon.get(v.canon_id), b = rangCanon.get(v.canon_id_fin)
  if (a == null || b == null) continue
  for (const r of C) if (r.ordre >= a && r.ordre <= b) couvert.add(r.id)
}

const par = new Map()
for (const v of V){
  const e = par.get(v.livre) ?? { n:0, ital:0, fusion:0, scinde:0, nonVerif:0, notes:0 }
  e.n++
  if (/<i>/.test(v.texte || '')) e.ital++
  if (v.canon_id_fin) e.fusion++
  if (v.ordre_slot) e.scinde++
  if (v.alignement_verifie === false) e.nonVerif++
  if (v.notes) e.notes++
  par.set(v.livre, e)
}

console.log(`\n╔═ ${NOM_TRAD} (${TRAD}) — audit du ${new Date().toISOString().slice(0,10)}\n`)
console.log('livre        versets   couvert / canon      %   italiques  fusions  scindés  à vérifier')
console.log('─'.repeat(88))
let tn=0, tcouv=0, tcanon=0, tital=0, tnv=0
const livres = [...par.keys()].sort((a,b) => ordreLivre.get(a) - ordreLivre.get(b))
for (const code of livres){
  const e = par.get(code)
  const sc = slotsCanon.get(code) || 0
  const cv = (idsParLivre.get(code) || []).filter(id => couvert.has(id)).length
  const pct = sc ? (100 * cv / sc) : 0
  // pas d'arrondi à 100 % tant que ce n'est pas exactement complet : c'est l'arrondi qui masque les trous
  const aff = cv === sc ? '100' : pct.toFixed(1)
  console.log(code.padEnd(11) + String(e.n).padStart(7) + '   ' + (cv + ' / ' + sc).padStart(13) +
    aff.padStart(7) + '   ' + String(e.ital).padStart(8) + '  ' + String(e.fusion).padStart(7) +
    '  ' + String(e.scinde).padStart(7) + '  ' + String(e.nonVerif).padStart(10))
  tn+=e.n; tcouv+=cv; tcanon+=sc; tital+=e.ital; tnv+=e.nonVerif
}
console.log('─'.repeat(88))
console.log('TOTAL'.padEnd(11) + String(tn).padStart(7) + '   ' + (tcouv + ' / ' + tcanon).padStart(13) +
  (tcouv === tcanon ? '100' : (100*tcouv/tcanon).toFixed(1)).padStart(7) + '   ' + String(tital).padStart(8) +
  '  ' + String(V.filter(v=>v.canon_id_fin).length).padStart(7) + '  ' + String(V.filter(v=>v.ordre_slot).length).padStart(7) +
  '  ' + String(tnv).padStart(10))

// ── créneaux non couverts, dans les livres entamés ──
const ref = new Map()
for (const r of await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id', REFERENT).in('livre', livres).order('canon_id')))
  ref.set(r.canon_id, r.texte)

// Un livre en cours de transcription s'arrête en chemin : tout ce qui suit son dernier
// créneau couvert n'est pas un défaut d'alignement, c'est du travail restant. Confondre
// les deux noierait un vrai décalage sous des centaines de lignes de bruit.
const manquants = [], nonTranscrits = []
for (const code of livres){
  const ids = idsParLivre.get(code) || []
  let dernier = -1
  ids.forEach((id, i) => { if (couvert.has(id)) dernier = i })
  ids.forEach((id, i) => {
    if (couvert.has(id)) return
    // Un créneau vide chez le référent n'est jamais du travail restant, même en fin de
    // livre : il n'y a rien à transcrire. Sans cette réserve, un livre achevé dont le
    // dernier créneau est vide (Jg 21, 25) passerait pour inachevé.
    const aDuTexte = (ref.get(id) || '').trim().length > 0
    ;(i > dernier && aDuTexte ? nonTranscrits : manquants).push(id)
  })
}

const vides = manquants.filter(id => !(ref.get(id) || '').trim())
const aJustifier = manquants.filter(id => (ref.get(id) || '').trim())

console.log(`\n── CRÉNEAUX NON COUVERTS, DANS LA PARTIE TRAITÉE : ${manquants.length} ──`)
if (nonTranscrits.length)
  console.log(`  (${nonTranscrits.length} créneaux au-delà du dernier verset transcrit : travail restant, comptés plus bas)`)
console.log(`  ${vides.length} vides chez le référent → rien à aligner, normal`)
if (VERBEUX && vides.length) console.log('     ' + vides.join(' '))
if (aJustifier.length){
  console.log(`  ⚠ ${aJustifier.length} où le référent A du texte → chacun doit être justifié`)
  console.log('     (fusion non localisée ? décalage d’alignement ? verset non imprimé ?)')
  for (const id of aJustifier.slice(0, VERBEUX ? 999 : 15))
    console.log(`     ${id.padEnd(13)} ${(ref.get(id) || '').replace(/\s+/g,' ').slice(0, 62)}`)
  if (!VERBEUX && aJustifier.length > 15) console.log(`     … et ${aJustifier.length - 15} autres (--verbeux)`)
} else {
  console.log('  ✓ aucun créneau inexpliqué')
}

// ── qualité du texte ──
const c = re => V.filter(v => re.test(v.texte || '')).length

// Apostrophe mise pour une lettre : dans le fac-similé, un « l » ou un « i » est parfois lu
// comme une apostrophe (« fi’s » pour fils, « ce’a » pour cela, « mo’s » pour mois, « I’s »
// pour Ils). Le défaut traverse tous les livres et ne se voit à aucun autre contrôle : le
// mot reste prononçable et la typographie est correcte. On liste donc les apostrophes dont
// le préfixe n'est pas une élision française attestée.
const ELISIONS = new Set(['l','d','j','m','n','s','t','c','qu','jusqu','lorsqu','puisqu',
  'quelqu','entr','aujourd','presqu','quoiqu','parcequ','contr','grand','ç','p','v'])
const apostrophesDouteuses = []
for (const v of V)
  for (const m of (v.texte || '').matchAll(/([A-Za-zÀ-ÿ]+)’([a-zà-ÿ]+)/g))
    if (!ELISIONS.has(m[1].toLowerCase()))
      apostrophesDouteuses.push(`${v.livre} ${v.ch_orig},${v.v_orig} « ${m[0]} »`)
const controles = [
  ['césures de fin de ligne restées ouvertes', c(/[a-zà-ÿ]-\s/)],
  ['apostrophes droites', c(/'/)],
  ['guillemets droits', c(/"/)],
  // Les capitales sont proscrites dans le texte des versets (§23.9) : ce sont presque
  // toujours une lettrine mal normalisée ou une emphase de l'édition, l'une et l'autre à
  // ramener à la casse ordinaire. UNE exception, et une seule : l'inscription du festin de
  // Balthazar (Dn 5, 25-28). Ce n'est pas une emphase, c'est un texte CITÉ dans le texte —
  // les trois mots araméens que la main trace sur le mur, et que le verset suivant explique
  // un à un. Les mettre en bas de casse effacerait la citation. Les Bibles françaises
  // d'aujourd'hui les impriment de même.
  ['mots en capitales (3 lettres et plus)', V.filter(v =>
    /\b[A-ZÀ-Ü]{3,}\b/.test((v.texte||'').replace(/<\/?i>/g,'')
      .replace(/\b(MANE|THECEL|PHARES)\b/g,'')          // l'écriture sur le mur, Dn 5, 25-28
      .replace(/C’EST Jesus LE ROI DES JUIFS|LE ROI DES JUIFS/g,'')  // le titulus, Mt 27,37 · Mc 15,26
    )).length],
  ['balises <i> déséquilibrées', V.filter(v => ((v.texte||'').match(/<i>/g)||[]).length !== ((v.texte||'').match(/<\/i>/g)||[]).length).length],
  ['balises autres que <i>', c(/<(?!\/?i>)[^>]*>/)],
  ['espace avant virgule ou point', c(/ [,.]/)],
  ['ponctuation double sans insécable', c(/[^ \s][;:!?]/)],
  ['espaces multiples', c(/ {2,}/)],
  ['caractères de remplacement (U+FFFD)', c(/�/)],
  ['versets vides ou quasi vides', V.filter(v => !v.texte || v.texte.trim().length < 3).length],
  ['apostrophes mises pour une lettre', apostrophesDouteuses.length],
  // « [suite] » est un marqueur de travail : il ne doit JAMAIS survivre au recollage.
  // « [?] » au contraire est éditorial et voulu — il signale un mot illisible sur le
  // fac-similé. On les compte séparément : l'un est un défaut, l'autre une information.
  ['marqueurs de continuation oubliés', c(/\[\s*suite\s*\]/i)],
  ['alignements en attente de vérification', tnv],
]
const illisibles = V.filter(v => /\[\s*\?\s*\]/.test(v.texte || ''))
console.log(`\n── QUALITÉ DU TEXTE (${tn} versets) ──`)
for (const [lab, n] of controles)
  console.log(`  ${n === 0 ? '✓' : '⚠'} ${lab.padEnd(46)} ${String(n).padStart(5)}`)
if (illisibles.length){
  console.log(`\n  ${illisibles.length} mot(s) illisible(s) sur le fac-similé, marqués [?] — voulu, à relire un jour :`)
  illisibles.forEach(v => console.log(`     ${v.livre} ${v.ch_orig},${v.v_orig}`))
}
if (apostrophesDouteuses.length){
  console.log('     ' + apostrophesDouteuses.slice(0, VERBEUX ? 999 : 12).join('\n     '))
  if (!VERBEUX && apostrophesDouteuses.length > 12) console.log(`     … et ${apostrophesDouteuses.length - 12} autres (--verbeux)`)
}

// ── transcriptions en attente de chargement ──
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
if (existsSync(D)){
  const attente = new Map()
  for (const f of readdirSync(D).filter(f => /_transcrit\.json$/.test(f))){
    const code = f.match(/_([A-Z0-9]+)_transcrit\.json$/)?.[1]
    if (!code || par.has(code)) continue        // déjà chargé
    try { attente.set(code, JSON.parse(readFileSync(D + f, 'utf8')).length) } catch {}
  }
  if (attente.size){
    console.log('\n── TRANSCRIT, PAS ENCORE CHARGÉ ──')
    for (const [code, n] of attente)
      console.log(`  ${code.padEnd(11)} ${String(n).padStart(5)} versets · canon : ${slotsCanon.get(code) || '?'} créneaux`)
  }
}

// ── reste à faire ──
const totalBible = [...slotsCanon.values()].reduce((a,b) => a+b, 0)
const reste = [...slotsCanon].filter(([k]) => !par.has(k)).sort((a,b) => ordreLivre.get(a[0]) - ordreLivre.get(b[0]))
console.log('\n── RESTE À FAIRE ──')
// « Incomplet » veut dire : il reste du texte à transcrire. Un livre dont les seuls
// créneaux non couverts sont vides chez le référent est achevé, quoi qu'en dise le compte.
const resteParLivre = new Map()
for (const id of nonTranscrits){
  const l = id.split('.')[0]
  resteParLivre.set(l, (resteParLivre.get(l) || 0) + 1)
}
if (resteParLivre.size)
  console.log(`  livres entamés mais incomplets : ${[...resteParLivre].map(([k,n]) => `${k} (${n} créneaux)`).join(' · ')}`)
else console.log('  ✓ tous les livres entamés sont achevés')
console.log(`  livres non commencés : ${reste.length} (${reste.reduce((a,[,n]) => a+n, 0)} créneaux)`)
console.log(`  prochains : ${reste.slice(0, 6).map(([k,n]) => `${k} (${n})`).join(' · ')}`)
console.log(`\n  avancement : ${(100*tcouv/totalBible).toFixed(1)} %  (${tcouv} / ${totalBible} créneaux du canon)\n`)

// ═══════════════════════════════════════════════════════════════════════════
// MODE CORPUS — `node scripts/audit-traduction.mjs --corpus`
//
// Ce qui précède examine UNE traduction. Or les fautes les plus coûteuses sont
// des divergences ENTRE traductions : le 24/07/2026, 487 versets de la Vulgate
// pointaient un autre créneau que Sacy — qui traduit pourtant la même Vulgate —
// et rien ne le signalait. On ajoute donc quatre contrôles transverses.
// ═══════════════════════════════════════════════════════════════════════════
if (process.argv.includes('--corpus')) {
  const paged = async (tr) => {
    const o = []
    for (let de = 0; ; de += 1000) {
      const { data } = await sb.from('versets_v2')
        .select('id, livre, ch_orig, v_orig, canon_id, ordre_slot, texte, notes')
        .eq('trad_id', tr).order('id').range(de, de + 999)
      if (!data?.length) break; o.push(...data); if (data.length < 1000) break
    }
    return o
  }
  const canonTous = []
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_canon').select('id').order('id').range(de, de + 999)
    if (!data?.length) break; canonTous.push(...data); if (data.length < 1000) break
  }
  const { data: trads } = await sb.from('traductions').select('trad_id, nom').order('ordre')
  const par = {}
  for (const t of trads) par[t.trad_id] = await paged(t.trad_id)

  console.log(`\n╔═ AUDIT DE CORPUS — ${new Date().toISOString().slice(0, 10)}\n`)

  // 1. créneaux de l'ossature que PERSONNE ne remplit
  const remplis = new Set()
  for (const t of trads) for (const r of par[t.trad_id]) if (r.canon_id && r.texte?.trim()) remplis.add(r.canon_id)
  const orphelins = canonTous.map(r => r.id).filter(id => !remplis.has(id))
  console.log(`── CRÉNEAUX VIDES CHEZ TOUS LES TÉMOINS : ${orphelins.length}`)
  if (orphelins.length) {
    console.log('   L’ossature ouvre un créneau qu’aucune édition ne remplit — question d’ossature, non de traduction.')
    console.log('   ' + orphelins.slice(0, 20).join(' · ') + (orphelins.length > 20 ? ' …' : ''))
  }

  // 2. plusieurs versets d'une même traduction sur un créneau
  console.log(`\n── CRÉNEAUX À PLUSIEURS VERSETS (légitime si l’édition soude ce que l’ossature sépare)`)
  for (const t of trads) {
    const c = new Map()
    for (const r of par[t.trad_id]) if (r.canon_id) c.set(r.canon_id, (c.get(r.canon_id) || 0) + 1)
    const multi = [...c.values()].filter(n => n > 1).length
    const sansRang = par[t.trad_id].filter(r => r.canon_id && (c.get(r.canon_id) || 0) > 1 && !r.ordre_slot).length
    console.log(`   ${t.trad_id}  ${String(multi).padStart(4)} créneaux` + (sansRang ? `   ⚠ ${sansRang} versets sans ordre_slot` : ''))
  }

  // 3. versets sans créneau — les surnuméraires
  console.log(`\n── SURNUMÉRAIRES (versets que l’ossature n’a pas ; se laissent SANS créneau)`)
  for (const t of trads) {
    const n = par[t.trad_id].filter(r => !r.canon_id).length
    console.log(`   ${t.trad_id}  ${String(n).padStart(4)}`)
  }

  // 4. LE contrôle décisif : deux éditions d'une même famille se placent-elles pareil ?
  //    Sacy traduit la Vulgate : leurs versets de même (livre, ch, v) doivent viser
  //    le même créneau. LES PSAUMES SONT EXCLUS — Sacy y numérote la suscription 0,
  //    la Vulgate 1, ce qui décale artificiellement tout le psautier. Vérifié :
  //    PSA.30.1 porte bien la suscription latine, le psautier est juste.
  const PAIRES = [['TR0001', 'TR0004', 'Sacy traduit la Vulgate']]
  console.log(`\n── DIVERGENCES DE PLACEMENT ENTRE ÉDITIONS D’UNE MÊME FAMILLE`)
  for (const [a, b, pourquoi] of PAIRES) {
    if (!par[a] || !par[b]) continue
    const cle = new Map()
    for (const r of par[a]) {
      const k = `${r.livre}|${r.ch_orig}|${r.v_orig}`
      let l = cle.get(k); if (!l) cle.set(k, l = []); l.push(r.canon_id)
    }
    const div = []
    for (const r of par[b]) {
      if (r.livre === 'PSA' || !r.canon_id) continue
      const l = cle.get(`${r.livre}|${r.ch_orig}|${r.v_orig}`)
      if (l && !l.includes(r.canon_id)) div.push(r)
    }
    const pl = {}
    for (const r of div) pl[`${r.livre} ${r.ch_orig}`] = (pl[`${r.livre} ${r.ch_orig}`] || 0) + 1
    console.log(`   ${a} / ${b} — ${pourquoi}`)
    console.log(`   ${div.length} versets divergents, hors psaumes` + (div.length ? ' :' : ' ✓'))
    if (div.length) console.log('      ' + Object.entries(pl).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} (${n})`).join(' · '))
    console.log('   (psaumes exclus à dessein : la suscription y est numérotée 0 chez Sacy, 1 dans la Vulgate)')
  }
  console.log()
}
