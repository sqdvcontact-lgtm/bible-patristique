// Conversion des chiffres romains, dans les deux sens.
//
// Remplace la table figée qui s'arrêtait à XXX : les chapitres bibliques vont
// bien au-delà (Genèse L, Exode XL, Nombres XXXVI…), et tout chapitre > 30
// restait alors en chiffres arabes dans les références, contre la règle de
// fidélité à l'édition, qui les imprime en romain.

const VALEURS = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/** Entier → chiffre romain (1 → « I », 46 → « XLVI »). 0 ou négatif : "". */
export function enRomain(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n <= 0) return "";
  let out = "";
  for (const [v, s] of VALEURS) while (n >= v) { out += s; n -= v; }
  return out;
}

const UNITE = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Chiffre romain → entier. Renvoie -1 si la graphie n'est pas canonique
 *  (« CIIL », « IIII »…), ce qui permet de repérer une lecture douteuse. */
export function versEntier(r) {
  if (typeof r !== "string" || !/^[IVXLCDM]+$/.test(r)) return -1;
  let total = 0, prec = 0;
  for (let i = r.length - 1; i >= 0; i--) {
    const v = UNITE[r[i]];
    if (v < prec) total -= v; else { total += v; prec = v; }
  }
  // Un romain bien formé se réécrit à l'identique : garde-fou contre les
  // graphies fautives que l'OCR produit parfois.
  return enRomain(total) === r ? total : -1;
}
