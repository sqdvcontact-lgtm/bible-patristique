import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import type {
  BibleEditionDisplayAsset,
  BibleEditionDisplayBodyBlock,
  BibleEditionDisplayInternalNote,
  BibleEditionDisplayNote,
  BibleEditionDisplayTextBlock,
} from '@/app/lib/bibleEdition'
import { rangTitreBloc } from '@/app/lib/bibleEdition'

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

// Le paratexte se compose comme le reste du site, non comme un encart : la
// police et la mesure de la page Bible pour le texte, et les rangs de titre de
// la page d'œuvre pour ce qui surmonte. Les encadrés à fond teinté qui
// tenaient lieu de style au premier jet ont disparu — un commentaire de Fillion
// n'est pas une alerte, c'est du texte d'édition.
const SERIF = 'var(--font-source-serif), Georgia, serif'

/** Rangs de titre, calqués sur niv1 · niv2 · niv3 de la page d'œuvre. */
const RANGS_TITRE: Record<1 | 2 | 3, CSSProperties> = {
  1: { fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 500, color: 'var(--cs-encre)', letterSpacing: '0.01em' },
  2: { fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: 500, color: 'var(--cs-texte-fort)' },
  3: { fontSize: '0.78125rem', fontWeight: 600, color: 'var(--cs-texte)', letterSpacing: '0.02em' },
}

// Corps d'un paratexte : la composition d'un verset de la page Bible.
const STYLE_CORPS: CSSProperties = {
  fontFamily: SERIF,
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: 'var(--cs-texte-fort)',
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'break-word',
}

function rendreBlocTexte(bloc: BlocTexteBiblique): ReactNode {
  const discret = bloc.kind === 'reference' || bloc.kind === 'attribution'
  const style: CSSProperties = {
    ...STYLE_CORPS,
    margin: discret ? '0.35rem 0 0' : '0 0 0.6rem',
    whiteSpace: bloc.form === 'verse' ? 'pre-line' : 'pre-wrap',
    fontStyle: bloc.kind === 'lemma' || bloc.kind === 'quotation' ? 'italic' : 'normal',
    ...(discret
      ? { color: 'var(--cs-texte-second)', fontSize: '0.8125rem', textAlign: 'left' as const }
      : {}),
    ...(bloc.form === 'verse' ? { lineHeight: 1.6, textAlign: 'left' as const } : {}),
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
        <figcaption style={{ marginTop: '0.5rem', fontFamily: SERIF, fontStyle: 'italic', color: 'var(--cs-texte-second)', fontSize: '0.8125rem', lineHeight: 1.4 }}>
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
  const rang = rangTitreBloc(bloc.semanticStyleCode)
  // Une notice et un excursus se tiennent à côté du fil : ils prennent le filet
  // de gauche des intertitres d'œuvre. Le reste est du texte suivi.
  const enMarge = bloc.semanticStyleCode.startsWith('notice_')
    || bloc.semanticStyleCode.startsWith('excursus_')
  const contenu = (
    <>
      {rendreIllustrations(avant)}
      {bloc.heading && (
        <h3 style={{ ...RANGS_TITRE[rang], margin: '0 0 0.5rem', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
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
    style: {
      margin: rang === 1 ? '1.5rem 0 1.25rem' : '1.25rem 0 0.9rem',
      ...(enMarge
        ? { paddingLeft: '11px', borderLeft: '1px solid var(--cs-bord)' }
        : {}),
    } as CSSProperties,
  }
  if (enMarge) return <aside {...props}>{contenu}</aside>
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
        style={{ color: 'var(--cs-encre)', textDecoration: 'none', fontFamily: SERIF }}
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
      <h2 id="notes-bible-chapitre" style={{ ...RANGS_TITRE[3], margin: '0 0 0.75rem', lineHeight: 1.3 }}>
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
              style={{ color: 'var(--cs-texte-faible)', textDecoration: 'none', fontSize: '0.625rem', fontWeight: 600, fontFamily: SERIF, textAlign: 'right', paddingTop: '0.2rem' }}
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
