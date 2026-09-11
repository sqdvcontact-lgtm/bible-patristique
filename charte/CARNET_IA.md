# Carnet de chantier — Corpus Scriptura

Ce carnet reçoit ce que la charte refuse. Il **n'est pas normatif** : en cas de divergence, la charte prévaut, toujours.

Il vit dans **`parametres.carnet_ia`**, comme la charte vit dans `parametres.charte_ia`. `charte/CARNET_IA.md` n'en est qu'un miroir, tiré et poussé par `node scripts/synchroniser-charte-supabase.mjs --carnet --pull` (ou `--push`).

## Ce qui s'écrit ici

Les journaux de séance, les bilans chiffrés, les listes d'œuvres traitées, les mesures datées, les relevés d'audit, le récit d'une correction, les anciennes décisions et ce qui a été essayé puis écarté.

## ⛔ Ce qui ne s'écrit PAS ici

Une **règle**. Elle se reconnaît à ce qu'elle vaut pour la PROCHAINE séance : elle prescrit, elle interdit, elle nomme un invariant, elle dit ce qu'un contrôle doit refuser. Sa place est dans la charte, et nulle part ailleurs.

⚠️ **Une trouvaille de carnet peut FONDER une règle, et c'est le chemin ordinaire** : on écrit alors la règle dans la charte, courte, et l'on garde ici la mesure qui la soutient, avec sa date. Le carnet porte la preuve, la charte porte la loi.

## Entrées

### 2026-09-08 — Ouverture du carnet

La charte interdisait le journal de chantier dès son préambule, et depuis l'origine : « Les journaux de chantier, bilans chiffrés, listes d'œuvres traitées et anciennes décisions ne lui appartiennent pas. » Elle en portait pourtant 925 336 signes, dont le § 38 (166 714) et le § 35 (132 499) sont en grande part des journaux, sous des titres qui ne les décrivent plus.

**Une interdiction sans destination ne s'applique pas.** Le carnet est la destination.

Relevé du jour, avant remise en ordre :

| ce qui a été mesuré | valeur |
|---|---|
| charte | 925 336 signes, 6 322 lignes, 50 chapitres, 417 titres |
| sous-sections loin de leur chapitre (> 300 lignes) | **96**, soit **235 600 signes — 26,1 %** |
| pire écart | § 12.4, à 4 787 lignes du § 12 |
| bloc le plus disloqué | § 13.8 à § 13.12.3, onze sous-sections, à ~3 900 lignes du § 13 |
| numéros portés deux fois | 12.3, 43.1, 43.2 — corrigés le jour même |
| chapitres de premier rang sans numéro | 1 (« Césures de mots entre unités source », 10 832 signes) |
| endroits où vit la règle typographique | 7 |
| `parametres` | 708 clés, ~239 Mo, dont **234 Mo de sauvegardes (98 %)** |
| dont copies complètes de la charte | **180, pour 82 Mo** |

**La cause de la dislocation n'est pas un relâchement, c'est un invariant.** Les 139 scripts `charte-*.mjs` portent tous `if (!attendu.startsWith(distant.trimEnd())) throw` : le garde-fou rend impossible de tronquer 900 000 signes par accident, et impossible d'insérer une section à sa place. Toute doctrine nouvelle s'est donc posée en queue, et une section neuve a fini par tomber sur un numéro déjà pris — ce qui bloquait `--push` depuis le 25 août, et forçait à écrire directement en base, ce qui aggravait la dislocation. La boucle est fermée le 2026-09-08.

### 2026-09-08 — Remise en ordre de la charte : ce que la mesure a donné

| | avant | après |
|---|---:|---:|
| numéros portés deux fois | 3 | **0** |
| retours en arrière dans la numérotation | 9 | **0** |
| titres de premier rang sans numéro | 1 | **0** |
| sous-sections à plus de 300 lignes de leur chapitre | 96 | **0 par dislocation** |
| plus grand écart | 4 787 lignes | 1 449 (épaisseur du § 35, non dislocation) |
| `--push` | refusé depuis le 25 août | **rendu au service** |

Le déplacement a été mené comme une **permutation vérifiée** : mêmes lignes des deux côtés, même longueur, aucun mot touché. Les blocs sans numéro voyagent avec le bloc numéroté qu'ils suivent — ils n'ont pas d'adresse propre, et les déplacer seuls les couperait de ce qu'ils précisent.

**Le rangement a révélé les vraies tailles, que la dislocation masquait :**

| § | mesuré avant | mesuré après | sous-sections |
|---|---:|---:|---:|
| 35 — Chantier Fillion | 132 499 | **210 426** | 75 |
| 38 — surfaces de lecture | 166 714 | **142 424** | 34 |
| 13 — Notes et apparats | 14 586 | **46 987** | 17 |
| 40 — Espace du lecteur | 81 668 | 38 131 | 12 |
| 46 — La visite | 66 456 | 21 572 | 0 |

Le § 13 avait perdu les deux tiers de lui-même ; le § 40 et le § 46 hébergeaient ce que d'autres chapitres avaient déposé chez eux. **Le § 35 et le § 38 pèsent 38 % de la charte à eux deux.**

### 2026-09-08 — Il n'y a AUCUN doublon textuel dans la charte

Mesuré sur les 416 sections, par empreintes de suites de huit mots significatifs (accents, ponctuation et mots courts ôtés) :

- recouvrement ≥ **30 %** de la section la plus courte : **zéro paire** ;
- recouvrement ≥ **12 %** : **deux paires**, et toutes deux légitimes — § 13.6 (ancres positionnelles) contre § 19.5 (notes structurées), qui disent la même matière en doctrine puis en modèle de données ; § 35.9 (manchette) contre § 41.4 (mesure étroite), qui se complètent.

⚠️ **Le seul vrai doublon ne se voyait pas aux empreintes**, parce qu'il redit la règle en d'autres mots : les anciens § 14.14 et § 14.15 prescrivaient tous deux de ne jamais fabriquer d'offsets contre un ordre OCR corrompu, de revenir au fac-similé et de corriger la source avant de recalculer. Fondus le jour même.

**Conclusion de méthode :** ce qu'on prend pour un doublon dans la charte n'est presque jamais une répétition, c'est une **dispersion de sujet**. La règle typographique vit en sept endroits (§ 3, § 41, § 35.0, § 35.7, § 35.10, § 23.11, § 13.9) sans se répéter une seule fois. On ne la dédoublonne pas : on la rassemble.

### 2026-09-08 — Purge des sauvegardes de `parametres`

La table qui porte la charte était à **98 % un cimetière de copies**.

| famille | clés | poids |
|---|---:|---:|
| la charte | 1 | 949 ko |
| sauvegardes de la charte | 180 | **82 Mo** |
| autres sauvegardes (`backup*`) | 372 | **152 Mo** |
| le reste (doctrine, specs, catalogue) | 155 | 4,6 Mo |

Cent quatre-vingts copies COMPLÈTES de la charte, écrites l'une après l'autre avant chaque écriture de doctrine, jamais relues, jamais retirées.

**Contrôle avant suppression** : les 477 clés visées ne sont référencées que par des scripts datés à usage unique, déjà joués, et **uniquement en écriture** (`upsert`) — aucune ligne du site ni d'un outil ne les lit. Manifeste conservé dans `audit/parametres-purge-20260908.json` (clé, date, et ce qui est gardé).

| | avant | après |
|---|---:|---:|
| clés | 708 | **232** |
| poids logique | 239 Mo | **53 Mo** |

Les 94 sauvegardes gardées sont celles des trois derniers jours ; elles tomberont d'elles-mêmes. Règle posée en charte § 27.1, tenue par `public.purger_sauvegardes_parametres()` et le travail périodique `purger_sauvegardes`, chaque nuit à 3 h 20. ⚠️ Le poids sur DISQUE reste à 99 Mo le temps que l'autovacuum reprenne les tuples morts : c'est normal, et ce n'est pas une purge incomplète.

### 2026-09-08 — Concordance des numéros après la coupe du § 35 et du § 38

Un ancien numéro doit rester résoluble : voici où chaque chose est passée.

| ancien | neuf | ce que c'est |
|---|---|---|
| 35.6, 35.6.1 à 35.6.7 | **47.0 à 47.7** | la notice bibliographique |
| 35.8 | **48.0** | le protocole d'océrisation d'une bible |
| 35.8.0 à 35.8.7 | **48.1 à 48.8** | ⚠️ décalés d'un rang, le `.0` devenant `.1` |
| 35.8.2.1 | **48.3.1** | postconditions des transformations |
| 35.16, 35.16.1 à 35.16.23 | **49.0 à 49.23** | les gravures |
| 38.3 · 38.9 · 38.21 · 38.28 · 38.29 · 38.30 | **50.1 à 50.6** | la Polyglotte (les enfants suivent : 38.28.1 → 50.4.1) |
| 38.25 · 38.26 · 38.27 · 38.17 · 38.12 | **51.1 à 51.5** | les objets d'interface partagés |
| 41, 41.1 à 41.6 | **3.11, 3.11.1 à 3.11.6** | le gris typographique, entré au § 3 |

⛔ **Le numéro 41 reste VACANT.** Refermer le trou coûterait la renumérotation de dix chapitres et de deux cents renvois, pour un gain purement cosmétique.

**Ce que la coupe a rendu :**

| § | avant | après | sous-sections |
|---|---:|---:|---:|
| 38 | 142 424 | **85 456** | 34 → 19 |
| 35 | 210 426 | **79 270** | 75 → 41 |
| les deux ensemble | **38 %** de la charte | **17,6 %** | |

**Contrôle** — c'est lui qui rendait l'opération faisable. Un relevé compte tous les renvois numérotés du dépôt (charte, `AGENTS.md`, `app/`, `scripts/`, `sql/`, `supabase/`) et confronte chacun aux titres réels de la charte :

| | avant | après |
|---|---:|---:|
| renvois numérotés | 1 386 | 1 398 |
| numéros distincts | 266 | 271 |
| **renvois pendants** | **18** | **17** |

Un de moins qu'au départ, aucun cassé. ⚠️ Les 17 pendants sont pour la plupart des faux positifs — WCAG § 2.5.8, CSS 2.1 § 10.4, un « § 1127 » qui est un numéro de colonne de Migne — et quatre vrais, dans de vieux scripts qui citent des sections disparues avant aujourd'hui.

⚠️ **Neuf fichiers portant des chantiers d'autrui n'ont pas été indexés**, bien que mes réécritures de renvoi s'y soient appliquées sur le disque : elles partiront avec leur travail. Si l'un d'eux est annulé, un renvoi ancien y reparaîtra — le relevé le dira.

### 2026-09-08 — Abrogations, et le rang d'un titre fixé

**Le § 13.8.1 déclarait ouvert un travail fait, sur un chiffre faux.** « Reste connu, non corrigé : 1 716 renvois gardent un chapitre romain parce qu'il est écrit en MINUSCULES […] il attend une décision. » Or `RE_RENVOI` porte `[ivxlcdm]{1,6}` depuis le 5 septembre, et le § 13.12 rectifiait le chiffre douze lignes plus bas : **355 occurrences, dont 223 réécrites**. La mention est supprimée (288 signes) et la rectification du § 13.12 réaccordée, sa phrase ne rebattant plus rien.

**Le § 49.17 est abrogé** — 24 lignes, 1 399 signes. Il déclarait que `app/lib/partIllustration.test.ts` tenait la règle du régime des gravures ; ce fichier n'existe pas, et la question a été fermée autrement le 3 septembre, par les colonnes `regime` et `part_colonne` (§ 49.23). ⚠️ Il portait seul un principe général — « une règle recopiée dans deux fichiers ne reste la même que par accident » — qui est greffé sur le § 49.23 avec la conséquence mesurée qui le prouve : dix-neuf gravures larges au trait fabriquées détourées puis composées comme des photogravures, noires sur le cuir, servies à 1,43 fois leur taille. **On abroge une règle périmée, on ne jette pas la leçon qu'elle portait.**

⚠️ **C'était le DERNIER chemin de fichier mort de la charte** : elle en cite désormais zéro.

**Le rang d'un titre est fixé** : il répond à la profondeur du numéro. Vingt-sept titres s'écrivaient `###` là où leur numéro en appelle quatre — § 3.5.1, § 13.12.2, § 15.1.1, § 16.2.1, les six du § 35.14… Tous corrigés ; il n'en reste aucun.

**Deux numéros vacants**, et la règle qui les explique est posée en § 27.3 : le **§ 41** (la densité des textes a rejoint le § 3.11) et le **§ 49.17**. ⚠️ Ils font monter le compte des renvois pendants de 17 à 19, et c'est normal : ce sont les deux que le § 27.3 cite pour les déclarer vacants.

### 2026-09-08 — Le § 48 ne manque pas d'interdits, il parle un autre dialecte

J'avais annoncé le protocole d'océrisation comme le chapitre le moins prescriptif de la charte, sur sa densité de marques : **0,3 ⛔ ou ⚠️ pour mille signes**, contre 2,6 aux chapitres récents. La mesure est juste, le diagnostic était faux.

Le § 48.1 porte 5 marques mais **42 passages en gras**, et sa prose prescrit sans marqueur : « on ne mélange pas plusieurs familles de correction dans une même passe », « on ne corrige jamais seulement l'exemple rencontré ». La doctrine y est.

⛔ **Mais la conséquence tient, et elle est mécanique** : un noyau dérivé qui s'extrait sur `⛔`/`⚠️` sauterait **45 979 signes de protocole** pour n'en tirer que treize lignes. Ce n'est pas une passe d'écriture qu'il faut, c'est une passe de **marquage**.

**Corollaire de méthode** : une densité de marques mesure une CONVENTION D'ÉCRITURE, pas une densité de règle. Ne pas conclure d'un chiffre bas qu'un chapitre prescrit peu — l'ouvrir d'abord.

### 2026-09-08 — Passe de marquage sur le § 48, et ce qu'elle a rendu

Le protocole d'océrisation d'une bible prescrivait fermement **sans marque** : 46 262 signes pour 13 ⛔ ou ⚠️, soit **0,3 pour mille**, la densité la plus faible de tous les grands chapitres. Le noyau, qui s'extrait sur ces marques, n'en tirait donc presque rien.

⛔ **Rien n'a été déplacé ni réécrit.** Quarante et un impératifs enfouis dans la prose ont été marqués **là où ils sont**, et mis en gras : « on ne corrige jamais seulement l'exemple rencontré », « Aucun chiffre de suivi n'est estimé », « La casse d'un heading source n'est jamais normalisée », « On ne réécrit jamais le témoin pour faire disparaître une faute OCR », « Un sondage n'est jamais une preuve de complétude ». L'ordre de lecture, le contenu et la démonstration ne bougent pas d'un mot.

| | avant | après |
|---|---:|---:|
| marques dans le § 48 | 13 | **54** |
| pour mille signes | 0,3 | **1,2** |
| énoncés que le noyau en tire | 13 | **52** |
| noyau entier | 1 212 énoncés | **1 250** |

⚠️ **Le noyau a GROSSI de 3 700 signes, et c'est le résultat attendu** : il ne mesure pas la brièveté de la charte, il mesure ce qu'on peut en extraire sans l'ouvrir. Un chapitre mal marqué le fait paraître court en cachant sa loi.

**Ce qui reste au § 48** : les gras y sont des ÉTIQUETTES DE PASSE — « **Passe 0 — Préflight documentaire** » — et non des impératifs. L'extracteur prend le gras de tête quand il y en a un ; sur ces paragraphes-là il prend donc l'étiquette. La passe règle-d'abord complète, qui mettrait l'impératif AVANT l'étiquette, reste à faire ; le marquage était le préalable.

### 2026-09-08 — Le marquage étendu à huit chapitres, et le relevé de couverture refermé

La passe du § 48 a été reprise sur les huit chapitres que le relevé désignait ensuite, dans l'ordre où il les nommait. **Rien n'a été déplacé, rien n'a été réécrit** : l'impératif est marqué là où il est, et mis en gras. L'ordre de lecture, la démonstration et le contenu ne bougent pas d'un mot.

| chapitre | signes | marques | énoncés au noyau | pour mille |
|---|---:|---:|---:|---:|
| § 48 · Océrisation d'une bible | 46 262 | 13 → **54** | 13 → **51** | 0,3 → **1,1** |
| § 26 · Chronologie et frise | 24 153 | 0 → **39** | 0 → **35** | 0,0 → **1,4** |
| § 31 · Atelier La Gueule | 12 211 | 0 → **22** | 0 → **22** | 0,0 → **1,8** |
| § 23 · Protocole de modification | 26 022 | 2 → **38** | 2 → **37** | 0,1 → **1,4** |
| § 29 · Valeur académique | 10 633 | 1 → **25** | 1 → **25** | 0,1 → **2,4** |
| § 11 · Format d'échange et import | 8 943 | 1 → **25** | 1 → **24** | 0,1 → **2,7** |
| § 19 · Modèle de données | 16 938 | 4 → **45** | 4 → **44** | 0,2 → **2,6** |
| § 16 · Auteurs, œuvres et catalogue | 24 584 | 3 → **54** | 3 → **53** | 0,1 → **2,2** |
| § 14 · OCR, HTR et transcription | 12 974 | 4 → **47** | 4 → **46** | 0,3 → **3,5** |

**Le noyau passe de 1 212 à 1 527 énoncés**, de 163 814 à 203 429 signes, et couvre 265 sections au lieu de 180.

⚠️ **Il a donc GROSSI d'un quart, et c'est le résultat attendu** : il ne mesure pas la brièveté de la charte, il mesure ce qu'on peut en extraire sans l'ouvrir. Neuf chapitres le faisaient paraître court en cachant leur loi.

**Le relevé de couverture s'est refermé, et c'est lui qui dit d'arrêter.** Il nommait successivement les chapitres à 0,0 · 0,1 · 0,2 ; il nomme maintenant § 3 (0,7), § 15 (0,7), § 6 (0,8), § 35 (1,0) et § 48 (1,1). Plus aucun chapitre ne se détache. ⛔ **Au-dessus de 0,7 on mesure une CONVENTION D'ÉCRITURE, non un manque** — le corollaire tiré du § 48 vaut dans les deux sens, et il interdit de poursuivre la passe pour faire monter un chiffre.

### 2026-09-08 — Dix suites « antislash + n » avaient survécu à l'unification du 24 août

Cherchées après coup, sur tout le fichier : **dix** suites `\n` écrites en toutes lettres, hors de tout intervalle de code. L'unification du 24 août 2026 en avait réparé vingt et une et déclaré le cas clos.

Neuf collaient un sous-titre en gras à la fin du paragraphe précédent — donc **l'effaçaient au rendu** : « Capitale initiale après fin de phrase », « Numérotation historique des livres des Rois », « Troisième règle : la ponctuation ne se double jamais », « Numéros de notes », « Contrôle bloquant supplémentaire », « Lien entre la pièce et la notice ». Une dixième, à un seul `n`, collait deux entrées d'une liste du § 13.8.1. Une onzième a été trouvée en marquant le § 23.12, et corrigée avec lui.

⚠️ **Ces titres étaient dans le fichier et ne paraissaient nulle part.** Ils ne se voient ni au compte de signes, ni au compte de titres — le titre n'en est pas un pour l'analyseur — ni au relevé de couverture, qui ne compte que des marques.

⛔ **Six suites RESTENT, et elles sont justes** : elles vivent dans un intervalle de code, où elles DÉSIGNENT la valeur au lieu de la subir — le `join_before` d'un vers au § 7.4, le séparateur de paragraphe du § 13.8.1, l'interdit du § 45.2. Le contrôle compte donc les accents graves qui précèdent, et ne relève que ce qui tombe hors du code.

**Corollaire de méthode** : un défaut qui rend un titre INVISIBLE ne se trouve par aucun compte, puisqu'il retire l'objet qu'on compterait. Il se cherche par son symptôme matériel — ici, deux caractères — sur le fichier entier.

### 2026-09-08 — L'encart de note : les neuf divergences, et ce que la mesure a décidé

Demande de l'auteur, après avoir écarté les notes en marge : « Je veux un encart propre, avec des marges, épuré, large, avec un élément qui permet de savoir à quelle note il est associé ; dans l'esprit du site. » Puis, sur l'intitulé : « Je propose qu'il disparaisse pour les 58 % de notes sans type, - ok ». La doctrine est au § 13.13 ; voici les chiffres.

**Les neuf divergences des trois encarts**, relevées avant reprise :

| | lecture d'une œuvre | traductions parallèles | page Bible |
|---|---|---|---|
| largeur | 340 px | 340 px | 460 px |
| hauteur demandée | 340 px | 340 px | 420 px |
| corps du texte | 0,78125 rem | 0,78125 rem | 0,8125 rem |
| rembourrage | 10 / 12 px | 10 / 12 px | 12 / 14 px |
| croix | une fois figée | toujours | toujours |
| intitulé | le TYPE de la note | apparat ou « Note » | « Note » en dur |
| numéro affiché | celui du lecteur | le numéro INTERNE | celui du lecteur |
| encre de la croix | `#b0a08a` en dur | `#b0a08a` en dur | jeton |
| marge du placeur | 16 px | 16 px | `MARGE_FENETRE` |

**Ce que le corpus dit** (24 168 notes, 24 729 blocs, mesuré le jour même) : médiane **29 signes**, neuvième décile **88**, maximum **10 094**. 73 % tiennent en quarante signes, 92,6 % en cent vingt, 2,4 % passent quatre cents. **14 077 notes — 58 % — ne déclarent aucun type** ; 8 425 sont un apparat critique. ⚠️ **Aucune note du corpus n'est unanimement `translator_note`** : le type existe au vocabulaire et personne ne le porte encore.

**La hauteur, calibrée sur la composition réelle** (planche du jour, encart de 29 rem à la racine 16, piste de 355 px quand la barre de défilement paraît) : la médiane de 29 signes demande **65 px**, une note de 340 signes en demande **162**, un apparat de 90 signes avec son intitulé **91**. L'estimation rend 66, 163 et 103 — elle couvre les trois, et le plafond de 30 rem retient les 1 721 px que réclame la note de 3 963 signes de Boèce. ⚠️ Sa première écriture oubliait la marge de queue du dernier paragraphe et les deux filets : une note d'une seule ligne défilait.

**Trois défauts corrigés en chemin**, tous invisibles depuis une seule surface : les traductions parallèles affichaient le numéro interne ; la page Bible écrivait « Note » en dur ; et l'infobulle de la lecture se figeait au bout de quatre secondes de survol, sans que rien ne le dise — la croix paraissait alors sous le curseur.

⚠️ **Un quatrième s'est vu à la PLANCHE, et nulle part ailleurs** : la croix se pose au coin du cadre, la barre de défilement au bord du corps, et une barre système de quinze pixels passait exactement dessous. L'encart prend donc la barre discrète du site, six pixels, qui rend en outre six pixels de piste au texte.

⚠️ **Ce que la planche a d'abord fait dire de faux** : rendue sans la préflight de Tailwind, elle mesurait ses boîtes en `content-box` et donnait 366 px de large à l'encart d'hier, qui en fait 340. Une planche qui inline la feuille du site doit inliner aussi ce que la préflight y pose.

**Reste ouvert** : les blocs d'une note biblique ne portent aucun `editorial_role` — l'axe « qui parle » n'existe que du côté patristique — et l'encart s'y tait donc toujours ; le jour où la donnée le portera, la règle du § 13.13 le composera sans qu'on y touche.

### 2026-09-08 — La manchette : le partage du corpus, la collision, et deux défauts que seule la planche a vus

Le partage renvoi / commentaire est au § 13.14 ; voici les chiffres et ce qui reste ouvert.

**LA COLLISION.** 1 618 couples de renvois voisins dans un même segment (ancres de `texte_note_ancres`, écart converti en lignes à 83 signes la ligne de la colonne de lecture) : écart médian **1,46 ligne**, premier quartile 0,95, premier décile 0,63 ; **26,4 % sont sous une ligne**, et **366 couples se heurtent** — 22,6 % des couples, environ 3 % des 11 829 renvois. L'empilement est donc l'exception. ⚠️ 3 353 ancres sur 24 007 n'ont pas d'offset exploitable et restent à l'encart. Rejouable : `tmp/renvois-marge-collision.mjs`.

**UN `<div>` DANS UN `<p>` FERME LE PARAGRAPHE.** Première planche : quatre renvois sur treize rendaient une boîte VIDE, et la même note se rendait très bien hors du paragraphe. `ContenuNoteStructuree` compose ses blocs en `<div>` ; l'analyseur du navigateur clôt alors le `<p>`, remonte le `<div>` d'un cran et repart en paragraphe implicite. ⚠️ Ce n'est pas affaire de CSS : `position: absolute` fait bien une boîte de bloc, mais l'analyseur ne lit que le nom de la balise. D'où `ContenuRenvoiEnLigne`, qui partage les mêmes fonctions de normalisation et ne change que la boîte.

**L'ENCRE.** `--cs-texte-doux` rend **2,71** au corps de 10 px sur le papier du site, `--cs-texte-gris` 3,45, `--cs-texte-second` **5,24** (10,01 en Cuir). C'est le second qui sert.

**LA PLANCHE MENT TANT QUE LES POLICES NE SONT PAS LÀ.** Mesuré avant elles, les hauteurs sont celles d'une police de secours, l'empilement se cale faux, et les entrées se recouvrent. Elle rejoue donc sur `document.fonts.ready` ; le crochet du site, lui, a son `ResizeObserver`. Après quoi : 13 renvois, 4 poussés, **zéro chevauchement**.

**RESTE OUVERT — LE PRÉFIXE « Référence imprimée : ».** **5 002 renvois sur 11 828 (42,3 %)** ouvrent sur ces trois mots. Dans une manchette de 104 px ils prennent une ligne entière à eux seuls : la plupart des entrées font deux lignes là où elles en feraient une, et c'est ce qui rend la zone dense difficile à composer. La question est déjà posée au registre des propositions de GPT (« Faut-il conserver le préfixe dans le texte de la note ? ») et elle attend un arbitrage. ⛔ Elle ne se règle pas au rendu : depuis le § 13.9 la normalisation se fait DANS la donnée.

**AUCUN renvoi pur ne porte de notice bibliographique** : 244 blocs du corpus sont liés à un ouvrage, tous dans des notes qui disent autre chose. La règle du § 13.14 le prévoit tout de même.

**Le pire cas du corpus** est l'« Explication sur le psaume IV » du Commentaire sur les Psaumes de Chrysostome (Jeannin 1865), dont le texte porte 1 798 renvois purs à lui seul. La planche montre sa fenêtre la plus dense : huit renvois en dix lignes.

### 2026-09-08 — L'encart en marge : les quatre largeurs mesurées, et les six pixels du renvoi

La doctrine est au § 13.15 ; voici les chiffres.

**CE QUE LA MARGE OFFRE**, colonne de lecture d'une œuvre (31,25 rem) centrée entre deux volets d'environ 250 px chacun, encart de 29 rem :

| fenêtre | marge à droite | encart retenu |
|---|---:|---|
| 1920 | 686 px | 464 px, sa mesure pleine |
| 1440 | 446 px | 446 px, resserré |
| 1280 | 366 px | 366 px, resserré |
| 1024 | 238 px | aucun : il repasse sous son appel |

⚠️ La marge se compte jusqu'au bord de la FENÊTRE, non jusqu'au volet : l'encart a le droit de se poser dessus. C'est ce qui fait la différence entre 366 px et rien du tout à 1280.

**LE PLANCHER EST À 20 rem — 320 px**, vingt de moins que le plus étroit des trois encarts d'hier, et c'est un choix : c'est ce qui permet à la marge de servir dès 1280 px, où elle n'offre que 366. La piste de texte y vaut encore quarante-quatre signes par ligne. ⛔ Le relever d'un rem renverrait l'encart par-dessus le texte sur tous les portables.

**LES SIX PIXELS DU RENVOI.** Mesurés sur la planche, ligne de base contre ligne de base, sur toutes les entrées : **−6,0 px**, parfaitement constant. La cause est que la position statique d'un bloc absolu est le haut de sa LIGNE, quand ce qu'il faut aligner est la ligne de BASE, et que le renvoi (0,625 rem) et le texte (0,8125 rem) n'ont pas la même ascendante. ⚠️ Corrigé par MESURE et non par constante — deux sondes de hauteur nulle alignées sur la ligne de base, une par passe : les deux corps sont en rem et la police racine est fluide. Après : **0,0 px** sur toutes les entrées, et toujours zéro chevauchement.

**LE NUMÉRO DE L'ENCART.** Il tenait une colonne de grille de 2,25 rem sur toute la hauteur de la note. Sur la note de 3 963 signes de Boèce — dix-sept blocs, vingt lignes rendues —, cela faisait dix-neuf lignes de blanc à gauche pour deux chiffres. Passé en flottant, la mesure entière revient au texte dès la deuxième ligne.

### 2026-09-08 — « Référence imprimée : » retirée, et deux pièges de méthode payés en chemin

Décision de l'auteur, devant la manchette : « Ne pas afficher le titre "Référence imprimée" ». La règle est au § 13.8.2 ; voici la passe et ce qu'elle a coûté.

**LE RELEVÉ.** Sur les 24 729 blocs de note, les têtes « Mots : » se rangent en trois familles. **Étiquettes de nature, à retirer** : « Référence imprimée » (5 034), « Référence » (2), « Référence éditoriale » (16). **Qualifiées, à garder** : « (latin) » 82, « (français) » 50, « divergente » 13, « conservée » 17, « (Bareille latin) » 4 — elles disent ce que `kind` ne dit pas. **Formules d'apparat, à ne pas toucher** : « En interligne : » 56, « Je propose de lire : » 16, « Editi : » 11, « P ajoute : » 9, « La table porte : » 8 — c'est le propos de la note.

**LA PASSE.** 5 036 blocs, 27 textes, deux passes. Sauvegarde `internal.backup_etiquette_reference_20260908` (5 036 lignes), retour arrière `sql/rollback_etiquette_reference_20260908.sql`. Postcheck final : 5 036 réécrits, 0 inchangé, **0 suffixe rompu** — ce qui reste est exactement la fin de ce qu'il y avait —, 0 bloc vide, 0 colonne déplacée, 309 formes qualifiées intactes.

**CE QUE LA MANCHETTE Y GAGNE.** Longueur rendue d'un renvoi : médiane **20 → 10 signes**, neuvième décile **35 → 21**. Sur la fenêtre la plus dense du corpus — l'Explication sur le psaume IV, treize renvois en trente-quatre segments —, les treize tiennent maintenant sur **une seule ligne** et **aucun n'est poussé**. L'étiquette était ce qui rendait le cas dense difficile.

⛔ **PREMIER PIÈGE — UN POSTCHECK NE SE FAIT JAMAIS AVEC LE MOTIF DE L'OPÉRATION.** La première passe a rendu « 0 étiquette restante » alors que **4 756 blocs la portaient encore** : le contrôle réemployait le motif de l'`update`, et un motif faux se déclare satisfait de son propre travail. C'est un `like` sur le texte, puis un comptage par CODE de caractère, qui l'a démasqué. **Un contrôle se fait par un autre chemin que l'opération, ou il ne contrôle rien.**

⛔ **DEUXIÈME PIÈGE — UN BLANC INVISIBLE NE SURVIT PAS AU TRANSPORT.** L'étiquette existe en deux formes qui ne diffèrent que par l'espace devant le deux-points : ordinaire pour 589 blocs, **insécable U+00A0 pour 4 447**. Les classes de caractères écrites avec le signe TAPÉ ont été aplaties en route, et le motif n'a plus vu que l'espace ordinaire. Réécrites en ÉCHAPPEMENT — `\u00a0`, `\u202f`, `\u2009` —, elles ont pris le reste. La charte le disait déjà de `typographie.ts` ; cela vaut aussi pour une requête envoyée à la base.

⚠️ **ET `block_id` N'EST PAS UNIQUE.** 24 729 blocs pour 24 157 identifiants distincts : **492 sont portés par deux blocs**. La clé est `(id_texte, note_key, block_id)`, et un postcheck qui joint sur le seul `block_id` compare n'importe quoi avec n'importe quoi — il a rendu 3 271 « textes inattendus » qui n'existaient pas. ⛔ Toute écriture ou tout contrôle sur `texte_note_blocs` passe par la clé entière.

⚠️ **Reste, et c'est un choix** : 309 blocs ouvrent encore sur « Référence imprimée (…) » ou « Référence imprimée conservée / divergente ». Leur qualificatif porte une information ; le reformuler est une décision éditoriale, non un nettoyage.

## 2026-09-08 — Ce que le VOLET laisse à l’encart d’une note

L’auteur renverse le soir la règle du matin : « il faut que l’encart de la note s’arrête au volet de droite (ou de gauche) ». La marge ne se compte donc plus jusqu’au bord de la fenêtre mais jusqu’au bord du bloc de lecture. Relevé AVANT de trancher le plancher, parce qu’un raisonnement sur la cascade ne dit pas ce qu’un navigateur compose.

**LA MÉTHODE.** `tmp/mesure-borne-volet.mjs` réplique la structure des deux pages — les formules de largeur des volets telles que les composants les écrivent, le rembourrage de `<main>`, la mesure de la colonne — dans des IFRAMES aux largeurs voulues, et lit les boîtes. ⚠️ Un `vw` dans une iframe se résout sur la LARGEUR DE L’IFRAME : c’est ce qui permet de mesurer cinq écrans sans redimensionner la fenêtre, la police racine fluide comprise. Trente cadres, deux états de volets.

**LA MARGE UTILISABLE, de chaque côté, marge et écart ôtés** (px) :

| surface | 1280 | 1440 | 1600 | 1920 | 2560 |
|---|---:|---:|---:|---:|---:|
| œuvre, volets ouverts | 98 | 169 | 211 | 281 | 475 |
| œuvre, volets repliés | 329 | 409 | 474 | 603 | 875 |
| Bible, volets ouverts | 68 | 136 | 172 | 238 | 432 |
| Bible, volets repliés | 268 | 349 | 411 | 532 | 792 |
| en regard, volets ouverts | 12 | 83 | 120 | 179 | 356 |
| en regard, volets repliés | 243 | 323 | 384 | 502 | 757 |

⚠️ **La police racine est fluide, donc le rem ne suit pas le pixel** : 16 à 1280 et 1440, 16,91 à 1600, 18,91 à 1920, 22 à 2560. En rem, l’œuvre volets ouverts donne **6,2 · 10,6 · 12,5 · 14,8 · 21,6** — c’est ce compte-là qui décide, le plancher étant en rem.

⛔ **CE QUE LA BORNE COÛTE.** À 20 rem de plancher, l’encart ne gagne la marge qu’à partir de 2560 sur une œuvre, et JAMAIS sur la page Bible tant que les deux volets sont ouverts. Il repasse donc sous son appel presque partout, c’est-à-dire au comportement d’avant le 8 septembre. ⛔ Baisser le plancher pour le garder en vie serait la largeur qui suit la place poussée au-delà du lisible : à dix rem, l’encart porterait douze signes par ligne. **C’est le volet qui rend la place**, et son repli est un geste que le lecteur a déjà sous la main : replié, l’encart revient dès 1280.

⚠️ **UN EFFET DE BORD QUE LA BORNE OUVRE, et qu’il a fallu fermer.** Comptée jusqu’à la fenêtre, la marge était toujours un peu plus large à DROITE (954 contre 854 à 2560), et la règle « le côté le plus large » y suffisait. Bornée au volet, elle est EXACTEMENT symétrique — 280,7 px des deux côtés à 1920 — et un seul volet replié la rend franchement dissymétrique du côté replié. La gauche, qui porte la manchette des renvois, l’aurait donc emporté sur des écrans où rien ne l’exige. La droite gagne désormais dès qu’elle porte le plancher.

⚠️ **Le panneau navigateur refuse `file://` dans cette session** : la planche a été servie par un serveur statique de quinze lignes sur un port dédié, coupé aussitôt. Ce n’est pas le serveur de développement.

✅ **Contrôle** : la planche `tmp/planche-encart-note.tsx`, qui recalcule les mêmes cas depuis le modèle de mise en page, rend 475 · 278 · 167 · 99 · 603 · 329 px — le navigateur avait mesuré 474,8 · 280,7 · 168,9 · 98,5 · 603,1 · 328,5. Deux chemins indépendants, le même résultat au pixel près.

### 2026-09-11 — Boèce, note I-02 : la citation visée que le rendu fusionnait, et ce que la mesure a compté

La base portait déjà la bonne structure de la note I-02 : la citation visée, la référence
d'Ovide, le latin d'Ovide, sa traduction. La page montrait pourtant « « Hélas ! avant le
temps, le malheur m'a fait vieux. » Ovide, *Pontiques*, I, 4, vers 1-2 et 19-20 : » sur une
seule ligne, et la phrase de Boèce en italique. La donnée était juste : c'est le composant
de rendu des notes (`ContenuNoteStructuree`) qui posait toute citation visée en tête du
bloc suivant, l'italisait pour sa nature, et ignorait `citation_layout`.

**Le chemin de lecture, tracé.** `texte_note_blocs` est lu par `chargerNotesStructurees`,
trié par `note_key` puis `rank`, paginé ; `metadata` n'en sort que projetée sur des
scalaires (`lireMetadonneesBlocNote`), et aucune trace documentaire n'atteint le
composant. La page d'une œuvre n'a ni cache ni rendu statique. La fusion était dans le
composant, et nulle part ailleurs.

**Ce que suivent les 126 citations visées de la Consolation** : un commentaire 97 fois
(75 en prose, 22 en vers), une référence 28 fois (21 en prose, 7 en vers), une attribution
une fois (III-05).

**Relevé du rendu avant correction**, par le vrai chargeur et le vrai composant
(`tmp/controle-rendu-notes-boece.mts`) : 29 citations visées fondues dans une référence ou
une attribution, dont les sept notes que la mission nommait (I-02, I-15, II-15, III-08,
IV-22, V-02, V-17) ; les 29 citations visées en vers privées de leurs retours à la ligne ;
les 126 en italique alors qu'elles sont françaises ; 51 citations en prose déclarées
sorties (35 grecques, 16 latines) laissées au fil quand leur traduction sortait.

**Après correction** : 235 notes, 693 blocs, 609 unités rendues, 75 groupes original et
traduction, aucune anomalie. Ordre de `rank` partout, aucune trace documentaire à l'écran,
aucun guillemet extérieur autour d'une citation sortie, aucune capitale pleine. Les
citations documentaires de l'Introduction (Cassiodore, Virgile, Raynouard) gardent leur
référence en tête, terminée par deux-points.

⚠️ **Un premier jet avait séparé les 126 citations visées**, et c'était aller au-delà de la
mission et contre le § 13.11 : devant un commentaire, la charte garde la citation visée sur
la ligne du propos. Seules faisaient défaut les 29 qui précèdent une référence ou une
attribution, et les 29 en vers.

⚠️ **Ce qui reste, et c'est de la donnée** : III-16 range ses deux originaux grecs avant
leurs deux traductions ; le rendu suit `rank` et ne réordonne pas.
