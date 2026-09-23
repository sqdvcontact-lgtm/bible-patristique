'use client'

// ── LE LASSO AU DOIGT — l'appui long, puis le glisser ─────────────────────────
//
// Demande de l'auteur (2026-09-22) : au téléphone, rester appuyé au même endroit fait
// passer en mode lasso, et le glisser du doigt sélectionne des versets comme le lasso de
// la souris (`LassoLecture`). Celui-ci est écrit pour la souris — il naît sur le blanc de
// la page, sa capture et son défilement automatique supposent un pointeur fin — et au
// doigt, glisser FAIT DÉFILER : un geste ordinaire ne peut pas devenir un lasso. Il faut
// donc un signal que le défilement n'emploie pas, et c'est l'appui long.
//
// ⛔ IL NE NAÎT QUE SUR UN ÉLÉMENT `[data-lasso-depart]` (2026-09-22) : le NUMÉRO d'un
// verset, une marge, une gouttière — ce que la page désigne. Il naissait partout dans la
// zone, et à 450 ms il devançait la sélection native (~500 ms) : on ne pouvait plus
// copier une demi-phrase. L'appui long sur le TEXTE revient donc à la sélection native.
//
// ⛔ LE DÉFILEMENT RESTE ENTIER HORS DU MODE. Rien n'est empêché tant que le doigt n'est
// pas resté ~450 ms sans bouger de plus de 10 px : un doigt qui part tout de suite défile
// comme avant. Une fois le mode ouvert — et SEULEMENT alors — le `touchmove` est annulé,
// le menu contextuel natif et la sélection de texte sont empêchés.
// ⛔ L'ÉCOUTE NON PASSIVE N'EST PLUS POSÉE SUR LE DOCUMENT : elle bloquait le défilement
// de toute la page (le navigateur attend chaque écouteur non passif avant de défiler).
// Elle ne vit que sur les éléments de départ, et ne fait rien hors du mode.
// ⚠️ Elle ne peut pas naître à l'ouverture du mode : le navigateur décide AU TOUCHSTART
// si une suite de gestes est annulable (zone des écouteurs bloquants), et un écouteur
// posé ensuite recevrait des `touchmove` non annulables — le doigt ferait défiler la
// page, et le navigateur couperait le geste par un `pointercancel`. La zone bloquante se
// borne donc aux seuls éléments d'où un lasso peut naître.
// ⛔ LE CLIC QUI SUIT LE GESTE EST AVALÉ : lâché sur un verset, il le retiendrait et
// ouvrirait son pavé d'actions.
// ⚠️ Les cibles se mesurent UNE fois, à l'ouverture du mode, en coordonnées de fenêtre :
// le défilement est bloqué pendant le geste, rien ne bouge.
//
// La RÈGLE (rectangle, croisement, surbrillance) vient de `app/lib/lasso.ts`, les MOTS de
// `app/lib/selectionPassages.ts`, la FORME de la feuille du lasso (`.cs-lasso-*`) : ce
// composant n'en recompose aucune.

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Z_FLOTTANT } from '@/app/lib/empilement'
import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import {
  clesTouchees, cleDeLassoValide, feuilleDeSurbrillance, ombreDeSurbrillance, rectangleEntre,
  type CibleMesuree, type Point,
} from '@/app/lib/lasso'
import { libelleSelection } from '@/app/lib/selectionPassages'
import { libelleAction } from '@/app/components/LassoLecture'

/** Le temps d'appui, et le mouvement toléré pendant ce temps. */
export const DELAI_APPUI_LONG_MS = 450
export const TOLERANCE_APPUI_PX = 10

const DUREE_MESSAGE_MS = 2600
const DECLARATION_SURBRILLANCE = `box-shadow: ${ombreDeSurbrillance('var(--cs-lasso-teinte)')};`
/** Ce sur quoi un appui long ne naît pas : les commandes ont leur propre geste. */
const NE_NAIT_PAS_SUR = 'a, button, input, textarea, select, [contenteditable="true"], .verset-actions, [data-cellule-actions]'
/** L'attribut que la page pose là où un lasso peut naître (contrat partagé avec la
 *  lecture en regard). */
export const ATTRIBUT_DEPART_LASSO = 'data-lasso-depart'
const SELECTEUR_DEPART = `[${ATTRIBUT_DEPART_LASSO}]`

/**
 * Le lasso au doigt. ⚠️ Deux pages le montent — la lecture simple (`TexteBible`) et la
 * lecture en regard — avec les mêmes propriétés que `LassoLecture`, moins ce qui tient à
 * la souris :
 * - `zone` : le bloc où les cibles se mesurent et d'où le geste peut partir ;
 * - `actif` : au doigt seulement (`mobile || sansSurvol`), hors pièce liminaire ;
 * - `contexte` : ce qui, en changeant, vide la sélection (chapitre, traduction) ;
 * - `selecteurCibles`, `cleDe`, `surbrillance` : les cibles et leur clé ;
 * - `unite`, `dejaEnregistres`, `onEnregistrer`, `onRetirer`, `onCopier` : ce qu'on en fait.
 * ⛔ Et la page pose `data-lasso-depart` sur les éléments d'où le geste peut naître :
 * sans eux, il ne naît nulle part.
 */
type Props = {
  zone: RefObject<HTMLElement | null>
  actif: boolean
  contexte: string
  selecteurCibles: string
  cleDe: (element: Element) => string | null
  surbrillance: (cle: string) => string
  unite: readonly [string, string]
  dejaEnregistres: (cles: readonly string[]) => number
  onEnregistrer: (cles: readonly string[]) => Promise<number | null>
  onRetirer: (cles: readonly string[]) => Promise<number | null>
  onCopier: (cles: readonly string[]) => Promise<void>
}

type Action = 'enregistrer' | 'retirer' | 'copier'

export default function LassoTactile(props: Props) {
  const { actif, contexte, unite } = props
  const [selection, setSelection] = useState<string[]>([])
  const [trace, setTrace] = useState(false)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)
  const [enCours, setEnCours] = useState<Action | null>(null)
  const traceRef = useRef<HTMLDivElement>(null)

  // Un autre chapitre, une autre traduction : la sélection d'avant n'a plus d'objet.
  // ⛔ Recalé PENDANT le rendu, jamais dans un effet.
  const [contexteVu, setContexteVu] = useState(contexte)
  if (contexteVu !== contexte || (!actif && (selection.length > 0 || trace))) {
    setContexteVu(contexte)
    if (selection.length > 0) setSelection([])
    if (trace) setTrace(false)
  }

  const derniers = useRef(props)
  useEffect(() => { derniers.current = props })

  useEffect(() => {
    if (!message) return
    const minuteur = window.setTimeout(() => setMessage(null), DUREE_MESSAGE_MS)
    return () => window.clearTimeout(minuteur)
  }, [message])

  // ── Le geste ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actif) return
    let attente: { id: number; depart: Point; minuteur: number } | null = null
    let geste: { id: number; depart: Point; cibles: CibleMesuree<string>[] } | null = null
    let finAvaler: number | null = null

    const annulerAttente = () => {
      if (attente) window.clearTimeout(attente.minuteur)
      attente = null
    }
    const poserTrace = (a: Point, b: Point) => {
      const r = rectangleEntre(a, b)
      const el = traceRef.current
      if (!el) return
      el.style.display = 'block'
      el.style.transform = `translate(${r.left}px, ${r.top}px)`
      el.style.width = `${Math.max(1, r.right - r.left)}px`
      el.style.height = `${Math.max(1, r.bottom - r.top)}px`
    }
    const choisir = (a: Point, b: Point) => {
      if (!geste) return
      const touchees = clesTouchees(rectangleEntre(a, b), geste.cibles)
      setSelection(prev => (prev.length === touchees.length && prev.every((c, i) => c === touchees[i]) ? prev : touchees))
    }
    const ouvrirLeMode = () => {
      if (!attente) return
      const { id, depart } = attente
      attente = null
      const zone = derniers.current.zone.current
      if (!zone) return
      const cibles: CibleMesuree<string>[] = []
      for (const el of Array.from(zone.querySelectorAll(derniers.current.selecteurCibles))) {
        const cle = derniers.current.cleDe(el)
        if (!cle) continue
        const r = el.getBoundingClientRect()
        cibles.push({ cle, rects: [{ left: r.left, top: r.top, right: r.right, bottom: r.bottom }] })
      }
      geste = { id, depart, cibles }
      document.documentElement.setAttribute('data-lasso-geste', '')
      window.getSelection()?.removeAllRanges()
      navigator.vibrate?.(12)
      setMessage(null)
      setTrace(true)
      // La trace n'est montée qu'au rendu suivant : on la pose à l'image d'après.
      requestAnimationFrame(() => poserTrace(depart, depart))
      choisir(depart, depart)
    }
    const finir = () => {
      geste = null
      annulerAttente()
      document.documentElement.removeAttribute('data-lasso-geste')
      setTrace(false)
      // ⛔ Le clic qui suit le lâcher ne retient pas le verset sous le doigt.
      const avaler = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }
      window.addEventListener('click', avaler, { capture: true, once: true })
      if (finAvaler !== null) window.clearTimeout(finAvaler)
      finAvaler = window.setTimeout(() => {
        window.removeEventListener('click', avaler, { capture: true })
        finAvaler = null
      }, 450)
    }

    const surAppui = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || attente || geste) return
      const zone = derniers.current.zone.current
      const cible = e.target as Element | null
      if (!zone || !cible || !zone.contains(cible)) return
      // ⛔ Seulement depuis un élément de départ. Une commande posée DANS lui (un lien
      // dans une marge) garde son geste ; l'élément de départ, lui, peut être un bouton.
      const elDepart = cible.closest(SELECTEUR_DEPART)
      if (!elDepart || !zone.contains(elDepart)) return
      const commande = cible.closest(NE_NAIT_PAS_SUR)
      if (commande && commande !== elDepart && elDepart.contains(commande)) return
      const depart = { x: e.clientX, y: e.clientY }
      attente = { id: e.pointerId, depart, minuteur: window.setTimeout(ouvrirLeMode, DELAI_APPUI_LONG_MS) }
    }
    const surMouvement = (e: PointerEvent) => {
      if (attente && e.pointerId === attente.id) {
        const dx = e.clientX - attente.depart.x
        const dy = e.clientY - attente.depart.y
        if (Math.hypot(dx, dy) > TOLERANCE_APPUI_PX) annulerAttente()
        return
      }
      if (geste && e.pointerId === geste.id) {
        const point = { x: e.clientX, y: e.clientY }
        poserTrace(geste.depart, point)
        choisir(geste.depart, point)
      }
    }
    const surLacher = (e: PointerEvent) => {
      if (attente && e.pointerId === attente.id) annulerAttente()
      if (geste && e.pointerId === geste.id) finir()
    }
    // ⛔ Non passive : c'est la seule façon d'empêcher le défilement, et SEULEMENT en mode.
    // Posée sur les seuls éléments de départ (voir l'en-tête), rebranchée quand la page
    // en rend de nouveaux.
    const surToucheMouvement = (e: TouchEvent) => { if (geste && e.cancelable) e.preventDefault() }
    const surMenuContextuel = (e: Event) => { if (geste || attente) e.preventDefault() }
    const surDefilement = () => annulerAttente()
    const ecoutes = new Set<Element>()
    const brancherDeparts = () => {
      const zone = derniers.current.zone.current
      for (const el of ecoutes) {
        if (el.isConnected && el.hasAttribute(ATTRIBUT_DEPART_LASSO)) continue
        el.removeEventListener('touchmove', surToucheMouvement as EventListener)
        ecoutes.delete(el)
      }
      if (!zone) return
      for (const el of Array.from(zone.querySelectorAll(SELECTEUR_DEPART))) {
        if (ecoutes.has(el)) continue
        el.addEventListener('touchmove', surToucheMouvement as EventListener, { passive: false })
        ecoutes.add(el)
      }
    }
    brancherDeparts()
    const zoneObservee = derniers.current.zone.current
    const observateur = new MutationObserver(brancherDeparts)
    if (zoneObservee) observateur.observe(zoneObservee, { childList: true, subtree: true, attributes: true, attributeFilter: [ATTRIBUT_DEPART_LASSO] })

    window.addEventListener('pointerdown', surAppui, true)
    window.addEventListener('pointermove', surMouvement, true)
    window.addEventListener('pointerup', surLacher, true)
    window.addEventListener('pointercancel', surLacher, true)
    window.addEventListener('scroll', surDefilement, true)
    document.addEventListener('contextmenu', surMenuContextuel, true)
    return () => {
      annulerAttente()
      if (finAvaler !== null) window.clearTimeout(finAvaler)
      document.documentElement.removeAttribute('data-lasso-geste')
      window.removeEventListener('pointerdown', surAppui, true)
      window.removeEventListener('pointermove', surMouvement, true)
      window.removeEventListener('pointerup', surLacher, true)
      window.removeEventListener('pointercancel', surLacher, true)
      window.removeEventListener('scroll', surDefilement, true)
      document.removeEventListener('contextmenu', surMenuContextuel, true)
      observateur.disconnect()
      for (const el of ecoutes) el.removeEventListener('touchmove', surToucheMouvement as EventListener)
      ecoutes.clear()
    }
  }, [actif])

  const executer = async (action: Action) => {
    const cles = selection
    if (cles.length === 0 || enCours) return
    setEnCours(action)
    setMessage(null)
    try {
      if (action === 'copier') {
        await props.onCopier(cles)
        setMessage({ texte: 'Citation copiée', erreur: false })
      } else {
        const faits = action === 'enregistrer' ? await props.onEnregistrer(cles) : await props.onRetirer(cles)
        if (faits !== null) {
          setMessage({ texte: libelleAction(faits, unite, action === 'enregistrer' ? 'prélevé' : 'retiré'), erreur: false })
        }
      }
    } catch (erreur) {
      console.error('[lasso tactile]', action, erreur)
      setMessage({ texte: action === 'copier' ? 'La copie a échoué.' : 'L’opération a échoué. Réessayez.', erreur: true })
    } finally {
      setEnCours(null)
    }
  }

  if (!actif || (selection.length === 0 && !trace) || typeof document === 'undefined') return null

  const feuille = feuilleDeSurbrillance(
    selection.filter(cleDeLassoValide).map(cle => props.surbrillance(cle)),
    DECLARATION_SURBRILLANCE,
  )
  const nombre = selection.length
  const deja = nombre > 0 ? Math.min(nombre, props.dejaEnregistres(selection)) : 0
  const aPrelever = nombre - deja

  return createPortal(
    <>
      {feuille && <style>{feuille}</style>}
      {trace && <div ref={traceRef} className="cs-lasso-trace" style={{ zIndex: Z_FLOTTANT }} aria-hidden="true" />}
      {nombre > 0 && !trace && (
        <div className="cs-lasso-barre" role="region" aria-label="Passages sélectionnés"
          style={{ zIndex: Z_FLOTTANT, left: '50%', bottom: `calc(${BANDEAU_NAV_MOBILE} + 0.75rem)` }}>
          <span className={'cs-lasso-compte' + (message?.erreur ? ' cs-lasso-compte--erreur' : '')} role="status" aria-live="polite">
            {message ? message.texte : libelleSelection(nombre, unite)}
          </span>
          <span className="cs-lasso-actions">
            {aPrelever > 0 && (
              <button type="button" className="cs-lasso-action cs-lasso-action--principale"
                disabled={enCours !== null} onClick={() => void executer('enregistrer')}
                title={`Ajouter ${aPrelever > 1 ? `ces ${aPrelever} versets` : 'ce verset'} à mes prélèvements`}>
                {enCours === 'enregistrer' ? 'Prélèvement…' : 'Prélever'}
              </button>
            )}
            {deja > 0 && (
              <button type="button" className="cs-lasso-action" disabled={enCours !== null}
                onClick={() => void executer('retirer')} title="Retirer de mes prélèvements">
                {enCours === 'retirer' ? 'Retrait…' : 'Retirer'}
              </button>
            )}
            <button type="button" className="cs-lasso-action" disabled={enCours !== null}
              onClick={() => void executer('copier')} title="Copier la citation">
              Copier
            </button>
            <button type="button" className="cs-lasso-fermer" onClick={() => setSelection([])} aria-label="Défaire la sélection">
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
