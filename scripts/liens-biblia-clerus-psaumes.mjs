// RÉFÉRENCES ATTESTÉES — Discours sur les Psaumes (Augustin, A0010O0004) depuis
// Biblia Clerus (clerus.org). Notre import a perdu les références bibliques ;
// Biblia Clerus (même édition Morisot/Aubert) les porte, hyperliées au verset.
// On les récupère et on les RÉALIGNE sur nos segments par le TEXTE.
//
// ⚠️ NE PAS se fier aux NUMÉROS (ni de la table des matières, ni des références) :
// Biblia Clerus mélange numérotations grecque/Vulgate et hébraïque de façon
// incohérente (« Ps 34,1 » pour ce que notre édition nomme Psaume XXXIII). On
// scope donc chaque section par son TEXTE D'OUVERTURE (l'argument du discours,
// identique des deux côtés), puis on résout le VERSET par le texte de nos segments.
//
// ⚠️ La cible se lit dans NOTRE segment (numérotation Vulgate = ossature), pas
// dans le numéro de la référence Biblia Clerus. Pour la citation du psaume commenté
// (lemme), la cible est le créneau du psaume ; pour une citation d'un autre livre,
// on garde le canon_id résolu depuis la référence (fiable hors Psaumes).
//
// Le HTML des pages ne passe JAMAIS par le contexte du modèle : tout se fait ici.
//
//   node scripts/liens-biblia-clerus-psaumes.mjs --dry --ps 33
//   node scripts/liens-biblia-clerus-psaumes.mjs --dry
//   node scripts/liens-biblia-clerus-psaumes.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { chargerAbrev, chargerOssature, creerResolveur, verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = 'A0010O0004'
const BASE = 'https://www.clerus.org/bibliaclerusonline/fr/'
const DRY = process.argv.includes('--dry')
const PS_ARG = (() => { const i = process.argv.indexOf('--ps'); return i >= 0 ? +process.argv[i + 1] : null })()

// Normalisation d'ALIGNEMENT : lettres seules. On DROPPE les chiffres — Biblia
// Clerus sème des numéros (§, marqueurs, réfs sans balise) que notre import n'a
// pas ; les garder faisait échouer l'appariement. La résolution du verset se fait
// à part, sur le texte brut de la référence.
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z]+/g, '')
const page = async nom => Buffer.from(await (await fetch(BASE + nom, { headers: { 'User-Agent': 'Mozilla/5.0' } })).arrayBuffer()).toString('latin1')

// ── Résolveur (livres NON-psaumes) ────────────────────────────────────────────
const ABREV = await chargerAbrev(sb)
const { canon, chapitres, parHebreu, unChapitre } = await chargerOssature(sb)
const { codeLivre } = creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre })
function refVersCanon(ref) {
  const m = ref.match(/^([1-4]?\s?[A-Za-zÉÈÀÎÔ][A-Za-zéèêàïô]{0,6})\.?\s+([0-9]{1,3})(?:\s*[,.]\s*([0-9]{1,3}))?/)
  if (!m) return null
  const rang = /^[1-4]/.test(m[1].trim()) ? m[1].trim()[0] : null
  const livre = codeLivre(rang, m[1].replace(/^[1-4]\s?/, '').trim())
  if (!livre) return null
  const ch = +m[2], v = m[3] ? +m[3] : null
  if (v == null) return chapitres.has(`${livre}.${ch}`) ? `${livre}.${ch}` : null
  const cible = `${livre}.${ch}.${v}`
  return canon.has(cible) ? cible : { livre, ch, v }   // hors ossature (Psaume à recaler) : on garde brut
}

// ── Nos segments, normalisés, groupés par psaume (ref_niv1) ───────────────────
function numPsaume(niv1) {
  const m = String(niv1 || '').match(/psaume\s+([ivxlcdm]+|\d+)/i); if (!m) return null
  if (/^\d+$/.test(m[1])) return +m[1]
  const R = { i:1, v:5, x:10, l:50, c:100, d:500, m:1000 }; let n = 0, t = m[1].toLowerCase()
  for (let i = 0; i < t.length; i++) { const a = R[t[i]], b = R[t[i+1]]; n += b && a < b ? -a : a }
  return n
}
const segsParPsaume = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv1, segment_texte')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('segment_numero').range(from, from + 999)
  if (!data?.length) break
  for (const s of data) {
    const p = numPsaume(s.ref_niv1); if (p == null || (PS_ARG && p !== PS_ARG)) continue
    if (!segsParPsaume.has(p)) segsParPsaume.set(p, [])
    segsParPsaume.get(p).push({ id: s.id, num: s.segment_numero, txt: norm(s.segment_texte) })
  }
  if (data.length < 1000) break
}
// Ouverture de chaque psaume (début de l'argument) pour le scoping par texte.
// Texte CONCATÉNÉ de chaque psaume + table des débuts de segment. On aligne sur ce
// texte continu (pas segment par segment), puis on retrouve le segment par position :
// une clé qui chevauche une frontière de segment est alors quand même trouvée.
const psaumeTexte = new Map()   // p → { norm, starts:[offsets], segs:[{id,num}] }
const ouverturePsaume = new Map()
for (const [p, segs] of segsParPsaume) {
  let norm = ''; const starts = []
  for (const s of segs) { starts.push(norm.length); norm += s.txt }
  psaumeTexte.set(p, { norm, starts, segs })
  ouverturePsaume.set(p, norm)
}
function segAt(p, pos) {   // segment dont le texte couvre la position pos
  const { starts, segs } = psaumeTexte.get(p)
  let lo = 0, hi = starts.length - 1, ans = 0
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= pos) { ans = mid; lo = mid + 1 } else hi = mid - 1 }
  return segs[ans]
}
console.log(`${segsParPsaume.size} psaumes chargés`)

// ── Table des matières : tous les débuts de discours ; pages ──────────────────
const toc = await page('lp.htm')
const sections = new Set(), pagesParNum = new Map()
for (const m of toc.matchAll(/<a href=(d[a-z0-9]+\.htm)#([a-z0-9]+)>/gi)) sections.add(`${m[1]}|${m[2]}`)
for (const m of toc.matchAll(/<a href=(d[a-z0-9]+\.htm)#[a-z0-9]+>([0-9]{1,3})[< ]/gi)) {
  if (!pagesParNum.has(+m[2])) pagesParNum.set(+m[2], new Set()); pagesParNum.get(+m[2]).add(m[1])
}
let pages
if (PS_ARG) { const s = new Set(); for (let k = PS_ARG; k <= PS_ARG + 3; k++) for (const p of (pagesParNum.get(k) ?? [])) s.add(p); pages = [...s] }
else pages = [...new Set([...sections].map(k => k.split('|')[0]))]
console.log(`${sections.size} sections · ${pages.length} page(s)${PS_ARG ? ` (psaume ${PS_ARG})` : ''}`)

// ── Extraction : références + ouverture de chaque section ──────────────────────
const RE_REF_FULL = /\(?\s*<i>\s*<a href=[a-z0-9]+\.htm#[a-z0-9]+>([^<]{1,45})<\/a>\s*<\/i>\s*\)?/gi
const RE_EVT = /<a\s+name=([a-z0-9]+)>|<a href=[a-z0-9]+\.htm#[a-z0-9]+>([^<]{1,45})<\/a>/gi
const nettoie = t => norm(t.replace(RE_REF_FULL, ' ').replace(/<[^>]+>/g, ' '))
const refs = []
const ouvertureSection = new Map()
let horsSection = 0
for (const pg of pages) {
  const html = await page(pg)
  let section = null
  for (const m of html.matchAll(RE_EVT)) {
    if (m[1] !== undefined) {
      if (sections.has(`${pg}|${m[1]}`)) {
        section = `${pg}|${m[1]}`
        if (!ouvertureSection.has(section)) ouvertureSection.set(section, nettoie(html.slice(m.index, m.index + 600)))
      }
      continue
    }
    const canon = refVersCanon((m[2] || '').trim())
    if (!canon || section == null) { if (!canon) {} else horsSection++; continue }
    const avant = nettoie(html.slice(Math.max(0, m.index - 500), m.index)).slice(-80)
    const apres = nettoie(html.slice(m.index + m[0].length, m.index + m[0].length + 500)).slice(0, 70)
    refs.push({ section, avant, apres, canon })
  }
  await new Promise(r => setTimeout(r, 250))
}

// Section → psaume par le TEXTE d'ouverture (immunise contre la numérotation).
const psaumeSection = new Map()
for (const [sk, op] of ouvertureSection) {
  let trouve = null
  for (const chunk of [op.slice(4, 44), op.slice(15, 55), op.slice(25, 65)]) {
    if (chunk.length < 22) continue
    for (const [p, ouv] of ouverturePsaume) if (ouv.includes(chunk)) { trouve = p; break }
    if (trouve) break
  }
  if (trouve) psaumeSection.set(sk, trouve)
}
for (const r of refs) r.psaume = psaumeSection.get(r.section) ?? null
console.log(`références : ${refs.length} · sections mappées : ${psaumeSection.size}/${ouvertureSection.size}`)

// ── Alignement + cible ────────────────────────────────────────────────────────
// canon PSA : notre édition est Vulgate. La référence Biblia Clerus donne le
// VERSET, mais son numéro de psaume peut être hébraïque → on FORCE le n° du psaume
// commenté (r.psaume, Vulgate), en gardant chapitre/verset de la référence.
function canonFinal(r) {
  const c = r.canon
  if (typeof c === 'string') {
    // Psaume : forcer le n° du psaume commenté (Vulgate) ; sinon garder le canon_id.
    if (c.startsWith('PSA.') && c.split('.').length === 3) {
      const cible = `PSA.${r.psaume}.${c.split('.')[2]}`; return canon.has(cible) ? cible : null
    }
    return canon.has(c) ? c : null   // UNIQUEMENT un verset valide (rejette les chapitres seuls)
  }
  if (c.livre === 'PSA') { const cible = `PSA.${r.psaume}.${c.v}`; return canon.has(cible) ? cible : null }
  return null
}
const liens = new Map()
const parPs = new Map()
let alignes = 0
for (const r of refs) {
  if (r.psaume == null || (PS_ARG && r.psaume !== PS_ARG)) continue
  if (!parPs.has(r.psaume)) parPs.set(r.psaume, [0, 0])
  parPs.get(r.psaume)[0]++
  const { norm } = psaumeTexte.get(r.psaume) ?? {}
  if (!norm) continue
  // Chercher dans le texte CONTINU du psaume, puis retrouver le segment par position.
  // « avant » : la réf suit la clé → segment à la FIN de la clé. « apres » : la réf
  // précède la clé → segment au DÉBUT de la clé.
  let cible = null
  for (const [key, aLaFin] of [[r.avant, 1], [r.apres, 0], [r.avant.slice(-45), 1], [r.apres.slice(0, 45), 0], [r.avant.slice(-28), 1], [r.apres.slice(0, 28), 0]]) {
    if (!key || key.length < 16) continue
    const idx = norm.indexOf(key); if (idx < 0) continue
    cible = segAt(r.psaume, aLaFin ? idx + key.length - 1 : idx); break
  }
  if (process.env.DEBUG && !cible)
    console.error(`DBG Ps${r.psaume} ${typeof r.canon==='string'?r.canon:JSON.stringify(r.canon)} · avant45="${r.avant.slice(-45)}" · trouvé=${norm.includes(r.avant.slice(-45))} · aligné=${!!cible}`)
  if (!cible) continue
  const cf = canonFinal(r); if (!cf) continue
  alignes++; parPs.get(r.psaume)[1]++
  const memePs = cf.startsWith(`PSA.${r.psaume}.`)
  const poser = (type, plus = '') => {
    const cle = `${cible.id}|${cf}|${type}`
    if (!liens.has(cle)) liens.set(cle, { segment_id: cible.id, canon_id: cf, type,
      fiabilite: 'probable', provenance: 'editeur', arbitrage_requis: false,
      motif: `Référence attestée (Biblia Clerus) : ${cf}${plus}.` })
  }
  // La référence attestée est une CITATION (type 1). Pas de type 3 automatique :
  // le commentaire (§9.3) exige que l'auteur EXPLIQUE le verset, ce qui s'établit
  // en lecture, pas en dupliquant la citation. (`memePs` conservé si besoin futur.)
  void memePs
  poser(1)
}
console.log(`alignement : ${alignes}/${refs.filter(r => r.psaume).length} rattachées → ${liens.size} liens`)

if (DRY) {
  const l = [...parPs.entries()].map(([p, [r, ok]]) => ({ p, r, ok, t: ok / r })).sort((a, b) => a.t - b.t)
  console.log('\n── 12 pires psaumes (alignées/réfs) ─')
  for (const x of l.slice(0, 12)) console.log(`  Ps ${String(x.p).padStart(3)} : ${x.ok}/${x.r}`)
  console.log('\n(--dry : rien écrit)'); process.exit(0)
}

const ids = [...segsParPsaume.values()].flat().map(s => s.id)
for (let i = 0; i < ids.length; i += 300) await sb.from('liens_bibliques').delete().in('segment_id', ids.slice(i, i + 300))
const tab = [...liens.values()]
tab.forEach(verifierLienMecanique)   // garde-fou
for (let i = 0; i < tab.length; i += 500) { const { error } = await sb.from('liens_bibliques').insert(tab.slice(i, i + 500)); if (error) throw error }
console.log(`\n✓ ${tab.length} liens attestés écrits`)
