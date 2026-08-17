'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { sansPointFinal } from '@/app/lib/titres'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteAffichee } from './oeuvreTypes'

// Appels de note de la page de lecture patristique. Extrait d'OeuvreClient pour
// que la page de titre (PageTitre) y ait accès sans import circulaire : les notes
// se lisent partout où un texte de l'œuvre est rendu, corps et titres compris.

const NBSP_TITRE_COLOPHON = ' '

// Les classes sont bornées à l'espace et à la tabulation, JAMAIS `\s`, qui
// engloberait le retour à la ligne : un titre composé sur deux lignes dont la
// seconde commence par une ponctuation perdait son saut de ligne, remplacé par
// une espace insécable (« ; : ! ? » ») ou purement supprimé (« , . »). Le saut
// de ligne est un choix de composition, il ne se rattrape pas. Même précaution
// que dans `titreSansAppelsDeNote` ci-dessous.
export function preparerTitreColophon(texte: string) {
  return texte
    .trim()
    .replace(/[ \t]+([;:!?»])/g, `${NBSP_TITRE_COLOPHON}$1`)
    .replace(/([«])[ \t]+/g, `$1${NBSP_TITRE_COLOPHON}`)
    .replace(/[ \t]+([,.])/g, '$1')
}

// Le sommaire est une navigation compacte : la note y serait un appel qu'on ne
// peut pas lire (le sommaire ne porte pas le texte des notes) et qui hache
// l'intitulé. Elle est donc masquée là, et là seulement — l'appel reste actif
// dans le titre développé du corps. L'espace qui précède part avec le marqueur,
// sans quoi l'intitulé garderait un blanc double.
export function titreSansAppelsDeNote(texte: string) {
  return texte.replace(/[ \t]*\[\[[A-Z0-9]+\]\]/g, '')
}

// ── Forme de l'appel selon l'endroit où il se trouve ──────────────────────────
// L'appel prend le style du texte qui l'accueille : il hérite la police et
// l'italique du contexte (un chapeau en italique porte un appel en italique, une
// colonne en sans-serif un appel en sans-serif) et se règle en corps sur lui.
// Dans la prose, il garde sa teinte brune. Dans un titre de haut rang, cette
// teinte devient une tache : l'intitulé est court et composé large, l'appel y
// prend donc l'encre du titre, plus discret et proportionnellement plus petit.
// Les titres de rang bas (niveaux 3 et 4), composés à la taille du texte,
// gardent la forme du corps.
//
// ⛔ JAMAIS de pointillé (ni de soulignement d'aucune sorte) sous un appel de
// note : règle d'auteur, sans exception. L'exposant et la teinte suffisent à le
// signaler. Ne pas le réintroduire au prétexte d'indiquer qu'il est cliquable.
export type VarianteAppelNote = 'corps' | 'titre' | 'frontispice'

const FORME_APPEL: Record<VarianteAppelNote, React.CSSProperties> = {
  corps: { fontSize: '0.60em', color: '#8a6a3e' },
  titre: { fontSize: '0.42em', color: 'currentColor', opacity: 0.55 },
  frontispice: { fontSize: '0.30em', color: 'currentColor', opacity: 0.45 },
}

export function styleAppelNote(variante: VarianteAppelNote = 'corps'): React.CSSProperties {
  return {
    cursor: 'help',
    fontFamily: 'inherit',
    fontStyle: 'inherit',
    userSelect: 'none',
    letterSpacing: 0,
    display: 'inline-block',
    lineHeight: 1,
    padding: '0 1px',
    ...FORME_APPEL[variante],
  }
}

// ── Info-bulle de note ────────────────────────────────────────────────────────
export function AppelNote({ numeroVisible, contenu, variante = 'corps' }: {
  numeroVisible: number
  contenu: NoteAffichee
  variante?: VarianteAppelNote
}) {
  const [visible, setVisible] = useState(false)
  const [figee, setFigee] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const marceurRef = useRef<HTMLElement>(null)
  const timerFiger = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerMasquer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effacerTimers = () => {
    if (timerFiger.current) { clearTimeout(timerFiger.current); timerFiger.current = null }
    if (timerMasquer.current) { clearTimeout(timerMasquer.current); timerMasquer.current = null }
  }

  const fermer = useCallback(() => {
    effacerTimers()
    setVisible(false)
    setFigee(false)
  }, [])

  const survolMarceur = () => {
    effacerTimers()
    if (marceurRef.current) {
      const r = marceurRef.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
    }
    setVisible(true)
    timerFiger.current = setTimeout(() => setFigee(true), 4000)
  }

  const quitterMarceur = () => {
    if (timerFiger.current) { clearTimeout(timerFiger.current); timerFiger.current = null }
    if (!figee) {
      timerMasquer.current = setTimeout(() => setVisible(false), 200)
    }
  }

  const entrerTooltip = () => {
    effacerTimers()
    setFigee(true)
  }

  const basculerTooltip = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (visible && figee) { fermer(); return }
    effacerTimers()
    if (marceurRef.current) {
      const r = marceurRef.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
    }
    setVisible(true)
    setFigee(true)
  }

  // Fermeture sur Échap ou clic extérieur quand figée
  useEffect(() => {
    if (!figee || !visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-note-tooltip]')) fermer()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [figee, visible, fermer])

  // Fermeture sur scroll si pas figée
  useEffect(() => {
    if (!visible || figee) return
    const onScroll = () => setVisible(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [visible, figee])

  useEffect(() => () => effacerTimers(), [])

  const W = 340
  const placerEnHaut = (rect?.top ?? 300) > 180

  const tooltip = visible ? (
    <div
      data-note-tooltip=""
      onMouseEnter={entrerTooltip}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(rect?.left ?? 0, (typeof window !== 'undefined' ? window.innerWidth : 900) - W - 8)),
        top: placerEnHaut ? (rect?.top ?? 0) - 8 : (rect?.bottom ?? 0) + 8,
        transform: placerEnHaut ? 'translateY(-100%)' : 'none',
        width: W,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 340,
        overflowY: 'auto',
        background: '#faf6ee',
        border: '1px solid var(--cs-or-doux)',
        borderRadius: 5,
        boxShadow: '0 6px 24px rgba(44,30,10,0.20)',
        padding: '10px 12px',
        zIndex: 9999,
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: '0.78125rem',
        lineHeight: 1.45,
        color: '#2a2218',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', textTransform: 'uppercase' }}>
          Note {numeroVisible}
        </span>
        {figee && (
          <button
            onClick={fermer}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a08a', fontSize: '0.9375rem', lineHeight: 1, padding: '0 2px' }}
          >×</button>
        )}
      </div>
      <div style={{ whiteSpace: 'pre-line' }}>
        {typeof contenu === 'string'
          ? (contenu || <em style={{ color: '#b0a08a' }}>Note indisponible</em>)
          : <ContenuNoteStructuree note={contenu} />}
      </div>
    </div>
  ) : null

  return (
    <>
      <sup
        ref={marceurRef as React.RefObject<HTMLElement>}
        onMouseEnter={survolMarceur}
        onMouseLeave={quitterMarceur}
        onClick={basculerTooltip}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') basculerTooltip(e) }}
        role="button"
        tabIndex={0}
        aria-label={`Consulter la note ${numeroVisible}`}
        style={styleAppelNote(variante)}
      >
        {numeroVisible}
      </sup>
      {visible && typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  )
}

// Variante de rendreTexteEnrichi qui gère aussi les marqueurs [[A]] de notes.
export function rendreTexteAvecNotes(
  texte: string,
  notes: Record<string, NoteAffichee>,
  variante: VarianteAppelNote = 'corps',
): React.ReactNode {
  const noeuds: React.ReactNode[] = []
  // Le marqueur stocké ([[A]], [[B]]…) reste la clé de la note en base : c'est
  // lui qui donne accès au texte. Seul l'appel AFFICHÉ change — un numéro, selon
  // l'usage français. La numérotation suit l'ordre d'apparition et se fait par
  // marqueur distinct : une note rappelée deux fois garde son numéro.
  const numeros = new Map<string, number>()
  const numeroDe = (marqueur: string) => {
    // Les imports récents portent déjà une numérotation éditoriale globale.
    // Ne jamais la renuméroter localement (un [[78]] doit rester 78).
    if (/^\d+$/.test(marqueur)) return Number(marqueur)
    const connu = numeros.get(marqueur)
    if (connu) return connu
    const n = numeros.size + 1
    numeros.set(marqueur, n)
    return n
  }
  // Même syntaxe que rendreTexteEnrichi (les ++petites capitales++ comprises,
  // en fin d'alternance pour ne pas renuméroter les groupes), plus les [[appels]].
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\[\[([A-Z0-9]+)\]\]|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)|<i>([\s\S]*?)<\/i>|\+\+(.+?)\+\+/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    // Un appel de note peut se trouver à l'intérieur d'une emphase. Le contenu
    // doit donc repasser par le même moteur au lieu d'être rendu comme texte brut.
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{rendreTexteAvecNotes(m[1], notes, variante)}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{rendreTexteAvecNotes(m[2], notes, variante)}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{rendreTexteAvecNotes(m[3], notes, variante)}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>{rendreTexteAvecNotes(m[4], notes, variante)}</a>
    )
    else if (m[6] !== undefined) {
      const marqueur = m[6]
      const contenu = notes[marqueur] ?? ''
      const numeroVisible = typeof contenu === 'string' ? numeroDe(marqueur) : contenu.noteNumber
      noeuds.push(<AppelNote key={k++} numeroVisible={numeroVisible} contenu={contenu} variante={variante} />)
    }
    else if (m[7] !== undefined) {
      noeuds.push(<span key={k++} style={STYLE_ROMAIN}>{m[7]}</span>)
      noeuds.push(<sup key={k++} style={STYLE_ORDINAL}>{m[8]}</sup>)
      noeuds.push(m[9])
    }
    else if (m[10] !== undefined) {
      noeuds.push(<em key={k++}>{rendreTexteAvecNotes(m[10], notes, variante)}</em>)
    }
    else if (m[11] !== undefined) {
      noeuds.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{rendreTexteAvecNotes(m[11], notes, variante)}</span>)
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

// Les titres utilisent le même système de notes que le corps : l'appel y reste
// actif, seule sa forme change (voir FORME_APPEL).
export function rendreTitreColophonAvecNotes(
  texte: string,
  notes: Record<string, NoteAffichee>,
  estTitre = false,
  variante: VarianteAppelNote = 'corps',
): React.ReactNode {
  // Rendu simple : le titre s'enroule naturellement (centré par ses conteneurs).
  // On a renoncé à la composition « colophon » (pavé à lignes décroissantes).
  // `estTitre` : retire le point final (règle éditoriale) ; pas pour les _texte,
  // qui sont des chapeaux/phrases.
  return rendreTexteAvecNotes(preparerTitreColophon(estTitre ? sansPointFinal(texte) : texte), notes, variante)
}

/** Banque de notes d'un texte d'affichage : ne retient que les marqueurs qui y
 *  paraissent réellement, cherchés dans les notes des segments chargés. Sert la
 *  page de titre, dont les intitulés ne sont portés par aucun segment. */
export function notesPourTexte(
  textes: (string | null | undefined)[],
  banques: (Record<string, NoteAffichee> | null | undefined)[],
): Record<string, NoteAffichee> {
  const cherches = new Set<string>()
  for (const texte of textes) {
    for (const m of (texte ?? '').matchAll(/\[\[([A-Z0-9]+)\]\]/g)) cherches.add(m[1])
  }
  const trouvees: Record<string, NoteAffichee> = {}
  if (cherches.size === 0) return trouvees
  for (const banque of banques) {
    if (!banque) continue
    for (const cle of cherches) {
      if (trouvees[cle] === undefined && banque[cle] !== undefined) trouvees[cle] = banque[cle]
    }
  }
  return trouvees
}
