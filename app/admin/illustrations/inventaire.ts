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
    propos: 'Les trois portes de l’accueil. Elles se lisent ensemble, à taille égale, dans la même rangée : leur désaccord se verrait immédiatement.',
  },
  'bouton': {
    titre: 'Marquer un bouton',
    propos: 'Silhouettes de la barre de navigation. Le fichier n’est pas affiché : il sert de MASQUE, et la couleur vient du texte alentour. Seule la découpe compte, jamais la teinte du PNG.',
  },
  'identite': {
    titre: 'Porter l’identité',
    propos: 'Monogramme, vignette de partage, icônes d’onglet. Ce sont les seules images que l’on voit hors du site, dans un onglet ou dans un message.',
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
  'gabarit': {
    titre: 'Résidus du gabarit',
    propos: 'Livrées par le gabarit de création Next, sans rapport avec le site. Elles ne paraissent nulle part et n’ont aucune raison de rester.',
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
    fonction: 'blanc',
    emploi: 'Dit qu’une traduction ne comporte pas le livre demandé. Des ruines plutôt qu’un fleuron : l’ornement devait dire « il n’y a rien ici », non « fin de chapitre ».',
    lieu: { href: '/?livre=MAT&chapitre=1&trad=TR0005', label: 'Matthieu 1 dans la Septante', repere: 'Au tiers supérieur de la colonne de lecture : la Septante ne comporte aucun livre du Nouveau Testament.' },
    source: 'app/components/TexteBible.tsx',
    traitement: { opacite: 0.92, ornement: true, pose: { largeurMax: 'min(68rem, 96%)', hauteurMax: 'calc(100dvh - 3.5rem - 15rem)', sol: 'papier' } },
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
    note: 'A remplacé l’ordinateur de Pentecôte. Même propos : l’ordinateur sous les langues de feu, l’alpha et l’oméga sur le moniteur, la Polyglotte dite en une image. Intensité et encre sont celles de la tour de Babel, à l’autre bout de la même page : cet écran n’a lui non plus qu’une gravure pour tout contenu. ⚠️ La planche est en HAUTEUR là où la précédente était en largeur, d’où un plafond de hauteur qui n’est pas décoratif : sur un téléphone bas, elle chasserait le texte hors de l’écran. Fabriquée par la chaîne commune aux gravures du 2026-08-26 : pourtour de la source rogné, papier ramené au blanc d’après son niveau DOMINANT, détourage, puis encre reposée en une teinte unique à la luminance 33, celle de la tour de Babel ruinée. ⚠️ L’ALPHA se calcule sur l’encre REPOSÉE, non sur la médiane de la planche : les deux ne s’accordent plus dès qu’on repose une encre plus sombre, et tout le dégradé qui borde un trait s’assombrit alors — un gris à 180 rendait 136. Écart moyen au dessin d’origine ramené à 1 niveau. ⛔ Le FICHIER est servi à deux fois sa taille d’affichage, jamais plus : au delà, le navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou. La cité s’affichait à 549 px dans une colonne de 620 pour un fichier de 1 600, soit 2,9 fois trop — c’est ce qui la rendait baveuse quand la tour, servie au double exact, restait nette. La taille d’affichage se calcule à la racine 22, la plus grande que la police fluide atteigne, et un léger rattrapage de netteté compense la seule réduction qui reste.',
  },


  // ── Ouvrir une page ────────────────────────────────────────────────────────
  {
    chemin: '/ornements/tour-babel-ruinee.png',
    nom: 'Tour de Babel ruinée',
    fonction: 'ouvrir',
    emploi: 'Occupe seule l’écran d’accueil du Polyglotte, sous l’invite « Ouvrez un livre ».',
    lieu: { href: '/polyglotte', label: 'Polyglotte', repere: 'Au centre, tant qu’aucun livre n’est ouvert, sous l’invite « Ouvrez un livre ».' },
    source: 'app/polyglotte/page.tsx',
    traitement: { opacite: 0.92, ornement: true, pose: { largeurMax: 'min(68rem, 96%)', hauteurMax: 'calc(100dvh - 3.5rem - 15rem)', sol: 'papier' } },
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
  },

  // ── Illustrer une carte ────────────────────────────────────────────────────
  {
    chemin: '/icons/home-bible-book.png',
    nom: 'Livre ouvert',
    fonction: 'carte',
    emploi: 'Carte « Bible » de l’accueil.',
    lieu: { href: '/accueil#cartes', label: 'Accueil, les trois cartes', repere: 'Première des trois cartes, sous le frontispice.' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', pose: { largeur: '4.75rem', sol: 'carte' } },
  },
  {
    chemin: '/icons/home-patristique-buste.png',
    nom: 'Buste de Père',
    fonction: 'carte',
    emploi: 'Carte « Patristique » de l’accueil.',
    lieu: { href: '/accueil#cartes', label: 'Accueil, les trois cartes', repere: 'Deuxième des trois cartes, sous le frontispice.' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', pose: { largeur: '4.75rem', sol: 'carte' } },
  },
  {
    chemin: '/icons/home-publications-writing.png',
    nom: 'Main qui écrit',
    fonction: 'carte',
    emploi: 'Carte « Publications » de l’accueil.',
    lieu: { href: '/accueil#cartes', label: 'Accueil, les trois cartes', repere: 'Troisième des trois cartes, sous le frontispice.' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', pose: { largeur: '4.75rem', sol: 'carte' } },
  },

  // ── Marquer un bouton ──────────────────────────────────────────────────────
  {
    chemin: '/icons/ange-trompette-silhouette.png',
    nom: 'Ange à la trompette',
    fonction: 'bouton',
    emploi: 'Bouton des notifications, dans la barre de navigation.',
    lieu: { href: '/accueil', label: 'Barre du haut', repere: 'Dans la barre de navigation, à droite : le bouton des notifications. Elle est sur toutes les pages.' },
    source: 'app/components/Navbar.tsx',
    traitement: { masque: true, pose: { largeur: '28px', hauteur: '27px', sol: 'vert' } },
  },
  {
    chemin: '/icons/parchemin-message-silhouette.png',
    nom: 'Parchemin',
    fonction: 'bouton',
    emploi: 'Bouton de la messagerie, dans la barre de navigation.',
    lieu: { href: '/accueil', label: 'Barre du haut', repere: 'Dans la barre de navigation, à droite : le bouton de la messagerie. Elle est sur toutes les pages.' },
    source: 'app/components/Navbar.tsx',
    traitement: { masque: true, pose: { largeur: '19px', hauteur: '25px', sol: 'vert' } },
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
    fonction: 'identite',
    emploi: 'Le même tracé en crème. Sert de retour à l’accueil dans la barre de navigation, dans les deux thèmes. C’est désormais la seule pose de la marque sur le site.',
    lieu: { href: '/accueil', label: 'Accueil', repere: 'Dans la barre du haut, à gauche, contre le nom du site — sur toutes les pages.' },
    source: 'app/components/Navbar.tsx',
    traitement: { opacite: 0.92, pose: { hauteur: '1.875rem', sol: 'vert' } },
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
    fonction: 'coiffer',
    emploi: 'Le C et le S entrelacés, en capitales didones, qui ferment la page d’accueil sous le colophon. Y remplace le fleuron ❧ depuis le 27 août 2026 : un caractère dont le dessin dépendait de la police que le système voulait bien donner, et qui ne disait rien du site. ⚠️ À ne pas confondre avec le monogramme du frontispice, qui est une lettrine gothique : deux dessins, deux emplois, deux fichiers.',
    lieu: { href: '/accueil', label: 'Accueil', repere: 'Tout en bas, sous le colophon « en l’An de grâce MMXXVI », avant les liens légaux.' },
    source: 'app/accueil/page.tsx',
    traitement: { masque: true, pose: { hauteur: '1.75rem', sol: 'papier' } },
  },

  // ── En réserve ─────────────────────────────────────────────────────────────
  {
    chemin: '/ornements/fleuron-fleur-de-lys.png',
    nom: 'Fleuron — fleur de lys',
    fonction: 'reserve',
    emploi: 'Fleuron typographique détouré, livré le 27 août 2026 avec le chiffre CS et le brin de lavande. Aucune page ne l’appelle encore. Détouré en alpha comme les autres marques : il se posera en masque et prendra la couleur qu’on lui donnera.',
  },
  {
    chemin: '/ornements/fleuron-lavande.png',
    nom: 'Fleuron — brin de lavande',
    fonction: 'reserve',
    emploi: 'Fleuron typographique détouré, livré le 27 août 2026 avec le chiffre CS et la fleur de lys. Aucune page ne l’appelle encore. Son trait est plus fin que celui des deux autres : il demandera une taille plus grande pour tenir.',
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

  // ── Résidus du gabarit ─────────────────────────────────────────────────────
  { chemin: '/file.svg', nom: 'file.svg', fonction: 'gabarit', emploi: 'Livrée par le gabarit de création Next.' },
  { chemin: '/globe.svg', nom: 'globe.svg', fonction: 'gabarit', emploi: 'Livrée par le gabarit de création Next.' },
  { chemin: '/next.svg', nom: 'next.svg', fonction: 'gabarit', emploi: 'Livrée par le gabarit de création Next.' },
  { chemin: '/vercel.svg', nom: 'vercel.svg', fonction: 'gabarit', emploi: 'Livrée par le gabarit de création Next.' },
  { chemin: '/window.svg', nom: 'window.svg', fonction: 'gabarit', emploi: 'Livrée par le gabarit de création Next.' },
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
