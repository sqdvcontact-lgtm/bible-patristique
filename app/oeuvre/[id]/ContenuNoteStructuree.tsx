import { Fragment } from 'react'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'
import { normaliserReferencesDansTexte, terminerNote } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
import { estNoteApparatCritique } from '@/app/lib/apparatCritique'
import { ContenuApparatCritique } from './ApparatCritique'

// Le texte d'un bloc de RENVOI biblique (kind='reference') est normalisé au rendu :
// « 1Co. 2, 16 » → « 1 Co 2, 16 », chapitre romain → arabe, virgule avant le verset.
// Tous les blocs passent ensuite par la composition typographique de lecture :
// espaces de la charte §3.2 et ponctuation des citations de la charte §3.8.
function texteBloc(bloc: NoteBlocData): string {
  const texte = bloc.kind === 'reference' ? normaliserReferencesDansTexte(bloc.text) : bloc.text
  return normaliserTypographieLecture(texte)
}
// Ponctuation finale : appliquée uniquement à la DERNIÈRE pièce rendue de la note
// (le point final ne doit apparaître qu'une fois, en fin de note). Idempotent.
function texteFinal(texte: string, estDernier: boolean): string {
  return estDernier ? terminerNote(texte) : texte
}

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
  // L'APPARAT CRITIQUE se compose à part : ni typographie de lecture, ni point
  // final ajouté, ni référence normalisée — la notation philologique se rend
  // telle quelle (voir ApparatCritique.tsx). La bifurcation ne tient PAS au
  // `kind` — `commentary` couvre aussi la note de prose ordinaire — mais à
  // `metadata.editorial_role`, et elle exige que TOUS les blocs de la note en
  // relèvent : toute note qui n'est pas intégralement un apparat continue de
  // passer par le rendu ci-dessous, inchangé.
  if (estNoteApparatCritique(note)) return <ContenuApparatCritique note={note} />

  const blocks = [...note.blocks].sort((a, b) => a.rank - b.rank)
  const rattaches = new Map<string, NoteBlocData[]>()

  for (const block of blocks) {
    if (!estReferenceRattachee(block) || !block.targetBlockId) continue
    const list = rattaches.get(block.targetBlockId) ?? []
    list.push(block)
    rattaches.set(block.targetBlockId, list)
  }

  // Blocs effectivement rendus, et identifiant du dernier : c'est sa dernière pièce
  // qui portera le point final de la note.
  const affiches = blocks.filter(block => !estReferenceRattachee(block))
  const dernierBlocId = affiches.at(-1)?.blockId

  return (
    <div data-note-key={note.noteKey} data-note-number={note.noteNumber}>
      {affiches.map(block => {
        const verse = block.form === 'verse'
        const traduction = block.kind === 'translation'
        const references = rattaches.get(block.blockId) ?? []
        const referencesInline = references.filter(reference => reference.rendering === RENDU_INLINE)
        const referencesApresVers = references.filter(reference => reference.rendering === RENDU_RETOUR_VERSE)
        // Dans le DERNIER bloc, la dernière pièce rendue reçoit le point final.
        const estDernierBloc = block.blockId === dernierBlocId
        const finSurApresVers = estDernierBloc && referencesApresVers.length > 0
        const finSurInline = estDernierBloc && referencesApresVers.length === 0 && referencesInline.length > 0
        const finSurTexte = estDernierBloc && referencesApresVers.length === 0 && referencesInline.length === 0

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
            {texteFinal(texteBloc(block), finSurTexte)}
            {referencesInline.map((reference, i) => (
              <span
                key={reference.blockId}
                lang={reference.language ?? undefined}
                data-block-id={reference.blockId}
                data-kind={reference.kind}
                data-rendering={reference.rendering ?? undefined}
                data-needs-review={String(reference.needsReview)}
                style={{ fontSize: '0.92em', color: 'var(--cs-texte-second)' }}
              >
                {'\u00A0'}{texteFinal(texteBloc(reference), finSurInline && i === referencesInline.length - 1)}
              </span>
            ))}
            {referencesApresVers.map((reference, i) => (
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
                  {texteFinal(texteBloc(reference), finSurApresVers && i === referencesApresVers.length - 1)}
                </span>
              </Fragment>
            ))}
          </div>
        )
      })}
    </div>
  )
}
