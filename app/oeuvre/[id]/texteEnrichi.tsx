import { Fragment } from 'react'
import { STYLE_ROMAIN, STYLE_ORDINAL, sieclesEnHtml } from '@/app/lib/siecles'

export function normaliserEspaces(texte: string): string {
  // Charte §951-952 : fine insécable (U+202F) avant ; ! ? et dans les guillemets,
  // mais pleine insécable (U+00A0) avant les deux-points — le « : » n'est donc pas
  // converti en fine, il conserve son U+00A0.
  return texte
    .replace(/\u00A0([?!;])/g, '\u202F$1')
    .replace(/«\u00A0/g, '«\u202F')
    .replace(/\u00A0»/g, '\u202F»')
}

// ── Enrichissement minimal : **gras**, *italique*, ^^exposant^^, [texte](url).
// Syntaxe volontairement réduite, stockée directement dans
// segment_texte (ou les colonnes ref_nivX / ref_nivX_texte, ou oeuvres.titre).
// Toute nouvelle zone d'affichage du texte doit passer par rendreTexteEnrichi
// (lecture) ou texteSansEnrichissement (citation/copie/brut).
//
// `<i>…</i>` EST ADMIS EN PLUS. Le texte biblique porte son italique sous cette forme et non
// en `*…*` : chez Sacy, elle marque les mots ajoutés par le traducteur, absents de la Vulgate.
// C'est une information éditoriale, pas un ornement. Faute de la reconnaître ici, la page
// Bible affichait les balises en clair au milieu des versets.
// La paire vide `<i></i>` existe dans le corpus (reliquat de coupe) : d'où `*?` et non `+?`,
// afin qu'elle disparaisse au lieu de s'afficher.
// `transform` (optionnel) est appliqué à CHAQUE portion de texte naturel — les runs hors
// balise ET le contenu de **gras** / *ital* / `<i>` / lien. Il sert à la page Recherche pour
// y injecter le surlignage du mot cherché sans perdre l'enrichissement. Par défaut (lecture),
// c'est l'identité : le texte est rendu tel quel, comportement inchangé.
export function rendreTexteEnrichi(
  texte: string,
  transform?: (s: string, key: string) => React.ReactNode,
): React.ReactNode {
  const tf = transform ?? ((s: string) => s)
  const noeuds: React.ReactNode[] = []
  // `++petites capitales++` : même convention que les commentaires et les essais
  // (EditeurCommentaire, texteEnrichiEssai). Ajouté ici pour que le texte biblique en
  // porte aussi, l'éditeur de verset produisant désormais ce balisage.
  const regex = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)|<i>([\s\S]*?)<\/i>/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  // La clé est FIGÉE avant de construire l'élément (const key = k++). Sous le runtime JSX
  // automatique, l'attribut `key` est évalué APRÈS les enfants : mélanger `key={k}` (avec
  // un `k++` dans l'enfant) et `key={k++}` produisait des clés en double.
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) { const key = k++; noeuds.push(<Fragment key={key}>{tf(texte.slice(dernierIndex, m.index), `t${key}`)}</Fragment>) }
    if (m[1] !== undefined) { const key = k++; noeuds.push(<strong key={key}>{rendreTexteEnrichi(m[1], transform)}</strong>) }
    else if (m[2] !== undefined) { const key = k++; noeuds.push(<span key={key} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{rendreTexteEnrichi(m[2], transform)}</span>) }
    else if (m[3] !== undefined) { const key = k++; noeuds.push(<sup key={key}>{rendreTexteEnrichi(m[3], transform)}</sup>) }
    else if (m[4] !== undefined) { const key = k++; noeuds.push(<em key={key}>{rendreTexteEnrichi(m[4], transform)}</em>) }
    else if (m[5] !== undefined) { const key = k++; noeuds.push(
      <a key={key} href={m[6]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{rendreTexteEnrichi(m[5], transform)}</a>
    ) }
    else if (m[7] !== undefined) {
      noeuds.push(<span key={k++} style={STYLE_ROMAIN}>{m[7]}</span>)
      noeuds.push(<sup key={k++} style={STYLE_ORDINAL}>{m[8]}</sup>)
      noeuds.push(<Fragment key={k++}>{m[9]}</Fragment>)
    }
    else if (m[10] !== undefined) { if (m[10]) { const key = k++; noeuds.push(<em key={key}>{tf(m[10], `e${key}`)}</em>) } }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) { const key = k++; noeuds.push(<Fragment key={key}>{tf(texte.slice(dernierIndex), `t${key}`)}</Fragment>) }
  return noeuds
}

/** Conservé pour ses appelants ; la règle vit dans app/lib/siecles.tsx. */
export function formaterSieclesHTML(html: string): string {
  return sieclesEnHtml(html)
}

export function texteSansEnrichissement(texte: string): string {
  return texte
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\+\+(.+?)\+\+/g, '$1')
    .replace(/\^\^(.+?)\^\^/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Symétrique de rendreTexteEnrichi : sans cela, copier un verset de Sacy en emportait
    // les balises.
    .replace(/<i>([\s\S]*?)<\/i>/g, '$1')
}
