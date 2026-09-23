// LE NOM ACCESSIBLE DU NUMÉRO D'UN VERSET — une seule écriture, deux lectures.
//
// ⛔ Le numéro d'un verset EST son bouton pour le clavier, sur la page Bible comme dans
// la lecture en regard : son `aria-label` remplace son contenu, et « Verset N » seul
// taisait ce que le numéro MONTRE — la numérotation d'une autre tradition, et le signet
// d'un verset qu'on a mis de côté. Il vivait dans `TexteBible`, et la lecture en regard
// en écrivait un second, plus pauvre : deux noms pour un même objet finissent toujours
// par ne plus dire la même chose.

/** Le nom du numéro d'un verset, pour qui ne voit pas la page : son numéro, la
 *  numérotation d'une autre tradition s'il en porte une, et l'état prélevé. */
export function libelleNumeroVerset(
  v: { verset: number; chapitre_alternatif?: number | null; verset_alternatif?: number | null },
  preleve: boolean,
): string {
  let libelle = `Verset ${v.verset}`
  if (v.chapitre_alternatif != null) {
    libelle += ` (autre numérotation : ${v.chapitre_alternatif}${v.verset_alternatif != null ? `, ${v.verset_alternatif}` : ''})`
  }
  return preleve ? `${libelle}, prélevé` : libelle
}
