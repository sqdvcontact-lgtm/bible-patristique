/**
 * OUVRIR UNE NOTE BIBLIQUE DANS LE TEXTE — le renvoi de l'inventaire des notes de la page
 * Bible, sur le modèle de celui d'une œuvre (`app/oeuvre/[id]/ouvrirNoteDansLeTexte.ts`).
 *
 * ⛔ ON REJOUE LE GESTE DU LECTEUR, ON NE RECOMPOSE PAS LA FENÊTRE. L'appel reçoit un clic,
 * et la note s'ouvre dans la fenêtre de toujours (`AppelNoteBiblique`) : la mesure, la
 * place dans la marge et la fermeture n'ont pas de seconde écriture.
 *
 * ⚠️ L'APPEL SE RETROUVE PAR SON IDENTIFIANT (`ancreAppelNoteBible`) : `appel-note-bible-<id>`
 * dans une colonne, suffixé du membre en lecture en regard, où une note commune à l'édition
 * est appelée depuis les deux colonnes. On retient le premier qui se voit.
 *
 * ⚠️ UNE NOTE DE BLOC SANS POINT D'APPEL se lit dans l'apparat de son bloc, au pied du
 * développement : elle n'a pas d'appel à cliquer, et c'est son ENTRÉE qu'on pose sous les
 * yeux (`ancreNoteSansAppelBible`). Une note a l'un ou l'autre, jamais les deux.
 *
 * ⚠️ QUAND LA NOTE EST DANS UN AUTRE CHAPITRE, LA DEMANDE GUETTE SA CIBLE. La page y va par
 * une navigation, et la demande attend qu'elle paraisse, sans dépendre du volet qui l'a
 * lancée : sur un téléphone, il se referme pour montrer le texte. Un second clic fait taire
 * la demande précédente.
 *
 * ⚠️ ET ON N'OUVRE QU'UNE FOIS LE TEXTE IMMOBILE : l'arrivée d'un chapitre fait paraître ses
 * blocs par une translation, et la fenêtre, posée en position fixe, garderait la place
 * qu'elle a mesurée pendant le passage.
 *
 * Les décisions sont PURES et testées ; le reste touche le document.
 */
import { animationsBornees, decalageVersLesYeux } from '@/app/oeuvre/[id]/ouvrirNoteDansLeTexte'
import { ancreNoteSansAppelBible } from './ancresNotesBible'
import { ancreAppelNoteBible } from './bibleEdition'
import { hauteurNavbarPx } from './fenetreContextuelle'

/** Au-delà, on ouvre même si une animation court encore. */
const ATTENTE_PASSAGES_MS = 1500

const PAS_DU_GUET_MS = 120

/**
 * Le décalage qui pose une cible au NIVEAU DES YEUX dans une BANDE de défilement, ou zéro
 * si elle y est déjà bien placée.
 *
 * ⛔ LA RÈGLE EST CELLE DE L'ŒUVRE (`decalageVersLesYeux`), rapportée à la bande : la page
 * Bible défile dans un bloc interne, sous l'en-tête du chapitre, et non dans la fenêtre.
 * Une seconde écriture du « tiers de la vue » divergerait au premier réglage.
 * ⚠️ `reserve` est ce qui couvre le haut de la bande — la barre de navigation, quand la
 * bande est la fenêtre elle-même.
 */
export function decalageDansLaBande(
  cible: { top: number; bottom: number },
  bande: { haut: number; bas: number; reserve?: number },
): number {
  return decalageVersLesYeux(
    { top: cible.top - bande.haut, bottom: cible.bottom - bande.haut },
    bande.bas - bande.haut,
    bande.reserve ?? 0,
  )
}

/** Les appels d'une note : celui d'une colonne, et ceux de la lecture en regard. */
export function selecteurAppelsNoteBible(noteId: string): string {
  const base = ancreAppelNoteBible(noteId)
  return `[id="${base}"], [id^="${base}-"]`
}

export { ancreNoteSansAppelBible }

/** La rangée d'un verset, en une colonne (`verset-N`) comme en regard (`data-canon-id`).
 *  ⚠️ Rien de ce qui n'a pas la forme d'un créneau n'entre dans un sélecteur. */
export function selecteurVersetBible(canonId: string | null): string | null {
  if (!canonId || !/^[0-9A-Z]{3}\.\d+\.\d+$/.test(canonId)) return null
  return `[data-canon-id="${canonId}"], #verset-${canonId.split('.')[2]}`
}

// ── Le document ──────────────────────────────────────────────────────────────

let demandeCourante = 0

function premierVisible(selecteur: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(selecteur)].find(el => el.getClientRects().length > 0) ?? null
}

function defileurDe(el: HTMLElement): HTMLElement | null {
  for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent
  }
  return null
}

function poserAuNiveauDesYeux(el: HTMLElement) {
  const defileur = defileurDe(el)
  const bande = defileur
    ? (() => {
        const haut = defileur.getBoundingClientRect().top + defileur.clientTop
        return { haut, bas: haut + defileur.clientHeight }
      })()
    : { haut: 0, bas: window.innerHeight, reserve: hauteurNavbarPx() }
  const decalage = decalageDansLaBande(el.getBoundingClientRect(), bande)
  if (decalage === 0) return
  // ⚠️ Instantané : un glissement ferait mesurer la cible à mi-course.
  if (defileur) defileur.scrollTop += decalage
  else window.scrollBy(0, decalage)
}

async function apresLesPassages(): Promise<void> {
  if (typeof document.body.getAnimations !== 'function') return
  const enCours = animationsBornees(document.body.getAnimations({ subtree: true }))
  if (enCours.length === 0) return
  await Promise.race([
    Promise.all(enCours.map(a => a.finished.catch(() => undefined))),
    new Promise(resoudre => window.setTimeout(resoudre, ATTENTE_PASSAGES_MS)),
  ])
}

/**
 * Pose la note sous les yeux, puis ouvre son appel, une fois le texte immobile.
 *
 * Sans appel ni entrée dans la page au bout de `attendreMs`, on pose au moins son verset
 * sous les yeux.
 */
export function ouvrirNoteBible({ noteId, canonId, attendreMs }: {
  noteId: string
  canonId: string | null
  attendreMs: number
}): void {
  if (typeof document === 'undefined') return
  const jeton = ++demandeCourante
  const debut = Date.now()
  const selecteurAppel = selecteurAppelsNoteBible(noteId)
  const selecteurEntree = `[id="${ancreNoteSansAppelBible(noteId)}"]`

  const poser = async (cible: HTMLElement, selecteur: string, ouvrir: boolean) => {
    // Tout de suite, pour qu'il n'y ait qu'un saut à l'écran ; on corrige après le passage.
    poserAuNiveauDesYeux(cible)
    await apresLesPassages()
    if (jeton !== demandeCourante) return
    // ⚠️ On la RETROUVE : le rendu qui a suivi le saut a pu remplacer le nœud.
    const presente = premierVisible(selecteur)
    if (!presente) return
    poserAuNiveauDesYeux(presente)
    // ⛔ Un appel déjà ouvert ne reçoit pas de clic : ce clic le refermerait.
    if (ouvrir && presente.getAttribute('aria-expanded') !== 'true') presente.click()
  }

  const guetter = () => {
    if (jeton !== demandeCourante) return
    const appel = premierVisible(selecteurAppel)
    if (appel) { void poser(appel, selecteurAppel, true); return }
    const entree = premierVisible(selecteurEntree)
    if (entree) { void poser(entree, selecteurEntree, false); return }
    if (Date.now() - debut < attendreMs) { window.setTimeout(guetter, PAS_DU_GUET_MS); return }
    const selecteurVerset = selecteurVersetBible(canonId)
    const verset = selecteurVerset ? premierVisible(selecteurVerset) : null
    if (verset) poserAuNiveauDesYeux(verset)
  }

  guetter()
}
