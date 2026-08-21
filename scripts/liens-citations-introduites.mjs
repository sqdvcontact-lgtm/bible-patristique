// Liens à partir des FORMULES D'INTRODUCTION — passe transverse, toute œuvre.
//
// Un Père annonce presque toujours ce qu'il cite : « il est écrit », « comme dit
// l'Apôtre », « le Psalmiste dit ». Ces formules valent deux choses :
//
//   1. elles signalent qu'une citation suit — utile là où les guillemets manquent ;
//   2. elles disent SOUVENT DE QUEL LIVRE — et c'est le plus précieux.
//
// La leçon de la passe sur Job est en effet que le score lexical ne discrimine
// rien à lui seul : ce qui fait tomber juste, c'est de RESTREINDRE le champ de
// recherche. « L'Apôtre dit » ramène la recherche des 31 000 versets du canon aux
// ~2 000 des épîtres pauliniennes — un facteur quinze sur le risque de rencontre
// fortuite.
//
//   node scripts/liens-citations-introduites.mjs A0010O0100 --dry
//   node scripts/liens-citations-introduites.mjs A0010O0100
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { stemmes, construireIdf, profilVerset, profilCitation, scoreProfil, verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
// Restreindre à une partie (ref_niv1), p. ex. --partie="Supplément".
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-citations-introduites.mjs <id_oeuvre> [--dry] [--partie="Supplément"]'); process.exit(1) }

const PAULINIENNES = ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB']
const EVANGILES    = ['MAT','MRK','LUK','JHN']
const PROPHETES    = ['ISA','JER','LAM','BAR','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL']
const SAPIENTIAUX  = ['PRO','ECC','SNG','WIS','SIR','JOB']

/** Formules d'introduction, du plus précis au plus vague. La PREMIÈRE qui
 *  s'applique l'emporte : « le Psalmiste » avant « il est écrit ». */
const FORMULES = [
  { motif: /(psalmiste|david)\s*(dit|s.écrie|chante|a dit)?[^.]{0,20}$/i, livres: ['PSA'],        nom: 'psalmiste' },
  { motif: /(saint\s+paul|l.ap[oô]tre)[^.]{0,25}$/i,                      livres: PAULINIENNES,  nom: 'Paul' },
  { motif: /(l.[ée]vang(ile|éliste)|le\s+sauveur|notre-seigneur|j[ée]sus[- ]christ)[^.]{0,25}$/i, livres: EVANGILES, nom: 'Évangile' },
  { motif: /(le\s+proph[eè]te|isa[iï]e|j[ée]r[ée]mie|[ée]z[ée]chiel|daniel)[^.]{0,25}$/i, livres: PROPHETES, nom: 'prophète' },
  { motif: /(la\s+sagesse|salomon|l.eccl[ée]siast)[^.]{0,25}$/i,          livres: SAPIENTIAUX,   nom: 'sapientiaux' },
  // Vague : signale une citation, sans dire d'où. On cherche alors partout — mais
  // le seuil est relevé d'autant, faute d'indice pour restreindre.
  { motif: /(il\s+est\s+[ée]crit|l.[ée]criture\s+(dit|porte)|comme\s+(il\s+est\s+dit|dit|le\s+dit))[^.]{0,25}$/i, livres: null, nom: 'écrit' },
]

// Seuils du score amélioré (IDF + bigrammes, échelle différente du Dice brut).
// Sans indice de livre (formule vague), la rencontre fortuite devient probable :
// on exige davantage. MARGE : le meilleur doit devancer nettement le 2ᵉ candidat,
// sinon l'appariement est ambigu et rejeté.
const SEUIL_CIBLE  = 0.28
const SEUIL_PARTOUT = 0.42
const MARGE = 0.06

const ancienneGraphie = m => m.replace(/oi/g, 'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants')
const mots = s => (s || '').replace(/<[^>]+>/g, ' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter(m => m.length > 2).map(m => ancienneGraphie(m).slice(0, 5))
const VIDES = new Set(['les','des','que','qui','pour','dans','avec','est','son','sur','plus','tout','tous','par','une','aux','ses','leur','ils','elle','vous','nous','mais','comme','cette','ces','pas','ont','sont'])
const sac = s => new Set(mots(s).filter(m => !VIDES.has(m)))
function dice(a, b) {
  if (!a.size || !b.size) return 0
  let i = 0; for (const m of a) if (b.has(m)) i++
  return (2 * i) / (a.size + b.size)
}

// ── Chargement (paginé) ──────────────────────────────────────────────────────
// PostgREST plafonne à 1000 lignes : sans pagination, sur une grande œuvre (la
// Cité de Dieu en a 9 486, la Somme 32 367) le script ne voyait que le premier
// millième de segments — d'où des rendements dérisoires qui étaient un artefact,
// non une propriété de la méthode.
const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments')
    .select('id, segment_numero, segment_texte').eq('id_oeuvre', OEUVRE).in('nature', ['texte', 'citation'])
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data, error } = await q.order('segment_numero').range(from, from + 999)
  if (error) throw error
  segs.push(...data); if (data.length < 1000) break
}

/** RÉFÉRENCES NON BIBLIQUES — à signaler, jamais à rattacher de force.
 *
 *  Un Père cite aussi les profanes, ses prédécesseurs, et des livres hors du
 *  canon. Ces renvois n'ont pas de `canon_id` et n'en auront jamais : les laisser
 *  chercher dans la Bible produirait des faux, puisque l'appariement finit
 *  toujours par trouver quelque chose. On les consigne donc comme liens SANS
 *  CIBLE, en `fiabilite = 'à constituer'` avec un motif qui les qualifie — la
 *  contrainte `cible_unique` prévoit exactement ce cas. Ils remontent ainsi dans
 *  la file d'arbitrage au lieu de se perdre.
 */
const NON_BIBLIQUES = [
  { motif: /\b(Platon|Aristote|Cic[ée]ron|S[ée]n[eè]que|Virgile|Hom[eè]re|Plotin|Porphyre|Varron|Salluste|T[ée]rence|Bo[èe]ce|Macrobe|Ptol[ée]m[ée]e|Avicenne|Averro[èe]s|Ma[iï]monide)\b/g, genre: 'auteur profane' },
  { motif: /\b(Augustin|Cyprien|Ambroise|Tertullien|Origène|J[ée]r[ôo]me|Ir[ée]n[ée]e|Chrysostome|Basile|Gr[ée]goire|Isidore|B[èe]de|Denys|Anselme|Bernard|Hilaire|L[ée]on|Damasc[èe]ne|Athanase|Cyrille|[ÉE]piphane|Cassien|Cassiodore|Hugues|Jean\s+Damasc[èe]ne)\b/g, genre: 'Père de l’Église' },
  { motif: /\b(H[ée]noch|Esdras\s+(III|IV|3|4)|Odes\s+de\s+Salomon|Pasteur\s+d.Hermas|Didach[èe])\b/g,                     genre: 'écrit hors canon' },
]

const signalements = []
{
  const vus = new Set()
  for (const s of segs ?? []) {
    for (const { motif, genre } of NON_BIBLIQUES) {
      for (const m of String(s.segment_texte || '').matchAll(motif)) {
        const cle = `${s.id}|${m[1]}`
        if (vus.has(cle)) continue
        vus.add(cle)
        signalements.push({
          segment_id: s.id, type: 4, fiabilite: 'à constituer', provenance: 'ia',
          arbitrage_requis: true,
          motif: `RÉFÉRENCE NON BIBLIQUE (${genre}) : « ${m[1]} » — à constituer à la main, ou automatiquement quand le corpus le permettra. Segment ${s.segment_numero}.`,
        })
      }
    }
  }
}


// Repérer les citations introduites : on regarde ce qui PRÉCÈDE chaque citation.
const cibles = []
for (const s of segs) {
  const txt = s.segment_texte || ''
  for (const m of txt.matchAll(/[«"]\s*([^»"]{12,})\s*[»"]/g)) {
    const avant = txt.slice(Math.max(0, m.index - 60), m.index)
    const f = FORMULES.find(f => f.motif.test(avant))
    if (f) cibles.push({ seg: s, texte: m[1].trim(), formule: f })
  }
}

// ── ŒUVRES SANS GUILLEMETS (option --sans-guillemets) ───────────────────────
// Certaines éditions ne délimitent RIEN : ni guillemets, ni référence (Basile,
// « Hexaéméron » ; Origène, « Contre Celse » ; Chrysostome, « Homélies »). La
// boucle ci-dessus n'y trouve donc jamais rien, et l'œuvre reste sans liens.
//
// Faute de borne typographique, on prend pour citation présumée la FENÊTRE de
// texte qui SUIT la formule (« il est écrit : … »). La borne est fausse — elle
// déborde sur le commentaire —, mais l'appariement se fait par recouvrement :
// un débordement dilue le score, il ne le fausse pas. C'est pourquoi le résultat
// part en `douteux` + arbitrage, jamais en `probable` : la citation n'est pas
// délimitée par la source mais devinée par nous, et cela doit se voir.
//
// Option explicite, pour ne rien changer aux œuvres déjà traitées avec l'autre voie.
const SANS_GUILL = process.argv.includes('--sans-guillemets')
const FENETRE = 220   // caractères pris après la formule
if (SANS_GUILL) {
  const dejaVus = new Set(cibles.map(c => `${c.seg.id}|${c.texte.slice(0, 30)}`))
  for (const s of segs) {
    const txt = String(s.segment_texte || '').replace(/<[^>]+>/g, ' ')
    for (const f of FORMULES) {
      // `motif` est conçu pour tester le texte qui PRÉCÈDE la citation : il se
      // termine par « [^.]{0,25}$ ». Rejoué tel quel en global, l'ancre de fin
      // ne peut jamais tomber — il faut la retirer, et la fenêtre commence alors
      // juste après le mot d'annonce (« il est écrit : … »).
      const g = new RegExp(f.motif.source.replace(/\[\^\\?\.\]\{0,\d+\}\$$/, ''), 'gi')
      for (const m of txt.matchAll(g)) {
        const apres = txt.slice(m.index + m[0].length, m.index + m[0].length + FENETRE)
          .replace(/^[\s:,;—–-]+/, '').replace(/\s+/g, ' ').trim()
        if (apres.length < 40) continue
        const cle = `${s.id}|${apres.slice(0, 30)}`
        if (dejaVus.has(cle)) continue
        dejaVus.add(cle)
        cibles.push({ seg: s, texte: apres, formule: f, devine: true })
      }
    }
  }
}
console.log(`${segs.length} segments · ${cibles.length} citation(s) introduite(s) par une formule`)
console.log(`  références non bibliques repérées : ${signalements.length}`)
if (DRY) for (const s of signalements.slice(0, 8)) console.log(`    · ${s.motif.slice(0, 100)}`)
// Une œuvre peut n'avoir aucune citation introduite tout en portant des renvois
// non bibliques (Tertullien : 0 citation, mais Cicéron et Sénèque nommés). Sortir
// ici les perdrait — on saute l'appariement, pas l'écriture.
const rienAApparier = cibles.length === 0

const livresUtiles = rienAApparier ? [] : [...new Set(cibles.flatMap(c => c.formule.livres ?? []))]
const partout = !rienAApparier && cibles.some(c => !c.formule.livres)
console.log(`  livres à charger : ${partout ? 'tout le canon (formule vague présente)' : livresUtiles.join(', ')}`)

const versets = []
for (let from = 0; !rienAApparier; from += 1000) {
  let q = sb.from('versets_v2').select('canon_id, texte')
    .in('trad_id', ['TR0001', 'TR0003']).not('canon_id', 'is', null).range(from, from + 999)
  if (!partout) q = q.in('livre', livresUtiles)
  const { data } = await q
  if (!data?.length) break
  versets.push(...data); if (data.length < 1000) break
}
const parStems = new Map()   // canon_id → [stems de chaque traduction]
for (const v of versets) {
  if (!parStems.has(v.canon_id)) parStems.set(v.canon_id, [])
  parStems.get(v.canon_id).push(stemmes(v.texte))
}
// IDF sur tout le corpus chargé : un mot partagé rare pèse, un mot banal presque rien.
const idf = construireIdf([...parStems.values()].flat())
// Profils précalculés (sac + masse IDF + bigrammes) : le score par paire est alors
// en O(taille de la citation), non plus recomposé à chaque comparaison.
const parCanon = new Map()
for (const [canon_id, liste] of parStems) parCanon.set(canon_id, liste.map(st => profilVerset(st, idf)))
console.log(`  ${parCanon.size} créneaux chargés\n`)

// ── Appariement, restreint au périmètre annoncé par la formule ───────────────
const liens = []
const stats = { retenues: 0, sousSeuil: 0, ambigus: 0, parFormule: {} }
for (const c of (rienAApparier ? [] : cibles)) {
  const pQ = profilCitation(stemmes(c.texte))
  const perimetre = c.formule.livres
  let meilleur = null, best = 0, second = 0
  for (const [canon_id, profils] of parCanon) {
    if (perimetre && !perimetre.includes(canon_id.split('.')[0])) continue
    let sc = 0
    for (const pv of profils) { const d = scoreProfil(pQ, pv, idf); if (d > sc) sc = d }
    if (sc > best) { second = best; best = sc; meilleur = canon_id }
    else if (sc > second) { second = sc }
  }
  const seuil = perimetre ? SEUIL_CIBLE : SEUIL_PARTOUT
  if (!meilleur || best < seuil) { stats.sousSeuil++; continue }
  // Garde d'ambiguïté : deux versets quasi ex æquo → appariement non fiable, rejeté.
  if (best - second < MARGE) { stats.ambigus++; continue }
  stats.retenues++
  stats.parFormule[c.formule.nom] = (stats.parFormule[c.formule.nom] ?? 0) + 1
  if (DRY) console.log(`  ${c.formule.nom.padEnd(12)} seg ${String(c.seg.segment_numero).padStart(4)} → ${meilleur.padEnd(12)} ${best.toFixed(2)} (2e ${second.toFixed(2)})  « ${c.texte.slice(0, 50)} »`)
  liens.push({
    segment_id: c.seg.id, canon_id: meilleur, type: 1,
    // Appariement sémantique sans référence → toujours « douteux » (l'audit le
    // confirme) ; il reste soumis à validation.
    fiabilite: 'douteux', provenance: 'ia', arbitrage_requis: true,
    motif: `Citation annoncée par une formule (« ${c.formule.nom} »)${c.devine ? ', bornes devinées (édition sans guillemets)' : ''} : « ${c.texte.slice(0, 60)} ». Recherche ${perimetre ? 'restreinte à ' + perimetre.length + ' livre(s)' : 'sur tout le canon'}, score ${best.toFixed(2)} (2ᵉ ${second.toFixed(2)}).`,
  })
}

console.log(`\n  retenues : ${stats.retenues}  ${JSON.stringify(stats.parFormule)}`)
console.log(`  sous le seuil : ${stats.sousSeuil} · ambigus rejetés : ${stats.ambigus}`)

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0) }

// On n'écrit que ce qui n'existe pas déjà : la contrainte d'unicité
// (segment_id, canon_id, type) rejetterait l'insertion entière du lot. La
// lecture des liens présents est paginée par paquets de segments — un `in()` sur
// les 32 000 segments de la Somme dépasserait la limite d'URL et plafonnerait à
// 1000, laissant passer des doublons qui feraient échouer tout l'insert.
const idsSeg = segs.map(s => s.id)
const deja = new Set()
for (let i = 0; i < idsSeg.length; i += 300) {
  const { data } = await sb.from('liens_bibliques')
    .select('segment_id, canon_id, type').in('segment_id', idsSeg.slice(i, i + 300))
  for (const l of data ?? []) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`)
}
// Dédoublonner les liens BIBLIQUES à la fois contre l'existant et au sein du lot :
// un même segment peut introduire deux fois la même citation, ce qui produirait
// deux (segment_id, canon_id, type) identiques et ferait échouer tout l'insert.
// Les signalements (canon_id null) ne violent pas la contrainte — en Postgres
// deux NULL sont distincts —, on les garde tous, chacun visant un auteur propre.
const aEcrire = []
for (const l of liens) {
  const cle = `${l.segment_id}|${l.canon_id}|${l.type}`
  if (deja.has(cle)) continue
  deja.add(cle)
  aEcrire.push(l)
}
// Les marqueurs « référence non biblique » (sans cible) remontent en arbitrage.
// --sans-flags les écarte quand on ne veut que les liens bibliques appariés.
if (!process.argv.includes('--sans-flags')) aEcrire.push(...signalements)
else console.log(`  (${signalements.length} flags non bibliques écartés : --sans-flags)`)
aEcrire.filter(l => l.canon_id).forEach(verifierLienMecanique)   // garde-fou (les flags sans cible exclus)
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`✓ ${aEcrire.length} liens écrits (${liens.length - aEcrire.length} déjà présents)`)
