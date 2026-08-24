'use client'

import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { normaliserTitreTechnique } from '@/app/lib/titres'
import { terminerNote } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteAffichee } from './oeuvreTypes'
import { hauteurNavbarPx, placerFenetre } from '@/app/lib/fenetreContextuelle'

// Appels de note de la page de lecture patristique. Extrait d'OeuvreClient pour
// que la page de titre (PageTitre) y ait accès sans import circulaire : les notes
// se lisent partout où un texte de l'œuvre est rendu, corps et titres compris.

// Deux espaces, deux emplois, comme dans le corps du texte : la FINE devant les
// hautes ponctuations et autour des guillemets, l'insécable pleine chasse devant
// le seul deux-points (charte §3.2).
const NBSP_TITRE_COLOPHON = ' '
const FINE_TITRE_COLOPHON = ' '

// Les classes englobent l'espace, la tabulation et les deux insécables, JAMAIS
// `s`, qui emporterait le retour à la ligne : un titre composé sur deux lignes
// dont la seconde commence par une ponctuation perdait son saut de ligne,
// remplacé par une espace ou purement supprimé (« , . »). Le saut de ligne est
// un choix de composition, il ne se rattrape pas. Même précaution que dans
// `titreSansAppelsDeNote` ci-dessous.
export function preparerTitreColophon(texte: string) {
  return normaliserTitreTechnique(texte)
    .trim()
    .replace(/[ \t  ]+([;!?»])/g, `${FINE_TITRE_COLOPHON}$1`)
    .replace(/[ \t  ]+(:)/g, `${NBSP_TITRE_COLOPHON}$1`)
    .replace(/([«])[ \t  ]+/g, `$1${FINE_TITRE_COLOPHON}`)
    .replace(/[ \t  ]+([,.])/g, '$1')
}

// Le sommaire est une navigation compacte : la note y serait un appel qu'on ne
// peut pas lire (le sommaire ne porte pas le texte des notes) et qui hache
// l'intitulé. Elle est donc masquée là, et là seulement — l'appel reste actif
// dans le titre développé du corps. L'espace qui précède part avec le marqueur,
// sans quoi l'intitulé garderait un blanc double.
export function titreSansAppelsDeNote(texte: string) {
  return normaliserTitreTechnique(texte.replace(/[ \t]*\[\[[A-Z0-9]+\]\]/g, ''))
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
  corps: { fontSize: '0.60em', color: 'var(--cs-lacune)' },
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

// Le séparateur d’une suite d’appels prend exactement la forme de l’appel, mais
// ne se clique pas : il n’ouvre aucune note.
export function styleSeparateurAppels(variante: VarianteAppelNote = 'corps'): React.CSSProperties {
  return { ...styleAppelNote(variante), cursor: 'inherit', padding: 0 }
}

// ── Ce qui voyage avec l’appel ───────────────────────────────────────────────
// ⛔ Un appel ne se sépare JAMAIS du mot qui le précède ni du point qui le suit.
// L’appel est un `inline-block` : le navigateur y voit une occasion de couper la
// ligne, en aval comme en amont, et l’on a vu le point final tomber seul en tête de
// la ligne suivante. Règle d’auteur : c’est interdit. L’appel voyage donc dans un
// `nowrap` avec le dernier mot qui le précède et la ponctuation qui le suit.
//
// ⛔ Le mot à emmener n’est pas toujours du texte brut. Quand l’appel suit une
// ITALIQUE, une emphase ou un lien, le nœud précédent est un ÉLÉMENT : on ne pouvait
// lui prendre aucun mot, le `nowrap` ne contenait alors que l’appel, et celui-ci
// repartait seul à la ligne. On coupe donc l’élément en deux — son début reste dehors,
// son dernier mot entre dans le `nowrap`, dans un clone de lui-même. Deux `<em>` de
// suite se lisent exactement comme un seul.
//
// ⚠️ Mesuré le 2026-08-22, et c’est ce qui a écarté la solution évidente : une LIAISON
// DE MOTS (U+2060) glissée entre l’élément et l’appel ne change RIEN. Sur 341 largeurs
// de colonne, l’appel part seul 47 fois, avec la liaison comme sans elle, et qu’il soit
// `inline` ou `inline-block`. Un caractère ne supprime pas l’occasion de couper que
// crée une frontière d’élément ; seul un `nowrap` COMMUN aux deux la supprime — 0 fois
// sur 341 dans ce cas.
//
// Deux notes qui se suivent s’écrivent « 2 & 3 », esperluette entre les numéros
// (deux exposants collés se liraient « vingt-trois ») ; au delà de deux,
// « 2, 3 & 4 ». Les espaces du séparateur sont insécables : une espace ordinaire
// en tête ou en queue d’un `inline-block` serait supprimée par le navigateur.
const NBSP_APPELS = '\u00A0'
const PONCTUATION_ATTACHEE = /^[.,;:!?…»)\]]+/
const APPEL_SUIVANT = /^[ \u00A0\u202F]*,?[ \u00A0\u202F]*\[\[([A-Z0-9]+)\]\]/

/** Lit, à partir du crochet ouvrant en `debut`, la suite des appels collés et la
 *  ponctuation qui les suit. `fin` est l’index où reprendre la lecture. */
export function lireSuiteAppels(texte: string, debut: number) {
  const premier = /^\[\[([A-Z0-9]+)\]\]/.exec(texte.slice(debut))
  if (!premier) return { marqueurs: [] as string[], ponctuation: '', fin: debut }
  const marqueurs = [premier[1]]
  let fin = debut + premier[0].length
  for (;;) {
    const suivant = APPEL_SUIVANT.exec(texte.slice(fin))
    if (!suivant) break
    marqueurs.push(suivant[1])
    fin += suivant[0].length
  }
  const ponctuation = PONCTUATION_ATTACHEE.exec(texte.slice(fin))?.[0] ?? ''
  return { marqueurs, ponctuation, fin: fin + ponctuation.length }
}

/** Détache le dernier mot d’un fragment, pour qu’il parte avec l’appel qui le
 *  suit. Rien à détacher si le fragment finit par une espace. */
export function detacherDernierMot(texte: string): [string, string] {
  const dernier = /\S+$/.exec(texte)
  return dernier ? [texte.slice(0, dernier.index), dernier[0]] : [texte, '']
}

/** Le séparateur qui précède l’appel de rang `rang` dans une suite : esperluette
 *  avant le dernier, virgule avant les autres. */
export function separateurAppels(rang: number, total: number) {
  return rang === total - 1 ? `${NBSP_APPELS}&${NBSP_APPELS}` : `,${NBSP_APPELS}`
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
  // Le côté ne se décide plus sur un seuil de 180 px, qui ignorait le bas de
  // l'écran : la note ne passe jamais sous la barre de navigation et ne déborde
  // jamais du bas. Calcul pur, testé (voir fenetreContextuelle.ts).
  const vue = typeof window === 'undefined'
    ? { largeur: 900, hauteur: 800 }
    : { largeur: window.innerWidth, hauteur: window.innerHeight }
  const placement = placerFenetre({
    ancre: rect ?? { top: 300, bottom: 316, left: 0, right: 0 },
    largeur: W, hauteurSouhaitee: 340, vue, hautNavbar: hauteurNavbarPx(), ecart: 8,
  })

  const tooltip = visible ? (
    <div
      data-note-tooltip=""
      onMouseEnter={entrerTooltip}
      style={{
        position: 'fixed',
        left: placement.left,
        top: placement.top,
        width: W,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: placement.hauteurMax,
        overflowY: 'auto',
        background: 'var(--cs-fond)',
        border: '1px solid var(--cs-or-doux)',
        borderRadius: 4,
        boxShadow: 'var(--cs-ombre-flottante)',
        padding: '10px 12px',
        zIndex: 9999,
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: '0.78125rem',
        lineHeight: 1.45,
        color: 'var(--cs-texte-fort)',
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
          ? (terminerNote(contenu) || <em style={{ color: '#b0a08a' }}>Note indisponible</em>)
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
  const texteRendu = normaliserTypographieLecture(texte)
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
  while ((m = regex.exec(texteRendu))) {
    if (m.index > dernierIndex) noeuds.push(texteRendu.slice(dernierIndex, m.index))
    // Un appel de note peut se trouver à l'intérieur d'une emphase. Le contenu
    // doit donc repasser par le même moteur au lieu d'être rendu comme texte brut.
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{rendreTexteAvecNotes(m[1], notes, variante)}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{rendreTexteAvecNotes(m[2], notes, variante)}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{rendreTexteAvecNotes(m[3], notes, variante)}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>{rendreTexteAvecNotes(m[4], notes, variante)}</a>
    )
    else if (m[6] !== undefined) {
      // L’appel n’est pas rendu seul : on lit la suite entière (appels collés,
      // ponctuation attachée) et on lui adjoint le mot qui le précède, pour que
      // rien de tout cela ne puisse se retrouver seul à la ligne.
      const { marqueurs, ponctuation, fin } = lireSuiteAppels(texteRendu, m.index)
      regex.lastIndex = fin
      let attache: React.ReactNode = ''
      const precedent = noeuds[noeuds.length - 1]
      if (typeof precedent === 'string') {
        const [avant, mot] = detacherDernierMot(precedent)
        if (mot) { noeuds[noeuds.length - 1] = avant; attache = mot }
      } else if (isValidElement(precedent)) {
        // Un élément : on lui prend son DERNIER MOT dans un clone, pour ne pas rendre
        // toute l’emphase insécable — une italique peut courir sur une phrase entière.
        //
        // ⚠️ Ses enfants ne sont PAS une chaîne : le rendu est récursif, et une italique
        // reçoit la LISTE de nœuds que lui rend le moteur. On regarde donc le dernier
        // de ces enfants, et on ne coupe que s’il est du texte.
        const enfants = Children.toArray((precedent.props as { children?: React.ReactNode }).children)
        const queue = enfants[enfants.length - 1]
        const [avant, mot] = typeof queue === 'string' ? detacherDernierMot(queue) : ['', '']
        const debut = [...enfants.slice(0, -1), avant]
        const debutHabite = debut.some(x => (typeof x === 'string' ? x.trim() !== '' : x != null))
        if (mot && debutHabite) {
          noeuds[noeuds.length - 1] = cloneElement(precedent, { key: k++ }, debut)
          attache = cloneElement(precedent, { key: k++ }, mot)
        } else {
          // Un seul mot, ou une queue qui n’est pas du texte : l’élément entier entre
          // dans le nowrap. Il est alors court par construction, ou insécable de nature.
          noeuds.pop()
          attache = precedent
        }
      }
      const appels: React.ReactNode[] = []
      marqueurs.forEach((marqueur, rang) => {
        if (rang > 0) appels.push(
          <sup key={k++} style={styleSeparateurAppels(variante)}>{separateurAppels(rang, marqueurs.length)}</sup>
        )
        const contenu = notes[marqueur] ?? ''
        const numeroVisible = typeof contenu === 'string' ? numeroDe(marqueur) : contenu.noteNumber
        appels.push(<AppelNote key={k++} numeroVisible={numeroVisible} contenu={contenu} variante={variante} />)
      })
      noeuds.push(
        <span key={k++} style={{ whiteSpace: 'nowrap' }}>{attache}{appels}{ponctuation}</span>
      )
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
  if (dernierIndex < texteRendu.length) noeuds.push(texteRendu.slice(dernierIndex))
  return noeuds
}

// Les titres utilisent le même système de notes que le corps : l'appel y reste
// actif, seule sa forme change (voir FORME_APPEL).
export function rendreTitreColophonAvecNotes(
  texte: string,
  notes: Record<string, NoteAffichee>,
  variante: VarianteAppelNote = 'corps',
): React.ReactNode {
  // Rendu simple : le titre s'enroule naturellement (centré par ses conteneurs).
  // On a renoncé à la composition « colophon » (pavé à lignes décroissantes).
  // ⛔ Le point final n'est PLUS retiré ici (décision de l'auteur, 2026-08-24) : la
  // ponctuation d'un titre attesté se conserve, et seule la page de titre y déroge.
  return rendreTexteAvecNotes(preparerTitreColophon(texte), notes, variante)
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
