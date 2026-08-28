/**
 * Une référence bibliographique COMPOSÉE À PARTIR DES CHAMPS, jamais reprise
 * d'une chaîne précomposée.
 *
 * La liste « Du même auteur » de Fillion s'imprimait en quinze notices, et le
 * site les servait telles qu'il les avait lues : une phrase par bloc, format et
 * pagination compris, ponctuation figée dans la donnée. Elle se lit désormais
 * dans les tables d'autorité — `bible_editorial_bibliography_entries` pour
 * l'appartenance et l'ordre, `ouvrages_bibliographiques` pour les champs,
 * `auteurs_valeur` et `editeurs_valeur` pour les formes normalisées — et c'est
 * ce module qui en fait une référence.
 *
 * ⛔ Rien ne se devine ici : pas de découpe d'un ancien `reading_text`, pas de
 * dictionnaire d'éditeurs recopié en dur, pas d'expression régulière pour
 * décider d'un nom. Ce qui n'est pas dans un champ n'est pas affiché.
 *
 * ⛔ La description MATÉRIELLE — `in-8°`, nombre de pages, pagination romaine,
 * planches, figures, dimensions — ne paraît pas dans une liste d'ouvrages. Elle
 * n'est pas filtrée ici : la vue ne la porte pas, et c'est plus sûr.
 *
 * Module PUR : il ne connaît ni Supabase, ni React.
 */

/** Ce que la vue `v_bible_editorial_bibliography_entries` sert, tel quel. */
export type LigneBibliographieOuvrage = {
  family_id: string
  piece_key: string
  display_order: number
  source_body_block_id: string | null
  ouvrage_id: number
  titre: string
  sous_titre: string | null
  lieu: string | null
  /** Forme d'autorité de l'éditeur (`editeurs_valeur.nom`), la graphie libre en repli. */
  editeur: string | null
  annee: number | null
  auteur_nom: string | null
  auteur_prenom: string | null
  auteur_nom_famille: string | null
}

/** L'auteur d'un ouvrage, sous sa forme d'autorité et décomposée. */
export type AuteurOuvrage = {
  /** La forme d'autorité entière — « Louis-Claude Fillion ». */
  nom: string
  prenom: string | null
  nomFamille: string | null
}

/** Une œuvre citée. ⚠️ `id` est `ouvrage_id` : c'est la seule identité stable,
 *  ⛔ jamais le rang dans le tableau. */
export type OuvrageBibliographique = {
  id: number
  ordre: number
  titre: string
  sousTitre: string | null
  lieu: string | null
  editeur: string | null
  annee: number | null
  auteur: AuteurOuvrage | null
}

/** La liste bibliographique d'UNE pièce liminaire. */
export type BibliographiePiece = {
  pieceKey: string
  ouvrages: OuvrageBibliographique[]
}

/**
 * Le fragment d'une référence : d'où il vient, et comment il se compose.
 *
 * `champ` nomme la colonne d'origine — `null` pour la ponctuation, que le code
 * ajoute et que la donnée ne porte pas. Les trois compositions suffisent : le
 * romain pour tout ce qui n'est ni intitulé ni nom d'autorité, l'italique pour
 * l'intitulé de l'ouvrage (titre, sous-titre et le deux-points qui les joint),
 * les petites capitales pour le nom d'autorité de l'auteur.
 */
export type SegmentReference = {
  champ: 'prenom' | 'nom_famille' | 'titre' | 'sous_titre' | 'lieu' | 'editeur' | 'annee' | null
  composition: 'romain' | 'italique' | 'petites-capitales'
  texte: string
}

/**
 * Les pièces où le TITRE porte déjà l'auteur, et où le répéter serait le dire
 * quinze fois. « Du même auteur » est de celles-là — sa rubrique établit
 * l'auteur commun, la charte le dit (§35.6.1), et l'auteur du site l'a
 * réaffirmé. ⚠️ La liste est nommée, non devinée : une autre pièce
 * bibliographique affiche ses auteurs, c'est la règle générale.
 */
const PIECES_A_AUTEUR_COMMUN: ReadonlySet<string> = new Set(['du-meme-auteur'])

export function auteurPorteParLeTitreDeLaPiece(pieceKey: string): boolean {
  return PIECES_A_AUTEUR_COMMUN.has(pieceKey)
}

// L'espace insécable qui précède les deux-points (charte §3.2) et la virgule
// qui sépare les mentions d'une même notice (charte §35.6.1).
// ⚠️ L'insécable s'écrit en ÉCHAPPEMENT : tapée telle quelle, elle ne se
// distingue pas d'une espace ordinaire dans une colonne de code, et le dépôt
// a déjà perdu des fines de cette façon (voir `typographie.ts`).
const LIAISON_SOUS_TITRE = '\u00A0: '
const SEPARATEUR = ', '
// Un intitulé qui se ferme déjà sur une ponctuation forte ne reçoit pas un
// second point : la ponctuation attestée d'un titre est conservée (charte §3.4).
const PONCTUATION_FORTE = /[.!?…]$/u

function propre(valeur: string | null | undefined): string | null {
  const texte = valeur?.trim()
  return texte ? texte : null
}

/**
 * Les entrées d'une famille, rangées par pièce et par `display_order`.
 *
 * ⚠️ Un ouvrage cité deux fois dans une même pièce ne paraît qu'une fois :
 * l'identité est `ouvrage_id`, et deux `<li>` de même clé seraient un défaut de
 * donnée, non un choix d'affichage. Une entrée sans titre est écartée — elle ne
 * pourrait rien composer.
 */
export function grouperBibliographiesParPiece(
  lignes: readonly LigneBibliographieOuvrage[],
): BibliographiePiece[] {
  const parPiece = new Map<string, OuvrageBibliographique[]>()
  const vus = new Map<string, Set<number>>()
  for (const ligne of [...lignes].sort((a, b) => a.display_order - b.display_order)) {
    const titre = propre(ligne.titre)
    if (!titre) continue
    const dejaVus = vus.get(ligne.piece_key) ?? new Set<number>()
    if (dejaVus.has(ligne.ouvrage_id)) continue
    dejaVus.add(ligne.ouvrage_id)
    vus.set(ligne.piece_key, dejaVus)
    const ouvrages = parPiece.get(ligne.piece_key) ?? []
    const nom = propre(ligne.auteur_nom)
    ouvrages.push({
      id: ligne.ouvrage_id,
      ordre: ligne.display_order,
      titre,
      sousTitre: propre(ligne.sous_titre),
      lieu: propre(ligne.lieu),
      editeur: propre(ligne.editeur),
      annee: ligne.annee,
      auteur: nom
        ? { nom, prenom: propre(ligne.auteur_prenom), nomFamille: propre(ligne.auteur_nom_famille) }
        : null,
    })
    parPiece.set(ligne.piece_key, ouvrages)
  }
  return [...parPiece].map(([pieceKey, ouvrages]) => ({ pieceKey, ouvrages }))
}

/**
 * La liste structurée qui répond des BLOCS d'une pièce.
 *
 * ⛔ La pièce ne se reconnaît pas à son titre passé au tamis d'une translittération :
 * chaque entrée désigne le bloc matériel dont elle est issue (`source_body_block_id`),
 * et c'est cette appartenance-là qui fait foi. La pièce prend donc la clé de la
 * bibliographie dont elle porte les blocs, et rien d'autre ne la lui donne.
 */
export function bibliographieDesBlocs(
  lignes: readonly LigneBibliographieOuvrage[],
  idsDesBlocs: readonly string[],
): BibliographiePiece | null {
  const blocs = new Set(idsDesBlocs)
  const clesCandidates = new Set(
    lignes
      .filter((ligne) => ligne.source_body_block_id !== null && blocs.has(ligne.source_body_block_id))
      .map((ligne) => ligne.piece_key),
  )
  if (clesCandidates.size !== 1) return null
  const [cle] = clesCandidates
  // ⚠️ La pièce prend TOUTES les entrées de sa clé, y compris celles qu'aucun
  // bloc matériel ne porte : une œuvre citée sans notice imprimée propre
  // appartient à la liste comme les autres, et la taire tronquerait la
  // bibliographie sans que rien ne le signale.
  return grouperBibliographiesParPiece(lignes).find((piece) => piece.pieceKey === cle) ?? null
}

/**
 * Une référence, fragment par fragment.
 *
 * Forme attendue, ponctuation comprise :
 * « Évangile selon saint Jean : Introduction critique et commentaires, Paris,
 * P. Lethielleux, 1887. »
 *
 * ⚠️ Un champ absent emporte SON séparateur : sans lieu, la référence se lit
 * « Titre, P. Lethielleux, 1887. » et non « Titre, , P. Lethielleux, 1887. ».
 */
export function segmentsReference(
  ouvrage: OuvrageBibliographique,
  options: { avecAuteur?: boolean } = {},
): SegmentReference[] {
  const segments: SegmentReference[] = []
  const auteur = options.avecAuteur ? ouvrage.auteur : null
  if (auteur) {
    // Le nom de famille en petites capitales, le prénom en bas de casse. ⛔ La
    // découpe vient de la donnée (`auteurs_valeur.prenom` / `.nom_famille`) :
    // une autorité que ce couple ne décrit pas — un ancien, un médiéval — se
    // compose entière en petites capitales, elle ne se coupe pas à la première
    // espace (charte §35.6.1).
    if (auteur.nomFamille && auteur.prenom) {
      segments.push({ champ: 'prenom', composition: 'romain', texte: auteur.prenom })
      segments.push({ champ: null, composition: 'romain', texte: ' ' })
      segments.push({ champ: 'nom_famille', composition: 'petites-capitales', texte: auteur.nomFamille })
    } else {
      segments.push({
        champ: 'nom_famille',
        composition: 'petites-capitales',
        texte: auteur.nomFamille ?? auteur.nom,
      })
    }
    segments.push({ champ: null, composition: 'romain', texte: SEPARATEUR })
  }

  // Titre et sous-titre sont deux champs, mais UN seul intitulé : l'italique les
  // couvre tous les deux, et le deux-points qui les joint avec eux.
  segments.push({ champ: 'titre', composition: 'italique', texte: ouvrage.titre })
  if (ouvrage.sousTitre) {
    segments.push({ champ: null, composition: 'italique', texte: LIAISON_SOUS_TITRE })
    segments.push({ champ: 'sous_titre', composition: 'italique', texte: ouvrage.sousTitre })
  }

  for (const mention of [
    { champ: 'lieu' as const, texte: ouvrage.lieu },
    { champ: 'editeur' as const, texte: ouvrage.editeur },
    { champ: 'annee' as const, texte: ouvrage.annee === null ? null : String(ouvrage.annee) },
  ]) {
    if (!mention.texte) continue
    segments.push({ champ: null, composition: 'romain', texte: SEPARATEUR })
    segments.push({ champ: mention.champ, composition: 'romain', texte: mention.texte })
  }

  const dernier = segments[segments.length - 1]
  if (!PONCTUATION_FORTE.test(dernier.texte)) {
    segments.push({ champ: null, composition: 'romain', texte: '.' })
  }
  return segments
}

/** La référence en texte nu : ce que le lecteur lit, sans sa composition. Sert
 *  les tests et les métadonnées, ⛔ jamais le rendu, qui compose ses fragments. */
export function texteReference(
  ouvrage: OuvrageBibliographique,
  options: { avecAuteur?: boolean } = {},
): string {
  return segmentsReference(ouvrage, options).map((segment) => segment.texte).join('')
}
