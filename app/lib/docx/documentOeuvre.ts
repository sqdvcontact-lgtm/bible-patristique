/**
 * L'ŒUVRE COMPOSÉE EN DOCUMENT — module PUR, sans requête ni React.
 *
 * Il prend des segments déjà chargés, dans l'ordre de lecture, et rend les BLOCS que
 * `ooxml.ts` sait écrire. ⛔ Il ne connaît ni Supabase, ni la session, ni la page : c'est
 * ce qui permet de l'éprouver sur des cas réels sans monter un serveur.
 *
 * ── CE QU'IL REPREND À LA LECTURE, ET POURQUOI ──────────────────────────────────
 *
 * La découpe en paragraphes (`paragraphesDeSegments`), la jonction des segments
 * (`recomposerSegments`), le POÈME refait (`fusionnerBlocs`), la composition des vers
 * (`niveauxAlinea`, `ombreDeLettrine`, `lignesDeVers`, `ouvreStrophe`), la reconnaissance
 * d'un bloc de versets ou de signatures, le complément d'un titre (`complementDeTitre`)
 * et la typographie française (`normaliserEspaces`) viennent tous des modules que la page
 * emploie. ⛔ Ne rien réécrire ici : un document extrait qui composerait autrement que
 * l'écran ne serait pas le même texte.
 *
 * ⚠️ Ce qui N'est PAS repris, et c'est délibéré : la LETTRINE (un flottant, que Word ne
 * rend qu'au prix d'un cadre qu'on ne saurait pas régler), la CITATION SORTIE détectée au
 * fil du texte (elle se reconnaît sur la mise en page de l'écran, non sur celle d'une page
 * A4) et les liens bibliques (l'extraction est un livre, non une surface où l'on clique).
 * Le TEXTE, lui, ne perd rien : ces trois-là sont des ornements de lecture.
 */

import { adresseEdition } from '@/app/lib/adresseEdition'
import { estBlocDeSignatures, paragraphesDeSegments } from '@/app/lib/compositionOeuvre'
import {
  estBlocDeVers, fusionnerBlocs, lignesDeVers, mesureAlinea, niveauxAlinea, ombreDeLettrine,
  ouvreStrophe,
} from '@/app/lib/compositionVers'
import { estBlocVersets, numeroVersetLisible } from '@/app/lib/compositionVersets'
import { recomposerSegments, type SegmentARecomposer } from '@/app/lib/jonctionSegments'
import { hrefSur } from '@/app/lib/liensSurs'
import { fragmentsEnrichis, type MarquesTexte } from '@/app/lib/texteEnrichiTokens'
import { complementDeTitre } from '@/app/lib/titres'
import { libelleTrad } from '@/app/lib/traducteurs'
import { normaliserEspaces, normaliserEspacesOriginal } from '@/app/lib/typographie'
import { CM, PAS_ALINEA_VERS, type BlocDocx, type MorceauDocx, type ParagrapheDocx, type StyleDocx } from './ooxml'

// ── Ce que le composeur reçoit ────────────────────────────────────────────────

/** Un bloc de note, réduit à ce qu'un document imprimé en garde. */
export type BlocNoteExtraite = {
  texte: string
  /** Le bloc est en VERS : ses lignes se composent une par une, comme dans la fenêtre. */
  vers?: boolean
  /**
   * ⛔ Le texte est déjà composé et NE SE RETOUCHE PLUS. C'est le cas de l'apparat
   * critique, dont la charte interdit qu'on le normalise : une fine insécable glissée
   * devant « B; est] » ou un point final ajouté à « om. F » réécrirait la notation d'un
   * éditeur. Le chargeur, qui seul connaît la nature du bloc, a déjà tranché.
   */
  brut?: boolean
}

export type NoteExtraite = { blocs: BlocNoteExtraite[] }

export type SegmentExtrait = {
  segmentKey: string | null
  /** `segment_texte`, appels de note MATÉRIALISÉS (`[[X]]`) par le chargeur. */
  texte: string
  nature: string | null
  joinBefore: string | null
  paragraphe: number | null
  rang: number | null
  /** `segment_metadata.indent_inches` : la position du bord gauche sur la page imprimée. */
  alinea: number | null
  stropheAvant: boolean | null
  numeroVerset: string | null
  forme: string | null
  /** Le repli `segments.texte_original`, quand aucun alignement ne couvre le segment. */
  texteOriginal: string | null
  /** L'identifiant du groupe d'alignement, quand l'œuvre est alignée. */
  groupeOriginal: string | null
  niv1: string; niv1Texte: string
  niv2: string; niv2Texte: string
  niv3: string; niv3Texte: string
  niv4: string; niv4Texte: string
  /** Marqueur (`A`, `12`) → note. */
  notes: Record<string, NoteExtraite>
}

/** L'original d'un groupe d'alignement, prêt à composer. */
export type OriginalExtrait = {
  texte: string
  toutVers: boolean
  notes: Record<string, NoteExtraite>
}

export type IdentiteOeuvre = {
  titre: string
  sousTitre?: string | null
  titreOriginal?: string | null
  auteur: string
  traducteur?: string | null
  editeur?: string | null
  ville?: string | null
  datePublication?: string | null
  collection?: string | null
  /** Le libellé de l'édition servie, quand l'œuvre en offre plusieurs. */
  edition?: string | null
  /** La division extraite, quand le lecteur n'a pas demandé l'œuvre entière. */
  division?: string | null
  /** L'adresse de la page, écrite au colophon. */
  adresseEnLigne: string
  /** La date de l'extraction, déjà rédigée (« 7 septembre 2026 »). */
  dateExtraction: string
}

export type EntreeDocument = {
  identite: IdentiteOeuvre
  /** Le corps, dans l'ordre de lecture. */
  corps: readonly SegmentExtrait[]
  /** L'apparat critique de l'éditeur. Vide s'il n'est pas demandé. */
  apparat: readonly SegmentExtrait[]
  /** Identifiant de groupe d'alignement → original. Vide hors lecture en regard. */
  originaux: ReadonlyMap<string, OriginalExtrait>
  original: 'aucun' | 'regard' | 'suite'
  notes: boolean
  sommaire: boolean
}

// ── Le texte, ses marques et ses appels de note ───────────────────────────────

/** `[[A]]`, `[[12]]` : le marqueur d'un appel de note, tel qu'il vit dans le corpus. */
const MARQUEUR_NOTE = /\[\[([A-Z0-9]+)\]\]/g

/**
 * Les fragments enrichis d'un texte, rendus en morceaux de paragraphe.
 *
 * ⛔ Un lien dont l'adresse n'est pas sûre ne devient pas un hyperlien : on n'en garde
 * que le libellé, exactement comme le rendu de lecture s'en remet à `hrefSur`.
 */
function fragmentsEnDocx(texte: string, marques: MarquesTexte = {}): MorceauDocx[] {
  return fragmentsEnrichis(texte, marques).map(fragment => {
    const { lien, ...reste } = fragment
    const adresse = lien ? hrefSur(lien) : null
    return adresse ? { ...reste, lien: adresse } : reste
  })
}

function paragraphesDeNote(note: NoteExtraite): ParagrapheDocx[] {
  const paragraphes: ParagrapheDocx[] = []
  for (const bloc of note.blocs) {
    const texte = (bloc.brut ? bloc.texte : normaliserEspaces(bloc.texte)).trim()
    if (!texte) continue
    // ⚠️ Un bloc en VERS garde ses lignes : c'est ce que fait la fenêtre de lecture, et
    // recoller un distique en prose lui retirerait ce qui en fait un vers.
    const lignes = bloc.vers ? lignesDeVers(texte) : [texte]
    for (const ligne of lignes) {
      paragraphes.push({ style: 'Notedebasdepage', morceaux: fragmentsEnDocx(ligne, bloc.vers ? { italique: true } : {}) })
    }
  }
  // Une note vide n'existe pas : Word refuse un appel sans contenu.
  return paragraphes.length > 0 ? paragraphes : [{ style: 'Notedebasdepage', morceaux: [] }]
}

/**
 * Le texte d'un bloc, ses appels de note posés à leur place.
 *
 * ⚠️ Le découpage se fait APRÈS l'enrichissement, sur le texte de chaque fragment : une
 * italique qui enjambe un appel (`*mot [[1]] suite*`) garde ainsi sa marque des deux
 * côtés. Découper d'abord la couperait en deux italiques, dont l'une jamais fermée.
 */
function morceauxDuTexte(
  texte: string,
  notes: Record<string, NoteExtraite>,
  avecNotes: boolean,
  marques: MarquesTexte = {},
  /** ⛔ La langue ORIGINALE prend `normaliserEspacesOriginal`, qui AJOUTE la fine
   *  insécable là où l'édition latine colle sa ponctuation (« dixit: »), quand le
   *  français ne fait que CONVERTIR le type d'une espace déjà posée. Les deux colonnes
   *  d'un bilingue doivent porter la même typographie (charte § 3.1-3.2). */
  original = false,
): MorceauDocx[] {
  const sortie: MorceauDocx[] = []
  const compose = original ? normaliserEspacesOriginal(texte) : normaliserEspaces(texte)
  for (const fragment of fragmentsEnDocx(compose, marques)) {
    if (!('texte' in fragment)) { sortie.push(fragment); continue }
    // ⚠️ Une expression régulière `g` porte son curseur : on en refait une par fragment.
    const motif = new RegExp(MARQUEUR_NOTE.source, 'g')
    let precedent = 0
    let trouve: RegExpExecArray | null
    while ((trouve = motif.exec(fragment.texte))) {
      const note = notes[trouve[1]]
      const avant = fragment.texte.slice(precedent, trouve.index)
      if (avant) sortie.push({ ...fragment, texte: avant })
      // ⛔ Un marqueur dont la note manque DISPARAÎT : imprimer « [[12]] » au milieu
      // d'Augustin serait pire que l'absence de la note, et c'est déjà ce que fait la
      // lecture. Le chargeur, lui, a compté ce qu'il n'a pas trouvé.
      if (note && avecNotes) sortie.push({ note: paragraphesDeNote(note) })
      precedent = motif.lastIndex
    }
    const reste = fragment.texte.slice(precedent)
    if (reste) sortie.push({ ...fragment, texte: reste })
  }
  return sortie
}

// ── Les blocs de texte ────────────────────────────────────────────────────────

const NATURE_RUBRIQUE = 'rubrique'
const NATURE_CITATION = 'citation'

/** Le blanc qui ouvre une strophe : une ligne de vers, et pas davantage. */
const BLANC_DE_STROPHE = Math.round(0.45 * CM)

/** La jonction d'une suite de segments — `join_before` MATÉRIALISÉ, jamais concaténé. */
function joindre(segments: readonly SegmentExtrait[]): string {
  const aRecomposer: SegmentARecomposer[] = segments.map(s => ({ texte: s.texte, joinBefore: s.joinBefore }))
  return recomposerSegments(aRecomposer)
}

/** Les notes de tous les segments d'un bloc, fondues : le texte est joint, et l'appel
 *  qu'il porte peut venir de n'importe lequel de ses segments. */
function fondreLesNotes(bloc: readonly SegmentExtrait[]): Record<string, NoteExtraite> {
  if (bloc.length === 1) return bloc[0].notes
  const fondues: Record<string, NoteExtraite> = {}
  for (const segment of bloc) Object.assign(fondues, segment.notes)
  return fondues
}

/** Le style de paragraphe d'un bloc de prose, selon la nature de ses segments.
 *  ⛔ Le LEMME se lit au fil du texte, comme n'importe quel paragraphe (charte § 3.8,
 *  décision du 20 août 2026) : il ne prend pas le retrait d'une citation. */
function styleDeLaProse(bloc: readonly SegmentExtrait[], premierDeDivision: boolean): StyleDocx {
  const nature = bloc[0]?.nature ?? null
  if (nature === NATURE_RUBRIQUE) return 'Rubrique'
  if (nature === NATURE_CITATION) return 'Citation'
  return premierDeDivision ? 'Corpsdetextesansalinea' : 'Corpsdetexte'
}

/** Un bloc de VERS : une ligne par vers, l'alinéa LU dans la source. */
function paragraphesDeVers(bloc: readonly SegmentExtrait[], avecNotes: boolean): ParagrapheDocx[] {
  // ⚠️ Un segment peut porter PLUSIEURS vers (310 dans le corpus) : on découpe d'abord,
  // et la mesure d'alinéa du segment vaut pour chacune de ses lignes.
  const lignes: { texte: string; mesure: number | null; strophe: boolean; segment: SegmentExtrait }[] = []
  bloc.forEach((segment, index) => {
    const strophe = ouvreStrophe(
      { strophe_avant: segment.stropheAvant, paragraphe: segment.paragraphe },
      index > 0 ? { paragraphe: bloc[index - 1].paragraphe } : undefined,
    )
    lignesDeVers(segment.texte).forEach((ligne, rangDansLeSegment) => {
      lignes.push({ texte: ligne, mesure: mesureAlinea(segment.alinea), strophe: strophe && rangDansLeSegment === 0, segment })
    })
  })
  // ⛔ Le rabattage se fait POÈME PAR POÈME : ce qui compte est l'écart de chaque ligne au
  // bord gauche du poème, non sa cote absolue sur la page.
  const rangs = ombreDeLettrine(niveauxAlinea(lignes.map(l => l.mesure)))
  return lignes.map((ligne, index) => ({
    style: 'Vers' as StyleDocx,
    ...(rangs[index] > 0 ? { retraitGauche: rangs[index] * PAS_ALINEA_VERS } : {}),
    // ⛔ Une strophe se sépare par un BLANC, jamais par un filet.
    ...(ligne.strophe && index > 0 ? { espaceAvant: BLANC_DE_STROPHE } : {}),
    morceaux: morceauxDuTexte(ligne.texte, ligne.segment.notes, avecNotes),
  }))
}

/** Un bloc de VERSETS : un segment par verset, son numéro en exposant. */
function paragraphesDeVersets(bloc: readonly SegmentExtrait[], avecNotes: boolean): ParagrapheDocx[] {
  return bloc.map(segment => {
    const numero = numeroVersetLisible(segment.numeroVerset)
    const morceaux: MorceauDocx[] = []
    if (numero) morceaux.push({ texte: `${numero} `, exposant: true })
    morceaux.push(...morceauxDuTexte(segment.texte, segment.notes, avecNotes))
    return { style: 'Versetbiblique' as StyleDocx, morceaux }
  })
}

/** La colonne en langue originale d'un bloc. */
function paragraphesOriginaux(original: OriginalExtrait, avecNotes: boolean): ParagrapheDocx[] {
  const texte = original.texte.trim()
  if (!texte) return []
  if (!original.toutVers) {
    return [{ style: 'Texteoriginal', morceaux: morceauxDuTexte(texte, original.notes, avecNotes, {}, true) }]
  }
  return lignesDeVers(texte).map(ligne => ({
    style: 'Texteoriginal' as StyleDocx,
    morceaux: morceauxDuTexte(ligne, original.notes, avecNotes, {}, true),
  }))
}

// ── L'ossature ────────────────────────────────────────────────────────────────

type Titre = { rang: 1 | 2 | 3 | 4; intitule: string; complement: string }

const STYLE_TITRE: Record<1 | 2 | 3 | 4, StyleDocx> = { 1: 'Titre1', 2: 'Titre2', 3: 'Titre3', 4: 'Titre4' }

/**
 * Les titres qu'un segment ouvre, par rapport à celui qui le précède.
 *
 * ⚠️ Un niveau se réécrit dès qu'un niveau SUPÉRIEUR a changé : « Chapitre I » du livre II
 * n'est pas celui du livre I, et le taire ferait courir la division précédente sous le
 * titre suivant.
 */
export function titresDuChangement(precedent: SegmentExtrait | null, segment: SegmentExtrait): Titre[] {
  const niveaux = [
    { rang: 1 as const, intitule: segment.niv1, complement: segment.niv1Texte, ancien: precedent?.niv1 ?? '' },
    { rang: 2 as const, intitule: segment.niv2, complement: segment.niv2Texte, ancien: precedent?.niv2 ?? '' },
    { rang: 3 as const, intitule: segment.niv3, complement: segment.niv3Texte, ancien: precedent?.niv3 ?? '' },
    { rang: 4 as const, intitule: segment.niv4, complement: segment.niv4Texte, ancien: precedent?.niv4 ?? '' },
  ]
  const titres: Titre[] = []
  let rouvert = precedent === null
  for (const niveau of niveaux) {
    if (!rouvert && niveau.intitule === niveau.ancien) continue
    rouvert = true
    if (!niveau.intitule.trim()) continue
    // ⛔ Un complément qui REDIT son titre ne se compose qu'une fois.
    titres.push({ rang: niveau.rang, intitule: niveau.intitule, complement: complementDeTitre(niveau.intitule, niveau.complement) })
  }
  return titres
}

/** Les originaux qu'un bloc porte : ceux dont il ouvre le groupe, ou le repli. */
function originauxDuBloc(
  entree: EntreeDocument,
  bloc: readonly SegmentExtrait[],
  premierDuGroupe: ReadonlyMap<string, string>,
): OriginalExtrait[] {
  if (entree.original === 'aucun') return []
  const sortie: OriginalExtrait[] = []
  const vus = new Set<string>()
  for (const segment of bloc) {
    const groupe = segment.groupeOriginal
    if (!groupe || vus.has(groupe)) continue
    vus.add(groupe)
    // ⛔ Un groupe qui enjambe deux blocs ne compose son original QU'UNE fois : c'est le
    // premier segment du groupe qui le porte, et lui seul.
    if (premierDuGroupe.get(groupe) !== segment.segmentKey) continue
    const original = entree.originaux.get(groupe)
    if (original) sortie.push(original)
  }
  if (sortie.length > 0) return sortie
  // ⚠️ `segments.texte_original` est un REPLI qui s'éteint : il ne sert que là où aucun
  // alignement ne couvre le texte (sept œuvres au 2026-09-07).
  const repli = bloc.find(s => (s.texteOriginal ?? '').trim())
  return repli?.texteOriginal ? [{ texte: repli.texteOriginal, toutVers: estBlocDeVers(bloc), notes: {} }] : []
}

/**
 * La suite des blocs d'une surface (le corps, ou l'apparat).
 *
 * ⚠️ Les segments arrivent dans l'ordre de lecture (`segment_numero`) : c'est le CHANGEMENT
 * d'un niveau qui ouvre une division, jamais un regroupement calculé à part. Un paragraphe
 * n'enjambe donc jamais un titre.
 */
function blocsDeLaSurface(entree: EntreeDocument, segments: readonly SegmentExtrait[]): BlocDocx[] {
  const blocs: BlocDocx[] = []
  if (segments.length === 0) return blocs

  // Le premier segment de chaque groupe d'alignement, dans l'ordre de lecture.
  const premierDuGroupe = new Map<string, string>()
  for (const segment of segments) {
    const groupe = segment.groupeOriginal
    if (groupe && segment.segmentKey && !premierDuGroupe.has(groupe)) premierDuGroupe.set(groupe, segment.segmentKey)
  }

  let precedent: SegmentExtrait | null = null
  let courants: SegmentExtrait[] = []
  let premierDeDivision = true
  let enRegard: { gauche: ParagrapheDocx[]; droite: ParagrapheDocx[] }[] = []

  const fermerLeRegard = () => {
    if (enRegard.length === 0) return
    blocs.push({ type: 'regard', lignes: enRegard })
    enRegard = []
  }

  const viderLaDivision = () => {
    if (courants.length === 0) return
    const division = courants
    const rangs = division.map((_, index) => index)
    // ⛔ On refait le POÈME : `paragraphe` le découpe en strophes chez une édition et pas
    // chez l'autre, et `niveauxAlinea` se calcule sur le poème entier.
    const decoupes = fusionnerBlocs(
      paragraphesDeSegments(rangs, index => division[index]).map(ids => ({ ids })),
      ids => estBlocDeVers(ids.map(index => division[index])),
    )
    for (const decoupe of decoupes) {
      const bloc = decoupe.ids.map(index => division[index])
      const natures = bloc.map(s => s.nature)
      const paragraphes: ParagrapheDocx[] = estBlocVersets(natures)
        ? paragraphesDeVersets(bloc, entree.notes)
        : estBlocDeVers(bloc)
          ? paragraphesDeVers(bloc, entree.notes)
          : estBlocDeSignatures(natures)
            ? [{ style: 'Signature', morceaux: morceauxDuTexte(joindre(bloc), fondreLesNotes(bloc), entree.notes) }]
            : [{
              style: styleDeLaProse(bloc, premierDeDivision),
              morceaux: morceauxDuTexte(joindre(bloc), fondreLesNotes(bloc), entree.notes),
            }]
      premierDeDivision = false

      const originaux = originauxDuBloc(entree, bloc, premierDuGroupe)
      // ⛔ UN BLOC COUVERT PAR UN GROUPE GARDE SA GRILLE, colonne de droite VIDE, même
      // quand ce n'est pas lui qui porte l'original : le français ne doit pas reprendre
      // toute la largeur au milieu d'un empan, sans quoi la mise en regard se défait à
      // l'œil. Même règle que la lecture en regard de la Bible, où un créneau qu'une
      // édition ne porte pas laisse sa cellule blanche.
      const couvert = bloc.some(s => s.groupeOriginal && entree.originaux.has(s.groupeOriginal))
      if (entree.original === 'regard' && (originaux.length > 0 || couvert)) {
        enRegard.push({ gauche: paragraphes, droite: originaux.flatMap(o => paragraphesOriginaux(o, entree.notes)) })
        continue
      }
      fermerLeRegard()
      blocs.push(...paragraphes.map(p => ({ type: 'paragraphe' as const, ...p })))
      if (entree.original === 'suite') {
        for (const original of originaux) {
          blocs.push(...paragraphesOriginaux(original, entree.notes).map(p => ({ type: 'paragraphe' as const, ...p })))
        }
      }
    }
    courants = []
  }

  for (const segment of segments) {
    const titres = titresDuChangement(precedent, segment)
    if (titres.length > 0) {
      viderLaDivision()
      fermerLeRegard()
      for (const titre of titres) {
        blocs.push({ type: 'paragraphe', style: STYLE_TITRE[titre.rang], morceaux: morceauxDuTexte(titre.intitule, {}, false) })
        if (titre.complement) {
          blocs.push({ type: 'paragraphe', style: 'Chapeau', morceaux: morceauxDuTexte(titre.complement, {}, false) })
        }
      }
      premierDeDivision = true
    }
    courants.push(segment)
    precedent = segment
  }
  viderLaDivision()
  fermerLeRegard()
  return blocs
}

// ── Le frontispice et le colophon ─────────────────────────────────────────────

/** Deux titres se ressemblent-ils au point qu'il serait vain de les dire deux fois ?
 *  ⚠️ Repli MINIMAL de `memeIntitule` : casse, apostrophe, blancs et point final. */
function memeTitre(a: string, b: string): boolean {
  const replier = (texte: string) => texte
    .toLocaleLowerCase('fr')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim()
  return replier(a) === replier(b)
}

function frontispice(identite: IdentiteOeuvre): BlocDocx[] {
  const ligne = (style: StyleDocx, texte: string, marques: MarquesTexte = {}): BlocDocx =>
    ({ type: 'paragraphe', style, morceaux: fragmentsEnDocx(normaliserEspaces(texte), marques) })
  const blocs: BlocDocx[] = []
  if (identite.auteur.trim()) blocs.push(ligne('Frontispiceauteur', identite.auteur))
  blocs.push(ligne('Titre', identite.titre))
  if (identite.sousTitre?.trim()) blocs.push(ligne('Soustitre', identite.sousTitre))
  // ⛔ Un titre original qui redit le titre affiché ne paraît pas : le frontispice
  // bégaierait (règle du 2026-08-21).
  if (identite.titreOriginal?.trim() && !memeTitre(identite.titreOriginal, identite.titre)) {
    blocs.push(ligne('Frontispicemention', identite.titreOriginal, { italique: true }))
  }
  if (identite.division?.trim()) blocs.push(ligne('Soustitre', identite.division))
  const traduction = libelleTrad(identite.traducteur)
  if (traduction) blocs.push(ligne('Frontispicemention', traduction))
  const adresse = adresseEdition({
    ville: identite.ville ?? null,
    editeur: identite.editeur ?? null,
    annee: identite.datePublication ?? null,
  })
  if (adresse) blocs.push(ligne('Frontispicemention', adresse))
  if (identite.collection?.trim()) blocs.push(ligne('Frontispicemention', identite.collection))
  if (identite.edition?.trim()) blocs.push(ligne('Frontispicemention', identite.edition))
  return blocs
}

/** Le colophon : d'où vient ce document, et quand il a été tiré. */
function colophon(identite: IdentiteOeuvre): BlocDocx[] {
  const ligne = (texte: string): BlocDocx =>
    ({ type: 'paragraphe', style: 'Colophon', morceaux: fragmentsEnDocx(normaliserEspaces(texte)) })
  return [
    { type: 'paragraphe', style: 'Normal', morceaux: [], sautDePage: true },
    ligne('Corpus Scriptura'),
    ligne(identite.adresseEnLigne),
    ligne(`Extrait le ${identite.dateExtraction}`),
  ]
}

// ── L'assemblage ──────────────────────────────────────────────────────────────

/** Jusqu'où le sommaire descend. ⚠️ Trois rangs, comme celui du site : au quatrième, une
 *  œuvre à divisions fines rendrait un sommaire plus long que le texte. */
export const PROFONDEUR_SOMMAIRE = 3

export function composerDocumentOeuvre(entree: EntreeDocument): BlocDocx[] {
  const blocs: BlocDocx[] = [...frontispice(entree.identite)]

  const corps = blocsDeLaSurface(entree, entree.corps)
  const apparat = entree.apparat.length > 0 ? blocsDeLaSurface(entree, entree.apparat) : []

  // ⛔ Un sommaire qui n'a rien à sommer ne paraît pas (charte § 38.24) : il annoncerait
  // une table des matières que le document ne porte pas.
  const aDesTitres = [...corps, ...apparat].some(bloc =>
    bloc.type === 'paragraphe' && bloc.style !== 'Titre' && bloc.style.startsWith('Titre'))
  if (entree.sommaire && aDesTitres) {
    blocs.push({ type: 'paragraphe', style: 'Titresommaire', morceaux: [{ texte: 'Sommaire' }] })
    blocs.push({ type: 'sommaire', profondeur: PROFONDEUR_SOMMAIRE })
  }

  blocs.push(...corps)
  if (apparat.length > 0) {
    blocs.push({ type: 'paragraphe', style: 'Titre1', morceaux: [{ texte: 'Apparat critique' }] })
    blocs.push(...apparat)
  }
  blocs.push(...colophon(entree.identite))
  return blocs
}
