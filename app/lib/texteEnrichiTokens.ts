/**
 * LA GRAMMAIRE D'ENRICHISSEMENT DU CORPUS, lue À PLAT.
 *
 * `app/oeuvre/[id]/texteEnrichi.tsx` rend cette grammaire en NŒUDS REACT, ce qui ne
 * sert qu'à un navigateur. L'extraction d'une œuvre en `.docx` a besoin de la même
 * lecture, mais sous une forme que Word comprenne : une suite de FRAGMENTS, chacun
 * portant ses marques (gras, italique, exposant, petites capitales, lien).
 *
 * ⛔ LA GRAMMAIRE EST CELLE DE `texteEnrichi.tsx`, ET ELLE NE SE RÉÉCRIT PAS ICI. Le
 * motif est recopié, faute de pouvoir le partager sans emporter React dans un module
 * qui tourne au serveur ; c'est pourquoi `texteEnrichiTokens.test.ts` éprouve les deux
 * lectures l'une contre l'autre sur un jeu de cas : le texte NU d'un découpage doit
 * valoir, caractère pour caractère, ce que `texteSansEnrichissement` rend. Une
 * grammaire qui bougerait d'un côté seulement fait tomber ce test.
 *
 * ⚠️ `normaliserEspaces` n'est PAS appliqué ici. Le découpage se fait sur le texte tel
 * qu'il est passé, et c'est à l'appelant de le normaliser d'abord — comme le fait le
 * rendu de lecture, qui normalise en tête de `rendreTexteEnrichi`. Deux raisons : la
 * normalisation est un choix de SURFACE (le latin n'a pas les espaces du français), et
 * la mêler au découpage interdirait de comparer le résultat au texte source.
 */

/** Les marques qu'un fragment peut porter, toutes cumulables. */
export type MarquesTexte = {
  gras?: boolean
  italique?: boolean
  exposant?: boolean
  petitesCapitales?: boolean
  /** L'adresse d'un lien `[libellé](adresse)`. Le libellé reste le texte du fragment. */
  lien?: string
}

/** Un morceau de texte homogène : mêmes marques d'un bout à l'autre. */
export type FragmentEnrichi = MarquesTexte & { texte: string }

// Le motif de `rendreTexteEnrichi`, à l'identique. Les groupes, dans l'ordre :
//   1 **gras**   2 ++petites capitales++   3 ^^exposant^^   4 *italique*
//   5/6 [libellé](adresse)   7/8/9 siècle en chiffres romains   10 <i>…</i>
const MOTIF = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)|<i>([\s\S]*?)<\/i>/g

function ajouter(sortie: FragmentEnrichi[], texte: string, marques: MarquesTexte): void {
  if (!texte) return
  const dernier = sortie[sortie.length - 1]
  // Deux fragments voisins de mêmes marques n'en font qu'un : un `w:r` de moins dans
  // le document, et surtout un mot qui ne se coupe pas en deux au milieu d'une ligne.
  if (dernier && memesMarques(dernier, marques)) {
    dernier.texte += texte
    return
  }
  sortie.push({ ...marques, texte })
}

function memesMarques(a: MarquesTexte, b: MarquesTexte): boolean {
  return a.gras === b.gras
    && a.italique === b.italique
    && a.exposant === b.exposant
    && a.petitesCapitales === b.petitesCapitales
    && a.lien === b.lien
}

function decouper(texte: string, marques: MarquesTexte, sortie: FragmentEnrichi[]): void {
  // ⚠️ Une expression régulière `g` porte son propre curseur : la même instance ne peut
  // pas servir deux appels imbriqués. On en refait une à chaque niveau.
  const motif = new RegExp(MOTIF.source, 'g')
  let precedent = 0
  let trouve: RegExpExecArray | null
  while ((trouve = motif.exec(texte))) {
    if (trouve.index > precedent) ajouter(sortie, texte.slice(precedent, trouve.index), marques)
    if (trouve[1] !== undefined) decouper(trouve[1], { ...marques, gras: true }, sortie)
    else if (trouve[2] !== undefined) decouper(trouve[2], { ...marques, petitesCapitales: true }, sortie)
    else if (trouve[3] !== undefined) decouper(trouve[3], { ...marques, exposant: true }, sortie)
    else if (trouve[4] !== undefined) decouper(trouve[4], { ...marques, italique: true }, sortie)
    else if (trouve[5] !== undefined) decouper(trouve[5], { ...marques, lien: trouve[6] }, sortie)
    else if (trouve[7] !== undefined) {
      // « XIIIe siècle » : le nombre en petites capitales, l'ordinal en exposant, et
      // le mot « siècle » tel quel. Même partage que `siecles.tsx`.
      ajouter(sortie, trouve[7], { ...marques, petitesCapitales: true })
      ajouter(sortie, trouve[8], { ...marques, exposant: true })
      ajouter(sortie, trouve[9], marques)
    }
    // ⚠️ `<i></i>` existe dans le corpus (reliquat de coupe) : la paire vide disparaît
    // au lieu de s'afficher, exactement comme au rendu de lecture.
    else if (trouve[10] !== undefined) decouper(trouve[10], { ...marques, italique: true }, sortie)
    precedent = motif.lastIndex
  }
  if (precedent < texte.length) ajouter(sortie, texte.slice(precedent), marques)
}

/**
 * Découpe un texte enrichi en fragments plats.
 *
 * ⛔ Un lien dont l'adresse ne serait pas sûre n'est PAS filtré ici : ce module ne
 * connaît que la grammaire. C'est le composeur du document qui décide s'il pose un
 * hyperlien ou n'en garde que le libellé (voir `ooxml.ts`), comme le rendu de lecture
 * s'en remet à `hrefSur`.
 */
export function fragmentsEnrichis(texte: string, marques: MarquesTexte = {}): FragmentEnrichi[] {
  const sortie: FragmentEnrichi[] = []
  decouper(texte, marques, sortie)
  return sortie
}
