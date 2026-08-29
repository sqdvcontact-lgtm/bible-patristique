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
  // Le numéro du VERSET biblique, écrit à la main sur un segment de nature `verset`
  // (voir `app/lib/compositionVersets.ts`). ⛔ Pas `verse_number` : cette clé-là porte
  // déjà le rang du VERS dans son poème, chez Ceriziers.
  'numero_verset:segment_metadata->>biblical_verse_number',
  // La FORME du segment — `vers` ou rien. ⛔ C'est un axe SÉPARÉ de la nature, et il
  // le faut : dans l'apparat, la nature vaut déjà `apparat_critique` et ne peut pas
  // dire en plus que le passage est en vers. Voir `estEnVers`, qui lit cette clé ET
  // la nature héritée `vers`.
  'forme:segment_metadata->>forme',
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
 *
 * ⛔ `lemme` en fait partie POUR LA MÊME RAISON, et son absence coûtait la même chose.
 * C'est le verset biblique qu'un commentaire pose en tête du paragraphe qu'il commente.
 * Quarante-sept segments le portent, tous dans le *Commentaire sur Jonas* de Jérôme
 * (`TXT_A0051O0022_FR_1879_BAREILLE`), œuvre PUBLIÉE, tous au rang 1 de leur
 * paragraphe — et aucun n'était chargé. Le lecteur recevait donc le commentaire sans
 * le texte commenté : la division « Jonas 1, 1 » ouvrait sur « La traduction des
 * Septante est la même, à cette différence près… », qui compare une traduction à un
 * verset absent. Relevé et corrigé le 29 août 2026.
 *
 * ⚠️ Un lemme se lit AU FIL DU TEXTE, comme n'importe quel paragraphe : décision de
 * l'auteur du 20 août 2026 (charte § 3.8) — « le lemme se détache par sa FONCTION, non
 * par sa taille », et le seuil de la citation sortie reste à 400 signes.
 *
 * ⚠️ La règle générale, qu'on a maintenant payée DEUX fois : cette liste est le seul
 * endroit qui décide qu'une nature paraît. Une nature admise par
 * `chk_segments_nature` et absente d'ici n'est pas mal composée — elle n'existe pas
 * pour le lecteur, en silence, et aucun test ne le dit.
 */
export const NATURES_CORPS = [
  'texte', 'introduction', 'citation', 'lemme', 'dialogue', 'texte absent',
  'verset', 'rubrique', 'signature', 'apparat_auteur',
] as const

/**
 * Les natures composées dans la VUE D'APPARAT, la seconde surface de la page d'œuvre.
 *
 * ⛔ `apparat_editeur` en fait partie, et son absence a coûté exactement ce que la
 * garde ci-dessus annonçait : la vue ne chargeait QUE `apparat_critique`, si bien que
 * **342 segments de cinq œuvres publiées ne paraissaient nulle part** — ni au corps,
 * qui les écarte à bon droit, ni à l'apparat, qui ne les demandait pas. Le « Sommaire
 * général » des *Homélies sur l'Hexaéméron* de Basile (dix-neuf paragraphes, un par
 * homélie), la « Table des chapitres », le « Colophon » et le « Privilège » de
 * l'*Histoire ecclésiastique*, l'« Avertissement » des *Homélies sur Anne* : tous
 * étaient en base, tous manquaient à l'écran, et rien ne le disait. Relevé le
 * 2026-08-29, sur la question « GPT me dit qu'il y a un sommaire, je ne le vois pas ».
 *
 * ⚠️ Le partage entre les deux listes est celui de l'AUTEUR et de l'ÉDITEUR, non celui
 * du texte et de l'appareil : `apparat_auteur` (préface, prologue, dédicace de
 * l'auteur) se lit au corps ; `apparat_editeur` (avertissement du traducteur,
 * privilège, approbation, sommaire analytique) se lit à l'apparat. La base impose
 * d'ailleurs à ce dernier `espace_textuel = 'apparat_critique'`
 * (`segments_apparat_editeur_space_ck`).
 *
 * ⛔ `apparat_critique` est la valeur HÉRITÉE, fourre-tout : on n'en crée plus (charte
 * § 7), mais la vue continue de la servir — ses 1 276 segments sont en ligne.
 */
export const NATURES_APPARAT = ['apparat_critique', 'apparat_editeur'] as const
