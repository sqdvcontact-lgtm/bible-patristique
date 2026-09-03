'use client'

// Appel de note biblique et sa fenêtre.
//
// Même modèle que partout ailleurs sur le site : un exposant discret, un clic,
// une fenêtre qui se pose sous l'appel et se retourne si le bas manque. La
// forme de l'appel vient de `styleAppelNote`, seule définition du site — ⛔ pas
// de pointillé sous un appel, jamais, nulle part.
//
// Une seule différence, voulue : la fenêtre est PLUS GRANDE qu'ailleurs. Une
// note de Fillion n'est pas une glose de trois mots ; la réduire à l'infobulle
// des œuvres obligerait à défiler dès la première phrase.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { hauteurNavbarPx, MARGE_FENETRE, placerFenetre } from '@/app/lib/fenetreContextuelle'
import { styleAppelNote, type VarianteAppelNote } from '@/app/lib/appelsDeNote'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import { ancreAppelNoteBible, type BibleEditionDisplayNote } from '@/app/lib/bibleEdition'
import { SEUIL_CITATION_SORTIE } from '@/app/lib/citationSortie'
import BibliographieBible from './BibleBibliographie'

/** Plus large et plus haute que l'infobulle des œuvres (340 × 340). */
const LARGEUR = 460
const HAUTEUR = 420

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
              margin: citationSortie ? undefined : (discret ? '0.35rem 0 0' : '0 0 0.5rem'),
              fontStyle: bloc.kind === 'lemma' ? 'italic' : 'normal',
              color: discret ? 'var(--cs-texte-second)' : 'var(--cs-texte-fort)',
              whiteSpace: bloc.form === 'verse' ? 'pre-line' : 'pre-wrap',
              textAlign: 'justify',
              hyphens: 'auto',
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

  const basculer = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (ancre.current) {
      const r = ancre.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
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

  const vue = typeof window === 'undefined'
    ? { largeur: 900, hauteur: 800 }
    : { largeur: window.innerWidth, hauteur: window.innerHeight }
  const placement = placerFenetre({
    ancre: rect ?? { top: 300, bottom: 316, left: 0 },
    largeur: LARGEUR,
    hauteurSouhaitee: HAUTEUR,
    vue,
    hautNavbar: hauteurNavbarPx(),
    ecart: 8,
  })

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
        style={styleAppelNote(variante)}
      >
        {note.displayNumber}
      </sup>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <div
          data-note-biblique=""
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: placement.left, top: placement.top,
            width: LARGEUR,
            // Le placeur promet MARGE_FENETRE de chaque côté. Sur un écran plus
            // étroit que 460 px, `100vw - 16px` ne laissait pourtant que 4 px à
            // droite : la largeur CSS et le calcul de placement ne parlaient pas
            // de la même marge. La fenêtre prend désormais exactement la bande
            // horizontale que le placeur lui réserve.
            maxWidth: `calc(100vw - ${MARGE_FENETRE * 2}px)`,
            maxHeight: placement.hauteurMax, overflowY: 'auto',
            background: 'var(--cs-fond)', border: '1px solid var(--cs-or-doux)',
            borderRadius: '4px', boxShadow: 'var(--cs-ombre-flottante)',
            padding: '12px 14px', zIndex: 9999,
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontSize: '0.8125rem', lineHeight: 1.45, color: 'var(--cs-texte-fort)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', textTransform: 'uppercase' }}>
              Note {note.displayNumber}
            </span>
            <button
              onClick={() => setOuvert(false)}
              aria-label="Fermer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', fontSize: '0.9375rem', lineHeight: 1, padding: '0 2px' }}
            >
              ×
            </button>
          </div>
          <ContenuNoteBiblique note={note} />
        </div>,
        document.body,
      )}
    </>
  )
}
