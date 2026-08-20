import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import type {
  BibleEditionDisplayAsset,
  BibleEditionDisplayBodyBlock,
  BibleEditionDisplayInternalNote,
  BibleEditionDisplayNote,
  BibleEditionDisplayTextBlock,
} from '@/app/lib/bibleEdition'

export type BlocTexteBiblique = BibleEditionDisplayTextBlock

export type BlocEditorialBiblique = Pick<
  BibleEditionDisplayBodyBlock,
  'id' | 'semanticStyleCode' | 'noticeSubtype' | 'heading' | 'placement' | 'textBlocks'
> & { internalNotes?: BibleEditionDisplayInternalNote[] }

export type NoteBibliqueAffichable = Pick<
  BibleEditionDisplayNote,
  'id' | 'displayNumber' | 'canonId' | 'blocks'
>

export type IllustrationBibliqueAffichable = BibleEditionDisplayAsset

const STYLE_BLOC: CSSProperties = {
  margin: '1.5rem 0',
  padding: '1rem 1.125rem',
  borderLeft: '2px solid var(--cs-bord)',
  background: 'var(--cs-fond-clair)',
  color: 'var(--cs-texte)',
  fontFamily: 'inherit',
}

function rendreBlocTexte(bloc: BlocTexteBiblique): ReactNode {
  const style: CSSProperties = {
    margin: bloc.kind === 'reference' || bloc.kind === 'attribution' ? '0.45rem 0 0' : '0 0 0.75rem',
    whiteSpace: bloc.form === 'verse' ? 'pre-line' : 'pre-wrap',
    fontStyle: bloc.kind === 'lemma' || bloc.kind === 'quotation' ? 'italic' : 'normal',
    color: bloc.kind === 'reference' || bloc.kind === 'attribution'
      ? 'var(--cs-texte-second)'
      : 'inherit',
    fontSize: bloc.kind === 'reference' || bloc.kind === 'attribution' ? '0.875rem' : '1rem',
    lineHeight: bloc.form === 'verse' ? 1.7 : 1.65,
  }
  return <p key={bloc.id} lang={bloc.language ?? undefined} style={style}>{bloc.text}</p>
}

export function IllustrationBible({ illustration }: { illustration: IllustrationBibliqueAffichable }) {
  const largeur = Math.min(illustration.width, 760)
  return (
    <figure
      data-asset-key={illustration.assetKey}
      data-asset-kind={illustration.assetKind}
      data-placement={illustration.placement}
      style={{ width: `min(100%, ${largeur}px)`, margin: '1.25rem auto', textAlign: 'center' }}
    >
      <Image
        src={illustration.url}
        alt={illustration.altText}
        width={illustration.width}
        height={illustration.height}
        sizes="(max-width: 900px) calc(100vw - 3rem), 760px"
        unoptimized
        style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }}
      />
      {illustration.caption && (
        <figcaption style={{ marginTop: '0.5rem', color: 'var(--cs-texte-second)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
          {illustration.caption}
        </figcaption>
      )}
    </figure>
  )
}

function rendreIllustrations(illustrations: readonly IllustrationBibliqueAffichable[]) {
  return illustrations.map((illustration) => (
    <IllustrationBible key={illustration.id} illustration={illustration} />
  ))
}

export function BlocEditorialBible({
  bloc,
  illustrations = [],
}: {
  bloc: BlocEditorialBiblique
  illustrations?: IllustrationBibliqueAffichable[]
}) {
  const avant = illustrations.filter((illustration) => illustration.placement === 'before')
  const dansLeFlux = illustrations.filter((illustration) => illustration.placement === 'inline')
  const apres = illustrations.filter((illustration) => illustration.placement === 'after')
  const contenu = (
    <>
      {rendreIllustrations(avant)}
      {bloc.heading && (
        <h3 style={{ margin: '0 0 0.875rem', color: 'var(--cs-texte-fort)', fontSize: '1.125rem' }}>
          {bloc.heading}
        </h3>
      )}
      {bloc.textBlocks.map(rendreBlocTexte)}
      {rendreIllustrations(dansLeFlux)}
      {(bloc.internalNotes?.length ?? 0) > 0 && (
        <aside
          aria-label="Apparat propre à ce bloc"
          style={{ borderTop: '1px solid var(--cs-bord)', marginTop: '0.75rem', paddingTop: '0.75rem' }}
        >
          <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
            {bloc.internalNotes?.map((note) => (
              <li key={note.id} value={note.displayNumber} style={{ marginBottom: '0.5rem' }}>
                {note.blocks.map(rendreBlocTexte)}
              </li>
            ))}
          </ol>
        </aside>
      )}
      {rendreIllustrations(apres)}
    </>
  )
  const props = {
    className: `cs-bible-bloc cs-bible-${bloc.semanticStyleCode}`,
    'data-semantic-style': bloc.semanticStyleCode,
    'data-notice-subtype': bloc.noticeSubtype ?? undefined,
    'data-placement': bloc.placement,
    style: STYLE_BLOC,
  }
  if (bloc.semanticStyleCode.startsWith('notice_') || bloc.semanticStyleCode.startsWith('excursus_')) {
    return <aside {...props}>{contenu}</aside>
  }
  return <section {...props}>{contenu}</section>
}

/**
 * En lecture bilingue, une note commune à l'édition est appelée depuis les deux
 * colonnes : l'identifiant de l'ancre doit alors être distingué, sans quoi la
 * page porte deux fois le même `id` et le retour de la note devient ambigu.
 */
export function ancreAppelNoteBible(noteId: string, memberId?: string): string {
  return memberId ? `appel-note-bible-${noteId}-${memberId}` : `appel-note-bible-${noteId}`
}

export function AppelNoteBible({
  noteId,
  displayNumber,
  memberId,
}: {
  noteId: string
  displayNumber: number
  memberId?: string
}) {
  return (
    <sup style={{ fontSize: '0.6em', lineHeight: 0, marginLeft: '0.08em' }}>
      <a
        id={ancreAppelNoteBible(noteId, memberId)}
        href={`#note-bible-${noteId}`}
        aria-label={`Note ${displayNumber}`}
        style={{ color: 'var(--cs-encre)', textDecoration: 'none', fontFamily: 'inherit' }}
      >
        {displayNumber}
      </a>
    </sup>
  )
}

export function NotesBibleChapitre({
  notes,
  illustrationsByNote,
  ancresRetour,
}: {
  notes: NoteBibliqueAffichable[]
  illustrationsByNote?: Map<string, IllustrationBibliqueAffichable[]>
  /** Où revient la note quand son appel porte une ancre distinguée par colonne. */
  ancresRetour?: Map<string, string>
}) {
  if (notes.length === 0) return null
  const ordonnees = [...notes].sort((a, b) => a.displayNumber - b.displayNumber)
  return (
    <section
      aria-labelledby="notes-bible-chapitre"
      style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--cs-bord)' }}
    >
      <h2 id="notes-bible-chapitre" style={{ fontSize: '1rem', color: 'var(--cs-texte-fort)', margin: '0 0 1rem' }}>
        Notes
      </h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ordonnees.map((note) => (
          <li
            key={note.id}
            id={`note-bible-${note.id}`}
            data-canon-id={note.canonId}
            style={{ display: 'grid', gridTemplateColumns: '2rem minmax(0, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}
          >
            <a
              href={`#${ancresRetour?.get(note.id) ?? ancreAppelNoteBible(note.id)}`}
              aria-label={`Retour à l’appel de la note ${note.displayNumber}`}
              style={{ color: 'var(--cs-encre)', textDecoration: 'none', fontSize: '0.8125rem' }}
            >
              {note.displayNumber}.
            </a>
            <div>
              {rendreIllustrations(
                (illustrationsByNote?.get(note.id) ?? [])
                  .filter((illustration) => illustration.placement === 'before'),
              )}
              {note.blocks.map(rendreBlocTexte)}
              {rendreIllustrations(
                (illustrationsByNote?.get(note.id) ?? [])
                  .filter((illustration) => illustration.placement !== 'before'),
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
