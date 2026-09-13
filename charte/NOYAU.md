# Noyau de la charte — la loi seule

⛔ **Ce fichier est DÉRIVÉ, jamais édité.** Il est régénéré par `node scripts/charte-noyau.mjs` depuis `charte/CHARTE_IA.md`, dont il extrait l’impératif de chaque énoncé marqué ⛔ ou ⚠️. Une correction portée ici se perd à la première régénération : on corrige la charte.

⚠️ **Il ne remplace pas la charte, il y mène.** Chaque énoncé porte le numéro de sa section : on lit le noyau pour savoir qu’une règle EXISTE, on ouvre la charte pour savoir ce qu’elle dit exactement, ce qu’elle excepte et ce qui la fonde.

⚠️ **Ce que le noyau ne voit pas.** Il s’extrait sur les marques ⛔ et ⚠️. Un chapitre qui prescrit sans les employer y est sous-représenté, et cela ne veut PAS dire qu’il prescrit peu : voyez le relevé de couverture, en pied.

---

## § 3. Typographie — les signes, les espaces, l’enrichissement et le gris

**§ 3 — Typographie — les signes, les espaces, l’enrichissement et le gris**

- ⛔ La typographie se pose au RENDU, jamais dans la donnée.
- ⚠️ Trois endroits en traitent légitimement, et il faut savoir pourquoi.

**§ 3.2 — Normalisation typographique**

- ⚠️ Cette règle appartient à la typographie et **ne franchit pas la frontière posée plus bas** : elle vaut pour ce que Corpus Scriptura compose, jamais pour une orthographe ancienne reproduite d’une source.
- ⚠️ La mention d’édition s’écrit en TOUTES LETTRES (décision de l’auteur, 4 septembre 2026) : `deuxième édition`, jamais `2e édition` — et l’abréviation s’ouvre avec l’ordinal, `2e éd.` et `2e édit.` étant proscrits au même titre.
- ⛔ Elle ne vaut pas pour la couche SOURCE, où la graphie du témoin est conservée : « p. 510 de la 2e édit.
- ⚠️ Corriger un ordinal dans une couche de lecture ALLONGE la chaîne : les empans d’italique qui l’indexent (`inline_spans`) se recalculent DANS LA MÊME ÉCRITURE, depuis les intitulés eux-mêmes et non par un décalage arithmétique, puis se vérifient en relisant chaque empan.

**§ 3.3 — Guillemets**

- ⛔ La casse ne sert jamais à justifier ou à inventer la ponctuation : avant de capitaliser, établir que le signe fort appartient réellement au texte éditorial retenu.

**§ 3.5 — Titres**

- ⛔ Il est interdit de perdre ou d’écraser la forme source pour améliorer le rendu.
- ⚠️ Écart assumé avec le Lexique, arrêté le 2026-08-17.
- ⚠️ Dans un titre en deux parties séparées par « ou », l’article de la seconde partie reste dans le titre mais PERD la majuscule : `Julie ou la Nouvelle Héloïse`, `La Répétition ou l’Amour puni`.
- ⛔ Un titre source conserve sa casse partout.
- ⛔ Le trait d’union insécable U+2011 n’est pas employé : Source Serif 4 et Source Sans 3, telles que Google les sert, n’en ont pas le glyphe, et le navigateur l’emprunte à une police de secours.
- ⚠️ Un saut de ligne SAISI dans un intitulé est une frontière que l’équilibrage ne franchit pas, mais il ne rend pas chaque tronçon indépendant : le navigateur équilibre en réduisant une seule largeur commune à toutes les lignes, et dès qu’un tronçon forcé occupe une ligne entière, les tronçons suivants retombent dans l’enroulement ordinaire (mesuré sur les Questions sur l’Heptateuque, 2 007 intitulés dont 652 avec saut…

**§ 3.8 — Ponctuation des citations**

- ⚠️ La suppression ne dispense pas de la syntaxe : la phrase d’accueil doit rester correcte une fois la ponctuation retirée.
- ⚠️ Un deux-points ne suffit donc pas à conclure.
- ⚠️ Elle ne s’applique QUE si la ponctuation forte est déjà au dedans : lorsque la citation n’en porte pas, le signe qui suit le guillemet appartient à la phrase d’accueil et se conserve.
- ⚠️ Ne pas confondre avec la transformation inverse, appliquée au copier-coller : une citation copiée est encadrée de guillemets français, ce qui fait passer ses guillemets internes en anglais.
- ⚠️ Une citation POSÉE VERSET PAR VERSET ne se recolle pas.

**§ 3.8.1 — Versets cités dans les commentaires bibliques**

- ⛔ La nature `verset` ne dit PAS qu’un passage est une citation biblique : elle dit que l’ÉDITION le pose verset par verset — hors du fil de sa prose.
- ⚠️ Ce paragraphe disait l’inverse jusqu’au 29 août 2026 — et autorisait la marque « même si l’édition imprimée la compose dans le fil de la prose ».
- ⚠️ Le corollaire tient au CODE, et il avait été manqué — la lecture ordinaire exigeait le tout ou rien, la lecture en traductions parallèles faisait bloc sur la seule nature du segment.
- ⛔ Il ne se devine pas : ni au nombre placé en tête du segment, puisqu’un verset peut commencer par un nombre — « Quarante jours et quarante nuits… » —, ni au lien biblique, qui relève d’un travail de liaison distinct et n’est pas toujours fait.
- ⚠️ La clé `verse_number` est déjà prise et veut dire autre chose : elle porte le rang du VERS dans son poème, chez Ceriziers.
- ⚠️ L’exposant se cale comme partout ailleurs sur le site, par un déport et non par `vertical-align`, faute de quoi il gonflerait la boîte de ligne et rouvrirait le blanc entre versets, qui est léger.

**§ 3.10 — Une minuscule d’ouverture : émendation ou défaut d’import**

- ⛔ L’arbitrage est CAS PAR CAS, jamais une règle passée sur un texte entier.
- ⛔ Après `?` ou `!`, seule la capitale est possible — un point-virgule y ferait perdre l’interrogation ou l’exclamation.
- ⚠️ On ne touche pas à une minuscule qui suit une ponctuation FAIBLE.
- ⛔ Un point d’abréviation n’est pas une fin de phrase.
- ⚠️ Et la garde se borne à la CAPITALE ISOLÉE : un mot court capitalisé — « se cacha de devant Dieu.
- ⛔ Si l’édition met la capitale à l’intérieur et jamais en tête de segment, la minuscule ne vient pas d’elle.
- ⚠️ Le corpus porte les deux familles ensemble — et il faut les séparer avant tout geste.
- ⛔ Une passe de correction qui ne laisserait aucune trace de ce qu’elle a changé n’est pas une émendation, c’est une perte.

**§ 3.11.1 — Le seuil : ce qu’est un paragraphe**

- ⚠️ Le seuil se MESURE sur la donnée, jamais sur l’impression — on compte les signes du champ en base avant de décider.

**§ 3.11.2 — Les cinq propriétés, et elles sont solidaires**

- ⛔ UN TEXTE JUSTIFIÉ EST TOUJOURS CÉSURÉ, et cela ne dépend pas de sa longueur.
- ⚠️ Relevé du 5 septembre 2026 : sur trente paragraphes justifiés du site, quinze n’étaient pas césurés.
- ⚠️ La césure automatique n’agit que si la langue est déclarée.

**§ 3.11.3 — Le barème des interlignes**

- ⛔ Rien ne monte au-dessus de 1,62 — et cette valeur ne se prend que pour un texte qu’on lit en entier.
- ⚠️ Une notice ne monte pas au rang de la lecture continue.

**§ 3.11.4 — Sur une mesure étroite, on ferre**

- ⚠️ Un texte en `white-space: pre-wrap` ne se justifie jamais — il conserve les espaces de la donnée, que la justification étirerait pour leur compte.

**§ 3.11.5 — Ce que la règle ne touche pas**

- ⚠️ Si un texte centré devient un paragraphe, c’est le CENTRAGE qu’il faut lui retirer d’abord ;
- ⚠️ Un éditeur WYSIWYG, lui, promet la forme finale : il prend la césure comme la page de lecture ;

**§ 3.11.6 — Une valeur morte est pire qu’une valeur absente**

- ⛔ Un attribut `style` d’auteur perd contre une déclaration `!important` d’auteur.
- ⚠️ Avant de corriger une valeur, VÉRIFIER qu’elle est servie.
- ⛔ Une même forme ne s’écrit qu’une fois.
- ⛔ Un aperçu d’administration compose EXACTEMENT comme la surface publique.
- ⚠️ Une règle CSS que rien ne porte fausse un relevé comme elle fausse une lecture.

## § 5. Métadonnées et page de titre

**§ 5.5 — La page de titre du site**

- ⛔ LA PAGE DE TITRE EST CELLE DE L’ÉDITION AFFICHÉE (demande de l’auteur, 8 septembre 2026 : « elle doit correspondre à l’édition qui est affichée ; si on a deux éditions, la latine et la française, il faut faire en conséquence »).
- ⚠️ Une version active dit TOUT de son édition, son silence compris.
- ⛔ Une adresse se prend ENTIÈRE, ou pas du tout.
- ⛔ Deux éditions à l’écran, deux mentions sur la page de titre.
- ⚠️ Il ne se nomme que s’il existe vraiment : une colonne en regard tirée du repli `segments.texte_original` n’est pas une autre édition, c’est la même qui porte son original avec elle, et il n’y a rien de plus à nommer.
- ⚠️ L’invite de l’administrateur suit le crayon.

**§ 5.6 — Informations complémentaires d’une édition**

- ⛔ UNE ÉDITION SAVANTE DÉCLARE CE QU’IL FAUT SAVOIR POUR LA LIRE — et ce n’est ni son adresse ni sa notice : les manuscrits qu’elle a collationnés et les sigles qui les désignent, les abréviations de son apparat, les conventions de transcription qu’elle s’est données.
- ⛔ ELLE NE PARAÎT QUE REMPLIE (demande de l’auteur, 12 septembre 2026).
- ⛔ ELLE APPARTIENT AU TEXTE, JAMAIS À L’ŒUVRE.
- ⛔ ELLE EST PUBLIQUE, et c’est ce qui la sépare d’une note d’atelier.
- ⚠️ Elle se compose comme la prose du site — enrichissements reconnus (`*italique*`, `**gras**`, `++petites capitales++`), sauts de ligne conservés, aucune ponctuation ajoutée.
- ⚠️ Et elle peut porter une NOTATION, qui distingue ses niveaux d’information sans rien retrancher à cette prose : voir le § 5.6.1.
- ⚠️ Colonne nullable et SANS contrainte — comme `essais.couverture` et `profils.theme_lecture` : ce qu’une édition déclare est une matière éditoriale, elle bougera, et une valeur mal formée ne doit ni bloquer une écriture ni vider une fiche.

**§ 5.6.1 — La NOTATION d’une notice — trois niveaux, deux marques**

- ⛔ CE QU’UNE NOTICE DE TRANSMISSION PORTE N’EST PAS DE LA PROSE SUIVIE.
- ⛔ LE TIRET EST OBLIGATOIRE, ET IL A DEUX GRAPHIES.
- ⚠️ C’est le PREMIER qui coupe, quelle qu’en soit la graphie : un corps qui porte un second tiret garde le sien.
- ⛔ Jamais le trait d’union, qui ouvre déjà la ligne.
- ⛔ UNE RUBRIQUE EST COUSUE À CE QU’ELLE NOMME.
- ⚠️ Quinze n’est pas le blanc qui sépare deux SECTIONS de la fiche, qui vaut dix-huit : une rubrique est un rang au-dessous, et lui donner le même air aplatirait la hiérarchie qu’on vient de poser.
- ⚠️ L’ENCRE DE LA RUBRIQUE MONTE D’UN RANG — par rapport à celle d’un volet.
- ⛔ NI JUSTIFICATION NI CÉSURE SUR UNE ENTRÉE.

## § 6. Structure, niveaux, paragraphes et rangs

**§ 6.1.1 — La jonction entre deux segments**

- ⛔ C’est une INSTRUCTION, jamais du texte : sa valeur ne se concatène pas au corps, elle se matérialise.
- ⚠️ La colonne admet DEUX conventions, et rien en base ne les départage, puisqu’elle est en texte libre et que les lots d’import se sont succédé.
- ⛔ La matérialisation vit à UN SEUL endroit, que partagent toutes les surfaces qui recomposent : lecture suivie d’une œuvre, apparat critique, colonne en langue originale de la lecture en regard, traductions parallèles, couche biblique éditoriale.
- ⛔ Une valeur inconnue n’est JAMAIS rendue telle quelle : elle retombe sur le liant par défaut.
- ⚠️ Une valeur nulle dit « l’édition n’a rien prescrit » et vaut l’espace simple, conformément au § 3.2. Ce n’est pas une commodité de rendu : au 24 août 2026, 65 798 segments répartis sur 44 versions n’ont jamais eu la colonne renseignée, et leur rendre la chaîne vide souderait les mots de tout ce fonds.
- ⛔ La jonction est celle du segment COURANT, et rien ne s’hérite du segment précédent ni de son unité source.
- ⚠️ Et l’on ne pose pas de règle qui interdirait de joindre deux unités : une phrase court parfois de l’une à l’autre dans un même paragraphe, et 684 premiers segments d’unité chez Mirandol et Ceriziers portent la chaîne vide précisément pour recoller un mot coupé au passage.
- ⛔ Aucune valeur de métadonnée n’entre dans la chaîne remise au moteur typographique.

## § 7. Natures de segment

**§ 7 — Natures de segment**

- ⚠️ La langue originale n’y est pas : elle va en NOTE, que l’exergue appelle en fin de phrase.
- ⚠️ À distinguer du `lemme`, qui est la phrase qu’un commentaire explique à sa place, dans le fil |
- ⚠️ À distinguer d’`apparat_editeur`, qui porte le paratexte rédigé quand `signature` n’en porte que les noms et les qualités |
- ⛔ Elles sont QUATORZE, et `vers` n’en est pas.
- ⚠️ Un segment en vers porte donc la nature de ses FRÈRES
- ⚠️ Le compte se refait à CHAQUE affichage : une
- ⚠️ L’en-tête de section ne se compose que si la vue porte les deux mains : un en-tête
- ⛔ L’espace `apparat_critique` n’est jamais un fourre-tout pour le hors-corps.

**§ 7.0 ter — Audit obligatoire des natures de segment**

- ⛔ Aucun reclassement automatique par expression régulière ou heuristique n’est admis : la nature se décide par la fonction documentaire attestée.

**§ 7.1 — Les trois axes d’un style, et les règles de leur attribution**

- ⛔ Le style ne se préfixe donc PAS par sa famille de page.
- ⚠️ Le nom se QUALIFIE dès qu’il sort de sa table.
- ⛔ Un style ne se devine jamais du texte — ni de la casse, ni du corps, ni de la ponctuation, ni de la place dans la page.
- ⛔ Le vocabulaire est CLOS, et la base le tient.
- ⛔ Jamais un INSERT à la main : deux vocabulaires qui divergent valent moins qu’un seul.
- ⚠️ Une faute de graphie ne devient pas un alias.
- ⚠️ Deux styles peuvent partager un rang s’ils diffèrent d’AXE.
- ⛔ Une composition écrite deux fois dérive à la première retouche.

**§ 7.2 — Un style dit une NATURE ; le rang se dit à part**

- ⚠️ Or le rendu ne compose que sur le couple niveau × nature.
- ⚠️ Les TITRES ne bougent pas — et l'asymétrie est motivée.
- ⚠️ Aucune des quatre ne portait un seul bloc du corpus.
- ⛔ Un style d'information sans RANG est refusé — par la base comme par le rendu.
- ⚠️ Les anciens codes vivent comme NOMS HÉRITÉS

**§ 7.3.1 — Il y a DEUX vocabulaires, et ils ne se rencontrent jamais**

- ⛔ Une valeur de l’un n’est jamais une valeur de l’autre.
- ⚠️ **Une nature qu’une table accepte et que le CODE ignore n’existe pas pour le

**§ 7.3.2 — Ce qu’on écrit pour un bloc de paratexte biblique**

- ⛔ Un titre n’écrit PAS son rang — son nom le porte.

**§ 7.3.3 — Ce que la page en fait**

- ⚠️ Le chiffre du jeton n’est pas la balise HTML.
- ⚠️ Un nom HÉRITÉ se résout, il ne se réécrit pas tout seul.

**§ 7.4 — Le VERS — un style, cinq surfaces**

- ⛔ Ce qui fait qu'un vers est un vers ne dépend d'AUCUNE surface.
- ⚠️ Seuls la police, le corps et l'encre appartiennent à la surface
- ⛔ Une surface se reconnaît à son CHEMIN de rendu, non à sa place dans la page.
- ⚠️ Le poème demande pourtant qu'on lise l'INITIALE de chaque vers — « Lector qui
- ⚠️ Seuls les segments de `nature = 'introduction'` empruntent ce chemin.
- ⛔ Dans l'apparat, la NATURE est déjà prise.
- ⚠️ Et ce que l'apparat impose, le corps l'adopte.
- ⛔ **Garder les deux aurait été garder deux façons de dire le même fait, et deux façons
- ⚠️ Une déclaration, mais DEUX enveloppes, et il faut lire les deux.
- ⛔ Ne jamais juger un vers ailleurs que dans
- ⚠️ Ce que la levée du verrou a coûté, et qu'on ne refera pas.
- ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne.
- ⛔ **On ne DÉCOUPE pas en lignes un paragraphe qui porte une locution marquée ou un
- ⛔ Une frontière technique ne crée jamais une strophe.
- ⛔ Et la lettrine n’orne que la parole de l’AUTEUR (décision du 30 août 2026).
- ⚠️ Sur les 8 223 divisions du corpus, 159 s’ouvraient sur autre chose que la
- ⚠️ Le défaut se lisait le mieux chez Chrysostome, où chaque psaume s’ouvre sur le verset
- ⛔ Un paragraphe orné CONTIENT sa lettrine (`display: flow-root`).
- ⚠️ C'est une MESURE, non un rang, et elle se rabat POÈME PAR POÈME —
- ⛔ L'échelle compte CINQ positions, et le plafond doit les admettre toutes
- ⚠️ **Un plafond ne borne pas une échelle, il
- ⚠️ **Un plafond fait un SECOND travail, qu'il ne faut pas lui découvrir par surprise :
- ⚠️ La largeur se MESURE, elle ne se ressent pas
- ⚠️ Elle ne se devine pas davantage : couper un

**§ 7.5 — Le CATALOGUE des styles — ce que chacun sert**

- ⚠️ Deux autres l’ont été le 9 septembre 2026, `apparat_auteur` et `apparat_editeur` :
- ⚠️ Deux lignes ont été remesurées le 8 septembre 2026, `lemme` et `exergue` : les

**§ 7.5.1 — Les natures d'un segment patristique — `segments.nature`**

- ⛔ HÉRITÉE (§ 7) : un fourre-tout de paratexte — dédicaces, privilèges, gloses de vocabulaire, arguments analytiques —, rendu dans la vue d'apparat.
- ⛔ PAS — le type fonctionnel `apparat_critique` d'une note.
- ⛔ pas une citation en ligne : celle-là reste dans `texte` et se détache d'elle-même au delà de 400 signes | 1 221 |
- ⛔ ne se sort jamais du fil : une réplique est entre guillemets sans être une citation d'auteur | 1 038 |
- ⛔ pas `apparat_editeur`, qui porte le paratexte de l'ÉDITION.
- ⛔ Et sa seconde surface ne lui retire pas la première : l'ôter du corps avait fait disparaître le Prologue de Rufin, le 18 août 2026 | 190 |
- ⛔ ne se détache pas : un lemme se lit au fil du texte (décision du 20 août 2026).
- ⛔ Et ce n'est PAS un `exergue` : le lemme s'explique, l'exergue annonce | 220 |
- ⛔ pas un `lemme` : un exergue ne se commente pas ligne à ligne, et il quitte le fil | 19 |
- ⛔ pas toute citation biblique : c'est la coupure IMPRIMÉE qui le fonde | 12 |
- ⛔ pas un apparat : une mention de traducteur ferme le TEXTE et se lit avec lui, à la place que l'imprimé lui donne | 18 |
- ⛔ Le VERS n'est PAS dans cette table, et c'est le point à retenir

**§ 7.5.2 — Les styles du paratexte biblique — `metadata.semantic_style`**

- ⛔ pas un titre : c'est un bloc d'information dont l'intitulé est un titre | 270 |
- ⛔ pas un commentaire : celui-ci reste dans le fil | 42 |
- ⚠️ La BIBLIOGRAPHIE n'est pas un style, et c'est délibéré
- ⛔ Lui donner un style à elle seule aurait mis dans le NOM ce que la

**§ 7.6 — Créer un style neuf**

- ⛔ On ne crée pas un style parce qu'un cas PARAÎT nouveau.
- ⛔ Un style existant ne compose-t-il pas déjà cela ?
- ⛔ Un AXE ne dirait-il pas la différence sans un nom de plus ?
- ⛔ quand NE PAS l'employer, et comment il compose.
- ⚠️ Et l'inverse est vrai : un style qui ne sert plus se retire.
- ⛔ Une grille complète n'est pas une vertu : celle

**§ 7.7 — Un style ne vit que sur la SURFACE où sa donnée vit**

- ⛔ Une forme rendue là où sa donnée ne va jamais est une forme MORTE
- ⚠️ Le 9 septembre 2026, cette page a été prise à son propre piège.
- ⛔ Écrire « toutes » sans avoir pris le compte est
- ⛔ Une mention de traducteur n'est pas un apparat.
- ⛔ Un style se vérifie donc sur DEUX axes, jamais sur le premier seul.
- ⚠️ **La question se pose en un compte, et il faut le prendre avant de croire une fiche
- ⛔ Et une planche de styles qui montre une forme sur la mauvaise
- ⚠️ Corollaire, qui vaut au delà de la composition.
- ⛔ ET LE BLANC QUI FERME UN BLOC N'EST PAS CELUI QUI LE COUD.
- ⚠️ **La place d'une ligne dans son bloc se juge sur le bloc SUIVANT, jamais sur le

**§ 7.8 — L’EXERGUE — le verset posé en seuil d’une pièce**

- ⛔ CE N’EST PAS UN LEMME, ET C’EST TOUT L’OBJET.
- ⛔ LA LANGUE ORIGINALE VA EN NOTE, ET L’EXERGUE EST CE QU’ON LIT.
- ⚠️ Rien n’est perdu ni caché : le verset se lit d’un clic, le témoin matériel reste dans
- ⛔ L’APPEL SE POSE EN FIN DE PHRASE, SELON LE § 13.4
- ⛔ Et l’appel ne se glisse pas dans une glose du traducteur : sur la Douzième
- ⚠️ Un exergue peut encore en appeler un autre
- ⚠️ LE RETRAIT CÈDE QUAND LA MESURE NE PEUT PLUS LE PAYER.
- ⛔ LES DEUX BLANCS NE DISENT PAS LA MÊME CHOSE
- ⛔ IL SORT DU PARAGRAPHE DE PROSE, que la donnée l’y range ou non.
- ⚠️ Ne pas le confondre avec l’exergue de l’INTERFACE

## § 9. Liens bibliques

**§ 9.4 bis — Coexistence fonctionnelle des types**

- ⛔ Un changement de type ne suffit jamais à justifier un second lien.

## § 11. Format d’échange et import des versions textuelles

**§ 11.0 — Manifeste des traductions nouvelles**

- ⛔ Elle ne se substitue jamais au témoin source et ne doit jamais être présentée comme une traduction historique.
- ⛔ Une validation humaine n’est jamais déduite d’une relecture technique ou d’un accord global : elle n’est déclarée que si elle a réellement eu lieu et selon son périmètre exact.
- ⛔ Les traductions antérieures peuvent servir de témoins de contrôle, jamais de texte à paraphraser silencieusement.
- ⛔ Tout emprunt volontaire, toute dépendance substantielle ou toute comparaison décisive avec une traduction existante est documenté.
- ⛔ La fidélité lexicale, morphologique, sémantique et, lorsqu’elle éclaire le sens, étymologique prime sur l’élégance moderne.
- ⛔ On ne lisse pas une syntaxe rugueuse simplement pour rendre la phrase plus plaisante.
- ⛔ Aucun archaïsme décoratif, aucun faux médiévisme et aucune amplification rhétorique ne sont ajoutés pour donner une couleur ancienne.
- ⛔ Une transposition syntaxique n’est admise que lorsqu’une conservation plus étroite produirait un contresens, une ambiguïté indue ou un français réellement inintelligible.
- ⛔ Les mots ajoutés pour la seule intelligibilité restent minimaux.
- ⛔ Le contexte de l’auteur et du passage prévaut toujours sur une équivalence de dictionnaire isolée.
- ⚠️ Les choix évidents ne sont pas surannotés.
- ⛔ La modernisation ne doit jamais devenir une traduction.
- ⛔ ils ne complètent, ne corrigent ni ne réécrivent silencieusement Français 899.
- ⛔ Tout ce qui n’est pas dans cette table blanche est conservé.
- ⛔ Un mot parfaitement lisible mais incompris ou douteux de sens reste en clair dans le texte ; il ne reçoit pas la balise `[lecture incertaine : …]`.
- ⛔ On ne crée pas `[lacune]` par inférence sémantique, grammaticale ou par comparaison avec une autre Bible.
- ⛔ On ne « répare » jamais séparément deux fragments qui forment une même séquence matérielle.
- ⛔ Ne jamais partir du français moderne existant pour « revenir » approximativement au témoin.
- ⛔ Les formules génériques du type « portion indécidable » ne suffisent pas lorsqu’une explication plus précise est disponible.
- ⛔ sauf consigne contraire, on n’imite ni le mètre, ni la rime, ni une compensation métrique.
- ⛔ Si la mission demande une traduction en prose, la ligne de vers n’est pas recréée.
- ⛔ ces essais restent expérimentaux, privés et non validés humainement.
- ⛔ La matérialisation en base ne commence qu’après fixation du profil de traduction de la mission — de son étiquetage d’origine et de sa méthode d’alignement avec l’original.

**§ 11.1 — Objets et identifiants**

- ⛔ Toute nouvelle importation textuelle reçoit un `id_texte` stable et appartient à un seul `id_oeuvre`.
- ⛔ Ils ne constituent plus la source normative d’une nouvelle note structurée ni d’un nouvel alignement entre versions.
- ⛔ Les liens bibliques ne sont jamais importés comme colonnes de segment : ils suivent leur propre phase et leur propre table.
- ⛔ Un import ne doit jamais perdre silencieusement une colonne inconnue : il la refuse ou la signale avant écriture.

**§ 11.2 — Préparation**

- ⛔ contrôler les alignements éventuels sans supposer de cardinalité `1:1`

**§ 11.3 — Écriture**

- ⛔ Importer par lots bornés et transactionnels. Une erreur arrête l’opération et déclenche le retour arrière du seul périmètre créé par l’import.
- ⛔ Ne jamais supprimer une œuvre ou une version préexistante pour contourner un conflit d’identifiant.
- ⛔ Une réimportation ne doit jamais réintroduire une variante d’éditeur, une collection, un tome, une pagination, une mention de responsabilité ou une chronologie détaillée dans ce libellé.
- ⚠️ Les informations supprimées du libellé restent conservées dans leurs champs structurés, les métadonnées de provenance ou les notes appropriées.

## § 12. Textes parallèles et alignements sémantiques

**§ 12.1 — Original embarqué et œuvre originale autonome**

- ⛔ Cette copie ne sert plus la lecture bilingue, qui se compose depuis l’alignement (§ 12.2) : elle n’est plus lue qu’en repli, pour les œuvres dont l’original n’a pas encore de texte propre, et elle s’éteindra avec elles.
- ⛔ Aucune importation nouvelle ne l’alimente : un texte en langue originale entre comme **texte de l’œuvre**, avec son propre `id_texte`, et c’est l’alignement qui dit la correspondance.
- ⛔ Le libellé d’un texte se déduit des mêmes langues, et d’elles seules.
- ⛔ Aucun libellé ne suppose une langue : le latin ne tient jamais lieu de langue inconnue.
- ⛔ Une version ancienne est une traduction.

**§ 12.2 — Alignement éditorial**

- ⛔ ALIGNEMENT N’EST PAS PARAGRAPHAGE (décision de l’auteur, 7 septembre 2026).
- ⚠️ La règle inverse a valu du 24 août au 7 septembre 2026, et le *Discours 38* de Grégoire de Nazianze l’a démentie : son alignement, posé au SEGMENT, compte 76 groupes sur un corps de deux paragraphes, et le lecteur en tirait 76 blocs, chacun sous son filet et son blanc.
- ⛔ Une frontière d’alignement ne pose jamais un blanc, un filet ni un `<p>` là où le paragraphe de l’édition continue.
- ⚠️ Une fois le rendu juste, corriger cette même minuscule redevient possible ; mais c’est alors une émendation délibérée, arbitrée cas par cas, et elle relève du § 3.10.
- ⚠️ Il reste une coupure de LIGNE à chaque empan, et elle est irréductible : aucune écriture CSS ne fait couler un texte d’un rang de grille au suivant en gardant deux colonnes accordées.
- ⚠️ Les deux moitiés de la règle se sont chassées l’une l’autre en un seul jour, le 7 septembre 2026, et il faut savoir les deux échecs.
- ⛔ Entre deux ensembles posés sur la même paire de textes, c’est le plus FIN qui porte la lecture, et la finesse se COMPTE — une ligne de `texte_alignements` vaut un groupe, et le plus grand nombre l’emporte.
- ⛔ Le groupe contient **toute l’unité traduite et seulement ce qu’elle traduit dans l’original**.
- ⛔ Il n’existe donc pas de seuil de signes autorisant à fusionner des unités déjà établies.
- ⚠️ Le paragraphe, lui, se sépare quand même : un empan à cheval décale la correspondance horizontale, il n’efface pas une coupure que l’édition a voulue.
- ⚠️ La lecture bilingue n’est offerte au lecteur que si **les deux** textes sont publics : la RLS des trois tables d’alignement l’exige.
- ⛔ Garde technique de clôture du bilingue.
- ⛔ La lecture en regard se compose donc sur 42 rem — le rapport des colonnes étant de 1,2 pour 1 et la gouttière de 1,4 rem.
- ⚠️ Le rapport des colonnes se compte, il ne se devine pas.
- ⚠️ Les trois qui restent sont irréductibles à cette échelle — deux vers du Mirandol, et la citation grecque d’Euripide, qui demanderait à elle seule 402 px. Les faire tenir voudrait une mesure de 55 rem, où la prose ne se lirait plus.
- ⚠️ La prose y gagne aussi — sa colonne originale passe de 209 à 295 px. Une colonne de 209 px ne porte qu’une trentaine de signes, ce qui est en deçà de toute mesure de lecture.
- ⛔ DEUX POÈMES NE S’ALIGNENT PAS L’UN SUR L’AUTRE
- ⛔ Deux poèmes indépendants ne s’apparient pas artificiellement vers à vers.
- ⚠️ Exception : une traduction nouvelle produite explicitement ligne par ligne depuis l’original, avec conservation de la même ligne de vers, possède de véritables unités de traduction 1:1.
- ⚠️ Ce n’est pas un défaut marginal, c’est la moitié de la page.
- ⛔ Un poème fait donc UN SEUL rang de grille — la traduction dans sa colonne et la langue originale dans la sienne, chacune coulant d’un trait avec ses strophes et son seul blanc de fin.
- ⚠️ L’appariement vers à vers était de toute façon une illusion.
- ⛔ Les originaux de TOUTES les strophes suivent — joints par un saut de ligne.

**§ 12.4 — UNE COLONNE EN REGARD SE COMPOSE SUR LA SURFACE QUI REND LE TEXTE**

- ⛔ LA CAUSE EST LA SURFACE, ET ELLE SE COMPTE AU CHEMIN DE RENDU.
- ⚠️ C'est le défaut du § 7.4 pris par l'autre bout, et le même jour.
- ⛔ UNE GARDE QUI VÉRIFIE LA DONNÉE NE VÉRIFIE PAS LE RENDU.
- ⛔ Le CORPS et l'ENCRE d'une colonne en regard viennent de la SURFACE
- ⛔ **L'encre d'un argument ne peut pas être celle d'un original de CORPS, et c'est
- ⛔ Dans une grille en regard, le blanc appartient à la RANGÉE, non à la cellule.
- ⚠️ CE QUI RESTE, ET QUI N'EST PAS DU RENDU.

## § 13. Notes et apparats

**§ 13.7 — Affichage de l’appel de note**

- ⛔ un appel de note est toujours en romain — sur quelque page que ce soit, et quoi que fasse le texte autour de lui.
- ⛔ L’appel se place toujours AVANT la ponctuation qui clôt le passage annoté.
- ⛔ L’appel ne se hisse pas au-dessus des hampes.
- ⛔ Jamais de pointillé sous un appel de note — ni aucun autre soulignement, nulle part et à aucun moment.
- ⛔ L’appel ne se sépare jamais de la ponctuation qui le suit.
- ⛔ L’appel ne prend pas l’alinéa du paragraphe qui le porte.
- ⛔ L’esperluette et les virgules sont elles-mêmes en exposant — à la hauteur des chiffres qu’elles séparent : posées sur la ligne de base, elles font retomber le milieu de la suite.
- ⛔ La liste ne subsiste que pour les notes dont la transcription n’a relevé aucun point d’appel, faute de quoi elles disparaîtraient du site, et elles la quitteront une à une à mesure de leur ancrage.

**§ 13.8 — La NORMALISATION des notes — ce que le site compose, ce que la base porte**

- ⚠️ Mesuré avant d’écrire une seule ligne : une bonne moitié de ce qu’on croit à corriger l’est déjà.
- ⛔ SEULE LA TRANSCRIPTION DIPLOMATIQUE D’UNE NOTATION D’APPARAT CRITIQUE échappe à la normalisation de lecture lorsque sa forme fait preuve.
- ⛔ 1. Le numéro AFFICHÉ recommence à chaque début de NIVEAU 1 — et le numéro INTERNE ne bouge pas.
- ⚠️ Cette décision RECTIFIE le § 13.3 — qui dit encore que « la numérotation ne recommence ni à une partie, ni à un livre, ni à un espace textuel » : la règle valait pour un numéro unique, et il y en a désormais deux.
- ⛔ Lorsqu’un témoin imprime un appareil critique autonome et numéroté, cette série peut conserver sa propre numérotation de lecture.
- ⛔ 2. Les œuvres CITÉES en note entrent dans `ouvrages_bibliographiques` — le catalogue des ouvrages, et la référence se COMPOSE depuis ses champs — jamais rédigée à la main dans un bloc.
- ⛔ 3. Un bloc de note entièrement LATIN se compose en italique, quelle que soit sa longueur — y compris les 27 blocs qui dépassent 900 signes.
- ⚠️ Le grec ne suit pas : son alphabet le distingue déjà, et l’italique y déforme la lettre au lieu de changer la graisse.
- ⚠️ Le latin ENCHÂSSÉ dans une note française est un cas distinct : aucune donnée ne dit où il commence, et il demande une écriture.
- ⛔ 4. LA RESPONSABILITÉ ÉDITORIALE paraît dans l’intitulé lorsqu’elle est établie — auteur, traducteur, édition source, Corpus Scriptura.
- ⛔ UNE RESPONSABILITÉ FAUSSE EST PIRE QU’UNE RESPONSABILITÉ ABSENTE.

**§ 13.8.1 — Deux corruptions du normaliseur, trouvées en le mesurant**

- ⛔ Le point n’est un séparateur chapitre/verset que s’il est SUIVI D’UN BLANC.
- ⛔ Le point final ne se mange pas quand un CHIFFRE le suit.
- ⚠️ Corollaire de méthode, et c’est le troisième du même ordre cette semaine — une fonction de normalisation ne se juge pas sur ses tests, mais sur le CORPUS qu’elle traite.

**§ 13.8.2 — L’ÉTIQUETTE qui nomme la nature d’un bloc ne s’écrit pas dans son texte**

- ⛔ Un bloc ne dit pas ce qu’il est, il le PORTE.
- ⛔ On ne retire que la forme NUE, celle où le deux-points suit immédiatement le mot.
- ⛔ Et une formule d’apparat n’est pas une étiquette.

**§ 13.9 — RECTIFICATION du § 13.8 — la ponctuation et la typographie se normalisent DANS LA DONNÉE**

- ⛔ LA RÈGLE EST DONC L’INVERSE, ET ELLE VAUT POUR L’APPAREIL DE NOTES.
- ⚠️ Pourquoi la règle du § 3.2 ne s’applique pas ici, et c’est la leçon de la rectification.
- ⛔ QUATRE EXCEPTIONS, ET ELLES SE NOMMENT.
- ⚠️ Le rendu ne disparaît pas pour autant, il devient un FILET.
- ⛔ Les retirer serait faire dépendre l’affichage de la qualité d’une campagne.
- ⚠️ Ce que le rendu garde pour lui, et pour de bon — ce qui n’appartient pas au texte de la note — l’italique de la langue, le type de note, le numéro affiché, la mise à la ligne d’une référence par rang, l’appel.

**§ 13.10 — Les NATURES d’un bloc de note**

- ⛔ Les trois axes du § 7.1 valent ici — et il ne faut pas les confondre : la **NATURE** dit ce que le bloc EST (`kind`) ; la **FORME** dit s’il est prose ou vers (`form`) ; le **TYPE DE RESPONSABILITÉ** dit qui parle (`metadata.editorial_role`, § 13.8).
- ⛔ Une nature ne se préfixe pas par sa surface : `texte_note_blocs` EST la table des notes, et le redire dans la valeur serait la dérive que le § 7.1 ferme.
- ⛔ DEUX NATURES SEULEMENT SONT CRÉÉES, et chacune répond aux trois questions du § 7.6.
- ⚠️ `lemma` existe et ne sert qu’à UNE œuvre (126 blocs, un seul texte).
- ⛔ LA CHARTE D’ABORD, LA DONNÉE ENSUITE (§ 7.6) : le vocabulaire est fixé ici, il entre dans la contrainte de la base, puis on sème, puis on compose, puis on éprouve.
- ⛔ Jamais un `insert` à la main qui poserait une nature que rien ne sait rendre.

**§ 13.11 — Les QUATRE FAMILLES de natures, et ce qu'elles commandent**

- ⚠️ Pourquoi une famille plutôt que huit règles.
- ⛔ LA FORME `verse` PRIME SUR LA COMPOSITION PAR DÉFAUT DE LA FAMILLE.
- ⛔ L'ANCRAGE EN TÊTE NE FAIT PAS PARAGRAPHE.
- ⚠️ En tête seulement — un lemme qui reparaît au milieu d'une note y joue un autre rôle, et une note faite du seul ancrage se rend seule plutôt que de disparaître.
- ⛔ DANS LA FAMILLE DU RENVOI, C'EST LA DESTINATION QUI COMMANDE.
- ⛔ LE NOM DE L’AUTEUR EST TOUJOURS L’AUTORITÉ NORMALISÉE.
- ⛔ UNE NATURE INCONNUE NE FAIT PAS DISPARAÎTRE SON BLOC.
- ⚠️ C'est le contraire du défaut payé quatre fois avec `NATURES_CORPS`, où le bloc s'évanouissait en silence.

**§ 13.11.1 — Ce que le CODE porte depuis le 5 septembre 2026**

- ⛔ Le vocabulaire a une SOURCE UNIQUE, et elle est double par nécessité — `app/lib/naturesNote.ts` et la contrainte `texte_note_blocs_kind_check`.
- ⛔ Le NUMÉRO AFFICHÉ se calcule à la lecture, jamais en base
- ⚠️ La division d'une note ne se lit PAS dans `texte_notes.book`, qui la porte pourtant.
- ⛔ LA RESPONSABILITÉ s’annonce dans l’en-tête de la fenêtre de note, et nulle part ailleurs (`app/lib/typeNote.ts`) : « Note du traducteur 12 », « Note de l’édition 7 », « Note de Corpus Scriptura 3 ».
- ⛔ Jamais « Apparat critique » comme intitulé public.
- ⛔ L'ITALIQUE DE LA LANGUE ne porte que sur le bloc ENTIER — celui dont `language` déclare la langue.

**§ 13.11.2 — Ce que la composition SÉPARE dans une même famille (9 septembre 2026)**

- ⚠️ Où qu'elle paraisse — en tête sur la ligne du propos, au milieu d'une note, ou seule.
- ⚠️ Rien ne se cumule — un lemme latin est déjà italique par sa langue (§ 13.8), et les deux règles disent alors la même chose.
- ⛔ TOUTE LA FAMILLE DU RENVOI SUIT SA CIBLE EN LIGNE — et non le seul `reference`.

**§ 13.12 — Ce que l’auteur a TRANCHÉ le 5 septembre 2026**

- ⚠️ Aucune donnée n’a été écrite le jour de l’arbitrage — la charte d’abord (§ 7.6), la donnée ensuite.
- ⚠️ Mesuré : **406 blocs sur 420 (96,7 %)** se convertissent sans réserve ; aucun de ces textes ne porte déjà `*`, `+`, `^` ni `<i>` ; **14 blocs** ont des empans qui se chevauchent et se relisent un par un.
- ⛔ C’est le § 13.11.1 pris par l’autre bout : *un champ que rien ne lit n’est pas une réserve pour plus tard, c’est une seconde vérité qui attend de contredire la première* — et celle-ci est le SEUL témoin des italiques de Faivre.
- ⛔ La provenance dit d’OÙ vient un renvoi, jamais qu’il doive garder sa graphie — sans quoi le site écrirait « Ps. 5, 8. » ici et « Ps 5, 8 » partout ailleurs, pour la même référence.
- ⚠️ Repères mesurés : 6 431 notes sur 16 408 (39 %) reçoivent une ponctuation finale, 3 392 renvois sur 11 916 sont recomposés — ce sont ces blocs-là qui gardent leur leçon.
- ⛔ « Il faut systématiquement faire un contrôle logique.
- ⚠️ « Dépublier » n’existe pas encore pour une note : voir § 13.12.3.
- ⚠️ L’unification est sans risque, et c’est mesuré : les **901 blocs qui portent les deux premiers s’accordent tous**, sans une seule contradiction, et les deux seconds ne se rencontrent jamais sur un même bloc.
- ⛔ Et le nom retenu est déjà celui que le code lit (`lireMetadonneesBlocNote`) : le plus répandu n’est pas le plus régulier, mais il est le seul qui ne demande pas de toucher au rendu.
- ⚠️ Le chiffre de 1 716 renvois, longtemps annoncé, était FAUX — la mesure du 5 septembre 2026 le rectifie — **355 occurrences** de la forme « <mot>.
- ⛔ Le risque est borné par le motif lui-même : il n’agit que si le mot qui précède résout vers un livre du référentiel, et « Cor.
- ⚠️ Chaque bloc touché se signale, pour un contrôle par sondage.
- ⛔ AUCUN LIVRE DU CANON N’A PLUS DE 150 CHAPITRES — le Psautier étant le plus long.
- ⚠️ Elle ne coûte rien à l’existant : des 4 038 réécritures d’avant, **pas une** ne dépassait 150.
- ⚠️ LE MOTIF RECULE DANS LE MOT QUI PRÉCÈDE, et il faut le lui laisser.
- ⚠️ Trois sources sont elles-mêmes fautives, et le normaliseur les recopie fidèlement.
- ⛔ On ne CORRIGE pas une référence : on la recompose.
- ⛔ Les équivoques restent dehors, et la charte l’a déjà tranché : « Cor.
- ⛔ On restreint donc la LECTURE aux clés qu’on projette — gain sans arbitrage, sans toucher une donnée.
- ⚠️ Le journal lui-même appartient à GPT, et l’auteur ajoute qu’**il faut le supprimer s’il ne sert à rien** : la décision lui revient.
- ⛔ Les 554 copies de bloc, elles, sont une seconde vérité au sens de la charte et se regardent à part.

**§ 13.12.1 — Les RESPONSABILITÉS éditoriales des notes**

- ⛔ `critical_apparatus` N’EST PLUS UNE RESPONSABILITÉ CANONIQUE.
- ⛔ UNE RESPONSABILITÉ FAUSSE EST PIRE QU’UNE RESPONSABILITÉ ABSENTE.
- ⚠️ L’INTITULÉ SE DÉTERMINE AU NIVEAU DE LA NOTE LOGIQUE.
- ⚠️ « Note de l’édition », et non « note de l’éditeur » — le libellé nomme une RESPONSABILITÉ, et « éditeur » se dispute en français entre la maison qui publie et le savant qui établit.

**§ 13.12.2 — L’ITALIQUE du latin enchâssé**

- ⛔ Le latin cité DANS une note française se compose en italique.
- ⛔ Il s’écrit par MARQUEUR, dans le texte (`*…*`), jamais par un offset ni par une devinette au rendu.
- ⛔ C’est une LECTURE, non une passe mécanique.
- ⚠️ Une abréviation de renvoi n’est pas du latin CITÉ « ibid. », « id. », « op. cit. », « cf. », « passim » sont des conventions bibliographiques et ne s’italisent pas.
- ⛔ Ne pas cumuler avec l’italique de la langue.
- ⚠️ Le grec ne suit pas — son alphabet le distingue déjà, et l’italique y déforme la lettre au lieu de changer la graisse (§ 13.8).
- ⚠️ Sur les cinq textes enrichis, l’imprimeur a déjà fait le travail — la règle 1 rend l’italique de Faivre, dont une part est du latin — 2 341 empans dans le seul `A0044O0003TFR-V11`.

**§ 13.12.3 — Ce qui reste OUVERT**

- ⚠️ LA FENTE DU BLOC À TROIS TÊTES ATTEND UNE SÉANCE À PART.
- ⛔ Rien ne s’écrit tant que l’auteur n’a pas tranché : « C’est un cas particulier.
- ⚠️ « DÉPUBLIER » N’EXISTE PAS ENCORE POUR UNE NOTE — et la décision 8 le demande.
- ⛔ Le mécanisme se pose AVANT la passe, non pendant, et il vaudra pour tout bloc qu’on voudra retenir — non pour les seuls treize « ibid. » orphelins.
- ⚠️ Le RENVOI INTERNE reste un texte, non un lien.

**§ 13.12.4 — Les rôles HORS VOCABULAIRE, et l'axe `rendering` qui n'en a pas (9 septembre 2026)**

- ⛔ UN RÔLE QUE LE SITE NE LIT PAS NE SE VOIT PAS.
- ⛔ Sans cette règle il absorberait tout ce que le corpus produit, et l'axe cesserait de distinguer.
- ⚠️ C'est la décision 10 (§ 13.12) portée aux rôles : des deux noms d'une même chose, le survivant est celui que le code lit.
- ⛔ ON NE CRÉE PAS UN TYPE POUR REDIRE CE QUE LE RENDU CALCULE.
- ⚠️ Les 71 notes que la manchette ne prend pas relèvent ensuite de la lecture, non du vocabulaire.
- ⛔ ET UN RÔLE NE DIT JAMAIS UNE DISPOSITION.
- ⚠️ CHANTIER OUVERT — `rendering` EST UN AXE SANS VOCABULAIRE.
- ⛔ Rien ne se ferme tant qu'elles ne sont pas démêlées : une contrainte posée trop tôt ferait échouer les imports au lieu de les corriger.
- ⛔ LE CONTRÔLE EXISTE, ET IL LIT LE VOCABULAIRE DANS LE CODE
- ⚠️ Il ne recopie aucune liste : il lit `app/lib/typeNote.ts` et `app/lib/apparatCritique.ts`, et refuse de deviner s'il ne les comprend pas.

**§ 13.13 — L’ENCART d’une note — un seul, pour toutes les surfaces**

- ⛔ Une note s’ouvre partout dans le MÊME encart.
- ⛔ Et cette hauteur se compte en REM, jamais en pixels.
- ⛔ L’INTITULÉ PUBLIC NOMME LA RESPONSABILITÉ ÉDITORIALE, JAMAIS LA FONCTION INTELLECTUELLE.
- ⚠️ Ce qui identifie la note ne disparaît pas pour autant : le NUMÉRO reste — dans la face du numéro de verset de la page Bible.
- ⛔ Le numéro affiché est celui du LECTEUR, jamais le numéro interne : celui-ci porte l’identité et l’ordre, non l’adresse que le lecteur vient de cliquer.
- ⛔ MAIS IL SE FERRE À GAUCHE, et le fer à droite est ici une règle mal transposée (décision de l’auteur, 2026-09-08 : « supprime l’alinéa avant le numéro de note »).
- ⚠️ Règle générale : **un fer à droite ne se justifie que par une COLONNE de repères ; seul, il fait un alinéa.**
- ⛔ UNE NOTE SE JUSTIFIE AU-DESSUS DU SEUIL DU GRIS, ET SE FERRE SOUS LUI (décision du 8 septembre 2026, « j’aimerais qu’elles soient justifiées » ; resserrée le 10, capture à l’appui).
- ⚠️ Le seuil est celui de la charte (§ 3.11), deux cent cinquante signes servis, et il vaut ici comme ailleurs — une note de quarante signes n’a pas de gris à tenir, et la justifier étirait sa première ligne d’un bord à l’autre pour laisser un mot seul sur la seconde.
- ⛔ Ce n’est pas un cas d’exception mais le cas ORDINAIRE : la médiane du corpus fait dix-sept signes, et 92,6 % des notes tiennent sous cent vingt.
- ⚠️ La CÉSURE, elle, reste dans les DEUX cas — elle n’est pas une option qui accompagne la justification, c’est la condition de toute mesure étroite, et au fer une piste de trente signes coupe aussi bien les mots longs.
- ⚠️ Et la DERNIÈRE ligne d’un texte justifié revient au fer à gauche, faute de quoi trois mots s’étirent d’un bord à l’autre — les déclarations redites sur le paragraphe écrasaient précisément cette règle-là.
- ⚠️ Ce que la justification ne peut pas rattraper est une langue que le navigateur ne sait pas couper
- ⚠️ L’APPARAT CRITIQUE SUIT LE MÊME MODÈLE, UN CRAN SOUS LA NOTE (même décision).
- ⛔ Sa seule dissidence est la CÉSURE, qu’il refuse — couper un sigle ou une leçon donnerait à lire ce que l’éditeur n’a pas écrit.
- ⚠️ Corollaire, appris le même jour : une garde qui RECOPIE le corps et l’interligne au lieu de les lire au module échoue au premier changement, et c’est le défaut même que le module réunit pour empêcher.
- ⛔ LA TÊTE : le numéro rejoint le type, et ils n’ont qu’un seul fer (relevé de l’auteur, 10 septembre 2026, capture à l’appui : « revois les alignements, notamment du numéro de note et du type de note »).
- ⛔ Un flottant n’a rien à habiller quand une ligne entière lui est prise — dès que la note déclare un type, le numéro cesse de flotter et entre dans la tête.
- ⚠️ Celle-ci tient sur UNE ligne : un type plus long que la piste s’écrête plutôt que d’ouvrir un second rang au-dessus du propos.
- ⛔ ET LE NUMÉRO SEUL EMPRUNTE LE STRUT DU PROPOS, il ne se contente pas d’en prendre la HAUTEUR.
- ⚠️ C’est la leçon de la marge de référence de la Polyglotte (§ 38.14), prise par l’autre bout ; et la correction ne s’écrit pas plus en pixels ici que là-bas.
- ⛔ LA PLACE DE LA CROIX NE SE PAIE PAS SUR TOUTE LA HAUTEUR.
- ⚠️ Elle reste réservée TOUJOURS, croix montrée ou non : la géométrie ne bouge pas entre le survol et le clic, et cette règle-là ne cède pas.
- ⛔ LA CONDENSATION SE MESURE, ET SUR LA BOÎTE ENTIÈRE (« condense le texte selon mes recommandations »).
- ⚠️ Ce n’est pas le corps du texte qui a maigri — il ne bouge plus depuis le 8 septembre — c’est le BLANC qui rendait la boîte lourde.
- ⛔ LA HAUTEUR SE DEMANDE UNE FOIS LA LARGEUR CONNUE.
- ⚠️ On ne peut pas passer au placeur une hauteur toute faite : c’est LUI qui décide de la largeur, et il reçoit donc une fonction.
- ⚠️ Sans largeur, la mesure pleine — c’est le cas de l’encart posé sous son appel, où rien ne le resserre.
- ⛔ La croix ne paraît que sur un encart PERSISTANT.
- ⛔ Un encart de survol ne se fige pas non plus tout seul au bout d’un délai : il se ferme quand la main s’en va, et un encart persistant se demande d’un clic.
- ⚠️ L’appel se MARQUE tant que sa note est ouverte — de la surbrillance du segment actif de la lecture : c’est le second lien entre l’appel et sa note, celui qu’on suit des yeux en revenant au texte.
- ⛔ Une seconde grammaire pour le même office serait une grammaire de trop.
- ⛔ Au DOIGT, l’encart s’ouvre AU-DESSUS de son appel.

**§ 13.14 — LA MANCHETTE — un renvoi se lit dans la marge, il ne s’ouvre pas**

- ⚠️ Ce ne sont donc pas deux modes d’ouverture : il n’y en a toujours qu’un, et à côté une chose qu’on ne clique pas.
- ⚠️ Le corpus se partage en deux presque exactement
- ⛔ L’unanimité décide, comme pour le type d’une note.
- ⛔ La manchette ne dit jamais MOINS que la note.
- ⚠️ Le renvoi se pose à hauteur de sa ligne, et rien ne le calcule — sa position est celle du texte où l’appel se tenait.
- ⛔ Ce qui se calcule est le seul cas où deux renvois se heurtent, et c’est alors CELUI DU DESSOUS qui cède : un renvoi remonté au-dessus de son appel annoncerait un passage qu’on n’a pas encore lu. Mesuré : 1 618 couples de renvois voisins dans un même segment, écart médian 1,46 ligne, 366 couples qui se heurtent — environ 3 % des renvois.
- ⛔ Un renvoi en marge n’est pas un ornement — et le seuil de contraste de 4,5 s’applique : il est le SEUL porteur de sa coordonnée, et c’est lui qu’on vient chercher au bord de la ligne.
- ⚠️ Faute de place, le renvoi reprend son appel et son encart.

**§ 13.15 — L’encart NE COUVRE PAS le texte, et le numéro flotte**

- ⛔ UNE NOTE S’OUVRE DANS LA MARGE, jamais par-dessus la colonne.
- ⚠️ Elle se pose À HAUTEUR de son appel, non dessous : c’est ce qui la rattache à la ligne d’où elle vient, et elle ne descend que si le bas de l’écran l’y oblige.
- ⛔ LA DROITE L’EMPORTE DÈS QU’ELLE PORTE LA LARGEUR PLANCHER — et la gauche ne sert que faute de mieux : la marge de gauche porte la manchette des renvois, et l’encart la couvrirait.
- ⚠️ La règle d’avant prenait le côté le plus large, ce qui suffisait tant que la marge se comptait jusqu’au bord de la fenêtre et restait presque symétrique.
- ⛔ L’ENCART S’ARRÊTE AU VOLET : la marge se compte jusqu’au bord du BLOC DE LECTURE, non jusqu’au bord de la fenêtre.
- ⚠️ La règle inverse a valu quelques heures le 8 septembre 2026, et l’auteur l’a renversée le soir même.
- ⛔ Le prix en est lourd, et il faut le connaître : les deux volets OUVERTS, la lecture d’une œuvre ne laisse plus que six rem de marge sur un portable et quinze sur un écran de 1920, quand une note en demande seize.
- ⛔ LE PLANCHER EST UN PLANCHER DE LISIBILITÉ, ET IL SE MESURE SUR LA LONGUEUR RÉELLE DES NOTES (décision de l’auteur, 10 septembre 2026 : « le minimum de marge doit être plus souple ; j’aimerais qu’on puisse avoir des notes en marge, sur grand écran, même en mode latin-français »).
- ⚠️ Ce qui manquait à ce raisonnement est une mesure du CORPUS — sur les 24 302 notes du site, la médiane fait dix-sept signes, le troisième quartile quarante, et 92,6 % tiennent sous cent vingt.
- ⛔ ET LE CHIFFRE RETENU EST LE PLUS PETIT QUI RÉPONDE À LA DEMANDE, non le plus généreux.
- ⚠️ Le prix de seize rem se chiffre : sur la note la plus longue qu’on ait éprouvée, la piste de texte passe de trente-neuf à trente-deux signes par ligne.
- ⚠️ Quatorze rem a été éprouvé et refusé, à l’œil comme à la mesure : la justification s’y creuse de lézardes visibles.
- ⚠️ Une largeur plancher se juge donc sur DEUX mesures, jamais sur une intuition — ce que la place offre, écran par écran, et ce que le contenu réel demande.
- ⛔ Elle SE RESSERRE plutôt que de renoncer — et la place qui lui reste se MESURE, elle ne se suppose pas.
- ⚠️ À seize rem de plancher, la marge sert donc à l’œuvre dès 2200, à la page Bible dès 2400 et à la lecture en regard dès 2560 ; à vingt, il fallait 2560, 2880 et 2880.
- ⛔ Ce n’est pas la largeur qui suit le CONTENU, que le § 13.13 proscrit : elle suit la PLACE, elle est la même pour toutes les notes d’une même page, et elle ne change que si le lecteur touche à un volet lui-même.
- ⛔ Sous une largeur plancher, l’encart repasse SOUS son appel — comme avant : une note ne se lit plus dans une colonne trop étroite, et mieux vaut couvrir le texte que sortir de l’écran.
- ⛔ LE NUMÉRO FLOTTE QUAND IL EST SEUL, il n’occupe pas une colonne.
- ⚠️ Il ne flotte QUE seul — ce qui est le cas de trois notes sur cinq : dès que la note déclare un type, il entre dans la tête à côté de lui (§ 13.13), un flottant n’ayant rien à habiller quand une ligne entière lui est prise.
- ⛔ UN RENVOI EN MARGE SE POSE SUR LA LIGNE DE BASE DE SA LIGNE — et cet accord se MESURE.
- ⚠️ La correction ne s’écrit pas en pixels : les deux corps sont en rem, la police racine du site est fluide, et un nombre ne serait juste qu’à une seule taille d’écran.

**§ 13.16 — Politique générale de reprise des notes — norme du 9 septembre 2026**

- ⛔ FIDÉLITÉ AVANT TOUT, MAIS LA NOTE N’EST PAS LE CORPS DU TEXTE.

**§ 13.16.1 — Autorité, provenance, responsabilité et fonction**

- ⛔ RESPONSABILITÉ, FONCTION, PROVENANCE, NATURE DE BLOC ET RENDU SONT DES AXES DISTINCTS.
- ⚠️ UN TYPE FAUX EST PIRE QU’UN TYPE ABSENT, MAIS UNE RÉVISION NE SE FERME PAS SUR DES NOTES NON TYPÉES.
- ⛔ LE TYPE FONCTIONNEL APPARTIENT À LA NOTE LOGIQUE.

**§ 13.16.2 — Appels, ancres et ponctuation**

- ⛔ L’APPEL DE NOTE SE PLACE TOUJOURS AVANT LA PONCTUATION. IL N’Y A PAS D’EXCEPTION.

**§ 13.16.3 — Orthographe et typographie de chaque note**

- ⛔ CHAQUE NOTE SUBIT UN CONTRÔLE ORTHOGRAPHIQUE ET TYPOGRAPHIQUE INTÉGRAL.
- ⛔ UNE COUPURE ÉDITORIALE DANS UNE CITATION SE MARQUE `[…]`.
- ⛔ AUCUN TEXTE ÉDITORIAL D’UNE NOTE NE SE COMPOSE ENTRE PARENTHÈSES.
- ⛔ une reprise brève du texte français commenté, lorsqu’elle reste en prose, se compose en romain entre guillemets français `« … »` ; l’italique ne signale jamais à lui seul la citation ;\n-
- ⛔ POSITION DE LA RÉFÉRENCE ET DISTINCTION ENTRE LEMME ET CITATION DOCUMENTAIRE.
- ⛔ On ne fusionne jamais une référence externe et le lemme sous la forme `Référence : « lemme »`, qui ferait croire que l’auteur référencé prononce le texte commenté.
- ⛔ PETITES CAPITALES DANS LES RÉFÉRENCES.
- ⛔ RÈGLE ABSOLUE DE STYLE DES CITATIONS.
- ⛔ GROUPE CITATIONNEL ORIGINAL + TRADUCTION.
- ⛔ tout mot, syntagme ou courte expression en latin enchâssé dans une phrase française **doit** être en italiques ; les caractères grecs en alphabet grec restent en romain ; les translittérations du grec en alphabet latin sont en italiques ;

**§ 13.16.4 — Abréviations : développer par défaut**

- ⛔ LES ABRÉVIATIONS SAVANTES HÉRITÉES DE L’ÉDITION SE DÉPLOIENT.

**§ 13.16.5 — Références bibliques, patristiques et bibliographiques**

- ⛔ Dans une note, une référence biblique autonome n’est jamais entourée de parenthèses : écrire `Rm 8, 28.`, non `(Rm 8, 28).`.
- ⛔ Toute œuvre patristique ou non rencontrée dans une note est recherchée dans la bibliographie globale.

**§ 13.16.6 — Fidélité au témoin, corrections, réserves et `[sic]`**

- ⛔ TOUT CE QUI PEUT CHANGER L’INFORMATION SE CONTRÔLE SUR LA SOURCE.

**§ 13.16.8 — Transformation des notes trop techniques**

- ⚠️ UNE NOTE PEUT ÊTRE RADICALEMENT RECOMPOSÉE POUR ÊTRE LISIBLE.

**§ 13.16.10 — Procédure obligatoire — onze passes globales sur l’œuvre entière**

- ⛔ LA REPRISE GÉNÉRALE DES NOTES SE FAIT DANS CET ORDRE.
- ⛔ UNE PASSE PORTE TOUJOURS SUR L’ŒUVRE ENTIÈRE.
- ⛔ Aucune passe `P(X+1)` ne s’ouvre tant que toutes les sous-passes `PX-n` nécessaires n’ont pas été achevées et que `PX` n’a pas été close globalement.
- ⛔ Dès que `metadata.editorial_role` est établi, toute mention textuelle qui redouble ou contredit ce rôle est retirée du corps de la note.
- ⛔ La passe se ferme seulement avec 100 % des notes couvertes et 0 type principal hors vocabulaire ; toute réserve résiduelle est explicitement comptée et nommée.
- ⛔ Les artifices matériels de l’imprimé ne restent pas mêlés à la prose : lettre d’appel, pagination de la note et coordonnée source du type « (A) p. 2. — » sont conservées dans `source_label`, `printed_page`, l’ancre ou les métadonnées de provenance.
- ⛔ UN SIGLE DE TÉMOIN DÉFINI DANS « INFORMATIONS COMPLÉMENTAIRES » RESTE UN SIGLE DANS LES NOTES DE L’ÉDITION.
- ⚠️ Cette concision suppose une clé publique, non ambiguë et propre à la version active : un sigle non défini est explicité ou la rubrique est complétée avant publication, et la convention d’une autre édition n’est jamais importée par repli.
- ⛔ Un homographe n’est jamais traité mécaniquement : `1 P 2, 13` est une référence à la Première épître de Pierre, non au témoin parisien.
- ⛔ Dans la couche normalisée d’une note, aucun texte éditorial n’est conservé entre parenthèses.
- ⛔ Une référence nue n’est jamais une citation : `Rm 8, 28.` ou tout autre bloc qui ne contient qu’une coordonnée scripturaire ne reçoit aucun guillemet ajouté, ni dans la donnée ni au rendu.
- ⛔ Lorsqu’une note cite une édition identifiable et que sa notice structurée fournit les données éditoriales, la référence visible est complète : auteur, titre exact, responsabilité éditoriale ou traduction pertinente, lieu, éditeur, collection et numéro lorsqu’ils sont connus, date, puis locator.
- ⛔ Une référence biblique autonome n’est jamais parenthésée dans une note ; la forme normalisée est `Rm 8, 28.`, non `(Rm 8, 28).`.
- ⛔ il n’est jamais saisi à la main dans le texte.
- ⛔ Le contre-audit de clôture vérifie en outre : zéro libellé de type encore écrit dans le corps lorsqu’un `editorial_role` le porte ; zéro coordonnée matérielle source laissée en prose lorsqu’elle est déjà conservée dans les champs structurés et n’a pas d’utilité publique ; zéro œuvre nommée sans relation `texte_note_bloc_ouvrages` lorsqu’elle est identifiable ; zéro jeton manuel `[Éditions]` ; zéro bloc de référence…
- ⛔ Le modèle fusionné `Référence : « lemme »` est interdit.
- ⛔ COMPTE RENDU OBLIGATOIRE APRÈS CHAQUE PASSE GLOBALE.
- ⛔ LA PRUDENCE FINALE EST ASYMÉTRIQUE  — typographie, déploiement et référencement peuvent être fortement normalisés ; contenu, autorité, attribution et information philologique ne se modifient qu’avec preuve.

## § 14. OCR, HTR et transcription patrimoniale

**§ 14 — OCR, HTR et transcription patrimoniale**

- ⛔ Un moteur d’OCR ou de HTR produit un brouillon. Il ne produit jamais, à lui seul, un texte éditorial validé.

**§ 14.1 — Niveaux de texte et statuts**

- ⛔ Les mots `transcrit`, `relu`, `validé` et `importé` ne sont pas synonymes. L’état de validation consigne le niveau réellement atteint (§ 52) ; le lecteur, lui, ne voit que ce qui est publié.
- ⛔ Un lot non relu reste « terminé » ou « en cours », jamais « validé », même si son XML est valide et si les tests techniques réussissent.

**§ 14.2 — Autorité de la source et traçabilité**

- ⛔ Le fac-similé demeure l’autorité. Une couche texte, un OCR, une HTR, une édition moderne, une traduction parallèle ou le contexte attendu ne peuvent le remplacer.
- ⛔ sans être projetée comme pagination structurelle dans les segments — pour un manuscrit, feuillet, face, colonne et ligne restent les localisateurs matériels.
- ⛔ Les identifiants suivent l’ordre matériel et ne sont jamais recréés pour satisfaire un comptage attendu.
- ⛔ Ne jamais inventer une zone, une ligne ou une coordonnée absente. Une colonne vide ou partielle reste vide ou partielle.

**§ 14.3 — Imprimés et éditions non médiévales**

- ⛔ Extraire le texte page par page. Comparer toute couche texte du PDF avec l’image.
- ⛔ Une erreur d’OCR est corrigée contre le fac-similé : le texte éditorial reprend ce qui est réellement imprimé.
- ⛔ La note distingue toujours la leçon imprimée de la correction retenue.
- ⛔ Réunir un mot coupé typographiquement en fin de ligne ou de page. Conserver un trait d’union lexical réel.
- ⛔ sans moderniser l’orthographe, les désinences, le vocabulaire ou la syntaxe.
- ⛔ Cette règle d’émendation des éditions imprimées ne transforme pas une transcription diplomatique médiévale en édition corrigée.

**§ 14.4 — Manuscrits et HTR**

- ⛔ Chaque ligne destinée au corpus doit être confrontée visuellement au manuscrit.
- ⛔ Ne jamais corriger un passage parce qu’une autre Bible, une édition critique, la grammaire ou le sens attendu proposent une forme plus vraisemblable. Ces sources peuvent signaler une difficulté ; elles ne décident pas de la lecture.

**§ 14.5 — Encodage des difficultés**

- ⛔ Une lecture indécidable reste incertaine.
- ⛔ sans les détourner pour rendre le texte plus lisible.
- ⛔ `unclear` porte sur une difficulté réelle de lecture, non sur une simple absence de relecture.
- ⛔ Une suite manifestement fautive ne devient pas acceptable parce qu’elle est placée dans `unclear` — décrire au moins les lettres certaines et réexaminer la ligne.
- ⛔ Les comptages globaux ne doivent jamais conduire à ajouter ou retirer artificiellement une coupure.

**§ 14.6 — Couches diplomatique, développée et modernisée**

- ⛔ Elle ne corrige ni l’orthographe, ni la syntaxe, ni le vocabulaire.
- ⛔ Il est interdit de fabriquer une graphie modernisée par simple concaténation des lignes développées.
- ⛔ Une couche modernisée partielle, hétérogène, non synchronisée ou identique au texte développé reçoit un statut provisoire et n’est pas affichée publiquement.
- ⛔ Toute correction de la transcription source doit pouvoir être propagée ou détectée par un test de synchronisation.

**§ 14.7 — Lots, premières passes et relectures**

- ⛔ Une première passe assistée n’équivaut pas à une relecture.
- ⛔ Si les sondages découvrent plusieurs erreurs certaines dans des colonnes différentes, le contrôle ciblé est insuffisant — reprendre une passe visuelle sur l’ensemble du lot, en corrigeant le brouillon existant sans le ressaisir inutilement.
- ⚠️ Un nombre élevé de lignes déclaré relu dans un temps matériellement invraisemblable constitue un signal d’alerte, non une preuve de qualité.
- ⛔ Les mentions telles que `direct_visual_review` ne sont inscrites que lorsqu’une comparaison visuelle a réellement eu lieu.

**§ 14.8 — Contrôles éditoriaux**

- ⛔ Les contrôles automatiques prouvent la cohérence du fichier, non l’exactitude paléographique. Un faux déchiffrement parfaitement encodé peut réussir XML, Relax NG, les tests et le build.
- ⚠️ Les preuves visuelles sont réservées aux cas difficiles, contestables ou structurants.

**§ 14.9 — Versions, candidats et import**

- ⛔ Le candidat reste séparé du TEI actif jusqu’à validation.
- ⛔ Cette nouvelle empreinte doit être certifiée par un diff montrant qu’aucun texte n’a changé. On ne restaure jamais automatiquement un ancien fichier sur la seule base d’une différence d’empreinte.

**§ 14.10 — Comptages et avancement**

- ⛔ Un champ nommé `folios` ne doit pas contenir un nombre de faces.
- ⛔ Les pourcentages d’avancement précisent leur dénominateur et leur statut — matériellement transcrit, relu ou intégré dans le corpus actif.
- ⛔ Ne pas confondre les occurrences diplomatiques avec celles de l’ensemble du XML.

**§ 14.11 — Paquets de contrôle et archives**

- ⛔ Le paquet léger ne remplace pas l’archive complète.
- ⛔ Tous les fichiers annoncés dans un manifeste ou un index de preuves doivent être présents. Supprimer les références mortes plutôt que prétendre fournir des images absentes.

**§ 14.12 — Nettoyage**

- ⛔ Nettoyer seulement après vérification de l’archive finale et réussite de l’import.
- ⛔ Ne supprimer aucun fichier ambigu. Consigner les suppressions importantes.

**§ 14.13 — Césures de mots entre unités source**

- ⛔ Une césure typographique/OCR située à la frontière de deux unités source ne doit jamais être absorbée artificiellement par une seule unité de lecture.
- ⛔ Le trait de césure de fin de ligne/page est un signe matériel du témoin : il n’entre pas dans le mot normalisé.
- ⛔ ne jamais reconstruire un mot à partir d’une seule unité si le second fragment appartient à la suivante.

**§ 14.14 — Transposition de lignes OCR et provenance**

- ⛔ Lorsqu'une unité source OCR porte des lignes ou des fragments matériellement TRANSPOSÉS, on ne fabrique NI offsets continus contre cet ordre corrompu, NI offsets discontinus pour l'épouser, et l'on ne force aucun alignement sur le texte éditorial.
- ⛔ L'ordre des gestes ne s'inverse pas — revenir au fac-similé, corriger d'abord l'unité source dans l'ordre attesté, documenter la correction, puis SEULEMENT recalculer les offsets des segments.
- ⚠️ Une transcription secondaire peut corroborer l'ordre attendu ; elle ne remplace pas le fac-similé — lorsqu'il faut réécrire la couche source.
- ⚠️ Et **le texte de lecture n'est pas réécrit** s'il était déjà conforme au fac-similé : c'est la couche SOURCE qui est en défaut, non lui.

## § 15. Corpus biblique et traductions

**§ 15.4 — Matière surnuméraire, gloses et autres additions propres à un témoin**

- ⛔ UNE GLOSE SE COMPOSE EN ITALIQUE, UN POINT SOUS LE TEXTE QU’ELLE ACCOMPAGNE (décision de l’auteur, 11 septembre 2026 : « pour les gloses, en règle générale, il faudra adopter l’ital et réduire de 1 point le corps du texte »).
- ⚠️ Deux corps, parce qu’une glose suit la colonne où elle tombe : en ancien français, elle se compose comme l’ancien français.
- ⛔ EN REGARD, LA GLOSE DU TÉMOIN FAIT FACE À SA TRADUCTION.
- ⚠️ Une rangée de glose n’est pas un verset : elle ne se sélectionne pas pour ouvrir l’apparat patristique, qui se charge sur un créneau canonique.
- ⛔ UNE GLOSE SANS VIS-À-VIS PREND LA LARGEUR DES DEUX COLONNES (décision de l’auteur, même jour : « la glose peut occuper tout l’espace central puisqu’aucun texte d’origine n’est proposé »).
- ⚠️ La vue est dans `internal` : `anon` et `authenticated` n’ont pas `USAGE` sur ce schéma.
- ⛔ ne jamais ouvrir globalement `internal` au public pour permettre le rendu.
- ⛔ Ne jamais copier le texte du fragment dans cette table et ne jamais utiliser les mappings AELF pour représenter cet ordre matériel : ce sont deux axes différents.
- ⛔ Aucun fragment cible n’est créé automatiquement à partir d’une nouvelle coupure source : il faut une revue structurelle explicite.

**§ 15.5 — Une table, deux natures — `traductions.est_biblique`**

- ⛔ Rien ne les distinguait, et les secondes paraissaient dans les sélecteurs de traduction biblique — jusque dans le menu de la page d’une œuvre patristique, qui offrait de lire ses citations bibliques dans la traduction même dont elle affiche le texte.
- ⚠️ Deux discriminants en tenaient lieu, et aucun ne disait ce QU’EST la ligne.
- ⛔ Et `type_objet` ne répond pas davantage : il dit la nature philologique de l’objet — traduction, recension, édition critique —, non le corpus auquel il appartient.
- ⚠️ L’ADMINISTRATION suit la même règle que les pages publiques.
- ⛔ Et elles ne reçoivent que les boutons qui les concernent : l’édition et l’apparat, la modification, la suppression.
- ⛔ Cette colonne ne commande QUE la notice : une traduction éteinte reste offerte dans tous les sélecteurs de lecture, et son texte se lit comme avant.
- ⚠️ La rangée d’actions d’une ligne s’aligne par LARGEURS RÉSERVÉES, non par le hasard des libellés.

## § 16. Auteurs, œuvres et catalogue

**§ 16 — Auteurs, œuvres et catalogue**

- ⛔ Les identifiants sont stables et ne sont pas recyclés.
- ⛔ Supprimer une coquille vide ou une œuvre explicitement abandonnée exige de vérifier d’abord ses segments, liens, dépendances et statut de publication.
- ⛔ Le marqueur `[Corpus Scriptura:depublie]` dans `oeuvres.note` n’existe plus, ni la colonne `note` : un champ de prose qui portait un drapeau de contrôle faisait perdre la note éditoriale à chaque dépublication, et le site et la base jugeaient sur deux colonnes qui pouvaient se contredire.
- ⛔ La première date de mise en ligne reste attachée à l’édition en ligne et n’est pas réécrite lors d’une republication.
- ⛔ ils ne remplacent pas `acces_public`, qui seul décide de la visibilité de l’œuvre dans la bibliothèque.
- ⛔ Les chiffres affichés par le site sont calculés à partir de l’état courant de la base. Ils ne sont jamais consignés en dur dans la charte.

**§ 16.1 — Catalogue des traductions patristiques**

- ⛔ il est unique, stable, jamais recyclé.
- ⛔ Un même `id_traduction` ne peut appartenir qu’à une seule notice active — c’est-à-dire non refusée administrativement.
- ⛔ Un volume sans traduction autonome ne conserve pas d’`id_traduction` propre — il est relié à la notice canonique comme composante ou comme notice regroupée.

**§ 16.2 — Statuts contrôlés et notes**

- ⛔ Une phrase libre ne doit jamais être inscrite dans une colonne de code. Un cas incertain reçoit `A_CONTROLER` ou `NON_DETERMINE` ; il n’est pas classé par intuition.
- ⛔ Les contrôles négatifs de recherche ne sont pas des notices publiques — ils sont conservés dans `internal.catalogue_controles_negatifs`.

**§ 16.2.1 — Niveaux de vérification**

- ⛔ `verification_code` indique le niveau le plus élevé effectivement atteint, non une impression générale de fiabilité
- ⛔ La présence d’une URL ne suffit jamais à promouvoir une notice. Toute promotion à `TEXTE_VERIFIE` exige une note indiquant ce qui a été contrôlé et par rapport à quelle édition.
- ⛔ sans créer ni conserver une pseudo-notice négative dans `catalogue_notices`.

**§ 16.2.2 — Date d’édition**

- ⛔ La date d’une édition latine, grecque, syriaque, anglaise ou d’une page web de republication ne doit jamais combler la date manquante d’une traduction française.
- ⛔ Lorsqu’une date est établie, le statut et les champs de date sont mis à jour dans la même opération.
- ⛔ elles ne constituent plus la source normative d’un statut et ne doivent pas servir aux filtres.

**§ 16.3 — Notices remplacées, composantes et regroupements**

- ⛔ Une notice obsolète n’est pas supprimée.
- ⛔ Les deux champs sont soit remplis ensemble, soit laissés vides ensemble.
- ⛔ Avant toute relation, vérifier que la cible existe, n’est pas refusée et ne pointe pas à son tour vers la notice source.

**§ 16.4 — Workflow des notices**

- ⛔ `workflow_status_code` est calculé, non saisi — `REFUSE_ADMIN`, `PUBLIE`, `VALIDE_ADMIN`, `VERIFIE` ou `A_VERIFIER`.
- ⛔ Une notice ne peut être à la fois validée et refusée. Toute décision administrative suppose un contrôle préalable. Les quatre indicateurs sont toujours renseignés, jamais nuls.

**§ 16.5 — Protocole de modification du catalogue**

- ⛔ Toute passe sur `catalogue_notices` suit une méthode non destructive
- ⛔ Une règle générale découverte au cours d’un audit est ajoutée immédiatement à la présente charte. Les listes de lignes corrigées, volumes traités et comptages provisoires restent dans le rapport de passe, non dans la charte.

**§ 16.6 — Éditeur et lieu d’édition**

- ⛔ Une valeur de travail telle que `À établir`, `à identifier`, `Divers`, `Non établi`, `RTF / catalogues français` ou une mention entre crochets ne constitue jamais un éditeur renseigné.
- ⛔ Une ville ne se déduit ni du siège actuel d’une maison, ni de l’hébergeur d’une transcription, ni d’une édition différente.
- ⛔ Toute correction du nom d’éditeur ou du lieu met à jour simultanément le champ, son statut et sa note.
- ⛔ on ne déduit jamais un nom historique du nom actuel d’une maison.
- ⛔ Une propagation automatique n’est admise que lorsque la correspondance entre variante et autorité est unique et contrôlée.

**§ 16.7 — Traducteurs et formes d’autorité**

- ⛔ Les mentions de direction, édition, introduction, révision, annotation ou mise en ligne ne sont pas intégrées à ce champ.
- ⛔ une liste de noms séparés par ` ; `, et rien d’autre. Ni « et », ni virgule, ni esperluette, aucune formule ajoutée.
- ⛔ Le site ne recopie jamais ce champ tel quel — il en fait la phrase de la page de titre (« Traduction par A et B ») et le fragment bibliographique d’une citation (« trad. A et B »).
- ⚠️ Un point-virgule visible à l’écran signale donc un défaut d’affichage, jamais un défaut de saisie.
- ⛔ UNE MENTION DE RÉGIME N’EST PAS UN NOM — et ne se compose pas comme tel.
- ⚠️ La donnée, elle, reste INTACTE en base : c’est l’affichage qui rédige, et la règle vit dans `app/lib/traducteurs.ts` avec le reste des mentions de responsabilité.
- ⛔ `ANONYME`, `NON_ETABLI` et `SANS_OBJET` sont des statuts, jamais des noms d’autorité.
- ⛔ Les titres tels que `M.`, `P.`, `abbé` ou `dom` ne sont supprimés que si le nom complet est établi — une identité partielle comme `Abbé Burleraux` reste telle quelle jusqu’à identification plus précise.
- ⛔ Lorsqu’une notice mêle traducteur, éditeur scientifique, réviseur ou collaborateur et que la répartition n’est pas certaine, elle reste `A_CONTROLER`.

**§ 16.8 — Auteurs et formes d’autorité**

- ⛔ Une forme d’autorité n’est jamais saisie librement dans le catalogue — tout nouvel auteur ou corpus est d’abord créé ou corrigé dans `auteurs`, puis propagé par identifiant.
- ⛔ Les apostrophes des formes d’autorité sont typographiques. Une divergence entre `auteur_uniformise` et `auteurs.nom` est une anomalie.
- ⛔ Un pseudo-auteur n’est pas rabattu sur l’auteur ancien auquel le texte fut attribué. Un corpus collectif n’est pas transformé en personne.

**§ 16.9 — Sources des notices**

- ⛔ Une plateforme de consultation ne doit pas être présentée comme l’éditeur de la traduction.
- ⛔ Les pages commerciales, reproductions secondaires et transcriptions non attribuées peuvent compléter une source patrimoniale, jamais s’y substituer silencieusement.
- ⛔ Toute nouvelle source met à jour simultanément l’URL, le statut et `source_note`.

**§ 16.10 — Statut juridique des traductions**

- ⛔ `statut_juridique_code` qualifie la traduction française et non l’œuvre ancienne elle-même.
- ⛔ Une date d’édition ancienne ne suffit pas à elle seule lorsque le traducteur est nommé. Une édition étrangère ou latine ne détermine pas les droits d’une traduction française.
- ⛔ En cas d’identité incertaine, d’attribution disputée ou de responsabilité non répartie, conserver `A_CONTROLER` plutôt que présumer la liberté.
- ⚠️ le champ historique `domaine_public` peut être conservé pour mémoire, mais il n’est plus normatif.

**§ 16.11 — Une œuvre à plusieurs auteurs**

- ⛔ Les noms EMPILÉS ne prennent pas de conjonction (décision de l’auteur, 9 septembre 2026 : « le “et” entre les deux noms d’auteur est immonde ; s’en passer »).
- ⚠️ `separateurAuteurs` ne sert que le premier régime : l’appeler dans une colonne de blocs, c’est y remettre le « et ».
- ⛔ Le rang ne règle QUE l'ordre d'affichage, il n'ordonne pas les responsabilités.
- ⛔ c'est elle, et elle seule, qu'on interroge pour « les auteurs d'une œuvre » comme pour « les œuvres d'un auteur ».
- ⛔ Un même auteur ne peut pas figurer deux fois sur une œuvre.

**§ 16.12 — Langue et traditions : l’étiquette et le détail**

- ⚠️ Nommée dans une phrase (« Texte original latin »), elle garde son bas de casse.
- ⛔ celle qu’aucune famille ne reconnaît reste sur la fiche mais ne paraît pas dans le filtre — mieux vaut une pastille de moins qu’une pastille fausse.

## § 17. Écritures, droits et sécurité

**§ 17.1 — Le verrou de bêta ne protège que les pages**

- ⛔ Tant que le site est fermé, le rôle `anon` n'a AUCUN droit dans le schéma `public` — ni `select` sur une table, une vue ou une vue matérialisée, ni `execute` sur une fonction.
- ⛔ Une fonction `SECURITY DEFINER` contourne la RLS par définition.
- ⛔ `PUBLIC` n'est pas `anon`, et `revoke … from anon` ne l'entame pas.
- ⚠️ Un 404 de PostgREST ne prouve pas une fermeture.

**§ 17.2 — Les sauvegardes de travail vivent dans `internal`, et se purgent**

- ⛔ Une sauvegarde prise avant une écriture (§1.4) vit dans le schéma `internal`, jamais dans `public`.
- ⛔ Ces tables se purgent à quinze jours, et c'est la BASE qui le fait.
- ⚠️ Une règle de rétention qu'il faut penser à lancer n'est pas une règle, c'est une corvée — et une corvée s'oublie.

## § 18. Interface de lecture

**§ 18 — Interface de lecture**

- ⛔ Le fond d’un ENCART n’est pas un fond NU, et le jeton de l’un ne sert pas l’autre.
- ⚠️ Un fond qui porte seul le sens prend donc un jeton à lui — dans la même famille mais à sa propre dose — ainsi `--cs-absence-fond`, la colonne d’une bible qui ne porte pas le mot cherché dans les résultats de recherche.
- ⛔ Et la dose se RELIT dans chaque thème au lieu de se recopier — un tiers d’aplat qui fonce un crème en terre cuite ne fait qu’un brun de plus sur un sol sombre, où il en faut près de la moitié pour obtenir une brique.
- ⛔ Un « Chargement… » écrit ailleurs qu’avec ces pièces rouvre la dérive.
- ⚠️ Les mentions de cellule de la Polyglotte (« Chargement… » à la place d’un verset qui arrive) ne sont pas une attente mais la voix de l’éditeur, au même titre qu’« Absent de cette traduction » : elles gardent leur forme.
- ⚠️ La pastille n’introduit AUCUN marqueur de plus.
- ⛔ Deux formes ont précédé, et toutes deux CACHAIENT quelque chose.
- ⛔ Un axe binaire se donne en DEUX options, comme les autres.
- ⚠️ Les rubriques d’axe se composent en casse ORDINAIRE « Lecture », « Commentaires » — dans la suite des capitales refusées le même jour sur la barre d’onglets du volet.
- ⛔ Le volet est un CONTENEUR : ce qu’il porte se règle sur SA largeur, jamais sur celle de l’écran (décision de l’auteur, 28 août 2026 : « rends le volet de gauche responsive »).
- ⛔ La référence de l’édition s’efface sur un volet étroit.
- ⛔ L’aération d’un volet se mesure en rem, jamais en pixels fixes (décision de l’auteur, 31 août 2026 : « l’écartement et l’aération des colonnes doivent être proportionnés à la taille de l’écran »).
- ⚠️ Le remède tient en une seule écriture : chaque mesure est un `clamp` dont le plancher et le plafond sont en rem — donc suivent l’écran — et dont le terme du milieu est en `cqi` — donc suit la poignée.
- ⛔ Le plancher vaut exactement ce que le volet portait avant : une échelle se pose sans déplacer l’état existant, sinon ce n’est pas une échelle, c’est une refonte.
- ⛔ Un volet large en dit PLUS, et ce qu’il ajoute tient ENTIER (décision de l’auteur, 31 août 2026 : « j’aimerais avoir plus de texte biographique sur grand écran, et aucun sur petit écran »).
- ⛔ Rien ne se RETRANCHE en chemin : l’état de départ est celui du volet le plus étroit, et tout le reste s’y ajoute.
- ⛔ Un texte long paraît ENTIER ou pas du tout, et la carte n’en porte qu’un
- ⚠️ La règle est désormais une seule : la feuille accorde à la référence un BUDGET de lignes qui monte avec le volet (cinq dès deux cent soixante pixels, sept à trois cents, huit à trois cent cinquante), la carte compose la référence dans une sonde invisible à la largeur du volet et compte ses lignes, et la référence paraît ENTIÈRE si elle tient dans le budget, PAS DU TOUT sinon — jamais rognée par un `line-clamp`.
- ⚠️ Le budget plafonne à huit lignes, parce que la liste des livres vit dessous : élargir encore le volet ne rend rien de plus.
- ⛔ La notice du traducteur a quitté la carte le même jour : elle vit dans la fiche « En savoir plus », d’où elle venait, et la carte ne porte plus qu’un texte long.
- ⛔ Un volet de gauche NOMME ce qu’on lit, et ce nom EST le lien
- ⚠️ C’est la MÊME forme des deux côtés du site, et le même composant : le nom de l’auteur sur une page patristique, celui de la bible sur la page Bible.
- ⛔ L’étiquette est partie elle aussi (le même jour : « supprime le mot “Traduction” »).
- ⚠️ Le nom s’écrête donc par la FIN sur la largeur de la carte — « Traduction officielle liturgi… » —, et les soixante-six pixels que l’étiquette rendait se voient : le plus long des neuf noms tenait entier à quatre cents pixels de volet, il tient désormais à deux cent soixante.
- ⚠️ L’ordre des questions, et c’est ici la vraie leçon.
- ⛔ On avait donc resserré une ligne sans avoir demandé si elle devait exister, et la mesure fine était venue avant la question simple.
- ⛔ Rien ne paraît AU SURVOL d’un nom (décision de l’auteur, 31 août 2026 : « supprimer la fonction d’affichage, au survol du nom de l’auteur, d’une partie de la page auteur »).
- ⚠️ Une surface qui disparaît emporte ce qui la servait : l’écran de cadrage des portraits proposait un cadre « aperçu au survol », et un cadrage qui règle une surface inexistante ment autant qu’un cadre aux mauvaises mesures.
- ⚠️ Un libellé long s’écrit en DEUX formes, et l’on n’en montre qu’une.
- ⛔ On ne coupe pas un libellé en JavaScript : il faudrait le mesurer à chaque rendu, et la mesure se ferait après la peinture.
- ⚠️ La règle n’a plus d’exemple dans le site : le libellé qui l’appelait a cédé la place au nom de la bible, et un nom n’a pas de forme courte — il s’écrête.
- ⚠️ Une carte n’a pas à réserver la place de ce qu’elle ne montre pas.
- ⚠️ Un libellé ne redit pas le nom de son axe.
- ⛔ Les distinguer par la DURÉE mène à une impasse, dont les deux issues ont été essayées : *attendre avant de montrer* fait payer à la main sûre l’hésitation de l’autre — le menu tombe sous les doigts de qui vient de l’ouvrir, et il faut apprendre à s’arrêter pour s’en servir ; *montrer aussitôt et retirer ensuite* fait clignoter la barre à chaque traversée, ce qui est inutile et peu élégant.
- ⚠️ L’intention ne se lit pas dans la durée mais dans la VITESSE : une main qui file ne demande rien, une main qui se pose demande à voir — et la vitesse, elle, se connaît DÈS L’ENTRÉE, sans rien faire attendre.
- ⛔ Il n’y a plus de menu ouvert par accident à refermer, puisqu’il ne s’ouvre pas ; et rien n’attend celui qui vient le chercher, puisque la main s’immobilise et que le menu est déjà là.
- ⚠️ Le seuil sépare des GESTES et non des conforts, et c’est ainsi qu’il se règle : un balayage de barre court entre huit cents et trois mille pixels par seconde, quand une main qui vise un onglet passe sous trois cent cinquante quelques centièmes de seconde avant de s’arrêter.
- ⛔ Au clavier, le menu s’ouvre sur `:focus-visible` et non sur `:focus-within`, qui le gardait ouvert après un simple clic de souris sur l’onglet, lequel laisse le lien focalisé, le curseur parti depuis longtemps.
- ⛔ Et une seule mécanique : deux menus voisins gouvernés l’un par une règle `:hover` de la feuille de styles, l’autre par un état de composant, finissent toujours par diverger.
- ⛔ UNE RUBRIQUE PORTE LE MÊME NOM SUR LES DEUX ÉCRANS ; TOUT LE RESTE APPARTIENT À LA SURFACE QUI A LA PLACE DE LE LOGER (décision de l’auteur, 10 septembre 2026 : « aller plus loin prend trop de place ; se passer des explications »).
- ⚠️ CETTE RÈGLE A ÉTÉ ÉCRITE TROIS FOIS EN UN JOUR, et il faut savoir pourquoi.
- ⛔ Ce qui doit se retrouver partout est ce par quoi on DÉSIGNE la chose — son nom — non ce par quoi on l’EXPLIQUE.
- ⚠️ CE QUI SE PERD EST RÉEL, et l’arbitrage est assumé.
- ⛔ Une liste dont un quart des rangées est deux fois plus haute que les autres cesse d’être une liste.
- ⛔ UN PANNEAU DE NAVIGATION AU DOIGT EST UNE SEULE LISTE, ET IL N’A DONC QU’UNE FORME DE RANGÉE (relevé de l’auteur, 10 septembre 2026 : « sous sa forme réduite, la navbar principale est immonde ; il faut tout uniformiser ; retirer les logos ; unifier les polices, les formes »).
- ⚠️ Le corps retenu est le DOMINANT, jamais une moyenne — celui de la navigation, qui porte la plus grande part des rangées.
- ⛔ ET LES PICTOGRAMMES PARTENT TOUS, OU AUCUN.
- ⚠️ Ils restent sur le bureau, où le menu large leur donne la place et où l’auteur les a demandés.
- ⛔ UNE SECTION SE NOMME, ELLE NE S’ENCADRE PAS.
- ⚠️ Un interrupteur pose son MOT d’abord et sa bascule au fer à droite.
- ⛔ On réordonne le balisage, jamais par `order` : l’ordre du document est celui que lisent le clavier et la synthèse vocale.
- ⚠️ Une liste dont rien ne s’aligne se lit mal, et c’est la GLOSE qu’on reprend, non la boîte qu’on élargit.
- ⛔ Une phrase trop longue est une phrase à reprendre : la reprendre vaut mieux qu’un menu qui s’étire pour elle, et l’une des six passait de moitié la mesure de ses sœurs.
- ⛔ La borne BASSE d’un menu gouverne sa largeur, jamais la haute.
- ⚠️ Une glose qui s’enroule ne se corrige donc pas en relevant le maximum — essayé le 6 septembre 2026, la boîte n’a pas bougé d’un pixel, et il a fallu la mesurer sur le site pour le voir.
- ⚠️ Une mesure de menu se vérifie aux DEUX BOUTS de l’échelle typographique.
- ⚠️ Le nom d’une rubrique se lève d’un RANG, jamais d’une graisse.
- ⛔ Un pictogramme de menu se mesure en REM, jamais en pixels.
- ⚠️ Réglé sur la LIGNE de ce nom, il se cale sur elle de lui-même, et le décalage écrit à la main qui l’y posait n’a plus lieu d’être.
- ⛔ Et le pire cas est l’œuvre qui ne porte AUCUN lien biblique, la base n’ayant alors aucune raison de s’arrêter avant la dernière ligne : c’est pourquoi la même œuvre revenait dans chaque rafale de pannes.
- ⚠️ Une lecture qui n’est JAMAIS rapide ne l’est pas par accident.
- ⛔ Une lecture qui ne sert qu’à ORNER ne fait jamais tomber la page qu’elle décrit.
- ⚠️ Le prix de ce repli est qu’une lenteur ne s’y signale nulle part, et qu’on ne la trouve qu’en regardant le journal.
- ⛔ Une page de lecture ne tombe pas sur une couche SECONDAIRE, et elle DIT ce qui lui manque (décision de l’auteur, 5 septembre 2026 : « consolide le code pour que ça se produise le moins possible »).
- ⛔ Ce n’est pas un repli SILENCIEUX, et le paragraphe précédent garde sa raison : une page servie sans ses renvois n’est fausse que si elle se donne pour complète.
- ⚠️ Le chargement des liens LÈVE toujours ; c’est la page qui l’attrape et le déclare au lieu de tomber.
- ⚠️ Le journal de la base ne montrait rien : la panne n’était pas une requête en échec mais une donnée en transition, et seul le journal de l’hébergeur portait le repère de la panne avec sa cause.
- ⛔ Une ancre incomplète est donc laissée de côté et COMPTÉE, jamais levée (§ 13.6 : l’erreur est remontée, pas tue) ; et la projection des appels qui LÈVE reste la projection de contrôle des scripts et des tests, une page emploie celle qui ne faillit pas.
- ⚠️ Le second cas est de la même famille, et il a sa mesure.
- ⛔ Le troisième cas : une fonction appelée ligne à ligne ne porte pas de clause SET (11 septembre 2026).
- ⚠️ Le durcissement du `search_path` ne vaut que pour une fonction SECURITY DEFINER : une fonction ordinaire qui ne lit aucune table n’y gagne rien et y perd l’inlining.
- ⛔ Et une couche secondaire ne s’interroge que là où elle peut rendre quelque chose : la vue des gloses de TR0013 ne se lit plus pour une famille qui ne porte pas TR0013, et son échec ne ferme plus la page.
- ⚠️ Un correctif de performance se mesure sous le rôle du lecteur, jamais sous `postgres`, qui contourne la politique de lecture.

**§ 18.1 — Onglet Claude — Boèce (`A0064O0001`)**

- ⛔ Ne jamais réécrire le texte, les titres source, les notes ou les alignements pour contourner un défaut d’interface.
- ⛔ Ne plus afficher l’option, l’onglet, le bouton ou le lien « Traductions parallèles ».
- ⛔ Aucun sous-titre textuel de niveau 2 ne doit être affiché : `ref_niv2` est seulement une clé structurelle interne et ne doit pas produire un heading visible ; `display_subtitle` doit rester absent.
- ⛔ Le lecteur ne doit jamais prendre `book_heading`, `source_title` ou `printed_title` comme libellé éditorial de remplacement, ni réafficher une projection `ref_nivN_texte`.
- ⛔ Ne jamais replacer l’Épître ou les deux Approbations en `introduction`, ni les requalifier en simple `apparat_editeur`, sans décision éditoriale explicite de l’auteur.
- ⛔ Ne pas recomposer côté client un alignement transitif par Mirandol.
- ⛔ Ne jamais considérer le filtrage de la table de base comme une preuve de confidentialité d’une vue dérivée.
- ⛔ Appliquer directement ces offsets à `text_content` diplomatique coupe les mots dès qu’une abréviation développée change la longueur (`⁊` → `et`, etc.).
- ⚠️ Après toute modification d’une fonction appelée depuis une vue publique, exécuter un vrai test sous `anon` ; un test `service_role` ne détecte pas ce défaut.
- ⛔ Ne pas harmoniser mécaniquement les options des vues sans vérifier le contrat de lecture voulu.
- ⛔ Le lecteur, les parseurs et les scripts de contrôle ne doivent pas inférer une sémantique à partir de n’importe quel libellé placé avant `:` dans des crochets.
- ⛔ Une comparaison globale `source.alignment_order = target.ordre_slot` produit donc des milliers de faux décalages.
- ⛔ Le code ne doit ni fabriquer une balise à partir du seul booléen, ni traiter chaque verset indépendamment, ni produire le marqueur nu `[lecture incertaine]`.
- ⛔ Un rendu ne doit jamais laisser une profondeur de crochet positive contaminer mécaniquement tout le reste du livre.
- ⛔ Ne jamais décider une jonction de mots sur cette colonne : la source de vérité est `bible_source_unit_texts.source_markup` de la couche diplomatique.
- ⚠️ Les Psaumes sont propres (3 écarts sur 5 524).
- ⛔ LE RESTE DE LA FAMILLE NE SE RÉPARE PAS PAR RÈGLE.
- ⚠️ Le sous-ensemble sûr existe, et il est étroit.
- ⚠️ *Une mesure qui valide une règle dans un sens ne la valide pas dans l’autre.* Le contrôle de falsification employé d’abord — 98,9 % des lignes portant `break="no"` finissent par une lettre — était juste et ne prouvait rien du cas symétrique, celui des lignes qui auraient dû le porter et ne le portent pas.
- ⛔ Ne pas donner de `canon_id` à ces lignes pour les faire paraître : c’est au lecteur de `versets_v2` d’aller les chercher par `(livre, ch_orig, ordre_slot)`, comme le fait déjà le chemin Bible 899 par `alignment_order`.
- ⛔ Ne pas rendre `canon_id` nullable pour contourner ce problème et ne pas créer de doublon d’ancre pour une même `note_id` / `anchor_key`.
- ⛔ Le client web ne doit jamais requêter `internal` directement ni obtenir `USAGE` sur ce schéma : créer ou employer une couche backend privilégiée qui ne restitue que les champs nécessaires.
- ⚠️ Il n’existe toujours ni garde bloquante ni trigger d’audit imposant ce protocole sur ces deux tables.

## § 19. Modèle de données des œuvres et versions

**§ 19.1 — `oeuvres`**

- ⛔ Une œuvre n’est pas une édition déterminée et ne doit pas absorber les métadonnées propres à plusieurs versions.
- ⛔ Ils ne répètent jamais le seul nom du traducteur, l’éditeur, la collection, le lieu, la date, le numéro de tome, l’édition, la pagination ni toute autre donnée déjà structurée.
- ⛔ Chaque idée occupe sa propre ligne ; les lignes sont brèves, rédigées comme des phrases explicatives et ne prennent pas de point final.
- ⛔ Les détails de travail, preuves, hésitations, variantes fines, justifications d’attribution, états de contrôle et mécanismes internes sont conservés dans `oeuvres_commentaires_prives`, jamais exposés au lecteur.
- ⛔ L’auteur et le titre normalisé constituent le mécanisme d’appariement ; aucun identifiant de liaison supplémentaire n’est créé.
- ⛔ Elles ne redisent pas ce que les champs structurés disent déjà, et `note_editoriale_complement` a recueilli l’ancienne `note` (dix-neuf notes en prose, que le site ne montrait nulle part) et l’ancienne `note_editoriale_secondaire`.
- ⚠️ Elle expose concrètement la cause et la portée de la difficulté — qui a constitué le texte, quelle part revient à l’auteur, quelle forme ne vient probablement pas de lui, ou ce que la lacune change pour la lecture.
- ⛔ Elle ne se borne jamais à une étiquette abstraite telle que « compilation incertaine ».
- ⛔ Une note publique n’est jamais un rapport de chantier.
- ⛔ Une phrase dont le sujet réel est « ce que nous avons contrôlé » plutôt que « ce que le lecteur doit comprendre de l’œuvre » est privée, même si elle est exacte.
- ⛔ De même, une note éditoriale ne répète pas l’adresse bibliographique, la pagination, le nom du traducteur ou les autres informations déjà portées par les champs structurés.
- ⛔ tout véritable titre d’œuvre ou d’ouvrage est délimité dans la donnée par `*…*` afin d’être composé en italique.
- ⛔ Les noms des livres sacrés restent en romain conformément au § 3.6 — on écrit ainsi `les *Rétractations*`, `les *Adnotationes in Iob*`, mais `le livre de Job`.
- ⛔ ne reçoivent pas d’astérisques décoratifs : leur composant d’interface porte la mise en forme.
- ⛔ Relire la note sans connaître le chantier qui l’a produite. Si elle exige de savoir ce qu’est un audit, une passe, un lot ou une validation, elle n’est pas prête.
- ⛔ La visibilité de l’œuvre dans les listes suit le § 16 : `acces_public`, et lui seul.

**§ 19.2 — `oeuvre_textes`**

- ⛔ `oeuvre_textes.edition_label` est un libellé public minimal, non une notice bibliographique. Sa forme normative est exactement `Ville, éditeur normalisé, année`.
- ⛔ Le champ ne contient ni la formule « D’après l’édition de », ajoutée seulement par l’interface, ni point final.
- ⛔ `edition_label` ne fabrique pas automatiquement une plage chronologique — le détail tome par tome et la chronologie complète restent dans `collection`, `date_publication`, les métadonnées de version ou les données de source.
- ⛔ On ne conserve pas une information dans le libellé au seul motif qu’elle figurait dans une ancienne citation développée.
- ⚠️ La réduction du libellé n’entraîne aucune perte documentaire — les détails utiles sont déplacés ou maintenus dans leurs champs propres.
- ⛔ Elle ne concatène à cette phrase ni `collection`, ni `date_publication`, ni `annee_edition`, ni pagination, ni commentaire public.
- ⛔ `oeuvres.editeur` reprend exactement `editeurs.nom_complet`, et non une variante d’adresse bibliographique.
- ⚠️ Une discordance entre une variante reconnue et l’autorité d’`oeuvres.editeur` est une anomalie à corriger.
- ⛔ Un texte n’existe qu’à un seul endroit.
- ⛔ L’original embarqué ne reçoit jamais une étoile de favori — tandis que l’œuvre originale autonome utilise le mécanisme normal `favoris(type='oeuvre', ref_id=id_oeuvre)`.
- ⚠️ Ne pas généraliser cette séparation à deux traductions que l’on veut lire par un alignement sémantique explicite.
- ⛔ Une œuvre disposant de versions doit en avoir exactement une avant clôture ou publication ; cette version ne peut jamais être `retired`.
- ⛔ il ne remplace pas `acces_public`, le drapeau de publication de l’œuvre défini au § 16.
- ⛔ La complétude d’une version s’évalue sur le périmètre effectivement transmis par le témoin ou l’édition de référence et annoncé par la version, non sur l’intégralité hypothétique d’une œuvre antique dont une partie est perdue.
- ⛔ des pages, divisions ou unités attendues dans le témoin choisi mais absentes de l’import constituent une incomplétude de version et interdisent le statut `published`.
- ⛔ Les métadonnées legacy `complete_work` et `publication_target`, lorsqu’elles subsistent, ne commandent jamais la visibilité — elles doivent respecter cette distinction et ne jamais contredire `statut`, `is_public` ni `acces_public`.
- ⛔ Changer la version par défaut, publier, retirer ou remplacer une version est une opération explicite. Aucune version n’est supprimée ni retirée automatiquement du seul fait qu’une nouvelle version existe.
- ⛔ Toutes les versions rattachées au même `id_oeuvre` reçoivent le même menu, quel que soit l’`id_texte` actif.

**§ 19.3 — `oeuvre_texte_unites`**

- ⛔ Les numéros de page peuvent figurer dans un localisateur de preuve, mais ne constituent pas une structure éditoriale à reconstruire ni à projeter dans les segments.
- ⛔ Elles ne sont pas remodelées pour correspondre artificiellement aux segments sémantiques.

**§ 19.4 — `segments`**

- ⛔ Elles ne doivent pas redevenir la source normative d’un nouveau chantier lorsque les tables spécialisées existent.

**§ 19.5 — Notes structurées**

- ⛔ Une projection dans `segments.notes` doit être reconstructible et ne doit jamais diverger silencieusement de ces tables.

**§ 19.6 — Alignements et relations entre versions**

- ⚠️ ne doivent pas être confondus avec l’alignement bilingue lui-même.

**§ 19.7 — `liens_bibliques`**

- ⛔ Une contrainte d’unicité doit empêcher les doublons exacts sans interdire plusieurs cibles légitimes pour un même segment.

**§ 19.8 — Autorité du schéma**

- ⛔ Avant de générer un import ou une migration, interroger le schéma actuel. Une liste de colonnes copiée depuis un ancien script n’est jamais une autorité.
- ⛔ Tout changement de modèle est accompagné d’une migration versionnée, d’une mise à jour des importateurs, du lecteur et des tests pertinents.
- ⛔ une telle migration ne s’applique qu’une fois le correctif publié, ou bien il est publié dans la foulée. Aucune séance ne se termine sur une migration en base dont le correctif dort dans un commit non publié.
- ⛔ on rejoue la requête telle que la sert le code en ligne, jamais le code local.

## § 22. Contrôle des apparats

**§ 22 — Contrôle des apparats**

- ⛔ Une référence bibliographique présente dans un apparat n’échappe jamais au normalisateur.

## § 23. Protocole de modification

**§ 23.0 — Manifeste constitutionnel de révision des textes**

- ⛔ elles ne peuvent supprimer une étape applicable ni abaisser le niveau de preuve exigé.
- ⚠️ L’archive et la sauvegarde gardent la mémoire du chantier ; le corpus actif ne sert pas d’entrepôt aux étapes devenues inutiles.
- ⛔ Une œuvre n’est jamais déclarée « propre », « close » ou « vérifiée » parce qu’un contrôle partiel est à zéro.
- ⛔ Aucune correction de fond ne précède cette identification.
- ⛔ L’interface ne commande jamais la structure.
- ⛔ Une couche diplomatique ou source n’est pas réécrite pour corriger une couche éditoriale dérivée.
- ⛔ Les contrôles du § 20 sont des conditions nécessaires, jamais une preuve suffisante d’exactitude.
- ⛔ une correction incomplète dans une projection secondaire reste une correction inachevée. Le rendu ne doit pas masquer une donnée fautive.
- ⛔ Cette étape n’est close que si 0 référence identifiable est rendue depuis une chaîne libre lorsqu’une représentation structurée existe, 0 ouvrage identifiable reste sans recherche de correspondance, 0 doublon de notice ou d’autorité a été créé, et toute projection matérialisée est traçable à son `ouvrage_id` ou, pour un renvoi, à ses `related_ouvrage_ids`.
- ⛔ L’alignement est sémantique et ne force jamais du `1:1`.
- ⛔ Les caches ou projections dérivés sont régénérés après la donnée normative, jamais l’inverse.
- ⛔ il ne supprime jamais une preuve documentaire unique.
- ⛔ elle n’est jamais fermée par simple proximité de sujet.
- ⛔ Une clôture technique ou éditoriale ne crée jamais une validation humaine, une publication ou un statut scientifique qui n’a pas été explicitement accordé.
- ⚠️ Le précédent état n’est pas réécrit comme s’il avait toujours été correct — le journal de mission conserve la succession réelle des contrôles.

**§ 23.1 — Diagnostic**

- ⛔ Ne pas écrire pendant la découverte du problème.

**§ 23.2 — Plan et mode à blanc**

- ⛔ Le mode à blanc ne change ni fichier source ni base.

**§ 23.3 — Écriture bornée**

- ⛔ Une mise à jour ne doit pas toucher une ligne dont l’état a changé depuis le diagnostic.

**§ 23.4 — Vérification**

- ⛔ Un message de succès de l’API ne suffit pas.

**§ 23.5 — Rapport**

- ⚠️ Les bilans propres à une œuvre restent dans `audit/` ou dans les scripts de chantier, jamais dans la charte.

**§ 23.6 — Non-modernisation**

- ⛔ Une correction éditoriale ne modernise pas silencieusement le texte.

**§ 23.6.1 — Préflight de schéma et staging avant resegmentation**

- ⛔ Une règle historique d’écriture ne doit jamais conduire à écrire explicitement dans une colonne devenue générée.
- ⛔ appeler `nextval()` ne rend pas licite une insertion explicite.

**§ 23.6.2 — Frontières documentaires et frontières sémantiques**

- ⛔ Une frontière produite par un OCR, un HTML, une API, un export Word ou un moteur de lecture ne vaut jamais, par elle-même, preuve d’un alinéa de l’édition.
- ⛔ Les fins de page, de colonne, de ligne OCR et les découpages d’un extracteur ne doivent pas être promus en paragraphes.
- ⛔ La longueur ne décide jamais seule d’une coupure.
- ⛔ Une frontière éditoriale ne doit jamais être présentée ultérieurement comme un alinéa du témoin.

**§ 23.7 — Respect de l’édition**

- ⛔ Une difficulté d’interface ou d’algorithme ne justifie pas leur réécriture.

**§ 23.8 — Opérations destructrices**

- ⛔ Une suppression globale, un chemin racine ou une variable non résolue sont interdits.

**§ 23.9 — Contrôle des outils**

- ⚠️ Les scripts historiques peuvent contenir des hypothèses périmées.

**§ 23.10 — Sauvegarde obligatoire**

- ⛔ Une synchronisation distante ne doit toutefois pas être la seule protection d’une opération sensible — et ne remplace ni la sauvegarde bornée préalable, ni les contrôles de restauration ou d’empreinte.

**§ 23.11 — Fidélité des caractères**

- ⛔ Ne pas appliquer `trim()` ou une normalisation globale lorsqu’elle détruirait une distinction contrôlée.

**§ 23.11 bis — Contrôle matériel exhaustif des liminaires et paratextes**

- ⛔ Le fac-similé exact est l’autorité de promotion.
- ⛔ ne vaut pas contrôle pixel et ne permet pas de poser `facsimile_verified` — `facsimile_pixels_checked` ou un statut équivalent.
- ⛔ Aucun de ces décomptes ne peut être estimé.

**§ 23.12 — Validation humaine par couche**

- ⛔ Aucun drapeau humain n’est hérité, extrapolé ou créé par une passe IA, même lorsque la recomposition source/lecture est exacte.
- ⛔ Ne pas synchroniser ce drapeau JSON automatiquement, ni dans un sens ni dans l’autre.

## § 26. Chronologie et frise des événements

**§ 26 — Chronologie et frise des événements**

- ⛔ L’exhaustivité du réservoir ne doit jamais produire une frise principale illisible.

**§ 26.1 — Objets normatifs et source de vérité**

- ⛔ Ils ne sont jamais recyclés ni modifiés à la suite d’une correction éditoriale.
- ⛔ La famille se déduit toujours du genre.

**§ 26.2 — Familles et genres**

- ⛔ On ne crée jamais un genre pour un événement particulier.

**§ 26.3 — Événement central et portées**

- ⛔ Un événement général et un événement biographique ou bibliographique ne décrivent jamais deux fois exactement le même fait.

**§ 26.4 — Importance historique et niveau de lecture**

- ⛔ L’importance générale ne dépend ni de la proximité géographique avec la France ni de la place de l’événement dans un parcours spécialisé.
- ⛔ Aucun quota par siècle, région, tradition ou genre ne détermine mécaniquement le niveau.

**§ 26.5 — Trois axes de l’essentiel**

- ⛔ La proximité française ou européenne ne relève jamais artificiellement `importance_generale`.

**§ 26.6 — Dates et périodisation**

- ⛔ `date_fin` ne peut être antérieure à `date_debut`.
- ⛔ On ne fabrique jamais une date pour satisfaire un composant.

**§ 26.7 — Traditions chrétiennes et portée ecclésiale**

- ⛔ aucune liste séparée n’est recopiée dans l’événement.
- ⚠️ le mot générique `réforme` ne suffit jamais à rattacher un événement à la `Tradition réformée`.
- ⚠️ Cette portée ne remplace ni `portee`, ni l’importance, ni le niveau de lecture.

**§ 26.8 — Relations entre événements**

- ⛔ La seule proximité chronologique, le même genre ou une ressemblance de titre ne suffisent jamais.
- ⛔ Les relations complètent les notices ; elles ne servent pas à fabriquer une causalité incertaine.

**§ 26.9 — Séries historiques et condensation**

- ⚠️ Une série ne doit pas devenir un fourre-tout thématique — ses membres doivent former une chaîne identifiable.

**§ 26.10 — Association progressive aux auteurs**

- ⛔ Un import ne crée jamais implicitement une fiche d’auteur à partir d’un nom.
- ⛔ La contemporanéité ne suffit jamais.
- ⚠️ Un événement postérieur à la mort de l’auteur n’est associé que s’il concerne explicitement sa réception, sa condamnation, sa réhabilitation, sa doctrine ou la transmission de son œuvre.

**§ 26.11 — Publication et workflow des futurs ajouts**

- ⛔ Les ressemblances sémantiques sont signalées par l’audit mais ne sont jamais fusionnées sans examen éditorial.
- ⛔ Masquer une association ou une relation ne supprime jamais l’événement central.

**§ 26.12 — Œuvres et événements bibliographiques**

- ⛔ Une œuvre sans datation exploitable ne reçoit pas de date inventée.

**§ 26.13 — Vues publiques et API de lecture**

- ⛔ Le site ne lit jamais directement les tables normatives depuis une page publique.
- ⛔ Le front ne redéduit pas les valeurs par des heuristiques parallèles.
- ⛔ Le filtrage par pays actuel utilise exclusivement `pays_filtre_codes` ou `pays_filtres`, jamais le champ historique `pays`.

**§ 26.15 — Recherche intégrale**

- ⛔ La recherche de la frise est effectuée par `rechercher_frise(...)`, non par un filtrage partiel dans le navigateur.
- ⚠️ il ne remplace ni l’importance historique ni le niveau de lecture.

**§ 26.16 — Trois brins dans une chronologie d’auteur**

- ⛔ La frise d’un auteur demeure sélective et ne devient jamais un résumé exhaustif de son siècle.

**§ 26.18 — Localisation historique et filtres géographiques**

- ⛔ Ils ne sont pas modernisés artificiellement pour satisfaire un filtre.
- ⛔ les niveaux trop précis restent vides plutôt que fabriqués.

**§ 26.19 — Import, contrôles et sauvegardes**

- ⛔ Un import d’événements est idempotent — l’identifiant stable met à jour l’événement existant au lieu d’en créer une copie.
- ⛔ Toute opération structurelle ou destructive est précédée d’une sauvegarde bornée des tables concernées et suivie d’un audit complet.

**§ 26.20 — Prudence éditoriale et priorité géographique**

- ⛔ Cette priorité n’instaure ni quota ni équilibre artificiel.
- ⛔ Une absence de lien ou un statut `à consolider` valent mieux qu’une certitude artificielle.
- ⚠️ Les comptages de chantier et états provisoires appartiennent aux rapports et sauvegardes, non à la charte normative.

## § 27. Entretien de la charte

**§ 27.1 — Une SAUVEGARDE ne se garde que TROIS JOURS**

- ⛔ Une sauvegarde déposée dans `parametres` de plus de trois jours se supprime — et c'est la BASE qui le fait, non l'usage : `public.purger_sauvegardes_parametres()`, appelée chaque nuit par le travail périodique `purger_sauvegardes`.
- ⛔ `charte_ia` et `carnet_ia` sont exclus **nommément**, et non par un motif : aucune expression ne doit pouvoir les emporter par accident.
- ⛔ La sauvegarde reste OBLIGATOIRE avant toute écriture (§ 23.10) : la présente règle borne sa DURÉE DE VIE, elle ne dispense pas de la prendre.
- ⚠️ Ne pas déposer une copie ENTIÈRE quand une ligne suffit — et préférer un fichier à une ligne de base quand la copie est massive.
- ⛔ Et une sauvegarde ne va JAMAIS dans `public` (§ 17), mais dans `internal`, que ni `anon` ni `authenticated` ne peuvent parcourir.

**§ 27.3 — Un numéro ABROGÉ reste vacant**

- ⛔ Quand une section est abrogée ou déplacée, son numéro ne se réattribue pas et le trou ne se referme pas.
- ⚠️ Un numéro vacant DIT quelque chose — que la matière a été retirée ou déplacée, et non qu'elle n'a jamais existé.
- ⛔ La concordance des numéros déplacés vit au carnet, non ici : c'est un constat daté, non une règle.

## § 29. Valeur académique des sources bibliographiques

**§ 29.0 — Constitution obligatoire des notices bibliographiques**

- ⛔ Toute référence d’ouvrage rencontrée doit être normalisée, structurée et rattachée à une autorité bibliographique.
- ⛔ La création d’une nouvelle fiche n’est permise qu’après recherche de doublon.
- ⛔ Une variation de casse, ponctuation, abréviation, ordre des éléments, langue du titre ou forme ancienne du nom ne justifie jamais deux ouvrages distincts.
- ⛔ Une donnée non prouvée reste vide ou en revue ; elle n’est pas inventée pour rendre la notice plus complète.
- ⛔ elle ne se déduit pas mécaniquement du titre de la rubrique.
- ⛔ Elle ne dispense jamais de la normalisation et ne devient pas la notice finale si une fiche structurée existe.
- ⚠️ son rang matériel reste une donnée de provenance, pas son identité.
- ⛔ C'est une évaluation de la source, jamais un jugement de la personne.
- ⛔ se peuplent depuis ces valeurs distinctes : jamais une liste inventée.
- ⛔ une référence de faible valeur n'est jamais montrée ; une valeur intermédiaire ne l'est qu'à défaut d'une meilleure disponible pour la même péricope.
- ⚠️ La réserve ne juge pas la personne et ne préjuge pas de sa valeur académique.
- ⛔ aucune personne ni maison réelle n'est étiquetée à la légère, en particulier aux niveaux bas.

**§ 29.1 — Système de qualification scientifique déployé (règles de code)**

- ⛔ Le code applicatif ne recalcule jamais cette valeur à partir des scores.
- ⛔ Une exclusion manuelle exige un motif, et la base refuse l'écriture sans lui.
- ⛔ L’ÉTAT ÉDITORIAL D’UN OUVRAGE EST DÉRIVÉ DE SA VALEUR SCIENTIFIQUE ; il ne se saisit pas.
- ⛔ Le code n'écrit jamais `ouvrages_bibliographiques.statut_editorial`, et le déclencheur récrit toute écriture directe.
- ⚠️ Pourquoi cette dérivation, et ce qu'elle a débloqué.
- ⛔ Ce reliquat est une dette de normalisation des autorités, non une file d'attente de validation : il se règle dans la donnée, jamais en cliquant.
- ⛔ Le code écrit toujours le statut d'usage accordé au score, faute de quoi la base rejette l'écriture.
- ⛔ le code choisit la bonne plutôt que d'approcher le filtrage en TypeScript.
- ⛔ L'affichage public ne montre jamais le score interne, la réserve, les motifs sensibles, les notes d'administration ni les sources d'évaluation.
- ⛔ Un ouvrage exclu ne paraît nulle part côté public.
- ⛔ Un ouvrage à vérifier n'est pas présenté comme une référence validée.
- ⛔ Un Père ou un autre auteur ancien, comme un collectif, n'a jamais de fiche notée : il figure comme source, sans note.

**§ 29.2 — Précision thématique des bibliographies de péricopes**

- ⛔ Lorsqu’une étude `directe` de valeur scientifique suffisante existe, au moins une telle étude doit précéder les références `generale`.
- ⛔ Il ne s’agit pas d’un quota : deux références redondantes ne sont pas retenues pour remplir artificiellement quatre places.
- ⚠️ Son absence de la sélection publique ne diminue pas sa valeur scientifique.
- ⛔ Ils ne déterminent jamais automatiquement `niveau_precision`. La qualification est faite par lecture bibliographique.
- ⛔ elle n’est jamais masquée par la multiplication de références générales.

## § 29 bis. Le nom d’une personne — nom, prénom, pseudonyme

**§ 29 bis — Le nom d’une personne — nom, prénom, pseudonyme**

- ⚠️ La colonne `auteurs_valeur.nom` n’est jamais réécrite depuis un écran d’administration.
- ⛔ Le découpage automatique d’un nom est une PROPOSITION, jamais un verdict.
- ⛔ Un nom qui ne paraît que dans le texte libre d’une notice, sans fiche ni ligne de contributeur, est SIGNALÉ et non créé.
- ⚠️ Un renvoi vers `auteurs` NOMME, il n’évalue pas : il n’entre pas dans le calcul de la valeur scientifique, et rattacher une ligne ne change donc aucun statut.
- ⚠️ Rattacher une ligne dont le nom diffère de celui du registre inscrit ce nom parmi les variantes de la fiche : c’est exactement ce qu’est une variante, la forme sous laquelle on rencontre la personne.

## § 30. Suivi de l'avancement — le centre de contrôle

**§ 30.1 — Journal des missions**

- ⛔ Une liste de tâches ne se réécrit jamais à l'aveugle.
- ⛔ Une liste ne se tronque jamais non plus : au-delà d'une borne, l'écriture est refusée, et rien ne s'écrit.

**§ 30.2 — Une mission à la fois, et l'état du contrôle à part**

- ⛔ Le centre de contrôle se lit mission par mission.
- ⛔ La liste des missions vient de la base, jamais d'une énumération écrite dans une page.
- ⚠️ Le centre ne s'ouvre pas sur l'état du contrôle v2 — qui est une vue à part du même volet : son contrat recalcule à chaque appel toute la file des postcontrôles de liens, et une panne de ce calcul ne doit pas fermer les missions.

## § 31. Atelier La Gueule — contrôle, correction et validation ciblée

**§ 31 — Atelier La Gueule — contrôle, correction et validation ciblée**

- ⛔ Tout ce qu'il produit est un candidat, jamais une donnée validée.
- ⛔ Le fac-similé et la transcription brute de la machine restent immuables — toute intervention agit dans une couche candidate tracée, réversible et exportable.

**§ 31.1 — Contrôle déterministe de toutes les pages et assistance ciblée**

- ⛔ Aucune donnée ne part vers un service distant sans consentement enregistré, et aucun secret n’est transmis.

**§ 31.2 — Corrections effectives et réversibles**

- ⛔ la transcription brute d'origine n'est jamais touchée.
- ⛔ Une correction n'écrase jamais silencieusement une modification humaine ou une correction plus récente — le conflit est signalé et laissé à l'arbitrage.
- ⛔ le statut de texte formellement vérifié exige une validation humaine explicite, jamais acquise par la seule acceptation d'une règle ou d'un échantillon.

**§ 31.3 — Périmètre de travail**

- ⚠️ les pages du document non incluses dans le lot ne sont pas comptées comme manquantes.

**§ 31.4 — Reclassement des éléments non textuels**

- ⛔ son texte et sa transcription brute ne sont pas supprimés.

**§ 31.6 — Blocages proportionnés et livraison**

- ⚠️ Une particularité éditoriale n'est pas un blocage — une page de titre courte, un faux-titre, une page d'ornement ou une fin de chapitre brève sont des avertissements.
- ⛔ n'affirme jamais une validation humaine qui n'a pas eu lieu.

**§ 31.7 — Couche linguistique post-OCR**

- ⛔ un dictionnaire ou un lexique ne constitue jamais, à lui seul, une preuve de faute et n’autorise aucune modernisation silencieuse.
- ⛔ Une forme absente des ressources lexicales reste possible tant que le fac-similé ne l’infirme pas.
- ⛔ Si une ressource ne peut être embarquée, elle n’est pas copiée illicitement — on lui substitue une ressource réutilisable ou un accès conforme à ses conditions.

**§ 31.8 — Lexique dynamique de l’ouvrage**

- ⛔ La fréquence n’est jamais une preuve suffisante — une erreur systématique du moteur peut elle-même se répéter.

**§ 31.9 — Concordance des moteurs et scores de confiance**

- ⛔ Aucun de ces indices ne décide seul d’une correction.

**§ 31.10 — Score de suspicion et recherche de formes proches**

- ⛔ fournit des candidats et non des corrections.
- ⚠️ Le score, ses composantes et les candidats proposés doivent rester consultables afin qu’une décision puisse être auditée.

**§ 31.11 — Contrôle assisté ciblé et ré-OCR local**

- ⛔ Ces nouvelles sorties sont des témoins supplémentaires ; elles ne remplacent jamais le fac-similé.
- ⛔ Une proposition qui modernise seulement parce que la forme ancienne est absente d’un dictionnaire moderne doit être rejetée.

**§ 31.12 — Mémoire des erreurs OCR validées**

- ⛔ L’apprentissage ne doit jamais transformer une correction propre à un livre en règle générale sans preuve.

**§ 31.14 — Mesure de qualité**

- ⚠️ L’objectif n’est pas de minimiser artificiellement le nombre de propositions, mais de concentrer la vérification humaine sans augmenter les erreurs résiduelles.
- ⚠️ Une baisse du nombre de propositions n’est un progrès que si les sondages ne montrent pas une hausse des erreurs manquées.

## § 33. Longueur d’une œuvre et opuscules

**§ 33.2 — Opuscules**

- ⛔ La règle n’appartient pas à la bibliothèque — où elle est née : elle vaut partout où une étagère d’auteur se déploie — l’étagère de la bibliothèque, et la rubrique « Du même auteur » du volet de la page Œuvre (9 septembre 2026).
- ⚠️ Elles passent donc par le MÊME module : un seuil, une mesure, un partage.
- ⛔ Sans la mesure, la règle ne se déclenche jamais — en silence.
- ⚠️ « Opuscules » a d’abord paru dans le volet avec le triangle des rubriques (relevé de l’auteur, 9 septembre 2026 : « la même flèche pour déployer que les autres niveaux de titre me paraît bizarre ») : le signe lui donnait le RANG de ce qui la contient, et le lecteur ne voyait plus quel repli emporte quoi.
- ⚠️ La section garde la même forme sur toutes ses surfaces — comme elle y garde le même seuil et le même partage : celle qu’elle porte à la bibliothèque, où elle est née.

## § 34. La marque du site

**§ 34 — La marque du site**

- ⛔ « On la repose » se prend au pied de la lettre : la planche est posée en MASQUE, et c’est le fond de l’élément qui peint.
- ⚠️ La barre de navigation a fait exception jusqu’au 6 septembre 2026, la planche crème y restant une IMAGE peinte sur un aplat vert ; elle porte depuis lors le chiffre, en masque comme partout ailleurs, et l’exception n’a plus d’objet.
- ⚠️ L’encre du monogramme se tient UN CRAN au-dessus de celle du titre qu’il surmonte.
- ⛔ La marque ne paraît plus en tête de l’accueil (27 août 2026, décision de l’auteur).
- ⚠️ Les deux paragraphes qui précèdent décrivent une pose qui n’existe plus.
- ⛔ La page d’accueil se mesure à UNE SEULE justification.
- ⚠️ Ce qui vaut pour la largeur ne vaut pas pour les SEUILS : un volet de prose devient illisible bien avant qu’une tuile de chiffre ne manque de place, et les deux se replient donc à des largeurs différentes.
- ⛔ L’interligne du texte de l’accueil est RESSERRÉ (décision de l’auteur, 27 août 2026).
- ⛔ Un fleuron ne s’annonce pas au-dessus d’un titre, il le ferme.
- ⛔ LE SITE N’A QU’UNE MARQUE, ET C’EST LE CHIFFRE (décision de l’auteur, 6 septembre 2026).
- ⚠️ Une seule planche, deux ENCRES, et rien d’autre ne les distingue.
- ⛔ Jamais une teinte écrite là où l’encre du texte voisin fait l’affaire — la marque appartient alors à la LIGNE au lieu d’y trancher, ce que la charte disait déjà du monogramme lacé dans le titre.
- ⚠️ Une marque LARGE ne se pose pas à la hauteur d’une marque HAUTE.
- ⛔ Cela se juge à l’ŒIL et à la taille RÉELLE, sur une planche qui rejoue la vraie cascade et les deux sols, jamais sur un rapport de dimensions.
- ⚠️ L’ICÔNE D’ONGLET n’a PAS suivi, et c’est une décision qui reste à prendre.
- ⚠️ Une planche livrée sur papier photographié se DÉTOURE en alpha avant d’entrer.
- ⚠️ Un ornement gardé EN RÉSERVE se recense comme les autres.
- ⚠️ Les deux lignes qui suivent le titre du frontispice tiennent le MÊME TON, à un pas d’écart.
- ⛔ La forme d’étiquette ne commande pas le jeton d’étiquette.
- ⚠️ Le pas se prend en MÊLANT l’accent au papier, jamais en écrivant une valeur.

## § 35. Chantier Fillion — la composition du paratexte biblique

**§ 35.4 — La présentation vient de la donnée, jamais d’une forme reconnue au passage**

- ⛔ Aucun de ces styles ne se devine à la forme du texte.
- ⛔ Il prend l’ENCRE DE SON TITRE, non celle du texte second : une encre plus claire en faisait un commentaire du titre, quand il en est la suite.
- ⚠️ Et le blanc qui les sépare se chiffre — mesuré avant reprise, douze pixels entre les deux boîtes et trente-cinq entre les lignes de base, de quoi lire deux choses là où il n’y en a qu’une.
- ⛔ ni boîte, ni fond, ni bordure, ni pictogramme, et les italiques internes sont conservées.

**§ 35.4.1 — Longues introductions, notes et continuité de lecture**

- ⛔ ils ne restent pas `introduction_section` ou `introduction_sous_section` par le seul fait qu’ils appartiennent matériellement à une introduction.
- ⛔ L’appartenance à une introduction ne lui confère jamais le style typographique `introduction`.
- ⛔ on ne crée ni paragraphe vide, ni bloc fantôme, ni saut de ligne interne pour fabriquer un blanc.

**§ 35.5 — Deux axes de hiérarchie, et ils ne se confondent pas**

- ⚠️ La règle vaut même quand la mention n’est pas affichée, ce qui est le cas des chapitres au § 35.1 : c’est la PLACE matérielle qui traverse les subdivisions, non son intitulé.
- ⛔ L’axe vient du REGISTRE, qui le donne au style, et la présentation d’un bloc ne fait que le confirmer ou l’infléchir.
- ⛔ Ce qui ne se rend pas n’entre pas au plan : une entrée de sommaire pointant vers une mention masquée serait une ancre sans cible.

**§ 35.5.1 — Liminaires Fillion : casse, repères analytiques et références de portée**

- ⛔ Le signe `°` ne paraît jamais comme marqueur ordinal dans l’interface.

**§ 35.7 — Les guillemets d’une citation en langue étrangère restent en romain**

- ⛔ L’italique ne se pose pas sur le conteneur qui porte les guillemets, ni la langue étrangère sur la ponctuation française qui les entoure.
- ⛔ le rendu ne le rentre pas dans la citation, et ne recompose pas davantage l’apostrophe typographique, qui demeure U+2019 sur toutes les surfaces éditoriales françaises.

**§ 35.9 — Le repère d’un commentaire se pose en manchette**

- ⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme.
- ⚠️ Éprouvé au fil à plomb sur trois blocs qui se suivent : quand elle le suivait, le fer du commentaire sautait d’un bloc à l’autre et la page perdait son aplomb.
- ⛔ aucune taille imposée, c’est le texte qui la donne, et un repère d’un mot n’ouvre aucun vide sous lui.
- ⛔ Elle ne se justifie PAS, et aucune manchette ne se justifiera.
- ⚠️ Aucune propriété CSS ne borne cet étirement : c’est la mécanique même du justifié, qui répartit le manque sur les espaces d’une ligne.
- ⛔ Ne pas serrer en deçà : sous le quart, les mots se soudent.
- ⚠️ mesurée et non calculée — deux pixels à cette conduite, zéro lorsque les deux conduites sont égales.
- ⚠️ Il ne se règle pas à la même valeur pour autant.
- ⛔ Ce contexte se pose par `display: flow-root`, jamais par un `container-type` : celui-ci confine la mise en page et ferait du bloc le référent des fenêtres de note, qui sont en position fixe — elles s’y trouveraient enfermées.
- ⛔ Rectification du 27 août 2026 : la manchette se ferre à GAUCHE, et en SÉRIF.
- ⚠️ Sur une mesure étroite, où le repère reprend déjà toute la largeur, le fer ne change plus : il est le même partout.

**§ 35.10 — Aucun titre biblique ne se compose en petites capitales**

- ⛔ Décision de l’auteur, 26 août 2026 : « laid et pas lisible ».
- ⚠️ L’italique fait ici le travail que faisait la capitale : elle distingue sans peser, et un titre de péricope ne doit pas peser plus que ce qu’il annonce.
- ⚠️ Cela ne touche pas les petites capitales que la SOURCE demande — un nom d’auteur dans une bibliographie, relevé comme tel dans les enrichissements du texte.
- ⚠️ Le PARAGRAPHE (T5) se centre, seul des rangs bas (décision de l’auteur, 29 août 2026 : « ce niveau de titre me paraît pas bien placé »).
- ⛔ Le corps de la tête ne monte pas : il égalerait la sous-section.
- ⛔ Aucune chasse sur la désignation : une lettre seule ne s’espace pas, et la chasse, tombant APRÈS elle, la décalerait de l’axe.
- ⚠️ Un sous-titre suit toujours la pose de SON titre : centré sous T5 comme sous les rangs hauts, au fer sous T4 et T6.

**§ 35.11 — Un intervalle de références ne coupe pas un intitulé**

- ⛔ le tiret joint aussi bien deux références de plage.
- ⚠️ Mesurée sur les 2 651 intitulés du corpus, la règle change exactement les cent cas fautifs et aucun autre.
- ⛔ La mention de chapitre imprimée en tête d’un intitulé ne paraît pas, pour la raison qui vaut déjà au § 35.1 : la barre de navigation nomme le chapitre.

**§ 35.12 — Le texte biblique se cerne d’un blanc plus large que son apparat**

- ⚠️ Les marges verticales adjacentes FUSIONNENT en flux normal, la plus grande valant pour les deux : il n’y a rien à retrancher de la marge du verset, et croire l’inverse conduit à doubler le blanc.
- ⛔ Rectification du 30 août 2026 : dans l’AXE DE TEXTE, les marges ne fusionnent pas — elles s’ADDITIONNENT.
- ⚠️ Fermer le blanc sous un titre demande donc DEUX sélecteurs, un par surface.
- ⚠️ Un titre dont le développement lui appartient — la sous-section T4, la péricope T6 — ferme des deux côtés, et son blanc vaut alors le MÊME quoi qu’il suive : un commentaire, une introduction, ou la première rangée de verset, laquelle ne porte aucune marge en tête.
- ⛔ Rectification du 30 août 2026 : ce blanc N’EST PAS SYMÉTRIQUE, et il ne l’a jamais dû.
- ⛔ Et ces deux règles NE PORTAIENT PAS sur la lecture EN REGARD, sans que rien ne le dise.
- ⚠️ Corollaire de méthode : une seconde surface qui rend les mêmes blocs autrement ne reçoit rien d’une règle de voisinage, et rien ne le signale — ni type, ni test, ni relecture de la feuille.

**§ 35.13 — L’introduction d’un livre se compose comme un titre de partie, et c’est le GENRE qui titre**

- ⛔ C’est le GENRE qui titre, non le nom du livre (décision de l’auteur, 27 août 2026).
- ⚠️ La règle ne porte pas sur la POSITION, et c’est ce qui la rend juste.
- ⚠️ La coupure ne dépend alors plus de la longueur de la tête (§ 35.11), qui est la mesure des DÉSIGNATIONS de division : « ÉVANGILE SELON S. LUC » y passait à vingt et un signes, « Évangile selon saint Matthieu » échouait à vingt-neuf.

**§ 35.14.1 — Pages de titre imprimées et imprimatur — conservation sans affichage**

- ⛔ Aucune entrée « Page de titre », aucun contenu de page de titre imprimée et aucun titre technique équivalent ne doivent apparaître dans l’interface de lecture.
- ⛔ Cette note privée n’est jamais rendue dans l’interface publique.

**§ 35.14.2 — Dédicaces — restitution éditoriale**

- ⛔ Les fins de ligne OCR, césures de mots, folios, titres courants et changements de page ne créent jamais de paragraphes artificiels.

**§ 35.14.5 — Listes d’abréviations — références bibliographiques normalisées**

- ⛔ Les données de description matérielle ne paraissent pas dans cette liste : nombre de volumes, format (`in-4°`, `in-12`, etc.), pagination, planches, figures, cartes, dimensions, mention de texte explicatif ou toute autre description d’exemplaire restent conservées dans la source ou la notice bibliographique, mais sont exclues de l’affichage.
- ⛔ Il ne paraît que pour une édition qui porte un apparat général : une bible ordinaire n’a rien à y mettre, et l’on ne montre pas un onglet qui ouvrirait sur du blanc.
- ⛔ Ce qui entre au sommaire se reconnaît à la PORTÉE du bloc, Bible, Testament ou groupe de livres, jamais à une liste d’intitulés tenue à la main.
- ⚠️ Les blocs se groupent en PIÈCES, sans quoi le sommaire compterait soixante-deux lignes, dont quinze pour la seule bibliographie de l’auteur.
- ⚠️ La consécution compte : deux pièces homonymes séparées par d’autres matières restent distinctes.
- ⚠️ Le sommaire part dans la MÊME vague que les versets : il ne coûte pas un aller-retour de plus, et le texte d’une pièce ne se charge qu’à son ouverture.
- ⛔ Le sérif sur pastille verte qu’il portait venait de la liste des LIVRES, laquelle n’est pas une table des matières mais un index : on y cherche un nom qu’on connaît déjà, tandis qu’un sommaire se parcourt.
- ⚠️ Les rangs s’apparient par la FONCTION, non par la profondeur : la pièce est ce qu’on ouvre, elle prend donc le rang du premier niveau du sommaire d’une œuvre, vert et demi-gras quand elle est ouverte ; la portée ne s’ouvre pas, elle coiffe, et prend celui des rubriques du volet, en petit, espacé et pâle.

**§ 35.15 — L’apparat n’a qu’UN gris de titre, et la sous-section est un titre centré**

- ⛔ On ne transforme pas un STYLE DE RENDU pour corriger une DONNÉE mal rangée.
- ⚠️ Sa distinction d’avec le paragraphe ne peut plus être la POSE, les deux se centrant : ce sont le CORPS et la GRAISSE.
- ⛔ Le chapeau d’une sous-section est en ROMAIN, seul chapeau du jeu à l’être.
- ⚠️ Les trois rangs hauts — livre, partie, section — gardent le vert : la coupure tombe entre les rangs qui coiffent une PIÈCE et ceux qui vivent dans le fil d’un chapitre.
- ⚠️ Au Cuir la bande est trois fois plus étroite (crans de 7,4 et 7,0) : là, l’encre ne fait que confirmer une hiérarchie que le corps, la pose et l’italique portent déjà.
- ⚠️ Une couleur peut être JUSTE et paraître fausse : c’était la GRAISSE.
- ⛔ Avant de changer une teinte que quelqu’un dit fausse, la MESURER — c’est parfois le poids, le corps ou l’interligne, et retoucher la teinte alors n’ajoute qu’un gris à une échelle qui en avait déjà trop.

**§ 35.17 — L'ÉCHELLE DES BLANCS — un blanc ne dit que son RAPPORT aux autres**

- ⛔ Le blanc d'un rang se NOMME, il ne se somme pas.
- ⛔ Ne pas resserrer l'échelle — deux rangs qui diffèrent de moins d'un cinquième ne se distinguent pas, et c'est ainsi qu'elle s'était aplatie.
- ⚠️ Le seul écart franc est celui qui sépare la coupure d'unité du premier rang de titre, 41 contre 64, et il est voulu : changer d'unité n'est pas changer de péricope, et les deux valaient 33 px l'un comme l'autre.
- ⛔ LA COUTURE ET LA COUPURE NE VALENT PAS LE MÊME CHIFFRE (§ 35.12), et leur RAPPORT compte plus que leurs valeurs.

**§ 35.17.1 — Un bloc qui PORTE un titre s'ouvre au rang de ce titre**

- ⚠️ Le titre porté n'a pas de marge propre, le bloc l'espaçant déjà : c'est donc au BLOC de prendre le rang, et la règle ne fait que lui dire lequel.
- ⛔ Un bloc de TITRE en est exclu, et ce n'est pas une subtilité.

**§ 35.17.2 — Deux titres qui se suivent ne s'ouvrent pas deux fois**

- ⚠️ Un sous-titre y compte comme un titre : il est le chapeau de celui qu'il continue, et le rang qui le suit ne recommence pas davantage après lui.
- ⚠️ Et le PREMIER bloc d'un chapitre n'a rien à séparer.

**§ 35.17.3 — Une règle de blanc porte sur TROIS surfaces, et l'oublier ne se voit pas**

- ⛔ La couture et la coupure ne portaient donc que sur la pleine mesure.
- ⚠️ L'échelle se resserre en revanche sur un TÉLÉPHONE, où elle se compte en écrans et non en lignes : les rangs hauts y prendraient jusqu'au quart d'un écran pour un blanc qu'on traverse au pouce.

**§ 35.17.4 — Une PIÈCE liminaire garde une échelle plus serrée**

- ⛔ L'intertitre DIVISÉ y garde ses quatre rem : c'est lui qui sépare deux sections d'une pièce, et la règle resserrée, plus spécifique, les lui reprendrait en silence.

**§ 35.17.5 — Un bloc de SUITE ne rouvre pas le blanc de son rang**

- ⛔ Deux blocs d’information de même rang et de même nature qui se suivent, le second sans intitulé, sont deux PARAGRAPHES d’un même développement, et se séparent du blanc d’un paragraphe (relevé de l’auteur, 3 septembre 2026, sur l’introduction de la Genèse : « les blancs entre les paragraphes de même style sont trop importants »).
- ⚠️ Le blanc sous une sous-section vaut 0,6 rem, non 0,4, et la fratrie ne le donnait pas.

**§ 35.18 — L’appareil en regard garde la MESURE de la lecture simple**

- ⛔ En lecture Latin-français, un bloc de l’appareil sort des colonnes, mais il ne prend pas toute leur largeur (décision de l’auteur, 3 septembre 2026, revenant sur celle du 20 août : « toute la largeur, c’est trop, pas naturel pour un corps de texte ; il faut, pour ces styles-là, réduire la largeur maximale »).
- ⚠️ Une enveloppe est une surface de plus, et une règle de blanc ne la connaît pas : c’est le § 35.17.3 pris par un quatrième bout.
- ⚠️ Deux colonnes de commentaire à la manière du fac-similé de Fillion ont été maquettées le même jour, sur la page réelle, et écartées : elles remplissaient la largeur, quand la largeur elle-même était le défaut.
- ⚠️ Sur téléphone, où les colonnes sont empilées à la largeur de l’écran, rien ne se borne.

## § 36. Le modèle d’onglets

**§ 36 — Le modèle d’onglets**

- ⛔ Les parts égales ne sont pas un ornement : à largeur libre, la barre se range au fer à gauche et le filet court seul sur la moitié droite de la mesure.
- ⚠️ La barre prend la mesure de CE QU’ELLE COMMANDE, jamais celle de son conteneur.
- ⛔ L’onglet retenu change de graisse ET d’encre ET reçoit son trait.
- ⚠️ Le gris de l’inactif est le plus SOMBRE de ceux qui coexistaient : un onglet est un bouton, il se lit avant qu’on le clique.
- ⛔ La graisse ne déplace RIEN, et cela ne peut pas reposer sur les parts égales seules.
- ⛔ Et la liste qu’une telle barre filtre ne REDIT pas ce que la barre dit.
- ⚠️ Le volet « Aller à un livre » garde, lui, ses deux intitulés.
- ⛔ Le nom `.cs-onglet` appartient à ce modèle, et à lui seul.
- ⚠️ Le style écrit EN LIGNE n’a protégé de rien : il couvrait le remplissage, le corps et l’encre, et laissait passer `flex`, `text-align` et le filet — c’est-à-dire tout ce qui déplace.
- ⛔ Et le décalage sous la barre de navigation fixe ne se repose PAS sur la page : il est posé une seule fois pour tout le site, par `#cs-corps` ; le répéter le compte deux fois.
- ⛔ Aucun ornement ne s’intercale entre le titre et la barre.
- ⚠️ Il tenait à lui seul l’écart entre le titre et la barre — un ornement qui sert de cale n’est plus un ornement ; l’écart est désormais une marge chiffrée, et il se lit dans le code.

**§ 36.1 — La gouttière de défilement se réserve toujours**

- ⚠️ Le prix est une bande vide d’une quinzaine de pixels sur les pages qui ne défilent pas ; il est moindre qu’une page qui se déplace sous les yeux du lecteur au moindre changement d’onglet.

**§ 36.2 — Un menu de navigation DIT ce qu’il ouvre**

- ⛔ Aucun ne doit se confondre avec une marque déjà employée : l’étoile dit « favori », le quadrilobe « citation choisie », le cœur « soutenir », la loupe « chercher », le chevron « avancer ».
- ⚠️ Ils se jugent à la taille RÉELLE, autour de dix-sept pixels, jamais dans l’éditeur.

**§ 36.3 — La recherche rapide : sur quoi elle se mesure, et ce qu’elle montre**

- ⛔ Un panneau de résultats ne prend pas la mesure de son CHAMP.
- ⚠️ Faute de traducteur, c’est la LANGUE qui désigne l’édition — « Texte original latin » — et non un blanc : une édition en langue originale n’a personne à nommer, ce qui ne la dispense pas de se distinguer de la traduction du même titre.
- ⚠️ Ce qu’une recherche va chercher EN SECOND se borne à ce qu’elle montre.
- ⛔ La barre du volet de lecture de la Bible entre au modèle, et ses libellés perdent leurs CAPITALES (décision de l’auteur, 28 août 2026).

## § 37. La notice d’une traduction — le bandeau et l’encart

**§ 37 — La notice d’une traduction — le bandeau et l’encart**

- ⛔ Le cadre a été essayé puis écarté le 27 août 2026 : déplié, le bandeau reculait de dix pixels sur ses quatre côtés, le fond de la carte lui tenant lieu de passe-partout, un filet le bordant et le titre entrant avec lui.
- ⛔ Une encre noire cernée d’un halo blanc posée sur une peinture n’est pas une composition, c’est un pis-aller : elle est écartée, et la mesure de luminance avec elle — un décodage en canevas par notice et une dépendance au CORS en moins.
- ⚠️ Ces valeurs vivent dans un module partagé, non dans la page.
- ⛔ Le volet déplié n’est pas deux colonnes.
- ⚠️ Sous sept cents pixels, l’encart s’efface.
- ⛔ Un seul ne suffit pas — le grain seul fait du bruit de capteur, la nuée seule fait une tache.
- ⛔ C’est la NUÉE qui porte le travail, non le grain.
- ⚠️ Le bruit étant gris, il assombrit un fond clair et ÉCLAIRCIT un fond sombre, et il se voit deux fois plus au Cuir pour la même opacité : l’enduit y est donc dessiné à part, deux fois plus discret.
- ⛔ Un ton COMPLET a été essayé, puis écarté le même jour.
- ⛔ Sa saturation est bornée TRÈS BAS, et l’écart entre les bornes est étroit : quatorze à vingt-huit pour cent.

## § 38. Les surfaces de lecture — volets, fiches et listes

**§ 38 — Les surfaces de lecture — volets, fiches et listes**

- ⛔ IL N’Y A PLUS DE REPÈRES SOUS LE NOM « Français · Catholique · 1888 - 1904 » (décision de l’auteur, 4 septembre 2026 : « ne pas afficher »).
- ⚠️ LE CADRE DU PORTRAIT EST UN FLEX, et la zone d’image s’y étire.
- ⛔ La leçon est générale : une boîte dont on écrit la hauteur DU DEHORS doit pouvoir la transmettre à ce qu’elle contient, sans quoi la mesure se voit au lieu de se lire.
- ⚠️ Une bibliographie en est une part, et elle se compose comme la prose qu’elle accompagne : laissée au navigateur, elle paraissait plus grosse que le texte qu’elle sert.
- ⛔ LA FICHE NE MONTRE PAS LES GRAVURES DE L’ÉDITION (décision de l’auteur, 4 septembre 2026 : « ne pas afficher la famille “Gravures” »).
- ⛔ Sans titre d’édition en base, la rubrique ne paraît pas.
- ⛔ Aucun AUTEUR en tête : la fiche le nomme deux lignes plus haut, et c’est la règle déjà écrite pour « Du même auteur » — une rubrique qui établit son auteur ne le répète pas sous elle.
- ⚠️ Le nombre de tomes est la seule donnée matérielle admise, parce que la rubrique répond des VOLUMES ; le format, la pagination, les planches et les dimensions en restent exclus.
- ⚠️ Les millésimes sont un TEXTE — « 1888-1904 », « vol. I : 1909 ; vol. II : 1907 » —, et c’est pourquoi la référence ne passe pas par `ouvrages_bibliographiques`, dont l’année est un entier : un catalogue d’œuvres ne sait pas dire une collection multivolume.
- ⚠️ Toutes pièces confondues, dédoublonnées par `ouvrage_id`, rangées par auteur puis par titre — une bibliographie d’édition ne se range pas dans l’ordre d’apparition des volumes.
- ⛔ Aucun repli sur le texte des blocs matériels : ce qui n’est pas catalogué n’est pas affiché, et c’est ce silence-là qui appelle le catalogage (§ 47.4).
- ⛔ La formule ne s’invente pas dans la fiche : elle dit en trois phrases le § 6 des conditions d’utilisation, et renvoie à cette page, qui fait foi.
- ⛔ La chronologie d’une traduction n’avait AUCUNE date, depuis l’origine.
- ⚠️ La trouvaille de méthode vaut au-delà de ce cas : le défaut était couvert par un changement de type en deux temps, qui promettait à la frise un champ que la vue n’a jamais eu. Une colonne qui « ne s’affiche pas » se cherche là.

**§ 38.1 — La carte du volet de lecture — le nom, le traducteur, l’adresse de l’édition**

- ⛔ ils ne se devinent jamais du nom de la bible, et un champ absent emporte son séparateur.
- ⚠️ C’est la DATE qui décide qu’il y a une édition à nommer : sans elle, rien ne paraît, quand bien même le lieu serait connu — la fiche d’édition du manuscrit Français 899 porte « Paris », qui est le lieu du MANUSCRIT, et la carte annoncerait sans cette garde « l’édition de Paris » là où il n’y a pas d’édition du tout.
- ⛔ IL N’Y A PLUS DE REPÈRES — la langue, la confession et l’année alignées derrière des points médians.
- ⚠️ UNE FLÈCHE COURTE SUIT LE NOM — et c’est elle qui dit qu’il y a une fiche derrière (décision de l’auteur, 4 septembre 2026 : « ajouter un petit symbole à côté du titre pour suggérer l’existence de “À propos de cette traduction” ; une flèche propre, épurée, courte »).
- ⚠️ Elle vit dans `NomVolet`, donc aussi sous le nom d’AUTEUR des pages patristiques : c’est le même geste, et il ne s’annonce pas de deux façons.
- ⛔ Elle ne paraît pas quand le bouton est inactif — une œuvre sans auteur identifié n’ouvre aucune fiche, et la flèche promettrait une page qui n’existe pas.
- ⚠️ Elle reste HORS de l’écrêtage du nom : c’est le nom qui se coupe par la fin, jamais la flèche, sans quoi l’annonce disparaîtrait sur les noms longs — les seuls où l’on hésite.
- ⚠️ Le soulignement de survol se pose sur le NOM et non sur le bouton : porté par le bouton, il courait sous la flèche et la barrait par le milieu.
- ⛔ ON NE MESURE PAS UN TEXTE AVANT DE S’ÊTRE DEMANDÉ S’IL DOIT PARAÎTRE.
- ⚠️ La forme se prend au volet des pages patristiques, qui est le modèle : le nom en vert qui ouvre la fiche, puis ce qu’on lit, puis l’adresse de l’édition, à une seule interligne (1,35).

**§ 38.2 — Le volet de gauche — la recherche s’efface, le livre grisé s’explique**

- ⚠️ Il se donne à voir quand on s’en sert, et alors seulement : au foyer, un fond léger paraît sous lui.
- ⛔ Pas de filet au foyer non plus, qui redessinerait la boîte qu’on vient d’ôter.
- ⛔ Elle ne dit PAS pourquoi le livre manque : une édition partielle, un tome qui n’est pas encore importé et un livre qu’une confession ne reçoit pas se ressemblent de l’extérieur, et mieux vaut une phrase vraie qu’une raison inventée.
- ⚠️ Les bibles proposées se cherchent aux DEUX sources — `livres_par_traduction` pour celles qui se lisent au verset, la structure éditoriale pour les autres —, faute de quoi Fillion et la Bible 899 seraient tues.
- ⚠️ La fenêtre s’ouvre TOUT DE SUITE, avec ce qu’on sait déjà, et la liste arrive ensuite : un clic qui n’ouvre rien pendant une requête serait le défaut qu’on vient de corriger.
- ⚠️ Une référence REÇUE se montre, elle : la page d’une péricope donne au volet une PLAGE canonique (« Gn 12, 1-9 ») que rien d’autre n’écrit à l’écran.
- ⚠️ L’en-tête vidé ne laissait qu’une bande de trente-huit pixels et son filet : il ne paraît plus que s’il a quelque chose à porter — une référence reçue, ou la flèche de repli.

**§ 38.4 — La PROVENANCE d’un texte biblique — la carte, la fiche, la chronologie**

- ⛔ DANS UNE PHRASE, TOUT SE SÉPARE PAR DES VIRGULES, ET RIEN D’AUTRE (« il faut utiliser la version normalisée ; on doit avoir “Jean Desessartz et Guillaume Desprez” ; tout séparé par des virgules »).
- ⛔ Le point-virgule reste le séparateur normatif dans une COLONNE et dans une notice de catalogue (§ 5) : la règle ne le remplace pas partout, elle compose une énumération là où l’on écrit une phrase.
- ⚠️ La résolution se fait CÔTÉ SERVEUR : l’index des éditeurs n’a pas à voyager jusqu’au navigateur pour composer deux mots.
- ⚠️ LA DATE D’UNE ADRESSE EST CELLE DE LA FICHE D’ÉDITION, non de la première parution.
- ⚠️ Le champ est un TEXTE et porte parfois le détail des volumes — « vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912 » : une phrase de carte en retient les deux bornes, l’énumération n’apprenant rien à qui veut savoir de quand date ce qu’il lit.
- ⛔ UN TÉMOIN MANUSCRIT N’A PAS D’ÉDITION : il a un dépôt et une cote (« aucun texte pour la bible du XIIIe siècle ; à corriger, d’après le manuscrit machin machin »).
- ⛔ Elle ne se DÉDUIT PAS de la prose : l’intitulé de l’édition et le nom de la source numérique portent bien la cote, mais l’en tirer par découpe serait lire une donnée dans un titre.
- ⚠️ Un manuscrit se nomme même sans date : sa cote l’identifie à elle seule, quand une édition sans année n’a rien à annoncer.
- ⛔ UNE FICHE NE REPLIE PAS CE QU’ON VIENT Y LIRE (« “Édition et état du texte” doit être visible sans être développé ; revoir l’ensemble avec cette nouvelle donne »).
- ⛔ La notice rédigée ne paraît plus : elle était la seconde vérité, celle qu’on avait cessé de composer.
- ⚠️ Trois rubriques ferment la fiche, dans cet ordre : l’édition, les ouvrages qu’elle cite, les conditions d’usage.
- ⚠️ UNE MENTION D’ÉDITION NE SE COMPOSE QUE SI ELLE APPREND QUELQUE CHOSE.
- ⚠️ UNE BIBLIOGRAPHIE PREND LE RETRAIT SUSPENDU, où qu’elle paraisse (« pour la bibliographie, il faut un retrait négatif pour les secondes lignes d’un paragraphe »).
- ⛔ Composer une chronologie, ce n’est PAS inventer des faits datés : c’est CHOISIR et ORDONNER ce que le corpus sait déjà.
- ⚠️ Trois brins pour une bible : ce qui l’a FORMÉE, l’ÉDITION servie, sa RÉCEPTION, plus le CONTEXTE qui l’explique ; cinq entrées suffisent, et l’ordre est chronologique.
- ⛔ DEUX VUES QUI NOMMENT LA MÊME CHOSE DOIVENT SE RÉPONDRE.
- ⚠️ On replie la CLÉ, on ne renomme pas la donnée : la vue dit ce qu’elle dit, et le rendu s’y accorde.
- ⛔ NI DÉGRADÉ, NI EMBLÈME, NI BOUTONS dans une petite fenêtre d’explication (« je n’aime guère la mise en forme, surtout le dégradé ; le site n’a aucun dégradé ; fais simple, élégant, propre, proportionné »).
- ⚠️ Une fenêtre de la page Bible ne s’invente pas un dessin : elle prend celui de la page.
- ⚠️ UN NOM DE BIBLE SE COMPOSE PARTOUT DE LA MÊME FAÇON (demande de l'auteur, 2026-09-04).
- ⛔ Les DATES d'un intitulé se composent AVEC lui : elles en étaient sorties, si bien que « (XIIIe siècle) » restait en chiffres ordinaires dans la fiche même de la bible qui porte ce siècle dans son nom.
- ⛔ DANS UNE RÉFÉRENCE BIBLIOGRAPHIQUE, ON NE COMPOSE QUE LES SIÈCLES.
- ⚠️ À GAUCHE CE QU'ON LIT, À DROITE CE QUI LE DOCUMENTE — et la colonne de droite va jusqu'en bas (« peut-on envisager que “Édition et état du texte” soit sous la chronologie ?
- ⚠️ Ses rangées y EMPILENT l'étiquette et sa valeur : une colonne d'étiquettes de 8,5 rem ne laisserait pas cent soixante-dix pixels à la valeur dans une colonne étroite.
- ⚠️ L'INTERLIGNE D'UNE BIBLIOGRAPHIE EST SERRÉ, LE BLANC ENTRE DEUX NOTICES EST LARGE (« réduire légèrement l'interligne ; augmenter légèrement le blanc entre deux œuvres »).
- ⛔ La mesure vaut pour TOUTE la famille, l'apparat des bibles comme les listes des notices : il n'y a qu'une composition bibliographique sur le site.
- ⛔ LA CARTE DE TRADUCTION SE COMPOSE EN SANS (citant la carte de Segond : « Louis Segond (1810-1885) D’après l’édition de Paris, Société biblique britannique et étrangère, 1910 // sans sérif »).
- ⚠️ Règle générale : UNE CARTE DE VOLET PREND LA POLICE DE CE QU’ELLE SURMONTE, non celle du volet dont on l’a copiée.
- ⚠️ La divergence avec le volet des œuvres est donc assumée : ce n’est pas la même page.

**§ 38.5 — Le RAIL d’un volet replié — un seul dessin, et il nomme l’action**

- ⚠️ UN VOLET DE LECTURE SE FERME, ET CE QUI RESTE DE LUI EST UN RAIL — une bande de trente pixels, un chevron en tête, et le nom de l’action écrit en hauteur, dans le sens d’un dos de livre français.
- ⛔ Il y en avait TROIS, voisins et déjà divergents : celui de la Polyglotte portait le passage lu, celui des livres écrivait son nom de bas en haut, celui des Pères de haut en bas et deux crans plus petit.
- ⚠️ Le rail se FONCE au survol : une surface qui ne porte ni cadre ni fond propre n’a pas d’autre façon de dire qu’on peut la toucher.
- ⚠️ LE RAIL NOMME L’ACTION, JAMAIS LE CONTENU.
- ⚠️ Un repère peut s’y ajouter EN SECOND, dans le sérif de lecture et sans capitales : la Polyglotte y garde le passage ouvert, que le tableau ne nomme plus une fois le volet replié.
- ⛔ UN RÉGLAGE DE DISPOSITION MOBILE NE DÉCIDE JAMAIS D’UN CONTRÔLE DE BUREAU — et c’est la vraie leçon de cette reprise.
- ⛔ UN CONTRÔLE DE VOLET NE DÉPEND NI DE L’ONGLET QU’ON REGARDE, NI DE SA PLACE.
- ⚠️ Et elle se pose EN TÊTE, sous les onglets : rendue après une liste qui prend toute la hauteur restante, elle tombait à deux mille pixels de l’endroit où elle se trouve sous l’autre onglet, et un contrôle qui change de bout d’écran ne s’apprend jamais.
- ⛔ UN CONTRÔLE NE SE RANGE PAS DANS UN OBJET QUI EN PORTE DÉJÀ.
- ⚠️ Il ne se confond pas avec la flèche qui annonce une fiche : celle-là suit le TEXTE, à l'intérieur du lien ; celui-ci se tient au BORD de la carte.
- ⛔ UNE FENÊTRE QUI NE SE FERME QU'À LA SOURIS N'EST PAS FERMABLE.
- ⚠️ La touche est CONSOMMÉE, et une seule fenêtre répond.
- ⚠️ Une seule écriture, `app/lib/useFermerAEchap.ts` — le site en portait trois, qui ne se ressemblaient pas.
- ⛔ Le mot « Escape » ne figurait dans AUCUNE des 4 400 lignes de la page d'une œuvre au 9 septembre 2026 — un défaut qui ne se voit ni au type, ni au test, ni en relisant le composant, puisqu'il n'est pas ce que le code FAIT mais ce qu'il ne fait pas.
- ⚠️ ET UN CONTRÔLE DE QUATORZE PIXELS NE PREND PAS L'ENCRE LA PLUS TÉNUE DE L'ÉCHELLE.
- ⛔ La couleur se déclare dans la FEUILLE : posée en style en ligne, elle battrait la règle de survol — le piège est payé quatre fois dans ce dépôt.
- ⛔ UNE RUBRIQUE NE REDIT PAS CE QUE LA FICHE PORTE EN TÊTE.
- ⚠️ Le champ reste LU : il nomme le responsable d'une ÉDITION CRITIQUE dans l'intitulé qui suit le nom, là où il apprend quelque chose.
- ⚠️ LE RAIL CENTRE SON TEXTE, ET SON CHEVRON RESTE EN TÊTE (« centrer verticalement le texte ; réduire un peu la taille de police »).
- ⛔ Le chevron, lui, ne descend pas avec lui — il est là où l’œil arrive, et c’est la cible qu’on vise, non le mot.
- ⚠️ Le groupe se centre d’un BLOC, le libellé et le repère ensemble : les centrer chacun pour soi détacherait le passage lu du nom qu’il accompagne.
- ⚠️ Et son texte descend d’un rang — le libellé de onze pixels à dix et demi, le repère de onze et demi à onze.

**§ 38.6 — La COULEUR d’un corpus se prend là où le lecteur l’a déjà vue**

- ⛔ UNE MATIÈRE NE SE NOMME PAS DE DEUX FAÇONS SELON L’ÉCRAN.
- ⚠️ Le pourpre n’était pas faux — il tenait ses écarts et sa lisibilité ; il n’était simplement nulle part ailleurs sur le site.
- ⚠️ Une teinte reprise garde son RANG là où elle peut, et le change là où elle doit.
- ⛔ Ce qui se transpose est la TEINTE, jamais la valeur.
- ⚠️ Et la reprise se paie en profondeur, ce qui est assumé.
- ⛔ L’éclaircir pour l’aligner sur ses sœurs, ce serait le reprendre à l’accueil, qui est justement d’où il vient.
- ⚠️ Les deux exemplaires restent LITTÉRAUX, et se renvoient l’un à l’autre.

**§ 38.7 — Une page de lecture s’ouvre sur un TEXTE, et elle s’y ouvre en fondu**

- ⛔ UNE PAGE DE LECTURE NE S’OUVRE PAS SUR UN ÉCRAN D’ATTENTE.
- ⚠️ La gravure ne disparaît pas du dépôt : elle passe en RÉSERVE, où l’inventaire des illustrations la garde avec son histoire.
- ⚠️ LE LECTEUR N’A QU’UNE LECTURE EN COURS, MÊME S’IL LA MÈNE SUR DEUX PAGES.
- ⛔ Et l’on ne retient JAMAIS « le livre entier » : c’est un geste explicite et coûteux — les Psaumes entiers sur quatre colonnes — et une ouverture de page doit être brève ; un livre entier laissé à la dernière visite rouvre à son premier chapitre.
- ⛔ DEUX PAGES S’OUVRENT EN FONDU, ET PAS PAR LE MÊME CHEMIN : C’EST LA PROVENANCE DU TEXTE QUI DÉCIDE.
- ⚠️ Poser ce fondu après coup ferait DISPARAÎTRE un texte déjà lisible pour le ramener, c’est-à-dire pire que le défaut qu’on corrige.
- ⚠️ L’ouverture n’est pas ÉCHELONNÉE, à la différence d’une arrivée — et ce n’est pas un choix de goût : le rang d’un bloc se mesure dans le navigateur, ce qui est trop tard pour une page dont le serveur a déjà peint le texte.
- ⛔ Et ce fondu ne porte QUE l’opacité, quand celui d’une arrivée translate de six pixels : une transformation ferait de la colonne le bloc conteneur des cellules d’actions posées en position fixe.
- ⚠️ Une place retenue se relit dans UN SEUL module.

**§ 38.8 — Le volet patristique se lit EN FRANÇAIS, et d’un trait**

- ⚠️ LE FRANÇAIS OUVRE TOUTE LECTURE EN REGARD (« sur le Français – Ancien français : le français doit toujours être à gauche »).
- ⛔ C’est une DONNÉE — l’ordre des membres —, jamais une constante du code, et les deux ordres étant sous contrainte d’unicité, l’échange passe par un rang temporaire.
- ⛔ LA GOUTTIÈRE D’UN VERSET NE PORTE QUE SA RÉFÉRENCE (« je trouve “ACT 1,22” comme référence biblique : c’est une erreur ; on indique seulement “1, 22”, avec l’espace et sans le nom abrégé du livre »).
- ⚠️ Le code venait d’un REPLI, non d’une donnée voulue : la référence seule vit dans une métadonnée que 28 656 segments portent, et les 18 197 autres retombaient sur le LIBELLÉ humain du segment, qui porte son livre.
- ⚠️ UN EXTRAIT PATRISTIQUE COMMENCE PAR UNE CAPITALE — à l’affichage seul (« toute référence patristique citée dans le volet de droite doit comporter une majuscule en début de phrase »).
- ⛔ La capitalisation ne change JAMAIS la longueur du texte : les appels de note s’y posent par offset.
- ⛔ ON NE SERT PAS DU LATIN À QUI VIENT LIRE LES PÈRES EN FRANÇAIS (« dans le volet de droite, toujours afficher une traduction française, la plus récente »).
- ⛔ Re-pointer les liens serait le remède le plus simple et le plus faux : le lien a été établi sur le LATIN.
- ⛔ ET LA CARDINALITÉ DU GROUPE DÉCIDE, car on n’invente aucune correspondance.
- ⚠️ Choisir le premier, ou le nième « à peu près », donnerait un passage que le lien ne désigne pas : une erreur de philologie présentée comme une citation, ce qui est pire qu’un latin qu’on ne lit pas.
- ⚠️ Le prix est visible et assumé : un empan inégal peut faire une occurrence de plusieurs milliers de signes là où les autres en font trois cents.
- ⚠️ LES CITATIONS D’UNE MÊME ŒUVRE SE RÉUNISSENT, L’ÉLISION MARQUÉE D’UN « […] »
- ⛔ ET L’ON NE RÉUNIT QUE DANS UN MÊME TEXTE, non dans une même œuvre.
- ⚠️ Rien de tout cela ne concerne les VERSETS bibliques : une suite de versets se réunit déjà, et par une tout autre règle — elle garde ses bornes, et une élision y ferait disparaître un verset sans le dire.

**§ 38.10 — La lecture EN REGARD — la référence des deux côtés, le verset cliquable**

- ⚠️ LA RÉFÉRENCE PARAÎT DES DEUX CÔTÉS (« la référence biblique doit apparaître des deux côtés : français, et ancien français »).
- ⛔ Ce repli ne prétend pas être une numérotation d’édition : il dit le CRÉNEAU, c’est-à-dire ce que les deux colonnes ont en commun.
- ⛔ CLIQUER UN VERSET OUVRE SON APPARAT, ET LA CIBLE EST LA RANGÉE (« permettre de cliquer sur un verset pour afficher les liens patristiques, sur l’AF et le Français »).
- ⚠️ Une rangée dont une colonne est vide se clique aussi — l’apparat tient au créneau, non à ce que telle édition en porte.
- ⚠️ Un second clic relâche, et les teintes sont celles de la lecture simple, pour que le geste se reconnaisse d’une lecture à l’autre.
- ⛔ Aucun comptage de lecture ici : les lignes d’une segmentation éditoriale ne visent pas la table des versets, et la lecture simple s’en abstient déjà pour elles.
- ⚠️ L’appel de note, lui, arrête le clic : ouvrir une note ne sélectionne pas le verset qui la porte.
- ⛔ UNE MARQUE POSÉE SUR UNE RANGÉE NE DÉPLACE RIEN.
- ⚠️ Et il se déclare dans la FEUILLE, jamais en style en ligne — une déclaration en ligne bat toute règle de feuille sans passe-droit, et c’est ainsi qu’un survol meurt sans que rien ne le dise.
- ⛔ UNE ÉLISION QUI SUIT UNE PONCTUATION FORTE OUVRE UNE PHRASE (« à l’affichage, afficher une majuscule après une élision précédée par une ponctuation forte »).
- ⛔ Rien ne change après un deux-points, un point-virgule ou une virgule, où la phrase n’était pas finie.
- ⚠️ Le guillemet et la parenthèse fermants ne rompent pas la ponctuation forte : « Il le dit.
- ⚠️ C’est la règle de l’initiale d’un extrait, et la même main : elle ne change jamais la longueur du texte, les appels de note s’y posant par décompte de signes.
- ⛔ UN ÉTAT QU’ON TRAVERSE NE SE COMPOSE PAS COMME UNE PAGE DE TITRE (« ouvrir Bible classique soit sur la Genèse, soit sur le dernier livre ouvert par l’utilisateur ; supprimer le dessin »).
- ⛔ Et la planche passe en RÉSERVE dans l’inventaire des illustrations : une gravure qu’on cesse de poser se déclasse, elle ne s’oublie pas.
- ⛔ LES RÉFÉRENCES DU PASSAGE QU’ON QUITTE S’EFFACENT AUSSITÔT (« quand je change de segment, au moment du chargement, supprimer immédiatement, de façon smooth, les références déjà affichées ; afficher un petit symbole de chargement »).
- ⚠️ La PLACE, elle, reste : retirer la liste du flux ferait sauter le volet au clic, puis sauter de nouveau à l’arrivée.
- ⚠️ Et la marque d’attente ne se pose que là où l’on attend vraiment — le volet de la page Bible va chercher ses liens, celui d’une page d’œuvre les a reçus avec sa tranche de texte et ne montre qu’un fondu.

**§ 38.11 — Le CHAPITRE vient de l’ossature, et la COLONNE se charge seule**

- ⛔ LE NOMBRE DE CHAPITRES VIENT DE L’OSSATURE, jamais d’une table écrite à la main (« le Siracide ne contient qu’un chapitre ; c’est normal ?
- ⚠️ Et elle avait déjà DÉRIVÉ sur ce qu’elle prétendait couvrir : Joël y valait trois chapitres pour quatre, Daniel quatorze pour douze.
- ⛔ UN LIVRE QU’ON NE PEUT PAS OUVRIR NE SE LISTE PAS (« j’ai un Esther (grec) qui s’affiche dans le sommaire : ça doit disparaître »).
- ⚠️ La règle vaut pour tous, non pour celui qu’on a nommé : la Lettre de Jérémie et les douze écrits non canoniques encore à charger s’en vont avec lui, et leur rubrique disparaît faute d’entrées.
- ⛔ Le raisonnement d’avant — « ce sont de vraies œuvres à charger, gardons-leur leur place » — est abandonné : une promesse qui ne s’ouvre pas se lit comme une panne.
- ⛔ CHANGER UNE COLONNE NE RECHARGE PAS LA TABLE (« quand je change de traduction sur une colonne, il ne faut pas tout recharger ; seulement le texte de cette colonne »).
- ⚠️ Elle le DIT, au lieu de se donner pour absente : « Absent de cette traduction » sur une colonne qui charge est un mensonge d’une seconde, et c’est celui que le lecteur retient.
- ⛔ UNE MARQUE D’ATTENTE SE CENTRE SUR LA PART VISIBLE DE SON BLOC — et cette part ne commence pas toujours sous la barre de navigation : la Polyglotte pose au-dessus de son tableau un en-tête collant de soixante-douze pixels, sous lequel rien ne se lit.
- ⚠️ La LARGEUR n’a jamais demandé de réglage : le voile couvre son bloc, et l’anneau s’y centre.
- ⚠️ Et le bloc garde la hauteur du tableau tant que rien n’est chargé, sans quoi l’anneau se centrerait dans une bande de douze rem posée en haut d’un écran vide.
- ⚠️ Les marges d’une colonne s’ouvrent, l’interligne se resserre (« augmenter légèrement les marges, y compris pour le numéro de référence non canonique » ; « resserrer très très légèrement l’interligne »).
- ⛔ Et le numéro d’origine reprend trois pixels contre la réglure, qu’il TOUCHAIT : sa marge négative valait exactement la gouttière.
- ⛔ UN CURSEUR QUI PROMET UNE EXPLICATION DOIT EN AVOIR UNE (« au survol de "Absent de cette traduction" j’ai un curseur avec un point d’interrogation, mais aucun texte ne s’affiche ; ça n’a donc aucun sens »).
- ⚠️ Là où l’infobulle dit vraiment quelque chose de plus — pourquoi une case deutérocanonique est vide —, les deux restent.

**§ 38.13 — Les deux SÉRIES du Budé — l’hommage est discret par sa TAILLE, non par sa pâleur**

- ⛔ L’HOMMAGE EST DISCRET PAR SA TAILLE, NON PAR SA PÂLEUR.
- ⚠️ La règle vaut au delà de ce cas : *délaver une couleur pour la rendre discrète, c’est lui retirer ce qu’on lui demandait de dire.*
- ⛔ ET CE NE SONT PAS DES COULEURS DE PLUS DANS LA PALETTE.
- ⛔ CE SONT DES JETONS À ELLES, non deux jetons de rôle réemployés.
- ⚠️ En Cuir, elles GARDENT leur teinte — ce sont des catégories encodées par la couleur, comme la frise de l’histoire et les catégories de modération, et les rabattre au monochrome effacerait ce qu’elles disent.
- ⛔ LÀ OÙ LA COLLECTION SE TAIT, LA CASE SE TAIT.
- ⚠️ Et un corpus que les DEUX séries se disputent n’en reçoit aucune — les Actes des martyrs anciens portent quinze notices latines et seize grecques, les Apophtegmes deux et trois : les colorer serait mentir.
- ⚠️ La langue se prend sur la PREMIÈRE nommée — le champ étant du texte libre qui porte souvent une chaîne de transmission : « grec ; version latine de Rufin », « grec perdu ; version syriaque conservée ».
- ⛔ On ne cherche pas la langue ailleurs que dans la tête : « ancien français » ne doit pas devenir du latin parce que le mot y paraîtrait plus loin.
- ⚠️ Une information portée par la seule COULEUR n’est lisible que de qui connaît le code — la case porte donc aussi son mot, « Œuvres en latin », « Œuvres en grec ».
- ⛔ ET LA TROISIÈME CASE N’EST PAS UN GRIS VIDE — c’est un VÉLIN (demande de l’auteur, le jour même : « j’aimerais au moins des tons un peu plus nobles, plutôt que ce gris vide »).
- ⚠️ Et le gris n’était pas seulement vide : mesuré, les initiales n’y rendaient que **2,25** de contraste au Clair et 4,09 en Cuir, pour 4,5 exigés à cette taille — le gris de bordure portait l’encre la plus ténue de l’échelle, et cela depuis toujours.
- ⛔ ET SURTOUT PAS LE VERT — essayé et écarté.
- ⚠️ Et un vert PÂLE, pour éviter cela, retombait dans le piège des teintes lavées — ΔE 5,5 de l’ancien gris, on ne l’aurait pas vu.
- ⚠️ LE VÉLIN SE DISTINGUE DES DEUX SÉRIES PAR LA CHROMA, NON PAR LA TEINTE — 15,3 contre 53,8 et 60,9. Une MATIÈRE, non une couleur — et c’est ce qui l’empêche de se lire comme une troisième série, alors même qu’il partage l’axe chaud du safran (84° contre 81°).
- ⛔ La règle vaut au delà de ce cas : *quand on veut marquer sans classer, on baisse la chroma, jamais la lisibilité.* Mesuré : ΔE 25,8 de la carte, contre 8,8 pour l’ancien gris, qui s’y noyait.

**§ 38.14 — Une RÉFÉRENCE emprunte le strut de son texte, et un FILTRE qui ne compte pas ne sert à rien**

- ⛔ CE QUI ALIGNE UNE RÉFÉRENCE SUR SA LIGNE DE TEXTE, C'EST UN RAPPORT, NON UN NOMBRE (relevé de l'auteur, 2026-09-04 : « aligner la référence en marge de gauche avec le texte »).
- ⛔ ET UN RÉGLAGE EN PIXELS NE PEUT PAS COMPENSER UNE DIFFÉRENCE MESURÉE EN REM.
- ⚠️ Le commentaire disait pourtant « à remesurer si l'un des deux corps ou l'interligne change » : *une consigne de remesure est le signe qu'on a posé un nombre là où il fallait poser un rapport.*
- ⚠️ UN BLANC DE LISTE SE MESURE DANS L'ENCRE, NON DANS LES BOÎTES (relevé de l'auteur sur la Bibliothèque : « je devine un déséquilibre ; éloigner un peu la première ligne du titre, et rapprocher les lignes entre elles »).
- ⛔ Le blanc d'après-titre et le blanc d'entre lignes sont donc DEUX mesures, non une.
- ⛔ UN FILTRE DIT CE QU'IL AJOUTERAIT, ou il ne sert à rien.
- ⚠️ Et une facette qui ne rendrait RIEN ne se montre pas — sauf si elle est active : *on ne cache jamais un filtre qui agit*, sans quoi le lecteur ne saurait plus pourquoi sa liste est courte.
- ⛔ La période, seule des trois facettes, ne se dérivait pas des données : ses cinq empans s'affichaient toujours, et l'on pouvait cliquer un siècle que la bibliothèque ne porte pas.
- ⛔ ET UNE FACETTE N'A PAS BESOIN D'UNE COULEUR À ELLE.
- ⚠️ Ce n'est pas contraire au § 38.13 : là, la couleur EST l'information — elle dit la série d'une œuvre, que rien d'autre ne dit ; ici, elle répétait une étiquette déjà écrite.
- ⚠️ Les espaces fines : rien à faire, et c'est mesuré.

**§ 38.15 — Une FICHE dit ce que le LECTEUR peut en faire, jamais ce que l’ATELIER en sait**

- ⛔ UN ÉTAT DE TRAVAIL N’EST PAS UN RENSEIGNEMENT (« VérificationContrôle en cours // ne pas afficher »).
- ⚠️ Conséquence assumée : `statut_corpus_public` et `lacunes_publiques` ne paraissent désormais NULLE PART sur le site.
- ⛔ UN RENVOI À UN ARTICLE NUMÉROTÉ N’EST PAS UNE EXPLICATION (« Conditions d’utilisation, § 6 // supprimer »).
- ⛔ UNE ADRESSE, UN OBJET (« Source numériqueeBible.org / BibleNLP corpus (fra-fraLSG) · Voir la source // remettre en forme pour faire au plus clair »).
- ⚠️ Le nom se rend toujours, lien ou pas : un composant qui ne rend rien sur une adresse malformée emporterait le nom avec elle.
- ⛔ UNE NOTICE NE NOMME AUCUN OBJET DE LA BASE.
- ⛔ ET ELLE NE PORTE PAS DE JOURNAL DE TRAVAIL.
- ⚠️ HIÉRARCHISER, C’EST METTRE EN TÊTE CE QUI SERT LE LECTEUR.
- ⛔ CE QU’UNE RANGÉE DIT DÉJÀ NE SE REDIT PAS.
- ⚠️ RIEN DU FOND N’EST PERDU, et c’est la condition.
- ⚠️ UNE PROSE NE SE COMPOSE PAS COMME UNE ÉTIQUETTE.
- ⛔ Sans justification : la colonne fait environ 314 px, soit quarante-cinq signes par ligne, et le justifié y creuse les blancs que le § 50.2 apprend à fermer.
- ⚠️ ET LA NORME FRANÇAISE SE POSE AU RENDU, ici comme partout.
- ⛔ On n’écrit donc pas de fine dans la donnée : elle resterait la seule table du site à en porter.

**§ 38.16 — Un CHOIX ne s’offre que s’il en est UN**

- ⛔ DEUX MENUS POUR UNE SEULE QUESTION EN FONT UN DE TROP.
- ⚠️ Et celui des œuvres sœurs ne s’était **jamais ouvert** : aucune œuvre publiée ne partage son titre normalisé avec une autre, la seule paire — La Cité de Dieu et son latin de Migne — ayant été dépubliée le 2026-08-26. *Un menu qu’on n’a jamais vu s’ouvrir n’est pas une réserve pour plus tard : c’est une seconde règle qui attend de contredire la première.*
- ⛔ UN INSTANTANÉ DE TRAVAIL N’EST PAS UNE ÉDITION.
- ⚠️ Le défaut était donc invisible depuis un compte de lecteur, et visible depuis le seul compte qui regarde la page tous les jours.
- ⚠️ CE QU’ON LIT PARAÎT TOUJOURS, fût-il à l’atelier.
- ⛔ DEUX EXEMPLAIRES D’UNE MÊME ÉDITION SE FONDENT EN UN.
- ⚠️ L’exemplaire retenu est celui qu’on LIT, sinon celui qui fait défaut, sinon celui qui est publié.
- ⛔ ET LE TRI SE FAIT SUR LA LANGUE, non sur l’original.
- ⚠️ une version qui n’en déclare aucune ne se range sous aucune, et le menu se tait plutôt que de deviner.
- ⚠️ APRÈS QUOI UNE SEULE ŒUVRE DU CORPUS OFFRE ENCORE CE CHOIX — la Consolation de la philosophie, en français, entre Ceriziers 1646 et Mirandol 1861. C’est le résultat attendu et non un effet de bord — le site n’a qu’un texte par langue partout ailleurs.
- ⛔ UN MÊME GESTE SE PRÉSENTE DE LA MÊME FAÇON DES DEUX CÔTÉS DU SITE (même relevé : « mettre à jour la mise en forme de Lecture et Éditions de ce texte pour correspondre à la mise en forme qu’on trouve dans Bible classique »).
- ⚠️ Il n’y a plus qu’une seule définition, et les deux jetons de l’ancienne sont retirés : une forme qu’on garde « au cas où » est une divergence qui attend.
- ⚠️ Un seul écart demeure, et il est motivé — la page Œuvre garde son témoin d’attente au bout de chaque ligne de « Lecture ».
- ⛔ UNE LIGNE DE MENU RÉPOND À UNE SEULE QUESTION — quelle édition je lis —, et rien d’autre (relevé de l’auteur, le soir même : « ne pas afficher les dates de vie et de mort de l’auteur dans l’onglet de choix de la traduction dans le volet gauche »).
- ⚠️ La fiche « À propos de cette édition » est l’endroit d’une notice ; un volet de lecture est l’endroit d’un choix.
- ⚠️ La donnée reste en base — et c’est l’AFFICHAGE qui s’en passe : les dates vivent dans `metadata`, portées par les deux seuls textes du corpus à les avoir.
- ⛔ Mais la fonction qui les lisait est retirée, et la donnée a quitté la SIGNATURE du libellé — *une signature qui ne reçoit plus ce qu’elle ne doit plus afficher est une garde plus sûre qu’un test*, et une fonction que plus rien n’appelle est une seconde vérité qui attend.

**§ 38.18 — La recherche de PÉRICOPES se limite au titre, aux appellations et à la référence**

- ⛔ Une RESSEMBLANCE n’est ni un titre, ni une appellation, ni une référence.
- ⚠️ La ressemblance survit en SECOURS, et là seulement.
- ⛔ Ce qu’une consigne ÉNUMÈRE, on le sert en entier.
- ⛔ Le code d’un livre se comprend CÔTÉ SITE, jamais en SQL.
- ⛔ Un NOM DE LIVRE SEUL n’est pas une référence.

**§ 38.19 — La page des RÉSULTATS — le volet, le mot trouvé, la Polyglotte**

- ⛔ Le dernier volet du site prend la forme des autres.
- ⚠️ Les deux axes qui portent NEUF bibles gardent un menu : neuf lignes ne se posent pas dans un volet, et la règle de l’option par ligne n’a jamais visé que des axes de deux ou trois états.
- ⚠️ Une page de résultats a un TITRE, elle aussi.
- ⛔ Le mot trouvé se marque par la GRAISSE, et par rien d’autre (« ne pas surligner en jaune les termes trouvés ; le gras suffit »).
- ⚠️ La balise reste : elle DIT que le mot répond à la recherche, ce qu’aucune graisse ne dit à qui n’y voit pas ; c’est sa peinture, que le navigateur pose en jaune par défaut, qu’il faut éteindre.
- ⛔ Deux surfaces qui portent les MÊMES noms de classe doivent porter la même composition.
- ⚠️ Un commentaire qui promet une identité ne la maintient pas.

**§ 38.20 — Un mode qu’on n’emploiera jamais se RETIRE, il ne se répare pas**

- ⛔ Trois partis avaient été mis devant l’auteur la veille — après mesure : la barre seule avec l’intitulé au survol, les couloirs plafonnés, ou le retrait du mode.
- ⛔ Et la donnée ne portait pas non plus ce que la barre promettait.
- ⚠️ Le fait est consigné parce qu’il resservira : le jour où l’on reproposera une vue chronologique — ici ou ailleurs —, c’est par lui qu’il faudra commencer.
- ⚠️ Une première rédaction de cette note affirmait que la date de fin était “le plus souvent absente”.

**§ 38.22 — Le panneau de FILTRES — la rubrique en marge, et un filtre qui agit se MONTRE**

- ⛔ UNE RUBRIQUE DE FACETTE SE POSE EN MARGE, ELLE NE COIFFE PAS SON RANG.
- ⛔ Et les pastilles centrées n’offraient AUCUN BORD GAUCHE où l’œil revienne — cinq larges, deux étroites, sept larges, chaque rang ragué des deux côtés.
- ⚠️ Elle se pose sur la LIGNE DE BASE de la première pastille, jamais sur le milieu de sa boîte — deux corps différents centrés l’un sur l’autre font flotter le plus petit au-dessus de la ligne de l’autre.
- ⚠️ Ce rappel ne se double pas du panneau OUVERT, qui montre déjà les mêmes pastilles à l’état actif.
- ⛔ ET LE BOUTON CESSE DE COMPTER CE QUE LES JETONS NOMMENT « ❷ » se lisait à quarante pixels des deux jetons, soit deux comptes de la même chose sur une seule ligne, dont l’un ne dit pas lesquels.
- ⛔ Elle ne paraît PAS quand rien ne restreint : un compte qui ne bouge jamais n’est pas une information (§ 51.5).
- ⚠️ « Tout effacer » se range sous la COLONNE DES PASTILLES — non au bord du panneau : posé au fer à gauche sous trois rangs qui commencent cinq rem plus loin, il ne se rattachait à rien et faisait un objet de plus en bas d’écran.
- ⚠️ La forme de la pastille s’écrit UNE fois — et sert les deux surfaces, celle où l’on choisit et celle où l’on retire : deux définitions d’un même objet divergent au premier réglage.

**§ 38.23 — Des requêtes qui ne s’ATTENDENT pas partent ENSEMBLE**

- ⛔ Une cascade se juge sur les DÉPENDANCES, non sur l’ordre où l’on a écrit les lignes.
- ⚠️ Le plafond de PostgREST est de mille lignes, et il ne se contourne pas — pour 2 499 notices, trois pages sont inévitables.
- ⛔ Une page SPÉCULÉE au-delà de la fin n’est pas gratuite.
- ⛔ ON NE DEMANDE PAS DEUX MILLE CINQ CENTS IDENTIFIANTS POUR EN RAPPORTER TROIS.
- ⚠️ Et elle était plus fragile qu’il n’y paraît — PostgREST renvoie l’adresse ENTIÈRE dans son en-tête de réponse, si bien qu’un client node refuse déjà la réponse pour dépassement d’en-tête.
- ⚠️ Ce que l’audit a démenti, et qui vaut d’être écrit.
- ⚠️ Comment on mesure une liste chargée par le NAVIGATEUR — depuis le poste, en rejouant ses requêtes exactes.

**§ 38.24 — La fiche d’une ŒUVRE porte une FRISE, et un sommaire vide ne paraît pas**

- ⛔ LA FICHE D’UNE ŒUVRE PORTE UNE CHRONOLOGIE, ET C’EST CELLE DE SON AUTEUR.
- ⚠️ La ligne qui nomme l’œuvre lue s’y DÉTACHE — à l’accent et à la graisse — le marqueur de l’entrée active d’un sommaire, et rien de plus.
- ⛔ La chronologie OUVRE la colonne de droite, comme dans la fiche d’une traduction : on situe avant de documenter ; et elle ne paraît pas quand l’auteur n’en a pas.
- ⚠️ Le champ existait et rien ne le lisait.
- ⛔ UN SOMMAIRE QUI N’A RIEN À SOMMER NE PARAÎT PAS.
- ⚠️ La règle porte sur le CONTENU, non sur le mode de lecture — et la distinction n’est pas de forme.
- ⛔ Et l’on ne retire pas le sommaire du mode « texte entier » : **vingt-trois œuvres s’y lisent AVEC le leur**, dont l’Apologétique (52 chapitres) et les Homélies sur la Genèse (68), où il est la seule navigation — c’est même son unique office là, puisque tout est déjà chargé dans la page.
- ⛔ UNE SOURCE NUMÉRIQUE NE DONNE QUE LE NOM DU SITE (« toujours illisible ; se contenter de donner le nom du site »).
- ⛔ Et ce nom n’est PAS l’hôte de l’adresse.
- ⚠️ La coupe se fait sur un séparateur EXPLICITE — le tiret, ou l’incise « , d’après … » —, jamais sur une position ni sur la première virgule : « Gallica, Bibliothèque nationale de France » porte la sienne dans son nom même.

## § 39. La mesure d’audience

**§ 39.2 — Ce que la mesure s’interdit**

- ⛔ L’adresse IP n’est jamais conservée.
- ⛔ Aucune vue n’est rattachée à un compte.
- ⛔ Les termes tapés dans la recherche ne sont pas consignés, ni par le chemin, ni par le référent, dont seul l’hôte est gardé.
- ⛔ Rien n’est transmis à un tiers, et rien ne quitte l’hébergement du site.
- ⛔ Les données sont supprimées au bout de vingt-cinq mois, et cette borne est tenue par un travail périodique en base, non par une intention.
- ⛔ Un compte ADMINISTRATEUR n’est pas compté non plus, où qu’il lise.
- ⚠️ Le compte de démonstration partagé et les invités de la bêta restent comptés — faute d’une décision.

**§ 39.4 — Ce que la maison ne sait pas faire**

- ⛔ Elle ne sait pas dire « visiteurs uniques sur le mois », et ne le dira jamais.
- ⚠️ Elle ne distingue pas une page OUVERTE d’une page LUE — et c’est pourtant le seul signal qui compte vraiment sur une bibliothèque : cent ouvertures quittées en dix secondes ne disent pas ce que disent cent lectures.

## § 40. L’espace du lecteur — ce qui se RÈGLE, ce qui se GAGNE

**§ 40 — L’espace du lecteur — ce qui se RÈGLE, ce qui se GAGNE**

- ⛔ La séparation n’est pas un rangement : Restivo et van de Rijt (PLoS ONE, 2012) ont distribué au hasard des récompenses purement symboliques à des contributeurs de Wikipédia, et mesuré +60 % de productivité, effet encore sensible trois mois après, mais **uniquement chez les déjà très actifs**.
- ⚠️ Trois requêtes de cette page visaient des colonnes qui n’existent pas — `essais.auteur_id`, `essais.cree_le`, `profils.membre_depuis` — et échouaient EN SILENCE, faute de lire `error` : la carte « Publications » était vide en production depuis toujours.

**§ 40.1 — Le PORTRAIT est une référence, jamais une adresse**

- ⛔ On ne retient qu’une RÉFÉRENCE — « auteur:A0010 », « traduction:TR0002 » — et l’adresse se fabrique à la lecture.
- ⚠️ Un traducteur prend son ENCART, jamais son bandeau : le bandeau est couché (§ 37), il ne donnerait dans un rond qu’une bande de ciel.

**§ 40.2 — Le PARCOURS D’ENTRÉE enseigne, il ne paie pas**

- ⚠️ L’effet DISPARAÎT quand l’avance n’est pas justifiée : le motif affiché n’est donc pas une politesse, c’est la condition pour qu’elle porte.
- ⚠️ On annonce le plus petit des deux nombres (Koo et Fishbach) : « 3 sur 10 » tant qu’on est loin, « il vous en reste deux » dès qu’on approche.
- ⛔ Tout se DÉDUIT de la base — rien n’est stocké, donc rien ne peut se désynchroniser.

**§ 40.3 — On ne TRACE rien : ce qui se compte est ce qu’on MARQUE**

- ⛔ On ne trace RIEN (décision de l’auteur, 1er septembre 2026).
- ⚠️ Le choix ne ferme aucune porte : si une vraie mesure de lecture devient nécessaire, on ajoutera la trace et le tableau se nourrira des deux sources.
- ⛔ La carte « Ce que j’ai retenu » est RETIRÉE — le jour même où elle fut écrite (« en l’état, ça ne fonctionnerait pas du tout », mot de l’auteur).
- ⛔ On ne remet pas une seconde vue par-dessus : deux surfaces qui décrivent le même fait divergent au premier réglage, et la seconde finit par faire autorité contre la première.

**§ 40.4 — Les HAUTS FAITS : un TABLEAU DE CASES à collectionner**

- ⛔ La forme est un TABLEAU, jamais une liste en prose (décision de l’auteur, 1er septembre 2026 : « un grand tableau de cases à collectionner, dans différents tons harmonieux »).
- ⛔ Aucun degré n’ouvre de droit, d’accès ni de fonction : un haut fait est un nom, pas une monnaie.
- ⛔ La page met en avant la série dont le degré suivant est le PLUS PROCHE — jamais le degré supérieur de celle qu’on vient d’achever.
- ⚠️ Le remède n’est PAS un palier lointain : le gradient de Kivetz est nul à distance jugée infinie, et un degré hors de portée masque la clôture au lieu de l’éviter.
- ⚠️ Les paliers extrêmes vont sur la LECTURE, jamais sur la production.
- ⛔ Les seuils et les notices vivent en BASE, jamais dans le code — c’est la condition pour les recalibrer après l’ouverture, sur la distribution réelle.
- ⛔ Une obtention ne se REPREND jamais — même si le compteur redescend : une perte démotive plus qu’un gain ne motive.
- ⛔ UNE CASE NON VALIDÉE EST SOBRE ET LAIDE — et c’est le mot de l’auteur.
- ⚠️ Le compte se BORNE à son seuil : une case gagnée n’affiche jamais « 143 / 100 », qui ferait du dépassement un accomplissement de plus.
- ⛔ Le ton dit DE QUOI la case est faite, jamais sa rareté : une couleur qui encoderait la difficulté ferait un second classement par-dessus les points.
- ⛔ Les POINTS disent la difficulté, ils ne s’échangent contre rien.
- ⚠️ Ce n’est pas une monnaie, et ce n’en deviendra pas une : le § 40.6 le tranche, et un point qui ouvrirait un droit rendrait TANGIBLE une récompense qui doit rester informationnelle (Deci, Koestner et Ryan, 1999).
- ⛔ La NOTICE ne se lit qu’une fois la case gagnée.

**§ 40.4.1 — Les ANNONCES : deux formes, et l’on n’annonce pas chaque pas**

- ⛔ DEUX PALIERS PAR CASE AU PLUS — la moitié du chemin, puis le dernier pas — et jamais deux fois le même.
- ⚠️ Sous un seuil de quatre, la moitié ne s’annonce pas : « 2 sur 4 » n’est pas une nouvelle.
- ⛔ On retient AVANT de montrer, sans quoi une annonce interrompue — page fermée, onglet changé — reviendrait à chaque chargement.
- ⛔ La vérification ne part pas à chaque page tournée — une fois par session, puis sur le GESTE d’un lecteur.
- ⚠️ Le RETRAIT d’un favori ne signale rien : aucune case ne recule, une obtention étant acquise pour de bon.

**§ 40.5 — Le RANG mesure la lecture, non la conversation**

- ⚠️ La modération existe : ce qui se compte encore ne compte que le VALIDÉ.
- ⚠️ SIX degrés et non trois — Catéchumène, Auditeur, Disciple, Familier, Lettré, Docteur.
- ⛔ Aucun n’emprunte aux ordres sacrés — ce sont des états d’étude, non des degrés de cléricature.
- ⛔ Le remplacement se fait PARTOUT d’un coup — commentaires publics compris : deux rangs concurrents sur deux pages voisines ne diraient plus rien ni l’un ni l’autre.

**§ 40.6 — Ce que la gratification doit être**

- ⛔ Elle est INTELLECTUELLE, jamais une monnaie (décision de l’auteur, 1er septembre 2026).
- ⚠️ Sailer et Homner (2020) mesurent des effets réels mais modestes de la ludification (g = 0,49 sur le cognitif, 0,36 sur le motivationnel, 0,25 sur le comportemental), et les deux éléments qui ressortent sont la FICTION — l’univers narratif — et l’association de l’émulation et de la collaboration.

**§ 40.7 — La MARQUE DE MÉCÈNE : une gratitude, jamais un grade**

- ⛔ ELLE N’EST PAS UN HAUT FAIT, et elle n’entrera jamais dans le tableau (décision de l’auteur, 3 septembre 2026).
- ⛔ Elle n’ouvre NI DROIT, NI ACCÈS, NI FONCTION.
- ⛔ IL N’Y A QU’UN SEUL SIGNE, et il ne se gradue pas.
- ⚠️ Corollaire, et c’est ce qui rend la règle tenable : **AUCUN MONTANT N’EST JAMAIS CONSERVÉ.** PayPal tient ce livre-là ; le site ne retient que le FAIT du don.
- ⚠️ Elle n’est NOMMÉE en toutes lettres qu’à un seul endroit, sur la page de profil, sous le millésime : « Lecteur depuis 2026 · Mécène depuis 2026 ».
- ⚠️ Elle prend l’encre de la surface qui la porte.
- ⚠️ Le lecteur peut la retirer (`pub_mecene`), comme il retire son rang ou ses favoris.
- ⛔ Elle ne s’écrit pas depuis un navigateur : la politique RLS borne la LIGNE qu’un lecteur modifie, jamais la VALEUR qu’il y écrit, si bien qu’un lecteur se décernerait la marque par un simple `update` sur sa propre ligne.
- ⚠️ Le rattachement se fait À LA MAIN, et c’est un choix.
- ⚠️ Le donateur dont l’adresse de paiement diffère de celle de son compte est INTROUVABLE — et il faut donc le lui dire : la page « Soutenir » l’invite à se signaler par la page de contact.
- ⛔ Ce mot vient APRÈS le bouton, en petit, et jamais avant : une page qui annonce sa récompense avant son objet vend un badge au lieu de demander un soutien, et Deci, Koestner et Ryan (1999) mesurent que la récompense attendue mine le geste même qu’elle prétend soutenir.
- ⚠️ LE DON S’INSCRIT SEUL (décision de l’auteur, 3 septembre 2026 : « ce serait plus simple si c’était automatique »).
- ⛔ L’automatique ne supprime pas ce cas, il le réduit à un résidu.
- ⛔ UNE NOTIFICATION SE VÉRIFIE AVANT D’ÊTRE CRUE.
- ⚠️ Et l’on ne va pas chercher le certificat soi-même : son adresse vient de la requête, donc de qui l’envoie, et une vérification qui suit une adresse fournie par celui qu’elle contrôle ne contrôle rien.
- ⛔ SEUL UN PAIEMENT ENCAISSÉ fait un don.
- ⛔ Mais on ne crie pas à la panne sur un silence, une alerte qui se trompe cessant d’être lue : on dit ce qu’on sait, et l’auteur juge.
- ⛔ UN REMBOURSEMENT NE RETIRE PAS LA MARQUE — et ce n’est pas un oubli : une gratitude constatée ne se reprend pas par un automate.
- ⛔ LA VOIE EST L’IPN, ET NON LE WEBHOOK (constaté le 3 septembre 2026).
- ⛔ Le webhook reste écrit et dort : le jour où le compte changerait de nature, il n’y aurait rien à réécrire.
- ⚠️ PayPal donne l’IPN pour ancien et le retirera un jour.

**§ 40.8 — La SIGNATURE d’une publication : un pseudonyme, un nom, ou rien**

- ⛔ La résolution du nom vit en UN seul endroit, `app/lib/signatureEssai.ts` : la liste, la page, l’administration et le PDF l’appellent, aucun ne la recopie.
- ⛔ Anonyme veut dire que RIEN, nulle part, ne relie la publication au compte.
- ⛔ Un booléen en base n’aurait rien caché.
- ⚠️ La base étant partagée, la fermeture de la table s’applique APRÈS le déploiement du site sur la vue, en seconde migration (`20260903230000`).
- ⚠️ Quatre défauts trouvés en chemin, réparés le même jour.

**§ 40.9 — LA CHAÎNE DU LECTEUR — ce qu’il a écrit, rangé dans l’ordre du canon**

- ⛔ C’EST UNE TROISIÈME NATURE, ET C’EST À CE TITRE SEULEMENT QU’ELLE A UNE PAGE.
- ⚠️ Elle ne découpe donc pas les deux premières, et rien n’en est retiré.
- ⛔ LA FORME EST CELLE D’UNE CHAÎNE, non celle d’un journal.
- ⛔ RIEN NE SÉPARE DEUX ENTRÉES QU’UN BLANC — ni filet, ni fond, ni carte.
- ⚠️ CE QUI ATTEND LA MODÉRATION LE DIT — du même mot que le panneau de la Bible : « en révision ».
- ⛔ UN IDENTIFIANT QUI NE DÉSIGNE PLUS RIEN NE SE PERD PAS.

**§ 40.10 — L’ESPACE SE PARCOURT EN COLONNE, et « Mes citations » y entre**

- ⛔ CE QU’ON RETIENT EST DE LA MÊME NATURE QUE CE QU’ON ÉCRIT — et se visite à la même heure.
- ⚠️ CE QUI RESTE À LA PAGE — ses deux onglets de corpus, ses groupes repliables, sa gouttière d’actions, sa citation favorite et son filet à quadrilobe — l’emblème qui enseigne la marque qu’on retrouve dans la liste (§ 34.2).
- ⛔ LES PAGES DE L’ESPACE SE LISENT EN COLONNE, une par ligne, DEPUIS QU’ELLES SONT QUATRE.
- ⚠️ Une barre d’onglets sur deux rangées n’est plus une barre mais une grille — la sous-barre de l’administration a tranché ce cas le 2026-08-22, et l’on ne rouvre pas un arbitrage rendu.
- ⚠️ LE SOMMAIRE PORTE CE QUE L’ONGLET COURANT MONTRE — les livres d’un côté, les auteurs de l’autre.
- ⛔ Et sauter à un groupe le DÉPLIE : une ancre qui mènerait à un titre fermé ne montrerait rien.
- ⛔ L’ANCIENNE ADRESSE REDIRIGE EN 308, jamais en 307 — le déplacement est définitif, et seul le permanent transmet les signaux.
- ⚠️ La rubrique d’audience `prelevements` est gardée pour l’HISTORIQUE : les vues d’avant ce jour la portent encore.
- ⚠️ CE QUI RESTE OUVERT — la barre d’onglets INTERNE de la page (« Versets bibliques » / « Textes patristiques ») est encore composée en styles en ligne, alors que le site a un modèle unique depuis le 2026-08-28 (`OngletsPage`, § 36).

**§ 40.11 — LA GRAMMAIRE DE L’ESPACE — un rang, une forme, et le vert ne dit qu’une chose**

- ⛔ TROIS OBJETS PORTAIENT LE MÊME VERT — sur une seule page : le titre du livre, la référence du verset et la marque de la glose.
- ⛔ LA RÉFÉRENCE ÉTAIT CE QU’ON LISAIT LE MOINS.
- ⛔ ET LE MÊME CORPUS SE COMPOSAIT DANS DEUX POLICES — les citations en sans sur une page, les lemmes en sérif sur l’autre.
- ⛔ Jamais une bande à capitales espacées, qui est le vocabulaire d’une interface ;
- ⚠️ Réunies, précisément : la date pendait sous chaque texte et hachait la colonne en deux fois plus de blocs qu’il n’y avait de gloses ;
- ⚠️ une glose qui se RÉPÈTE n’est pas une rubrique.
- ⚠️ Un ornement CENTRÉ reste légitime (§ 3.11.5), mais alors il tient toute la mesure : centré sur treize rem au milieu de huit cents pixels, il ne sépare rien.

**§ 40.12 — MA PAGE — ce que le lecteur donne à voir de lui**

- ⛔ ELLE MONTRE LES DEUX CORPUS, ou elle ment sur ce qu’est ce site.
- ⛔ Ni deux sections, ni deux couleurs de manchette : la nature d’un passage se lit dans sa référence, elle n’a pas à être annoncée deux fois.
- ⚠️ Chaque passage RAMÈNE à sa source, quand elle est ouverte au visiteur — le chapitre pour un verset, l’œuvre au bon segment pour un Père.
- ⛔ LA CITATION D’HONNEUR NE SE RÉPÈTE PAS dans la liste.
- ⛔ ET LE TITRE D’UNE ŒUVRE RETIRÉE DE LA LECTURE N’Y PARAÎT PAS.
- ⚠️ L’interrupteur du compte nomme ce qu’il GOUVERNE — non ce qu’il gouvernait : « Citations retenues », et non plus « Versets enregistrés ».
- ⛔ La COLONNE, elle, garde son nom (`pub_favoris_versets`) : le déclencheur `profils_garde_colonnes` la nomme aussi, et un renommage se paierait des deux côtés pour un mot d’écran.
- ⛔ L’EN-TÊTE EST UN APLAT, ET IL SE RETOURNAIT EN CUIR — cinquième fois.
- ⚠️ Et son revers, qu’on ne voit qu’une fois le sol rétabli — sur un fond redevenu sombre, les encres de la carte s’inversent à leur tour — le pseudonyme en `--cs-fond-doux` rendait **1,16**.
- ⚠️ La charte réservait cette famille au panneau mobile ; elle vaut pour tout aplat qui ne suit pas le sol de la page.
- ⚠️ La RÉFÉRENCE d’une citation porte SEULE l’identité du passage — donc le seuil de 4,5 s’applique — la même règle qu’au § 40.11, sur une autre page et un autre gris : elle rendait 3,57 à 13 px en `--cs-texte-gris`, elle en rend 5,9 en `--cs-texte-second`.
- ⛔ L’ÉTIQUETTE de section, elle, garde `--cs-etiquette` : une rubrique EST faite pour s’effacer, et confondre les deux cas ferait remonter tout ce que le site a calibré pour se taire.

## § 42. L’outil bibliographique — la page « Bibliographie »

**§ 42.1 — Ce qu’elle montre, et ce qu’elle tait**

- ⛔ Elle ne montre que ce que le § 29.1 permet de montrer — les ouvrages dont le statut scientifique calculé est `retenu` ou `secondaire`.
- ⚠️ Au 6 septembre 2026, 588 ouvrages sur 958 sont dans ce cas ; les 162 sources primaires du catalogue sont toutes `a_verifier` et n’y paraissent donc pas — c’est une dette de qualification, non un choix de l’outil, et elle se règle dans la donnée.
- ⛔ Rien n’y dit le RANG d’un ouvrage — ni score, ni le mot « secondaire », ni motif, ni réserve, ni note d’administration.

**§ 42.2 — Une surface du moteur**

- ⛔ L’OUTIL BIBLIOGRAPHIQUE EST UNE SURFACE DU MOTEUR, NON UN MOTEUR DE PLUS.

**§ 42.3 — Le volet**

- ⛔ Pas de barre d’onglets : le seul partage naturel — par genre — redirait un filtre, ce que le § 36 proscrit.

**§ 42.4 — Le chargement**

- ⚠️ Ce que l’outil ne fait pas encore, et pourquoi.

## § 43. La recherche — une seule normalisation, un mot ou plusieurs, trois modes

**§ 43.1 — Ce que l’audit a trouvé**

- ⛔ La Bible n’était ni normalisée ni indexée.
- ⛔ Deux mots ne se cherchaient pas comme un seul.
- ⛔ La page rejetait ce que la base avait rendu.

**§ 43.2 — La règle**

- ⛔ LA RECHERCHE LIT LE TEXTE QUE LA BASE A NORMALISÉ, ET RIEN D’AUTRE.
- ⛔ Un mot ou plusieurs se cherchent de la MÊME façon — par trois RPC qui reçoivent un tableau de termes et un mode — `recherche_versets_v2`, `recherche_segments_v2`, `recherche_segments_original_v2`.
- ⚠️ En ce mode, la page MARQUE dans le texte les RACINES que la base rend (`lexemes_recherche`), non les termes tapés, la racine française étant le commencement du mot fléchi dans l’immense majorité des cas ; et elle ne rejette rien de ce que la base a rendu.
- ⛔ La frontière de mot que la page relit est celle de la base — tout ce qui n’est ni lettre ni chiffre.
- ⛔ LA RELECTURE DE LA PAGE REPREND LA NORMALISATION DE LA BASE, règle par règle.
- ⚠️ Seules les règles qui GARDENT LA LONGUEUR du mot y entrent : le marquage retrouve ses positions dans le texte d’origine par leur index dans le texte replié, et une substitution qui allonge ou raccourcit — « tems » → « temps », « enfans » → « enfants », « sçav » → « sav » — décalerait tout ce qui suit.
- ⚠️ En famille, la marque couvre le mot fléchi entier « aimait », non « aim ».
- ⛔ Une référence chiffrée S’OUVRE, elle ne se cherche pas.

**§ 43.4 — La page pagine et compte en base (2026-09-06)**

- ⛔ LA BASE COMPTE, LA BASE PAGINE ; LA PAGE MONTRE.
- ⛔ La page ne rejette rien de ce que la base rend.
- ⚠️ Le texte original rejoint la recherche des passages — un passage répond en français, en latin ou en grec, ou dans les deux, dans une seule liste et un seul ordre.
- ⚠️ Trouvaille, qui vaut pour toute recherche écrite en base : un motif passé en paramètre à une fonction se planifie à l’aveugle.
- ⚠️ Seconde trouvaille, le soir même : UNE POLITIQUE DE LECTURE CHANGE LE PLAN.
- ⚠️ Un alias masqué qui répond se dit (complément du § 38.18).

**§ 43.5 — LA RECHERCHE EST TRILINGUE, et sa normalisation effaçait le grec**

- ⛔ La Septante n'était donc PAS cherchable, et rien ne le disait.
- ⚠️ Le commentaire de `recherche_segments_v2_corresp` le décrivait déjà sans le nommer —
- ⛔ ON NE TOUCHE AU CŒUR DE LA RECHERCHE QU'APRÈS AVOIR MESURÉ SUR TOUT LE CORPUS
- ⚠️ Et la relecture de la page suit la même règle

**§ 43.6 — Le LEXIQUE GREC répond à une saisie latine, et il le faut**

- ⛔ Un lexique grec qui n'accepte que le grec ne sert qu'à qui a un clavier grec.
- ⚠️ La clé latine est une RÉDUCTION, non une translittération savante
- ⛔ Le lexique DÉRIVE du corpus et ne se corrige pas à la main
- ⛔ Et le motif d'une suggestion entre en CONSTANTE

## § 44. L'ATTESTATION D'UN NOM DE PÉRICOPE

**§ 44 — L'ATTESTATION D'UN NOM DE PÉRICOPE**

- ⛔ ON NE PUBLIE QUE LES SOURCES EXTERNES.
- ⚠️ Corollaire MESURÉ, et il commande le titre de la rubrique
- ⛔ Le vocabulaire est CLOS, et une valeur qu'on ne sait pas nommer ne se compose pas
- ⛔ Un nom que rien d'externe n'atteste ne PARAÎT PAS dans la rubrique.
- ⛔ La référence se compose par le MOTEUR bibliographique
- ⚠️ Le registre ne porte pas de lieu d'édition : la notice n'en invente pas.

## § 45. LA FRISE — ce que sa vue lui tendait

**§ 45 — LA FRISE — ce que sa vue lui tendait**

- ⛔ LE CLASSEMENT EST ÉDITORIAL, il ne se calcule plus dans le client.
- ⚠️ Un paramètre d'adresse qui change de nom continue
- ⛔ UNE LISTE DE FILTRES SE RANGE PAR EFFECTIF, non par alphabet
- ⚠️ L'ordre est celui de l'ÉDITEUR, non la date : une série fait
- ⛔ UN GRAPHE SE REND EN PHRASES, jamais en réseau.
- ⚠️ Une relation se range aux DEUX bouts, et le sens entrant se
- ⛔ UN SÉPARATEUR DE PÉRIODE SE POSE AU CHANGEMENT DANS LA LISTE RENDUE
- ⛔ UN LIEN QUI MÈNE À CE QUE LES FILTRES ÉCARTENT NE PEUT PAS NE RIEN FAIRE.
- ⚠️ La cible attend dans une référence : la liste n'est pas encore rendue au
- ⚠️ Élargir un TYPE ne coûte rien quand les colonnes voyagent déjà

## § 46. LA VISITE — ce qu’une page montre d’elle-même à la première ouverture

**§ 46 — LA VISITE — ce qu’une page montre d’elle-même à la première ouverture**

- ⛔ Ni « tutoriel », ni « fonctionnalités », ni « comment utiliser le site » : les deux premiers sont des mots de logiciel, le troisième annonce une difficulté avant d’avoir rien montré.
- ⛔ La case du sujet n’est pas un cadre posé sur un voile : elle EST le voile, tenu à distance par une ombre portée.
- ⚠️ Le piège est de BORNER la position au lieu de changer de côté : ramener la case dans l’écran quand la place manque ne fait pas de place, cela la couche sur le sujet.
- ⛔ ET SUR UN TÉLÉPHONE, ON FAIT DE LA PLACE AVANT DE PLACER.
- ⚠️ Mesuré le 7 septembre 2026, avec la vraie géométrie et des hauteurs de case relevées dans le navigateur : sur les cinq téléphones et les cinq tailles de sujet qu’on rencontre, la case RECOUVRAIT son sujet 210 fois sur 450, et le trait tombait avec elle — 59 % sur un iPhone SE dont le navigateur montre ses barres.
- ⚠️ On préfère le dessous parce qu’on lit de haut en bas : le sujet d’abord, ce qu’on en dit ensuite.
- ⛔ LE PIED D’UNE CASE EST UN CHEMIN DE LECTURE, et ses boutons se touchent.
- ⚠️ L’axe est la CAPACITÉ DU POINTEUR, jamais la largeur : une fenêtre étroite sur un ordinateur garde sa souris.
- ⚠️ LA BANDE UTILE SUIT LA FENÊTRE VISIBLE, non celle de la mise en page.
- ⚠️ CE QUI SE MESURE NE SE SUPPOSE PAS, et une case ne se mesure pas dans la page.
- ⛔ Refuser la visite doit être aussi simple que la commencer, et se voir aussi bien.
- ⛔ Une visite se lit debout, entre deux clics, et ce qui demande un développement n’est pas une explication mais un mode d’emploi, qui ne se lit pas non plus.
- ⚠️ QUATRE quand l’arrêt présente un axe qui a quatre états, et pas autrement : le « Modes » de la recherche nomme les trois façons de chercher, puis dit où leur explication se trouve.
- ⛔ LE REGISTRE EST CELUI D’UN MANUEL (reprise de l’auteur, 7 septembre 2026).
- ⛔ Et la visite ne se présente pas elle-même.
- ⚠️ UN NOM DE COMMANDE SE COMPOSE EN GRAS — par la syntaxe du site : « **Classique** », « **Livre entier** », « **Famille de mots** », « **Catalogue des traductions** ».
- ⛔ Le texte d’une visite est donc RENDU par le renderer du site — celui qui sert déjà la fiche d’auteur, la bulle d’une note et le volet d’un essai —, jamais posé tel quel : écrit sans lui, l’astérisque s’imprimerait.
- ⚠️ La typographie se pose au même endroit, comme partout ailleurs (§ 3.2) : le scénario s’écrit au clavier, et la fine insécable de « Jean 3, 16 » vient au rendu.
- ⛔ Jamais un sélecteur de structure — « le troisième bloc du volet » — : il se casse au premier remaniement, sans que rien ne le signale, et le lecteur reçoit alors une case posée sur du vide.
- ⛔ Et jamais une copie du sujet dans un calque : elle vieillirait à part de l’original qu’elle copie.
- ⛔ elle ne promet jamais ce qu’elle ne montrera pas.
- ⚠️ Le passage se retient dans le navigateur, non dans le compte : la visite s’adresse d’abord à qui n’en a pas.
- ⛔ LE BOUTON QUI LA REJOUE EST AU LECTEUR, et il paraît pour tout le monde.
- ⚠️ Sa place est donc parmi les outils du lecteur, et non dans le bloc d’administration où il est né.
- ⛔ Il ne paraît QUE là où une page en offre une : un contrôle sans effet sur les trois quarts du site serait une promesse en l’air.
- ⚠️ Les colonnes se prennent l’une après l’autre, jamais par bandes horizontales : mesuré sur la page servie, la carte de l’édition, l’en-tête du texte et le volet des Pères ouvrent tous trois leur colonne à la même hauteur, et les ranger par ordonnée ferait sauter le regard d’un bord de l’écran à l’autre trois fois de suite.
- ⛔ UNE VISITE NE S’OUVRE QUE LÀ OÙ SA PAGE PEUT LA PORTER.
- ⚠️ Le volet se descend dans l’ordre où il se VOIT, et c’est la règle d’ordre appliquée : mesuré sur la page servie, le bloc des traductions visibles ouvre le volet à 154 px du haut, le champ de recherche vient à 308, la liste des livres à 354.
- ⛔ Elle ne dit rien des versets surnuméraires, et c’est un arbitrage : ils ne paraissent que sur une minorité de chapitres, et une étape qui s’efface coûte à tout le monde l’attente qu’il faut pour constater son absence.
- ⚠️ Un même champ ne se présente pas deux fois de la même façon.
- ⚠️ Les deux premières entrées de lecture portent DEUX flèches, l’onglet et la carte du milieu de page.
- ⛔ Rien sur Administration, qui ne paraît qu’à l’auteur du site ; rien sur la marque, qui ramène à l’accueil où l’on est déjà.
- ⚠️ Elle ne s’ouvre qu’en écran large : sous le seuil du menu déroulant la barre n’est qu’un bouton, et l’ouvrir couvrirait les cartes que la visite désigne.
- ⚠️ UN ARRÊT NE RÉPÈTE PAS UNE INFOBULLE, il dit qu’elle existe.
- ⛔ RIEN SUR CE QUI N’EXISTE QUE DANS UN CAS.
- ⛔ UNE PAGE DOIT PORTER DE QUOI DONNER SA VISITE, non seulement être prête.
- ⛔ Et l’on ne tape PAS à la place du lecteur pour se donner une visite : elle montre la page telle qu’il l’a ouverte, ou elle ne se montre pas.
- ⛔ Jamais par bandes horizontales — les trois colonnes ouvrent toutes à la même hauteur, et les ranger par ordonnée ferait sauter le regard d’un bord de l’écran à l’autre à chaque arrêt.
- ⚠️ DEUX ARRÊTS SUR SEPT DISPARAISSENT D’EUX-MÊMES, et c’est voulu.
- ⛔ C’est aussi ce qui interdit d’écrire une visite qui promettrait ce que toutes les œuvres ne portent pas.
- ⛔ ON NE MONTRE PAS DEUX FOIS LA MÊME ACTION.
- ⛔ UNE VISITE NE S’OUVRE PAS SUR UNE PAGE QU’ELLE NE DÉCRIT PAS.
- ⛔ Elle dit ce qu’aucune page voisine ne dit — que la liste ne porte QUE les auteurs dont une œuvre est en ligne, que le catalogue en recense bien d’autres qui ne le sont pas, et que l’étoile d’une ligne d’édition remplit l’onglet Favoris.
- ⛔ UN PLI IMPOSÉ NE SE REFERME PAS D’UNE ÉTAPE À L’AUTRE quand la suivante vit dedans.
- ⚠️ Et il s’IMPOSE sans se POSER : l’état du lecteur reste dessous, intact, et reparaît de lui-même — c’est la même règle que la colonne des notes de la Polyglotte, prise par l’autre bout.
- ⛔ UNE VISITE MONTRE LA PAGE QU’ON VIENT D’OUVRIR, et la barre de navigation n’est d’aucune page en particulier.
- ⚠️ L’ACCUEIL EST L’EXCEPTION, ET IL LA CONFIRME.
- ⛔ La case explicative, elle, garde sa réserve : elle explique la barre, elle ne la couvre pas.
- ⛔ DEUX SUJETS PAR ÉTAPE AU PLUS, et le second ORNE l’étape sans la commander.
- ⛔ Deux, jamais trois : au delà, le voile devient une dentelle et l’on ne sait plus ce que la case explique.
- ⚠️ Le voile n’est plus une OMBRE PORTÉE, et il ne pouvait pas le rester.
- ⛔ La règle ne change pas pour autant : un seul tracé fait l’assombrissement ET la découpe, et les deux ne peuvent pas se désaccorder.
- ⚠️ Ce qui se sépare est le FILET d’or, qui se pose par-dessus ; il se calcule des mêmes mesures, dans le même rendu.
- ⚠️ Ce qu’une étape sur la barre coûterait, si l’on y revenait.
- ⛔ Les trois sont retirées avec l’étape : on ne garde pas une garde que plus rien n’exerce.
- ⛔ ON N’EXPLIQUE PAS CE QUI S’ÉCRIT DÉJÀ.
- ⚠️ Elle coûtait en outre la descente de toute la liste pour remonter ensuite, le plus long défilement qu’une visite du site ait demandé.

## § 47. La notice bibliographique — composition, autorités et rendu

**§ 47.0 — Une note bibliographique se compose en liste**

- ⛔ Ni puce, ni tiret, ni boîte, ni fond, ni bordure, et aucune indentation qui doublerait celle de la liste.

**§ 47.1 — Normalisation bibliographique des notices**

- ⚠️ Décision de l’auteur du 28 août 2026, qui remplace le deux-points prescrit le matin même, lequel remplaçait la virgule :
- ⛔ ni virgule, ni deux-points, ni l’espace insécable qui précédait celui-ci.
- ⚠️ Un titre qui se ferme DÉJÀ sur une ponctuation forte n’en reçoit pas une seconde, sa ponctuation attestée détachant à elle seule : `*Où en est la question biblique ? Réponse à quelques objections*`.
- ⚠️ non l’ordre d’affichage, qui se calcule : § 47.3), `ouvrages_bibliographiques` le titre, le sous-titre, le lieu et l’année, `ouvrage_contributeurs_scientifiques` et `auteurs_valeur` l’auteur normalisé, `editeurs_valeur` l’éditeur normalisé.
- ⛔ On ne découpe jamais une notice précomposée pour en retrouver les parties, et l’ancien texte de lecture des blocs matériels cesse d’être la source de l’affichage : il demeure en base pour la provenance et le témoin source.
- ⛔ La ponctuation est produite par le rendu à partir des champs présents ; elle n’est pas stockée dans la donnée, et un champ absent emporte son séparateur.
- ⛔ Une ligne qui désigne une traduction, une édition, une monographie, un article, un commentaire, une source primaire ou tout autre ouvrage cité ne reste jamais une simple chaîne de paratexte.
- ⛔ on ne crée jamais un doublon parce que la casse, la ponctuation, l’abréviation ou l’ordre des éléments diffèrent dans le témoin.
- ⛔ on ne complète jamais une notice par conjecture.
- ⛔ elle ne reste pas en `type_unite = 'paratexte'` générique si ses lignes sont des notices d’éditions ou de traductions.
- ⛔ Les petites capitales viennent de la donnée structurée — `auteurs_valeur.prenom` et `auteurs_valeur.nom_famille` —, jamais d’une transformation heuristique de la chaîne affichée : une autorité que ce couple ne décrit pas ne se coupe pas à la première espace, elle se compose entière.
- ⛔ La description MATÉRIELLE ne s’affiche pas dans une liste d’ouvrages — le format (`in-8°`, `in-4°`), le nombre de pages, la pagination romaine ou arabe, le nombre de planches, les figures et les dimensions sont des données de description, conservées dans la notice, et ne paraissent pas au lecteur.
- ⚠️ Le retrait suspendu remplace le retrait de première ligne prescrit jusque-là (décision de l’auteur du 28 août 2026).

**§ 47.2 — Un seul style bibliographique, et il vient de la donnée**

- ⛔ Le genre ne se lit jamais dans le texte du titre.
- ⛔ Aucun style ne prend le nom d’une pièce, d’une édition ni d’un auteur — ni `du-meme-auteur`, ni `bibliographie-fillion`, ni `bibliographie-genese`.
- ⛔ Il ne reçoit pas le style `bibliographie`, réservé aux notices placées dessous.
- ⛔ La ponctuation n’a aucun style propre — elle appartient à la séquence où elle tombe et en hérite — le point qui joint le titre au sous-titre reste ainsi dans l’italique du titre.
- ⛔ jamais un bloc artificiellement étroit.
- ⛔ Aucun fond, aucune bordure, aucune puce, aucun tiret ajouté par la feuille : la ponctuation et les séparateurs sont produits à partir des champs structurés, jamais par le style.
- ⛔ il ne disparaît pas, et le corps ne rapetisse pas davantage : la hiérarchie bibliographique tient à l’un et à l’autre.
- ⛔ Ce repli n’est pas une source d’affichage public et ne permet jamais de déclarer la pièce conforme.

**§ 47.3 — L’ordre d’une bibliographie se CALCULE**

- ⛔ Une œuvre anonyme ne fait pas un bloc à part, ni en tête ni en queue : elle se range à son titre, dans la même suite alphabétique, comme un catalogue le fait.
- ⛔ L’article ne se retire jamais d’un nom d’autorité : « La Taille » est un nom, non un titre précédé d’un article.
- ⚠️ La particule « de » ne classe pas (décision de l’auteur, 12 septembre 2026) : c’est l’usage des catalogues français, et « Alfred de Musset » se range à Musset, « Joseph Pitton de Tournefort » à Tournefort, « Albert de Broglie » à Broglie.
- ⛔ Elle seule est rejetée, et seulement en tête : « La », « Le », « Du », « Des », « Van », « Von », « Della » restent avec le nom, et « de La Tour » se range à « La Tour », non à « Tour ».
- ⛔ Le nom AFFICHÉ, lui, garde sa particule, qui prend les petites capitales avec le nom (§ 29).
- ⛔ Le retrait ne vaut QUE pour le classement : le titre affiché garde son article, toujours.
- ⛔ Un titre qui n’est QUE son article se range sous lui, faute de quoi sa clé serait vide.
- ⛔ Le latin n’a pas d’article, et il est ici partout.
- ⛔ Le catalogue, qui ne vient d’aucun volume, garde le départage par le titre, puis le sous-titre, puis l’année : sans lui, les œuvres d’un même auteur s’y rangeraient dans l’ordre où la base les a créées.
- ⚠️ `display_order` demeure dans la donnée comme témoin du volume ;

**§ 47.4 — Catalogue bibliographique obligatoire et autorités d’éditeurs**

- ⛔ Une forme source ne peut rester invisible au seul motif qu’elle n’a pas encore été normalisée : elle doit apparaître dans la rubrique d’administration afin de pouvoir être contrôlée, fusionnée, conservée comme variante ou exclue.
- ⛔ elle ne peut pas figurer en même temps dans la liste des éditeurs normalisés.
- ⛔ On ne se contente jamais de FILTRER l’affichage, les références resteraient accrochées à une entrée devenue fantôme.
- ⛔ Et l’on ne réécrit pas pour autant la donnée source (`oeuvres.editeur`, `ouvrages_bibliographiques.editeur`, `catalogue_notices.editeur`), qui est la provenance.
- ⚠️ Le verrou est en BASE et non dans l’écran de saisie : une graphie qui remonterait en autorité par un script ou par une requête doit échouer là aussi.
- ⛔ elle n’en crée aucune, ouvrir une autorité bibliographique étant un geste éditorial et non l’effet second d’un enregistrement.
- ⛔ Une telle forme n’est donc pas une autorité et n’a pas sa place dans la liste des éditeurs normalisés.
- ⚠️ Une partie qui n’est pas une maison — une mention de diffusion, d’impression ou de réédition — se retire de la forme AVANT de la séparer : elle ne devient pas une autorité, et l’on aurait remplacé une fiche parasite par une autre.
- ⚠️ Une VARIANTE composée demeure licite, et la distinction porte : « Veuve Jean Camusat ; Pierre Le Petit » est une graphie d’une maison UNIQUE, dont l’enseigne associe deux noms ; le verrou ne regarde donc que le nom.
- ⚠️ La barre, elle, ne sépare rien : elle appartient à de vrais noms de maison — « Centre Thomas More / CADIR », « Leuven University Press / Peeters » — et ne décide de rien.

**§ 47.5 — UN moteur de rendu bibliographique, et la base est la source**

- ⛔ Un seul moteur pour toutes les surfaces — la liste « Du même auteur » et les bibliographies de Fillion, l’apparat d’une œuvre (la bibliographie de Mirandol chez Boèce), la bibliographie d’une péricope, la fiche d’un ouvrage dans l’administration, les introductions bibliques.
- ⛔ Ne pas recopier une référence composée dans un segment.
- ⛔ Ne pas enregistrer de HTML ni d’astérisques d’italique dans `ouvrages_bibliographiques`.
- ⛔ Jamais de ville, de date ni d’éditeur inventés pour obtenir une notice « complète » : un champ absent emporte son séparateur, et la notice dit ce que la base sait.
- ⛔ jamais par découpe de la chaîne affichée, et une autorité sans rubriques, un auteur ancien, se compose ENTIER en petites capitales.
- ⚠️ La police servie ne dessine pas les petites capitales.
- ⚠️ Un rendu précomposé en base est au mieux un cache, jamais une source.

**§ 47.6 — La référence qui SORT du site se compose du même moteur**

- ⛔ Trois écritures d’une référence, et trois seulement.
- ⛔ Hors du site, une classe arrive nue : les petites capitales s’écrivent alors en style inline, seule exception à la règle qui veut que la composition vienne de la feuille.
- ⚠️ Les fragments italiques CONSÉCUTIFS se réunissent en une seule course.
- ⚠️ Le POINT FINAL tombe quand la phrase continue.
- ⛔ On ne retire que le point que le MOTEUR a posé, jamais la ponctuation d’une donnée.
- ⚠️ Ce que la mise en ordre a corrigé, et qui se voyait
- ⛔ Le REPLI d’une surface se compose du même moteur.
- ⚠️ Aucune petite capitale alors : elles viennent des autorités, que seule la notice structurée porte.
- ⚠️ Une seule référence se compose encore à part, et sa raison est écrite — celle des VOLUMES SERVIS d’une bible (§ 38.4), dont les millésimes sont un texte que le catalogue des ouvrages ne saurait dire, et qui porte une mention d’édition, un dépôt, une cote et un nombre de tomes qu’une notice d’ouvrage n’a pas.

**§ 47.7 — L’ADRESSE d’une édition s’écrit en un seul endroit**

- ⛔ Elle était écrite à SEPT endroits, et cinq la disaient à l’envers.
- ⛔ Ce n’est PAS une notice bibliographique.
- ⛔ Et la ligne qui départage deux entrées de « Du même auteur » ne dit pas la LANGUE (demande de l’auteur du 9 septembre 2026 : « ne pas indiquer la langue du texte »).
- ⚠️ La rubrique se resserre pour la même raison qu’elle se tait : le titre touche son adresse d’édition, et le blanc qui doit se voir est celui qui sépare deux œuvres, non celui qui sépare les deux lignes d’une seule.
- ⚠️ Une surface dont une mention est un NŒUD prend la LISTE ordonnée — plutôt que la chaîne, et pose sa mention avec le même séparateur.
- ⚠️ La phrase de provenance suit, et sa grammaire tient.
- ⛔ Sans ville, « de » gouverne l’ÉDITEUR, et l’article contracté redevient nécessaire — « D’après l’édition du Cerf, 1984 », « D’après la publication des Presses universitaires… », « D’après la publication de l’Imprimerie nationale ».

## § 48. Le protocole d’océrisation d’une bible

**§ 48.0 — Méthode obligatoire de traitement, correction et clôture Fillion (26 août 2026)**

- ⛔ Ne jamais déclarer un livre « terminé » à partir d’un seul contrôle global ou d’une seule couche de texte.

**§ 48.1 — Cycle canonique de travail — protocole vivant**

- ⛔ on ne mélange pas plusieurs familles de correction dans une même passe — lorsque cela empêcherait d’en mesurer l’effet.
- ⛔ on ne corrige jamais seulement l’exemple rencontré.
- ⛔ Aucun « tout est bon » ne remplace ces contrôles.
- ⛔ Une micro-passe qui échoue à son postcontrôle n’est pas poursuivie comme si elle était close.
- ⛔ Ne jamais corriger seulement le bloc ni seulement le miroir.
- ⛔ Toute anomalie de classification découverte est documentée pour une mission distincte, jamais corrigée par ricochet.
- ⛔ Ne jamais effacer un indicateur de revue pour fabriquer artificiellement un état « terminé ».
- ⛔ Un titre n’est jamais injecté dans la prose ; un bloc `title` n’a pas de corps ; un intitulé ne se répète pas comme premier paragraphe.
- ⛔ La casse d’un heading source n’est jamais normalisée.
- ⛔ Après TOUTE modification d’une projection de heading, contrôler immédiatement toutes les notes et ancres qui la ciblent.
- ⛔ Ne jamais fabriquer un offset pour compenser une mauvaise classification.
- ⛔ Ne jamais déplacer une ancre par simple delta global lorsque la typographie ou le texte intermédiaire a changé.
- ⛔ Ne jamais déduire un italique d’un simple motif lexical lorsqu’un homographe français est possible.
- ⚠️ Une recherche brute de toutes les chaînes `comparer` ne suffit pas.
- ⛔ Une lecture directe est une passe à part entière ; elle n’est jamais remplacée par un compteur à zéro.
- ⛔ Ne jamais fabriquer un `source_markup` à partir du texte courant pour satisfaire ce contrôle.
- ⛔ Aucun saut de ligne artificiel n’est ajouté pour réparer une marge.
- ⛔ Tous les nombres annoncés viennent de requêtes déterministes.
- ⛔ Aucun statut humain n’est attribué automatiquement.
- ⛔ On n’ouvre le chapitre suivant qu’après contrôle déterministe et journalisation du précédent.
- ⛔ Ne jamais supposer leur identité, notamment aux frontières où la Vulgate et la numérotation canonique courante décalent un chapitre.
- ⛔ On ne réécrit jamais le témoin pour faire disparaître une faute OCR.
- ⛔ Les compteurs hérités d’une passe antérieure ne font jamais foi — ils sont recalculés en SQL depuis l’état courant.
- ⛔ Aucune graphie ne devient certaine par simple vraisemblance philologique.
- ⚠️ une donnée déjà conforme n’est jamais réécrite pour uniformiser artificiellement le lot.
- ⚠️ il n’est jamais édité comme source d’autorité.
- ⛔ Le protocole ne s’allège jamais en supprimant une garde qui a déjà empêché une erreur réelle — il peut être réorganisé pour éviter les doublons, mais sa couverture ne régresse pas.

**§ 48.2 — Séparer strictement témoin source et lecture éditoriale**

- ⛔ Le témoin source ou diplomatique reste immuable.
- ⚠️ Une correction n’est complète que si toutes les projections qui exposent le même contenu sont cohérentes.

**§ 48.3 — Ordre obligatoire des passes**

- ⛔ Un titre ne doit jamais rester injecté dans le corps ni dans un sous-bloc de commentaire.
- ⛔ Ne jamais convertir automatiquement `...` en `[…]` : `[…]` est réservé à une omission réelle dans une citation ou un lemme, vérifiée par le contexte ou le témoin.
- ⛔ Ne jamais mettre en italique par simple détection lexicale un homographe français — utiliser le paragraphe, la langue déclarée, les lemmes structurés et le contexte.
- ⚠️ Toute abréviation ambiguë reste en `review` jusqu’à identification certaine.
- ⛔ Ne pas convertir mécaniquement les chiffres romains bibliographiques — qui restent romains et sont harmonisés en capitales.
- ⛔ Un commentaire général sans lemme ne reçoit jamais artificiellement un couple de lemmes.
- ⛔ ne jamais fabriquer un `source_markup` à partir du texte courant.

**§ 48.3.1 — Postconditions obligatoires des transformations éditoriales**

- ⛔ Une expansion ne peut absorber la ponctuation de phrase.
- ⛔ La désabréviation doit conserver la grammaire.
- ⚠️ Une substitution lexicalement correcte mais grammaticalement fautive est une correction inachevée.
- ⛔ Aucun chapitre biblique isolé en chiffres romains ne doit subsister après normalisation.
- ⛔ Ce développement n’altère jamais la forme source.
- ⛔ Un séparateur matériel ne termine pas un heading.

**§ 48.4 — Contrôles structurels obligatoires après chaque passe**

- ⛔ Les contrôles ne portent jamais seulement sur `text_content`.
- ⚠️ Un contrôle d’égalité textuelle simple est insuffisant pour les doublons.

**§ 48.5 — Sondages aléatoires reproductibles**

- ⛔ Un sondage n’est jamais une preuve de complétude — il sert à découvrir les angles morts des contrôles systématiques.
- ⚠️ Si un sondage trouve une erreur, ne pas corriger seulement l’objet tiré.

**§ 48.7 — Conditions de clôture**

- ⛔ « Contrôles mécaniques à zéro » ne signifie jamais « livre terminé ».

**§ 48.8 — Matrice de clôture et contrôles transversaux obligatoires**

- ⛔ Aucune suppression par expression régulière sans classification contextuelle.
- ⛔ Ne jamais copier en masse des cibles ou un statut `verified` depuis un crosswalk sans contrôle des frontières du témoin courant.
- ⛔ On ne déclare pas un livre globalement « clos » tant qu’une surface applicable de la matrice demeure en attente — notamment texte biblique d’une langue, titres/sous-titres, typographie, vue de projection, assets ou confidentialité.

## § 49. Les gravures d’une édition biblique

**§ 49.7 — Le rattrapage se règle sur ce que le NAVIGATEUR rend**

- ⛔ Le remède n'est pas de rattraper plus FORT, mais plus LARGE.
- ⛔ ET LE RATTRAPAGE NE SERT JAMAIS À MESURER LA RAMPE.
- ⚠️ Et la densité se mesure elle aussi APRÈS la seconde réduction
- ⚠️ L'ancienne chaîne servait donc **10 % d'encre de moins que le témoin**, ce qui

**§ 49.8 — Recoudre un trait que la RÉDUCTION a dilué**

- ⛔ Ce n'est pas une exception au § 49.6, c'est son revers.
- ⚠️ Un premier plafond avait été pris sur la rampe NUE

**§ 49.9 — Une gravure se juge à la taille d'AFFICHAGE, jamais au double**

- ⚠️ Corollaire de méthode, et il a coûté une demi-journée de conclusions fausses.
- ⛔ **Une planche de contrôle compose donc à la taille d'affichage, puis agrandit au
- ⚠️ Jugé au double, le paralytique paraissait avoir perdu son modelé ; rendu à ses

**§ 49.10 — L'encre d'une gravure n'est pas celle d'un titre**

- ⛔ Une vignette détourée ne s'affiche pas, elle DÉCOUPE : son dessin est dans la

**§ 49.11 — Une photogravure se CREUSE, elle ne se recadre pas une seconde fois**

- ⛔ Un second étalement ne rendrait donc rien, les deux bouts étant pris.
- ⚠️ Le blanc ne bouge pas et le noir gagne deux dixièmes de point
- ⛔ Et la courbe ne vaut QUE pour la photogravure : une gravure au trait n'a pas de

**§ 49.12 — DEUX BORNES pour toute illustration, quel que soit son régime**

- ⛔ Jusqu'au 30 août 2026, seule la VIGNETTE avait des bornes : une scène valait
- ⚠️ Ce que les bornes réduisent, ce sont les EXTRÊMES.

**§ 49.13 — Le ton continu prend un rattrapage plus large, mais BRIDÉ**

- ⚠️ La bride reprend l'essentiel du gain de bord — il venait justement des
- ⛔ Un réglage qui gagne sur une mesure en perdant sur deux autres n'est
- ⚠️ Une énergie de bord mesurée à travers un intermédiaire WebP est FAUSSE

**§ 49.14 — Une PLANCHE hors-texte se sert au double, elle aussi**

- ⛔ Les 32 planches du tome I étaient servies à **3,64×** leur taille d'affichage —
- ⛔ On repart du MASTER, jamais du fichier servi
- ⚠️ Corollaire : tout changement du plafond du § 49.12 oblige à rejouer ce

**§ 49.15 — L'EXPORT d'une illustration : deux exemplaires, et ce que la base en dit**

- ⛔ ON REDÉRIVE TOUJOURS DEPUIS LE MASTER, JAMAIS DEPUIS LE FICHIER SERVI.
- ⛔ LA BASE DOIT DIRE CE QUI EST SERVI.** `bible_edition_asset_files` porte, par
- ⛔ Et la version de traitement BOUGE dès que la chaîne bouge.
- ⚠️ Les masters des planches sont restés en 1.2.0 :
- ⚠️ LE SEAU POSE `no-cache`, LE NAVIGATEUR GARDE QUAND MÊME.** Remplacer un fichier
- ⛔ UN EXPORT NE SE CROIT PAS SUR PAROLE : ON INTERROGE LE VRAI CHARGEUR.** Trouver
- ⚠️ Et le contrôle lui-même se contrôle, PAR UN TÉMOIN dont on sait la réponse.
- ⚠️ Rejouer la chaîne quand une mesure d'AFFICHAGE change.
- ⛔ **UN OBJET DÉCLARÉ ESSAI TECHNIQUE NE SE SERT PAS AU LECTEUR, et il ne SE

**§ 49.16 — Le papier se nettoie CHIRURGICALEMENT**

- ⛔ AUCUNE DES DEUX BORNES NE SUFFIT SEULE.** L'étalement au PIC ne perd rien mais
- ⛔ LA SORTIE EST DANS LE VOISINAGE, NON DANS LE NIVEAU.
- ⛔ Il gagne sur les DEUX à la fois, et c'est cela qui le choisit
- ⛔ ET C'EST LE TÉMOIN QUI L'A DIT, PAS L'ŒIL.
- ⚠️ Corollaire, et il vaut au delà des images : **l'œil tranche ce qui se voit — une
- ⚠️ Deux compteurs se sont trompés en chemin
- ⚠️ Le blanc de papier est une remise à l'ÉCHELLE, non un parti
- ⚠️ Les masters des planches du tome I ne portent PAS cet étalement
- ⚠️ Un contrôle d'octets pris à l'instant du dépôt lit le CACHE DE BORD.

**§ 49.18 — LA PART SUIT LA LARGEUR IMPRIMÉE, ET LE RÉGIME NE DÉCIDE QUE DU DÉTOURAGE**

- ⛔ **Deux parts FIXES restaient, et la seconde a survécu à la correction de la
- ⛔ Et le PLAFOND DE VIGNETTE suppose une gravure qui TIENT DANS UNE COLONNE

**§ 49.19 — LA LÉGENDE SE TROMPE TROIS FOIS, ET LE RÉGIME SE FORCE PAR LA DONNÉE**

- ⚠️ La troisième est la plus instructive : sa légende est parfaite, et c’est la
- ⚠️ `v_bible_edition_assets` n’exposait pas `metadata`

**§ 49.20 — LA MASSE DU PIC DE PAPIER — la mesure qui désigne, sans trancher**

- ⛔ **Elle ne remplace pas la légende pour autant, et l’écart dit pourquoi : un
- ⚠️ Ni les coins ni la confrontation au scan ne mesurent un voile

**§ 49.21 — RIEN N'ATTEIGNAIT LE LECTEUR, ET LA CLÉ DE SERVICE LE CACHAIT**

- ⛔ **UN CONTRÔLE MENÉ AVEC LA CLÉ DE SERVICE NE DIT RIEN DE CE QUE LE LECTEUR
- ⚠️ LA RLS S'APPLIQUE DANS LE SOUS-SELECT D'UNE POLITIQUE.
- ⚠️ **Les deux affirmations posées ne sont pas de même nature, et le schéma le
- ⚠️ Une garde SQL impose l'ordre : **le dérivé web d'abord, l'actif ensuite.** Bien
- ⚠️ Le `source_code` garde son suffixe `-test`, et c'est délibéré : c'est

**§ 49.22 — DEUX POLITIQUES PEUVENT EXIGER DU MÊME DRAPEAU DES VALEURS OPPOSÉES**

- ⛔ Le § 49.21 a levé `test_only` sur les sept sources, et les gravures sont
- ⚠️ C’est l’ÉCART ENTRE LES LIVRES qui a nommé la cause
- ⚠️ **Sans alignement canonique, la page rend ses rangées et n’a rien à y
- ⛔ Une seule suffit pour qu’aucun état ne soit tenable, et rien ne le signale —

**§ 49.23 — LE RÉGIME ET LA PART SONT ÉCRITS PAR LA CHAÎNE, LUS PAR LA PAGE (2026-09-03)**

- ⛔ Une règle recopiée dans deux fichiers ne reste la même que par accident, et c’est vrai d’une RÈGLE comme d’une mesure.
- ⚠️ Rien ne pouvait le dire — les deux écritures étaient justes chacune de son côté, les types passaient, les tests passaient, et relire l’une ou l’autre ne montrait rien.
- ⚠️ **le hasard des tailles ne venait pas de la règle, mais de ce
- ⛔ C'est la chaîne qui les écrit, une fois, et la page qui les lit.
- ⛔ Un script qui l'oublie échoue à l'insertion, et c'est voulu
- ⛔ **toute chaîne d'import, GPT compris, écrit ces deux colonnes dans CE

## § 50. La Bible polyglotte

**§ 50.1 — La Bible polyglotte — le réglage, le menu, l’en-tête de colonne**

- ⛔ UN RÉGLAGE DE VOLET NE SE COMPOSE PAS EN BOUTONS (« remettre en forme de façon plus élégante, sans effet “bouton” »).
- ⚠️ UNE ÉCHELLE se lit en RANG, des interrupteurs INDÉPENDANTS se lisent en COLONNE.
- ⛔ UNE TRADUCTION DÉJÀ AFFICHÉE AILLEURS SE GRISE, elle ne s’annonce pas en OCRE (« grise légèrement le bloc de l’œuvre déjà utilisée ; n’utilise pas d’ocre pour le texte qui signale ça »).
- ⛔ Une FAMILLE ne se grise pas quand un seul de ses textes est affiché ailleurs : les autres restent libres, et la griser dirait le contraire.
- ⛔ On range sur la date QU’ON MONTRE, jamais sur une autre
- ⛔ Une entrée SANS millésime se range à la FIN, jamais au début : on ne devine pas une date, et une date manquante ne vaut pas zéro.
- ⛔ Jamais un rendu HTML sur une colonne rédigée hors du dépôt.
- ⚠️ La rubrique d’un volet de famille en est exemptée : elle se compose en capitales espacées, où des petites capitales seraient plus petites que ce qui les entoure.
- ⛔ SOUS LE TITRE D’UNE COLONNE, C’EST LA DATE, et rien d’autre ne prend sa place (« c’est indiqué “Texte du manuscrit” et non une date ; c’est problématique »).
- ⚠️ L’état du texte reste NÉCESSAIRE, deux colonnes d’une même édition ne se distinguant pas autrement : il descend d’une ligne, sous la date, dans une encre plus pâle et sans la chasse du millésime — c’est une glose, pas un second repère.
- ⚠️ Le « vers » ACCOLÉ au millésime part avec lui.
- ⛔ Ce n’est pas une lecture de la prose : on ne prend que le qualificatif que la source a écrit devant le millésime.
- ⛔ PAS DE FILET AUTOUR DU TITRE quand le menu s’ouvre.
- ⚠️ Le clavier garde son anneau, qui est la règle « focus-visible » globale du site : elle pose un contour, non un cadre intérieur.
- ⚠️ ET LE SURVOL DE CE TITRE NE S’APPLIQUAIT PAS — ce qu’aucune lecture du code ne disait.
- ⛔ Le piège du style en ligne ne borne pas les seules média-queries : il bloque TOUTE règle de feuille sur la même propriété.
- ⛔ RECTIFICATION DU MÊME JOUR, AU SOIR : trois de ces règles se reprennent, et toutes pour la même raison — on avait chaque fois retiré un ornement DE TROP.
- ⚠️ Règle générale, qui vaut au delà de cette page : **retirer un ornement n'est pas gratuit ; il faut regarder ce qui reste**.
- ⚠️ L'ÉCHELLE SE COMPOSE EN CASES, sur toute la largeur du volet (« pas de points médians moches ; plutôt de jolies cases propres sur l'ensemble de la largeur »).
- ⛔ Ce n'est PAS le retour des pilules, et la différence est celle d'un objet et de cinq : une pilule est un objet PAR VALEUR — cinq cadres, cinq fonds, cinq rayons —, quand un contrôle segmenté n'a qu'UN cadre et qu'UN rayon pour toutes ses cases, qui n'existent que par le filet qui les sépare.
- ⚠️ Les interrupteurs INDÉPENDANTS gardent leur colonne et leur clair : ils ne forment pas une échelle, et une case autour de « Lignes problématiques » en referait un bouton.
- ⛔ UNE COLONNE DÉJÀ PRISE SE GRISE PAR SON TEXTE, ET PAR RIEN D'AUTRE (« ne griser que le texte ; pas de fond gris »).
- ⚠️ ET CETTE ENCRE DESCEND D’UN RANG (« griser un peu plus le texte des non disponibles »).
- ⛔ Pas deux rangs — la ligne reste CLIQUABLE — la choisir échange les deux colonnes — et une ligne qu'on ne lit plus n'est plus une option ; le rang le plus ténu est d'ailleurs le plancher de l'échelle, et la date y est déjà.
- ⚠️ Sa hiérarchie interne tient alors par le CORPS et la POLICE, non par l'encre : un sérif de treize pixels sur un sans de dix se distingue sans qu'on l'y aide.
- ⚠️ Règle générale, et c'est la rectification du même jour prise par l'autre bout : retirer un ornement DÉCHARGE ce qui reste, et ce qui reste doit alors en porter davantage.
- ⛔ SOUS LE NOM D'UNE COLONNE, IL N'Y A QUE LA DATE (« “Texte du manuscrit” : ne pas l'indiquer ; seulement indiquer une date »).
- ⚠️ L'état du texte se lit LÀ OÙ L'ON CHOISIT, dans le volet de la famille : c'est le menu qui distingue, l'en-tête qui nomme.
- ⛔ Conséquence assumée : deux états d'un même témoin ouverts côte à côte portent le même en-tête.
- ⚠️ UN BLOC TEINTÉ A BESOIN D'AIR DANS SA CASE.
- ⛔ UN ANNEAU DE FOYER SE POSE DEDANS DÈS QUE LE CHAMP EST SON PROPRE BLOC (« l'encadrement vert dépasse, mord du texte, ou du texte passe dessus »).
- ⛔ On ne le retire pas : c'est le seul repère du clavier, et un champ sans filet ni fond au repos n'a rien d'autre à montrer.
- ⚠️ Règle générale : quand un objet cesse d'être posé DANS un bloc pour DEVENIR le bloc, tout ce qui se dessinait autour de lui se relit.

**§ 50.2 — Le DOMINO de l’ouverture, et les BLANCS de la justification**

- ⚠️ À L’OUVERTURE, LE TEXTE TOMBE EN DOMINO — colonne par colonne, de gauche à droite (« peut-on imaginer que le texte s’affiche progressivement, colonne par colonne, pour donner un effet de domino ?
- ⚠️ Le pas DOUBLE : cinq colonnes au pas ordinaire se joueraient en cent vingt millisecondes, et la chute ne se verrait pas.
- ⛔ Et cela À L’OUVERTURE SEULEMENT : la même chute jouée à chaque chapitre tourné cesserait d’être un accueil pour devenir une attente ; les arrivées suivantes gardent la chute ligne par ligne, qui suit la lecture.
- ⛔ UN CLIC QUI NE FAIT RIEN DE PLUS QUE LE SURVOL EST UN CLIC PERDU (« quand je clique sur le nom d’une traduction qui a un menu déroulant secondaire, ne pas bloquer le clic : afficher la première traduction du menu déroulant »).
- ⚠️ Le clavier suit le clic : Entrée et Espace choisissent, la flèche déploie — un clavier qui n’aurait plus que le déploiement n’atteindrait jamais le premier texte.
- ⛔ LE FLOTTANT QUI OUVRE UN VERSET NE PREND PAS SUR LE TEXTE (« affiner encore la densité du texte, les césures, renvois, pour éviter les blancs ignobles et contre-natures entre mots »).
- ⚠️ La cause d’un blanc ignoble n’est presque jamais la césure : c’est une ligne trop courte.
- ⛔ RECTIFICATION DU MÊME JOUR, ET ELLE PORTE SUR LES DEUX MOITIÉS DE CETTE RÈGLE (relevé de l’auteur le soir même : « la référence canonique dans la cellule de chaque verset, celle qui est grise, doit être alignée en marge gauche avec le texte contenu dans la même cellule »).
- ⛔ ET LE GAIN N’EN ÉTAIT PAS UN — mesuré avant et après sur la même page : le plus grand blanc passe de **5,47 à 4,86** espaces naturelles, le neuvième décile de 2,78 à 2,66, et les blancs de plus du triple de **147 à 123**.
- ⚠️ Ce qui coûte à la justification est la LARGEUR d’un flottant, non sa POSITION — la première ligne perd les mêmes pixels de mesure quel que soit le côté où on le range.
- ⛔ UN VOILE D’ATTENTE COUVRE TOUT CE QUI ATTEND, EN-TÊTE COMPRIS (même relevé : « quand on charge un texte, le fond change légèrement de couleur ; c’est ok, mais il faut aussi qu’il change au niveau des en-têtes de colonne »).
- ⚠️ C’EST LE BLOC POSITIONNÉ QUI DÉCIDE DE CE QU’UN VOILE COUVRE — puisqu’un voile s’étend à son parent positionné et à rien d’autre.
- ⚠️ Un en-tête COLLANT porte un rang d’empilement : le voile monte plus haut que lui et le recouvre donc, à l’arrêt comme au défilement — sans lui prendre ses événements de pointeur, car on doit pouvoir changer une colonne pendant qu’une autre charge.
- ⛔ Et l’ANNEAU ne bouge pas d’un pixel : il vit dans un enfant collant sous l’en-tête, dont la boîte est bornée par la hauteur restante, que le voile plus haut ne change pas.
- ⛔ ET UNE ESPACE ÉTROITE AGGRAVE LA JUSTIFICATION AU LIEU DE LA SERVIR.
- ⚠️ C’est le contraire de ce qu’on croit en la resserrant pour gagner en densité.
- ⛔ La densité n’y perd rien, le flottant rendu au texte raccourcissant la page d’autant.
- ⚠️ Ce qui a été mesuré et ÉCARTÉ, pour n’y pas revenir.
- ⛔ Un blanc résiduel dans une colonne étroite n’est pas un défaut de réglage : c’est le prix d’une colonne étroite justifiée, et l’on ne le paie pas en inventant des coupures.

**§ 50.3 — La LACUNE du témoin garde ses CROCHETS, et y écrit sa CAUSE**

- ⛔ Le manque se dit ENTRE CROCHETS — dans les DEUX membres de l’édition.
- ⛔ ET CE QUI S’IMPRIME ENTRE CES CROCHETS EST LA CAUSE, jamais des points de suspension (décision de l’auteur, 2026-09-08 : « plutôt que des “…”, indiquer la nature de la lacune ou du problème » — elle renverse la règle du 5 septembre, qui gardait le motif à l’infobulle).
- ⚠️ Une lacune SANS cause porte le mot « lacune », qui dit au moins de quoi il s’agit ; « non précisée », que l’import écrit faute de mieux, est un aveu d’ignorance et non une cause : il retombe sur le mot nu.
- ⚠️ Un marqueur COUPÉ entre deux versets retombe lui aussi sur le mot nu — la cause qu’on y lirait serait tronquée, et l’on n’invente pas ce qu’on ne peut pas lire.
- ⛔ LA MARQUE PREND ALORS L’ITALIQUE, et ce n’est pas un ornement.
- ⚠️ Cet air est une MARGE, non une espace du texte.
- ⚠️ La FINE insécable demeure, et pour son seul office : quand la lacune coupe un MOT (« por[…]er »), elle sépare la marque du fragment resté collé, sans l’attacher ni le détacher comme un mot entier.
- ⛔ UNE TRADUCTION NON RECOMPOSÉE NE PASSE PAS PAR LE TOKENISEUR DU TÉMOIN.
- ⛔ LA RÈGLE QUI LES PROTÈGE SE DÉMONTRE, elle ne se soupèse pas : ON NE CONSOMME JAMAIS UN « ] » QUI SUIT UN « [ » DANS LA MÊME PORTION.
- ⚠️ Et cette fermeture ne se lit que dans la portion qui OUVRE le texte : ailleurs, le crochet ouvrant qui l’appareille peut vivre dans une portion précédente.
- ⚠️ Le crochet fermant d’une lacune nue n’est pas une fermeture orpheline — et c’est le défaut que la mise en forme a fait paraître : un verset qui s’ouvre sur « […] » basculait TOUT ENTIER en lecture incertaine.
- ⛔ UN FAIT DE L’ÉDITION NE SE DIT PAS DE DEUX FAÇONS SELON LA COLONNE OÙ ON LE LIT (2026-09-08).
- ⚠️ RESTE UNE DOUZAINE D’ÉTIQUETTES QUE LE VOCABULAIRE NE CONNAÎT PAS — et elles s’impriment brutes à dessein : « lecture difficile » (2), « Fragment » (2), « Suite incertaine » (2), « Suite corrompue » (2), « Restitution », « Restitution incertaine », « Passage altéré », « reprise ».
- ⛔ Le rendu ne DOIT PAS inférer une sémantique d’un libellé quelconque placé avant un deux-points entre crochets (§ registre GPT ↔ Claude) : « Restitution » n’est pas « lecture incertaine », et la distinguer d’une restitution philologique ne se devine pas.

**§ 50.4 — Le ROUGE de la Polyglotte dit « à vérifier », il ne dit pas « on en a parlé »**

- ⛔ UNE LIGNE NE SE TEINT QUE SI SON POINT EST OUVERT.
- ⚠️ Le LIBELLÉ, lui, se nourrit de TOUS les points
- ⚠️ La liste nomme les statuts CLOS, non les statuts ouverts.

**§ 50.4.1 — Le RELEVÉ STRUCTUREL — ce qu'on cherche, et ce qu'on n'y cherche pas**

- ⛔ UN ÉCART CONSTANT N'EST PAS UN DÉFAUT, ET LE DÉTECTEUR NE DOIT JAMAIS LE DIRE.
- ⚠️ Un chapitre dont aucun écart ne tient la moitié des versets n'a pas de régime
- ⚠️ On ne mesure l'écart que sur les créneaux UN-POUR-UN
- ⛔ UN SURNUMÉRAIRE N'A PAS DE RÉFÉRENCE CANONIQUE, ET L'ON NE LUI EN INVENTE PAS.
- ⚠️ Le partage systématique / isolé se fait à HUIT occurrences dans un même livre

**§ 50.4.2 — Ce que le relevé du 2026-09-07 a trouvé**

- ⚠️ Deux traductions n'avaient JAMAIS été auditées
- ⚠️ Le décalage de Sacy que la liste consignait dès juillet 2026 se retrouve tout seul
- ⛔ Le relevé PROPOSE, il ne corrige rien.

**§ 50.5 — Une case COUVERTE n’est pas une case vide**

- ⛔ UN VERSET ÉTALÉ PORTE TOUS LES CRÉNEAUX QU’IL COUVRE, ET PAS SEULEMENT LE PREMIER.
- ⚠️ La case couverte renvoie au verset où le texte se lit, elle ne le RÉPÈTE pas
- ⛔ **UN EMPAN DONT LA FIN PRÉCÈDE LE DÉPART EST UNE DONNÉE FAUTIVE, ET L’ON NE DEVINE PAS
- ⚠️ Corollaire de méthode, et il est plus large que ce cas

**§ 50.5.1 — Ce que le contrôle des cinq divergences a établi**

- ⛔ Rien n’a été réaligné là où l’alignement était juste
- ⚠️ Deux de ces lignes portaient déjà une note : elle a été ALLONGÉE,

**§ 50.5.2 — Deux empans manquaient à l’AELF elle-même**

- ⛔ Sg 9, 18 et 1 M 12, 53 de la TOL/AELF couvrent chacun DEUX créneaux du canon
- ⚠️ C’est un champ d’ALIGNEMENT, et le § 15.1.1 permet expressément de le corriger
- ⚠️ L’ossature et l’AELF ne coïncident donc pas partout

**§ 50.6 — Deux décalages de la Vulgate, corrigés ; deux lacunes, signalées**

- ⛔ **QUAND DEUX TÉMOINS PORTENT LE MÊME VERSET SOUS LE MÊME NUMÉRO ET TOMBENT DANS DEUX
- ⛔ UNE NOTE DEVENUE FAUSSE SE REMPLACE, ELLE NE S’ALLONGE PAS.
- ⛔ ET DEUX LIGNES MANQUENT, QU’ON NE RECONSTITUE PAS
- ⚠️ **Une absence ISOLÉE dans une série complète est une ligne perdue, non une convention

## § 51. Les objets d’interface partagés

**§ 51.1 — La CELLULE D’ACTIONS — un seul objet, et il ne couvre jamais ce qu’il commande**

- ⛔ LA RÈGLE N’A PAS CHANGÉ, ELLE VAUT DÉSORMAIS PARTOUT.
- ⛔ le calcul BRIDÉ que le module donne en contre-exemple |
- ⛔ BRIDER N’EST PAS DÉPLACER — et c’est la même faute qu’en août : quand la place manque, `Math.min` ne fait pas de place, il ramène la cellule sur la fin de la ligne.
- ⛔ L’ESPACE DISPONIBLE N’EST PAS TOUJOURS LA FENÊTRE.
- ⚠️ Et la borne GAUCHE l’emporte sur l’alignement à droite : dans une colonne plus étroite que la cellule, mieux vaut déborder d’un cheveu à droite que couvrir la colonne d’à côté.
- ⚠️ Le gabarit d’avant valait 132 px pour une cellule qui en fait 88 au plus.
- ⛔ Au doigt elle se referme : un repositionnement continu y est saccadé.
- ⛔ LE GARDE-FOU DU CURSEUR EN MOUVEMENT DE LA POLYGLOTTE EST RETIRÉ.
- ⚠️ Une seconde d’immobilité effaçait au demeurant les boutons sous le curseur qui les visait.
- ⛔ UN BOUTON D’ACTION A LA MÊME BOÎTE PARTOUT (`COTE_BOUTON`, 18 px).
- ⚠️ UNE CELLULE EN PORTAIL NE REÇOIT PLUS LE CSS DE SA PAGE — et c’est le piège de la migration.
- ⚠️ CE QUI NE BOUGE PAS, ET POURQUOI — la gouttière de 2,375 rem de la Bible classique.
- ⛔ ET SI LE DESSUS EST BOUCHÉ, ON PASSE DESSOUS.
- ⚠️ Le défaut dormait depuis le 22 août 2026 et ne s’est vu qu’en MESURANT la Polyglotte servie : ce n’est pas un cas limite mais le premier verset visible sous l’en-tête des éditions, c’est-à-dire celui qu’on survole d’abord en arrivant sur la page.
- ⛔ On ne descend pas sous un bloc dont on IGNORE le bas — un appelant qui ne passe que `{ top, right }` garde le bornage au sommet, la règle d’hier valant mieux qu’une pose au jugé.
- ⚠️ Et un bloc plus haut que la fenêtre n’a ni dessus ni dessous VISIBLES : on revient alors au sommet, une cellule posée hors de l’écran valant moins qu’une cellule qui mord.
- ⚠️ CE QUE LA MESURE A APPRIS, ET QUE LES TESTS N’AVAIENT PAS DIT.
- ⛔ Une règle éprouvée sur les cas qu’on a imaginés ne l’est pas sur ceux que la page produit : on mesure sur la page SERVIE.
- ⛔ SANS `relatedTarget` —, puis comparer la boîte de `[data-cellule-actions]` aux rectangles de `Range.getClientRects()` du texte survolé.
- ⛔ ET LA LECTURE EN REGARD D’UNE ŒUVRE EST UNE GRILLE, ELLE AUSSI.
- ⚠️ La colonne se retrouve comme l’enfant DIRECT de la grille qui porte le segment, sans marquer les trois formes que le français y prend — paragraphe, bloc de vers, citation en versets —, car marquer trois formes fait trois endroits où l’oublier.
- ⚠️ CE QUE CELA APPREND : une surface qui emploie déjà la bonne cellule n’est pas pour autant en règle.
- ⛔ Avant de tenir une surface pour saine, se demander ce qu’il y a À DROITE de son texte.
- ⚠️ « Traductions parallèles » est ÉTEINT sur le site (`COMPARAISON_ACTIVE = false`, mode jugé trop complexe) : le calcul bridé qu’il portait n’atteignait donc aucun lecteur.
- ⛔ UNE CELLULE QU’ON NE PEUT PAS ATTEINDRE N’EXISTE PAS (relevé de l’auteur, 2026-09-07 : « le petit encart qui s’ouvre au survol est difficile à atteindre avant sa disparition »).
- ⚠️ La GRÂCE de sortie valait 200 ms, et le trajet n’est pas la marge de six pixels — qui se franchit en un clin d’œil.
- ⚠️ Rien n’attend quand rien n’est ouvert — une première cellule paraît à l’instant —, et un TAP ne s’attend jamais : le temps de pose vaut pour une main qui glisse, non pour un doigt qui désigne.
- ⛔ COROLLAIRE, ET C’ÉTAIT UN DÉFAUT LATENT : LA FERMETURE NE VISE PAS UNE CLÉ, elle ferme ce qui est ouvert.
- ⚠️ Règle générale, au-delà de cette cellule : un objet qui paraît au survol et qu’on doit ATTEINDRE se juge sur le trajet, non sur le geste qui l’ouvre.

**§ 51.2 — La marque du SIGNALEMENT — un point d’exclamation dans un cercle**

- ⛔ LE FANION EST RETIRÉ (décision de l’auteur, 2026-09-07).
- ⛔ UNE MARQUE QUI DEMANDE QU’ON LA CONNAISSE N’EST PAS UNE ICÔNE — et c’est la leçon du premier tour.
- ⚠️ Une érudition qui ne se lit pas est une érudition qui ne sert pas : elle appartient à la charte, non au bouton.
- ⚠️ LE CERCLE PLUTÔT QUE LE TRIANGLE OU LE LOSANGE.
- ⛔ LE COMPOSANT EST RENOMMÉ `IconeSignalement` — et ce n’est pas un rangement : un fichier qui s’appelle `IconeDrapeau` et qui ne dessine plus de drapeau ment sur ce qu’il contient, et c’est ainsi qu’un dessin finit par revenir à son nom.
- ⚠️ MÉTHODE, et elle a servi deux fois de suite — les onze tracés du second tour ont été rendus sur une planche, à leur TAILLE RÉELLE dans la cellule, agrandis cinq fois, sur les DEUX sols, et une fois de plus au bout d’une ligne de lecture.
- ⛔ Un dessin ne se juge ni dans l’éditeur ni au quintuple : au quintuple, tous les tracés se ressemblent.

**§ 51.3 — Le BOUTON-LIEN — souligné, en romain, plus petit**

- ⛔ IL Y AVAIT ONZE FORMES POUR UN SEUL OBJET — et le désordre se compte : **six corps** (de 9,5 à 13 px), **cinq encres**, **trois styles** — romain, italique, gras 500, 600 et 700 — et **trois décorations**, le trait plein, le pointillé et un soulignement TRANSPARENT au repos.
- ⛔ DEUX FAMILLES, ET LA DISTINCTION EST LA VRAIE RÈGLE.
- ⚠️ Rapetissé, il creuserait un trou dans sa ligne.
- ⚠️ LE CORPS EST ABSOLU, non relatif, et c’est ce que « uniformiser » demande.
- ⛔ L’ENCRE EST L’ACCENT, ET CE N’EST PAS UN GOÛT.
- ⚠️ Un bouton-lien posé sur un fond COLORÉ garde une teinte littérale (l’en-tête sombre d’un profil) : c’est la règle des couleurs posées sur un sol qui ne suit aucun thème.
- ⚠️ LA ZONE DE FRAPPE DÉBORDE EN HAUTEUR SEULEMENT.
- ⛔ Pas de débord LATÉRAL comme `.cs-cible-fine` : ces boutons se posent souvent au ras d’une liste de pastilles, et douze pixels de chaque côté y avaleraient les taps du voisin — c’est le raisonnement déjà tenu pour `.cs-appel-cible`.
- ⛔ UN BOUTON-LIEN NE SE DESSINE PAS SELON SON VOISINAGE.
- ⚠️ CE QUI RESTE HORS DE LA RÈGLE, et il faut le savoir — les hyperliens de PROSE des pages légales et des textes enrichis (`<a>` au fil d’un paragraphe).
- ⚠️ Et la VALEUR d’un champ d’administration rendue en lien parce qu’elle se trouve être une adresse n’est pas un bouton-lien : son corps suit celui du champ, et la rapetisser ferait qu’un champ change de taille selon ce qu’il contient.

**§ 51.4 — Une NOTIFICATION est une lettre, et un BLOC ne se pose pas dans un BLOC**

- ⚠️ Une liste dans un cadre se compose en RANGÉES — pleine largeur, séparées d’un filet, et son rembourrage est celui de l’en-tête du cadre — sans quoi les fers ne tombent pas au même endroit.
- ⛔ Et pas de bandeau au flanc : il disait « nouvelle », ce que l’onglet dit déjà, et il rentrait le texte de trois pixels de plus.
- ⛔ UNE NOTIFICATION PORTE QUATRE CHOSES : expéditeur, objet, message, date — et un lien au bas.
- ⚠️ Trois de ces six disaient la même chose sous trois formes « Publication acceptée », puis « Votre publication a été acceptée et publiée.
- ⛔ LE CORPS EST VIDE QUAND L’OBJET DIT TOUT.
- ⚠️ Elle ne colore QUE l’objet — un rang coloré parmi trois se lit ; trois rangs colorés ne se lisent plus.
- ⚠️ Et « à revoir » se range avec les REFUS : la publication n’a pas été acceptée en l’état, et le lecteur a quelque chose à faire.
- ⛔ LE MAROQUIN NE SERT PAS AU REFUS, et la question méritait d’être tranchée.
- ⛔ UNE ACTION QUI NE VIENT QU’AU SURVOL EST HORS D’ATTEINTE.
- ⚠️ Et il garde sa PLACE quand il ne se voit pas — opacité, non `display` — sans quoi la ligne se recomposerait sous le curseur au moment même où on le vise.
- ⚠️ Un lien ne s’écrit que s’il mène quelque part.
- ⛔ sans traduction imposée — la page biblique choisit alors celle du lecteur, et il retrouve son verset dans SA bible.

**§ 51.5 — Un état qui ne VARIE pas n’informe pas, et ce qui est PRÉREMPLI est figé**

- ⛔ UN ÉTAT QUI NE VARIE PAS N’INFORME PAS : ON LE RETIRE.
- ⚠️ La tentation est de la RAFFINER — un degré de vérification plus fin, un statut d’import — et l’auteur l’a écartée : « rien de spécial ; en fait, il faut tout bonnement supprimer ».
- ⛔ Et les colonnes qui la servaient cessent d’être demandées : un champ que rien ne lit finit par contredire ce qu’on affiche.
- ⛔ UNE ABRÉVIATION QU’IL FAUT SURVOLER POUR LA COMPRENDRE N’EST PAS UNE ÉCONOMIE.
- ⚠️ C’est la même règle que celle de la case vide de la Polyglotte, prise par l’autre bout : là on retirait une infobulle qui ne disait rien de plus que le texte ; ici on écrit le texte pour n’avoir plus besoin d’infobulle.
- ⚠️ Le verrou se déduit de ce qui a été PASSÉ, non d’un drapeau : le formulaire ouvert seul, qui ne préremplit rien, reste entièrement libre.
- ⛔ Un champ figé n’est ni grisé ni « en lecture seule » : c’est une VALEUR qu’on montre, non une saisie qu’on refuse, et elle se compose comme une valeur — dans le cadre du champ, pour que la colonne garde son aplomb.
- ⚠️ Et l’on dit UNE fois pourquoi ces cases ne s’ouvrent pas : un champ figé sans un mot se lit comme un champ en panne.
- ⛔ Un composant se déclare au niveau du MODULE, jamais dans le corps d'un autre.
- ⚠️ Sur un champ de saisie, l'effet est immédiat et ruineux.

**§ 51.6 — Une ÉTIQUETTE qui redit ce que la page MONTRE ne se pose pas**

- ⛔ Un index n’a pas à s’annoncer : sa forme le désigne.
- ⛔ Un COMPTE que la liste montre déjà ne s’écrit pas.
- ⚠️ Ce n’est pas retirer un signal : une recherche qui ne rend rien le
- ⛔ Une GLOSE qui redit le mot de tête ne se pose pas non plus.
- ⚠️ Le critère est la REDITE, non la brièveté.

**§ 51.7 — Un INDEX DES LIVRES se présente d’une seule façon**

- ⛔ **Le modèle est le volet de lecture de la Bible classique, et on le REPREND, on ne le
- ⛔ Une abréviation ne s’emploie que là où la place manque.
- ⚠️ Le nom d’une section et celui d’un livre partagent leur FER, et cela se paie d’un débord.
- ⚠️ **Une rangée d’index est plus grosse que les cases de filtre qui la suivent, et c’est le
- ⛔ Ne pas la rabattre sur les filtres sans décision : ce serait quitter

## § 38. Les surfaces de lecture — volets, fiches et listes

**§ 38.25 — La fiche d’une ÉDITION — ce qui change est la LARGEUR d’une colonne, non le CÔTÉ de la frise**

- ⛔ DEUX DÉCISIONS INDÉPENDANTES, ET ON LES A D’ABORD CONFONDUES.
- ⛔ LA FICHE D’UNE ÉDITION GARDE DONC LA GÉOMÉTRIE DES DEUX AUTRES
- ⚠️ Le défaut d’origine est corrigé pareil, et il valait la moitié de la fenêtre.
- ⚠️ **Une composition ne se recopie pas d’une fiche à l’autre parce que les objets sont
- ⚠️ Mais elle ne vaut que pour ce que la donnée commande : une
- ⚠️ L’ORDRE DU DOCUMENT est celui de l’écran ET celui du téléphone : les notices d’abord.
- ⚠️ Seul l’alignement transversal doit revenir à « stretch » quand
- ⛔ IL N’Y A PAS DE PORTRAIT DANS LA FICHE D’UN LIVRE.
- ⛔ TOUTES LES NOTICES SE COMPOSENT DE LA MÊME FAÇON.

**§ 38.25.1 — Deux éditions à l’écran se DISTINGUENT, et la fiche doit le dire**

- ⛔ **LE RESPONSABLE SCIENTIFIQUE N’EST NI UNE VILLE NI UNE MAISON, et le prendre pour l’une
- ⛔ UNE NOTICE SAVANTE SE LIT PAR LA FIN : la maison, puis le lieu, la collection devant.
- ⚠️ **Mais cette lecture ne vaut QUE si la notice a nommé son
- ⛔ LA COLLECTION DE L’ŒUVRE NE DÉCRIT QUE SON TEXTE PAR DÉFAUT.
- ⚠️ La mesure est le seul juge, et elle se fait sur le CORPUS.

**§ 38.26 — Une rangée de contrôles se mesure en REM, et ce qui coûte la largeur est leur NOMBRE**

- ⛔ UNE RANGÉE DE CONTRÔLES ÉCRITE EN PIXELS N’EST PAS « TROP GROSSE » : ELLE EST FIXE.
- ⛔ MAIS LE PLANCHER DE 24 px EST ABSOLU, ET IL BORNE LE REMÈDE.
- ⚠️ **Corollaire, et c’est lui qui décide de la
- ⚠️ CE QUI RESTE DEHORS SE JUSTIFIE, ET UNE SEULE RAISON VAUT SANS CONDITION
- ⛔ RIEN NE PASSE AVANT LE NOM DE CE QU’ON LIT.
- ⛔ **LA COMPOSITION SUIT DONC LA LARGEUR, ET LA CHARTE DISAIT LE CONTRAIRE PENDANT UNE
- ⛔ MAIS LA CONDITION SE MESURE, ELLE NE SE POSE PAS.
- ⛔ ET LE PRÉDICAT NE DÉPEND JAMAIS DE L’ÉTAT QU’IL COMMANDE, sans quoi il oscille.
- ⚠️ RÉSULTAT MESURÉ : vingt noms coupés sur 105 avant, cinq après
- ⛔ Et la mesure a démenti un chiffre que le
- ⚠️ La mesure se prend en IFRAMES, une par écran.

## § 51. Les objets d’interface partagés

**§ 51.8 — L'OUTIL DE PARTAGE — une ligne, et des canaux NOMMÉS**

- ⛔ UNE SEULE LIGNE, LA MÊME PARTOUT, ET COURTE : « CS — QUI, QUOI ».
- ⚠️ Aucun guillemet dans la ligne, pas même autour d'un titre de publication
- ⛔ LES CANAUX SONT NOMMÉS, ET LE LIEN NU GARDE LA PREMIÈRE PLACE.
- ⛔ LES MARQUES SE DESSINENT AU TRAIT, DANS L'IDIOME DU SITE
- ⚠️ La fenêtre montre CE QU'ELLE VA ENVOYER
- ⚠️ L'adresse partagée est celle qu'on LIT, habits de lecture compris.
- ⛔ ET L'ADRESSE MONTRÉE PORTE SEULE SON INFORMATION : le seuil de 4,5 s'y applique.

## § 38. Les surfaces de lecture — volets, fiches et listes

**§ 38.26.1 — La rangée MONTRE TOUT, et ne cède que TOUT ENTIÈRE**

- ⛔ UN REPLI QUI JOUE EN TOUTES CIRCONSTANCES N'EST PLUS UN REPLI.
- ⛔ ET ELLE CÈDE D'UN COUP, JAMAIS PAR DEGRÉS.
- ⛔ CE QUI DISPUTE LA PLACE SE COMPTE, IL NE SE MESURE PAS.
- ⚠️ Une rangée n'a pas le même nombre de cibles pour tout le monde
- ⚠️ LE PRIX DE LA CIBLE DE L'ADMINISTRATEUR SE CHIFFRE, et il reste à trancher.
- ⚠️ Et « Eusèbe de Césarée » porte la rangée de l'administrateur d'UN SEUL PIXEL

## § 51. Les objets d’interface partagés

**§ 51.8.1 — La BULLE — rien que les logos, et le glyphe porte seul**

- ⛔ UN GESTE D'UNE SECONDE NE PREND PAS LE MILIEU DE L'ÉCRAN.
- ⛔ **DEUX ÉNONCÉS DU § 51.8 TOMBENT AVEC ELLE, ET IL FAUT LE DIRE PLUTÔT QUE DE LES LAISSER
- ⚠️ Ce qui reste entier du § 51.8 : la LIGNE elle-même, les canaux offerts, le
- ⚠️ CE QUE LE RETRAIT COÛTE EST RÉEL, et l'arbitrage est assumé
- ⛔ **CONSÉQUENCE, ET ELLE COMMANDE LE DESSIN : LA RECONNAISSANCE NE REPOSE PLUS QUE SUR LE
- ⛔ ET CE QUI S'ACCORDE ENTRE VOISINES EST L'ÉTENDUE D'ENCRE, NON LA BOÎTE DÉCLARÉE.
- ⚠️ La croix de X reste l'exception qui confirme la mesure
- ⛔ LA GÉOMÉTRIE DE LA BULLE S'ÉCRIT DEUX FOIS, ET UNE GARDE LES CONFRONTE.
- ⚠️ La mesure tient aux deux bouts de la police fluide
- ⛔ TOUT CE QUI EST HORS DE LA BULLE LA FERME, LE DÉCLENCHEUR COMPRIS
- ⚠️ L'ACCUSÉ DE COPIE SE DIT, ET NE S'ÉCRIT QUE SUR UN ÉCHEC.
- ⚠️ Et le seuil de 4,5 du § 51.8 n'a plus d'objet sur cette surface

## § 18. Interface de lecture

**§ 18.2 — Ce qui est fait pour le TÉLÉPHONE ne se donne pas sur un ORDINATEUR**

- ⛔ DEUX NAVIGATIONS À LA FOIS NE SONT PAS UN CHOIX, C'EST UN DÉFAUT.
- ⛔ LA CAUSE EST LE PIÈGE DU STYLE EN LIGNE, PAYÉ UNE SIXIÈME FOIS.
- ⛔ LE REMÈDE N'EST PAS DE CRIER, C'EST DE RENDRE LA PROPRIÉTÉ À LA FEUILLE.
- ⚠️ C'est la même règle que pour un état de SURVOL, qu'un fond posé en ligne rend
- ⛔ ET LA MESURE SE PREND SUR LA FEUILLE SERVIE, non sur celle du dépôt.
- ⚠️ UN AXE SANS GARDE DÉRIVE, et celui-ci n'en avait pas.
- ⚠️ Et le défaut ne se lisait NI dans le composant, NI dans la feuille

## § 38. Les surfaces de lecture — volets, fiches et listes

**§ 38.26.2 — L'ŒUVRE est en TÊTE du volet, et son TITRE ouvre la fiche**

- ⛔ CE QU'ON LIT PASSE AVANT QUI L'A ÉCRIT.
- ⛔ LE TITRE PORTE LA FICHE, ET LE LIEN S'EFFACE.
- ⚠️ Le titre se compose comme un TITRE, jamais comme un lien
- ⚠️ La mesure de la rangée d'actions ne bouge pas

**§ 38.27 — Le mode de lecture par DÉFAUT est le FRANÇAIS SEUL, et un choix ne survit pas à la visite**

- ⛔ UNE PRÉFÉRENCE SANS FIN N'EST PLUS UNE PRÉFÉRENCE.
- ⚠️ Un lien qui NOMME le mode l'emporte toujours.
- ⛔ ET UNE CLÉ QUE PLUS RIEN N'ÉCRIT NE SE LIT PLUS.

**§ 38.28 — La PREMIÈRE LIGNE du volet patristique porte la flèche, et son fond est UNIFORME**

- ⛔ UNE BANDE QUI NE PORTE PLUS QU'UN CONTRÔLE N'EST PLUS UNE LIGNE, C'EST UNE MARGE.
- ⛔ UN FOND APPARTIENT À LA BARRE, JAMAIS À L'ONGLET RETENU.
- ⚠️ La teinte NE CHANGE PAS, elle change de porteur.
- ⛔ On ne PROFITE pas d'un déplacement pour hausser une dose : le
- ⛔ L'ONGLET RETENU SE DISTINGUE ALORS COMME DANS LE MODÈLE PARTAGÉ
- ⚠️ Une teinte translucide se relit sur son NOUVEAU sol.
- ⚠️ ET CE LIBELLÉ ÉTAIT DÉJÀ SOUS LE SEUIL, sur tout le site.
- ⚠️ La flèche du repli reste sous son seuil elle aussi

## § 13. Notes et apparats

**§ 13.17 — Les BLOCS d'une note se composent d'une seule main**

- ⛔ UN SEUL FER POUR TOUT CE QUI SE DÉTACHE, ET IL SE COMPTE EN `em`.
- ⛔ UN VERS NE SE CÉSURE NI NE SE JUSTIFIE, ET L'ENCART EST SA SIXIÈME SURFACE.
- ⚠️ Et la boîte règle le lemme sans qu'on ait à le nommer.
- ⛔ LA BOÎTE DOIT PORTER LA NOTE, ET L'ESTIMATION NE COMPTAIT QUE DES SIGNES.
- ⚠️ On SURESTIME plutôt qu'on ne sous-estime
- ⚠️ La portée est étroite, et elle est mesurée

## § 38. Les surfaces de lecture — volets, fiches et listes

**§ 38.29 — La barre d'onglets d'un VOLET : le modèle commun, resserré, et 31 px de haut**

- ⛔ **UNE BARRE D'ONGLETS DE VOLET N'EST PAS UNE BARRE DE PLUS : C'EST LE MODÈLE COMMUN À LA
- ⛔ On ne la recompose jamais en styles en ligne.
- ⛔ SON REMBOURRAGE VAUT 6 PX, ET ELLE MESURE 31 PX.
- ⛔ LA HAUTEUR APPARTIENT À LA VARIANTE, DONC À TOUTES LES BARRES QUI LA PORTENT
- ⚠️ Au doigt rien ne change : le plancher tactile de l'onglet (2,75 rem) l'emportait

**§ 38.29.1 — Le libellé se centre sur l'onglet ENTIER, et le rembourrage suit le corps**

- ⛔ LE § 38.29 SE TROMPAIT EN VOULANT LE REMBOURRAGE SYMÉTRIQUE.
- ⛔ **LE REMBOURRAGE VAUT SIX PIXELS PLUS UN DIXIÈME DE CADRATIN DESSUS, ET SIX MOINS UN DIXIÈME
- ⚠️ Le centrage se mesure sur l'ENCRE, et sur les PIXELS d'une capture

## § 13. Notes et apparats

**§ 13.18 — Ce que le RENDU d'une note lit, et la ligne de la citation visée**

- ⛔ LE TEXTE LU EST LA COLONNE `text`, ET ELLE SEULE.
- ⛔ LA CITATION VISÉE N'OUVRE QUE LA LIGNE D'UN PROPOS.
- ⛔ L'ITALIQUE D'UN BLOC DIT LA LANGUE, ET RIEN D'AUTRE
- ⚠️ Un renvoi posé en ligne dans un bloc latin ne prend pas son italique : un
- ⛔ LA DISPOSITION SE LIT DANS LA DONNÉE, AVANT LA FORME ET LA NATURE.
- ⛔ La citation visée n'y fait pas exception
- ⛔ LA NATURE ET LA DISPOSITION SONT DEUX AXES.
- ⛔ UN CONTRÔLE DE NOTE SE FAIT SUR LE RENDU, JAMAIS SUR LA SEULE BASE.

**§ 13.19 — La note dans le VOLET PATRISTIQUE — dépliée au-dessus de l'extrait**

- ⛔ UN VOLET LIT LES MÊMES NOTES QUE LA PAGE DE L'ŒUVRE.
- ⛔ DANS UN VOLET, LA NOTE NE FLOTTE PAS : ELLE SE DÉPLIE.
- ⛔ ELLE S'OUVRE AU CLIC, JAMAIS AU SURVOL.

## § 52. Les états de publication et de validation

**§ 52.2 — La règle**

- ⛔ Validé, terminé et travail en cours sont publiés. L’invalide ne l’est jamais.
- ⛔ Invalide veut dire un problème réel, jamais « pas fini ».
- ⚠️ Un texte sans aucun segment n’est pas publié — faute de rien à montrer ; il paraît de lui-même au premier segment importé.
- ⚠️ Une œuvre n’est publiée que si l’un de ses textes l’est — une œuvre ne s’annonce plus sans rien à lire, alors que six l’étaient encore le matin de la règle.

**§ 52.3 — Ce que voit le lecteur**

- ⛔ Le lecteur doit penser que tout ce qui paraît est validé et terminé (décision de l’éditeur, 11 septembre 2026).

**§ 52.4 — Où vivent ces états**

- ⛔ La publication se DÉRIVE en base, elle ne s’écrit jamais — ni par le site, ni par un script, ni par une chaîne d’import.
- ⚠️ Une chaîne d’import qui écrit encore l’ancien vocabulaire est traduite, jamais refusée — `published` et `review` deviennent `termine`, `draft` devient `en_cours`, `retired` devient `invalide` avec un motif générique.
- ⚠️ Au 11 septembre 2026, 117 blocs de Fillion en relecture restent non publics, dont trois fusionnés (`merged_into`), ainsi qu’une gravure validée : la chaîne publie ce qui est prêt et déclare invalides les doublons.
- ⛔ Un rejeté ou un exclu ne paraît jamais ; le reste paraît.
- ⚠️ Au 11 septembre 2026, deux lectures ne l’appliquent pas encore : l’apparat d’une œuvre et « Du même auteur » de Fillion citent un ouvrage exclu s’il y est rattaché, et une péricope rejetée resterait servie (aucune ne l’est).

**§ 52.5 — Qui écrit quoi**

- ⛔ La traduction liturgique de l’AELF (TR0012) est invalide pour raison de droits.

**§ 52.6 — Chiffres, pages et vues**

- ⛔ Un chiffre public se compte sur ce que le lecteur peut ouvrir — le bandeau, le rang des lecteurs et « les versets les plus cités » lisent la publication dérivée.
- ⛔ Une page lue avec la clé de service ne voit aucune politique — elle filtre la publication elle-même.
- ⚠️ `create or replace view` remplace aussi les options de la vue.

**§ 52.7 — La modération des contenus des lecteurs**

- ⛔ Seule la modération écrit une colonne de modération, et la base le garantit — pas l’écran : `publie_at` et `note_admin` d’un essai, `valide` d’un commentaire d’essai, `valide`, `certifie` et `message_admin` d’un commentaire, le statut d’une proposition.
- ⚠️ La date de validation d’un essai servait de preuve alors que l’auteur pouvait l’écrire : un lecteur se publiait sans modération.

---

## Couverture — les chapitres que le noyau représente le moins

Un chapitre qui prescrit sans employer ⛔ ni ⚠️ passe sous le noyau. La colonne à surveiller est la dernière : elle mesure une CONVENTION D’ÉCRITURE, non une densité de règle.

| § | chapitre | signes | énoncés | pour mille signes |
|---|---|---:|---:|---:|
| 3 | Typographie — les signes, les espaces, l’enric | 64 407 | 46 | **0.7** |
| 6 | Structure, niveaux, paragraphes et rangs | 10 424 | 8 | **0.8** |
| 15 | Corpus biblique et traductions | 17 044 | 16 | **0.9** |
| 35 | Chantier Fillion — la composition du paratexte | 79 344 | 79 | **1.0** |
| 48 | Le protocole d’océrisation d’une bible | 46 262 | 51 | **1.1** |
| 37 | La notice d’une traduction — le bandeau et l’e | 8 621 | 10 | **1.2** |
| 49 | Les gravures d’une édition biblique | 49 477 | 60 | **1.2** |
| 12 | Textes parallèles et alignements sémantiques | 28 213 | 35 | **1.2** |
