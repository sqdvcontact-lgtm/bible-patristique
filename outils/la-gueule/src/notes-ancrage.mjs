// ANCRAGE DES NOTES — rattacher chaque note au passage qu'elle annote (charte §13).
//
// La charte demande que « chaque appel possède exactement une note consultable et chaque note
// conservée possède au moins un appel légitime » (§13.1), que les appels s'écrivent « [[n]] » avec
// une numérotation unique, continue et GLOBALE à l'œuvre (§13.2), et que l'appel suive
// immédiatement le mot annoté, sans espace (§13.3).
//
// Division du travail, volontairement économe :
//   1. NOTE DE BAS DE PAGE avec APPEL IMPRIMÉ — « Sardanapale (1) » dans le corps, « (1) … » en
//      pied : l'appariement est MÉCANIQUE. Aucun appel à l'IA (ce module).
//   2. GLOSE DE MARGE — aucune marque imprimée : elle annote un passage qu'il faut comprendre.
//      Seule une lecture sémantique peut le dire → passe IA, sur ces seules notes.
//
// La NUMÉROTATION n'est jamais laissée au modèle : elle est posée ici, dans l'ordre de lecture.
// Module PUR (aucune I/O), testé dans test/notes-ancrage.test.mjs.

const texteDe = (l) => String(l?.dip ?? l?.texte ?? '').trim()

// Marque d'appel telle qu'imprimée : (1) 1. 1) (a) a) * † ‡ § ¶ — en TÊTE d'une ligne de note.
const MARQUE_EN_TETE = /^[([]?\s*([0-9]{1,3}|[a-z]|[*†‡§¶]{1,3})\s*[)\].]/u
// …et la même, cherchée À L'INTÉRIEUR d'une ligne de corps.
const MARQUE_INLINE = /[([]\s*([0-9]{1,3}|[a-z])\s*[)\]]|([*†‡§¶]{1,3})/gu

/** Marque d'appel en tête d'une ligne de note (« (1) Sardanapale… » → « 1 »), sinon null. */
export function marqueDeNote(texte) {
  const m = MARQUE_EN_TETE.exec(String(texte ?? '').trim())
  return m ? String(m[1]) : null
}

/** Marques d'appel présentes DANS une ligne de corps (« Sardanapale (1) » → ['1']). */
export function appelsDansLigne(texte) {
  const out = []
  const s = String(texte ?? '')
  MARQUE_INLINE.lastIndex = 0
  let m
  while ((m = MARQUE_INLINE.exec(s)) !== null) {
    const v = m[1] ?? m[2]
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

/**
 * Appariement MÉCANIQUE d'une page : chaque note portant une marque imprimée est rattachée à la
 * ligne de corps qui porte la même marque. `corps` et `notes` sont des tableaux {i, texte}.
 * Une marque ambiguë (présente sur plusieurs lignes de corps) n'est PAS tranchée ici : elle est
 * laissée à la passe sémantique (jamais de rattachement au hasard).
 */
export function apparierNotesImprimees(corps = [], notes = []) {
  const ancrages = []
  const restantes = []
  for (const n of notes) {
    const marque = marqueDeNote(n.texte)
    if (!marque) { restantes.push(n); continue }
    const cibles = corps.filter((c) => appelsDansLigne(c.texte).includes(marque))
    if (cibles.length === 1) {
      ancrages.push({
        note_i: n.i, corps_i: cibles[0].i, marque,
        methode: 'appel_imprime', confiance: 1, certitude: 'certaine',
      })
    } else {
      restantes.push({ ...n, marque, ambigu: cibles.length > 1 })
    }
  }
  return { ancrages, restantes }
}

/**
 * Numérotation « [[n]] » — continue, unique et GLOBALE à l'œuvre (§13.2). Elle n'est jamais
 * déléguée au modèle ni reprise du fac-similé : on renumérote dans l'ordre de LECTURE
 * (page croissante, puis position de l'appel dans la page).
 * `ancrages` : [{page, note_i, corps_i, …}]. Renvoie les mêmes objets avec `numero`.
 */
export function numeroterAncrages(ancrages = [], { depart = 1 } = {}) {
  const tries = [...ancrages].sort((a, b) => (a.page - b.page) || (a.corps_i - b.corps_i) || (a.note_i - b.note_i))
  let n = depart
  return tries.map((a) => ({ ...a, numero: n++ }))
}

/**
 * Pose l'appel « [[n]] » dans une ligne de corps, immédiatement après le mot ou le groupe annoté,
 * sans espace (§13.3) — et À L'INTÉRIEUR d'un guillemet fermant s'il en suit un. Si `apres` n'est
 * pas trouvé, l'appel va en fin de ligne (jamais d'échec silencieux : `place` le dit).
 */
export function poserAppel(ligne, numero, apres = null) {
  const t = String(ligne ?? '')
  const appel = '[[' + numero + ']]'
  const FERMANTS = /^[\s]*[»”"’)\]]/u
  const insere = (pos) => {
    // Devant un guillemet/parenthèse fermant, l'appel reste À L'INTÉRIEUR : on remonte avant lui.
    let p = pos
    const suite = t.slice(p)
    if (FERMANTS.test(suite)) p = pos
    return t.slice(0, p) + appel + t.slice(p)
  }
  if (apres) {
    const idx = t.indexOf(String(apres))
    if (idx >= 0) return { texte: insere(idx + String(apres).length), place: 'apres_groupe' }
  }
  // Fin de ligne, en restant à l'intérieur d'une ponctuation fermante finale.
  const m = /[\s]*[»”"’)\]]+[.,;:!?]*\s*$/u.exec(t)
  if (m && m.index > 0) return { texte: insere(m.index), place: 'avant_fermant' }
  return { texte: t.replace(/\s*$/, '') + appel, place: 'fin_de_ligne' }
}

/** Les notes d'une page, réparties par rôle confirmé ou suggéré (marge vs pied). */
export function notesDeLaPage(lignes = []) {
  const role = (l) => l?.suggestion?.role_confirme ?? l?.suggestion?.role_suggere ?? null
  const corps = [], notes = []
  lignes.forEach((l, i) => {
    const t = texteDe(l)
    if (!t) return
    const r = role(l)
    if (r === 'note_marginale' || r === 'note_bas_page') notes.push({ i, texte: t, role: r })
    else if (!r || r === 'corps' || r === 'indetermine' || r === 'vers' || r === 'continuation_typographique') corps.push({ i, texte: t })
  })
  return { corps, notes }
}
