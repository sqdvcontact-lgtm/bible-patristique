// ── Le régime et la part d'une gravure Fillion : LA règle, en un seul endroit ──
//
// ⛔ LE RÉGIME ET LA PART SONT DES DONNÉES, ÉCRITES PAR LA CHAÎNE, LUES PAR LA PAGE.
//
// Jusqu'au 3 septembre 2026, la page de lecture DÉRIVAIT le régime à chaque
// affichage, à partir de trois champs de l'actif : son genre (`asset_kind`), sa
// découpe (`source_crop_box`) et sa légende imprimée. Cela a tenu tant qu'une
// seule chaîne remplissait ces champs. Le lot de 1 Samuel, sorti d'une autre
// chaîne le 31 août, posait `plate` sur vingt-trois vignettes, rangeait la largeur
// imprimée dans les métadonnées, et portait une catégorisation à dix étiquettes
// libres que rien ne lisait : la page composait une lyre de monnaie comme une
// planche hors-texte, au double de sa taille, dans un passe-partout.
//
// Depuis, `bible_edition_assets` porte deux colonnes, `regime` et `part_colonne`,
// contraintes par la base et NON NULLES. C'est ICI qu'elles se calculent, au
// moment où l'on inscrit un actif ou où l'on fabrique son fichier, et la page ne
// fait plus que les lire. ⛔ Aucune copie de ces bornes ne doit reparaître dans
// `app/` : la page compose ce qu'on lui dit, elle ne décide plus.
//
// Ce module est du JavaScript pur : la chaîne d'image (`detourer-gravures.mjs`),
// les scripts de charge et le contrôle (`inscrire-regime-gravures.mjs`)
// l'importent tels quels, et Vitest l'éprouve (`regime-gravure.test.mjs`).

/** Les trois façons dont une illustration se compose dans la page, dans le
 *  vocabulaire de la page. ⛔ Ce sont les seules valeurs que la base accepte. */
export const REGIMES = ['vignette', 'au-fil', 'hors-texte']

/** La page de Fillion est à deux colonnes : au delà de cette part de la page,
 *  une gravure les enjambe. */
export const LARGEUR_DEUX_COLONNES = 0.6

/** ⛔ DEUX BORNES POUR TOUTE ILLUSTRATION, QUEL QUE SOIT SON RÉGIME. Sous le
 *  plancher, une gravure dense cesse d'être lisible ; au delà du plafond, il ne
 *  reste plus de mesure au texte. Entre les deux, la part SUIT la largeur
 *  imprimée : ce que les bornes réduisent, ce sont les extrêmes, non la
 *  proportion de Fillion. */
export const PLANCHER_ILLUSTRATION = 0.36
export const PLAFOND_ILLUSTRATION = 0.88
/** Une VIGNETTE tient dans UNE colonne imprimée : elle ne peut pas prendre plus
 *  de la moitié du bloc sans cesser d'être ce qu'elle est. */
export const PLAFOND_VIGNETTE = 0.56
/** Le conteneur d'une gravure est le BLOC de lecture, 500 px, non l'axe. */
export const MESURE_COLONNE = 500

/** La largeur de la découpe, en fraction de la PAGE imprimée. Trois écritures
 *  coexistent dans le corpus, et on les lit toutes les trois, dans cet ordre :
 *  la boîte normalisée ; les bornes absolues avec la largeur de page ; et, pour
 *  le lot de 1 Samuel, le rapport que sa chaîne a rangé dans les métadonnées.
 *  ⚠️ Ce n'est pas deviner, c'est lire : chacune est une mesure posée par la
 *  chaîne qui a découpé. Faute de toutes, `null`. */
export function largeurImprimee(decoupe, metadata) {
  const n = decoupe?.normalized
  if (Array.isArray(n) && n.length === 4 && typeof n[0] === 'number' && typeof n[2] === 'number') {
    return n[2] - n[0]
  }
  const { left, right, page_width_px: page } = decoupe ?? {}
  if (typeof left === 'number' && typeof right === 'number' && typeof page === 'number' && page) {
    return (right - left) / page
  }
  const source = metadata?.source
  const rapport = source?.crop_width_ratio_of_page
  if (typeof rapport === 'number' && rapport > 0) return rapport
  const bn = source?.crop_box_normalized
  if (Array.isArray(bn) && bn.length === 4 && typeof bn[0] === 'number' && typeof bn[2] === 'number') {
    return bn[2] - bn[0]
  }
  return null
}

/** ⛔ C'EST FILLION QUI DIT CE QU'IL IMPRIME. Il écrit « (D'après une
 *  photographie.) » sous ses photogravures, et « (D'après un ivoire) »,
 *  « (Bas-relief romain) », « (Peinture égyptienne) » sous ses dessins. Une
 *  légende muette retombe au trait, le parti le moins coûteux : une photographie
 *  détourée se voit tout de suite, un dessin cadré passe inaperçu. */
export function estPhotographie(legende) {
  return /photograph/i.test(legende ?? '')
}

/** Le régime FORCÉ par la donnée, dans `metadata.regime`, quand la légende ne dit
 *  pas le procédé (deux demi-teintes de Marc ne nomment qu'un lieu). Une valeur
 *  inconnue est ignorée, jamais appliquée. */
export function regimeForce(metadata) {
  const v = metadata?.regime
  return REGIMES.includes(v) ? v : null
}

/** Le régime d'un actif QU'ON INSCRIT, avant qu'il ait un fichier : c'est la
 *  règle de la largeur imprimée et de la légende.
 *
 *  - une PLANCHE (`asset_kind = 'plate'`) est une page entière du volume, avec son
 *    filet gravé, sa légende imprimée et son papier : hors-texte, sans regarder
 *    sa découpe ;
 *  - une gravure qui ENJAMBE les deux colonnes ET que Fillion annonce d'après
 *    une photographie est une photogravure en ton continu : au-fil, cadrée ;
 *  - tout le reste est une vignette au trait, détourée — y compris une gravure
 *    large d'après un ivoire ou un bas-relief, et une gravure ÉTROITE d'après
 *    une photographie, qui est un bois fait d'après un cliché. */
export function regimeGravure({ assetKind, decoupe, legende, metadata }) {
  if (assetKind === 'plate') return 'hors-texte'
  const force = regimeForce(metadata)
  if (force) return force
  const largeur = largeurImprimee(decoupe, metadata)
  if (largeur === null) return 'vignette'
  return largeur > LARGEUR_DEUX_COLONNES && estPhotographie(legende) ? 'au-fil' : 'vignette'
}

/** Le régime QUE LE FICHIER SERVI RÉALISE, lu sur son profil de traitement. C'est
 *  la vérité pour un actif qui a déjà un fichier : un fichier détouré porte son
 *  dessin dans l'alpha et se compose en masque, un fichier cadré est opaque et
 *  garde son papier, une planche est une page. Composer autrement que le fichier
 *  n'est pas fabriqué rend un aplat d'encre ou un rectangle de papier. */
export function regimeDuProfil(profil) {
  if (!profil) return null
  if (profil === 'fillion-planche-hors-texte') return 'hors-texte'
  if (profil.includes('cadree')) return 'au-fil'
  if (profil.includes('detouree')) return 'vignette'
  return null
}

const borner = (part) => Math.min(PLAFOND_ILLUSTRATION, Math.max(PLANCHER_ILLUSTRATION, part))

/** La part du bloc de lecture qu'une gravure occupe, en largeur. Une PLANCHE
 *  prend le plafond, sa découpe étant la page elle-même ; une largeur inconnue
 *  retombe sur le plancher, jamais sur zéro ; le plafond de la vignette ne mord
 *  que sous le seuil des deux colonnes — une gravure qui les enjambe garde la
 *  proportion que Fillion lui donne. Arrondie au millième : c'est ce que la
 *  colonne `part_colonne` porte. */
export function partColonne(regime, largeur) {
  let part
  if (regime === 'hors-texte') part = PLAFOND_ILLUSTRATION
  else if (typeof largeur !== 'number') part = PLANCHER_ILLUSTRATION
  else if (largeur > LARGEUR_DEUX_COLONNES) part = borner(largeur)
  else part = borner(Math.min(PLAFOND_VIGNETTE, largeur))
  return Math.round(part * 1000) / 1000
}

/** ⛔ UN FICHIER SE SERT AU DOUBLE DE SA TAILLE D'AFFICHAGE, JAMAIS PLUS (charte).
 *  Au delà, le navigateur réduit une seconde fois derrière nous, et deux
 *  réductions successives moyennent les hachures fines en un gris mou. */
export function largeurAServir(part) {
  return Math.round(2 * part * MESURE_COLONNE)
}

/** Les deux valeurs à INSCRIRE pour un actif nouveau, d'un seul geste. */
export function regimeEtPart(actif) {
  const regime = regimeGravure(actif)
  return { regime, part_colonne: partColonne(regime, largeurImprimee(actif.decoupe, actif.metadata)) }
}
