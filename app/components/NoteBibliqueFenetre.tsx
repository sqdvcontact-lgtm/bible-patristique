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

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  colonneDeLecture, hauteurNavbarPx, placerEnMarge, placerFenetre, tailleRacinePx,
  type ColonneLecture,
} from '@/app/lib/fenetreContextuelle'
import { styleAppelNote, type VarianteAppelNote } from '@/app/lib/appelsDeNote'
import { EncartNote } from './EncartNote'
import { hauteurSouhaiteeNote, largeurEncartMinPx, largeurEncartPx, MARGE_PARAGRAPHE_ENCART, reliefDeLaNote, signesDeLaNote, STYLE_APPEL_OUVERT } from '@/app/lib/compositionNote'
// L'axe est la CAPACITÉ DU POINTEUR, jamais la largeur (charte, « LE DOIGT »).
import { useSansSurvol } from '@/app/lib/useEstMobile'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import { ancreAppelNoteBible, type BibleEditionDisplayNote } from '@/app/lib/bibleEdition'
import { SEUIL_CITATION_SORTIE } from '@/app/lib/citationSortie'
import BibliographieBible from './BibleBibliographie'

export function ContenuNoteBiblique({ note }: { note: Pick<BibleEditionDisplayNote, 'blocks'> }) {
  return (
    <>
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
        const discret = bloc.kind === 'reference' || bloc.kind === 'attribution'
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
    </>
  )
}

export default function AppelNoteBiblique({
  note,
  memberId,
  variante = 'corps',
}: {
  note: Pick<BibleEditionDisplayNote, 'id' | 'displayNumber' | 'blocks'>
  memberId?: string
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
  // ⛔ UNE NOTE BIBLIQUE NE DÉCLARE AUCUN TYPE, et c'est le type qui le dit : les
  // blocs d'une édition biblique n'ont pas de `editorialRole` — l'axe « qui parle »
  // de la charte § 13.8 n'existe que du côté patristique. L'encart n'a donc pas
  // d'intitulé à porter, et il se tait : c'est le NUMÉRO, dans sa gouttière, qui dit
  // à quelle note il répond. ⚠️ Le jour où la donnée portera ce rôle,
  // `intituleDeLaNote` (`app/lib/typeNote.ts`) le composera, comme ailleurs.
  // ⛔ Jamais « Note » écrit en dur, qui n'apprenait rien à qui venait de cliquer.
  const intitule: string | null = null
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
    hauteurSouhaiteeNote({ signes, racine, avecIntitule: Boolean(intitule), largeur: largeurRetenue, ...relief })
  const hautNavbar = hauteurNavbarPx()
  // ⛔ D'ABORD LA MARGE : une note ouverte par-dessus la colonne cache le verset
  // qu'elle commente. ⚠️ Faute de place, on retombe sous l'appel.
  const placement = (colonne && placerEnMarge({ ancre: boite, largeur, largeurMin: largeurEncartMinPx(racine), hauteurSouhaitee: hauteurVoulue, vue, hautNavbar, colonne }))
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
          // ⛔ Plus de « Note » écrit en dur : l'intitulé nomme le TYPE de la note,
          // et se tait quand la donnée n'en déclare aucun — ce qui est le cas de
          // toutes les notes bibliques aujourd'hui. Le numéro, dans sa gouttière,
          // dit à quelle note l'encart répond.
          intitule={intitule}
          placement={placement}
          signes={signes}
          onFermer={() => setOuvert(false)}
          marque="data-note-biblique"
        >
          <ContenuNoteBiblique note={note} />
        </EncartNote>,
        document.body,
      )}
    </>
  )
}
