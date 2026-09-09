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
 * ⛔ ET IL NE DÉPLACE RIEN. Les onze rangs sont ceux que le site emploie DÉJÀ, avec le
 * sens qu'il leur donne déjà : on les nomme, on ne les réordonne pas. Réordonner
 * demanderait de trancher trois questions que le code ne peut pas trancher seul — voir
 * la note en pied.
 *
 * La garde vit dans `empilement.test.ts` : elle refuse tout rang de page qui ne serait
 * ni sur l'échelle, ni au registre gelé de `empilementInventaire.ts`. Le registre ne
 * peut que DÉCROÎTRE, comme celui des couleurs en dur.
 */

/** Le voile d'attente d'une navigation : au-dessus du texte, sous tout le reste. */
export const Z_ATTENTE = 900

/** Une FENÊTRE de page — fiche, menu, formulaire. Le rang le plus employé du site.
 *  ⚠️ Elle passe SOUS la barre de navigation, et c'est voulu : son calque part de
 *  `HAUTEUR_NAVBAR`, la barre reste visible, et l'on ne perd jamais la sortie. */
export const Z_FENETRE = 1200

/** Ce qui SUIT le curseur ou une ligne : la cellule d'actions d'un segment, d'un
 *  verset, d'une cellule de la Polyglotte. */
export const Z_FLOTTANT = 1500

/** Le voile d'un tiroir mobile, et le tiroir lui-même. ⚠️ Les deux vont ensemble :
 *  le voile referme au tap, le tiroir se pose dessus. */
export const Z_TIROIR_VOILE = 2400
export const Z_TIROIR = 2401

/** Une fenêtre qui doit couvrir un TIROIR : elle s'ouvre depuis l'un d'eux, et à
 *  `Z_FENETRE` elle s'y cacherait. */
export const Z_MODALE = 2700

/** La visite guidée. ⚠️ Elle a DEUX rangs : sous la barre pour une visite de page,
 *  au-dessus quand le scénario déclare `couvreLaBarre` — la visite de l'accueil, dont
 *  la barre EST le sujet. */
export const Z_VISITE = 2800
export const Z_VISITE_BARRE = 3200

/** La barre de navigation. ⛔ Elle est peinte par-dessus les fenêtres, et c'est la
 *  raison pour laquelle un calque part toujours de `HAUTEUR_NAVBAR`. */
export const Z_BARRE = 3000

/** Le carton d'une notification, qui doit se voir quoi qu'on lise. */
export const Z_NOTIFICATION = 4000

/** L'infobulle d'un appel de note : le dernier objet posé sur la page. */
export const Z_INFOBULLE = 9999

/** Les onze rangs, pour la garde. ⛔ On n'en ajoute pas un sans écrire ce qu'il sert
 *  et pourquoi aucun des onze ne suffisait. */
export const ECHELLE_EMPILEMENT: readonly number[] = [
  Z_ATTENTE, Z_FENETRE, Z_FLOTTANT, Z_TIROIR_VOILE, Z_TIROIR,
  Z_MODALE, Z_VISITE, Z_BARRE, Z_VISITE_BARRE, Z_NOTIFICATION, Z_INFOBULLE,
]

/** Le plancher d'un rang de PAGE. Au-dessous, on est dans un contexte local. */
export const PLANCHER_RANG_DE_PAGE = 900

/*
 * ⚠️ TROIS QUESTIONS QUE LE CODE NE PEUT PAS TRANCHER, et qui restent ouvertes :
 *
 *  1. Une CELLULE D'ACTIONS flottante (1500) passe-t-elle devant une FENÊTRE (1200) ?
 *     Aujourd'hui oui. Une fenêtre est pourtant modale, et rien ne devrait la couvrir.
 *  2. Faut-il un rang de fenêtre AU-DESSUS de la barre ? `ModalLienBiblique` est à
 *     5000, seul du site, et couvre donc la barre — alors que la charte veut qu'un
 *     calque parte de `HAUTEUR_NAVBAR` précisément pour la laisser voir.
 *  3. Les trois fenêtres à 2600 (citation favorite, compte requis, livre absent) et
 *     les trois à 2100 (fiche d'auteur, messagerie, admin) sont-elles des `Z_MODALE`,
 *     ou faut-il un rang de plus entre la fenêtre et le tiroir ?
 */
