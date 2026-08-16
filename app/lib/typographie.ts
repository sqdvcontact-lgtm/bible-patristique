// Espaces typographiques (charte §3.2). Fonctions PURES, testées dans typographie.test.ts.
// U+00A0 = espace insécable ; U+202F = espace fine insécable.

const FINE = '\u202F'
const NBSP = '\u00A0'
// Le point-virgule est exclu de la destination protégée : dans le texte courant,
// il sert très majoritairement de ponctuation après un lien et doit donc rester
// disponible pour la normalisation française.
const URL_OU_MAIL = /(https?:\/\/[^\s);]+|mailto:[^\s);]+)/g

/**
 * Applique une transformation au texte courant sans modifier les destinations d'URL.
 * `normaliserEspaces` est appelé avant l'interprétation des liens Markdown : une
 * normalisation à l'intérieur de `https://…` pourrait donc casser le lien.
 */
function horsUrls(texte: string, transformer: (fragment: string) => string): string {
  return texte
    .split(URL_OU_MAIL)
    .map(fragment => /^(?:https?:\/\/|mailto:)/.test(fragment) ? fragment : transformer(fragment))
    .join('')
}

// Texte FRANÇAIS : la couche source reste diplomatique ; l'affichage, lui, suit la
// charte typographique du site. Une espace insécable U+00A0 est imposée avant le deux-points et une fine insécable U+202F avant
// les autres ponctuations hautes françaises (; ! ?), qu'elles soient collées dans la source
// ou précédées d'une espace simple / insécable. Le deux-points n'est traité que
// lorsqu'il fonctionne comme ponctuation (suivi d'une espace, d'une fermeture ou de
// la fin) : les heures et références numériques de type 10:30 / Jn 3:16 restent donc
// intactes. Les espaces immédiatement à l'intérieur des parenthèses sont supprimées.
// Les apostrophes ASCII internes aux mots sont rendues en apostrophes typographiques,
// sans modifier la transcription stockée en base.
export function normaliserEspaces(texte: string): string {
  return horsUrls(texte, fragment => fragment
    .replace(/[ \u00A0\u202F]*([;!?])(?=[\s)\]»”"'….,;:]|$)/g, `${FINE}$1`)
    .replace(/[ \u00A0\u202F]*:(?=[\s)\]»”"'….,;!?]|$)/g, `${NBSP}:`)
    .replace(/«[ \u00A0\u202F]*/g, `«${NBSP}`)
    .replace(/[ \u00A0\u202F]*»/g, `${NBSP}»`)
    .replace(/\([ \u00A0\u202F]+/g, '(')
    .replace(/[ \u00A0\u202F]+\)/g, ')')
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
  )
}


/** Normalise uniquement des variantes glyphiques de présentation d'une édition non médiévale. */
export function normaliserGlyphesEdition(texte: string): string {
  return texte
    .replace(/ſ/g, 's')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/ﬅ/g, 'st')
    .replace(/ﬆ/g, 'st')
}

/** Couche éditoriale des éditions non médiévales. Ne pas employer sur une transcription diplomatique médiévale. */
export function normaliserTypographieEdition(texte: string, langueOriginale = false): string {
  const glyphes = normaliserGlyphesEdition(texte)
  return langueOriginale ? normaliserEspacesOriginal(glyphes) : normaliserEspaces(glyphes)
}

// Texte en LANGUE ORIGINALE (latin, grec) : même convention Corpus Scriptura pour les
// éditions non médiévales. U+00A0 avant le deux-points et autour des guillemets français ;
// U+202F avant ; ! ?. Cette fonction est idempotente et ne modernise jamais la langue.
export function normaliserEspacesOriginal(texte: string): string {
  return texte
    .replace(/[ \u00A0\u202F]*([;!?])/g, `${FINE}$1`)
    .replace(/[ \u00A0\u202F]*:/g, `${NBSP}:`)
    .replace(/«[ \u00A0\u202F]*/g, `«${NBSP}`)
    .replace(/[ \u00A0\u202F]*»/g, `${NBSP}»`)
}
