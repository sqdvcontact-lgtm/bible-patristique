// Zones de page — NOTES EN MARGE et NOTES DE BAS DE PAGE, par la GÉOMÉTRIE (P14).
//
// Pourquoi le moteur et pas le modèle de vision : une note se reconnaît d'abord à sa POSITION
// et à son corps typographique, pas à son sens. Le moteur possède, pour chaque ligne, sa boîte
// `bbox = [x, y, largeur, hauteur]` : il mesure là où l'IA devrait deviner. C'est déterministe,
// gratuit, reproductible et testable sur tout un volume — comme `colonnes.mjs`, dont ce module
// reprend la méthode. L'IA reste utile pour ARBITRER les cas douteux et pour rattacher une note
// à son appel dans le texte (charte §13.2-13.3), ce que la géométrie ne donnera jamais.
//
// Doctrine (P14, charte §8 et §31.4) : ces fonctions ne produisent que des SUGGESTIONS, à
// confirmer par l'humain. Rien n'est supprimé : une ligne reclassée sort du flux de prose mais
// reste dans la source et les formats d'échange. Les notes de l'édition sont CONSERVÉES (§13.1).
//
// Calibré sur un imprimé réel à marginalia : « Discours panégyrique sur la Nativité », Paris,
// Fed. Morel, 1604 (gloses et renvois scripturaires en marge extérieure, alternant avec la parité).

const mediane = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 }
const aBbox = (l) => Array.isArray(l?.bbox) && l.bbox.length === 4
const texteDe = (l) => String(l?.dip ?? l?.texte ?? '').trim()

/**
 * Mesures de la page : colonne de CORPS (bornes gauche/droite) et corps typographique médian,
 * établis sur les seules lignes « pleines » (hauteur normale et largeur importante) — pour que
 * les marginalia, elles-mêmes étroites, ne tirent pas les bornes vers elles.
 */
export function mesuresPage(lignes) {
  const L = (lignes || []).filter((l) => aBbox(l) && texteDe(l))
  if (L.length < 5) return null
  const hMed = mediane(L.map((l) => l.bbox[3]))
  const wMed = mediane(L.map((l) => l.bbox[2]))
  const corps = L.filter((l) => l.bbox[3] >= hMed * 0.8 && l.bbox[2] >= wMed * 0.6)
  if (corps.length < 4) return null
  const gauche = mediane(corps.map((l) => l.bbox[0]))
  const droite = mediane(corps.map((l) => l.bbox[0] + l.bbox[2]))
  const largeur = droite - gauche
  if (largeur <= 0) return null
  const hauts = L.map((l) => l.bbox[1])
  const bas = L.map((l) => l.bbox[1] + l.bbox[3])
  return { hMed, wMed, gauche, droite, largeur, haut: Math.min(...hauts), basPage: Math.max(...bas) }
}

// Un folio, une marque de cahier ou une réclame ne sont pas des gloses : ils ont déjà leur rôle.
const NUMERIQUE = /^[0-9ivxlcdmIVXLCDM.,°\-—–\s]+$/u
const SIGNATURE = /^[A-Z]{1,3}\s*(i{1,3}|I{1,3}|v|V|ij|iij)?\.?$/u

/** Une ligne peut-elle être une glose marginale ? (forme seule, sans le contexte de la page) */
function candidateMarginale(l, m) {
  const [x, y, w, h] = l.bbox
  const t = texteDe(l)
  if (!t || t.length < 2) return null
  if (h > m.hMed * 1.05) return null                       // un grand corps n'est pas une glose
  if (w >= m.largeur * 0.45) return null                    // une glose est ÉTROITE (relatif au corps)
  // …et étroite DANS L'ABSOLU : une marge ne porte que quelques caractères. Mesuré sur l'imprimé
  // de 1604 : largeur de glose ≈ 2,0 à 2,5 fois le corps ; on tolère largement jusqu'à 4,5. Ce
  // garde-fou écarte les pages à mise en page atypique (page de garde d'un numériseur, pleine
  // largeur) où le rapport à la colonne ne veut plus rien dire.
  if (w > m.hMed * 4.5) return null
  // Critère décisif : la glose est HORS de la colonne de corps, pas seulement courte DEDANS.
  // Une ligne courte qui commence à la marge du corps est une fin de paragraphe, pas une note —
  // c'est ce qui trompait la première version (Boèce, fragments de corps mal segmentés).
  // Marge gauche : la ligne se termine avant que le corps ne commence.
  // Marge droite  : la ligne commence là où le corps s'achève.
  const tol = m.hMed * 0.5                                  // jeu de segmentation d'un demi-corps
  const cote = (x + w) <= m.gauche + tol ? 'gauche'
    : x >= m.droite - tol ? 'droite' : null
  if (!cote) return null
  // Bandes de tête et de pied : titre courant, folio, signature, réclame y vivent déjà.
  const hauteurBloc = m.basPage - m.haut
  if (hauteurBloc > 0) {
    const rel = (y - m.haut) / hauteurBloc
    if (rel < 0.06 || rel > 0.94) return null
  }
  if (NUMERIQUE.test(t) || SIGNATURE.test(t)) return null   // folio / marque de cahier
  return { cote, x, y, w, h }
}

/**
 * Notes EN MARGE. Une glose isolée n'existe pas : une note marginale forme une BANDE — plusieurs
 * lignes courtes empilées, alignées sur la même abscisse, dans la même marge. C'est ce critère de
 * bande qui la distingue d'un folio égaré ou d'un fragment de bruit, et il évite les faux positifs.
 * Renvoie une suggestion par ligne retenue (jamais une décision).
 */
export function detecterMarginalia(lignes, { minLignesBande = 2 } = {}) {
  const m = mesuresPage(lignes)
  if (!m) return []
  const cand = []
  ;(lignes || []).forEach((l, i) => {
    if (!aBbox(l)) return
    const c = candidateMarginale(l, m)
    if (c) cand.push({ i, ...c })
  })
  if (!cand.length) return []
  // Regroupement en bandes verticales : même marge, abscisses proches (tolérance = un corps).
  const tol = Math.max(m.hMed, 20)
  const bandes = []
  for (const c of cand.sort((a, b) => a.x - b.x || a.y - b.y)) {
    const b = bandes.find((z) => z.cote === c.cote && Math.abs(z.x - c.x) <= tol)
    if (b) { b.items.push(c); b.x = (b.x * (b.items.length - 1) + c.x) / b.items.length }
    else bandes.push({ cote: c.cote, x: c.x, items: [c] })
  }
  const out = []
  for (const b of bandes) {
    if (b.items.length < minLignesBande) continue           // une ligne seule ne fait pas une glose
    for (const c of b.items) {
      out.push({
        i: c.i,
        role: 'note_marginale',
        regle: 'zone_marge',
        score: Math.min(5, 2 + b.items.length),
        preuves: {
          cote: c.cote,
          largeur_relative: Math.round((c.w / m.largeur) * 100) / 100,
          hauteur_relative: Math.round((c.h / m.hMed) * 100) / 100,
          lignes_de_la_bande: b.items.length,
        },
      })
    }
  }
  return out.sort((a, b) => a.i - b.i)
}

/**
 * Notes DE BAS DE PAGE. Signature : un bloc en pied de page, en petit corps, détaché du dernier
 * paragraphe par un blanc nettement plus grand que l'interligne courant (le filet imprimé, que
 * l'OCR ne produit pas comme ligne, se lit dans ce blanc). Conservateur : exige le petit corps ET
 * le décrochement, faute de quoi une fin de chapitre courte passerait pour une note.
 * ⚠️ NON CALIBRÉ sur échantillon annoté (P14 : il faut océriser une page à notes, ex. Basile p.60).
 */
export function detecterNotesBasPage(lignes, { facteurSaut = 2.2, partBasse = 0.6 } = {}) {
  const m = mesuresPage(lignes)
  if (!m) return []
  const L = (lignes || []).map((l, i) => ({ l, i })).filter(({ l }) => aBbox(l) && texteDe(l))
    .sort((a, b) => a.l.bbox[1] - b.l.bbox[1])
  if (L.length < 6) return []
  const hauteurBloc = m.basPage - m.haut
  if (hauteurBloc <= 0) return []
  // Interligne courant : médiane des sauts entre lignes successives (robuste aux trous).
  const sauts = []
  for (let k = 1; k < L.length; k++) {
    const prec = L[k - 1].l.bbox, cur = L[k].l.bbox
    sauts.push(cur[1] - (prec[1] + prec[3]))
  }
  const sautMed = Math.max(1, mediane(sauts.filter((s) => s >= 0)))
  // Frontière = le plus BAS décrochement franc situé dans la partie basse de la page.
  let debut = -1
  for (let k = 1; k < L.length; k++) {
    const rel = (L[k].l.bbox[1] - m.haut) / hauteurBloc
    if (rel < partBasse) continue
    if (sauts[k - 1] > sautMed * facteurSaut) debut = k
  }
  if (debut < 0) return []
  const bloc = L.slice(debut)
  if (!bloc.length) return []
  const hBloc = mediane(bloc.map(({ l }) => l.bbox[3]))
  if (hBloc >= m.hMed * 0.85) return []                     // pas de petit corps → pas une note
  return bloc
    .filter(({ l }) => !NUMERIQUE.test(texteDe(l)) && !SIGNATURE.test(texteDe(l))) // folio/signature exclus
    .map(({ i, l }) => ({
      i,
      role: 'note_bas_page',
      regle: 'zone_pied',
      score: 3,
      preuves: {
        hauteur_relative: Math.round((l.bbox[3] / m.hMed) * 100) / 100,
        saut_avant: Math.round(sauts[debut - 1]),
        interligne_median: Math.round(sautMed),
      },
    }))
}

/**
 * SITUER chaque ligne, en mots, pour un lecteur qui n'a pas les coordonnées — c'est-à-dire pour le
 * modèle de vision. Il reçoit aujourd'hui l'index et le texte, rien d'autre : il voit la page mais
 * ne peut relier une glose vue dans la marge à un numéro de ligne. Le moteur, lui, MESURE. On lui
 * transmet donc le résultat de la mesure, pas les pixels (un modèle ne fait rien de « x=132 ») :
 *   zone  = corps · marge-gauche · marge-droite · haut · bas
 *   corps = petit · normal · grand   (par rapport au corps typographique médian de la page)
 * Aucune décision ici : seulement une description vérifiable.
 */
export function situerLignes(lignes = []) {
  const m = mesuresPage(lignes)
  const out = new Map()
  if (!m) return out
  const hauteurBloc = Math.max(1, m.basPage - m.haut)
  const tol = m.hMed * 0.5
  ;(lignes || []).forEach((l, i) => {
    if (!aBbox(l) || !texteDe(l)) return
    const [x, y, w, h] = l.bbox
    const rel = (y - m.haut) / hauteurBloc
    let zone = 'corps'
    if ((x + w) <= m.gauche + tol) zone = 'marge-gauche'
    else if (x >= m.droite - tol) zone = 'marge-droite'
    else if (rel < 0.06) zone = 'haut'
    else if (rel > 0.94) zone = 'bas'
    const corps = h < m.hMed * 0.85 ? 'petit' : (h > m.hMed * 1.3 ? 'grand' : 'normal')
    out.set(i, { zone, corps })
  })
  return out
}

/** Analyse d'une page : marginalia + notes de pied, sans doublon (la marge prime). */
export function analyserZones(lignes, opts = {}) {
  const marge = detecterMarginalia(lignes, opts)
  const vus = new Set(marge.map((s) => s.i))
  const pied = detecterNotesBasPage(lignes, opts).filter((s) => !vus.has(s.i))
  return { marginalia: marge, notes_bas_page: pied, mesures: mesuresPage(lignes) }
}
