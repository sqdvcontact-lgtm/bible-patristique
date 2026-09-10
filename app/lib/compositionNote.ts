/**
 * LA COMPOSITION DE L'ENCART DE NOTE — une seule écriture, trois surfaces.
 *
 * ⛔ Il y en avait TROIS, et elles avaient déjà divergé sur neuf points (relevé le
 * 8 septembre 2026) : 340 px de large en lecture d'œuvre et en traductions
 * parallèles, 460 sur la page Bible ; 340 de haut contre 420 ; 0,78125 rem de corps
 * contre 0,8125 ; un rembourrage de 10/12 contre 12/14 ; une croix qui ne paraît
 * qu'une fois la bulle figée d'un côté et toujours de l'autre ; un intitulé qui
 * annonce le TYPE de la note en lecture et « Note » en dur sur la Bible ; le numéro
 * du LECTEUR ici et le numéro INTERNE là ; et deux encres de croix écrites en dur.
 * *Trois copies d'une même forme ne restent identiques que par accident.*
 *
 * ── CE QUE LA MESURE A DÉCIDÉ ───────────────────────────────────────────────────
 *
 * Sur les 24 168 notes du corpus, la MÉDIANE fait **29 signes** et 92,6 % tiennent
 * en 120. La note ordinaire du site est un renvoi : « (Is 1, 16). » Elle recevait
 * une boîte de 340 px coiffée d'un bandeau en capitales plus long qu'elle.
 *
 * ⛔ Et l'intitulé DISPARAÎT quand il ne dit rien (décision de l'auteur, 8 septembre
 * 2026). 14 077 notes sur 24 168 — 58 % — ne portent aucun type : leur bandeau
 * annonçait « NOTE 277 » à quelqu'un qui venait de cliquer le 277. Il ne reste que
 * là où il apprend quelque chose : l'apparat critique, la note du traducteur, celle
 * de l'édition. C'est la règle déjà posée ailleurs — on n'explique pas ce qui
 * s'écrit déjà.
 *
 * ⚠️ Ce qui identifie la note ne disparaît pas pour autant : le NUMÉRO passe dans
 * une gouttière, au fer à droite contre le texte, comme le numéro d'un verset sur
 * la page Bible et comme le chiffre d'une note au bas d'une page imprimée. Il est
 * là quand l'intitulé n'y est pas, et il coûte une gouttière au lieu d'une ligne.
 *
 * ⛔ LA LARGEUR NE SUIT PAS LE CONTENU, et c'est délibéré. Une boîte qui épouserait
 * ses 13 signes changerait de taille à chaque appel survolé, et la lecture d'une
 * ligne qui en porte trois deviendrait un clignotement. Une seule largeur, large,
 * et le calme avec elle. C'est la HAUTEUR qui suit le texte : elle ne s'arrêtait à
 * 340 px que par une constante, quand le placeur dispose souvent de huit cents.
 */
import { Z_INFOBULLE } from '@/app/lib/empilement'
import type { CSSProperties } from 'react'
import { MARGE_FENETRE } from './fenetreContextuelle'

/** La largeur de l'encart. Un peu moins que la colonne de lecture (31,25 rem) : il
 *  se pose PAR-DESSUS elle, et doit se lire comme un objet, non comme une colonne.
 *
 *  ⛔ Elle s'écrit DEUX fois, et il le faut : en rem pour la feuille, en nombre pour
 *  `placerFenetre`, qui compte en pixels. `largeurEncartPx` fait le pont depuis la
 *  MÊME constante — la police racine du site étant fluide, un nombre écrit à part
 *  se désaccorderait de la boîte dès le premier grand écran. */
export const LARGEUR_ENCART_REM = 29
export const LARGEUR_ENCART = `${LARGEUR_ENCART_REM}rem`

/** La largeur de l'encart en pixels, pour le placeur. `racine` est la police racine
 *  mesurée à l'instant du calcul (`tailleRacinePx`), jamais supposée. */
export function largeurEncartPx(racine: number): number {
  return LARGEUR_ENCART_REM * racine
}

/**
 * La largeur SOUS LAQUELLE l'encart ne se range plus dans une marge : en deçà, une
 * note ne se lit plus, et mieux vaut la poser sous son appel comme avant.
 *
 * ⛔ 16 REM, ET NON PLUS 20 (décision de l'auteur, 2026-09-10 : « le minimum de marge
 * pour l'affichage des notes dans les marges d'une œuvre doit être plus souple ;
 * j'aimerais qu'on puisse avoir des notes en marge, sur grand écran, même en mode
 * latin-français »). À 20 rem, les deux volets ouverts, la lecture en regard n'y
 * arrivait qu'à partir de 2880 px de fenêtre.
 *
 * ⛔ ET LE CHIFFRE EST LE PLUS PETIT QUI RÉPONDE À LA DEMANDE, non le plus généreux :
 * mesuré (`tmp/mesure-marge-encart.mjs`, une iframe par écran, l'arithmétique réelle de
 * `placerEnMarge` sur les structures réelles des deux pages), la marge de la lecture en
 * regard vaut 357 px à 2560 — 16 rem y font 352, 18 rem 396. Descendre plus bas
 * n'achèterait rien : 14 rem ne gagnent aucun écran de plus en latin-français, et
 * coûteraient sept signes par ligne.
 *
 *     écran   racine   œuvre   regard   bible      (place à droite, volets ouverts)
 *      1280       16      99       13      69
 *      1920       19     279      177     237
 *      2400       22     395      277     352
 *      2560       22     475      357     432
 *      2880       22     635      517     592
 *
 *   La marge sert, à 20 rem : œuvre dès 2560, regard dès 2880, Bible dès 2880.
 *   À 16 rem : œuvre dès 2200, regard dès 2560, Bible dès 2400.
 *
 * ⚠️ CE QUE 16 REM COÛTE, ET POURQUOI C'EST TENABLE. Sur la note la plus longue du
 * corpus qu'on ait éprouvée (352 signes), la piste passe de 266 à 202 px et de 39 à
 * 32 signes par ligne. La charte tient une colonne de prose à « une trentaine de
 * signes » pour trop étroite — mais c'est de la lecture SUIVIE qu'elle parle, et une
 * note n'en est pas. ⛔ Surtout, la longueur d'une note est mesurée : sur les 24 302
 * notes du corpus, la médiane fait 17 signes, le troisième quartile 40, et 92,6 %
 * tiennent sous 120. Le plancher de 20 rem était donc taillé pour les 3 % qui passent
 * 300 signes, et il coûtait la marge aux 97 % qui tiennent en une à trois lignes —
 * lesquelles rendent le même nombre de lignes à 16 rem comme à 20.
 *
 * ⚠️ 14 rem a été éprouvé et REFUSÉ, à l'œil comme à la mesure : 25 signes par ligne,
 * et la justification s'y creuse de lézardes visibles sur la planche.
 */
export const LARGEUR_ENCART_MIN_REM = 16

export function largeurEncartMinPx(racine: number): number {
  return LARGEUR_ENCART_MIN_REM * racine
}

/** La gouttière du numéro.
 *
 *  ⛔ LE CHIFFRE S'Y RANGE AU FER À GAUCHE, contre le bord du blanc intérieur, et non
 *  plus au fer à droite contre le texte (demande de l'auteur, 2026-09-08 : « supprime
 *  l'alinéa avant le numéro de note »). Le fer à droite est la règle du site pour un
 *  chiffre qui accompagne un TEXTE SUIVI — un numéro de verset dans une colonne de
 *  lecture —, où il aligne cinquante repères les uns sous les autres. Ici il n'y en a
 *  qu'un, en tête d'un objet : à droite d'une gouttière fixe, un numéro à un ou deux
 *  signes s'écartait du bord de deux à sept dixièmes de rem, et l'encart s'ouvrait sur
 *  un alinéa que rien ne justifiait. La gouttière se resserre du même coup. */
export const GOUTTIERE_NUMERO = '1.75rem'

/** Le blanc intérieur. ⚠️ Resserré une seconde fois le 2026-09-10 (« condense le texte
 *  selon mes recommandations ») : 0,875/1 rem → 0,6875/0,8125.
 *
 *  ⛔ ET IL EST SYMÉTRIQUE, ce qu'il n'était plus : le corps portait en outre un
 *  `paddingRight` de 2,25 rem pour réserver la place de la croix, sur TOUTE la hauteur
 *  de la note. Une note de dix lignes payait donc onze pixels de piste à droite pour un
 *  bouton qui n'occupe que la première — et son texte, décalé, ne paraissait pas centré
 *  dans sa boîte. La réserve est devenue un FLOTTANT (`STYLE_RESERVE_CROIX`), qui ne
 *  raccourcit que la ligne où la croix se tient : c'est le procédé du numéro. */
export const REMBOURRAGE_LATERAL_REM = 0.8125
export const REMBOURRAGE_ENCART = `0.6875rem ${REMBOURRAGE_LATERAL_REM}rem`

/** La place que la croix prend sur la PREMIÈRE ligne, et sur elle seule.
 *  ⚠️ Elle est POSÉE toujours, croix montrée ou non : la géométrie d'un encart ne
 *  change pas entre le survol et le clic, c'est la règle du 9 septembre 2026. Seule sa
 *  PORTÉE change — une ligne au lieu de toutes. */
export const RESERVE_CROIX = '1rem'

/** Le corps du texte d'une note. ⚠️ Il descend de 0,8125 à 0,75 rem (demande de
 *  l'auteur, 2026-09-08 : « plus condensées, avec un corps de texte plus petit »). Une
 *  note n'est pas de la lecture suivie : on y va, on la lit, on revient au texte — et
 *  son corps se distingue mieux de celui de la page quand il s'en écarte franchement. */
export const CORPS_ENCART = '0.75rem'

/** L'interligne. ⚠️ 1,38 depuis le 2026-09-10 : c'est le BARÈME DE L'APPAREIL de la
 *  charte (§ 3.11 — 1,38 à 1,40 pour l'appareil, 1,50 à 1,52 pour une notice), et une
 *  note est de l'appareil. Il valait 1,42, emprunté au verset de la page Bible, qui est
 *  du texte suivi.
 *  ⚠️ Il commande AUSSI la ligne du numéro en manchette et l'estimation de hauteur
 *  ci-dessous — les trois se tiennent par cette constante, jamais par des valeurs
 *  recopiées. */
export const INTERLIGNE_ENCART = 1.38

/**
 * LE SEUIL DU GRIS TYPOGRAPHIQUE, en signes servis (charte § 3.11).
 *
 * ⛔ Au-dessous, on ne justifie pas : « un libellé, une étiquette, une légende, un
 * message d'état n'ont pas de gris et ne relèvent pas de la règle ». Une note de
 * quarante signes justifiée sur deux lignes étire la première d'un bord à l'autre pour
 * laisser un mot seul sur la seconde — ce que l'auteur a relevé le 2026-09-10.
 *
 * ⚠️ Et la portée est mesurée : sur les 24 302 notes du corpus, la médiane fait dix-sept
 * signes et 92,6 % tiennent sous cent vingt. La justification ne concerne donc qu'une
 * note sur trente — celles qui portent vraiment un paragraphe.
 */
export const SEUIL_GRIS_SIGNES = 250

/**
 * La hauteur que l'encart PRENDRAIT si rien ne le bornait, estimée sur la longueur
 * de la note.
 *
 * ⛔ Elle ne se mesure pas dans le document : `placerFenetre` en a besoin AVANT de
 * poser la boîte, et pour choisir son côté. Une passe de mesure obligerait à rendre
 * l'encart deux fois, une fois invisible.
 *
 * ⛔ ET ELLE SE COMPTE EN REM, non en pixels — la police racine du site est FLUIDE
 * (16 px jusqu'à 1440, jusqu'à 22 au-delà). Tout ce que la boîte contient grandit
 * avec elle : un chiffre écrit en pixels serait juste à une seule taille d'écran, et
 * sous-estimerait d'un tiers sur un grand, ce qui ferait défiler une note de deux
 * lignes. Seuls les FILETS restent en pixels, n'ayant jamais suivi la racine. C'est
 * la règle déjà payée sur la marge de référence de la Polyglotte : un réglage en
 * pixels ne peut pas compenser une différence mesurée en rem.
 *
 * ⚠️ Elle est PLAFONNÉE : `hauteurSouhaitee` sert aussi à décider si la fenêtre se
 * retourne au-dessus de son appel, et une note de dix mille signes qui demanderait
 * six mille pixels ferait basculer toutes les notes longues vers le haut, où elles
 * n'ont pas plus de place. Au-delà, la boîte défile en dedans, comme avant.
 */
export const HAUTEUR_ENCART_MAX_REM = 30

/** La hauteur d'une ligne de texte dans l'encart, en rem. */
const LIGNE_ENCART_REM = Number.parseFloat(CORPS_ENCART) * INTERLIGNE_ENCART
/** Les deux rembourrages, en rem — `REMBOURRAGE_ENCART` ouvre sur l'axe vertical. */
const REMBOURRAGE_VERTICAL_REM = Number.parseFloat(REMBOURRAGE_ENCART) * 2
/** Le blanc qui SÉPARE deux paragraphes d'une note, et que le dernier garde en queue.
 *
 *  ⚠️ Il appartient au propos, non au cadre, et l'oublier dans l'estimation faisait
 *  défiler une note d'une seule ligne. ⛔ Il s'écrit ICI et se lit là où les blocs se
 *  composent : `ContenuNoteStructuree` en portait sa propre valeur, en PIXELS (7 px),
 *  quand tout le reste de l'encart se compte en rem — la police racine du site étant
 *  fluide, un blanc en pixels se resserre tout seul sur un grand écran.
 *  ⚠️ Resserré de 0,5 à 0,375 rem avec le corps de la note (2026-09-08). */
export const MARGE_PARAGRAPHE_ENCART_REM = 0.375
export const MARGE_PARAGRAPHE_ENCART = `${MARGE_PARAGRAPHE_ENCART_REM}rem`
const MARGE_QUEUE_REM = MARGE_PARAGRAPHE_ENCART_REM

/* ── L'APPARAT CRITIQUE, DANS LE MÊME ENCART ───────────────────────────────────
 *
 * ⛔ SA COMPOSITION VIT ICI, avec celle de la note (demande de l'auteur, 2026-09-08 :
 * « l'apparat critique doit suivre le même modèle »). Elle vivait dans le composant,
 * en deux constantes écrites à part et un blanc en PIXELS : c'est exactement la
 * divergence que ce module a réunie en septembre, et elle repoussait déjà — le corps
 * de la note a bougé le 8 au soir, l'apparat ne l'a su que parce qu'il se dit en `em`.
 *
 * ⚠️ Il se compose UN CRAN SOUS la note, et le rapport est le sens même de ces deux
 * valeurs : l'apparat se parcourt, il ne se lit pas comme de la prose — c'est le pied
 * de page d'une édition critique, où les variantes s'entassent au plus serré. ⛔ Le
 * corps se dit donc en `em` DE LA NOTE, jamais en rem : il en descend, il ne s'en
 * détache pas, et il suivra tout resserrement futur sans qu'on y pense.
 */
export const CORPS_APPARAT = '0.94em'
export const INTERLIGNE_APPARAT = 1.34
/** Le blanc entre deux entrées d'apparat : deux tiers de celui d'une note, et en rem
 *  comme tout le reste de l'encart. ⚠️ Il valait 4 px — la seule mesure de l'encart
 *  qui ne suivait pas la police racine, et qui se resserrait donc toute seule sur un
 *  grand écran, là précisément où la place ne manque pas. */
export const MARGE_ENTREE_APPARAT = '0.25rem'
/** La tête et son blanc, quand la note déclare un type. ⚠️ DÉRIVÉE, non recopiée :
 *  la ligne du numéro (0,625 rem sur l'interligne du corps) plus le blanc de
 *  `STYLE_TETE_ENCART`. Un nombre écrit à part se désaccorderait au premier réglage. */
const INTITULE_ENCART_REM = 0.625 * INTERLIGNE_ENCART + 0.25
/** Les deux filets. ⚠️ En PIXELS, comme tout filet du site : un rem les rendrait flous. */
const FILETS_ENCART_PX = 2

/** Signes par ligne dans la mesure de l'encart.
 *
 *  ⛔ IL SE REMESURE À CHAQUE FOIS QUE LE CORPS OU LE REMBOURRAGE BOUGENT, sans quoi
 *  l'estimation de hauteur ment et une note de deux lignes s'ouvre avec un ascenseur.
 *  ⚠️ Remesuré le 8 septembre 2026 au soir, la note étant passée à 0,75 rem et son
 *  blanc à 0,875/1 rem : 412 px de piste — rembourrage de la croix compris, donc le
 *  cas le plus étroit du cadre — et 66,4 signes par ligne sur un échantillon de 332.
 *  On en retient 65 : la barre de défilement rend six pixels de moins quand elle
 *  paraît, et sous-estimer la ligne fait une boîte trop haute, jamais trop courte. */
/**
 * La chasse moyenne d'un signe, en em du corps de la note.
 *
 * ⚠️ MESURÉE sur des notes réelles rendues dans la police du site : 0,525 em, soit
 * 6,3 px à la racine 16. ⛔ Elle ne se devine pas — un « demi-cadratin » posé au juger
 * donnerait 5 %  d'erreur par ligne, et l'erreur s'accumule sur une note de vingt.
 */
const CHASSE_MOYENNE_EM = 0.525

/**
 * COMBIEN DE SIGNES TIENNENT SUR UNE LIGNE, à la largeur où l'encart se compose.
 *
 * ⛔ C'ÉTAIT UNE CONSTANTE, ET ELLE MENTAIT DÈS QUE L'ENCART SE RESSERRAIT. Elle valait
 * 65, calibré sur la mesure PLEINE de 29 rem ; or l'encart se resserre à la marge qu'on
 * lui laisse, et le plancher est descendu à 16 rem le 2026-09-10. Mesuré à cette
 * largeur : 32 signes par ligne, la moitié. La hauteur estimée valait donc 215 px pour
 * une note qui en prend 332, et le placeur bornait la boîte à deux tiers de ce qu'il
 * fallait — la note défilait sans raison.
 *
 * ⚠️ Le plancher de douze signes borne l'absurde : une largeur nulle rendrait une
 * hauteur infinie.
 */
function signesParLigne(largeurPx: number, racine: number): number {
  const piste = largeurPx - FILETS_ENCART_PX - 2 * REMBOURRAGE_LATERAL_REM * racine
  const chasse = CHASSE_MOYENNE_EM * Number.parseFloat(CORPS_ENCART) * racine
  return Math.max(12, piste / chasse)
}

export function hauteurSouhaiteeNote(
  { signes, racine, avecIntitule = false, largeur }:
  {
    signes: number
    racine: number
    avecIntitule?: boolean
    /** La largeur à laquelle l'encart se composera, en pixels. ⚠️ Sa mesure pleine à
     *  défaut : c'est le cas quand il se pose sous son appel, où rien ne le resserre. */
    largeur?: number
  },
): number {
  const parLigne = signesParLigne(largeur ?? LARGEUR_ENCART_REM * racine, racine)
  const lignes = Math.max(1, Math.ceil(Math.max(0, signes) / parLigne))
  const enRem = lignes * LIGNE_ENCART_REM
    + MARGE_QUEUE_REM
    + REMBOURRAGE_VERTICAL_REM
    + (avecIntitule ? INTITULE_ENCART_REM : 0)
  return Math.min(
    HAUTEUR_ENCART_MAX_REM * racine,
    Math.ceil(enRem * racine) + FILETS_ENCART_PX,
  )
}

/** Le nombre de signes d'une note, pour l'estimation ci-dessus. */
export function signesDeLaNote(note: { blocks: readonly { text: string }[] } | string): number {
  return typeof note === 'string'
    ? note.length
    : note.blocks.reduce((total, bloc) => total + bloc.text.length, 0)
}

/**
 * LE CADRE de l'encart : la boîte, son filet d'or, son ombre. Il ne défile PAS.
 *
 * ⛔ Deux éléments et non un, pour que la croix ne défile pas avec le texte. Une
 * croix posée en absolu DANS la zone qui défile s'en va avec elle : son bloc
 * conteneur est la boîte de rembourrage, et le décalage du défilement s'y applique.
 * C'est le corps, à l'intérieur, qui porte le défilement.
 */
export function styleCadreEncart(
  { left, top, hauteurMax, largeur }:
  { left: number; top: number; hauteurMax: number; largeur?: number },
): CSSProperties {
  return {
    position: 'fixed',
    left, top,
    // ⚠️ La largeur RETENUE quand l'encart se range dans une marge plus étroite que
    // lui ; sa mesure pleine partout ailleurs.
    width: largeur ?? LARGEUR_ENCART,
    // ⚠️ La même marge que celle que le placeur réserve, sinon la largeur CSS et le
    // calcul de position ne parlent pas de la même bande (défaut corrigé en août
    // 2026 sur la fenêtre de la page Bible, jamais reporté sur les deux autres).
    maxWidth: `calc(100vw - ${MARGE_FENETRE * 2}px)`,
    maxHeight: hauteurMax,
    overflow: 'hidden',
    // ⚠️ Le CORPS prend la hauteur qui reste, il ne se borne pas lui-même. Un
    // `max-height: inherit` sur l'enfant hérite de la valeur du cadre, laquelle vaut
    // la boîte de BORDURE : deux pixels du bas de la zone défilante passaient alors
    // sous le filet. C'est le patron déjà posé pour toute boîte écrêtée du site —
    // le contenu prend le reste (`flex: 1 1 auto; min-height: 0`).
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--cs-fond)',
    border: '1px solid var(--cs-or-doux)',
    // Le rang « carte, encart » de l'échelle des rayons, non celui d'une puce.
    borderRadius: '8px',
    boxShadow: 'var(--cs-ombre-flottante)',
    zIndex: Z_INFOBULLE,
  }
}

/**
 * LE CORPS : ce qui défile, et le seul endroit où le blanc intérieur se pose.
 *
 * ⛔ SA GÉOMÉTRIE NE DÉPEND DE RIEN, et surtout pas de la présence de la croix.
 * Elle en dépendait — `paddingRight` valait 1 rem au survol et 2,25 rem au clic —,
 * si bien que la note se RECOMPOSAIT sous les yeux à l’instant où on l’épinglait :
 * la piste perdait vingt pixels, le texte se réenroulait, et la boîte n’était plus
 * celle qu’on venait de lire. Relevé de l’auteur, 2026-09-09 : « la mise en forme
 * change légèrement au clic ; j’en ai horreur. »
 *
 * ⚠️ La place de la croix est donc réservée TOUJOURS, montrée ou non. Elle coûte
 * 1,25 rem de piste à un encart de survol, et c’est le prix d’une seule géométrie.
 * ⛔ Ce n’est pas une perte pour l’estimation de hauteur : `SIGNES_PAR_LIGNE` a été
 * mesuré « rembourrage de la croix compris, donc le cas le plus étroit du cadre » —
 * il devient exact au lieu d’être prudent.
 *
 * ⚠️ Les deux autres surfaces ne bougent pas d’un pixel : la page Bible et les
 * traductions parallèles passent toujours `onFermer`, donc portaient déjà ce blanc.
 */
export function styleCorpsEncart(signes: number): CSSProperties {
  // ⛔ LE SEUIL DU GRIS décide de la justification, et il est de la charte (§ 3.11).
  // ⚠️ `signes` est OBLIGATOIRE, et c'est voulu : le compilateur oblige chaque surface
  // à dire la longueur de la note qu'elle compose, au lieu de laisser un défaut décider.
  const gris = signes >= SEUIL_GRIS_SIGNES
  return {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    // ⛔ Le défilement ne se propage pas à la page : piège déjà payé sur les menus
    // de la barre de navigation, où la molette poursuivie au bas d'une liste
    // emportait la page et refermait le menu sous le curseur.
    overscrollBehavior: 'contain',
    // ⚠️ SYMÉTRIQUE : la place de la croix se réserve par un flottant, sur la seule
    // ligne qu'elle occupe (`STYLE_RESERVE_CROIX`), et non plus par un rembourrage qui
    // la retenait sur toute la hauteur.
    padding: REMBOURRAGE_ENCART,
    fontFamily: 'var(--font-source-serif), Georgia, serif',
    fontSize: CORPS_ENCART,
    lineHeight: INTERLIGNE_ENCART,
    color: 'var(--cs-texte-fort)',
    // ⛔ JUSTIFIÉ AU-DESSUS DU SEUIL DU GRIS, ET AU FER SOUS LUI. Il l'était toujours
    // (demande de l'auteur, 2026-09-08), et sur le CORPS plutôt que sur chaque
    // paragraphe, pour que les trois surfaces composent pareil — cela ne change pas.
    // ⚠️ Ce qui change est la CONDITION : une note de quarante signes n'a pas de gris,
    // et la justifier étirait sa première ligne d'un bord à l'autre pour laisser un mot
    // seul sur la seconde. C'est ce que l'auteur a relevé le 2026-09-10, et c'est ce que
    // la charte dit depuis toujours de ce qui se lit d'un coup d'œil.
    // ⚠️ La CÉSURE reste dans les DEUX cas : au fer, une piste de trente signes coupe
    // aussi bien les mots longs. La langue vient du document ou du bloc, qui porte son
    // `lang` quand il n'est pas français.
    // ⚠️ `textAlignLast` rend la DERNIÈRE ligne au fer à gauche : justifiée, une ligne
    // de trois mots s'étirerait d'un bord à l'autre.
    textAlign: gris ? 'justify' : 'left',
    textAlignLast: 'left',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
  }
}

/**
 * LE NUMÉRO, EN MANCHETTE. C'est lui qui dit à quelle note l'encart répond,
 * maintenant que l'intitulé se tait pour les trois cinquièmes du corpus.
 *
 * ⛔ Il FLOTTE, il n'occupe pas une colonne. Rangé dans une gouttière de grille, il
 * réservait ses 2,25 rem sur TOUTE la hauteur de la note : deux mots de large en
 * face d'un développement de vingt lignes, et dix-neuf lignes de blanc perdu à
 * gauche. Le texte l'habille désormais — la première ligne le contourne, les
 * suivantes reprennent la mesure entière. C'est la manchette d'un livre imprimé,
 * et c'est ce que fait déjà le repère d'un commentaire de Fillion.
 *
 * ⚠️ Le flottant est CONTENU par le corps de l'encart, qui défile : un bloc qui
 * défile forme un contexte de formatage, et il enferme ses flottants sans qu'on ait
 * à le lui demander.
 *
 * ⚠️ Il prend la face du numéro de verset de la page Bible — sans, graisse 600,
 * encre faible. ⛔ MAIS PAS SON FER À DROITE : voir `GOUTTIERE_NUMERO`. Un numéro de
 * verset s'aligne à droite parce qu'il en a cinquante sous lui ; celui-ci est seul, en
 * tête d'un objet, et le fer à droite n'y produisait qu'un alinéa.
 */
/** La face du numéro, commune à ses deux poses. */
const FACE_NUMERO: CSSProperties = {
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.625rem',
  fontWeight: 600,
  color: 'var(--cs-texte-faible)',
  userSelect: 'none',
}

/**
 * LE NUMÉRO QUAND IL EST SEUL — il PEND, et le propos l'habille.
 *
 * ⛔ Il flotte, il n'occupe pas une colonne : rangé dans une gouttière, il réservait sa
 * mesure sur toute la hauteur de la note. La mesure entière revient au texte dès la
 * deuxième ligne. C'est le cas de 58 % des notes, qui ne déclarent aucun type.
 *
 * ⚠️ Sa ligne est celle du TEXTE, non la sienne : un chiffre de 0,625 rem posé sur son
 * propre interligne flotterait au-dessus de la première ligne du propos.
 */
export const STYLE_NUMERO_SEUL: CSSProperties = {
  float: 'left',
  width: GOUTTIERE_NUMERO,
  textAlign: 'left',
  paddingRight: '0.5rem',
  userSelect: 'none',
  // ⛔ IL EMPRUNTE LE STRUT DU PROPOS — sa police, son corps, son interligne — et le
  // chiffre s'y pose EN LIGNE (`STYLE_FACE_NUMERO`). Lui donner la seule HAUTEUR d'une
  // ligne du texte ne suffit pas : la ligne de base ne se tient pas au même endroit dans
  // deux boîtes de même hauteur quand les polices diffèrent, l'ascendante d'une sans
  // n'étant pas celle d'une sérif. Mesuré à la racine 22, le chiffre pendait UN pixel
  // au-dessus de la première ligne du propos ; sur le strut, zéro.
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: CORPS_ENCART,
  lineHeight: INTERLIGNE_ENCART,
}

/** La FACE du numéro seul : le chiffre lui-même, en ligne dans le strut ci-dessus. */
export const STYLE_FACE_NUMERO: CSSProperties = { ...FACE_NUMERO }

/**
 * LE NUMÉRO QUAND LA NOTE DÉCLARE UN TYPE — il rejoint la TÊTE, et ne flotte plus.
 *
 * ⛔ Relevé de l'auteur, 2026-09-10 : « revois les alignements, notamment du numéro de
 * note et du type de note ». Le numéro flottait, le type était un BLOC posé à côté de
 * lui, et le propos venait dessous : trois fers à gauche pour trois lignes qui se
 * suivent — mesuré sur la planche, le numéro à 39 px, le type à 78, le texte à 39. Un
 * flottant n'a rien à habiller quand une tête occupe sa ligne : il y entre.
 */
export const STYLE_NUMERO_TETE: CSSProperties = { ...FACE_NUMERO, flexShrink: 0 }

/**
 * LA TÊTE : le numéro et le type, sur une seule ligne, au fer du propos.
 *
 * ⛔ `alignItems: 'baseline'`, et c'est tout l'objet : les deux ne portent pas le même
 * corps (0,625 et 0,5625 rem), et posés dans deux blocs voisins d'un flottant ils
 * tenaient chacun sa propre ligne de base — quatre pixels d'écart, mesurés.
 */
export const STYLE_TETE_ENCART: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.4375rem',
  marginBottom: '0.25rem',
}

export const STYLE_INTITULE_ENCART: CSSProperties = {
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.5625rem',
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--cs-texte-faible)',
  // ⚠️ Une tête tient sur UNE ligne : un type plus long que la piste s'écrête plutôt
  // que d'ouvrir un second rang au-dessus du propos.
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/** La réserve de la croix : un flottant sans hauteur de ligne, qui ne raccourcit que
 *  la première. ⚠️ Sa hauteur est INFÉRIEURE à une ligne, sans quoi elle en mordrait
 *  une seconde. */
export const STYLE_RESERVE_CROIX: CSSProperties = {
  float: 'right',
  width: RESERVE_CROIX,
  height: CORPS_ENCART,
}

/** La croix. ⚠️ Elle ne paraît QUE si l'encart ne se ferme pas de lui-même : sur un
 *  survol, elle promettrait un geste dont on n'a pas besoin, et elle changerait la
 *  forme de l'objet sous le curseur. */
export const STYLE_FERMER_ENCART: CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  // ⛔ `#b0a08a` était écrit en dur dans deux des trois encarts, et gelé au
  // registre des couleurs en dur. Le jeton le remplace, et le registre décroît.
  color: 'var(--cs-texte-faible)',
  fontSize: '0.9375rem',
  lineHeight: 1,
  padding: '0 2px',
}

/**
 * L'appel MARQUÉ tant que son encart est ouvert : le second lien entre l'appel et
 * sa note, celui qu'on suit des yeux en revenant au texte.
 *
 * ⛔ C'est EXACTEMENT la surbrillance du segment actif de la lecture
 * (`.seg-inline--actif`), jeton compris et SANS rayon d'angle : le site dit déjà
 * « voici celui dont on parle » de cette façon, et un second dessin pour le même
 * office serait une seconde grammaire. Un rayon de 2 px y a vécu une heure — hors
 * de l'échelle des rayons (4 · 8 · 12 · 999 · 50 %), et la garde l'a refusé.
 */
export const STYLE_APPEL_OUVERT: CSSProperties = {
  background: 'var(--cs-vert-pale)',
}
