/**
 * LE COMPOSEUR `.docx` — modèle de document, feuille de styles, empaquetage.
 *
 * ⛔ CE FICHIER N'EST PAS UNE PAGE WEB, et les conventions du site n'y valent pas —
 * même avertissement que `EssaiPDF.tsx`, pour une raison voisine : Word ne connaît ni
 * `rem`, ni `var(--cs-…)`, ni feuille en cascade. Ici, des VINGTIÈMES DE POINT
 * (« twips », 1 440 par pouce, 567 par centimètre) pour les mesures, des DEMI-POINTS
 * pour les corps, et des hexadécimaux littéraux pour les teintes. ⛔ Exclure ce
 * dossier de toute passe de bascule sur `app/`.
 *
 * ── CE QUE « PROPRE » VEUT DIRE ICI ──────────────────────────────────────────────
 *
 * Un `.docx` propre n'est pas un document dont chaque paragraphe porte sa mise en
 * forme : c'est un document dont chaque paragraphe porte un STYLE NOMMÉ, et dont la
 * mise en forme vit dans la feuille. C'est à cette condition que le lecteur peut tout
 * recomposer d'un geste — changer la police du corps, le corps des titres, l'interligne
 * — au lieu de reprendre trois mille paragraphes un par un.
 *
 * ⛔ D'où la règle de ce module : AUCUNE mise en forme directe sur un paragraphe, sauf
 * ce qu'un style ne peut pas porter parce qu'il varie d'un paragraphe à l'autre — le
 * retrait d'un vers, qui dépend de son rang d'alinéa. Tout le reste est dans `STYLES`.
 *
 * ⚠️ Les styles de TITRE portent les noms INTÉGRÉS de Word (`heading 1`, `Title`,
 * `Quote`, `footnote text`…), et non des noms à nous. C'est ce qui fait qu'ils
 * paraissent traduits dans la galerie (« Titre 1 »), que le volet de navigation les
 * reconnaît, et que le sommaire automatique les ramasse. Un style maison porte, lui,
 * `w:customStyle="1"` et un nom français.
 *
 * ── LA POLICE ────────────────────────────────────────────────────────────────────
 *
 * Cambria pour le corps, Calibri pour la langue originale mise en regard (la règle de
 * la maison : « sérif toujours, sauf l'original en regard »). ⚠️ Un `.docx` ne connaît
 * PAS les piles de polices : un seul nom par style, et le lecteur substitue s'il ne
 * l'a pas. Cambria et Calibri accompagnent Word depuis 2007 et ont des équivalents
 * métriques libres (Caladea, Carlito) que LibreOffice installe : c'est le choix qui
 * rend le même document au plus grand nombre. ⛔ Pas de police EMBARQUÉE : Word exige
 * qu'elle soit brouillée selon un algorithme propre, et le fichier grossirait de
 * plusieurs mégaoctets — pour une fonction qui n'a que dix mégaoctets de marge.
 */

import { construireZip, type FichierZip } from './zip'
import type { MarquesTexte } from '@/app/lib/texteEnrichiTokens'

// ── Mesures ───────────────────────────────────────────────────────────────────
/** Un centimètre en vingtièmes de point. */
export const CM = 567
/** A4 : 21 × 29,7 cm. */
const PAGE_LARGEUR = 11906
const PAGE_HAUTEUR = 16838
/** Marges. Les 3,3 cm latéraux laissent une justification de 14,4 cm — quelque
 *  soixante-dix signes par ligne à 11 points, la mesure d'un livre. */
const MARGE_LATERALE = Math.round(3.3 * CM)
const MARGE_HAUT = Math.round(2.5 * CM)
const MARGE_BAS = Math.round(2.6 * CM)

/** La mesure utile : ce qui reste de la page une fois ses deux marges prises. */
const MESURE_UTILE = PAGE_LARGEUR - 2 * MARGE_LATERALE

/**
 * Le retrait de l'EXERGUE : le QUART de la mesure, comme à l'écran
 * (`PART_RETRAIT_EXERGUE`, `compositionExergue.ts`), soit 3,6 cm sur les 14,4 du livre.
 *
 * ⚠️ La règle de l'écran porte en plus une mesure minimale, qui n'a pas de sens ici :
 * une page A4 ne se rétrécit pas sous la main du lecteur.
 */
const RETRAIT_EXERGUE_DOCX = Math.round(MESURE_UTILE / 4)

/** Le blanc qui COUD l'exergue à sa traduction. Le blanc qui FERME le bloc se pose au
 *  paragraphe (`espaceApres`) : un style ne sait pas ce qui vient après lui. */
const COUTURE_EXERGUE_DOCX = Math.round(0.2 * CM)

/** Le blanc qui ouvre le texte après le dernier exergue. */
export const SEUIL_EXERGUE_DOCX = Math.round(0.55 * CM)

/** Le pas d'alinéa d'un vers, en twips (voir `compositionVers.ts`, qui compte en rem). */
export const PAS_ALINEA_VERS = Math.round(0.5 * CM)

// ── Le modèle de document ─────────────────────────────────────────────────────

/** Un morceau de paragraphe : du texte marqué, un appel de note, ou un saut de ligne. */
export type MorceauDocx =
  | (MarquesTexte & { texte: string })
  | { note: ParagrapheDocx[] }
  | { sautDeLigne: true }

export type ParagrapheDocx = {
  /** L'identifiant d'un style de `STYLES`. */
  style: StyleDocx
  morceaux: MorceauDocx[]
  /** Retrait gauche SUPPLÉMENTAIRE, en twips. Réservé aux rangs d'alinéa des vers :
   *  c'est la seule mesure qui varie d'un paragraphe à l'autre dans un même style. */
  retraitGauche?: number
  /** Blanc AVANT le paragraphe, en twips. Réservé à la strophe, qui s'ouvre là où la
   *  source le dit et nulle part ailleurs — donc au paragraphe, jamais au style. */
  espaceAvant?: number
  /** Blanc APRÈS le paragraphe, en twips. Réservé à l'exergue qui FERME son bloc :
   *  le blanc qui le suit ne vaut pas celui qui le coud à sa traduction, et un style
   *  de paragraphe ne sait pas ce qui vient après lui. */
  espaceApres?: number
  /** Ouvre une page. Les titres de niveau 1 le portent par leur style ; ce drapeau
   *  sert au frontispice et aux pièces qui ne sont pas des divisions. */
  sautDePage?: boolean
}

export type BlocDocx =
  | ({ type: 'paragraphe' } & ParagrapheDocx)
  /** Deux colonnes en regard : un tableau sans filets, une ligne par groupe aligné. */
  | { type: 'regard'; lignes: { gauche: ParagrapheDocx[]; droite: ParagrapheDocx[] }[] }
  /** Le champ SOMMAIRE. Word le remplit à l'ouverture (`updateFields`). */
  | { type: 'sommaire'; profondeur: number }

export type DocumentDocx = {
  /** Ce qui entre dans les propriétés du fichier et dans la fenêtre de Word. */
  titre: string
  auteur: string
  description: string
  /** Horodatage ISO des propriétés. Passé en clair pour rester testable. */
  dateIso: string
  blocs: BlocDocx[]
}

// ── La feuille de styles ──────────────────────────────────────────────────────

export type StyleDocx =
  | 'Normal' | 'Corpsdetexte' | 'Corpsdetextesansalinea'
  | 'Titre1' | 'Titre2' | 'Titre3' | 'Titre4'
  | 'Titresommaire' | 'Titre' | 'Soustitre' | 'Chapeau'
  | 'Citation' | 'Versetbiblique' | 'Vers' | 'Rubrique' | 'Signature' | 'Exergue'
  | 'Texteoriginal' | 'Frontispiceauteur' | 'Frontispicemention' | 'Colophon'
  | 'Notedebasdepage' | 'Pieddepage'

/** La teinte des mentions secondaires — chapeaux, colophon, mention d'édition.
 *  ⚠️ Un hexadécimal littéral : Word ne résout aucun jeton (voir l'en-tête). */
const GRIS = '5F574B'
const ENCRE = '1A1714'

type DefinitionStyle = {
  id: string
  /** Le nom INTÉGRÉ de Word, ou le nom français d'un style maison. */
  nom: string
  /** Vrai pour un style maison : Word ne cherche alors pas à le reconnaître. */
  maison?: boolean
  type?: 'paragraph' | 'character'
  basedOn?: string
  next?: string
  /** Rang de galerie ; `qFormat` met le style dans la galerie rapide. */
  priorite?: number
  galerie?: boolean
  pPr?: string
  rPr?: string
}

/** Les propriétés de paragraphe et de course, écrites une fois pour toutes. */
const STYLES: DefinitionStyle[] = [
  {
    id: 'Normal', nom: 'Normal', galerie: true,
    pPr: '<w:spacing w:after="0" w:line="264" w:lineRule="auto"/><w:widowControl/>',
  },
  {
    // Le corps d'un texte suivi : justifié, alinéa de première ligne, aucun blanc
    // entre paragraphes. C'est la composition du LIVRE, et non celle de l'écran :
    // le site sépare ses paragraphes par un blanc parce qu'un écran se parcourt,
    // un imprimé se lit d'un trait et l'alinéa suffit à dire qu'on change de
    // paragraphe. Mêler les deux — blanc ET alinéa — est la faute classique.
    id: 'Corpsdetexte', nom: 'Body Text', basedOn: 'Normal', next: 'Corpsdetexte',
    priorite: 1, galerie: true,
    pPr: `<w:ind w:firstLine="${Math.round(0.7 * CM)}"/><w:jc w:val="both"/>`,
  },
  {
    // Le premier paragraphe d'une division ne prend pas l'alinéa : rien ne le précède
    // dont il faudrait le distinguer.
    id: 'Corpsdetextesansalinea', nom: 'Corps de texte sans alinéa', maison: true,
    basedOn: 'Corpsdetexte', next: 'Corpsdetexte', priorite: 2, galerie: true,
    pPr: '<w:ind w:firstLine="0"/>',
  },
  {
    id: 'Titre1', nom: 'heading 1', basedOn: 'Normal', next: 'Corpsdetextesansalinea',
    priorite: 9, galerie: true,
    pPr: `<w:pageBreakBefore/><w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="${Math.round(0.9 * CM)}"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/>`,
    rPr: `<w:smallCaps/><w:spacing w:val="30"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:color w:val="${ENCRE}"/>`,
  },
  {
    id: 'Titre2', nom: 'heading 2', basedOn: 'Normal', next: 'Corpsdetextesansalinea',
    priorite: 9, galerie: true,
    pPr: `<w:keepNext/><w:keepLines/><w:spacing w:before="${Math.round(0.8 * CM)}" w:after="${Math.round(0.3 * CM)}"/><w:jc w:val="center"/><w:outlineLvl w:val="1"/>`,
    rPr: `<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="${ENCRE}"/>`,
  },
  {
    id: 'Titre3', nom: 'heading 3', basedOn: 'Normal', next: 'Corpsdetextesansalinea',
    priorite: 9, galerie: true,
    pPr: `<w:keepNext/><w:keepLines/><w:spacing w:before="${Math.round(0.55 * CM)}" w:after="${Math.round(0.2 * CM)}"/><w:outlineLvl w:val="2"/>`,
    rPr: `<w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="${ENCRE}"/>`,
  },
  {
    id: 'Titre4', nom: 'heading 4', basedOn: 'Normal', next: 'Corpsdetextesansalinea',
    priorite: 9, galerie: true,
    pPr: `<w:keepNext/><w:keepLines/><w:spacing w:before="${Math.round(0.4 * CM)}" w:after="${Math.round(0.15 * CM)}"/><w:outlineLvl w:val="3"/>`,
    rPr: `<w:i/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="${ENCRE}"/>`,
  },
  {
    // ⛔ LE TITRE DU SOMMAIRE NE FIGURE PAS DANS LE SOMMAIRE. Il se compose comme un
    // titre de niveau 1, mais son rang de plan vaut 9 : la table des matières ne
    // ramasse que les rangs 1 à 3, et sans cela elle s'annoncerait elle-même en
    // première ligne. C'est l'office du style intégré « TOC Heading ».
    id: 'Titresommaire', nom: 'TOC Heading', basedOn: 'Titre1', next: 'Normal', priorite: 39,
    pPr: '<w:outlineLvl w:val="9"/>',
  },
  {
    id: 'Titre', nom: 'Title', basedOn: 'Normal', next: 'Normal', priorite: 10, galerie: true,
    pPr: `<w:keepNext/><w:spacing w:before="0" w:after="${Math.round(0.5 * CM)}"/><w:jc w:val="center"/><w:contextualSpacing/>`,
    rPr: `<w:smallCaps/><w:spacing w:val="40"/><w:sz w:val="52"/><w:szCs w:val="52"/><w:color w:val="${ENCRE}"/>`,
  },
  {
    id: 'Soustitre', nom: 'Subtitle', basedOn: 'Normal', next: 'Normal', priorite: 11, galerie: true,
    pPr: `<w:spacing w:after="${Math.round(0.4 * CM)}"/><w:jc w:val="center"/>`,
    rPr: `<w:i/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="${GRIS}"/>`,
  },
  {
    // Le COMPLÉMENT d'un titre (`ref_nivN_texte`) : la référence scripturaire d'une
    // question, l'intitulé d'un chapitre. Il se compose comme son titre le voudrait —
    // centré sous lui, en italique et d'un corps plus petit (charte, « Un SOUS-TITRE
    // se compose comme SON titre »).
    id: 'Chapeau', nom: 'Chapeau de titre', maison: true, basedOn: 'Normal',
    next: 'Corpsdetextesansalinea', priorite: 12, galerie: true,
    pPr: `<w:keepNext/><w:spacing w:before="0" w:after="${Math.round(0.5 * CM)}"/><w:jc w:val="center"/>`,
    rPr: `<w:i/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="${GRIS}"/>`,
  },
  {
    // La citation SORTIE du texte : corps réduit, rentrée des deux côtés, ni
    // guillemets ni filet — « une citation détachée se dit par son retrait, pas par
    // un ornement » (charte § 3.8).
    id: 'Citation', nom: 'Quote', basedOn: 'Normal', next: 'Corpsdetexte',
    priorite: 20, galerie: true,
    pPr: `<w:spacing w:before="${Math.round(0.35 * CM)}" w:after="${Math.round(0.35 * CM)}"/><w:ind w:left="${Math.round(0.8 * CM)}" w:right="${Math.round(0.8 * CM)}" w:firstLine="0"/><w:jc w:val="both"/>`,
    rPr: '<w:sz w:val="21"/><w:szCs w:val="21"/>',
  },
  {
    // La citation biblique DÉCOUPÉE EN VERSETS : le style de la citation sortie, mais
    // rentrée à GAUCHE seulement, et un léger blanc au lieu du blanc de paragraphe —
    // on lit un passage continu, non une suite de sujets (charte, nature `verset`).
    id: 'Versetbiblique', nom: 'Verset biblique', maison: true, basedOn: 'Citation',
    next: 'Versetbiblique', priorite: 21, galerie: true,
    pPr: `<w:spacing w:before="0" w:after="${Math.round(0.12 * CM)}"/><w:ind w:left="${Math.round(0.8 * CM)}" w:right="0" w:firstLine="0"/><w:contextualSpacing w:val="0"/>`,
  },
  {
    // Un vers : rentré par rapport à la prose, jamais justifié, et un vers trop long
    // pour la ligne repart en retrait au lieu de se confondre avec le suivant
    // (`RETRAIT_SUITE`, compositionVers.ts) — d'où le retrait négatif de première ligne.
    id: 'Vers', nom: 'Vers', maison: true, basedOn: 'Normal', next: 'Vers',
    priorite: 22, galerie: true,
    pPr: `<w:spacing w:after="0"/><w:ind w:left="${Math.round(1.4 * CM)}" w:hanging="${Math.round(0.6 * CM)}"/><w:jc w:val="left"/><w:contextualSpacing/>`,
  },
  {
    id: 'Rubrique', nom: 'Rubrique', maison: true, basedOn: 'Normal',
    next: 'Corpsdetextesansalinea', priorite: 23, galerie: true,
    pPr: `<w:keepNext/><w:spacing w:before="${Math.round(0.4 * CM)}" w:after="${Math.round(0.25 * CM)}"/><w:jc w:val="center"/>`,
    rPr: `<w:smallCaps/><w:spacing w:val="20"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="${GRIS}"/>`,
  },
  {
    // L'EXERGUE : le verset posé en seuil d'une pièce, et sa traduction. Il prend de la
    // citation sortie son corps réduit et sa justification, et il en change le retrait :
    // le QUART de la mesure à gauche, rien à droite. ⛔ Deux marges enfermeraient un
    // bloc qui doit au contraire s'appuyer sur celle de la prose qu'il ouvre.
    // ⚠️ Son blanc de sortie est celui qui le COUD à sa traduction ; celui qui ouvre le
    // texte après lui se pose au paragraphe (`espaceApres`), un style ne sachant pas ce
    // qui vient après lui.
    id: 'Exergue', nom: 'Exergue', maison: true, basedOn: 'Citation',
    next: 'Exergue', priorite: 26, galerie: true,
    pPr: `<w:spacing w:before="0" w:after="${COUTURE_EXERGUE_DOCX}"/><w:ind w:left="${RETRAIT_EXERGUE_DOCX}" w:right="0" w:firstLine="0"/><w:jc w:val="both"/>`,
  },
  {
    id: 'Signature', nom: 'Signature', maison: true, basedOn: 'Normal', next: 'Normal',
    priorite: 24, galerie: true,
    pPr: `<w:spacing w:before="${Math.round(0.4 * CM)}" w:after="${Math.round(0.4 * CM)}"/><w:ind w:firstLine="0"/><w:jc w:val="right"/>`,
    rPr: '<w:i/>',
  },
  {
    // La langue originale mise EN REGARD passe en sans-sérif : la différence de face
    // distingue les deux colonnes d'un coup d'œil, mieux qu'un filet (charte, « Police
    // des textes d'œuvre »).
    id: 'Texteoriginal', nom: 'Texte original', maison: true, basedOn: 'Normal',
    next: 'Texteoriginal', priorite: 25, galerie: true,
    pPr: '<w:jc w:val="both"/><w:ind w:firstLine="0"/>',
    rPr: '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/>',
  },
  {
    id: 'Frontispiceauteur', nom: 'Frontispice — auteur', maison: true, basedOn: 'Normal',
    next: 'Normal', priorite: 30,
    pPr: `<w:spacing w:before="${Math.round(3 * CM)}" w:after="${Math.round(1.2 * CM)}"/><w:jc w:val="center"/>`,
    rPr: `<w:smallCaps/><w:spacing w:val="60"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="${GRIS}"/>`,
  },
  {
    id: 'Frontispicemention', nom: 'Frontispice — mention', maison: true, basedOn: 'Normal',
    next: 'Normal', priorite: 31,
    pPr: `<w:spacing w:before="0" w:after="${Math.round(0.25 * CM)}"/><w:jc w:val="center"/>`,
    rPr: `<w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="${GRIS}"/>`,
  },
  {
    id: 'Colophon', nom: 'Colophon', maison: true, basedOn: 'Normal', next: 'Normal',
    priorite: 32,
    pPr: `<w:spacing w:before="${Math.round(0.3 * CM)}" w:after="0"/><w:jc w:val="center"/>`,
    rPr: `<w:i/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="${GRIS}"/>`,
  },
  {
    id: 'Notedebasdepage', nom: 'footnote text', basedOn: 'Normal', next: 'Notedebasdepage',
    priorite: 99,
    pPr: '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/>',
    rPr: '<w:sz w:val="18"/><w:szCs w:val="18"/>',
  },
  {
    id: 'Pieddepage', nom: 'footer', basedOn: 'Normal', next: 'Pieddepage', priorite: 99,
    pPr: '<w:spacing w:after="0"/><w:jc w:val="center"/>',
    rPr: `<w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="${GRIS}"/>`,
  },
]

/** Les deux styles de COURSE. ⛔ L'appel de note est toujours en ROMAIN, quoi que
 *  fasse le texte qui le porte (règle d'auteur, charte § 13.7) : d'où `w:i w:val="0"`,
 *  qui redresse l'italique d'une citation ou d'un chapeau. */
const STYLES_COURSE: DefinitionStyle[] = [
  {
    id: 'Appeldenotedebasdepage', nom: 'footnote reference', type: 'character', priorite: 99,
    rPr: '<w:i w:val="0"/><w:vertAlign w:val="superscript"/>',
  },
  {
    id: 'Lienhypertexte', nom: 'Hyperlink', type: 'character', priorite: 99,
    rPr: '<w:color w:val="3D6B4F"/><w:u w:val="single"/>',
  },
]

// ── Échappement ───────────────────────────────────────────────────────────────

/**
 * Le texte d'un `w:t`.
 *
 * ⛔ Les caractères de commande C0 sont RETIRÉS, pas échappés : XML 1.0 les interdit
 * jusque dans une référence numérique, et un seul suffit à rendre le document
 * illisible — Word annonce alors « contenu illisible » sans dire où. La tabulation, le
 * saut de ligne et le retour chariot sont les trois seuls admis, et ce module les
 * traite ailleurs (`sautDeLigne`). Le corpus, océrisé, en a déjà porté.
 */
export function echapperXml(texte: string): string {
  return texte
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ENTETE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

// ── Composition des courses ───────────────────────────────────────────────────

/** Les propriétés d'une course, dans l'ordre où le schéma les attend. */
function proprietesCourse(marques: MarquesTexte, styleCourse?: string): string {
  const parties: string[] = []
  if (styleCourse) parties.push(`<w:rStyle w:val="${styleCourse}"/>`)
  if (marques.gras) parties.push('<w:b/>')
  if (marques.italique) parties.push('<w:i/>')
  if (marques.petitesCapitales) parties.push('<w:smallCaps/>')
  if (marques.exposant) parties.push('<w:vertAlign w:val="superscript"/>')
  return parties.length > 0 ? `<w:rPr>${parties.join('')}</w:rPr>` : ''
}

function course(texte: string, marques: MarquesTexte, styleCourse?: string): string {
  return `<w:r>${proprietesCourse(marques, styleCourse)}<w:t xml:space="preserve">${echapperXml(texte)}</w:t></w:r>`
}

/**
 * Le contexte d'écriture : il numérote les notes et retient les adresses des liens,
 * qui deviendront autant de relations de `document.xml`.
 */
type Contexte = {
  notes: string[]
  liens: Map<string, string>
}

function relationDeLien(contexte: Contexte, adresse: string): string {
  const connu = contexte.liens.get(adresse)
  if (connu) return connu
  // Les relations 1 à 5 sont prises par les parties du document (voir `RELATIONS`).
  const identifiant = `rId${100 + contexte.liens.size}`
  contexte.liens.set(adresse, identifiant)
  return identifiant
}

function morceau(m: MorceauDocx, contexte: Contexte): string {
  if ('sautDeLigne' in m) return '<w:r><w:br/></w:r>'
  if ('note' in m) {
    const numero = contexte.notes.length + 1
    // La note est composée AVANT d'être rangée : une note peut en contenir une autre
    // en théorie, et l'ordre de numérotation doit rester celui de la lecture.
    contexte.notes.push('')
    contexte.notes[numero - 1] = m.note.map(p => paragraphe(p, contexte)).join('')
    return `<w:r><w:rPr><w:rStyle w:val="Appeldenotedebasdepage"/></w:rPr><w:footnoteReference w:id="${numero}"/></w:r>`
  }
  if (!m.texte) return ''
  if (m.lien) {
    const identifiant = relationDeLien(contexte, m.lien)
    return `<w:hyperlink r:id="${identifiant}">${course(m.texte, m, 'Lienhypertexte')}</w:hyperlink>`
  }
  return course(m.texte, m)
}

/** ⚠️ L'ORDRE des propriétés de paragraphe est imposé par le schéma (CT_PPr) :
 *  `pStyle`, `pageBreakBefore`, `spacing`, `ind`, `contextualSpacing`. Un élément posé
 *  hors de sa place rend le document illisible pour Word, qui ne dit pas où. */
function paragraphe(p: ParagrapheDocx, contexte: Contexte): string {
  const proprietes: string[] = [`<w:pStyle w:val="${p.style}"/>`]
  if (p.sautDePage) proprietes.push('<w:pageBreakBefore/>')
  // ⛔ UN SEUL `<w:spacing>` par paragraphe : le schéma n'en admet pas deux, et Word
  // rejette le document sans dire où. Les deux blancs se posent donc ensemble.
  if (p.espaceAvant || p.espaceApres) {
    const avant = p.espaceAvant ? ` w:before="${p.espaceAvant}"` : ''
    const apres = p.espaceApres ? ` w:after="${p.espaceApres}"` : ''
    proprietes.push(`<w:spacing${avant}${apres}/>`)
  }
  // ⛔ Le retrait d'un vers s'ADDITIONNE à celui du style, il ne le remplace pas : le
  // style porte le retrait de base (« tout vers est rentré par rapport à la prose »),
  // le rang d'alinéa vient par-dessus.
  if (p.retraitGauche) {
    const base = p.style === 'Vers' ? Math.round(1.4 * CM) : 0
    proprietes.push(`<w:ind w:left="${base + p.retraitGauche}"/>`)
  }
  // ⛔ `Vers` porte un espacement CONTEXTUEL, qui supprime tout blanc entre deux
  // paragraphes du même style : sans cette ligne, le blanc de strophe demandé
  // ci-dessus serait ignoré en silence.
  if (p.espaceAvant || p.espaceApres) proprietes.push('<w:contextualSpacing w:val="0"/>')
  const corps = p.morceaux.map(m => morceau(m, contexte)).join('')
  return `<w:p><w:pPr>${proprietes.join('')}</w:pPr>${corps}</w:p>`
}

/** Le champ SOMMAIRE. Word le remplit à l'ouverture ; le texte de secours dit
 *  pourquoi, au cas où le lecteur refuserait la mise à jour. */
function champSommaire(profondeur: number): string {
  const instruction = ` TOC \\o "1-${profondeur}" \\h \\z \\u `
  return '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>'
    + '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    + `<w:r><w:instrText xml:space="preserve">${echapperXml(instruction)}</w:instrText></w:r>`
    + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    + '<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">Placez le curseur ici et appuyez sur F9 pour composer le sommaire.</w:t></w:r>'
    + '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
}

/** Un tableau sans filets : la traduction à gauche, la langue originale à droite. */
function tableauEnRegard(
  lignes: { gauche: ParagrapheDocx[]; droite: ParagrapheDocx[] }[],
  contexte: Contexte,
): string {
  const utile = MESURE_UTILE
  const colonne = Math.floor(utile / 2)
  // ⚠️ Une cellule DOIT contenir au moins un paragraphe : une cellule vide sans `w:p`
  // rend le document illisible pour Word.
  const cellule = (paragraphes: ParagrapheDocx[], style: StyleDocx) => {
    const contenu = paragraphes.length > 0
      ? paragraphes.map(p => paragraphe(p, contexte)).join('')
      : `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr></w:p>`
    return `<w:tc><w:tcPr><w:tcW w:w="${colonne}" w:type="dxa"/></w:tcPr>${contenu}</w:tc>`
  }
  const corps = lignes.map(ligne =>
    `<w:tr>${cellule(ligne.gauche, 'Corpsdetextesansalinea')}${cellule(ligne.droite, 'Texteoriginal')}</w:tr>`
  ).join('')
  return '<w:tbl><w:tblPr>'
    + `<w:tblW w:w="${utile}" w:type="dxa"/><w:tblLayout w:type="fixed"/>`
    + '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/>'
    + `<w:bottom w:w="0" w:type="dxa"/><w:right w:w="${Math.round(0.5 * CM)}" w:type="dxa"/></w:tblCellMar>`
    + '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>'
    + '</w:tblPr>'
    + `<w:tblGrid><w:gridCol w:w="${colonne}"/><w:gridCol w:w="${colonne}"/></w:tblGrid>`
    + corps
    + '</w:tbl>'
}

// ── Les parties du paquet ─────────────────────────────────────────────────────

const RELATIONS_FIXES = [
  { id: 'rId1', type: 'styles', cible: 'styles.xml' },
  { id: 'rId2', type: 'settings', cible: 'settings.xml' },
  { id: 'rId3', type: 'footnotes', cible: 'footnotes.xml' },
  { id: 'rId4', type: 'fontTable', cible: 'fontTable.xml' },
  { id: 'rId5', type: 'footer', cible: 'footer1.xml' },
] as const

const ID_PIED_DE_PAGE = 'rId5'

function typesDeContenu(): string {
  const parties = [
    ['/word/document.xml', 'wordprocessingml.document.main'],
    ['/word/styles.xml', 'wordprocessingml.styles'],
    ['/word/settings.xml', 'wordprocessingml.settings'],
    ['/word/footnotes.xml', 'wordprocessingml.footnotes'],
    ['/word/fontTable.xml', 'wordprocessingml.fontTable'],
    ['/word/footer1.xml', 'wordprocessingml.footer'],
  ]
  return ENTETE_XML
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + parties.map(([nom, type]) =>
        `<Override PartName="${nom}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`).join('')
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    + '</Types>'
}

function relationsRacine(): string {
  const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return ENTETE_XML
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${base}/officeDocument" Target="word/document.xml"/>`
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + `<Relationship Id="rId3" Type="${base}/extended-properties" Target="docProps/app.xml"/>`
    + '</Relationships>'
}

function relationsDocument(liens: Map<string, string>): string {
  const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const fixes = RELATIONS_FIXES.map(r =>
    `<Relationship Id="${r.id}" Type="${base}/${r.type}" Target="${r.cible}"/>`).join('')
  const externes = [...liens.entries()].map(([adresse, id]) =>
    `<Relationship Id="${id}" Type="${base}/hyperlink" Target="${echapperXml(adresse)}" TargetMode="External"/>`).join('')
  return ENTETE_XML
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + fixes + externes + '</Relationships>'
}

function feuilleDeStyles(): string {
  const ecrire = (style: DefinitionStyle) => {
    const type = style.type ?? 'paragraph'
    const defaut = style.id === 'Normal' ? ' w:default="1"' : ''
    return `<w:style w:type="${type}"${defaut} w:styleId="${style.id}">`
      + `<w:name w:val="${echapperXml(style.nom)}"/>`
      + (style.maison ? '' : '')
      + (style.basedOn ? `<w:basedOn w:val="${style.basedOn}"/>` : '')
      + (style.next ? `<w:next w:val="${style.next}"/>` : '')
      + (style.priorite !== undefined ? `<w:uiPriority w:val="${style.priorite}"/>` : '')
      + (style.galerie ? '<w:qFormat/>' : '')
      + (style.maison ? '<w:qFormat/>' : '')
      + (style.pPr ? `<w:pPr>${style.pPr}</w:pPr>` : '')
      + (style.rPr ? `<w:rPr>${style.rPr}</w:rPr>` : '')
      + '</w:style>'
  }
  return ENTETE_XML
    + `<w:styles ${NS_W}>`
    + '<w:docDefaults><w:rPrDefault><w:rPr>'
    + '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:eastAsia="Cambria" w:cs="Cambria"/>'
    + `<w:color w:val="${ENCRE}"/><w:sz w:val="22"/><w:szCs w:val="22"/>`
    + '<w:lang w:val="fr-FR" w:eastAsia="fr-FR" w:bidi="ar-SA"/>'
    + '</w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="0" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>'
    + '</w:docDefaults>'
    + [...STYLES, ...STYLES_COURSE].map(ecrire).join('')
    + '</w:styles>'
}

function reglages(): string {
  return ENTETE_XML
    + `<w:settings ${NS_W}>`
    + '<w:zoom w:percent="100"/>'
    + `<w:defaultTabStop w:val="${Math.round(1.25 * CM)}"/>`
    // La justification française sans césure creuse des blancs ignobles : c'est le
    // défaut que la charte relève sur la page Bible (« la cause d'un blanc ignoble est
    // une ligne TROP COURTE »). Word coupe donc les mots, jamais plus de deux lignes
    // de suite, et laisse les capitales entières.
    + '<w:autoHyphenation w:val="true"/>'
    + '<w:consecutiveHyphenLimit w:val="2"/>'
    + `<w:hyphenationZone w:val="${Math.round(0.6 * CM)}"/>`
    + '<w:doNotHyphenateCaps w:val="true"/>'
    + '<w:characterSpacingControl w:val="doNotCompress"/>'
    // Le sommaire est un CHAMP : sans cette ligne, il resterait à sa phrase de secours
    // jusqu'à ce que le lecteur pense à appuyer sur F9.
    + '<w:updateFields w:val="true"/>'
    + '<w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/>'
    + '<w:pos w:val="pageBottom"/><w:numFmt w:val="decimal"/><w:numStart w:val="1"/>'
    + '<w:numRestart w:val="continuous"/></w:footnotePr>'
    + '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>'
    + '</w:settings>'
}

function tableDesPolices(): string {
  const police = (nom: string, famille: string, pas: string) =>
    `<w:font w:name="${nom}"><w:family w:val="${famille}"/><w:pitch w:val="${pas}"/></w:font>`
  return ENTETE_XML
    + `<w:fonts ${NS_W}>`
    + police('Cambria', 'roman', 'variable')
    + police('Calibri', 'swiss', 'variable')
    + '</w:fonts>'
}

function notesDeBasDePage(notes: readonly string[]): string {
  // Les deux notes de rang négatif ou nul ne sont pas des notes : ce sont les FILETS
  // que Word trace au-dessus de l'appareil (`separator`) et au-dessus de sa suite en
  // page suivante (`continuationSeparator`). `settings.xml` les désigne par ces
  // identifiants ; les vraies notes commencent à 1.
  const filet = (type: string, identifiant: number, marque: string) =>
    `<w:footnote w:type="${type}" w:id="${identifiant}">`
    + `<w:p><w:pPr><w:pStyle w:val="Notedebasdepage"/></w:pPr><w:r>${marque}</w:r></w:p></w:footnote>`
  return ENTETE_XML
    + `<w:footnotes ${NS_W} ${NS_R}>`
    + filet('separator', -1, '<w:separator/>')
    + filet('continuationSeparator', 0, '<w:continuationSeparator/>')
    + notes.map((contenu, index) => `<w:footnote w:id="${index + 1}">${contenu}</w:footnote>`).join('')
    + '</w:footnotes>'
}

function piedDePage(): string {
  return ENTETE_XML
    + `<w:ftr ${NS_W} ${NS_R}>`
    + '<w:p><w:pPr><w:pStyle w:val="Pieddepage"/></w:pPr>'
    + '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    + '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    + '<w:r><w:t>1</w:t></w:r>'
    + '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    + '</w:p></w:ftr>'
}

function proprietes(doc: DocumentDocx): string {
  return ENTETE_XML
    + '<cp:coreProperties'
    + ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"'
    + ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"'
    + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + `<dc:title>${echapperXml(doc.titre)}</dc:title>`
    + `<dc:creator>${echapperXml(doc.auteur)}</dc:creator>`
    + `<dc:description>${echapperXml(doc.description)}</dc:description>`
    + '<cp:lastModifiedBy>Corpus Scriptura</cp:lastModifiedBy>'
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${echapperXml(doc.dateIso)}</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${echapperXml(doc.dateIso)}</dcterms:modified>`
    + '</cp:coreProperties>'
}

function proprietesEtendues(): string {
  return ENTETE_XML
    + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
    + '<Application>Corpus Scriptura</Application>'
    + '<Company>Corpus Scriptura</Company>'
    + '</Properties>'
}

/** La section : A4 portrait, marges de livre, pied de page numéroté, et pas de
 *  numéro sur la page de titre (`titlePg`, sans en-tête de première page déclaré). */
function section(): string {
  return '<w:sectPr>'
    + `<w:footerReference w:type="default" r:id="${ID_PIED_DE_PAGE}"/>`
    + `<w:pgSz w:w="${PAGE_LARGEUR}" w:h="${PAGE_HAUTEUR}"/>`
    + `<w:pgMar w:top="${MARGE_HAUT}" w:right="${MARGE_LATERALE}" w:bottom="${MARGE_BAS}"`
    + ` w:left="${MARGE_LATERALE}" w:header="${Math.round(1.25 * CM)}" w:footer="${Math.round(1.5 * CM)}" w:gutter="0"/>`
    + '<w:titlePg/>'
    + '</w:sectPr>'
}

// ── L'assemblage ──────────────────────────────────────────────────────────────

/**
 * Compose le document et rend le `.docx` entier.
 *
 * ⚠️ Le corps se termine TOUJOURS par un paragraphe vide portant la section : Word
 * exige un paragraphe après un tableau en fin de corps, et c'est aussi là que vivent
 * la taille de page et le pied. Ne pas le retirer en croyant nettoyer un blanc.
 */
export function construireDocx(doc: DocumentDocx): Buffer {
  const contexte: Contexte = { notes: [], liens: new Map() }

  const corps = doc.blocs.map(bloc => {
    if (bloc.type === 'sommaire') return champSommaire(bloc.profondeur)
    if (bloc.type === 'regard') return tableauEnRegard(bloc.lignes, contexte)
    return paragraphe(bloc, contexte)
  }).join('')

  const document = ENTETE_XML
    + `<w:document ${NS_W} ${NS_R}><w:body>`
    + corps
    + `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>`
    + `<w:p><w:pPr><w:pStyle w:val="Normal"/>${section()}</w:pPr></w:p>`
    + '</w:body></w:document>'

  const texte = (chemin: string, contenu: string): FichierZip =>
    ({ chemin, contenu: Buffer.from(contenu, 'utf8') })

  // ⚠️ `[Content_Types].xml` VIENT EN TÊTE : plusieurs lecteurs le supposent, et c'est
  // ce que Word écrit lui-même.
  return construireZip([
    texte('[Content_Types].xml', typesDeContenu()),
    texte('_rels/.rels', relationsRacine()),
    texte('word/document.xml', document),
    texte('word/_rels/document.xml.rels', relationsDocument(contexte.liens)),
    texte('word/styles.xml', feuilleDeStyles()),
    texte('word/settings.xml', reglages()),
    texte('word/footnotes.xml', notesDeBasDePage(contexte.notes)),
    texte('word/fontTable.xml', tableDesPolices()),
    texte('word/footer1.xml', piedDePage()),
    texte('docProps/core.xml', proprietes(doc)),
    texte('docProps/app.xml', proprietesEtendues()),
  ])
}
