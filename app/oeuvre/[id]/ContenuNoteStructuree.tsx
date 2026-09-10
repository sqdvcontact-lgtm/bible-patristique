'use client'

import { Fragment } from 'react'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'
import { normaliserReferencesDansTexte, terminerNote } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
import { estNoteApparatCritique } from '@/app/lib/apparatCritique'
import {
  familleDeNature,
  natureReprendLeTexte,
  natureSeNormaliseCommeReference,
  natureSuitSaCibleEnLigne,
} from '@/app/lib/naturesNote'
import { ContenuApparatCritique } from './ApparatCritique'
import { rendreTexteEnrichi } from './texteEnrichi'
import * as BibliographieNote from './noteBibliographie'
import { STYLE_DISCRET_ENCART, styleBlocNote } from '@/app/lib/compositionNote'
import { lignesDeVers, styleLigneDeVers } from '@/app/lib/compositionVers'

// Le texte d'un bloc de RENVOI EXTÉRIEUR (kind='reference') est normalisé au rendu :
// « 1Co. 2, 16 » → « 1 Co 2, 16 », chapitre romain → arabe, virgule avant le verset.
//
// ⛔ Un renvoi INTERNE (`internal_cross_reference`) n'y passe PAS, et c'est la raison
// d'être de cette nature : « Voyez la note I, p. 150 » n'a ni auteur ni titre à
// normaliser, et son « I » est un numéro de note, que le normaliseur convertirait en
// chapitre arabe. La règle vit dans `naturesNote.ts`, avec le vocabulaire.
//
// Tous les blocs passent ensuite par la composition typographique de lecture :
// espaces de la charte §3.2 et ponctuation des citations de la charte §3.8.
//
// ⚠️ Ces fonctions sont IDEMPOTENTES, et le restent : depuis la charte § 13.9 la
// normalisation se fait DANS LA DONNÉE, et le rendu n'est plus qu'un FILET — il ne
// change rien à une note déjà normalisée, et rattrape un import qui aurait manqué la
// passe. ⛔ Les retirer ferait dépendre l'affichage de la qualité d'une campagne.
function textePartielBloc(bloc: NoteBlocData, texte: string): string {
  const normalise = natureSeNormaliseCommeReference(bloc.kind)
    ? normaliserReferencesDansTexte(texte)
    : texte
  return normaliserTypographieLecture(normalise)
}

function texteBloc(bloc: NoteBlocData): string {
  return textePartielBloc(bloc, bloc.text)
}

// Ponctuation finale : appliquée uniquement à la DERNIÈRE pièce rendue de la note
// (le point final ne doit apparaître qu'une fois, en fin de note). Idempotent.
function texteFinal(texte: string, estDernier: boolean): string {
  return estDernier ? terminerNote(texte) : texte
}

/**
 * UNE SOUS-CHAÎNE BIBLIOGRAPHIQUE EXPLICITEMENT MAPPÉE est remplacée par sa notice.
 *
 * ⛔ Aucun motif, aucune reconnaissance : `source_citation` vient de la relation
 * `texte_note_bloc_ouvrages` et doit apparaître UNE fois, exactement, dans le bloc.
 * Si ce contrat n'est plus vrai (édition simultanée, donnée ancienne, collision), le
 * bloc entier retombe sur son texte source. La bibliographie ne peut donc jamais
 * manger une phrase qu'elle n'a pas explicitement reçue en charge.
 */
function rendreBlocAvecBibliographie(
  bloc: NoteBlocData,
  references: readonly BibliographieNote.ReferenceBibliographiqueNote[],
  estDernier: boolean,
) {
  if (references.length === 0) {
    return rendreTexteEnrichi(texteFinal(texteBloc(bloc), estDernier))
  }

  const positions = references.map(reference => {
    const debut = bloc.text.indexOf(reference.sourceCitation)
    const second = debut < 0 ? -1 : bloc.text.indexOf(reference.sourceCitation, debut + reference.sourceCitation.length)
    return { reference, debut, second }
  })
  if (positions.some(item => item.debut < 0 || item.second >= 0)) {
    console.error(`[notes] ancre bibliographique non unique dans ${bloc.blockId}`)
    return rendreTexteEnrichi(texteFinal(texteBloc(bloc), estDernier))
  }
  positions.sort((a, b) => a.debut - b.debut)

  let curseur = 0
  for (const item of positions) {
    if (item.debut < curseur) {
      console.error(`[notes] ancres bibliographiques chevauchantes dans ${bloc.blockId}`)
      return rendreTexteEnrichi(texteFinal(texteBloc(bloc), estDernier))
    }
    curseur = item.debut + item.reference.sourceCitation.length
  }

  curseur = 0
  return (
    <>
      {positions.map((item, rang) => {
        const avant = bloc.text.slice(curseur, item.debut)
        curseur = item.debut + item.reference.sourceCitation.length
        return (
          <Fragment key={`${item.reference.ouvrageId}:${item.reference.citationRank}`}>
            {avant ? rendreTexteEnrichi(textePartielBloc(bloc, avant)) : null}
            <BibliographieNote.ReferenceBibliographiqueNote reference={item.reference} />
            {rang === positions.length - 1 ? (() => {
              const apres = bloc.text.slice(curseur)
              return apres
                ? rendreTexteEnrichi(texteFinal(textePartielBloc(bloc, apres), estDernier))
                : null
            })() : null}
          </Fragment>
        )
      })}
    </>
  )
}

/**
 * ITALIQUE DE LA LANGUE — charte § 13.8, arbitré le 5 septembre 2026.
 *
 * Un bloc ENTIÈREMENT latin s'italise, quelle que soit sa longueur : les 27 blocs du
 * corpus qui dépassent 900 signes ne font pas exception, l'italique disant ici la
 * LANGUE et non l'emphase.
 *
 * ⛔ LE GREC NE SUIT PAS : son alphabet le distingue déjà, et l'italique y déforme la
 * lettre. ⛔ L'apparat critique non plus, mais il ne passe pas par ici : latin de bout
 * en bout, l'italiser ne distinguerait rien.
 *
 * ⚠️ Ne concerne QUE le bloc entier, celui dont `language` porte la langue. Le latin
 * ENCHÂSSÉ dans une note française — le cas le plus fréquent, et le plus coûteux —
 * n'est pas de ce ressort : aucune donnée ne dit où il commence, et il s'écrit par
 * marqueur d'italique dans le texte. Le deviner ici italiserait du français.
 */
export function estBlocEnLatin(bloc: Pick<NoteBlocData, 'language'>): boolean {
  return bloc.language === 'la'
}

const RENDU_INLINE = 'inline_after_target'
const RENDU_RETOUR_VERSE = 'manual_line_break_in_verse'

// La composition DISCRÈTE — un peu plus petite, en teinte seconde — sert ce que le
// lecteur traverse pour atteindre le propos : la coordonnée d'où vient la note, et les
// renvois qui suivent leur cible en ligne.
// ⚠️ Elle vit désormais dans `compositionNote.ts`, avec le reste de la composition de
// l'encart : écrite ici, elle avait pris un rang à elle (0,92 em contre les 0,94 de
// l'apparat critique), et deux rangs à un quart de pixel l'un de l'autre ne se
// distinguent pas — ils se contredisent.
const STYLE_DISCRET = STYLE_DISCRET_ENCART

function estReferenceRattachee(block: NoteBlocData) {
  return Boolean(
    block.targetBlockId
    && natureSuitSaCibleEnLigne(block.kind)
    && (block.rendering === RENDU_INLINE || block.rendering === RENDU_RETOUR_VERSE),
  )
}

/**
 * Rend les blocs sémantiques d'une note sans inventer de ponctuation ni de
 * parenthèses. Le champ `rendering` décide seul si une référence reste un
 * paragraphe, suit sa cible en ligne, ou vient après un retour dans des vers.
 */
/**
 * UN RENVOI EN LIGNE — le même texte que l'encart, dans une boîte INLINE.
 *
 * ⛔ Il en faut une, et le HTML l'impose : `ContenuNoteStructuree` compose ses blocs
 * en `<div>`, et un `<div>` DANS un `<p>` ferme le paragraphe. L'analyseur du
 * navigateur n'y voit pas une imbrication à corriger : il clôt le `<p>`, remonte le
 * `<div>` d'un cran, et le reste du texte repart dans un paragraphe implicite. Vu sur
 * la planche du 8 septembre 2026, où quatre renvois de la manchette rendaient une
 * boîte VIDE, la même note se rendant très bien hors du paragraphe. ⚠️ Ce n'est pas
 * affaire de CSS : `position: absolute` fait bien une boîte de bloc, mais l'analyseur
 * ne lit que le nom de la balise.
 *
 * ⛔ Rien n'est rejoué pour autant : le texte passe par `texteBloc` et `texteFinal`,
 * les fonctions mêmes de l'encart — normalisation des références, typographie de
 * lecture, point final posé une seule fois —, et par `rendreTexteEnrichi`. Seule la
 * BOÎTE change, et elle doit changer.
 *
 * ⚠️ La NOTICE BIBLIOGRAPHIQUE n'y est pas, et c'est mesuré : au 8 septembre 2026,
 * AUCUN des 11 829 renvois purs du corpus ne porte de lien vers un ouvrage (244 blocs
 * en portent un, tous dans des notes qui disent autre chose). Le jour où l'un en
 * portera, il faudra le rendre à l'encart plutôt que de lui servir sa citation source
 * en clair : la manchette ne doit jamais dire MOINS que la note.
 */
export function ContenuRenvoiEnLigne({ note }: { note: NoteStructuree }) {
  const blocks = [...note.blocks].sort((a, b) => a.rank - b.rank)
  return (
    <>
      {blocks.map((bloc, rang) => (
        <span
          key={bloc.blockId}
          lang={bloc.language ?? undefined}
          data-block-id={bloc.blockId}
          data-kind={bloc.kind}
          style={{ fontStyle: estBlocEnLatin(bloc) ? 'italic' : undefined }}
        >
          {rang > 0 ? ' ' : null}
          {rendreTexteEnrichi(texteFinal(texteBloc(bloc), rang === blocks.length - 1))}
        </span>
      ))}
    </>
  )
}

export function ContenuNoteStructuree({ note }: { note: NoteStructuree }) {
  const blocks = [...note.blocks].sort((a, b) => a.rank - b.rank)
  const apparatCritique = estNoteApparatCritique(note)
  const bibliographieParBloc = BibliographieNote.useBibliographieNote(
    note.noteKey,
    blocks.map(block => block.blockId),
    !apparatCritique,
  )

  // L'APPARAT CRITIQUE se compose à part : ni typographie de lecture, ni point
  // final ajouté, ni référence normalisée — la notation philologique se rend
  // telle quelle (voir ApparatCritique.tsx). La bifurcation ne tient PAS au
  // `kind` — `commentary` couvre aussi la note de prose ordinaire — mais à
  // `metadata.editorial_role`, et elle exige que TOUS les blocs de la note en
  // relèvent : toute note qui n'est pas intégralement un apparat continue de
  // passer par le rendu ci-dessous, inchangé.
  if (apparatCritique) return <ContenuApparatCritique note={note} />

  const rattaches = new Map<string, NoteBlocData[]>()

  for (const block of blocks) {
    if (!estReferenceRattachee(block) || !block.targetBlockId) continue
    const list = rattaches.get(block.targetBlockId) ?? []
    list.push(block)
    rattaches.set(block.targetBlockId, list)
  }

  const rendus = blocks.filter(block => !estReferenceRattachee(block))

  // ── L'ANCRAGE EN TÊTE NE FAIT PAS PARAGRAPHE ────────────────────────────────
  // Les blocs de la famille `ancrage` qui OUVRENT la note — la coordonnée imprimée,
  // le lemme repris — se composent sur la ligne du propos, et non au-dessus de lui.
  // Sur la page de Faivre, « (V) pag. 178. — Avec les démons… On peut consulter… »
  // tient sur un seul paragraphe : le fendre en trois natures est une opération de
  // STRUCTURE (charte § 13.10), elle ne doit pas se voir en lecture.
  //
  // ⚠️ En TÊTE seulement, et seulement s'il reste quelque chose après : un lemme qui
  // reparaît au milieu d'une note y joue un autre rôle, et une note faite du seul
  // ancrage n'a pas de propos à qui s'attacher — elle se rend alors seule.
  let coupe = 0
  while (coupe < rendus.length && familleDeNature(rendus[coupe].kind) === 'ancrage') coupe++
  const entete = coupe < rendus.length ? rendus.slice(0, coupe) : []
  const affiches = coupe < rendus.length ? rendus.slice(coupe) : rendus
  const dernierBlocId = affiches.at(-1)?.blockId

  return (
    <div
      data-note-key={note.noteKey}
      data-note-number={note.noteNumber}
      data-note-affiche={typeof note.displayNumber === 'number' ? String(note.displayNumber) : undefined}
    >
      {affiches.map((block, rang) => {
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
        // L'en-tête d'ancrage ouvre le PREMIER bloc rendu, et lui seul.
        const ouverture = rang === 0 ? entete : []

        // ── UN VERS SE REND LIGNE À LIGNE, EN BOÎTES ──────────────────────────
        //
        // ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne : `text-indent`
        // ne s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après un saut forcé.
        // Sans boîte, le retrait de suite ne se poserait que sur le premier vers, et une
        // ligne trop longue pour la piste de l'encart ne se distinguerait plus du vers
        // d'après. C'est la règle de `compositionVers.ts`, que la lecture d'une œuvre,
        // son apparat, son introduction et l'apparat d'une bible partagent déjà :
        // l'encart de note en était la sixième surface, et la seule à l'ignorer.
        //
        // ⚠️ ELLE RÈGLE AUSSI L'ANCRAGE EN TÊTE, sans qu'on ait à le nommer : le lemme
        // reste un fragment EN LIGNE, et l'inline qui précède un enfant de bloc forme sa
        // propre ligne. Il cesse donc de se coller au premier vers — ce qui, sur la note
        // d'Ovide de la Consolation, poussait « Jam mihi deterior canis » au delà de la
        // piste et le coupait en « ca-/nis ».
        //
        // ⛔ ON NE DÉCOUPE PAS un bloc dont le texte est tranché par ailleurs : une
        // notice bibliographique se pose par OFFSETS dans le texte entier
        // (`rendreBlocAvecBibliographie`), et un renvoi en ligne s'attache à sa fin. Un
        // tel bloc garde le `pre-line` d'avant, qui rend les sauts sans les indenter —
        // même garde que sur l'apparat biblique.
        const lignesVers = verse ? lignesDeVers(block.text) : []
        const versEnLignes = lignesVers.length > 1
          && (bibliographieParBloc[block.blockId] ?? []).length === 0
          && referencesInline.length === 0

        return (
          <div
            key={block.blockId}
            lang={block.language ?? undefined}
            data-block-id={block.blockId}
            data-kind={block.kind}
            data-famille={familleDeNature(block.kind)}
            data-form={block.form}
            data-rendering={block.rendering ?? undefined}
            data-needs-review={String(block.needsReview)}
            // ⛔ LA COMPOSITION VIT DANS `compositionNote.ts`, avec le reste de celle de
            // l'encart. Ce qui reste ici est ce que le BLOC dit de lui-même : se
            // détache-t-il, porte-t-il des vers, une reprise du texte, des sauts
            // matériels. La reprise s'italise où qu'elle paraisse — en tête sur la ligne
            // du propos, au milieu d'une note, ou seule —, et la règle se dit alors d'un
            // trait sans dépendre d'un rang.
            style={styleBlocNote({
              detache: verse || traduction,
              vers: verse,
              versEnLignes,
              italique: estBlocEnLatin(block) || natureReprendLeTexte(block.kind),
              sautsMateriels: (verse && !versEnLignes) || (!versEnLignes && referencesApresVers.length > 0),
            })}
          >
            {ouverture.map(ancrage => {
              // La REPRISE d'un mot de l'œuvre se compose en italique, à la mesure du
              // texte ; la COORDONNÉE de l'appareil garde le repère discret. Charte
              // § 13.11, la raison nommée qui sépare deux natures d'une même famille.
              const reprise = natureReprendLeTexte(ancrage.kind)
              return (
                <span
                  key={ancrage.blockId}
                  lang={ancrage.language ?? undefined}
                  data-block-id={ancrage.blockId}
                  data-kind={ancrage.kind}
                  data-famille="ancrage"
                  data-needs-review={String(ancrage.needsReview)}
                  style={{
                    ...(reprise ? null : STYLE_DISCRET),
                    fontStyle: reprise || estBlocEnLatin(ancrage) ? 'italic' : undefined,
                  }}
                >
                  {rendreTexteEnrichi(texteBloc(ancrage))}{' '}
                </span>
              )
            })}
            {versEnLignes
              ? lignesVers.map((ligne, i) => (
                <span key={`${block.blockId}:vers:${i}`} style={styleLigneDeVers({ rang: 0 })}>
                  {rendreTexteEnrichi(texteFinal(textePartielBloc(block, ligne), finSurTexte && i === lignesVers.length - 1))}
                </span>
              ))
              : rendreBlocAvecBibliographie(block, bibliographieParBloc[block.blockId] ?? [], finSurTexte)}
            {referencesInline.map((reference, i) => (
              <span
                key={reference.blockId}
                lang={reference.language ?? undefined}
                data-block-id={reference.blockId}
                data-kind={reference.kind}
                data-rendering={reference.rendering ?? undefined}
                data-needs-review={String(reference.needsReview)}
                style={STYLE_DISCRET}
              >
                {'\u00A0'}{rendreTexteEnrichi(texteFinal(texteBloc(reference), finSurInline && i === referencesInline.length - 1))}
              </span>
            ))}
            {/* ⚠️ Le renvoi qui suit des vers descend d'une ligne. Quand les vers sont
                des BOÎTES, il en devient une lui aussi : le saut matériel n'a plus de
                `pre-line` pour le rendre, et deux façons de descendre d'une ligne dans
                le même bloc se contrediraient. */}
            {referencesApresVers.map((reference, i) => (
              <Fragment key={reference.blockId}>
                {versEnLignes ? null : '\n'}
                <span
                  lang={reference.language ?? undefined}
                  data-block-id={reference.blockId}
                  data-kind={reference.kind}
                  data-rendering={reference.rendering ?? undefined}
                  data-needs-review={String(reference.needsReview)}
                  style={versEnLignes ? { ...STYLE_DISCRET, display: 'block' } : STYLE_DISCRET}
                >
                  {rendreTexteEnrichi(texteFinal(texteBloc(reference), finSurApresVers && i === referencesApresVers.length - 1))}
                </span>
              </Fragment>
            ))}
          </div>
        )
      })}
    </div>
  )
}
