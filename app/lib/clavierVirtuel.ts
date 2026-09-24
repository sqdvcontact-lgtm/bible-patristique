/**
 * LE CLAVIER VIRTUEL GREC ET HÉBREU — la règle, sans une ligne de React.
 *
 * Demande de l'auteur, 2026-09-24 : « intégrer un clavier virtuel hébreu et grec pour
 * les commentaires et pour toute zone de rédaction de texte (hors signalements) ».
 *
 * ⛔ UNE ZONE DE RÉDACTION se reconnaît à sa FORME, non à une liste de composants :
 *    un `textarea`, un bloc `contenteditable`, ou un champ d'une ligne qui le demande
 *    (`data-clavier`). Une zone qui ne doit pas le porter le dit (`data-sans-clavier`,
 *    sur elle ou sur un ancêtre) : c'est le cas du signalement, où l'on décrit un défaut
 *    et où l'on ne cite pas.
 * ⚠️ Les dispositions sont celles des claviers physiques (grec moderne, hébreu SI-1452) :
 *    qui en connaît un retrouve ses touches.
 */

/** Une touche : ce qu'elle écrit, et, pour un signe diacritique, son dessin sur le
 *  cercle pointillé qui tient la place de la lettre. */
export type Touche = { valeur: string; majuscule?: string; diacritique?: boolean; nom?: string }

export type Disposition = { cle: 'grec' | 'hebreu'; libelle: string; lang: string; dir: 'ltr' | 'rtl'; rangees: Touche[][] }

const lettres = (chaine: string): Touche[] =>
  [...chaine].map(c => ({ valeur: c, majuscule: c === 'ς' ? 'Σ' : c.toLocaleUpperCase('el') }))

const signe = (valeur: string, nom: string): Touche => ({ valeur, diacritique: true, nom })

export const GREC: Disposition = {
  cle: 'grec',
  libelle: 'Grec',
  lang: 'grc',
  dir: 'ltr',
  rangees: [
    lettres('ςερτυθιοπ'),
    lettres('ασδφγηξκλ'),
    lettres('ζχψωβνμ'),
    [
      signe('\u0301', 'accent aigu'),
      signe('\u0300', 'accent grave'),
      signe('\u0342', 'accent circonflexe'),
      signe('\u0313', 'esprit doux'),
      signe('\u0314', 'esprit rude'),
      signe('\u0345', 'iota souscrit'),
      signe('\u0308', 'tréma'),
      { valeur: '\u00B7', nom: 'point en haut' },
    ],
  ],
}

export const HEBREU: Disposition = {
  cle: 'hebreu',
  libelle: 'Hébreu',
  lang: 'he',
  dir: 'rtl',
  rangees: [
    [...'קראטוןםפ'].map(c => ({ valeur: c })),
    [...'שדגכעיחלךף'].map(c => ({ valeur: c })),
    [...'זסבהנמצתץ'].map(c => ({ valeur: c })),
    [
      signe('\u05B7', 'patah'),
      signe('\u05B8', 'qamats'),
      signe('\u05B6', 'segol'),
      signe('\u05B5', 'tsere'),
      signe('\u05B4', 'hiriq'),
      signe('\u05B9', 'holam'),
      signe('\u05BB', 'qubuts'),
      signe('\u05B0', 'shewa'),
      signe('\u05B2', 'hataf patah'),
      signe('\u05B1', 'hataf segol'),
      signe('\u05B3', 'hataf qamats'),
      signe('\u05BC', 'dagesh'),
      signe('\u05C1', 'point du shin'),
      signe('\u05C2', 'point du sin'),
      { valeur: '\u05BE', nom: 'maqaf' },
    ],
  ],
}

export const DISPOSITIONS = [GREC, HEBREU] as const

/** Le cercle pointillé sur lequel un signe diacritique se dessine. */
export const PORTEUR_DIACRITIQUE = '\u25CC'

/** Ce que la touche montre. */
export function dessinDeLaTouche(t: Touche, majuscules: boolean): string {
  if (t.diacritique) return PORTEUR_DIACRITIQUE + t.valeur
  return majuscules && t.majuscule ? t.majuscule : t.valeur
}

/** Ce que la touche écrit. */
export function valeurDeLaTouche(t: Touche, majuscules: boolean): string {
  return !t.diacritique && majuscules && t.majuscule ? t.majuscule : t.valeur
}

const MARQUE = /\p{M}/u

/**
 * Le début de la GRAPPE qui finit à `fin` : la lettre de base et les signes qui la
 * suivent. C'est elle qu'on recompose (NFC) après qu'un signe s'y est ajouté, pour
 * que « α » + accent aigu s'enregistre « ά » et non en deux caractères.
 * ⚠️ Rend `fin` quand rien ne précède ou que la grappe n'a pas de lettre de base.
 */
export function debutDeGrappe(texte: string, fin: number): number {
  let i = fin
  while (i > 0 && MARQUE.test(texte[i - 1])) i--
  if (i === 0) return fin
  return i - 1
}

/** Le sélecteur des zones de rédaction. */
export const SELECTEUR_ZONE =
  'textarea, [contenteditable=""], [contenteditable="true"], input[data-clavier]'

/** La zone porte-t-elle le clavier ? */
export function porteLeClavier(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (!el.matches(SELECTEUR_ZONE)) return false
  if (el.closest('[data-sans-clavier]')) return false
  if ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && (el.readOnly || el.disabled)) return false
  return true
}
