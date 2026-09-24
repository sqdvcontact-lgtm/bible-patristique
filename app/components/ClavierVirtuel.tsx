'use client'

/**
 * Le CLAVIER VIRTUEL GREC ET HÉBREU, monté une fois pour tout le site (app/layout.tsx).
 *
 * Il ne connaît aucune page : il écoute le foyer, et dès qu'une zone de rédaction le
 * prend (`porteLeClavier`, app/lib/clavierVirtuel.ts), il pose dans son coin une petite
 * pastille « αא ». Elle ouvre, sous la zone, une palette des deux alphabets.
 *
 * ⛔ RIEN NE PREND LE FOYER DANS LA PALETTE À LA SOURIS : le `mousedown` y est empêché,
 *    si bien que la zone garde son curseur et que la lettre s'écrit où l'on écrivait.
 *    Au clavier, la palette se parcourt, et la sélection de la zone est reposée avant
 *    d'écrire.
 * ⛔ L'ÉCRITURE PASSE PAR `insertText` : c'est ce qui la fait entrer dans la pile
 *    d'annulation du navigateur (Ctrl+Z la défait comme une frappe) et ce qui réveille
 *    les gestionnaires `onInput` des éditeurs du site, comme les `onChange` de React.
 * ⚠️ Un signe diacritique se recompose avec sa lettre (NFC) : « α » puis l'accent aigu
 *    s'enregistrent « ά », un seul caractère, comme le reste du corpus.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DISPOSITIONS, type Disposition, type Touche,
  debutDeGrappe, dessinDeLaTouche, porteLeClavier, valeurDeLaTouche,
} from '@/app/lib/clavierVirtuel'
import { Z_MENU_PORTE } from '@/app/lib/empilement'

/** La place de la zone, et ce qu'il faut de la fenêtre pour poser la palette : tout se
 *  mesure ensemble, hors du rendu. */
type Place = { gauche: number; haut: number; largeur: number; bas: number; droite: number; vueLargeur: number; vueHauteur: number; rem: number }

const MARGE = 8

function placeDe(el: HTMLElement): Place {
  const r = el.getBoundingClientRect()
  return {
    gauche: r.left, haut: r.top, largeur: r.width, bas: r.bottom, droite: r.right,
    vueLargeur: document.documentElement.clientWidth,
    vueHauteur: window.innerHeight,
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  }
}

function memePlace(a: Place | null, b: Place): boolean {
  return !!a && a.gauche === b.gauche && a.haut === b.haut && a.largeur === b.largeur && a.bas === b.bas
    && a.vueLargeur === b.vueLargeur && a.vueHauteur === b.vueHauteur && a.rem === b.rem
}

/** Écrit dans la zone, à son curseur. */
function ecrire(zone: HTMLElement, texte: string) {
  const ok = document.execCommand('insertText', false, texte)
  if (ok) return
  if (zone instanceof HTMLTextAreaElement || zone instanceof HTMLInputElement) {
    const debut = zone.selectionStart ?? zone.value.length
    const fin = zone.selectionEnd ?? debut
    zone.setRangeText(texte, debut, fin, 'end')
    zone.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/** Recompose la grappe qui précède le curseur (lettre et signes) en NFC. */
function recomposer(zone: HTMLElement) {
  if (zone instanceof HTMLTextAreaElement || zone instanceof HTMLInputElement) {
    const fin = zone.selectionStart ?? 0
    if (fin !== zone.selectionEnd) return
    const debut = debutDeGrappe(zone.value, fin)
    const grappe = zone.value.slice(debut, fin)
    const nfc = grappe.normalize('NFC')
    if (debut === fin || nfc === grappe) return
    zone.setSelectionRange(debut, fin)
    ecrire(zone, nfc)
    return
  }
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== Node.TEXT_NODE) return
  const noeud = sel.anchorNode as Text
  const fin = sel.anchorOffset
  const debut = debutDeGrappe(noeud.data, fin)
  const grappe = noeud.data.slice(debut, fin)
  const nfc = grappe.normalize('NFC')
  if (debut === fin || nfc === grappe) return
  const r = document.createRange()
  r.setStart(noeud, debut)
  r.setEnd(noeud, fin)
  sel.removeAllRanges()
  sel.addRange(r)
  ecrire(zone, nfc)
}

export default function ClavierVirtuel() {
  const [zone, setZone] = useState<HTMLElement | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [disposition, setDisposition] = useState<Disposition>(DISPOSITIONS[0])
  const [majuscules, setMajuscules] = useState(false)
  const paletteRef = useRef<HTMLDivElement>(null)
  const pastilleRef = useRef<HTMLButtonElement>(null)
  // La sélection d'une zone éditable se perd quand le foyer part au clavier dans la
  // palette : on la garde pour la reposer avant d'écrire.
  const selectionRef = useRef<Range | null>(null)

  // Le foyer : une zone qui le prend porte la pastille ; le perdre pour autre chose que
  // la palette la retire.
  useEffect(() => {
    const entree = (e: FocusEvent) => {
      const cible = e.target as Element | null
      if (porteLeClavier(cible)) { setZone(cible); return }
    }
    const sortie = () => {
      window.setTimeout(() => {
        const actif = document.activeElement
        if (porteLeClavier(actif)) return
        if (actif && (paletteRef.current?.contains(actif) || pastilleRef.current?.contains(actif))) return
        setZone(null)
        setOuvert(false)
      }, 0)
    }
    document.addEventListener('focusin', entree)
    document.addEventListener('focusout', sortie)
    return () => {
      document.removeEventListener('focusin', entree)
      document.removeEventListener('focusout', sortie)
    }
  }, [])

  // La sélection d'une zone éditable, gardée pendant qu'elle a le foyer.
  useEffect(() => {
    if (!zone || zone instanceof HTMLTextAreaElement || zone instanceof HTMLInputElement) return
    const garder = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && zone.contains(sel.anchorNode)) selectionRef.current = sel.getRangeAt(0).cloneRange()
    }
    document.addEventListener('selectionchange', garder)
    return () => document.removeEventListener('selectionchange', garder)
  }, [zone])

  // La place de la zone, suivie au défilement (en capture, pour entendre les défileurs
  // internes), au redimensionnement et quand la zone change de taille.
  useLayoutEffect(() => {
    if (!zone) return
    let image = 0
    const mesurer = () => {
      cancelAnimationFrame(image)
      image = requestAnimationFrame(() => {
        if (!zone.isConnected) { setZone(null); setOuvert(false); return }
        const p = placeDe(zone)
        setPlace(avant => (memePlace(avant, p) ? avant : p))
      })
    }
    // ⚠️ La première mesure passe par l'image suivante, comme les autres : un état posé
    // dans le corps de l'effet ferait un rendu en cascade.
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(zone)
    window.addEventListener('scroll', mesurer, true)
    window.addEventListener('resize', mesurer)
    return () => {
      cancelAnimationFrame(image)
      ro.disconnect()
      window.removeEventListener('scroll', mesurer, true)
      window.removeEventListener('resize', mesurer)
    }
  }, [zone])

  // Échap referme la palette, et rien d'autre : une fenêtre qui porte la zone reste
  // ouverte.
  useEffect(() => {
    if (!ouvert) return
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOuvert(false)
      zone?.focus()
    }
    document.addEventListener('keydown', touche, true)
    return () => document.removeEventListener('keydown', touche, true)
  }, [ouvert, zone])

  const frapper = useCallback((t: Touche) => {
    if (!zone) return
    if (document.activeElement !== zone) {
      zone.focus()
      const r = selectionRef.current
      if (r && !(zone instanceof HTMLTextAreaElement || zone instanceof HTMLInputElement)) {
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
    }
    ecrire(zone, valeurDeLaTouche(t, majuscules))
    if (t.diacritique) recomposer(zone)
    else if (majuscules) setMajuscules(false)
  }, [zone, majuscules])

  if (!zone || !place) return null

  const { vueLargeur, vueHauteur } = place
  const monoligne = zone instanceof HTMLInputElement
  // La pastille se pose DANS le coin bas-droit de la zone (au milieu à droite pour un
  // champ d'une ligne), assez petite pour ne rien masquer qu'on écrit.
  const pastille = {
    left: place.droite - 4,
    top: monoligne ? place.haut + (place.bas - place.haut) / 2 : place.bas - 4,
  }
  const largeurPalette = Math.min(22 * place.rem, vueLargeur - 2 * MARGE)
  const gauchePalette = Math.max(MARGE, Math.min(place.droite - largeurPalette, vueLargeur - largeurPalette - MARGE))
  const placeDessous = vueHauteur - place.bas
  const dessous = placeDessous >= 220 || placeDessous >= place.haut
  const stylePalette: React.CSSProperties = dessous
    ? { top: place.bas + 6, left: gauchePalette, width: largeurPalette, zIndex: Z_MENU_PORTE }
    : { bottom: vueHauteur - place.haut + 6, left: gauchePalette, width: largeurPalette, zIndex: Z_MENU_PORTE }

  return createPortal(
    <>
      <button ref={pastilleRef} type="button" className="cs-clavier-pastille"
        data-ouvert={ouvert ? '' : undefined}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert} aria-controls="cs-clavier-palette"
        aria-label="Clavier grec et hébreu" title="Clavier grec et hébreu"
        style={{ left: pastille.left, top: pastille.top, zIndex: Z_MENU_PORTE, transform: monoligne ? 'translate(-100%, -50%)' : 'translate(-100%, -100%)' }}>
        <span lang="grc">α</span><span lang="he">א</span>
      </button>
      {ouvert && (
        <div ref={paletteRef} id="cs-clavier-palette" role="group" aria-label={`Clavier ${disposition.libelle.toLowerCase()}`}
          className="cs-clavier-palette" style={stylePalette}
          onMouseDownCapture={e => e.preventDefault()}>
          <div className="cs-clavier-tete">
            <div className="cs-clavier-alphabets" role="group" aria-label="Alphabet">
              {DISPOSITIONS.map(d => (
                <button key={d.cle} type="button" aria-pressed={d.cle === disposition.cle}
                  className="cs-clavier-alphabet" onClick={() => { setDisposition(d); setMajuscules(false) }}>
                  {d.libelle}
                </button>
              ))}
            </div>
            {disposition.cle === 'grec' && (
              <button type="button" className="cs-clavier-maj" aria-pressed={majuscules}
                onClick={() => setMajuscules(m => !m)} title="Majuscule">
                Maj
              </button>
            )}
          </div>
          <div className="cs-clavier-rangees" lang={disposition.lang} dir={disposition.dir}>
            {disposition.rangees.map((rangee, i) => (
              <div key={i} className="cs-clavier-rangee" data-signes={i === disposition.rangees.length - 1 ? '' : undefined}>
                {rangee.map(t => (
                  <button key={t.valeur} type="button" className="cs-clavier-touche"
                    title={t.nom} aria-label={t.nom ?? valeurDeLaTouche(t, majuscules)}
                    onClick={() => frapper(t)}>
                    {dessinDeLaTouche(t, majuscules)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
