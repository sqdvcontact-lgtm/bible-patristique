/**
 * Les colonnes de `segments` que lit la page d'une œuvre — écrites UNE SEULE FOIS.
 *
 * ⚠️ Elles vivaient recopiées à TROIS endroits : le rendu serveur (`page.tsx`), le
 * rechargement d'une division par le client, et le chargement de l'apparat. Trois
 * listes identiques qu'aucun mécanisme n'obligeait à le rester. La charte a déjà payé
 * cette dérive ailleurs : la bibliothèque lisait ses œuvres sans `nb_signes` au rendu
 * serveur et avec au rechargement, si bien que la section « Opuscules » n'a JAMAIS
 * paru en ligne pendant que ses neuf tests passaient. D'où `bibliothequeSelects.ts`,
 * et d'où ce fichier.
 *
 * ⛔ Lire les colonnes d'un segment ailleurs qu'ici, c'est rouvrir la dérive.
 */

/**
 * ⚠️ Les deux dernières entrées ne sont pas des colonnes mais des CHAMPS de
 * `segment_metadata`, tirés par leur nom et renommés au passage. On ne prend pas la
 * colonne `jsonb` entière : elle porte une trentaine de clés par segment — offsets de
 * source, journal de contributions, justifications sémantiques — pour une page qui en
 * charge jusqu'à mille d'un coup. Deux champs suffisent, et ils portent tous deux la
 * composition des VERS (voir `app/lib/compositionVers.ts`) :
 *
 * - `alinea` ← `indent_inches` : la position du bord gauche de la ligne sur la page
 *   imprimée, relevée à l'océrisation. C'est d'elle que se déduisent les alinéas
 *   poétiques, qu'aucune règle ne saurait deviner.
 * - `strophe_avant` ← `stanza_before` : la ligne ouvre-t-elle une strophe. Renseignée
 *   chez Ceriziers, absente chez Mirandol, d'où le repli sur `paragraphe`.
 */
export const COLONNES_SEGMENT = [
  'id', 'id_texte', 'segment_key', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte',
  'nature', 'notes', 'paragraphe', 'rang', 'texte_original',
  'espace_textuel', 'join_before',
  'alinea:segment_metadata->>indent_inches',
  'strophe_avant:segment_metadata->>stanza_before',
  // Provenance de la colonne latine : `texte_original` est la copie d'un segment du
  // texte en langue originale de l'œuvre, et cette clé dit lequel. Sans elle, le
  // bilingue ne peut pas rendre à ce bloc l'apparat critique qui pend à son segment.
  'cle_original:segment_metadata->>original_segment_key',
] as const

/** La liste telle que PostgREST l'attend. */
export const SELECT_SEGMENT = COLONNES_SEGMENT.join(',')

/**
 * Les natures qui appartiennent au CORPS du texte.
 *
 * ⛔ `apparat_auteur` (prologue, avertissement, dédicace de l'auteur) en fait partie :
 * il se lit à sa place dans le texte. Son retrait de cette liste l'avait fait
 * disparaître du rendu le 18 août 2026 — le « Prologue de Rufin aux livres X et XI »
 * ne paraissait plus entre le titre du Livre X et « Chapitre I ». À ne pas confondre
 * avec `apparat_critique`, l'apparat de l'ÉDITEUR, qui a sa propre vue.
 */
export const NATURES_CORPS = [
  'texte', 'introduction', 'citation', 'dialogue', 'texte absent',
  'vers', 'rubrique', 'signature', 'apparat_auteur',
] as const
