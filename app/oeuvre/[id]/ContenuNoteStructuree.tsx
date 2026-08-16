import { Fragment } from 'react'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

const RENDU_INLINE = 'inline_after_target'
const RENDU_RETOUR_VERSE = 'manual_line_break_in_verse'

function estReferenceRattachee(block: NoteBlocData) {
  return Boolean(
    block.targetBlockId
    && (block.kind === 'reference' || block.kind === 'attribution')
    && (block.rendering === RENDU_INLINE || block.rendering === RENDU_RETOUR_VERSE),
  )
}

/**
 * Rend les blocs sémantiques d'une note sans inventer de ponctuation ni de
 * parenthèses. Le champ `rendering` décide seul si une référence reste un
 * paragraphe, suit sa cible en ligne, ou vient après un retour dans des vers.
 */
export function ContenuNoteStructuree({ note }: { note: NoteStructuree }) {
  const blocks = [...note.blocks].sort((a, b) => a.rank - b.rank)
  const rattaches = new Map<string, NoteBlocData[]>()

  for (const block of blocks) {
    if (!estReferenceRattachee(block) || !block.targetBlockId) continue
    const list = rattaches.get(block.targetBlockId) ?? []
    list.push(block)
    rattaches.set(block.targetBlockId, list)
  }

  return (
    <div data-note-key={note.noteKey} data-note-number={note.noteNumber}>
      {blocks.filter(block => !estReferenceRattachee(block)).map(block => {
        const verse = block.form === 'verse'
        const traduction = block.kind === 'translation'
        const references = rattaches.get(block.blockId) ?? []
        const referencesInline = references.filter(reference => reference.rendering === RENDU_INLINE)
        const referencesApresVers = references.filter(reference => reference.rendering === RENDU_RETOUR_VERSE)

        return (
          <div
            key={block.blockId}
            lang={block.language ?? undefined}
            data-block-id={block.blockId}
            data-kind={block.kind}
            data-form={block.form}
            data-rendering={block.rendering ?? undefined}
            data-needs-review={String(block.needsReview)}
            style={{
              margin: '0 0 7px',
              whiteSpace: verse || referencesApresVers.length > 0 ? 'pre-line' : 'normal',
              fontStyle: 'normal',
              // Les vers cités dans une note ne portent plus d'étiquette « Vers » : ils se
              // signalent par une police un peu plus petite et un léger retrait à gauche.
              fontSize: verse ? '0.9em' : undefined,
              paddingLeft: traduction ? '10px' : verse ? '0.9em' : 0,
              borderLeft: traduction ? '2px solid var(--cs-or-doux)' : undefined,
            }}
          >
            {block.text}
            {referencesInline.map(reference => (
              <span
                key={reference.blockId}
                lang={reference.language ?? undefined}
                data-block-id={reference.blockId}
                data-kind={reference.kind}
                data-rendering={reference.rendering ?? undefined}
                data-needs-review={String(reference.needsReview)}
                style={{ fontSize: '0.92em', color: 'var(--cs-texte-second)' }}
              >
                {'\u00A0'}{reference.text}
              </span>
            ))}
            {referencesApresVers.map(reference => (
              <Fragment key={reference.blockId}>
                {'\n'}
                <span
                  lang={reference.language ?? undefined}
                  data-block-id={reference.blockId}
                  data-kind={reference.kind}
                  data-rendering={reference.rendering ?? undefined}
                  data-needs-review={String(reference.needsReview)}
                  style={{ fontSize: '0.92em', color: 'var(--cs-texte-second)' }}
                >
                  {reference.text}
                </span>
              </Fragment>
            ))}
          </div>
        )
      })}
    </div>
  )
}
