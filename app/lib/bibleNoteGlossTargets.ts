export type BibleGlossNoteTargetRow = {
  note_id: string
  host_canon_id: string
  target_verse_id: string
}

/**
 * Déplace uniquement l'ANCRE DE RENDU d'une note vers une ligne surnuméraire.
 *
 * La donnée canonique de la note reste intacte en base. Cette fonction ne touche
 * qu'au payload envoyé au lecteur : son `canon_id` devient alors l'identifiant de
 * la ligne de glose que le rendu utilise déjà comme axe. Une note sans cible sûre
 * conserve son créneau canonique.
 *
 * La vue SQL garantit une ligne par note ; on garde néanmoins une garde locale :
 * deux cibles différentes pour la même note seraient une incohérence de contrat,
 * jamais une invitation à choisir silencieusement.
 */
export function retargeterNotesVersGloses<T extends { id: string; canon_id: string }>(
  notes: readonly T[],
  targets: readonly BibleGlossNoteTargetRow[],
): T[] {
  const parNote = new Map<string, string>()
  for (const target of targets) {
    const current = parNote.get(target.note_id)
    if (current && current !== target.target_verse_id) {
      throw new Error(`Plusieurs cibles de glose pour la note ${target.note_id}`)
    }
    parNote.set(target.note_id, target.target_verse_id)
  }

  return notes.map((note) => {
    const target = parNote.get(note.id)
    return target && target !== note.canon_id
      ? { ...note, canon_id: target }
      : note
  })
}
