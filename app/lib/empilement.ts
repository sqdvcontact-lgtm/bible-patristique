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

/** Le CHROME DES PAGES DE LECTURE au doigt : le bandeau de chapitre fixé en bas
 *  (`BANDEAU`), puis la barre d'onglets fixée sous la barre de navigation
 *  (`ONGLETS`). Rangés le 21 septembre 2026 (reste de l'audit du 9 septembre, § 8) :
 *  ils vivaient en chiffres, au registre hors échelle. ⚠️ Au-dessus d'une fenêtre de
 *  page, qui ne les couvre donc pas ; SOUS le tiroir et la modale, qui les couvrent.
 *  Les onglets passent devant le bandeau, qu'ils ne croisent jamais. */
export const Z_BANDEAU_LECTURE = 1250
export const Z_ONGLETS_LECTURE = 1300

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

/** Un MENU PORTÉ dans un portail (le choix de bible d'une colonne de la Polyglotte),
 *  et son sous-menu, un cran dessus. Rangés le 21 septembre 2026 : ils vivaient à 3000
 *  et 3001, c'est-à-dire AU RANG de la barre, et ne passaient devant elle que par
 *  l'ordre du document. ⚠️ Au-dessus de la barre, parce qu'un menu ouvert près du haut
 *  de page déborde sur elle ; sous la visite qui couvre la barre. */
export const Z_MENU_PORTE = 3050
export const Z_SOUS_MENU_PORTE = 3051

/** Le carton d'une notification, qui doit se voir quoi qu'on lise. */
export const Z_NOTIFICATION = 4000

/** L'infobulle d'un appel de note : le dernier objet posé sur la page. */
export const Z_INFOBULLE = 9999

/** Les quinze rangs, DANS L'ORDRE, pour la garde. ⛔ On n'en ajoute pas un sans écrire
 *  ce qu'il sert et pourquoi aucun des autres ne suffisait. */
export const ECHELLE_EMPILEMENT: readonly number[] = [
  Z_ATTENTE, Z_FLOTTANT, Z_FENETRE, Z_BANDEAU_LECTURE, Z_ONGLETS_LECTURE,
  Z_TIROIR_VOILE, Z_TIROIR, Z_MODALE, Z_VISITE, Z_BARRE, Z_MENU_PORTE,
  Z_SOUS_MENU_PORTE, Z_VISITE_BARRE, Z_NOTIFICATION, Z_INFOBULLE,
]

/**
 * LES MÊMES RANGS EN JETONS CSS (`--cs-z-…`, globals.css, sur `:root`), pour ce qui
 * s'écrit dans une feuille. ⛔ Les valeurs y sont RECOPIÉES, et la garde
 * (`empilement.test.ts`) vérifie qu'elles n'ont pas dérivé : ce module reste la source.
 */
export const JETONS_EMPILEMENT: Readonly<Record<string, number>> = {
  '--cs-z-attente': Z_ATTENTE,
  '--cs-z-flottant': Z_FLOTTANT,
  '--cs-z-fenetre': Z_FENETRE,
  '--cs-z-bandeau-lecture': Z_BANDEAU_LECTURE,
  '--cs-z-onglets-lecture': Z_ONGLETS_LECTURE,
  '--cs-z-tiroir-voile': Z_TIROIR_VOILE,
  '--cs-z-tiroir': Z_TIROIR,
  '--cs-z-modale': Z_MODALE,
  '--cs-z-visite': Z_VISITE,
  '--cs-z-barre': Z_BARRE,
  '--cs-z-menu-porte': Z_MENU_PORTE,
  '--cs-z-sous-menu-porte': Z_SOUS_MENU_PORTE,
  '--cs-z-visite-barre': Z_VISITE_BARRE,
  '--cs-z-notification': Z_NOTIFICATION,
  '--cs-z-infobulle': Z_INFOBULLE,
}

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
 * la pastille de réinitialisation des volets (2500), et les rangs internes de la barre
 * de navigation (3090, 3100), qui se comparent à elle et non au reste de la page. Les
 * deux barres mobiles de la lecture biblique (1250, 1300) et les menus portés de la
 * Polyglotte (3000, 3001) ont été rangés le 21 septembre 2026.
 */
