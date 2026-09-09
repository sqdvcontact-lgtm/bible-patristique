/**
 * L'ÉCHELLE D'EMPILEMENT — le dernier axe du dessin à recevoir sa garde.
 *
 * La charte le nomme depuis le 23 août 2026 comme le seul axe sans échelle, à côté
 * des trente-deux rangs de l'échelle typographique, des cinq rayons et des jetons de
 * couleur : « quarante valeurs distinctes, de 0 à 9999, pour un besoin qui en demande
 * quatre ou cinq ». Relevé le 9 septembre 2026 : **51 rangs de PAGE écrits en chiffres
 * dans 32 fichiers**, dont 29 tombaient déjà sur l'un des onze rangs ci-dessous. Le
 * désordre était donc moins grand que le compte brut ne le disait — mais il n'était
 * tenu par rien.
 *
 * ⛔ CE MODULE NE GOUVERNE QUE LES RANGS DE PAGE, c'est-à-dire 900 et au-delà. Un
 * `z-index` de 1 à 50 vit DANS un contexte d'empilement — une poignée sur un volet, un
 * chiffre sur une gravure, un voile sur une carte — et ne se compare à rien d'autre
 * qu'à ses frères. L'y faire entrer ferait une échelle de quarante rangs pour éviter
 * une échelle de quarante valeurs.
 *
 * ⛔ IL A ÉTÉ POSÉ SANS RIEN DÉPLACER, puis RÉORDONNÉ le 9 septembre 2026, sur les
 * trois arbitrages de l'auteur consignés en pied. Les rangs ci-dessous ne décrivent
 * donc plus ce que le site FAISAIT, mais ce qu'il DOIT faire ; le registre gelé de
 * `empilementInventaire.ts` a perdu douze de ses vingt-deux entrées ce jour-là.
 *
 * La garde vit dans `empilement.test.ts` : elle refuse tout rang de page qui ne serait
 * ni sur l'échelle, ni au registre gelé. Le registre ne peut que DÉCROÎTRE, comme
 * celui des couleurs en dur.
 */

/** Le voile d'attente d'une navigation : au-dessus du texte, sous tout le reste. */
export const Z_ATTENTE = 900

/** Ce qui SUIT le curseur ou une ligne : la cellule d'actions d'un segment, d'un
 *  verset, d'une cellule de la Polyglotte. ⛔ Il passe SOUS la fenêtre : une fenêtre
 *  est modale, et rien de ce qui accompagne la lecture ne la couvre. Il valait 1500,
 *  donc au-dessus, jusqu'au 9 septembre 2026. */
export const Z_FLOTTANT = 1100

/** Une FENÊTRE de page — fiche, menu, formulaire. Le rang le plus employé du site.
 *  ⚠️ Elle passe SOUS la barre de navigation, et c'est voulu : son calque part de
 *  `HAUTEUR_NAVBAR`, la barre reste visible, et l'on ne perd jamais la sortie. */
export const Z_FENETRE = 1200

/** Le voile d'un tiroir mobile, et le tiroir lui-même. ⚠️ Les deux vont ensemble :
 *  le voile referme au tap, le tiroir se pose dessus. */
export const Z_TIROIR_VOILE = 2400
export const Z_TIROIR = 2401

/** Une fenêtre MODALE : elle couvre le tiroir d'où elle s'ouvre, et à `Z_FENETRE`
 *  elle s'y cacherait. ⛔ C'est le rang de TOUTES les modales du site, sans exception :
 *  elles vivaient à 1000, 1300, 2000, 2100, 2600 et 5000 selon l'écran qui les avait
 *  écrites. Une modale ouverte depuis une autre se pose dessus par l'ordre du
 *  document, qui suffit — la seconde est portée plus tard. */
export const Z_MODALE = 2700

/** La visite guidée. ⚠️ Elle a DEUX rangs : sous la barre pour une visite de page,
 *  au-dessus quand le scénario déclare `couvreLaBarre` — la visite de l'accueil, dont
 *  la barre EST le sujet. */
export const Z_VISITE = 2800
export const Z_VISITE_BARRE = 3200

/** La barre de navigation. ⛔ Elle est peinte par-dessus les fenêtres ET par-dessus
 *  les modales, et c'est la raison pour laquelle un calque part toujours de
 *  `HAUTEUR_NAVBAR` : la barre reste visible, et l'on ne perd jamais la sortie. */
export const Z_BARRE = 3000

/** Le carton d'une notification, qui doit se voir quoi qu'on lise. */
export const Z_NOTIFICATION = 4000

/** L'infobulle d'un appel de note : le dernier objet posé sur la page. */
export const Z_INFOBULLE = 9999

/** Les onze rangs, DANS L'ORDRE, pour la garde. ⛔ On n'en ajoute pas un sans écrire
 *  ce qu'il sert et pourquoi aucun des onze ne suffisait. */
export const ECHELLE_EMPILEMENT: readonly number[] = [
  Z_ATTENTE, Z_FLOTTANT, Z_FENETRE, Z_TIROIR_VOILE, Z_TIROIR,
  Z_MODALE, Z_VISITE, Z_BARRE, Z_VISITE_BARRE, Z_NOTIFICATION, Z_INFOBULLE,
]

/** Le plancher d'un rang de PAGE. Au-dessous, on est dans un contexte local. */
export const PLANCHER_RANG_DE_PAGE = 900

/*
 * ⚠️ LES TROIS QUESTIONS QUE LE CODE NE POUVAIT PAS TRANCHER, tranchées par l'auteur
 * le 9 septembre 2026 (« fais au plus logique ») :
 *
 *  1. Une CELLULE D'ACTIONS flottante passait devant une FENÊTRE. Elle passe désormais
 *     dessous (1500 → 1100). Une fenêtre est modale ; ce qui accompagne la lecture
 *     s'efface devant elle.
 *  2. `ModalLienBiblique` vivait à 5000, seul du site, et couvrait donc la barre. Elle
 *     rejoint `Z_MODALE`, et son calque part de `HAUTEUR_NAVBAR` — sans ce second
 *     geste elle serait simplement passée SOUS la barre.
 *  3. Les fenêtres à 2600 et à 2100 sont des `Z_MODALE`, et il n'y a pas de rang de
 *     plus entre la fenêtre et le tiroir. Les quatre modales à 2000, les trois à 1000
 *     et celle à 1300 les y rejoignent : une modale est une modale.
 *
 * ⚠️ CE QUI RESTE HORS ÉCHELLE n'est PAS de la même famille, et n'a pas été touché :
 * le chrome de page (les deux barres mobiles de la lecture biblique, 1250 et 1300 ; la
 * pastille de réinitialisation des volets, 2500), et les rangs internes de la barre de
 * navigation (3001, 3090, 3100), qui se comparent à elle et non au reste de la page.
 */
