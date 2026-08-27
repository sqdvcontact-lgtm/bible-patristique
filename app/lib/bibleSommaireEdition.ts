/**
 * Le SOMMAIRE d'une édition biblique commentée : ses pièces liminaires.
 *
 * Une édition savante ouvre sur ce qui n'appartient à aucun livre — page de
 * titre, « Du même auteur », imprimatur, dédicace, avant-propos, tableau de
 * transcription, abréviations, introduction générale, introduction du Testament,
 * introduction du groupe de livres. Ces pièces sont des blocs de PORTÉE plus
 * large que le livre (`bible`, `testament`, `book_group`), et c'est à cela
 * qu'on les reconnaît : ⛔ jamais à une liste d'intitulés tenue à la main.
 *
 * ⛔ Elles ne se lisent plus dans le fil d'un chapitre. Rattachées au premier
 * livre de leur tome, elles s'imprimaient toutes en tête de Genèse 1 : soixante
 * pièces, dont quinze notices bibliographiques, avant le premier verset de la
 * Bible. Elles se lisent désormais par le sommaire, chacune à sa place.
 *
 * Module PUR : il ne connaît ni Supabase, ni React. Il ne fait qu'une chose,
 * mais que rien d'autre ne sait faire — reconnaître qu'une suite de blocs est
 * UNE pièce.
 */

/** La portée d'un bloc, telle que la base la nomme. */
export type PorteeBloc = 'bible' | 'testament' | 'book_group' | 'book' | 'book_part'
  | 'chapter' | 'section' | 'pericope' | (string & {})

/** Ce qu'il faut d'un bloc pour composer le sommaire. Volontairement étroit :
 *  le texte des pièces ne se charge qu'à l'ouverture de l'une d'elles. */
export type BlocSommaire = {
  id: string
  blockKey: string
  heading: string | null
  scopeKind: PorteeBloc
  scopeLabel: string | null
  nature: string
  pageImprimee: string | null
  materialOrder: number
}

export type PieceLiminaire = {
  /** Clé d'adresse de la pièce : celle de son premier bloc. Stable, et c'est
   *  elle qui voyage dans l'URL. */
  cle: string
  /** Ce que le sommaire affiche : le nom de la pièce, sans sa pagination. */
  titre: string
  /** « Bible », « Ancien Testament », « Pentateuque » : ce que la pièce coiffe. */
  portee: string | null
  scopeKind: PorteeBloc
  /** Les blocs qui la composent, dans l'ordre matériel. */
  blocs: BlocSommaire[]
}

/** Les trois portées qui dépassent le livre. Une introduction de LIVRE n'en est
 *  pas : elle ouvre son livre, et c'est là qu'on la lit. */
export function estPieceGenerale(scopeKind: string): boolean {
  return scopeKind === 'bible' || scopeKind === 'testament' || scopeKind === 'book_group'
}

/**
 * Le nom de la pièce, tiré de l'intitulé imprimé.
 *
 * Fillion pagine ses liminaires dans leur intitulé même : « Avant-propos —
 * page X », « Du même auteur — notice 3 », « Dédicace à F.-M. Vigouroux —
 * page VI ». Ce qui précède le tiret NOMME la pièce, ce qui suit dit où l'on en
 * est dedans. Le sommaire ne retient que le nom.
 *
 * ⚠️ La coupure se fait au tiret ENTOURÉ d'espaces, comme partout ailleurs dans
 * le dépôt : un tiret collé appartient au mot (« Jésus-Christ »).
 */
export function nomDePiece(heading: string | null): string | null {
  const propre = heading?.trim()
  if (!propre) return null
  const coupure = propre.match(/^(.+?)\s+[—–-]\s+(.+)$/)
  return (coupure ? coupure[1] : propre).trim()
}

/**
 * Groupe les blocs liminaires en PIÈCES.
 *
 * Deux blocs consécutifs appartiennent à la même pièce quand ils partagent leur
 * portée ET l'une de ces deux marques :
 *
 *  - le même NOM (« Avant-propos — page IX », « Avant-propos — page X ») ;
 *  - la même PAGE IMPRIMÉE, pour un bloc d'apparat. C'est ainsi que « Apparat de
 *    la page 1 » rejoint « Introduction générale — § I », qu'il annote : les
 *    deux portent `printed_page_start = 1`. ⛔ Sans cette seconde règle, chaque
 *    apparat de bas de page ferait une entrée de sommaire, et il y en a
 *    trente-trois pour dix pages d'introduction générale.
 *
 * ⚠️ La consécution compte : deux imprimatur séparés par tout l'avant-propos
 * portent le même nom et restent deux pièces distinctes, l'un de Lyon en 1888,
 * l'autre de Paris en 1904.
 */
export function grouperPiecesLiminaires(blocs: readonly BlocSommaire[]): PieceLiminaire[] {
  const ordonnes = [...blocs]
    .filter((bloc) => estPieceGenerale(bloc.scopeKind))
    .sort((a, b) => a.materialOrder - b.materialOrder || a.blockKey.localeCompare(b.blockKey, 'fr'))

  const pieces: PieceLiminaire[] = []
  for (const bloc of ordonnes) {
    const nom = nomDePiece(bloc.heading)
    const courante = pieces[pieces.length - 1]
    const dernier = courante?.blocs[courante.blocs.length - 1]
    const memePortee = courante?.scopeKind === bloc.scopeKind
    // ⚠️ Le nom se compare à celui de la PIÈCE, non à celui du bloc précédent :
    // un apparat de bas de page s'intercale entre deux pages d'une même pièce,
    // et son intitulé (« Apparat de la page 1 ») romprait la chaîne.
    const memeNom = nom !== null && nom === courante?.titre
    const apparatDeLaMemePage = bloc.nature === 'notice'
      && bloc.pageImprimee !== null
      && bloc.pageImprimee === (dernier?.pageImprimee ?? null)
    if (courante && memePortee && (memeNom || apparatDeLaMemePage)) {
      courante.blocs.push(bloc)
      continue
    }
    pieces.push({
      cle: bloc.blockKey,
      // Un bloc sans intitulé ne peut pas se nommer lui-même : il prend le nom
      // de sa portée, faute de mieux, plutôt qu'une ligne vide au sommaire.
      titre: nom ?? bloc.scopeLabel ?? 'Pièce liminaire',
      portee: bloc.scopeLabel,
      scopeKind: bloc.scopeKind,
      blocs: [bloc],
    })
  }
  return pieces
}

/** Ce qui, dans la queue d'un intitulé, ne dit que la PLACE dans l'imprimé. */
const PAGINATION = /^(pages?|feuillets?|folios?|notices?|planches?)\s+[0-9ivxlcdm]+\.?$/i

/**
 * L'intitulé d'un bloc À L'INTÉRIEUR de sa pièce, le titre de la pièce étant
 * déjà écrit au-dessus.
 *
 *  - « Avant-propos — page IX » sous « Avant-propos » : plus rien. La queue ne
 *    dit que la pagination de l'imprimé, et trois pages d'un même texte n'ont pas
 *    à s'annoncer trois fois.
 *  - « Introduction générale — § I. Ce qu'est la Bible » : « § I. Ce qu'est la
 *    Bible ». La queue titre vraiment, elle reste.
 *  - « Apparat de la page 1 », qui ne porte pas le nom de la pièce : inchangé.
 */
export function intituleDansPiece(heading: string | null, titrePiece: string): string | null {
  const propre = heading?.trim()
  if (!propre) return null
  // Un bloc qui porte EXACTEMENT le nom de la pièce ne le redit pas : « Page de
  // titre » s'écrivait deux fois de suite, en titre puis en intitulé.
  if (propre === titrePiece) return null
  const coupure = propre.match(/^(.+?)\s+[—–-]\s+(.+)$/)
  if (!coupure || coupure[1].trim() !== titrePiece) return propre
  const queue = coupure[2].trim()
  return PAGINATION.test(queue) ? null : queue
}

/** La pièce qu'une adresse désigne, ou rien si la clé n'en désigne aucune. */
export function pieceParCle(
  pieces: readonly PieceLiminaire[],
  cle: string | null | undefined,
): PieceLiminaire | null {
  if (!cle) return null
  return pieces.find((piece) => piece.cle === cle) ?? null
}
