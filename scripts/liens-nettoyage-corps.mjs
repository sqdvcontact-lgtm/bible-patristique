// PASSE 6 — NETTOYAGE DU CORPS (charte §25, règles 1-4).
//
// Une fois les liens extraits, la référence imprimée « (2 Tm 3, 16) » fait double
// emploi avec le lien : on la retire du texte affiché. Mais JAMAIS à l'aveugle —
// on ne retire une parenthèse que si un lien `editeur` existe pour CE segment et
// CETTE cible (garantie de redondance). Les références mises de côté (Vulgate non
// convertie, hors-ossature) n'ont pas de lien : elles restent en place.
//
// Sauvegarde : segment_texte d'origine copié dans texte_original (si vide) avant
// toute modification — réversible.
//
//   node scripts/liens-nettoyage-corps.mjs A0013O0002 --dry [--partie="Prima Pars"]
//   node scripts/liens-nettoyage-corps.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliser, RENVOIS_INTERNES, RE_PARENTHESE, RE_REF, RE_PAREN_NUM,
  chargerAbrev, chargerOssature, creerResolveur } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-nettoyage-corps.mjs <id_oeuvre> [--dry] [--partie="..."]'); process.exit(1) }

// ── Résolveur (socle commun) ──────────────────────────────────────────────────
const ABREV = await chargerAbrev(sb)
const { canon, chapitres, parHebreu, unChapitre } = await chargerOssature(sb)
const { codeLivre, livreEnAmont, cibleDe } = creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre })

// ── Segments + liens editeur ──────────────────────────────────────────────────
const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, segment_numero, segment_texte, texte_original').eq('id_oeuvre', OEUVRE).eq('nature', 'texte')
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data } = await q.order('id').range(from, from + 999)
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}
const ids = segs.map(s => s.id)
const linked = new Set()   // `${segment_id}|${cible}`  (cible = canon_id ou livre.ch)
for (let i = 0; i < ids.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre, provenance').in('segment_id', ids.slice(i, i + 300))
  for (const l of data ?? []) if (l.provenance === 'editeur') linked.add(`${l.segment_id}|${l.canon_id ?? l.livre + '.' + l.chapitre}`)
}
console.log(`${segs.length} segments${PARTIE ? ` (${PARTIE})` : ''} · ${linked.size} cibles editeur`)

// ── Détection des spans à retirer (mêmes regex/résolveur que l'extracteur) ─────
/** Spans [start,end,mode] à retirer d'un segment. mode 'paren' = parenthèse
 *  entière (livre dedans) ; 'num' = parenthèse numérique seule (livre en amont,
 *  conservé). On ne retient QUE les spans dont la cible a un lien editeur. */
function spansARetirer(s) {
  const texte = String(s.segment_texte || '')
  const spans = []
  for (const par of texte.matchAll(RE_PARENTHESE)) {
    for (const m of par[1].matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v] = m
      if (RENVOIS_INTERNES.has(normaliser(nom))) continue
      const livre = codeLivre(rang, nom); if (!livre) continue
      const cible = cibleDe(livre, chBrut, v)
      if (cible && linked.has(`${s.id}|${cible}`)) { spans.push([par.index, par.index + par[0].length, 'paren']); break }
    }
  }
  for (const m of texte.matchAll(RE_PAREN_NUM)) {
    const [full, chBrut, v] = m
    const livre = livreEnAmont(texte, m.index); if (!livre) continue
    const cible = cibleDe(livre, chBrut, v)
    if (cible && linked.has(`${s.id}|${cible}`)) spans.push([m.index, m.index + full.length, 'num'])
  }
  return spans.sort((a, b) => a[0] - b[0])
}

/** Retire les spans (de droite à gauche) et remet la ponctuation d'aplomb. */
function nettoyer(texte, spans) {
  let t = texte
  for (const [start, end] of [...spans].sort((a, b) => b[0] - a[0])) {
    let a = start, b = end
    // Absorber UNE espace adjacente (avant de préférence) pour ne pas laisser de trou.
    if (t[a - 1] === ' ') a--
    else if (t[b] === ' ') b++
    t = t.slice(0, a) + t.slice(b)
  }
  return t
    .replace(/\(\s*\)/g, '')       // parenthèses vides résiduelles
    .replace(/[ \t]{2,}/g, ' ')    // espaces doubles
    .replace(/[ \t]+([,.])/g, '$1') // espace avant virgule/point SEULEMENT
    // NE PAS toucher aux espaces avant ; : ! ? » « — insécables voulus (typo FR).
    .replace(/[ \t]+$/gm, '')
    .trim()
}

const modifs = []
for (const s of segs) {
  const spans = spansARetirer(s)
  if (!spans.length) continue
  const nouveau = nettoyer(String(s.segment_texte || ''), spans)
  if (nouveau !== s.segment_texte) modifs.push({ s, nouveau, n: spans.length })
}

const totalRefs = modifs.reduce((a, m) => a + m.n, 0)
console.log(`${modifs.length} segments à nettoyer · ${totalRefs} références retirées`)

if (DRY) {
  console.log('\n── échantillon (avant → après)')
  for (const m of modifs.slice(0, 10)) {
    const av = m.s.segment_texte.replace(/\s+/g, ' ')
    const ap = m.nouveau.replace(/\s+/g, ' ')
    // Fenêtre autour de la première divergence
    let i = 0; while (i < av.length && av[i] === ap[i]) i++
    console.log(`  #${m.s.segment_numero}`)
    console.log(`    AV …${av.slice(Math.max(0, i - 35), i + 45)}…`)
    console.log(`    AP …${ap.slice(Math.max(0, i - 35), i + 40)}…`)
  }
  console.log('\n(--dry : rien écrit)')
  process.exit(0)
}

// Écriture : sauvegarde texte_original (si vide) puis nouveau segment_texte.
let ok = 0
for (const m of modifs) {
  const patch = { segment_texte: m.nouveau }
  if (m.s.texte_original == null) patch.texte_original = m.s.segment_texte
  const { error } = await sb.from('segments').update(patch).eq('id', m.s.id)
  if (error) throw error
  ok++
}
console.log(`\n✓ ${ok} segments nettoyés (sauvegarde dans texte_original) · ${totalRefs} références retirées`)
