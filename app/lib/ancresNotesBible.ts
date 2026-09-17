/**
 * L'ANCRE D'UNE NOTE DE BLOC SANS POINT D'APPEL — le contrat entre la page Bible, qui la
 * pose, et l'inventaire des notes, qui la vise (`ouvrirNoteBible.ts`).
 *
 * ⚠️ Une note de bloc dont la transcription n'a relevé aucun point d'appel se lit dans
 * l'apparat de son bloc, au pied du développement (`BlocEditorialBible`) : elle n'a pas
 * d'appel à cliquer, et c'est son ENTRÉE que l'inventaire pose sous les yeux. Relevé au
 * 13 septembre 2026 : 231 notes de bloc sur 1 056.
 *
 * ⛔ Le préfixe n’est pas celui d’une note de verset : l’entrée d’un apparat de bloc ne
 * se confond pas avec elle (`BibleEditionParatext.test.tsx`).
 *
 * ⛔ Un module à part, et minuscule : la page le charge pour chaque lecteur, quand
 * l'ouverture d'une note n'est chargée qu'avec l'onglet d'administration.
 */
export function ancreNoteSansAppelBible(noteId: string): string {
  return `entree-apparat-${noteId}`
}
