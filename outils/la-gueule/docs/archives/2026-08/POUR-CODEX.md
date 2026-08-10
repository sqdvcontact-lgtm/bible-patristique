# La Gueule — présentation pour Codex

Salut Codex. Ce document te présente **La Gueule**, l'outil OCR/HTR maison de Corpus Scriptura,
et surtout **ce que tu peux en faire** : il expose une petite **API HTTP locale** que tu peux
appeler pour océriser des documents et produire des artefacts d'import prêts à relire.

> ⚠️ **Doctrine (charte §14).** La Gueule ne produit que des **CANDIDATS**. Rien de ce qu'elle
> génère ne doit entrer dans les tables **actives** (`oeuvres`, `segments`, `versets_*`…) sans
> **relecture humaine**. Le SQL d'export est fait pour être **lu puis exécuté volontairement**,
> jamais appliqué en aveugle.

---

## 1. Ce que c'est, où ça vit

- Dossier : `outils/la-gueule/` — **Node, sans aucune dépendance**. **Local à ce PC** (non versionné).
- Elle *mobilise*, dans **WSL2 (Ubuntu-24.04)** : **Kraken 7.1** (HTR manuscrits, modèle CATMuS
  Medieval), **Tesseract 5.3.4** (OCR imprimés, `fra`/`lat`…), **poppler** (`pdfinfo`, `pdftoppm`).
- Interface : un **serveur HTTP** sur `http://127.0.0.1:4599/` + une page « atelier » (relecture).
- Tout tourne **en local**, sur CPU (pas de cloud, pas de réseau).

**Démarrer le serveur** (s'il ne tourne pas déjà) :

```bash
cd outils/la-gueule && node bin/gueule.mjs serve
```

Si le port 4599 est déjà pris, une instance tourne déjà : réutilise-la. Tests : `npm test`.

**Chemins de fichiers** : l'API attend des **chemins Windows** (ex. `D:\dossier\x.pdf` ou le
chemin renvoyé par `/api/televerser`). Le serveur les traduit lui-même vers WSL (via `WSLENV`),
espaces compris — tu n'as pas à t'en soucier.

---

## 2. L'API HTTP (les « outils » que tu peux appeler)

Base : `http://127.0.0.1:4599`. Corps en JSON (`content-type: application/json`) sauf téléversement.

### Diagnostic
- `GET /api/doctor` → `{ node, outils:{ wsl, kraken, tesseract, docker:{present, detail} } }`.
  À appeler avant d'océriser pour vérifier que Kraken/Tesseract répondent.

### Amener un fichier
- `POST /api/televerser?nom=<nom.pdf>` — **corps = les octets bruts** du fichier (pas de JSON).
  L'enregistre dans `incoming/` et renvoie `{ chemin, nom }`. `chemin` est directement utilisable
  comme `pdfWin`/`imageWin`/`path` ci-dessous.
- `GET /api/pdf-info?path=<cheminWin>` → `{ pages }` (nombre de pages, via poppler).

### Métadonnées bibliographiques (alignées sur la table `oeuvres`)
- `POST /api/metadonnees` — corps `{ path, pagesTitre?:number[] }` (défaut `[1,2,3,5,7]`).
  OCRise la page de titre + lit `pdfinfo`, renvoie `{ meta, pdf, brut }`.
  `meta` porte **exactement les colonnes de `oeuvres`** :
  `auteur` (→ `id_auteur` à relier), `titre`, `sous_titre`, `titre_original`,
  `langue_originale`, `langue_trad`, `trad_auteur`, `editeur`, `collection`, `ville`,
  `date_publication`, `date_composition`, `genre`.
  Le **titre est nettoyé de la mention d'auteur** (« … de saint Basile » retiré), sans amputer un
  titre qui *parle* d'un saint (« … sur saint Matthieu » conservé).

### OCR d'une page
- `POST /api/atelier/ocr` — corps :
  - imprimé : `{ kind:"imprime", pdfWin, page, dpi:300, lang:"fra" }`
  - manuscrit : `{ kind:"manuscrit", imageWin, modele? }` (défaut = CATMuS Medieval)
  - Réponse : `{ pngUrl, largeur, hauteur, lignes:[{ id, bbox:[x,y,w,h], texte, confiance }], ocr }`.
  - `confiance` = moyenne des `WC` de l'ALTO (0..1, ou `null`) → en dessous de 0.80, à relire.
  - `ocr` = provenance de la page : `{ moteur, langue|modele, dpi, page }`.
  - `page`/`dpi`/`lang` sont **validés** (entiers bornés, langue en liste blanche).
- `POST /api/atelier/ocr-bilingue` — `{ pdfWin, page, offset:-1, dpi:300 }` : océrise la page
  française et la page **en regard** (latin), renvoie des **paires** `{ paragraphe, fr, la }`
  ré-alignées **par numéro de section** (robuste au décalage).
- `POST /api/atelier/stop` → tue l'OCR WSL en cours (l'appel OCR concerné se termine en « annulé »).
  Le serveur reste réactif pendant un OCR (spawn asynchrone).

### Persistance d'un « projet » de relecture
- `POST /api/projet/save` `{ nom, projet }` → `{ ok, chemin }`
- `GET  /api/projet/load?nom=<nom>` → `{ projet }`
- `GET  /api/projet/list` → `{ projets:string[] }`

Un `projet` = `{ kind, chemin, page, total, pages:{ [n]: pageOCR }, meta }` où `meta` porte les
colonnes `oeuvres`, et chaque `pageOCR` contient `{ pngUrl, largeur, hauteur, ocr, lignes }` (ou,
en bilingue, `{ bilingue:true, paires:[…] }`).

### Export (le point important pour toi)
- `POST /api/export` — corps `{ nom, projet, id_oeuvre?, couche?:"dip", recenserNotes?:true }`.
  Écrit **trois fichiers** dans `exports/` et renvoie
  `{ nbSegments, apercu, provenance, fichiers:{ json, docx, sql } }` :
  - **`<nom>.segments.json`** — candidat structuré (segments + provenance + meta) ;
  - **`<nom>.docx`** — document Word **propre** (styles Titre/Sous-titre/Titre1-5/Normal/Original/
    Notes, niveaux de titre = volet de navigation) ;
  - **`<nom>.supabase.sql`** — **prêt à importer** (voir §3).
- `POST /api/export/segments` — variante **JSON seul** (mêmes entrées).

---

## 3. Le SQL d'import (`<nom>.supabase.sql`)

Calé sur le **schéma réel** du site. Structure :

```sql
begin;
-- 1) Métadonnées de l'œuvre (upsert)
insert into public.oeuvres (id_oeuvre, titre, langue_trad, ville, date_publication, …)
values ('A0091O0001', …) on conflict (id_oeuvre) do update set …;
-- Auteur détecté : « Saint Basile le Grand » — rattachement id_auteur (À VÉRIFIER) :
update public.oeuvres set id_auteur =
  (select id_auteur from public.auteurs where nom ilike '%Basile%' order by length(nom) limit 1)
  where id_oeuvre = 'A0091O0001' and id_auteur is null;
-- 2) Segments (candidats OCR)
insert into public.segments (id_oeuvre, segment_numero, rang, page, paragraphe, nature,
  segment_texte, texte_original, notes, marquage_source) values
  ('A0091O0001', 1, 1, 20, null, 'texte', '…', null, '[[1]] Ps. 1. 1.', 'La Gueule (OCR candidat)');
commit;
```

Points à connaître :
- `segments.id` est une **identité** → jamais fourni ; `segment_numero = rang` (ordre de lecture).
- `marquage_source = 'La Gueule (OCR candidat)'` : c'est traçable et distinct de tes imports.
- Le **rattachement `id_auteur`** est un **candidat** (sous-requête par nom) : **vérifie-le** avant
  d'exécuter (homonymes, variantes de graphie).
- Les colonnes `ref_niv{1..5}(_texte)` ne sont écrites **que si** les segments portent une structure
  (voir §5). Les notes sont recensées en appels `[[N]]` dans le texte + champ `notes` (compteur
  global à l'œuvre).

---

## 4. Garde-fous (à respecter absolument)

- **Ne jamais** exécuter le SQL sur les tables actives sans relecture (charte §14). C'est un candidat.
- **Vérifier `id_auteur`** et **`id_oeuvre`** avant import.
- **Ne pas** toucher au chantier Bible 899 (TEI/manifeste/images/imports) ni écrire dans
  `versets_canon` / `versets_v2` / `TR0001–TR0005`. La Gueule n'y touche pas.
- **Pas de graphie modernisée** par simple concaténation (§14.6) : seules les couches
  `diplomatique`/`développée` existent côté manuscrit.
- Les **titres courants / n° de page** (ligne du haut/bas) sont **écartés** de l'export
  automatiquement ; les lignes **peu sûres** (`confiance < 0.80`) sont signalées « à revoir ».
- **Provenance §14** : chaque export porte le SHA-256 du fichier source, le moteur, le modèle/la
  langue et le DPI par page. Conserve-la.

---

## 5. Réutiliser la logique (fonctions pures, testées)

Si tu préfères composer toi-même plutôt que passer par l'API, tout est en modules purs (`src/`),
couverts par `npm test` :

- `alto.mjs::parseAlto(xml)` → `{ largeur, hauteur, lignes:[{id,bbox,texte,confiance}] }`
- `projet.mjs::construireSegments(projet, opts)` → segments candidats
- `projet.mjs::exporterTout / exporterSegments` → écriture des fichiers
- `docx.mjs::construireDocx({meta,segments})` → Buffer .docx (ZIP maison `zip.mjs`, sans dépendance)
- `sql.mjs::construireSqlSupabase({meta,segments,id_oeuvre})` → chaîne SQL
- `metadonnees.mjs::parserMetadonnees(...)` / `titreSansAuteur(...)`
- `bilingue.mjs::apparierParagraphes / detecterLangue / numeroSection`
- `notes.mjs::recenserReferences / formaterNotes`

**Un seul analyseur ALTO** dans le logiciel (`parseAlto`) — ne le duplique pas.

---

## 6. Recette type (océriser une œuvre → import candidat)

```
1. POST /api/televerser?nom=oeuvre.pdf   (octets)         → { chemin }
2. POST /api/metadonnees { path: chemin }                 → meta (colonnes oeuvres)
3. Pour chaque page utile :
     POST /api/atelier/ocr { kind:"imprime", pdfWin:chemin, page, dpi:300, lang:"fra" }
     → accumuler dans projet.pages[page]
4. Renseigner projet.meta (les champs oeuvres) et un id_oeuvre.
5. POST /api/export { nom, projet, id_oeuvre, recenserNotes:true }
     → exports/<nom>.docx  (à lire)  +  .supabase.sql  (à relire puis exécuter)  +  .segments.json
6. RELIRE le SQL (surtout id_auteur / id_oeuvre), corriger, puis importer volontairement.
```

Des questions sur un endpoint précis ? Le code fait foi : `src/serve.mjs` (routes),
`src/wsl.mjs` (pont WSL), `src/projet.mjs` (segments + exports). Bon travail — et garde en tête :
**candidat, pas actif.**
