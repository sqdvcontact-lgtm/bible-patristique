# Entraîner un modèle OCR/HTR pour Corpus Scriptura

> **Aucun entraînement n'est lancé automatiquement.** Ce document décrit la
> marche à suivre, manuelle et contrôlée, pour spécialiser un modèle Kraken sur
> notre corpus. Chaque étape est décidée par un humain. Un modèle entraîné reste
> soumis à la doctrine §14 : il produit des **candidats**, jamais du texte validé.

La règle cardinale : **ne jamais remplacer un bon modèle par un moins bon.** Un
nouveau modèle n'est adopté que s'il est **mesurément meilleur** que celui en
place, sur un **banc d'essai stable**. Tout se consigne dans un **registre**
versionné.

---

## 0. Le socle : d'où l'on part

La Gueule utilise aujourd'hui, sans entraînement, deux modèles **socles** de la
famille CATMuS (consignés dans `modeles/registre.json`, statut `socle`) :

| Version | Usage | s long ſ |
|---|---|---|
| `catmus-print-fondue-large` | imprimé ancien (défaut « Typo : ancien ») | lu correctement |
| `catmus-medieval-1.0.0` | manuscrit | — |

Ces socles sont déjà bons. Le fine-tuning ne se justifie que si notre corpus a
des particularités que le socle lit mal (une casse d'imprimeur donnée, une main
de copiste, des abréviations, une mise en page récurrente). **Tant qu'on n'a pas
mesuré le CER du socle sur nos pages, on ne sait pas s'il y a un problème à
régler.** La première chose à faire n'est donc pas d'entraîner : c'est de
**mesurer** (étape 4).

---

## 1. La donnée d'entraînement vient des corrections (P6)

On n'annote rien à part. Le jeu d'entraînement est le **sous-produit de la
relecture** : chaque ligne corrigée et validée dans l'atelier devient une vérité
de terrain (*ground truth*).

Dans l'atelier : relire une page, corriger les lignes fautives, cliquer
**« ✓ Valider la page »**, puis **« Export entraînement »**. On obtient :

```
exports/entrainement/<nom>/
├── p0020.png            ← image de la page (référencée par l'ALTO)
├── p0020.alto.xml       ← lignes + coordonnées + transcription CORRIGÉE
├── p0021.png
├── p0021.alto.xml
├── manifeste.jsonl      ← une ligne JSON par ligne de texte (traçabilité)
└── README.txt           ← la commande ketos, rappelée sur place
```

- L'**ALTO** porte, pour chaque `TextLine`, la bounding box réelle du témoin et,
  en `CONTENT`, **le texte humain corrigé** (pas la sortie brute du moteur).
  C'est exactement le format que `ketos train -f alto` sait lire : il recadre
  chaque ligne dans l'image de page et apprend l'image → texte.
- Le **manifeste** garde, par ligne : image, bbox, `ocr_original`, `corrige`,
  `modifie`, `confiance`, source, page, moteur, modèle, date. Il sert à la
  traçabilité et à trier (par exemple n'entraîner que sur les lignes réellement
  corrigées, ou pondérer par source).

**Combien de lignes ?** Un fine-tuning léger de CATMuS commence à donner à partir
de quelques centaines à quelques milliers de lignes corrigées d'une même main /
d'une même casse. En dessous, on risque le sur-apprentissage : le modèle
mémorise nos pages au lieu de généraliser. On accumule d'abord, on entraîne
ensuite.

---

## 2. Séparer entraînement et évaluation (le banc d'essai)

**Piège capital : ne jamais évaluer un modèle sur des pages qui ont servi à
l'entraîner.** Le modèle les connaît, le score serait flatteur et faux.

On réserve donc, **une fois pour toutes**, un **banc d'essai** : un lot de pages
corrigées **mises de côté**, jamais versées à l'entraînement. C'est sur ce banc,
et lui seul, qu'on mesure le CER de chaque modèle. Le banc doit :

- rester **stable** dans le temps (mêmes pages) pour que les CER de versions
  successives soient **comparables** ;
- être **représentatif** (plusieurs pages, idéalement plusieurs sources du même
  type d'imprimé/main).

Convention proposée : un dossier `exports/entrainement/<corpus>/banc/` (pages
d'évaluation) distinct de `.../train/` (pages d'entraînement). Le partage se
décide à la main, à la validation des pages.

---

## 3. Entraîner (ketos) — opération manuelle

Sous WSL, dans le dossier d'entraînement. On **part du socle** (`-i`), on ne part
jamais de zéro : c'est du *fine-tuning*, plus court et plus sûr.

```bash
# Fine-tuning à partir du socle imprimé, sur les ALTO d'entraînement.
ketos train -f alto \
  -i catmus-print-fondue-large.mlmodel \
  --resize both \
  -d cuda:0 \
  -o modele-corpus \
  train/*.alto.xml
```

- `-i …` : modèle de départ (le socle). `--resize both` adapte la couche de
  sortie si le jeu de caractères diffère.
- `-d cuda:0` : GPU (RTX 2060 SUPER). Retirer pour rester sur CPU.
- `ketos` écrit des jalons `modele-corpus_<n>.mlmodel` et retient le meilleur sur
  sa propre validation interne (`modele-corpus_best.mlmodel`).

Le GPU **est déjà prouvé disponible** (cf. `POUR-CODEX.md` / audit P2 : PyTorch
CUDA True). L'entraînement, contrairement à la simple reconnaissance, profite
réellement du GPU.

> À ce stade on a un **candidat**, pas un modèle adopté. Il ne remplace rien.

---

## 4. Évaluer sur le banc d'essai (la décision se joue ici)

Deux mesures, à croiser :

**a) `ketos test`** (mesure interne de Kraken, pratique) :

```bash
ketos test -m modele-corpus_best.mlmodel -f alto banc/*.alto.xml
```

Il imprime l'exactitude par caractère (donc le CER = 1 − exactitude).

**b) Notre propre mesure** (`src/modeles.mjs`), pour un CER homogène entre socle
et candidat, calculé sur **les mêmes** paires (texte corrigé du banc ↔ sortie du
modèle) :

- océriser les pages du banc avec le modèle à évaluer (via l'atelier ou en
  ligne de commande) ;
- constituer les paires `{ reference: <texte corrigé>, hypothese: <sortie modèle> }` ;
- appeler `evaluerModele(paires)` → `{ cer, wer, nbLignes, nbCaracteres }`.

On mesure ainsi **le socle** ET **le candidat** sur le **même** banc. Sans la
mesure du socle, on n'a pas de point de comparaison : on la fait **d'abord**
(elle remplit les `cer: null` du registre pour les socles).

---

## 5. Adopter — seulement si meilleur

La décision est **mécanique et consignée**, via `comparerQualite` :

```js
import { comparerQualite } from './src/modeles.mjs'

comparerQualite({ cer: cerCandidat }, { cer: cerReference }, { marge: 0.005 })
// → { adopter, raison, delta }
```

Règle appliquée :

- **candidat non évalué** (`cer` inconnu) → **refus** : évaluer d'abord ;
- **aucune référence mesurée** → on adopte le candidat comme **socle** ;
- candidat **meilleur d'une marge nette** (CER plus bas de plus de `marge`) →
  **adoption** ;
- gain **sous la marge**, ou candidat **pire** → **on garde la référence.**

La marge (0,5 % de CER par défaut) évite d'adopter un modèle sur du bruit de
mesure. On la relève si le banc est petit.

**En cas d'adoption**, on consigne — sans jamais écraser un fichier de modèle :

```js
import { entreeModele, enregistrerModele } from './src/modeles.mjs'

await enregistrerModele(entreeModele({
  version: 'imprime-corpus-v1',              // nom unique, versionné
  chemin:  '/root/.../modele-corpus_best.mlmodel',
  base:    'catmus-print-fondue-large',      // de quel socle il descend
  corpus:  'exports/entrainement/boece/train (1 240 lignes corrigées)',
  cer: 0.031, wer: 0.098, nbLignesEval: 180, // mesurés sur le banc
  banc:    'exports/entrainement/boece/banc',
  date:    new Date().toISOString(),         // fournie par l'appelant
  notes:   'Gain net sur les ſ de la casse Ceriziers.',
  statut:  'adopte',
}))
```

Le candidat rejeté est **conservé** aussi (statut `ecarte`), avec son CER : on
garde la trace de ce qui n'a pas marché, pour ne pas le refaire.

---

## 6. Le registre — la mémoire des modèles

`modeles/registre.json` (versionné dans git ; les `.mlmodel` ne le sont pas). Une
entrée par modèle :

| champ | sens |
|---|---|
| `version` | identifiant unique et versionné (`imprime-corpus-v2`…) |
| `chemin` | où vit le `.mlmodel` |
| `base` | socle dont il descend (traçabilité de la lignée) |
| `corpus` | jeu d'entraînement (source, nb de lignes) |
| `cer` / `wer` | mesures sur le **banc d'essai** (null tant que non mesuré) |
| `nbLignesEval` / `banc` | taille et identité du banc |
| `date` | ISO |
| `notes` | ce qu'il améliore / échoue |
| `statut` | `socle` \| `candidat` \| `adopte` \| `ecarte` |

`meilleurModele(registre)` renvoie le modèle utilisable (socle ou adopté) au CER
mesuré le plus bas. C'est lui qu'on branche par défaut dans l'atelier une fois la
lignée établie.

**Discipline de versionnage :**

- un `version` ne se réutilise jamais (v1, v2, v3… ; jamais « écraser v1 ») ;
- on **garde les fichiers** des anciens modèles adoptés (rollback possible) ;
- le banc d'essai ne change pas en cours de lignée (sinon les CER ne se comparent
  plus) ; s'il faut l'élargir, on **re-mesure toute la lignée** sur le nouveau
  banc avant de comparer.

---

## 7. La boucle, en une vue

```
CATMuS-Print (socle)
   │
   │  ← corrections humaines validées (atelier, P6)  ──►  train/ + banc/
   ▼
ketos train -i socle  (fine-tuning, manuel)          ──►  modele_best.mlmodel (CANDIDAT)
   │
   ▼
évaluer socle ET candidat sur le MÊME banc  (ketos test + evaluerModele)
   │
   ▼
comparerQualite(candidat, référence)
   ├── meilleur d'une marge nette ──►  ADOPTER  → enregistrerModele(statut:'adopte')
   └── sinon                       ──►  GARDER la référence → statut:'ecarte' (conservé)
   │
   ▼
nouvelles corrections  ──►  le corpus grossit  ──►  on recommence (v2, v3…)
```

À chaque tour, le corpus corrigé grossit, le modèle peut s'affiner, et le
registre garde la trace de **quelle** version a été adoptée, **pourquoi** (les
chiffres), et **sur quoi** elle a été entraînée. On ne remplace jamais à
l'aveugle.

---

## Garde-fous (rappel §14)

- **Aucun entraînement automatique.** Chaque fine-tuning est déclenché,
  paramétré et évalué à la main.
- Un modèle, même excellent, produit des **candidats** : la relecture humaine
  reste la seule autorité.
- Ne jamais entraîner ni évaluer sur les tables **actives** ni sur les assets du
  chantier **Bible 899** : uniquement sur les exports de relecture de La Gueule.
- Le banc d'essai est **sacré** : on n'y verse jamais de page d'entraînement.
