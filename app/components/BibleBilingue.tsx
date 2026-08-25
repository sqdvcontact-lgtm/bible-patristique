// Lecture « Latin-français » d'une édition biblique commentée.
//
// Deux colonnes sur grand écran, empilées par verset sur mobile, synchronisées
// par l'axe canonique. Ce qui appartient à l'ensemble éditorial — introductions,
// commentaires de péricope, conclusions — se rend PLEINE LARGEUR, hors des
// colonnes et une seule fois : le dupliquer dans chaque langue ferait lire deux
// fois le même commentaire. Un bloc propre à une langue passe LUI AUSSI pleine
// largeur : les commentaires de Fillion n’ont pas d’équivalent latin, et les
// enfermer dans une colonne laissait en face un vide de leur hauteur.
//
// ⚠️ Une illustration matériellement attachée à un bloc ou à une note suit CE
// bloc ou CETTE note, quel que soit le membre à qui elle appartient : la charte
// veut que l'image d'une note reste dans sa note. Les trois index sont donc
// fusionnés, à la différence des ancres de verset, qui restent par colonne.
//
// Le composant ne décide de rien : la répartition, l'appariement et l'indexation
// viennent de modules purs et testés.

import type { ReactNode } from 'react'

import {
  indexerBlocsDeCorps,
  indexerIllustrations,
  type BibleEditionAssetIndex,
  type BibleEditionBodyBlockIndex,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
} from '@/app/lib/bibleEdition'
import {
  appelsDuVerset,
  apparierRangees,
  colonnesBilingues,
  rangeesNonVides,
  referenceNativeEnChiffres,
  repartirBlocsDeCorps,
  repartirIllustrations,
  notesDuChapitreBilingue,
  type ColonneBilingue,
  type MembreBilingue,
  type NoteBilingue,
} from '@/app/lib/bibleEditionBilingue'
import AppelNoteBiblique from './NoteBibliqueFenetre'
import { ancreAppelNoteBible } from '@/app/lib/bibleEdition'
import {
  BlocEditorialBible,
  IllustrationBible,
  NotesBibleChapitre,
} from './BibleEditionParatext'

const SERIF = 'var(--font-source-serif), Georgia, serif'

// Composition des deux colonnes, reprise de la lecture bilingue des œuvres.
//
// Le FRANÇAIS garde la composition d’un verset de la page Bible. Le LATIN se
// tient en regard : sans empattements, un peu plus petit, et d’une encre
// grise — c’est le change de caractère qui sépare les deux colonnes, mieux
// qu’un filet. Même encre et même chasse que la colonne originale d’une œuvre.
//
// Le texte est RESSERRÉ dans la LIGNE — interligne court — mais les versets
// respirent ENTRE eux : trop serrés, ils formaient un pavé où l'œil se perdait.
const INTERLIGNE = 1.42
const STYLE_VERSET = {
  fontFamily: SERIF,
  fontSize: '0.875rem',
  lineHeight: INTERLIGNE,
  color: 'var(--cs-texte-fort)',
  textAlign: 'justify' as const,
  hyphens: 'auto' as const,
  overflowWrap: 'break-word' as const,
  margin: '0 0 0.4rem',
}

// L’encre de la colonne originale des œuvres, reprise telle quelle pour que
// les deux lectures en regard du site se ressemblent.
const STYLE_VERSET_ORIGINAL = {
  ...STYLE_VERSET,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.8125rem',
  color: 'var(--cs-original)',
  wordSpacing: '-0.025em',
}

// La référence occupe sa propre colonne, étroite et alignée à droite, comme le
// numéro de verset de la page Bible. Sans cela, chaque ligne commençait après
// une référence de longueur variable et les deux colonnes ne s’alignaient pas.
const STYLE_LIGNE_VERSET = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: '0.3125rem',
  alignItems: 'baseline' as const,
}

const STYLE_REFERENCE = {
  minWidth: '1.6rem',
  textAlign: 'right' as const,
  fontSize: '0.625rem',
  fontWeight: 600,
  color: 'var(--cs-texte-faible)',
  whiteSpace: 'nowrap' as const,
}

type Appartenance = { appliesTo: 'family' | 'member'; appliesToMemberId: string | null }
type BlocBilingue = BibleEditionDisplayBodyBlock & Appartenance
type IllustrationBilingue = BibleEditionDisplayAsset & Appartenance

export type LectureBilingueProps = {
  membres: readonly MembreBilingue[]
  colonnes: readonly ColonneBilingue[]
  /** Créneaux canoniques du chapitre, dans l'ordre : c'est l'axe d'alignement. */
  axeCanonique: readonly string[]
  blocs?: readonly BlocBilingue[]
  notes?: readonly NoteBilingue[]
  illustrations?: readonly IllustrationBilingue[]
  mobile?: boolean
}

type ApparatColonne = {
  blocs: BibleEditionBodyBlockIndex
  images: BibleEditionAssetIndex
}


export default function BibleBilingue({
  membres,
  colonnes,
  axeCanonique,
  blocs = [],
  notes = [],
  illustrations = [],
  mobile = false,
}: LectureBilingueProps): ReactNode {
  const ordre = colonnesBilingues(membres, mobile ? 'mobile' : 'desktop')
  const colonnesOrdonnees = ordre
    .map((membre) => colonnes.find((colonne) => colonne.membre.id === membre.id))
    .filter((colonne): colonne is ColonneBilingue => colonne !== undefined)

  const blocsRepartis = repartirBlocsDeCorps(blocs, ordre)
  const illustrationsReparties = repartirIllustrations(illustrations, ordre)
  const notesRetenues = notesDuChapitreBilingue(notes, ordre)

  // ⛔ Un bloc du corps IGNORE les colonnes, qu'il soit commun à l'édition ou
  // propre à une langue. Les introductions et les commentaires de Fillion n’ont
  // pas d’équivalent latin : les enfermer dans la colonne française laissait en
  // face une colonne vide de la hauteur du commentaire. Ils passent donc sur
  // toute la largeur, et l’appartenance reste une donnée de provenance, non une
  // consigne de mise en page.
  const commun: ApparatColonne = {
    blocs: indexerBlocsDeCorps([
      ...blocsRepartis.communs,
      ...[...blocsRepartis.parMembre.values()].flat(),
    ]),
    images: indexerIllustrations([
      ...illustrationsReparties.communs,
      ...[...illustrationsReparties.parMembre.values()].flat(),
    ]),
  }
  const imagesParBloc = commun.images.byBodyBlock
  const imagesParNote = commun.images.byNote

  const rangees = rangeesNonVides(apparierRangees(axeCanonique, colonnesOrdonnees))

  // Une note commune est appelée depuis chaque colonne : elle revient à la
  // PREMIÈRE, celle que le lecteur a sous les yeux en tête de rangée.
  const ancresRetour = new Map<string, string>()
  for (const note of notesRetenues) {
    const premier = colonnesOrdonnees.find((colonne) => (
      note.appliesTo === 'family' || note.appliesToMemberId === colonne.membre.id
    ))
    if (premier) ancresRetour.set(note.id, ancreAppelNoteBible(note.id, premier.membre.id))
  }

  const rendreBlocs = (liste: readonly BibleEditionDisplayBodyBlock[]) => liste.map((bloc) => (
    <BlocEditorialBible
      key={bloc.id}
      bloc={bloc}
      illustrations={imagesParBloc.get(bloc.id) ?? []}
    />
  ))
  const rendreImages = (liste: readonly BibleEditionDisplayAsset[]) => liste.map((illustration) => (
    <IllustrationBible key={illustration.id} illustration={illustration} />
  ))

  const styleGrille = mobile
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', rowGap: '0.35rem' }
    : {
      display: 'grid',
      // Colonnes de largeurs INÉGALES, comme en traductions parallèles : le texte
      // original est plus dense que sa traduction et demande moins de place. La
      // mesure totale est celle des œuvres, 52 rem, pour que les deux lectures en
      // regard du site se ressemblent.
      gridTemplateColumns: colonnesOrdonnees
        .map((colonne) => (colonne.membre.memberRole === 'source_text' ? 'minmax(0, 0.88fr)' : 'minmax(0, 1.12fr)'))
        .join(' '),
      alignItems: 'baseline',
      columnGap: '1.1rem',
      rowGap: '0.4rem',
    }

  return (
    <div data-lecture="bilingue">
      {rendreBlocs(commun.blocs.opening)}
      {rendreImages(commun.images.opening)}

      {rangees.map((rangee) => (
        <div key={rangee.canonId}>
          {rendreBlocs(commun.blocs.beforeByCanon.get(rangee.canonId) ?? [])}
          {rendreImages(commun.images.beforeByCanon.get(rangee.canonId) ?? [])}
          <div style={styleGrille} data-canon-id={rangee.canonId}>
            {rangee.cellules.map((cellule, index) => {
              const membre = colonnesOrdonnees[index].membre
              return (
                <div
                  key={membre.id}
                  lang={membre.languageCode}
                  data-membre={membre.id}
                  style={{ minWidth: 0 }}
                >
                  {cellule === null ? (
                    // Un créneau que cette édition ne porte pas reste vide :
                    // on n'y met jamais le texte de l'autre colonne.
                    <p aria-hidden style={STYLE_VERSET}>
                      &nbsp;
                    </p>
                  ) : (
                    <div style={STYLE_LIGNE_VERSET}>
                      <span style={STYLE_REFERENCE}>
                        {referenceNativeEnChiffres(cellule.referenceNative)}
                      </span>
                      <p style={membre.memberRole === 'source_text' ? STYLE_VERSET_ORIGINAL : STYLE_VERSET}>
                        {cellule.texte}
                        {appelsDuVerset(notesRetenues, rangee.canonId, membre.id).map((note) => (
                          <AppelNoteBiblique
                            key={`${membre.id}:${note.id}`}
                            note={note}
                            memberId={membre.id}
                          />
                        ))}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {rendreImages(commun.images.afterByCanon.get(rangee.canonId) ?? [])}
          {rendreBlocs(commun.blocs.afterByCanon.get(rangee.canonId) ?? [])}
        </div>
      ))}

      {rendreImages(commun.images.closing)}
      {rendreBlocs(commun.blocs.closing)}
      <NotesBibleChapitre
        notes={notesRetenues}
        illustrationsByNote={imagesParNote}
        ancresRetour={ancresRetour}
      />
    </div>
  )
}
