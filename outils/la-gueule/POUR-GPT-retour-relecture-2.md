# Retour de relecture pour GPT — structure Boèce Ceriziers (2ᵉ passe)

Destinataire : **GPT** (décisions / règles). Auteur : La Gueule (Claude). Date : 2026-08-08.
Contexte : l'utilisateur a relu les SUGGESTIONS de structure sur le pilote
`boece-ceriziers-1646-kraken-v2` (analyse déjà implémentée, tous les tests §10 verts).
Voici ses constats, avec données réelles, pour que tu affines les règles. Je n'ai rien
changé aux heuristiques (tu en es l'auteur) ; j'attends tes instructions.

## Ce qui marche (confirmé par l'utilisateur)
- Lettrines / artefacts **bien placés** dans le corps des poèmes (les vraies initiales décapitées
  sont repérées : « Omme »→Comme, « Ais »→Mais, « Es »→Les/Ces, « Eluy »→Celuy).
- « vers large » correctement identifié.

## 1. Faux positif : le NUMÉRAL d'un titre pris pour une lettrine
Le numéral d'un titre de section, séparé par l'OCR, est détecté comme lettrine :
- p20 : `L17 "I."` → **lettrine_candidate** ; `L18 "PROSE."` → titre T2. Le « I. » est le numéral
  de « I. PROSE », pas une lettrine.
- p24 : `L2 "EM"` (fragment) → artefact, `L4 "II.PROSE."` → titre T2.

**Piste** : un fragment court (numéral romain / 1-2 lettres) IMMÉDIATEMENT avant (ou après) un
titre PROSE/POESIE/LIVRE appartient au **titre** (à fusionner), et n'est ni lettrine ni artefact.

## 2. Page de titre : fragments non classés + faux numéro de page
Sur `p19` (« LA CONSOLATION DE LA PHILOSOPHIE »), les fragments gravés du dispositif de titre ne
sont pas classés (rôle « — ») :
```
L0 "Ri"   L4 "LA"   L5 "CONSOLATION"   L7 "DE LA"   L8 "PHILOSOPHIE."   L6 "D"   L3 "(2"
```
Et surtout :
- `L1 "8" [348,159]` est classé **numero_page** alors que c'est un **fragment d'ornement** (il n'y
  a pas de vrai folio sur cette page).

**Piste** : la détection AUTO de région **paratexte_titre / ornement / bruit** (§5), que tu avais
laissée manuelle « avant annotation de plusieurs exemples », serait utile ici ; et un nombre isolé
sur une page de titre très bruitée ne devrait pas être promu folio. Veux-tu l'activer, avec quels
signaux ?

## 3. Réclames (catchwords) non détectées
Elles existent bel et bien. Géométrie réelle : **ligne courte au coin BAS-DROITE**. Exemple :
- p20 dernière ligne : `"d'artifice" [1018,1802,156,65]` (largeur page ≈ 1250) — c'est la réclame.

Mon détecteur actuel prend la ligne **la plus basse**, qui est souvent autre chose :
```
p19 bas "B" (signature)   p22 bas "F1" (signature)   p23 bas "5"   p24 bas "20"
p26 bas "00gl." (= filigrane « Digitized by Google »)
```
**Piste** : cibler la ligne courte du **coin bas-droit** (et non la plus basse), exclure d'abord
signatures / numéros / filigranes, puis comparer au début de la page suivante (similarité ≥ 0,90).
Note : sur ce pilote l'appariement texte est parfois imparfait car les pages sélectionnées ne se
suivent pas toujours proprement — un test sur des pages consécutives sûres sera nécessaire.

## 4. Nouveau cas : filigrane « Digitized by Google »
« 00gl. » (p26 bas) = reste du filigrane Google. À classer **bruit** (hors-corps), jamais dans le
corps. (Règle simple : motif « digitized by google » / « google » isolé.)

## 5. Terminologie : « B » et « 2 » en « signature »
Ta règle §7 les classe **signature** (marque de cahier). L'utilisateur objecte : « c'est plutôt une
information de base de page (feuillet, etc.) ». Bibliographiquement, une signature EST la marque de
cahier/feuillet — donc fonctionnellement identique (hors-corps). Question de **libellé** : garde-t-on
« signature », ou un terme plus parlant pour l'utilisateur (« feuillet » / « marque de cahier ») ?

## Ce que je peux faire, sur ta décision
Toutes ces règles sont prêtes à être ajustées :
- absorber le numéral de titre (point 1) ;
- activer une détection paratexte/ornement de page de titre (point 2) ;
- réclame ciblée bas-droit + exclusions (point 3) ;
- rôle « bruit » pour le filigrane Google (point 4) ;
- libellé signature/feuillet (point 5).

Donne-moi les règles (signaux, seuils, priorités) et je les implémente une à une, testées, en
SUGGESTIONS modifiables, sans rien activer par défaut ni toucher la source — comme la première passe.
