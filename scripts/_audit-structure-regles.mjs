// Règles de l'audit STRUCTUREL des versets — module PUR, testé.
//
// Le module voisin `_audit-versets-regles.mjs` regarde le TEXTE d'un créneau : sa
// longueur, ses scories. Celui-ci regarde l'OSSATURE : qui porte quel créneau, avec
// quelle numérotation, et où les deux cessent de se répondre. Ce sont les deux
// questions de la file « Lignes problématiques » de la Polyglotte — « une divergence
// de versets, un verset absent ».
//
// Il ne parle ni à la base ni au réseau : il reçoit des lignes déjà chargées et rend
// des constats. Les seuils se discutent ici, sans relancer un audit complet.
//
// VOCABULAIRE (charte, et `rapports/AUDIT_TRADUCTIONS_BIBLIQUES.md`) :
//   · un CRÉNEAU est un `canon_id`, la case canonique où les traductions se rejoignent ;
//   · une traduction peut y verser PLUSIEURS versets source (regroupement, `ordre_slot`) ;
//   · un verset source peut être SCINDÉ entre plusieurs créneaux (`canon_id_fin`) ;
//   · un verset source sans créneau est SURNUMÉRAIRE — hors ossature, et légitime chez
//     la Septante.
//
// ⛔ `ch_orig`, `v_orig` décrivent EXCLUSIVEMENT la numérotation de l'édition source.
// Un écart entre eux et le créneau n'est donc PAS un défaut par lui-même : la Vulgate
// compte le titre du psaume comme verset 1, et tout le psautier s'en trouve décalé
// d'un cran. Ce qui se lit, c'est la RUPTURE de cet écart à l'intérieur d'un chapitre.

import { SEUIL_SYSTEMATIQUE } from './_audit-versets-regles.mjs'

export { SEUIL_SYSTEMATIQUE }

/** Une traduction « couvre » un livre si elle y porte au moins tant de créneaux. */
export const COUVERTURE_MINIMALE = 20

/** Un créneau doit être porté par au moins tant de témoins pour qu'une absence signifie. */
export const TEMOINS_MINIMUM = 3

/**
 * Part minimale du chapitre que doit tenir un écart pour valoir RÉGIME.
 * En deçà, le chapitre n'a pas de numérotation dominante : ce n'est plus tel verset qui
 * s'écarte, c'est le chapitre entier qui est sans régime, et on le dit ainsi plutôt que
 * de désigner au hasard la moitié de ses versets.
 */
export const PART_REGIME = 0.5

/** Un chapitre trop court pour qu'un « régime » veuille dire quelque chose. */
export const CHAPITRE_MINIMUM = 3

// ── Couverture ───────────────────────────────────────────────────────────────

/**
 * Créneaux distincts portés par chaque traduction dans chaque livre.
 * ⚠️ Un verset étalé les compte TOUS quand l'ossature est fournie : c'est la même
 * question que celle des absences, et deux comptes qui ne s'accordent pas feraient
 * couvrir un livre ici et pas là.
 * @param {Array<{trad_id, livre, canon_id, canon_id_fin}>} lignes
 * @param {ReturnType<typeof indexerCanon>} [index]
 * @returns {Map<string, number>} clé « trad|livre »
 */
export function couverture(lignes, index) {
  const vus = new Map()
  for (const l of lignes) {
    if (!l.canon_id) continue
    const cle = `${l.trad_id}|${l.livre}`
    let s = vus.get(cle)
    if (!s) { s = new Set(); vus.set(cle, s) }
    for (const id of (index ? creneauxCouverts(l, index) : [l.canon_id])) s.add(id)
  }
  return new Map([...vus].map(([cle, s]) => [cle, s.size]))
}

// ── Les cinq détecteurs ──────────────────────────────────────────────────────

/**
 * L'ossature indexée : le rang de chaque créneau, et les créneaux de chaque livre RANGÉS.
 *
 * ⛔ On ne se fie JAMAIS à l'ordre du tableau reçu : `versets_canon.id` est du TEXTE, et
 * un tri sur lui met « GEN.1.10 » avant « GEN.1.2 ». C'est `ordre` qui dit la suite du
 * canon. À défaut de cette colonne, on retombe sur (chapitre, verset), qui la redonne.
 */
export function indexerCanon(canon) {
  const rang = new Map()
  const parLivre = new Map()
  for (const c of canon) {
    const o = c.ordre != null ? Number(c.ordre) : (c.ch_canon ?? 0) * 1000 + (c.v_canon ?? 0)
    rang.set(c.id, o)
    if (!parLivre.has(c.livre)) parLivre.set(c.livre, [])
    parLivre.get(c.livre).push(c)
  }
  for (const liste of parLivre.values()) liste.sort((a, b) => rang.get(a.id) - rang.get(b.id))
  return { rang, parLivre }
}

/**
 * Les créneaux qu'une ligne COUVRE, et non le seul créneau où elle commence.
 *
 * ⛔ Un verset source étalé sur plusieurs créneaux les porte TOUS : `canon_id` dit où il
 * commence, `canon_id_fin` où il finit, et ce qui est entre les deux n'est pas absent.
 * Le détecteur l'a ignoré jusqu'au 2026-09-07 et annonçait 28 absences qui n'en étaient
 * pas — dont Nb 15, 14 et 15, 16, que la Vulgate couvre bel et bien d'un seul verset.
 *
 * ⚠️ Un `canon_id_fin` qui PRÉCÈDE son début est une donnée fautive : on ne devine pas
 * l'intention, la ligne ne couvre alors que son créneau de départ.
 */
export function creneauxCouverts(ligne, index) {
  if (!ligne.canon_id) return []
  const fin = ligne.canon_id_fin
  if (!fin || fin === ligne.canon_id) return [ligne.canon_id]
  const debutRang = index.rang.get(ligne.canon_id)
  const finRang = index.rang.get(fin)
  if (debutRang == null || finRang == null || finRang < debutRang) return [ligne.canon_id]
  const liste = index.parLivre.get(ligne.livre) ?? []
  return liste.filter(c => index.rang.get(c.id) >= debutRang && index.rang.get(c.id) <= finRang).map(c => c.id)
}

/**
 * ABSENCES : un créneau que la traduction ne porte pas, alors qu'elle couvre le livre
 * et qu'au moins `TEMOINS_MINIMUM` autres traductions le portent.
 *
 * @param {Array<{id, livre, ch_canon, v_canon, ordre}>} canon  l'ossature (`versets_canon`)
 * @param {Array<{trad_id, livre, canon_id, canon_id_fin}>} lignes
 */
export function absences(canon, lignes) {
  const index = indexerCanon(canon)
  const couv = couverture(lignes, index)
  const porte = new Set()                      // « trad|canon_id »
  const temoins = new Map()                    // canon_id → nb de traductions
  for (const l of lignes) {
    for (const id of creneauxCouverts(l, index)) {
      const cle = `${l.trad_id}|${id}`
      if (porte.has(cle)) continue
      porte.add(cle)
      temoins.set(id, (temoins.get(id) || 0) + 1)
    }
  }
  const traductions = [...new Set(lignes.map(l => l.trad_id))].sort()

  const trouves = []
  for (const c of canon) {
    const n = temoins.get(c.id) || 0
    if (n < TEMOINS_MINIMUM) continue
    for (const t of traductions) {
      if ((couv.get(`${t}|${c.livre}`) || 0) < COUVERTURE_MINIMALE) continue
      if (porte.has(`${t}|${c.id}`)) continue
      trouves.push({ trad_id: t, livre: c.livre, canon_id: c.id, temoins: n })
    }
  }
  return trouves
}

/**
 * REGROUPEMENTS : plusieurs versets de l'édition source versés dans un même créneau.
 * Ce n'est pas un défaut en soi — c'est ce que `ordre_slot` sert à dire —, mais c'est
 * une divergence de découpage, et la file de relecture la veut.
 */
export function regroupements(lignes) {
  const parCreneau = new Map()
  for (const l of lignes) {
    if (!l.canon_id) continue
    const cle = `${l.trad_id}|${l.canon_id}`
    let e = parCreneau.get(cle)
    if (!e) { e = { trad_id: l.trad_id, livre: l.livre, canon_id: l.canon_id, versets: [] }; parCreneau.set(cle, e) }
    e.versets.push(referenceOrigine(l))
  }
  return [...parCreneau.values()]
    .filter(e => e.versets.length > 1)
    .map(e => ({ ...e, versets: e.versets.sort() }))
}

/** SCISSIONS : un verset source étalé sur plusieurs créneaux (`canon_id_fin`). */
export function scissions(lignes) {
  return lignes
    .filter(l => l.canon_id && l.canon_id_fin && l.canon_id_fin !== l.canon_id)
    .map(l => ({
      trad_id: l.trad_id, livre: l.livre, canon_id: l.canon_id,
      canon_id_fin: l.canon_id_fin, origine: referenceOrigine(l),
    }))
}

/** SURNUMÉRAIRES : un verset de l'édition source qui ne tombe dans aucun créneau. */
export function surnumeraires(lignes) {
  return lignes
    .filter(l => !l.canon_id)
    .map(l => ({ trad_id: l.trad_id, livre: l.livre, origine: referenceOrigine(l) }))
}

/**
 * DÉCALAGES : la numérotation de l'édition source rompt, à l'intérieur d'un chapitre,
 * l'écart que ce chapitre tient partout ailleurs.
 *
 * ⚠️ On ne mesure QUE les créneaux un-pour-un : un regroupement ou une scission fait
 * naturellement varier l'écart, et les compter ici ferait signaler deux fois la même
 * chose. Un chapitre dont aucun écart ne tient la moitié des versets (`PART_REGIME`)
 * n'a pas de régime : on rend le chapitre, et non chacun de ses versets.
 *
 * @param {Array<{id, livre, ch_canon, v_canon}>} canon
 * @param {Array<{trad_id, livre, canon_id, canon_id_fin, ch_orig, v_orig}>} lignes
 */
export function decalages(canon, lignes) {
  const cases = new Map(canon.map(c => [c.id, c]))
  const compte = new Map()                     // « trad|canon_id » → nb de versets source
  for (const l of lignes) if (l.canon_id) compte.set(`${l.trad_id}|${l.canon_id}`, (compte.get(`${l.trad_id}|${l.canon_id}`) || 0) + 1)

  // Un point par créneau un-pour-un, avec son écart.
  const points = []
  for (const l of lignes) {
    if (!l.canon_id || l.ch_orig == null || l.v_orig == null) continue
    if (l.canon_id_fin && l.canon_id_fin !== l.canon_id) continue
    if (compte.get(`${l.trad_id}|${l.canon_id}`) !== 1) continue
    const c = cases.get(l.canon_id)
    if (!c) continue
    points.push({
      trad_id: l.trad_id, livre: c.livre, ch_canon: c.ch_canon, v_canon: c.v_canon,
      ch_orig: l.ch_orig, v_orig: l.v_orig,
      ecart: `${l.ch_orig - c.ch_canon}/${l.v_orig - c.v_canon}`,
    })
  }

  // Régime de chaque chapitre : l'écart le plus porté.
  const parChapitre = new Map()
  for (const p of points) {
    const cle = `${p.trad_id}|${p.livre}|${p.ch_canon}`
    let e = parChapitre.get(cle)
    if (!e) { e = { trad_id: p.trad_id, livre: p.livre, ch_canon: p.ch_canon, points: [], ecarts: new Map() }; parChapitre.set(cle, e) }
    e.points.push(p)
    e.ecarts.set(p.ecart, (e.ecarts.get(p.ecart) || 0) + 1)
  }

  const versets = [], chapitres = []
  for (const ch of parChapitre.values()) {
    const [regime, n] = [...ch.ecarts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    const part = n / ch.points.length
    if (ch.points.length >= CHAPITRE_MINIMUM && part < PART_REGIME) {
      chapitres.push({
        trad_id: ch.trad_id, livre: ch.livre, ch_canon: ch.ch_canon,
        ecarts: ch.ecarts.size, versets: ch.points.length, part: +part.toFixed(2),
      })
      continue
    }
    for (const p of ch.points) {
      if (p.ecart === regime) continue
      versets.push({ ...p, regime })
    }
  }
  return { versets, chapitres }
}

// ── Mise en cas ──────────────────────────────────────────────────────────────

/** « 3, 5 » d'une ligne source, suffixe compris. */
export function referenceOrigine(l) {
  return `${l.ch_orig ?? '?'},${l.v_orig ?? '?'}${l.v_orig_suffixe ?? ''}`
}

/** « GEN.12.4 » → { ch: 12, v: 4 }. Rend null sur une clé qui ne s'y prête pas. */
export function couperCanonId(canon_id) {
  const m = /^(.+)\.(\d+)\.(\d+)$/.exec(canon_id || '')
  return m ? { livre: m[1], ch: +m[2], v: +m[3] } : null
}

/**
 * Compresse une liste de coordonnées canoniques en une RÉFÉRENCE lisible, du format
 * que sait relire la Polyglotte (`construireSensibilite`, `app/polyglotte/page.tsx`) :
 * « LIVRE ch:v-v, ch:v ». Les versets qui se suivent dans un même chapitre se rendent
 * en plage ; le livre ne s'écrit qu'une fois, en tête, les jetons suivants en héritant.
 *
 * @param {string} livre
 * @param {Array<{ch:number, v:number}>} coords
 * @param {number} maxJetons  au-delà, la référence est tronquée par « … » (la liste
 *                            entière vit dans les notes du point sensible)
 */
export function compresserReference(livre, coords, maxJetons = 40) {
  const tries = [...coords].sort((a, b) => a.ch - b.ch || a.v - b.v)
  const plages = []
  for (const c of tries) {
    const d = plages[plages.length - 1]
    if (d && d.ch === c.ch && c.v === d.fin + 1) { d.fin = c.v; continue }
    if (d && d.ch === c.ch && c.v === d.fin) continue        // doublon
    plages.push({ ch: c.ch, debut: c.v, fin: c.v })
  }
  const jetons = plages.map(p => `${p.ch}:${p.debut}${p.fin > p.debut ? `-${p.fin}` : ''}`)
  const gardes = jetons.slice(0, maxJetons)
  const reste = jetons.length - gardes.length
  return `${livre} ${gardes.join(', ')}${reste > 0 ? `, … (+${reste})` : ''}`
}

/**
 * Compresse une liste de CHAPITRES en une référence du même format, où un jeton sans
 * deux-points désigne le chapitre entier (« PSA 9, 17-19 »). C'est ce qu'il faut quand
 * le constat porte sur le chapitre et non sur tel de ses versets : écrire « 9:1 » y
 * ferait rougir le seul premier verset d'un chapitre à relire en entier.
 */
export function compresserChapitres(livre, chapitres, maxJetons = 40) {
  const tries = [...new Set(chapitres)].sort((a, b) => a - b)
  const plages = []
  for (const ch of tries) {
    const d = plages[plages.length - 1]
    if (d && ch === d.fin + 1) { d.fin = ch; continue }
    plages.push({ debut: ch, fin: ch })
  }
  const jetons = plages.map(p => (p.fin > p.debut ? `${p.debut}-${p.fin}` : `${p.debut}`))
  const gardes = jetons.slice(0, maxJetons)
  const reste = jetons.length - gardes.length
  return `${livre} ${gardes.join(', ')}${reste > 0 ? `, … (+${reste})` : ''}`
}

/**
 * Partage un lot de cas entre cause SYSTÉMATIQUE et cas ISOLÉS, livre par livre et
 * traduction par traduction. C'est le partage qui rend l'audit utilisable : un livre
 * entier qui manque à une traduction n'est pas un défaut d'alignement mais la nature
 * du corpus (Segond n'a pas les additions grecques d'Esther, la Septante a son propre
 * Jérémie). Voir `partagerAbsents`, dont c'est la généralisation.
 */
export function partagerParLot(cas, seuil = SEUIL_SYSTEMATIQUE) {
  const compte = new Map()
  for (const c of cas) {
    const cle = `${c.trad_id}|${c.livre}`
    compte.set(cle, (compte.get(cle) || 0) + 1)
  }
  const systematiques = [], isoles = []
  for (const c of cas) {
    const n = compte.get(`${c.trad_id}|${c.livre}`)
    ;(n >= seuil ? systematiques : isoles).push({ ...c, dans_ce_livre: n })
  }
  return { systematiques, isoles }
}
