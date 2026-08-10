# Consignes pour Codex — établir un plan d'océrisation

**Cas courant : Boèce, *Consolation de la philosophie*.** (La méthode ci-dessous est un **gabarit**
réutilisable pour tout futur import à océriser.)

> Objectif : **établir un PLAN** (ne rien exécuter, ne rien importer). Le plan doit être
> relisible par l'utilisateur, puis exécutable via **La Gueule** (voir `POUR-CODEX.md`).
> Doctrine : tout reste **CANDIDAT** jusqu'à relecture humaine (charte §14).

## 0. Vérifie l'état toi-même (ne te fie pas à ce résumé)
- `catalogue_notices` : `where auteur ilike '%bo_ce%'` — repère les notices `decision_import_code='IMPORTER'`.
- `oeuvres` / `auteurs` : Boèce est-il déjà une œuvre ? un auteur (`id_auteur`) ? (au 2026-08-08 : **rien dans `oeuvres`**).
- Bureau : `D:\OneDrive\Bureau\BOÈCE\` (2 PDF : trad. Ceriziers [Internet Archive] + éd. Gallica `bpt6k267807`).
- La Gueule tourne-t-elle ? `GET http://127.0.0.1:4599/api/doctor`.

Candidats **IMPORTER** déjà repérés : `V20-BOECE-LATIN-ORIG` (latin, Migne PL t. 63, 1847),
`V20-03431` (Du Fresne 1744, *Très haute*), `V20-03429` (Ceriziers 1636), `V20-03430` (Regnier 1676),
`V20-03432` (Colesse 1772). Le reste = `BIBLIOGRAPHIE` (ne pas océriser).

## 1. Ce que le plan doit décider POUR CHAQUE édition retenue
1. **Nature de la source** — décisif :
   - déjà du **texte numérique** (le latin de Migne est sur *Latin Wikisource*) → **PAS d'OCR**,
     récupération + nettoyage ;
   - **fac-similé à océriser** (Ceriziers, Gallica, Google Books) → OCR.
   Pour les Google Books/Gallica, arbitre : réutiliser la **couche texte existante** (`pdftotext`,
   rapide mais qualité inégale) **ou** ré-océriser à 300 DPI via La Gueule (contrôlé). Justifie le choix.
2. **Moteur & réglages** : imprimé → **Tesseract** (`lang` = `fra` ou `lat`), **DPI 300**. (Kraken
   uniquement pour un manuscrit — ici, aucun.)
3. **Bornes de pages** : pages de titre (pour les métadonnées) vs corps ; pages à sauter (planches, blancs).
4. **Structure (`ref_niv`)** : la Consolation = **5 livres**, alternant **proses et mètres**
   (*prosa* / *metrum*). Schéma proposé : `ref_niv1` = « Livre I…V », `ref_niv2` = « Prose 1 » /
   « Mètre 1 ». Ce schéma alimente les **niveaux de titre du DOCX** et les colonnes `ref_niv*` des segments.
5. **Latin en regard / bilingue** : décider si on aligne le **latin (Migne)** face à chaque
   traduction (`texte_original` sur le segment de `rang=1` seulement — **alignement sémantique relu,
   jamais mécanique**, charte §12.2), ou si latin et français sont deux entrées distinctes.
6. **Notes** : recensement des références/notes en appels `[[N]]` + champ `notes` (option La Gueule).
7. **Métadonnées** (colonnes `oeuvres`) : `auteur` → `id_auteur` **Boèce** (vérifier/créer la ligne
   `auteurs`), `titre`, `sous_titre`, `trad_auteur`, `editeur`, `ville`, `date_publication`,
   `langue_originale` = latin, `langue_trad` = français, `genre`. Choisir un **`id_oeuvre`** (convention du site).
8. **Relecture & fiabilité** : ce sont des **imprimés anciens** (pas des manuscrits) → **une seule
   couche** (OCR corrigé). S'appuyer sur la **confiance ALTO** (« à revoir » < 0.80), le repérage
   automatique des **titres courants** (exclus de l'export), et un **contrôle par sondage**.
9. **Provenance & statut** : conserver **SHA-256** source + moteur + DPI ; statut **CANDIDAT**.

## 2. Décisions transversales
- **Ordre de traitement** recommandé et justifié (priorité des notices + disponibilité des fichiers).
  Suggestion à arbitrer : commencer par **une traduction française déjà sur le bureau (Ceriziers)**
  pour éprouver la chaîne de bout en bout, puis le **latin de Migne** comme texte original en regard.
- **Estimation** : nombre de pages, temps/énergie indicatifs (OCR **local, CPU** ; ~5–15 s/page Tesseract).
- **Hors périmètre** : éditions critiques modernes (Guillaumin, Belles Lettres…) et versions
  médiévales sans fichier libre → restent en `BIBLIOGRAPHIE`, **ne pas océriser**.

## 3. Contraintes (non négociables)
- **Copier d'abord** le PDF du bureau **dans le dépôt** avant traitement (charte §2.3).
- **Rien dans l'actif** (`oeuvres` / `segments`) sans relecture (§14). Le SQL de La Gueule est un candidat.
- **Vérifier `id_auteur` (Boèce)** et **`id_oeuvre`** avant tout import ; ne pas créer d'auteur en silence.
- **Ne pas toucher** au chantier Bible 899, ni à `versets_*` / `TR0001–TR0005`.
- **Pas de graphie modernisée** par simple concaténation (§14.6).

## 4. Livrable attendu
Un **document de plan** contenant, par édition retenue :
`source | nature (texte/fac-similé) | moteur+lang+DPI | bornes de pages | schéma ref_niv |
latin-en-regard ? | notes ? | id_oeuvre | id_auteur | effort estimé | chemin d'export prévu`,
puis un **ordre de traitement** et la **liste des points à trancher avec l'utilisateur**.

Propose **où consigner le plan** (ex. `parametres['plan_ocr_boece']`, ou un `.md` dans le dépôt) et
**soumets-le pour validation AVANT toute océrisation**. Une fois validé, l'exécution se fait via
l'API de La Gueule (`/api/televerser` → `/api/metadonnees` → `/api/atelier/ocr` → `/api/export`),
en conservant systématiquement provenance et statut candidat.
