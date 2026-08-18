// Détection de colonnes et ordre de lecture pour les pages à DOUBLE COLONNE (type Migne).
// Un OCR livre les lignes dans un ordre qui peut mêler les deux colonnes ; ici on reconstruit
// l'ordre de lecture : par bande (séparée par les lignes pleine largeur), colonne gauche de haut
// en bas, puis colonne droite. Pur (testable), et SÛR : au moindre doute, on reste en une piste
// unique — le comportement mono-colonne existant est alors strictement conservé.

/** Centre horizontal d'une ligne. */
const centre = (l) => l.bbox[0] + l.bbox[2] / 2
/** La ligne enjambe-t-elle l'abscisse X (donc pleine largeur / à cheval sur la gouttière) ? */
const enjambe = (l, X) => l.bbox[0] < X && (l.bbox[0] + l.bbox[2]) > X

/**
 * Détecte 1 ou 2 colonnes. Cherche, dans la bande centrale (35–65 % de la largeur), l'abscisse
 * de GOUTTIÈRE qui coupe le moins de lignes ; si ce minimum est quasi nul et qu'il y a assez de
 * lignes des deux côtés, c'est deux colonnes. Renvoie { colonnes, gouttiere }.
 */
export function detecterColonnes(lignes, largeur) {
  const avec = (lignes || []).filter((l) => Array.isArray(l.bbox) && l.bbox.length === 4)
  if (!largeur || avec.length < 4) return { colonnes: 1, gouttiere: null }
  let best = null
  for (let f = 0.35; f <= 0.65 + 1e-9; f += 0.02) {
    const X = largeur * f
    const straddle = avec.filter((l) => enjambe(l, X)).length
    const gauche = avec.filter((l) => centre(l) < X && !enjambe(l, X)).length
    const droite = avec.filter((l) => centre(l) >= X && !enjambe(l, X)).length
    if (gauche < 2 || droite < 2) continue
    if (best === null || straddle < best.straddle) best = { X, straddle, gauche, droite }
  }
  if (!best) return { colonnes: 1, gouttiere: null }
  // Gouttière valable : très peu de lignes la traversent (≤ 8 % du total, au moins 1 toléré).
  const seuil = Math.max(1, Math.floor(avec.length * 0.08))
  if (best.straddle <= seuil) return { colonnes: 2, gouttiere: Math.round(best.X) }
  return { colonnes: 1, gouttiere: null }
}

/**
 * Découpe une page en PISTES de lecture. Une colonne → une piste (lignes inchangées, ordre OCR).
 * Deux colonnes → pistes ordonnées : chaque bande (délimitée par les lignes pleine largeur) donne
 * la colonne gauche puis la droite ; une ligne pleine largeur forme sa propre piste (colonne null).
 * Renvoie [{ colonne: 0|1|null, lignes:[…] }, …]. Repli en une piste si géométrie douteuse.
 */
export function segmenterColonnes(lignes, largeur) {
  const toutes = lignes || []
  const { colonnes, gouttiere: X } = detecterColonnes(toutes, largeur)
  if (colonnes === 1 || X == null) return [{ colonne: 0, lignes: toutes }]
  if (toutes.some((l) => !Array.isArray(l.bbox))) return [{ colonne: 0, lignes: toutes }] // besoin de coords partout

  const parY = [...toutes].sort((a, b) => a.bbox[1] - b.bbox[1])
  const pistes = []
  let buf0 = [], buf1 = []
  const vider = () => {
    if (buf0.length) pistes.push({ colonne: 0, lignes: buf0 })
    if (buf1.length) pistes.push({ colonne: 1, lignes: buf1 })
    buf0 = []; buf1 = []
  }
  for (const l of parY) {
    if (enjambe(l, X)) { vider(); pistes.push({ colonne: null, lignes: [l] }) } // pleine largeur = séparateur
    else if (centre(l) < X) buf0.push(l)
    else buf1.push(l)
  }
  vider()
  return pistes
}
