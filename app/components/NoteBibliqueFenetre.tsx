'use client'

// Appel de note biblique et sa fenêtre.
//
// Même modèle que partout ailleurs sur le site : un exposant discret, un clic,
// une fenêtre qui se pose sous l'appel et se retourne si le bas manque. La
// forme de l'appel vient de `styleAppelNote`, seule définition du site — ⛔ pas
// de pointillé sous un appel, jamais, nulle part.
//
// ⛔ ET C'EST LE MÊME ENCART QUE PARTOUT AILLEURS depuis le 8 septembre 2026.
// Cette page composait le sien, plus large et plus haut que celui des œuvres, au
// motif qu'une note de Fillion n'est pas une glose de trois mots. C'était vrai de
// la note, non de la boîte : l'encart commun est plus large que les deux qu'il
// remplace, et sa hauteur SUIT la note qu'on ouvre. Trois copies d'une même forme
// ne restent identiques que par accident — elles avaient divergé sur neuf points.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  colonneDeLecture, hauteurNavbarPx, placerEnMarge, placerFenetre, tailleRacinePx,
  type ColonneLecture,
} from '@/app/lib/fenetreContextuelle'
import { styleAppelNote, type VarianteAppelNote } from '@/app/lib/appelsDeNote'
import { EncartNote } from './EncartNote'
import { hauteurSouhaiteeNote, largeurEncartMinBiblePx, largeurEncartPx, MARGE_PARAGRAPHE_ENCART, reliefDeLaNote, signesDeLaNote, STYLE_APPEL_OUVERT } from '@/app/lib/compositionNote'
// L'axe est la CAPACITÉ DU POINTEUR, jamais la largeur (charte, « LE DOIGT »).
import { useSansSurvol } from '@/app/lib/useEstMobile'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import { ancreAppelNoteBible, type BibleEditionDisplayNote } from '@/app/lib/bibleEdition'
import { blocDeNoteBibliqueDiscret, intituleNoteBiblique } from '@/app/lib/noteBiblique'
import { SEUIL_CITATION_SORTIE } from '@/app/lib/citationSortie'
import { DEBORD_BLOC_VERSET_REM } from '@/app/lib/compositionBible'
import BibliographieBible from './BibleBibliographie'

/**
 * Les gravures qu'une note porte, composées par la surface qui l'appelle
 * (`figuresDeLaNote`, BibleEditionParatext) : avant son texte ce que la donnée place
 * avant, après le reste. ⚠️ Des NŒUDS, non des données : ce module ne peut pas importer
 * `IllustrationBible`, dont le module l'importe déjà.
 */
export type FiguresDeNote = { avant?: ReactNode; apres?: ReactNode }

export function ContenuNoteBiblique({ note, figures }: {
  note: Pick<BibleEditionDisplayNote, 'blocks'>
  /** ⛔ La fenêtre est le SEUL lieu d'une note de verset depuis le 13 septembre 2026 : l'image
   *  qu'elle porte l'y suit, faute de quoi elle ne paraîtrait nulle part. */
  figures?: FiguresDeNote
}) {
  return (
    <>
      {figures?.avant}
      {note.blocks.map((bloc) => {
        // Une note que la donnée déclare bibliographique se compose en liste,
        // ici comme dans le paratexte : c'est le même genre de texte, il ne
        // change pas de forme selon la surface qui l'accueille — même famille
        // de styles, même repli quand la liste n'est pas encore structurée.
        //
        // ⚠️ Pas de `sansHote` : la fenêtre pose sa composition sur SON
        // conteneur, et la liste en descend donc d'un cran toute seule.
        if (bloc.presentationStyle === 'bibliographie') {
          const composee = composerBibliographie(bloc.text)
          if (composee.chapeau || composee.entrees.length > 0) {
            return <BibliographieBible key={bloc.id} texte={bloc.text} lang={bloc.language ?? undefined} />
          }
        }
        // ⛔ Ce qu'on TRAVERSE pour atteindre le propos se lit en discret, et la FAMILLE du
        // bloc en décide, comme sur la page d'une œuvre (charte § 13.21) : le renvoi, le
        // renvoi interne, l'attribution, la coordonnée. Une liste écrite ici laissait les
        // renvois internes de Fillion se composer en propos.
        const discret = blocDeNoteBibliqueDiscret(bloc.kind)
        // `quotation` décrit le GENRE du bloc, pas sa longueur. Une courte citation
        // (par ex. « Ignoratio Scripturarum… ») reste dans le fil de la note ; seule
        // une citation qui atteint le seuil commun de la charte reçoit la composition
        // détachée `.citation-sortie`. Le seuil est importé de la source canonique :
        // aucune seconde valeur locale à maintenir.
        const citationSortie = bloc.kind === 'quotation' && bloc.text.length >= SEUIL_CITATION_SORTIE
        // Les citations sorties de l'apparat biblique partagent la même
        // composition que celles du paratexte et des œuvres : aucune variante
        // locale ne doit dupliquer `.citation-sortie`.
        return (
          <p
            key={bloc.id}
            lang={bloc.language ?? undefined}
            className={citationSortie ? 'citation-sortie' : undefined}
            style={{
              margin: citationSortie ? undefined : (discret ? `${MARGE_PARAGRAPHE_ENCART} 0 0` : `0 0 ${MARGE_PARAGRAPHE_ENCART}`),
              fontStyle: bloc.kind === 'lemma' ? 'italic' : 'normal',
              color: discret ? 'var(--cs-texte-second)' : 'var(--cs-texte-fort)',
              whiteSpace: bloc.form === 'verse' ? 'pre-line' : 'pre-wrap',
              // ⛔ NI `textAlign` NI `hyphens` ICI : la justification et la césure vivent
              // sur le CORPS de l'encart (`styleCorpsEncart`), pour les trois surfaces à
              // la fois. Elles étaient déclarées là, et la lecture d'une œuvre ne les
              // avait donc pas — le même encart rendait deux compositions selon la page
              // qui l'ouvrait, ce que le module commun existe pour empêcher. Redites ici,
              // elles écrasaient en outre `text-align-last`, et une dernière ligne de
              // trois mots s'étirait d'un bord à l'autre.
            }}
          >
            {rendreTexteEnrichi(bloc.text)}
          </p>
        )
      })}
      {figures?.apres}
    </>
  )
}

export default function AppelNoteBiblique({
  note,
  memberId,
  variante = 'corps',
  figures,
}: {
  /** `sousType` : la discipline d'une note de VERSET ; une note de bloc n'en porte pas. */
  note: Pick<BibleEditionDisplayNote, 'id' | 'displayNumber' | 'blocks' | 'sousType'>
  memberId?: string
  /** Les gravures que la note porte : elles la suivent dans sa fenêtre (`ContenuNoteBiblique`). */
  figures?: FiguresDeNote
  /** L'appel prend la forme du texte qui l'accueille : un intitulé de paratexte
   *  ne porte pas la teinte brune du corps, qui y ferait une tache. */
  variante?: VarianteAppelNote
}) {
  const [ouvert, setOuvert] = useState(false)
  const ancre = useRef<HTMLElement>(null)
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const [colonne, setColonne] = useState<ColonneLecture | null>(null)

  const basculer = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (ancre.current) {
      const r = ancre.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
      setColonne(colonneDeLecture(ancre.current))
    }
    setOuvert((o) => !o)
  }

  useEffect(() => {
    if (!ouvert) return
    const auClic = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-note-biblique]')) setOuvert(false)
    }
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  const sansSurvol = useSansSurvol()
  const racine = tailleRacinePx()
  const vue = typeof window === 'undefined'
    ? { largeur: 900, hauteur: 800 }
    : { largeur: window.innerWidth, hauteur: window.innerHeight }
  // ⛔ LA TÊTE DIT QUI PARLE, PUIS LA DISCIPLINE (charte § 13.21, 17 septembre 2026) :
  // « Note de l'édition · Critique textuelle ». La voix se compose comme sur la page d'une
  // œuvre (`intituleDeLaNote`), la discipline d'une note de verset la suit sans jamais la
  // remplacer. ⚠️ Faute de l'une et de l'autre, la tête se TAIT : c'est le NUMÉRO, dans sa
  // gouttière, qui dit à quelle note l'encart répond. ⛔ Jamais « Note » écrit en dur, qui
  // n'apprenait rien à qui venait de cliquer.
  const intitule = intituleNoteBiblique(note)
  const boite = rect ?? { top: 300, bottom: 316, left: 0 }
  const largeur = largeurEncartPx(racine)
  // La hauteur SUIT la note. Elle valait 420 px pour toutes, ce qui promettait une
  // page à un renvoi de deux mots et n'en promettait pas assez à un développement.
  const signes = signesDeLaNote(note)
  // ⚠️ Et ce que la note ajoute à sa longueur : le blanc de chaque bloc, et les lignes
  // qu'un bloc de vers force. Sans eux, la boîte s'ouvrait trop courte et défilait.
  const relief = reliefDeLaNote(note)
  // ⛔ LA HAUTEUR SE DEMANDE UNE FOIS LA LARGEUR CONNUE. L'encart se resserre à la marge
  // qu'on lui laisse ; estimée sur sa mesure pleine, sa hauteur valait deux fois moins
  // que la vraie dès qu'il se resserrait, et la boîte défilait pour rien. Sous l'appel,
  // rien ne le resserre : la mesure pleine y est la bonne.
  const hauteurVoulue = (largeurRetenue?: number) =>
    hauteurSouhaiteeNote({ signes, racine, intitule, largeur: largeurRetenue, ...relief })
  const hautNavbar = hauteurNavbarPx()
  // ⛔ D'ABORD LA MARGE : une note ouverte par-dessus la colonne cache le verset
  // qu'elle commente. ⚠️ Faute de place, on retombe sous l'appel.
  const placement = (colonne && placerEnMarge({ ancre: boite, largeur, largeurMin: largeurEncartMinBiblePx(racine), hauteurSouhaitee: hauteurVoulue, vue, hautNavbar, colonne, ecartGauche: DEBORD_BLOC_VERSET_REM * racine + 12 }))
    ?? placerFenetre({ ancre: boite, largeur, hauteurSouhaitee: hauteurVoulue(), vue, hautNavbar, ecart: 8, prefereDessus: sansSurvol })

  return (
    <>
      <sup
        ref={ancre as React.RefObject<HTMLElement>}
        data-note-biblique=""
        id={ancreAppelNoteBible(note.id, memberId)}
        role="button"
        tabIndex={0}
        onClick={basculer}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') basculer(e) }}
        aria-label={`Consulter la note ${note.displayNumber}`}
        aria-expanded={ouvert}
        // L'appel MARQUÉ tant que son encart est ouvert : le second lien entre
        // l'appel et sa note, celui qu'on suit des yeux en revenant au texte.
        style={ouvert ? { ...styleAppelNote(variante), ...STYLE_APPEL_OUVERT } : styleAppelNote(variante)}
      >
        {note.displayNumber}
      </sup>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <EncartNote
          numero={note.displayNumber}
          // ⛔ Plus de « Note » écrit en dur : l'intitulé nomme qui parle et la discipline,
          // et se tait quand la donnée ne déclare ni l'une ni l'autre. Le numéro, dans sa
          // gouttière, dit à quelle note l'encart répond.
          intitule={intitule}
          placement={placement}
          signes={signes}
          onFermer={() => setOuvert(false)}
          marque="data-note-biblique"
        >
          <ContenuNoteBiblique note={note} figures={figures} />
        </EncartNote>,
        document.body,
      )}
    </>
  )
}
