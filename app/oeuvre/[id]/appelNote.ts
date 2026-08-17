// Appels de note : ce qui s'en dit sans React. Fonctions PURES, testées dans
// `appelNote.test.ts`. L'info-bulle et le moteur de rendu restent dans
// `OeuvreClient`, qui importe ce module.
//
// Le marqueur stocké en base a la forme `[[A]]`, `[[81]]` — c'est la clé de la
// note, jamais ce que lit le lecteur.

import type React from 'react'

// Le sommaire est une navigation compacte : la note y serait un appel qu'on ne
// peut pas lire (le sommaire ne porte pas le texte des notes) et qui hache
// l'intitulé. Elle est donc masquée là, et là seulement, l'appel restant actif
// dans le titre développé du corps. L'espace qui précède part avec le marqueur,
// sans quoi l'intitulé garderait un blanc double.
export function titreSansAppelsDeNote(texte: string) {
  return texte.replace(/[ \t]*\[\[[A-Z0-9]+\]\]/g, '')
}

// ── Forme de l'appel selon l'endroit où il se trouve ──────────────────────────
// L'appel prend le style du texte qui l'accueille : il hérite la police et
// l'italique du contexte (un chapeau en italique porte un appel en italique) et
// se règle en corps sur lui. Dans la prose, il garde sa teinte brune. Dans un
// titre de haut rang, cette teinte devient une tache : l'intitulé est court et
// composé large, l'appel y prend donc l'encre du titre, plus discret et
// proportionnellement plus petit. Les titres de rang bas (niveaux 3 et 4),
// composés à la taille du texte, gardent la forme du corps.
//
// ⛔ JAMAIS de pointillé (ni de soulignement d'aucune sorte) sous un appel de
// note : règle d'auteur, sans exception. L'exposant et la teinte suffisent à le
// signaler. Ne pas le réintroduire au prétexte d'indiquer qu'il est cliquable.
export type VarianteAppelNote = 'corps' | 'titre'

const FORME_APPEL: Record<VarianteAppelNote, React.CSSProperties> = {
  corps: { fontSize: '0.60em', color: '#8a6a3e' },
  titre: { fontSize: '0.42em', color: 'currentColor', opacity: 0.55 },
}

export function styleAppelNote(variante: VarianteAppelNote = 'corps'): React.CSSProperties {
  return {
    cursor: 'help',
    fontFamily: 'inherit',
    fontStyle: 'inherit',
    userSelect: 'none',
    letterSpacing: 0,
    display: 'inline-block',
    lineHeight: 1,
    padding: '0 1px',
    ...FORME_APPEL[variante],
  }
}
