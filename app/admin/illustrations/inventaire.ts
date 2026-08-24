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
    propos: 'Frise du Holy Guessr. Chantier en cours : un seul livre témoin est illustré.',
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
  /** Largeur réellement servie, telle que la page l'écrit. Sert à dire l'échelle. */
  largeur?: string
}

export type Illustration = {
  /** Chemin public. Sert de clé, et de chemin disque sous `public/`. */
  chemin: string
  nom: string
  fonction: CleFonction
  /** Ce qu'elle fait là, en une phrase. */
  emploi: string
  /** Où aller la voir en place. Absent pour ce qui ne paraît sur aucune page. */
  lieu?: { href: string; label: string }
  /** Fichier de code qui l'appelle, pour retrouver son réglage. */
  source?: string
  traitement?: Traitement
  /** Remarque d'atelier : ce qui cloche, ce qu'il faudrait reprendre. */
  note?: string
}

export const ILLUSTRATIONS: Illustration[] = [
  // ── Occuper un blanc ───────────────────────────────────────────────────────
  {
    chemin: '/ornements/carapace-vide.png',
    nom: 'Carapace de tortue',
    fonction: 'blanc',
    emploi: 'Ferme le volet des commentaires quand un passage n’en a reçu aucun.',
    lieu: { href: '/bibliotheque', label: 'Volet patristique d’une œuvre' },
    source: 'app/components/PanneauPatristique.tsx',
    traitement: { opacite: 0.46, fusion: 'multiply', ornement: true, largeur: 'min(168px, 58%)' },
  },
  {
    chemin: '/ornements/cul-de-lampe-cristaux.png',
    nom: 'Cristaux',
    fonction: 'blanc',
    emploi: 'Tient la page de recherche avant qu’on ait lancé la moindre requête.',
    lieu: { href: '/recherche', label: 'Recherche' },
    source: 'app/recherche/RechercheClient.tsx',
    traitement: { opacite: 0.5, fusion: 'multiply', ornement: true, largeur: 'min(300px, 56%)' },
  },
  {
    chemin: '/ornements/cul-de-lampe-buisson-ardent.png',
    nom: 'Buisson ardent',
    fonction: 'blanc',
    emploi: 'Invite à cliquer sur un paragraphe, dans le volet resté vide d’une œuvre.',
    lieu: { href: '/bibliotheque', label: 'Une œuvre' },
    source: 'app/oeuvre/[id]/OeuvreClient.tsx',
    traitement: { opacite: 0.42, fusion: 'multiply', ornement: true, largeur: '82%, au plus 11.875rem' },
  },
  {
    chemin: '/ornements/ruines-fumantes.png',
    nom: 'Ruines fumantes',
    fonction: 'blanc',
    emploi: 'Dit qu’une traduction ne comporte pas le livre demandé. Des ruines plutôt qu’un fleuron : l’ornement devait dire « il n’y a rien ici », non « fin de chapitre ».',
    lieu: { href: '/bibliotheque', label: 'Texte biblique' },
    source: 'app/components/TexteBible.tsx',
    traitement: { opacite: 0.42, fusion: 'multiply', ornement: true, largeur: 'min(190px, 55%)' },
  },
  {
    chemin: '/ornements/ordinateur-pentecote.png',
    nom: 'Pentecôte à l’ordinateur',
    fonction: 'blanc',
    emploi: 'Ferme la colonne d’explication de la page Polyglotte.',
    lieu: { href: '/polyglotte', label: 'Polyglotte' },
    source: 'app/polyglotte/page.tsx',
    traitement: { opacite: 0.72, ornement: true, largeur: 'min(18rem, 82%)' },
  },

  // ── Ouvrir une page ────────────────────────────────────────────────────────
  {
    chemin: '/ornements/tour-babel-detoure.png',
    nom: 'Tour de Babel',
    fonction: 'ouvrir',
    emploi: 'Occupe seule l’écran d’accueil du Polyglotte, sous l’invite « Ouvrez un livre ».',
    lieu: { href: '/polyglotte', label: 'Polyglotte' },
    source: 'app/polyglotte/page.tsx',
    traitement: { opacite: 0.92, ornement: true, largeur: 'min(51rem, 96%)' },
    note: 'La plus lourde de toutes les images servies, pour un simple écran d’attente.',
  },
  {
    chemin: '/ornements/semeur.png',
    nom: 'Le semeur',
    fonction: 'ouvrir',
    emploi: 'Ouvre la page du don : une main confie un grain au sillon.',
    lieu: { href: '/soutenir', label: 'Soutenir' },
    source: 'app/soutenir/page.tsx',
    traitement: { opacite: 0.92, fusion: 'multiply', ornement: true, largeur: 'clamp(150px, 8vw + 8vh, 250px)' },
  },
  {
    chemin: '/ornements/chantier.png',
    nom: 'Les bâtisseurs',
    fonction: 'ouvrir',
    emploi: 'Ouvre la page du chantier.',
    lieu: { href: '/chantier', label: 'Chantier' },
    source: 'app/chantier/page.tsx',
    traitement: { ornement: true, largeur: '25rem' },
  },
  {
    chemin: '/ornements/vigne-grappe.png',
    nom: 'Vigne et grappe',
    fonction: 'ouvrir',
    emploi: 'Ponctue le bas de la page du chantier. Trois ornements sur cette page, jamais davantage : au-delà, ils l’encombrent.',
    lieu: { href: '/chantier', label: 'Chantier' },
    source: 'app/chantier/page.tsx',
    traitement: { opacite: 0.75, ornement: true, largeur: '11.25rem' },
  },
  {
    chemin: '/ornements/clochettes.png',
    nom: 'Clochettes',
    fonction: 'ouvrir',
    emploi: 'Sépare deux moments de la page du chantier.',
    lieu: { href: '/chantier', label: 'Chantier' },
    source: 'app/chantier/page.tsx',
    traitement: { opacite: 0.7, ornement: true, largeur: '13.125rem' },
  },

  // ── Coiffer un titre ───────────────────────────────────────────────────────
  {
    chemin: '/icons/home-title-ornament.png',
    nom: 'Filet gravé du frontispice',
    fonction: 'coiffer',
    emploi: 'Ferme le titre de l’accueil. La gravure EST le filet, elle ne l’accompagne pas.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/accueil/page.tsx',
    traitement: { opacite: 0.72, largeur: 'min(265px, 48vw)' },
  },

  // ── Illustrer une carte ────────────────────────────────────────────────────
  {
    chemin: '/icons/home-bible-book.png',
    nom: 'Livre ouvert',
    fonction: 'carte',
    emploi: 'Carte « Bible » de l’accueil.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', largeur: '4.75rem' },
  },
  {
    chemin: '/icons/home-patristique-buste.png',
    nom: 'Buste de Père',
    fonction: 'carte',
    emploi: 'Carte « Patristique » de l’accueil.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', largeur: '4.75rem' },
  },
  {
    chemin: '/icons/home-publications-writing.png',
    nom: 'Main qui écrit',
    fonction: 'carte',
    emploi: 'Carte « Publications » de l’accueil.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/components/AccueilCards.tsx',
    traitement: { opacite: 0.86, fusion: 'screen', largeur: '4.75rem' },
  },

  // ── Marquer un bouton ──────────────────────────────────────────────────────
  {
    chemin: '/icons/ange-trompette-silhouette.png',
    nom: 'Ange à la trompette',
    fonction: 'bouton',
    emploi: 'Bouton des notifications, dans la barre de navigation.',
    lieu: { href: '/notifications', label: 'Notifications' },
    source: 'app/components/Navbar.tsx',
    traitement: { masque: true, largeur: '28 × 27 px' },
  },
  {
    chemin: '/icons/parchemin-message-silhouette.png',
    nom: 'Parchemin',
    fonction: 'bouton',
    emploi: 'Bouton de la messagerie, dans la barre de navigation.',
    lieu: { href: '/messagerie', label: 'Messagerie' },
    source: 'app/components/Navbar.tsx',
    traitement: { masque: true, largeur: '19 × 25 px' },
  },

  // ── Porter l'identité ──────────────────────────────────────────────────────
  {
    chemin: '/logo/monogramme-encre.png',
    nom: 'Monogramme, encre',
    fonction: 'identite',
    emploi: 'Le monogramme CS en vert d’encre, pour le thème clair. Les deux variantes sont posées l’une sur l’autre et le thème n’en montre qu’une, plutôt que d’en choisir une en JavaScript, ce qui la ferait paraître après la peinture.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/accueil/page.tsx',
    traitement: { largeur: '4.5rem' },
  },
  {
    chemin: '/logo/monogramme-creme.png',
    nom: 'Monogramme, crème',
    fonction: 'identite',
    emploi: 'Le même tracé en crème : sur le brun du Cuir, l’encre verte serait invisible. Sert aussi de retour à l’accueil dans la barre de navigation, dans les deux thèmes.',
    lieu: { href: '/accueil', label: 'Accueil' },
    source: 'app/components/Navbar.tsx',
    traitement: { opacite: 0.92, largeur: '1.875rem dans la barre' },
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
    lieu: { href: '/bibliotheque', label: 'Page de titre d’une œuvre' },
    source: 'app/oeuvre/[id]/Ornements.tsx',
    traitement: { opacite: 0.82, ornement: true, largeur: '150px de haut' },
  },

  // ── Signer un partenaire ───────────────────────────────────────────────────
  {
    chemin: '/icons/librairies/procure-eventail.png',
    nom: 'La Procure, éventail',
    fonction: 'partenaire',
    emploi: 'Vignette de la librairie La Procure.',
    lieu: { href: '/librairies', label: 'Librairies' },
    source: 'app/librairies/page.tsx',
    traitement: { largeur: '52px' },
  },
  {
    chemin: '/icons/librairies/pierre-brunet-livre.png',
    nom: 'Pierre Brunet, livre',
    fonction: 'partenaire',
    emploi: 'Vignette de la librairie Pierre Brunet.',
    lieu: { href: '/librairies', label: 'Librairies' },
    source: 'app/librairies/page.tsx',
    traitement: { largeur: '52px' },
  },
  {
    chemin: '/icons/librairies/sources-chretiennes-chrisme.png',
    nom: 'Sources Chrétiennes, chrisme',
    fonction: 'partenaire',
    emploi: 'Vignette de la collection Sources Chrétiennes.',
    lieu: { href: '/librairies', label: 'Librairies' },
    source: 'app/librairies/page.tsx',
    traitement: { largeur: '52px' },
  },

  // ── Décorer le jeu ─────────────────────────────────────────────────────────
  {
    chemin: '/holy-guessr/matthieu.png',
    nom: 'Frise de Matthieu, entière',
    fonction: 'jeu',
    emploi: 'La frise complète, 30 016 × 640. Conservée telle quelle ; le jeu ne la charge pas, il charge les huit tuiles.',
    lieu: { href: '/quiz', label: 'Holy Guessr' },
    source: 'app/quiz/HolyGuessr.tsx',
  },
  ...Array.from({ length: 8 }, (_, i): Illustration => ({
    chemin: `/holy-guessr/matthieu_tile_${i}.png`,
    nom: `Frise de Matthieu, tuile ${i + 1}`,
    fonction: 'jeu',
    emploi: `Tuile ${i + 1} sur 8 de la frise de Matthieu. Le découpage à 3 752 px vient de la limite de texture WebGL, non d’un choix de composition.`,
    lieu: { href: '/quiz', label: 'Holy Guessr' },
    source: 'app/quiz/HolyGuessr.tsx',
  })),

  // ── En réserve ─────────────────────────────────────────────────────────────
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
 *  échantillon, et l'on renvoie à l'écran qui les emploie. `seau` désigne un
 *  seau Supabase, `dossier` un chemin sous `public/`. */
export type Famille = {
  cle: string
  nom: string
  emploi: string
  source: { seau: string } | { dossier: string }
  lieu?: { href: string; label: string }
  /** Comment fabriquer l'URL publique d'un objet à partir de son nom. */
  prefixePublic?: string
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
    emploi: 'Les colonnes photographiées du manuscrit, appelées en regard du texte dans l’atelier. Le dépôt en porte une copie locale, le seau la référence complète.',
    source: { dossier: 'manuscrits/bible-899' },
    lieu: { href: '/manuscrits/bible-899', label: 'Bible 899' },
  },
]
