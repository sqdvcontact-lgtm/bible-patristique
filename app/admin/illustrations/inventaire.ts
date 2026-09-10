// ── Recensement des illustrations du site ────────────────────────────────────
//
// Ce fichier est la SOURCE : il dit, pour chaque image dessinée du site, ce
// qu'elle fait là et comment la page la traite. Rien de tout cela ne se déduit
// d'un dossier — un scan de `public/` donnerait des noms de fichiers, jamais une
// fonction. La planche de l'administration lit ce recensement, mesure le poids
// des fichiers au passage, et montre chaque image telle qu'elle est SERVIE
// (opacité, fusion, filtre du Cuir), non telle qu'elle dort sur le disque.
//
// ⚠️ Le recensement doit rester complet : `inventaire.test.ts` compare cette
// liste au contenu réel de `public/`. Une image ajoutée sans entrée ici fait
// échouer le test, et une entrée dont le fichier a disparu aussi. C'est le seul
// moyen d'empêcher la planche de mentir par omission.
//
// Hors de cette liste, à dessein : les FAMILLES NOMBREUSES (fac-similés de la
// Bible 899, portraits d'auteurs, couvertures de traductions, gravures Fillion).
// Elles se comptent par milliers, ne se jugent pas au regard de l'harmonie
// décorative, et la planche les présente à part, par leur volume.

/** Ce que la page fait de l'image. Sert d'intitulé de groupe sur la planche :
 *  l'ordre des clés est l'ordre d'affichage, du plus décoratif au plus utilitaire. */
export const FONCTIONS = {
  'blanc': {
    titre: 'Occuper un blanc',
    propos: 'Ces gravures ne paraissent que sur un écran vide : aucun commentaire, aucune recherche lancée, un livre absent de la traduction. Ce sont elles qui donnent son ton au site quand il n’a rien à dire, et elles se ressemblent toutes par leur retenue : opacité basse, fondu au papier.',
  },
  'ouvrir': {
    titre: 'Ouvrir une page',
    propos: 'Une grande gravure en tête de page, qui porte encore le propos. Elle se tient plus haute en intensité qu’un cul-de-lampe, parce qu’on la regarde au lieu de la longer.',
  },
  'coiffer': {
    titre: 'Coiffer un titre',
    propos: 'Filets et fleurons qui ferment un titre au lieu de l’annoncer.',
  },
  'carte': {
    titre: 'Illustrer une carte',
    propos: 'Les deux portes de l’accueil. Elles se lisent ensemble, à taille égale, dans la même rangée : leur désaccord se verrait immédiatement. Elles étaient trois jusqu’au 31 août 2026, la Communauté ayant été retirée de la page.',
  },
  // ⛔ « Marquer un bouton » a été RETIRÉ le 2026-09-10, avec les deux silhouettes
  // qu'il coiffait : la messagerie et les notifications de la barre portent depuis
  // lors des SVG en `currentColor`, et plus aucune image du dépôt ne sert de masque
  // de bouton. Un intitulé sans image serait un groupe vide sur la planche, donc une
  // rubrique qui promet ce qu'elle n'a pas — et `inventaire.test.ts` le refuse.
  // Le rouvrir demande une image qui l'emploie, non l'inverse.
  'identite': {
    titre: 'Porter l’identité',
    propos: 'Le chiffre CS, la vignette de partage, les icônes d’onglet. Le chiffre est la marque du site depuis le 6 septembre 2026, et il est la SEULE : la barre de navigation portait jusque-là un monogramme gothique quand le bas de l’accueil portait ce chiffre-ci, deux dessins pour une seule maison. Les autres sont les seules images que l’on voit HORS du site, dans un onglet ou dans un message.',
  },
  'marque': {
    titre: 'Signer une édition',
    propos: 'La marque d’imprimeur de Corpus Scriptura, posée sur la page de titre de chaque œuvre, à la manière des impressions anciennes.',
  },
  'partenaire': {
    titre: 'Signer un partenaire',
    propos: 'Logos dessinés pour les librairies recommandées. Chacun est un dessin maison, non le logo officiel de la maison.',
  },
  'jeu': {
    titre: 'Décorer le jeu',
    propos: 'Frise du Holy Guessr. ⚠️ Aucune de ces images ne paraît sur le site : la route /quiz renvoie un 404 en production, le temps que le jeu soit prêt. Elles ne se voient donc qu’ici, et sur le serveur de développement.',
  },
  'reserve': {
    titre: 'En réserve',
    propos: 'Présentes dans le dépôt, appelées par aucune page. Ce sont des variantes écartées, des dessins mis de côté et des restes d’un ancien mode de service. Elles pèsent pourtant dans le dépôt, et elles pèseront dans le jugement du jour où on les emploiera.',
  },
} as const

export type CleFonction = keyof typeof FONCTIONS

/** Comment la page traite l'image. La planche le reproduit à l'identique : sans
 *  cela, on jugerait un fichier au lieu de juger ce que le lecteur voit. */
export type Traitement = {
  /** Opacité appliquée par la page. */
  opacite?: number
  /** `mix-blend-mode`. `multiply` fond un fond blanc dans le papier ; `screen` fait
   *  l'inverse sur une carte sombre. Une image détourée n'en a pas besoin. */
  fusion?: 'multiply' | 'screen'
  /** L'image sert de masque : la couleur vient de `currentColor`, pas du fichier. */
  masque?: boolean
  /** Porte la classe `.cs-ornement`, donc subit `invert(.88) sepia(.5) saturate(.6)`
   *  en thème Cuir. Sans elle, l'image reste telle quelle dans le sombre. */
  ornement?: boolean
  /** Ce que la page POSE vraiment, recopié de sa source. Voir `Pose`. */
  pose?: Pose
}

/** Le SOL sous lequel une image paraît RÉELLEMENT. Toutes ne vivent pas sur le
 *  papier : les silhouettes de la barre sont sur l'aplat vert, les icônes des
 *  trois cartes d'accueil sur un cartonnage sombre, les logos de librairie sur
 *  une surface blanche. Juger une image sur un fond qu'elle ne rencontre jamais
 *  n'apprend rien. */
export type CleSol = 'papier' | 'surface' | 'vert' | 'carte'

/** LA POSE — les dimensions que la page écrit, telles qu'elle les écrit.
 *
 *  ⛔ Machine-lisible, et c'est tout le point. La prose qui la précédait avait
 *  DÉRIVÉ sans que rien ne le dise : trois écrans d'attente y étaient donnés
 *  pour « au plus 51rem » quand leur source pose `min(68rem, 96 %)`. Une valeur
 *  qu'on peut APPLIQUER se compare à sa source et se rejoue à la taille réelle ;
 *  une phrase, non.
 *
 *  ⚠️ On pose `largeur` OU `hauteur`, selon la dimension que la page fixe, et
 *  l'autre reste automatique : c'est la règle de la charte, une illustration se
 *  borne par des MAXIMA plutôt que par une largeur posée, faute de quoi elle
 *  s'écrase quand la fenêtre est basse. */
export type Pose = {
  largeur?: string
  hauteur?: string
  largeurMax?: string
  hauteurMax?: string
  sol: CleSol
}

export type Illustration = {
  /** Chemin public. Sert de clé, et de chemin disque sous `public/`. */
  chemin: string
  nom: string
  fonction: CleFonction
  /** Ce qu'elle fait là, en une phrase. */
  emploi: string
  /** Où aller la voir en place. Absent pour ce qui ne paraît sur aucune page.
   *
   *  ⛔ L'adresse doit MONTRER l'image, non ouvrir la page qui pourrait la montrer.
   *  Une gravure d'état vide ne paraît qu'à une condition précise : un chapitre sans
   *  apparat, une traduction sans le livre demandé, un volet où l'on n'a pas encore
   *  cliqué. L'adresse porte donc ses paramètres, et `repere` dit où poser les yeux
   *  en arrivant. Un lien qui ouvre `/bibliotheque` pour une gravure qui vit dans le
   *  volet d'une œuvre ne renvoie nulle part. */
  lieu?: { href: string; label: string; repere: string }
  /** Fichier de code qui l'appelle, pour retrouver son réglage. */
  source?: string
  traitement?: Traitement
  /** Remarque d'atelier : ce qui cloche, ce qu'il faudrait reprendre. */
  note?: string
}

export const ILLUSTRATIONS: Illustration[] = [
  // ── Occuper un blanc ───────────────────────────────────────────────────────

  {
    chemin: '/ornements/desert-fosse.png',
    nom: 'Le désert et la fosse',
    fonction: 'blanc',
    emploi: 'Tient la page de recherche avant qu’on ait lancé la moindre requête.',
    lieu: { href: '/recherche', label: 'Recherche', repere: 'Au centre, sous la barre de recherche, tant qu’aucune requête n’est lancée.' },
    source: 'app/recherche/RechercheClient.tsx',
    traitement: { opacite: 0.92, ornement: true, pose: { largeurMax: 'min(68rem, 96%)', hauteurMax: 'calc(100dvh - 3.5rem - 15rem)', sol: 'papier' } },
    note: 'A remplacé les cristaux. Elle reprend la pose de la tour de Babel sur le Polyglotte, et pour la même raison : sur PC cette colonne fait TOUTE la hauteur sous la navbar et se trouve entièrement vide, l’intitulé, la recherche et les onglets vivant dans le volet de gauche. C’est donc un écran d’attente et non un blanc de pied de page — même mesure, même opacité, même encre, même invite en sérif italique. ⚠️ Le centrage vertical vient du flux, la zone étant de hauteur définie sur PC ; en mobile elle ne l’est pas et le groupe reprend des marges. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },

  {
    chemin: '/ornements/arbre-ardent.png',
    nom: 'Arbre ardent',
    fonction: 'blanc',
    emploi: 'Invite à cliquer sur un paragraphe, dans le volet resté vide d’une œuvre.',
    lieu: { href: '/oeuvre/A0010O0002', label: 'La Cité de Dieu', repere: 'Volet de droite, tant qu’aucun paragraphe n’est choisi. Cliquer dans le texte la fait disparaître.' },
    source: 'app/oeuvre/[id]/OeuvreClient.tsx',
    traitement: { opacite: 0.42, ornement: true, pose: { largeurMax: 'min(24rem, 88%)', hauteurMax: 'calc(100dvh - 3.5rem - 11.5rem)', sol: 'papier' } },
    note: 'A remplacé le buisson ardent le 2026-08-26 : celui-ci tenait 190 px dans un volet qui en fait de 200 à 560, et ornait un coin de la colonne au lieu de l’habiter. Écart moyen au papier, à la taille servie : 9,7 contre 4,0 — la présence vient de la mesure, l’opacité n’a pas bougé.',
  },
  {
    chemin: '/ornements/arbre-corbeau.png',
    nom: 'Arbre au corbeau',
    fonction: 'blanc',
    emploi: 'Dit qu’un paragraphe ne porte aucun lien biblique, dans le volet de droite d’une œuvre.',
    lieu: { href: '/oeuvre/A0010O0002', label: 'La Cité de Dieu', repere: 'Volet de droite, après avoir cliqué un paragraphe dépourvu de référence biblique.' },
    source: 'app/oeuvre/[id]/OeuvreClient.tsx',
    traitement: { opacite: 0.42, ornement: true, pose: { largeurMax: 'min(24rem, 88%)', hauteurMax: 'calc(100dvh - 3.5rem - 13.5rem)', sol: 'papier' } },
    note: 'Répond à l’arbre ardent du même volet, dont elle reprend la mesure : les deux états du volet se ressemblent au lieu de se contredire. L’arbre est ici mort et le corbeau seul — l’absence se dit par l’image avant de se dire par la phrase. Le plafond de hauteur réserve 13,5 rem au lieu de 11,5 : le bouton de proposition se pose sous l’invite et sortirait de l’écran sur une fenêtre basse. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },
  {
    chemin: '/ornements/carapace-posee.png',
    nom: 'Carapace posée',
    fonction: 'blanc',
    emploi: 'Dit qu’un passage n’a reçu ni commentaire ni apparat, dans le volet de droite d’une œuvre comme dans celui de la Bible.',
    lieu: { href: '/?livre=NUM&chapitre=7&trad=TR0001', label: 'Nombres 7', repere: 'Volet des Pères, à droite. Ce chapitre est le plus long du corpus à n’avoir reçu aucun apparat : la gravure y tient seule la colonne.' },
    source: 'app/components/PanneauPatristique.tsx',
    traitement: { opacite: 0.42, ornement: true, pose: { largeurMax: 'min(20rem, 82%)', hauteurMax: 'calc(100% - 3.5rem)', sol: 'papier' } },
    note: 'Trois poses, une seule planche : les deux volets de commentaires — celui de la Bible et celui d’une œuvre, ce dernier dans app/oeuvre/[id]/OngletCommentaires.tsx — et le « Aucune occurrence » de l’apparat. Elle a remplacé la carapace couchée, qui disait la même absence sous un autre dessin selon la page où l’on se trouvait. Dans les deux volets de commentaires elle se pose au MILIEU de la zone défilante, en largeur comme en hauteur ; cette hauteur vient du flux, la zone étant déjà « flex: 1 ». Sur « Aucune occurrence » elle reste dans le flux, sous les sous-onglets. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },

  {
    chemin: '/ornements/cite-ruinee.png',
    nom: 'Cité ruinée',
    fonction: 'reserve',
    emploi: 'A dit, du 26 août au 4 septembre 2026, qu’une traduction ne comportait pas le livre demandé. Retirée sur décision de l’auteur (« supprimer le dessin ») le jour où la barre s’est mise à rouvrir la Bible sur le dernier livre lu : l’écran se rencontre désormais plus souvent, et un état qu’on traverse ne se compose pas comme une page de titre. La mention seule est restée. La planche demeure au dépôt, sans emploi.',
    traitement: { opacite: 0.92, ornement: true },
    note: 'Une cité basse sur un horizon vide, sa fumée seule montant dans le blanc : l’encre franche n’occupe que 1 510 sur 397 d’un cadre de 1 600 sur 1 194, et ce vide EST le propos. La marge négative sous la gravure revient pour cette raison, le quart inférieur du cadre étant un sol presque vide : le texte se pose à la lisière du sol plutôt que loin sous la planche. ⚠️ Une marge négative se règle sur la COMPOSITION et ne se reconduit pas d’un dessin à l’autre — la planche intermédiaire de colonnades descendait au ras des pierres et l’avait fait ôter. ⛔ Trois reprises que la charte réclamait sur cette pose : elle passait par Image de Next, dont l’optimiseur aplatit parfois l’alpha sur du blanc et fait reparaître le fond ; le mix-blend-mode était mort, la planche étant détourée ; et la largeur de 190 px, absolue, ne suivait pas la police racine. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, l’ALPHA étant calculé sur cette encre et non sur la médiane de la planche. Profil de gravure au trait : 87,1 % de transparents pour 11,1 % de partiels. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste. ⚠️ Son bloc SORT de la mesure de lecture, et il le faut : les trois grandes gravures du site — Babel sur le Polyglotte, le désert sur la recherche, la cité ici — partagent la même pose, mais celle-ci vivait dans une colonne de 620 px quand les deux autres ont toute la largeur. Elle s’affichait à 549 contre 816. La largeur du bloc est celle qui rend exactement 51rem une fois les 96 % du maximum appliqués, soit 53,125rem, et le débordement se centre sur l’axe du parent.',
  },


  {
    chemin: '/ornements/ordinateur-ardent.png',
    nom: 'Ordinateur ardent',
    fonction: 'blanc',
    emploi: 'Ferme le message qui demande un écran large, sur la Polyglotte ouverte depuis un téléphone.',
    lieu: { href: '/polyglotte', label: 'Polyglotte', repere: 'En pied du message, sur un écran de moins de 820 px de large. À voir en réduisant la fenêtre.' },
    source: 'app/polyglotte/page.tsx',
    traitement: { opacite: 0.92, ornement: true, pose: { largeurMax: 'min(16rem, 76%)', hauteurMax: '46dvh', sol: 'papier' } },
    note: 'A remplacé l’ordinateur de Pentecôte. Même propos : l’ordinateur sous les langues de feu, l’alpha et l’oméga sur le moniteur, la Polyglotte dite en une image. Intensité et encre sont celles de la tour de Babel ruinée, qui occupait l’autre bout de la même page jusqu’au 4 septembre 2026 : c’est désormais le seul écran de la Polyglotte qui n’ait qu’une gravure pour tout contenu. ⚠️ La planche est en HAUTEUR là où la précédente était en largeur, d’où un plafond de hauteur qui n’est pas décoratif : sur un téléphone bas, elle chasserait le texte hors de l’écran. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },


  // ── Ouvrir une page ────────────────────────────────────────────────────────
  {
    chemin: '/ornements/tour-babel-ruinee.png',
    nom: 'Tour de Babel ruinée',
    fonction: 'reserve',
    emploi: 'A occupé seule l’écran d’accueil du Polyglotte, sous l’invite « Ouvrez un livre », du 19 août au 4 septembre 2026. Cet écran n’existe plus : la page s’ouvre désormais sur le dernier passage lu, ou sur la Genèse (décision de l’auteur, « supprimer le dessin et afficher soit le dernier emplacement de lecture de l’utilisateur, soit la Genèse »). La planche reste au dépôt, sans emploi.',
    traitement: { opacite: 0.92, ornement: true },
    note: 'A remplacé la tour intacte, sans que la pose change : deux maxima, aucune largeur posée. Elle pèse le quart des 2 114 Ko de la précédente, qui était la plus lourde image servie du site pour un simple écran d’attente. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },

  {
    chemin: '/ornements/semeur.png',
    nom: 'Le semeur',
    fonction: 'ouvrir',
    emploi: 'Ouvre la page du don : une main confie un grain au sillon.',
    lieu: { href: '/soutenir', label: 'Soutenir', repere: 'En tête de page, au-dessus du titre.' },
    source: 'app/soutenir/page.tsx',
    traitement: { opacite: 0.92, fusion: 'multiply', ornement: true, pose: { largeur: 'clamp(150px, 8vw + 8vh, 250px)', sol: 'papier' } },
  },
  {
    chemin: '/ornements/chantier.png',
    nom: 'Les bâtisseurs',
    fonction: 'ouvrir',
    emploi: 'Ouvre la page du chantier.',
    lieu: { href: '/chantier', label: 'Chantier', repere: 'Tout en haut, en ouverture de page. Mesurée à 2 % de la hauteur.' },
    source: 'app/chantier/page.tsx',
    traitement: { ornement: true, pose: { largeur: '25rem', largeurMax: '100%', sol: 'papier' } },
  },
  {
    chemin: '/ornements/vigne-grappe.png',
    nom: 'Vigne et grappe',
    fonction: 'ouvrir',
    emploi: 'Ponctue le bas de la page du chantier. Trois ornements sur cette page, jamais davantage : au-delà, ils l’encombrent.',
    lieu: { href: '/chantier', label: 'Chantier', repere: 'Tout en bas, juste avant le colophon. Mesurée à 96 % de la hauteur.' },
    source: 'app/chantier/page.tsx',
    traitement: { opacite: 0.75, ornement: true, pose: { largeur: '11.25rem', largeurMax: '100%', sol: 'papier' } },
  },
  {
    chemin: '/ornements/clochettes.png',
    nom: 'Clochettes',
    fonction: 'ouvrir',
    emploi: 'Sépare deux moments de la page du chantier.',
    lieu: { href: '/chantier', label: 'Chantier', repere: 'À mi-hauteur exactement, entre deux sections. Mesurée à 49 %.' },
    source: 'app/chantier/page.tsx',
    traitement: { opacite: 0.7, ornement: true, pose: { largeur: '13.125rem', largeurMax: '100%', sol: 'papier' } },
  },

  // ── Coiffer un titre ───────────────────────────────────────────────────────
  {
    chemin: '/icons/home-title-ornament.png',
    nom: 'Filet gravé du frontispice',
    fonction: 'coiffer',
    emploi: 'Ferme le titre de l’accueil. La gravure EST le filet, elle ne l’accompagne pas.',
    lieu: { href: '/accueil', label: 'Accueil', repere: 'En tête, juste SOUS le titre du site, qu’elle ferme au lieu de l’annoncer.' },
    source: 'app/accueil/page.tsx',
    traitement: { opacite: 0.72, pose: { largeur: 'min(265px, 48vw)', sol: 'papier' } },
    note: '⚠️ Son encre est CLAIRE — luminance 186, un or pâle — et non les 33 de la famille. C’est pourquoi elle ne porte pas la classe « cs-ornement » et ne se retourne pas au Cuir : elle y est déjà lisible. Elle fait exception, et l’exception est ici écrite plutôt que devinée.',
  },

  {
    chemin: '/ornements/filet-un-mot.png',
    nom: 'Filet gravé du mot de l’auteur',
    fonction: 'reserve',
    emploi: 'A coiffé le titre « Un mot » de l’accueil le 31 août 2026, une soirée. Le fleuron à filets a repris sa place le soir même, sur décision de l’auteur.',
    note: 'Planche fournie par l’auteur, fabriquée par la chaîne commune (scripts/ornements-detourer.mjs) : pourtour rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage par la luminance, encre reposée à 33, celle de la famille. Profil de gravure au TRAIT, 83 % de transparents. Servie en 214 × 40 pour 112 px d’affichage, rapport 1,91. ⚠️ Elle avait d’abord été posée à 14 rem, deux fois trop grosse : elle écrasait le titre qu’elle ferme. ⚠️ Et le défaut de fond était ailleurs : la gravure est DIRECTIONNELLE, elle pointe vers la droite, quand toute la grammaire ornementale du site est symétrique — le filet du frontispice, le fleuron, le quadrilobe. Un ornement qui ferme un titre ne va nulle part. Deux symétrisations ont été essayées, deux pointes et deux fleurons, avant que l’auteur ne revienne au fleuron. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.',
  },


  {
    chemin: '/ornements/fleuron-croix.png',
    nom: 'Fleuron — croix fleurdelisée',
    fonction: 'coiffer',
    emploi: "LE FLEURON DU SITE : il sépare la page de titre du texte sur toute œuvre qui n’en demande pas d’autre. Croix fleurdelisée en losange, symétrique sur ses DEUX axes — la seule du jeu à l’être, et c’est ce qui en fait le fleuron du site : un ornement de séparation ne va nulle part.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 70 × 86 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-fleur-de-lys.png',
    nom: 'Fleuron — fleur de lys',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Fleuron plein, livré le 27 août 2026 avec le chiffre CS et le brin de lavande. Il est dense : posé un cran plus bas que les autres, sans quoi il pèserait plus que le titre qu’il suit.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.5rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 63 × 80 pour une pose de 2.5rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-acanthe.png',
    nom: 'Fleuron — acanthe',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Bouquet d’acanthe, le plus DENSE du jeu — un tiers de son plan est de l’encre pleine.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 63 × 88 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/ornement-entrelacs.png',
    nom: 'Fleuron — entrelacs',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Quadrilobe lacé d’un seul ruban. ⚠️ Il est le plus proche parent du QUADRILOBE de la citation favorite, qui dit « choisi » : deux marques voisines pour deux gestes distincts promettent au lecteur une action qu’elles ne font pas.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 66 × 87 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-volutes.png',
    nom: 'Fleuron — volutes',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Fleuron vertical à deux grandes volutes, d’un trait fin — d’où une pose plus haute que celle des ornements carrés.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '3.25rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 60 × 103 pour une pose de 3.25rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-pendentif.png',
    nom: 'Fleuron — pendentif',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Fleuron vertical à pendentif de perles, deux fois et demie plus haut que large. ⚠️ Le trait le plus FIN du jeu : sa pose est la plus grande, et il disparaîtrait à la hauteur d’un fleuron carré.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '4rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 52 × 127 pour une pose de 4rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-lavande.png',
    nom: 'Fleuron — brin de lavande',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Brin de lavande, livré le 27 août 2026. ⚠️ Le seul ornement du jeu qui PENCHE : il n’est symétrique sur aucun axe, et son trait très fin le rend pâle. À réserver aux pages où l’on veut à peine une respiration.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '3rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 83 × 96 pour une pose de 3rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleur-cinq-petales.png',
    nom: 'Fleuron — fleur à cinq pétales',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Fleur à cinq pétales, pleine et large : elle se pose plus bas que les fleurons hauts, et c’est le contour qui la fait lire, non son détail.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.5rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 85 × 79 pour une pose de 2.5rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/croix-gothique.png',
    nom: 'Fleuron — croix gothique',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Croix pattée à branches fleurdelisées, pleine. Symétrique sur son seul axe vertical, elle sépare sans hésiter mais porte un propos que les fleurons n’ont pas.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 58 × 88 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/oeil-fleurdelise.png',
    nom: 'Fleuron — œil fleurdelisé',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Œil ouvert dans un losange fleurdelisé, du répertoire emblématique du XVIIe siècle.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 81 × 90 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/couronne-epines.png',
    nom: 'Fleuron — couronne d’épines',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Couronne d’épines. Le seul ornement ROND du jeu, donc le seul plus large que haut : il se pose d’autant plus bas.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.5rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 73 × 70 pour une pose de 2.5rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/ornement-memento-mori.png',
    nom: 'Fleuron — memento mori',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Crâne dans un cartouche fleurdelisé, du répertoire funéraire des impressions anciennes.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 66 × 89 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/poisson-ichthys.png',
    nom: 'Fleuron — poisson',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. L’ichthys des premiers chrétiens. ⚠️ Il est FIGURATIF et tourné vers la droite : il regarde quelque part, ce qu’un ornement de séparation ne fait pas — à choisir en connaissance de cause.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 68 × 86 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/serpent-love.png',
    nom: 'Fleuron — serpent',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Serpent lové en S, d’un trait large et calligraphique.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.875rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 76 × 91 pour une pose de 2.875rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/serpent-croissant.png',
    nom: 'Fleuron — serpent au croissant',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Serpent dressé devant un croissant. Le plus haut du jeu, et sa pose suit.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '3.625rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 60 × 116 pour une pose de 3.625rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin : un dessin dense pèse plus qu’un dessin ajouré à taille égale. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/ornements-source/, hors dépôt.",
  },
  {
    chemin: '/ornements/fleuron-raisin.png',
    nom: 'Fleuron — grappe de raisin',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Grappe de raisin sous sa feuille de vigne, du répertoire eucharistique. Livrée le 10 septembre 2026 avec les deux blés et le rameau.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.5rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 56 × 79 pour une pose de 2.5rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin, sur les deux sols : c’est le plus DENSE des quatre — 27 % de son plan est de l’encre pleine — et il prend donc la pose la plus courte du groupe, celle de la couronne d’épines ; d’un cran plus haut il pesait plus que le titre qu’il suit. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/fleurons-source/, hors dépôt, et sa copie de chaîne dans C:\Corpus Scriptura\ornements-originaux-20260823.",
  },
  {
    chemin: '/ornements/fleuron-epis-croises.png',
    nom: 'Fleuron — épis de blé croisés',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Deux épis de blé croisés en sautoir, du répertoire eucharistique. Il est SYMÉTRIQUE sur son axe vertical, comme un ornement de séparation doit l’être.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '3.25rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 73 × 102 pour une pose de 3.25rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin, sur les deux sols : c’est le plus AJOURÉ des quatre — 7 % d’encre pleine, tout le reste en barbes d’un pixel — et il prend donc la pose la plus haute après l’épi seul, celle des volutes ; sous 3rem ses barbes se dissolvent en une tache grise et les deux épis cessent de se séparer. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/fleurons-source/, hors dépôt, et sa copie de chaîne dans C:\Corpus Scriptura\ornements-originaux-20260823.",
  },
  {
    chemin: '/ornements/fleuron-epi.png',
    nom: 'Fleuron — épi de blé',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Un épi de blé seul, posé en diagonale. ⚠️ Il est le plus ÉLANCÉ du jeu, plus haut que large de deux fois et trois quarts, et il pend donc comme le pendentif — à choisir en connaissance de cause sous un titre court.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '3.5rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 40 × 111 pour une pose de 3.5rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin, sur les deux sols : un fleuron deux fois et trois quarts plus haut que large disparaît si on lui donne la hauteur d’un fleuron carré ; à 3rem il n’était plus qu’un trait, et c’est à 3,5 que ses grains et ses barbes tiennent. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/fleurons-source/, hors dépôt, et sa copie de chaîne dans C:\Corpus Scriptura\ornements-originaux-20260823.",
  },
  {
    chemin: '/ornements/fleuron-rameau.png',
    nom: 'Fleuron — rameau',
    fonction: 'coiffer',
    emploi: "Offert au choix du fleuron d’une œuvre, dans le panneau de la roulette du volet. Rameau feuillu, silhouette pleine sans détail intérieur.",
    lieu: { href: '/oeuvre/A0010O0100', label: 'Annotations sur le livre de Job', repere: 'Entre le colophon de la page de titre et le premier titre de division. Le choix se prend à la roulette du volet, onglet « Fleuron ».' },
    source: 'app/lib/fleurons.ts',
    traitement: { masque: true, pose: { hauteur: '2.75rem', sol: 'papier' } },
    note: "Fabriquée par la chaîne commune (scripts/ornements-detourer.mjs), servie en 57 × 87 pour une pose de 2.75rem de haut — une planche se sert au double de sa taille d’affichage, jamais plus. ⚠️ Sa hauteur de pose est MESURÉE, à la taille réelle, sur planche agrandie au plus proche voisin, sur les deux sols : une silhouette PLEINE se lit à petite taille, là où un dessin au trait demande de la place : il prend donc la pose ordinaire du jeu, et d’un cran plus haut il pesait plus que la croix du site. ⛔ La changer oblige à rejouer la planche. Le registre, ses dimensions et sa garde vivent dans app/lib/fleurons.ts. La planche brute est conservée dans tmp/fleurons-source/, hors dépôt, et sa copie de chaîne dans C:\Corpus Scriptura\ornements-originaux-20260823.",
  },

  // ── Illustrer une carte ────────────────────────────────────────────────────
  {
    chemin: '/icons/home-bible-book.png',
    nom: 'Livre ouvert',
    fonction: 'carte',
    emploi: 'Carte « Bible » de l’accueil.',
    lieu: { href: '/accueil#cartes', label: 'Accueil, les deux cartes', repere: 'À gauche, sous le frontispice.' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', pose: { largeur: '4.75rem', sol: 'carte' } },
  },
  {
    chemin: '/icons/home-patristique-buste.png',
    nom: 'Buste de Père',
    fonction: 'carte',
    emploi: 'Carte « Patristique » de l’accueil.',
    lieu: { href: '/accueil#cartes', label: 'Accueil, les deux cartes', repere: 'À droite, sous le frontispice.' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', pose: { largeur: '4.75rem', sol: 'carte' } },
  },

  // ── Les deux silhouettes de la barre, en réserve depuis le 2026-09-10 ────────
  {
    chemin: '/icons/ange-trompette-silhouette.png',
    nom: 'Ange à la trompette',
    fonction: 'reserve',
    emploi: 'A marqué le bouton des notifications, dans la barre de navigation, jusqu’au 2026-09-10. Retirée sur décision de l’auteur (« remplacer les icônes pour la messagerie et pour les notifications par des choses plus simples ») : une cloche au trait a pris sa place, dessinée en SVG dans la barre. La planche reste au dépôt, sans emploi.',
    traitement: { masque: true },
    note: 'Elle était posée en 28 × 27 dans un bouton de 30, donc presque à ras bord, et son dessin comptait une figure entière — tête, aile, robe, trompette — là où les autres marques de la barre sont un trait de douze pixels. ⚠️ Le défaut ne tenait pas au fichier, qui est net : il tenait à la DENSITÉ demandée à cette taille, et aucun détourage ne l’aurait corrigé. Servie en masque, l’encre venant du texte alentour : la teinte du PNG n’a jamais compté.',
  },
  {
    chemin: '/icons/parchemin-message-silhouette.png',
    nom: 'Parchemin',
    fonction: 'reserve',
    emploi: 'A marqué le bouton de la messagerie, dans la barre de navigation, jusqu’au 2026-09-10. Retirée en même temps que l’ange à la trompette, et pour la même raison : une enveloppe au trait a pris sa place, dessinée en SVG dans la barre. La planche reste au dépôt, sans emploi.',
    traitement: { masque: true },
    note: 'Posée en 19 × 25 dans un bouton de 30 : DEBOUT, quand sa voisine était couchée, si bien que les deux boutons de la rangée ne pesaient pas le même poids. Servie en masque, l’encre venant du texte alentour.',
  },

  // ── Porter l'identité ──────────────────────────────────────────────────────
  {
    chemin: '/logo/monogramme-encre.png',
    nom: 'Monogramme, encre',
    fonction: 'reserve',
    emploi: 'Le tracé du monogramme CS en vert d’encre. Il coiffait le frontispice de l’accueil, posé en masque, jusqu’au 27 août 2026 : la marque y était retirée, la barre de navigation la portant déjà sur toutes les pages. Aucune page ne l’appelle plus. La planche reste au dépôt, et le patron de fabrication continue de la produire.',
  },
  {
    chemin: '/logo/monogramme-creme.png',
    nom: 'Monogramme, crème',
    fonction: 'reserve',
    emploi: 'Le même tracé en crème. Il a porté le retour à l’accueil dans la barre de navigation jusqu’au 6 septembre 2026, où le CHIFFRE l’a remplacé : le site avait deux marques, et n’en imposait donc aucune. Aucune page ne l’appelle plus. La planche reste au dépôt, et le patron de fabrication continue de la produire — c’est elle, en vert, qui donne l’icône d’onglet.',
  },
  {
    chemin: '/og-image.png',
    nom: 'Vignette de partage',
    fonction: 'identite',
    emploi: 'L’image qui accompagne un lien du site collé dans un message ou sur un réseau. Jamais visible sur le site lui-même.',
    source: 'app/layout.tsx',
  },
  {
    chemin: '/logo-corpus-scriptura.svg',
    nom: 'Logotype (vectoriel)',
    fonction: 'identite',
    emploi: 'Logotype vectoriel présent dans le dépôt. Aucune page ne l’appelle : le site emploie partout les monogrammes en PNG.',
  },
  {
    chemin: '/logo-corpus-scriptura-mono.svg',
    nom: 'Logotype monochrome (vectoriel)',
    fonction: 'identite',
    emploi: 'Variante monochrome du logotype, elle non plus appelée nulle part.',
  },
  {
    chemin: '/corpus-scriptura.ico',
    nom: 'Icône héritée',
    fonction: 'identite',
    emploi: 'Ancienne icône d’onglet, restée à la racine. Next sert désormais `app/favicon.ico` par convention, et ce fichier ne sert plus.',
  },

  // ── Signer une édition ─────────────────────────────────────────────────────
  {
    chemin: '/ornements/marque-imprimeur.png',
    nom: 'Marque d’imprimeur',
    fonction: 'marque',
    emploi: 'Deux figures drapées adossées, épée en main, devant une cité et des flots. Se pose sur la page de titre de chaque œuvre, entre le titre et les mentions d’édition.',
    lieu: { href: '/oeuvre/A0010O0002', label: 'La Cité de Dieu', repere: 'Sur la page de titre, entre le titre et les mentions d’édition. C’est le premier écran, avant tout défilement.' },
    source: 'app/oeuvre/[id]/Ornements.tsx',
    traitement: { opacite: 0.82, ornement: true, pose: { hauteur: '150px', sol: 'papier' } },
  },

  // ── Signer un partenaire ───────────────────────────────────────────────────
  {
    chemin: '/icons/librairies/procure-eventail.png',
    nom: 'La Procure, éventail',
    fonction: 'partenaire',
    emploi: 'Vignette de la librairie La Procure.',
    lieu: { href: '/librairies', label: 'Acheter des livres', repere: 'Première rangée, vignette de gauche.' },
    source: 'app/librairies/page.tsx',
    traitement: { pose: { largeur: '52px', hauteurMax: '48px', sol: 'surface' } },
  },
  {
    chemin: '/icons/librairies/pierre-brunet-livre.png',
    nom: 'Pierre Brunet, livre',
    fonction: 'partenaire',
    emploi: 'Vignette de la librairie Pierre Brunet.',
    lieu: { href: '/librairies', label: 'Acheter des livres', repere: 'Deuxième rangée, vignette de gauche.' },
    source: 'app/librairies/page.tsx',
    traitement: { pose: { largeur: '52px', hauteurMax: '48px', sol: 'surface' } },
  },
  {
    chemin: '/icons/librairies/sources-chretiennes-chrisme.png',
    nom: 'Sources Chrétiennes, chrisme',
    fonction: 'partenaire',
    emploi: 'Vignette de la collection Sources Chrétiennes.',
    lieu: { href: '/librairies', label: 'Acheter des livres', repere: 'Troisième rangée, vignette de gauche.' },
    source: 'app/librairies/page.tsx',
    traitement: { pose: { largeur: '52px', hauteurMax: '48px', sol: 'surface' } },
  },

  // ── Décorer le jeu ─────────────────────────────────────────────────────────
  {
    chemin: '/holy-guessr/matthieu.png',
    nom: 'Frise de Matthieu, entière',
    fonction: 'jeu',
    emploi: 'La frise complète, 30 016 × 640. Conservée telle quelle ; le jeu ne la charge pas, il charge les huit tuiles.',
    source: 'app/quiz/HolyGuessr.tsx',
  },
  ...Array.from({ length: 8 }, (_, i): Illustration => ({
    chemin: `/holy-guessr/matthieu_tile_${i}.png`,
    nom: `Frise de Matthieu, tuile ${i + 1}`,
    fonction: 'jeu',
    emploi: `Tuile ${i + 1} sur 8 de la frise de Matthieu. Le découpage à 3 752 px vient de la limite de texture WebGL, non d’un choix de composition.`,
    source: 'app/quiz/HolyGuessr.tsx',
  })),

  {
    chemin: '/ornements/chiffre-cs.png',
    nom: 'Chiffre CS',
    fonction: 'identite',
    emploi: 'Le C et le S entrelacés, en capitales didones : LA marque du site. Elle ferme la page d’accueil sous le colophon, d’or sur le papier, depuis le 27 août 2026 — elle y remplace le fleuron ❧, un caractère dont le dessin dépendait de la police que le système voulait bien donner et qui ne disait rien du site. Et depuis le 6 septembre 2026 elle OUVRE la barre de navigation, dans l’encre du nom, à la place du monogramme gothique. ⚠️ Une seule planche, deux encres : posée en MASQUE des deux côtés, elle ne sert que d’alpha et c’est le fond de l’élément qui peint. La pose relevée ci-dessous est celle du colophon ; dans la barre elle vaut 1,625 rem, le chiffre étant large là où la lettrine d’avant était haute.',
    lieu: { href: '/accueil', label: 'Accueil', repere: 'Tout en bas, sous le colophon « en l’An de grâce MMXXVI », avant les liens légaux — et tout en haut, dans la barre, sur chaque page du site.' },
    source: 'app/accueil/page.tsx',
    traitement: { masque: true, pose: { hauteur: '1.75rem', sol: 'papier' } },
  },

  // ── En réserve ─────────────────────────────────────────────────────────────

  {
    chemin: '/icons/home-publications-writing.png',
    nom: 'Main qui écrit',
    fonction: 'reserve',
    emploi: 'Icône de la carte « Communauté » de l’accueil jusqu’au 31 août 2026 : la troisième porte a été retirée de la page (décision de l’auteur), et la Communauté ne s’atteint plus que par la barre de navigation. Aucune page ne l’appelle. La planche reste au dépôt, et retrouverait sa place le jour où une porte y reviendrait.',
  },
  {
    chemin: '/ornements/carapace-vide.png',
    nom: 'Carapace de tortue',
    fonction: 'reserve',
    emploi: 'Tenait les états vides du volet biblique jusqu’au 2026-08-26, où la carapace posée a pris sa place sur les deux volets.',
  },
  {
    chemin: '/ornements/tour-babel-detoure.png',
    nom: 'Tour de Babel intacte',
    fonction: 'reserve',
    emploi: 'Tenait l’écran d’accueil du Polyglotte jusqu’au 2026-08-26, où la tour ruinée a pris sa place. Pesait 2,1 Mo, la plus lourde image servie du site.',
  },
  {
    chemin: '/ornements/cul-de-lampe-cristaux.png',
    nom: 'Cristaux',
    fonction: 'reserve',
    emploi: 'Tenait la page de recherche jusqu’au 2026-08-26, où le désert et la fosse ont pris sa place.',
  },
  {
    chemin: '/ornements/ruines-fumantes.png',
    nom: 'Ruines fumantes carrées',
    fonction: 'reserve',
    emploi: 'Disait le livre absent d’une traduction jusqu’au 2026-08-26, où le panorama de colonnades a pris sa place.',
  },
  {
    chemin: '/ornements/ordinateur-pentecote.png',
    nom: 'Ordinateur de Pentecôte',
    fonction: 'reserve',
    emploi: 'Fermait le message d’écran large de la Polyglotte jusqu’au 2026-08-26, où l’ordinateur ardent a pris sa place.',
  },
  {
    chemin: '/ornements/ruines-colonnades.png',
    nom: 'Colonnades en ruine',
    fonction: 'reserve',
    emploi: 'Disait le livre absent d’une traduction le 2026-08-26, entre la planche carrée et la cité ruinée qui a pris sa place le même jour.',
  },
  {
    chemin: '/ornements/cul-de-lampe-buisson-ardent.png',
    nom: 'Buisson ardent',
    fonction: 'reserve',
    emploi: 'Tenait le volet vide d’une œuvre jusqu’au 2026-08-26, où l’arbre ardent a pris sa place.',
  },
  {
    chemin: '/ornements/cul-de-lampe-calice.png',
    nom: 'Calice',
    fonction: 'reserve',
    emploi: 'Cul-de-lampe dessiné, jamais posé sur une page.',
  },
  {
    chemin: '/ornements/cul-de-lampe-fleurs.png',
    nom: 'Fleurs',
    fonction: 'reserve',
    emploi: 'Cul-de-lampe dessiné, jamais posé sur une page.',
  },
  {
    chemin: '/ornements/palme-nouee.png',
    nom: 'Palme nouée',
    fonction: 'reserve',
    emploi: 'Fleuron de palme, jamais employé.',
  },
  {
    chemin: '/ornements/palme-volutes.png',
    nom: 'Palme à volutes',
    fonction: 'reserve',
    emploi: 'Fleuron de palme, jamais employé.',
  },
  {
    chemin: '/ornements/palmes-couronne.png',
    nom: 'Palmes en couronne',
    fonction: 'reserve',
    emploi: 'Fleuron de palme, jamais employé.',
  },
  {
    chemin: '/ornements/livre-miroir.png',
    nom: 'Livre en miroir',
    fonction: 'reserve',
    emploi: 'Sans doute dessinée pour le Polyglotte, où la tour de Babel a été retenue à sa place.',
    note: '2,4 Mo, avec son fond.',
  },
  {
    chemin: '/ornements/livre-miroir-detoure.png',
    nom: 'Livre en miroir, détouré',
    fonction: 'reserve',
    emploi: 'Version détourée de la précédente. Aucune des deux ne paraît.',
    note: '2,6 Mo : le détourage a alourdi le fichier au lieu de l’alléger.',
  },
  {
    chemin: '/ornements/livre_pol.png',
    nom: 'Livre (polyglotte)',
    fonction: 'reserve',
    emploi: 'Troisième livre en réserve, resté au nom de travail.',
    note: 'Seul fichier du dépôt nommé avec un souligné au lieu d’un trait.',
  },
  {
    chemin: '/icons/corpus-scriptura-mark.png',
    nom: 'Marque Corpus Scriptura',
    fonction: 'reserve',
    emploi: 'Marque en PNG, supplantée par les deux monogrammes.',
  },
  {
    chemin: '/icons/librairies/procure-livre.png',
    nom: 'La Procure, livre',
    fonction: 'reserve',
    emploi: 'Variante écartée pour La Procure : l’éventail a été retenu.',
  },
  {
    chemin: '/icons/librairies/procure-rayonnage.png',
    nom: 'La Procure, rayonnage',
    fonction: 'reserve',
    emploi: 'Deuxième variante écartée pour La Procure.',
  },
  {
    chemin: '/icons/librairies/pierre-brunet-portrait.png',
    nom: 'Pierre Brunet, portrait',
    fonction: 'reserve',
    emploi: 'Variante écartée pour Pierre Brunet : le livre a été retenu.',
  },
  {
    chemin: '/icons/librairies/sources-chretiennes-pere.png',
    nom: 'Sources Chrétiennes, Père',
    fonction: 'reserve',
    emploi: 'Variante écartée pour Sources Chrétiennes : le chrisme a été retenu.',
  },
  {
    chemin: '/auteurs/A0006.jpg',
    nom: 'Portrait A0006, copie locale',
    fonction: 'reserve',
    emploi: 'Reste du temps où les portraits d’auteurs étaient servis depuis le dépôt. Le site les charge désormais tous depuis le seau Supabase, et ce fichier n’est plus lu.',
  },
  {
    chemin: '/auteurs/A0010.jpg',
    nom: 'Portrait A0010, copie locale',
    fonction: 'reserve',
    emploi: 'Second reste du même temps. Le seau Supabase porte déjà ce portrait.',
  },

]

/** Les icônes d'onglet vivent dans `app/`, pas dans `public/` : Next les sert par
 *  convention de nom. Elles ne peuvent donc pas s'afficher par leur chemin de
 *  fichier, et la planche les appelle par la route que Next leur donne. */
export const ICONES_ONGLET: { route: string; fichier: string; nom: string; emploi: string }[] = [
  { route: '/icon.png', fichier: 'app/icon.png', nom: 'Icône d’onglet', emploi: 'L’icône que montre l’onglet du navigateur et le favori.' },
  { route: '/apple-icon.png', fichier: 'app/apple-icon.png', nom: 'Icône Apple', emploi: 'L’icône retenue quand on ajoute le site à l’écran d’accueil d’un iPhone.' },
  { route: '/favicon.ico', fichier: 'app/favicon.ico', nom: 'Favicon', emploi: 'Repli pour les navigateurs anciens, qui demandent encore `/favicon.ico`.' },
]

/** Familles trop nombreuses pour la planche : on les compte, on en montre un
 *  échantillon, et l'on renvoie à l'écran qui les emploie.
 *
 *  ⚠️ Toutes viennent d'un SEAU Supabase, jamais d'un dossier du dépôt, et ce
 *  n'est pas un hasard : ce sont précisément les images assez nombreuses pour
 *  qu'on ait cessé de les versionner. Les fac-similés de la Bible 899 pèsent
 *  1,8 Go et leur dossier local est ignoré par git. */
export type Famille = {
  cle: string
  nom: string
  emploi: string
  source: { seau: string }
  lieu?: { href: string; label: string }
}

export const FAMILLES: Famille[] = [
  {
    cle: 'auteurs',
    nom: 'Portraits d’auteurs',
    emploi: 'Vignette de chaque Père dans la bibliothèque, dans sa modale et dans son aperçu. Cadrées par la position enregistrée avec chaque auteur, qui dit où porte le regard.',
    source: { seau: 'auteurs' },
    lieu: { href: '/bibliotheque', label: 'Bibliothèque' },
  },
  {
    cle: 'traductions',
    nom: 'Couvertures de traductions',
    emploi: 'Couverture de chaque traduction biblique, dans le choix des versions.',
    source: { seau: 'traductions' },
    lieu: { href: '/traductions', label: 'Traductions' },
  },
  {
    cle: 'bible-illustrations-web',
    nom: 'Gravures de la Bible Fillion',
    emploi: 'Gravures insérées dans le texte biblique lui-même. Pilote en cours sur Marc, en WebP.',
    source: { seau: 'bible-illustrations-web' },
  },
  {
    cle: 'manuscrits',
    nom: 'Fac-similés de la Bible 899',
    emploi: 'Les colonnes photographiées du manuscrit, appelées en regard du texte dans l’atelier. Le dépôt n’en porte qu’une copie de travail, ignorée par git : le seau fait foi.',
    source: { seau: 'manuscrits' },
    lieu: { href: '/manuscrits/bible-899', label: 'Bible 899' },
  },
]
