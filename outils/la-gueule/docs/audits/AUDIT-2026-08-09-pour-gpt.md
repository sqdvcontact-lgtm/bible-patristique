# Audit — La Gueule : pipeline OCR → correction → export

*État au 2026-08-09, rédigé pour planifier la suite. Document autoportant.*

## 1. Ce qu'est La Gueule

Outil **local**, zéro-dépendance (Node.js natif, `node:http`), qui sert à **océriser des imprimés anciens** (français d'Ancien Régime, traductions de Pères de l'Église) pour alimenter le site Corpus Scriptura. Il pilote **Kraken** (OCR/HTR) via WSL, et une **IA de vision** pour lire, contrôler et enrichir. Interface web (« atelier ») sur `http://127.0.0.1:4599`.

Point cardinal de coût : l'IA passe par le **CLI Claude Code local authentifié sur l'ABONNEMENT** (fournisseur `claude-local`, `claude -p`), **jamais l'API payante**. La clé `ANTHROPIC_API_KEY` est retirée de l'environnement du CLI (sinon elle court-circuite l'abonnement et facture des crédits).

## 2. Architecture (fichiers clés)

- `src/serve.mjs` — serveur + endpoints `/api/…`.
- `src/ia/controle.mjs` — contrôle **déterministe** (sans réseau) + **relecture IA par page**.
- `src/ia/prompt.mjs` — consignes (lecture métadonnées, relecture de page, etc.).
- `src/ia/claude-local.mjs` — fournisseur CLI abonnement (Opus/Sonnet/Haiku selon la tâche).
- `src/ia/enrichissement.mjs` — enrichissement depuis le **catalogue Supabase** (lecture seule).
- `src/ia/validation.mjs` — classement des trouvailles (familles / critiques / blocages).
- `ui/atelier.html` — interface (monofichier).

Modèles : **Opus** = lecture/vision (métadonnées, tri) ; **Sonnet** = contrôle/relecture ; **Haiku** = diagnostic léger (jamais pour lire, il casse casse/accents/chiffres romains).

## 3. Le pipeline en 5 étapes — et son état réel

1. **Diagnostic IA** — lecture de la page de titre (Opus) + enrichissement catalogue → métadonnées candidates. **OK.**
2. **OCR local** — Kraken, par page ou par plage. **OK**, mais voir anomalie B.
3. **Contrôle IA** — passe déterministe (toujours) + **relecture IA de chaque page océrisée** (une requête par page ; compare l'image au texte OCR, propose les corrections). **Nouvellement câblé** ; voir anomalies A, C, D.
4. **Validation ciblée** — regroupe les trouvailles en **familles** (à accepter par échantillonnage) + **cas critiques** individuels + **blocages**. Voir anomalies D, E.
5. **Génération locale** — exports (DOCX / SQL / JSON / TXT / MD / ALTO). Aucune IA.

## 4. Ce qui marche aujourd'hui

- OCR Kraken par plage ; affichage image + texte en regard, rôles par ligne, césures.
- Lecture des métadonnées de la page de titre (Opus, sur abonnement, sans surcoût).
- Enrichissement catalogue (lecture seule) : rapprochement d'œuvre **resserré** aujourd'hui (fini le faux « Hexaéméron » sur « Homélies… ») ; **sous-titre = celui de la page** (jamais écrasé par le catalogue) ; **genre au format base** (minuscule, plusieurs genres séparés par «  ; »).
- Contrôle déterministe : confiance faible, lignes vides, doublons, charabia, pages ignorables (garde / « Google » / ornement).
- Relecture IA par page : **propose de vraies corrections** — vérifié sur Basile : « bommes » → « hommes », « seulemeni » → « seulement ».

## 5. Anomalies et points bloquants (test réel : Basile, 10 pages océrisées sur ~589)

**A. Les corrections ne sont jamais appliquées au texte. [le plus grave]**
Accepter une correction (relecture ou famille) change seulement son **statut** ; aucun code ne réécrit `texte_candidat` dans la ligne (`lignes[i].dip`). L'export conserve donc le texte fautif. La relecture est aujourd'hui un **avis sans effet** sur le livrable. (Les lettrines, elles, ont bien un chemin d'application `l.dip = …` ; les corrections OCR génériques, non.)

**B. La complétude OCR est mesurée sur tout le PDF, pas sur la plage traitée.**
`apresOcrWorkflow` fait `manquantes = total_du_PDF − pages_océrisées`. Sur Basile : 589 − 10 = **579 manquantes**, donc l'étape « OCR local » reste **« en cours »** indéfiniment et l'étape 3 n'est jamais marquée « prête » (on la déclenche quand même par le bouton). Pour un ouvrage qu'on traite par tranches, c'est trompeur.

**C. Les lignes non-texte (ornements) ne sont pas traitées.**
Exemple : le filet gravé en tête du « Discours préliminaire » est océrisé « SARA AE ASIA SARA VAE TIRE » et reste étiqueté « corps ». Le charabia déterministe le rate (mots plausibles) ; la relecture ne sait que **corriger du texte**, pas **supprimer** ni marquer une ligne « ornement / hors-corps ».

**D. La relecture est présentée en « famille ».**
Les 41 corrections distinctes sont regroupées sous une famille `relecture_page` ; « Accepter la famille » les avaliserait **toutes en bloc, à l'aveugle**. Les familles conviennent aux défauts **répétitifs identiques**, pas à 41 changements de texte différents. Ces corrections devraient se relire **une par une** (avant → après, image en regard).

**E. Les blocages d'export sont trop sévères.**
3 pages « anormales » (peu de lignes = page de titre, pages courtes légitimes) génèrent des **blocages** qui interdisent l'export « complet ». Une page de titre courte ne devrait pas bloquer.

**F. « Trier les pages (IA) » est lent — et pollue.**
Il rend **tout le PDF** en planches de vignettes (pdftoppm + montage) puis fait classer chaque planche par Opus : plusieurs minutes. Il crée en plus une entrée par page du document (coquilles sans OCR). Doublon avec la détection déterministe des pages inutiles *après* OCR.

## 6. Corrigé aujourd'hui (déjà en place)

- Rapprochement d'œuvre resserré (≥ 2 jetons communs + recouvrement ≥ 50 %).
- Sous-titre = page ; genre au format base.
- Relecture IA par page **câblée** dans le fournisseur local (une requête / page océrisée).
- Contrôle **limité aux pages réellement océrisées** (fin du comptage « 72 pages » : les coquilles du tri / de l'aperçu sont ignorées).

## 7. Décisions à planifier (questions ouvertes)

1. **Application des corrections** — comment et quand écrire une correction **acceptée** dans le texte (couche candidate → texte corrigé), en gardant l'**OCR brut immuable** et la **traçabilité** (§15) ? Matérialisation avant export ? C'est le chantier n°1.
2. **Périmètre de complétude OCR** — mesurer « terminé » sur quoi : la plage choisie, les pages « à océriser » (hors exclues), ou le document entier ? Faut-il définir un **périmètre de travail** explicite ?
3. **Lignes non-texte** — donner à la relecture (ou au contrôle) la capacité de **marquer une ligne « ornement / hors-corps / à retirer »**, pas seulement corriger. Fusionner avec le rôle « hors-corps » déjà géré par `structure.mjs`.
4. **Ergonomie de relecture** — revue **individuelle** des corrections, page par page, image en regard ; pas de « famille » pour les corrections de texte.
5. **Politique de blocage export** — quelles anomalies bloquent réellement ; ne jamais bloquer sur une page de titre courte.
6. **Sort de « Trier les pages (IA) »** — retirer, accélérer, ou remplacer par la détection déterministe post-OCR.

## 8. Contraintes doctrinales à respecter (cadre non négociable)

- **Couche candidate uniquement** : jamais d'écriture directe dans les tables actives du site (`oeuvres`, `segments`, `versets_*`). Un candidat n'est pas une validation humaine ; ne rien inventer.
- **Clé API jamais** dans l'environnement du CLI (usage abonnement obligatoire).
- **Graphie diplomatique conservée** : ſ long, u/v, i/j tels qu'imprimés ; **jamais de modernisation**.
- **Clé service Supabase** en lecture seule, jamais journalisée ni exportée.
- Fichiers déposés sur le bureau OneDrive : **copiés dans `incoming/`** avant traitement (charte §2.3).
