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
5. **[sic]** (« sic » en italique) après une **erreur certaine de l'édition**, conservée (ex. « un grand nombres [sic] d'autres »). Les fautes d'**OCR** (ex. « eu »→« en ») sont corrigées silencieusement contre le scan.
6. **Pas de marqueurs de page** dans le DOCX.
7. **Titre introductif italique** de la question (« Épouses et concubines. », « Que signifie… ? ») → remonté dans le **titre de niveau 2** (`ref_niv2_texte`, 1re ligne), **tiret parasite retiré** ; la **réf biblique** en 2e ligne (saut de ligne entre les deux). Les deux caractérisent le titre. Corps = discussion seule.

## 6. Structure (charte §6-§7)
- `ref_niv1` = le livre (« Questions sur la Genèse » … « Questions sur les Juges »).
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
- « nombres » (p. 383, incipit Genèse) : leçon de l'édition, conservée telle quelle.
- **Normalisation romain→arabe des chapitres bibliques** : l'édition imprime les chapitres en romain (« Gen. IV, 17 » ; « Ib. XVIII, 13 »), Wikisource a transcrit en arabe (« 4 », « 18 »). Déviation systématique, présente même sur les pages niveau 3. **Décision en attente** : restaurer le romain (fidèle) ou accepter l'arabe. Concerne tous les en-têtes de question (→ notes).
- Contrôle p. 383 (niv. 1) : « eu »→« en » (faute OCR réelle). p. 390 (niv. 3) : prose propre, mais refs normalisées en arabe.

## 9. Livrable intermédiaire obligatoire : DOCX de relecture
Avant toute segmentation, produire un **DOCX propre reproduisant exactement la structure** de l'édition (titres = styles Titre 1/2, paragraphes, italiques/petites capitales/exposants, notes en bas de page renumérotées globalement, marqueurs de page du scan). La relecture contre le fac-similé se fait sur ce DOCX ; la segmentation (§11) n'a lieu qu'après validation.
*(Consigne de l'auteur, absente de la charte au 2026-07-31 — à consigner : cf. §2.2 qui ne traite Word que comme source d'entrée.)*

## 9bis. Pipeline
OCR → contrôle page par page (stratégie D : image sur niveau 1, sondage sur niveau 3/4, règles pour les normalisations systématiques) → **DOCX structure-exacte** → validation auteur → segmentation §11 → import réversible → relecture depuis la base → `catalogue_notices.presence_sur_le_site = true`.

## 10. État
- [x] Reconnaissance (plages de pages, sources, indépendance testée).
- [x] Niveau de contrôle arrêté : **contrôle image intégral** (voie 1).
- [x] **Genèse contrôlée à l'image, p383-419** (contrôle initial p383-388/394 + 5 agents parallèles p385-419). 173 questions, 120 notes. Livrable : `Genese_draft_v6.docx`.
- [ ] Validation auteur du DOCX Genèse.
- [ ] Exode : pipeline prêt (`build-exode.mjs`, 176 q, 240 notes) ; images 419-477 téléchargées ; contrôle image à lancer (agents).
- [ ] Lévitique → Juges (5 livres restants).
- [ ] Import réversible (§11) + relecture depuis la base.
- [ ] `catalogue_notices.presence_sur_le_site = true` après import.

## 11. Trouvailles du contrôle image (Genèse)
- **Coquilles d'édition conservées avec [sic]** (vérifiées au fac-similé) : « nombres » (383), « roi d'Egyte » (388), « ou » (385, mot répété), « verai » pour « verserai » (389), « habitans » (392), « longeur » pour « longueur » (403), « le suite » (404), « synedoche »/« successur » (406), « rois est » pour « et » (407), « paassge » (409), « obcure »/« Josehp »/« Lersque » (414-418), dittographie « la la » (396).
- **Numéros de question fautifs dans l'édition elle-même** (fac-similé p409, col. gauche) : la question **131** est imprimée « **CXXI** » (Gen. XL, 16) et la **133** « **CXXX** » (Gen. XLI, 30) — un « X » sauté à l'impression. Rendus « CXXI [sic] » / « CXXX [sic] », discriminés par (libellé + réf) pour ne pas toucher les vrais 121 et 130. **À valider par l'auteur.**
- **Séparateurs de versets** : l'édition imprime souvent « 12, 13 » (virgule = versets distincts) là où l'OCR a mis un intervalle « 12-13 ». Corrigé au cas par cas d'après le scan (pas de règle uniforme : « 6-13 » reste un intervalle réel). **Chapitres non touchés** par les agents (hors périmètre de leur passe).
- **Note ajoutée** (p413, absente de l'OCR, présente à l'édition) : « Ci-dessus, Question CXVII. »
- **Consigne de contrôle** : le détecteur `misses` dans `build-genese.mjs` signale toute correction dont la cible ne matche pas le source (matching tolérant aux sauts de ligne). À reprendre pour chaque livre.
