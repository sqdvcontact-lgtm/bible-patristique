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

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
if (!OEUVRE) { console.error('usage : node scripts/liens-citations-introduites.mjs <id_oeuvre> [--dry]'); process.exit(1) }

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

// Sans indice de livre, la rencontre fortuite devient probable : on exige bien plus.
const SEUIL_CIBLE  = 0.50
const SEUIL_PARTOUT = 0.68

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

// ── Chargement ───────────────────────────────────────────────────────────────
const { data: segs } = await sb.from('segments')
  .select('id, segment_numero, segment_texte').eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('segment_numero')

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
  { motif: /\b(Platon|Aristote|Cic[ée]ron|S[ée]n[eè]que|Virgile|Hom[eè]re|Plotin|Porphyre|Varron|Salluste|T[ée]rence)\b/g, genre: 'auteur profane' },
  { motif: /\b(Cyprien|Ambroise|Tertullien|Origène|J[ée]r[ôo]me|Ir[ée]n[ée]e|Chrysostome|Basile|Grégoire)\b/g,             genre: 'Père de l’Église' },
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
const parCanon = new Map()
for (const v of versets) {
  if (!parCanon.has(v.canon_id)) parCanon.set(v.canon_id, [])
  parCanon.get(v.canon_id).push(sac(v.texte))
}
console.log(`  ${parCanon.size} créneaux chargés\n`)

// ── Appariement, restreint au périmètre annoncé par la formule ───────────────
const liens = []
const stats = { retenues: 0, sousSeuil: 0, parFormule: {} }
for (const c of (rienAApparier ? [] : cibles)) {
  const sacC = sac(c.texte)
  const perimetre = c.formule.livres
  let meilleur = null, best = 0
  for (const [canon_id, sacs] of parCanon) {
    if (perimetre && !perimetre.includes(canon_id.split('.')[0])) continue
    for (const s of sacs) { const d = dice(sacC, s); if (d > best) { best = d; meilleur = canon_id } }
  }
  const seuil = perimetre ? SEUIL_CIBLE : SEUIL_PARTOUT
  if (!meilleur || best < seuil) { stats.sousSeuil++; continue }
  stats.retenues++
  stats.parFormule[c.formule.nom] = (stats.parFormule[c.formule.nom] ?? 0) + 1
  if (DRY) console.log(`  ${c.formule.nom.padEnd(12)} seg ${String(c.seg.segment_numero).padStart(4)} → ${meilleur.padEnd(12)} ${best.toFixed(2)}  « ${c.texte.slice(0, 58)} »`)
  liens.push({
    segment_id: c.seg.id, canon_id: meilleur, type: 1,
    fiabilite: 'probable', provenance: 'ia', arbitrage_requis: true,
    motif: `Citation annoncée par une formule (« ${c.formule.nom} ») : « ${c.texte.slice(0, 60)} ». Recherche ${perimetre ? 'restreinte à ' + perimetre.length + ' livre(s)' : 'sur tout le canon'}, score ${best.toFixed(2)}.`,
  })
}

console.log(`\n  retenues : ${stats.retenues}  ${JSON.stringify(stats.parFormule)}`)
console.log(`  sous le seuil : ${stats.sousSeuil}`)

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0) }

// On n'écrit que ce qui n'existe pas déjà : la contrainte d'unicité
// (segment_id, canon_id, type) rejetterait l'insertion entière du lot.
const { data: existants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type').in('segment_id', segs.map(s => s.id))
const deja = new Set((existants ?? []).map(l => `${l.segment_id}|${l.canon_id}|${l.type}`))
const aEcrire = liens.filter(l => !deja.has(`${l.segment_id}|${l.canon_id}|${l.type}`))
aEcrire.push(...signalements)
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`✓ ${aEcrire.length} liens écrits (${liens.length - aEcrire.length} déjà présents)`)
