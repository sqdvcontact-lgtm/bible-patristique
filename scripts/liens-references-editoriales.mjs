// LIENS À PARTIR DES RÉFÉRENCES DONNÉES PAR L'ÉDITION (charte §25.1).
//
// C'est la passe qui précède toutes les autres : quand l'édition écrit
// « (1 Co 1, 10) », le lien est DÉJÀ ÉTABLI. On ne devine plus, on lit. Aucune
// méthode d'appariement n'approche cette fiabilité — sur la Somme théologique,
// une seule passe a produit plus de liens que tout l'appariement sur Job.
//
// Ces liens partent en `provenance = 'editeur'` : ce sont des faits de source.
//
//   node scripts/liens-references-editoriales.mjs A0013O0002 --dry
//   node scripts/liens-references-editoriales.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
if (!OEUVRE) { console.error('usage : node scripts/liens-references-editoriales.mjs <id_oeuvre> [--dry]'); process.exit(1) }

const normaliser = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s.]/g, '')

/** Les chiffres romains sont fréquents dans les éditions anciennes, aussi bien
 *  pour le rang du livre (« I Co ») que pour le chapitre (« Joh. VI, 89 »). */
const ROMAINS = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 }
function versEntier(s) {
  const t = String(s).trim().toLowerCase()
  if (/^\d+$/.test(t)) return +t
  if (!/^[ivxlcdm]+$/.test(t)) return null
  const V = { i:1, v:5, x:10, l:50, c:100, d:500, m:1000 }
  let n = 0
  for (let k = 0; k < t.length; k++) {
    const a = V[t[k]], b = V[t[k + 1]]
    n += b && a < b ? -a : a
  }
  return n || null
}

/** RENVOIS INTERNES — ce ne sont PAS des livres bibliques. « Ibid. 13, 14 »
 *  renvoie au passage précédent, « Question 22. 48 » à un article de la Somme.
 *  Sans cette liste, ils seraient cherchés dans la Bible et finiraient par y
 *  trouver quelque chose : c'est ainsi qu'on fabrique des faux. */
const RENVOIS_INTERNES = new Set([
  'ibid', 'ibidem', 'idem', 'id', 'op', 'opcit', 'loccit', 'cit',
  'question', 'q', 'art', 'article', 'chap', 'chapitre', 'livre',
  'supra', 'infra', 'cidessus', 'cidessous', 'sect', 'section', 'part', 'partie',
  'marche', 'homelie', 'sermon', 'discours', 'lettre', 'epitre', 'traite',
  // Relevés par le rapport des non-résolues sur Cyrille et Contre Celse :
  // abréviations d'apparat, non de livres bibliques.
  'voy', 'voyez', 'vid', 'vide', 'foy', 'serm', 'hom', 'liv', 'livr', 'lett',
  'vers', 'verset', 'ib', 'note', 'not', 'missel', 'preface', 'prol', 'prologue',
  'canon', 'const', 'concile', 'symb', 'symbole', 'cat', 'catech',
])

// ── Table d'équivalence des abréviations ────────────────────────────────────
// Elle vit en base (`abreviations_bibliques`), non plus dans ce fichier : une
// forme inconnue est une référence perdue en silence, et chaque script portait
// jusqu'ici son propre dictionnaire, donc ses propres lacunes.
// Enrichir avec scripts/abreviations-inconnues.mjs → abreviations-peupler.mjs.
const ABREV = new Map()
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('abreviations_bibliques')
    .select('forme, livre').order('forme').range(from, from + 999)
  if (error) throw error
  if (!data?.length) break
  for (const r of data) ABREV.set(r.forme, r.livre)
  if (data.length < 1000) break
}
console.log(`abréviations : ${ABREV.size} formes connues`)

/** Résout un nom de livre, avec son éventuel rang (« 1 Cor », « I Co », « Cor »). */
function codeLivre(rangBrut, nomBrut) {
  const nom = normaliser(nomBrut)
  if (!nom || RENVOIS_INTERNES.has(nom)) return null
  const rang = rangBrut ? versEntier(rangBrut) : null

  // D'abord la forme complète : « 1Jn » est dans la table et vaut 1JN, alors que
  // décomposer donnerait « Jn » → JHN, l'Évangile au lieu de l'épître.
  if (rang) {
    const entier = ABREV.get(`${rang}${nom}`)
    if (entier) return entier
  }
  const base = ABREV.get(nom)
  if (!base) return null
  if (!rang) return base
  // « 2 Cor » à partir de « Cor » → 1CO : on décale le rang.
  const m = base.match(/^([1-4])(.+)$/)
  if (m) return `${rang}${m[2]}`
  // Le livre n'a pas de jumeau numéroté : le chiffre n'est pas un rang de livre.
  return null
}

// ── Ossature ────────────────────────────────────────────────────────────────
//
// LES PSAUMES EXIGENT UNE CONVERSION (charte §18). Notre ossature suit la
// numérotation grecque : `PSA.34` y est le Ps 35 hébreu. Les éditions françaises
// modernes citent en hébraïque. Sans conversion, « Ps 34, 16 » — « Les yeux du
// Seigneur sont fixés sur les justes » — atterrit sur PSA.34.16, qui dit « ils
// grincent des dents ». Faux parfaitement silencieux : le créneau existe, la clé
// étrangère est satisfaite, rien ne proteste.
const canon = new Set()
const chapitres = new Set()      // « LIVRE.ch » réellement présents
const parHebreu = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, ch_heb, v_heb').order('id').range(from, from + 999)
  if (!data?.length) break
  for (const r of data) {
    canon.add(r.id)
    chapitres.add(`${r.livre}.${r.ch_canon}`)
    if (r.ch_heb != null && r.v_heb != null) parHebreu.set(`${r.livre}.${r.ch_heb}.${r.v_heb}`, r.id)
  }
  if (data.length < 1000) break
}
const NUMEROTATION_HEBRAIQUE = new Set(['PSA'])
console.log(`ossature : ${canon.size} créneaux`)

const segs = []
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, segment_texte')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('id').range(from, from + 999)
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}

// Une parenthèse peut porter plusieurs références (« cf. Jn 13, 35 et Luc 10, 20 »),
// un préfixe « cf. », des chiffres romains, ou n'indiquer qu'un chapitre.
const RE_PARENTHESE = /\(([^)]{3,90})\)/g
// Le nom du livre porte une MAJUSCULE initiale — c'est vrai de toute abréviation
// biblique, et cela suffit à écarter le bruit : sans cette exigence, « et 3, 5 »
// ou « de 12, 4 » étaient lus comme des références et encombraient le rapport
// des formes non résolues, masquant les vraies lacunes du dictionnaire.
const RE_REF = /(?:^|[\s;,]|\bcf\.?\s*|\bet\s+|\bvoir\s+)(?:([1-4]|[IV]{1,3})\s+)?([A-ZÉÈÀÎÔÜÇ][A-Za-zÉÈÀÎÔÜÇéèêàïôûç]{1,15})\.?\s+([0-9]{1,3}|[IVXLCDM]{1,7})\s*(?:[,.]\s*([0-9]{1,3})(?:\s*[-–]\s*([0-9]{1,3}))?)?/g

const liens = []
const stats = { refs: 0, resolues: 0, chapitres: 0, plages: 0, horsOssature: 0, renvoisInternes: 0 }
const inconnus = new Map()
const vus = new Set()

for (const s of segs) {
  for (const par of String(s.segment_texte || '').matchAll(RE_PARENTHESE)) {
    for (const m of par[1].matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v, vFin] = m
      const brut = `(${par[1].trim()})`
      if (RENVOIS_INTERNES.has(normaliser(nom))) { stats.renvoisInternes++; continue }
      stats.refs++
      const livre = codeLivre(rang, nom)
      if (!livre) {
        const cle = (rang ? rang + ' ' : '') + nom
        inconnus.set(cle, (inconnus.get(cle) ?? 0) + 1)
        continue
      }
      const ch = versEntier(chBrut)
      if (!ch) continue

      // Chapitre seul : la table sait viser un chapitre entier, ce qui vaut mieux
      // que de choisir arbitrairement son premier verset.
      if (v === undefined) {
        // Le chapitre doit exister : « Lam 13 » n'a aucun sens, Lamentations en
        // compte cinq. Un trigger de la base le refuse — mieux vaut ne pas le lui
        // soumettre, sinon c'est tout le lot d'insertion qui échoue.
        if (!chapitres.has(`${livre}.${ch}`)) {
          stats.horsOssature++
          inconnus.set(`${livre} ch.${ch} (chapitre inexistant)`, (inconnus.get(`${livre} ch.${ch} (chapitre inexistant)`) ?? 0) + 1)
          continue
        }
        const cle = `${s.id}|${livre}.ch${ch}`
        if (vus.has(cle)) continue
        vus.add(cle); stats.resolues++; stats.chapitres++
        liens.push({ segment_id: s.id, livre, chapitre: ch, type: 1,
          fiabilite: 'probable', provenance: 'editeur', arbitrage_requis: false,
          motif: `Référence donnée par l'édition, au chapitre entier : ${brut}` })
        continue
      }

      const cible = NUMEROTATION_HEBRAIQUE.has(livre)
        ? parHebreu.get(`${livre}.${ch}.${+v}`)
        : `${livre}.${ch}.${+v}`
      // Conversion impossible : ne jamais se rabattre sur le créneau direct, qui
      // existe souvent et serait faux.
      if (!cible || !canon.has(cible)) {
        stats.horsOssature++
        inconnus.set(`${livre} ${ch},${v} (hors ossature)`, (inconnus.get(`${livre} ${ch},${v} (hors ossature)`) ?? 0) + 1)
        continue
      }
      const cle = `${s.id}|${cible}`
      if (vus.has(cle)) continue
      vus.add(cle); stats.resolues++
      if (vFin) stats.plages++
      liens.push({ segment_id: s.id, canon_id: cible, type: 1,
        fiabilite: 'probable', provenance: 'editeur', arbitrage_requis: false,
        motif: `Référence donnée par l'édition : ${brut}` + (vFin ? ` (plage jusqu'au v. ${vFin})` : '') })
    }
  }
}

console.log(`\n${segs.length} segments · ${stats.refs} références lues`)
console.log(`  résolues              : ${stats.resolues}${stats.chapitres ? ` · ${stats.chapitres} au chapitre` : ''}${stats.plages ? ` · ${stats.plages} plages` : ''}`)
console.log(`  renvois internes écartés : ${stats.renvoisInternes}`)
console.log(`  hors ossature            : ${stats.horsOssature}`)
if (inconnus.size) {
  const top = [...inconnus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  console.log(`  non résolues : ${top.map(([k, n]) => `${k}×${n}`).join(', ')}`)
}

if (DRY) {
  console.log('\n── échantillon')
  for (const l of liens.slice(0, 12)) {
    const c = l.canon_id ?? `${l.livre} ch.${l.chapitre} (entier)`
    console.log(`  ${c.padEnd(26)} ${l.motif.slice(0, 66)}`)
  }
  console.log('\n(--dry : rien écrit)')
  process.exit(0)
}

// On n'écrit que ce qui manque : la contrainte d'unicité rejetterait tout le lot.
const deja = new Set()
for (let i = 0; i < segs.length; i += 500) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre, type')
    .in('segment_id', segs.slice(i, i + 500).map(s => s.id))
  for (const l of data ?? []) deja.add(`${l.segment_id}|${l.canon_id ?? l.livre + '.ch' + l.chapitre}|${l.type}`)
}
const aEcrire = liens.filter(l => !deja.has(`${l.segment_id}|${l.canon_id ?? l.livre + '.ch' + l.chapitre}|${l.type}`))
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${aEcrire.length} liens écrits (provenance = editeur) · ${liens.length - aEcrire.length} déjà présents`)
