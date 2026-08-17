import { Fragment } from 'react'
import { STYLE_ROMAIN, STYLE_ORDINAL, sieclesEnHtml } from '@/app/lib/siecles'
import { normaliserEspaces } from '@/app/lib/typographie'

// Espaces typographiques (français + langue originale) : logique pure, testée, dans
// app/lib/typographie.ts. Ré-exportée ici pour les nombreux appelants historiques.
export { normaliserEspaces, normaliserEspacesOriginal } from '@/app/lib/typographie'

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
  texteBrut: string,
  transform?: (s: string, key: string) => React.ReactNode,
): React.ReactNode {
  // Toute la lecture passe par ici : c'est donc ICI que l'espacement des hautes
  // ponctuations et des guillemets s'harmonise, et non à chaque appelant. Avant,
  // seule la page d'œuvre appelait `normaliserEspaces` : la Bible, les péricopes,
  // le panneau patristique, les prélèvements et la polyglotte gardaient l'espace
  // pleine chasse du corpus, deux fois trop large pour une fine française.
  // Le remplacement est caractère pour caractère, donc les indices que `transform`
  // utilise pour surligner restent valides.
  const texte = normaliserEspaces(texteBrut)
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
    else if (m[3] !== undefined) { const key = k++; noeuds.push(<sup key={key} style={STYLE_ORDINAL}>{rendreTexteEnrichi(m[3], transform)}</sup>) }
    else if (m[4] !== undefined) { const key = k++; noeuds.push(<em key={key}>{rendreTexteEnrichi(m[4], transform)}</em>) }
    else if (m[5] !== undefined) { const key = k++; noeuds.push(
      <a key={key} href={m[6]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>{rendreTexteEnrichi(m[5], transform)}</a>
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
