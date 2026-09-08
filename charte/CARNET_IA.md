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
