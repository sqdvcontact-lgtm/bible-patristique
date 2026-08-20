// Lecture « Latin-français » d'une édition biblique commentée.
//
// Deux colonnes sur grand écran, empilées par verset sur mobile, synchronisées
// par l'axe canonique. Ce qui appartient à l'ensemble éditorial — introductions,
// commentaires de péricope, conclusions — se rend PLEINE LARGEUR, hors des
// colonnes et une seule fois : le dupliquer dans chaque langue ferait lire deux
// fois le même commentaire. Ce qui appartient à une langue reste dans sa colonne.
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
  repartirBlocsDeCorps,
  repartirIllustrations,
  notesDuChapitreBilingue,
  type ColonneBilingue,
  type MembreBilingue,
  type NoteBilingue,
} from '@/app/lib/bibleEditionBilingue'
import {
  ancreAppelNoteBible,
  AppelNoteBible,
  BlocEditorialBible,
  IllustrationBible,
  NotesBibleChapitre,
} from './BibleEditionParatext'

const SERIF = 'var(--font-source-serif), Georgia, serif'

// Un verset se compose ici EXACTEMENT comme sur la page Bible : même police,
// même corps, même interligne, même justification. Rien ne doit trahir qu'on
// lit en deux colonnes plutôt qu'en une.
const STYLE_VERSET = {
  fontFamily: SERIF,
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: 'var(--cs-texte-fort)',
  textAlign: 'justify' as const,
  hyphens: 'auto' as const,
  overflowWrap: 'break-word' as const,
  margin: '0 0 0.35rem',
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

function fusionner<T>(sources: readonly Map<string, T[]>[]): Map<string, T[]> {
  const fusion = new Map<string, T[]>()
  for (const source of sources) {
    for (const [cle, valeurs] of source) {
      fusion.set(cle, [...(fusion.get(cle) ?? []), ...valeurs])
    }
  }
  return fusion
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

  const commun: ApparatColonne = {
    blocs: indexerBlocsDeCorps(blocsRepartis.communs),
    images: indexerIllustrations(illustrationsReparties.communs),
  }
  const parMembre = new Map<string, ApparatColonne>(ordre.map((membre) => [membre.id, {
    blocs: indexerBlocsDeCorps(blocsRepartis.parMembre.get(membre.id) ?? []),
    images: indexerIllustrations(illustrationsReparties.parMembre.get(membre.id) ?? []),
  }]))

  const imagesParBloc = fusionner([
    commun.images.byBodyBlock,
    ...[...parMembre.values()].map((apparat) => apparat.images.byBodyBlock),
  ])
  const imagesParNote = fusionner([
    commun.images.byNote,
    ...[...parMembre.values()].map((apparat) => apparat.images.byNote),
  ])

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
      gridTemplateColumns: `repeat(${colonnesOrdonnees.length}, minmax(0, 1fr))`,
      columnGap: '1.6rem',
      rowGap: '0.35rem',
    }

  /**
   * Ce qu'un membre porte à lui seul occupe SA colonne, dans une bande à part.
   *
   * ⚠️ La bande est une RANGÉE DISTINCTE, et non un contenu glissé dans la
   * cellule du verset. Rendu dans la cellule, un commentaire propre au français
   * poussait son verset vers le bas pendant que le latin restait en haut : les
   * deux textes cessaient d'être en regard, ce qui défait toute la lecture
   * bilingue. Une bande garde l'alignement des versets tout en laissant le
   * commentaire dans sa langue.
   */
  const rendreBandeauMembres = (
    choisir: (apparat: ApparatColonne | undefined) => {
      blocs: readonly BibleEditionDisplayBodyBlock[]
      images: readonly BibleEditionDisplayAsset[]
    },
  ) => {
    const contenus = colonnesOrdonnees.map((colonne) => ({
      membre: colonne.membre,
      ...choisir(parMembre.get(colonne.membre.id)),
    }))
    if (contenus.every((c) => c.blocs.length === 0 && c.images.length === 0)) return null
    return (
      <div style={styleGrille}>
        {contenus.map((contenu) => (
          <div key={contenu.membre.id} lang={contenu.membre.languageCode} style={{ minWidth: 0 }}>
            {rendreBlocs(contenu.blocs)}
            {rendreImages(contenu.images)}
          </div>
        ))}
      </div>
    )
  }

  const bandeauSansAncre = (position: 'opening' | 'closing') => rendreBandeauMembres((apparat) => ({
    blocs: apparat?.blocs[position] ?? [],
    images: apparat?.images[position] ?? [],
  }))
  const bandeauDuVerset = (canonId: string, position: 'beforeByCanon' | 'afterByCanon') =>
    rendreBandeauMembres((apparat) => ({
      blocs: apparat?.blocs[position].get(canonId) ?? [],
      images: apparat?.images[position].get(canonId) ?? [],
    }))

  return (
    <div data-lecture="bilingue">
      {rendreBlocs(commun.blocs.opening)}
      {rendreImages(commun.images.opening)}

      {/* Étiquettes de colonne : discrètes, sans fond, comme en traductions
          parallèles. Sur mobile, chaque verset porte déjà sa langue.
          ⚠️ Elles précèdent tout ce qui vit DANS une colonne — une introduction
          propre au français, par exemple : on doit savoir de quelle langue on
          lit avant de la lire. Ce qui est commun à l'édition les précède, lui,
          puisqu'il n'appartient à aucune des deux. */}
      {!mobile && (
        <div style={{ ...styleGrille, rowGap: 0, marginBottom: '0.75rem' }}>
          {colonnesOrdonnees.map((colonne) => (
            <p
              key={colonne.membre.id}
              style={{
                margin: 0,
                paddingBottom: '0.35rem',
                borderBottom: '1px solid var(--cs-bord)',
                fontFamily: SERIF,
                color: 'var(--cs-texte-gris)',
                fontSize: '0.625rem',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
              }}
            >
              {colonne.membre.label}
            </p>
          ))}
        </div>
      )}
      {bandeauSansAncre('opening')}

      {rangees.map((rangee) => (
        <div key={rangee.canonId}>
          {rendreBlocs(commun.blocs.beforeByCanon.get(rangee.canonId) ?? [])}
          {rendreImages(commun.images.beforeByCanon.get(rangee.canonId) ?? [])}
          {bandeauDuVerset(rangee.canonId, 'beforeByCanon')}
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
                    <p aria-hidden style={{ ...STYLE_VERSET, color: 'var(--cs-texte-faible)' }}>
                      &nbsp;
                    </p>
                  ) : (
                    <p style={STYLE_VERSET}>
                      {cellule.referenceNative && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: 'var(--cs-texte-faible)',
                            marginRight: '0.3125rem',
                            whiteSpace: 'nowrap',
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
          {bandeauDuVerset(rangee.canonId, 'afterByCanon')}
          {rendreImages(commun.images.afterByCanon.get(rangee.canonId) ?? [])}
          {rendreBlocs(commun.blocs.afterByCanon.get(rangee.canonId) ?? [])}
        </div>
      ))}

      {bandeauSansAncre('closing')}
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
