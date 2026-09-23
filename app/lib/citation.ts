import { noticeDUneOeuvre, type OeuvreCitee } from './noticeOeuvre'
import { fragmentsReference, SEPARATEUR, type FragmentNotice } from './referenceBibliographique'
import {
  echapperHtml,
  fragmentsSansPointFinal,
  htmlFragments,
  texteFragments,
} from './referenceBibliographiqueSorties'
import { sansAppelsDeNote } from './appelsDeNote'
import { normaliserEspaces } from './typographie'
import { sansCesures } from './cesuresLatines'
import { fragmentsEnrichis } from './texteEnrichiTokens'

export { resserrerTiretsAnnees } from './noticeOeuvre'

// ── Mise en forme des citations (copier / coller, et affichage des prélèvements) ──
// Règles arrêtées par l'auteur, appliquées à UN seul endroit :
//  1. le titre de l'œuvre est en italiques (rendu HTML pour le collage riche) ;
//  2. en fin de citation, avant le guillemet fermant, toute ponctuation TOMBE, et rien
//     ne la remplace — SAUF « ? » et « ! », qui appartiennent à la phrase citée. Le
//     POINT de la phrase se pose APRÈS la référence, hors des guillemets ;
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

// Les marques d'enrichissement qui peuvent FERMER un texte. ⚠️ La ponctuation finale se
// juge SOUS elles : un verset de Sacy s'achève tantôt par « … <i>ajouté</i>. », tantôt par
// « … <i>ajouté.</i> », et le dernier signe de la chaîne est alors un chevron fermant.
const MARQUES_FINALES = /(?:<\/i>|<\/em>|<\/b>|<\/strong>|\*\*|\+\+|\^\^|\*)+$/

// Ponctuation finale, juste avant le guillemet fermant (voir règle 2).
export function normaliserPonctuationFinale(texte: string): string {
  const t = texte.replace(/\s+$/, '')
  if (!t) return t
  // La queue de marques ne se juge pas : on la met de côté, et on la repose telle quelle.
  const queue = t.match(MARQUES_FINALES)?.[0] ?? ''
  const corps = queue ? t.slice(0, t.length - queue.length) : t
  const dernier = corps[corps.length - 1]
  if (!dernier) return t
  // ⛔ « ? » et « ! » appartiennent à la PHRASE citée : ils restent dans les guillemets.
  if (dernier === '?' || dernier === '!') return t
  // ⛔ Toute autre ponctuation finale TOMBE, et RIEN ne la remplace — pas même un point.
  // Le point de la phrase se pose après la référence, hors des guillemets (règle 2).
  if (/[.,;:…·‐-―−]/.test(dernier)) {
    return corps.replace(/[.,;:…·‐-―−\s]+$/, '') + queue
  }
  // Lettre, parenthèse ou crochet fermant, guillemet, chiffre… : rien à retirer, rien à
  // ajouter. ⛔ On n'ajoute plus de point : il appartient à la phrase, non à la citation.
  return t
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

// Texte cité prêt à être encadré : appels de note retirés, guillemets internes
// convertis, ponctuation finale normalisée, initiale capitalisée si elle manque.
export function preparerTexteCitation(texte: string): string {
  // Même espacement qu'à la lecture : le presse-papiers emporte le texte BRUT,
  // pas le rendu. Sans cela, une citation collée dans un traitement de texte
  // ramenait l'espace pleine chasse du corpus là où l'écran montrait une fine.
  // Une césure conditionnelle est une affaire de mise en page : elle n'a rien à
  // faire dans un presse-papiers, où elle voyagerait en caractère invisible.
  //
  // ⛔ LES APPELS DE NOTE PARTENT EN PREMIER, et l'ordre n'est pas indifférent.
  // Ils tombent, par la règle du site, JUSTE AVANT la ponctuation finale
  // (« mot[[12]]. ») et parfois en tête de passage : les laisser fausserait les
  // deux règles qui suivent. `normaliserPonctuationFinale` lirait « ] » comme
  // dernier signe et ajouterait un point après le marqueur ; et
  // `capitaliserInitiale`, dont les marques de tête admettent le crochet,
  // buterait sur le chiffre et laisserait la minuscule. Voir `sansAppelsDeNote`.
  return sansCesures(normaliserEspaces(capitaliserInitiale(normaliserPonctuationFinale(
    convertirGuillemetsInternes(sansAppelsDeNote(texte).trim()),
  ))))
}

/**
 * Le passage cité en DEUX formes : le texte NU et son HTML.
 *
 * ⛔ LE PRESSE-PAPIERS N'EMPORTE JAMAIS LE BALISAGE DU CORPUS. Le texte biblique porte
 * son italique en `<i>…</i>` — chez Sacy, elle marque les mots ajoutés par le traducteur,
 * absents de la Vulgate — et le reste du corpus en `*…*`, `**…**`, `++…++`, `^^…^^` :
 * copié tel quel, un verset emportait ses balises EN CLAIR dans le document du lecteur.
 *
 * ⚠️ Les deux formes viennent du MÊME découpage (`fragmentsEnrichis`, la grammaire
 * d'enrichissement du corpus) : le plein-texte et le collage riche ne peuvent donc pas
 * dire deux choses différentes. Un texte déjà dépouillé le traverse sans rien changer,
 * ce qui laisse intacts les appelants qui nettoient déjà leur texte.
 *
 * ⛔ Un LIEN perd son adresse et garde son libellé : une citation n'emporte pas d'URL.
 */
function citeEnrichi(texte: string): CitationRendue {
  const fragments = fragmentsEnrichis(texte)
  return {
    texte: fragments.map(f => f.texte).join(''),
    html: fragments.map(f => {
      let h = echapperHtml(f.texte)
      if (f.exposant) h = `<sup>${h}</sup>`
      if (f.italique) h = `<i>${h}</i>`
      // ⚠️ Hors du site il n'y a plus de feuille de styles : la petite capitale se pose
      // en ligne, comme le fait déjà `htmlFragments` pour la notice.
      if (f.petitesCapitales) h = `<span style="font-variant: small-caps">${h}</span>`
      if (f.gras) h = `<b>${h}</b>`
      return h
    }).join(''),
  }
}

/** Ce que la page tient d'une œuvre pour la citer : les champs du catalogue, sous les
 *  noms que les boutons de copie emploient. C'est le type de l'ADAPTATEUR
 *  (`noticeOeuvre.ts`), gardé ici sous son nom historique. */
export type InfoCitation = OeuvreCitee

export type CitationRendue = { texte: string; html: string }

/** La mention de provenance qui ferme la référence, avant le passage cité. */
const MENTION_SITE = 'disponible sur le site Corpus Scriptura'

/**
 * La référence autonome d'une œuvre telle que Corpus Scriptura la compose.
 *
 * Elle reprend exactement le moteur bibliographique qui ferme une citation de passage,
 * mais s'arrête avant les deux-points et le texte cité. La fiche d'une œuvre peut ainsi
 * proposer une référence à copier sans inventer une seconde ponctuation ni un second
 * ordre de champs.
 */
export function fragmentsReferenceCanoniqueOeuvre(info: InfoCitation): FragmentNotice[] {
  const fragments = fragmentsSansPointFinal(fragmentsReference(noticeDUneOeuvre(info)))
  // ⚠️ La mention du site n'a ni champ ni style : c'est de la ponctuation de phrase,
  // qui hérite de la séquence où elle tombe, comme les liants du moteur.
  const mention = texteFragments(fragments) ? SEPARATEUR + MENTION_SITE : MENTION_SITE
  return [...fragments, { champ: null, style: null, composition: 'romain', texte: `${mention}.` }]
}

export function referenceCanoniqueOeuvre(info: InfoCitation): string {
  return texteFragments(fragmentsReferenceCanoniqueOeuvre(info))
}

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
export function citationPatristique(texte: string | readonly string[], info: InfoCitation): CitationRendue {
  const fragments = fragmentsSansPointFinal(fragmentsReference(noticeDUneOeuvre(info)))
  // ⛔ PLUSIEURS PASSAGES QU'UN TITRE SÉPARE FONT PLUSIEURS CITATIONS (charte § 38.8.1) : sous
  // la même référence, chacun entre ses guillemets et sur sa ligne. Les coller ferait lire
  // d'un trait deux parties de l'œuvre.
  const cites = (typeof texte === 'string' ? [texte] : texte)
    .map(preparerTexteCitation)
    .filter(cite => cite !== '')
    .map(citeEnrichi)
  const reference = texteFragments(fragments)
  const referenceHtml = htmlFragments(fragments)
  // ⛔ LE POINT FERME LA PHRASE, APRÈS le guillemet fermant (règle 2) : la citation ne
  // garde sa ponctuation finale que si c'est un « ? » ou un « ! ».
  return {
    texte: [reference, MENTION_SITE].filter(Boolean).join(SEPARATEUR) + ' : '
      + cites.map(cite => '« ' + cite.texte + ' ».').join('\n\n'),
    html: [referenceHtml, echapperHtml(MENTION_SITE)].filter(Boolean).join(SEPARATEUR) + ' : '
      + cites.map(cite => '« ' + cite.html + ' ».').join('<br><br>'),
  }
}

/**
 * Citation d'un passage biblique : « texte » (référence).
 *
 * Pas de titre ni de dates, mais mêmes règles de guillemets internes et de ponctuation
 * finale. ⛔ LE POINT SE POSE APRÈS LA RÉFÉRENCE, hors des guillemets (règle 2).
 *
 * ⚠️ Elle rend DEUX formes, comme `citationPatristique` : le texte biblique porte son
 * italique en balises, et sans forme riche le lecteur collait ces balises en clair.
 */
export function citationBiblique(texte: string, reference: string): CitationRendue {
  const cite = citeEnrichi(preparerTexteCitation(texte))
  return {
    texte: '« ' + cite.texte + ' » (' + reference + ').',
    html: '« ' + cite.html + ' » (' + echapperHtml(reference) + ').',
  }
}

/**
 * Écrit les DEUX formes dans le presse-papiers, et dit si elle y est parvenue.
 *
 * ⚠️ Exportée pour que `BoutonCopierTexte` la partage : le collage riche ne peut pas
 * s'écrire deux fois, sous peine de voir une surface emporter l'italique et l'autre non.
 * ⛔ Elle ne REMPLACE aucun repli : rendre `false` laisse l'appelant choisir le sien —
 * `writeText` ici, le champ temporaire de `BoutonCopierTexte` là.
 */
export async function copierEnFormeRiche(plain: string, html: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
    return true
  } catch {
    return false
  }
}

// Écrit une citation dans le presse-papiers en conservant l'italique du titre ET celle
// du passage cité (text/html), avec repli en plein-texte si l'API riche n'est pas là.
export async function copierCitation(res: CitationRendue | string): Promise<void> {
  const plain = typeof res === 'string' ? res : res.texte
  const html = typeof res === 'string' ? null : res.html
  if (html && await copierEnFormeRiche(plain, html)) return
  await navigator.clipboard.writeText(plain)
}
