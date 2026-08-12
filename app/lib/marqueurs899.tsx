import type { ReactNode } from 'react'

// Rendu des marqueurs éditoriaux INLINE portés par le texte recomposé de TR0009
// (Bible 899) : « lecture incertaine », « lacune », « ajout marginal ». Ce sont des
// faits du témoin, à conserver comme signal éditorial, mais SANS surcharger la lecture :
// le texte reste lisible ; le marqueur ne fait qu'un discret rappel visuel + infobulle.
// Les statuts techniques d'alignement (MATCH/OFFSET/review…) ne passent JAMAIS par ici.
//
// ⚠️ Les marqueurs peuvent être à CHEVAL sur plusieurs versets : la recomposition
// canonique découpe le texte par créneau, si bien qu'un « [lecture incertaine : … »
// peut s'ouvrir dans un verset et se fermer (« …] ») dans le suivant. Ce module se lit
// donc verset par verset avec un petit automate tolérant aux marqueurs non fermés ou
// non ouverts — jamais de crochet brut laissé à l'écran.

// Lecture incertaine : le fait éditorial se dit par la seule teinte grise — le mot
// s'efface d'un ton sous le texte établi, sans jamais le concurrencer. Plus de
// soulignement pointillé (jugé disgracieux) : la couleur suffit, l'infobulle porte
// le sens savant.
const STYLE_INCERTAINE: React.CSSProperties = {
  color: 'var(--cs-texte-second)',
}
// Lacune inline (au milieu d'un verset par ailleurs porté) : le manque se dit « ⟨ Lacune ⟩ »,
// entre chevrons, en romain effacé, d'un cran plus petit que le texte. Une ESPACE FINE
// insécable (U+202F) sépare le chevron du mot — jamais le chevron collé, jamais une espace
// pleine. Le motif exact reste à l'infobulle.
const STYLE_LACUNE: React.CSSProperties = {
  color: 'var(--cs-lacune)',
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '0.85em',
}
// Espace fine insécable (« espace fine » de la typographie française). Sert DEUX rôles :
// entre le chevron et « Lacune », et — quand la lacune coupe un mot — entre le marqueur et
// le fragment resté collé, pour ne l'attacher ni le détacher comme un mot entier.
const FINE = ' '
const MARQUEUR_LACUNE = `⟨${FINE}Lacune${FINE}⟩`   // ⟨ Lacune ⟩

// Un token = soit une ouverture « [<type> : », soit une fermeture « ] ».
const RE_TOKEN = /\[(lecture incertaine|lacune|ajout marginal)\s*:\s*|\]/gu
const RE_OUVERTURE = /\[(?:lecture incertaine|lacune|ajout marginal)\s*:/u

type Mode = 'normal' | 'incertaine' | 'ajout' | 'lacune'

function infobulle(mode: Mode): string {
  if (mode === 'ajout') return 'Ajout marginal du manuscrit'
  return 'Lecture incertaine (transcription du manuscrit)'
}

/**
 * Transforme le texte recomposé (couche du manuscrit) en nœuds React où les marqueurs
 * éditoriaux inline sont rendus discrètement. Le texte hors marqueur reste littéral.
 * Tolère les marqueurs à cheval : un verset qui commence par une fermeture « … ] » est
 * réputé prolonger une lecture incertaine ouverte au verset précédent.
 */
export function rendreMarqueurs899(texte: string): ReactNode {
  if (!texte) return texte

  // Le verset commence-t-il À L'INTÉRIEUR d'une portée ouverte au verset précédent ?
  // Signe : une fermeture « ] » apparaît avant toute ouverture « [type : ».
  const posOuverture = texte.search(RE_OUVERTURE)
  const posFermeture = texte.indexOf(']')
  let mode: Mode =
    posFermeture !== -1 && (posOuverture === -1 || posFermeture < posOuverture) ? 'incertaine' : 'normal'

  const noeuds: ReactNode[] = []
  let cle = 0
  let dernier = 0

  const pousser = (txt: string, m: Mode) => {
    if (!txt) return
    if (m === 'normal') noeuds.push(txt)
    else if (m === 'lacune') return // contenu d'une lacune = un motif, pas du texte lisible : masqué
    else noeuds.push(
      <span key={`m${cle++}`} title={infobulle(m)} style={STYLE_INCERTAINE}>{txt}</span>,
    )
  }

  RE_TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    pousser(texte.slice(dernier, m.index), mode)
    if (m[0] === ']') {
      // Fermeture d'une lacune collée à la suite (« …]er ») : une fine, pas un mot recollé.
      if (mode === 'lacune') {
        const apres = texte[m.index + 1]
        if (apres && !/\s/.test(apres)) noeuds.push(FINE)
      }
      mode = 'normal'
    } else if (m[1] === 'lacune') {
      // Ouverture collée au texte précédent (« por[… ») : une fine avant le marqueur.
      const avant = texte[m.index - 1]
      if (avant && !/\s/.test(avant)) noeuds.push(FINE)
      noeuds.push(
        <span key={`m${cle++}`} title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>{MARQUEUR_LACUNE}</span>,
      )
      mode = 'lacune'
    } else {
      mode = m[1] === 'ajout marginal' ? 'ajout' : 'incertaine'
    }
    dernier = m.index + m[0].length
  }
  pousser(texte.slice(dernier), mode)

  if (noeuds.length === 0) return texte
  if (noeuds.length === 1 && typeof noeuds[0] === 'string') return noeuds[0]
  return noeuds
}
