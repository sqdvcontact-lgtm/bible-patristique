import { ROLE_APPARAT_CRITIQUE, texteApparatAffiche } from '@/app/lib/apparatCritique'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// L'APPARAT CRITIQUE d'une édition savante — les variantes des manuscrits, non
// une note de prose. Le composant est commandé par `metadata.editorial_role`, et
// vaut donc pour toute édition qui portera cette marque : rien ici ne connaît les
// Confessions ni Knöll.
//
// ⛔ CE QUI EST INTERDIT DANS CE FICHIER, et qui distingue l'apparat de la note
// ordinaire : le texte ne passe NI par `normaliserTypographieLecture`, NI par
// `terminerNote`. La première glisserait une fine insécable devant les 3 596
// hautes ponctuations de l'apparat de Knöll, la seconde ajouterait un point final
// aux 6 604 entrées qui n'en portent pas. Une notation critique ne se recompose
// pas : « B; est] est et BPQ » se lit tel que l'éditeur l'a écrit. Pas davantage
// de correction d'OCR, d'astérisque retiré, d'abréviation développée ou de sigle
// normalisé — voir `app/lib/apparatCritique.ts`.
//
// La SEULE soustraction est déterministe et documentée : le numéro de ligne
// imprimée laissé en tête par la transcription, quand il répète exactement
// `metadata.printed_line`. Il vit dans la métadonnée, pas dans la lecture.
//
// ⛔ Ce composant reste PUR : aucun contexte, aucun accès au compte, aucune
// écriture. `needs_review`, `human_validated`, `printed_line` et la demande de
// contrôle visuel sont REPORTÉS dans le DOM en attributs `data-`, où l'outillage
// d'administration les lit sans que la lecture publique en porte un gramme. Un
// état de collation ne se décide pas dans un renderer.

// Un peu plus compact que la note ordinaire, et l'interligne resserré : l'apparat
// se lit d'un bloc, comme au pied d'une page d'édition critique. Aucun encadré,
// aucune carte — la composition seule le distingue de la prose.
const CORPS = '0.94em'
const INTERLIGNE = 1.34

function EntreeApparat({ bloc, dernier }: { bloc: NoteBlocData; dernier: boolean }) {
  return (
    <p
      lang={bloc.language ?? undefined}
      data-block-id={bloc.blockId}
      data-kind={bloc.kind}
      data-form={bloc.form}
      data-editorial-role={ROLE_APPARAT_CRITIQUE}
      // Report d'état, jamais décision. Le numéro de ligne reparaît ICI, et ici
      // seulement : en métadonnée du document, hors de la lecture.
      data-printed-line={typeof bloc.printedLine === 'number' ? String(bloc.printedLine) : undefined}
      data-needs-review={String(bloc.needsReview)}
      data-human-validated={typeof bloc.humanValidated === 'boolean' ? String(bloc.humanValidated) : undefined}
      // La RAISON du contrôle visuel n'est pas publiée — c'est une note d'atelier.
      // Seul le fait qu'un contrôle soit demandé l'est.
      data-controle-visuel={bloc.visualReviewReason ? 'true' : undefined}
      style={{
        margin: dernier ? 0 : '0 0 4px',
        // `pre-wrap` : les blancs de l'édition sont rendus tels quels, et la
        // sélection rapporte le texte au caractère près.
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        // Une ligature joindrait le « fl » de « indiflnite » ou le « fi » d'une
        // lecture douteuse, et donnerait à voir un mot que le manuscrit n'a pas.
        fontVariantLigatures: 'none',
        hyphens: 'none',
        fontStyle: 'normal',
      }}
    >
      {texteApparatAffiche(bloc)}
    </p>
  )
}

/**
 * Rend une note dont TOUS les blocs relèvent de l'apparat critique. Le tri par
 * `rank` et les `data-` d'identité sont ceux du rendu ordinaire : l'appel, la
 * clé et le numéro de note ne bougent pas.
 */
export function ContenuApparatCritique({ note }: { note: NoteStructuree }) {
  const blocs = [...note.blocks].sort((a, b) => a.rank - b.rank)

  return (
    <div
      data-note-key={note.noteKey}
      data-note-number={note.noteNumber}
      data-apparat-critique=""
      style={{ fontSize: CORPS, lineHeight: INTERLIGNE }}
    >
      {blocs.map((bloc, i) => (
        <EntreeApparat key={bloc.blockId} bloc={bloc} dernier={i === blocs.length - 1} />
      ))}
    </div>
  )
}
