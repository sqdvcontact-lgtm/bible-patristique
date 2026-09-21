/**
 * LES NOTES DU TEXTE EN REGARD qui partent avec la page (2026-09-21).
 *
 * La lecture en regard charge les notes du texte original ENTIER : elles servent au
 * serveur, qui compose l'original de la division ouverte, et au navigateur, qui compose
 * celui des divisions suivantes et l'inventaire des notes. Sur les Confessions, c'est
 * l'apparat de Knöll : 7 277 notes et autant d'ancres, soit l'essentiel des 4,5 Mo de
 * HTML que servait la page (audit ergonomique du 21 septembre 2026), quand le livre
 * ouvert n'en appelle que 506.
 *
 * ⛔ On n'envoie donc que les notes que la page COMPOSE — celles que portent les blocs
 * originaux et les segments rendus —, et le navigateur va chercher le reste quand il en
 * a besoin (`OeuvreClient`, `notesEnRegardCompletes`). Le serveur, lui, a déjà tout
 * composé avec l'appareil entier : rien de ce qui paraît à l'arrivée ne change.
 *
 * ⚠️ Une note se garde par son SEGMENT : `notesParSegment` et `ancresParSegment` sont
 * indexés par la clé du segment original, et un segment dont une note paraît emporte
 * toutes les siennes, et toutes ses ancres, sans quoi un appel resterait sans note.
 *
 * Module pur, testé par notesEnRegard.test.ts.
 */

import type { AncreNoteStructureeProjection } from '@/app/lib/appelsNotesStructurees'
import type { NoteAffichee, NoteStructuree } from './oeuvreTypes'

type NotesParSegment = Record<string, Record<string, NoteStructuree>>
type AncresParSegment = Record<string, AncreNoteStructureeProjection[]>

export type NotesEnRegardEnvoyees = {
  notes: NotesParSegment
  ancres: AncresParSegment
  /** Vrai quand des notes ont été laissées au serveur : le navigateur les demandera. */
  partielles: boolean
}

/**
 * Les notes du texte en regard que la page compose, et elles seules.
 * `montrees` porte les tables de notes réellement posées dans le rendu : celles des
 * blocs originaux, celles que les segments portent (`notesOriginal`).
 */
export function notesEnRegardUtiles(
  notes: NotesParSegment,
  ancres: AncresParSegment,
  montrees: Iterable<Record<string, NoteAffichee> | null | undefined>,
): NotesEnRegardEnvoyees {
  const clesMontrees = new Set<string>()
  for (const table of montrees) {
    if (!table) continue
    // Une note héritée (une chaîne) n'a pas d'identité : elle ne vient pas de l'appareil.
    for (const note of Object.values(table)) if (typeof note !== 'string') clesMontrees.add(note.noteKey)
  }
  const gardees: NotesParSegment = {}
  const ancresGardees: AncresParSegment = {}
  let partielles = false
  for (const [segment, table] of Object.entries(notes)) {
    if (Object.values(table).some(note => clesMontrees.has(note.noteKey))) {
      gardees[segment] = table
      if (ancres[segment]) ancresGardees[segment] = ancres[segment]
    } else {
      partielles = true
    }
  }
  // Une ancre dont le segment n'a pas de note rangée ne sert à rien au rendu ; mais la
  // compter parmi ce qu'on laisse garde `partielles` honnête.
  if (!partielles && Object.keys(ancres).some(segment => !(segment in gardees))) partielles = true
  return { notes: gardees, ancres: ancresGardees, partielles }
}
