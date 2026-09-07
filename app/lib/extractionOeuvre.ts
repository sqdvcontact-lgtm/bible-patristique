/**
 * L'EXTRACTION D'UNE ŒUVRE — ce que le lecteur demande, et comment on le demande.
 *
 * Module PUR, partagé par le menu (navigateur) et par la route (serveur) : les options
 * voyagent dans l'adresse, et une seule écriture les lit des deux côtés. ⛔ Ne pas
 * recomposer une chaîne de requête d'extraction ailleurs — c'est ainsi que deux surfaces
 * finissent par ne plus demander la même chose.
 *
 * ⚠️ CE MODULE NE DÉCIDE PAS QUI A LE DROIT D'EXTRAIRE. L'extraction est ouverte à tout
 * lecteur qui peut lire l'œuvre, et rien d'autre : c'est la RLS qui le dit, à la route,
 * comme pour la page de lecture. Le jour où elle se paiera, le verrou se posera dans la
 * route (elle seule connaît la session), jamais ici ni dans le menu — une garde côté
 * navigateur ne garde rien.
 */

/** Les formats offerts. Un seul aujourd'hui ; le champ existe pour que l'adresse n'ait
 *  pas à changer le jour où il y en aura deux. */
export const FORMATS_EXTRACTION = ['docx'] as const
export type FormatExtraction = (typeof FORMATS_EXTRACTION)[number]

/** Ce qu'on fait du texte en langue originale, quand l'œuvre en a un. */
export const REGARDS_EXTRACTION = ['aucun', 'regard', 'suite'] as const
export type RegardExtraction = (typeof REGARDS_EXTRACTION)[number]

export type OptionsExtraction = {
  format: FormatExtraction
  /** L'édition à extraire — un `oeuvre_textes.id_texte`. */
  idTexte: string
  /** `null` : l'œuvre entière. Sinon la seule division de niveau 1 nommée. */
  division: string | null
  original: RegardExtraction
  /** Les notes en bas de page. */
  notes: boolean
  /** L'apparat critique de l'éditeur, en fin de volume. */
  apparat: boolean
  /** Le sommaire, que Word compose à l'ouverture. */
  sommaire: boolean
}

export const OPTIONS_PAR_DEFAUT: OptionsExtraction = {
  format: 'docx',
  idTexte: '',
  division: null,
  original: 'aucun',
  notes: true,
  apparat: false,
  sommaire: true,
}

function dans<T extends string>(valeurs: readonly T[], brut: string | null): T | null {
  return brut !== null && (valeurs as readonly string[]).includes(brut) ? brut as T : null
}

/** L'adresse de l'extraction, telle que le menu la demande et que la route la lit. */
export function adresseExtraction(idOeuvre: string, options: OptionsExtraction): string {
  const parametres = new URLSearchParams()
  parametres.set('format', options.format)
  if (options.idTexte) parametres.set('texte', options.idTexte)
  if (options.division !== null) parametres.set('division', options.division)
  parametres.set('original', options.original)
  parametres.set('notes', options.notes ? '1' : '0')
  parametres.set('apparat', options.apparat ? '1' : '0')
  parametres.set('sommaire', options.sommaire ? '1' : '0')
  return `/api/oeuvre/${encodeURIComponent(idOeuvre)}/extraction?${parametres}`
}

/**
 * Les options telles qu'une adresse les porte.
 *
 * ⚠️ TOLÉRANTE : une valeur inconnue retombe sur le défaut, jamais sur une erreur. Une
 * adresse recopiée à la main ne doit pas rendre un document vide, et il n'y a rien de
 * sensible ici — la seule chose qui décide de ce qu'on rend est la RLS.
 */
export function lireOptionsExtraction(parametres: URLSearchParams): OptionsExtraction {
  const drapeau = (nom: string, defaut: boolean) => {
    const brut = parametres.get(nom)
    return brut === null ? defaut : brut !== '0'
  }
  const division = parametres.get('division')
  return {
    format: dans(FORMATS_EXTRACTION, parametres.get('format')) ?? OPTIONS_PAR_DEFAUT.format,
    idTexte: parametres.get('texte') ?? '',
    division: division !== null && division.trim().length > 0 ? division : null,
    original: dans(REGARDS_EXTRACTION, parametres.get('original')) ?? OPTIONS_PAR_DEFAUT.original,
    notes: drapeau('notes', OPTIONS_PAR_DEFAUT.notes),
    apparat: drapeau('apparat', OPTIONS_PAR_DEFAUT.apparat),
    sommaire: drapeau('sommaire', OPTIONS_PAR_DEFAUT.sommaire),
  }
}

/**
 * Le nom du fichier déposé chez le lecteur.
 *
 * ⚠️ Il n'y a PAS de convention de nommage de fichier sur un système : Windows refuse
 * `\ / : * ? " < > |`, tout le monde refuse la barre oblique, et une apostrophe courbe
 * ou une espace insécable traversent mal un envoi par courriel. On garde donc les
 * lettres, les chiffres, l'espace, le trait d'union et l'apostrophe DROITE, et l'on
 * transcrit le reste. ⛔ Les accents RESTENT : un titre français sans ses accents n'est
 * plus le titre, et tous les systèmes en service les acceptent depuis longtemps.
 */
export function nomDuFichier(titre: string, division: string | null, format: FormatExtraction): string {
  const propre = (texte: string) => texte
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/[^\p{L}\p{N} '-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const base = [propre(titre), division ? propre(division) : ''].filter(Boolean).join(' - ')
  // Un nom de fichier trop long est refusé par certains systèmes ; on coupe au mot.
  const borne = base.length > 90 ? base.slice(0, 90).replace(/\s+\S*$/, '') : base
  return `${borne || 'Corpus Scriptura'}.${format}`
}
