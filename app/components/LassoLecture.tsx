'use client'

/**
 * LE LASSO — sélectionner plusieurs versets ou passages d'un seul geste, depuis le blanc.
 *
 * Demande de l'auteur, 16 septembre 2026 : « un outil de lasso permettant de sélectionner
 * plusieurs versets ou segments pour les enregistrer ; comme sur le bureau Windows, quand
 * on clique sur le blanc de la page Bible ou œuvre ».
 *
 * Ce composant porte le GESTE, la TRACE, la SURBRILLANCE et la BARRE d'actions. La règle —
 * où le lasso peut naître, ce qu'il touche, l'ordre de la sélection — vit dans
 * `app/lib/lasso.ts` ; les mots de la barre dans `app/lib/selectionPassages.ts`. Chaque
 * page dit ce qu'on sélectionne chez elle et ce qu'on en fait : elle pose une clé sur ses
 * cibles, et reçoit des clés.
 *
 * ⛔ LE LASSO NE NAÎT QUE DANS LE BLANC. Un glissé qui part d'un texte reste une sélection
 * de texte, un clic sur un verset ou un segment garde sa fonction.
 *
 * ⛔ AUCUN ÉTAT DE PAGE PENDANT LE GESTE. La trace se déplace par son style, image par
 * image, et seule la SÉLECTION remonte en état, quand elle change : la page d'une œuvre
 * compte cinq mille lignes, et la re-rendre à chaque image ne se paierait pas.
 *
 * ⛔ LA SURBRILLANCE EST UNE FEUILLE, non une classe posée sur les cibles : le composant
 * n'écrit rien dans des nœuds que React gère. Elle se pose en `box-shadow` inset, qui
 * passe par-dessus un fond posé EN LIGNE (le verset retenu en porte un) sans le remplacer.
 *
 * ⛔ UNE CITATION NE MÊLE PAS DEUX LANGUES (demande de l'auteur, 20 septembre 2026). La
 * page dit par `refus` ce qu'elle ne sait pas copier ; le lasso passe alors au ROUGE — la
 * trace, la surbrillance, le compte — et crie au centre du BLOC DE TEXTE, sur une plaque
 * de papier qui rend le message lisible, jusqu'à ce que le
 * geste revienne dans une seule colonne. Aucune action n'est offerte sous un refus.
 *
 * ⚠️ Au bureau seulement : la page passe `actif` à faux au doigt, où glisser fait défiler.
 */

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Z_FLOTTANT } from '@/app/lib/empilement'
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'
import {
  cleDeLassoValide, clesTouchees, combinerSelection, depasseLeSeuil, feuilleDeSurbrillance,
  memesCles, peutOuvrirLeLasso, rectangleEntre, surUneBarreDeDefilement, traceVisible,
  vitesseDeDefilement, type CibleMesuree, type Point, type Rect,
} from '@/app/lib/lasso'
import { libelleResultat, libelleSelection } from '@/app/lib/selectionPassages'

type Action = 'enregistrer' | 'retirer' | 'copier'

/**
 * Ce qu'un refus dit au lecteur : un cri, et de quoi le comprendre.
 *
 * ⛔ Le message vient de la PAGE : elle seule sait ce qu'elle a mis en regard — deux
 * langues d'une bible, une traduction et son original. Le composant ne fait que le crier.
 */
export type RefusDeLasso = { titre: string; detail?: string }

export type LassoLectureProps = {
  /** Là où le lasso peut naître : la zone de lecture. */
  zone: RefObject<HTMLElement | null>
  /** Ce qui DÉFILE. Absent, c'est la fenêtre. */
  defileur?: RefObject<HTMLElement | null>
  /** Faux au doigt, et partout où la page ne sait rien enregistrer. */
  actif: boolean
  /** Ce qui, en changeant, rend la sélection caduque : chapitre, traduction, division… */
  contexte: string
  /** Les cibles, cherchées dans la zone : leur ordre dans le document est l'ordre de lecture. */
  selecteurCibles: string
  /** La clé d'une cible, ou `null` pour l'écarter. */
  cleDe: (element: HTMLElement) => string | null
  /** Ce qui s'éclaire pour une clé, en sélecteur CSS. */
  surbrillance: (cle: string) => string
  /** Ce qui n'est pas du blanc chez cette page, en plus de ce que la règle refuse. */
  horsLasso?: string
  /** « verset », « versets ». */
  unite: readonly [string, string]
  /** Ce qui interdit d'agir sur une sélection — deux langues à la fois —, ou `null`. */
  refus?: (cles: readonly string[]) => RefusDeLasso | null
  /** Faux là où la page ne sait qu'en copier : le latin d'une œuvre n'a pas de prélèvement. */
  enregistrable?: (cles: readonly string[]) => boolean
  /** Combien, parmi ces clés, le lecteur a déjà enregistrés. */
  dejaEnregistres: (cles: readonly string[]) => number
  /** Rendent le nombre traité, ou `null` quand le geste s'arrête sans rien faire (compte requis). */
  onEnregistrer: (cles: readonly string[]) => Promise<number | null>
  onRetirer: (cles: readonly string[]) => Promise<number | null>
  onCopier: (cles: readonly string[]) => Promise<void>
  /** La gouttière exclue du centrage de la page : la barre se pose sur l'axe du texte. */
  gouttiere?: string
}

/** Le geste en cours, tenu hors de React : il change à chaque image. */
type Geste = {
  id: number
  /** À l'écran. */
  depart: Point
  courant: Point
  /** En coordonnées de contenu : un défilement ne le déplace pas. */
  departContenu: Point
  additif: boolean
  base: readonly string[]
  lance: boolean
  cibles: CibleMesuree<string>[]
  ordre: string[]
  derniere: readonly string[]
}

// ⚠️ L'alias doit être une constante de MODULE nommée « use… », sinon la règle des hooks
// d'ESLint ne le reconnaît pas (même alias que la cellule d'actions).
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

const DECLARATION_SURBRILLANCE = 'box-shadow: var(--cs-lasso-surbrillance);'
const DECLARATION_SURBRILLANCE_REFUS = 'box-shadow: var(--cs-lasso-surbrillance-refus);'
const DUREE_MESSAGE_MS = 2600

/**
 * Les boîtes d'une cible, à l'écran.
 *
 * ⚠️ Un segment EN LIGNE court sur plusieurs lignes, et peut porter un bloc (une citation
 * sortie) : ses propres boîtes n'en rendent qu'une partie. Une plage sur son contenu les
 * rend toutes, texte des enfants compris.
 */
function boitesDe(element: HTMLElement): DOMRect[] {
  if (getComputedStyle(element).display === 'inline') {
    const plage = document.createRange()
    plage.selectNodeContents(element)
    return Array.from(plage.getClientRects()).filter(b => b.width > 0 && b.height > 0)
  }
  const boite = element.getBoundingClientRect()
  return boite.width > 0 && boite.height > 0 ? [boite] : []
}

/**
 * La VUE : le défileur de la page, ou la fenêtre sous la barre de navigation.
 *
 * ⚠️ Une seule écriture pour le geste ET pour le placement de la barre et du cri : deux
 * copies de la même mesure divergeraient au premier réglage.
 */
function vueDe(defileur: HTMLElement | null): Rect {
  if (defileur) {
    const b = defileur.getBoundingClientRect()
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
  }
  const racine = document.documentElement
  return { left: 0, top: hauteurNavbarPx(), right: racine.clientWidth, bottom: racine.clientHeight }
}

/**
 * La BANDE où la lecture se voit : la zone du lasso, ramenée à la vue.
 *
 * ⛔ C'est elle qui porte l'axe de la barre ET le centre du cri : un message posé au
 * milieu de la FENÊTRE se centrerait sur les volets autant que sur le texte, et, sur une
 * page qui défile, sous la barre de navigation. ⚠️ Sur la page d'une œuvre, la zone fait
 * dix écrans : c'est bien son intersection avec la vue qu'il faut, jamais sa boîte.
 */
function bandeVisible(zone: HTMLElement, defileur: HTMLElement | null): Rect {
  const z = zone.getBoundingClientRect()
  const v = vueDe(defileur)
  return {
    left: Math.max(z.left, v.left), top: Math.max(z.top, v.top),
    right: Math.min(z.right, v.right), bottom: Math.min(z.bottom, v.bottom),
  }
}

function memeRect(a: Rect | null, b: Rect): boolean {
  return a !== null && a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom
}

function champDeSaisie(element: Element | null): boolean {
  if (!element) return false
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true
  return element instanceof HTMLElement && element.isContentEditable
}

function surLaBarre(element: HTMLElement, point: Point): boolean {
  const boite = element.getBoundingClientRect()
  return surUneBarreDeDefilement(point, {
    gauche: boite.left,
    haut: boite.top,
    decalageGauche: element.clientLeft,
    decalageHaut: element.clientTop,
    largeurCliente: element.clientWidth,
    hauteurCliente: element.clientHeight,
  })
}

export default function LassoLecture(props: LassoLectureProps) {
  const { zone, defileur, actif, contexte, unite, gouttiere } = props
  const [selection, setSelection] = useState<readonly string[]>([])
  const [trace, setTrace] = useState(false)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)
  const [enCours, setEnCours] = useState<Action | null>(null)
  // La bande où la lecture SE VOIT : elle porte l'axe de la barre et le centre du cri.
  const [cadre, setCadre] = useState<Rect | null>(null)
  const traceRef = useRef<HTMLDivElement>(null)

  // ⛔ La sélection ne survit pas à ce qui la rend fausse. Recalée PENDANT le rendu, et non
  // dans un effet : l'ancien chapitre ne s'éclaire pas une image de trop.
  const [contexteVu, setContexteVu] = useState(contexte)
  if (contexteVu !== contexte) {
    setContexteVu(contexte)
    setSelection([])
    setMessage(null)
  }
  if (!actif && selection.length > 0) setSelection([])
  // ⚠️ Un geste interrompu parce que la page cesse d'être éligible (la fenêtre passe au
  // format du doigt) ne laisse pas sa trace en suspens : la barre ne reparaîtrait plus.
  if (!actif && trace) setTrace(false)

  // ⛔ CE QUE LA PAGE REFUSE. Jugé À CHAQUE RENDU sur la sélection courante, et non dans un
  // état de plus : la sélection est déjà le seul état qui remonte pendant le geste, et le
  // refus n'en est qu'une lecture. ⚠️ `refus` doit donc être bon marché — une table de
  // correspondance, jamais une mesure du document.
  const refus = actif && selection.length > 0 ? (props.refus?.(selection) ?? null) : null

  const executer = async (action: Action) => {
    const cles = selection
    // ⛔ Un refus ferme TOUTES les actions, la copie comprise : c'est elle que la règle vise.
    if (cles.length === 0 || enCours || refus) return
    setEnCours(action)
    setMessage(null)
    try {
      if (action === 'copier') {
        await props.onCopier(cles)
        setMessage({ texte: 'Citation copiée', erreur: false })
      } else {
        const faits = action === 'enregistrer' ? await props.onEnregistrer(cles) : await props.onRetirer(cles)
        if (faits !== null) {
          setMessage({ texte: libelleResultat(faits, unite, action === 'enregistrer' ? 'enregistre' : 'retire'), erreur: false })
        }
      }
    } catch (erreur) {
      console.error('[lasso]', action, erreur)
      setMessage({
        texte: action === 'copier' ? 'La copie a échoué.' : 'L’opération a échoué. Réessayez.',
        erreur: true,
      })
    } finally {
      setEnCours(null)
    }
  }

  // Ce que les écoutes lisent sans se réabonner : les propriétés et la sélection du dernier
  // rendu. ⚠️ Rafraîchi APRÈS le rendu, jamais pendant.
  const derniers = useRef({ props, selection, executer })
  useEffect(() => { derniers.current = { props, selection, executer } })

  useEffect(() => {
    if (!message) return
    const minuteur = window.setTimeout(() => setMessage(null), DUREE_MESSAGE_MS)
    return () => window.clearTimeout(minuteur)
  }, [message])

  // ── Le geste ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actif) return
    const zoneEl = zone.current
    if (!zoneEl) return
    let geste: Geste | null = null
    let image = 0

    const defileurEl = (): HTMLElement | null => derniers.current.props.defileur?.current ?? null
    const decalage = (): Point => {
      const d = defileurEl()
      return d ? { x: d.scrollLeft, y: d.scrollTop } : { x: window.scrollX, y: window.scrollY }
    }
    // Ce qui se voit de ce qui défile : la barre de navigation est au-dessus de la fenêtre.
    const vue = (): Rect => vueDe(defileurEl())
    const bande = (): Rect => bandeVisible(zoneEl, defileurEl())

    // ⚠️ Les boîtes se mesurent UNE fois, au lancement, en coordonnées de contenu : le
    // défilement automatique ne change pas la mise en page, et mesurer mille segments à
    // chaque image ne se paierait pas.
    const mesurer = (): CibleMesuree<string>[] => {
      const { selecteurCibles, cleDe } = derniers.current.props
      const { x, y } = decalage()
      const cibles: CibleMesuree<string>[] = []
      for (const element of Array.from(zoneEl.querySelectorAll<HTMLElement>(selecteurCibles))) {
        const cle = cleDe(element)
        if (cle === null || !cleDeLassoValide(cle)) continue
        const rects = boitesDe(element).map(b => ({
          left: b.left + x, top: b.top + y, right: b.right + x, bottom: b.bottom + y,
        }))
        if (rects.length > 0) cibles.push({ cle, rects })
      }
      return cibles
    }

    // La trace et la sélection, pour la position courante du pointeur et du défilement.
    const actualiser = (g: Geste) => {
      const { x, y } = decalage()
      const lasso = rectangleEntre(g.departContenu, { x: g.courant.x + x, y: g.courant.y + y })
      const el = traceRef.current
      if (el) {
        const visible = traceVisible(lasso, { x, y }, bande())
        if (visible) {
          el.style.display = 'block'
          el.style.transform = 'translate(' + visible.left + 'px, ' + visible.top + 'px)'
          el.style.width = (visible.right - visible.left) + 'px'
          el.style.height = (visible.bottom - visible.top) + 'px'
        } else {
          el.style.display = 'none'
        }
      }
      const touchees = clesTouchees(lasso, g.cibles)
      const suite = combinerSelection(g.additif ? g.base : [], touchees, g.ordre)
      if (!memesCles(suite, g.derniere)) {
        g.derniere = suite
        setSelection(suite)
      }
    }

    const dessiner = () => {
      const g = geste
      if (!g || !g.lance) return
      const v = vue()
      const vitesse = vitesseDeDefilement(g.courant.y, v.top, v.bottom, g.depart.y)
      if (vitesse !== 0) {
        const d = defileurEl()
        // ⛔ Instantané : un défilement doux se poursuivrait lui-même d'une image à l'autre.
        if (d) d.scrollTo({ top: d.scrollTop + vitesse, behavior: 'instant' })
        else window.scrollTo({ top: window.scrollY + vitesse, behavior: 'instant' })
      }
      actualiser(g)
      image = window.requestAnimationFrame(dessiner)
    }

    const arreter = (g: Geste) => {
      window.cancelAnimationFrame(image)
      document.documentElement.removeAttribute('data-lasso-geste')
      if (g.lance) {
        try { zoneEl.releasePointerCapture(g.id) } catch { /* déjà relâché */ }
      }
    }

    // ⛔ Le clic qui suit un geste ne doit rien faire : lâché sur un verset, il le retiendrait.
    const avalerLeClic = () => {
      const avaler = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }
      window.addEventListener('click', avaler, { capture: true, once: true })
      window.setTimeout(() => window.removeEventListener('click', avaler, { capture: true }), 0)
    }

    const auDebut = (e: PointerEvent) => {
      if (geste || e.button !== 0 || !e.isPrimary || e.pointerType === 'touch') return
      const cible = e.target
      if (!(cible instanceof HTMLElement)) return
      if (!peutOuvrirLeLasso(cible, zoneEl, derniers.current.props.horsLasso)) return
      const point = { x: e.clientX, y: e.clientY }
      if (surLaBarre(cible, point)) return
      const { x, y } = decalage()
      geste = {
        id: e.pointerId,
        depart: point,
        courant: point,
        departContenu: { x: point.x + x, y: point.y + y },
        additif: e.shiftKey || e.ctrlKey || e.metaKey,
        base: derniers.current.selection,
        lance: false,
        cibles: [],
        ordre: [],
        derniere: derniers.current.selection,
      }
    }

    // ⛔ On empêche le MOUSEDOWN, non le pointerdown : annuler celui-ci supprimerait les
    // événements de souris qui le suivent, et les menus du site qui se ferment sur un
    // `mousedown` au dehors ne se fermeraient plus. Empêcher celui-là suffit à ne pas
    // commencer une sélection de texte, et à ne pas déplacer le foyer.
    const auMousedown = (e: MouseEvent) => {
      if (!geste || geste.lance || e.button !== 0) return
      e.preventDefault()
      // Le clic dans le blanc défaisait la sélection de texte : c'est ce qu'on vient d'empêcher.
      if (!e.shiftKey) window.getSelection()?.removeAllRanges()
    }

    const auMouvement = (e: PointerEvent) => {
      const g = geste
      if (!g || e.pointerId !== g.id) return
      g.courant = { x: e.clientX, y: e.clientY }
      if (g.lance || !depasseLeSeuil(g.depart, g.courant)) return
      g.lance = true
      g.cibles = mesurer()
      g.ordre = [...new Set(g.cibles.map(c => c.cle))]
      try { zoneEl.setPointerCapture(g.id) } catch { /* le pointeur est déjà parti */ }
      document.documentElement.setAttribute('data-lasso-geste', '')
      setTrace(true)
      setMessage(null)
      actualiser(g)
      image = window.requestAnimationFrame(dessiner)
    }

    const aLaFin = (e: PointerEvent) => {
      const g = geste
      if (!g || e.pointerId !== g.id) return
      geste = null
      // ⚠️ Un geste lâché avant sa première image ne perd pas son dernier mouvement.
      if (g.lance && e.type === 'pointerup') {
        g.courant = { x: e.clientX, y: e.clientY }
        actualiser(g)
      }
      arreter(g)
      if (g.lance) {
        setTrace(false)
        avalerLeClic()
      } else if (e.type === 'pointerup' && !g.additif && derniers.current.selection.length > 0) {
        // Un clic dans le blanc, sans geste : la sélection se défait, comme sur le bureau.
        setSelection([])
      }
    }

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const g = geste
        if (g) {
          geste = null
          arreter(g)
          if (g.lance) { setTrace(false); setSelection(g.base) }
          e.preventDefault()
          return
        }
        // ⚠️ Une fenêtre ouverte prend Échap pour elle : on ne défait pas la sélection derrière.
        if (derniers.current.selection.length > 0 && !document.querySelector('[aria-modal="true"]')) {
          setSelection([])
        }
        return
      }
      // Ctrl+C copie la sélection, et seulement si rien d'autre n'est à copier.
      if ((e.key === 'c' || e.key === 'C') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (derniers.current.selection.length === 0 || champDeSaisie(document.activeElement)) return
        const texte = window.getSelection()
        if (texte && !texte.isCollapsed && texte.toString().trim() !== '') return
        e.preventDefault()
        void derniers.current.executer('copier')
      }
    }

    zoneEl.addEventListener('pointerdown', auDebut)
    window.addEventListener('mousedown', auMousedown, { capture: true })
    window.addEventListener('pointermove', auMouvement)
    window.addEventListener('pointerup', aLaFin)
    window.addEventListener('pointercancel', aLaFin)
    window.addEventListener('keydown', auClavier)
    return () => {
      zoneEl.removeEventListener('pointerdown', auDebut)
      window.removeEventListener('mousedown', auMousedown, { capture: true })
      window.removeEventListener('pointermove', auMouvement)
      window.removeEventListener('pointerup', aLaFin)
      window.removeEventListener('pointercancel', aLaFin)
      window.removeEventListener('keydown', auClavier)
      if (geste) arreter(geste)
    }
  }, [actif, zone])

  // ── LE CADRE DE LECTURE : l'axe de la barre, et le centre du cri ──────────
  // ⚠️ Mesuré sur la ZONE, que les volets rétrécissent sans que la fenêtre bouge.
  // ⚠️ AVANT la peinture : la barre ne paraît pas une image au milieu de l'écran pour
  // glisser ensuite sur l'axe. L'observateur prend le relais quand un volet bouge.
  // ⛔ Et le DÉFILEMENT compte : sur une page d'œuvre, la zone fait dix écrans, et sa
  // bande visible se déplace quand la fenêtre défile — le cri s'y centre. L'écoute est en
  // CAPTURE (un défilement ne remonte pas, il descend : c'est le seul moyen d'entendre un
  // défileur interne) et bornée à une image, et l'état ne se repose QUE s'il a changé.
  const aSelection = actif && selection.length > 0
  useMesureAvantPeinture(() => {
    if (!aSelection) return
    const zoneEl = zone.current
    if (!zoneEl) return
    let image = 0
    const mesurer = () => {
      const b = bandeVisible(zoneEl, defileur?.current ?? null)
      if (b.right > b.left && b.bottom > b.top) setCadre(prec => (memeRect(prec, b) ? prec : b))
    }
    const bientot = () => {
      if (image) return
      image = requestAnimationFrame(() => { image = 0; mesurer() })
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(zoneEl)
    window.addEventListener('resize', mesurer)
    window.addEventListener('scroll', bientot, true)
    return () => {
      if (image) cancelAnimationFrame(image)
      observateur.disconnect()
      window.removeEventListener('resize', mesurer)
      window.removeEventListener('scroll', bientot, true)
    }
  }, [aSelection, zone, defileur])

  if (!actif || (selection.length === 0 && !trace)) return null

  const feuille = feuilleDeSurbrillance(
    selection.filter(cleDeLassoValide).map(cle => props.surbrillance(cle)),
    // ⛔ La surbrillance d'un REFUS est rouge elle aussi : le lecteur doit voir CE QUI est
    // pris, non seulement qu'on lui refuse quelque chose.
    refus ? DECLARATION_SURBRILLANCE_REFUS : DECLARATION_SURBRILLANCE,
  )
  const nombre = selection.length
  const enregistrable = nombre > 0 && (props.enregistrable?.(selection) ?? true)
  const deja = enregistrable ? Math.min(nombre, props.dejaEnregistres(selection)) : 0
  const aEnregistrer = enregistrable ? nombre - deja : 0
  const axe = cadre === null ? null : cadre.left + (cadre.right - cadre.left) / 2
  const gauche = axe === null
    ? '50%'
    : gouttiere ? 'calc(' + axe + 'px - ' + gouttiere + ' / 2)' : axe + 'px'
  // ⛔ LE CRI SE CENTRE DANS LE BLOC DE TEXTE, non au milieu de l'écran : sa boîte EST la
  // bande de lecture, moins la gouttière d'actions — le même axe que la barre et que le
  // titre du chapitre. Faute de mesure (première image), on retombe sur la fenêtre.
  const cadreDuCri: React.CSSProperties = cadre === null
    ? { inset: 0 }
    : {
      left: cadre.left + 'px',
      top: cadre.top + 'px',
      width: gouttiere ? 'calc(' + (cadre.right - cadre.left) + 'px - ' + gouttiere + ')' : (cadre.right - cadre.left) + 'px',
      height: (cadre.bottom - cadre.top) + 'px',
    }

  return createPortal(
    <>
      {feuille && <style>{feuille}</style>}
      {trace && (
        <div ref={traceRef} className={'cs-lasso-trace' + (refus ? ' cs-lasso-trace--refus' : '')}
          style={{ zIndex: Z_FLOTTANT }} aria-hidden="true" />
      )}
      {/* ⛔ LE CRI PARAÎT PENDANT LE GESTE COMME APRÈS LUI : c'est au moment où le cadre
          traverse la seconde colonne qu'il faut dire pourquoi il devient rouge. Il ne prend
          aucun pointeur — le geste continue dessous. */}
      {refus && (
        <div className="cs-lasso-alarme" style={{ zIndex: Z_FLOTTANT, ...cadreDuCri }} role="alert" aria-live="assertive">
          {/* ⛔ LA PLAQUE est du PAPIER, non une carte : elle efface le texte sous le
              message, et son bord se fond. Sans elle, le petit texte se lisait sur la
              page qu'il couvrait, et ne se lisait pas. */}
          <div className="cs-lasso-alarme-plaque">
            <span className="cs-lasso-alarme-cri">{refus.titre}</span>
            {refus.detail && <span className="cs-lasso-alarme-detail">{refus.detail}</span>}
          </div>
        </div>
      )}
      {nombre > 0 && !trace && (
        <div className="cs-lasso-barre" role="region" aria-label="Passages sélectionnés"
          style={{ zIndex: Z_FLOTTANT, left: gauche }}>
          <span className={'cs-lasso-compte' + (message?.erreur || refus ? ' cs-lasso-compte--erreur' : '')}
            role="status" aria-live="polite">
            {message ? message.texte : libelleSelection(nombre, unite)}
          </span>
          {/* ⛔ Sous un refus, la barre ne garde que de quoi DÉFAIRE : offrir une action
              qu'on refuserait au clic serait une promesse en l'air. */}
          <span className="cs-lasso-actions">
            {!refus && aEnregistrer > 0 && (
              <button type="button" className="cs-lasso-action cs-lasso-action--principale"
                disabled={enCours !== null} onClick={() => void executer('enregistrer')}
                title={deja > 0
                  ? 'Enregistrer dans mes citations les ' + aEnregistrer + ' qui ne le sont pas'
                  : 'Enregistrer dans mes citations'}>
                {enCours === 'enregistrer' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
            {!refus && deja > 0 && (
              <button type="button" className="cs-lasso-action" disabled={enCours !== null}
                onClick={() => void executer('retirer')} title="Retirer de mes citations">
                {enCours === 'retirer' ? 'Retrait…' : 'Retirer'}
              </button>
            )}
            {!refus && (
              <button type="button" className="cs-lasso-action" disabled={enCours !== null}
                onClick={() => void executer('copier')} title="Copier la citation (Ctrl+C)">
                Copier
              </button>
            )}
            <button type="button" className="cs-lasso-fermer" onClick={() => setSelection([])}
              aria-label="Défaire la sélection" title="Défaire la sélection (Échap)">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ display: 'block' }}>
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </div>
      )}
    </>,
    document.body,
  )
}
