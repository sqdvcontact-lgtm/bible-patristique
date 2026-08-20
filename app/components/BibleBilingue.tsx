// Lecture « Latin-français » d'une édition biblique commentée.
//
// Deux colonnes sur grand écran, empilées par verset sur mobile, synchronisées
// par l'axe canonique. Ce qui appartient à l'ensemble éditorial — introductions,
// commentaires de péricope, conclusions — se rend PLEINE LARGEUR, hors des
// colonnes et une seule fois : le dupliquer dans chaque langue ferait lire deux
// fois le même commentaire.
//
// Le composant ne décide de rien : la répartition et l'appariement viennent de
// `bibleEditionBilingue.ts`, qui est pur et testé.

import type { ReactNode } from 'react'

import {
  appelsDuVerset,
  apparierRangees,
  colonnesBilingues,
  rangeesNonVides,
  repartirBlocsDeCorps,
  repartirIllustrations,
  notesDuChapitreBilingue,
  type ColonneBilingue,
  type MembreBilingue,
  type NoteBilingue,
} from '@/app/lib/bibleEditionBilingue'
import type {
  BibleEditionDisplayAsset,
  BibleEditionDisplayBodyBlock,
} from '@/app/lib/bibleEdition'
import {
  ancreAppelNoteBible,
  AppelNoteBible,
  BlocEditorialBible,
  IllustrationBible,
  NotesBibleChapitre,
} from './BibleEditionParatext'

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

function grouperParCanon<T extends { canonIdStart: string | null; placement: string }>(
  elements: readonly T[],
  position: 'before' | 'after',
): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const element of elements) {
    if (element.canonIdStart === null || element.placement !== position) continue
    const groupe = index.get(element.canonIdStart) ?? []
    groupe.push(element)
    index.set(element.canonIdStart, groupe)
  }
  return index
}

function sansAncre<T extends { canonIdStart: string | null; placement: string }>(
  elements: readonly T[],
  position: 'before' | 'after',
): T[] {
  return elements.filter((element) => element.canonIdStart === null && (
    position === 'after' ? element.placement === 'after' : element.placement !== 'after'
  ))
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

  const illustrationsParBloc = new Map<string, IllustrationBilingue[]>()
  const illustrationsParNote = new Map<string, IllustrationBilingue[]>()
  for (const illustration of illustrationsReparties.communs) {
    if (illustration.bodyBlockId) {
      const groupe = illustrationsParBloc.get(illustration.bodyBlockId) ?? []
      groupe.push(illustration)
      illustrationsParBloc.set(illustration.bodyBlockId, groupe)
    } else if (illustration.noteId) {
      const groupe = illustrationsParNote.get(illustration.noteId) ?? []
      groupe.push(illustration)
      illustrationsParNote.set(illustration.noteId, groupe)
    }
  }

  const blocsAvant = grouperParCanon(blocsRepartis.communs, 'before')
  const blocsApres = grouperParCanon(blocsRepartis.communs, 'after')
  const illustrationsAvant = grouperParCanon(
    illustrationsReparties.communs.filter((item) => !item.bodyBlockId && !item.noteId),
    'before',
  )
  const illustrationsApres = grouperParCanon(
    illustrationsReparties.communs.filter((item) => !item.bodyBlockId && !item.noteId),
    'after',
  )

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

  const rendreBlocs = (liste: readonly BlocBilingue[]) => liste.map((bloc) => (
    <BlocEditorialBible
      key={bloc.id}
      bloc={bloc}
      illustrations={illustrationsParBloc.get(bloc.id) ?? []}
    />
  ))

  const styleGrille = mobile
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', rowGap: '0.35rem' }
    : {
      display: 'grid',
      gridTemplateColumns: `repeat(${colonnesOrdonnees.length}, minmax(0, 1fr))`,
      columnGap: '1.6rem',
      rowGap: '0.35rem',
    }

  return (
    <div data-lecture="bilingue">
      {rendreBlocs(sansAncre(blocsRepartis.communs, 'before'))}

      {/* Étiquettes de colonne : discrètes, sans fond, comme en traductions
          parallèles. Sur mobile, chaque verset porte déjà sa langue. */}
      {!mobile && (
        <div style={{ ...styleGrille, rowGap: 0, marginBottom: '0.75rem' }}>
          {colonnesOrdonnees.map((colonne) => (
            <p
              key={colonne.membre.id}
              style={{
                margin: 0,
                paddingBottom: '0.35rem',
                borderBottom: '1px solid var(--cs-bord)',
                color: 'var(--cs-texte-gris)',
                fontSize: '0.6875rem',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
              }}
            >
              {colonne.membre.label}
            </p>
          ))}
        </div>
      )}

      {rangees.map((rangee) => {
        const avant = blocsAvant.get(rangee.canonId) ?? []
        const apres = blocsApres.get(rangee.canonId) ?? []
        return (
          <div key={rangee.canonId}>
            {rendreBlocs(avant)}
            {(illustrationsAvant.get(rangee.canonId) ?? []).map((illustration) => (
              <IllustrationBible key={illustration.id} illustration={illustration} />
            ))}
            <div style={styleGrille} data-canon-id={rangee.canonId}>
              {rangee.cellules.map((cellule, index) => {
                const membre = colonnesOrdonnees[index].membre
                const propres = blocsRepartis.parMembre.get(membre.id) ?? []
                const blocsDuVerset = propres.filter((bloc) => (
                  bloc.canonIdStart === rangee.canonId && bloc.placement !== 'after'
                ))
                return (
                  <div
                    key={membre.id}
                    lang={membre.languageCode}
                    data-membre={membre.id}
                    style={{ minWidth: 0 }}
                  >
                    {rendreBlocs(blocsDuVerset)}
                    {cellule === null ? (
                      // Un créneau que cette édition ne porte pas reste vide :
                      // on n'y met jamais le texte de l'autre colonne.
                      <p
                        aria-hidden
                        style={{ margin: '0 0 0.35rem', color: 'var(--cs-texte-faible)' }}
                      >
                        &nbsp;
                      </p>
                    ) : (
                      <p style={{ margin: '0 0 0.35rem', lineHeight: 1.7 }}>
                        {cellule.referenceNative && (
                          <span
                            style={{
                              color: 'var(--cs-or)',
                              fontSize: '0.6875rem',
                              marginRight: '0.35rem',
                              verticalAlign: 'baseline',
                            }}
                          >
                            {cellule.referenceNative}
                          </span>
                        )}
                        {cellule.texte}
                        {appelsDuVerset(notesRetenues, rangee.canonId, membre.id).map((note) => (
                          <AppelNoteBible
                            key={`${membre.id}:${note.id}`}
                            noteId={note.id}
                            displayNumber={note.displayNumber}
                            memberId={membre.id}
                          />
                        ))}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            {(illustrationsApres.get(rangee.canonId) ?? []).map((illustration) => (
              <IllustrationBible key={illustration.id} illustration={illustration} />
            ))}
            {rendreBlocs(apres)}
          </div>
        )
      })}

      {rendreBlocs(sansAncre(blocsRepartis.communs, 'after'))}
      <NotesBibleChapitre
        notes={notesRetenues}
        illustrationsByNote={illustrationsParNote}
        ancresRetour={ancresRetour}
      />
    </div>
  )
}
