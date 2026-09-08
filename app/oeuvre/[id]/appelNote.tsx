'use client'

import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { normaliserTitreTechnique } from '@/app/lib/titres'
import { terminerNote } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import { intituleDeLaNote, libelleDeLaNote, LIBELLE_NOTE_SANS_TYPE } from '@/app/lib/typeNote'
import type { NoteAffichee } from './oeuvreTypes'
import { hauteurNavbarPx, placerFenetre, tailleRacinePx } from '@/app/lib/fenetreContextuelle'
// Le CADRE de l'encart, un seul pour les trois surfaces, et sa composition.
import { EncartNote } from '@/app/components/EncartNote'
import { hauteurSouhaiteeNote, largeurEncartPx, signesDeLaNote, STYLE_APPEL_OUVERT } from '@/app/lib/compositionNote'
// L'axe est la CAPACITÉ DU POINTEUR, jamais la largeur : une tablette de 1024 px
// en paysage n'a pas de souris (charte, « LE DOIGT »).
import { useSansSurvol } from '@/app/lib/useEstMobile'
import {
  PONCTUATION_ATTACHEE,
  detacherDernierMot,
  separateurAppels,
  styleAppelNote,
  styleSeparateurAppels,
  type VarianteAppelNote,
} from '@/app/lib/appelsDeNote'

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
  const texteEspace = normaliserTitreTechnique(texte)
    .trim()
    .replace(/[ \t  ]+([;!?»])/g, `${FINE_TITRE_COLOPHON}$1`)
    .replace(/[ \t  ]+(:)/g, `${NBSP_TITRE_COLOPHON}$1`)
    .replace(/([«])[ \t  ]+/g, `$1${FINE_TITRE_COLOPHON}`)
    .replace(/[ \t  ]+([,.])/g, '$1')
  return collerMotsCourts(texteEspace.replace(/(\p{L})-(?=\p{L})/gu, `$1-${GLUON_TITRE}`))
}

// ── Ce qu'un titre ne coupe pas ───────────────────────────────────────────────
// Le navigateur coupe librement APRÈS un trait d'union : sur les Questions sur
// l'Heptateuque, « a-t-elle » se rendait « a- / t-elle » dans la colonne de lecture
// comme au téléphone, et `text-wrap: balance` n'y pouvait rien, la coupe étant
// licite à ses yeux. Le GLUON est U+2060 (WORD JOINER) : sans chasse, il interdit
// la coupe de part et d'autre de lui, et il se pose après tout trait d'union placé
// entre deux lettres. ⛔ Pas le trait d'union insécable U+2011 : Source Serif 4 et
// Source Sans 3, tels que Google les sert, n'en ont pas le glyphe, et le navigateur
// l'emprunte à une police de secours (mesuré le 2026-09-03 : 5 px dans les quatre
// familles essayées, contre 4,7 px pour le trait d'union propre). Le gluon, lui,
// est un « ignorable par défaut » : il ne se dessine jamais, glyphe ou non.
const GLUON_TITRE = String.fromCharCode(0x2060)

// Les mots d'une ou deux lettres qu'on ne laisse pas seuls en fin de ligne : l'espace
// qui les SUIT devient insécable, et « fabrication de / l'arche » ne se voit plus.
// Liste close, français et latin ; la casse est ignorée pour le mot initial. On ne
// travaille qu'entre deux ESPACES ORDINAIRES et sur une même ligne : le saut saisi
// par l'éditeur reste un saut, et une espace déjà fine ou insécable reste ce qu'elle
// est. Le mot suivant doit commencer par une lettre ou un guillemet ouvrant, jamais
// par un appel de note ni par une ponctuation.
const MOTS_COLLES_TITRE = new Set([
  'à', 'a', 'y', 'de', 'du', 'et', 'ou', 'en', 'le', 'la', 'un', 'au', 'ne', 'se', 'ce', 'si', 'où', 'es', 'on', 'il', 'je', 'tu', 'ni',
  'in', 'ad', 'ex', 'ab', 'ut', 'ac', 'an', 'id', 'ob',
])
const DEBUT_DE_MOT = /^[\p{L}«’']/u
function collerMotsCourts(texte: string) {
  return texte.split('\n').map(ligne => {
    const mots = ligne.split(' ')
    let resultat = mots[0]
    for (let i = 1; i < mots.length; i++) {
      const precedent = mots[i - 1].replace(/^[«(]/, '').toLocaleLowerCase('fr-FR')
      const colle = MOTS_COLLES_TITRE.has(precedent) && DEBUT_DE_MOT.test(mots[i])
      resultat += (colle ? NBSP_TITRE_COLOPHON : ' ') + mots[i]
    }
    return resultat
  }).join('\n')
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
// La forme et ce qui voyage avec l'appel vivent dans `app/lib/appelsDeNote.ts`,
// module NEUTRE : le paratexte biblique s'en sert aussi, et il se rend côté
// serveur, où un module « use client » ne prête pas ses fonctions. Ré-exportés
// ici pour les nombreux appelants historiques de la page d'œuvre.
export {
  styleAppelNote,
  styleSeparateurAppels,
  detacherDernierMot,
  separateurAppels,
  type VarianteAppelNote,
} from '@/app/lib/appelsDeNote'

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
// La règle des suites d’appels (« 2 & 3 ») et la ponctuation qui s’y attache
// vivent dans `app/lib/appelsDeNote.ts`, avec la forme de l’appel : ne reste ici
// que la syntaxe `[[XXX]]` du corpus patristique, qui n’a pas cours ailleurs.
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

// ── L'ENCART D'UNE NOTE ───────────────────────────────────────────────────────
// Le CADRE vient de `EncartNote`, un seul pour les trois surfaces du site ; ce qui
// vit ici est le GESTE — survoler, cliquer, fermer — et lui seul.
export function AppelNote({ numeroVisible, contenu, variante = 'corps' }: {
  numeroVisible: number
  contenu: NoteAffichee
  variante?: VarianteAppelNote
}) {
  // LE TYPE DE LA NOTE S'ANNONCE DANS L'ENCART, et nulle part ailleurs : « Note du
  // traducteur », « Apparat critique ». Le lecteur doit voir du premier coup d'œil
  // qui parle — une variante de manuscrits n'est pas une remarque de commentaire,
  // et une note du traducteur n'engage pas le Père qu'on lit.
  //
  // ⛔ Jamais dans le TEXTE de la note, où l'on n'ajoute rien : la mention se
  // répète des milliers de fois, et c'est ce qui commande sa forme — la plus
  // discrète de la note, portée par la métadonnée (charte § 13.8).
  //
  // ⛔ Et il SE TAIT quand la note ne déclare aucun type — 58 % du corpus : c'est
  // alors le NUMÉRO, dans sa gouttière, qui dit à quelle note l'encart répond. Une
  // note HÉRITÉE (une chaîne, non un objet) n'en déclare jamais.
  const intitule = typeof contenu === 'string' ? null : intituleDeLaNote(contenu)
  // ⚠️ Le nom accessible, lui, NOMME toujours : « Note 277 » est exactement ce
  // qu'il faut dire à qui ne voit pas l'exposant.
  const libelle = typeof contenu === 'string' ? LIBELLE_NOTE_SANS_TYPE : libelleDeLaNote(contenu)

  const [visible, setVisible] = useState(false)
  const [figee, setFigee] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const marceurRef = useRef<HTMLElement>(null)
  const timerMasquer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sansSurvol = useSansSurvol()

  const effacerTimers = () => {
    if (timerMasquer.current) { clearTimeout(timerMasquer.current); timerMasquer.current = null }
  }

  const fermer = useCallback(() => {
    effacerTimers()
    setVisible(false)
    setFigee(false)
  }, [])

  const mesurer = () => {
    if (!marceurRef.current) return
    const r = marceurRef.current.getBoundingClientRect()
    setRect({ left: r.left, top: r.top, bottom: r.bottom })
  }

  const survolMarceur = () => {
    effacerTimers()
    mesurer()
    setVisible(true)
    // ⛔ PLUS DE GEL AU BOUT DE QUATRE SECONDES. Un survol qui s'attardait rendait
    // l'encart persistant SANS que rien ne le dise, et la croix paraissait alors
    // sous le curseur : l'objet changeait de forme tout seul, et il fallait ensuite
    // un clic pour défaire ce qu'on n'avait pas demandé. Un encart de survol se
    // ferme quand la main s'en va ; un encart persistant se demande d'un clic.
  }

  const quitterMarceur = () => {
    if (!figee) timerMasquer.current = setTimeout(() => setVisible(false), 200)
  }

  // Entrer DANS l'encart le retient — on va y lire, et parfois le faire défiler —
  // mais ne le fige pas : la croix n'a pas à paraître sous le curseur.
  const entrerEncart = () => { effacerTimers() }
  const quitterEncart = () => { if (!figee) timerMasquer.current = setTimeout(() => setVisible(false), 200) }

  const basculerEncart = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (visible && figee) { fermer(); return }
    effacerTimers()
    mesurer()
    setVisible(true)
    setFigee(true)
  }

  // Fermeture sur Échap ou clic extérieur quand l'encart est persistant
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

  // Le côté ne se décide pas sur un seuil en pixels, qui ignorait le bas de
  // l'écran : la note ne passe jamais sous la barre de navigation et ne déborde
  // jamais du bas. Calcul pur, testé (voir fenetreContextuelle.ts).
  const racine = tailleRacinePx()
  const vue = typeof window === 'undefined'
    ? { largeur: 900, hauteur: 800 }
    : { largeur: window.innerWidth, hauteur: window.innerHeight }
  const placement = placerFenetre({
    ancre: rect ?? { top: 300, bottom: 316, left: 0, right: 0 },
    largeur: largeurEncartPx(racine),
    // La hauteur SUIT la note, au lieu des 340 px que le placeur recevait pour
    // toutes : un renvoi de treize signes n'a pas à réserver la place d'un
    // développement, et un développement n'a pas à se croire court.
    hauteurSouhaitee: hauteurSouhaiteeNote({ signes: signesDeLaNote(contenu), racine, avecIntitule: Boolean(intitule) }),
    vue, hautNavbar: hauteurNavbarPx(), ecart: 8,
    prefereDessus: sansSurvol,
  })

  const encart = visible ? (
    <EncartNote
      numero={numeroVisible}
      intitule={intitule}
      placement={placement}
      onFermer={figee ? fermer : null}
      marque="data-note-tooltip"
      onMouseEnter={entrerEncart}
      onMouseLeave={quitterEncart}
    >
      {typeof contenu === 'string'
        ? (terminerNote(contenu) || <em style={{ color: 'var(--cs-texte-faible)' }}>Note indisponible</em>)
        : <ContenuNoteStructuree note={contenu} />}
    </EncartNote>
  ) : null

  return (
    <>
      <sup
        ref={marceurRef as React.RefObject<HTMLElement>}
        onMouseEnter={survolMarceur}
        onMouseLeave={quitterMarceur}
        onClick={basculerEncart}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') basculerEncart(e) }}
        role="button"
        tabIndex={0}
        aria-label={`${libelle} ${numeroVisible}`}
        aria-expanded={visible}
        className="cs-appel-cible"
        // L'appel MARQUÉ tant que son encart est ouvert : c'est le second lien
        // entre l'appel et sa note, celui qu'on suit des yeux en revenant au texte.
        style={visible ? { ...styleAppelNote(variante), ...STYLE_APPEL_OUVERT } : styleAppelNote(variante)}
      >
        {numeroVisible}
      </sup>
      {visible && typeof document !== 'undefined' && createPortal(encart, document.body)}
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
        const numeroVisible = typeof contenu === 'string'
          ? numeroDe(marqueur)
          : (contenu.displayNumber ?? contenu.noteNumber)
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
