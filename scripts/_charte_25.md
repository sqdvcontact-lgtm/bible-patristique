25. Constitution des liens bibliques — méthode

Ordonnée **du plus sûr au plus incertain**. Chaque passe ne traite que ce que la précédente n'a pas su faire : on ne devine jamais ce qu'on peut lire. Le journal (§25.9) donne le rendement réel de chacune ; les impasses (§25.8) évitent de refaire les essais ratés.

### 25.0 — Deux règles qui priment sur tout

**1. La machine propose, l'éditeur dispose.** Aucune passe n'écrit jamais `fiabilite = 'vérifié'` : ce mot est réservé au jugement humain. Une passe pose `provenance = 'ia'` (ou `'editeur'` si elle ne fait que lire une référence de l'édition), et tout ce qui n'est pas certain porte `arbitrage_requis = true`. **Une reprise n'efface que ce qu'une passe a posé, jamais un arbitrage humain** — c'est à cela que sert `provenance`.

**2. Un lien absent coûte moins cher qu'un lien faux.** Le premier se voit, le second se propage. Toute la méthode en découle : chaque fois qu'on a le choix entre manquer et forcer, on manque.

### 25.1 — Passe 1 : les références de l’édition (LA PLUS SÛRE, À FAIRE EN PREMIER)

La plupart des éditions consignent elles-mêmes les références : entre parenthèses, ou en note. **Ce sont des liens déjà établis** — on ne devine plus, on lit. Sur la Somme théologique, une seule passe a produit **3 268 liens**, plus que tout l'appariement sur Job.

`node scripts/liens-references-editoriales.mjs <id_oeuvre> [--dry]` · `provenance = editeur`

**À FAIRE AVANT TOUT NETTOYAGE DU TEXTE.** Le §8 prescrit de supprimer les références pour la lisibilité : légitime, mais **seulement une fois les liens extraits**. Les *Annotations sur Job* d'Augustin ont été nettoyées d'abord — 734 segments sans une seule référence, tout a dû être reconstitué par appariement, avec ses approximations. Contrôle avant de toucher à une œuvre :

```sql
select count(*) filter (where segment_texte ~ '\([^)]*[0-9]') as refs_en_texte,
       count(*) filter (where notes is not null and notes <> '') as avec_notes
from segments where id_oeuvre = '…';
```

### 25.2 — Les cinq pièges de la lecture des références

Chacun a produit des faux SILENCIEUX — le créneau visé existe, la clé étrangère est satisfaite, et le lien est faux. Aucun ne se voit sans contrôle.

**1. Les psaumes sont en double numérotation** (§18). Notre ossature suit la numérotation grecque : `PSA.34` y est le Ps 35 hébreu. Les éditions françaises modernes citent en hébraïque. Sans conversion, « Ps 34, 16 » — « Les yeux du Seigneur sont fixés sur les justes » — atterrit sur `PSA.34.16`, qui dit « ils grincent des dents ». **Convertir par `versets_canon.ch_heb/v_heb`, et refuser plutôt que se rabattre sur le créneau direct quand la conversion échoue.**

**2. Les Rois selon la Vulgate.** Le système latin compte **1-2 Rois pour nos 1-2 Samuel**, et 3-4 Rois pour nos 1-2 Rois. « 4 Rois 4, 39 » (la coloquinte d'Élisée) est 2 Rois 4, 39. Une forme `Reg` isolée est ambiguë : ne jamais l'enregistrer, seulement les formes numérotées.

**3. Les livres numérotés.** « 1 Jn » doit être cherché ENTIER dans le dictionnaire (→ 1JN) : décomposer d'abord donne « Jn » → JHN, l'Évangile au lieu de l'épître. Et si le chiffre ne correspond à aucun livre jumeau (« 1 Jos »), **refuser** au lieu de deviner.

**4. Les renvois internes ne sont pas des livres.** « Ibid. 13, 14 », « Question 22. 48 », « Liv. III, 2 », « Hom. 4, 1 » renvoient au texte lui-même. Sans liste d'exclusion, ils sont cherchés dans la Bible et **finissent par y trouver quelque chose**. Sur la Somme : 415 écartés, sur Cyrille 43.

**5. Le chapitre doit exister.** Un lien au chapitre entier (« Lam 13 ») échappe au contrôle des versets. Un trigger de la base le refuse — mais il fait alors échouer TOUT le lot d'insertion. Valider avant d'écrire.

### 25.3 — La table d’équivalence des abréviations

**Chaque édition a ses conventions**, et une abréviation inconnue est une référence perdue en silence. La Somme écrit `1 Co`, L'Échelle du Paradis `1 Cor`, Cyrille cite en latin (`Joh`, `Petr`, `Reg`). Le dictionnaire était recopié dans chaque script, donc lacunaire dans chacun.

Il vit désormais en base : **`abreviations_bibliques`** — 234 formes, 3 systèmes (canonique / variante / toutes lettres), les 73 livres couverts. `forme` y est normalisée (minuscules, sans accent, espace ni point) : « 1 Cor. », « 1Cor », « 1 cor » sont la même clé.

| script | rôle |
|---|---|
| `abreviations-peupler.mjs` | alimente la table |
| `abreviations-inconnues.mjs` | **détecte ce qu’elle ignore**, par fréquence |

**Le second est l'outil clé.** Sur 132 809 segments il n'a trouvé que 14 formes inconnues — mais parmi elles, des choses qu'aucune liste de référence n'aurait données : formes latines (`Joh`, `Petr`, `Timoth`), `Nm`, et les coquilles d'OCR (`Rrn` pour `Rm`, `Jobe`, `Malache`). **C'est lui qui a révélé le piège des Rois.** Le lancer sur chaque œuvre nouvelle, avant la passe 1.

### 25.4 — Passe 2 : les formules d’introduction

Un Père annonce ce qu'il cite, et **nomme souvent le livre**. C'est le point décisif : le score lexical ne discrimine rien à lui seul, **ce qui fait tomber juste, c'est de restreindre le champ**. « L'Apôtre dit » ramène la recherche de 31 000 versets aux ~2 000 des pauliniennes — un facteur quinze sur le risque de rencontre fortuite.

`node scripts/liens-citations-introduites.mjs <id_oeuvre> [--dry]`

| formule | périmètre |
|---|---|
| le Psalmiste, David | PSA |
| saint Paul, l’Apôtre | les 14 pauliniennes |
| l’Évangile, le Sauveur, Notre-Seigneur | MAT MRK LUK JHN |
| le Prophète, Isaïe, Jérémie… | les 18 prophétiques |
| il est écrit, l’Écriture dit | **aucun** — tout le canon, donc seuil bien plus haut |

Seuils : **0,50** si le périmètre est nommé, **0,68** sinon. Rendement sur Job : 5 sur 20 — faible, mais c'est là qu'on atteint **ce qu'aucune autre passe ne trouve** : Ps 2, 11 et Ps 17, 29 cités au fil d'un commentaire sur Job.

### 25.5 — Passe 3 : l’alignement, pour les commentaires suivis

Réservée aux œuvres qui suivent un livre pas à pas (Augustin sur Job, les *Discours sur les Psaumes*). Reconnaître la forme d'abord :

```sql
select count(*) filter (where segment_texte ~ '[«"]') * 100 / count(*) as pct_guillemets
from segments where id_oeuvre = '…' and nature = 'texte';
```

À 0 % (Cyprien, Tertullien), les citations ne sont pas marquées : l'appariement n'a aucune prise, c'est un problème de source à régler avant.

**Aligner la suite, ne pas apparier verset par verset.** Chercher pour chaque lemme le verset le plus ressemblant donnait **4 justes sur 9** au chapitre I de Job, dans un ordre incohérent (7, 7, 4, 6, 7, 11, 6, —, 21) là où la vérité était strictement croissante (3, 4, 5, 6, 7, 11, 12, 15, 21). Un commentaire suit son texte : **cette croissance est une preuve plus sûre que la ressemblance des mots**. Alignement des deux suites d'un bloc (programmation dynamique) → **7 justes sur 9**, à score identique.

Trois garde-fous :

- **Plancher d'appariement** : jamais deux textes sans un mot commun, sinon l'alignement comble les trous au hasard.
- **Le premier segment d'un chapitre est le plus exposé** : aucun voisin ne l'ancre à gauche. C'est l'unique erreur restante du chapitre I (Job 1, 1 au lieu de 1, 3). À relire en priorité.
- **Normaliser les graphies** : Sacy imprime en 1730, le traducteur d'Augustin écrit au XIXe (« alloient » / « allaient », « enfans » / « enfants »). `oi` → `ai` puis troncature à cinq lettres, **des deux côtés** — donc sans danger. Seul raffinement lexical qui ait payé : 95 → 126 appariements sûrs.

**Le score gradue la confiance, il n'écarte pas.** Une fois l'alignement en place, trois appariements corrects du chapitre I (v. 4, 5, 12) tombaient sous l'ancien seuil.

| score | fiabilité | arbitrage |
|---|---|---|
| ≥ 0,42 | probable | non |
| ≥ 0,15 | probable | oui |
| < 0,15 ou déduit | douteux | oui |

### 25.6 — Passe 4 : combler les trous par la position

Restent des lemmes qu'**aucun mot** ne rattache : « Le juste se nourrira de ce qu'il aura amassé » contre « L'affamé dévorera sa moisson » — même verset, paraphrase totale. L'ordre étant garanti, un lemme abandonné entre deux voisins alignés est **forcément** entre leurs deux versets. **Quand il ne reste qu'un seul créneau libre dans l'intervalle, la déduction n'a pas d'autre issue** : on le pose en `douteux`, avec un motif qui dit qu'aucun mot ne le fonde. 48 segments récupérés sur Job, 133 → 85 écarts.

S'il reste plusieurs créneaux libres, **on ne devine pas**.

### 25.7 — Signaler ce qui ne se rattachera jamais

Un Père cite les profanes, ses prédécesseurs, des écrits hors canon. **Ces renvois n'ont pas de `canon_id` et n'en auront jamais** ; les laisser chercher dans la Bible fabrique des faux — c'est ainsi qu'un verset de psaume s'est logé dans Job 38, 10.

On les consigne comme **liens SANS CIBLE**, `fiabilite = 'à constituer'` avec un motif préfixé `RÉFÉRENCE NON BIBLIQUE (genre) :` — la contrainte `cible_unique` prévoit ce cas (§24.2). Ils remontent dans la file d'arbitrage au lieu de se perdre. Trois genres : auteur profane, Père de l'Église, écrit hors canon.

**Piège** : une œuvre peut n'avoir aucune citation exploitable tout en portant ces renvois (Tertullien : 0 citation entre guillemets, mais Cicéron et Sénèque nommés). Sauter l'appariement, **jamais l'écriture**.

### 25.8 — Tenté sans gain : ne pas y revenir sans raison neuve

- **Plusieurs traductions** (meilleur score des trois) : **gain nul** — 588 segments liés avant, 586 après. Les trois sont françaises et modernes, trop proches.
- **Pondération par la rareté** (IDF depuis `concordance_lexique`) : **gain nul** en volume, et elle déplace l’échelle des scores, donc oblige à recalibrer les seuils.
- **Listes de synonymes** : n'aideraient pas. Le blocage n'est pas lexical mais tient à la **paraphrase** ; rapprocher « nourrira/amassé » de « affamé/moisson » demande de comprendre le sens.

**Angle mort assumé.** Les passes 3 et 4 ne voient que le lemme de tête, dans le seul chapitre annoncé. Sur Job : **668 citations secondaires**, dont beaucoup d'un AUTRE livre (1 Co 3, 1 cité en commentant Job 3). La passe 2 en récupère une partie ; le reste demande un modèle de langue — seul moyen d'atteindre les types 2 et 4, aujourd'hui presque vides. La route `/api/admin/triage-ia` juge déjà des liens ; elle pourrait en proposer. **Mesurer sur un chapitre ce qu'un tel passage trouve ET ce qu'il invente avant de l'étendre.**

### 25.9 — Contrôles, et journal des œuvres

```sql
-- cibles mortes (doit valoir 0)
select count(*) from liens_bibliques l left join versets_canon v on v.id = l.canon_id
where l.canon_id is not null and v.id is null;
-- rien de « vérifié » au sortir d'une passe automatique
select count(*) from liens_bibliques where fiabilite = 'vérifié' and provenance = 'ia';
-- aucun lien n’a fui vers un autre livre que celui commenté
select distinct split_part(canon_id,'.',1) from liens_bibliques where segment_id in (…);
```

Et **relire un chapitre à la main**, verset par verset, avant d’écrire le reste.

| œuvre | passe | liens | rendement |
|---|---|---|---|
| A0013O0002 — Thomas, *Somme théologique* | 1 (références) | **3 268** | 3 269 résolues sur 3 305 lues ; 415 renvois internes écartés ; 18 hors ossature. 32 367 segments. |
| A0010O0100 — Augustin, *Annotations sur Job* | 3, 4, 2 | 1 294 | 636 segments liés sur 734 (87 %), dont 48 déduits par position ; 85 sans mot commun ; 5 par formule. **Œuvre nettoyée de ses références avant extraction** — d’où le recours à l’appariement. |
| A0044O0001 — Cyrille, *Catéchèses* | 1 | 63 | 64 résolues, 34 au chapitre entier ; 43 renvois internes écartés. |
| A0078O0001 — Jean Climaque, *L’Échelle* | 1 | 52 | 51 sur 54 ; graphies `1 Cor`, `Thes`, `Sam`, préfixe `cf.`, plusieurs références par parenthèse. `reference_manuelle` y porte l’auto-référence de l’œuvre, **non des liens bibliques**. |
| A0016O0001 — Origène, *Contre Celse* | 1 | 10 | 9 au chapitre entier ; 25 renvois internes. Faible : 0 % de guillemets, références rares. |

**À compléter à chaque œuvre**, avec le rendement réel et non l’intention.
