# Rapport — structure éditoriale Boèce (instructions GPT du 2026-08-08)

Auteur : La Gueule (Claude). Toute affirmation non testée est marquée **[non vérifié]**.
Garde-fous respectés : suggestions seulement, source (bbox, ocr0) JAMAIS modifiée, aucune lettre
insérée, aucun fragment supprimé, aucun niveau de titre imposé, aucune exclusion de la donnée
source (seulement du corps éditorial), rien activé par défaut, aucun entraînement. Périmètre :
`outils/la-gueule` uniquement.

## État par règle

| § | Règle | État | Fichier | Tests |
|---|---|---|---|---|
| 1 | Modèle commun d'annotation | ✅ fait | `src/structure.mjs` | annotationVide/ROLES |
| 2 | Numéros de page | ✅ fait | structure.mjs | §10 (141) |
| 2 | Signatures | ✅ fait | structure.mjs | §10 (B, 2) |
| 2 | Réclames | ✅ fait | structure.mjs | §7 |
| 2/6 | Titres courants (répétition) | ✅ fait | structure.mjs | §6 |
| 2/5 | Paratexte / ornement / bruit | ⚠️ partiel | structure.mjs | — |
| 3 | Continuations typographiques | ✅ fait | structure.mjs | §10 (douleur, malheur) |
| 4 | Lettrines / artefacts | ✅ fait | structure.mjs | §10 (OY, E!, TI, LI) |
| 4 | Blancs poétiques 3 niveaux | ✅ fait | structure.mjs | §10 (petit/moyen/large) |
| 8 | Suggestions T1/T2 | ✅ fait | structure.mjs | §10 (POESIE→T2, LIVRE→T1) |
| 9 | Orchestration (ordre §9) | ✅ fait | structure.mjs (analyserVolume) | §9 (compo p19) |
| 8 | Propagation : annotations + exclusion du corps confirmé | ✅ fait | structure.mjs (annoterProjet), projet.mjs | §8 |
| 8 | Interface de confirmation (atelier) | ✅ fait | serve.mjs, ui/atelier.html | navigateur (p22) |
| 8 | Classes CSS blancs-poésie côté site / ALTO-PAGE rôles | ⚠️ à finir | — | — |

## Seuils employés (jamais de px absolu pour toute une œuvre)

- **numero_page** : haut < 15 % H ; ou bas > 88 % H ET centré (< 10 % W du centre).
- **signature** : bas > 88 % H, largeur < 10 % W, 1–4 caractères, isolée (blanc au-dessus OU
  décalée > 25 % W de la marge du corps), pas déjà un folio.
- **titre_courant** : dans les 15 % supérieurs ; similarité normalisée ≥ 0,90 (ſ→s pour la
  comparaison seulement) ; ≥ 3 occurrences de même parité (fenêtre 8 pages) OU ≥ 4 dans le volume.
- **reclame** : bas > 85 % H, 1–4 mots, similarité ≥ 0,90 avec le début de la page suivante.
- **lettrine** : score ≥ 3 (premières lignes à droite +2, fragment initial +1, début de bloc +1,
  boîte haute +1). Jamais de restitution de lettre ; `interdit_entrainement = true` sur la ligne.
- **artefact** : fragment de 1–2 capitales en tête d'une ligne non-début (« TI », « LI »).
- **continuation_typographique** : ≥ 3 signaux ET la ligne précédente finit sur un mot-outil
  (« par ma », « au ») ou un tiret — signal décisif qui distingue un rejet d'un vrai vers.
- **blancs poétiques** : `retrait_normalise = (HPOS − marge_bloc) / largeur_bloc`, calculé PAR BLOC ;
  regroupement en 1–3 amas (coupures aux écarts ≥ 0,08), seuils aux milieux des centres ;
  un amas d'une seule ligne = faible confiance. Aucun seuil px codé en dur (test d'invariance
  par translation +500 px).
- **T1/T2** : motif (LIVRE/LIURE → T1 ; PROSE/POESIE → T2) ET géométrie (courte < 0,6 médiane,
  OU centrée < 12 % W, OU isolée par des blancs). Le hors-corps est traité AVANT (un « Livre I »
  de titre courant ne reçoit jamais T1).

## Pages testées et résultats (tests d'acceptation §10)

`test/structure.test.mjs` — **16 tests, 16 réussis** (suite totale : 99). Cas vérifiés sur données
RÉELLES (p19, p22, p143) :

- p19 « OY dont… » → **lettrine_candidate**, aucune insertion de M, `interdit_entrainement` ✓
- p22 « E! Dieu… » → **lettrine_candidate** ; « TI Qui… » → **artefact_candidate** ✓
- p143 « LI Le Createur… » → **artefact_candidate** ; « 141 » → **numero_page** (hors corps) ✓
- p19 « B », « 2 » → **signature** (hors corps) ✓
- p19 poésie : « douleur, », « malheur; » → **continuation_typographique** (blanc null) ;
  « que de ioye, » (précédée d'un vers complet) reste un **vers** ✓
- p19 blancs : x96/101 **petit**, x350/358 **moyen**, x454 **large** ; invariance +500 px ✓
- « POESIE I. » / « II. POESIE. » → **T2** ; « LIVRE I. » → **T1** ;
  « de la Philosophie. Liure I. » (titre courant) → **aucun niveau** ✓
- titre courant répété (même parité) → **titre_courant** ; réclame avec/sans report ✓
- orchestration p19 : chaque ligne reçoit la bonne suggestion composée ✓

**Faux positifs / faux négatifs** : au niveau des lignes des tests d'acceptation, **0**. Une
évaluation FP/FN plus large exige un **jeu annoté** de plusieurs pages (pas encore constitué).
**[non vérifié au-delà des cas d'acceptation]**

## Incidence sur les exports et le ground-truth

- Rôles hors-corps (numero_page, signature, reclame, titre_courant, paratexte, ornement, bruit) :
  `export_corps = false` → exclus du CORPS éditorial, **jamais** supprimés de la source ni de l'ALTO
  brut. **[incidence non encore câblée dans les exports — voir « à faire »]**
- Lettrines : `interdit_entrainement = true` sur la ligne (paire image/texte invalide tant que la
  région n'inclut pas l'initiale).
- Blancs poétiques : classe éditoriale (`blanc-poesie-petit/moyen/large`) **et** mesure géométrique
  d'origine conservées ; le retrait devra être rendu par **CSS**, jamais par des caractères ajoutés.

## Fonctions laissées DÉSACTIVÉES par défaut

Toutes. `analyserVolume` produit des **suggestions** (`statut: 'suggere'`) ; rien n'est appliqué,
exclu ni titré sans `role_confirme` humain. Aucune détection n'est branchée dans le pipeline de
production ni activée par défaut.

## FAIT depuis (mise à jour)

- **§8 Propagation** : `annoterProjet` attache `l.suggestion` (préserve `role_confirme`) ;
  `construireSegments` exclut du corps les lignes hors-corps CONFIRMÉES (jamais de la source).
- **Interface** : bouton « Analyser la structure » (`/api/atelier/analyser`) ; puce de suggestion
  par ligne (rôle + niveau/blanc + score, preuves en infobulle) ; clic = confirmer, re-clic =
  annuler ; lignes hors-corps confirmées grisées ; lettrine → route vers « incertain ». Vérifié en
  navigateur (pilote p22 : 109 suggestions, confirmation d'un titre courant → hors-corps).

## À FAIRE (reste)

1. **Rendu des blancs poétiques côté site** : classes CSS `blanc-poesie-petit/moyen/large`
   (retrait par CSS, jamais de caractères ajoutés) ; export JSON portant les annotations par ligne.
2. **ALTO/PAGE** : porter le rôle des régions dans les exports d'échange.
3. **Décisions fines** : menu lettrine à 3 choix (absente/détachée/artefact) ; confirmation en LOT
   d'un motif de titre courant ; classement de région (paratexte/ornement/bruit) — §5 à compléter.
4. **Jeu annoté** de plusieurs pages pour mesurer FP/FN au-delà des cas d'acceptation.

## Points nécessitant une validation humaine

Toute suggestion : lettrines (saisie de l'initiale), niveaux de titre, exclusions hors-corps,
classement des régions. Aucune n'entre dans un export éditorial validé sans confirmation.
Rien n'est appliqué au reste du volume avant validation du pilote.
