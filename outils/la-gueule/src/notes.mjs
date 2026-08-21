// Recensement des notes / références. Beaucoup d'éditions (Basile, etc.) portent les
// références DANS le texte, entre parenthèses : « (Ps. 61. 11.) », « (1. Cor. 1. 30 et 31.) ».
// Sur le site, elles deviennent des NOTES : un appel « [[N]] » dans le texte, et la ligne
// « [[N]] Ps. 61. 11. » dans le champ `notes`. On ne NORMALISE pas ici la graphie de la
// référence (« Ps. 61. 11. » → « Ps 61, 11 ») — c'est le chantier « uniformisation des notes ».

/** Le contenu d'une parenthèse ressemble-t-il à une référence (abrégé de livre + chiffres) ? */
export function estReference(s) {
  if (!/\d/.test(s)) return false                                  // doit contenir un chiffre
  if (!/[A-ZÉÈ][a-zéèà]{0,6}\.?\s*[\dIVXLC]/.test(s)) return false  // abrégé de livre + numéro
  const motsLongs = (s.match(/\b[a-zéèàêîôûç]{6,}\b/g) || []).filter((w) => !/^(seqq?|etc|suiv|ibidem)$/i.test(w))
  if (motsLongs.length > 1) return false                           // trop de mots → prose, pas une réf
  return true
}

/**
 * Remplace les références parenthétiques d'un texte par des appels « [[N]] » et les recense.
 * `depart` = numéro de la première note (compteur global à l'échelle de l'œuvre).
 * Renvoie { texte, notes:[{n, ref}], prochain }.
 */
export function recenserReferences(texte, depart = 1) {
  let n = depart - 1
  const notes = []
  const out = String(texte || '').replace(/\(\s*([^)]{2,55})\s*\)/g, (m, contenu) => {
    const c = contenu.replace(/\s+/g, ' ').trim()
    if (!estReference(c)) return m
    n += 1
    notes.push({ n, ref: c })
    return `[[${n}]]`
  })
  return { texte: out, notes, prochain: n + 1 }
}

/** Formate les notes d'un segment pour le champ `notes` du site : « [[N]] … » par ligne. */
export function formaterNotes(notes) {
  if (!notes || !notes.length) return null
  return notes.map((x) => `[[${x.n}]] ${x.ref}`).join('\n')
}
