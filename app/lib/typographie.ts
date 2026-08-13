// Espaces typographiques (charte §3.2). Fonctions PURES, testées dans typographie.test.ts.
// U+00A0 = espace insécable ; U+202F = espace fine insécable.

const FINE = '\u202F'
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
// charte typographique du site. Une fine insécable U+202F est imposée avant les
// ponctuations hautes françaises (: ; ! ?), qu'elles soient collées dans la source
// ou précédées d'une espace simple / insécable. Le deux-points n'est traité que
// lorsqu'il fonctionne comme ponctuation (suivi d'une espace, d'une fermeture ou de
// la fin) : les heures et références numériques de type 10:30 / Jn 3:16 restent donc
// intactes. Les apostrophes ASCII internes aux mots sont rendues en apostrophes
// typographiques, sans modifier la transcription stockée en base.
export function normaliserEspaces(texte: string): string {
  return horsUrls(texte, fragment => fragment
    .replace(/[ \u00A0\u202F]*([;!?])(?=[\s)\]»”"'….,;:]|$)/g, `${FINE}$1`)
    .replace(/[ \u00A0\u202F]*:(?=[\s)\]»”"'….,;!?]|$)/g, `${FINE}:`)
    .replace(/«[ \u00A0\u202F]*/g, `«${FINE}`)
    .replace(/[ \u00A0\u202F]*»/g, `${FINE}»`)
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
  )
}

// Texte en LANGUE ORIGINALE (latin, grec) : l'édition source porte la ponctuation
// COLLÉE (« valde: », « dixit: »), à l'anglaise, alors que le corpus français rend déjà
// une fine insécable avant les hautes ponctuations. Pour un couple bilingue homogène, on
// applique la même typographie (charte §3.1-3.2 : harmonisation mécanique « sans réécrire
// la langue de l'édition ») en AJOUTANT une fine insécable U+202F avant : ; ! ? et autour
// des guillemets. Idempotent : une espace déjà présente (simple, insécable ou fine) est
// ramenée à la fine unique ; rien n'est ajouté avant , . … .
export function normaliserEspacesOriginal(texte: string): string {
  return texte
    .replace(/[ \u00A0\u202F]*([:;!?])/g, `${FINE}$1`)
    .replace(/«[ \u00A0\u202F]*/g, `«${FINE}`)
    .replace(/[ \u00A0\u202F]*»/g, `${FINE}»`)
}
