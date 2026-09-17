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

### 2026-09-11 (soir) — Boèce, note I-01 : le distique visé que le rendu laissait au fer

Relevé de l'auteur, sur la note I-01 de la *Consolation* (Mirandol) : « Le bonheur qui
jadis inspirait mes accents, / A fait place aux sombres alarmes… » devrait être une
citation sortie.

**La donnée le disait déjà.** Les 38 citations visées en vers du texte portent
`citation_layout = block`, posé par la passe de données du jour (métadonnée
`notes_deep_audit_verse_layout_20260911` : « all verse lemmata and quotations are explicit
detached blocks »). Le rendu passait outre : `dispositionCitation` gardait au fil toute
citation visée, selon la règle écrite le matin même au § 13.18, avant que la passe ne
déclare ces vers sortis. Les deux décisions se sont croisées dans la journée, et la
première l'emportait à l'écran : le distique partait du fer de la note, sans le retrait
de 1,5 em que prend tout vers cité.

**Les 38** : 30 précèdent un commentaire (21 sur plusieurs lignes, 9 sur une seule), 8
une référence (7 et 1). Les 88 citations visées en prose ne déclarent rien ; elles
restent au fil et ouvrent la ligne du propos (§ 13.11).

**Correction** : la citation visée suit la règle commune, la donnée d'abord, puis la
forme ; une citation visée en prose déclarée sortie ne se pose plus sur la ligne du
propos (aucun cas au 11 septembre 2026). Contrôle par le vrai chargeur et le vrai
composant (`tmp/controle-rendu-notes-boece.mts`) : 235 notes, 728 blocs, 651 unités
rendues, 77 groupes original et traduction, aucune anomalie ; I-01, I-02 et II-18
rendent leur citation visée sortie.

### 2026-09-11 (soir) — La Bible de Fillion tombée deux heures : une clause SET sur la règle de publication

Relevé de l'auteur : « Cette page n'a pas pu s'afficher », repère 1858746567, sur une page
de la Bible de Fillion (Sagesse 1).

**Le journal Supabase l'a nommée en deux requêtes.** `edge_logs` :
`v_bible_tr0013_gloss_note_targets` en `500` depuis `createServerClient` (famille de
Fillion, WIS.1.1 à 16), la dernière à 17:33:42 UTC ; `postgres_logs` : « canceling statement
due to statement timeout » à 17:33:50, huit secondes après. Compte horaire de la vue : des
200 côté site jusqu'à 14 h, uniquement des 500 depuis 15 h 50 ; les requêtes d'un script
(clé de service, donc sans RLS) passaient toujours. Le CLI Vercel (59.16) n'a rendu que
trois lignes du proxy, sans la pile ni le repère.

**La cause.** La migration `20260911151842_charte_52_bible_textual_publication_states`
(15 h 18 UTC, hors dépôt) a reposé `set search_path = pg_catalog` sur
`bible_technical_publication_allowed`, qui n'en portait plus depuis la migration de 13 h 54,
et l'a substituée aux comparaisons directes de quatorze politiques et de huit vues. La vue
des cibles de gloses, interrogée à chaque chapitre de TOUTE famille éditoriale (elle ne rend
pourtant rien pour Fillion), dépassait alors le délai de 8 s accordé à `authenticated`.

**Mesures**, sous la session d'un administrateur, dans un bloc `do` annulé :

| | avec la clause SET | sans (essai annulé) | après la migration 20260911174534 |
|---|---:|---:|---:|
| `postgres` (sans RLS), Fillion WIS 1 | 2 342 ms | 987 ms | — |
| `authenticated`, Fillion WIS 1 | 12 298 ms | 1 101 ms | 1 499 ms |
| `authenticated`, 899 LUK 13 | — | — | 1 108 ms |

**Correction.** `alter function … reset search_path` (migration `20260911174534`, 17 h 45
UTC), puis le chargeur `app/lib/ciblesDeGlosesChargement.ts` : la vue n'est plus interrogée
que pour une famille qui porte TR0013, et son échec ne ferme plus la page. Panne : de
15 h 18 à 17 h 45 UTC environ.

### 2026-09-13 — Plus de notes au bas du chapitre : ce que la série était seule à montrer

Relevé de l'auteur sur la Bible du XIIIᵉ siècle : « les notes s'affichent en appel de note et bas de page simultanément ; il ne faut pas que les notes de bas de page existent ». La série de notes au bas du chapitre est retirée des deux lectures de la page Bible (charte § 13.7).

**Ce que la base comptait avant le retrait** (famille `bible899-critical-modern-v1` : 9 186 notes de verset, toutes propres au membre TR0013 ; famille Fillion : 11 notes communes).

| | notes | appel en lecture simple | appel en regard |
|---|---:|---|---|
| notes de glose (`v_bible_tr0013_gloss_note_targets`) | 242 | oui, sur la ligne de glose | **non** : la cellule portait `cleDeGlose` |
| notes sur un créneau que TR0013 ne porte pas | 7 | **non** : ligne sans texte cachée | **non** : cellule vide |
| notes de Fillion | 11 | oui | oui : les deux membres portent tous leurs créneaux |
| gravures rattachées à une note | 0 sur 431 actifs | sans objet | sans objet |

Les sept : Ac 3, 9 ; 7, 43 ; 7, 56 ; 8, 29 (« aucun verset cible n'a été fabriqué ») ; Gn 6, 8 (élément surnuméraire du témoin) ; Jos 8, 32 et 21, 26 (lacunes canoniques du témoin). Toutes portées par TR0009, aucune couverte par un empan de TR0013. Ces 249 notes ne se lisaient que dans la série.

**Correction.** La cellule d'une glose lue par le canon garde l'UUID de sa ligne (`cibleDesNotes`) ; un verset sans texte qui porte une note paraît en « — » avec son appel, dans les deux lectures ; `rangeesNonVides` garde une rangée annotée ; l'image d'une note suit sa fenêtre (`figuresDeLaNote`).

**Ce qui reste.** L'aparté « Apparat propre à ce bloc » des développements éditoriaux, qui ne double aucun appel : 231 des 1 056 notes de bloc n'ont ni texte d'ancrage ni offset.

**Rectification, mesurée en ligne le même jour.** Le tableau décrit le chemin quand la vue des cibles répond ; elle ne répond pas. Filtrée sur Jean 8, `v_bible_tr0013_gloss_note_targets` met 34,7 s sous `postgres`, quand `authenticated` en accorde 8 : le journal Supabase montre un 500 à chaque chapitre ouvert (cinq sur cinq entre 13 h 32 et 13 h 38 UTC), et `chargerCiblesDeGloses` rend une liste vide. Les 242 notes de glose restent donc sur leur verset hôte, où elles ont leur appel dans les deux lectures : elles ne se lisaient pas seulement dans la série, et le retrait n'en perd aucune. Seules les 7 notes de créneau n'avaient que la série. Vérifié après déploiement : sur Jean 8, trois notes de glose appelées depuis les versets 6, 9 et 26 ; sur Actes 3, le verset 9 en « — » avec son appel. Le 11 septembre, la même vue coûtait 1,1 à 1,5 s par chapitre.

### 2026-09-15 — Page d'une œuvre : la tête du volet, ses icônes, le menu du volet de droite

**La tête du volet** (charte § 38.26.3). Relevé sur planche, une iframe par écran, le prédicat de `TeteVolet.tsx` rejoué tel quel ; mesures en pixels. Place offerte par la tête : 207 à 1280 et 1440 px (racine 16), 223 à 1600 (racine 17), 274 à 1920 (racine 19), 347 à 2560 (racine 22). Rangée entière, lecteur / administrateur : 108 / 136 à la racine 16, 114,8 / 144,5 à 17, 128,3 / 161,5 à 19, 148,5 / 187 à 22. Largeur minimale du titre (plus long mot, plancher de 5,5 rem) : *Du corps et du sang du Seigneur* et *Les Confessions* 88, 93,5, 104,5 et 121 ; *Catéchèses mystagogiques* (« mystagogiques ») 100, 105, 114 et 128.

| écran | lecteur | administrateur |
|---|---|---|
| 1280 et 1440 | déplié, sauf *Catéchèses mystagogiques* (100 + 8 + 108 = 216 pour 207) | replié |
| 1600 | déplié, sauf *Catéchèses mystagogiques* (105 + 8 + 114,8 = 227,8 pour 223) | replié |
| 1920 | déplié | déplié, sauf *Catéchèses mystagogiques* (114 + 8 + 161,5 = 283,5 pour 274) ; *Du corps et du sang du Seigneur* tient au pixel (274 pour 274) |
| 2560 | déplié | déplié |

Avant la règle, la rangée se repliait dès que le titre entier ne tenait pas sur une ligne : sur ces trois titres, le lecteur ne voyait le plus souvent que le ⋮.

**Les icônes.** Trait rendu à 0,8125 rem : chevron 1,22 px ; roue 0,87 px avant (trait 1,6 dans une boîte de 24), 1,14 après (trait 2,1) ; partage : encre de 11,7 px de haut ramenée à 10,8, nœuds de rayon 1,9 ramenés à 1,8, trait 1,35 porté à 1,45 dans une boîte de 16.

**Le menu des traductions du volet de droite.** `versets_lecture` ne porte que les colonnes TR0001 à TR0005, quand le menu listait toutes les bibles de `traductions` (`est_biblique`). Choisir une bible sans colonne affichait son nom au-dessus du texte de Sacy, pris en repli sans un mot. Le menu est désormais filtré sur la sonde des colonnes.

**« Du même auteur ».** Filet retiré ; rembourrage d'entrée porté de 3 px à 0,3125 rem ; ligne d'édition à l'interligne 1,1 (1,25 avant) et remontée d'un seizième de rem.

**Contrôles.** `tsc` sans erreur ; 3 005 tests dans l'arbre, 2 980 dans le miroir de l'index ; aucune remarque nouvelle du linter sur les fichiers touchés (deux de moins dans `OeuvreClient.tsx`, une de moins dans `SelecteurTraductionBible.tsx`).

### 2026-09-15 — Commenter un paragraphe : ce qui marchait, ce qui trompait

Précision de l'auteur sur la quatrième demande : « On met un commentaire sur un segment ».

**Base.** Douze commentaires, tous sur un verset, aucun sur un segment. La contrainte `commentaire_cible` exige l'un ou l'autre, jamais les deux ; `commentaires.id_segment` est un `integer`. L'insertion sur un segment, éprouvée dans un bloc `do` annulé (`eprouver_sql`) sur le segment 533490 de *Du corps et du sang du Seigneur*, est acceptée et relue depuis la place d'un lecteur comme d'un administrateur, déclencheurs de modération et de lexique compris.

**Page servie, avant.** Paragraphe cliqué, onglet « Commentaires » : formulaire présent, « Aucun commentaire pour ce passage. » ; le bouton « Soumettre » occupait les 32 derniers pixels de la fenêtre (de 985 à 1 017 pour une fenêtre de 1 017). Sans paragraphe, l'invite tenait une ligne grise en haut du volet. Tout refus d'envoi s'affichait comme une affaire de capitales.

**Borne.** Le 15 septembre 2026, 2 573 segments ont un identifiant au-delà de 2^31, dont 2 569 au-delà de 2^53 : *Catéchèses baptismales* 2 236, *Catéchèses mystagogiques* 170, *Homélie sur le paralytique* 86, *Homélie sur la Présentation au Temple* 53, *Lettre à l’empereur Constance* 28. Sur ces textes, la base refuse la lecture comme l'écriture d'un commentaire.

**Corrections** (commit `b75251a7`). Invite centrée (`InviteCentree`) ; message d'échec exact ; « Les commentaires ne sont pas encore ouverts sur ce texte. » au-delà de la borne, `ID_SEGMENT_MAX` étant partagée avec le compte d'`OeuvreClient` ; blanc de 12 px sous le formulaire.

**Page servie, après** (fenêtre de 2 844 × 1 412). *Catéchèses baptismales* : l'invite se tient au milieu de sa boîte (centre à 770 px pour une boîte de 128 à 1 412), à 15 px de chaque bord ; un paragraphe au-delà de la borne porte « Les commentaires ne sont pas encore ouverts sur ce texte. », sans formulaire, et l'onglet reste ouvert. *Du corps et du sang du Seigneur*, segment 533490 : « Soumettre » de 1 366 à 1 400, pied du formulaire jusqu'à 1 412, soit 12 px de blanc sous le bouton. Rien n'a été envoyé : le bouton n'a pas été cliqué.


### 2026-09-15 — Cyrille de Jérusalem : frontière prose / bibliographie dans les notes

Mission `[A0044|bibliographic-block-style-20260915]`, cinq œuvres Faivre 1844. Point de départ : un passage des *Catéchèses mystagogiques* réunissait Eusèbe, une citation latine, Jean Chrysostome, Nicétas / Grégoire de Nazianze, la *Liturgia Gallicana* et le Missel gothique dans une séquence dont la nature bibliographique n’était pas entièrement portée par le modèle de rendu.

**Résultat live.** 2 096 notes, 2 880 blocs, 2 096 ancres, 918 relations bibliographiques et 21 relations de blocs. La passe a marqué ou restructuré 113 blocs dans 26 notes. Elle laisse 69 blocs `reference`, tous 69 avec `metadata.bibliography_list_item=true`. 245 relations bibliographiques live portent une trace de création, de réancrage ou de remédiation de cette mission. Les renvois internes aux *Catéchèses* identifiés comme `same_work_internal_reference` / `same_work_named_without_locator` ont été retirés du graphe bibliographique externe.

**Passage signalé.** La note 1 des *Catéchèses mystagogiques* est désormais : `commentary` → `commentary` → `reference` Eusèbe → `quotation` latine → quatre `reference` autonomes → `commentary`. Nicétas est composé comme autorité ancienne (`++Nicétas++`) et le nom de famille de Jean Mabillon en petites capitales sémantiques (`Jean ++Mabillon++`).

**Contre-audit.** 0 note avec rang de bloc dupliqué ; 0 rang de bloc discontinu ; 0 rang bibliographique dupliqué ; 0 relation bibliographique orpheline ; 0 source ou cible orpheline dans les relations de blocs. Trois blocs `needs_review` restent intentionnellement ouverts : note 526, « Basile de Césarée, Homélie IX » sans œuvre conjecturée ; note 1132, « Voir la note L, tome I, p. 131. » ; note 1473, « Sur Matthieu, édition Huet, tome I, p. 242 » sans attribution conjecturée.

**Règle tirée de la passe.** P9 impose désormais le contrôle de frontière prose / bibliographie : une série documentaire autonome sort de `commentary`, une œuvre donne un bloc `reference`, une citation gouvernée est séparée en `quotation`, la prose reprend en `commentary`, et les relations sont réancrées sur le bloc exact. Une référence réellement intégrée à la syntaxe argumentative reste en prose ; la ponctuation seule ne décide jamais de l’extraction.

**Corps de texte.** 3 030 segments ; 0 dérive `texte_norm` ; cette mission n’a émis aucun `UPDATE` sur `segments`. Empreinte live finale : `bdade1dd2a55fc603d84d5a585183c79`.


### 2026-09-15 — Cyrille de Jérusalem : audit complet des cinq œuvres Faivre 1844

Mission `[A0044|audit-complet-5oeuvres-20260915]`. État final stabilisé : 5 versions / 3 030 segments / 31 unités source / 2 096 notes / 2 880 blocs / 2 096 ancres / 918 relations bibliographiques / 23 relations de blocs / 2 772 liens bibliques.

**Corps et source.** 0 segment vide, 0 doublon de clé ou de numéro, 0 `texte_norm` fautif, 0 SHA d’unité faux, 0 offset hors bornes ou chevauchement. Les 19 trous de `segment_numero` de A0044O0003 sont réguliers : un à la frontière liminaires → exergue de chacune des 19 unités, sans perte de texte ; aucune renumérotation. 55 écarts normalisés source/segment subsistent sur les deux ensembles de catéchèses ; les 11 écarts encore visibles après neutralisation des appels et du balisage ont tous été relus comme transformations éditoriales documentées (développement de renvois, appel 1850 reconstruit, déplacement des quatre exergues latins mystagogiques dans l’appareil). Aucun UPDATE sur `segments` par cette mission. Empreinte corps finale : `2fce34f28436779f0089677747cd3bc8`.

**Appareil.** 0 note sans bloc ou ancre, 0 bloc/ancre orphelin, 0 rang discontinu, 0 rôle ou type fonctionnel manquant, 0 compteur de blocs périmé. Les 2 096 marqueurs sont présents exactement une fois sur leur surface de lecture. 1 273 enrichissements de segments sont valides. Trois enrichissements de notes copiés par erreur dans des références issues d’un découpage ont été supprimés ; 17 enrichissements de notes restent, tous dans les bornes et sur le bon bloc.

**Bibliographie.** 918 relations ; 0 orpheline, doublon de rang ou doublon d’ouvrage normalisé auteur+titre. Les anciennes séries détachées du 14 septembre ont reçu le marqueur de rendu `bibliography_list_item` : 129 blocs étaient ciblés dans la sauvegarde ; 125 blocs correspondants subsistent dans le live et portent la correction, quatre ayant été remplacés concurremment. 49 localisateurs déterministes ont été structurés sans modifier le texte visible ; `Jérôme de Stridon, Epistulae, lettre 13` a été normalisé comme œuvre + locus. Deux relations `reference → quotation` manquantes ont été ajoutées (Jérôme, *Adversus Luciferianos* 34 ; Eusèbe dans la première mystagogique). Empreinte blocs finale : `e68cf91688c66876308dd0b8999a2f08`.

**Typographie et rendu.** 1 541 empans italiques réels : 0 grec dans l’italique, 0 guillemet français dans l’italique, 0 balisage `*`, `++` ou `^^` déséquilibré ; 0 note à guillemets déséquilibrés, 0 HTML brut, entité d’espace, ellipse ASCII, double espace ou mauvais espace avant `;!?`. Les deux retours de ligne de notes sont intentionnels (vers et énumération). Les 64 cadratins du corps sont documentaires : 48 en apparat directement vérifié au fac-similé, 16 attestés dans la source conservée. Le détecteur contextuel des petites capitales d’auteurs en prose donne 0 résidu. Les 2 826 surfaces de titre/niveau sont mécaniquement propres ; les capitales détectées sont des chiffres romains.

**Liens et réserves.** 2 772/2 772 liens bibliques `vérifié`, 0 arbitrage, doublon ou cible morte ; les trois liens sans `canon_id` de verset sont les renvois volontaires au chapitre entier (Lv 23, Ps 47, Ex 21). Aucun alignement sémantique n’existe pour ces cinq versions françaises. Trois `needs_review` restent intentionnels : note 526 `Basile de Césarée, Homélie IX` sans œuvre conjecturée ; note 1132 `Voir la note L, tome I, p. 131.` ; note 1473 `Sur Matthieu, édition Huet, tome I, p. 242.` sans attribution conjecturée.

**Publication/catalogue.** Les cinq œuvres sont live `termine`, `is_public=true`, `is_default=true`, `acces_public=true`, mises en ligne le 11 septembre 2026. Le JSON `publication_readiness` conserve encore l’ancien état du 8 septembre et n’a pas pu être resynchronisé dans cette mission ; les cinq notices catalogue sont `VERIFIE/TEXTE_VERIFIE`, mais `verifie_admin=false` et `traduction_publiee_sur_le_site=false`. Ces deux drapeaux de catalogue restent hors de la section qualité. Une concurrence A0044 a été observée pendant l’audit ; les totaux globaux sont restés constants et les empreintes finales ont été recontrôlées stables.


### 2026-09-16 — Cyrille de Jérusalem : recherche sur les titres bibliographiques développés

Mission `[A0044|canonical-biblio-display-20260916]`. Le contrôle ciblé porte sur les cinq œuvres Faivre 1844 et 918 relations bibliographiques. Le détecteur littéral initial relève 264 relations dans 203 blocs où `ouvrages_bibliographiques.titre` n’apparaît pas exactement ; ce nombre n’est pas un nombre de fautes, car il comprend des titres complets dans une autre langue ou des attributions narratives sans titre à injecter. Après normalisation légère, 255 relations / 195 blocs restent non équivalents.

Crible des formes titulaires fortes (`Discours`, `Homélie`, `Lettre`, `Dialogue`, `contre`, `sur` sous forme de titre) : 74 blocs, dont 67 possèdent au moins une relation et 7 aucune. Les 10 blocs `reference` à titre lié absent se répartissent entre vraies abréviations (notamment `Lettre N`), variantes complètes admissibles (`De baptismo` / `Du baptême`, `Histoire ecclésiastique` / `Historia ecclesiastica`) et cas d’autorité à arbitrer (`Adversus Luciferianos` / `Dialogus contra Luciferianos`).

Défauts structurels certains trouvés : cinq relations sont ancrées sur le mauvais bloc après des découpages antérieurs — Jérôme, `Commentarii in Ecclesiasten` et `Commentarii in Osee` dans la note 17 ; Ambroise, `Expositio Psalmi CXVIII`, et Augustin, `La Cité de Dieu` XXII, 30, dans la note 88 ; Grégoire le Grand, `Homiliae in Evangelia` XXXIV, dans la mystagogique 88. Une sixième dette est de cardinalité : la relation Jérôme `Commentarii in Epistolam ad Ephesios` de la note 17 agrège deux occurrences distinctes (Ep 4,4 et Ep 4,6) réparties sur deux blocs.

Un défaut d’identité bibliographique est certain : la mention `Missel gothique, édité par Jean Mabillon` de la première mystagogique est reliée à Mabillon, `De Liturgia Gallicana libri III`, alors que l’objet cité est le `Missale Gothicum` ; il faut distinguer œuvre citée et édition/hôte.

Les sept blocs à forme titulaire forte sans relation comprennent : Origène, `contre Celsum`, identifiable à `Contre Celse` déjà au catalogue ; deux occurrences de Paulin de Nole `Lettre XI`, dont la citation correspond à l’actuelle Epistula 31 et dont `Epistulae` existe déjà ; Paschase Radbert `Sur Matthieu`, identifiable à `Expositio in Matthaeum` mais absent du catalogue ; Cyrille d’Alexandrie `sur le Lévitique`, vraisemblablement les `Glaphyra` sur le Pentateuque, à vérifier avant création de notice ; un renvoi interne `notre dissertation sur le secret` ; et la réserve volontaire `Sur Matthieu, édition Huet, tome I, p. 242`, qui reste non attribuée sans conjecture.

La règle normative a été affinée : l’absence littérale du champ `titre` est seulement un signal de relecture. Le contrôle obligatoire suit désormais `IDENTITÉ → ANCRAGE → TITRE COMPLET → LOCUS`. Une relation structurée ne justifie pas d’injecter un titre dans une attribution narrative qui ne nommait aucune œuvre. Les variantes complètes autorisées dans une autre langue restent possibles ; le schéma bibliographique ne possède actuellement aucun champ d’alias/titre original pour les modéliser.

Aucune correction générale n’a été appliquée pendant cette passe de recherche, hors l’exemple Chrysostome déjà corrigé avant la recherche ; aucun `segments` n’a été modifié.


### 2026-09-16 — Pérennisation dans le protocole des titres bibliographiques

La recherche `[A0044|canonical-biblio-display-20260916]` a entraîné une modification normative du protocole v3.2 dans `parametres.charte_ia`. P8 n’est plus autorisée à développer par vraisemblance un titre dont l’identité dépend encore de P9 ; toute résolution bibliographique nouvelle en P9 rouvre localement P8 pour la surface concernée. P9 impose désormais l’ordre `IDENTITÉ → ANCRAGE → TITRE COMPLET → LOCUS`, avec contrôle de l’œuvre citée contre son édition/hôte, contrôle du bloc exact après découpage, interdiction d’agréger dans une seule relation des loci appartenant à plusieurs blocs, développement obligatoire des formes titulaires abrégées réellement résolues, maintien possible des variantes complètes scientifiquement autorisées, et interdiction de transformer une attribution narrative en référence titrée. L’absence littérale de `ouvrages_bibliographiques.titre` est un détecteur, non une preuve d’erreur. Des détecteurs obligatoires et un contre-audit spécifique ont été ajoutés à P9.


### 2026-09-16 — Cyrille de Jérusalem : explicitation d’un renvoi interne Faivre

Mission `[A0044|internal-crossref-explicitation-20260916]`. Dans la note 5 des Catéchèses mystagogiques, la formule source « Voyez les notes C, tome I, p. 126, et AA, p. 173. » a été résolue par croisement du lettrage et du contenu : C = A0044O0003TFR-V11:note:00133, Catéchèse III, 3, sur les viandes consacrées aux idoles ; AA = A0044O0003TFR-V11:note:00260, Catéchèse IV, 28, sur l’abstinence des idolothytes, les viandes suffoquées et le sang, avec mention de Julien. La surface normalisée dit désormais : « Voir la note C de la Catéchèse III, 3, sur les viandes consacrées aux idoles, et la note AA de la Catéchèse IV, 28, sur l’abstinence des idolothytes. » La forme imprimée et l’ancien bloc complet sont conservés dans les métadonnées du bloc. `clarity_review` de la note 5 est passé de `clear_as_is` à `rewritten`. Contre-audit : 1 nouvelle forme, 0 ancienne forme résiduelle, 2/2 cibles présentes. Aucun `segments` modifié.


### 2026-09-16 — Renvois internes entre notes : identité stable et rendu dynamique

Le protocole des notes impose désormais que tout renvoi note → note cible une identité stable `(id_texte, note_key)` et non un numéro d’affichage, un `footnote_id`, une lettre, une page ou un tome. Les repères imprimés de l’édition restent en provenance. Le numéro courant est lu dynamiquement dans `texte_notes.note_number` ; le titre de niveau 1 est résolu à partir de l’ancre actuelle de la note cible en réutilisant le résolveur de titre de l’application ; le contenu cible est chargé à l’expansion depuis ses blocs actuels et n’est jamais copié dans la note source. Forme publique : `Voir note [numéro actuel] de [titre de niveau 1] :` puis contrôle `[Afficher la note visée]`. Les boucles de renvoi doivent être protégées. Cas vérifié : la note source B de la Seconde catéchèse a pour clé stable `A0044O0003TFR-V11:note:00070` alors que son numéro courant est 73, ce qui confirme que la navigation ne doit jamais dépendre de la numérotation. Dans le périmètre des cinq œuvres A0044, aucune note ne possède actuellement plusieurs ancres ni plusieurs niveaux 1 concurrents. Aucun segment modifié.


### 2026-09-16 — Renvois internes stables entre notes
- Création de `texte_note_renvois` : la cible est `(target_id_texte, target_note_key)`, jamais un numéro affiché.
- Création de `v_texte_note_renvois_affichage` : numéro courant depuis `texte_notes.note_number`, titre courant depuis `ref_niv1`, contenu courant depuis les blocs ordonnés de la note cible.
- Premier cas structuré : note source actuelle 481 → `A0044O0003TFR-V11:note:00070`, actuellement note 73 de « Seconde catéchèse » ; le libellé source B reste en provenance.
- Détecteur sur les cinq œuvres A0044 : 58 blocs candidats ; 12 disposent déjà d’une résolution certaine enregistrée ; 1 renvoi est actuellement structuré dans la nouvelle table.
- La charte §8.1 impose désormais le rendu `Voir note [numéro actuel] de [titre de niveau 1] :` suivi du contenu actuel de la note visée.

### 2026-09-16 — Abandon des petites capitales pour les noms d’auteurs
Décision : les noms de personnes se composent désormais en romain dans les notes et les références, auteur principal compris ; les `++…++` restent réservés aux autres petites capitales sémantiques explicitement justifiées. Sur les cinq œuvres A0044, audit initial : 529 empans `++…++` dans 449 blocs. Correction ciblée : 507 empans correspondant à des noms de personnes retirés dans 437 blocs — A0044O0002 : 50/41 ; A0044O0003 : 441/381 ; A0044O0004 : 5/5 ; A0044O0005 : 9/8 ; A0044O0006 : 2/2. Résidu : 22 empans dans 19 blocs, tous des chiffres romains de siècles et donc conservés. Contre-audit : 0 empan non romain résiduel, 0 délimiteur de petites capitales déséquilibré. La charte a été harmonisée dans les règles des notes et de la bibliographie : auteurs en romain, petites capitales source conservées seulement en provenance, contre-audit obligatoire sans suppression globale. Table `segments` non touchée par cette mission.

### 2026-09-16 — La charte d’accentuation devient un lexique
La « charte d’accentuation » (`parametres.charte_accentuation`, 6 801 signes, dernière écriture le 6 septembre 2026) est reprise dans la table `accentuation_mots` : 90 mots, dont 60 à accentuer et 30 faux positifs, chacun avec sa provenance en note. Relevés d’origine : La Cité de Dieu (A0010O0002, juillet 2026), la Segond 1910 (TR0002, juillet 2026), les Annotations sur Job (A0010O0100, 25 juillet 2026), le Commentaire sur les Psaumes de Chrysostome (A0014O0089, 30 août 2026). Comptes reportés dans les notes : « À » 463 fois et « Ô » 108 fois dans la Segond, « À » 18 fois et « Ô » une fois dans Job. Mesure des guillemets de continuation sur Job : 63 ouvrants parasites retirés, 24 fermants ajoutés ou rétablis, 1 342 ouvrants pour 1 342 fermants, aucun segment déséquilibré. Non repris : les fusions d’espace de la Segond (« Etquiconque », « Etce », « Etsi »), les règles de casse de « saint » et de « Saint-Esprit » (contraires au § 3.2), le rappel de l’insécable pleine chasse des guillemets. Le texte est sauvegardé dans `internal.backup_parametres_20260916`, avec les directives de la page « Propositions de GPT », supprimée le même jour à la demande de l’auteur.


[NOTES|validated-works-auteurs-romain-pass2-20260916] Seconde passe indépendante sur les appareils considérés comme validés. Périmètre corrigé et élargi à 14 œuvres / 18 versions réellement porteuses d’un marqueur de validation pertinent : 4 407 notes / 4 600 blocs. Contre-audit live : 0 ++…++ dans texte_note_blocs.text ; 0 dans reading_text, editorial_normalization.reading_text, display_text, normalized_text, rendered_text ou reader_text ; 0 dans les métadonnées textuelles de texte_notes ; 0 dans 1 277 copies legacy segments.notes. Les ++…++ encore présents dans certaines métadonnées de blocs sont exclusivement des instantanés historiques previous_text/provenance et ne sont pas des surfaces de lecture. Les 18 versions portent désormais notes_author_roman_audit_20260916.audit_pass=2. Le marqueur de la traduction IA de Dhuoda, non validée, a été retiré. Aucun bloc de note ni aucun segment n’a été réécrit par cette passe.

### 2026-09-16 — Lemmes initiaux des notes : paragraphe autonome

[NOTES|lemme-cite-paragraphe-20260916] Décision éditoriale appliquée aux cinq œuvres A0044. Lorsqu’une note s’ouvre par la reprise du passage du texte hôte qu’elle commente, ce lemme forme désormais un bloc/paragraphe autonome et le commentaire commence au bloc suivant. Reprise exhaustive : 167 lemmes isolés (122 correspondances littérales avec le locus + 45 cas reconnus sémantiquement), soit 167 blocs de commentaire créés ; appareil final 2 096 notes / 3 047 blocs / 2 096 ancres / 904 relations bibliographiques / 23 relations internes. Les 126 relations bibliographiques portées par les anciens blocs composites sont désormais rattachées au commentaire, 0 au lemme. Contre-audit : 0 rang fautif, 0 structured_block_count périmé, 0 relation orpheline ; 23 débuts entre guillemets restant composés avec une suite ont tous été relus et classés comme 21 citations documentaires non-lemmes + 2 citations grammaticalement intégrées, soit 0 cas non classé. Le cas « Parle au contraire d’un épuratoire en général. » est désormais un bloc 1 autonome, suivi du commentaire « Sur cette difficulté… » au bloc 2. Deux ajustements syntaxiques et une ponctuation de raccord ont été effectués pour éviter des fragments créés par la séparation. Aucun segment n’a été modifié. La charte remplace l’ancienne règle « l’ancrage en tête ne fait pas paragraphe » par la distinction : lemme initial = paragraphe autonome ; source_locator = repère discret ou provenance.

### 2026-09-16 — Renvois de note à note : 60 relations posées, dix renvois laissés imprimés

Doctrine : charte § 13.20. Mission de l’auteur sur les cinq œuvres A0044 (trad. Faivre). Code poussé le jour même (commit 45ef72cb).

**Ce qui a changé depuis les deux entrées précédentes.** La vue `v_texte_note_renvois_affichage` est retirée (migration 20260916115348) : elle recomposait le numéro interne et un titre tiré de `oeuvre_texte_unites.ref_niv1`, c’est-à-dire une seconde écriture du titre et du numéro. Le numéro de la tête est le numéro AFFICHÉ (décision de l’auteur), celui de l’appel dans le texte, et non `note_number` : la note B de la Seconde catéchèse porte `note_number` 73 et s’appelle 10 dans sa division.

**Relevé.** 63 mentions de renvoi interne dans les appareils de notes, pour 66 cibles : 61 certaines, 5 en conflit. Résolution par la division et la lettre lues dans la citation, contrôle du locus imprimé et du contenu de la note visée, corroboration par les résolutions déjà consignées (dont le relevé du 12 septembre). Une seconde extraction de la donnée, faite après les passes du jour, a rendu les mêmes 60 relations.

**Posé** (migration 20260916123226, vérifié par SQL après application) :

| mesure | valeur |
|---|---|
| relations | **60** (55 `note_preview`, 5 `inline_mention`) |
| notes sources / notes visées | 50 / 47 |
| blocs portant plusieurs renvois | 7 |
| citations présentes dans leur bloc | 60 sur 60 |
| cibles sans bloc, autoréférences | 0, 0 |
| par texte source | Catéchèses baptismales 48, Homélie sur le paralytique 5, Catéchèses mystagogiques 4, Lettre à l’empereur Constance 2, Homélie sur la Présentation au Temple 1 |
| cycles réels de deux notes | 6 (00232 ↔ 00235, 00452 ↔ 00783, 01097 ↔ 01104, 01339 ↔ 01421, 01495 ↔ 01512, 01521 ↔ 01690) |
| relations dont la note visée renvoie à son tour | 27 |

La 61e cible certaine, la note Z de la Treizième catéchèse, n’est pas posée : elle vient de « Voir les notes V, Z, Catéchèse XIII. », dont la première cible est en conflit, et la mention se réserve entière.

**Réserves : dix renvois laissés sous leur forme imprimée.**

Conflits de contenu ou de locus (Catéchèses baptismales, `A0044O0003TFR-V11`) :
1. note 144 (`:00139`), « Catéchèse XVII, note C » : la note C de la Dix-septième catéchèse traite de Siméon le Juste, la source de la nature de l’eau ;
2. note 622 (`:00604`), « Voir Catéchèse X, note V. » : la note V traite du palmier de Jéricho, la source du Messie assis à la droite du Père ;
3. note 692 (`:00674`), « voir Catéchèse XIII, note T » : la note T traite du bon larron, la source de l’Itinéraire de Jérusalem ;
4. note 1207 (`:01184`), « Voir les notes V, Z, Catéchèse XIII. » : la note V traite du paradis, la source du rocher du sépulcre ;
5. note 1387 (`:01363`), « Catéchèse IV, 35, note CC » : le passage 35 ne concorde pas avec la note CC.

Renvois par numéro ou par page, que la règle interdit de résoudre ainsi :
6. Catéchèses baptismales `:01339`, « voir la note 1368 » ;
7. Catéchèses mystagogiques `:00075`, « voir la note A, p. 47 » ;
8. Catéchèses mystagogiques `:00090`, « Voir la note 91. » ;
9. Catéchèses mystagogiques `:00091`, « la suite de la note 90 » ;
10. Lettre à l’empereur Constance `:00002`, « Voir la note 6. ».

**Démonstration sur la donnée réelle** (en mémoire, rien d’écrit), note visée `A0044O0003TFR-V11:note:00070` :

| état | `note_number` | numéro affiché | tête |
|---|---|---|---|
| actuel | 73 | 10 | Voir note 10 de Seconde catéchèse : |
| une note insérée avant, même division | 74 | 11 | Voir note 11 de Seconde catéchèse : |
| la note `:00069` retirée | 72 | 9 | Voir note 9 de Seconde catéchèse : |
| titre de la division corrigé | 73 | 10 | Voir note 10 de Deuxième catéchèse : |

La relation ne change dans aucun des quatre cas.

**Rendu contrôlé.** Les 50 notes sources chargées par `chargerNotesStructurees` et rendues par `ContenuNoteStructuree` : 60 têtes résolues, 60 contrôles « Afficher la note visée », 0 citation imprimée restée. Note 481 (`:00466`) : « Sur les Anges, voir note 10 de Seconde catéchèse : Afficher la note visée ».

**Tests.** 23 sur la règle pure, 21 sur le chargement, 22 sur le composant, 7 sur le titre de niveau 1, 1 sur la manchette. L’arbre exact du commit a été éprouvé dans un miroir : compilation sans erreur, 47 fichiers et 640 tests des surfaces touchées.

Aucun segment modifié.

### 2026-09-16 — Protocole des notes v3.3 : la passe P15 des renvois de note à note

Demande de l’auteur, après la mission A0044 des renvois : inscrire la méthode comme passe du protocole de contrôle des notes. Doctrine : charte § 13.16.10 (v3.3) et § 13.20.

**Charte.** Le § 13.16.10 passe de quatorze à quinze passes. La passe 15, « Renvois de note à note : relation stable et rendu dynamique », vient après P14 : elle dépend de la forme autonome du renvoi (P7), du texte final des blocs (P8 à P12), de l’identité certifiée des notes et des blocs (P13) et des ancres définitives de la note visée (P14), et elle ne réécrit rien. Six étapes : inventaire, résolution certaine, relation, texte intouché, réserves, écriture. Autres retouches du même paragraphe : le principe d’ordre nomme les renvois ; P0 porte l’axe « renvois de note à note » ; le point 2 de la doctrine des renvois internes dit le numéro affiché, et non plus `note_number` ; P14 devient « clôture de l’appareil » ; la réouverture gagne deux règles ; la transition fait suivre v3.3 aux missions nouvelles et donne la correspondance v3.2 → v3.3. La poussée a retiré huit lignes, toutes réécrites à dessein, par `--retirer`.

**Contrôles.** `supabase/controles/20260916123226_texte_note_renvois_a0044_donnees_controles.sql` devient le contrôle exécutable de la clôture P15. Trois gardes s’ajoutent : citation qui chevauche une citation bibliographique du même bloc, note visée sans ancre, note visée dont les ancres mènent à deux divisions de niveau 1. Relevé après passe : 60 relations, dont 5 mentions dans la phrase ; 51 blocs sources, 50 notes sources, 47 notes visées ; aucune faute. Garde éprouvée dans les deux sens : l’ancre de la note `A0044O0003TFR-V11:note:00070` retirée dans une transaction annulée, le contrôle lève « 1 note(s) visée(s) sans ancre ».

**Centre de contrôle, section qualité.** La tâche `[A0044|renvois-notes-stables-20260916]` est close avec son bilan. Une tâche faite `[PROTOCOLE-NOTES|renvois-p15-v33-20260916]` s’ajoute, avec deux notes : `[PROTOCOLE-NOTES|etat-v33-20260916]`, qui remplace l’état v3.2, et la clôture de la mission A0044.

**Les deux réserves de la tâche de validation A0044.** La note 526 des Catéchèses baptismales (Basile, Homélie IX) n’est pas un renvoi de note à note et n’a pas été touchée. Le renvoi « note A, p. 47 » de la note 75 des Catéchèses mystagogiques figure parmi les dix réserves de la mission.

### 2026-09-16 — Éditions latines : contrôle des quinze textes, et ce qui reste à la donnée

Demande de l’auteur : « Les textes latins doivent contenir toutes les informations éditoriales nécessaires ; ce sont des œuvres à part entière. Il faut contrôler ça. » Doctrine : charte § 5.5.1.

**Outil.** `scripts/controle-editions-originales.mts` (commit `4061da3a`) rejoue les fonctions de la page sur chaque texte sans traducteur de la langue demandée et imprime ce que le lecteur voit. Rapport du jour : `audit/controle-editions-latines-2026-09-16.md` (non versionné), quinze textes latins.

**Code corrigé dans le même commit.** Le document extrait prenait l’adresse, la collection et le traducteur à l’œuvre : le latin de Knöll sortait sous l’adresse d’Arnauld d’Andilly, et son colophon rouvrait le français. Les citations (bouton de copie de la lecture, du volet des Pères et de « Mes citations », note d’un essai) citaient l’œuvre et jamais le responsable scientifique. Le signet du volet des Pères n’enregistrait pas son segment. Le sélecteur de citation d’un essai mêlait le latin et le français des Confessions, s’arrêtait à mille lignes et ne retrouvait pas un passage dont le numéro est partagé. La page d’œuvre prêtait la source, le traducteur et l’éditeur du français aux métadonnées d’un latin, et l’entrée « Du même auteur » de l’œuvre lue annonçait la traduction. Le millésime des œuvres sœurs ne se lisait plus (antislash perdu dans `/\d{4}/`). `decomposerEdition` perdait le lieu d’une notice savante dont le lieu n’est pas répertorié.

**Matrice du relevé.**

| Texte | Intitulé | Adresse | Texte établi par | Collection | Source | Informations complémentaires | Publication |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0010O0001T0001 (Confessions, Knöll) | ok | non conforme | ok | ok | ok | manque | ok |
| TXT_A0010O0002_LA_1870_1873_BENEDICTINS_VIVES (Cité de Dieu) | manque | ok | à vérifier | manque | à vérifier | — | ok |
| TXT_A0010O0023_LA_1895_ZYCHA (Heptateuque) | non conforme | ok | manque | manque | ok | — | ok |
| TXT_A0010O0055_LA_1841_MIGNE_PL40 (Du symbole) | non conforme | non conforme | à vérifier | manque | ok | — | ok |
| TXT_A0010O0100_LA_1895_ZYCHA (Job) | non conforme | non conforme | manque | manque | ok | — | ok |
| A0011O2987T0002 (Apologétique, Waltzing) | non conforme | non conforme | manque | manque | ok | — | ok |
| A0018O0001T0001 (Cyprien, Hartel) | non conforme | non conforme | ok | ok | à vérifier | — | ok |
| TXT_A0051O0049..52_LA_1879_BAREILLE (Jérôme, quatre textes) | ok | ok | à vérifier | à vérifier | ok | — | ok (Amos : à vérifier) |
| A0064O0001T0001 (Boèce, Migne) | non conforme | ok | à vérifier | manque | ok | — | ok |
| A0091O0001T0001 (Ratramne, Lucas) | non conforme | ok | à vérifier | à vérifier | ok | — | ok |
| TXT_A0176O0001_1887_BONDURAND (Dhuoda) | non conforme | ok | à vérifier | à vérifier | ok | ok | ok |
| A0418O0003T0001 (Eucher) | ok | ok | à vérifier | à vérifier | manque | — | ok |

**Ce qui reste à la donnée (GPT).**

1. Intitulés d’atelier à remplacer par le titre imprimé de l’édition : Heptateuque (« Quaestiones in Heptateuchum — texte latin (Zycha) »), Du symbole (« … — texte latin (Migne, PL 40) »), Job (« Texte latin — édition de Joseph Zycha »), Apologétique (« Apologeticum — Waltzing, Codex Fuldensis (1914) »), Cyprien (« Quod idola dii non sint — Hartel (CSEL 3/1, 1868) »), Boèce (« … — texte latin (Migne 1847) »), Ratramne (« … — latin imprimé en regard (Jean Lucas, 1673) »), Dhuoda (« Texte latin — Bondurand 1887 »). La Cité de Dieu ne porte que « Texte latin » et n’a donc aucun intitulé à l’écran.
2. Adresses hors de la forme du § 19.2 : Confessions (responsable, « CSEL 33 », « Pragae–Vindobonae–Lipsiae », « F. Tempsky–G. Freytag ») ; Cyprien (responsable et collection dans le libellé) ; Du symbole (« Patrologia Latina, t. 40 … col. 627-636 », sans l’année en fin) ; Job (« Prague–Vienne–Leipzig, F. Tempsky et G. Freytag », quand l’Heptateuque porte déjà « Prague ; Vienne ; Leipzig, Friedrich Tempsky ; Georg Freytag, 1895 »). ⚠️ Pour les Confessions et Cyprien, attendre la décision du § 5.5.1 : retirer le responsable du libellé le retirerait de l’écran.
3. Autorités d’éditeurs manquantes : « H. Vaillant-Carmanne » (Apologétique) et « Gerold » (Cyprien).
4. Sources : Eucher n’a pas de `source_url` ; celle de la Cité de Dieu est une notice du catalogue de la BnF ; celle de Cyprien un fichier XML brut du dépôt GitHub.
5. Clé de l’apparat : les 6 493 leçons critiques de Knöll n’ont aucune déclaration de sigles. Sigles les plus employés : V, F, W, M, P, Q, B, H, G, C, O, S (relevé heuristique, à établir sur le conspectus siglorum du CSEL 33).
6. Responsable et collection connus des métadonnées d’atelier mais sans champ à l’écran : Zycha et CSEL 28.2 (Heptateuque, Job), Waltzing et la Bibliothèque de la Faculté de philosophie et lettres de Liège XXII (Apologétique), PL 40 (Du symbole), PL 63 (Boèce), tomes XXIII à XXV de Vivès (Cité de Dieu).
7. Le Commentaire sur Amos latin (`TXT_A0051O0052_LA_1879_BAREILLE`) est une réservation vide et non publiée.

**Deux faux jugements de l’outil, corrigés avant le relevé.** Les chiffres romains de Bondurand (« Éclaircissements, X », « XXVIIIe année », « (CIII) ») passaient pour des sigles non déclarés. L’italique ne porte jamais un sigle, un chiffre annoncé par un mot de numérotation non plus, et un groupe qui répète une lettre ou porte un ordinal est un nombre. Après correction, la clé de Dhuoda est jugée complète.

**Question ouverte.** Voir la charte, § 5.5.1 : le responsable et la collection n’ont pas de champ par texte.

### 2026-09-16 — Inventaire des notes d’une bible : ce que le relevé a trouvé

Onglet « Notes » du volet de droite de la page Bible, réservé à l’administrateur (charte, § 38.35).

**La clé de chapitre est fiable.** Les notes de verset se cherchent par leur clé de chapitre, à l’égalité : elle vaut le livre et le chapitre du créneau sur les 9 202 notes du corpus. Mesuré sur le Psautier de la traduction moderne, sous la session d’un administrateur : 329 ms à l’égalité, 515 ms par un motif `like`, pour 1 716 notes et 608 ko de blocs.

**Le placement rejoue la page, et le contrôle le dit.** Le lieu de chaque note, recalculé par l’inventaire, a été comparé au chargement réel d’un chapitre et à son filtre de rendu, sur dix livres : aucun écart.

**Des blocs que rien ne charge.** 336 blocs éditoriaux de portée « section » n’ont aucun ancrage canonique : aucune page ne les charge, et leurs 829 notes ne paraissent nulle part. Ce sont surtout des subdivisions d’introduction : 23 blocs pour les Actes, 17 pour le Deutéronome, le corps de l’introduction de Jonas (2 blocs), celles de 1 Samuel. Les notes des blocs n’existent que dans la Bible de Fillion. L’inventaire les liste sous « Ne paraissent pas ». Les ancrer, ou les ranger dans une pièce, est une question de donnée.

**Les notes de bloc sans point d’appel.** Elles se lisent dans l’apparat de leur bloc (231 sur 1 056 au 13 septembre 2026). Leur entrée porte désormais un identifiant, que l’inventaire vise.

### 2026-09-17 — Notes bibliques : qui parle, la discipline, les renvois internes

Charte, § 13.21.

**Où vit la voix.** Aucune des 9 202 notes de verset ne déclare qui parle, ni sur la note ni sur ses blocs. Parmi les 1 056 notes de bloc éditorial, toutes chez Fillion, 153 déclarent `source_editorial_note` sur la note ; 28 le redisent sur chacun de leurs blocs (40 blocs en tout), et aucune ne le dit sur un bloc sans le dire sur la note. Toutes sont publiques.

**Où ces notes vivent.** Les 153 notes tiennent dans 75 blocs d’introduction ou de notice, de portée « section », sans ordre canonique : 1 Chroniques 28, Job 22, 1 Rois 21, 1 Samuel 16, Juges 15, Nombres 14, Deutéronome 13, Josué 7, Genèse 6, Lévitique 6, Ruth 5. Aucune page ne les charge (carnet du 16 septembre 2026). Les 35 renvois internes de l’apparat de Fillion sont tous dans ces mêmes notes. Rien, de la voix ni des renvois internes, ne se voit donc encore sur le site.

**Les disciplines.** Notes de verset par `note_subtype` : critique textuelle 5 589 (5 514 publiques), philologie 2 218 (2 191), traduction 1 384 (1 378), exégèse 11, ces onze chez Fillion. `historical`, `reference` et `other`, que la contrainte admet, ne portent aucune note.

**Le coût des vues.** Ajouter la voix aux deux vues ne change pas le plan : la lecture des notes d’un chapitre telle que la page la fait, par identifiants littéraux, reste à 6,7 ms sur le Psaume 119 de la traduction moderne. ⚠️ Écrite avec une sous-requête sur `versets_canon`, la même lecture agrège toutes les notes de la famille avant de filtrer, en 446 ms : la page ne le fait pas, mais un script d’atelier le ferait.
