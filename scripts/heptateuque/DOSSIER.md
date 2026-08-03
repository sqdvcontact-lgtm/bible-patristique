# Dossier de travail — Questions sur l'Heptateuque (Augustin)

Chantier d'import, phase A (texte, structure, notes). **Arrêt avant les liens bibliques** (charte §1.3).

## 1. Identité de l'œuvre
- `id_oeuvre` : **A0010O0023** (déjà présent dans `catalogue_notices`).
- `id_auteur` : **A0010** (Augustin d'Hippone).
- Titre (`oeuvres.titre`) : **Questions sur l'Heptateuque** (*Quaestiones in Heptateuchum*).
- Genre : questions bibliques. Périmètre : **les Questions seules**. Les *Locutions sur l'Heptateuque* (A0010O0022) sont une œuvre distincte, **hors périmètre**.

## 2. Édition transcrite (source de vérité = le fac-similé)
- *Œuvres complètes de saint Augustin*, sous la dir. de Poujoulat / **Raulx**, **tome IV**.
- Traducteur : **abbé Pognon**. Éditeur : **L. Guérin & Cie**, **Bar-le-Duc**, **1866**.
- Fac-similé de contrôle :
  - archive.org (numérisation University of Toronto) : `oeuvrescomplt04augu`
  - DjVu Wikimedia Commons (aligné page à page avec Wikisource), 672 p.

## 3. Cartographie du fac-similé (pages du scan tome IV.djvu)
| Livre | Page Wikisource | Pages scan | ~p. |
|---|---|---|---|
| Genèse | Questions sur la Genèse (Augustin) | 383–419 | 37 |
| Exode | Questions sur l'exode. | 419–477 | 59 |
| Lévitique | Questions sur le Lévitique (Augustin) | 478–512 | 35 |
| Nombres | Question sur les Nombres (Augustin) | 512–537 | 26 |
| Deutéronome | Question sur le Deutéronome (Augustin) | 537–559 | 23 |
| Josué | Questions sur Josué (Augustin) | 559–572 | 14 |
| Juges | Questions sur les Juges (Augustin) | 573–597 | 25 |

Total ≈ **215 pages** (383–597). Sommaire imprimé : p. 660–668 (hors corps, cf. §5.1).

## 4. Sources de transcription (INSTRUMENTS, pas la vérité — charte §2.1)
- **Wikisource** : OCR aligné page à page. **Majoritairement niveau 1 (non corrigé = OCR brut de robot).** Sondage Genèse : p. 383, 388, 398, 403, 408, 413, 419 = niveau 1 ; p. 393 = niveau 3.
- **Abbaye Saint-Benoît** (bibliotheque-monastique.ch/.../augustin/questions/) : `genese.htm` … `juges.htm`. **Même traduction** (incipit identique).

### ⚠️ Constat majeur : les deux sources NE SONT PAS indépendantes
Page 383 : les deux portent « ne doivent pas **eu** conclure » ; le **scan** imprime « **en** conclure ». Elles **partagent la même erreur**.
→ Corollaire : la concordance Wikisource⨉Abbaye **ne prouve pas** la fidélité. Le seul arbitre est le **fac-similé**. La triangulation sert à *pré-remplir* et à *repérer les divergences*, pas à valider.

## 5. Décisions arrêtées
1. **Réfs bibliques de tête de question** (« (Gen. IV, 17.) ») → placées **en sous-titre** (`ref_niv2_texte`), pas en note. Elles jouent le rôle de sous-titre de la question.
2. **Notes de bas de page = seulement les vraies notes de l'édition** (renumérotées **globalement**, en continu). **Texte de l'édition seul** (hyperliens Wikisource écartés).
3. **Réfs et chapitres en romain**, comme imprimé (fidélité au texte d'origine).
4. **Libellés de question** : « Question » + **chiffre romain de l'édition**, uniforme sur toute l'œuvre (« Question I », « Question XVII », « Question CXXXI »…). *(Décision arrêtée 2026-08-01 : l'ordinal en toutes lettres, d'abord envisagé, devient impraticable au-delà de ~30 sur 173 questions.)* Les numéros que l'édition imprime fautivement sont conservés + `[sic]` (cf. §11).
5. **Règle particulière du chantier, confirmée le 2026-08-02 :** toute
   **coquille orthographique certaine réellement imprimée par l’édition est
   conservée**, suivie de **[sic]**, avec le mot « sic » en italique. Les fautes
   d’**OCR** (ex. « eu »→« en ») sont corrigées silencieusement contre le scan.
   Dans les fichiers de correction, `⟦sic⟧` est le marqueur technique qui produit
   « [ » + « sic » en italique + « ] » dans le DOCX. En cas de doute sur le fait
   qu’une forme soit une coquille, conserver la leçon et consigner l’incertitude
   sans ajouter automatiquement `[sic]`.
6. **Pas de marqueurs de page** dans le DOCX.
7. **Titre introductif italique** de la question (« Épouses et concubines. », « Que signifie… ? ») → remonté dans le **titre de niveau 2** (`ref_niv2_texte`, 1re ligne), **tiret parasite retiré** ; la **réf biblique** en 2e ligne (saut de ligne entre les deux). Les deux caractérisent le titre. Corps = discussion seule.

## 6. Structure (charte §6-§7)
- `ref_niv1` = le numéro du livre (« Livre premier » … « Livre septième »).
- `ref_niv1_texte` = son intitulé (« Questions sur la Genèse » … « Questions sur les Juges »), sans tiret parasite ni répétition dans `ref_niv1`.
- Les références de tête dans `ref_niv2_texte` sont développées en français et en chiffres arabes : « Genèse 4, 17 », jamais « Gen. IV, 17. » ni « Ib. ».

**Alerte de régénération (2 août 2026).** La base publiée et sa sauvegarde d’import comptent 3 262 segments. Les DOCX de travail présents produisent désormais 3 250 segments lorsqu’on relance `segment-heptateuque.mjs`. Ne jamais réimporter ce candidat de 3 250 lignes avant d’avoir expliqué et arbitré les douze segments d’écart. La révision d’affichage du 2 août a donc été appliquée directement aux 3 262 identifiants existants, sans suppression ni renumérotation.
- `ref_niv2` = la question (« Première question », « II »…) — **repart à chaque livre**.
- INTRODUCTION de la Genèse → `nature = introduction` (espace de paragraphes propre).
- Commentaire → `nature = texte`. Avertissement/préface éventuel → `nature = apparat_critique` (espace propre).
- `paragraphe` : suit la source si numérotée, sinon séquentiel dans la division ; lacunes non comblées ; jamais fabriqué depuis `segment_numero`.
- `rang` : 1…k par paragraphe ; scission seulement si utile, recomposition exacte.
- `page` = page du scan où commence le segment ; `segment_numero` = ordre global.

## 7. Notes (charte §13)
- Appels `[[n]]` collés au mot annoté (à l'intérieur d'un guillemet fermant).
- Renumérotation **globale et continue** sur toute l'œuvre (pas par livre/colonne) ; numéros du fac-similé ignorés.
- 1 appel ↔ 1 note.

## 8. Journal des dettes / décisions en cours
- « nombres » (p. 383, incipit Genèse) : leçon fautive de l'édition,
  conservée avec `[sic]` conformément à la règle du chantier.
- **Chapitres bibliques : décision close.** Les chiffres romains de l’édition
  sont restaurés ; les chiffres arabes introduits par Wikisource sont écartés.
- Contrôle p. 383 (niv. 1) : « eu »→« en » (faute OCR réelle). p. 390 (niv. 3) : prose propre, mais refs normalisées en arabe.

## 9. Livrable intermédiaire obligatoire : DOCX de relecture
Avant toute segmentation, produire des **DOCX propres reproduisant la structure**
de l'édition (titres = styles Titre 1/2, paragraphes, italiques et notes en bas
de page). Les numéros de notes des DOCX de relecture sont locaux à chaque
livre ; ils seront reconstruits globalement dans l'ordre de lecture pendant la
segmentation. Les pages, paragraphes, rangs, niveaux et `segment_numero` seront
également constitués pendant cette étape à partir des sources paginées. La
relecture contre le fac-similé se fait sur les DOCX ; la segmentation (§11) n'a
lieu qu'après validation.
*(Consigne de l'auteur, absente de la charte au 2026-07-31 — à consigner : cf. §2.2 qui ne traite Word que comme source d'entrée.)*

## 9bis. Pipeline
OCR → contrôle page par page (stratégie D : image sur niveau 1, sondage sur niveau 3/4, règles pour les normalisations systématiques) → **DOCX structure-exacte** → validation auteur → segmentation §11 → import réversible → relecture depuis la base → `catalogue_notices.presence_sur_le_site = true`.

## 10. État

### Avancement du contrôle OCR au fac-similé

Métrique obligatoire à reporter après chaque passe : **pages uniques entièrement
contrôlées au fac-similé / 215 pages du scan (p. 383-597)**. Une page partagée
entre deux livres n’est comptée qu’une fois. Ce pourcentage mesure la relecture
OCR de phase A ; il ne prétend pas mesurer la segmentation, l’import ou la phase B.

**Dernière mise à jour : 2 août 2026 — 215/215 pages = 100 %.**

| Périmètre | État | Pages uniques acquises |
|---|---:|---:|
| Genèse | p. 383-419 contrôlées | 37 |
| Exode | p. 419-477 contrôlées ; p. 419 déjà comptée avec la Genèse | 58 |
| Lévitique | p. 478-512 contrôlées | 35 |
| Nombres | p. 512-537 contrôlées ; p. 512 déjà comptée avec le Lévitique | 25 |
| Deutéronome | p. 537-559 contrôlées ; p. 537 déjà comptée avec les Nombres | 22 |
| Josué | p. 559-572 contrôlées ; p. 559 déjà comptée avec le Deutéronome | 13 |
| Juges | p. 573-597 contrôlées | 25 |
| **Total** | **contrôle OCR intégral p. 383-597 terminé** | **215/215 = 100 %** |

**Reste pour le contrôle OCR page par page : 0 page.** La QA visuelle des DOCX,
la validation éditoriale, la segmentation et l’import restent des phases distinctes.

- [x] Reconnaissance (plages de pages, sources, indépendance testée).
- [x] Niveau de contrôle arrêté : **contrôle image intégral** (voie 1).
- [x] **Genèse contrôlée à l'image, p383-419** (contrôle initial p383-388/394 + 5 agents parallèles p385-419). 173 questions, 121 notes. Livrable : `Genese_draft_v7.docx`.
- [ ] Validation auteur du DOCX Genèse.
- [x] **Exode contrôlé à l’image, p419-477**, y compris p449-454. 177 questions, 241 notes.
- [x] **Lévitique contrôlé à l’image, p478-512.**
- [x] **Nombres contrôlé à l’image, p512-537.**
- [x] **Deutéronome contrôlé à l’image, p537-559.**
- [x] **Josué contrôlé à l’image, p559-572.**
- [x] **Juges contrôlé à l’image, p573-597.**
- [x] **Audit structurel des sept DOCX** : 652 questions, 900 notes, appels
  bijectifs et continus dans chaque livre, 0 résidu de balisage Wikisource.
- [ ] Import réversible (§11) + relecture depuis la base.
- [ ] `catalogue_notices.presence_sur_le_site = true` après import.

## 11. Trouvailles du contrôle image (Genèse)
- **Coquilles d'édition conservées avec [sic]** (vérifiées au fac-similé) : « nombres » (383), « roi d'Egyte » (388), « ou » (385, mot répété), « verai » pour « verserai » (389), « habitans » (392), « longeur » pour « longueur » (403), « le suite » (404), « synedoche »/« successur » (406), « rois est » pour « et » (407), « paassge » (409), « obcure »/« Josehp »/« Lersque » (414-418), dittographie « la la » (396).
- **Numéros de question fautifs dans l'édition elle-même** (fac-similé p409, col. gauche) : la question **131** est imprimée « **CXXI** » (Gen. XL, 16) et la **133** « **CXXX** » (Gen. XLI, 30) — un « X » sauté à l'impression. Rendus « CXXI [sic] » / « CXXX [sic] », discriminés par (libellé + réf) pour ne pas toucher les vrais 121 et 130. **À valider par l'auteur.**
- **Séparateurs de versets** : l'édition imprime souvent « 12, 13 » (virgule = versets distincts) là où l'OCR a mis un intervalle « 12-13 ». Corrigé au cas par cas d'après le scan (pas de règle uniforme : « 6-13 » reste un intervalle réel). **Chapitres non touchés** par les agents (hors périmètre de leur passe).
- **Note ajoutée** (p413, absente de l'OCR, présente à l'édition) : « Ci-dessus, Question CXVII. »
- **Consigne de contrôle** : le détecteur `misses` dans `build-genese.mjs` signale toute correction dont la cible ne matche pas le source (matching tolérant aux sauts de ligne). À reprendre pour chaque livre.

## 12. Trouvailles du contrôle image (Exode)
- **« Id. » pour « Ib. »** : le robot OCR a écrit « Id. » aux **59** renvois où l'édition imprime « Ib. » (*Ibidem*). Vérifié : les 59 sont dans un lien Crampon, aucun « Idem » de prose n'est concerné. Traité par une **règle globale** (NORM) plutôt qu'au cas par cas ; la p472 porte 3 « Ibid » traités avant, en correction ponctuelle.
- **Artefact `##Rem`** du robot (p427, p431, p473), absent du scan : supprimé par règle globale.
- **Numéros de question fautifs dans l'édition** (fac-similé) : la question **131** est imprimée « **XII** » une seconde fois (Ex. V, 1-3 ; l'édition double XII puis saute à XIV) et la **167** « **CLVII** » (Ex. XXXV, 1). Rendus avec `[sic]`, discriminés par (libellé + réf) pour ne pas toucher les vrais XII et CLVII. **À valider par l'auteur.**
- **« CIIL » (p447) est une faute d'OCR**, pas de l'édition : le scan imprime « CIII ». Corrigé silencieusement, sans `[sic]`.
- **§8 de la récapitulation du tabernacle** (p469) : son balisage avait été perdu par l'OCR, restauré. La dernière question (CLXXVII) compte ainsi 23 sous-paragraphes ; ce n'est pas une contamination du Lévitique, la p477 clôt bien l'Exode.
- **Grec : dette close.** Toutes les formes grecques des p419-477 ont été
  confrontées au fac-similé et restaurées, notamment `αὐλήν`, `Π` / `π`
  et `πλάγια`. Les formes latines réellement imprimées (`aulaea`,
  `aula`, etc.) sont conservées.
- **Piège de direction** : une correction d'agent peut viser une leçon que l'OCR porte déjà correctement (« passage du Jourdain »). Le détecteur `misses` l'a signalée, elle a été retirée plutôt qu'appliquée à l'aveugle.

## 13. État consolidé après segmentation et attribution des liens

- [x] Import réversible et segmentation en base : œuvre `A0010O0023`, **3 262
  segments**.
- [x] Relecture sémantique et attribution des liens sur les sept livres :
  **3 262 / 3 262 = 100,00 %**.
- [x] Audit intégral paginé : **9 633 liens**, aucun doublon, aucune cible
  invalide, aucun motif vide, aucun arbitrage inattendu.
- [x] Contrôle des marques *sic* : aucune occurrence brute `[sic]`, 115
  occurrences conformes `[<i>sic</i>]` dans 110 segments, aucune balise
  italique déséquilibrée.
- [x] Contre-audit systématique des segments sans lien puis passe aléatoire
  reproductible de 42 segments : **10 segments sans lien, tous justifiés**.
- [x] Journal d'apprentissage et scripts transactionnels conservés dans
  `scripts/heptateuque/audit-reprise/` et `scripts/heptateuque/`.
- [ ] Contrôle visuel final dans l'interface sur un échantillon de chacun des
  sept livres : liens, niveaux de titre, notes et rendu des *sic*.
- [ ] Régénérer le document Word intégral déposé dans « Nuages » afin qu'il
  incorpore les dernières corrections appliquées pendant l'attribution.
- [ ] Décider séparément du traitement des 157 références `à constituer`
  (commentateurs, traducteurs, autres œuvres et rares citations sans cible).
- [ ] Décider si les 118 groupes d'écarts typographiques préexistants entre
  la base et les candidats doivent être harmonisés. Il n'existe aucune
  différence de segmentation ni de nombre de segments.
- [ ] Vérifier explicitement `catalogue_notices.presence_sur_le_site` avant
  de considérer la publication comme close ; ne pas l'inférer du seul import.
