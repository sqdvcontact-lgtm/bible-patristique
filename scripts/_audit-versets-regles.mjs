// Règles d'audit des traductions bibliques — module PUR, testé.
//
// Il ne parle ni à la base ni au réseau : il reçoit des créneaux canoniques déjà
// chargés et rend des constats. C'est ce qui permet de le tester (voir le fichier
// `.test.mjs` voisin) et de discuter les seuils sans relancer un audit complet.
//
// VOCABULAIRE. Un « créneau » est un `canon_id` : la case canonique où les cinq
// traductions se rejoignent. Une traduction peut y verser PLUSIEURS versets de son
// édition source (d'où l'agrégation par `ordre_slot`, `v_orig`). Comparer deux
// traductions, c'est donc comparer ce qu'elles versent dans le même créneau.

/**
 * Longueur MÉDIANE d'un créneau, par traduction, mesurée sur les 22 488 créneaux que
 * les cinq portent ensemble. Sert à normaliser : le latin est naturellement plus court
 * que le français, le grec entre les deux. Sans cette normalisation, la Vulgate
 * paraîtrait tronquée partout.
 *
 * ⚠️ À recalculer si le corpus change beaucoup : la requête est en tête du script
 * `audit-versets.mjs`, sous « recalibrer ».
 */
export const FACTEURS = {
  TR0001: 140, // Bible de Sacy (français)
  TR0002: 125, // Bible Segond (français)
  TR0003: 126, // Bible Crampon (français)
  TR0004: 107, // Vulgate clémentine (latin)
  TR0005: 113, // Septante de Swete (grec)
}

/** En deçà de cette longueur de consensus, le rapport est trop bruité pour signifier. */
export const PLANCHER_CONSENSUS = 40

/** Un créneau doit être porté par au moins tant de traductions pour qu'un écart ait un sens. */
export const TEMOINS_MINIMUM = 3

/** Au-delà de tant de créneaux absents dans un même livre, la cause est SYSTÉMATIQUE. */
export const SEUIL_SYSTEMATIQUE = 8

/**
 * Texte NET : ce qu'on mesure. On retire le balisage éditorial (`<i>…</i>`, les mots
 * suppléés par le traducteur chez Sacy : 8 526 paires, parfaitement équilibrées, qui
 * gonfleraient le compte de caractères de la seule Sacy), puis on ramène toute suite
 * de blancs à une espace simple.
 */
export function texteNet(texte) {
  if (!texte) return ''
  return texte.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Un verset « suspendu » ne se termine par aucune ponctuation forte. Pris SEUL, ce
 * signal ne vaut rien : 10 % des versets du corpus finissent ainsi, et légitimement,
 * la phrase se poursuivant au verset suivant. Il ne sert qu'en CONJONCTION avec un
 * écart de longueur, où il fait passer la proportion de 10,4 % à 34,6 %.
 */
export function estSuspendu(texteNettoye) {
  return texteNettoye.length > 0 && !/[.!?:;»”"'’)\]…]$/.test(texteNettoye)
}

/**
 * Marques suspectes dans le texte. Chaque règle a été confrontée au corpus avant
 * d'entrer ici : ce qui relevait d'une convention éditoriale en a été RETIRÉ.
 *
 * ⛔ Ne sont PAS des défauts, et ne figurent donc pas ci-dessous :
 *  · `<i>…</i>` chez Sacy — les mots suppléés par le traducteur, convention d'édition ;
 *  · `[…]` chez Crampon et Sacy — les additions éditoriales et les variantes ;
 *  · l'absence de ponctuation finale — voir `estSuspendu`.
 */
export function residus(texte) {
  const trouves = []
  if (!texte) return trouves
  if (/^\s*\d+[.:]?\s/.test(texte)) trouves.push('numero-de-verset-en-tete')
  // Classe écrite en POINTS DE CODE : ces caractères sont invisibles dans un éditeur, et
  // une réécriture du fichier les effacerait sans rien montrer (même piège que typographie.ts).
  // ⚠️ La plage C1 (U+0080-U+009F) compte AUTANT que la C0 : les neuf cas trouvés dans la
  // Septante sont tous des C1 (U+0081, U+008D, U+009A, U+009C), résidus d une conversion
  // d encodage. Une classe bornée à U+007F ne les voyait pas.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(texte)) trouves.push('caractere-de-controle')
  // Un numéro de l édition source RESTÉ DANS le texte : « …τὴν ἡμέραν· (37)ἔχειν δὲ… ».
  // Ce n est pas une scorie mais la trace d une frontière de verset que l import n a pas
  // coupée : deux versets source concaténés en une seule ligne.
  if (/\(\d+\)/.test(texte)) trouves.push('numero-entre-parentheses')
  if (/&[a-zA-Z]+;|&#\d+;/.test(texte)) trouves.push('entite-html')
  if (/\s\s/.test(texte)) trouves.push('espaces-doubles')
  if (texte !== texte.trim()) trouves.push('espaces-aux-bords')
  const ouvrants = (texte.match(/<i>/g) || []).length
  const fermants = (texte.match(/<\/i>/g) || []).length
  if (ouvrants !== fermants) trouves.push('balise-italique-desequilibree')
  return trouves
}

/** Médiane d'une liste de nombres (liste non vide). */
export function mediane(valeurs) {
  const t = [...valeurs].sort((a, b) => a - b)
  const m = t.length >> 1
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2
}

/**
 * Écarts de longueur pour UN créneau.
 * @param {Record<string,string>} textesParTraduction  texte NET, par trad_id
 * @returns {Array<{trad_id, longueur, attendu, ratio}>}
 */
export function ecartsDuCreneau(textesParTraduction) {
  const entrees = Object.entries(textesParTraduction)
    .filter(([trad, t]) => FACTEURS[trad] && t.length > 0)
    .map(([trad, t]) => ({ trad_id: trad, longueur: t.length, normalisee: t.length / FACTEURS[trad] }))
  if (entrees.length < TEMOINS_MINIMUM) return []
  const consensus = mediane(entrees.map(e => e.normalisee))
  // Le consensus est une longueur normalisée ; on le ramène en caractères « français »
  // (facteur 126, la médiane de Crampon) pour lui appliquer le plancher.
  if (consensus * 126 < PLANCHER_CONSENSUS) return []
  return entrees.map(e => ({
    trad_id: e.trad_id,
    longueur: e.longueur,
    attendu: Math.round(consensus * FACTEURS[e.trad_id]),
    ratio: +(e.normalisee / consensus).toFixed(2),
  }))
}

/**
 * Gravité d'un écart. Le côté COURT est le signal fort : une traduction beaucoup plus
 * brève que ses pairs est presque toujours tronquée. Le côté LONG demande un œil humain,
 * surtout pour la Septante, dont les divergences avec le texte hébreu sont réelles et
 * documentées : elle porte à elle seule 39 des 44 créneaux « trois fois trop longs ».
 */
export function graviteEcart({ ratio }, suspendu) {
  if (ratio <= 0.5 && suspendu) return 'P1-troncature-probable'
  if (ratio <= 0.333) return 'P2-beaucoup-trop-court'
  if (ratio <= 0.5) return 'P3-trop-court'
  if (ratio >= 3) return 'P4-beaucoup-trop-long'
  if (ratio >= 2) return 'P5-trop-long'
  return null
}

/**
 * Partage les créneaux absents entre cause SYSTÉMATIQUE et cas ISOLÉS.
 *
 * C'est le partage qui rend l'audit utilisable. Un livre entier qui manque à une
 * traduction n'est pas un défaut d'alignement : Segond, protestante, n'a pas les
 * additions grecques d'Esther (108) ni de Daniel (67) ; la Septante diverge du texte
 * hébreu dans Jérémie (75) et Baruch (72) ; la Vulgate décale la numérotation des
 * titres de psaumes (69, tous dans PSA). Ces cas sont ÉCARTÉS, non corrigés.
 *
 * Ce qui reste — quelques dizaines de créneaux éparpillés — est ce qu'il faut regarder.
 *
 * @param {Array<{trad_id, canon_id, livre, temoins}>} absents
 */
export function partagerAbsents(absents) {
  const parLivre = new Map()
  for (const a of absents) {
    const cle = `${a.trad_id}|${a.livre}`
    parLivre.set(cle, (parLivre.get(cle) || 0) + 1)
  }
  const systematiques = []
  const isoles = []
  for (const a of absents) {
    const n = parLivre.get(`${a.trad_id}|${a.livre}`)
    ;(n >= SEUIL_SYSTEMATIQUE ? systematiques : isoles).push({ ...a, dans_ce_livre: n })
  }
  return { systematiques, isoles }
}
