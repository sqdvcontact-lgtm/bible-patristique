# Journal de constitution des liens — Heptateuque

Ce journal complète la charte générale sans la remplacer. Il consigne les
enseignements propres à l’Heptateuque et doit être enrichi après chaque passe.

## Mesure de l’avancement

- Dénominateur fixe de l’œuvre : **3 262 segments**.
- Avancement = segments dont `liens_revus_le` est renseigné / 3 262.
- Un segment lu sans lien doit tout de même être marqué comme relu.
- Le nombre de liens n’est pas une mesure d’avancement.

## Profil documentaire observé

- Profil mixte **A + C**, avec un apport de **B** : commentaire biblique suivi,
  organisé en questions, dont presque tous les titres portent une référence.
- La référence de `ref_niv2_texte` délimite le problème traité, mais ne doit
  jamais être propagée mécaniquement à tous les segments de la question.
- Les notes éditoriales donnent souvent une citation secondaire fiable, mais
  le texte et les témoins bibliques restent décisifs.

## Protocole amélioré

1. Extraire un lot de dix questions avec le texte intégral, les notes et les
   références de titre.
2. Résoudre les cibles candidates, puis afficher les trois témoins de
   `versets_lecture` (`TR0003`, `TR0001`, `TR0004`).
3. Lire chaque segment dans la continuité de sa question.
4. N’attribuer un type 1 que pour une citation explicite ou une référence
   manifestement intentionnelle ; attribuer un type 3 au commentaire précis.
5. Conserver les deux lignes, type 1 et type 3, lorsqu’un même segment cite
   puis explique réellement le même verset.
6. Pour une plage, créer une ligne par verset effectivement mobilisé ; ne pas
   inclure les versets seulement englobés par le titre.
7. Écrire avec préconditions, transaction et contrôle du postétat.
8. Terminer par une passe d’oubli : notes, citations annoncées, segments sans
   lien, doublons, cibles exclusives, motifs et marques de relecture.

## Enseignements des Questions I à XX de la Genèse

### Ce qui améliore la précision

- Une question chronologique peut mobiliser plusieurs versets non contigus.
  Pour Mathusalem, la seule référence imprimée `Genèse 5, 25` ne suffit pas :
  l’âge total, l’âge de Lamech et l’âge de Noé au déluge participent au calcul.
- Inversement, une plage imprimée ne justifie pas tous ses versets. Dans la
  question sur le corbeau et la colombe, Genèse 8,6 n’a pas été lié lorsque le
  segment ne mobilisait que 8,7-9.
- Les répétitions structurées de Genèse 10,5.20.31 sont toutes pertinentes
  lorsque le texte oppose explicitement ces trois répartitions linguistiques à
  l’unité de langue de Genèse 11,1.
- Une différence de traduction n’empêche pas une cible vérifiée lorsqu’il
  s’agit sans ambiguïté du même verset. Le motif doit alors signaler la leçon
  suivie, par exemple « puissant » / « géant » en Genèse 10,8.
- Les références présentes dans les notes doivent être liées au segment qui
  porte l’appel, non à toute la question.

### Discipline de typage

- Les Questions I à XX ont produit des types 1 et 3 seulement.
- Aucun type 2 ou 4 ne doit être ajouté pour équilibrer artificiellement les
  catégories : leur absence dans une passe est un résultat légitime.
- Un développement continu reste de type 3 tant qu’il explique précisément le
  verset directeur ; il ne devient pas type 4 du seul fait qu’il s’éloigne de
  la formulation littérale.

### Contrôles techniques à conserver

- Les scripts d’écriture sont volontairement non rejouables après succès : ils
  refusent un lot déjà lié ou déjà marqué relu.
- Chaque écriture vérifie le nombre attendu de liens et de segments dans une
  transaction unique.
- Les audits doivent paginer les requêtes de données ; l’API limite autrement
  une sélection ordinaire à 1 000 lignes.
- Dans les contrôles PowerShell injectant du JavaScript, employer des échappements
  Unicode pour comparer `vérifié`, afin d’éviter un faux échec d’encodage.

## État après la passe du 2 août 2026

- Questions traitées : Genèse I à XX.
- Segments relus : **39 / 3 262**.
- Avancement : **1,20 %**.
- Liens : **84** — type 1 : 26 ; type 3 : 58.
- Audit : aucun doublon, aucune cible invalide, aucun motif vide, aucun
  arbitrage requis.

## Enseignements des Questions XXI à XXX de la Genèse

### Variantes et récits parallèles

- Une variante textuelle importante reste rattachable au verset canonique si
  l’identité du passage ne fait aucun doute. Pour Genèse 11,12-13, le texte
  patristique suit une tradition grecque qui insère Chaïnan et diffère sur les
  âges ; les motifs des liens doivent expliciter cette divergence.
- Quand l’auteur confronte deux récits, il faut lier les deux ensembles et non
  choisir arbitrairement celui du titre. La chronologie d’Abraham exige ainsi
  Genèse 11–12 **et** Actes 7,2-5.
- Dans ce cas, le type 1 identifie les propositions scripturaires citées ou
  intentionnellement rappelées ; le type 3 porte leur comparaison et la
  solution chronologique proposée.
- Une preuve secondaire peut éclairer le verset directeur sans devenir le
  verset directeur : Josué 24,15 est une citation de type 1, tandis que son
  emploi pour expliquer « Abraham l’Hébreu » reste un commentaire de type 3 sur
  Genèse 14,13.

### Segments sans lien et couverture exhaustive

- Les segments 64, 65 et 94 sont réellement sans lien : conclusion générale,
  transition méthodologique et renvoi bibliographique. Ils ont été relus et
  marqués, sans création d’un écho thématique artificiel.
- Chaque manifeste doit désormais déclarer explicitement les numéros
  `SANS_LIEN` et refuser l’écriture si un segment n’est ni lié ni déclaré sans
  lien. Cette partition exhaustive prévient les oublis silencieux.
- La passe d’oubli doit confirmer que les segments `SANS_LIEN` ne portent ni
  appel de note biblique ni marqueur manifeste de citation.
- Les appels de notes peuvent viser plusieurs versets : cinq appels bibliques
  dans ce lot ont produit six cibles de type 1, parce que Malachie 1,2-3 forme
  une citation unique répartie sur deux versets.

### État cumulatif après la Question XXX

- Questions traitées : Genèse I à XXX.
- Segments relus : **87 / 3 262**.
- Avancement : **2,67 %**.
- Liens : **197** — type 1 : 71 ; type 3 : 126.
- Segments relus sans lien : 3.
- Audit : aucune omission manifeste, aucun doublon, aucune cible invalide,
  aucun motif vide, aucun arbitrage requis ; toutes les lignes sont
  `vérifié / lecture`.

## Enseignements des Questions XXXI à XL de la Genèse

### Commentaires techniques et preuves secondaires

- Un développement lexical, grammatical, médical ou philosophique reçoit un
  type 3 lorsqu’il résout précisément une difficulté du verset directeur. Sa
  matière extra-biblique ne suffit pas à le transformer en simple type 4.
- L’exemple profane d’Horace n’a pas de cible biblique propre ; les segments qui
  l’emploient restent toutefois des commentaires précis de « possession
  éternelle » en Genèse 17,8.
- Une donnée narrative secondaire doit être liée lorsqu’elle fonde réellement
  l’argument : les enfants de Cétura en Genèse 25,1-2 précisent le sens du corps
  d’Abraham « comme mort » en Romains 4,19.
- Une affirmation spéculative sans cible scripturaire certaine ne doit pas
  susciter une cible inventée. Dans la question sur la reconnaissance des
  anges, l’hypothèse de leur montée au ciel reste rattachée au passage directeur
  de Genèse 18,2, sans fabriquer un verset absent du récit.
- Les scènes connexes de Genèse 18–19 ne sont ajoutées que lorsque le segment
  les rappelle distinctement : départ de deux hommes, arrivée des deux anges et
  accueil de Lot.

### État cumulatif après la Question XL

- Questions traitées : Genèse I à XL.
- Segments relus : **121 / 3 262**.
- Avancement : **3,71 %**.
- Liens : **270** — type 1 : 98 ; type 3 : 172.
- Types 2 et 4 : aucun lien forcé à ce stade.
- Audit : aucun doublon, aucune cible invalide, aucun motif vide, aucun
  arbitrage requis ; toutes les lignes sont `vérifié / lecture`.

## Enseignements des Questions XLI à LXX de la Genèse

### Organisation des passes parallèles

- Trois agents peuvent préparer simultanément des lots disjoints, mais ils ne
  doivent pas écrire en base. L’orchestrateur relit les manifestes, harmonise le
  typage, puis écrit les lots séquentiellement avec un audit entre chaque
  transaction.
- Chaque lot doit fixer l’œuvre, `ref_niv1`, les dix questions, les bornes et le
  nombre de segments. Le filtre `ref_niv1 = Livre premier` est indispensable :
  les mêmes numéros de questions réapparaissent dans les autres livres.
- Une empreinte du texte lu est un garde-fou utile contre une modification
  concurrente entre la lecture et l’écriture.
- Un audit transversal distinct contrôle ensuite les lots ensemble : segments
  relus, types, segments sans lien, fiabilité, provenance, arbitrages,
  doublons, cibles exclusives et motifs.

### Références fautives et conversion sémantique

- La citation sur l’hospitalité offerte aux anges identifie avec certitude
  Hébreux 13,2, malgré la note imprimée « Heb. XII, 2 ».
- La formule « Dieu vous éprouve pour savoir si vous l’aimez » correspond à la
  cible locale Deutéronome 13,4, malgré « Deu. XIII, 3 » dans l’édition.
- « L’Ange du grand conseil » correspond à la cible locale Isaïe 9,5 selon la
  Septante, malgré la référence imprimée « Isa. IX, 6 ».
- La note « Psa. CIX, 1 » au segment 181 accompagne en réalité la citation de
  Jean 20,17. Le véritable Psaume 109,1 est cité au segment suivant.
- « Isa. VI, 11,12 » au segment 196 est une coquille de référence : le récit
  d’Achaz demandant ou refusant un signe est Isaïe 7,11-12.
- Une note proposant deux parallèles ne commande pas deux liens automatiques :
  si le texte ne cite intentionnellement que Deutéronome 6,13, le parallèle de
  Deutéronome 10,20 reste hors manifeste.

### Typage affiné

- Le type 4 est légitime lorsque l’auteur construit explicitement un parallèle
  thématique : l’aveuglement sélectif de Genèse 19,11 est rapproché de
  2 Rois 6,18 et de Luc 24,16.
- Le type 2 convient aux formulations ou récits réellement absorbés sans
  attribution : « forme d’esclave » (Philippiens 2,7), clauses narratives de
  Genèse 24–25, généalogie de Cétura et « enfants de la promesse ».
- Inversement, une reprise annoncée par « l’Apôtre » et accompagnée d’une note
  reste une référence intentionnelle de type 1. La relecture coordinatrice a
  ainsi corrigé Galates 4,22-24 du type 2 vers le type 1.
- Dans un récit continu, distinguer la demande, la promesse et son accomplissement
  évite d’attribuer indistinctement toute une plage : demande de Ségor en
  Genèse 19,20, promesse en 19,21 ; différentes étapes du puits en Genèse 21.

### Anomalie textuelle à conserver pour l’audit typographique

- Le segment 217 affirme qu’Abraham eut « dix enfants de Cétura », alors que la
  généalogie de Genèse 25,2-4 ne livre pas simplement ce total. Les liens vers
  la généalogie sont sémantiquement certains, mais cette discordance doit être
  revue contre le fac-similé avant toute correction du texte. Elle ne reçoit
  pas automatiquement `[<i>sic</i>]`, car il ne s’agit pas encore d’une coquille
  orthographique démontrée.

### État cumulatif après la Question LXX

- Questions traitées : Genèse I à LXX.
- Segments relus : **213 / 3 262**.
- Avancement : **6,53 %**.
- Liens : **550** — type 1 : 193 ; type 2 : 9 ; type 3 : 346 ; type 4 : 2.
- Audit des trois passes parallèles : aucun segment oublié, aucun doublon,
  aucune cible invalide, aucun motif vide, aucun arbitrage requis ; toutes les
  lignes sont `vérifié / lecture`.

## Enseignements des Questions LXXI à C de la Genèse

### Plages, variantes et ordre narratif

- Une plage portée par le titre est déployée seulement si le segment commente
  réellement l’ensemble. La Question LXXIX affirme le sens prophétique de toute
  la séquence Genèse 27,1-17 : chaque verset reçoit donc un type 3, mais seuls
  les éléments effectivement repris dans le résumé reçoivent un type 2.
- À l’inverse, le titre Genèse 29,27-31 ne suffit pas à inclure 29,31 : la
  discussion ne mobilise que 29,27-30.
- Une variante positive ou négative n’empêche pas l’identification lorsque la
  scène est certaine : Genèse 26,32 est visé malgré « nous n’avons pas trouvé
  d’eau » contre la leçon positive des trois témoins.
- Un épisode extérieur à la plage peut résoudre l’ordre du récit : la « vision »
  évoquée à propos de Genèse 31,49 est identifiée sémantiquement au songe de
  Genèse 31,24.

### Références non bibliques et passe d’oubli

- Un renvoi interne à une autre œuvre patristique ne doit pas rester un simple
  segment sans lien. Le renvoi du segment 235 au *Sermon IV* d’Augustin a été
  ajouté sans cible, type 4, `à constituer`, conformément au §25.7.
- L’exemple d’Hippocrate au segment 281 reçoit de même une ligne non biblique
  sans cible ; ses liens de type 3 vers Genèse 30,38-39 restent distincts.
- L’audit transversal accepte désormais comme état valide l’absence de cible
  uniquement avec `fiabilite = à constituer`, motif obligatoire et arbitrage.
  Il distingue ces arbitrages attendus des arbitrages réellement anormaux.
- La passe d’oubli doit donc examiner non seulement les marqueurs bibliques,
  mais aussi les notes et renvois patristiques ou profanes.

### Typage

- Un parallèle d’ordre narratif explicitement construit peut recevoir un type
  4 : Genèse 2,8-9 sert de parallèle à la récapitulation de Genèse 29,11-12.
- Une allusion au tabernacle sans attribution formelle reprend Exode 25,8 en
  type 2 ; son emploi pour interpréter la « maison de Dieu » reste type 3.
- Une référence profane sans cible est classée type 4, comme le prévoit la
  pratique générale des signalements non bibliques.

### Anomalies textuelles à contrôler séparément

- Segments 221-223 : le texte porte « Israël », tandis que Genèse 25,13.16 et
  les trois témoins imposent Ismaël. Contrôle au fac-similé requis.
- Segment 253 : balisage italique cassé autour de « connut-elle ».
- Segments 270-271 : une citation s’ouvre dans le premier segment et se ferme
  dans le suivant ; vérifier si ce chevauchement est voulu par la segmentation.
- Les références imprimées « Eph. 6,31-32 » et « Isa. VI,11-12 » ont été
  résolues sémantiquement en Éphésiens 5,31-32 et Isaïe 7,11-12.

### État cumulatif après la Question C

- Questions traitées : Genèse I à C.
- Segments relus : **296 / 3 262**.
- Avancement : **9,07 %**.
- Liens : **825** — type 1 : 283 ; type 2 : 26 ; type 3 : 510 ; type 4 : 6.
- Deux références non bibliques sans cible sont déclarées `à constituer`.
- Audit : aucun segment oublié, aucun doublon, aucune cible invalide, aucun
  motif vide et aucun arbitrage inattendu.

## Écriture et audit du Lévitique XXXI-XL

- Le lot 1660-1738 a été écrit après validation de son empreinte : 79
  segments, 234 liens — type 1 : 58 ; type 3 : 172 ; type 4 : 4.
- Les quatre références non bibliques sont conservées sans cible, avec la
  fiabilité `à constituer` et un motif conforme au §25.7.
- Le raccord avec les lots XXI-XXX et XLI-L a été contrôlé : l’ensemble du
  Lévitique I-L forme désormais une suite continue de 308 segments relus.
- Audit cumulé I-L : 821 liens — type 1 : 250 ; type 2 : 1 ; type 3 : 556 ;
  type 4 : 14. Aucun doublon, aucune cible invalide, aucun motif vide et aucun
  arbitrage inattendu.

### État après cette passe

- Avancement du corpus : **1 779 / 3 262 = 54,54 %**.

## Enseignements des Questions CI à CXL de la Genèse

### Résolution sémantique et granularité

- Les références imprimées fautives continuent d’être résolues par le sens :
  Genèse 32,28 vers 32,29 pour le changement de nom ; 1 Corinthiens 15,6
  vers 15,5 pour l’apparition aux Douze ; Jean 6,71 vers 6,70 pour le choix
  des Douze et la parole sur le démon.
- Une comparaison explicite de deux généalogies exige de déployer les versets
  effectivement comptés. La Question CXXI relie donc individuellement
  Matthieu 1,1-17 et Luc 3,23-34, sans étendre mécaniquement la plage lucanienne
  au-delà d’Abraham.
- Dans une démonstration grammaticale ou chronologique distribuée sur plusieurs
  segments, le lien directeur est propagé aux segments qui poursuivent
  réellement le raisonnement ; les preuves secondaires restent limitées aux
  versets effectivement cités ou utilisés.
- Les étapes du récit de Juda et Thamar sont séparées entre mariage, morts,
  attente de Séla, conduite de Thamar et reconnaissance finale, au lieu de
  transformer tout Genèse 38 en plage indifférenciée.

### Titres fautifs et fidélité à la source

- Les intitulés live `Question CXXI [<i>sic</i>]` et
  `Question CXXX [<i>sic</i>]`, correspondant logiquement aux Questions CXXXI
  et CXXXIII, sont conservés tels quels. Les scripts les verrouillent par leurs
  préconditions au lieu de corriger silencieusement la source.
- Les variantes sûres n’empêchent pas le rattachement : « Ulammaüs » est
  identifié à Genèse 28,19 d’après la tradition grecque ; l’image de la mère
  déjà morte dans le songe de Joseph mobilise Genèse 35,19.

### Anomalies textuelles à contrôler séparément

- Segment 342 : `confirme.lagrande` ; segment 350 : mots latins soudés ;
  segment 352 : « ce qui né » ; segment 355 : syntaxe lacunaire.
- Segment 380 : le compte attribué à Matthieu semble avoir perdu
  « quarante- » ; aucune correction ni ajout de *sic* sans fac-similé.
- Segment 391 : la note Genèse 36,6-13 est erronée, le passage cité étant
  Genèse 37,1-2.
- Question CXXXII : espace manquante avant le point d’interrogation ; segment
  418 : espaces avant les points-virgules suivant les mots grecs. La coquille
  `paassge [<i>sic</i>]` est déjà correctement signalée.

### État cumulatif après la Question CXL

- Questions traitées : Genèse I à CXL.
- Segments relus : **442 / 3 262**.
- Avancement : **13,55 %**.
- Liens : **1 429** — type 1 : 479 ; type 2 : 45 ; type 3 : 899 ; type 4 : 6.
- Audit : aucun segment oublié, aucun doublon, aucune cible invalide, aucun
  motif vide et aucun arbitrage inattendu.

## Enseignements des Questions CXLI à CLXX de la Genèse

### Chapitres entiers et limites effectives

- Quand un segment commente effectivement toute une mise en scène, un titre de
  chapitre entier commande une couverture verset par verset : Genèse 44,1-34
  pour la conduite de Joseph. En revanche, la critique du discours de Juda
  s’arrête à 44,29 ; la supplication de 44,30-34 n’est pas incluse par inertie.
- Les parallèles de la livraison de Joseph et de la délivrance par Moïse sont
  explicitement typologiques : ils reçoivent le type 4, avec cible biblique,
  distinct du type 4 sans cible réservé aux références non bibliques.
- Le titre fautif Genèse 43,28 est résolu en 43,23 par le contenu ; la note
  Romains 11,1-25 est prolongée jusqu’à 11,26 parce que le salut final d’Israël
  est effectivement mobilisé.

### Variantes et références imprimées fautives

- La variante septantante des soixante-quinze personnes reste rattachée à
  Genèse 46,27, même lorsque les témoins hébreux affichés portent soixante-dix.
- La note Genèse 45,16-20 du segment 498 ne correspond pas aux questions et
  réponses décrites ; Genèse 47,1-4 est la cible sémantique retenue.
- Les titres Genèse 47,21 et 49,32 sont résolus respectivement en 47,31 et
  49,33. La note Siracide 11,30 du segment 545 vise en réalité 11,28.

### Robustesse transactionnelle

- Deux scripts générés sans espace entre un nombre interpolé et le mot-clé
  SQL `then` ont échoué avant toute écriture. Les scripts ont été corrigés,
  rejoués en contrôle, puis écrits et audités. Règle ajoutée : toujours
  rendre les mots-clés SQL explicitement séparés autour des interpolations.

### Anomalies textuelles à contrôler séparément

- Segment 450 : ponctuation après « il leur dit » ; segment 464 : initiale
  minuscule après segmentation ; segment 471 : `par fois [<i>sic</i>]` déjà
  signalé.
- Segments 489-491 : ponctuation et séparation des propositions ; segment 497 :
  `obcure [<i>sic</i>]` déjà signalé.
- Segment 533 : `Josehp [<i>sic</i>]` et phrase possiblement lacunaire ; segment
  546 : « ta Genèse » à vérifier au fac-similé ; segment 554 :
  `Lersque [<i>sic</i>]` déjà signalé.

### État cumulatif après la Question CLXX

- Questions traitées : Genèse I à CLXX.
- Segments relus : **549 / 3 262**.
- Avancement : **16,83 %**.
- Liens : **1 781** — type 1 : 580 ; type 2 : 49 ; type 3 : 1 144 ; type 4 : 8.
- Audit : aucun segment oublié, aucun doublon, aucune cible invalide, aucun
  motif vide et aucun arbitrage inattendu.

## Clôture du Livre premier : Genèse

- Les segments introductifs 1-5 sont légitimement sans lien. Le segment 6 vise
  les deux bornes bibliques effectivement nommées, Genèse 1,1 et 3,24.
- Le segment 7 renvoie aux trois autres ouvrages d’Augustin sur la Genèse ; le
  segment 560 à la Question CLXI de la présente œuvre. Ces deux références
  internes sont enregistrées sans cible, type 4, `à constituer`, conformément
  au §25.7.
- La note Siracide 22,13 vise localement Siracide 22,12. La variante des
  soixante-quinze personnes reste rattachée à Genèse 46,27 avec explication
  dans le motif.
- L’auditeur transversal paginaient initialement seulement mille liens. Il a
  été corrigé pour paginer segments et liens, puis rejoué sur tout le livre.

### État final de la Genèse

- Segments relus : **570 / 570**, soit **100 % du Livre premier**.
- Avancement du corpus : **570 / 3 262**, soit **17,47 %**.
- Liens : **1 824** — type 1 : 593 ; type 2 : 49 ; type 3 : 1 169 ; type 4 : 13.
- Quatre références sans cible sont déclarées `à constituer`.
- Audit intégral paginé : aucun doublon, aucune cible invalide, aucun motif
  vide et aucun arbitrage inattendu.

## Début du Livre deuxième : Exode I à X

- *Contre Fauste*, livre 22, chapitre 60 et suivants, est enregistré comme
  référence non biblique sans cible au segment 577.
- La note Actes 8,25 du segment 578 vise le discours d’Étienne en Actes 7,25.
- La citation septantante attribuée à Isaïe 9,6 correspond à la numérotation
  locale Isaïe 9,5.
- Anomalies à contrôler : segment 591, « dit a Moïse ; » ; titre de la
  Question VII, virgule après « tout-à-coup ». `embarrasée [<i>sic</i>]` au
  segment 598 est déjà signalé.

### État cumulatif après Exode X

- Segments relus : **601 / 3 262**.
- Avancement : **18,42 %**.
- Passe Exode I-X : 74 liens — type 1 : 27 ; type 3 : 46 ; type 4 : 1.
- Le segment terminal 601 de la Question X, d’abord exclu par une borne trop
  courte, a été récupéré par une passe isolée puis inclus dans l’audit de
  continuité. Règle : toujours contrôler les deux segments voisins des bornes.
- Audit : aucun segment oublié, aucun doublon, aucune cible invalide, aucun
  motif vide et aucun arbitrage inattendu.

## Enseignements d’Exode XI à XL

### Structure et numérotation ancienne

- La Question XIII est stockée sous l’intitulé source
  `Question XII [<i>sic</i>]`. Ce libellé fautif est conservé et verrouillé
  dans les préconditions, sans fausser la suite logique des questions.
- Les titres d’Exode 8 suivent l’ancienne versification de la Vulgate, décalée
  de quatre versets par rapport au canon local moderne : 8,7 → 8,3 ; 8,15 →
  8,11 ; 8,19 → 8,15 ; 8,21-23 → 8,17-19 ; 8,25 → 8,21 ; 8,26 →
  8,22 ; 8,32 → 8,28.
- En conséquence, `[<i>sic</i>]` ajouté après « Exode 8, 32 » était
  erroné : il a été supprimé de la base et des fichiers candidats. La
  nouvelle règle réserve ce marqueur aux coquilles orthographiques.

### Résolutions sémantiques

- Psaume 85,1-2 est résolu en Psaume 86,1-2 par la citation sur les fondements
  et les portes de Sion ; Psaume 146,2 est confirmé par « le Seigneur bâtit
  Jérusalem ».
- Exode 18,1-5 est limité aux versets 1, 2 et 5 effectivement mobilisés ; la
  généalogie d’Exode 6,14-28 s’arrête au verset 26, fin de l’unité commentée.
- La note 2 Corinthiens 11,15 du segment 653 vise 2 Corinthiens 2,15. La note
  Genèse 30,42 du segment 692 vise Genèse 31,42.
- Didyme, *Sur le Saint-Esprit*, est enregistré sans cible, type 4,
  `à constituer`.

### État cumulatif après Exode XL

- Segments relus : **705 / 3 262**.
- Avancement : **21,61 %**.
- Exode I-XL : **398 liens** — type 1 : 136 ; type 2 : 3 ; type 3 : 257 ;
  type 4 : 2.
- Corpus cumulé : **2 222 liens** — type 1 : 729 ; type 2 : 52 ; type 3 :
  1 426 ; type 4 : 15.
- Audit continu des segments 571-705 : aucun segment oublié, aucun doublon,
  aucune cible invalide, aucun motif vide et aucun arbitrage inattendu.

## Enseignements d’Exode XLI à XC

### Ossature canonique Suzanne et Bel

- La charte exige `SUS` pour Suzanne et `BEL` pour Bel et le Dragon, mais la
  base portait encore 64 créneaux `DAN.13.*` et 42 `DAN.14.*`, tandis que les
  livres `SUS` et `BEL` existaient sans versets.
- Une migration transactionnelle a créé `SUS.1.1-64` et `BEL.1.1-42`, remappé
  320 lignes de traduction, 15 liens existants et les bornes de péricopes,
  puis supprimé les anciens créneaux. La vue matérialisée
  `versets_lecture` a été rafraîchie et les délais techniques temporaires ont
  été rétablis.
- Les liens du récit de Suzanne dans Exode LXXVIII visent désormais
  `SUS.1.37`, `SUS.1.54` et `SUS.1.56-58`, conformément à la charte.

### Références non bibliques et renvois internes

- Tychonius, deux renvois à la *Chronique* d’Eusèbe, deux renvois internes
  aux Questions LXI et XXV, la loi des Douze Tables avec Cicéron et des
  commentateurs non identifiés sont enregistrés sans cible, type 4,
  `à constituer`.
- Une glose grecque purement lexicale (`Φοῖνιξ`, palmier) n’est pas
  transformée artificiellement en référence non biblique.

### Résolution et couverture

- Le récit des murmures avant les cailles renvoie à Exode 16,3.13, non à
  Nombres 11 : l’auteur insiste justement sur l’absence de précision concernant
  la viande. La cessation de la manne vise Josué 5,11-12.
- La Pentecôte est limitée à Actes 2,1.2.4, seuls versets mobilisés ; le
  parallèle du doigt et de l’Esprit vise Luc 11,20 et Matthieu 12,28.
- Plusieurs titres d’Exode 22 suivent encore une numérotation ancienne et sont
  résolus par leur contenu : 22,1 → 21,37 ; 22,2 → 22,1-2 ; 22,9 → 22,8 ;
  22,28 → 22,27. Le titre fautif 22,3 de la Question LXXXVIII vise 23,3 et
  ne reçoit pas de *sic*, puisqu’il ne s’agit pas d’une coquille orthographique.

### Application de la nouvelle règle *sic*

- Le segment 967 porte la coquille certaine « au temps ou sa mère ». La
  leçon imprimée a été conservée et marquée
  `ou [<i>sic</i>]` dans la base et les fichiers candidats.
- Les anomalies de syntaxe, de ponctuation ou d’accord seulement probables
  restent consignées pour confrontation au fac-similé ; aucun *sic* ne leur
  est ajouté automatiquement.

### État cumulatif après Exode XC

- Segments relus : **967 / 3 262**.
- Avancement : **29,64 %**.
- Exode I-XC : **1 098 liens** — type 1 : 374 ; type 2 : 11 ; type 3 : 700 ;
  type 4 : 13.
- Corpus cumulé : **2 922 liens** — type 1 : 967 ; type 2 : 60 ; type 3 :
  1 869 ; type 4 : 26.
- Audit continu des segments 571-967 : aucun segment oublié, aucun doublon,
  aucune cible invalide, aucun motif vide et aucun arbitrage inattendu.

## Préparation d’Exode CXI à CXX — contrôle sans écriture

### Résolutions à conserver

- La note `Héb. IX, 1-12` de la Question CXII ne doit pas produire
  mécaniquement douze cibles : Hébreux 9,4-5, descriptifs de l’arche et des
  chérubins, ne participent pas à la distinction invoquée dans le segment
  porteur de l’appel. Les versets 1-3 et 6-12 sont effectivement mobilisés.
- La note `Ex. XXXVIII, 16` attachée à la largeur et à la longueur d’une palme
  est bibliographiquement fautive : le texte et les trois témoins identifient
  Exode 28,16. Cette anomalie de référence ne reçoit pas de marque *sic*,
  réservée aux coquilles orthographiques.
- `Ps. XI, 7` se résout en `PSA.11.7` dans le canon local : la cible contient
  bien les paroles pures/chastes du Seigneur, sans conversion vers la
  numérotation moderne du titre français.
- La grille, sa position à mi-hauteur et l’autel creux de la Question CXIII
  mobilisent respectivement Exode 27,4, 27,5 et 27,8, au-delà du seul lemme
  imprimé Exode 27,1.
- L’affirmation christologique du segment 1070 reprend assez étroitement
  Hébreux 7,27 pour constituer un type 2, sans attribution explicite.
- Les opinions de commentateurs non identifiés sur la pierre changeant de
  couleur de l’Ourim et du Thummim, puis sur les quatre lettres du
  tétragramme, sont enregistrées sans cible, type 4, `à constituer`, selon le
  §25.7.

### Contrôle typographique de la passe

- Les marques existantes sur `rationnal`, `vraissemblance` et `Araon` relèvent
  bien de la règle orthographique. Les accords, la syntaxe et la ponctuation
  douteux repérés dans les segments 1035, 1056, 1062, 1063 et 1066 ne
  reçoivent pas automatiquement de *sic*.

### État du dry-run

- Lot : 36 segments continus, 1035-1070, `Livre deuxième`, Questions
  CXI-CXX ; 94 liens proposés, dont 2 sans cible.
- Répartition proposée : type 1 : 41 ; type 2 : 1 ; type 3 : 50 ; type 4 : 2.
- Aucun écrit en base : l’avancement reste **967 / 3 262 = 29,64 %**.
- Après écriture ultérieure de ce lot : **1 003 / 3 262 = 30,75 %**
  (gain de 36 segments, soit 1,10 point).

## Préparation d’Exode CXLI à CL — contrôle sans écriture

### Résolutions à conserver

- Le titre Exode 32,16 de la Question CXLIV ne suffit pas au geste commenté :
  32,16 porte l’écriture divine des tables, tandis que leur brisement par
  Moïse est en 32,19. Les deux cibles ont une fonction locale distincte.
- La note `Ib. XXXII, 10` du segment 1156 ne correspond pas à la formule
  « ton peuple que tu as tiré d’Égypte ». Le parallèle réel est Exode 32,7 ;
  Exode 32,10 devient le verset directeur seulement à partir de « Laisse-moi »
  au segment 1157.
- Les deux références psalmiques ont été résolues par leur formulation dans le
  canon local : `Ps. L, 11` = `PSA.50.11`, et `Ps. LXVII, 3` = `PSA.67.3`.
- Le renvoi du segment 1145 à *Contre Fauste*, livre 22, chapitre 93, est une
  référence non biblique sans cible, type 4, `à constituer`, conformément au
  §25.7.

### Contrôle typographique de la passe

- `ou [<i>sic</i>] coulent le lait et le miel` au segment 1164 est bien une
  coquille orthographique. Les virgules fautives, espaces manquantes après les
  deux-points et guillemets incomplets relevés aux segments 1139, 1157, 1160
  et 1164 restent des anomalies typographiques ou syntaxiques : aucun *sic*
  supplémentaire n’est proposé.

### État du dry-run

- Lot : 32 segments continus, 1138-1169, `Livre deuxième`, Questions
  CXLI-CL ; 87 liens proposés, dont 1 sans cible.
- Répartition proposée : type 1 : 31 ; type 2 : 1 ; type 3 : 54 ; type 4 : 1.
- Aucun écrit en base : l’avancement reste **1 070 / 3 262 = 32,80 %**.
- Après écriture ultérieure de ce lot : **1 102 / 3 262 = 33,78 %**
  (gain de 32 segments, soit 0,98 point).

## Préparation d’Exode CLXXVII, sous-passe B — contrôle sans écriture

### Commentaire géométrique et étendue minimale

- Les segments 1354-1395 construisent une démonstration géométrique en
  confrontant les rideaux, planches et colonnes d’Exode 26, le parvis et
  l’autel d’Exode 27, le bassin d’Exode 30, puis l’exécution d’Exode 38.
  Chaque segment reçoit seulement les versets dont les mesures participent à
  son calcul ; aucune cible générique de chapitre n’est nécessaire.
- Les segments 1398-1405 commentent le surplus de la demi-tenture d’Exode
  26,12 à partir des groupes de cinq et six tapis d’Exode 26,8-9. Les segments
  1407-1412 ouvrent une difficulté distincte sur la coudée excédentaire de
  chaque côté en Exode 26,13.
- Les segments 1396, 1397 et 1406 sont de pures transitions méthodologiques :
  ils sont explicitement déclarés `SANS_LIEN`, plutôt que de recevoir par
  propagation le verset du développement suivant.

### Références imprimées à résoudre par le contenu

- La note `Ex. XXVI, 14` du segment 1368 accompagne les quinze coudées et
  trois colonnes d’Exode 27,14.
- Dans le récit de construction, les deux côtés de quinze coudées cités au
  segment 1385 sont Exode 38,14-15. La tenture de porte décrite aux segments
  1386, 1393-1395 est Exode 38,18, malgré les numéros imprimés discordants et
  la leçon « trente coudées » du segment 1386.
- Aucun renvoi patristique ou profane ne se trouve dans les bornes du
  manifeste 1354-1412 ; la liste §25.7 est donc légitimement vide.

### Contrôle typographique de la passe

- Les marques existantes sur `Ocident`, `par` pour `pas`, les deux occurrences
  de `lapis`, `dévelloppement` et `postéreure` relèvent bien de coquilles
  orthographiques. La soudure `tabernacle.etl’autel`, les accords fautifs et
  les références numériques discordantes sont consignés séparément et ne
  reçoivent pas automatiquement de *sic*.

### État du dry-run

- Manifeste strict : 59 segments, 1354-1412 ; contexte de raccord lu :
  1349-1353 et 1413-1417, tous dans la Question CLXXVII.
- Liens proposés : 193 — type 1 : 28 ; type 3 : 165 ; aucun type 2, type 4
  ou lien sans cible. Trois segments sont relus sans lien.
- Aucun écrit en base : l’avancement reste **1 271 / 3 262 = 38,96 %**.
- Après écriture ultérieure de cette seule sous-passe :
  **1 330 / 3 262 = 40,77 %** (gain de 59 segments, soit 1,81 point).

## Début du Livre troisième — Lévitique XI à XX, contrôle sans écriture

### Numérotation du chapitre 6

- Les titres et notes suivent une numérotation ancienne du Lévitique 6,
  décalée de sept versets par rapport au canon local après les prescriptions
  de réparation placées localement en Lévitique 5,20-26. Ainsi, 6,11 vise
  `LEV.6.4`, 6,12-13 vise `LEV.6.5-6`, 6,20 vise `LEV.6.13`, 6,21 vise
  `LEV.6.14`, 6,23 vise `LEV.6.16`, 6,26 vise `LEV.6.19` et 6,30 vise
  `LEV.6.23`.
- Par le même effet, la longue citation imprimée `Lev. VI, 1-7` aux segments
  1586-1587 est résolue sémantiquement en `LEV.5.21-26`, l’introduction
  générique de 5,20 n’étant pas nécessaire comme cible.

### Autres corrections sémantiques

- La note `Lev. IV, 12, 24` du segment 1557 vise le taureau du prêtre en
  4,12 et celui de l’assemblée en 4,21 ; 4,24 concerne le bouc du chef et ne
  porte pas le détail commenté.
- `Psa. XVIII, 13` est confirmé par `PSA.18.13`. En revanche,
  `Psa. LVIII, 6` au segment 1572 vise `PSA.68.6`, seul témoin local portant
  la folie connue de Dieu et les fautes qui ne lui sont pas cachées.
- L’holocauste quotidien du soir évoqué au segment 1541 reprend précisément
  Exode 29,39 sans attribution formelle et reçoit donc un type 2.

### Références non bibliques et typographie

- Quatre attributions sans cible sont conservées selon le §25.7 : les
  interprètes latins du segment 1534, plusieurs interprètes au segment 1552,
  plusieurs traducteurs au segment 1568 et les auteurs latins cités pour
  l’étymologie de `lex` au segment 1569.
- Les marques existantes `quelque [sic] soit`, `consécracration`,
  `trés-fine` et `d’ou` relèvent bien de coquilles orthographiques. Les
  répétitions du texte biblique, formes anciennes, accords et ponctuations
  douteuses ne reçoivent pas de *sic* supplémentaire sans preuve source.

### État du dry-run

- Lot : 56 segments continus, 1533-1588, `Livre troisième`, Questions XI-XX ;
  voisins contrôlés : 1532 Question X et 1589 Question XXI.
- Liens proposés : 150 — type 1 : 49 ; type 2 : 1 ; type 3 : 96 ; type 4 : 4,
  dont 4 références sans cible. Aucun segment n’est sans lien.
- Aucun écrit en base : l’avancement reste **1 412 / 3 262 = 43,29 %**.
- Après écriture ultérieure de ce lot : **1 468 / 3 262 = 45,00 %**
  (gain de 56 segments, soit 1,72 point).

## Préparation d’Exode CLXXVII, sous-passe C — contrôle sans écriture

### Récapitulation et ciblage sémantique

- Les segments 1413-1471 achèvent la Question CLXXVII : fin de la discussion
  sur le surplus des tapis (Exode 26,13), récapitulation géométrique du parvis
  (Exode 27,9-18), parcours du sanctuaire et synthèse des couvertures.
- Le contenu de l’arche au segment 1448 doit recevoir `HEB.9.4` : ce verset
  réunit explicitement le vase d’or contenant la manne, la verge d’Aaron et
  les tables de l’alliance. La cible est un rapprochement de type 4, et non
  une référence non biblique sans cible.
- Au segment 1451, la note `Lev. XVI, 1` est conservée comme citation
  éditoriale, mais le détail du rite est réparti sur Lévitique 16,2.12.14.18.34.
  Le contenu prime donc sur le seul numéro imprimé pour les liens de
  commentaire.
- Le raccord terminal a été contrôlé : le segment 1472 ouvre le Livre
  troisième et la Question I sur Lévitique 5,1. La borne 1471 achève bien la
  sous-passe et le Livre deuxième.

### Contrôle typographique de la passe

- Le scan de la page 474 confirme que `ce n est` au segment 1421 est une
  perte d’apostrophe introduite par l’OCR. La correction `ce n’est` est donc
  intégrée au script avec précondition exacte, sans ajout de *sic*.
- Les formes imprimées déjà accompagnées de `[<i>sic</i>]` sont conservées.
  Les nombres discutables, l’accord `étaient tissus` et les incohérences de
  calcul visibles dans l’imprimé ne constituent pas à eux seuls une coquille
  orthographique certaine : aucun nouveau *sic* n’est ajouté dans cette
  sous-passe.

### État du dry-run

- Manifeste strict : 59 segments, 1413-1471 ; contexte de raccord lu :
  1408-1412 et 1472-1473.
- Liens proposés : 209 — type 1 : 1 ; type 3 : 207 ; type 4 : 1 ; aucune
  référence sans cible et aucun segment sans lien.
- Une correction OCR sûre est préparée ; aucun écrit en base.
- L’avancement reste **1 294 / 3 262 = 39,67 %**. Après écriture ultérieure
  de cette seule sous-passe : **1 353 / 3 262 = 41,48 %** (gain de 59
  segments, soit 1,81 point).

## Clôture du Livre deuxième : Exode

- Les rubriques de « préparation » ci-dessus décrivent les dry-runs ; tous
  les lots correspondants ont ensuite été écrits et audités.
- La Question CLXXVII a été divisée en trois sous-passes de 59 segments, avec
  lecture des raccords. Les quatre segments sans lien (1296, 1396, 1397,
  1406) sont des transitions méthodologiques ; le marqueur mécanique du
  segment 1406 est le numéro de paragraphe « 15. », non une citation.
- La correction OCR certaine `ce n est` → `ce n’est` du segment 1421 a été
  appliquée sous précondition exacte dans la base, puis synchronisée dans les
  fichiers candidats. Elle ne reçoit pas de *sic*, car elle n’appartient pas à
  l’édition imprimée.

### État final de l’Exode

- Segments relus : **901 / 901**, soit **100 % du Livre deuxième**.
- Avancement du corpus : **1 471 / 3 262**, soit **45,10 %**.
- Liens de l’Exode : **2 665** — type 1 : 796 ; type 2 : 18 ; type 3 :
  1 785 ; type 4 : 66.
- Corpus cumulé : **4 489 liens** — type 1 : 1 389 ; type 2 : 67 ; type 3 :
  2 954 ; type 4 : 79.
- Audit intégral paginé : aucun doublon, aucune cible invalide, aucun motif
  vide et aucun arbitrage inattendu ; 24 références sans cible sont
  explicitement `à constituer`.

## Écriture et audit du Lévitique I-XXX

- Les trois lots I-X, XI-XX et XXI-XXX ont été écrits après contrôle de leur
  empreinte, puis audités séparément. Ils couvrent sans lacune les segments
  1472-1659, soit 188 segments.
- Le cumul de ces lots est de 492 liens : type 1 : 162 ; type 2 : 1 ; type 3 :
  322 ; type 4 : 7. Six références internes ou non bibliques restent sans
  cible et portent explicitement `à constituer`.
- Les segments 1593, 1633 et 1655 sont légitimement sans lien. La détection
  mécanique d’un marqueur au segment 1633 a été vérifiée manuellement : la
  phrase est une proposition de logique pure, sans référence scripturaire.
- Le fac-similé des pages imprimées 479-480 a confirmé quatre erreurs d’OCR :
  `Navë [<i>sic</i>]` → `Navé`, `étaient ils` → `étaient-ils`, `parait` →
  `paraît` et `cout [<i>sic</i>]` → `court`. Les deux faux *sic* ont donc été
  retirés, conformément à la règle qui les réserve aux coquilles imprimées.

### État après le Lévitique XXX

- Avancement du corpus : **1 659 / 3 262 = 50,86 %**.
- Audit : aucun doublon, aucune cible invalide, aucun motif vide et aucun
  arbitrage inattendu.

## Écriture et audit du Lévitique XLI-L

- Le lot 1739-1779 a été écrit : 41 segments et 95 liens — type 1 : 30 ;
  type 3 : 62 ; type 4 : 3.
- Les trois renvois aux commentateurs, traducteurs et interprètes sont
  correctement conservés sans cible avec la fiabilité `à constituer`.
- Les marques *sic* attachées à une anomalie numérique et à un accord ont été
  signalées pour contrôle typographique séparé ; elles n’ont pas été mutées
  pendant l’attribution des liens.

### État après cette passe

- Avancement du corpus : **1 700 / 3 262 = 52,12 %**.
- Audit : aucun segment oublié, aucun doublon, aucune cible invalide, aucun
  motif vide et aucun arbitrage inattendu.

## Préparation de Lévitique XLI à L — contrôle sans écriture

### Lecture suivie des diagnostics de lèpre

- Les Questions XLI à XLVII suivent pas à pas Lévitique 13,2-17. Les versets
  13,5 et 13,6 doivent rester distincts : le premier contient le premier
  examen et le second isolement ; le second contient le second examen, la
  déclaration de pureté et le lavage des vêtements.
- La note `Ib. VI` du segment 1755 est donc résolue par le contenu en
  `LEV.13.5`, tandis que les propositions réellement tirées de 13,6 gardent
  leur cible propre. Les titres de question ne sont pas propagés aux étapes
  voisines sans lecture du détail clinique commenté.
- La note ancienne `I Rois, XX, 19` du segment 1778 vise `1SA.20.19` dans le
  canon local. La formule latine et le témoin local y portent bien le « jour
  de travail » mobilisé dans l’explication de `LEV.13.48`.

### Références sans cible et règle *sic*

- Trois attributions lexicales sont conservées sans cible, type 4,
  `à constituer` : plusieurs commentateurs au segment 1743, les traducteurs
  latins opposés à la hardiesse de la Septante au segment 1746, et plusieurs
  interprètes au segment 1777.
- Deux marques existantes demandent un arbitrage typographique séparé : le
  titre `Lévitique 13, 9-7 [<i>sic</i>]` signale une anomalie numérique, alors
  que la règle nouvelle réserve *sic* aux coquilles orthographiques ;
  `un chevelure [<i>sic</i>]` au segment 1764 est un accord fautif plutôt qu’une
  coquille orthographique certaine. Aucune mutation textuelle n’est incluse
  dans ce dry-run de liens.

### État du dry-run

- Lot : 41 segments continus, 1739-1779, `Livre troisième`, Questions XLI-L ;
  voisins contrôlés : 1738 Question XL et 1780 Question LI.
- Liens proposés : 95 — type 1 : 30 ; type 3 : 62 ; type 4 : 3, dont trois
  références sans cible. Aucun segment n’est sans lien.
- Aucun écrit en base : l’avancement reste **1 588 / 3 262 = 48,68 %**.
- Après écriture ultérieure de ce lot : **1 629 / 3 262 = 49,94 %**
  (gain de 41 segments, soit 1,26 point).

## Préparation de Lévitique XXI à XXX — contrôle sans écriture

### Résolutions sémantiques

- Les bornes exactes sont 1589-1659 : le segment 1588 clôt la Question XX et
  le segment 1660 ouvre la Question XXXI. Les dix questions XXI-XXX forment
  donc un lot continu de 71 segments.
- La note Lévitique 4,9 de la Question XXII ne désigne pas le passage
  principal discuté : la poitrine, la graisse et la cuisse sacerdotale sont
  en Lévitique 7,29-34, à comparer avec la loi générale de Lévitique 3,3-4.
- Au segment 1626, le bouc du chef est en Lévitique 4,23 dans le canon local,
  malgré la note imprimée 4,25. Au segment 1630, la formule « celui qui offre
  son sacrifice pacifique » se résout en Lévitique 7,29, malgré la note 6,19.
- La note Exode 19,21 du segment 1604 vise sémantiquement Exode 19,22, où les
  prêtres sont effectivement nommés avant leur consécration. La note Nombres
  13,17 vise Nombres 13,16, où Osée reçoit le nom de Josué.
- Les renvois internes du segment 1631 à la Question XXII et du segment 1652
  au Livre II, Question CXIII, sont enregistrés sans cible, type 4,
  `à constituer`, conformément au §25.7.

### Preuves fac-similé et corrections préparées

- Le fichier `scripts/heptateuque/img/p487.jpg`, page imprimée 479, porte
  clairement « fils de Navé » et « étaient-ils ». Les formes de base
  `Navë [<i>sic</i>]` et `étaient ils` sont donc des altérations OCR : elles
  doivent devenir `Navé` et `étaient-ils`, sans *sic*.
- La même page imprimée 479 porte « Ce qui paraît » : le segment 1610 doit
  recevoir l’accent circonflexe manquant.
- Le fichier `scripts/heptateuque/img/p488.jpg`, page imprimée 480, porte
  clairement « Il eût été plus court ». La forme de base
  `cout [<i>sic</i>]` est un faux positif introduit par l’OCR ; elle doit être
  remplacée par `court`, sans *sic*.
- Les quatre corrections sont verrouillées par préconditions exactes dans le
  script. En mode écriture seulement, la base puis `segments-candidate.json`
  et `source-map.json` sont synchronisés, après validation préalable des
  quatre occurrences candidates.

### État du dry-run

- Manifeste strict : 71 segments, 1589-1659 ; voisins contrôlés : 1584-1588
  et 1660-1663.
- Liens proposés : 143 — type 1 : 46 ; type 3 : 94 ; type 4 : 3, dont deux
  références internes sans cible. Trois segments de conclusion ou de logique
  pure sont explicitement sans lien : 1593, 1633 et 1655.
- Aucun écrit en base : l’avancement reste **1 471 / 3 262 = 45,10 %**.
  Après écriture ultérieure de ce lot : **1 542 / 3 262 = 47,27 %** (gain de
  71 segments, soit 2,18 points).

## Préparation de Lévitique LI à LX — contrôle sans écriture

### Bornes et anciennes numérotations

- Les Questions LI à LX occupent exactement les segments 1780-1844. Le
  raccord amont 1775-1779 clôt les Questions XLIX-L ; le segment 1845 ouvre
  la Question LXI.
- La note `I Rois, XX, 19` de la Question L, lue en raccord, avait déjà été
  résolue dans le canon local en `1SA.20.19`. Dans le lot présent, les notes
  `III Rois, XII, 25-30` et `III Rois, XVIII, 36-39` visent respectivement
  `1KI.12.25-30` et `1KI.18.36-39`.
- La citation imprimée `Jean VI, 54` du segment 1831 correspond
  sémantiquement à `JHN.6.53`, seul verset local portant la condition « si
  vous ne mangez… et si vous ne buvez… vous n’aurez point la vie ». Le verset
  local 6,54 énonce au contraire la vie éternelle de celui qui mange et boit.
- `Psa. CII, 3` est confirmé par `PSA.102.3`, et `Sir. XXXIV, 27` par
  `SIR.34.27`. La résolution repose sur les formulations des témoins, sans
  conversion mécanique des numéros.

### Correction d’appareil prouvée au fac-similé

- Le fichier `scripts/heptateuque/img/p501.jpg`, page imprimée 493, porte en
  bas de page `Luc. XVI, 22` pour la note 1 associée aux anges portant Lazare
  dans le sein d’Abraham. La base et le candidat portent à tort
  `[[466]] Luc. XVI, 23`.
- Le script prépare donc la correction exacte `23` → `22` dans le champ
  `notes` du segment 1817, puis la synchronisation de
  `segments-candidate.json` en mode écriture seulement. Le texte du segment
  reçoit bien `LUK.16.22` pour le sein d’Abraham et conserve séparément
  `LUK.16.23` pour les tourments du riche.
- Aucune coquille orthographique certaine nouvelle n’est attestée dans les
  pages 491-495 (`img/p499.jpg` à `img/p503.jpg`). Les irrégularités de
  syntaxe, de ponctuation ou les leçons anciennes restent sans *sic*.

### Références et état du dry-run

- L’opinion de « quelques interprètes » sur les deux boucs au segment 1800
  est enregistrée sans cible, type 4, `à constituer`, conformément au §25.7.
- Manifeste strict : 65 segments, 1780-1844 ; 107 liens proposés — type 1 :
  47 ; type 2 : 1 ; type 3 : 58 ; type 4 : 1. Aucun segment n’est sans lien.
- Aucun écrit en base. L’état réel mesuré avant la passe est
  **1 700 / 3 262 = 52,12 %**. Après écriture ultérieure de ce lot :
  **1 765 / 3 262 = 54,11 %** (gain de 65 segments, soit 1,99 point).

## Préparation de Lévitique XXXI à XL — contrôle sans écriture

### Résolutions sémantiques et ancienne numérotation

- Les bornes exactes sont 1660-1738 : 79 segments continus, de la Question
  XXXI à la Question XL. Le segment 1659 clôt la Question XXX et le segment
  1739 ouvre la Question XLI ; les deux voisins ont été contrôlés.
- La note ancienne `Lévitique 6,26` du segment 1718 vise `LEV.6.19` dans le
  canon local : c’est le verset qui situe dans le parvis, comme « lieu saint »,
  la consommation sacerdotale de la victime pour le péché.
- Les références des Psaumes sont conservées selon la numérotation vulgate
  réellement attestée par les témoins locaux : `PSA.64.6` (« Dieu de notre
  salut »), `PSA.115.13` (« coupe du salut ») et `PSA.50.7` (« conçu dans le
  péché »). Aucun décalage mécanique vers 65, 116 ou 51 n’est appliqué.
- La note `Sag. VI, 7` du segment 1665 est résolue par le contenu en
  `WIS.6.6`, où les petits reçoivent le pardon et les puissants sont
  puissamment châtiés. La note `Mat. III, 13, 11` du segment 1736 ne suffit
  pas seule : le baptême de Jésus est `MAT.3.13`, tandis que le baptême de
  pénitence pour la rémission des péchés est `MRK.1.4`.
- L’argument de la Question XXXVI exige de distinguer la liste des victimes
  (`LEV.9.3-4`), leur immolation (`LEV.9.15-18`) et les lois antérieures du
  taureau, du bouc et du bélier (`LEV.4.3`, `LEV.4.14`, `LEV.4.23`,
  `LEV.5.15`). Les notes imprimées ne sont donc jamais propagées sans lecture.

### Références sans cible et règle *sic*

- Quatre références non bibliques sont conservées sans cible, type 4,
  `à constituer` : le choix de « nos interprètes » au segment 1714, deux
  groupes d’exemplaires portant des leçons concurrentes aux segments 1726 et
  1729, et plusieurs traducteurs au segment 1737.
- Les discussions purement lexicales du grec aux segments 1684-1689 ne sont
  pas transformées automatiquement en références non bibliques : aucune
  autorité ni aucun témoin distinct n’y est attribué.
- Les marques `[<i>sic</i>]` existantes du lot signalent des coquilles
  orthographiques dans le texte reçu (`ojet`, `fontions`, `santuaire`,
  `holoscaute`, `enfans`, `tourterlles`, etc.). Les anomalies de numérotation,
  de référence, de grammaire ou de ponctuation ne reçoivent pas de *sic* dans
  cette passe de liens.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-levitique-q31-q40.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, partition exhaustive,
  contrôle des 77 cibles, doublons, transaction et postcontrôles préparés.
- Manifeste : 79 segments ; 234 liens proposés — type 1 : 58 ; type 3 : 172 ;
  type 4 : 4, tous les quatre sans cible `à constituer`. Aucun segment n’est
  sans lien.
- État live au dernier contrôle, après progression concurrente des lots
  voisins : **1 700 / 3 262 = 52,12 %**. Aucun écrit n’a été effectué sur ce
  lot. Après son écriture ultérieure : **1 779 / 3 262 = 54,54 %** (gain de
  79 segments, soit 2,42 points).

## Préparation de Lévitique LXXI à LXXX — contrôle sans écriture

### Lecture sémantique et références fautives

- Le lot couvre exactement 27 segments, 1888-1914. Les Questions LXXI à LXXX
  sont complètes ; les segments 1886-1887 appartiennent à la Question LXX et
  les segments 1915-1916 à la Question LXXXI.
- La note `Lev. XX, 25` du segment 1910 est fautive : la citation « tu le
  sanctifieras ; il présentera les oblations […] je suis saint, moi qui les
  sanctifie » correspond à `LEV.21.8`. Le contexte du grand-prêtre est ensuite
  distingué par `LEV.21.10` et par son accès propre au sanctuaire en
  `LEV.16.2`.
- La note `Gen. IV, 1, 17, 25` du segment 1900 a été confrontée à ses trois
  cibles : `GEN.4.1`, `GEN.4.17` et `GEN.4.25` emploient bien « connaître sa
  femme » pour l’union charnelle.
- Pour les degrés prohibés, `LEV.18.9` porte la sœur de père ou de mère et
  `LEV.18.14` la femme de l’oncle paternel. La femme de l’oncle maternel est
  précisément présentée par Augustin comme une omission de la liste : aucun
  verset artificiel ne lui est attribué.
- Aucun renvoi à un auteur, traducteur, commentateur ou témoin distinct ne
  demande une cible non biblique. La mention générale de la métaphore « par
  les Grecs » au segment 1897 reste une explication lexicale, non une
  attribution documentaire à constituer.

### Preuve fac-similé et règle *sic*

- Le champ `page` du lot correspond directement aux fichiers d’image
  `scripts/heptateuque/img/p505.jpg` à `p507.jpg` ; leur page imprimée interne
  est respectivement 497 à 499. Il ne faut pas appliquer ici le décalage de
  huit fichiers utilisé dans un contrôle antérieur.
- `scripts/heptateuque/img/p506.jpg` (SHA-256
  `e2338d51027dec719acbeee2f9a903b6211e4f3711cbfc62fc252565e33fb496`)
  imprime clairement « comment un animal peut-être coupable ». Le segment
  1896 doit donc perdre le faux `[<i>sic</i>]` ajouté après `peut-être`, sans
  modifier le mot.
- `scripts/heptateuque/img/p507.jpg` (SHA-256
  `baa45f08decfe7d5633fc5fdf18ebdc4e493712994dbc42c36edf90c183cd26a`)
  imprime réellement « sur la tête du quel ». Cette coquille orthographique
  de l’édition conserve correctement son `[<i>sic</i>]` au segment 1913.
- La correction du segment 1896 est préparée avec précondition exacte et
  synchronisation contrôlée de `segments-candidate.json` et `source-map.json`.
  Le dry-run ne modifie aucun de ces fichiers.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-levitique-q71-q80.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hashes des preuves,
  partition exhaustive, contrôle des cibles et doublons, sauvegarde ciblée,
  transaction et postcontrôles préparés.
- Manifeste : 27 segments ; 61 liens proposés — type 1 : 20 ; type 3 : 41 ;
  aucune référence sans cible et aucun segment sans lien. Les 24 cibles
  distinctes ont un témoin local confronté.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **1 887 / 3 262 = 57,85 %**. Après écriture ultérieure du lot :
  **1 914 / 3 262 = 58,68 %** (gain de 27 segments, soit 0,83 point).

## Préparation de Nombres I à X — contrôle sans écriture

### Transition, références anciennes et lecture sémantique

- Le Livre quatrième commence exactement au segment 1987. Les segments
  1984-1986 terminent le Livre troisième, Question XCIV ; les Questions I à X
  des Nombres couvrent 48 segments continus jusqu’au segment 2034, et la
  Question XI commence au segment 2035.
- La note `Lév. VI, 18` du segment 2007 suit l’ancienne numérotation. Le texte
  réellement cité, « quiconque y touchera sera saint », est `LEV.6.11` dans
  le canon local, et non `LEV.6.18`, qui ouvre la loi du sacrifice pour le
  péché.
- La note `Ex. XXII, 1, 4` du segment 2028 ne peut pas être reprise
  mécaniquement. Le vol d’un bœuf ou d’un agneau vendu ou égorgé, puni par la
  restitution quintuple ou quadruple, est `EXO.21.37` ; la bête retrouvée
  vivante et restituée au double est `EXO.22.3`.
- La mention de l’âge de vingt ans qui ne penche « ni à droite ni à gauche »
  au segment 1998 est conservée comme allusion de type 2 à `DEU.5.32`, tandis
  que le commentaire du nombre vingt reste rattaché à la formule de
  recensement de `NUM.1.20`.
- La Question VI ne s’arrête pas au titre imprimé `Nombres 3,12-31` : le
  rachat des 273 premiers-nés surnuméraires à cinq sicles est porté par
  `NUM.3.46-48`, après le recensement des Lévites et des premiers-nés en
  `NUM.3.39-45`. Les cibles ont été établies d’après le contenu suivi.

### Références non bibliques, fac-similé et règle *sic*

- Cinq attributions collectives sont conservées sans cible, type 4,
  `à constituer` : les interprètes latins traduisant *kiliarques* par
  *tribuns* au segment 1987 ; les deux groupes de traducteurs de la garde ou
  des veilles aux segments 2003 et 2004 ; les interprètes latins et leur
  reformulation de la couverture de l’autel aux segments 2016 et 2017.
- Les fichiers `img/p512.jpg` à `p515.jpg` couvrent directement les champs
  page 512-515, avec les pages imprimées internes 504-507. Leur lecture ne
  révèle aucune coquille imprimée nouvelle exigeant `[<i>sic</i>]`.
- `img/p513.jpg` (SHA-256
  `585ef2835375244449d5ed16d346c12324a286ffebceb5bff9dea11195a68668`)
  confirme que l’italique commence au mot « leurs » dans « leurs parentés ».
  L’espace parasite interne du segment 1991 est donc corrigible de
  `<i> leurs parentés` en `<i>leurs parentés`, sans *sic*.
- Cette correction est préparée avec précondition exacte et synchronisation
  contrôlée de `segments-candidate.json` et `source-map.json`. Le dry-run ne
  modifie ni la base ni ces fichiers.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q1-q10.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, preuve fac-similé hashée,
  partition exhaustive, validation des cibles et doublons, sauvegarde ciblée,
  transaction et postcontrôles préparés.
- Manifeste : 48 segments ; 121 liens proposés — type 1 : 24 ; type 2 : 1 ;
  type 3 : 91 ; type 4 : 5, tous les cinq sans cible `à constituer`. Aucun
  segment n’est sans lien ; 30 cibles distinctes ont été confrontées.
- Aucun écrit en base ni dans les candidats. Avancement live après fermeture
  concurrente du Lévitique : **1 986 / 3 262 = 60,88 %**. Après écriture
  ultérieure du lot : **2 034 / 3 262 = 62,35 %** (gain de 48 segments, soit
  1,47 point).

## Préparation de Lévitique LXI à LXX — contrôle sans écriture

### Bornes, références anciennes et arbitrages sémantiques

- Les Questions LXI à LXX occupent exactement les segments 1845-1887, soit
  43 segments continus. Le segment 1844 clôt la Question LX et le segment
  1888 ouvre la Question LXXI ; les deux raccords sont contrôlés.
- La note `Gen. XXX, 22, 28` du segment 1853 ne peut pas être reprise
  mécaniquement : le récit du double mariage de Jacob se trouve en Genèse 29.
  Les deux renvois imprimés sont donc résolus en `GEN.29.22` et `GEN.29.28` ;
  `GEN.29.25` et `GEN.29.30` rendent en type 3 la supercherie et la préférence
  de Jacob effectivement commentées.
- La note du segment 1858, transcrite à tort comme `Lev. XVIII, 6 ; 22, 10`,
  désigne Ézéchiel 18,6 et 22,10 : les deux témoins parlent précisément de
  l’homme qui s’abstient, ou ne s’abstient pas, auprès d’une femme pendant
  son impureté. Les cibles sont `EZK.18.6` et `EZK.22.10`.
- La note mal ponctuée du segment 1865 (`Lev. XI, 44, 2 ; 19 ; 1Pi. 1, 16`)
  est résolue par le contenu en `LEV.11.44`, `LEV.19.2` et `1PE.1.16`.
- La note `Exo. XX, 4, 14-15, 13` répétée au segment 1887 ne correspond ni à
  la colère ni à la vengeance discutées dans ce segment : elle est traitée
  comme parasite et ne produit aucun faux lien. La variante portée par
  « plusieurs exemplaires » est en revanche conservée sans cible, type 4,
  `à constituer`, conformément au §25.7.
- La plage explicite `Lev. XV, 19-27` du segment 1856 est développée sans
  perte en neuf cibles. La coutume alléguée des Perses au segment 1848 est
  également conservée sans cible, type 4, `à constituer`.

### Règle *sic* et preuve fac-similé

- Le fichier `scripts/heptateuque/img/p505.jpg`, page imprimée 497, porte
  clairement « d’après la définition que nous avons donné, le vol ».
  La leçon du segment 1876 est donc une coquille imprimée attestée et la
  marque `[<i>sic</i>]` est légitime ; elle est conservée.
- Aucune erreur numérique ou ancienne numérotation ci-dessus ne reçoit de
  *sic*. Elles sont résolues par confrontation sémantique avec les trois
  témoins locaux, conformément à la nouvelle règle stricte.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-levitique-q61-q70.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, voisins, partition
  exhaustive, 45 cibles contrôlées dans les trois témoins, doublons,
  transaction et postcontrôles préparés.
- Manifeste : 43 segments ; 114 liens proposés — type 1 : 52 ; type 3 : 60 ;
  type 4 : 2, tous deux sans cible `à constituer`. Aucun segment n’est sans
  lien.
- État live mesuré avant la passe : **1 779 / 3 262 = 54,54 %**. Aucun écrit
  n’a été effectué sur ce lot. Après son écriture ultérieure :
  **1 822 / 3 262 = 55,86 %** (gain de 43 segments, soit 1,32 point).

## Préparation de Lévitique LXXXI à XC — contrôle sans écriture

### Bornes, ancienne numérotation et arbitrages sémantiques

- Les Questions LXXXI à XC couvrent exactement 57 segments continus,
  1915-1971. Les segments 1913-1914 ferment les Questions LXXIX-LXXX et les
  segments 1972-1975 ouvrent la Question XCI : les deux raccords ont été lus.
- Au segment 1921, le fac-similé donne `Lév. XVII, 11`, et non
  `Lev. XVI, 11`. La correction éditoriale préparée conduit à `LEV.17.11`,
  dont les trois témoins portent bien la vie de la chair dans le sang.
- La note `Exo. XXIX, 24` du segment 1932 ne contient pas la formule discutée
  sur Dieu qui sanctifie le prêtre. Le contenu est donc résolu par
  `LEV.21.8` (« tu le tiendras pour saint ») et `LEV.21.15` (« je suis le
  Seigneur qui le sanctifie »), sans propager l’ancienne référence fautive.
- La citation sur le blasphème du segment 1950 est distribuée sur
  `LEV.24.15` et `LEV.24.16`; l’homicide du segment 1953 relève de
  `LEV.24.17`, distinct de `MAT.10.28`, qui éclaire la différence entre mort
  du corps et mort de l’âme.
- Le don de l’Esprit et le baptême de la maison de Corneille au segment 1942
  couvrent les versets effectifs `ACT.10.44-48`, tous vérifiés dans les
  témoins locaux. Une plage n’est jamais réduite à une cible approximative.

### Références sans cible et règle *sic*

- Quatre références non bibliques sont conservées sans cible, type 4,
  `à constituer`, avec arbitrage requis : le renvoi interne à la Question
  LVII (segment 1921), deux renvois aux *Rétractations* (segments 1926 et
  1939) et les « autres exemplaires » portant des variantes (segment 1968).
- `scripts/heptateuque/img/p508.jpg` (SHA-256
  `981973582e27e0846f88cd74c1e778530540bc3b2851d3be70bbb45488b5d604`),
  page imprimée 500, prouve la correction de note `XVI, 11` → `XVII, 11`.
- `scripts/heptateuque/img/p511.jpg` (SHA-256
  `12783b04386a65f9093b494f6f54fdeb15053def3ea1cf49561948147e1f5083`),
  page imprimée 503, imprime clairement « Mais il y a de l’obscurité ».
  Le segment 1970 contient une transposition OCR, `Mais il a y`, et un faux
  `[<i>sic</i>]` : la correction exacte préparée est « Mais il y a de
  l’obscurité », sans *sic*.
- Les deux corrections ont des préconditions exactes. Le texte du segment
  1970 sera synchronisé avec `segments-candidate.json` et `source-map.json`;
  la note du segment 1921 avec `segments-candidate.json`. Le dry-run ne
  modifie aucun de ces fichiers.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-levitique-q81-q90.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hashes des deux preuves,
  partition exhaustive, contrôle des cibles et doublons, sauvegarde ciblée,
  transaction et postcontrôles préparés.
- Manifeste : 57 segments ; 112 liens proposés — type 1 : 53 ; type 3 : 55 ;
  type 4 : 4, tous sans cible `à constituer`. Aucun segment n’est sans lien ;
  les 40 cibles bibliques distinctes possèdent un témoin local.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **1 914 / 3 262 = 58,68 %**. Après écriture ultérieure du lot :
  **1 971 / 3 262 = 60,42 %** (gain de 57 segments, soit 1,75 point).

## Préparation de la clôture du Lévitique XCI à XCIV — contrôle sans écriture

### Bornes et résolutions sémantiques

- Les quatre dernières questions du Livre troisième occupent exactement les
  segments 1972-1986, soit 15 segments continus. Le segment 1971 clôt la
  Question XC ; le segment 1987 ouvre le Livre quatrième et la Question I sur
  les Nombres. Le raccord entre les deux livres est donc explicitement gardé.
- La Question XCI poursuit la comparaison des variantes de Lévitique 25,23-24.
  Les « certains exemplaires » du segment 1972 sont conservés sans cible,
  type 4, `à constituer`. Les deux versets restent distingués : 25,23 porte la
  propriété divine et le statut d’étrangers ; 25,24 porte le droit de rachat.
- Au segment 1981, la note imprimée `Mat. XXV, 38` vise par son contenu
  `MAT.26.38`, seul verset local portant « Mon âme est triste jusqu’à la
  mort ». L’erreur numérique imprimée ne reçoit pas de *sic*.
- Au segment 1984, la note `Lev. XXVI, 33-34` ne correspond pas à la citation
  des survivants auxquels Dieu met l’épouvante dans le cœur. Cette citation
  est `LEV.26.36`; `LEV.26.33-34` reste attribué aux segments où le glaive, la
  désolation, les sabbats de la terre et le pays des ennemis sont réellement
  cités ou commentés.
- La note ancienne `Gen. XXXII, 12` du segment 1985 ne doit pas être reprise
  mécaniquement : dans les témoins locaux, 32,12 concerne la crainte d’Ésaü,
  tandis que la promesse d’une postérité comme le sable de la mer se trouve
  en `GEN.32.13`. Cette cible est retenue avec `GEN.22.17`.

### Fac-similé, corrections et règle *sic*

- `scripts/heptateuque/img/p511.jpg`, page imprimée 503, confirme la leçon
  imprimée « par ce qu’il » en deux mots au segment 1976. Il s’agit d’une
  coquille orthographique imprimée ; `[<i>sic</i>]` est conservé.
- `scripts/heptateuque/img/p512.jpg`, page imprimée 504, confirme « pas sage »
  en deux mots au segment 1983. Le `[<i>sic</i>]` orthographique est également
  conservé.
- La même page prouve trois erreurs d’OCR sans *sic* : absence du deux-points
  après « Apollinaristes », perte du point final dans la citation « Mon âme
  est triste jusqu’à la mort » et virgule parasite dans « les, enfants
  d’Abraham ». Le script prépare les trois corrections sous préconditions
  exactes et leur synchronisation dans `segments-candidate.json` et
  `source-map.json`, uniquement en mode écriture.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-levitique-q91-q94.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hashes des deux preuves,
  voisins, partition exhaustive, contrôle des 16 cibles dans les trois
  témoins, doublons, sauvegarde ciblée, transaction et postcontrôles préparés.
- Manifeste : 15 segments ; 42 liens proposés — type 1 : 19 ; type 2 : 1 ;
  type 3 : 21 ; type 4 : 1 sans cible `à constituer`. Aucun segment n’est sans
  lien.
- Aucun écrit en base ni dans les candidats. Avancement live après progression
  concurrente des lots précédents : **1 971 / 3 262 = 60,42 %**. Après
  écriture ultérieure de cette clôture : **1 986 / 3 262 = 60,88 %** (gain de
  15 segments, soit 0,46 point). Le Lévitique serait alors intégralement relu.

## Préparation de Nombres XXI à XXX — contrôle sans écriture

### Bornes, numérotation canonique et résolution sémantique

- Les Questions XXI à XXX occupent exactement les segments 2108-2163, soit
  56 segments continus. Le segment 2107 clôt la Question XX et le segment
  2164 ouvre la Question XXXI ; les deux raccords ont été contrôlés.
- La Question XXI commence par deux versets effectifs : l’ordre de monter et
  d’explorer est `NUM.13.17`, tandis que l’examen du peuple fort ou faible,
  peu ou très nombreux, est `NUM.13.18`. La mauvaise nouvelle « rapportée »
  par les espions en Question XXII correspond sémantiquement à `NUM.13.32`,
  malgré la référence ancienne 13,33.
- La note `Ps. L, 19` du segment 2129 est alignée par le contenu sur
  `PSA.50.19`, seul créneau portant le cœur contrit et humilié que Dieu ne
  méprise pas. Le numéro moderne 51,19 n’est pas propagé mécaniquement.
- La note `Ex. XIX, 20` du segment 2141 est imprimée telle quelle, mais ne
  décrit nullement le passage de la mer. Le contenu vise `EXO.14.28-29` : les
  Égyptiens sont couverts par les eaux, tandis qu’Israël marche à sec.
- La référence imprimée `Nombres 16,36-40` de la Question XXX correspond dans
  l’ossature aux cinq créneaux `NUM.17.1-5`. De même, la verge fleurie notée
  `Nomb. XVII, 8` au segment 2161 est `NUM.17.23`, et son dépôt devant le
  témoignage est `NUM.17.25`.
- La note `Ex. XL, 15` du segment 2162 vise par son contenu `EXO.40.17`, date
  de l’érection du tabernacle au premier jour du premier mois de la deuxième
  année. Cette date est confrontée à `NUM.1.1`, premier jour du mois suivant.

### Cas non résolu, références sans cible et règle *sic*

- Au segment 2161, Augustin attribue explicitement à l’Exode, chapitre XXVI,
  un ordre de déposer dans l’arche la verge d’Aaron avec la manne. Aucun
  témoin canonique de l’Exode ne porte cette réunion : `EXO.16.34` ne parle
  que de la manne, `NUM.17.25` de la verge devant le témoignage, et
  `HEB.9.4` réunit seul la manne et la verge dans l’arche. La citation
  attribuée à l’Exode est donc déclarée sans cible, type 1, `à constituer`,
  avec arbitrage requis ; les quatre passages sémantiquement distincts ne
  sont pas confondus.
- Deux attributions de variantes sont consignées selon le §25.7, sans cible,
  type 4, `à constituer` : les traducteurs lisant `χάσματι` au lieu de
  `φάσματι` au segment 2145, et ceux qui traduisent le mot par « fantôme » au
  segment 2147. Le motif respecte la forme
  `RÉFÉRENCE NON BIBLIQUE (genre) : ...`.
- Les cinq fac-similés `p520.jpg` à `p524.jpg` ont été lus et verrouillés par
  leur SHA-256. Aucun `[<i>sic</i>]` ne figure dans le lot et aucune coquille
  orthographique imprimée certaine n’a été découverte. Les anomalies de
  références et de numérotation ci-dessus ne reçoivent donc aucun *sic*.
- Les formes singulières mais imprimées et intentionnelles, notamment
  « sème là ce feu étranger », sont conservées sans correction conjecturale :
  Augustin explique lui-même `sème` par `disperse` au segment 2156.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q21-q30.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hashes des cinq pages,
  voisins et structure candidats contrôlés, partition exhaustive, contrôle
  des cibles et doublons, sauvegarde ciblée, transaction et postcontrôles
  préparés.
- Manifeste : 56 segments ; 180 liens proposés — type 1 : 30 ; type 2 : 2 ;
  type 3 : 117 ; type 4 : 31. Parmi eux, deux références non bibliques et une
  citation biblique non résolue sont sans cible `à constituer`. Aucun segment
  n’est sans lien ; les 60 cibles distinctes possèdent un témoin local.
- Aucune correction et aucun écrit en base ou dans les candidats. Avancement
  live : **2 034 / 3 262 = 62,35 %**. Après écriture ultérieure de ce lot :
  **2 090 / 3 262 = 64,07 %** (gain de 56 segments, soit 1,72 point).

## Préparation de Nombres XLI à L — contrôle sans écriture

### Bornes, sources externes et anciennes numérotations

- Les Questions XLI à L couvrent exactement 55 segments continus, 2240-2294.
  Le segment 2239 clôt la Question XL et le segment 2295 ouvre la Question LI ;
  les deux raccords ont été contrôlés.
- Le fragment du « livre des Guerres du Seigneur » est distribué sur les
  créneaux effectifs `NUM.21.14-15`, après la frontière de l’Arnon en
  `NUM.21.13`. Son livre d’origine demeure extérieur au canon : le lien
  biblique vise les versets des Nombres qui le citent, tandis que la source
  externe est consignée séparément sans cible.
- La note ancienne de 2 Pierre au segment 2278 est imprimée `II, 16`, mais la
  phrase « ils ont suivi la voie de Balaam [...] qui aima la récompense de
  l’iniquité » correspond sans ambiguïté à `2PE.2.15` dans les témoins. La
  transcription de la note et la cible sémantique restent donc distinctes.
- La note `Apoc. XI, 9, 10` du segment 2283 est fidèle au fac-similé, mais le
  diable et Satan sont nommés en `REV.12.9`, et l’accusateur des frères qui
  accuse jour et nuit en `REV.12.10`. Ces deux cibles sémantiques remplacent
  toute propagation mécanique de l’ancien numéro.
- La plage de la Question L est décomposée sans perte : le premier détour de
  l’ânesse est `NUM.22.23`, les vignes et leurs murs `NUM.22.24-25`, le lieu
  resserré `NUM.22.26`, l’affaissement sous Balaam `NUM.22.27`, puis la parole
  de l’ânesse et la réponse de Balaam `NUM.22.28-29`.

### §25.7, fac-similé et règle *sic*

- Dix références externes sont déclarées sans cible, type 4, `à constituer`,
  selon le format exact `RÉFÉRENCE NON BIBLIQUE (genre) : ...` : cinq mentions
  du livre des Guerres du Seigneur ou d’autres écrits hors canon et auteurs
  profanes en Question XLII, deux groupes de poètes anonymes en Question XLV,
  et les deux segments qui citent et expliquent Térence en Question XLIX.
  Le segment 2246 porte deux attributions distinctes : le prophète crétois et
  les poètes ou philosophes grecs.
- `p531.jpg` (SHA-256
  `2f06c23c8465d814424ed1c6a8c3f846e29aa6fb9919582969b8fce551d354f6`)
  prouve que la note 599 porte bien `II Pierre, II, 16`, et non `II, 15`.
  Une correction exacte de la note du segment 2278 est préparée avec
  précondition, transaction, postcontrôle et synchronisation de
  `segments-candidate.json`; le lien demeure correctement `2PE.2.15`.
- Les quatre fac-similés `p529.jpg` à `p532.jpg` ont été lus et verrouillés par
  leur empreinte. Aucun `[<i>sic</i>]` ne figure dans ce lot et aucune coquille
  orthographique imprimée certaine ne demande une nouvelle marque. Les
  divergences de numérotation ci-dessus ne reçoivent pas de *sic*.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q41-q50.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hashes des quatre pages,
  voisins et candidats contrôlés, partition exhaustive, contrôle des cibles
  et doublons, sauvegarde ciblée, transaction et postcontrôles préparés.
- Manifeste : 55 segments ; 163 liens proposés — type 1 : 37 ; type 2 : 3 ;
  type 3 : 108 ; type 4 : 15, dont dix références externes sans cible
  `à constituer`. Aucun segment n’est sans lien ; les 53 cibles distinctes
  possèdent un témoin local.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **2 239 / 3 262 = 68,64 %**. Après écriture ultérieure du lot :
  **2 294 / 3 262 = 70,32 %** (gain de 55 segments, soit 1,69 point).

## Préparation de Deutéronome I à X — contrôle sans écriture

### Bornes et résolutions sémantiques

- Les Questions I à X du Livre cinquième couvrent exactement les segments
  2371-2427, soit 57 segments continus. Le segment 2370 clôt les Nombres et
  la Question XI du Deutéronome commence au segment 2428 : les deux raccords
  ont été contrôlés.
- La Question III porte le titre imprimé `Deutéronome 3,2`, mais Og resté seul
  de la race des Rephaïm et les dimensions de son lit de fer se trouvent en
  `DEU.3.11`. Le lien est résolu par le contenu sans altérer ce titre fidèle
  à l’édition.
- Le psaume noté `Ps. CIV, 25` au segment 2373 correspond au créneau local
  `PSA.104.25`, où Dieu change le cœur des nations afin qu’elles haïssent son
  peuple. De même, `Ps. CXX, 2` au segment 2389 vise `PSA.120.2`, secours
  venant du Créateur du ciel et de la terre. Les numéros modernes 105 et 121
  ne sont jamais propagés mécaniquement.
- Le titre de la Question VIII a été importé comme `Deutéronome 5, 32, 33`,
  alors que le fac-similé imprime `Ib. IV, 32, 33` et que les deux versets
  parlent bien de l’interrogation des temps anciens et de la voix entendue
  au milieu du feu. La correction préparée est le titre normalisé
  `Deutéronome 4, 32-33`, avec cibles `DEU.4.32-33`.
- La note `Exo. XXXIII, 2` du segment 2406 est une erreur d’OCR : le
  fac-similé porte `Ex. XXXIII, 11`, et `EXO.33.11` contient précisément le
  Seigneur parlant à Moïse face à face. `EXO.33.13`, dont la forme
  septantiste est citée au segment 2408, reste distingué.

### Corrections, §25.7 et règle *sic*

- Trois corrections certaines sont préparées avec préconditions exactes :
  `Exo. XXXIII, 2` → `Exo. XXXIII, 11` au segment 2406 ; suppression du
  parasite Word `#Rem` après le renvoi `CXLVII, 36` au segment 2413 ; et
  correction du titre de la Question VIII au segment 2396. Elles seront
  appliquées en transaction et synchronisées dans `segments-candidate.json`
  uniquement après un postcontrôle réussi. Le `source-map` ne porte ni les
  notes ni les métadonnées de titre concernées.
- Trois références externes sont déclarées sans cible, type 4,
  `à constituer`, au format du §25.7 : les hébraïsants et variantes de
  manuscrits sur les Rephaïm (2376), plusieurs interprètes de l’image et de la
  ressemblance (2383), et les Lettres 92,6 et 147,36 d’Augustin (2413).
- Les fac-similés `p537.jpg` à `p541.jpg` ont été relus et verrouillés par
  SHA-256. Aucun `[<i>sic</i>]` ne figure dans le lot et aucune coquille
  orthographique imprimée certaine ne demande une nouvelle marque. Les
  anomalies bibliques ou de métadonnées sont corrigées ou résolues, jamais
  signalées par un *sic*.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-deuteronome-q1-q10.mjs` ; mode
  par défaut sans écriture, empreinte stricte, hashes des cinq pages, voisins
  et candidats contrôlés, partition exhaustive, contrôle des cibles et
  doublons, transaction et postcontrôles préparés.
- Manifeste : 57 segments ; 150 liens proposés — type 1 : 43 ; type 3 : 104 ;
  type 4 : 3, tous trois sans cible `à constituer`. Aucun segment n’est sans
  lien ; les 47 cibles bibliques distinctes possèdent un témoin local.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **2 370 / 3 262 = 72,65 %**. Après écriture ultérieure du lot :
  **2 427 / 3 262 = 74,40 %** (gain de 57 segments, soit 1,75 point).

## Préparation de Nombres XXXI à XL — contrôle sans écriture

### Lecture suivie, témoins et numérotations anciennes

- Les Questions XXXI à XL occupent exactement les segments 2164-2239, soit
  76 segments continus. Les raccords avec la Question XXX en 2163 et la
  Question XLI en 2240 ont été contrôlés.
- Les six fac-similés `p524.jpg` à `p529.jpg` ont été lus et verrouillés par
  leur SHA-256. Les 61 cibles distinctes ont un témoin local dans
  `TR0001`, `TR0003` ou `TR0004` ; les notes et plages ont été déployées
  verset par verset conformément au §25.7.
- La note imprimée `Lév. VI, 25, 26` au segment 2166 suit l’ancienne
  numérotation. Son contenu correspond aux créneaux locaux `LEV.6.18` (loi
  du sacrifice pour le péché) et `LEV.6.19` (le prêtre mange la victime) ;
  ce sont ces deux cibles qui sont retenues.
- Les plages explicites `Act. X, 44-48` et `Rom. XI, 16-24` sont attribuées
  intégralement, sans réduction au seul premier verset. Les allusions
  christologiques hors du camp et au sacerdoce royal sont distinguées en
  type 2 (`HEB.13.12`, `1PE.2.9`).

### Typographie, *sic* et références sans cible

- La page `p527.jpg`, page imprimée 519, confirme la leçon « quand au temps
  de la vie » au segment 2216. La coquille imprimée pour « quant au temps »
  reste donc signalée par `[<i>sic</i>]`, conformément à la nouvelle règle.
- La contre-lecture typographique des 76 segments n’a trouvé aucune autre
  correction certaine. Aucune correction conjecturale, aucun ajout de *sic*
  non prouvé et aucune modification des candidats ne sont préparés.
- Deux attributions de traduction sont consignées sans cible, type 4,
  `à constituer`, avec le motif normalisé
  `RÉFÉRENCE NON BIBLIQUE (traduction) : ...` : les interprètes rendant
  `protogennêmata` par « prémices » (2168) et les traducteurs latins de la
  formule introductive de la loi (2174).

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q31-q40.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte du préétat, hash de la
  charte et des six pages, partition exhaustive, contrôle des cibles et des
  doublons, sauvegarde ciblée, transaction et postcontrôles préparés.
- Manifeste : 76 segments ; 176 liens proposés — type 1 : 58 ; type 2 : 2 ;
  type 3 : 114 ; type 4 : 2 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  du lot précédent, avancement live : **2 090 / 3 262 = 64,07 %**. Après
  écriture ultérieure de ce lot : **2 166 / 3 262 = 66,40 %** (gain de
  76 segments, soit 2,33 points).

## Préparation de Nombres XI à XX — contrôle sans écriture

### Lecture suivie, témoins et numérotations anciennes

- Les Questions XI à XX occupent exactement les segments 2035-2107, soit
  73 segments continus. Les raccords avec la Question X en 2034 et la
  Question XXI en 2108 ont été contrôlés ; tous les segments appartiennent
  au `Livre quatrième`.
- Les fac-similés utiles ont été relus et verrouillés par leur SHA-256. Les
  53 cibles distinctes possèdent chacune un témoin local dans `TR0001`,
  `TR0003` ou `TR0004` ; les plages et reprises ont été déployées verset par
  verset conformément au §25.7.
- Les renvois imprimés `Lév. VI, 16-17` et `Lév. IX, 15-22` sont fautifs :
  le contenu des questions vise respectivement `NUM.6.16-17` et
  `NUM.9.15-22`. L'ancienne numérotation `IV Rois II, 15` est résolue en
  `2KI.2.15`.
- Le renvoi `II Paralip. XXIV, 9-14` du segment 2106 est également fautif :
  le récit des Éthiopiens poursuivis correspond à `2CH.14.9-14`. Ces erreurs
  de référence sont arbitrées sémantiquement sans altérer le texte source.

### Typographie, *sic* et références sans cible

- La contre-lecture typographique n'a révélé aucune coquille orthographique
  imprimée certaine dans ce lot : aucune correction et aucun nouveau
  `[<i>sic</i>]` ne sont préparés. Les anomalies numériques ou bibliques
  ci-dessus ne reçoivent pas de *sic*.
- Cinq attributions externes sont consignées selon le §25.7, sans cible,
  type 4, `à constituer`, avec arbitrage requis : les interprètes de
  `in peccatum` (2037), d'autres traducteurs de la loi des Lévites (2041),
  les traducteurs latins de Nombres 11,17 (2083), certains commentateurs
  (2086) et le traité *De l'âme* de Tertullien (2087).

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q11-q20.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte du préétat, preuves
  fac-similé, voisins et structure contrôlés, partition exhaustive, contrôle
  des cibles, témoins et doublons, sauvegarde ciblée, transaction et
  postcontrôles préparés.
- Manifeste : 73 segments ; 195 liens proposés — type 1 : 67 ; type 3 :
  123 ; type 4 : 5 sans cible `à constituer`. Aucun segment n'est sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des autres lots, avancement live : **2 166 / 3 262 = 66,40 %**. Après
  écriture ultérieure de ce lot : **2 239 / 3 262 = 68,64 %** (gain de
  73 segments, soit 2,24 points).

## Préparation de Nombres LI à LX — contrôle sans écriture

### Lecture suivie, témoins et anciennes références

- Les Questions LI à LX occupent exactement les segments 2295-2351, soit
  57 segments continus. Le raccord avec la Question L en 2294 et celui avec
  la Question LXI en 2352 ont été contrôlés.
- Les cinq fac-similés `p532.jpg` à `p536.jpg` ont été lus et verrouillés
  par leur SHA-256. Les 51 cibles distinctes ont toutes au moins un témoin
  local dans `TR0001`, `TR0003` ou `TR0004`.
- La rubrique ancienne `Nombres 23,5` de la Question LI ne correspond pas à
  son texte : `NUM.23.5` concerne la parole mise dans la bouche de Balaam,
  tandis que « l’Esprit de Dieu fut sur lui » est attesté en `NUM.24.2`.
  L’attribution suit donc le contenu, non le numéro imprimé.
- La note `Matt. VI, 26` du segment 2341 vise sémantiquement `MAT.6.25`, seul
  verset local portant « la vie/l’âme n’est-elle pas plus que la nourriture ».
  Les plages `1 Cor. VII, 37-38` et les sections successives de Nombres 30
  sont déployées verset par verset selon le §25.7.

### Typographie, corrections synchronisables et références externes

- `p534.jpg`, page imprimée 526, prouve que le segment 2321 doit porter
  « mais **devenue** illicite », et non « devenu illicite ».
- `p535.jpg`, page imprimée 527, prouve que le segment 2345 doit porter
  « les **vœux** précités », et non « les veaux précités ». Ce sont deux
  erreurs d’OCR, non deux coquilles imprimées : elles sont préparées comme
  corrections, sans `[<i>sic</i>]`.
- Les deux corrections possèdent une occurrence exacte dans
  `segments-candidate.json` et une seule source englobante synchronisable
  dans `source-map.json`. La synchronisation n’aura lieu qu’après réussite de
  la transaction en mode `--write` ; aucun fichier candidat n’a été modifié
  pendant le dry-run.
- Six références externes sont consignées sans cible, type 4,
  `à constituer` : le texte grec de Nombres 25,4 ; les versions distinctes
  de Symmaque et d’Aquila ; le renvoi interne à la Question XIX ; les
  interprètes latins de Nombres 27,20 ; et ceux qui comprennent « vierge »
  comme « virginité » en 1 Corinthiens 7.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q51-q60.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et
  des cinq pages, partition exhaustive, contrôle des cibles et doublons,
  préconditions des corrections, sauvegarde ciblée, transaction et
  postcontrôles préparés.
- Manifeste : 57 segments ; 178 liens proposés — type 1 : 50 ; type 2 : 2 ;
  type 3 : 120 ; type 4 : 6 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 294 / 3 262 = 70,32 %**. Après
  écriture ultérieure de ce lot : **2 351 / 3 262 = 72,07 %** (gain de
  57 segments, soit 1,75 point).

## Préparation de Deutéronome XI à XX — contrôle sans écriture

### Bornes, lecture et résolution sémantique

- Les Questions XI à XX occupent exactement les segments 2428-2486, soit
  59 segments continus du `Livre cinquième`. Le raccord amont avec la
  Question X en 2427 et le raccord aval avec la Question XXI en 2487 ont été
  contrôlés.
- Les cinq fac-similés `p541.jpg` à `p545.jpg` ont été lus et verrouillés
  par leur SHA-256. Les 58 cibles distinctes possèdent toutes un témoin
  local dans `TR0001`, `TR0003` ou `TR0004` ; les plages sont déployées
  verset par verset selon le §25.7.
- La note imprimée `Ib. 17` au segment 2440 ne correspond pas au contenu :
  la rébellion continue depuis la sortie d’Égypte est `DEU.9.7`, non
  `DEU.9.17`. Le texte imprimé est conservé et la cible est résolue par le
  sens.
- La rubrique `Deutéronome 12,11` de la Question XVIII combine le lieu choisi
  pour apporter les offrandes (`DEU.12.11`) et surtout l’interdiction de
  manger dans les villes les dîmes et premiers-nés (`DEU.12.17`). Les deux
  passages sont distingués dans le manifeste.

### Corrections prouvées et règle *sic*

- `p542.jpg` prouve que la note 648 porte `Ex. XXXIV, 27, 28`, et non la plage
  OCRisée `27-29`. `p543.jpg` prouve que la note 653 porte `Ib. 27, 28`, et
  non `Ib. XXVII, 28`. Les deux notes sont corrigibles dans la base et dans
  `segments-candidate.json` ; les corps de notes ne sont pas dupliqués dans
  `source-map.json`.
- La même page `p543.jpg` porte clairement « où se trouvent consignées une
  foule de choses » au segment 2457. Le `s` perdu par l’OCR est préparé dans
  le texte de la base, le candidat et l’unique `source_clean` englobant.
- Ces trois anomalies sont des erreurs d’OCR et non des coquilles imprimées :
  aucun `[<i>sic</i>]` n’est ajouté. Aucune autre correction certaine n’a été
  trouvée dans les 59 segments.

### Références externes et état du dry-run

- Cinq références externes sont consignées sans cible, type 4,
  `à constituer` : le renvoi interne à la Question CLXVI de l’Exode ; les
  interprètes latins de Deutéronome 13,3 ; la version faite sur l’hébreu,
  sa citation développée et la formulation des Septante en Deutéronome 14.
- Script : `scripts/heptateuque/attribue-liens-deuteronome-q11-q20.mjs` ;
  empreinte stricte, hash de la charte et des pages, partition exhaustive,
  témoins, doublons, préconditions de correction, sauvegarde ciblée,
  transaction et postcontrôles sont préparés.
- Manifeste : 59 segments ; 206 liens proposés — type 1 : 64 ; type 2 : 1 ;
  type 3 : 136 ; type 4 : 5 sans cible. Aucun segment n’est sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 427 / 3 262 = 74,40 %**. Après
  écriture ultérieure de ce lot : **2 486 / 3 262 = 76,21 %** (gain de
  59 segments, soit 1,81 point).

## Préparation de Deutéronome XLI à L — contrôle sans écriture

### Bornes, numérotation canonique et plages

- Les Questions XLI à L occupent exactement les segments 2561-2635, soit
  75 segments continus. Le raccord amont avec la Question XL en 2560 et le
  raccord aval avec la Question LI en 2636 ont été contrôlés.
- Les six fac-similés `p550.jpg` à `p555.jpg` ont été lus et verrouillés
  par leur SHA-256. Les 52 cibles distinctes ont toutes au moins un témoin
  local ; la plage explicite `Psaume 143,8-15` est déployée dans son
  intégralité selon le §25.7.
- Le contenu de la Question XLIX, imprimé `Deutéronome 29,1`, se trouve dans
  le crénelage local en `DEU.28.69` : alliance de Moab outre celle d’Horeb.
  La Question L, imprimée `29,2-4`, correspond en conséquence aux créneaux
  locaux `DEU.29.1-3`. Le manifeste suit le contenu des trois témoins.
- Au segment 2569, la note imprimée `Deut. XXIV, 16` accompagne pourtant la
  clause « à l’égard de ceux qui me haïssent » : ce contenu est
  `EXO.20.5`. Le renvoi imprimé n’est pas altéré, mais la cible biblique est
  résolue sémantiquement.

### Typographie, correction et références externes

- `p553.jpg`, page imprimée 545, prouve qu’aucun tiret ne précède
  « En effet, s’ils avaient été enfants de deux frères » au segment 2602.
  Le tiret parasite est une erreur d’OCR ; sa suppression est préparée sous
  précondition exacte dans la base, `segments-candidate.json` et l’unique
  `source_clean` englobant.
- Aucun `[<i>sic</i>]` ne figure dans le lot et aucune coquille orthographique
  imprimée certaine n’a été découverte. Les erreurs de numérotation ne
  reçoivent pas de *sic*.
- Quatre références externes sont consignées sans cible, type 4,
  `à constituer` : la terminologie des Septante en Deutéronome 25 ;
  l’*Accord des Évangélistes* ; un renvoi interne non localisé sur les femmes
  dans les généalogies ; et les *Rétractations* II, 55, 3.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-deuteronome-q41-q50.mjs` ;
  empreinte stricte, hash de la charte et des pages, partition exhaustive,
  témoins, doublons, correction synchronisable, sauvegarde ciblée,
  transaction et postcontrôles sont préparés.
- Manifeste : 75 segments ; 236 liens proposés — type 1 : 58 ; type 2 : 1 ;
  type 3 : 173 ; type 4 : 4 sans cible. Aucun segment n’est sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 560 / 3 262 = 78,48 %**. Après
  écriture ultérieure de ce lot : **2 635 / 3 262 = 80,78 %** (gain de
  75 segments, soit 2,30 points).

## Clôture de Nombres LXI à LXV — contrôle sans écriture

### Lecture suivie et résolution des en-têtes anciens

- Les cinq dernières questions du Livre quatrième occupent exactement les
  segments 2352-2370, soit 19 segments continus. Le segment 2351 clôt la
  Question LX ; le segment 2371 ouvre le Livre cinquième et la Question I
  sur le Deutéronome. Le raccord entre les deux livres est gardé.
- Les pages `p536.jpg` et `p537.jpg` ont été relues et verrouillées par leur
  SHA-256. Les 19 cibles distinctes possèdent chacune les trois témoins
  locaux `TR0001`, `TR0003` et `TR0004`.
- La Question LXI confronte la mort de Balaam en `NUM.31.8` à son retour
  « en son lieu » en `NUM.24.25`. La Question LXIII rattache le conseil de
  Balaam en `NUM.31.16` à la fornication et à l’idolâtrie de Phogor décrites
  en `NUM.25.1-3`.
- L’en-tête imprimé `Nombres 35, 14, 12` de la Question LXIV ne doit pas être
  propagé mécaniquement : la citation sur la protection contre le vengeur
  jusqu’au jugement est `NUM.35.12`; `NUM.35.14` ne porte que la répartition
  géographique des six villes. L’en-tête `35, 19, 12` de la Question LXV
  articule en revanche réellement `NUM.35.19` et `NUM.35.12`.
- L’argument des deux dernières questions est suivi jusqu’à ses versets
  effectifs : jugement par l’assemblée (`NUM.35.24-25`), sortie prématurée
  de la ville et mise à mort sans faute par le vengeur (`NUM.35.26-27`),
  puis retour permis après la mort du grand-prêtre (`NUM.35.28`).

### Typographie, corrections synchronisables et règle *sic*

- `p536.jpg`, page imprimée 528, prouve trois microcorrections : espace et
  demi-cadratin après le titre interrogatif du segment 2352 ; restitution de
  la virgule imprimée dans `« chez lui, »` au segment 2356 ; espace avant le
  deux-points après `leur force` au segment 2358.
- Les trois corrections ont des préconditions distinctes pour le texte
  normalisé en base et pour les fichiers de segmentation. Leur
  synchronisation dans `segments-candidate.json` et `source-map.json` est
  préparée uniquement en mode écriture, après la transaction.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. Les chiffres fautifs des en-têtes et les
  défauts de ponctuation ne reçoivent pas de *sic*.
- Aucune référence non biblique n’apparaît dans ce lot et aucune cible
  `à constituer` n’est nécessaire.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-nombres-q61-q65.mjs` ; mode
  par défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et
  des deux pages, voisins et changement de livre contrôlés, partition
  exhaustive, témoins, doublons, préconditions des corrections, sauvegarde,
  transaction et postcontrôles préparés.
- Manifeste : 19 segments ; 51 liens proposés — type 1 : 10 ; type 3 : 41.
  Aucun segment n’est sans lien et aucune référence ne reste sans cible.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 351 / 3 262 = 72,07 %**. Après
  écriture ultérieure de cette clôture : **2 370 / 3 262 = 72,65 %** (gain
  de 19 segments, soit 0,58 point). Nombres serait alors intégralement relu.

## Préparation de Deutéronome XXI à XXX — contrôle sans écriture

### Lecture suivie, témoins et numérotations anciennes

- Les Questions XXI à XXX occupent exactement les segments 2487-2520, soit
  34 segments continus. La Question XX se termine en 2486 et la Question
  XXXI commence en 2521 ; les deux raccords ont été contrôlés.
- Les quatre fac-similés `p545.jpg` à `p548.jpg` ont été lus et verrouillés
  par leur SHA-256. Les 44 cibles distinctes possèdent chacune les trois
  témoins locaux `TR0001`, `TR0003` et `TR0004`.
- La note 666 du segment 2496 imprime `Ib. 15`, cible reconnue comme
  `COL.1.15` par « premier-né de toute créature ». La transcription
  `Ib. XVI` est une erreur numérique d’OCR à corriger, sans *sic*.
- La variante des Septante « mon fils premier-né », donnée aux Proverbes 31
  ou 24 selon la numérotation grecque, est alignée sur `PRO.31.2`. Le témoin
  local porte « mon fils / fils de mes entrailles / objet de mes vœux » : le
  lien conserve dans son motif la différence de formulation grecque.
- L’en-tête Deutéronome 18,7-8 de la Question XXVIII omet le début effectif
  de la citation : la venue du Lévite est `DEU.18.6`, son service
  `DEU.18.7` et sa part `DEU.18.8`. L’en-tête 18,11 de la Question XXIX vise
  par son contenu l’interdiction des augures en `DEU.18.10`.
- La verge d’Aaron notée `Nomb. XVII, 8` au segment 2517 correspond au
  créneau local `NUM.17.23`, où elle fleurit et produit des amandes. La
  toison de Gédéon est déployée sans réduction sur `JDG.6.37-40`.

### Corrections prouvées, référence interne et règle *sic*

- `p546.jpg`, page imprimée 538, porte clairement « de **là**
  `πρωτότοκον` » au segment 2492. La correction de `de la` en `de là` est
  préparée dans la base, `segments-candidate.json` et l’unique
  `source_clean` englobant de `source-map.json`.
- La même page prouve la correction de note `[[666]] Ib. XVI` en
  `[[666]] Ib. 15.`. Les notes ne sont pas dupliquées dans `source-map.json`;
  la correction est donc synchronisée avec le champ `notes` du candidat.
- Ces deux anomalies sont des erreurs d’OCR. Aucune coquille orthographique
  imprimée certaine n’a été trouvée et aucun `[<i>sic</i>]` n’est ajouté.
- Le rappel d’une explication antérieure de la toison et de la verge, sans
  localisation précise, est conservé selon le §25.7 sans cible, type 4,
  `à constituer`, comme `RÉFÉRENCE NON BIBLIQUE (renvoi interne)`.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-deuteronome-q21-q30.mjs` ;
  mode par défaut sans écriture, empreinte SHA-256 stricte, hash de la
  charte et des quatre pages, voisins et structure contrôlés, partition
  exhaustive, témoins, doublons, préconditions des corrections, sauvegarde,
  transaction et postcontrôles préparés.
- Manifeste : 34 segments ; 117 liens proposés — type 1 : 34 ; type 2 : 2 ;
  type 3 : 80 ; type 4 : 1 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 486 / 3 262 = 76,21 %**. Après
  écriture ultérieure de ce lot : **2 520 / 3 262 = 77,25 %** (gain de
  34 segments, soit 1,04 point).

## Préparation de Deutéronome XXXI à XL — contrôle sans écriture

### Lecture suivie, témoins et numérotations anciennes

- Les Questions XXXI à XL occupent exactement les segments 2521-2560, soit
  40 segments continus. La Question XXX se termine en 2520 et la Question
  XLI commence en 2561 ; les deux raccords ont été contrôlés.
- Les trois fac-similés `p548.jpg` à `p550.jpg`, pages imprimées 540 à 542,
  ont été relus et verrouillés par leur SHA-256. Les 43 cibles distinctes du
  manifeste possèdent chacune au moins un témoin local dans
  `versets_lecture`.
- À partir de Deutéronome 23, l’ancienne numérotation imprimée précède souvent
  d’un verset le canon local. Les cibles ont donc été reconnues par leur
  texte : esclave réfugié `DEU.23.16`, libre résidence `DEU.23.17`, défense
  de la prostitution `DEU.23.18`, salaire de la prostituée et prix du chien
  `DEU.23.19`.
- L’exclusion imprimée sous Deutéronome 23,3-4 vise effectivement
  `DEU.23.4`, et son motif sur le pain, l’eau et Balaam vise `DEU.23.5`.
- La note ancienne `I Rois. XX, 10` au segment 2547 ne pointe pas le texte
  moderne `1SA.20.10`. L’épisode nommé, David fuyant Saül et se rendant chez
  Achis roi de Geth, est `1SA.21.11` dans le canon local. La cible est
  attribuée sémantiquement et la divergence est explicitée dans le motif.
- Le rachat des premiers-nés d’animaux impurs évoqué sans note au segment
  2552 est identifié à `NUM.18.15`, plutôt qu’étendu artificiellement à
  plusieurs lois voisines sur le premier-né de l’âne.

### Typographie, références non bibliques et règle *sic*

- Le fac-similé prouve deux pertes de ponctuation OCR : virgule imprimée dans
  `« la femme ne portera point les vêtements de l’homme, »` au segment 2526 ;
  guillemets autour de `Dépouillez-vous du vieil homme` et de `Que celui qui
  dérobait…` au segment 2559. Les corrections sont préparées avec
  préconditions distinctes pour la typographie normalisée en base et les
  fichiers `segments-candidate.json` / `source-map.json`.
- Aucune coquille orthographique imprimée certaine n’a été trouvée. Aucun
  `[<i>sic</i>]` n’est donc ajouté ; les divergences numériques et les pertes
  de ponctuation ne reçoivent pas de *sic*.
- Les « plusieurs interprètes » du segment 2526 et le renvoi d’Augustin à la
  Question LXXI, 4 des Questions sur l’Exode au segment 2550 restent sans
  cible, en type 4 `à constituer`, avec le préfixe contrôlé
  `RÉFÉRENCE NON BIBLIQUE (genre) : ...`.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-deuteronome-q31-q40.mjs` ;
  mode par défaut sans écriture, empreinte SHA-256 stricte, hash de la charte
  et des trois pages, partition exhaustive, contrôle des témoins et des
  doublons, synchronisation candidate/source-map, sauvegarde, transaction et
  postcontrôles préparés.
- Manifeste : 40 segments ; 94 liens proposés — type 1 : 40 ; type 2 : 6 ;
  type 3 : 46 ; type 4 : 2 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **2 520 / 3 262 = 77,25 %**. Après écriture ultérieure de ce lot :
  **2 560 / 3 262 = 78,48 %** (gain de 40 segments, soit 1,23 point).

## Préparation de Josué I à X — contrôle sans écriture

### Lecture suivie, témoins et numérotations

- Les Questions I à X du Livre sixième occupent exactement les segments
  2690-2753, soit 64 segments continus. Le segment 2689 clôt le Livre
  cinquième et le segment 2754 ouvre la Question XI ; les deux raccords sont
  verrouillés dans le script.
- Les fac-similés `p559.jpg` à `p563.jpg`, pages imprimées 551 à 555, ont été
  lus et verrouillés par leur SHA-256. Les 66 cibles distinctes possèdent
  chacune au moins un témoin local dans `versets_lecture`.
- Le récit des espions est recomposé par son contenu sur `JOS.2.1`,
  `JOS.2.4`, `JOS.2.15-16`, `JOS.2.22-23` puis `JOS.3.1-3`. La note ancienne
  `Ib. III, 1` ne décide pas seule de la cible.
- L’analyse de la circoncision suit réellement `JOS.5.2-7` : le mot « de
  nouveau » concerne le peuple, composé d’hommes circoncis et d’enfants nés
  incirconcis au désert, non une seconde circoncision individuelle.
- Dans la Question IX, la référence verbale au « Lévitique » pour la
  purification des vases par le feu correspond sémantiquement à
  `NUM.31.23`. Le motif conserve explicitement cette divergence de livre.
- Le `Ib.` de la note 757 reprend la note immédiatement précédente
  `Rom. IX, 14`, et non le livre de Josué : la proposition « il n’y a pas
  d’iniquité en lui » confirme la cible `ROM.9.14`.

### Typographie, références sans cible et règle *sic*

- Les pages prouvent quatre corrections de texte : `Moise` devient `Moïse`
  au segment 2697 ; l’espace manquant après `grec,` est rétabli au segment
  2706 ; les espaces typographiques avant le point-virgule sont rétablis
  après les italiques aux segments 2739 et 2747. Les abréviations `Ib` des
  notes 744 et 757 retrouvent leur point.
- Les corrections sont préparées avec préconditions exactes dans la base et
  `segments-candidate.json`; les quatre corrections du corps sont également
  synchronisées avec l’unique `source_clean` englobant de `source-map.json`.
- Les leçons imprimées « quarante-deux ans » au segment 2713 et « trente
  guerriers » au segment 2749 divergent du récit biblique local, mais ce sont
  des anomalies numériques. Elles ne reçoivent pas de `[<i>sic</i>]`.
  `Mabdarite`, nom propre imprimé, n’est pas traité comme une coquille
  orthographique. Aucune nouvelle marque *sic* n’est préparée.
- Trois références restent sans cible : le renvoi interne à la Question II,
  les savants non identifiés sur la crue du Jourdain et la version biblique
  faite sur l’hébreu. Elles sont de type 4, `à constituer`, avec le préfixe
  contrôlé `RÉFÉRENCE NON BIBLIQUE (genre) : ...`.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-josue-q1-q10.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  cinq pages, contrôle des voisins, partition exhaustive, témoins, doublons,
  préconditions de correction, sauvegarde, transaction et postcontrôles
  préparés.
- Manifeste : 64 segments ; 172 liens proposés — type 1 : 55 ; type 2 : 17 ;
  type 3 : 97 ; type 4 : 3 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des autres lots, avancement live : **2 689 / 3 262 = 82,43 %**. Après
  écriture ultérieure de ce lot : **2 753 / 3 262 = 84,40 %** (gain de
  64 segments, soit 1,96 point).

## Préparation de Deutéronome LI à LVII — contrôle sans écriture

### Lecture suivie, témoins et anciennes numérotations

- Les Questions LI à LVII occupent exactement les segments 2636-2689, soit
  54 segments continus. La Question L se termine en 2635 ; le Livre sixième,
  Question I, commence en 2690. Les deux raccords ont été contrôlés.
- Les fac-similés `p555.jpg` à `p559.jpg` ont été relus et verrouillés par
  leur SHA-256. Les 49 cibles bibliques distinctes possèdent chacune leurs
  trois témoins locaux TR0001, TR0003 et TR0004 dans `versets_lecture`.
- La numérotation du lemme imprimé Deutéronome 29,5-6 est décalée : son texte
  correspond à `DEU.29.4-5` dans les témoins locaux. De même, le lemme
  Deutéronome 29,18-21 commence sémantiquement en `DEU.29.17`. Les liens
  suivent le texte canonique exact ; la référence imprimée reste documentée.
- Quatre notes OCR sont corrigées d’après le fac-similé et le contenu cité :
  `Jer. XIV, 1` devient `Jer. XIV, 7.` ; `Psa. XI, 6` devient `Psa. XL, 5.` ;
  `Eze. XXXIII, 2` devient `Eze. XXXIII, 11.` ; `1Ro. XII, 13` devient
  `2Sa. XII, 13.`. Les mêmes remplacements sont préconditionnés dans
  `segments-candidate.json` et ne seront appliqués qu’avec `--write`.

### Références non bibliques, typographie et règle *sic*

- Le renvoi au *Contre Julien* du segment 2648 est conservé sans cible en
  type 4, fiabilité `à constituer`, provenance `lecture`, arbitrage requis.
- La version faite sur l’hébreu et l’addition des Septante au segment 2657,
  puis les trois groupes d’interprètes du segment 2660, sont distingués en
  cinq références de version sans cible, selon le §25.7 et avec le préfixe
  `RÉFÉRENCE NON BIBLIQUE (genre) : ...`.
- Aucune coquille orthographique imprimée certaine n’a été trouvée. Aucun
  `[<i>sic</i>]` n’est ajouté : les anomalies de numéro, de ponctuation, de
  syntaxe ou de contenu ne reçoivent jamais ce marqueur.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-deuteronome-q51-q57.mjs` ;
  mode par défaut sans écriture, empreinte SHA-256 stricte, hash de la charte
  et des cinq pages, voisins, partition exhaustive, témoins, doublons,
  préconditions de corrections, sauvegarde, transaction et postcontrôles
  préparés.
- Manifeste : 54 segments ; 180 liens proposés — type 1 : 60 ; type 2 : 1 ;
  type 3 : 113 ; type 4 : 6 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **2 635 / 3 262 = 80,78 %**. Après écriture ultérieure de ce lot :
  **2 689 / 3 262 = 82,43 %** (gain de 54 segments, soit 1,66 point).

## Préparation de Josué XXI à XXX — contrôle sans écriture

### Lecture suivie, témoins et numérotations anciennes

- Les Questions XXI à XXX du Livre sixième occupent exactement les segments
  2801-2882, soit 82 segments continus. La Question XX se termine en 2800 ;
  le Livre septième, Question I, commence en 2883. Les raccords sont gardés.
- Les six fac-similés `p567.jpg` à `p572.jpg` ont été relus et verrouillés
  par SHA-256. Les 73 cibles bibliques distinctes ont toutes un témoin local.
- Le lemma imprimé Josué 21,41-43 correspond sémantiquement aux créneaux
  locaux `JOS.21.43-45`. TR0001 regroupe toute cette conclusion dans le
  créneau 21,43 ; TR0003 et TR0004 la distribuent sur les trois créneaux.
  Le script contrôle explicitement ce crénelage et ne remplit pas les deux
  cellules TR0001 volontairement vides.
- Le cas de Dan attribué à Josué 19,48 suivant les Septante correspond au
  contenu local de `JDG.1.34`. Les autres décalages résolus par le texte sont
  notamment Psaume 104,16 vers `PSA.104.15`, Psaume 113,6 vers
  `PSA.113.14`, 1 Pierre 2,6 vers `1PE.2.8` et 1 Corinthiens 13,13 vers
  `1CO.13.12`.
- La domination salomonienne imprimée III Rois 4,21 correspond au créneau
  local `1KI.5.1`. Les secondes tables, indiquées par la note imprimée
  Exode 34,3 et suivants, sont reliées à `EXO.34.1` et `EXO.34.4`.

### Corrections prouvées, références externes et règle *sic*

- `p567.jpg` prouve la suppression de la virgule OCR parasite dans
  `Mais quant à, ces villes` au segment 2809. La correction est préparée
  sous préconditions exactes dans la base, `segments-candidate.json` et
  l’unique `source_clean` englobant de `source-map.json`.
- Trois notes sont corrigées d’après les fac-similés : `Ib. XLII, 2` devient
  `Ib. CXLII, 2.` au segment 2855 ; `Exod. XXIV, 3, etc.` devient
  `Exod. XXXIV, 3, etc.` au segment 2872 ; `Ib. XVI` devient `Ib. 16.` au
  segment 2882. Leur synchronisation candidate est préparée seulement pour
  le mode `--write`.
- Neuf références restent sans cible : une tradition textuelle sur Dan, un
  renvoi interne aux Questions sur la Genèse, deux variantes de Josué 23,14,
  une discussion gréco-latine, deux variantes de Josué 24,3 et deux lectures
  de l’arbre de Josué 24,26. Elles sont en type 4, `à constituer`, avec
  provenance `lecture`, arbitrage requis et motif conforme au §25.7.
- Aucune coquille orthographique imprimée certaine n’a été trouvée. Aucun
  `[<i>sic</i>]` n’est ajouté ; les anomalies de nombre, de syntaxe, de
  ponctuation ou de référence ne reçoivent pas ce marqueur.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-josue-q21-q30.mjs` ; mode par
  défaut sans écriture, empreinte stricte, hash de la charte et des six
  pages, voisins, partition exhaustive, témoins, doublons, corrections
  synchronisables, sauvegarde, transaction et postcontrôles préparés.
- Manifeste : 82 segments ; 262 liens proposés — type 1 : 74 ; type 2 : 8 ;
  type 3 : 171 ; type 4 : 9 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après écriture concurrente du
  lot Josué XI-XX, avancement live : **2 800 / 3 262 = 85,84 %**. Après
  écriture ultérieure de ce lot : **2 882 / 3 262 = 88,35 %** (gain de
  82 segments, soit 2,51 points). Le Livre sixième serait alors clos.

## Préparation de Josué XI à XX — contrôle sans écriture

### Bornes, lecture et anciennes numérotations

- Les Questions XI à XX occupent exactement les segments 2754-2800, soit
  47 segments continus du Livre sixième. Le raccord amont avec la Question X
  en 2753 et le raccord aval avec la Question XXI en 2801 ont été contrôlés.
- Les fac-similés `p563.jpg` à `p567.jpg`, pages imprimées 555 à 559, ont été
  lus et verrouillés par leur SHA-256. Les 63 cibles bibliques distinctes
  possèdent toutes au moins un témoin local dans `TR0001`, `TR0003` ou
  `TR0004`. Les plages explicites Josué 9,3-13, 2 Samuel 21,1-9 et
  1 Samuel 25,22-33 sont déployées verset par verset.
- La rubrique ancienne `Josué 19,47 suivant les Septante` de la Question XX
  ne correspond pas au verset local `JOS.19.47`. Sa citation sur les
  Amorrhéens d’Aïalon et Salebim devenus tributaires est attestée localement
  en `JDG.1.35`. Le manifeste suit donc le contenu, sans altérer la rubrique.
- La note 764 imprime `Jos. XI, 21`, mais la formulation sur
  l’endurcissement et la ligue des peuples correspond au créneau local
  `JOS.11.20`. La cible est résolue sémantiquement, selon la règle des
  numérotations anciennes.
- La note 760 imprime `Exo. VII, 3, 22 ; 8, 19`. Ses trois formulations sur
  l’endurcissement de Pharaon sont reconnues dans le crénelage local en
  `EXO.7.3`, `EXO.7.22` et `EXO.8.15`.

### Corrections, références sans cible et règle *sic*

- `p563.jpg` prouve la virgule imprimée dans `Josué, en envoyant trente
  mille` au segment 2754. `p567.jpg` prouve que la note 764 porte
  `Jos. XI, 21`, et non la transcription `Jos. XXI, 21` du segment 2800.
  Ces deux erreurs d’OCR sont préparées sous préconditions exactes.
- La correction du corps est synchronisable dans `segments-candidate.json`
  et dans l’unique `source_clean` englobant de `source-map.json`. La note est
  synchronisable dans le champ `notes` du candidat ; les notes ne sont pas
  dupliquées dans `source-map.json`. Aucun fichier candidat n’est modifié en
  dry-run.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. Le point-virgule surprenant de la Question XI
  est imprimé et relève de la ponctuation : il ne reçoit pas de *sic*.
- Sept références non bibliques restent sans cible, type 4,
  `à constituer` : variantes grecques et latines de Josué 9 ; philologie des
  leçons grecques ; version faite sur l’hébreu ; renvoi interne à une
  explication ultérieure ; autorité et additions des Septante ; et
  identification textuelle du passage grec attribué à Josué 19,47.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-josue-q11-q20.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  cinq pages, voisins, partition exhaustive, témoins, doublons,
  préconditions des corrections, sauvegarde ciblée, transaction et
  postcontrôles préparés.
- Manifeste : 47 segments ; 175 liens proposés — type 1 : 60 ; type 2 : 9 ;
  type 3 : 99 ; type 4 : 7 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 753 / 3 262 = 84,40 %**. Après
  écriture ultérieure de ce lot : **2 800 / 3 262 = 85,84 %** (gain de
  47 segments, soit 1,44 point).

## Préparation de Juges XI à XX — contrôle sans écriture

### Bornes, lecture et numérotations anciennes

- Les Questions XI à XX occupent exactement les segments 2925-2972, soit
  48 segments continus du Livre septième. La Question X se termine en 2924
  et la Question XXI commence en 2973 ; les deux raccords sont contrôlés.
- Les fac-similés `p575.jpg` à `p578.jpg`, pages imprimées 567 à 570, ont été
  lus et verrouillés par leur SHA-256. Les 37 cibles bibliques distinctes
  possèdent toutes au moins un témoin local dans `versets_lecture`.
- La note 809 attribue à `Josué XIX,48 selon les Septante` le refoulement des
  fils de Dan dans la montagne. Le verset local `JOS.19.48` ne porte que la
  conclusion du partage de Dan ; le contenu cité est reconnu en `JDG.1.34`.
  La tradition grecque est en outre conservée sans cible, type 4.
- La Question XVII imprime en rubrique `Juges 2,10,23 ; 3,1,4`, mais son
  premier lemme sur Israël vendu aux ennemis est `JDG.2.14`. Les citations
  suivantes sont suivies selon leur contenu sur `JDG.2.20-23` et
  `JDG.3.1-4`, sans propagation mécanique de la rubrique.
- Le segment 2962 attribue verbalement au Deutéronome la promesse de chasser
  les nations progressivement. Sa note et les trois témoins locaux
  l’identifient à `EXO.23.29-30`. L’erreur imprimée est conservée dans le
  texte ; seules les cibles suivent le passage effectif.

### Corrections, références sans cible et règle *sic*

- Les fac-similés prouvent trois corrections du corps : `Navéa laissées`
  devient `Navé a laissées` au segment 2951 ; l’espace insécable avant le
  deux-points est rétablie après `<i>Il les sauva</i>` au segment 2969 ; la
  question italique du segment 2971 reçoit l’espace fine avant `?` et le
  demi-cadratin imprimé.
- Deux notes sont restaurées sous précondition exacte : la virgule de
  `Ib. XIX, 48, selon les Sept.` au segment 2925 et l’ancienne désignation
  `I Rois, VI, 5, 16.` au segment 2958. Les corrections sont préparées dans
  la base et `segments-candidate.json` ; celles du corps sont aussi
  synchronisables dans l’unique `source_clean` englobant de
  `source-map.json`.
- Aucune coquille orthographique imprimée certaine n’apparaît dans ce lot et
  aucun `[<i>sic</i>]` n’est ajouté. La forme imprimée « les Astarté » est
  conservée : elle peut fonctionner comme nom propre collectif et ne reçoit
  pas de marque automatique.
- Cinq références non bibliques restent sans cible, type 4,
  `à constituer` : tradition des Septante sur Josué XIX,48 ; lexicographie
  punique ; variantes grecques et latines d’Astarté ; version faite sur
  l’hébreu ; et comparaison historique avec Numa Pompilius.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-juges-q11-q20.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  quatre pages, voisins, partition exhaustive, témoins, doublons, sondage
  déterministe réparti par question, préconditions de correction, sauvegarde
  ciblée, transaction et postcontrôles préparés.
- Manifeste : 48 segments ; 157 liens proposés — type 1 : 42 ; type 3 :
  110 ; type 4 : 5 sans cible `à constituer`. Aucun segment n’est sans lien.
- Aucun écrit en base ni dans les candidats par cette passe. Après les
  écritures concurrentes d’autres lots, avancement live :
  **2 924 / 3 262 = 89,64 %**. Après écriture ultérieure de ce seul lot :
  **2 972 / 3 262 = 91,11 %** (gain de 48 segments, soit 1,47 point). Les
  lots antérieurs de Juges restent distincts et leur état n’est pas déduit
  de leur seule position dans l’œuvre.

## Préparation de Juges XLI à XLVIII — contrôle sans écriture

### Bornes, lecture et anciennes numérotations

- Les Questions XLI à XLVIII occupent exactement les segments 3036-3091,
  soit 56 segments continus du Livre septième. La Question XL se termine en
  3035 et la Question XLIX commence en 3092 ; les raccords sont contrôlés.
- Les fac-similés `p583.jpg` à `p586.jpg` ont été relus et verrouillés par
  leur SHA-256. Les 25 cibles bibliques distinctes possèdent toutes au moins
  un témoin local dans `TR0001`, `TR0003` ou `TR0004`.
- La demande « Envoyez votre lumière » de la note Psaume 42,3 est confirmée
  directement en `PSA.42.3`. La comparaison du matin de la Résurrection
  distingue bien `MRK.16.2`, où le soleil est levé, de `JHN.20.1`, où les
  ténèbres subsistent encore.
- La leçon angélique des Septante à Deutéronome 32,8 est distinguée du texte
  des témoins locaux : le lien biblique reste `DEU.32.8`, et la variante
  grecque sur les anges préposés aux nations est consignée séparément sans
  cible de version.
- Les paraphrases non référencées de la lumière primitive et des luminaires
  du quatrième jour sont reconnues par lecture en `GEN.1.3`, `GEN.1.14`,
  `GEN.1.16` et `GEN.1.19`, en type 2.

### Corrections, philologie et règle *sic*

- `p583.jpg` confirme la question italique du segment 3036. L’espace fine
  insécable avant le point d’interrogation et le demi-cadratin sont préparés
  sous préconditions distinctes pour la base, `segments-candidate.json` et
  l’unique `source_clean` englobant de `source-map.json`.
- La virgule finale fautive de la note `[[836]] 1Sa. II, 18,` au segment
  3039 devient un point. La correction est préparée dans la base et le champ
  `notes` du candidat, seulement en mode `--write`.
- Quinze références non bibliques ou de tradition textuelle restent sans
  cible, type 4, `à constituer` : terminologie grecque, latine et hébraïque
  de l’éphod ; variantes sur Juges 9,23 et 9,33 ; version hébraïque de
  Juges 10,1 ; traductions de Juges 11,24 ; et leçon grecque de
  Deutéronome 32,8. Tous les motifs portent le préfixe contrôlé, la
  provenance `lecture` et l’arbitrage requis.
- Aucune coquille orthographique imprimée certaine n’est présente dans ces
  quatre pages. Aucun `[<i>sic</i>]` n’est ajouté ; les variantes de syntaxe,
  de ponctuation, de traduction ou de nombre ne reçoivent pas ce marqueur.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-juges-q41-q48.mjs` ; mode par
  défaut sans écriture, empreinte stricte, hash de la charte et des quatre
  pages, voisins, partition exhaustive, témoins, doublons, sondage
  déterministe par question, corrections synchronisables, sauvegarde,
  transaction et postcontrôles préparés.
- Manifeste : 56 segments ; 125 liens proposés — type 1 : 25 ; type 2 : 4 ;
  type 3 : 81 ; type 4 : 15 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Après les écritures concurrentes
  des lots antérieurs, avancement live : **2 995 / 3 262 = 91,81 %**. Après
  écriture ultérieure de ce seul lot : **3 051 / 3 262 = 93,53 %** (gain de
  56 segments, soit 1,72 point). Si le lot intermédiaire XXXI-XL est écrit
  auparavant, la borne continue atteindra alors 3091.

## Préparation de Juges I à X — contrôle sans écriture

### Bornes, lecture et anciennes numérotations

- Les Questions I à X occupent exactement les segments 2883-2924, soit
  42 segments continus du Livre septième. Le raccord amont avec Josué XXX
  en 2882 et le raccord aval avec Juges XI en 2925 ont été contrôlés.
- Les fac-similés `p573.jpg` à `p575.jpg`, pages imprimées 565 à 567, ont été
  lus et verrouillés par leur SHA-256. Les 34 cibles bibliques distinctes
  possèdent toutes au moins un témoin local dans `TR0001`, `TR0003` ou
  `TR0004`.
- La note 807 imprime `Jos. I, 63 ; 18, 28`. Son premier renvoi vise
  sémantiquement `JOS.15.63`, qui traite précisément des Jébuséens demeurant
  à Jérusalem avec Juda ; le texte de la note est conservé sans correction.
- La note 808 imprime `Jos. XVII, 18`, tandis que la corvée imposée aux
  Chananéens sans expulsion complète correspond au témoin local
  `JOS.17.13`. La cible suit le contenu, conformément à la règle des
  anciennes numérotations, sans modifier ni marquer la note imprimée.
- La formulation grecque citée à Juges 1,18 affirme que Juda ne posséda pas
  Gaza, Ascalon et Azoth, contrairement au crénelage hébreu du témoin local.
  Le lien reste `JDG.1.18`, avec un motif signalant la tradition textuelle.

### Corrections, références sans cible et règle *sic*

- Quatre espaces OCR séparant les appels `[[802]]`, `[[803]]`, `[[804]]` et
  `[[807]]` de leur mot-ancre sont supprimés. L’espace française manquant
  avant le point d’interrogation du titre de la Question VIII est rétabli.
  Les cinq corrections sont prouvées par les fac-similés, soumises à des
  préconditions exactes et synchronisables dans `segments-candidate.json`
  et dans l’unique `source_clean` correspondant de `source-map.json`.
- Quatre références non bibliques restent sans cible, type 4,
  `à constituer` : le renvoi interne à Josué XXI, l’identification de Bethsan
  à Scythopolis, la comparaison avec la fondation d’Alexandrie et le récit
  profane de la domination scythe sur l’Asie.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. Les anomalies de numéro, de ponctuation ou de
  tradition textuelle ne reçoivent pas ce marqueur.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-juges-q1-q10.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  trois pages, voisins, partition exhaustive, témoins, doublons,
  préconditions des corrections, sauvegarde ciblée, transaction et
  postcontrôles préparés.
- Manifeste : 42 segments ; 85 liens proposés — type 1 : 31 ; type 2 : 7 ;
  type 3 : 43 ; type 4 : 4 sans cible `à constituer`. Aucun segment n’est
  sans lien.
- Aucun écrit en base ni dans les candidats. Avancement live :
  **2 800 / 3 262 = 85,84 %**. Après écriture ultérieure de ce lot :
  **2 842 / 3 262 = 87,12 %** (gain de 42 segments, soit 1,29 point).

## Préparation de Juges XXI à XXX — contrôle sans écriture

### Bornes, lecture et traditions textuelles

- Les Questions XXI à XXX occupent exactement les segments 2973-2995, soit
  23 segments continus du Livre septième. Les raccords avec la Question XX
  en 2972 et la Question XXXI en 2996 ont été contrôlés.
- Les fac-similés `p579.jpg` et `p580.jpg`, pages imprimées 571 et 572, ont
  été lus et verrouillés par leur SHA-256. Les 15 cibles bibliques distinctes
  possèdent toutes au moins un témoin local dans `TR0001`, `TR0003` ou
  `TR0004`.
- La Question XXI confronte la leçon grecque où Églon est dit « extrêmement
  grêle » à la leçon hébraïque où il est très gras. Les deux formulations
  visent bien `JDG.3.17`; la graisse refermée sur la blessure relève de
  `JDG.3.22`. La contradiction apparente est le sujet du commentaire, non
  une coquille à corriger.
- La Question XXVI développe une expansion grecque de `JDG.4.8` sur le jour
  où le Seigneur favorise son ange avec Barac. Le témoin hébraïque local ne
  conserve que le refus de Barac de partir sans Débora. Le lien biblique
  suit le verset commenté et la tradition textuelle est consignée sans cible.
- Les Questions XXIX et XXX commentent une leçon grecque de `JDG.5.8` qui
  compare les dieux nouveaux à un pain d’orge, expansion absente du témoin
  hébraïque local. Le mouvement du cantique reste confronté à `JDG.5.7-8`.

### Corrections, références sans cible et règle *sic*

- Quatre corrections du corps sont prouvées par le fac-similé : espace avant
  le point-virgule après *abondance* et recollement de l’appel `[[817]]` au
  segment 2974 ; espace avant le point d’interrogation au segment 2981 ;
  deux-points manquant après « ne le lui révèle pas » au segment 2984.
- La note 817 est restaurée selon l’imprimé :
  `III Rois, XXI. 10, 13.` au lieu de la forme normalisée et incomplète
  `1Ro. XXI. 10,13.`. Les corrections du corps sont synchronisables dans
  `segments-candidate.json` et dans l’unique `source_clean` correspondant de
  `source-map.json`; la note est synchronisable dans le candidat.
- Six références non bibliques restent sans cible, type 4, `à constituer` :
  comparaison Septante/Vulgate sur Églon ; paix de Numa Pompilius ; usage
  linguistique égyptien ; comparaison Septante/hébreu sur Samgar ; expansion
  grecque sur l’ange de Barac ; comparaison grecque des dieux au pain d’orge.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. Les singularités grammaticales, les
  antiphrases et les variantes textuelles n’emploient pas ce marqueur.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-juges-q21-q30.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  deux pages, voisins, partition exhaustive, témoins, doublons, sondage
  déterministe d’un lien par question, préconditions des corrections,
  sauvegarde ciblée, transaction et postcontrôles préparés.
- Manifeste : 23 segments ; 45 liens proposés, dont 39 bibliques. Répartition :
  type 1 : 14 ; type 2 : 2 ; type 3 : 23 ; type 4 : 6 sans cible
  `à constituer`. Aucun segment n’est sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **2 972 / 3 262 = 91,11 %**.
  Après écriture ultérieure de ce lot : **2 995 / 3 262 = 91,81 %**
  (gain de 23 segments, soit 0,71 point).

## Préparation de Juges XLIX, sous-passe A — contrôle sans écriture

### Bornes, contexte et lecture doctrinale

- La sous-passe A de la Question XLIX occupe exactement les segments
  3092-3159, soit 68 segments continus couvrant les paragraphes 1 à 15.
  Le contexte amont 3086-3091, Question XLVIII, et le contexte aval
  3160-3164, suite des paragraphes 15-16 de la Question XLIX, ont été lus.
- Les fac-similés `p586.jpg` à `p591.jpg`, pages imprimées 578 à 583, ont été
  lus et verrouillés par leur SHA-256. Les 63 cibles bibliques distinctes
  possèdent toutes au moins un témoin local dans `versets_lecture`.
- Le commentaire articule le vœu de Jephté en Juges 11,29-40 avec quatre
  ensembles : l’interdiction des sacrifices humains en Exode 13 et
  Deutéronome 12 ; l’obéissance d’Abraham en Genèse 22 et Hébreux 11 ;
  les fautes et signes prophétiques de Gédéon ; enfin l’action de l’Esprit
  par Saül et Caïphe. Les paraphrases sont liées selon leur fonction dans
  l’argument, même lorsque le vocabulaire local est peu répétitif.
- La note 854 imprime `Jug. VI, 31`, mais la formule « l’Esprit du Seigneur
  fortifia Gédéon » correspond sémantiquement à `JDG.6.34`. La note est
  conservée et la cible suit le texte reconnu.
- La note 856 imprime Juges 6,39 et vise bien la seconde épreuve de la
  toison. Les deux signes décrits dans le commentaire sont confrontés à
  `JDG.6.37-40`; aucune conversion mécanique de la seule note n’est utilisée.

### Corrections, notes et règle *sic*

- Le fac-similé prouve que le paragraphe 9 a été transcrit à tort
  `6. [<i>sic</i>]` au segment 3127. La correction préparée rétablit `9.` et
  supprime ce *sic* parasite. Il ne s’agit pas d’une coquille imprimée.
- Trois appels de notes sont recollés à leur ancre : `[[845]]`, `[[853]]`
  et `[[854]]`. Huit notes sont restaurées selon l’imprimé, notamment
  `Hebr. XI, 17-19.` en 3112, `Ib. XXXVIII, 15.` en 3119 et
  `Hebr. XI, 32.` en 3124. Ces corrections ont des préconditions exactes ;
  le corps est synchronisable dans `segments-candidate.json` et l’unique
  `source_clean` correspondant, les notes dans le candidat.
- La correction de `Ib. XXXV, 2, 15` en `Ib. XXXVIII, 15.` restaure le récit
  de Juda prenant Thamar pour une prostituée. La cible vérifiée est
  `GEN.38.15`, complétée par les reprises narratives de `GEN.38.16` et 18.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. La numérotation fautive issue de l’OCR est
  corrigée sans employer le marqueur réservé aux coquilles de l’imprimé.
- Une seule référence non biblique reste sans cible, type 4, `à constituer` :
  le renvoi explicite au livre I, chapitre 21 de la *Cité de Dieu*.

### État du dry-run

- Script : `scripts/heptateuque/attribue-liens-juges-q49-a.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  six pages, contrôle du contexte élargi, partition exhaustive, témoins,
  doublons, sondage déterministe d’un lien par paragraphe, préconditions des
  corrections, sauvegarde ciblée, transaction et postcontrôles préparés.
- Manifeste : 68 segments ; 174 liens proposés, dont 173 bibliques.
  Répartition : type 1 : 51 ; type 2 : 15 ; type 3 : 107 ; type 4 : 1 sans
  cible `à constituer`. Aucun segment n’est sans lien.
- Aucun écrit en base ni dans les candidats. Après progression concurrente
  des lots précédents, avancement live : **3 091 / 3 262 = 94,76 %**.
  Après écriture ultérieure de cette sous-passe :
  **3 159 / 3 262 = 96,84 %** (gain de 68 segments, soit 2,08 points).
## Préparation de Juges XXXI à XL — contrôle sans écriture

### Bornes, lecture et anciennes numérotations

- Les Questions XXXI à XL occupent exactement les segments 2996-3035, soit
  40 segments continus du Livre septième. Le raccord amont avec Juges XXX
  en 2995 et le raccord aval avec Juges XLI en 3036 ont été contrôlés.
- Les fac-similés `p580.jpg` à `p583.jpg`, pages imprimées 572 à 575, ont été
  lus et verrouillés par leur SHA-256. Les 69 cibles retenues possèdent
  toutes au moins un témoin local dans `TR0001`, `TR0003` ou `TR0004`.
- La note `Ib. III, 4-15` suit l’ancienne numérotation des livres des Rois :
  son contenu (sacrifice de Salomon à Gabaon puis révélation divine) vise
  `1KI.3.4-15`. La note `Nom. XX, 2` est conservée, mais le contenu relatif à
  l’eau jaillie du rocher frappé porte également le lien aux versets locaux
  `NUM.20.7-11`, conformément à la priorité donnée au texte reconnu.
- `I Rois, XXIV, 15` vise bien `1SA.24.15`, dont le témoin local contient
  l’abaissement de David comme « chien mort ». Les variantes des cinquante
  sentinelles restent rattachées à `JDG.7.11`, malgré l’absence de ce détail
  dans le témoin local, car la question porte explicitement sur les versions
  de ce verset.

### Corrections, conformité typographique et règle *sic*

- Le fac-similé prouve quatre corrections préparées : espace fine avant le
  point d’interrogation et cadratin dans l’attaque de la Question XXXIV ;
  `offrit` devient `offrît` dans le titre de la Question XXXVI ; la note 829
  devient `Rom. II, 9, 10` au lieu de l’OCR `Rom. II, 9, 30` ; la note 833
  devient `1Co. I, 28` au lieu de l’OCR `2Co. I, 28`. Les corrections sont
  soumises à des préconditions exactes et synchronisables dans
  `segments-candidate.json` ; la correction du corps l’est aussi dans
  l’unique `source_clean` englobant de `source-map.json`.
- La virgule imprimée dans « Le glaive du Seigneur, est à Gédéon » est
  conservée fidèlement. Les références imprimées abrégées ou fautives ne
  reçoivent pas de marque *sic*.
- Aucune coquille orthographique imprimée certaine n’a été trouvée et aucun
  `[<i>sic</i>]` n’est ajouté. Les quatre corrections ci-dessus réparent des
  erreurs OCR démontrées par l’image, non le texte de l’édition.

### État du dry-run

- Export de lecture :
  `scripts/heptateuque/audit-reprise/liens-juges-q31-q40-lecture.json`.
  Script : `scripts/heptateuque/attribue-liens-juges-q31-q40.mjs` ; mode par
  défaut sans écriture, empreinte SHA-256 stricte, hash de la charte et des
  quatre pages, voisins, partition exhaustive, témoins, doublons, sondage
  déterministe réparti par question, préconditions de correction, sauvegarde
  ciblée, transaction et postcontrôles préparés.
- Manifeste : 40 segments ; 174 liens proposés — type 1 : 71 ; type 2 : 2 ;
  type 3 : 101. Aucun segment n’est sans lien et aucune référence sans cible
  n’est forcée.
- Aucun écrit en base ni dans les candidats par cette passe. Avancement live
  au dernier contrôle : **2 995 / 3 262 = 91,81 %**. Après écriture
  ultérieure de ce seul lot : **3 035 / 3 262 = 93,04 %** (gain de 40
  segments, soit 1,23 point).

## Préparation de Juges L à LVI et du colophon final — contrôle sans écriture

### Bornes, contexte et segment hors question

- Le lot occupe exactement les segments 3228-3262, soit 35 segments. Le
  contexte amont 3223-3227, encore rattaché à la Question XLIX, a été lu pour
  contrôler la rupture ; les Questions L à LVI couvrent 3228-3261.
- Le segment 3262 possède volontairement `ref_niv2 = null` et reproduit le
  colophon imprimé : « Cette traduction est l’œuvre de M. l’abbé POGNON. »
  Il est explicitement classé **relu sans lien**, avec un motif éditorial. Il
  ne doit ni être oublié ni être rattaché artificiellement à la Question LVI.
- Les fac-similés `p594.jpg` à `p597.jpg`, pages imprimées 586 à 589, ont été
  lus et verrouillés par SHA-256. Les 36 cibles bibliques retenues possèdent
  toutes au moins un témoin local.

### Anciennes numérotations et étendues

- La note `Is. IX, 6` est conservée sans correction, mais son contenu « Ange
  du grand conseil » / enfant nommé Conseiller correspond au témoin local
  `ISA.9.5`. La cible suit le texte reconnu, non une conversion aveugle.
- Le fac-similé imprime `III Rois, II, 29`, et non `II Rois`. Le récit où
  Salomon envoie Banaïas frapper Joab correspond exactement à `1KI.2.29` ;
  l’OCR de la note 900 est donc corrigible avec preuve.
- Les plages `Deut. XIV, 3-19` et `Nomb. VI, 2-21` ne sont pas propagées
  mécaniquement. Pour le Deutéronome, seuls les versets qui portent réellement
  l’interdiction des animaux impurs sont retenus ; pour Nombres 6, seuls le
  vœu, l’interdiction du vin et du rasoir, l’accomplissement de la durée et la
  fin du nazaréat mobilisés par le raisonnement sont liés.

### Corrections et règle *sic*

- Quatre corrections typographiques du corps sont préparées aux segments
  3242, 3243, 3247 et 3250 : cadratins de reprise et espaces fines avant les
  points d’interrogation, conformément au fac-similé et à la charte. La note
  900 du segment 3259 devient `III Rois, II, 29.`. Chaque mutation possède une
  précondition exacte et est synchronisable dans `segments-candidate.json` ;
  les corrections du corps le sont aussi dans l’unique `source_clean`.
- Les graphies ou constructions anciennes, la ponctuation interrogative
  imprimée et les anomalies de référence ne reçoivent pas automatiquement de
  *sic*. Aucune coquille orthographique imprimée certaine nouvelle n’a été
  démontrée ; aucun `[<i>sic</i>]` n’est ajouté.

### État du dry-run

- Export :
  `scripts/heptateuque/audit-reprise/liens-juges-q50-q56-fin-lecture.json`.
  Script : `scripts/heptateuque/attribue-liens-juges-q50-q56-fin.mjs`, sans
  écriture par défaut, avec empreinte stricte, preuves fac-similé, partition
  exhaustive incluant le colophon, témoins, doublons, sondage par question,
  sauvegarde, transaction et postcontrôles préparés.
- Manifeste : 35 segments ; 132 liens proposés — type 1 : 53 ; type 3 : 79.
  Les segments 3228-3261 possèdent au moins un lien ; le segment 3262 est le
  seul segment sans lien, par classification éditoriale explicite.
- Aucun écrit en base ni dans les candidats. Après les écritures concurrentes
  d’autres lots, avancement live au dernier contrôle :
  **3 159 / 3 262 = 96,84 %**. Après écriture ultérieure de ce seul lot :
  **3 194 / 3 262 = 97,92 %** (gain de 35 segments, soit 1,07 point).

## Préparation de Juges XLIX-B — contrôle sans écriture

- Sous-passe continue : segments 3160-3227, soit 68 segments de la Question
  XLIX. Contexte relu sur 3155-3159 et 3228-3233 ; raccord aval confirmé avec
  les Questions L et LI. Les fac-similés `p591.jpg` à `p595.jpg` sont
  verrouillés par SHA-256, comme la charte.
- Lecture exhaustive : 312 liens proposés, dont 307 liens bibliques (type 1 :
  60 ; type 2 : 4 ; type 3 : 243) et 5 références philologiques sans cible
  (type 4, `à constituer`, arbitrage requis). Les 92 cibles bibliques distinctes
  existent et possèdent au moins un témoin local ; aucun segment n'est laissé
  sans classification.
- Anciennes références arbitrées selon leur contenu : `Éphés. V, 21` mène à
  `EPH.5.23` (Christ tête de l'Église) ; `II Cor. X, 1, 2` mène à `2CO.11.2`
  (vierge chaste). L'OCR `Ib. XV.` est corrigé en `Ib. 15.` et mène à
  `MAT.9.15`.
- Règle *sic* : le fac-similé de la page 586 prouve que le numéro de
  subdivision `27.` est imprimé normalement. Le `[<i>sic</i>]` numérique
  hérité au segment 3209 est donc retiré ; aucun nouveau *sic* n'est ajouté,
  faute de coquille orthographique imprimée certaine. Cette correction est
  synchronisée dans le segment candidat et l'unique `source_clean` englobant.
- Script : `scripts/heptateuque/attribue-liens-juges-q49-b.mjs`, dry-run réussi,
  empreinte stricte
  `a1ae9b517cef03225fbb8e970b0b629997a2aae53a48d03edb213b02e5ac2348`,
  transaction, sauvegarde ciblée et postcontrôles préparés. Aucun écrit en base
  ni dans les candidats. Avancement live : **3 091 / 3 262 = 94,76 %**.
  Après écriture ultérieure de ce seul lot : **3 159 / 3 262 = 96,84 %**
  (gain de 68 segments, soit 2,08 points). Si la sous-passe XLIX-A est écrite
  auparavant, la continuité atteindra 3 227 / 3 262, soit **98,93 %**.

## Clôture générale de l’attribution des liens

- Toutes les passes préparées ci-dessus ont été écrites, contrôlées et
  auditées. L’Heptateuque compte désormais **3 262 / 3 262 segments relus**,
  soit **100,00 %**.
- Total : **9 606 liens** — type 1 : 2 941 ; type 2 : 159 ; type 3 : 6 265 ;
  type 4 : 241.
- Répartition par livre : Genèse 1 824 ; Exode 2 665 ; Lévitique 1 257 ;
  Nombres 1 064 ; Deutéronome 983 ; Josué 609 ; Juges 1 204.
- L’audit intégral a dû être paginé à la fois sur les segments, les résultats
  et les listes d’identifiants PostgREST. Il conclut à : zéro doublon, zéro
  cible invalide, zéro motif vide et zéro arbitrage inattendu.
- Les **156 références sans cible** sont toutes explicitement qualifiées
  `à constituer`, avec provenance `lecture` et arbitrage requis. Aucun lien
  cible n’utilise cette fiabilité.
- Seize segments sont légitimement sans lien : les liminaires 1-5, 64-65,
  94 ; les transitions 1296, 1396, 1397, 1406, 1593, 1633, 1655 ; et le
  colophon éditorial 3262. Les deux alertes mécaniques 1406 et 1633 ont été
  relues manuellement et ne contiennent pas de référence biblique.
- Contrôle typographique final : aucune occurrence brute `[sic]`, **100
  segments portant `[<i>sic</i>]`**, et aucun déséquilibre des balises `<i>`.
  Les faux *sic* introduits par l’OCR ou attachés à des anomalies numériques
  ont été retirés ; les coquilles orthographiques attestées au fac-similé ont
  été conservées selon la nouvelle règle.
- Les fichiers candidats ont le même effectif que la base (3 262 segments) et
  aucune différence de segmentation. Les 120 groupes textuels encore
  signalés par l’ancien audit d’alignement sont des normalisations
  typographiques préexistantes (cadratins, espaces françaises, apostrophes),
  non des corrections de cette campagne restées désynchronisées.

### État final

- **Avancement : 3 262 / 3 262 = 100,00 %.**
- Livre des Juges : 380 / 380 segments, 1 204 liens ; seul le colophon final
  est sans lien.

## Suites possibles, non comprises dans la clôture des liens

1. Effectuer un contrôle visuel final dans l’application sur un échantillon
   de chaque livre, en vérifiant simultanément le clic des liens, les niveaux
   de titre, les notes et l’affichage de `[<i>sic</i>]`.
2. Régénérer le Word maître placé dans « Nuages » : le document antérieur à
   cette campagne ne contient pas nécessairement toutes les corrections OCR
   et typographiques appliquées lors des passes de liens.
3. Traiter, dans une campagne distincte, les 156 références `à constituer`.
   Elles sont volontairement conservées sans fausse cible et ne constituent
   pas une dette de l’attribution biblique achevée.
4. Arbitrer les 120 groupes d’écarts typographiques préexistants entre la
   base et les candidats. Les effectifs et la segmentation sont identiques ;
   ces écarts ne doivent pas être résolus par remplacement global sans
   validation éditoriale.
5. Vérifier la publication effective de la notice et régénérer les exports
   finaux après décision sur les points 2 et 4.

## Contre-audit des segments sans lien — sans écriture

- Une relecture systématique avec contexte ±3 et témoins locaux confirme comme
  sans lien légitime 1296 (préface méthodologique), 1396 (transition trop
  indéterminée), 1593 (observation externe sur une ignorance) et 3262
  (colophon éditorial).
- L’application plus stricte du §25.7 révèle en revanche sept liens de type 3
  omis sur quatre segments : 1397 → `EXO.26.12` ; 1406 → `EXO.26.12` et
  `EXO.26.13` ; 1633 → `LEV.8.28` et `LEV.8.29` ; 1655 → `EXO.27.1` et
  `EXO.20.26`.
- Ces omissions sont anaphoriques ou logiques : le segment ne répète pas les
  mots du verset, mais poursuit une interprétation dont la cible est précise
  dans le contexte immédiat. Aucun écrit n’a été effectué. Rapport détaillé :
  `audit-reprise/audit-segments-sans-liens-2026-08-02.md`.

## Audit ciblé des premiers segments déclarés sans lien — sans écriture

- Périmètre relu avec au moins trois voisins de contexte : 1-5, 64-65 et 94.
  Les textes, notes, rubriques, natures et liens voisins ont été relus depuis
  la base ; la charte et `feedback_liens_protocole` ont été repris.
- Les segments 1-5 restent légitimement sans lien : préface méthodologique
  générale, sans passage biblique déterminé. La mention générique de la version
  des Septante au segment 1 ne fournit ni locus ni variante précise et ne doit
  pas être forcée en lien externe.
- Le segment 64 reste sans lien : conclusion méthodologique générale qui
  n'ajoute aucun contenu à l'exégèse de Genèse 11,26.
- Le segment 65 avait été classé trop vite comme pure transition. « Le récit de
  saint Étienne » est une référence biblique intentionnelle et déterminée par
  la démonstration continue des segments 66-68 : `ACT.7.2`, `ACT.7.3` et
  `ACT.7.4`. Les trois témoins locaux confirment l'apparition en Mésopotamie,
  l'ordre de partir et le transfert après la mort du père. Trois liens de type
  1, vérifiés, sont donc à ajouter ; aucun type 3 au segment 65, qui annonce la
  comparaison sans encore la développer.
- Le segment 94 n'est pas vide : « il faut voir comment Agellius dit ces
  choses » est un renvoi bibliographique explicite au récit d'Aulu-Gelle déjà
  nommé au segment 91 et documenté par la note 14 au segment 92. Il appelle un
  type 4 sans cible, fiabilité `à constituer`, provenance `lecture`, arbitrage
  requis, avec motif contrôlé `RÉFÉRENCE NON BIBLIQUE (source antique) : renvoi
  explicite à Aulu-Gelle, Nuits attiques, livre XIX, pour la discussion
  stoïcienne des émotions premières du sage ; cible de corpus à constituer.`
- Aucun écrit en base. Avancement inchangé : **3 262 / 3 262 = 100,00 %**.
  L'audit révèle quatre liens omis sur deux segments, sans remettre en cause le
  marquage de relecture des huit segments.

## Application du contre-audit et passe aléatoire reproductible

- Les omissions certaines des deux contre-audits ont été appliquées : onze
  liens ajoutés sur les segments 65, 94, 1397, 1406, 1633 et 1655.
- Les dix segments encore sans lien ont été systématiquement contrôlés et sont
  justifiés : 1-5, 64, 1296, 1396, 1593 et 3262.
- Une passe aléatoire reproductible de 42 segments, six par livre, a ensuite
  été relue humainement. Elle a conduit à 21 ajouts, 5 suppressions, 1
  retypage, 7 précisions de motif, 5 corrections de texte et 1 correction de
  note. Trois cas seulement probables ont été laissés inchangés.
- Audit intégral final : **9 633 liens** — type 1 : 2 959 ; type 2 : 159 ;
  type 3 : 6 274 ; type 4 : 241. Les 157 liens sans cible sont tous `à
  constituer`. Aucun doublon, aucune cible invalide, aucun motif vide, aucun
  arbitrage inattendu.
- Contrôle *sic* : 115 occurrences `[<i>sic</i>]` dans 110 segments, aucune
  forme brute `[sic]`, aucune balise italique déséquilibrée.
- Base et candidats conservent 3 262 segments chacun, sans différence de
  découpage. L'audit d'alignement signale 118 groupes textuels hérités.
- Rapport : `audit-reprise/CONTROLE-SYSTEMATIQUE-ET-ALEATOIRE-2026-08-02.md`.
- **Avancement : 3 262 / 3 262 = 100,00 %.**
