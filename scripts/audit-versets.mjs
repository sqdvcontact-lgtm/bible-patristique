// AUDIT DES TRADUCTIONS BIBLIQUES — repérage des versets mal alignés ou surnuméraires.
//
//   node scripts/audit-versets.mjs                    # rapport complet dans audit/
//   node scripts/audit-versets.mjs --trad TR0001      # une seule traduction
//   node scripts/audit-versets.mjs --recalibrer       # recalcule les facteurs de longueur
//   node scripts/audit-versets.mjs --n 40             # nb d'exemples par rubrique
//
// L'outil ne CORRIGE rien et n'écrit rien en base. Il lit `versets_v2` et rend une file
// de cas à examiner, triée par ce qui est le plus probablement fautif.
//
// Les règles vivent dans `_audit-versets-regles.mjs` (module pur, testé) : les seuils s'y
// discutent sans relancer un audit complet.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  FACTEURS, texteNet, estSuspendu, residus, ecartsDuCreneau, graviteEcart,
  partagerAbsents, mediane, SEUIL_SYSTEMATIQUE,
} from './_audit-versets-regles.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const arg = (nom, def) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : def }
const TRAD = arg('--trad', null)
const N_EXEMPLES = +arg('--n', 25)
const RECALIBRER = process.argv.includes('--recalibrer')
const TAILLE_PAGE = 1000 // l'API de données plafonne là ; on pagine jusqu'à épuisement

// ── Chargement ───────────────────────────────────────────────────────────────
async function chargerVersets() {
  const lignes = []
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    let q = sb.from('versets_v2')
      .select('trad_id, livre, canon_id, texte, ordre_slot, v_orig')
      .not('canon_id', 'is', null)
      .order('canon_id', { ascending: true })
      .order('trad_id', { ascending: true })
      .order('ordre_slot', { ascending: true })
      .range(debut, debut + TAILLE_PAGE - 1)
    if (TRAD) q = q.eq('trad_id', TRAD)
    const { data, error } = await q
    if (error) throw new Error(`Lecture de versets_v2 : ${error.message}`)
    lignes.push(...data)
    process.stdout.write(`\r  ${lignes.length} versets lus…`)
    if (data.length < TAILLE_PAGE) break
  }
  process.stdout.write('\n')
  return lignes
}

// ── Constitution des créneaux ────────────────────────────────────────────────
// Un créneau = un canon_id. Chaque traduction y verse un ou plusieurs versets source,
// qu'on recolle dans l'ordre où ils s'y présentent.
function construireCreneaux(lignes) {
  const creneaux = new Map()
  for (const l of lignes) {
    let c = creneaux.get(l.canon_id)
    if (!c) { c = { canon_id: l.canon_id, livre: l.livre, textes: {} }; creneaux.set(l.canon_id, c) }
    c.textes[l.trad_id] = (c.textes[l.trad_id] ? c.textes[l.trad_id] + ' ' : '') + (l.texte || '')
  }
  for (const c of creneaux.values()) {
    c.nets = Object.fromEntries(Object.entries(c.textes).map(([t, v]) => [t, texteNet(v)]))
  }
  return creneaux
}

// ── Recalibrage des facteurs (option) ────────────────────────────────────────
function recalibrer(creneaux) {
  const parTrad = new Map(Object.keys(FACTEURS).map(t => [t, []]))
  for (const c of creneaux.values()) {
    const presentes = Object.keys(c.nets).filter(t => c.nets[t].length > 0)
    if (presentes.length !== Object.keys(FACTEURS).length) continue // seulement les créneaux complets
    for (const t of presentes) parTrad.get(t).push(c.nets[t].length)
  }
  console.log('\nFacteurs recalculés (longueur MÉDIANE sur les créneaux complets) :')
  for (const [t, v] of parTrad) {
    if (!v.length) { console.log(`  ${t} : aucun créneau complet`); continue }
    console.log(`  ${t} : ${Math.round(mediane(v))}   (actuel : ${FACTEURS[t]}, sur ${v.length} créneaux)`)
  }
  console.log('\nReporter ces valeurs dans FACTEURS (_audit-versets-regles.mjs) si elles ont bougé.')
}

// ── Détecteurs ───────────────────────────────────────────────────────────────
function analyser(creneaux) {
  const ecarts = [], surnumeraires = [], absents = []

  // couverture : une traduction « couvre » un livre si elle y porte au moins 20 créneaux
  const compte = new Map()
  for (const c of creneaux.values()) {
    for (const t of Object.keys(c.nets)) {
      if (!c.nets[t].length) continue
      const cle = `${t}|${c.livre}`
      compte.set(cle, (compte.get(cle) || 0) + 1)
    }
  }
  const couvre = (t, livre) => (compte.get(`${t}|${livre}`) || 0) >= 20

  for (const c of creneaux.values()) {
    const presentes = Object.keys(c.nets).filter(t => c.nets[t].length > 0)

    // 1. écarts de longueur
    for (const e of ecartsDuCreneau(c.nets)) {
      const g = graviteEcart(e, estSuspendu(c.nets[e.trad_id]))
      if (g) ecarts.push({ ...e, gravite: g, canon_id: c.canon_id, livre: c.livre, extrait: c.nets[e.trad_id].slice(0, 110) })
    }

    // 2. éléments surnuméraires (sur le texte BRUT, le balisage compte ici)
    for (const [t, brut] of Object.entries(c.textes)) {
      const marques = residus(brut)
      if (marques.length) surnumeraires.push({ trad_id: t, canon_id: c.canon_id, livre: c.livre, marques, extrait: brut.slice(0, 110) })
    }

    // 3. créneaux absents d'une traduction qui couvre pourtant le livre
    if (presentes.length >= 3) {
      for (const t of Object.keys(FACTEURS)) {
        if (presentes.includes(t) || !couvre(t, c.livre)) continue
        absents.push({ trad_id: t, canon_id: c.canon_id, livre: c.livre, temoins: presentes.length })
      }
    }
  }
  return { ecarts, surnumeraires, ...partagerAbsents(absents) }
}

// ── Rapport ──────────────────────────────────────────────────────────────────
const ORDRE = ['P1-troncature-probable', 'P2-beaucoup-trop-court', 'P3-trop-court', 'P4-beaucoup-trop-long', 'P5-trop-long']

function rapport({ ecarts, surnumeraires, systematiques, isoles }, nbCreneaux) {
  const L = []
  const stamp = new Date().toISOString().slice(0, 10)
  L.push(`# Audit des traductions bibliques — ${stamp}`, '')
  L.push(`Corpus : ${nbCreneaux} créneaux canoniques, ${Object.keys(FACTEURS).length} traductions.`, '')

  L.push('## 1. Écarts de longueur', '')
  L.push('| Rang | Sens | Cas |', '|---|---|---|')
  for (const g of ORDRE) {
    const n = ecarts.filter(e => e.gravite === g).length
    if (n) L.push(`| ${g.split('-')[0]} | ${g.slice(3).replace(/-/g, ' ')} | ${n} |`)
  }
  L.push('')
  for (const g of ORDRE) {
    const lot = ecarts.filter(e => e.gravite === g).sort((a, b) => a.ratio - b.ratio)
    if (!lot.length) continue
    L.push(`### ${g} (${lot.length})`, '')
    L.push('| canon_id | trad | longueur | attendu | ratio | extrait |', '|---|---|---|---|---|---|')
    for (const e of lot.slice(0, N_EXEMPLES)) {
      L.push(`| ${e.canon_id} | ${e.trad_id} | ${e.longueur} | ${e.attendu} | ${e.ratio} | ${e.extrait.replace(/\|/g, '/')} |`)
    }
    if (lot.length > N_EXEMPLES) L.push('', `*(${lot.length - N_EXEMPLES} autres dans le CSV)*`)
    L.push('')
  }

  L.push('## 2. Éléments surnuméraires', '')
  const parMarque = new Map()
  for (const s of surnumeraires) for (const m of s.marques) {
    if (!parMarque.has(m)) parMarque.set(m, [])
    parMarque.get(m).push(s)
  }
  L.push('| Marque | Cas |', '|---|---|')
  for (const [m, lot] of [...parMarque].sort((a, b) => b[1].length - a[1].length)) L.push(`| ${m} | ${lot.length} |`)
  L.push('')
  for (const [m, lot] of [...parMarque].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`### ${m} (${lot.length})`, '')
    L.push('| canon_id | trad | extrait |', '|---|---|---|')
    for (const s of lot.slice(0, N_EXEMPLES)) L.push(`| ${s.canon_id} | ${s.trad_id} | ${s.extrait.replace(/\|/g, '/')} |`)
    L.push('')
  }

  L.push('## 3. Créneaux absents', '')
  L.push(`Le partage se fait à ${SEUIL_SYSTEMATIQUE} créneaux manquants dans un même livre.`, '')
  L.push('### 3a. Causes systématiques — À ÉCARTER, pas à corriger', '')
  const parLot = new Map()
  for (const a of systematiques) {
    const cle = `${a.trad_id}|${a.livre}`
    if (!parLot.has(cle)) parLot.set(cle, a.dans_ce_livre)
  }
  L.push('| trad | livre | créneaux |', '|---|---|---|')
  for (const [cle, n] of [...parLot].sort((a, b) => b[1] - a[1])) {
    const [t, livre] = cle.split('|')
    L.push(`| ${t} | ${livre} | ${n} |`)
  }
  L.push('')
  L.push(`### 3b. Cas isolés — LA FILE À EXAMINER (${isoles.length})`, '')
  L.push('| canon_id | trad absente | livre | témoins |', '|---|---|---|---|')
  for (const a of isoles.sort((x, y) => y.temoins - x.temoins || x.canon_id.localeCompare(y.canon_id))) {
    L.push(`| ${a.canon_id} | ${a.trad_id} | ${a.livre} | ${a.temoins} |`)
  }
  L.push('')
  return L.join('\n')
}

function csv({ ecarts, surnumeraires, isoles }) {
  const l = ['rubrique,canon_id,trad_id,livre,detail,longueur,attendu,ratio']
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`
  for (const e of ecarts) l.push(['ecart', e.canon_id, e.trad_id, e.livre, e.gravite, e.longueur, e.attendu, e.ratio].map(q).join(','))
  for (const s of surnumeraires) l.push(['surnumeraire', s.canon_id, s.trad_id, s.livre, s.marques.join(' '), '', '', ''].map(q).join(','))
  for (const a of isoles) l.push(['absent', a.canon_id, a.trad_id, a.livre, `${a.temoins} témoins`, '', '', ''].map(q).join(','))
  return l.join('\n')
}

// ── Marche ───────────────────────────────────────────────────────────────────
const lignes = await chargerVersets()
const creneaux = construireCreneaux(lignes)
console.log(`  ${creneaux.size} créneaux canoniques constitués.`)

if (RECALIBRER) { recalibrer(creneaux); process.exit(0) }

const resultat = analyser(creneaux)
const stamp = new Date().toISOString().slice(0, 10)
mkdirSync('audit', { recursive: true })
writeFileSync(`audit/audit-versets-${stamp}.md`, rapport(resultat, creneaux.size), 'utf8')
writeFileSync(`audit/audit-versets-${stamp}.csv`, csv(resultat), 'utf8')

console.log('')
console.log(`  écarts de longueur      : ${resultat.ecarts.length}`)
console.log(`    dont P1 (troncature)  : ${resultat.ecarts.filter(e => e.gravite === 'P1-troncature-probable').length}`)
console.log(`  éléments surnuméraires  : ${resultat.surnumeraires.length}`)
console.log(`  absents, systématiques  : ${resultat.systematiques.length}  (à écarter)`)
console.log(`  absents, cas isolés     : ${resultat.isoles.length}  (à examiner)`)
console.log('')
console.log(`  → audit/audit-versets-${stamp}.md`)
console.log(`  → audit/audit-versets-${stamp}.csv`)
