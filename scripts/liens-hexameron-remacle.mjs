// AMORCE ÉDITORIALE DE L'HEXAÉMÉRON (Basile, A0017O0001) — Passe 1 reconstruite.
//
// Les références bibliques de l'édition (Auger) ont été PERDUES à l'import : la
// base n'en porte que 9. Elles sont intactes sur remacle.org (homelies.htm, ~76
// réfs françaises « (Genèse. 1. 1) »). On les re-récupère et on les REALIGNE sur
// nos segments par recouvrement FRANÇAIS/FRANÇAIS (même traduction Auger) — la
// méthode « Biblia Clerus » : la source dit QUEL verset, le texte dit QUEL segment.
//
// FRONTIÈRE : cette passe est MÉCANIQUE. Elle ne pose que des cibles attestées en
//   « à constituer » (+ arbitrage_requis) ; le TYPE (1/3/4) se tranche en LECTURE.
// PSAUMES : édition ANCIENNE, déjà à la numérotation grecque = notre ossature.
//   On NE convertit PAS (contrairement à liens-references-editoriales).
//
//   node scripts/liens-hexameron-remacle.mjs --dry     (rapport, rien écrit)
//   node scripts/liens-hexameron-remacle.mjs           (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliser, versEntier, RENVOIS_INTERNES, RE_REF, versetsDe,
  chargerAbrev, chargerOssature, creerResolveur, verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const OEUVRE = 'A0017O0001'
const DRY = process.argv.includes('--dry')
const HTML = 'scripts/_hexameron_remacle.htm'   // source Auger re-scrapée (remacle.org/bloodwolf/eglise/basile/homelies.htm)

// ── Découpage des homélies de remacle ───────────────────────────────────────
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
// Notre ref_niv1 (une par homélie ; la X regroupe les deux apocryphes).
const NIV1 = ['Première homélie', 'Deuxième homélie', 'Troisième homélie', 'Quatrième homélie',
  'Cinquième homélie', 'Sixième homélie', 'Septième homélie', 'Huitième homélie',
  'Neuvième homélie', 'Dixième homélie (apocryphe)']

function plain(s) {
  return s.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

const html = readFileSync(HTML, 'utf8')
const anchor = ROMAN.map(r => { const m = new RegExp(`name="${r}"`).exec(html); return m ? m.index : -1 })
const homelies = ROMAN.map((r, i) => plain(html.slice(anchor[i], i < 9 ? anchor[i + 1] : html.length)))

// ── Ossature + résolveur (sans conversion des psaumes ici) ──────────────────
const ABREV = await chargerAbrev(sb)
const { canon, chapitres, parHebreu, unChapitre } = await chargerOssature(sb)
const { codeLivre } = creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre })

// Cible directe : PAS de conversion hébraïque (édition ancienne déjà grecque).
function cibleDirecte(livre, ch, v) {
  if (v === undefined) return chapitres.has(`${livre}.${ch}`) ? { chapitre: ch } : null
  const c = `${livre}.${ch}.${+v}`
  return canon.has(c) ? { canon_id: c } : null
}

// ── Nos segments, groupés par homélie ───────────────────────────────────────
const parNiv1 = new Map(NIV1.map(n => [n, []]))
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv1, segment_texte, texte_original')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('segment_numero').range(from, from + 999)
  if (!data?.length) break
  for (const s of data) { s.norm = motsDe(s.texte_original ?? s.segment_texte); if (parNiv1.has(s.ref_niv1)) parNiv1.get(s.ref_niv1).push(s) }
  if (data.length < 1000) break
}

function motsDe(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 2)
}
// n-grammes de mots (shingles) d'un tableau de mots.
function shingles(mots, n) {
  const out = new Set()
  for (let i = 0; i + n <= mots.length; i++) out.add(mots.slice(i, i + n).join(' '))
  return out
}
// Précalcul des shingles-4 de chaque segment.
for (const segs of parNiv1.values()) for (const s of segs) s.sh4 = shingles(s.norm, 4)

// Rattache une aiguille (contexte français précédant la réf) au bon segment.
// PIÈGE (mémoire) : la référence de l'édition est en FIN de phrase — la citation
// qu'elle vise est juste AVANT elle. Une fenêtre large accroche le segment
// PRÉCÉDENT (décalage d'un cran). On ancre donc sur la QUEUE : poids croissant
// vers la référence, et on EXIGE qu'un shingle des tout derniers mots matche
// (la réf appartient au segment qui porte la phrase citée).
function aligner(needleMots, segs) {
  const grams = []
  for (let i = 0; i + 4 <= needleMots.length; i++) grams.push(needleMots.slice(i, i + 4).join(' '))
  if (!grams.length) return null
  const seuilQueue = grams.length - 5   // les 5 derniers shingles = la phrase citée
  let best = null, bestScore = 0, bestFallback = null, bestFbScore = 0
  for (const s of segs) {
    let sc = 0, queue = false
    for (let k = 0; k < grams.length; k++) if (s.sh4.has(grams[k])) { sc += 1 + k; if (k >= seuilQueue) queue = true }
    if (sc > bestFbScore) { bestFbScore = sc; bestFallback = s }
    if (queue && sc > bestScore) { bestScore = sc; best = s }
  }
  if (best) return { seg: best, score: bestScore, queue: true }
  return bestFallback ? { seg: bestFallback, score: bestFbScore, queue: false } : null
}

// ── Extraction des références par homélie + alignement ──────────────────────
const RE_PAR = /\(([^)]{3,60})\)/g
const liens = []
const stats = { refs: 0, resolus: 0, horsOssature: 0, alignes: 0, nonAlignes: 0, faibles: 0 }
const inconnus = new Map()
const echantillon = []

for (let i = 0; i < 10; i++) {
  const texte = homelies[i]
  const segs = parNiv1.get(NIV1[i]) || []
  for (const par of texte.matchAll(RE_PAR)) {
    const inner = par[1]
    if (!/\d/.test(inner) || !/[A-Za-zÀ-ÿ]/.test(inner)) continue
    // Le dépouillement des balises a inséré des espaces parasites (« Act . 7. 20 »,
    // « I. Cor »). Recoller la ponctuation et convertir le rang romain pointé
    // (« I. Cor » → « I Cor ») pour que RE_REF reconnaisse la référence.
    const innerN = inner.replace(/\s+([.,;])/g, '$1').replace(/\b([IV]{1,3})\.\s+(?=[A-ZÉÈ])/g, '$1 ')
    const pos = par.index
    // Contexte français : ~170 caractères précédant la parenthèse (la phrase citée).
    const needle = motsDe(texte.slice(Math.max(0, pos - 170), pos))
    let matched = null
    for (const m of innerN.matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v, vFin, enumTail] = m
      if (RENVOIS_INTERNES.has(normaliser(nom))) continue
      const livre = codeLivre(rang, nom)
      if (!livre) { const c = (rang ? rang + ' ' : '') + nom; inconnus.set(c, (inconnus.get(c) ?? 0) + 1); continue }
      stats.refs++
      const ch = versEntier(chBrut); if (!ch) continue
      if (!matched) matched = aligner(needle, segs)   // aligner une fois par parenthèse
      const versets = versetsDe(v, vFin, enumTail)
      const cibles = versets.length ? versets.map(vv => cibleDirecte(livre, ch, String(vv)))
        : [cibleDirecte(livre, ch, undefined)]
      for (const cible of cibles) {
        if (!cible) { stats.horsOssature++; inconnus.set(`${livre} ${ch}${v ? ',' + v : ''} (hors ossature)`, (inconnus.get(`${livre} ${ch}${v ? ',' + v : ''} (hors ossature)`) ?? 0) + 1); continue }
        stats.resolus++
        if (!matched || matched.score <= 0) { stats.nonAlignes++; continue }
        if (!matched.queue) stats.faibles++   // pas d'ancrage en queue = placement incertain
        liens.push({
          segment_id: matched.seg.id,
          canon_id: cible.canon_id ?? null,
          livre: cible.canon_id ? null : livre,
          chapitre: cible.canon_id ? null : cible.chapitre,
          type: 4, fiabilite: 'à constituer', provenance: 'editeur', arbitrage_requis: true,
          motif: `Référence de l'édition (remacle, réalignée ; type à établir en lecture) : (${inner.trim()})`
        })
        stats.alignes++
        if (echantillon.length < 20) echantillon.push({ hom: ROMAN[i], ref: inner.trim(), cible: cible.canon_id ?? `${livre} ch.${cible.chapitre}`, seg: matched.seg.segment_numero, score: matched.score, extrait: (matched.seg.texte_original ?? matched.seg.segment_texte).slice(0, 90) })
      }
    }
  }
}

console.log(`\n${stats.refs} références · ${stats.resolus} résolues · ${stats.horsOssature} hors ossature`)
console.log(`alignées : ${stats.alignes} (dont ${stats.faibles} score faible=2) · non alignées : ${stats.nonAlignes}`)
if (inconnus.size) {
  const top = [...inconnus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log(`non résolues/hors ossature : ${top.map(([k, n]) => `${k}×${n}`).join(', ')}`)
}
console.log('\n── échantillon d\'alignement (à contrôler) ──')
for (const e of echantillon) console.log(`  H${e.hom} (${e.ref}) → ${e.cible} @seg#${e.seg} sc${e.score} : ${e.extrait}…`)

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0) }

// Dédup contre l'existant (unicité segment+cible+type ; « à constituer » ne recouvre pas une cible déjà liée).
const dejaCible = new Set()
const ids = [...parNiv1.values()].flat().map(s => s.id)
for (let i = 0; i < ids.length; i += 500) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre')
    .in('segment_id', ids.slice(i, i + 500))
  for (const l of data ?? []) dejaCible.add(`${l.segment_id}|${l.canon_id ?? l.livre + '.ch' + l.chapitre}`)
}
const aEcrire = liens.filter(l => !dejaCible.has(`${l.segment_id}|${l.canon_id ?? l.livre + '.ch' + l.chapitre}`))
aEcrire.forEach(verifierLienMecanique)
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${aEcrire.length} liens écrits (à constituer, editeur) · ${liens.length - aEcrire.length} déjà présents`)
