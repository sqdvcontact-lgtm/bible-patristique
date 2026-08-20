import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import type {
  BibleEditionDisplayAsset,
  BibleEditionDisplayBodyBlock,
  BibleEditionDisplayInternalNote,
  BibleEditionDisplayNote,
  BibleEditionDisplayTextBlock,
} from '@/app/lib/bibleEdition'
import {
  classeIntituleTitre,
  classesDuStyle,
  resoudreStyleSemantique,
  diviserIntitule,
} from '@/app/lib/bibleHierarchieSemantique'

export type BlocTexteBiblique = BibleEditionDisplayTextBlock

export type BlocEditorialBiblique = Pick<
  BibleEditionDisplayBodyBlock,
  'id' | 'semanticStyleCode' | 'niveauHtml' | 'noticeSubtype' | 'heading' | 'placement' | 'textBlocks'
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


// Corps d'un paratexte : la composition d'un verset de la page Bible, mais un
// cran en dessous. Une introduction de Fillion se lit AUTOUR du texte biblique,
// non à sa place : elle se compose donc plus petit, plus serré et d'une encre
// plus claire. C’est cette différence de composition qui la situe, et non un
// filet dans la marge — ⛔ aucun filet à gauche ni sous un bloc.
const STYLE_CORPS: CSSProperties = {
  fontFamily: SERIF,
  fontSize: '0.8125rem',
  lineHeight: 1.4,
  color: 'var(--cs-texte-second)',
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

  // Le registre décide, et lui seul. Un style qu'il ignore n'est PAS aplati en
  // paragraphe générique : il n'est pas rendu, et l'administration le signale.
  const resolu = resoudreStyleSemantique(bloc.semanticStyleCode)
  if (!resolu || !resolu.bodyBlock) return null

  const intitule = diviserIntitule(bloc.heading ?? null)
  // La balise vient des parents réellement présents, jamais du chiffre du jeton.
  const Balise = `h${bloc.niveauHtml ?? 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  const contenu = (
    <>
      {rendreIllustrations(avant)}
      {intitule && (resolu.headingRole === 'title' && resolu.headingLevel ? (
        // Cas mixte : l'intitulé EST un titre — celui de la péricope —, distinct
        // du développement qui le suit. Les deux ne se concatènent jamais.
        <Balise className={classeIntituleTitre(resolu.headingLevel)}>
          {intitule.titre}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{intitule.sousTitre}</span>}
        </Balise>
      ) : resolu.kind === 'title' ? (
        <Balise className={classesDuStyle(resolu)[0]}>
          {intitule.titre}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{intitule.sousTitre}</span>}
        </Balise>
      ) : (
        // Simple repère interne : jamais une balise de titre, sans quoi il
        // entrerait dans le plan d'accessibilité par la bande.
        <p className="cs-bible-info-label">
          {intitule.titre}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{intitule.sousTitre}</span>}
        </p>
      ))}
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
  // Le jeton de niveau et le modificateur de nature : deux classes, deux axes.
  const props = {
    className: ['cs-bible-bloc', ...classesDuStyle(resolu)].join(' '),
    'data-semantic-style': resolu.canonique,
    'data-niveau': resolu.level,
    'data-nature': resolu.nature,
    'data-notice-subtype': bloc.noticeSubtype ?? undefined,
    'data-placement': bloc.placement,
  }
  // Une notice et un excursus se tiennent à côté du fil de lecture.
  if (resolu.nature === 'notice' || resolu.nature === 'excursus') {
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
      <h2 id="notes-bible-chapitre" className="cs-bible-info-label">
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
