/**
 * Charte et AGENTS.md : la doctrine du chantier d'harmonie (audit du 23 septembre 2026,
 * sept lots corrigés les 23 et 24 septembre).
 *
 *   § 51.13 — « Harmonie : une écriture par forme », la pièce unique de chaque forme,
 *             son fichier et sa garde, lot par lot (posée après le § 51.12).
 *   § 18    — le corps biblique descendu d'un rang (15/1,48 ; 14/1,44 ; 17/1,52).
 *   § 38.5  — les deux rails se tournent vers le centre de la page ; leur texte au plancher.
 *   § 38    — une rubrique est en capitales espacées, non en petites capitales.
 *   Sommaire — une ligne qui mène au § 51.13.
 *
 * Et dans AGENTS.md, la section correspondante, plus les passages que les lots ont rendus
 * faux : `TITRE_VOLET`, corps biblique, dérogations du Cuir, rubriques, rail, voiles, croix.
 *
 * ⛔ Le script n'écrit que les FICHIERS : le miroir `charte/CHARTE_IA.md` et `AGENTS.md`.
 * La charte se pousse ensuite par `node scripts/synchroniser-charte-supabase.mjs --push`
 * (`--push --dry` d'abord : les lignes retirées doivent être exactement celles réécrites ici).
 *
 * ⚠️ IDEMPOTENT : un passage déjà corrigé se reconnaît (nouveau texte présent, ancien
 * absent) et se saute ; une section déjà posée aussi. Tout autre état refuse d'écrire.
 *
 * Usage : node scripts/charte-harmonie-2026-09-24.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const CHEMINS = {
  charte: resolve(racine, 'charte', 'CHARTE_IA.md'),
  agents: resolve(racine, 'AGENTS.md'),
}
const essaiSeul = process.argv.includes('--dry')

// ── Le corps de la doctrine, commun aux deux exemplaires ─────────────────────────────

const BLOCS = [
  '**Couleurs** (lot 1, commit d91de104). Garde : `app/lib/couleursEnDur.test.ts`, dont le registre `app/lib/couleursEnDurInventaire.ts` ne fait que décroître.',
  '',
  '- Un bouton plein désactivé prend `--cs-desactive-fond` et `--cs-desactive-encre`.',
  '- Une encre douce posée sur un aplat prend `--cs-sur-aplat-doux`. Jamais `--cs-fond-doux`, qui est un fond : crème au Clair, il devient sombre au Cuir et disparaît sur l’aplat.',
  '- Tout voile de fenêtre prend `--cs-calque-modale` (0,42, une seule valeur pour les deux thèmes).',
  '- Tout séparateur prend `--cs-bord-clair`.',
  '- Un trait SVG écrit en littéral pour le Clair se transpose au Cuir par une classe de feuille, sur le modèle de `.cs-bulle-anneau`.',
  '- Le trait d’une poignée prend `--cs-poignee-trait`.',
  '- Au Cuir, `--cs-danger-fonce` est plus clair que `--cs-danger` : sur un sol sombre, le rang le plus appuyé est le plus lumineux, et l’échelle s’inverse.',
  '',
  '**Typographie** (lot 2, commit ca81de79). Gardes : `app/lib/polices.test.ts`, `app/lib/echelleTypographique.test.ts`, `app/lib/cssServi.test.ts`.',
  '',
  '- Une pile de polices ne s’écrit que dans `app/lib/polices.ts`.',
  '- Toute étiquette en capitales espacées est `STYLE_RUBRIQUE` (`app/lib/hierarchieTitres.ts`) : sans, 10 px, graisse 700, chasse 0,08 em, encre `--cs-texte-second`. L’appelant n’y ajoute que sa mise en page. ⚠️ Ce sont des CAPITALES (`text-transform: uppercase`), non des petites capitales, et toute description d’une rubrique d’interface en petites capitales est périmée.',
  '- La garde de l’échelle lit aussi les constantes : une taille qui passe par un nom ne lui échappe plus.',
  '- `TITRE_VOLET` vaut 18 px (1,125 rem), rang de l’échelle. Il n’est plus ancré sur `NavLivres`, qui n’a plus de titre, mais sur les volets de la Bibliographie, de l’Histoire, des Péricopes et de la Recherche.',
  '- `INTERLIGNE_TITRE_PAGE` (1,15) est le seul interligne d’un titre de page, et `STYLE_POSITION_PAGE` la seule composition d’une position « N sur M ».',
  '- Le titre d’une fenêtre prend `TITRE_CARTE`.',
  '- L’exposant d’un siècle vaut 0,62 em (`app/lib/siecles.tsx`).',
  '- `cssServi.test.ts` remplace une valeur interpolée (`${…}`) par une valeur neutre avant de lire la feuille.',
  '',
  '**Boutons et champs** (lot 3, commits 24b4aaad, a3f5b017, a1bf46fa, 37899322, 8874f52f).',
  '',
  '- Le survol s’écrit dans la feuille, sous `@media (hover: hover)`, jamais en JavaScript ni en style en ligne. Les utilitaires `.cs-survol-encre`, `.cs-survol-fond` et `.cs-survol-bord` se règlent par variables (`app/globals.css`).',
  '- `.cs-bouton-plein` est le seul bouton plein du site : rayon de 8 px à la taille normale, de 4 px à la compacte.',
  '- Un contrôle désactivé prend `--cs-opacite-desactive` (0,45) et le curseur par défaut.',
  '- Un champ se compose par `app/lib/compositionChamp.ts`, et un champ de recherche prend un rayon de 8 px. ⚠️ Son `outline: none` est voulu : l’anneau du foyer ne vise pas les champs de texte, et le filet suffit.',
  '- La recherche d’un volet est `ChampRechercheVolet`.',
  '- Une pastille de filtre est `PastilleFiltre`, rayon de 4 px.',
  '- Un interrupteur est `PisteInterrupteur` (`app/compte/champsCompte.tsx`).',
  '',
  '**Fenêtres, icônes, mouvement et états** (lot 4, commits e10d5f09, 89ab0555, 3be6d60e, f2795ee0, 34dbee3d, 234d0769, 40f2c59f, e78a242a).',
  '',
  '- Une croix de fermeture est `IconeCroix` dans `.cs-croix-fermer`, ou `.cs-croix-fermer--petite`. Aucun glyphe ✕ ni × ne ferme une fenêtre du site public.',
  '- Une fenêtre a un rayon de 12 px, un calque qui part de `HAUTEUR_NAVBAR` (`app/lib/mesures.ts`), le rang `Z_MODALE` (`app/lib/empilement.ts`) et un intérieur de 20 px sur 22.',
  '- Un menu prend un rayon de 8 px et l’ombre flottante ; une bulle, un rayon de 4 px et l’ombre nette.',
  '- Un chevron est `IconeChevron`, sa taille écrite en rem.',
  '- Le mouvement tient en trois jetons : `--cs-duree-courte` (0,12 s), `--cs-duree-moyenne` (0,18 s) et `--cs-courbe-sortie`. Un minuteur JavaScript garde son chiffre, qu’aucune variable de feuille ne peut lui donner.',
  '- Un état vide est `MentionVide` (`app/components/EtatVideVolet.tsx`), un texte d’échec `TEXTE_ERREUR` (`app/lib/texteErreur.ts`), une attente `Anneau` (`app/lib/attenteEnCreux.tsx`).',
  '',
  '**Volets** (lot 5, commits ea8a5ddb, 72d58d3d, e1aac866, 8c8f1c06). Gardes : `app/components/OngletsPage.test.tsx`, `app/lib/symetrieVolets.test.ts`.',
  '',
  '- Les deux rails se tournent vers le centre de la page (§ 38.5), et le fond d’un rail est celui du volet qu’il remplace.',
  '- Toute barre à panneaux est `OngletsPage` : un seul onglet dans l’ordre de tabulation, les flèches pour passer de l’un à l’autre, `aria-controls` vers le panneau.',
  '- La poignée d’un volet est un séparateur focalisable, réglable aux flèches (`usePoigneeVolet`, `app/lib/poigneeVolet.ts`).',
  '- Le chevron de repli offre 24 px de cible par son rembourrage et une marge négative, et son libellé est unique : « Réduire le volet ».',
  '- Le nom accessible d’une barre de volet est « Ce que montre le volet ».',
  '- Le foyer ne retombe pas sur le document quand un volet se replie ou se déplie (`app/lib/useFoyerAuRepli.ts`).',
  '- Un volet est un `aside`, un sommaire un `nav`.',
  '',
  '**Pages et libellés** (lot 6, commits 6b043299, dcf2e4b0, f907f443, be208d9b, c3c2b621, 45575c7e, 7221502f).',
  '',
  '- La gouttière d’une page est `GOUTTIERE_PAGE`, `clamp(16px, 4vw, 24px)` (`app/lib/mesures.ts`).',
  '- Une page centrée laisse 22 px au-dessus de son titre ; les pages d’erreur (`not-found`, `error`) le posent à 14 vh.',
  '- Le volet des pages sœurs se compose par `app/lib/voletPage.ts`, et ses seuils de fermeture se lisent dans `POINTS_DE_RUPTURE` (`app/lib/pointsDeRupture.ts`).',
  '- Un écran d’attente en creux a le même châssis sur l’œuvre, la Bible et l’essai : hauteur fixe sous la barre, débord masqué.',
  '- Une requête média change le NOMBRE de colonnes d’une grille, jamais la largeur des couvertures (`--couv`).',
  '- Les libellés sont uniques : « Réinitialiser les filtres » ; « Afficher les N autres » et « Afficher moins » ; « Rechercher… » ; « Précédent » et « Suivant » ; « Aucun X ne correspond aux filtres retenus. » ; « Voir la fiche : … ».',
  '- ⛔ Aucun accent grave dans un commentaire écrit à l’intérieur d’une feuille en littéral de gabarit : il fermerait le littéral.',
  '- Une œuvre ou un essai introuvable répond par `notFound()`.',
  '',
  '**Micro-typographie** (lot 7, commits 6f375b13, 8f16855a, 688a4ad3). Garde : `app/lib/ponctuationHauteInterface.test.ts`.',
  '',
  '- Dans le JSX, la ponctuation haute prend son espace : `&nbsp;` devant le deux-points, `&#8239;` devant le point-virgule, le point d’interrogation et le point d’exclamation. Dans une chaîne JavaScript, les mêmes espaces : U+00A0 devant le deux-points, U+202F devant les trois autres.',
  '- Un seuil de bascule écrit en JavaScript se compare par `<=`, équivalent exact du `max-width` de `useEstMobile` (`app/lib/useEstMobile.ts`) : à 900 px, les volets et le mode mobile basculent ensemble.',
  '- La notice d’une traduction suit l’ordre de l’œuvre : « Texte établi par » avant « Édition », puis « Source ».',
  '',
  '⚠️ **Laissé à l’auteur, et donc pas encore une règle** : les deux volets d’une même page n’ont pas des largeurs en miroir (200 à 320 px à gauche, 260 à 460 à droite sur la Bible ; 240 à 380 et 280 à 480 sur l’œuvre). Rien ne dit encore si c’est voulu, et l’on n’aligne pas avant qu’il l’ait dit.',
]

const INTRO = [
  'Audit d’harmonie du 23 septembre 2026 (`audit/AUDIT_HARMONIE_2026-09-23.md`), corrigé en sept lots les 23 et 24 septembre. ⛔ **UNE FORME DU SITE S’ÉCRIT UNE FOIS.** Ce qui suit nomme, pour chaque forme, la pièce unique qui la porte, le fichier où elle vit et la garde qui la tient quand il y en a une. Une surface nouvelle emploie la pièce ; elle ne la recompose pas sur place, fût-ce à l’identique, parce qu’une copie exacte diverge au premier réglage. ⚠️ L’harmonisation va vers la forme la plus sobre et la plus répandue, jamais vers la plus chargée, et elle n’ajoute aucun élément visible. Ce qui relève du goût reste à l’auteur.',
  '',
]

const TITRE_CHARTE = '### 51.13 Harmonie (2026-09-23/24) : une écriture par forme'
const SECTION_CHARTE = [TITRE_CHARTE, '', ...INTRO, ...BLOCS].join('\n')

const TITRE_AGENTS = '# ⛔ HARMONIE (2026-09-23/24) : une écriture par forme'
const SECTION_AGENTS = [
  TITRE_AGENTS,
  '',
  'Doctrine : charte `parametres.charte_ia`, **§ 51.13**. Ici, la même liste, pour qui écrit du code : avant de composer une forme sur place, chercher sa pièce ci-dessous.',
  '',
  ...INTRO,
  ...BLOCS,
].join('\n')

// ── Les passages périmés ─────────────────────────────────────────────────────────────

const REMPLACEMENTS = [
  // Charte
  {
    fichier: 'charte',
    nom: 'Sommaire — la ligne du § 51.13',
    avant: '| l’**interface de lecture** et ses volets | § 18, § 36, § 37, § 38, § 51 |',
    apres: '| l’**interface de lecture** et ses volets | § 18, § 36, § 37, § 38, § 51 |\n| la **pièce unique** d’une forme d’interface : couleur, bouton, champ, fenêtre, volet, libellé | **§ 51.13** |',
  },
  {
    fichier: 'charte',
    nom: '§ 18 — le corps biblique, titre',
    avant: '⛔ **LE TEXTE BIBLIQUE SE LIT À 16 PX, INTERLIGNE 1,55, ET LE LECTEUR EN CHOISIT LE CRAN** (commit 85b98299).',
    apres: '⛔ **LE TEXTE BIBLIQUE SE LIT À 15 PX, INTERLIGNE 1,48, ET LE LECTEUR EN CHOISIT LE CRAN** (commit 85b98299 ; crans resserrés le 23 septembre 2026).',
  },
  {
    fichier: 'charte',
    nom: '§ 18 — le corps biblique, crans',
    avant: 'petit, 15 px et 1,50 ; normal, 16 px et 1,55 ; grand, 18 px et 1,60.',
    apres: 'petit, 14 px et 1,44 ; normal, 15 px et 1,48 ; grand, 17 px et 1,52. ⚠️ Les trois crans ont descendu d’un rang le 23 septembre 2026, à la demande de l’auteur (« un peu trop corps ») : ils valaient 15, 16 et 18 px. Les valeurs vivent dans `globals.css` et se commentent dans `app/lib/corpsLecture.ts`.',
  },
  {
    fichier: 'charte',
    nom: '§ 38.5 — le sens du rail',
    avant: 'le nom de l’action écrit en hauteur, dans le sens d’un dos de livre français.',
    apres: 'le nom de l’action écrit en hauteur, les lettres tournées vers le centre de la page.',
  },
  {
    fichier: 'charte',
    nom: '§ 38.5 — les deux rails se tournent vers le centre',
    avant: '⚠️ Le rail se FONCE au survol : une surface qui ne porte ni cadre ni fond propre n’a pas d’autre façon de dire qu’on peut la toucher.',
    apres: '⚠️ Le rail se FONCE au survol : une surface qui ne porte ni cadre ni fond propre n’a pas d’autre façon de dire qu’on peut la toucher.\n\n⛔ **LES DEUX RAILS SE TOURNENT VERS LE CENTRE DE LA PAGE** (demande de l’auteur, 23 septembre 2026 : « changer, donc, “Ouvrir les livres” de sens »). Ce qui se tourne est l’assise des lettres : leur pied regarde la colonne de texte, leur tête le bord de l’écran. À droite, `writing-mode: vertical-rl` le fait seul ; à gauche, le libellé prend un demi-tour et se lit de bas en haut, comme toute bande latérale gauche. Le chevron ne tourne pas, il pointe déjà vers la page. ⚠️ Cette règle renverse celle du 4 septembre, qui tenait les deux rails pour accordés parce qu’ils lisaient dans le même sens : lire dans le même sens et se tourner vers le même bord sont deux choses différentes. ⚠️ Le fond du rail est celui du volet qu’il remplace, le fond clair à gauche et la surface à droite, sans quoi la teinte changerait au repli.',
  },
  {
    fichier: 'charte',
    nom: '§ 38.5 — le corps du rail',
    avant: '⚠️ **Et son texte descend d’un rang** — le libellé de onze pixels à dix et demi, le repère de onze et demi à onze. Sur une bande de trente pixels de large, un texte plus menu se lit encore et pèse moins : la contrainte n’est pas la lisibilité mais l’encombrement, un rail devant se faire oublier tant qu’on ne le cherche pas.',
    apres: '⚠️ **Son texte tient au plancher du site, onze pixels, le libellé comme le repère.** Le 4 septembre, le libellé était descendu à dix pixels et demi pour peser moins ; le 23 septembre, il est remonté à onze, parce qu’une capitale espacée couchée sur trente pixels est ce qui se lit le moins bien du site. Sa chasse s’ouvre d’autant (0,14 em, graisse 600, `--cs-texte-second`), et le repère reste en sérif, `--cs-texte-gris`. Un rail doit se faire oublier tant qu’on ne le cherche pas, et se lire quand on le cherche.',
  },
  {
    fichier: 'charte',
    nom: '§ 38 — le repère en rubrique',
    avant: 'est une RUBRIQUE : petites capitales espacées, `--cs-texte-second`, réunies sur UNE ligne de tête.',
    apres: 'est une RUBRIQUE : capitales espacées (`STYLE_RUBRIQUE`, § 51.13), `--cs-texte-second`, réunies sur UNE ligne de tête.',
  },

  // AGENTS.md
  {
    fichier: 'agents',
    nom: 'AGENTS — ancre de TITRE_VOLET',
    avant: '| **Titre de volet** | `TITRE_VOLET` = `1.15rem` | 500 | `--cs-encre-fonce` | `NavLivres` |',
    apres: '| **Titre de volet** | `TITRE_VOLET` = `1.125rem` (18 px) | 500 | `--cs-encre-fonce` | volets de la Bibliographie, de l’Histoire, des Péricopes et de la Recherche (`NavLivres` n’a plus de titre) |',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — corps biblique',
    avant: '- **Texte biblique : 16 px, interligne 1,55**, par `--cs-lecture-corps` et `--cs-lecture-interligne` que règle `data-corps` sur `<html>` (petit 15/1,50, normal 16/1,55, grand 18/1,60).',
    apres: '- **Texte biblique : 15 px, interligne 1,48**, par `--cs-lecture-corps` et `--cs-lecture-interligne` que règle `data-corps` sur `<html>` (petit 14/1,44, normal 15/1,48, grand 17/1,52 ; un rang plus bas depuis le 2026-09-23, commenté dans `app/lib/corpsLecture.ts`).',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — dérogations du Cuir',
    avant: '⛔ **Une seule exception, et elle est fonctionnelle** : l\'AVERTISSEMENT garde une terre de Sienne brûlée, à 42° quand tout le reste est entre 67° et 93°. Ne pas la ramener au beige : c\'est le seul endroit où la couleur travaille.',
    apres: '⛔ **Quatre dérogations, toutes fonctionnelles, car chacune encode une catégorie** : l\'AVERTISSEMENT garde une terre de Sienne brûlée, à 42° quand tout le reste est entre 67° et 93° ; l\'explication de Corpus Scriptura garde une sauge (`--cs-explication-corpus`, et `--cs-ecriture`) ; les Pères gardent un maroquin fané (`--cs-peres`), que porte aussi la barre (`--cs-barre-fond`) ; les deux séries du Budé gardent leur teinte. Ne pas les ramener au beige : ce sont les seuls endroits où la couleur travaille, et chacun se commente dans le bloc Cuir de `globals.css`.',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — rubrique de la barre',
    avant: '⚠️ **La rubrique garde sa TYPOGRAPHIE** — petites capitales espacées, même corps qu’avant.',
    apres: '⚠️ **La rubrique garde sa TYPOGRAPHIE** : capitales espacées, même corps qu’avant.',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — rubrique de l’espace',
    avant: '| un REPÈRE (nature, date, état) | rubrique : petites capitales, `--cs-texte-second` | `.chn-tete` |',
    apres: '| un REPÈRE (nature, date, état) | rubrique : capitales espacées, `--cs-texte-second` | `.chn-tete` |',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — sens du rail',
    avant: '  Trente pixels, le chevron en tête, le libellé en `writing-mode: vertical-rl` SANS\n  rotation (le sens d\'un dos de livre français).',
    apres: '  Trente pixels, le chevron en tête, le libellé en `writing-mode: vertical-rl`, ses\n  lettres tournées vers le centre de la page : le rail de gauche prend un demi-tour\n  (`rotate(180deg)`) et se lit de bas en haut (demande de l\'auteur, 2026-09-23, qui\n  renverse la règle « sans rotation » du 2026-09-04). Le fond du rail est celui du volet\n  qu\'il remplace (`fond`).',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — corps du rail',
    avant: '- ⚠️ **Le texte descend d\'un rang** : libellé `0.65625rem` (11 → 10,5 px), complément\n  `0.6875rem` (11,5 → 11). Sur une bande de trente pixels, la contrainte n\'est pas la\n  lisibilité mais l\'encombrement — un rail doit se faire oublier tant qu\'on ne le cherche\n  pas.',
    apres: '- ⚠️ **Le texte tient au plancher** : libellé et complément à `0.6875rem` (11 px), le\n  libellé en capitales, chasse 0,14 em, graisse 600, `--cs-texte-second`. Il était\n  descendu à 10,5 px le 2026-09-04 pour peser moins, et il est remonté le 2026-09-23 :\n  sous le plancher, une capitale couchée sur trente pixels ne se lisait plus.',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — voiles',
    avant: '⛔ Les trois\nautres (`BibliothequeClient`, `ModaleAuteur`, `ModaleMessagerie`) restent au registre : les\nmigrer est un rangement à part, non un effet de bord d\'un chantier voisin.',
    apres: 'Depuis le\nlot 1 de l\'harmonie (2026-09-23, d91de104), tout voile du site public le lit, les trois\nautres (`BibliothequeClient`, `ModaleAuteur`, `ModaleMessagerie`) compris ; seule\nl\'administration garde des voiles noirs écrits en dur.',
  },
  {
    fichier: 'agents',
    nom: 'AGENTS — le glyphe de la croix',
    avant: '⚠️ Le site écrit encore le glyphe sur une quinzaine de surfaces (administration,\n  bibliothèque, compte, messagerie) : elles se convertissent au prochain passage sur ces\n  boutons, et un seizième exemplaire ne s\'écrit pas.',
    apres: '⚠️ Depuis le lot 4 de l\'harmonie\n  (2026-09-23), le site public ne ferme plus rien par le glyphe : toute croix de fermeture\n  est `IconeCroix` dans `.cs-croix-fermer`. Le glyphe ne survit que dans l\'administration\n  et dans la croix d\'effacement de `ChampRechercheVolet`, laissée à l\'auteur.',
  },
]

// ── Les sections neuves ──────────────────────────────────────────────────────────────

const SECTIONS = [
  // ⛔ À SA PLACE (préambule de la charte) : après le § 51.12, avant le § 38.37 qui le suit.
  { fichier: 'charte', titre: TITRE_CHARTE, texte: SECTION_CHARTE, ancre: '### 38.37 Les actions d’une rangée EN REGARD' },
  // AGENTS.md se prolonge par la fin, comme ses sections voisines.
  { fichier: 'agents', titre: TITRE_AGENTS, texte: SECTION_AGENTS, ancre: null },
]

const compter = (s, motif) => s.split(motif).length - 1

function appliquer(source, fichier) {
  // ⚠️ Le dépôt mêle CRLF et LF : on travaille en LF et l'on rend la fin de ligne d'origine.
  const crlf = source.includes('\r\n')
  let sortie = crlf ? source.replace(/\r\n/g, '\n') : source
  const journal = []
  for (const { fichier: f, nom, avant, apres } of REMPLACEMENTS) {
    if (f !== fichier) continue
    const nAvant = compter(sortie, avant)
    const nApres = compter(sortie, apres)
    const dedans = compter(apres, avant)
    if (nApres === 1 && nAvant - dedans === 0) { journal.push(`déjà fait : ${nom}`); continue }
    if (nAvant !== 1) throw new Error(`[${fichier}] « ${nom} » : ${nAvant} occurrence(s) de l'ancien texte, 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
    journal.push(`corrigé : ${nom}`)
  }
  for (const { fichier: f, titre, texte, ancre } of SECTIONS) {
    if (f !== fichier) continue
    const n = compter(sortie, titre)
    if (n === 1) { journal.push(`déjà posée : ${titre}`); continue }
    if (n > 1) throw new Error(`[${fichier}] ${titre} posé ${n} fois.`)
    if (ancre === null) {
      sortie = sortie.replace(/\n*$/u, '') + '\n\n' + texte + '\n'
    } else {
      const a = compter(sortie, ancre)
      if (a !== 1) throw new Error(`[${fichier}] ancre « ${ancre} » : ${a} occurrence(s), 1 attendue.`)
      sortie = sortie.split(ancre).join(`${texte}\n\n${ancre}`)
    }
    journal.push(`posée : ${titre}`)
  }
  return { sortie: crlf ? sortie.replace(/\n/g, '\r\n') : sortie, journal }
}

// ⛔ Les deux fichiers d'abord, l'écriture ensuite.
const resultats = {}
for (const [cle, chemin] of Object.entries(CHEMINS)) {
  const avant = readFileSync(chemin, 'utf8')
  const { sortie, journal } = appliquer(avant, cle)
  resultats[cle] = { chemin, avant, sortie, journal }
}

for (const [cle, r] of Object.entries(resultats)) {
  console.log(`\n${cle} : ${r.avant.length} → ${r.sortie.length} signes`)
  for (const l of r.journal) console.log(`  ${l}`)
}

if (essaiSeul) { console.log('\nEssai seul : rien n’a été écrit.'); process.exit(0) }

for (const r of Object.values(resultats)) if (r.sortie !== r.avant) writeFileSync(r.chemin, r.sortie)
console.log('\nFichiers écrits. Pousser la charte : node scripts/synchroniser-charte-supabase.mjs --push --dry, puis --push.')
