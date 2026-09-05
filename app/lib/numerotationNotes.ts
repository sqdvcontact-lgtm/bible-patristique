// NUMÉRO AFFICHÉ D'UNE NOTE — charte § 13.8, arbitré le 5 septembre 2026.
//
// Deux numéros coexistent, et les confondre casserait 23 569 ancres :
//
//   note_number   INTERNE. L'identité et l'ordre de lecture. ⛔ NE BOUGE JAMAIS.
//                 `texte_note_ancres.marker` vaut exactement `[[note_number]]` :
//                 le renuméroter, c'est réécrire LES DEUX, et perdre l'ancrage.
//   numéro affiché  CE QUE LE LECTEUR VOIT. Calculé au rendu, jamais stocké.
//
// DEUX RÈGLES, et une raison mesurée pour chacune :
//
// 1. Le numéro affiché RECOMMENCE À 1 à chaque division de NIVEAU 1. Sans quoi
//    treize textes sur quarante-sept affichent des appels à trois chiffres, que
//    l'exposant rend illisibles : Cité de Dieu latine 731, Manuel pour mon fils
//    443, Questions sur l'Heptateuque 241.
//
// 2. L'APPARAT CRITIQUE COMPTE À PART. Mêlé aux notes de lecture, il les noie :
//    les Confessions passent de 1 039 à moins de 90 par livre dès qu'on l'en
//    sort. Ce ne sont pas deux séries par commodité de calcul — ce sont deux
//    appareils, que le lecteur consulte pour des raisons différentes.
//
// ⚠️ Le rang de division ne se lit PAS dans `texte_notes.book`. Mesuré le
// 5 septembre 2026 : sur `A0044O0003TFR-V11`, `book` et le `ref_niv1` du segment
// ancré diffèrent sur les 1 830 notes, sans exception ; sur la Cité de Dieu
// française, sur 1 595 des 1 804. `book` est une métadonnée d'import, la division
// est une propriété du TEXTE SERVI. C'est l'ancre qui fait foi.

/** Une note à numéroter, dans l'ordre de lecture. */
export type NoteANumeroter = {
  noteKey: string
  /** La division de niveau 1 du segment ancré (`segments.ref_niv1`). Les notes
   *  qu'aucune division ne couvre — liminaires, ou ancre manquante — partagent
   *  la division vide, exactement comme la numérotation des paragraphes. */
  division: string
  /** La note relève-t-elle de l'apparat critique ? Elle compte alors dans la
   *  seconde série. */
  apparat: boolean
}

/**
 * Rend, pour chaque `noteKey`, le numéro à AFFICHER.
 *
 * ⛔ L'ordre du tableau reçu EST l'ordre de lecture, et cette fonction ne le
 * retrie pas : elle ne connaît ni `note_number` ni `segment_offset_unicode`, et
 * le tri appartient à la requête, qui seule dispose des index. Une entrée
 * dupliquée garde son premier numéro — une note rappelée deux fois ne change pas
 * de numéro entre ses deux appels.
 */
export function numerosAffiches(notes: readonly NoteANumeroter[]): Map<string, number> {
  const numeros = new Map<string, number>()
  // Une série par (division × appareil). Deux compteurs suffiraient si les
  // divisions se suivaient sans retour ; elles se suivent, mais un texte mal
  // ordonné ne doit pas faire repartir un compteur déjà servi.
  const compteurs = new Map<string, number>()

  for (const note of notes) {
    if (numeros.has(note.noteKey)) continue
    // ⛔ AUCUN séparateur, et il n'en faut pas : le drapeau fait UNE lettre, donc
    // aucune division ne peut produire la clé d'une autre série. Un séparateur
    // invisible avait été posé ici, que ni la relecture ni les tests ne voyaient —
    // git tenait le fichier pour BINAIRE, ce qui est le seul signe qu'il en donnait.
    const serie = `${note.apparat ? 'A' : 'N'}${note.division}`
    const suivant = (compteurs.get(serie) ?? 0) + 1
    compteurs.set(serie, suivant)
    numeros.set(note.noteKey, suivant)
  }

  return numeros
}
