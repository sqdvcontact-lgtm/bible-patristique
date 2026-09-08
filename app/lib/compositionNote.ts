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
 * ⚠️ 20 rem, soit 320 px à la racine 16 — vingt pixels de moins que le plus étroit
 * des trois encarts d'hier, et c'est un choix : c'est ce qui permet à la marge de
 * servir dès 1280 px de fenêtre, où elle n'en offre que 366. Sa piste de texte y
 * vaut encore quarante-quatre signes par ligne. ⛔ La relever d'un rem renverrait
 * l'encart par-dessus le texte sur tous les portables.
 */
export const LARGEUR_ENCART_MIN_REM = 20

export function largeurEncartMinPx(racine: number): number {
  return LARGEUR_ENCART_MIN_REM * racine
}

/** La gouttière du numéro, celle d'un verset sur la page Bible portée à l'échelle
 *  de l'encart : le chiffre s'y range au fer à droite, contre le texte. */
export const GOUTTIERE_NUMERO = '2.25rem'

/** Le blanc intérieur. ⚠️ Trois fois celui d'avant sur l'axe vertical : « avec des
 *  marges, épuré » (demande de l'auteur). Une note est un objet posé, pas une bulle. */
export const REMBOURRAGE_ENCART = '1.125rem 1.25rem'

/** Le corps du texte d'une note : celui de la lecture. ⚠️ Les trois encarts
 *  hésitaient entre 0,78125 et 0,8125 rem ; on prend le plus lisible des deux. */
export const CORPS_ENCART = '0.8125rem'

/** L'interligne. Entre celui de l'apparat (1,3) et celui de la lecture (1,62) :
 *  l'encart tient une soixantaine de signes par ligne, il respire. */
export const INTERLIGNE_ENCART = 1.5

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
/** ⚠️ Le DERNIER paragraphe d'une note garde sa marge de queue : elle appartient au
 *  propos, non au cadre, et l'oublier faisait défiler une note d'une seule ligne. */
const MARGE_QUEUE_REM = 0.5
/** L'intitulé et son blanc, quand il y en a un. */
const INTITULE_ENCART_REM = 1.125
/** Les deux filets. ⚠️ En PIXELS, comme tout filet du site : un rem les rendrait flous. */
const FILETS_ENCART_PX = 2

/** Signes par ligne dans la mesure de l'encart. ⚠️ MESURÉ sur la composition réelle
 *  (planche du 8 septembre 2026) : 355 px de piste — la mesure quand la barre de
 *  défilement paraît, donc le pire cas — pour 6,25 px le signe. */
const SIGNES_PAR_LIGNE = 63

export function hauteurSouhaiteeNote(
  { signes, racine, avecIntitule = false }:
  { signes: number; racine: number; avecIntitule?: boolean },
): number {
  const lignes = Math.max(1, Math.ceil(Math.max(0, signes) / SIGNES_PAR_LIGNE))
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
    zIndex: 9999,
  }
}

/** LE CORPS : ce qui défile, et le seul endroit où le blanc intérieur se pose. */
export function styleCorpsEncart(avecCroix: boolean): CSSProperties {
  return {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    // ⛔ Le défilement ne se propage pas à la page : piège déjà payé sur les menus
    // de la barre de navigation, où la molette poursuivie au bas d'une liste
    // emportait la page et refermait le menu sous le curseur.
    overscrollBehavior: 'contain',
    padding: REMBOURRAGE_ENCART,
    // ⚠️ La croix flotte au coin : on lui réserve sa place, sinon la première ligne
    // du propos lui passe dessous.
    paddingRight: avecCroix ? '2.25rem' : undefined,
    fontFamily: 'var(--font-source-serif), Georgia, serif',
    fontSize: CORPS_ENCART,
    lineHeight: INTERLIGNE_ENCART,
    color: 'var(--cs-texte-fort)',
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
 * encre faible — et son fer à droite : le site pose déjà ainsi tout chiffre qui
 * accompagne un texte sans lui appartenir.
 */
export const STYLE_NUMERO_ENCART: CSSProperties = {
  float: 'left',
  width: GOUTTIERE_NUMERO,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.625rem',
  fontWeight: 600,
  color: 'var(--cs-texte-faible)',
  textAlign: 'right',
  paddingRight: '0.625rem',
  // ⚠️ Sa ligne est celle du TEXTE, non la sienne : un chiffre de 0,625 rem posé sur
  // son propre interligne flotterait au-dessus de la première ligne du propos.
  lineHeight: INTERLIGNE_ENCART * Number.parseFloat(CORPS_ENCART) / 0.625,
  userSelect: 'none',
}

/** L'intitulé, quand la note a un type à déclarer. La rubrique du site. */
export const STYLE_INTITULE_ENCART: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.5625rem',
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--cs-texte-faible)',
  marginBottom: '0.375rem',
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
