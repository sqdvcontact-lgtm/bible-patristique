/**
 * OUVRIR UNE NOTE DANS LE TEXTE — le renvoi de l'inventaire des notes.
 *
 * Demande de l'auteur (2026-09-11) : « quand je clique, dans le volet de droite, sur
 * une note dans “Notes”, j'aimerais qu'elle s'ouvre ». Le clic menait au passage et
 * s'arrêtait là : il fallait encore trouver l'appel dans la ligne, puis le cliquer.
 *
 * ⛔ ON REJOUE LE GESTE DU LECTEUR, ON NE RECOMPOSE PAS L'ENCART. Un appel ouvre sa note
 * d'un clic, épinglée, et c'est ce clic qu'on lui donne : la mesure, la place dans la
 * marge, la croix et la fermeture (Échap, clic dehors) sont celles de toujours, sans une
 * seconde écriture qui divergerait au premier réglage.
 *
 * ⚠️ ON N'OUVRE QU'UNE FOIS LE TEXTE IMMOBILE. Un changement de division fait paraître
 * les blocs par une translation de six pixels (`cs-lecture-paraitre`), et l'encart,
 * posé en position fixe, garderait la place qu'il a mesurée pendant le passage. C'est
 * la règle de la manchette des renvois, prise par un autre bout.
 *
 * ⚠️ UNE NOTE RENDUE EN MANCHETTE N'A PAS D'APPEL : son texte est déjà dans la marge.
 * On pose alors le segment au niveau des yeux, comme avant, et c'est tout.
 *
 * Les trois règles de décision sont PURES et testées ; le reste touche le document.
 */
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'

/** L'attribut par lequel un appel dit quelle note il ouvre. Posé par `AppelNote`. */
export const ATTRIBUT_CLE_NOTE = 'data-note-cle'

/** Au-delà, on ouvre même si une animation court encore : mieux vaut un encart posé à
 *  quelques pixels près qu'une note qui ne s'ouvre pas. */
const ATTENTE_MAX_MS = 1500

/** Le blanc gardé sous la barre de navigation. */
const MARGE_SOUS_BARRE = 16

/** Sous cette part de la fenêtre, un appel est trop bas : sa note ne tiendrait pas à
 *  côté de lui, et l'encart remonterait loin de sa ligne. */
const PART_BASSE = 0.6

type AnimationBornable = {
  effect: { getComputedTiming(): { endTime?: unknown } } | null
  finished: Promise<unknown>
}

/** Les animations qui FINISSENT. Un anneau d'attente tourne sans fin : l'attendre
 *  retiendrait l'ouverture pour toujours. */
export function animationsBornees<T extends AnimationBornable>(animations: readonly T[]): T[] {
  return animations.filter(a => {
    const fin = a.effect?.getComputedTiming().endTime
    return typeof fin === 'number' && Number.isFinite(fin)
  })
}

/**
 * Le décalage qui pose un appel au NIVEAU DES YEUX — son sommet au tiers de la
 * fenêtre, la règle de `scrollNiveauDesYeux` —, ou zéro s'il est déjà bien placé :
 * sous la barre, et au-dessus des trois cinquièmes de la fenêtre.
 *
 * ⛔ C'est l'APPEL qu'on vise, non le début du segment : un long paragraphe laisserait
 * son appel sous le pli, et l'encart se poserait loin de sa ligne.
 */
export function decalageVersLesYeux(
  rect: { top: number; bottom: number },
  hauteurVue: number,
  hautNavbar: number,
): number {
  const haut = hautNavbar + MARGE_SOUS_BARRE
  if (rect.top >= haut && rect.bottom <= hauteurVue * PART_BASSE) return 0
  // ⚠️ Jamais sous la barre, même dans une fenêtre basse où le tiers y tomberait.
  return Math.round(rect.top - Math.max(hauteurVue / 3, haut))
}

/** L'appel à ouvrir : celui que porte le segment visé d'abord — une note ancrée deux
 *  fois a deux appels —, à défaut le premier de la page, car l'appel d'un TITRE n'est
 *  pas dans son segment. */
export function choisirAppel<T>(candidats: readonly T[], estDansLeSegment: (candidat: T) => boolean): T | null {
  return candidats.find(estDansLeSegment) ?? candidats[0] ?? null
}

// ── Le document ──────────────────────────────────────────────────────────────

/** Chaque demande porte un numéro : un second clic dans l'inventaire, avant que la
 *  première note soit ouverte, fait taire la précédente. */
let demandeCourante = 0

function trouverAppel(cle: string, idSegment: string): HTMLElement | null {
  const segment = document.getElementById(idSegment)
  const candidats = [...document.querySelectorAll<HTMLElement>(`[${ATTRIBUT_CLE_NOTE}]`)]
    .filter(el => el.getAttribute(ATTRIBUT_CLE_NOTE) === cle)
  return choisirAppel(candidats, el => Boolean(segment?.contains(el)))
}

function poserAuNiveauDesYeux(appel: HTMLElement) {
  const decalage = decalageVersLesYeux(appel.getBoundingClientRect(), window.innerHeight, hauteurNavbarPx())
  // ⚠️ Instantané : la feuille ne pose aucun `scroll-behavior`, et un glissement ferait
  // mesurer l'appel à mi-course.
  if (decalage !== 0) window.scrollBy(0, decalage)
}

async function apresLesPassages(racine: Element): Promise<void> {
  if (typeof racine.getAnimations !== 'function') return
  const enCours = animationsBornees(racine.getAnimations({ subtree: true }))
  if (enCours.length === 0) return
  await Promise.race([
    Promise.all(enCours.map(a => a.finished.catch(() => undefined))),
    new Promise(resoudre => window.setTimeout(resoudre, ATTENTE_MAX_MS)),
  ])
}

/**
 * Pose l'appel de la note au niveau des yeux, puis l'ouvre, une fois le texte immobile.
 * Sans appel dans la page, `repli` vise le segment, comme le faisait l'inventaire.
 */
export function ouvrirLaNoteDansLeTexte({ cle, idSegment, repli }: {
  cle: string
  /** L'identifiant DOM du segment qui porte l'ancre (`segment-<id>`). */
  idSegment: string
  repli: () => void
}): void {
  if (typeof document === 'undefined') return
  const jeton = ++demandeCourante
  const appel = trouverAppel(cle, idSegment)
  if (!appel) { repli(); return }
  // Tout de suite, pour qu'il n'y ait qu'un saut à l'écran ; on corrige après le passage.
  poserAuNiveauDesYeux(appel)
  const racine = document.getElementById(idSegment)?.closest('main') ?? document.body
  void apresLesPassages(racine).then(() => {
    if (jeton !== demandeCourante) return
    // ⚠️ On le RETROUVE : le rendu qui a suivi le saut a pu remplacer le nœud, et un
    // renvoi a pu partir en manchette entre-temps.
    const present = trouverAppel(cle, idSegment)
    if (!present) { repli(); return }
    poserAuNiveauDesYeux(present)
    // ⛔ Un appel déjà ouvert ne reçoit pas de clic : ce clic le refermerait.
    if (present.getAttribute('aria-expanded') !== 'true') present.click()
  })
}
