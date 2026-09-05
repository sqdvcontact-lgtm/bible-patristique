import { noticeDUneOeuvre, type OeuvreCitee } from './noticeOeuvre'
import { fragmentsReference, SEPARATEUR } from './referenceBibliographique'
import {
  echapperHtml,
  fragmentsSansPointFinal,
  htmlFragments,
  texteFragments,
} from './referenceBibliographiqueSorties'
import { normaliserEspaces } from './typographie'
import { sansCesures } from './cesuresLatines'

export { resserrerTiretsAnnees } from './noticeOeuvre'

// ── Mise en forme des citations (copier / coller, et affichage des prélèvements) ──
// Règles arrêtées par l'auteur, appliquées à UN seul endroit :
//  1. le titre de l'œuvre est en italiques (rendu HTML pour le collage riche) ;
//  2. en fin de citation, avant le guillemet fermant, toute ponctuation est remplacée
//     par un point, SAUF « ? » et « ! » ; en l'absence de ponctuation, un point est
//     ajouté ; si le dernier signe est une parenthèse ou un crochet fermant, on le
//     conserve et on ajoute un point après ;
//  3. les fourchettes de dates s'écrivent « 1984-1986 » (jamais « 1984 – 1986 ») ;
//  4. les guillemets français internes deviennent des guillemets anglais (la citation
//     est déjà encadrée par « … »).
//
// Regex écrites avec des échappements \u explicites : U+202F fine insécable,
// U+00A0 insécable, U+2010–U+2015 tirets typographiques, U+2212 signe moins,
// U+2026 points de suspension, U+00B7 point médian, U+201C/U+201D guillemets anglais.

// Guillemets français internes → guillemets anglais (courbes).
export function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[  \s]*/g, '“')
    .replace(/[  \s]*»/g, '”')
}

// Ponctuation finale, juste avant le guillemet fermant (voir règle 2).
export function normaliserPonctuationFinale(texte: string): string {
  const t = texte.replace(/\s+$/, '')
  if (!t) return t
  const dernier = t[t.length - 1]
  if (dernier === '?' || dernier === '!') return t
  if (dernier === ')' || dernier === ']') return t + '.'
  // Ponctuation finale (une éventuelle suite) remplacée par un seul point.
  if (/[.,;:…·‐-―−]/.test(dernier)) {
    return t.replace(/[.,;:…·‐-―−\s]+$/, '') + '.'
  }
  // Lettre, guillemet fermant, chiffre… : pas de ponctuation à remplacer, on ajoute un point.
  return t + '.'
}

// Majuscule à l'initiale du premier mot si elle manque (une citation extraite en cours de
// phrase commence souvent par une minuscule). On saute les marques de tête (espaces,
// guillemets, parenthèses, balises d'enrichissement `<i>`…, astérisques de balisage) pour
// viser la première VRAIE lettre ; `\p{Ll}` ne matchant que les minuscules, une initiale
// déjà capitale (ou un chiffre) reste intacte.
export function capitaliserInitiale(texte: string): string {
  return texte.replace(
    /^((?:<\/?[a-zA-Z]+>|[\s«»“”‘’"'([*_+^—–-])*)(\p{Ll})/u,
    (_m, prefixe: string, lettre: string) => {
      const capitale = lettre.toUpperCase()
      // ⛔ La capitalisation ne change JAMAIS la longueur du texte. Elle sert aussi le
      // volet patristique, dont le rendu pose les appels de note par OFFSET : une lettre
      // dont la capitale s'écrit en deux signes (« ß » → « SS ») décalerait tout ce qui
      // suit. On la laisse alors telle quelle : une initiale minuscule vaut mieux qu'un
      // appel de note déplacé.
      return capitale.length === lettre.length ? prefixe + capitale : prefixe + lettre
    },
  )
}

// Texte cité prêt à être encadré : guillemets internes convertis, ponctuation finale
// normalisée, initiale capitalisée si elle manque.
export function preparerTexteCitation(texte: string): string {
  // Même espacement qu'à la lecture : le presse-papiers emporte le texte BRUT,
  // pas le rendu. Sans cela, une citation collée dans un traitement de texte
  // ramenait l'espace pleine chasse du corpus là où l'écran montrait une fine.
  // Une césure conditionnelle est une affaire de mise en page : elle n'a rien à
  // faire dans un presse-papiers, où elle voyagerait en caractère invisible.
  return sansCesures(normaliserEspaces(capitaliserInitiale(normaliserPonctuationFinale(convertirGuillemetsInternes(texte.trim())))))
}

/** Ce que la page tient d'une œuvre pour la citer : les champs du catalogue, sous les
 *  noms que les boutons de copie emploient. C'est le type de l'ADAPTATEUR
 *  (`noticeOeuvre.ts`), gardé ici sous son nom historique. */
export type InfoCitation = OeuvreCitee

export type CitationRendue = { texte: string; html: string }

/** La mention de provenance qui ferme la référence, avant le passage cité. */
const MENTION_SITE = 'disponible sur le site Corpus Scriptura'

/**
 * Citation d'un passage patristique, en DEUX formes : `texte` (plein-texte,
 * presse-papiers) et `html` (italiques et petites capitales, pour un collage riche
 * dans un traitement de texte).
 *
 * ⛔ LA RÉFÉRENCE NE SE RECOMPOSE PLUS ICI. Elle vient du MOTEUR bibliographique du
 * site (`referenceBibliographique.ts`), par l'adaptateur qui fait d'une œuvre une
 * notice (`noticeOeuvre.ts`) — le même moteur qui compose la bibliographie d'une
 * péricope, l'apparat d'une œuvre et la fiche d'un ouvrage. Ce que le lecteur colle
 * est donc, au mot près, ce qu'il avait sous les yeux.
 *
 * ⚠️ Jusqu'au 5 septembre 2026 cette fonction avait son ordre à elle — l'éditeur
 * avant la collection, la collection toute nue, la ville après l'éditeur, le
 * point-virgule brut du catalogue entre deux maisons —, et elle était le dernier
 * endroit du site où une référence s'écrivait à la main.
 *
 * ⚠️ Le POINT FINAL de la notice tombe : la phrase continue par la provenance, puis
 * par le passage cité.
 */
export function citationPatristique(texte: string, info: InfoCitation): CitationRendue {
  const fragments = fragmentsSansPointFinal(fragmentsReference(noticeDUneOeuvre(info)))
  const cite = preparerTexteCitation(texte)
  const reference = texteFragments(fragments)
  const referenceHtml = htmlFragments(fragments)
  return {
    texte: [reference, MENTION_SITE].filter(Boolean).join(SEPARATEUR) + ' : « ' + cite + ' »',
    html: [referenceHtml, echapperHtml(MENTION_SITE)].filter(Boolean).join(SEPARATEUR)
      + ' : « ' + echapperHtml(cite) + ' »',
  }
}

// Citation d'un passage biblique : « texte » (référence). Pas de titre ni de dates,
// mais mêmes règles de guillemets internes et de ponctuation finale.
export function citationBiblique(texte: string, reference: string): string {
  return '« ' + preparerTexteCitation(texte) + ' » (' + reference + ')'
}

// Écrit une citation dans le presse-papiers en conservant l'italique du titre
// (text/html), avec repli en plein-texte si l'API riche n'est pas disponible.
export async function copierCitation(res: CitationRendue | string): Promise<void> {
  const plain = typeof res === 'string' ? res : res.texte
  const html = typeof res === 'string' ? null : res.html
  try {
    if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
      return
    }
  } catch {
    // repli plein-texte ci-dessous
  }
  await navigator.clipboard.writeText(plain)
}
