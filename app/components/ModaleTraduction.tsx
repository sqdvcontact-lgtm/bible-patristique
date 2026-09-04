'use client'

// ── Fiche « À propos de cette traduction » ─────────────────────────────────────
//
// La fenêtre s'ouvre depuis l'encart « Traduction » du volet de lecture de la Bible
// (`NavLivres`). Elle est composée sur le modèle de la FICHE D'AUTEUR
// (`app/components/ModaleAuteur`), dont elle reprend le cadre, l'en-tête (portrait
// à gauche, nom et repères à droite), les titres de section et les deux colonnes :
// à gauche ce qui se lit, à droite ce qui le documente. Les deux fiches disent la
// même chose d'objets voisins ; elles ne gagnaient rien à se présenter chacune à sa
// façon, et celle-ci était restée une liste d'étiquettes.
//
// Sources : `v_traductions_page` (par `trad_id`), `v_chronologie_traductions`, et,
// pour une édition qui appartient à une famille, `bible_edition_members` →
// `v_bible_editorial_bibliography_entries`.
//
// ⛔ ELLE NE MONTRE PLUS LES GRAVURES DE L'ÉDITION (2026-09-04, demande de
// l'auteur : « ne pas afficher la famille “Gravures” »). Six planches en
// échantillon régulier, leur passe-partout, la planche agrandie par-dessus la
// fiche et les deux requêtes qui les portaient sont parties avec elles. Les
// gravures se lisent À LEUR PLACE, dans le texte, où l'édition les a mises ; une
// mosaïque d'aperçus en tête de fiche était un ornement, non un renseignement.
//
// ⛔ ELLE NE PORTE PLUS LES TROIS REPÈRES sous le nom — « Français · Catholique ·
// 1888 - 1904 » (même demande). Ils disaient en télégramme ce que la notice dit en
// prose deux centimètres plus bas, et la date qu'ils affichaient était la date
// RÉDIGÉE de la base, avec ses points-virgules et ses annonces.
//
// ⚠️ TROIS RUBRIQUES PLEINE MESURE FERMENT LA FICHE, dans cet ordre : « Édition
// et état du texte », qui compose champ par champ la référence des volumes servis
// puis dit l'état du texte ; « Ouvrages cités dans cette édition », qui lit le
// catalogue bibliographique et ne paraît pas s'il est vide ; et « Conditions
// d'usage », qui dit ce que la licence permet et ce que le travail éditorial
// réserve. On va ainsi de ce que l'édition EST à ce qu'on peut en faire.
//
// ⛔ AUCUNE N'EST REPLIÉE (2026-09-04, demande de l'auteur). « Édition et état du
// texte » l'était, et le dépli cachait une redondance autant qu'un contenu : le
// titre, l'année, le lieu et l'éditeur y reparaissaient en rangées sous une
// référence qui venait de les composer, et la notice rédigée de la base les disait
// une troisième fois. La référence est devenue la TÊTE de la rubrique, et les
// rangées ne portent plus que ce qu'elle ne dit pas.
//
// ⛔ CE QUI RELÈVE DE L'ATELIER N'Y PARAÎT PLUS (2026-09-04, quatre demandes de
// l'auteur, charte § 38.15). La rangée « Vérification » disait un état de TRAVAIL
// (« Contrôle en cours ») derrière un mot souligné de pointillés qu'il fallait
// cliquer ; le renvoi « Conditions d'utilisation, § 6 » envoyait chercher ailleurs
// ce que les deux paragraphes venaient de dire ; « Source numérique » alignait
// trois objets pour une seule adresse, dont un lien qui redisait l'étiquette de sa
// rangée. Les trois sont retirés.
//
// ⚠️ ET « PARTICULARITÉS » PORTE DE LA PROSE, non la valeur d'une étiquette. C'est
// la quatrième demande, et la seule qui touche aussi la DONNÉE : la notice de la
// Segond nommait `versets_canon`, `ch_heb/v_heb` et le « vref eBible » à un lecteur
// qui ne peut rien en faire. La rangée lui donne l'interligne et la césure d'un
// paragraphe ; les notices des cinq bibles publiques ont été réécrites en base
// (migration `20260904190000`, sauvegarde `internal.backup_editions_notices_20260904`).
//
// ⚠️ Le CONTENU est séparé de la fenêtre, comme dans la fiche d'auteur : `createPortal`
// n'existe pas au rendu serveur, et une planche de contrôle hors session ne pourrait
// pas rendre la fiche si tout tenait dans un seul composant.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { supabase } from '@/app/lib/supabase'
import { sieclesEnHtml } from '@/app/lib/siecles'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { normaliserEspaces } from '@/app/lib/typographie'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { FriseAuteur, TitreSection, RangeeEmpilee, Consulter, useBordSurDerniereLigne } from '@/app/components/ModaleAuteur'
import { type RangChrono, estUrl } from '@/app/lib/frise'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import {
  portraitTraduction, styleImagePortrait, type PositionsPhotoTraduction,
} from '@/app/lib/portraitTraduction'
import BibliographieOuvrages, { FragmentReference } from '@/app/components/BibliographieOuvrages'
import { indexEditeursNavigateur, useEditeursCharges } from '@/app/lib/editeurs'
import { joindreEditeurs } from '@/app/lib/editeursNormalisation'
import {
  ouvragesDeLaFamille,
  type LigneBibliographieOuvrage, type OuvrageBibliographique,
} from '@/app/lib/bibleBibliographieOuvrages'
import { segmentsReferenceEdition } from '@/app/lib/referenceEditionServie'
import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'

const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// La fiche s'ouvre au-dessus de la page de lecture.
const Z_FICHE = 1200

/** Fiche de présentation — la vue porte déjà l'édition source jointe. */
export type InfoTrad = {
  trad_id: string; nom: string | null; type_objet: string | null; auteur: string | null
  responsable_edition: string | null; dates: string | null; bio_courte: string | null
  date_publication: string | null; confession: string | null; langue: string | null
  commentaire_editorial: string | null
  photo: string | null; photo_encart: string | null; photo_position: PositionsPhotoTraduction
  schema_numerotation: string | null
  licence_traduction: string | null; mention_obligatoire: string | null
  titre_edition: string | null; sous_titre_edition: string | null
  editeur: string | null; annee_edition: string | null; lieu_edition: string | null
  source_type: string | null; source_numerique_nom: string | null; source_numerique_url: string | null
  graphie: string | null; particularites: string | null
  /** « Édition révisée » : la mention de la page de titre. */
  mention_edition: string | null
  /** Le dépôt et la cote d'un TÉMOIN MANUSCRIT — la cote fait le manuscrit. */
  depot_manuscrit: string | null; cote_manuscrit: string | null
  /** Combien de volumes l'édition compte : la rubrique « L'édition utilisée » en
   *  répond, et c'est la seule donnée matérielle qu'elle admette. */
  nombre_tomes: number | null
}

/** Intitulé juste selon le type d'objet (jamais la valeur technique brute). */
function intituleTraduction(i: InfoTrad): string | null {
  const a = i.auteur?.trim() || null
  if (i.type_objet === 'edition_critique') { const r = i.responsable_edition?.trim() || a; return r ? `Édition critique établie par ${r}` : null }
  if (i.type_objet === 'recension') return a ? `Recension de ${a}` : null
  if (i.type_objet === 'traduction') return a ? `Traduction de ${a}` : null
  return a
}

/**
 * La PROSE d'un champ de la base — notice, graphie, particularités.
 *
 * ⚠️ Ces champs sont saisis à l'espace ordinaire : mesuré le 2026-09-04, les cinq
 * notices bibliques ne portent QUE des U+0020, guillemets et deux-points compris.
 * La norme française se pose donc au RENDU, comme partout ailleurs sur le site
 * (charte § 3.2) : `normaliserEspaces` CONVERTIT le type d'une espace déjà présente,
 * elle n'en ajoute jamais, et ne change pas la longueur du texte.
 * ⛔ Le grand texte de la fiche, `commentaire_editorial`, passe par `formaterProse`,
 * qui pose les mêmes règles sur du HTML : ne pas les cumuler, elles sont idempotentes
 * mais l'une travaille sur des balises et l'autre non.
 */
const enProse = (t: string | null | undefined) => rendreEnrichi(t ? normaliserEspaces(t) : t)

/**
 * La source numérique : son NOM porte le lien, et il n'y a rien d'autre.
 *
 * ⛔ PLUS DE « · Voir la source » À CÔTÉ DU NOM (2026-09-04, demande de l'auteur :
 * « remettre en forme pour faire au plus clair »). La rangée alignait trois objets
 * pour une seule adresse — le nom, un point médian, un lien dont le libellé redisait
 * l'étiquette de la rangée —, si bien qu'on hésitait sur ce qu'on cliquait. Le nom
 * EST la source : il mène donc à elle.
 *
 * ⚠️ Le nom se rend TOUJOURS, lien ou pas : `Consulter` ne rend rien sur une adresse
 * qui n'en est pas une, et le nom disparaîtrait avec elle. D'où `estUrl`, lu ici et
 * non déduit d'un composant qui peut rendre `null`.
 * ⚠️ Sans nom, c'est l'HÔTE de l'adresse qui se donne : une source se nomme, elle ne
 * se cache pas derrière un « voir ».
 *
 * ⛔ C'EST UNE FONCTION, ET NON UN COMPOSANT, et la différence se voit à l'écran.
 * `RangeeEmpilee` se tait sur un enfant FAUX ; or un élément de composant est
 * toujours VRAI, fût-il rendu à `null`. Passée en `<SourceNumerique …/>`, la rangée
 * gardait donc son étiquette sur les bibles qui n'ont aucune source numérique — la
 * Fillion affichait « SOURCE NUMÉRIQUE » suivi de rien, relevé en ligne le
 * 2026-09-04. La règle vaut pour toute rangée dont la valeur peut manquer : on lui
 * passe une VALEUR, jamais un composant qui décidera lui-même de se taire.
 */
function sourceNumerique(nom: string | null, url: string | null): ReactNode {
  const hote = estUrl(url) ? new URL(url!.trim()).host : ''
  const libelle = nom?.trim() || (hote.startsWith('www.') ? hote.slice(4) : hote)
  if (!libelle) return null
  return estUrl(url) ? <Consulter url={url} libelle={libelle} /> : libelle
}

/** Libellé lisible du schéma de numérotation stocké en base. */
const NUMEROTATION_LABEL: Record<string, string> = {
  vulgate: 'Vulgate (latine)', hebreu: 'Hébraïque', grec: 'Grecque', septante: 'Septante (grecque)',
}

// Passe typographique française sur la prose éditoriale : espaces fines
// insécables (avant ; ! ? et à l'intérieur des guillemets), insécable avant
// « : », et siècles composés en petites capitales + exposant (XVIIᵉ siècle).
// Ordre important : on pose les espaces AVANT d'injecter les <span>/<sup>
// (dont le style contient des « : » qu'il ne faut pas toucher).
function formaterProse(html: string): string {
  const FINE = " ", INSEC = " "
  let s = html
    .replace(/[\s  ]*([;!?])/g, FINE + "$1")
    .replace(/[\s  ]*:/g, INSEC + ":")
    .replace(/«[\s  ]*/g, "«" + FINE)
    .replace(/[\s  ]*»/g, FINE + "»")
  // ⛔ Les siècles se composent par la SOURCE UNIQUE, jamais par une regex maison :
  // celle-ci ignorait l’abréviation « s. » que sieclesEnHtml traite, et posait un
  // letter-spacing que ni STYLE_ROMAIN ni sieclesEnHtml ne portent.
  s = sieclesEnHtml(s)
  return s
}

// ⚠️ La rangée « étiquette · valeur » et le lien de consultation vivent désormais
// dans `ModaleAuteur`, avec le portrait et le titre de section : les trois fiches
// (auteur, traduction, édition) les partagent, et trois copies d'un même cadre
// finissent toujours par diverger.

const STYLES_FICHE = `
  .trad-notice h2 { font-family: ${SERIF}; font-style: italic; font-weight: normal; font-size: 0.84375rem; color: var(--cs-vert); margin: 15px 0 5px; }
  .trad-notice h2:first-child { margin-top: 0; }
  .trad-notice p { font-family: ${SANS}; font-size: 0.75rem; line-height: 1.5; color: var(--cs-texte); text-align: justify; hyphens: auto; margin: 0 0 8px; }
  .trad-notice p:last-child { margin-bottom: 0; }
  /* Les notices portent cinq balises et cinq seulement : h2, p, em, ul, li.
     Sans règle, une bibliographie retombait sur la composition du navigateur,
     donc plus grosse que la prose qu'elle accompagne. ⛔ Pas de justification
     ici : une référence tient sur deux lignes courtes, que la justification
     étirerait. */
  /* ⛔ Les listes de la notice — les BIBLIOGRAPHIES — se composent dans globals.css,
     avec celles de la page « Les traductions » : une seule déclaration, deux surfaces
     (2026-09-04). Elles vivaient ici, et la page, elle, n’en avait aucune. */
  /* ── LE PORTRAIT FLOTTE, ET LA NOTICE L'HABILLE ──
     Même parti que la fiche d'auteur, et pour la même raison : il ouvrait un en-tête
     à part, où son vis-à-vis — un titre, deux lignes de repères — laissait un grand
     vide à sa droite sur toute sa hauteur. Le nom se pose maintenant à côté de lui et
     la prose le contourne.
     ⛔ Le cadre n'a NI largeur NI hauteur ici : un flottant se dimensionne sur son
     contenu, et c'est la zone d'image (8,75 rem, rapport 2/3) qui doit commander, comme
     partout ailleurs — le passe-partout et le filet sont DANS la boîte. Écrire une
     mesure ici, c'est refaire le défaut que la fiche a corrigé le 2026-08-31.
     ⛔ La marge BASSE est à zéro : elle repousserait la limite d'habillage sous le bord
     du cadre et une ligne de plus viendrait pendre dessous (cf. useBordSurDerniereLigne).

     ⚠️ LE CADRE EST UN FLEX, ET C'EST CE QUI CHASSE LE BANDEAU BLANC (2026-09-04,
     l'auteur : « on trouve un petit bandeau blanc sous l'image, comme si elle
     n'entrait pas dans le bloc »). Le bord bas du cadre se pose sur la dernière ligne
     qui l'habille : useBordSurDerniereLigne lui écrit une HAUTEUR, de quelques
     pixels supérieure à la sienne. La zone d'image, elle, tenait sa hauteur de son
     seul rapport 2/3 et ne suivait pas : la rallonge se voyait donc en passe-partout,
     sous l'image, et par elle seule — d'où un bandeau en bas là où les trois autres
     côtés portent cinq pixels. En flex, la zone d'image s'ÉTIRE (align-items:
     stretch, la valeur par défaut) jusqu'au bord du cadre, et la rallonge revient à
     l'image, qui la remplit — elle est en « cover ». Le rapport 2/3 continue de
     donner la hauteur au repos, quand il n'y a rien à rallonger.
     ⚠️ Le style en ligne de la zone d'image ne pose PAS de hauteur : elle reste à
     « auto », faute de quoi l'étirement du flex ne jouerait pas. */
  .trad-portrait-flottant { float: left; display: flex; margin: 2px 18px 0 0; padding: 5px; background: var(--cs-surface); border: 1px solid var(--cs-bord); box-shadow: var(--cs-ombre-posee); }
  /* La colonne de la notice est un BLOC, jamais un flex : un flottant n'existe pas dans
     un conteneur flex, ses enfants devenant des éléments de flex. L'écart que portait
     le « gap » se reprend donc en marge — et PAS sur l'en-tête, qui suit le portrait et
     doit ouvrir la colonne à sa hauteur. */
  .trad-bloc { margin-top: 13px; }
  /* Téléphone : le cadre se resserre, sans quoi 140 px de portrait ne laisseraient
     presque rien à la prose. La zone d'image garde son rapport. */
  @media (max-width: 640px) {
    .trad-portrait-fenetre { width: 6.5rem !important; }
    .trad-portrait-flottant { margin-right: 14px; }
  }
`

/**
 * Le contenu de la fiche : en-tête, deux colonnes, section repliable.
 * Les données lui arrivent chargées ; `info` à `null` vaut « on charge encore ».
 */
export function ContenuFicheTraduction({ info, chrono, ouvragesCites, nomFallback }: {
  info: InfoTrad | null
  chrono: RangChrono[]
  /** Les ouvrages cités dans l'édition, lus dans le catalogue bibliographique.
   *  Vides, la rubrique ne paraît pas — c'est le cas de huit bibles sur neuf. */
  ouvragesCites: OuvrageBibliographique[]
  nomFallback: string
}) {
  // ⚠️ On retient l'ADRESSE de l'image qui a manqué, et non un booléen remis à
  // vrai depuis un effet : la règle des hooks refuse un `setState` synchrone dans
  // un effet, et la fiche peut changer de traduction sans être remontée.
  const [portraitCasse, setPortraitCasse] = useState<string | null>(null)
  // Le portrait FLOTTE dans la colonne de la notice, et son bord bas se pose sur la
  // dernière ligne qui l'habille — même mesure que la fiche d'auteur, même code.
  const cadreRef = useRef<HTMLDivElement>(null)
  useBordSurDerniereLigne(cadreRef, true, info?.trad_id ?? nomFallback)
  // Le cache des éditeurs répertoriés : le hook déclenche son chargement et
  // provoque un rendu quand il est prêt, l'index se lit ensuite en mémoire.
  useEditeursCharges()
  // ⛔ SOUS 640 PX, LA FICHE N'A QU'UNE COLONNE. C'est le seuil de la charte pour
  // « grilles à une colonne, champs qui passent l'un sous l'autre » : la fenêtre y
  // fait au plus 600 px, et deux colonnes de 250 et 190 px n'y logent ni une frise
  // ni une référence bibliographique. ⚠️ La grille est posée en style EN LIGNE et
  // aucune média-query ne peut l'atteindre : le seuil se lit donc en JavaScript,
  // comme partout ailleurs sur ce site (charte, « Piège inline »).
  const etroit = useEstMobile(640)
  const indexEditeurs = indexEditeursNavigateur()

  const i = info ?? ({} as InfoTrad)

  // Numérotation de la Vulgate : jamais affichée (elle va de soi pour un texte
  // établi sur la Vulgate, et n'apporte rien au lecteur).
  const numerotation = (i.schema_numerotation && i.schema_numerotation !== 'vulgate')
    ? (NUMEROTATION_LABEL[i.schema_numerotation] ?? i.schema_numerotation) : null
  const intitule = intituleTraduction(i)
  const licenceDP = (i.licence_traduction ?? '').toLowerCase().includes('domaine public')
  // ⛔ Une licence RÉDIGÉE se rend telle quelle, jamais rabattue sur la formule du
  // domaine public : celle de la Bible 899 dit « Texte médiéval dans le domaine
  // public. La réutilisation du fac-similé numérique de Gallica demeure soumise aux
  // conditions de la Bibliothèque nationale de France. » — la réserve tomberait, et
  // c'est précisément ce qu'une rubrique de licence doit dire. On ne compose la
  // phrase du site que sur la mention COURTE, celle qui ne dit rien de plus.
  const licenceTexte = (i.licence_traduction ?? '').trim()
  const licenceDetaillee = licenceTexte.toLowerCase() === 'domaine public'
    ? 'Le texte de cette édition relève du domaine public : il se lit, se cite et se reproduit librement.'
    : licenceTexte
      ? (licenceDP ? licenceTexte : `Le texte de cette édition est diffusé sous la mention « ${licenceTexte} ».`)
      : 'Les droits sur le texte de cette édition ne sont pas précisés.'
  const portrait = portraitTraduction(i)

  // La RÉFÉRENCE des volumes servis, composée champ par champ (module pur,
  // `referenceEditionServie`). Vide sans titre d'édition : la rubrique se tait.
  // ⚠️ L'ÉDITEUR y prend sa forme normalisée, comme dans la carte du volet : chaque
  // maison sous son nom répertorié, et « et » entre elles au lieu du point-virgule
  // du catalogue. La fiche est un composant du navigateur : elle passe donc par le
  // cache de `app/lib/editeurs`, qui charge la table une fois par session. ⛔ Tant
  // qu'il n'est pas prêt, `joindreEditeurs` rend la forme brute — jamais un vide.
  const referenceEdition = segmentsReferenceEdition({
    titreEdition: i.titre_edition, sousTitreEdition: i.sous_titre_edition,
    mentionEdition: i.mention_edition,
    lieuEdition: i.lieu_edition, editeur: joindreEditeurs(i.editeur, indexEditeurs),
    anneeEdition: i.annee_edition, nombreTomes: i.nombre_tomes,
    depotManuscrit: i.depot_manuscrit, coteManuscrit: i.cote_manuscrit,
  })

  const aChrono = chrono.length > 0
  // ⚠️ « ÉDITION ET ÉTAT DU TEXTE » PASSE SOUS LA CHRONOLOGIE (demande de l'auteur,
  // 2026-09-04 : « peut-on envisager que “Édition et état du texte” soit sous la
  // chronologie ? proprement ? »). Elle tenait toute la mesure, sous les deux
  // colonnes — et la colonne de droite, qui ne porte qu'une frise de cinq entrées,
  // s'arrêtait à mi-hauteur d'une notice qui continue : un grand vide à droite, et la
  // rubrique reléguée sous les deux. Elle remplit ce vide, où elle est à sa place :
  // à gauche ce qu'on LIT, à droite ce qui le documente.
  // ⚠️ Ses rangées s'y EMPILENT (`RangeeEmpilee`) : la rangée partagée porte une
  // colonne d'étiquettes de 8,5 rem, qui ne laisserait pas 170 px à la valeur dans une
  // colonne étroite. C'est la forme que la fiche d'édition emploie déjà, et c'est
  // désormais le même composant.
  // ⛔ « Responsable de l'édition » a quitté la rubrique (demande de l'auteur,
  // 2026-09-04 : « fait un peu tache ; supprimer »). Il redisait le plus souvent le
  // nom que la fiche porte en tête — « Louis-Claude Fillion ; édition numérique :
  // Corpus Scriptura » sous « Traduction de Louis-Claude Fillion » — et il ne
  // décide donc plus non plus que la rubrique paraisse.
  // ⚠️ Le champ reste LU : il nomme le responsable d'une édition critique dans
  // l'intitulé, sous le nom (voir `intituleTraduction`).
  // ⛔ « VÉRIFICATION » NE PARAÎT PLUS (2026-09-04, demande de l'auteur :
  // « VérificationContrôle en cours // ne pas afficher »). C'était un état de
  // TRAVAIL — « Contrôle en cours » sur six bibles sur neuf — donné pour un
  // renseignement, et il fallait cliquer un mot souligné de pointillés pour
  // apprendre ce qu'il recouvrait. ⚠️ `integrite_verifiee`, `statut_corpus_public`
  // et `lacunes_publiques` ne sont donc plus lus NULLE PART dans la fiche ; ils
  // restent en base, où l'administration les tient.
  const aEdition = referenceEdition.length > 0 || !!(i.source_numerique_nom
    || i.source_numerique_url || i.graphie || numerotation || i.particularites)
  // Deux colonnes seulement s'il y a de quoi remplir les deux. Une notice seule
  // prend toute la mesure plutôt que de laisser une colonne vide à côté d'elle.
  const deuxColonnes = !etroit && !!(i.bio_courte || i.commentaire_editorial) && (aChrono || aEdition)

  return (
    <>
      {/* En-tête : portrait, nom, intitulé.
          ⛔ PLUS DE REPÈRES sous le nom — « Français · Catholique · 1888 - 1904 »
          (2026-09-04, demande de l'auteur). Ils avaient été montés là le 28 août
          depuis la section repliable, au motif qu'on ne range pas derrière un dépli
          ce qui identifie l'objet qu'on lit ; c'était vrai de la langue et de la
          confession, moins de la date, qui était la date RÉDIGÉE de la base, avec ses
          points-virgules et ses annonces. La notice le dit en prose deux centimètres
          plus bas, et la langue comme la confession restent lisibles dans le dépli.
          ⛔ LE CADRE EST CELUI DE L'ENCART, et non plus celui de la fiche d'auteur
          (2026-08-31, l'auteur trouvant l'illustration trop étroite). Une notice de
          traduction porte deux images, et son PORTRAIT est préparé pour un rapport
          2/3 sur 8,75 rem : c'est la boîte de dépôt (`BOITE_TRADUCTION_ENCART`,
          600 × 900), c'est le cadre de la page publique des traductions, et c'est
          celui sur lequel l'administration règle le cadrage. La fiche, elle,
          empruntait le cadre d'un portrait d'AUTEUR — 6,5 rem sur 130 px, soit une
          zone d'image de 92 × 118 —, si bien qu'elle montrait de la peinture un tiers
          moins large que partout ailleurs, et selon un rapport (0,78) que personne
          n'avait cadré. Elle rend maintenant 140 × 210, comme /traductions.
          ⚠️ Le rapport se pose sur la ZONE D'IMAGE et non sur le cadre : le
          passe-partout et le filet sont dans la boîte (`box-sizing: border-box`), et
          un rapport posé sur le cadre les aurait pris dedans — l'image y perdait
          douze pixels de large et le cadrage n'aurait plus été celui qu'on a réglé.
          ⚠️ Le passe-partout RESTE : c'est la langue de la maison, celle des portraits
          d'auteur, et une image sans marie-louise s'y lirait comme une vignette.
          ⛔ Plus de hauteur en PIXELS à côté d'une largeur en rem : la police racine
          monte à 22 px sur un grand écran, et le cadre de 6,5 rem sur 130 px y
          devenait un PAYSAGE de 143 sur 130. Un rapport ne connaît pas ce défaut. */}
      {/* Deux colonnes : à gauche le portrait, le nom et la notice ; à droite ce qui
          la documente. L'en-tête est DANS la colonne de gauche, et non plus au-dessus
          des deux : c'est ce qui permet au nom de se poser à côté du portrait et à la
          prose de le contourner. Il reste hors du « Chargement… », pour que la fenêtre
          dise tout de suite de quelle traduction elle parle. */}
      <div style={{ display: 'grid', gridTemplateColumns: deuxColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: deuxColonnes ? '26px' : '20px', alignItems: 'start' }}>
        <div style={{ borderRight: deuxColonnes ? '1px solid var(--cs-fond-doux)' : 'none', paddingRight: deuxColonnes ? '24px' : 0 }}>
          {portrait && portraitCasse !== portrait.url && (
            <div ref={cadreRef} className="trad-portrait-flottant">
              <div className="trad-portrait-fenetre" style={{ width: '8.75rem', aspectRatio: '2 / 3', overflow: 'hidden', background: 'var(--cs-fond-doux)' }}>
                <img src={portrait.url} alt="" aria-hidden="true" onError={() => setPortraitCasse(portrait.url)}
                  style={styleImagePortrait(portrait)} />
              </div>
            </div>
          )}
          <header>
            <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette traduction</p>
            <h2 id="trad-fiche-titre" style={{ fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.12 }}>{rendreEnrichi(i.nom || nomFallback)}</h2>
            {intitule && (
              <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', margin: '2px 0 0', lineHeight: 1.3 }}>
                {rendreEnrichi(intitule)}{i.dates ? rendreEnrichi(` (${i.dates})`) : ''}
              </p>
            )}
          </header>
          {info === null ? (
            <p className="trad-bloc" style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '30px 0', textAlign: 'center' }}>Chargement…</p>
          ) : (
            <>
              {i.bio_courte && (
                <p className="trad-bloc" style={{ fontFamily: SERIF, fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: 0 }}>{enProse(i.bio_courte)}</p>
              )}
              {/* Notice éditoriale : HTML (h2/p) rendu tel quel, aux styles de la
                  fiche d'auteur — titres de section en sérif italique, prose en
                  sans justifiée. */}
              {i.commentaire_editorial && (
                <div className="trad-notice trad-bloc"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formaterProse(i.commentaire_editorial)) }} />
              )}
            </>
          )}
        </div>
        {info !== null && (aChrono || aEdition) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
            {aChrono && (
              <section>
                <TitreSection>Chronologie</TitreSection>
                <FriseAuteur evenements={chrono} />
              </section>
            )}
            {aEdition && (
              <section>
                <TitreSection>Édition et état du texte</TitreSection>
                {referenceEdition.length > 0 && (
                  <div className={`${CLASSES_BIBLIOGRAPHIE.bloc} ${CLASSES_BIBLIOGRAPHIE.sansHote}`} style={{ marginBottom: '7px' }}>
                    <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
                      <li className={CLASSES_BIBLIOGRAPHIE.entree}>
                        {referenceEdition.map((segment, rang) => (
                          <FragmentReference key={rang} segment={segment} />
                        ))}
                      </li>
                    </ul>
                  </div>
                )}
                <RangeeEmpilee c="Source numérique">{sourceNumerique(i.source_numerique_nom, i.source_numerique_url)}</RangeeEmpilee>
                <RangeeEmpilee c="Graphie">{enProse(i.graphie)}</RangeeEmpilee>
                <RangeeEmpilee c="Numérotation">{numerotation}</RangeeEmpilee>
                {/* ⚠️ « PARTICULARITÉS » PORTE DE LA PROSE, non la valeur d'une
                    étiquette : quatre phrases dans une rangée composée pour un mot
                    se lisent en télégramme, et c'est ce que l'auteur a relevé le
                    2026-09-04. Elle garde son étiquette et prend l'interligne et la
                    césure d'un paragraphe.
                    ⚠️ En SPAN, jamais en paragraphe : la valeur d'une rangée est
                    elle-même un span (charte § 38.4).
                    ⛔ Pas de justification : la colonne fait environ 314 px, soit
                    quarante-cinq signes par ligne, et le justifié y creuse des
                    blancs (charte § 38.9). */}
                <RangeeEmpilee c="Particularités">{i.particularites
                  ? <span style={{ display: 'block', lineHeight: 1.5, hyphens: 'auto' }}>{enProse(i.particularites)}</span>
                  : null}</RangeeEmpilee>
              </section>
            )}
          </div>
        )}
      </div>

      {info !== null && (
        <>
          {/* ── LES OUVRAGES QUE L'ÉDITION CITE ───────────────────────────────
              « Je veux qu'on constitue une nouvelle rubrique contenant, proprement,
              tous les ouvrages cités dans l'édition utilisée ; c'est surtout utile
              pour Fillion. Si cette rubrique est vide, elle ne doit pas apparaître »
              (2026-09-04). Elle lit `v_bible_editorial_bibliography_entries`, la
              même source que les bibliographies de l'apparat, et la compose par le
              même composant : une édition ne dit pas ses auteurs de deux façons.
              ⚠️ Toutes pièces confondues et dédoublonnées par `ouvrage_id`, rangées
              par auteur puis par titre — voir `ouvragesDeLaFamille`.
              ⛔ Vide, elle ne paraît pas : c'est le cas de huit bibles sur neuf,
              tant que leur catalogue n'est pas fait. */}
          {ouvragesCites.length > 0 && (
            <section style={{ borderTop: '1px solid var(--cs-fond-doux)', marginTop: '20px', paddingTop: '13px' }}>
              <TitreSection>Ouvrages cités dans cette édition</TitreSection>
              <BibliographieOuvrages ouvrages={ouvragesCites} />
            </section>
          )}

          {/* ── CONDITIONS D'USAGE ────────────────────────────────────────────
              « Ajouter les restrictions de licence ; expliquer que le travail
              éditorial est protégé » (2026-09-04). La licence de la traduction
              paraissait bien dans le dépli, en une rangée d'étiquette — « Domaine
              public » —, ce dont un lecteur conclut que tout est libre. Ce qui l'est
              est le TEXTE ; la transcription, la structuration, les alignements et
              les liens ne le sont pas.
              ⛔ La formule ne s'invente pas ici : elle dit en trois phrases le § 6
              des conditions d'utilisation, qui fait foi.
              ⛔ ELLE N'Y RENVOIE PLUS PAR UN LIEN (2026-09-04, demande de l'auteur :
              « Conditions d'utilisation, § 6 // supprimer, ne pas afficher »). Un
              renvoi à un article numéroté est une référence d'acte, non un
              renseignement : il envoie le lecteur chercher ailleurs ce que les deux
              paragraphes viennent de lui dire, et la page reste au pied du site. */}
          <section style={{ borderTop: '1px solid var(--cs-fond-doux)', marginTop: '20px', paddingTop: '13px' }}>
            <TitreSection>Conditions d’usage</TitreSection>
            <p style={{ fontFamily: SANS, fontSize: '0.71875rem', lineHeight: 1.55, color: 'var(--cs-texte)', margin: 0, textAlign: 'justify', hyphens: 'auto' }}>
              {licenceDetaillee}
              {i.mention_obligatoire ? ` ${i.mention_obligatoire}` : ''}
            </p>
            <p style={{ fontFamily: SANS, fontSize: '0.71875rem', lineHeight: 1.55, color: 'var(--cs-texte)', margin: '7px 0 0', textAlign: 'justify', hyphens: 'auto' }}>
              La transcription, la structuration des données, la segmentation, les alignements
              et les liens établis entre versets et textes patristiques constituent en revanche
              un travail éditorial original, protégé par le droit d’auteur. Toute reproduction
              substantielle de cette structuration à des fins commerciales est soumise à
              autorisation préalable ; une citation reprise publiquement garde la mention de sa
              source.
            </p>
          </section>
        </>
      )}

      <style>{STYLES_FICHE}</style>
    </>
  )
}

export default function ModaleTraduction({ code, nomFallback, onFermer }: { code: string; nomFallback: string; onFermer: () => void }) {
  const [info, setInfo] = useState<InfoTrad | null>(null)
  const [chrono, setChrono] = useState<RangChrono[]>([])
  const [ouvragesCites, setOuvragesCites] = useState<OuvrageBibliographique[]>([])

  useEffect(() => {
    let annule = false
    // Source unique : la vue de présentation, chargée par trad_id.
    supabase.from('v_traductions_page').select('*').eq('trad_id', code).maybeSingle()
      .then(({ data }) => { if (!annule) setInfo((data as InfoTrad | null) ?? ({} as InfoTrad)) })
    supabase.from('v_chronologie_traductions').select('*').eq('trad_id', code).order('ordre_affichage')
      .then(({ data }) => { if (!annule) setChrono((data ?? []) as unknown as RangChrono[]) })
    // Les ouvrages cités appartiennent à la FAMILLE ÉDITORIALE, non à la traduction :
    // une édition bilingue les cite une fois pour ses deux textes, dans un appareil
    // qui est commun aux deux. La seconde requête ne part donc que si la traduction
    // appartient à une famille — une bible ordinaire n'en a pas.
    supabase.from('bible_edition_members').select('family_id').eq('trad_id', code).limit(1).maybeSingle()
      .then(({ data }) => {
        const famille = (data as { family_id: string } | null)?.family_id
        if (annule || !famille) return
        supabase.from('v_bible_editorial_bibliography_entries')
          .select('family_id, piece_key, display_order, source_body_block_id, ouvrage_id, titre, sous_titre, lieu, editeur, annee, auteur_nom, auteur_prenom, auteur_nom_famille')
          .eq('family_id', famille)
          .then(({ data: lignes }) => {
            if (annule) return
            setOuvragesCites(ouvragesDeLaFamille((lignes ?? []) as unknown as LigneBibliographieOuvrage[]))
          })
      })
    return () => { annule = true }
  }, [code])

  // Le défilement de fond est gelé tant que la fenêtre est ouverte (comme la fiche
  // d'auteur) : le calque, lui, ne défile pas, c'est le CONTENU de la boîte qui
  // défile.
  useEffect(() => {
    const prec = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prec }
  }, [])

  // Échap ferme la fiche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div onClick={onFermer}
        style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: Z_FICHE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
        <div role="dialog" aria-modal="true" aria-labelledby="trad-fiche-titre" onClick={e => e.stopPropagation()}
          style={{ position: 'relative', width: '100%', maxWidth: '52rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '30px 34px 28px' }}>
          <button onClick={onFermer} aria-label="Fermer" title="Fermer"
            style={{ position: 'sticky', float: 'right', top: '0', marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <ContenuFicheTraduction info={info} chrono={chrono} ouvragesCites={ouvragesCites}
            nomFallback={nomFallback} />
        </div>
      </div>
    </>,
    document.body,
  )
}
