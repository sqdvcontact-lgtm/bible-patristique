// Lecture « Latin & Français » d'une édition biblique commentée.
//
// Deux colonnes sur grand écran, empilées par verset sur mobile, synchronisées
// par l'axe canonique. Ce qui appartient à l'ensemble éditorial — introductions,
// commentaires de péricope, conclusions — se rend HORS DES COLONNES et une seule
// fois : le dupliquer dans chaque langue ferait lire deux fois le même
// commentaire. Un bloc propre à une langue sort LUI AUSSI des colonnes : les
// commentaires de Fillion n’ont pas d’équivalent latin, et les enfermer dans une
// colonne laissait en face un vide de leur hauteur.
//
// ⛔ MAIS PAS SUR TOUTE LEUR LARGEUR (2026-09-03, décision de l'auteur revenant sur
// celle du 20 août : « toute la largeur, c'est trop, pas naturel pour un corps de
// texte ; il faut, pour ces styles-là, réduire la largeur maximale »). Mesuré sur
// un écran de 2 560 px, le paragraphe d'introduction de la Genèse faisait 124
// signes par ligne sur les 52 rem des deux colonnes, contre 83 sur les 31,25 rem
// de la lecture simple. L'appareil a d'abord pris cette mesure-là ; puis, devant
// le résultat, le même jour : « les versets dépassent trop ; élargir le corps du
// texte, et réduire la largeur des versets bibliques, harmonieusement ». La règle
// est désormais celle de la lecture simple, où LE RETRAIT DÉSIGNE LE VERSET : les
// versets prennent la mesure de la PAGE (`LectureBilingueBible`), et l'appareil est
// bordé par le fer de leur TEXTE — les numéros pendent dans la marge, et la page
// n'a qu'un fer. Mesuré : versets 1 144 → 853 px, appareil 688 → 768. Voir
// `surMesure`.
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
// ⚠️ La colonne et sa gouttière sont NOMMÉES dans globals.css (`--regard-numero`,
// `--regard-numero-gouttiere`) : c'est d'elles que la feuille déduit la mesure de
// l'appareil, bordé par le fer du texte des versets (voir `surMesure`). Une seule
// écriture, sans quoi les deux fers se séparent au premier réglage. ⚠️ La colonne
// reste `auto` : un numéro plus large qu'elle (« 27, 58 », « 150, 6 ») pousse le
// texte de sa rangée de quelques pixels plutôt que de se couper.
const STYLE_LIGNE_VERSET = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: 'var(--regard-numero-gouttiere)',
  alignItems: 'baseline' as const,
}

const STYLE_REFERENCE = {
  minWidth: 'var(--regard-numero)',
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
  // face une colonne vide de la hauteur du commentaire. Ils sortent donc des
  // colonnes, et l’appartenance reste une donnée de provenance, non une
  // consigne de mise en page. ⚠️ Ils ne prennent pas pour autant toute la
  // largeur des colonnes : voir `surMesure`, plus bas.
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

  // ── L'appareil est bordé par le fer des versets ─────────────────────────────
  // ⛔ Hors des colonnes, mais PAS sur toute leur largeur (décisions de l'auteur,
  // 2026-09-03 — voir l'en-tête). Chaque bloc, chaque gravure et la série des
  // notes prennent l'enveloppe `.cs-bible-regard` (globals.css), qui vaut la mesure
  // de la page moins, de chaque côté, la colonne du numéro et sa gouttière, et se
  // centre sur l'axe : son fer est celui du TEXTE des versets, les numéros pendent
  // dans la marge. C'est le pendant de l'axe de texte de la lecture simple
  // (`surAxeTexte`, TexteBible), où le retrait du numéro désigne déjà le verset.
  // ⚠️ Une gravure y retrouve aussi sa taille : sa part se calcule sur son
  // conteneur, et sur 52 rem une planche hors-texte dépassait la taille de son
  // fichier. ⛔ Pas sur mobile : les colonnes y sont empilées à la largeur de
  // l'écran, et une enveloppe n'y bornerait rien.
  const surMesure = (contenu: ReactNode, cle: string) => mobile ? contenu : (
    <div key={cle} className="cs-bible-regard">{contenu}</div>
  )

  const rendreBlocs = (liste: readonly BibleEditionDisplayBodyBlock[]) => liste.map((bloc) => surMesure(
    <BlocEditorialBible
      key={bloc.id}
      bloc={bloc}
      illustrations={imagesParBloc.get(bloc.id) ?? []}
    />,
    bloc.id,
  ))
  const rendreImages = (liste: readonly BibleEditionDisplayAsset[]) => liste.map((illustration) => surMesure(
    <IllustrationBible key={illustration.id} illustration={illustration} />,
    illustration.id,
  ))

  const styleGrille = mobile
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', rowGap: '0.35rem' }
    : {
      display: 'grid',
      // Colonnes de largeurs INÉGALES, comme en traductions parallèles : le texte
      // original est plus dense que sa traduction et demande moins de place. La
      // mesure totale fut celle des œuvres, 52 rem, jusqu'au 2026-09-03 ; c'est
      // désormais celle de la PAGE de la lecture simple, 38,75 rem, posée par
      // `LectureBilingueBible` sur l'axe du texte — et l'appareil est bordé par
      // le fer des versets (`surMesure`). ⚠️ Les œuvres en regard sont à 42 rem
      // depuis le 2026-08-30, mesurées sur les vers de Boèce ; la Bible pose des
      // commentaires entre ses versets, elle n'a pas la même contrainte.
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
      {notesRetenues.length > 0 && surMesure(
        <NotesBibleChapitre
          notes={notesRetenues}
          illustrationsByNote={imagesParNote}
          ancresRetour={ancresRetour}
        />,
        'notes',
      )}
    </div>
  )
}
