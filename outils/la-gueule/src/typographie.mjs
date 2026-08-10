// Passe 3 Q3 — separation stricte : espacement DIPLOMATIQUE (verite terrain, tel qu'imprime)
// vs typographie de RENDU (convention francaise, posee seulement a l'affichage). La couche
// diplomatique et le ground-truth ne portent JAMAIS de fine insecable U+202F : on transcrit ce
// que l'image permet d'etablir. La fine n'est ajoutee que par la fonction de rendu ci-dessous,
// au moment d'afficher ou de produire un export explicitement nomme lecture.

const FINE = '\u202F'                               // espace fine insecable
const FINS = '[ \u00A0\u202F\u2009\u2007\u2008]*' // espaces a absorber
const OUV = '\u00AB'                                // guillemet ouvrant «
const FERM = '\u00BB'                               // guillemet fermant »

/**
 * Typographie de LECTURE (rendu moderne) : ajoute la fine avant ; : ! ? et a l'interieur des
 * guillemets francais. A n'utiliser qu'au rendu / export « lecture ». Idempotente. NE MODIFIE PAS
 * le texte diplomatique stocke : c'est a l'appelant de ne l'employer que pour l'affichage.
 */
export function appliquerTypographieLecture(texte) {
  return String(texte ?? '')
    .replace(new RegExp(FINS + '([;:!?])', 'g'), FINE + '$1')   // fine avant ; : ! ?
    .replace(new RegExp(OUV + FINS, 'g'), OUV + FINE)           // fine apres «
    .replace(new RegExp(FINS + FERM, 'g'), FINE + FERM)         // fine avant »
}

/**
 * Espacement DIPLOMATIQUE du ground-truth : jamais de fine. Une fine/insecable saisie par erreur
 * avant ; : ! ? est ramenee a l'espace ordinaire U+0020 ; la ponctuation collee reste collee.
 */
export function espacementDiplomatique(texte) {
  const INS = '[\u00A0\u202F\u2009]'
  return String(texte ?? '')
    .replace(new RegExp(INS + '+([;:!?' + FERM + '])', 'g'), ' $1')
    .replace(new RegExp('(' + OUV + ')' + INS + '+', 'g'), '$1 ')
    .replace(new RegExp(INS, 'g'), ' ')   // aucune fine residuelle dans le diplomatique
}

/** true si le texte contient une fine insecable U+202F (garde-fou export d'entrainement). */
export function contientFine(texte) {
  return new RegExp(FINE).test(String(texte ?? ''))
}

// ── Modernisation GLYPHIQUE (charte §14.3, imprimes anciens) ─────────────────
//
// « Moderniser les caracteres purement glyphiques lorsque l'identite du mot ne change pas,
//   notamment le s long et certaines ligatures. Cette operation ne permet pas de moderniser
//   l'orthographe, les desinences, le vocabulaire ou la casse porteuse de sens. » (§14.3)
//
// On ne touche donc QUE des variantes de FORME d'une meme lettre : « eſtre » → « estre »
// (et surtout PAS « etre »). Sont volontairement EXCLUS :
//   - æ Æ œ Œ : ce sont des LETTRES du mot (lexicales), pas des ligatures typographiques ;
//   - les abreviations (tilde ẽ, esperluette &, tironien ⁊) : leur resolution appartient a la
//     couche « developpee » (§14.6), jamais a une substitution mecanique ;
//   - u/v et i/j : allographes dont la regularisation depend de la position dans le mot ;
//     laisses a la decision editoriale (le prompt les soumet a l'humain), jamais automatiques.
// Regime MANUSCRIT (§14.4) : transcription diplomatique — cette fonction n'y est PAS appliquee.
const GLYPHES_ANCIENS = Object.freeze({
  'ſ': 's',    // ſ  s long
  'ﬅ': 'st',   // ﬅ  ligature s long + t
  'ﬆ': 'st',   // ﬆ  ligature st
  'ﬀ': 'ff',   // ﬀ
  'ﬁ': 'fi',   // ﬁ
  'ﬂ': 'fl',   // ﬂ
  'ﬃ': 'ffi',  // ﬃ
  'ﬄ': 'ffl',  // ﬄ
})

// ── Garde-fous de PONCTUATION et de graphie sur une proposition de correction ────────────────
//
// Mesuré sur une passe réelle (35 pages) : le modèle transforme parfois une virgule en POINT
// devant une minuscule (« de sa plenitude. quelle opulence » — un point suivi d'une minuscule
// n'est pas une phrase), insère une ESPACE avant un point (« auec luy . c'est »), dégrade
// l'apostrophe typographique « ’ » en apostrophe droite, ou convertit la césure « ¬ » en trait
// « - » — ce dernier cas corrompt le texte à l'export, puisque `joindreLignes` supprime le ¬ mais
// CONSERVE le trait : « mi¬ » + « serables » donnait « miserables », « mi- » donne « mi-serables ».
//
// Ces quatre altérations ne sont jamais des lectures de l'image : ce sont des glissements. On les
// répare sur la proposition, sans rejeter la correction utile qui l'accompagne — exactement comme
// pour le « ſ ». Fonction PURE, testée.
const APO_TYPO = '’'

export function reparerDerives(avant, apres) {
  const a = String(avant ?? '')
  let b = String(apres ?? '')
  const reparees = []
  // 1. Césure « ¬ » convertie en trait d'union : rétablie (sinon le mot est coupé à l'export).
  if (/¬\s*$/.test(a) && /-\s*$/.test(b) && !/¬\s*$/.test(b)) {
    b = b.replace(/-(\s*)$/, '¬$1'); reparees.push('césure ¬ rétablie')
  }
  // 2. Apostrophe typographique dégradée en apostrophe droite (charte §3.2).
  if (a.includes(APO_TYPO) && b.includes("'")) {
    const avantTypo = [...b]
    b = b.replace(/'/g, APO_TYPO)
    if (b !== avantTypo.join('')) reparees.push('apostrophe ’ rétablie')
  }
  // 3. Espace insérée avant un point ou une virgule (jamais correct en français).
  if (/\s+[.,]/.test(b) && !/\s+[.,]/.test(a)) {
    b = b.replace(/\s+([.,])/g, '$1'); reparees.push('espace avant ponctuation retirée')
  }
  // 4. Virgule / point-virgule changés en POINT devant une minuscule : incohérent, on rétablit.
  b = b.replace(/([^\s.])\.(\s*)([a-zà-öø-ÿ])/gu, (tout, av, esp, min, pos) => {
    const src = a.slice(Math.max(0, pos - 2), pos + tout.length + 2)
    if (/[,;]/.test(src) && !/\./.test(src)) { reparees.push('point ramené à la virgule'); return av + ',' + esp + min }
    return tout
  })
  return { texte: b, reparees }
}

/** Les caracteres purement glyphiques presents dans le texte (ordre d'apparition, sans doublon). */
export function glyphesAnciens(texte) {
  const vus = []
  for (const c of String(texte ?? '')) if (GLYPHES_ANCIENS[c] && !vus.includes(c)) vus.push(c)
  return vus
}

/** true si le texte porte au moins un caractere purement glyphique a moderniser. */
export function contientGlyphesAnciens(texte) {
  return glyphesAnciens(texte).length > 0
}

/**
 * Modernise les seuls caracteres purement GLYPHIQUES (§14.3). Idempotente, sans effet sur
 * l'orthographe, les accents, la casse, les abreviations ni la ponctuation.
 */
export function moderniserGlyphes(texte) {
  let out = ''
  for (const c of String(texte ?? '')) out += (GLYPHES_ANCIENS[c] ?? c)
  return out
}
