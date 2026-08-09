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
