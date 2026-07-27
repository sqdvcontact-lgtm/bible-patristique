import { Fragment } from 'react'
import { STYLE_ROMAIN, STYLE_ORDINAL, sieclesEnHtml } from '@/app/lib/siecles'

export function normaliserEspaces(texte: string): string {
  return texte
    .replace(/\u00A0([?!;:])/g, '\u202F$1')
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
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(<Fragment key={k}>{tf(texte.slice(dernierIndex, m.index), `t${k++}`)}</Fragment>)
    if (m[1] !== undefined) noeuds.push(<strong key={k}>{tf(m[1], `b${k++}`)}</strong>)
    else if (m[2] !== undefined) noeuds.push(<span key={k} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{tf(m[2], `s${k++}`)}</span>)
    else if (m[3] !== undefined) noeuds.push(<sup key={k++}>{m[3]}</sup>)
    else if (m[4] !== undefined) noeuds.push(<em key={k}>{tf(m[4], `e${k++}`)}</em>)
    else if (m[5] !== undefined) noeuds.push(
      <a key={k} href={m[6]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{tf(m[5], `a${k++}`)}</a>
    )
    else if (m[7] !== undefined) {
      noeuds.push(<span key={k++} style={STYLE_ROMAIN}>{m[7]}</span>)
      noeuds.push(<sup key={k++} style={STYLE_ORDINAL}>{m[8]}</sup>)
      noeuds.push(<Fragment key={k++}>{m[9]}</Fragment>)
    }
    else if (m[10] !== undefined) { if (m[10]) noeuds.push(<em key={k}>{tf(m[10], `e${k++}`)}</em>) }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(<Fragment key={k}>{tf(texte.slice(dernierIndex), `t${k++}`)}</Fragment>)
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
