<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ⛔ La charte Supabase est l’UNIQUE boîte à règles (2026-08-24)

La doctrine vit dans **`parametres.charte_ia`**, et nulle part ailleurs. `charte/CHARTE_IA.md` n’en est qu’un **miroir**, régénéré par `node scripts/synchroniser-charte-supabase.mjs --pull` : ⛔ ne jamais l’éditer à la main, une correction portée sur le miroir se perd au premier `--pull`. Une règle nouvelle s’écrit dans Supabase, puis on tire le miroir.

**Ce fichier-ci porte les règles de CODE** — pièges du dépôt, conventions de rendu, invariants d’implémentation — et renvoie à la charte pour la doctrine éditoriale. ⛔ Quand les deux se contredisent, **la charte l’emporte** : ce fichier est alors en retard et se corrige, jamais l’inverse.

⛔ **`--push` est REFUSÉ depuis le 2026-08-25, et pas à cause de ce qu’on vient d’écrire.** Le garde-fou du script compte les numéros de titre en double et lève sur **`29.2`**, porté à la fois par `### 29.2 Précision thématique des bibliographies de péricopes` et par `## 29.2 Le nom d’une personne`. Le second est à un rang `##` entre `## 29` et `## 30` : c’est une coquille de numérotation, antérieure à la séance qui la découvre, et elle bloque toute poussée depuis le miroir. Tant qu’elle n’est pas arbitrée — renuméroter est un geste éditorial, pas technique —, une doctrine nouvelle s’écrit **directement dans Supabase**, puis se tire par `--pull`. ⚠️ Une poussée ponctuelle qui contourne ce seul contrôle garde tous les autres : sauvegarde de la ligne, verrou optimiste sur `mis_a_jour`, vérification que le texte local PROLONGE le distant, double relecture après écriture.

⚠️ **Les trois exemplaires avaient divergé** jusqu’au 2026-08-24 : le commit portait 116 547 signes, l’arbre de travail 187 384, Supabase 214 689, et aucun ne valait les autres. Supabase les contenait tous ; il portait en outre **21 suites « antislash + n » écrites en toutes lettres**, qui collaient listes, paragraphes et deux titres de niveau 2 sur une seule ligne — donc invisibles au rendu. Réparé et unifié par `scripts/charte-unifier-source-unique-2026-08-24.mjs`. Sauvegardes : clé `charte_ia_sauvegarde_20260824_avant_miroir` de `parametres`, et fichier `charte-locale-avant-miroir-20260824.md` déposé hors du dépôt, dans `C:\Corpus Scriptura`.

# Liens bibliques — protocole obligatoire

⛔ **Avant TOUTE constitution ou modification de liens bibliques (`liens_bibliques`), lire d'abord :**
1. la charte `parametres.charte_ia` (Supabase `oucotpxcjalwgetylfbz`), **§9** (types 1-4) et **§9.0** (ordre des passes, frontière mécanique/lecture, contrôle par sondage) ;
2. la mémoire `feedback_liens_protocole` (règle de lecture, méthode en deux passes, conventions de fiabilité).

Règles cardinales : la passe **mécanique** ne produit que du **type 1** et de la cible **« à constituer »** ; les **types 3 (commentaire) et 4 (écho)** relèvent de la **LECTURE seule** (mon travail, l'utilisateur contrôle). Invariant `scripts/_liens-commun.mjs::verifierLienMecanique` en place. **Contrôle par sondage** (`scripts/liens-controle.mjs`) obligatoire à la fin de chaque passe. Réciter la règle appliquée avant de coder.

# Numérotation native des éditions — invariant obligatoire

⛔ **Avant toute scission, fusion ou modification d'alignement dans `versets_v2` :**

- `ch_orig`, `v_orig` et `v_orig_suffixe` décrivent exclusivement la numérotation de l'édition source ; ils ne doivent jamais être déduits de `canon_id` ni de la numérotation AELF ;
- lorsqu'un verset source est scindé entre plusieurs cibles canoniques, chaque fragment conserve exactement les mêmes `ch_orig`, `v_orig` et `v_orig_suffixe` que le verset source ; ne jamais inventer de suffixes `a`, `b`, `c` pour distinguer les fragments ;
- seul l'alignement canonique varie entre les fragments (`canon_id`, `canon_id_fin`, `ordre_slot`) ;
- comparer les coordonnées au corpus source et à la sauvegarde préalable, puis contrôler après écriture que texte, canon et créneau n'ont pas changé accidentellement.

# `versets_lecture` est une vue MATÉRIALISÉE — piège de rafraîchissement

⚠️ Ce que lisent les pages de lecture (Bible, œuvre, péricope) via `versets_lecture` est une **vue matérialisée** (un cache), construite sur `versets_v2` (+ `versets_canon`). Elle porte les colonnes larges `TR000x` (texte) et `num_TR000x` (numérotation source), agrégées par créneau canonique.

**Conséquence** : toute modification de `versets_v2` (texte, numérotation, alignement) **ne s'affiche PAS** tant que le cache n'est pas rafraîchi. Après une correction de corpus, exécuter :

```sql
REFRESH MATERIALIZED VIEW public.versets_lecture;
```

Sans quoi une correction « ne se voit pas » et l'on croit à tort qu'elle a échoué. Vaut pour tout le monde (moi, l'utilisateur, Codex) : une écriture dans `versets_v2` sans refresh reste invisible côté lecture.

**Trouvaille de contexte (2026-08-05)** : la Bible de Sacy (`TR0001`) avait conservé le **numéro de verset imprimé en tête du texte** (« 1. MAis il faut… »), résidu d'un lot d'import — sur ~180 versets (2 Co 7-13, Galates 1, titres de psaumes). Corrigé dans `versets_v2` (retrait du seul préfixe `^\d+\.\s*`, sauvegarde `backup_tr0001_numerotation_20260805`), **puis refresh de la vue**. Segond et Crampon étaient propres : le défaut était propre à un import Sacy.

# Valeur académique des éditeurs / auteurs (bibliographie)

Notation éditoriale des sources bibliographiques — **doctrine : charte §29 et §29.1**. Tables `editeurs_valeur` et `auteurs_valeur` (`nom`, `score` 1..5, `statut_usage`, `reserve`+`motif` pour les auteurs, plus `confiance_evaluation`/`source_evaluation`/`evalue_par`/`evalue_at`), RLS **admin uniquement**. Score de **1 (le plus fiable) à 5**. Admin : onglet « Valeur académique » (`/admin?onglet=fiabilite`, `app/admin/SectionFiabilite.tsx`).

⚠️ **Correspondance imposée par la base** : le code écrit `statut_usage` accordé au score (1→`reference`, 2→`solide`, 3-4→`secondaire`, 5→`exclu`, absent→`a_verifier`) sinon l'écriture est refusée. Logique pure et testée dans `app/admin/qualification.ts` (`statutUsagePourScore`, `messageErreurQualification`).

⚠️ **Peupler depuis le RÉEL** : ces listes couvrent les éditeurs et auteurs effectivement cités dans `ouvrages_bibliographiques` (colonnes `editeur`, `auteurs`), à charger depuis leurs valeurs distinctes — **jamais une liste inventée**. Ne pas confondre avec la table `editeurs` (éditeurs des éditions **primaires** : François Guyot, Vivès, Bloud & Gay… — autre usage). Terminologie : « valeur académique » (critères objectifs), pas « fiabilité » ; la `reserve` protège un public fragile, ce n'est pas un jugement de la personne.

**Qualification scientifique des ouvrages (déployée en base)** : la valeur finale d'un ouvrage est CALCULÉE par la base dans `ouvrages_bibliographiques.statut_scientifique` (`retenu`/`secondaire`/`a_verifier`/`exclu`) — **le code ne la recalcule jamais**. Décision manuelle via `statut_scientifique_override` (null = calcul auto ; exclusion = motif obligatoire). Quatre vues selon le contexte : `pericopes_documentation` (doc interne), `bibliographie_admissible` (sélection interne, écarte exclus/à vérifier), `bibliographie_publiable` (public : lien vérifié + ouvrage validé + retenu/secondaire), `v_ouvrages_bibliographiques_qualite` (admin qualité). **Choisir la vue, ne pas réapprocher le filtrage en TS.** La page `pericopes/[id]` lit `bibliographie_admissible` provisoirement (cible : `publiable`). Admin des ouvrages : onglet « Ouvrages » (`/admin?onglet=ouvrages`, `app/admin/SectionOuvrages.tsx`) ; écriture réservée par la policy RLS `ouvrages_bibliographiques_admin_all`. Un chercheur = fiche notée ; un Père/auteur ancien ou collectif = source, **jamais de fiche notée**.

# Le nom d'une personne en trois rubriques (2026-08-24)

Doctrine : charte `parametres.charte_ia`, **§29.2**. Règles de code :

- **Tout passe par `app/lib/nomsPersonnes.ts`** (module pur, 24 tests) : `decouperNom`, `nomAncien`, `nomCollectif`, `composerNom`, `composerNomIndex`, `cleTriNom`, `separerNoms`. ⛔ Ne jamais recomposer un nom ailleurs : c'est ainsi que les formes divergent.
- **Colonnes** : `auteurs_valeur.prenom`, `.nom_famille`, `.pseudonyme`, toutes nullables, migration `auteurs_valeur_nom_en_rubriques`. ⚠️ La colonne s'appelle **`nom_famille`** parce que `nom` était déjà pris par la forme affichée, alors que `NomStructure.nom` du module EST le nom de famille. Les deux vocabulaires se rencontrent dans un `partiesDe` local, et nulle part ailleurs.
- ⛔ **`auteurs_valeur.nom` n'est JAMAIS réécrit depuis un écran.** C'est la clé de rapprochement avec `ouvrages_bibliographiques.auteurs` (texte libre) et `ouvrage_contributeurs_scientifiques.nom_affiche`, tous deux appariés par égalité de chaîne. L'affichage passe par `composerNom(parties, nom)`, qui retombe sur `nom` tant que les rubriques sont vides : un écran ne se vide donc jamais parce qu'une reprise n'est pas passée.
- ⛔ **`decouperNom` ne s'appelle QUE sur une personne moderne.** La nature est une donnée (`nature_personne`), elle ne se devine pas au nom : « Adalbert de Vogüé » et « Irénée de Lyon » s'écrivent pareil et ne se traitent pas pareil. Pour un ancien, `nomAncien` pose la chaîne entière en pseudonyme ; pour un collectif, `nomCollectif` ne pose rien.
- **Reprise** : `scripts/noms-rubriques-reprise.mts` (rapport seul par défaut, `--ecrire` pour appliquer). ⚠️ **Garde-fou** : une fiche n'est écrite que si `composerNom(parties)` redonne le `nom` au caractère près. Le découpage ne fait que reconnaître des morceaux dans une chaîne, il ne la réécrit pas, et la reprise ne peut donc changer aucun affichage. Passe du 2026-08-24 : 442 fiches, 0 refusée, 38 signalées.
- ⛔ **Un nom de notice sans fiche ni ligne de contributeur se SIGNALE, il ne se crée pas.** `internal.calculer_statut_scientifique_ouvrage` déclasse en `a_verifier` tout ouvrage dont un `auteur_scientifique` n'a pas de score (branche `auteur_non_evalue`) : ouvrir une fiche non notée change donc la valeur scientifique de l'ouvrage. C'est un arbitrage éditorial. `scripts/noms-orphelins.mts` les recense (45 au 2026-08-24). ⚠️ Un **directeur** ou un **traducteur** n'entre pas dans cette branche, seul l'auteur y entre : la conséquence n'est pas la même selon le rôle.
- **Les deux vérités d'un ouvrage ne se confondent pas.** Le texte libre (`auteurs`, `directeurs`, `traducteurs`) est la liste FIDÈLE et complète ; `ouvrage_contributeurs_scientifiques` en est la normalisation PARTIELLE, celle qui entre dans le calcul. Mesuré le 2026-08-24 : 13 ouvrages divergent sur les auteurs, 45 sur les directeurs, 31 sur les traducteurs. ⛔ Ne pas faire dériver l'un de l'autre : recomposer le texte depuis les contributeurs perdrait six auteurs sur l'ouvrage 623.
- **Affichage inchangé, « Prénom Nom »** (décision de l'auteur). Les rubriques servent le tri, l'index et la recherche. `composerNomIndex` met le nom de famille devant ; sous pseudonyme, on classe au nom civil quand il est connu.
- **Un auteur ancien se désigne par un RENVOI** : `ouvrage_contributeurs_scientifiques.auteur_id` → `auteurs(id_auteur)`, réservé par CHECK aux lignes de nature `auteur_ancien` (migration `contributeurs_auteur_source_et_noms_alternatifs`). ⚠️ Il NOMME, il n'évalue pas : `internal.calculer_statut_scientifique_ouvrage` ne le regarde pas, et rattacher une ligne ne change aucun statut. Vérifié à la reprise du 2026-08-24 : 68 lignes rattachées, **zéro** statut modifié (sauvegardes `internal.backup_contributeurs_auteur_id_20260824` et `internal.backup_statuts_ouvrages_20260824`).
- **Noms alternatifs** : `auteurs.variantes` (source) et `auteurs_valeur.aliases` (chercheur), tous deux `text[]`, saisis séparés par des virgules, sur le modèle de `editeurs.variantes`. Le découpage est `listeDepuisVirgules` (`nomsPersonnes.ts`), qui écarte les doublons et normalise l'apostrophe. ⛔ Ils RÉSOLVENT le nom vers sa fiche, ils ne s'affichent jamais à sa place. Rattacher une ligne dont le `nom_affiche` diffère du `nom` du registre y inscrit ce nom : c'est ce qu'est une variante.
- ⚠️ **`nom_affiche` reste sur la ligne de contributeur même rattachée**, et ce n'est pas un doublon : la contrainte `ouvrage_contributeurs_uq` porte sur `(ouvrage_id, role_contributeur, nom_affiche)`, et c'est encore par lui que la vue de qualité apparie les rangs (`contributeurs[].nom`). Le renvoi le double, il ne le remplace pas.

# La fiche d'un ouvrage se lit par VOLETS (2026-08-24)

⚠️ `app/admin/SectionOuvrages.tsx` portait ses quatre panneaux d'un seul tenant : une trentaine de champs à l'écran là où l'on ne fait qu'une chose à la fois. Trois volets (valeur, auteurs & autorités, notice) se prennent l'un après l'autre ; l'**en-tête ne bouge pas**, portant l'identité de l'ouvrage et le statut éditorial, qui doivent être sous les yeux quel que soit le volet.

⛔ **Trois blocs se disputaient la même matière** : les noms de la notice, les contributeurs, le formulaire d'ajout. Ils disaient les mêmes personnes sous trois formes. Un seul désormais : **une ligne par personne**, qui n'ouvre ses champs qu'au clic, le formulaire d'ajout replié derrière un bouton. C'est le geste le plus rare de l'écran et il tenait quatre champs en permanence.

⚠️ **Un menu de filtre se nomme dans sa PREMIÈRE LIGNE** (« Tri : titre », « État : tous ») plutôt que sous une étiquette : trois étiquettes au-dessus de trois menus font six rangées pour trois réglages, dans une colonne de 26 rem où la place appartient à la liste. Poser `aria-label`, l'étiquette visible ayant disparu.

# Style rédactionnel (textes du site)

Pour toute prose destinée au site (cartes, chapeaux, messages, mentions) : **ne pas employer d'incises entre tirets** (`— … —` ou `– … –`). Faire des phrases distinctes, ou introduire une énumération par deux-points. C'est le style de l'auteur (« dans mon style, toujours »). Vaut aussi pour retoucher les textes existants, pas seulement les nouveaux.

# Titre d’onglet — le gabarit du layout suffit

`app/layout.tsx` pose `template: "%s · Corpus Scriptura"`. **Une page ne nomme donc jamais le site dans son propre `title`** : elle écrit `title: 'Statistiques'`, et le gabarit fait le reste. Une page qui doit porter un titre entier (l’accueil, la lecture biblique, la page d’œuvre, les pages légales) déclare `title: { absolute: … }`, qui neutralise le gabarit.

- ⚠️ Onze pages écrivaient « — Corpus Scriptura » en plus du gabarit, d’où « Statistiques — Corpus Scriptura · Corpus Scriptura » dans l’onglet, dans les partages et dans les résultats de recherche (relevé le 2026-08-19). Le séparateur du site est le point médian `·`.
- Le test `app/lib/titresPages.test.ts` parcourt les `page.tsx` et refuse tout titre qui nomme le site sans `absolute`. Seule `/quiz` en est exemptée (route neutralisée, version vivante sur la branche Holy Guessr).

# Métadonnées — on n'annonce QUE ce que la page porte (2026-08-24)

Les modèles vivent dans **`app/lib/metadonneesSeo.ts`** (pur, 38 tests) et les lectures qui les alimentent dans **`app/lib/metadonneesSeoServeur.ts`**. Quatre familles servies : passage biblique (`app/page.tsx`), auteur (`app/auteur/[id]/layout.tsx`), œuvre (`app/oeuvre/[id]/page.tsx`), péricope (`app/pericopes/[id]/layout.tsx`). ⛔ Ne pas recomposer un titre ni une description ailleurs : `app/lib/metadonneesPages.test.ts` parcourt les routes et le refuse.

**Le titre dit deux choses, dans cet ordre : l'objet documentaire, puis ce que Corpus Scriptura y apporte.** « Jean 1 » seul ne distingue ce site d'aucun autre ; « Exégèse patristique johannique » ne se cherche pas. D'où « Jean 1 — Commentaires des Pères de l'Église ».

⛔ **Et jamais rien qu'on ne puisse montrer.** Un chapitre que personne ne commente s'annonce « Texte biblique et traductions » ; un chapitre seulement cité s'annonce « Citations », non « Commentaires » ; une œuvre dont aucun texte n'est public ne promet pas « le texte intégral » ; un auteur sans œuvre éditée ne promet pas d'œuvres. Les quatre replis sont éprouvés sur les données réelles.

⚠️ **Une nature de rapport ne se devine pas au nombre de liens.** `naturePatristique` retient la plus FORTE des natures présentes (charte §9 : 3 doctrine > 1-2 citation > 4 écho), et le titre nomme celle-là. Au 2026-08-24 : 811 chapitres commentés, 279 seulement cités, 3 en écho seul.

⛔ **L'ordre des auteurs est CHRONOLOGIQUE**, celui du volet patristique (voir « Apparat patristique »), et pour la même raison : un titre qui promet les Pères de l'Église ne peut pas ouvrir sa description sur Thomas d'Aquin. Classer par nombre de liens le mettait en tête de presque tous les chapitres, la Somme théologique étant l'œuvre la plus liée du corpus. `chargerPresencePatristique` réemploie `anneeChronologique`, et le nom départage deux contemporains — **à donnée égale, un titre doit être le même à chaque visite**.

⚠️ **`order('id')` sur les deux requêtes de liens n'est pas un ornement** : PostgREST plafonne les lignes rendues, le chapitre le plus lié en compte 1 286, et sans ordre imposé une troncature laisserait Postgres choisir QUELS auteurs nommer.

⛔ **`openGraph` et `twitter` ne se fusionnent PAS avec ceux du layout racine** : une page qui en déclare un le remplace ENTIÈREMENT (doc Next, « Merging »). D'où `enTetesPartage`, qui repose l'image, le type et le nom du site avec le titre. Une page qui n'en déclare aucun hérite du générique, ce qui est le cas de toutes les autres.

⛔ **Un espace PERSONNEL et une page de RÉSULTATS ne s'indexent pas** : `robots: HORS_INDEX` sur `/recherche`, `/compte`, `/progression`, `/prelevements`, `/messagerie`, `/essais/mes-ecrits` et `/bienvenue`. Le premier ne regarde que son titulaire, la seconde n'est pas un document mais une vue sur d'autres documents, et une infinité de requêtes ferait une infinité d'adresses aux contenus qui se recouvrent. La liste est **tenue par la garde** : un espace personnel neuf sans consigne fait échouer les tests, ce qui est le seul moment où l'on peut encore y penser. ⚠️ `follow` reste implicite : on refuse l'indexation de la page, non le suivi des liens qu'elle porte. ⛔ Ne PAS l'ajouter à `/admin` : `robots.txt` en interdit déjà l'exploration, et une consigne qu'un robot ne peut pas lire ne sert à rien. ⚠️ `/profil/[pseudo]` est laissé indexable, faute d'une décision : c'est une page publique, mais elle porte le pseudonyme et la citation favorite d'une personne réelle.

**Canonique.** La page Bible désigne `/?livre=X&chapitre=N` : traduction, mode, graphie, texte en regard, appareil écarté et verset visé sont des habits d'un même chapitre, et neuf adresses pour une page se comptaient neuf fois. La page d'œuvre désigne `/oeuvre/<id>`, sauf version de texte explicitement demandée, qui change le contenu. ⚠️ Aucune URL n'est modifiée : on dit seulement laquelle fait foi.

⛔ **Plus de `<meta name="keywords">`.** Google l'ignore depuis 2009 ; les variantes de nom passent par `alternateName` du JSON-LD, qui est lu. ⚠️ Elles étaient QUATRE et non trois : c'est la garde qui a trouvé la quatrième, `app/traductions/page.tsx`, qu'une lecture à l'œil avait manquée.

**Péricope** : le titre porte les DEUX façons de chercher un passage nommé, son nom et sa référence, puis l'appoint patristique. ⚠️ Le nom peut à lui seul être une phrase (« Mon Dieu, mon Dieu, pourquoi m'as-tu abandonné ? ») : dix-sept titres passaient cent signes quand un moteur en montre soixante. Au delà de 72 signes, **c'est l'APPOINT qui cède**, seul des trois à n'être ni le nom ni la référence. ⛔ Et la formule d'avant promettait « ses correspondances patristiques » à TOUTES les péricopes, y compris aux treize qui n'en ont aucune.

**`mentions` du JSON-LD est une AFFIRMATION sur le contenu de la page.** Le volet patristique étant rendu par le NAVIGATEUR, les noms des Pères n'existaient dans AUCUN document servi, et une description n'en nomme que trois ou quatre. `donneesChapitreBible` et `donneesPericope` les portent donc en `mentions`, et **seulement ceux qui sont réellement liés au passage** (`app/lib/donneesStructurees.test.ts`). La page Bible n'avait par ailleurs aucune donnée structurée, alors qu'elle est la porte d'entrée la plus cherchée du site.

⚠️ **`presenceDuChapitre` est mis en cache par React** (`cache()` de `app/page.tsx`) : `generateMetadata` et le corps de la page décrivent le même chapitre, et le routeur les exécute dans la MÊME requête. ⛔ Le client Supabase se crée DEDANS — passé en argument, il serait une valeur neuve à chaque appel et le cache ne servirait jamais. Même raison pour `cache()` sur les fiches d'auteur et de péricope, dont `generateMetadata` et le corps du layout demandent les mêmes faits.

⚠️ **Un point suivi d'une espace ne finit pas toujours une phrase.** `couperDescription` exigeait naguère trois lettres devant le point : sans quoi « traduit par M. Horiot » se coupait à « traduit par M. », qui se lit comme un nom de traducteur. Et une description d'œuvre trop longue **retire un complément entier** plutôt que de couper la phrase.

**Contrôle.** Trois scripts d'atelier dans `tmp/` (non versionné) : `controle-metadonnees-seo.mts` (échantillon commenté), `balayage-metadonnees-seo.mts` (1 108 chapitres, 50 œuvres, 536 auteurs) et `balayage-pericopes-seo.mts` (249 péricopes, dont 236 avec apparat). Ils cherchent les titres vides, les doublons, les `undefined`, les séparateurs orphelins et les doubles noms de site. ⚠️ Ils appellent les MÊMES fonctions que les pages, y compris les lectures PostgREST : une erreur d'embed s'y voit avant la production.

⚠️ **Le HTML rendu ne se contrôle qu'en session.** Le verrou de bêta écarté, `anon` n'a de droit sur rien : la page Bible tombe en 500 sur `versets_lecture` et les pages d'auteur et d'œuvre rendent leur repli. Next émet toutefois les métadonnées MÊME sur une page en erreur, ce qui suffit à éprouver les balises : titre unique, canonique absolue avec sa chaîne de requête, jeu Open Graph complet, aucun doublon.

# ⛔ Référencement — la liste de l'OUVERTURE (audit du 2026-08-25)

Ce qui suit a été **audité, chiffré, puis délibérément remis à l'ouverture du site** (décision de l'auteur, 2026-08-25). Rien n'en a été mis en œuvre. ⛔ Ne pas traiter ces points au fil de l'eau : ils se tiennent, et le premier commande tous les autres.

**1. ⛔ PRÉALABLE — `anon` n'a de droit de lecture sur RIEN, et ce n'est pas une affaire de RLS.** Éprouvé depuis la position exacte d'un robot — `node --env-file=.env.local scripts/audit-lecture-anonyme.mjs`, onze tables refusées sur quatorze : `versets_v2`, `versets_lecture`, `oeuvres`, `oeuvre_textes`, `segments`, `liens_bibliques`, `pericopes`, `pericope_occurrences`, `auteurs` et `livres` rendent tous `permission denied for table` — le **GRANT** manque, en deçà de toute politique. ⚠️ La politique « Lecture publique des auteurs » existe pourtant et porte bien sur `{public}` : **elle ne sert à rien sans le droit sous-jacent**, et sa seule présence trompe la lecture. Seules `traductions`, `essais` et `versets_canon` répondent. Conséquence : à l'ouverture, chaque page de contenu se rendra VIDE pour un moteur, et les titres posés dessus (« Jean 1 — Commentaires des Pères de l'Église ») en feront des *soft 404*, sanctionnés plus durement qu'une page absente. **Décider la surface publique table par table, puis vérifier que chaque famille se rend ENTIÈRE sans session.**

**2. L'adresse des chapitres.** `/?livre=JHN&chapitre=1` → `/bible/jean/1` : le mot cherché entre dans l'URL, la hiérarchie devient lisible, la racine se libère. ⚠️ **Rien n'étant indexé, la migration ne coûte rien — elle ne sera jamais moins chère.** Voie sûre : la nouvelle route rend la même page, l'ancienne forme redirige en 308, la canonique désigne la nouvelle.

**3. La racine.** `/` redirige vers `/accueil` : l'adresse la plus forte du domaine est une redirection, et `sitemap.ts` pointe dessus. Même famille : `/populaires`, `/concordance` et `/notifications` sont des déplacements DÉFINITIFS servis en 307 temporaire — `permanentRedirect()` transmet les signaux, `redirect()` les retient.

**4. Deux familles rendues par le NAVIGATEUR.** `app/auteur/[id]/page.tsx` et `app/pericopes/[id]/page.tsx` sont `'use client'` et chargent tout depuis le navigateur : même la base ouverte, le budget de rendu JavaScript de Google est limité et différé. Or **la péricope est le contenu le plus distinctif du site** — ses noms et ses notices sont une écriture originale, quand le texte biblique est sur mille autres sites. ⚠️ La fiche d'auteur n'a en outre aucun `<h1>` (la modale porte un `<h2>`).

**5. Le maillage chapitre ↔ péricope n'existe PAS.** La vue `versets_pericopes` est en base et n'est utilisée nulle part. 270 chapitres recouvrent 249 péricopes (376 occurrences, 53 péricopes à occurrences multiples — les parallèles synoptiques). Un « Ce chapitre contient : *Les noces de Cana* » relierait les pages les plus cherchées aux pages les plus distinctives.

**6. Le plan du site** ne compte que trois adresses. Le générateur est prêt (`SITE_OUVERT=1`) mais **ignore les chapitres**, qui sont la famille principale : 1 334 chapitres du canon, dont **1 093 portent de la matière patristique** (82 %), et **662 en portent dix liens ou plus**, 113 plus de cent. Prioriser sur cette dotation réelle.

**7. Deux trous de métadonnées** : `/bibliotheque` n'a pas de description alors que c'est une page d'entrée ; une quinzaine de pages stables n'ont pas de canonique.

**8. Une image de partage par page** (`opengraph-image`), au lieu du `/og-image.png` commun.

**9. À mesurer après ouverture** : les Core Web Vitals. `PanneauPatristique` fait 1 583 lignes, `BibliothequeClient` 1 845, `Navbar` 1 537 ; le poids du JavaScript n'a jamais été mesuré.

**10. La liste des robots d'IA ne distingue pas deux choses différentes.** Ceux qui **entraînent** (GPTBot, Google-Extended, Applebot-Extended) et ceux qui **citent en répondant** (OAI-SearchBot, PerplexityBot, ClaudeBot). Refuser les seconds rend le site invisible dans ChatGPT, Perplexity et Claude, c'est-à-dire auprès du lecteur qui cherche précisément un verset commenté par Augustin. ✅ Google Search n'est pas touché : bloquer `Google-Extended` n'affecte que l'entraînement, jamais le classement — c'est bien vu, et la même distinction pourrait valoir pour les autres. **Décision éditoriale, non technique** : elle touche à la réservation TDM (charte), donc elle revient à l'auteur.

# Responsive / mise à l'échelle (écrans desktop)

Le site est dessiné en pixels fixes calibrés pour un portable. Pour l'agrandir sur grand écran **sans le refondre**, on scale par une **police racine fluide** et une conversion **px → rem** progressive, page par page.

- **Moteur** : `html { font-size: clamp(16px, calc(7px + 0.625vw), 22px) }` dans `app/globals.css` — 16px jusqu'à 1440px (aucun changement visuel sur portable), puis grandit jusqu'à 22px à 2400px (×1,375). On ne touche **QUE** `font-size` : les unités `vh` restent intactes, donc les mises en page pleine hauteur `calc(100vh - 48px)` ne débordent jamais. **C'est la raison qui écarte `zoom`** (qui rescale les `vh` et fait déborder).
- **Convention de conversion** : passer en **rem** (valeur px ÷ 16) tout ce qui gouverne **taille de texte, mesure de lecture, rythme de lecture, largeur de colonne de contenu**. **Rester en px** pour : filets/bordures `1px` (le rem devient flou), géométrie de chrome à hauteur fixe (grilles serrées, boutons), largeurs de volets **persistées en localStorage** (drag), et la **hauteur de Navbar (48px)**.
- **Piège des blocs `<style>` (trouvaille)** : les conversions qui ne visent que les styles *inline* (`fontSize`) laissent intacts les `font-size` en **kebab-case** DANS les blocs `` <style>{`…`}</style> ``. Ces restes ont persisté sur le chantier, les sections admin et plusieurs pages lecteur (recherche, essais, traductions, bibliothèque, compte, commentaires…), restant petits sur grand écran alors que le reste grossissait. **Convertir aussi le CSS des blocs `<style>`**, en **sautant les lignes `@media`** (sinon on casse la valeur du breakpoint) et en gardant le garde-fou iOS `font-size: 16px` au focus. Repérage : `grep -rnE 'font-size: *[0-9]+px' app` (doit ne plus rien renvoyer hors le `16px !important` iOS).
- **Mesure de lecture** : tokens `--mesure-*` dans `:root` (`globals.css`), en rem, pour que la colonne conserve ses proportions (mêmes caractères/ligne) quand le texte grossit.
- **Navbar** : hauteur = **`HAUTEUR_NAVBAR = '3.5rem'`** (chaîne rem, dans `app/lib/mesures.ts`) → la barre grandit avec la police racine. Tous les décalages du site sont accordés à cette valeur : `calc(100vh/100dvh - 3.5rem)`, `top/paddingTop/scrollMarginTop: '3.5rem'`. ⚠️ **`HAUTEUR_NAVBAR` n'est plus un nombre** : ne jamais faire d'arithmétique JS dessus — composer en `calc(${HAUTEUR_NAVBAR} + Npx)` (cf. `SOMMET_CORPS` dans `polyglotte/page.tsx`, en-têtes collants). Pour changer la hauteur, modifier `mesures.ts` **et** répercuter la valeur sur ces décalages. Breakpoint du menu desktop : `md` → **`lg` (1024px)** pour éviter le tassement des liens.
  - ⛔ **Un décalage de navbar ne s'écrit JAMAIS en pixels** (relevé et corrigé le 2026-08-19). Treize `scrollMarginTop: '60px'` traînaient contre un seul composé sur `HAUTEUR_NAVBAR`, plus un en-tête collant à `top: '56px'` dans `/progression`. Or la barre mesure 56 px à la racine 16 mais **77 px à la racine 22** : un saut d'ancre déposait donc sa cible **17 px sous la barre** sur un grand écran, et l'en-tête collant s'y glissait dessous. Tous rattachés à `calc(${HAUTEUR_NAVBAR} + 4px)`, qui rend exactement 60 px à la racine 16 et suit la barre ensuite. Repérage : `grep -rnE "scrollMarginTop: '[0-9]+px'" app` doit ne rien renvoyer.
- **Un blanc VERTICAL entre deux lignes de titre se mesure en `em`, pas en rem ni en px.** La règle du rem vaut pour les tailles ; pour l'espace qui sépare deux blocs de texte, la bonne unité est l'`em` du bloc qu'il accompagne, parce que ce bloc porte souvent un `clamp` et ne suit donc pas la police racine linéairement. Cas du 2026-08-19, frontispice d'œuvre (`app/oeuvre/[id]/PageTitre.tsx`) : les corps étaient sous `clamp`, les blancs en pixels. Le titre passait de 59px sur un grand écran à 33px sur un téléphone pendant que le blanc de 42px ne bougeait pas — les deux tiers d'un titre de bureau, un titre entier sur un téléphone. Le groupe des titres s'y coupait en deux et les informations éditoriales paraissaient appartenir à autre chose. En `em`, la composition garde ses proportions à toute taille.
- ⛔ **Le décalage sous la navbar est posé UNE SEULE fois, par `#cs-corps` — ne jamais le remettre sur un `<main>`.** `app/layout.tsx` enveloppe déjà `{children}` dans `<div id="cs-corps" style={{ paddingTop: HAUTEUR_NAVBAR }}>`. Sept pages le reposaient par-dessus, si bien que la hauteur de la barre était comptée **deux fois** : mesuré le 2026-08-19 sur `/librairies`, **107px** entre le bas de la barre et le titre au lieu de 38. Sur un téléphone, c'est un cinquième du premier écran perdu avant le premier mot. Le défaut ne se voit pas en lisant une page seule — il faut savoir ce que fait le gabarit. Repérage : `grep -rn "paddingTop: '3.5rem'" app --include=*.tsx | grep -v layout.tsx` doit ne rien renvoyer.
- ⚠️ **Corollaire : `minHeight: '100vh'` sur ce `<main>` est faux aussi**, puisqu'il s'ajoute au rembourrage du parent — d'où `3.5rem` de défilement fantôme. La bonne valeur est `calc(100vh - 3.5rem)`. Deux pages la portaient (`bibliotheque`, `messagerie/[pseudo]`).
- ⛔ **Piège du `clamp(…px…)` — il POSE UN PLAFOND au lieu de faire grandir.** Seize déclarations de taille gardaient des bornes en pixels, et c'étaient sans exception les **titres de page**, donc les plus gros caractères du site. Les bornes d'un `clamp` en px sont absolues : elles ne suivent pas la police racine. Mesuré sur `/contact`, le titre restait à **34 px de 1280 px à 2400 px de large** pendant que le corps de texte passait de 13,5 à 18,6 px. Le rapport titre/texte tombait de **2,52 à 1,83** : la hiérarchie s'aplatissait à mesure que l'écran s'agrandissait. Converties en rem, les seize bornes rendent un rapport **constant à 2,07**. Repérage : `grep -rnE "fontSize: *['\"]clamp\([^)]*px" app` doit ne rien renvoyer.
- ⛔ **Une ILLUSTRATION se borne par deux MAXIMA, jamais par une largeur posée.** Même piège que le `clamp(…px…)`, un cran plus loin (relevé le 2026-08-22 sur la tour de Babel du Polyglotte, `app/polyglotte/page.tsx`). La gravure portait `width: min(816px, 96%)` : une valeur absolue, qui ne suivait ni la colonne ni la police racine. Sur un grand écran tout grandissait d'un tiers autour d'elle pendant qu'elle gardait ses 816 px — **elle rapetissait donc à mesure que l'écran s'agrandissait**. En rem (51rem = les mêmes 816 px à la racine 16), elle rend 969 px à 1920 et 1 122 px à 2400.
- ⚠️ **Corollaire, et c'est le vrai piège : ajouter un `max-height` à une largeur POSÉE écrase l'image au lieu de la recalculer.** Une gravure large (ici 1436 sur 870) déborde d'un bloc centré par `translate(-50%, -50%)` dès que la fenêtre est BASSE, et elle déborde des deux côtés à la fois, sa tête passant sous l'en-tête collant. Le réflexe est d'ajouter un plafond de hauteur — mesuré sous une fenêtre de 600 px, il rendait **816 sur 400, soit un rapport de 2,04 au lieu de 1,651** : une tour de Babel étirée en travers. La largeur étant définitive, le navigateur n'a plus de degré de liberté pour tenir les proportions, et le défaut ne se voit qu'en redimensionnant en HAUTEUR, ce qu'on ne fait presque jamais. **La bonne écriture laisse les deux dimensions automatiques et ne pose que des maxima** : `maxWidth: min(51rem, 96%)` + `maxHeight: calc(100dvh - 3.5rem - 9rem)`, sans `width` ni `height`. Le navigateur applique alors les maxima l'un après l'autre en tenant le rapport (CSS 2.1, § 10.4). Dans le `calc`, le deuxième terme réserve la navbar et le troisième la légende et les marges.
- **Portée** : desktop d'abord ; le mobile est traité ensuite (ci-dessous).

# Échelle typographique et rangs de titre (2026-08-19)

## L'échelle — `app/lib/echelleTypographique.ts`

Le site comptait **112 tailles de texte distinctes**, dont une trentaine se pressaient entre 10 et 14 px, séparées par des **centièmes de pixel** : 12,64 et 12,65 ; 11,50 et 11,52 ; 10,08, 10,17, 10,24, 10,35, 10,40. Aucun œil ne les distingue, et aucune grille ne survit à trente valeurs voisines.

**L'origine est instructive** : deux familles se superposaient, une échelle de base (9, 10, 10,5, 11, 12, 13…) et la même **multipliée par 1,15** (10,35, 11,50, 12,075, 12,65, 13,80, 13,225…), résidu d'une hausse générale passée sur une partie du site. La conversion px → rem est arrivée par-dessus et a **figé le désordre au lieu de le résoudre** : elle a converti fidèlement des valeurs qui n'avaient jamais été réduites à une grille. *Corollaire de méthode : convertir une unité n'est pas poser un système.*

Les 112 valeurs sont rabattues sur **32 rangs**, pas de 0,5 px sous 14 px puis 1 px, puis des sauts plus larges. Le rabattage est **ancré sur les valeurs dominantes** (11,5 · 11 · 12 · 13 ; 13,80 → 14 ; 12,65 → 12,5) et son déplacement maximal est de **0,86 px, soit 3,5 % au pire** : le rendu ne bouge pas, seuls les doublons disparaissent. Même méthode que la passe couleur, et pour la même raison.

`app/lib/echelleTypographique.test.ts` parcourt `app/` et refuse toute taille hors grille, **styles en ligne comme blocs `<style>`**. C'est ce test, et non la bonne volonté, qui empêche la dérive de revenir. Exemptions : les unités **relatives** (`em`, `%`), qui se règlent sur leur contexte, les `clamp(…)` des frontispices, et `EssaiPDF.tsx`.

## Les rangs de titre — `app/lib/hierarchieTitres.ts`

Chaque page composait son `<h1>` pour elle-même. Il n'en résultait pas une variété voulue mais une **absence de rang** : le même titre principal allait de **16,8 px en gras** (volet de l'Histoire, catalogue des péricopes) à **50 px en maigre** (frontispice d'œuvre), en six encres et trois graisses. Sur deux pages, le titre principal était plus petit que le texte courant de la page voisine, et mis en gras : composé comme une étiquette, pas comme un titre.

Quatre rangs, chacun **ancré sur celui qui dominait déjà** :

| Rang | Taille | Graisse | Encre | Ancre |
|---|---|---|---|---|
| **Frontispice** | `clamp(…rem…)` propre à chaque surface | normal | `--cs-encre-fonce` | page de titre d'œuvre, ouverture d'essai, accroche d'accueil |
| **Titre de page** | `TITRE_PAGE` = `1.75rem` | normal | `--cs-encre-fonce` | `.cc-titre` du centre de contrôle |
| **Titre de volet** | `TITRE_VOLET` = `1.15rem` | 500 | `--cs-encre-fonce` | `NavLivres` |
| **Titre de carte** | `TITRE_CARTE` = `1.375rem` | normal | `--cs-encre` | écrans d'exception centrés, formulaires courts |

⚠️ **Pas de `clamp(…vw…)` sur ces rangs, et c'est délibéré.** La police racine est déjà fluide : un `rem` grandit tout seul. Un `clamp` par-dessus ne faisait que poser un plafond (voir le piège ci-dessus). Les **frontispices** gardent le leur, en rem : ce sont des compositions à part, où la taille fait partie du dessin.

⚠️ **Un `<h1>` n'est pas toujours un titre de page.** Plusieurs vivent dans une **carte centrée** (« écran réservé », « écran large requis », choix du pseudonyme) : les hausser au rang de la page serait un contresens. Regarder ce que le titre surmonte avant de lui donner un rang.

### Corollaire : un nombre de LIGNES ne s'écrit pas en dur

⚠️ Dès qu'un bloc a une hauteur en **pixels** et un texte qui suit la **police racine fluide**, le nombre de lignes qui y tient change avec la largeur de l'écran. L'écrire en dur ne peut être juste qu'à une seule taille.

Cas rencontré le 2026-08-17, carte auteur de la bibliothèque (`app/bibliotheque/BibliothequeClient.tsx`) : bandeau `height: 200px`, notice bornée par `-webkit-line-clamp: 3`. Mesuré, la zone laissée à la notice vaut **100 px à 16 px de racine** et **81 px à 22 px** ; trois lignes y occupent 54 px et 74 px. La valeur était donc juste sur grand écran et laissait **46 px de blanc** sur un portable, sous une notice pourtant tronquée : du texte existait, la place aussi, et rien ne les réunissait.

**Variante du même défaut, sans écrêtage : la RANGÉE DE LISTE.** Sur « Acheter des livres » (`app/librairies/page.tsx`), la rangée valait `height: 80px`, sans marge intérieure : le texte s'y logeait tout juste à 16 px de racine, et sur un écran de 1920 la police montait à 19 px dans une boîte restée à 80. Mesurée, la page ne défilait pas et laissait **257 px de vide sous une liste de 400 px** — un quart de la hauteur utile. La rangée est donc passée en `min-height: 6rem` avec `padding: 1.125rem 0`, et le séparateur, la zone de logo et le retrait du chevron avec elle. Deux enseignements : **une hauteur de rangée de CONTENU se mesure en rem**, elle appartient au texte et non au chrome (la charte de conversion ci-dessus ne réserve le px qu'au chrome à hauteur fixe) ; et **un plancher (`min-height`) plutôt qu'une hauteur**, pour que le contenu qui s'enroule puisse pousser au lieu d'être rogné.

Patron retenu, à reprendre pour tout bloc écrêté de hauteur fixe :

- la zone de texte prend la hauteur restante (`flex: 1 1 auto; min-height: 0; overflow: hidden`) et repousse elle-même le pied de carte, à la place d'une marge automatique ;
- un `ResizeObserver` mesure cette zone ET le texte, puis `-webkit-line-clamp` reçoit `Math.floor((hauteur + 1) / hauteurDeLigne)`. **Arrondi par défaut** : une ligne de plus serait rognée par le milieu, et mieux vaut un reste de blanc qu'une demi-ligne ;
- la mesure passe par `useLayoutEffect` (repli sur `useEffect` au rendu serveur), sans quoi la carte se voit grandir puis se recouper. ⚠️ L'alias doit être une constante de MODULE nommée `use…`, sinon la règle des hooks d'ESLint ne le reconnaît pas et signale « Cannot access refs during render » ;
- la boucle se referme d'elle-même : reposer le même nombre de lignes ne redéclenche pas de rendu.

Résultat : blanc résiduel de 5 à 10 px selon la taille, hauteur de carte inchangée à 200 px.

## Responsive mobile (téléphone + tablette portrait, ≤ 900px)

Chantier distinct du scaling desktop. Seuil unique **900px** via le hook `useEstMobile(seuil = 900)` (`app/lib/useEstMobile.ts`) : `false` au rendu serveur et au premier rendu client (pas de désaccord d'hydratation), puis bascule au montage selon `matchMedia`.

- **Mises en page à volets → empilé.** Les pages à colonnes côte à côte (Bible et Œuvre : barres fixes + tiroirs ; Recherche et lecture d'un essai : empilement / volet Commentaires en tiroir bas ; Polyglotte et éditeur d'essai : message « écran large requis » — outils d'écriture/comparaison impraticables sur téléphone) ne tiennent pas sur un téléphone : le côte-à-côte écrase le texte. Patron retenu : **empilement vertical** en flux document. `BibleLayout` détecte `mobile` et passe un prop `mobile` à `NavLivres` / `TexteBible` / `PanneauPatristique` ; chacun, en mobile, se rend **pleine largeur, hauteur auto**, sans poignée de redimensionnement.
- **Volets latéraux (NavLivres, PanneauPatristique).** En desktop, repli en **rail vertical 22px**. En mobile (retour d'usage) : **barres fixes toujours visibles, fermées par défaut** — « Livres » `position: fixed` sous la navbar (`top: HAUTEUR_NAVBAR`), « Commentaires » `fixed` en bas ; au tap, le volet s'ouvre en **TIROIR** (`position: fixed`, `z ≥ 2400`) par-dessus le texte, avec un **fond assombri** qui referme au tap (Livres descend du haut, Pères monte du bas). NavLivres se **replie au choix d'un chapitre**. `TexteBible` réserve des marges haut/bas (`paddingTop`/`paddingBottom`) pour dégager les deux barres fixes.
- **Actions du verset (TexteBible).** En mobile, la colonne de boutons (signet, copier, signaler, éditer) **sort de la grille** (texte pleine largeur) ; un **appui long** (~450ms, `onTouchStart` + timer) fait surgir un **pavé flottant** d'actions en haut à droite du verset. Le clic suivant l'appui long est neutralisé (sinon il désélectionne).
- **Conteneur.** Le shell Bible passe de `flex` (rangée, hauteur fixe `100vh - navbar`, `overflow:hidden`) à `flex-direction:column`, hauteur auto, `overflow:visible` → défilement naturel du document. Les zones de scroll internes (`overflow-y-auto flex-1`) redeviennent du flux (`className` neutralisée en mobile).
- **Piège inline.** Ces composants sont pilotés par styles **inline** (largeur/hauteur), non surchargeables par média-query : le patron passe donc par un **prop `mobile` en JS** (comme la Navbar), pas par du CSS `@media`.
- ⛔ **Corollaire du piège inline : `align-items` sur un ENFANT ne le déplace pas.** Les rangées de la bibliothèque portent `alignItems: 'center'` en style inline ; pour décaler la puce d'étoile vers le haut, une règle `.bib-etoile { align-items: flex-start }` ne fait **rien du tout** — elle ne gouverne que le bouton à l'intérieur de la puce, tandis que la puce elle-même reste placée par sa rangée. C'est **`align-self`** qu'il faut, la seule propriété par laquelle un enfant reprend la main sur l'alignement que son parent lui impose. Erreur commise puis corrigée le 2026-08-19, et invisible aux tests : la page compile, les 395 tests passent, et l'étoile continue simplement de flotter.
- **La Navbar est déjà mobile** (hamburger + versions mobiles recherche/compte) — rien à refaire.

### L'échelle des seuils (audit de responsiveness, 2026-08-19)

Le JavaScript est irréprochable : les **onze** appels à `useEstMobile` passent tous **900**, sans une exception. Le CSS, lui, employait **onze seuils distincts** — 520, 600, 620, 640, 700, 750, 760, 820, 880, 900, 980 — soit la même dérive que celle des tailles de texte, transposée aux points de rupture. Trois d'entre eux ne se distinguaient de leur voisin que par quelques dizaines de pixels et ont été fondus (600 et 620 → 640 ; 750 → 760). Il en reste **huit**, et chacun a désormais une raison :

| Seuil | Ce qu'il gouverne |
|---|---|
| **520** | une couverture de publication par rang (charte, section Publications) |
| **640** | grilles à une colonne, champs qui passent l'un sous l'autre, variantes de colophon |
| **700** | ce qui DISPARAÎT sur un téléphone : photo de la carte d'auteur, portrait latéral d'une traduction, justification d'une colonne étroite |
| **760** | grilles de principes, à une colonne (les volets de l'accueil sont passés à 900 le 2026-08-27) |
| **820** | la Polyglotte bascule sur « écran large requis » |
| **880** | le quiz (route neutralisée en production) |
| **900** | **le seuil de la charte**, celui du hook `useEstMobile` |
| **980** | tableaux d'administration larges, sommaire de l'œuvre |

⚠️ **Deux de ces seuils ne sont PAS à aligner sur 900, et c'est délibéré.** Le **820** de la Polyglotte décide qui reçoit l'outil et qui reçoit le message « écran large requis » : le hausser à 900 retirerait un outil qui fonctionne aux tablettes de 820 à 900 px. Tidier le code n'est pas une raison de retirer une fonction. Le **880** du quiz vit sur une route neutralisée, dont la version vivante est sur la branche Holy Guessr : on n'y touche pas.

**Règle** : avant d'écrire une média-query, prendre un seuil de ce tableau. En inventer un douzième demande une raison qu'on écrit dans le commentaire.
- **Test** : le navigateur *intégré* (Browser pane) honore le viewport (`resize_window` → largeur réelle) ; le navigateur *claude-in-chrome* NON (reste à 1920). Les pages derrière le verrou exigent une session (compte invité `ACCES_INVITES`).

# Contrôle des œuvres (admin) — score de qualité figé

La coloration de la liste (rouge/jaune/vert selon critique/moyen) venait de la vue `oeuvres_controle_stats`, **recalculée à chaque ouverture** : ~10,5 s (scan de ~123 000 segments + ~10 regex/segment + tri disque). Désormais **figée** dans la vue matérialisée `oeuvres_controle_stats_mat` (lecture ~0,1 ms). Recalcul **sur demande seulement** : bouton « ↻ Recalculer » → route admin `POST /api/admin/controle-refresh` → RPC `rafraichir_controle_stats()` (SECURITY DEFINER, service_role) qui fait `REFRESH MATERIALIZED VIEW CONCURRENTLY` et met à jour `controle_stats_meta.calcule_le` (affiché comme « Qualité calculée le … »). ⚠️ Après édition de segments/rangs, les couleurs restent figées jusqu'au prochain recalcul manuel — c'est voulu. `anon` n'a pas accès à ces objets (admin = `authenticated`).

# Titres — jamais de point final ; commentaire de traduction

- **Pas de point final AU FRONTISPICE, et là seulement** (décision de l'auteur, 2026-08-24). `sansPointFinal` (`app/lib/titres.ts`) ne s'applique plus qu'à `PageTitre` — titre, sous-titre, commentaire de traduction — et aux commentaires publics, dont la charte dit qu'ils « ne prennent pas de point final ». Il préserve « … » / « ... » et les points internes.
  - ⛔ **Partout ailleurs, la ponctuation attestée est CONSERVÉE.** Titres de niveau du corps, fiche d'auteur, recherche, listes : la charte fait foi — « La ponctuation d'un titre […] transcrit depuis une édition source est conservée telle qu'elle est attestée », § Ponctuation finale des titres, où le frontispice est nommé comme le seul périmètre dérogatoire. Le conflit relevé le 2026-08-24 entre le code et la charte est clos dans ce sens. ⚠️ `rendreTitreColophonAvecNotes` a perdu son paramètre `estTitre`, qui n'existait que pour retirer ce point : ne pas le réintroduire.
- **Le titre d'une œuvre vit dans DEUX colonnes.** `oeuvres.titre` est le titre de catalogue : il nomme l'œuvre dans la bibliothèque, la recherche, les citations, le fil d'Ariane et les métadonnées, et s'écrit d'un seul tenant. `oeuvres.titre_affichage` est sa composition pour le **frontispice seul**, sauts de ligne compris ; dès qu'elle est renseignée, `PageTitre` l'affiche **à la place** de `titre` (`oeuvre.titre_affichage || titre`). ⚠️ Conséquence longtemps invisible : le crayon du frontispice écrivait dans `titre` alors que l'écran montrait `titre_affichage`, si bien qu'une correction partait bien en base sans jamais paraître (constaté le 2026-08-17 sur le « Commentaire sur Joël »). La modale laisse désormais **choisir la colonne** (`variantes` d'`EditionCible`, `app/oeuvre/[id]/ModaleEditionAdmin.tsx`). Vider `titre_affichage` rend le frontispice au titre de catalogue. ⚠️ Ouvrir la colonne a demandé les **trois listes blanches concordantes** (formulaire, route, fonction Postgres) **plus** son ajout au `select` de `app/admin/page.tsx` : un champ présent dans le formulaire mais absent du `select` est enregistré à vide, donc **efface** la colonne.
- **Un titre original qui redit le titre affiché ne paraît pas** (2026-08-21). Quand l’œuvre est nommée par son intitulé d’origine — la version latine des *Confessions* affiche « Confessiones », et son `titre_original` dit « Confessiones » — le répéter en italique juste dessous ne renseigne personne et fait bégayer le frontispice. `PageTitre` compare le titre original au titre RÉELLEMENT AFFICHÉ (`titre_affichage || titre`), non au titre de catalogue : c’est une redondance visuelle qu’on écarte, et le titre de catalogue est souvent le français quand le frontispice porte le latin. La comparaison est `memeIntitule` (`app/lib/titres.ts`, pure et testée) : elle ignore ce que la composition ignore déjà — blancs et sauts de ligne éditoriaux, casse, forme de l’apostrophe, point final proscrit, appels de note — et garde les accents distinctifs. Le blanc sous le titre suit la même condition, sinon la page garderait la place d’une ligne absente. ⚠️ **L’administrateur, lui, continue de le voir**, avec son crayon : c’est le champ qu’il doit pouvoir corriger, et le masquer le rendrait inaccessible. Quatre œuvres sont dans ce cas au 2026-08-21 (les *Confessions* latines, et les commentaires de Jérôme sur Jonas, Joël et Abdias).
- **Commentaire sur la traduction** : colonne dédiée `oeuvres.commentaire_traduction` (ex. « Attribution discutée avec Marc-Antoine de La Bastide » pour Ratramne, sortie de `trad_auteur`). Affichée en note discrète sur la page de titre. **Modifiable** dans l'admin Bibliothèque depuis le 2026-08-12 : zone de texte « Commentaires publics » (intitulée « Commentaires » jusqu'au 2026-08-20), placée juste au-dessus de « Genre » dans le formulaire « Modifier l'œuvre ». Elle a remplacé l'ancienne pastille 🗨 en consultation seule, qui paraissait à côté du titre et ne se corrigeait pas. ⚠️ Ouvrir un champ à l'écriture demande **trois** listes blanches concordantes : le formulaire (`CHAMPS_OEUVRE_TEXTE`), la route `app/api/admin/update-oeuvre` (`CHAMPS_AUTORISES`), et la fonction Postgres `admin_update_oeuvre_champ` — cette dernière porte sa propre liste et lève « Champ non autorisé » sinon.
- **Commentaires privés d'une œuvre** (2026-08-20) : carnet de travail de l'administration — état de l'import, doutes sur l'édition, travail restant. Zone de texte « Commentaires privés », sous « Commentaires publics » dans le même formulaire. ⚠️ Ce n'est **pas** une colonne d'`oeuvres` : la page publique lit `oeuvres` avec `select('*')` sous la session du LECTEUR, une colonne de plus y serait donc servie à tout compte connecté. La note vit dans la table `oeuvres_commentaires_prives` (RLS sans aucune politique, droits révoqués pour `anon` et `authenticated`), écrite et lue par la seule clé de service — `app/api/admin/update-oeuvre` la traite avant sa liste blanche, et `app/admin/page.tsx` la recolle à son œuvre au chargement. Vider la zone supprime la ligne.

# Catalogue — règle des œuvres candidates

Une fiche `catalogue_notices` **candidate** (`decision_import` commençant par « Candidat ») doit avoir une **source de texte intégral** (`url_texte_integral`, le lien « Fichier ») : c'est ce qui la rend importable. Une candidate sans fichier n'est pas une vraie candidate : elle est reclassée en **« Bibliographie seulement »** (référence connue, sans texte à importer). Reclassement du 2026-08-05 : 257 candidates sans fichier passées en bibliographie (sauvegarde `parametres['catalogue_reclass_candidats_sans_fichier_20260805']`) ; il reste 437 candidates, toutes pourvues d'un fichier. La notice source (`url_source`, lien « Notice ») est distincte et déjà présente sur toutes.

# Ouverture des grosses œuvres — chargement en tranche

Le coût d'ouverture d'une œuvre n'est PAS l'apparat critique (les grosses œuvres n'en ont quasiment pas), mais **le premier niveau 1 chargé en entier avant le premier rendu** (ex. Somme théologique, « Prima Pars » = 6180 segments ; un autre niv1 monte à 9094). La lecture est déjà paresseuse ENTRE niv1 ; le problème était À L'INTÉRIEUR du premier.

Solution en place : le serveur (`app/oeuvre/[id]/page.tsx`, `chargerTrancheTexte`) n'envoie que la **1re tranche** (`PLAFOND_TRANCHE = 1000` segments), ordonnée par **`segment_numero`** (donc un vrai préfixe du chargement complet), avec un booléen `niv1InitialPartiel`. Le client (`OeuvreClient.tsx`) complète le reste **en tâche de fond** via `chargerNiv1Data` (un `useEffect` monté une fois), en ne l'appliquant que si le lecteur n'a pas changé de niv1 (`niv1ActifRef`). ⚠️ Garder l'ordre `segment_numero` des deux côtés, sinon la page se réagence après complétion.

# Date de mise en ligne d'une œuvre

`oeuvres.date_mise_en_ligne` (timestamptz) = millésime de l'**édition en ligne**, affiché au colophon de la page de titre (`PageTitre.tsx`, « Édition en ligne, AAAA »). **Estampillée automatiquement à la PREMIÈRE publication** (dans `api/admin/update-oeuvre`, quand `champ='note'` passe à null/vide) et **jamais réécrite ensuite** (`.is('date_mise_en_ligne', null)`) : dépublier puis republier ne change pas la date. Absente → la ligne est masquée.

# Piège technique — migration / copie du projet

Après un déplacement ou une copie du dépôt (nouveau PC, changement de disque), **purger `node_modules` ET `.next`**, puis `npm install`. Un `.next` hérité de l'ancien emplacement (chemins absolus périmés) fait planter Turbopack en boucle à l'écriture : « **Failed to write app endpoint … Next.js package not found** », version `0.0.0`. Réinstaller `node_modules` seul **ne suffit pas** — c'est le cache `.next` (ignoré par git) qu'il faut supprimer.

# Textes originaux parallèles — alignement éditorial

Avant d’associer un original grec ou latin à une traduction déjà segmentée, relire la charte `parametres.charte_ia`, §12.2. Ne jamais supposer que les blocs HTML, les paragraphes ou même les limites de chapitres de deux éditions coïncident. L’automatique ne fournit que des candidats : l’arbitrage est sémantique, avec relecture systématique des limites, cas extrêmes et sondages répartis.

Pour un paragraphe traduit réparti sur plusieurs segments, `texte_original` va uniquement sur le segment de `rang = 1` ; les rangs suivants restent à `null`. L’original doit se recomposer exactement, sans perte, duplication, normalisation ni changement d’ordre. Une divergence de limite de chapitre peut être corrigée en redistribuant le fragment continu vers le paragraphe traduit correspondant, tout en conservant sa provenance.

Cas de référence : *Confessions* `A0010O0001`, latin de Pius Knöll, CSEL 33 (1896), 13 livres, 278 chapitres, 932 associations. Voir `scripts/confessions-align-latin-csel-2026-07-29.py` et `feedback_liens_protocole`.

## Quel alignement porte la lecture : le plus FIN, et la finesse se COMPTE (2026-08-25)

⛔ `alignment_level` (`paragraph`, `segment`, `division`) est l'étiquette de l'éditeur, non une mesure. `choisirEnsembleBilingue` ne s'y fie plus : entre plusieurs ensembles posés sur la même paire de textes, **c'est celui qui compte le plus de GROUPES qui l'emporte**, une ligne de `texte_alignements` valant un groupe. Le niveau ne tranche qu'à défaut — finesse inconnue ou égale — et le classement d'origine reprend alors la main mot pour mot.

Le cas qui l'a imposé, relevé sur une capture du chapitre III de la *Doctrine des Apôtres* : l'œuvre a deux alignements, et l'ancienne règle retenait **le plus grossier des deux**.

| ensemble | `alignment_level` | groupes | dont un pour un | couverture |
|---|---|---|---|---|
| `…:SECTION` | `division` | **100** | **90** | 109 grecs / 114 français, tous |
| `…:PARAGRAPH` | `paragraph` | 57 | 25 (jusqu'à 5 contre 5) | idem |

Les sections numérotées de Funk sont plus fines qu'un paragraphe Laurent–Hemmer : l'étiquette `division` mentait sur ce que l'ensemble fait. Le lecteur voyait donc *Didachè* 3, 1-3 en grec — trois sections — en regard de la seule phrase « Mon enfant, fuis tout ce qui est mal », les deux phrases suivantes faisant face au blanc.

⚠️ **Le comptage ne se paie pas.** Il n'est émis que lorsque plusieurs alignements se disputent la même paire de textes — la *Doctrine des Apôtres* est aujourd'hui la seule œuvre dans ce cas — et il part avec la vague 1, en `head`, donc sans qu'aucune ligne voyage. Il rejoint ensuite `alignementsDisponibles`, qui part tel quel au client : ⛔ les deux côtés doivent choisir le MÊME ensemble, sans quoi une division rechargée se mettrait en regard d'un autre original que celle du premier rendu.

## Une langue originale est un TEXTE de l'œuvre, jamais une œuvre sœur (2026-08-23)

Le latin des *Confessions* avait fini par exister deux fois : dans `segments.texte_original` de la traduction, et comme œuvre autonome `A0010O0110`. Les 932 blocs se répondaient un à un, dans le même ordre, avec la même division en livres et en chapitres, et le même texte à la casse près. Mais l'œuvre autonome portait seule les titres d'origine, les capitula latins et **l'apparat critique de Knöll**, que `texte_original` ignore : une « copie » peut donc valoir bien plus que l'autre. ⛔ Ne jamais conclure au doublon sur la seule collation des textes ; compter d'abord ce qui pend à chaque `id_texte` (`texte_notes`, `texte_note_ancres`, `texte_note_blocs`, `oeuvre_texte_unites`).

Règle fixée : **une œuvre, plusieurs `oeuvre_textes`**, sur le modèle déjà posé pour *La Cité de Dieu* (`A0010O0002`). Une langue originale n'ouvre pas une entrée de catalogue distincte : elle prend son rang parmi les textes de l'œuvre, l'original d'abord (`…T0001`), les traductions ensuite (`…T0002`). Une œuvre sœur en langue originale est une forme héritée, à résorber et non à reproduire.

- **La fusion se fait par les clés étrangères, pas à la main.** `oeuvre_textes.id_texte` et `id_oeuvre` sont en `ON UPDATE CASCADE` vers `segments`, `texte_notes` → ancres/blocs/relations, `oeuvre_texte_unites`, `texte_groupes_logiques`, `texte_relations_logiques` et les tables d'alignement. Un seul `UPDATE oeuvre_textes` déplace et renumérote tout le convoi. Renuméroter à la main, table par table, c'est se garantir des orphelins.
- **`segment_key` ne suit PAS le renom** : les clés gardent leur préfixe d'origine (`A0010O0102:1`, `LEGACY:533731`). Elles sont uniques par texte, donc sans risque de collision ; les réécrire entraînerait 2 026 ancres pour un gain cosmétique.
- **`texte_original` devient un cache dérivé**, recopié verbatim du texte original par l'ensemble d'alignement (`A0010O0001:CSEL33-ANDILLY:LA-FR:PARAGRAPH`, 932 paragraphes, 10 211 segments français placés). Il n'est plus une source : toute correction du latin se fait sur le texte, puis se reporte.
- **Le mode de lecture « Latin » vise le texte, pas l'œuvre.** `OeuvreClient` reconnaît le texte en langue originale de l'œuvre courante (pas de traducteur, langue de `oeuvre.langue_originale`) et le rejoint par `?texte=`. « Éditions de ce texte » ne liste alors que les éditions de la MÊME langue : le latin et sa traduction relèvent du menu des modes, sinon le même choix s'offre deux fois sous deux intitulés.
- **Une seule porte pour l'original : `?mt=la`.** La bibliothèque, le compte, le profil public et les favoris désignent tous le texte original par ce paramètre. La page d'œuvre le redirige vers `?texte=` dès qu'un texte en langue originale existe, plutôt que d'aller corriger quatre appelants. L'étoile suit : sur ce texte le favori prend le suffixe `#la`, parce que `favoris.ref_id` désigne des ŒUVRES et que sans lui l'étoile posée sur le latin rangeait de nouveau la traduction.
- ⛔ **`versions` — les œuvres SŒURS — est vide au premier rendu.** Il est chargé par un effet, donc jamais peuplé côté serveur : `editionCourante`, `editionsTraduction`, `editionsOriginal` et `editionFrRef` valent tous `null` ou `[]` au rendu qui compte pour le lecteur. N'en jamais tirer une valeur qu'on tienne pour non nulle. Le 23 août 2026, une garde écrite « editionFrRef || versionTraduite » suivie de `editionFrRef!.id_oeuvre` a mis TOUTES les œuvres traduites en erreur serveur : le point d'exclamation promettait ce que le premier rendu ne tient jamais. Règle : garder sur la CIBLE calculée (`if (cible)`), non sur ce qui sert à la calculer.
- **La colonne latine du bilingue porte l'apparat du texte original.** Le segment français qui porte `texte_original` garde la provenance de sa copie dans `segment_metadata.original_segment_key` (tirée par `SELECT_SEGMENT` sous le nom `cle_original`). La page charge alors les notes DEUX fois, celles du texte lu et celles du texte d'en face, et `SegData` sépare `notes` de `notesOriginal` : mêler les deux ferait sortir l'apparat de Knöll dans le texte d'Arnauld d'Andilly. `notesOriginal` ne l'emporte que s'il existe ; sinon `notes` sert la colonne latine comme avant, ce dont dépendent les œuvres où le latin n'est encore qu'un `texte_original` (Boèce, Mirandol).

# Chronologie et événements — système centralisé

Doctrine éditoriale : charte `parametres.charte_ia` **§26**. Invariants techniques du dépôt :

- **Quatre tables.** `evenements` = source unique de chaque événement (clé métier texte `EVT######`). `genres_evenements` et `familles_evenements` = listes contrôlées ; la **famille se déduit du genre** (jamais saisie sur l'événement). `auteurs_evenements` = association N-N auteur ↔ événement, portant `nature_lien`, `pertinence`, `est_affiche`, `a_controler`, `titre_personnalise`…
- **Intégrité par les clés étrangères.** `auteurs_evenements.evenement_id → evenements(id)` **ON DELETE RESTRICT** (une association ne peut pas détruire l'événement central) ; `auteur_id → auteurs(id_auteur)` **ON DELETE CASCADE** ; `UNIQUE(auteur_id, evenement_id)`.
- **Degrés en TEXT.** `importance_generale` (« A — structurant »…) et `pertinence` (« indispensable »…) sont du **texte**, pas des entiers.
- **Publication.** `est_publie`/`est_affiche` à `true` par défaut (pas de file de validation) ; `a_controler` signale une relecture sans bloquer l'affichage.
- **Accès public.** Chaque table : RLS activé **+** policy `SELECT` publique **+** `GRANT SELECT … TO anon, authenticated` (le RLS seul ne suffit pas → 42501), puis `notify pgrst, 'reload schema'`.
- **Rendu : passer par les VUES, jamais par les tables.** Le site lit exclusivement `v_frise_generale` (frise générale, `app/histoire/page.tsx`) et `v_chronologie_auteurs` (chronologie d'un auteur, `FriseAuteur` dans `app/components/ModaleAuteur.tsx`). Interroger `evenements` ou `auteurs_evenements` depuis une page publique est proscrit : les vues portent déjà l'ordre éditorial, la date rédigée, le type d'affichage, la géographie de filtrage et les sources. Règles communes dans `app/lib/frise.ts`.
  - **Tri : `ordre_affichage` uniquement.** Ne jamais retrier en JavaScript. Cet ordre départage les événements d'une même année (66 années sont partagées), ce qu'un tri par date ne sait pas faire.
  - **Dates : afficher `date_affichage` tel quel.** Ne jamais recomposer depuis `date_debut`/`date_fin` : la donnée porte les nuances éditoriales (« vers 329 », « printemps 387 », « 7 mai–17 juillet 1274 »), avec des tirets demi-cadratins.
  - **Type d'événement** : lire `type_affichage` (`vie`, `œuvre`, `contexte`), qui n'est plus déduit de `nature_lien` ni de `portee`. Les trois brins vont dans UNE seule frise.
  - **Filtre par pays** : uniquement `pays_filtre_codes` / `pays_filtres` (territoire actuel). Le champ `pays` est la désignation historique, réservée à l'affichage : Carthage se filtre sous « Tunisie » tout en restant « Empire romain » à l'écran.
  - **Champs techniques jamais montrés au lecteur** : `ordre_force`, `a_controler`, `pertinence_ordre`.
  - **Sources** : jamais d'URL brute (toutes les `source_principale` en sont), les rendre par nom de domaine avec `target="_blank"` et `rel="noopener noreferrer"`. Distinguer la source de l'événement et celle du rattachement à l'auteur (`source_lien`).
  - Siècles via `app/lib/siecles.tsx` (jamais composés à la main). Ne jamais créer d'auteur ni d'association silencieuse depuis les données (charte §26.2–26.3).
- **Piège d'accès.** Les deux vues sont en `security_invoker=true` : elles s'exécutent avec les droits de l'appelant. `v_chronologie_auteurs` joint `auteurs`, que `anon` ne peut pas lire, d'où un **42501 en anonyme** ; elle fonctionne pour `authenticated`, ce qui suffit tant que le site est fermé (la fiche auteur exige déjà `auteurs`). Si le site s'ouvre au public, accorder `SELECT` sur `auteurs` à `anon` ou passer la vue en `security_definer`.
- **Admin.** Onglet « Chronologie » : `app/admin/SectionEvenements.tsx` (file « à contrôler », édition événements + associations, ajout d'un lien vers un auteur EXISTANT). Écritures service-role via `app/api/admin/evenements/route.ts` (actions `maj-evenement`, `maj-association`, `suppr-association`, `creer-association` — cette dernière refuse tout auteur introuvable). Contraintes clés : `date_debut`/`date_fin`/`qualification_date`/`genre_id`/`portee`/`source_principale`/`origine_donnee`/`statut_source` sont NOT NULL ; `importance_generale` = grade A/B/C si `portee='générale'`, sinon NULL.

# Fiche « À propos de cette traduction » — refonte du 2026-08-28

Elle vit désormais dans **`app/components/ModaleTraduction.tsx`**, sortie des 937 lignes de `NavLivres`. Elle est composée **sur le modèle de la fiche d'auteur** (`ModaleAuteur`), décision de l'auteur : même cadre (52 rem, `--cs-fond`, rayon 12px, croix collante, défilement du CONTENU et non du calque), même en-tête, mêmes titres de section, mêmes deux colonnes. Les deux fiches disent la même chose d'objets voisins ; celle-ci était restée une liste d'étiquettes.

⚠️ **Le CONTENU est séparé de la fenêtre** (`ContenuFicheTraduction`, `PlancheGravure`), comme `Contenu` l'est dans la fiche d'auteur. Ce n'est pas un rangement : `createPortal` n'existe pas au rendu serveur, et sans cette coupure aucune planche de contrôle ne pourrait rendre la fiche hors session. `tmp/planche-fiche-traduction.tsx` en tire les trois cas qui se distinguent (chronologie seule, gravures seules, notice longue) avec les données réelles.

- **En-tête** : le PORTRAIT à gauche dans le cadre de la fiche d'auteur (6,5 rem × 130 px, `--cs-ombre-posee`), puis le nom en sérif 1,4375 rem, l'intitulé en italique, et une ligne de repères en capitales espacées. ⛔ Cette ligne **remplace la règle d'avant**, qui rangeait « Première publication », « Confession » et « Langue » dans la section repliable : c'est exactement ce que la fiche d'auteur met sous le nom (dates · langue · traditions), et l'on ne le cherche pas derrière un dépli.
- **L'image vient de `photo_encart`**, le portrait debout, et non de `photo`, le bandeau couché : une image couchée serrée dans un cadre debout ne montre pas ce qu'un portrait montre. La colonne est entrée dans `v_traductions_page` le 2026-08-28 (migration `v_traductions_page_photo_encart`, ajoutée EN FIN de vue, `create or replace` n'admettant pas d'insérer une colonne au milieu). Le cadrage et son repli sur l'ancien nom `lateral` vivent dans **`app/lib/portraitTraduction.ts`**, partagé avec la page publique `/traductions` : une règle recopiée à deux endroits ne reste identique que par accident.
- **Deux colonnes** (`1.35fr / 1fr`, filet entre elles) : à GAUCHE la notice, à DROITE ce qui la documente. Elles ne paraissent que s'il y a de quoi remplir les deux ; sinon la notice prend toute la mesure plutôt que de laisser une colonne vide.
- **La notice éditoriale prend la composition de la fiche d'auteur** : ses `<h2>` deviennent des titres de section (sérif italique, `--cs-vert`, 0,84375 rem, le `TitreSection` partagé), ses `<p>` la prose en sans justifiée de `.auteur-prose`. ⚠️ Les notices ne portent que **cinq balises** (`h2`, `p`, `em`, `ul`, `li`, comptées sur le corpus) : sans règle pour les deux dernières, une bibliographie retombait sur la composition du navigateur, donc plus GROSSE que la prose qu'elle accompagne.
- **Édition et état du texte** reste une section **repliable**, mais pleine mesure, sous les deux colonnes : ses rangées portent une colonne d'étiquettes de 8,5 rem qui n'entrerait pas dans une colonne. Elle ne garde plus que ce qui concerne l'ÉDITION.
- **Numérotation de la Vulgate : jamais affichée.** **Année et lieu** sur deux lignes distinctes. **Édition de référence** : le libellé seul, sans lien « fac-similé », redondant avec « Voir la source numérique ». **Vérification** : « Contrôle en cours » se déplie en note (statut du corpus, lacunes connues), jamais un encart permanent.

## Les GRAVURES de l'édition (2026-08-28)

Demande de l'auteur : « ajouter les illustrations quelque part ». La colonne de droite les porte, sous la chronologie quand il y a les deux.

- ⛔ **Elles appartiennent à la FAMILLE ÉDITORIALE, non à la traduction** : une édition bilingue les publie une fois pour ses deux textes. La lecture passe donc par `bible_edition_members` (trad_id → family_id) puis `v_bible_edition_assets`, et la seconde requête ne part que si la traduction appartient à une famille. Aujourd'hui la seule famille est Fillion, avec 43 gravures ; `anon` les voit toutes (politique `bible_edition_assets_public_read`).
- ⛔ **Six gravures, prises en ÉCHANTILLON RÉGULIER, jamais les six premières** (`echantillonRegulier`) : elles sont rangées dans l'ordre du livre, et les six premières d'une bible entière ne montreraient que la Genèse. Le compte total est dit sous la mosaïque, jamais tu.
- **`contain`, jamais `cover`** : une planche gravée se regarde entière, et leurs formats vont du carré (468 × 364) au double folio (1600 × 2611). Chacune dans son passe-partout, le cadre du portrait en plus petit.
- **Un clic ouvre la planche en grand**, dans un cadre clair et non sur le calque : les jetons se retournent avec le thème, une légende posée sur un voile sombre ne le fait pas. Échap ferme la GRAVURE d'abord, la fiche ensuite.
- **La légende suit l'ordre de la page de lecture** : `editorial_caption ?? printed_caption`.

## ⛔ La chronologie d'une TRADUCTION n'avait aucune date

`FriseAuteur` lisait `date_affichage_courte`. Or **`v_chronologie_traductions` ne porte pas cette colonne** : elle n'a que `date_affichage`. `HistoricalDate` recevait donc `undefined` et ne rendait rien, si bien que la colonne des dates de la frise était VIDE sur les six chronologies de traduction du corpus, depuis l'origine. La frise lit maintenant `date_affichage_courte ?? date_affichage`, et `RangChrono` déclare la seconde en option. ⚠️ Le repli n'affaiblit rien côté auteurs, dont la vue porte les deux colonnes ; `historicalDates.integration.test.ts` a été accordé à la nouvelle écriture.

⚠️ **Le cast `as unknown as RangChrono[]` masquait le défaut** : la vue rendait un type qui n'a jamais eu le champ, et rien ne le disait. Un cast en deux temps est un endroit où regarder quand une colonne « ne s'affiche pas ».

- **Enrichissements de la chronologie.** `FriseAuteur` rend intitulés ET notices via `rendreMarquesNote` : **gras**, *italique*, ++petites capitales++, ^^exposant^^. Ne pas revenir à un rendu texte brut.
- **Légende de la frise.** `sansLegende` est passé pour une traduction. Trouvaille conservée : la vue renvoie des `type_affichage` **accentués** (« édition », « réception ») qui ne matchent pas les clés non accentuées de `COUL_TYPE`/`LIB_TYPE`, d'où des puces grises. Le jour où l'on réaffiche la légende d'une traduction, normaliser d'abord les clés.

# Recherche rapide — ce qu'on OUVRE POUR LIRE vient en tête (2026-08-24)

Règle d'auteur. Les deux rubriques qui portent des TITRES, « Œuvres patristiques » et « Livres bibliques », ouvrent la liste déroulante, dans cet ordre, et rien ne passe devant. Suivent les auteurs, les péricopes, la chronologie, les essais et les traductions. Elles venaient auparavant en quatrième et sixième position, derrière les péricopes et la chronologie, c'est-à-dire que ce qu'on cherche le plus souvent était ce qu'on lisait en dernier.

- **Un titre se compose comme un titre** : sérif du site (`--font-source-serif`) à **1rem**, graisse 600, quand le reste du menu est en sans à 0,84375rem. Sous une œuvre, l'auteur descend sur sa propre ligne, en italique et en `--cs-texte-second`, au lieu de talonner le titre en gris.
- ⚠️ **Les deux domaines n'y sont plus contigus**, le vert précédant le bleu tandis que leurs autres rubriques restent plus bas. C'est le prix de la mise en tête, assumé : le filet de gauche et la couleur de la rubrique continuent de dire le domaine de chacune. ⛔ Ne pas « rétablir » le groupement par domaine en redescendant les titres.
- ⛔ **`itemsNavigables` suit EXACTEMENT l'ordre du rendu**, sinon la flèche descend dans une liste et le surlignage se pose dans une autre. Corollaire : le rang actif d'une péricope se reconnaît désormais à sa CLÉ (`cleActive`), non plus à son indice dans la section, qui ne valait que tant que les péricopes ouvraient la liste.

# Recherche de péricopes (RPC rechercher_pericopes)

Intégrée à la recherche rapide globale de la Navbar (`app/components/Navbar.tsx`), en SECTION distincte « Péricopes », menée en parallèle des autres catégories (effet dédié, non bloquant).

- **RPC** : `supabase.rpc('rechercher_pericopes', { p_requete, p_limite: 8 })`, réservé aux **authentifiés**. Ne pas l'ouvrir aux anonymes sans décision explicite (RLS inchangée). Helper : `chercherPericopes()` dans `app/lib/pericopes.ts` (types, `referencePericope`, `correspondanceVisible`, `libelleCategoriePericope`).
- **Comportement** : rien sous 2 caractères, debounce ~200 ms, chaque frappe annule la requête précédente (AbortController → aucune réponse obsolète), 8 résultats max, une ligne = une péricope.
- **Affichage** : titre principal / référence biblique / catégorie. La référence se construit sur la PREMIÈRE occurrence principale. Ligne « Correspond à : X » seulement si `correspondance_visible === true` et `correspondance !== titre` — ne JAMAIS afficher un alias masqué ou inexact (ex. « baleine » → « Jonas et le grand poisson », jamais « Jonas dans la baleine »).
- **Navigation** : clic ou Entrée → `/pericopes/${pericope_id}` (le `pericope_id` est un slug). Nav clavier (↑/↓), Échap ferme.
- **Références bibliques** : fonction centralisée `formaterPlageCanonique` dans `app/lib/referencesBibliques.ts` (« JHN.4.1 »/« JHN.4.42 » → « Jean 4,1-42 » ; noms dérivés de `LIVRES`, Psautier au singulier). À réutiliser partout.
- **Page de détail** : `app/pericopes/[id]/page.tsx` (composant client, session normale) — titre, notice, contexte, occurrences bibliques, variantes `visible_public` uniquement. Lit `pericopes`, `pericope_occurrences`, `pericope_noms` (policies SELECT `authenticated` déjà en place).
- Le projet n'utilise PAS de types Supabase générés : rien à régénérer.

## Péricopes — pages catalogue & détail

- **Catalogue** : `app/pericopes/page.tsx` (client), accessible depuis « Aller plus loin » (onglet « Péricopes » → `/pericopes`). Volet gauche : recherche par nom, filtre par Testament (AT/NT/Autres, déduit de `LIVRES`) et par **registre** (`categorie`, effectifs affichés). Liste **groupée par livre** en ordre canonique (`LIVRES`), chaque péricope reliée à sa page. Données chargées **côté serveur** en ISR (`app/pericopes/page.tsx`, revalidation 30 min) puis fusionnées par `assemblerCatalogue()` (`pericopes` + occurrence `est_principale` + appellations visibles, un livre représentatif par péricope ; 249 péricopes). Mise en forme : voir « Catalogue des péricopes (liste) ».
- **Détail** : `app/pericopes/[id]/page.tsx` affiche notice, contexte, **le texte biblique visé** (étendue de l'occurrence principale) dans une **traduction changeable** (sélecteur `TRADUCTIONS_BIBLE` : Sacy/Segond/Crampon/Vulgate/Septante ; défaut Sacy `TR0001`), plus occurrences et variantes visibles.
- **Texte biblique** : `chargerTextePericope(livre, canonDebut, canonFin, tradCode)` lit la vue large `versets_lecture` (colonnes `TR000x` = texte, `num_TR000x` = numéro affiché, tri par `ordre`). Récupère la plage par `livre` + `chapitre` bornés puis affine les versets aux bornes exactes. Colonne de traduction choisie dynamiquement (jamais de saisie libre → `select` typé Supabase casté via `unknown`). Septante = AT seulement → « Texte indisponible dans cette traduction » géré.

## Péricope détail — texte de chaque occurrence & volet patristique

- **Toutes les occurrences** sont affichées avec leur texte complet, chacune dans une carte distincte (référence en tête, badge « principale », puis le texte verset par verset). `app/pericopes/[id]/page.tsx` charge le texte de chaque occurrence en parallèle (`chargerTextePericope`) et le recharge au changement de traduction.
- **Colonne de droite = doublon du volet de la page Bible** : on embarque directement `PanneauPatristique` (collant, hauteur `100dvh - navbar` sur desktop ; empilé `presentation="inline"` en mobile). Nouveau prop **`plage={{ livre, canonDebut, canonFin }}`** (+ `refAffichee`) : le volet charge l'apparat de la PLAGE canonique exacte via `segmentsLiesAPlage` (`app/lib/liens.ts`) au lieu d'un verset/chapitre. Additif : la page Bible ne passe pas `plage`, son comportement est inchangé.

# Apparat patristique — l'ordre est CHRONOLOGIQUE (2026-08-23)

Le volet de droite de la page Bible (et de la page d'une péricope) est `PanneauPatristique.tsx`. Ses extraits se rangent désormais par **date de l'œuvre, puis auteur, puis œuvre, puis apparition dans l'œuvre** (`segment_numero`). Toute la clé vit dans `app/lib/chronologiePatristique.ts`, module PUR testé sur les valeurs réelles du corpus (22 tests).

⛔ **Il n'y avait AUCUN ordre auparavant, et l'ordre apparent était fait de deux accidents.** Les segments sont tirés par `.in('id', ids)` **sans `order`** : Postgres les rendait dans l'ordre qui lui convenait, en pratique l'ordre d'import. Et la liste brute concatène citations → doctrine → échos, le dédoublonnage gardant la PREMIÈRE position : dans le sous-onglet « Commentaires », tous les passages qui sont AUSSI des citations remontaient donc en tête, en bloc. Personne n'avait décidé cela.

⛔ **La date de l'œuvre est `oeuvres.date_composition`, JAMAIS `date_publication`.** Cette dernière porte la date de l'ÉDITION MODERNE — Confessions 1649, Somme théologique 1984-1986, Histoire ecclésiastique 21 octobre 1532 — et sert la CITATION. Trier là-dessus ne range pas les Pères, il range les réimpressions françaises, Thomas d'Aquin en dernier et Eusèbe en premier. Les deux colonnes sont pleines sur les 52 œuvres : rien ne signale l'erreur, le classement est simplement faux.

**Repli, et il sert vraiment** : à défaut d'une date d'œuvre lisible, `auteurs.date_mort`, puis `auteurs.siecle`, puis rien — et l'extrait ferme la marche. Toutes les œuvres portent une `date_composition`, mais plusieurs sont illisibles pour un classement : « Antiquité tardive », « Date non établie », « Vendredi saint, année non établie ».

⚠️ **Le module ne réutilise pas `parserDateHistorique` (`datesHistoriques.ts`), et c'est motivé.** Celui-ci décrit une période pour l'AFFICHAGE et rend la borne HAUTE (`extraireAnneeDateHistorique`), quand un classement demande la borne BASSE — une œuvre écrite « 413-426 » se range à 413. Et il renonce dès que la valeur est de la prose, ce qui est ici le cas ORDINAIRE. Sur les valeurs bien formées, les deux s'accordent.

**Ce que le lecteur de dates doit savoir faire**, tiré des trente-deux dates de composition distinctes du corpus :

- ⛔ **ôter le QUANTIÈME avant de chercher l'année** — sans quoi « 25 décembre 380 » se range au Ier siècle et « 1er janvier 379 » à l'an 1 ;
- prendre la **première** année nommée (« Vers 300-325 (Eusèbe) ; vers 402 » → 300) ;
- traverser la prose : « Carême 387 », « Entre 392 et 430, date précise inconnue », « c. 371-398 » ;
- à défaut de chiffres, lire le **premier siècle d'un empan** et le placer en son MILIEU, décalé d'un quart par le qualificatif : « Fin du IVe siècle » → 375, « Seconde moitié du Ier siècle-… » → 75. Un siècle placé à son premier jour passerait devant toute œuvre datée 310 ou 320.
- ⛔ **jamais de drapeau insensible à la casse sur le chiffre romain** : `[ivxlcdm]` attraperait le « c » de « ce siècle » et rendrait un centième siècle.

**Auteur et œuvre ne sont pas des ornements du tri** : ils gardent CONTIGUS les extraits d'une même œuvre quand deux œuvres partagent une année, faute de quoi ils s'entrelacent et la fusion des segments qui se suivent (voir `itemsGroupes`) ne trouve plus ses paires.

**Relevé sur Jean 1, 1** (19 extraits, 8 auteurs) : Tertullien 197 · Cyprien 248 · Eusèbe 300 · Grégoire de Nazianze et Jean Chrysostome 350 · Grégoire 380 · Augustin et Jérôme 396-397 · Jérôme 406 · Thomas d'Aquin 1265.

⚠️ **Trouvaille au passage, à traiter à part** : `A0047O0012` (« Discours 38-41 ») et `A0047O0034` (« Discours 38. Sur la Théophanie ») sont le MÊME texte importé deux fois — 84 segments et 29 556 signes de part et d'autre, mêmes numéros de segment. L'apparat de Jean 1, 1 montre donc les mêmes passages de Grégoire deux fois. C'est une correction de données, pas d'affichage.

# Page « Communauté » (ex-« Publications ») — couvertures de petit livre (2026-08-17)

⚠️ **Renommée « Communauté » le 2026-08-23. La route reste `/essais`.** Le nouveau libellé porte partout où la page est NOMMÉE : navbar (`LIENS_PRIMAIRES`, desktop et panneau mobile), carton d’accueil (`AccueilCards`), `h1` et `metadata.title` de `/essais`, fil d’Ariane de `/essais/[id]`, badge de lieu de la modération (`SectionModeration`), modèle de charte de l’admin. Le mot « publications » demeure là où il désigne les ÉCRITS et non la page : rubrique du profil, rubrique et réglage de visibilité du compte, onglets et catégories de la recherche. Le reste de cette section décrit la composition des couvertures, inchangée.

Refonte complète de `app/essais/EssaisListeClient.tsx`. **Remplace** l'ancienne « structure de l'Index » et sa refonte survol/doré, toutes deux supprimées : plus de sommaire en deux colonnes, plus de bloc « à la une », plus de créneau de dix minutes.

Une publication se présente désormais comme un **petit livre**, et la liste comme une table d'étalage.

- **Trois par rang** (`.rayon`, `grid-template-columns: repeat(3, …)`), deux sous 900 px, une sous 520 px. Proportion `aspect-ratio: 2 / 3`, coin arrondi, ombre portée, et une bande sombre au bord gauche qui figure le dos de reliure.
- **La face se compose comme une page de titre gravée** (refondue le 2026-08-19, d'après un modèle apporté par l'auteur). **Huit temps, du haut vers le bas** : l'auteur en capitales espacées, un losange entre deux filets, la **catégorie** (la première de `essais.categories`), le **titre** en grand, le sous-titre, l'**emblème**, un second losange, la **date**. Tout est en **empattement** — la face comme la quatrième — et tout est centré.
- ⚠️ **Rien n'est posé en absolu dans la face, et ne doit pas l'être.** Chaque temps pousse le suivant ; **l'emblème seul porte `margin: auto 0`** et absorbe la hauteur qui reste. C'est ce qui permet à un titre de quatre lignes de serrer la composition au lieu de chasser la date hors du carton. La version précédente sortait le bloc du titre du flux (`position: absolute; top: 29%`) et devait alors écrêter à l'aveugle. Le titre reste écrêté à 4 lignes et le sous-titre à 3, en dernier recours.
- **Emblèmes** : `app/lib/emblemesCouverture.tsx`, un dessin au trait par catégorie (`viewBox 0 0 64 64`, `stroke: currentColor`, **aucun `fill`**), plus un fleuron de repli — une catégorie sans dessin ne laisse jamais la couverture nue. Le trait étant en `currentColor`, l'emblème prend l'encre de sa couverture et n'a pas à être décliné six fois. `aria-hidden` : il double la catégorie, déjà écrite au-dessus. ⚠️ **Les neuf dessins actuels sont des ébauches géométriques**, en attente des dessins-symboles de l'auteur ; les remplacer revient à substituer le contenu de chaque entrée, sans toucher aux clés ni au gabarit.
- ⚠️ **La chasse optique se force, elle ne se devine pas** (passe du 2026-08-19). Source Serif porte l'axe `opsz` (déclaré dans `app/layout.tsx`), et le navigateur le règle sur la taille EN PIXELS : à 24 px, le titre d'une couverture recevait donc la coupe de labeur, plus grasse et plus large, là où une page de titre demande la coupe de titrage. `font-variation-settings: "opsz" 44` sur le titre, `"opsz" 9` sur les capitales espacées, `"opsz" 14` sur le sous-titre. ⚠️ `font-variation-settings` **écrase `font-weight`** : toujours redonner `"wght" 400` dans la même déclaration.
- **Les dessins se vérifient à la taille RÉELLE, jamais dans l'éditeur.** Cinq des neuf premières ébauches passaient pour autre chose une fois rendues à 90 px : la croix nimbée pour une cible (le nimbe mangeait les bras), la lyre pour un tonneau (les bras s'arrêtaient au joug au lieu de le dépasser), la lampe pour un poisson, la plume pour une feuille (il lui manquait son tuyau), la colonne pour trois colonnes (trois cannelures de même largeur). Un emblème au trait ne se juge que rendu.
- **Les mesures sont en `cqw`**, pourcentage de la largeur de la couverture (`container-type: inline-size`), jamais en rem : une couverture doit garder ses proportions qu'elle occupe 14 rem ou toute la colonne d'un téléphone.
- **La quatrième** (`.couverture-dos`) se retourne au survol : le résumé, écrêté à sept lignes, « Lire » sous un filet qui s'éteint aux deux bouts, puis les vues, les ♥ et la mention « parmi les plus lus » au pied. Elle prend le fond de la couverture, si bien que le livre paraît se retourner et non s'ouvrir. **Ses marges valent presque le double de celles de la face** (11 cqw sur les côtés contre 8) : un résumé qui frôle le filet se lit comme une étiquette, pas comme une page.
- ⛔ **La TÊTE et le CADRE ne sont dans AUCUNE des deux faces.** Le nom de l'auteur, son losange, l'étoile des favoris et le cadre doublé sont posés sur le carton lui-même (`.couverture-tete` en flux, `.couverture-cadre` en absolu sur `.couverture`) ; les deux faces se superposent dans `.couverture-corps`, qui occupe ce qui reste. C'est ce qui les rend **immobiles au retournement** — un nom d'auteur qui saute de trois pixels au survol défait toute l'illusion du livre — et ce qui donne aux deux faces la même boîte sans qu'aucune mesure soit recopiée d'une règle à l'autre. Ne jamais les redescendre dans `.couverture-face` pour simplifier le balisage.
- ⚠️ **La vignette (`.couverture::after`) passe AU-DESSUS des deux faces** (`z-index: 7`), et non dessous. La quatrième étant opaque, une vignette placée au fond était masquée sur la seule hauteur du corps : une **couture** apparaissait sous la tête, qui elle la laissait voir. Une lumière de cartonnage se pose sur l'objet, pas dessous.
- **Les textes saisis passent par `normaliserSaisie`** (`app/lib/typographie.ts`) : titre, sous-titre et résumé sont tapés au clavier dans un formulaire, avec apostrophe droite et ponctuation collée, et n'ont traversé aucun atelier d'édition. Au **rendu** seulement — la donnée reste à l'auteur, et une règle qui changerait demain ne laisserait pas derrière elle un corpus à moitié converti.
- ⚠️ **Tactile : pas de quatrième.** Sous `@media (hover: none)`, le dos n'est pas rendu du tout et la face reste : rien ne se survole sur un téléphone, et le résumé se lit sur la page de la publication, à un doigt de là. Ne pas « corriger » en affichant les deux, la couverture y perdrait son titre.

## Les ornements se DÉTOURENT, jamais `mix-blend-mode`

Les gravures de `public/ornements/` arrivent sur un fond crème. Pour qu'elles se posent sur le papier du site, ce fond doit devenir un vrai canal alpha.

⛔ **`mix-blend-mode: multiply` ne peut pas marcher ici, et l'erreur se répète.** L'opacité posée sur la même image crée un contexte d'empilement, lequel isole l'élément et annule le mélange : le fond réapparaît partout où l'ornement est atténué, c'est-à-dire précisément là où on l'atténue. La note de `app/chantier/page.tsx` le raconte pour la première fois ; le refus s'applique à toute gravure.

⚠️ **Rectification du 2026-08-19 : `sharp` EST disponible.** Il arrive comme dépendance de Next, et `require('sharp')` répond (libvips 8.17.3). ImageMagick, lui, reste absent (`convert` dans `system32` est le convertisseur de partitions de Windows). Écrire donc les nouveaux traitements en **Node**, où l'on dispose des entrées-sorties, du rééchantillonnage et du RGBA brut — `scripts/logo-fabriquer.mjs` en donne le patron. Le script PowerShell `scripts/detourer-ornement.ps1` reste comme repli, l'algorithme y étant le même.

**La recette.** Deux étapes, dans cet ordre :

1. **Redimensionner d'abord**, sur des pixels encore opaques (`HighQualityBicubic`), sinon le rééchantillonnage mélange de l'encre avec du transparent et lave le trait. 1024 px de large suffit : la plus grande pose du site est de 20rem. Détourer à la résolution native puis rogner évite la question entièrement, quand la planche n'a pas à être réduite.
2. **Puis détourer** : le fond se MESURE (moyenne des quatre coins), il ne se suppose pas blanc — celui-ci est crème. `alpha = (lumFond − lum) / amplitude`, puis **décomposition** de l'encre de ce même crème (`c = (vu − fond × (1−a)) / a`). Sans cette seconde opération, les bords anti-crénelés gardent le crème et paraissent lavés sur un fond plus sombre.

⚠️ **L'ENCRE aussi se mesure, et par sa MÉDIANE.** Prendre `amplitude = lumFond` revient à supposer l'encre noire. Celle du monogramme est un gris à 45 de luminance : tout le plein du trait ressortait à alpha 226, et l'histogramme le disait — **0,3 % d'encre pleine pour 24 % de partiels**, alors qu'un plein n'a aucune raison d'être partiel. Se caler sur le pixel le plus sombre ne suffit pas non plus, l'encre étant légèrement marbrée : c'est la **médiane du nuage sombre** qui vaut 255, puisque l'intérieur d'un plein EST de l'encre pleine. Après correction : 18,6 % de plein, 6,6 % de partiels — les bords, et eux seuls.

**Contrôle**, avant de committer : l'histogramme du canal alpha. Sur `ordinateur-pentecote.png`, 81 % du plan est réellement transparent, 3 % est de l'encre pleine et 15,7 % des partiels — les hachures. Un fond mal mesuré se voit tout de suite : le taux de transparents s'effondre.

### La recette RÉVISÉE (2026-08-26) — quatre défauts trouvés à l'usage, aucun visible au code

Le script porte désormais TOUTE la chaîne, source brute comprise : `node scripts/ornements-detourer.mjs --source <chemin> --nom <nom> --affichage <px CSS à la racine 16> [--ecrire]`. Sans `--ecrire` il mesure ; `--profil <nom>` relève une planche déjà servie. Les quatre défauts ci-dessous ont tous été trouvés à l'œil, sur des planches que le code déclarait saines.

⛔ **UN FICHIER SE SERT AU DOUBLE DE SA TAILLE D'AFFICHAGE, JAMAIS PLUS.** C'est le plus coûteux des quatre, et le seul que l'auteur ait dû signaler deux fois. Au delà, le navigateur réduit une SECONDE fois derrière la nôtre, et deux réductions successives moyennent les hachures fines en un gris mou : le trait cesse d'être noir. Le rapport dit tout, et il explique pourquoi le défaut ne frappait qu'une partie des planches — la tour de Babel, servie en 1 632 px pour 816 affichés, restait franche ; la cité ruinée, servie en 1 600 px dans une colonne de lecture qui l'affiche à 549, bavait. Rapports mesurés le jour du relevé : 2,0 pour la tour et le désert, **2,9 pour la cité, 3,2 pour la carapace, 3,6 pour l'ordinateur**. ⚠️ La taille d'affichage se calcule à la RACINE 16, le cas courant ; sur un très grand écran la pose grandit et le rapport retombe vers 1,45, ce qui est une réduction douce. Un léger rattrapage de netteté compense celle qui reste.

⛔ **L'ALPHA se calcule sur l'encre qu'on REPOSE, non sur la médiane de la planche.** L'ancienne recette prenait `amplitude = papier − médiane de l'encre`, ce qui est juste tant qu'on GARDE l'encre décomposée pixel par pixel. Dès qu'on repose une encre plus sombre — et c'est ce que la charte prescrit depuis le monogramme —, les deux ne s'accordent plus et tout le dégradé qui borde un trait s'assombrit. Mesuré sur les colonnades, dont la médiane était à 111 pour une encre reposée à 33 : un gris à 180 rendait **136**, un gris à 140 rendait **76**. Corrigé, l'écart moyen au dessin d'origine tombe à **1 niveau**.

⛔ **On ne DÉCOMPOSE plus l'encre.** Sur un papier presque blanc, `c = (vu − fond × (1−a)) / a` divise par un alpha faible et fait exploser l'écart entre canaux là où le trait s'éteint. Mesuré sur l'arbre au corbeau : **12 208 teintes distinctes, de moyenne BLEUE**, pour 936 Ko. La charte avait déjà tranché ce cas à propos du monogramme — « le détourage ne sert que l'ALPHA : la couleur, on la repose ». L'encre de la famille est mesurée sur la tour de Babel ruinée, à la luminance 33 ; toutes les gravures la partagent, de sorte qu'une même absence se dise partout de la même voix. ⚠️ Elle n'est pas noire : un noir franc sur le crème du site fait un trait d'imprimante, non une encre.

⛔ **Le PAPIER se mesure par son niveau DOMINANT, jamais aux quatre COINS.** Celui d'une planche est à 253, celui d'une autre à 247, et leurs coins seuls sont à 255 : le script prenait alors les 90 % de papier pour une encre très pâle et rendait **87 % de partiels au lieu de 6 %**. Même raisonnement que pour l'encre, dont la charte dit déjà qu'elle se mesure par sa médiane et ne se suppose pas noire.

⚠️ **Le POURTOUR de la source se rogne avant tout traitement.** Les planches de Midjourney portent un liseré sombre sur leur bord — 243 de luminance contre 247 à 249 pour le papier. Il passe sous le seuil de normalisation, devient de l'encre, et se voit comme une **barre noire** le long du bord gauche. Il empêche en outre le rognage des marges, un bord sombre l'arrêtant aussitôt : c'est lui qui laissait un ciel vide occuper le tiers de deux planches. Trente-deux pixels suffisent.

⛔ **Une planche se rogne sur ce qui SE VOIT, et une marge négative sous une gravure est presque toujours le symptôme d'une planche mal rognée.** Le rognage sur le blanc laisse passer ce qui n'est blanc qu'à peu près, et le rognage sur `alpha >= 1` est pire encore : sous le dessin traînent des pixels ISOLÉS à alpha 1 à 8, invisibles à l'œil, dont un seul ancre la boîte. Mesuré sur la cité ruinée : **312 lignes de vide gardées par une douzaine de mouchetures**, et la légende se posait cent pixels sous le sol dessiné. Un rang ne compte donc que s'il porte au moins trois pixels à alpha 8 ou plus. ⚠️ La marge négative du livre absent a été posée, ôtée, reposée puis retirée en un jour, à chaque changement de planche : c'est le signe qu'on corrigeait un symptôme. Une fois la planche rognée juste, dix pixels suffisent et ne dépendent plus du dessin.

⚠️ **Et le corollaire de méthode, qui vaut au delà des ornements : une gravure se juge à l'ŒIL et à sa taille RÉELLE.** La charte le disait déjà des emblèmes de couverture, dont cinq sur neuf passaient pour autre chose une fois rendus à 90 px. Trois passes de correction ont été menées ici sur des mesures et des histogrammes sans que personne agrandisse un trait ; l'agrandissement au quadruple a donné la réponse en une seconde.

**Une gravure se pose EN PIED, pas en tête.** Le dossier le dit dans ses propres noms de fichiers : `cul-de-lampe-*`. Un ornement ferme un texte et le commente ; placé au-dessus, il devient l'enseigne de la page, et l'on bute dessus avant de savoir de quoi il retourne. Corrigé le 2026-08-19 sur l'écran d'attente de la Polyglotte, où la gravure avait d'abord été mise en frontispice. **L'intensité suit la place** : les culs-de-lampe du site sont posés entre **0,42 et 0,5** d'opacité, parce qu'ils n'ornent qu'un vide. Une gravure qui porte encore le propos monte au-dessus, sans atteindre l'opaque — 0,72 sur la Polyglotte.

⚠️ **Rendu en `<img>`, pas en `<Image>`, ou alors `unoptimized`.** À certaines largeurs (640 px, mais ni 384 ni 828), l'optimiseur rend un PNG à trois canaux : la couche alpha est aplatie sur du blanc et le fond réapparaît. Le défaut est intermittent, donc facile à croire corrigé.

## Le monogramme « CS » — deux planches, deux emplois (2026-08-19)

Le site a une marque : un `C` gothique enlaçant un `S`, la haste du `S` portant une croix. Elle existe en deux planches, rangées dans `work/logo/`, et **`scripts/logo-fabriquer.mjs` fabrique tout le reste** — le relancer plutôt que retoucher un fichier produit.

- **`monogramme-vert.png`** (carré, crème sur aplat vert) est l'**icône** : onglet, favori, écran d'accueil. Elle n'est pas détourée, et c'est délibéré : à 16 px, c'est l'aplat qui donne la silhouette, un monogramme transparent s'y perdrait sur le fond du navigateur. Elle produit `app/icon.png` (512), `app/apple-icon.png` (180) et `app/favicon.ico` (16, 32, 48, chaque taille en PNG embarqué).
  - ⚠️ **`app/favicon.ico` doit être remplacé lui aussi**, pas seulement `app/icon.png`. Next sert la route `/favicon.ico` à partir du fichier, et c'est elle que réclament les vieux clients et les agrégateurs : un `icon.png` neuf sur un `.ico` périmé laisse l'ancienne marque en circulation.
  - Elle produit aussi **`outils/icone-serveur.ico`** (16 à 256 px), l'icône du raccourci « Serveur Bible-Patristique » épinglé à la barre des tâches. ⚠️ Ce raccourci pointait sur `app/favicon.ico` : le fichier appartenant au dépôt, l'icône **changeait avec la branche cochée**, et restait l'ancienne tant que le poste travaillait ailleurs que sur `master`. Il pointe désormais sur une copie hors dépôt, `C:\Corpus Scriptura\icone-corpus-scriptura.ico`. Après refabrication, recopier le fichier là-bas.
- **`monogramme-creme.png`** (le monogramme seul sur crème) est le **logo du site**. Le détourage ne sert que l'**alpha** : la couleur, on la repose. D'où deux fichiers dans `public/logo/`, même tracé à la teinte près — `monogramme-encre.png` en `--cs-encre-fonce` `rgb(30, 46, 36)` et `monogramme-creme.png` en `rgb(244, 231, 200)`.
  - ⚠️ **L'encre de la planche (#232323) ne sert PAS telle quelle.** Posé dans le titre, entre « Corpus » et « Scriptura », ce noir franc jurait avec le vert d'encre des lettres qui l'entourent. Le monogramme prend donc la teinte du titre lui-même : le noir s'en trouve adouci, et la marque appartient à la ligne au lieu d'y trancher.
- **Pose.** Dans `app/components/Navbar.tsx`, à la place du fleuron `✦`, à `1.875rem` contre le nom du site. **Et là seulement, depuis le 2026-08-27.**
  - ⛔ **Plus en tête de l'accueil** (décision de l'auteur, 2026-08-27). `.hero-monogramme` est supprimée : la marque est déjà dans la barre de navigation, donc sur toutes les pages, et répétée quarante pixels plus bas elle ne disait rien de plus. Sa masse poussait au second rang le titre, qui est l'enseigne véritable. La planche `/logo/monogramme-encre.png` n'est donc plus appelée par aucune page ; elle reste au dépôt, en réserve, et `scripts/logo-fabriquer.mjs` continue de la fabriquer.
  - ⛔ **Pas DANS le titre**, essayé et écarté le 2026-08-19. Lacé entre « Corpus » et « Scriptura », il oblige à le centrer sur la bande des capitales (`vertical-align`, faute de quoi il surplombe le mot), et surtout il coupe le nom en deux là où on le lit.
- ⚠️ **En `<img>`, jamais en `<Image>`** — même raison que les ornements ci-dessus, et le rectangle crème est bien plus visible sur une barre verte que sur du papier.

## Le frontispice de l'accueil — trois temps (2026-08-27)

`app/accueil/page.tsx`. Le nom, un filet gravé, la devise. Il en comptait sept jusqu'au 2026-08-19, et **trois ornements se disputaient le même office** : un bandeau gravé en tête, un `❧ · ❧` que le CSS masquait précisément quand le bandeau était là (`.hero-title-ornament + div { display: none }`, une règle qui ne servait qu'à cacher son voisin), et un filet à fleuron sous le titre. Ils sont tombés à quatre ce jour-là, à trois le 2026-08-27 avec le retrait de la marque (voir « Le monogramme CS » ci-dessus).

- **La gravure descend sous le titre**, où elle remplace le filet à fleuron : elle EST un filet, et sa place est en pied (voir « Une gravure se pose EN PIED » ci-dessus). Son opacité passe de 0,82 à **0,72**, l'intensité suivant la place. Le `❧ · ❧` et le filet à fleuron sont supprimés, pas masqués.
- ⚠️ **Elle était rendue en `<Image>` alors qu'elle porte une couche alpha** — exactement le défaut intermittent décrit plus haut. Passée en `<img>`, ce qui a rendu l'import `next/image` inutile dans le fichier.
- **Le titre monte d'un cran** en même temps que la marque s'en va : `clamp(2rem, 4.8vw, 3.625rem)` au lieu de `clamp(1.875rem, 4.4vw, 3.375rem)`. Il ouvre la page seul, et la masse que portait la marque lui revient. Le blanc au-dessus suit, de `clamp(22px, 3.5vh, 52px)` à `clamp(30px, 5vh, 64px)` : une page de titre respire au-dessus de son premier mot.
- **Écarts mesurés dans la page** (corps de titre 58 px) : titre, 10 px, gravure de 265 px, 14 px, sous-titre, devise.

## ⛔ L'accueil se mesure à UNE SEULE justification (2026-08-27)

`--accueil-mesure`, posée sur `.accueil` dans `app/accueil/page.tsx` et **héritée** par `.ac-grid` d'`AccueilCards` (qui garde `42.5rem` en repli). Elle vaut **55rem** et gouverne ensemble les trois cartes, les deux volets et le bandeau de chiffres.

Les cartes tenaient dans 42,5rem quand les volets et le bandeau en prenaient 58 : sur un écran de 1920, le bloc par où l'on entre dans le site était **en retrait de 124 px de chaque côté** sur ceux qui le suivent, et la page dessinait un sablier. ⛔ Ne pas redonner la mesure bloc par bloc : la changer doit les déplacer tous ensemble.

- **Le pied du volet « Un mot » est SOLIDAIRE** (signature et bouton descendent ensemble). Le bouton seul portait le `margin-top: auto`, si bien que le blanc laissé par le volet voisin, toujours plus haut, s'ouvrait **entre « SQDV » et le bouton**. Un blanc de carte se met entre le corps et le pied, pas au milieu du pied.
- **Le mot garde sa mesure** (`max-width: 30rem`) quand le volet passe à une colonne : il est CENTRÉ, et centré sur sept cents pixels il ne se lit plus.
- ⚠️ **Les volets et le bandeau ne partagent PAS leur seuil.** Les volets passent à une colonne à **900** (le seuil de la charte, au lieu de 760 : entre les deux, deux colonnes de 365 px cassaient tous les titres des ajouts récents sur deux lignes) ; le bandeau ne se replie qu'à **640**, ses cinq tuiles tenant encore leur rang bien après qu'une colonne de prose a cessé d'être lisible. Fondus en un seuil, on ouvrait à 768 px deux colonnes de 360 px pour y loger un nombre à deux chiffres.
- **Empilées, les cartes deviennent des BANDES** (`AccueilCards`, sous 640) : icône CONTRE le titre au lieu de le surmonter, hauteur de 140 px ramenée à 100, et le groupe part du fer à gauche avec une boîte d'icône de largeur fixe — centré, chaque titre se plaçait selon sa propre longueur et les trois icônes ne s'alignaient pas. ⚠️ 6,25rem de hauteur n'est pas un chiffre rond : le volet de choix qui s'ouvre au tap partage la carte en deux, et deux cibles de 50 px sont le plancher de ce qu'un doigt vise. ⛔ Leur `max-width: 320px` d'alors est retiré : empilées, elles rentraient de quelques pixels sur les volets et le bandeau, qui prennent toute la colonne.

## ⛔ Les trois cartes de l'accueil — toute enveloppe posée autour DOIT porter une largeur (2026-08-25)

Les trois cartes ont disparu de l'accueil pendant une journée. Elles étaient bien rendues, larges de **deux pixels** : leurs seules bordures.

`AccueilCards` était jusque-là l'enfant DIRECT du flex en colonne de la page, lequel centre ses enfants (`align-items: center`). Le `width: 100%` d'`.ac-root` portait donc sur la largeur de `<main>`, qui est définie, et la grille recevait ses 680 px. Une ancre `#cartes` sans largeur s'est glissée au milieu (commit `dc8be622`, pour que la planche des illustrations renvoie aux icônes) : or un enfant de flex centré se mesure sur son CONTENU, et tout ce qui garnit une carte — le lien principal et le volet de survol — est en `position: absolute`. La grille ne réclamait donc rien pour elle-même, sinon 3 × 2 px de bordures et 2 × 16 px d'écart : 38 px en tout.

- ⛔ **Le remède est `width: 100%` sur l'enveloppe**, et il n'est pas décoratif : le retirer refait disparaître les cartes.
- ⚠️ **Rien ne le signale.** Aucune erreur, aucun avertissement, le HTML porte les trois cartes et leur CSS est chargé — le composant paraît sain à la lecture. Seule une mesure au navigateur tranche : `getBoundingClientRect()` sur `.ac-card` doit rendre 216 px à 1280, et 320 px empilés à 375.
- **La règle générale, valable partout ailleurs** : une grille dont TOUS les enfants sont en position absolue n'a aucune largeur intrinsèque. Posée sous un flex centré, elle dépend entièrement d'une chaîne ininterrompue de largeurs définies, et n'importe quelle enveloppe intercalée la rompt en silence.

## La couleur appartient à l'auteur

- **Jeu de couvertures** : `app/lib/couverturesEssai.ts` (module pur, 12 tests). **Six nuances d'une seule gamme**, toutes prises ou dérivées des tokens de `globals.css`, dégradées du plus sombre au papier : vert d'encre (#2a3d30), vert (#3d6b4f), sauge (#5e7058), vieil or (#7d6224), ocre pâle (#c8b89e), crème (#ece5d8).
- ⛔ **Aucune teinte étrangère à la palette du site.** La roue de treize couleurs a d'abord été réduite à cinq teintes franches prises sur un nuancier extérieur (bleu, outremer, mauve, ambre) : chacune passait le contraste, et l'ensemble faisait tache — sur un fond crème et vert d'encre, un bleu même sourd n'appartient à rien. Repris le jour même en verts, ocres et crèmes. *Le critère n'est pas qu'une couleur soit belle ni lisible, mais qu'elle appartienne à la gamme* : un rayon de publications doit se lire comme une collection reliée par le même éditeur, non comme un nuancier.
- ⛔ **Aucune encre n'est ni noire ni blanche** (2026-08-19). Un blanc pur sur un vert profond fait un rectangle de bureau, non un cartonnage : ce qui donne le livre relié, c'est une encre TEINTÉE. Chaque couple est **croisé** — le fond et l'encre ne sont jamais de la même famille, faute de quoi le texte s'assoupit sur son fond : les verts portent un or pâle (#e0c894, #f2e2bb, #f4e6c4), le vieil or un vert pâle (#d5e4ba), les deux fonds clairs le vert le plus profond de la gamme (#233a2c, #2a3d30). La règle tient dans les chiffres, non dans l'intention : un test refuse toute encre dont les trois composantes s'écartent de moins de 12, c'est-à-dire tout gris. ⚠️ **Douze est un plancher, pas un but** : le premier vert du vieil or (#eef0dd, écart 29) passait le test et se lisait pourtant comme un BLANC. Un vert trop dilué n'est plus un vert — il a fallu monter à 42 (#d5e4ba), donc assombrir le fond d'autant. La teinte se juge à l'œil, sur le fond, à la taille réelle.
- ⛔ **CE N'EST PAS LE TITRE QUI COMMANDE, C'EST LA DATE** (2026-08-23). Le test ne vérifiait que le titre, à pleine opacité, et c'est pour cela que le défaut a vécu : le pied de couverture est l'encre à **0,78** d'opacité, composée à 3,3cqw — environ **7,7 px**, donc sous les 24 px où WCAG exige 4,5 et non 3. Les six couvertures tenaient au titre et **lâchaient toutes à la date** : soixante-douze textes faibles sur la page, quatre-vingt-dix au Clair. Le test éprouve désormais **chaque opacité réellement employée** (1,00 · 0,84 · 0,78), dans les deux thèmes. Toute retouche du jeu se vérifie à la date.
- ⛔ **Un fond de clarté MOYENNE ne porte aucune encre à ce seuil.** Ni claire ni sombre : cherché, mesuré, aucune valeur ne rattrape. La gamme évite donc la bande du milieu — ce que font d'ailleurs les vraies reliures, profondes ou pâles, rarement entre les deux. C'est pourquoi la révision de 2026-08-23 a dû bouger les FONDS et non les encres.
- ⚠️ **Le jeu du CUIR** : six reliures de cuir, du plus profond au parchemin, le thème sombre étant monochrome — un rayon vert et doré y serait la dernière tache de couleur d'une page qui n'en a plus. Les trois cuirs profonds se séparent par la **chroma** (brun neutre, fauve, châtaigne) et non par la clarté, qui les pousserait dans la bande médiane ; puis la gamme saute au parchemin.
- ⛔ **Le choix du jeu se fait en CSS, jamais en JavaScript.** Le carton porte ses six valeurs en propriétés personnalisées (`--couv-fond`, `--couv-fond-s`…) et une règle `:root[data-theme="sombre"]` décide. Choisir au rendu ferait paraître la couverture dans une teinte puis sauter dans l'autre après l'hydratation. La pastille de choix de l'éditeur suit la même règle : elle doit montrer la couverture **telle qu'elle paraîtra**.
- ⚠️ **Le contraste est TESTÉ**, pas supposé : chaque couverture doit opposer son encre à son fond d'au moins 4,5 (WCAG AA). Trois fonds ont dû être assombris pour y satisfaire — l'or du site (`--cs-or`, #9a7a38) ne donnait que 3,8, la sauge claire (#7d8f77) 3,3, et la sauge assombrie une première fois (#5e7058) est retombée à 4,3 le jour où l'encre est passée du blanc à l'or pâle, et le vieil or (#7d6224 → #705319) a suivi le même chemin : **une encre teintée est moins claire qu'un blanc, et reprend donc de la marge au fond**. Ajouter ou reteinter une couleur sans repasser le test, c'est risquer une couverture jolie et illisible.
- **Stockage** : colonne `essais.couverture` (text, nullable), migration `essais_couverture`. **Aucune contrainte CHECK** : le jeu est éditorial et bougera, et une couleur retirée ne doit ni bloquer une écriture ni effacer une publication. La validation vit dans `estCouvertureConnue`, et la lecture est tolérante — `couvertureDe` rend le défaut (le vert) sur une clé inconnue, vide ou absente.
- **Choix par l'auteur** : rang de pastilles dans le formulaire de métadonnées de `EditeurEssai`, posé **sous le résumé**, puisque le résumé est précisément la quatrième. La couleur part dans le `payload` d'enregistrement.
- ⚠️ **Quatre `select` doivent porter la colonne**, sans quoi la couverture se perd en route : `app/essais/page.tsx` (la liste), `app/essais/[id]/page.tsx` (la lecture, qui alimente l'éditeur), et le passage de `app/essais/[id]/modifier/page.tsx` vers `EditeurEssai`.

**Ce qui disparaît, volontairement** : le bloc « à la une » et sa règle du créneau de dix minutes, la lettrine du résumé, le calque de survol au gabarit du bloc, le balayage doré. Les couvertures sont d'égale dignité. « Parmi les plus lus » survit, déplacé au dos.

# Navbar — menus « Aller plus loin » et « Administration », pages indépendantes

Réorganisation de `app/components/Navbar.tsx` et éclatement de l'ancienne page à onglets `/traductions`.

- **« Aller plus loin » n'est plus une page à onglets.** Chaque ancien onglet est désormais une **page indépendante** ; l'onglet de la navbar déploie au survol (`OngletAllerPlusLoin`, styles `.cs-plus`/`.cs-plus-menu`) la liste `LIENS_ALLER_PLUS_LOIN` : `/traductions` (Les traductions), `/librairies` (Acheter des livres), `/statistiques` (Statistiques), `/pericopes` (Péricopes), `/histoire` (Histoire de l'Église). Le clic sur le libellé ouvre `/traductions`.
  - `/traductions` = `AllerPlusLoinClient.tsx`, réduit à la seule vue « Les traductions » (garde le lien profond `#TR000x`). `/librairies` = page serveur statique. `/statistiques` = `StatistiquesClient.tsx` (versets les plus cités / les plus lus). L'ancienne redirection `/populaires` pointe désormais vers `/statistiques`.
- **« Quiz biblique » n'a plus d'accès par onglet** (retiré d'« Aller plus loin » ; `QuizBibliqueClient` n'y est plus importé). La page `/quiz` subsiste mais n'est plus liée depuis la navbar.
- **Onglet « Administration »** (`OngletAdministration`, réservé aux admins : `estAdmin || estAdminEmail`) : au survol, menu listant chaque section d'admin via `LIENS_ADMIN` → `/admin?onglet=<clé>`, puis, après un filet (`.cs-plus-sep`), l'outil **Bible 899** (`/manuscrits/bible-899`). `AdminClient` lit désormais `?onglet=<clé>` pour **toute** section valide (plus seulement `controle-oeuvres`).
- **Bible 899 ne vit plus que sous Administration** (retiré d'« Aller plus loin »).
- **Mobile** : le panneau déplié reconstruit ces groupes (helper `lienMobile`, intertitres `styleSectionMobile`) : lecture + Patristique/Publications, puis « Aller plus loin » déplié, puis, pour un admin, « Administration » (sections + Bible 899).

# Catalogue des péricopes (liste) — refonte du 2026-08-22

`app/pericopes/PericopesCatalogueClient.tsx`, `app/lib/pericopesRecherche.ts` (logique pure, testée). La page est un **INDEX ANNOTÉ**, sur le modèle d'un index de fin d'ouvrage. Elle remplace la mise en forme « arrêtée » précédente, dont l'audit d'ergonomie a montré qu'elle rendait le catalogue illisible sur son point capital : **l'ordre canonique**.

⛔ **Ce qui est révisé, et pourquoi. Ne pas y revenir sans reprendre les mesures.**

- **Les DEUX COLONNES par livre sont supprimées.** La grille CSS se remplissait **par ligne** : Matthieu se lisait donc en serpentin (1,1 · 2,1 · 2,13 · 2,16 · 3,1 · 3,13), pendant que l'œil lisait les colonnes de haut en bas et y voyait **deux suites croissantes parallèles** — l'illusion parfaite de deux listes indépendantes. On ne pouvait pas suivre l'évangile. Indice que le défaut était une régression : `.peri-bloc` portait encore `break-inside: avoid`, propriété morte sur une grille et qui n'a de sens qu'en multi-colonnes.
- **L'EN-TÊTE DE LIVRE EN BANDEAU est remplacé par un nom EN MARGE, collant** (`.peri-groupe`, grille `8.5rem 1fr` ; `.peri-marge-in` en `position: sticky`). Chaque livre coûtait un en-tête, un filet traversant et un compte perdu à 600 px du titre ; or **29 livres sur 48 n'ont que trois péricopes ou moins, et 19 n'en ont qu'une**. Quatre livres à une entrée (Joël, Jonas, Habacuc, Malachie) faisaient 380 px d'escalier avec la moitié droite vide. En marge, le nom accompagne ses entrées au lieu de les annoncer, et il reste en vue pendant les 52 péricopes de Matthieu. Le compte n'a d'abord paru **qu'au-delà d'une** péricope, puis plus du tout (reprise du 2026-08-23, ci-dessous). En **mobile**, la marge n'a plus lieu d'être : le nom coiffe ses entrées au fer à gauche, prolongé du filet dégradé (`.peri-groupe--mobile`).
- **L'ÉTIQUETTE DE REGISTRE SOUS CHAQUE TITRE est supprimée.** « Récit » se répétait sous **107 titres sur 249** et formait une trame parasite qui doublait la hauteur de chaque entrée. Le registre ne paraît plus que **lorsqu'il distingue** (tout ce qui n'est pas `recit`, cf. `REGISTRE_ORDINAIRE`), en **glose italique muette contre le titre**, au même traitement que « ensemble » — les deux se cumulent en une seule glose.
- **La NOTICE revient, en avant-goût.** La décision du 2026-08-18 (« pas de dépli de notice en place ») tenait au **dépli**, pas à la notice : le lecteur n'avait plus qu'un titre et une référence, donc il cliquait à l'aveugle, alors que les 249 péricopes ont toutes une notice en base et que la description de la page en promettait la présence. La **première phrase** paraît sous le titre, bornée à deux lignes. ⚠️ Elle est taillée **CÔTÉ SERVEUR** par `premierePhraseNotice` (plafond 230 signes, coupe au dernier mot entier) : les notices font 660 signes en moyenne, soit **165 Ko** envoyés au navigateur si on les passait entières.
- **Un COMPTEUR reparaît**, et il n'est pas décoratif : au repos l'étendue du catalogue (« 249 péricopes »), sous filtre le **résultat**, annoncé en `aria-live` — la page ne disait nulle part combien de péricopes répondaient. Précédé de la référence comprise quand il y en a une (« Matthieu 5 · 2 péricopes »).

**Ce qui est CONSERVÉ de la mise en forme précédente** : la référence dorée en chiffres tabulaires (passée en **colonne propre** le 2026-08-23, ci-dessous) ; le chevron doré (`IconeChevron`) révélé au survol et toujours visible au tactile ; l'absence de couleurs de registre ; l'index « Aller à un livre » en abréviations `ABREV_FR`, séparées par Testament ; les enrichissements (`rendreTexteEnrichi`) sur les intitulés **et désormais sur les notices** ; le sur-titre « Catalogue » et le chapeau du volet.

**Ce qui s'ajoute :**

- **Une rubrique de TESTAMENT** dans la liste, seul rang au-dessus du livre : la descente de 48 livres n'avait aucune articulation. (Depuis le 2026-08-23, elle ne paraît que si **deux testaments au moins** sont à l'écran : sous un onglet, l'onglet le nomme déjà.)
- **Le volet sépare NAVIGUER de FILTRER** (composant `Rubrique`). ⚠️ Il ne porte plus les cases de **Testament** depuis le 2026-08-23 : elles sont devenues des onglets, ci-dessous. Les deux portaient le même gris, la même graisse et la même taille : rien ne permettait de prédire ce qu'un clic ferait. Un lien de livre prend le vert et se souligne au survol ; une case de filtre porte un **marqueur carré** qui se remplit. Cibles portées à **24-26 px** (elles faisaient 11 et 20 px).
- **Le registre se replie au-delà de huit valeurs** (`REGISTRES_VISIBLES`) : il en compte quinze, dont trois à un seul élément, et la liste dépassait le volet. ⚠️ Un registre **retenu reste toujours visible**, replié ou non : on ne cache pas un filtre qui agit.
- **La mesure passe à `52rem`.** Elle était de `39rem`, ce qui laissait **252 px de vide de chaque côté** sur un écran de 1440 pendant que les titres se serraient en deux colonnes. Elle fut aussi mise AU FER avec le volet ; elle se **recentre** dans sa colonne depuis le 2026-08-23, sous la barre d'onglets (ci-dessous).

## Reprise du 2026-08-23 — la référence prend sa colonne, la marge perd son compte

Deux règles fixées par l'auteur, et elles tiennent ensemble : **la page ne dit pas combien de péricopes porte un livre**, et **la référence biblique se tient entre le nom du livre et le titre, dans une colonne à elle**.

- **La colonne des références.** `.peri-entree` devient une grille `4.75rem minmax(0, 1fr)` (mobile `4.5rem`) : la référence en première case, le titre, la glose et la notice dans la seconde. Les références partent donc toutes du **même fer** au lieu de flotter au fer à droite du titre, sur un bord ragué où l'on ne pouvait pas suivre les chapitres. C'est le geste d'un index : on descend la colonne de numéros pour retrouver un passage, et l'ordre canonique — le point capital de la page — se lit d'un trait.
- ⚠️ **La mesure de la colonne est comptée, pas devinée.** Les deux plus longues références du corpus (« 52, 13 - 53, 12 » et « 18, 16 - 19, 29 ») font **67,2 px** en Source Serif à `0.71875rem` ; la colonne en fait 76 (72 en mobile), aucune ne déborde. À recompter si le corps de la référence change.
- **Ligne de pied commune** : `align-items: baseline` sur la grille, sans quoi la référence flotte au-dessus de son titre.
- **Le compte de péricopes quitte la marge** : la liste le montre déjà, et il faisait concurrence au nom du livre. Le compteur du **volet** demeure — au repos l'étendue du catalogue, sous filtre le résultat : lui seul dit ce qu'aucune liste ne montre.

## Les ONGLETS de Testament (2026-08-23)

Le partage du corpus est le **premier tri** qu'on fait dans un catalogue biblique. Il se prenait en troisième case d'un volet, sous la recherche, à côté de quinze registres. Il se prend maintenant dans une barre d'onglets, en tête de la liste : « Tout », puis les seuls testaments que le corpus peuple (aujourd'hui les trois).

- ⛔ **Le choix ne se prend qu'à un endroit.** Les cases « Testament » du volet sont retirées : deux cases cochées ne se traduiraient par aucun onglet retenu, et l'état de la page cesserait d'être lisible. L'état passe donc d'un `Set` à un choix unique (`ChoixTestament`) ; `filtrerCatalogue` reçoit toujours un ensemble, à un élément ou vide.
- **La barre est COLLANTE** sous la barre de navigation (`top: HAUTEUR_NAVBAR`), comme le volet à sa gauche. Sa hauteur vit dans `HAUTEUR_ONGLETS`, et **deux autres mesures s'y composent** : la marge collante du nom de livre (`top: calc(NAVBAR + ONGLETS + 14px)`) et le `scrollMarginTop` du saut à un livre. Un nombre recopié à l'un des trois endroits ferait passer les noms de livre **sous** la barre.
- **Le dessin est celui de la Bibliothèque, repris trait pour trait** : filet plein sur la mesure, trait `--cs-vert-aplat` sous l'onglet retenu, libellé en `--cs-vert`, graisse 600, et les onglets se partagent la mesure **à parts égales** (`flex: 1`), chaque libellé centré dans sa case. ⛔ **Les parts égales ne sont pas un ornement** : c'est ce qui permet à la graisse de changer sans décaler personne. Une première version les avait laissés à largeur libre — la barre se rangeait alors au fer à gauche, le filet courait seul sur la moitié droite de la mesure, et la graisse a dû être abandonnée. L'auteur l'a refusée à vue ; la reprise a suivi le même jour.
- **La mesure de la liste se CENTRE dans sa colonne** (`margin: 0 auto` sur le bloc de `52rem`). Le fer à gauche tenait tant que la liste occupait seule la colonne ; sous une barre d'onglets, il collait tout le bloc au volet et laissait le tiers droit de l'écran vide. Ce n'est pas un retour aux 39rem centrées de l'audit : la mesure ne bouge pas, c'est elle qui rendait la page creuse.
- ⚠️ **En mobile, les parts égales seraient plus courtes que « Nouveau Testament »** : les onglets y repartent de leur propre largeur (`flex: 1 1 auto`) et ne se partagent que le jeu qui reste. Les quatre libellés tiennent tout juste — 347 px de barre pour 347 px de mesure à 375 px de large, blanc et corps resserrés (`0 8px`, `0.6875rem`) ; plus étroit, la barre glisse (`overflow-x: auto`) plutôt que d'abréger « Testament ». La graisse, elle, ne bouge pas là : sans jeu à distribuer, elle ferait glisser la barre de trois pixels. Toute retouche de ces valeurs se remesure.
- **Ce sont des FILTRES, non des panneaux** : `role="group"` nommé et `aria-pressed`, jamais un `tablist` — il n'y a pas de `tabpanel` derrière, seulement une liste qui se restreint.

## La recherche comprend les RÉFÉRENCES — `app/lib/pericopesRecherche.ts`

Elle ne regardait que le titre et les appellations : « Mt 5 », « Matthieu », « psaume 22 » ne donnaient rien, alors que c'est ainsi qu'on cherche un passage biblique.

⚠️ **Module PUR, séparé de `app/lib/pericopes.ts`, et c'est nécessaire** : ce dernier ouvre un client navigateur Supabase dès son import, ce qui interdit d'y tester quoi que ce soit sous Vitest (environnement `node`, sans variables publiques). 26 tests dans `pericopesRecherche.test.ts`.

- **Trois cas, et ils ne se traitent pas pareil.** Une **référence chiffrée** (« Mt 5 », « Jn 3, 16 ») ne rend QUE le passage visé. Un **nom de livre seul** (« Jonas ») réunit le livre ET les titres qui portent ce mot — Jonas est aussi bien un livre qu'un personnage de récit. Le reste est du texte libre.
- ⚠️ **Sur un préfixe ambigu, `trouverLivre` retient le nom le plus COURT, et non `null`** : sans cela « psaume » ne désignerait rien, puisqu'il ouvre aussi « Psaume 151 » et « Psaumes de Salomon ». Préfixe accepté à partir de trois lettres ; l'abréviation `ABREV_FR` est reconnue à toute longueur (« Mt », « 1 S »).
- **Les cases restreignent toujours, jamais l'inverse** : la recherche s'applique d'abord (c'est elle qui peut désigner un livre), les cases ensuite. Une note « trouvé via … » posée sur un item qu'une case écarte est retirée.

## Conformité reprise au passage

- **Cinq couleurs étaient écrites en dur**, contre la règle de la charte (§ Palette) : `#b08f48` pour la référence dorée — c'est-à-dire `--cs-or` recopié à la main —, plus la croix d'effacement, le sur-titre, le bouton mobile et la **loupe SVG**, cette dernière tokenisée par `style={{ stroke: … }}` comme l'exige l'exception SVG. Latent tant que seul le thème Clair est servi, bloquant le jour où le Cuir s'allume : sur son fond `#1c1813`, la loupe et le bouton devenaient invisibles.
- **`scrollIntoView` doux et nu remplacé par `allerAAncre`** (§ Défilement doux) : le saut à un livre est une navigation fonctionnelle, elle ne peut pas dépendre d'une animation qui ne s'exécute pas sur certains postes.
- **`cs-defilement-discret`** sur le volet, qui servait la barre système ; `prefers-reduced-motion` sur les transitions ; `scrollMarginTop` et hauteurs de volet composés sur `HAUTEUR_NAVBAR` au lieu de `3.5rem` recopié.
- **Deux fonctions mortes retirées de `app/lib/pericopes.ts`** : `chargerCataloguePericopes` (le catalogue passe par le rendu ISR depuis longtemps) et `chargerNoticePericope`, documentée pour « le survol du catalogue » alors qu'elle n'avait plus aucun appelant.

# Palette harmonisée — tokens sémantiques (`app/globals.css`, `:root`)

Toutes les couleurs de l'interface passent par des **tokens sémantiques** définis dans `:root` de `app/globals.css`. Ils sont **ancrés sur les valeurs déjà dominantes** du code : le rendu perçu ne bouge pas, mais les ~776 couleurs en dur (dont des dizaines de quasi-doublons indiscernables) sont rabattues sur ~22 tokens. **Règle : aucune couleur d'interface n'est écrite en dur ; on utilise le token** (`color: 'var(--cs-texte-doux)'`, `background: 'rgba(var(--cs-danger-rgb), 0.1)'`).

Familles :
- **Accent vert** : `--cs-vert` (`#3d6b4f`), `--cs-vert-rgb` (`61, 107, 79`, pour les `rgba(...)`), `--cs-vert-fonce` (`#2e5440`, survol/pressé), `--cs-vert-pale` (`#dfe8e0`, encarts).
- **Fonds** (crème) : `--cs-fond` (`#f7f4ef`), `--cs-fond-clair` (`#faf8f4`), `--cs-fond-doux` (`#ede9e2`).
- **Bordures & filets** : `--cs-bord` (`#d6d0c4`), `--cs-bord-rgb` (`214, 208, 196`), `--cs-bord-clair` (`#e4dfd8`).
- **Texte** (gris chauds, du ténu au corps) : `--cs-texte-faible` (`#b0a89e`), `--cs-texte-doux` (`#9a958d`), `--cs-texte-second` (`#6b6560`), `--cs-texte` (`#3a3530`), `--cs-texte-fort` (`#2a2520`).
- **Encre** (verts des titres) : `--cs-encre` (`#2a3d30`), `--cs-encre-fonce` (`#1e2e24`). *(Ces verts d'encre, jadis en dur, sont désormais tokenisés.)*
- **Danger & alerte** : `--cs-danger` (`#c0562a`), `--cs-danger-rgb` (`192, 86, 42`), `--cs-danger-fonce` (`#9a2a2a`), `--cs-danger-fond` (`#fdf2ee`), `--cs-danger-bord` (`#e4c4b8`).
- **Or** (références, fleurons, favoris) : `--cs-or` (`#9a7a38`), `--cs-or-doux` (`#c8b89e`).

**Exception volontaire — SVG** : les attributs de présentation `fill=`/`stroke=`/`stop-color=` gardent la valeur **littérale** (une custom property n'y est pas résolue par les navigateurs). Le script de bascule les préserve ; pour tokeniser un SVG, passer par `style={{ stroke: 'var(--cs-vert)' }}`.

**Bascule** : script `scratchpad/sweep-palette.mjs` (table de rabat curée, exceptions SVG protégées), migration sur 89 fichiers / ~2082 usages, en plus des 681 usages du vert. `globals.css` est exclu du balayage (c'est là que les tokens sont **définis**). Référence visuelle de la palette : maquette « Palette d'harmonie » (voir charte §18).

**Mode sombre** : voir la section « Mode sombre — le Cuir » plus bas. Les tokens portent DEUX jeux de valeurs (Clair, Cuir) : le Clair est le défaut et le Cuir se demande depuis le menu de compte. Le Sépia est retiré depuis le 2026-08-23. ⛔ Ne jamais activer un `@media (prefers-color-scheme: dark)` : le réglage du système ne décide pas de la lecture, et un bloc de ce genre a déjà servi un sol noir sous des pages crème.

## Seconde passe (2026-08-19) — ce que la première avait laissé

Audit d'harmonie, dix constats. Les corrections, dans l'ordre de leur importance.

⛔ **Le bloc `@media (prefers-color-scheme: dark)` du gabarit Next était TOUJOURS LÀ**, malgré la consigne ci-dessus, et il était **actif** : mesuré au navigateur, un poste réglé en thème sombre recevait un `document.body` à `rgb(10, 10, 10)` sous des pages crème. Rien ne paraissait, parce que chaque page peint son fond et chaque texte son encre ; le noir n'attendait qu'une page qui oublie l'un ou l'autre. `--background` et `--foreground` étaient de surcroît **les deux seules variables qu'aucun thème ne redéfinissait**. Le bloc est retiré, et les deux noms **dérivent** désormais de `--cs-fond` / `--cs-texte`.

**Six tokens de plus**, chacun pour un rôle que la palette n'avait pas :
- `--cs-texte-gris` (`#8a8278`) : le barreau qui manquait entre `--cs-texte-doux` et `--cs-texte-second`. Il était écrit en dur **80 fois dans 40 fichiers**, à 46 du token le plus proche. Ce n'était pas un doublon, c'était un rang que le code avait créé tout seul. On nomme, on ne rabat pas.
- `--cs-attente` (`#9a5a2a`) : « à normaliser », « brouillon », « en cours ». Un état de FILE, ni le danger (destructif), ni l'or (apparat), ni l'ocre de lacune (absence d'un témoin).
- `--cs-systeme` (`#5f6b86`) : la famille « Système & doctrine » de la navbar, seule teinte froide du site, jusqu'ici en dur et donc intransposable en Cuir. Les deux autres familles prennent `--cs-vert` et `--cs-or`.
- `--cs-vert-clair`, `--cs-or-clair`, `--cs-systeme-clair` : les variantes des trois familles sur le panneau mobile, qui est vert sombre **en toutes circonstances**. Pas de surcouche de thème : leur fond ne change pas.

**Bascule** : 1 033 couleurs rabattues sur un token, dans 87 fichiers, au seuil ΔE ≤ 30 (indiscernable ou presque). Le résidu est de 273 valeurs pour 440 occurrences, chacune employée moins de huit fois et à plus de 30 de tout token : les rabattre serait un changement de dessin, pas une harmonisation.

⛔ **Deux fichiers sont HORS PÉRIMÈTRE de toute passe de bascule**, et les balayer a déjà fait des dégâts :
- `app/essais/[id]/EssaiPDF.tsx` — feuille `@react-pdf` composée en POINTS. PDFKit ne résout aucune custom property (`_normalizeColor` renvoie `null`, `_setColorCore` sort sans rien appliquer) : onze `var(--cs-…)` faisaient tomber au noir le vert du titre et l'or du fleuron, sans erreur. Et sa base `rem` vaut **18 points**, pas 16 : la composition avait grossi d'un huitième pendant que les marges, en points, ne bougeaient pas. Rétabli en hex et en nombres.
- `app/lib/couverturesEssai.ts` — le contraste de chaque couverture est **testé** (WCAG AA) : un token y rend le calcul impossible. C'est le test qui l'a rattrapé.

⚠️ **Le piège de l'alpha collé.** Le site affaiblissait une teinte en lui concaténant deux chiffres : ``background: `${coul}14` ``. Cela ne vaut que si la teinte est un hex littéral. Dès qu'elle devient un token, la chaîne produit `var(--cs-vert)14`, que le navigateur **jette en silence** : le fond translucide disparaît, le texte garde sa couleur, et la pastille reste lisible sans son fond. Douze occurrences. Passer par **`colorMix(teinte, pourcentage)`** (`app/lib/couleurs.ts`), qui accepte les deux formes. `app/lib/formes.test.ts` refuse tout retour de la forme collée.

**Élévations** : 63 formules d'ombre, dont des paires que rien ne séparait à l'œil (mêmes décalages, 0,16 contre 0,18). Six tokens : `--cs-ombre-posee` (surface au repos), `--cs-ombre-nette` (petit objet qui flotte : bascule, infobulle, cellule d'actions — flou court mais ombre franche, sinon l'objet retombe sur la page), `--cs-ombre-flottante`, `--cs-ombre-modale`, plus `--cs-ombre-posee-haut` et `--cs-ombre-modale-haut` pour les barres et tiroirs du bas, dont l'ombre se porte dans l'autre sens. Restent en dur, volontairement : les `inset`, les ombres latérales des tiroirs, et les deux ombres teintées de marque.

**Rayons** : tous les entiers de 2 à 20 servaient. Quatre valeurs désormais, à pas doublé : **4px** (puce, champ, bouton), **8px** (carte, encart), **12px** (modale, panneau), **999px** (pilule), plus `50%` pour le rond. Contrôlé par `app/lib/formes.test.ts`.

**Fonds de page** : cinq sols coexistaient pour un seul « fond du site » — `var(--cs-fond)`, `#f4f0eb` (Histoire, catalogue des péricopes), `#f6f2e8` (Polyglotte, dont la constante était pourtant annotée « fond commun aux autres pages du site »), `#f3efe2` (Profil), `#e8eceb` (Administration, un gris-bleu franchement hors de la famille chaude, alors que `/admin/controle` employait déjà le token). Tous ramenés à `var(--cs-fond)`.

# Mode sombre — le Cuir (2026-08-23)

Le chantier « confort de lecture », ouvert le 4 août et mis en pause le lendemain, est repris et **servi**. Le thème sombre s'appelle **Cuir** dans le code (`data-theme="sombre"`), et c'est désormais le SEUL thème alternatif.

⛔ **Le SÉPIA est retiré (décision de l'auteur, 2026-08-23) : le Cuir suffit.** Il survivait en thème **fantôme** — plus aucune entrée dans l'interface depuis que le menu de compte ne propose qu'un interrupteur « Mode sombre », mais toujours servi à qui l'avait choisi du temps du sélecteur. On l'avait gardé pour qu'une préférence enregistrée ne devienne pas un thème appliqué et introuvable ; le raisonnement était juste, et **il ne tenait que tant qu'on comptait l'éprouver**. On ne l'a jamais fait : le Cuir a eu ses neuf planches, le Sépia zéro, et son bloc ne redéfinissait que **42 des 51 jetons** — les six ombres et les trois variantes claires retombaient sur celles du Clair, sans que personne ait décidé qu'elles le devaient.

⚠️ **Une préférence retirée s'EFFACE, elle ne se contente pas d'être ignorée.** `SCRIPT_THEME` supprime toute valeur qui n'est pas `sombre` : sans quoi la clé `cs-theme` resterait dans le navigateur des anciens lecteurs du Sépia à désigner un thème qui n'existe plus, et le prochain qui lirait `localStorage` y trouverait un nom sans référent. *Corollaire général : un thème sans épreuve n'est pas un thème, c'est un bloc de valeurs que personne n'a regardées.*

- **Un interrupteur, dans le MENU DE COMPTE** (`Navbar.tsx`, `blocCompte`), entre les liens et « Se déconnecter », en desktop comme dans le panneau mobile. Le bouton flottant en bas à droite (`ConfortLecture.tsx`) est supprimé. ⛔ Ne pas remettre le réglage dans la barre : elle est déjà la plus disputée du site et se replie en quatre crans, un élément de plus la rendrait incalculable.
- **Tout le mécanisme vit dans `app/lib/theme.ts`** (module pur, sans « use client », pour servir le gabarit serveur ET la Navbar) : la clé `cs-theme`, `lireTheme`, `appliquerTheme`, et `SCRIPT_THEME`, le script d'application **avant peinture** injecté en tête de `<body>`. Ne pas recomposer ce script ailleurs, et ne pas le déplacer dans un effet : la page crème clignoterait avant de virer au brun à chaque navigation.
- **Le clair ne porte AUCUN attribut** et n'écrit rien dans le stockage. Une page servie sans script reste donc celle qu'on connaît, ce qui vaut pour les moteurs comme pour un poste où le stockage local est refusé.
- **L'interrupteur part de `false` au rendu serveur** et se rattrape au montage, comme `useEstMobile` : le thème réel est déjà posé sur `<html>` par le script, l'effet ne dessine que le bouton. Partir de la valeur mémorisée ferait diverger les deux rendus.

## ⛔ Le thème est une PRÉFÉRENCE DE COMPTE, le stockage local n'en est que le miroir (2026-08-24)

La préférence vit dans **`profils.theme_lecture`** (`clair`, `sombre`, ou `null` tant que rien n'a été choisi). Jusqu'ici elle ne vivait que dans `localStorage` : un interrupteur, et rien de retenu. Elle ne suivait donc pas le lecteur d'un poste à l'autre, et **« éteint » ne se distinguait pas de « jamais choisi »**, puisque revenir au clair EFFACE la clé.

- **Le miroir local reste, et il est nécessaire** : lui seul sait poser le thème AVANT peinture. Une colonne en base n'arrivera jamais à temps, et lire un cookie dans le gabarit racine rendrait DYNAMIQUE la totalité du site, trente et une routes aujourd'hui prérendues comprises. Le script de `SCRIPT_THEME` ne bouge pas.
- **Tout passe par `ProvisionCompte`** (`app/lib/contexteCompte.tsx`), qui expose `theme` et `changerTheme`. ⛔ Ne plus appeler `appliquerTheme` depuis un composant : l'écran, le miroir et le compte s'écrivent ensemble ou pas du tout.
- **Le rapprochement se fait à l'arrivée du profil, une fois par session.** Le COMPTE l'emporte sur le navigateur ; et un navigateur qui porte un choix que le compte ignore encore le lui remonte, de sorte que les préférences d'avant ne sont pas perdues.
- ⛔ **Ce rapprochement ne peut pas boucler, et c'est délibéré** : le profil est demandé sur `userId`, jamais sur le thème. La boucle de la traduction biblique du même jour venait précisément d'un effet qui avait dans ses dépendances la valeur qu'il posait.
- **Le réglage se nomme dans la page du compte** (« Thème de lecture », à côté de la traduction par défaut), l'interrupteur du menu n'en étant que le raccourci. Un réglage qu'on ne peut qu'actionner, sans le voir écrit nulle part, ne se sait pas conservé.
- ⚠️ **Colonne nullable et SANS contrainte `CHECK`**, comme `essais.couverture` : la liste des thèmes est éditoriale, le Sépia en est sorti. Une valeur devenue inconnue est relue par `themeValide` et retombe sur le Clair.
- ⚠️ Ajouter la colonne au type `Profil` **et aux deux `select` de `app/compte/page.tsx`** : un champ présent dans le formulaire mais absent du `select` s'enregistre à vide.

## Ce que l'épreuve du Cuir a trouvé, et qui ne se voyait pas

Une maquette a composé chaque surface du site avec les jetons réels. Trois enseignements, dont deux étaient invisibles au compte des couleurs en dur.

⛔ **Un seuil de contraste ABSOLU ne dit rien sur un thème.** Mesuré contre 4,5, le Clair en service échoue **sept fois** : les barreaux ténus de l'échelle de gris, l'or des fleurons et le tan des étiquettes sont faits pour s'effacer. Ce qui se mesure est l'**écart au Clair**, rôle par rôle : une transposition réussie garde à chaque rôle le poids qu'il avait. Deux rôles le perdaient.

⛔ **`--cs-lacune` était le seul jeton que le Cuir ne redéfinissait pas, et il porte les appels de note.** Le compte des jetons manquants disait « quatre », dont trois voulus (les `-clair` du panneau mobile, qui n'ont pas de surcouche). Le quatrième portait `appelNote.tsx` (TOUS les appels du corps), la mention « Lacune du manuscrit » de la page Bible, les marqueurs de la Bible 899 et la famille Publications de la navbar. Resté à sa valeur claire, il rendait **3,51** sur le sol du Cuir, pour un appel composé à 0,60 em. Transposé, 7,11.

⛔ **`--cs-danger-fonce` était transposé À L'ENVERS.** Il valait `#c25738`, c'est-à-dire **plus sombre** que `--cs-danger` : la logique du thème clair recopiée sur un sol où elle s'inverse. Le rôle « danger confirmé » y devenait l'encre la plus faible du jeu, **3,96 contre 6,99** au Clair, la plus forte perte du nuancier. Comme l'échelle de texte, la famille du danger s'inverse : le rang fort est le plus lumineux. **Règle générale : une famille transposée se relit dans son nouveau sol, elle ne se recopie pas.**

⛔ **L'exception SVG de la charte a été écrite POUR LE CLAIR, et elle est un trou dans le Cuir.** Les attributs `stroke=`/`fill=` gardent la valeur littérale, à juste titre, une custom property n'y étant pas résolue. Mais un vert d'encre `#2a3d30` posé sur un sol `#1c1813` ne se voit plus : la silhouette d'auteur et la loupe de la bibliothèque **disparaissaient**. Le remède était déjà écrit, il n'était simplement jamais appliqué : **poser `color` sur le `<svg>` et prendre `currentColor` sur les traits**. Fait sur la bibliothèque, les publications, l'histoire, l'admin et les deux marques de la navbar. ⛔ **Tout SVG d'interface se tokenise désormais par `currentColor`** ; la valeur littérale n'est tolérée que dans une illustration, qui porte sa propre palette (le quiz).

⚠️ **Un jeton recopié EN COMPOSANTES est un jeton en dur.** `rgba(61,107,79,α)` EST `--cs-vert`, et il ne suit aucun thème. La palette porte `--cs-vert-rgb`, `--cs-bord-rgb`, `--cs-danger-rgb` pour cela, et désormais **`--cs-or-rgb`**, qui manquait : cinq encadrements dorés recopiaient donc la teinte à la main, faute d'un nom où se ranger.

## Deux familles nouvelles, nées du même examen

- **`--cs-surnum-*`** (quatre rangs) : les versets propres à la Septante, hors de l'ossature canonique, dans la Polyglotte. C'est la seule famille du site qui **ne se rabatte sur rien** : mesuré, son violet est à **ΔE 36,7** de `--cs-systeme`, le jeton le plus proche. Ce n'était pas un doublon, c'était un rôle sans nom. Sept violets écrits en dur rabattus sur quatre rangs, déplacement maximal ΔE 18,4. Les rouges de signalement de la même page, eux, se rabattent bien sur la famille du danger (ΔE 16,2 et 10,8), et le jaune du verset visé devient `--cs-vise-fond`. **La Polyglotte ne porte plus une seule couleur en dur.**
- **`--cs-original`** : l'encre du texte en langue originale composé en regard du français. Elle vaut **65 % du contraste du corps**, et les trois thèmes gardent ce rapport. Elle était écrite en dur dans trois fichiers, et **testée** (`BibleBilingue.test.tsx` vérifie que la colonne latine la porte et que la française ne la porte pas — le test vise maintenant le nom du jeton).

## ⛔ Le Cuir est MONOCHROME (décision de l'auteur, 2026-08-23)

Cuir et beiges, une seule famille chaude. La première version transposait chaque famille dans SA teinte : le vert d'encre restait vert, l'or restait or, le bleu « Système » restait bleu, le violet du surnuméraire restait violet. **Sur un papier crème ces quatre teintes se tiennent, parce que le blanc les éloigne ; sur un fond brun elles se rapprochent toutes et la page devient bariolée.**

⚠️ **Ce que la couleur faisait, il faut le refaire autrement.** Le thème clair sépare ses RÔLES par la TEINTE. En monochrome cette séparation n'existe plus, et elle se refait sur deux axes qui se mesurent :
- la **CHROMA** : le corps du texte est un gris chaud presque neutre (8), une encre de titre est nettement plus saturée (20), un accent davantage encore (31). C'est la saturation qui dit « ceci appelle » ;
- la **LUMINANCE** : les quatre tans de l'apparat (lacune, attente, or, étiquette) s'échelonnent en clarté, la lacune en tête puisqu'elle porte les appels de note à 0,60 em.

Toute la palette tient dans une bande de **26° de teinte**, chaque séparation qui porte du sens vaut au moins **ΔE 9,9**. ⛔ Avant de retoucher une valeur du bloc Cuir, refaire tourner la mesure : ces écarts ne se jugent pas à l'œil.

⛔ **Une seule exception, et elle est fonctionnelle** : l'AVERTISSEMENT garde une terre de Sienne brûlée, à 42° quand tout le reste est entre 67° et 93°. Ne pas la ramener au beige : c'est le seul endroit où la couleur travaille.

⚠️ **La barre et le panneau mobile cessent d'être verts en Cuir.** Ils seraient sinon la seule tache de couleur d'une page qui n'en a plus. Corollaire : les trois familles du panneau (`--cs-*-clair`), que la charte déclarait hors thème parce que son fond ne changeait jamais, reçoivent une surcouche — son fond change maintenant.

⚠️ **Un vert écrit à la main ne se repère pas au grep, il se repère au COLORIMÈTRE.** Le contrôle final a relevé toute teinte hors de la bande du cuir (30°-105°) et de chroma > 12 : quatre-vingt-huit valeurs. ⛔ **Toutes ne se rabattent pas** : la frise de l'histoire et les catégories de modération encodent des CATÉGORIES par la couleur, et les rabattre effacerait l'information — dans le thème clair aussi, qu'il n'était pas question de changer. Seules les teintes dont le jeton le plus proche appartient à la famille du vert ou du danger ont été reprises. Restent 42 valeurs hors bande, délibérément : leur sort en Cuir est une décision éditoriale, pas un balayage.

⚠️ **Un vert très DÉSATURÉ n'appartient pas à la famille du vert.** Le nom de la traduction sous l'intitulé de chapitre était un `#6b8270` : son jeton le plus proche est `--cs-texte-gris`, non `--cs-vert`, parce que c'est un marqueur discret et non un accent. La garde par famille l'avait donc laissé passer, et c'était la dernière tache de la page Bible.

## ⛔ Encre contre aplat — le partage qui a manqué QUATRE fois

Le passage du Cuir au monochrome a rendu les encres CLAIRES. Tout endroit qui en employait une comme FOND s'est donc retourné, et le défaut est revenu quatre fois de suite sous des formes différentes. À vérifier avant toute retouche de palette.

⚠️ **Un balayage sur `background:` ne voit pas les CONSTANTES.** La Polyglotte compose ses bandeaux avec `const VERT_ENTETE = "var(--cs-encre)"`, puis `background: VERT_ENTETE`. Aucune recherche textuelle sur `background:` ne l'atteint, et c'est ainsi que son en-tête a servi du blanc sur du beige. **Repérage complémentaire** : `grep -rE "^const [A-Z_]+ *= *[\"']var\(--cs-(encre|texte|vert)" app`.

⚠️ **Il faut TROIS rangs d'aplat, pas deux.** La Polyglotte empile navbar, bandeau des traductions et bandeau du livre. Le troisième retombait sur `--cs-encre` faute d'un jeton. D'où `--cs-vert-aplat-profond` ; les trois rangs s'écartent de 1,2 à 1,4, comme au Clair.

⛔ **Un CALQUE de fenêtre est une OMBRE, pas une couleur.** `ModaleRemplacerCitation` posait `colorMix('var(--cs-texte-fort)', 52)` : en Cuir ce jeton est presque blanc, et le voile d'une modale devenait un **rideau blanc** tiré sur la page. Un calque se pose en noir translucide, jamais sur un jeton de texte.

⚠️ **Un dégradé de médaillon est un aplat**, lui aussi : les initiales de profil et de compte prenaient `--cs-vert-fonce → --cs-encre`.

⛔ **Un voile blanc à forte opacité ne dit pas « blanc », il dit PAPIER.** `rgba(255,255,255,0.72)` sur le crème du site passe pour la surface et ne se remarque pas ; sur le cuir il devient un galet d'ARGENT, chroma 1 au milieu d'une page entièrement chaude — c'est ce qu'était le champ de recherche des Publications. ⚠️ **La borne est à 0,5, et elle a un sens** : au-dessus le voile remplace le papier et prend `--cs-surface` ; au-dessous il éclaircit un aplat déjà sombre (compteur d'onglet actif, rail des notes, cartons de l'accueil, toute la barre de navigation) et il est alors juste, ces fonds ne changeant pas avec le thème.

## ⛔ Les ORNEMENTS se retournent, ils ne se remplacent pas

Les gravures de `public/ornements/` sont détourées : l'alpha porte le trait, la couleur est une encre sombre — mesurée à **71 de luminance** sur la tour de Babel. Sur le papier crème elles se lisent ; sur le cuir elles rendent **1,88**, c'est-à-dire presque rien.

La charte disait déjà comment faire, à propos du monogramme : « le détourage ne sert que l'ALPHA : la couleur, on la repose ». Un filtre le fait sans nouveau fichier : `:root[data-theme="sombre"] .cs-ornement { filter: invert(0.88) sepia(0.5) saturate(0.6) }`. Mesuré, le trait passe de `rgb(71,70,69)` à `rgb(166,159,147)`, soit de 1,88 à **6,74** — une gravure claire sur du cuir, qui est le caractère juste d'une reliure estampée.

⛔ **ONZE PLANCHES SUR DIX-NEUF n'étaient pas détourées** (relevé du 2026-08-23), dont **sept sans la moindre couche alpha**. Le défaut est bien plus ancien que le mode sombre, et c'est lui qui le rendait invisible : sur le papier crème du site, un fond crème opaque ne se voit pas. Il a fallu un sol brun pour que chaque gravure s'encadre d'un rectangle. Les cinq qui sont posées sur le site sont détourées ; les six autres attendent d'être employées.

⚠️ **Le script est versionné : `scripts/ornements-detourer.mjs`.** Sans `--ecrire` il MESURE et ne touche à rien — c'est ainsi qu'on relève une planche avant de la reprendre. Il suit la recette de la charte : le fond se mesure aux quatre coins, l'encre par sa MÉDIANE, puis on la décompose du fond. Les originaux sont copiés hors du dépôt avant toute écriture (`C:\Corpus Scriptura\ornements-originaux-20260823`).

⚠️ **Deux profils, et il faut savoir les distinguer.** Une gravure au TRAIT rend ~85-94 % de transparents pour 3-13 % de partiels : les bords, et eux seuls. Un dessin en DEMI-TEINTES rend 60 % et plus de partiels, ce que la charte signale déjà comme suspect (« un plein n'a aucune raison d'être partiel »). Détourer le second par la luminance aplatit son modelé : `carapace-vide` et `cul-de-lampe-cristaux` sont dans ce cas, et l'ont été tout de même, un rectangle sur la page valant moins qu'un aplatissement.

⚠️ **Un trait CLAIR sur fond sombre a moins de présence qu'un trait sombre sur crème, à intensité égale.** Mesuré sur le cul-de-lampe du buisson ardent : l'écart moyen au sol vaut 4,00 au Clair et 3,65 en Cuir, à la même opacité de 0,42 — donc l'ornement est bien à son intensité voulue, et c'est l'œil qui le trouve plus ténu. ⛔ Ne pas compenser par `brightness` : l'encre est déjà quasi blanche après l'inversion et le filtre sature aussitôt. La seule prise est l'opacité, qui est la valeur calibrée par l'auteur — la changer est sa décision, pas une correction.

⚠️ **Poser la classe `cs-ornement` sur toute nouvelle gravure.** Un sélecteur d'attribut sur `src` ne suffirait pas : deux poses passent par `<Image>`, dont Next réécrit le `src`.

⛔ Ne pas remplacer ce filtre par `opacity` ni par un `mix-blend-mode` : l'opacité crée un contexte d'empilement qui annule le mélange, piège déjà consigné plus haut.

## ⛔ Le seuil de contraste DÉPEND DU CORPS (contrôle du 2026-08-23)

⛔ **3,0 est le seuil du GRAND texte, pas le seuil.** WCAG demande **4,5** sous 24px, ou sous 18,66px en gras. Or les rangs ténus du site servent à **9 et 10px** : le contrôle qui mesure contre 3,0 est donc le plus indulgent là où il faudrait l'être le moins. Deux passes d'audit sont passées à côté pour cette raison, et c'est l'auteur qui l'a vu à l'œil avant que la mesure ne le dise.

⚠️ **Le fond se COMPOSE, il ne se cueille pas.** Remonter jusqu'à la première couche opaque ignore les voiles translucides posés en route ; un `rgba(...,0.08)` change le résultat. Composer les couches de la plus lointaine à la plus proche, et appliquer l'`opacity` de l'élément à son encre comme une transparence.

⚠️ **Une correction d'échelle se RÉESPACE, elle ne se relève pas.** `--cs-texte-faible` rendait 3,29 à 9px ; le remonter seul l'aurait collé à son voisin. Sur un fond crème on descend très bas sans perdre le texte, sur un sol sombre la plage utile est plus étroite et six rangs n'y tiennent pas aux mêmes écarts. Les quatre rangs bas du Cuir sont donc réespacés : **5,4 · 6,7 · 8,2 · 10,0 · 13,2 · 14,9**, à écarts croissants.

⚠️ **La MATRICE, pas le sol.** Une page ne pose pas ses textes sur le seul `--cs-fond` : une carte est sur `--cs-surface`, un encart sur `--cs-fond-doux`, un verset visé sur `--cs-vise-fond`. Mesurer chaque encre contre chaque fond que le thème peut lui donner — le script d'atelier le fait — sinon un jeton qui tient sur le sol lâche sur une carte sans qu'on le sache.

⚠️ **Comparer les deux thèmes avant de conclure à une régression.** La page des Publications compte 72 textes sous leur seuil en Cuir, et **90 au Clair** : ce sont les dates à 7,7px posées sur les couvertures, qui ne suivent aucun thème par décision. Le défaut est ancien et vaut pour les deux ; le corriger demande de revoir la composition des couvertures, non la palette.

⚠️ **Un `<button>` n'est PAS un élément étiquetable.** Enveloppé dans un `<label>`, il en reçoit le curseur de pointeur sans en recevoir le clic : la rangée « Mode sombre » avait l'air cliquable et ne l'était pas. Le défaut ne se lit pas dans le code, l'imbrication paraissant correcte ; il se voit au doigt.

## L'audit au navigateur (2026-08-23) — six défauts qu'aucune mesure locale ne voyait

Le site étant fermé, il a fallu le parcourir SOUS SESSION dans le navigateur de l'auteur, sur la version EN LIGNE. Six défauts, dont un introduit par la passe de la veille. Aucun n'apparaissait dans le dépôt : ils ne se voient qu'en page composée.

⛔ **Un balayage se borne à l'EXPRESSION d'une propriété, jamais à la LIGNE.** Le passage des fonds verts en ternaire remplaçait toutes les occurrences de la ligne dès qu'elle portait un `background:`, y compris celles d'un `color:` voisin. **Vingt et une encres vertes sont devenues des aplats**, donc sombres sur un sol sombre : « Livre premier » du sommaire d'une œuvre rendait 2,46. Le repérage se fait maintenant en bornant au premier `,` de haut niveau (voir la fonction `borne` des scripts d'atelier). *Corollaire de méthode : un correctif de masse se vérifie à l'écran, pas au compte de remplacements.*

⛔ **Un dégradé de CARTE composé avec des jetons d'ENCRE inverse ses valeurs.** Les trois cartons de l'accueil (`AccueilCards.tsx`) prenaient `--cs-encre`, `--cs-texte` et `--cs-texte-fort` : transposés, ils devenaient clairs, et « Publications » était un carton presque blanc sous un texte crème. Ils portent désormais des valeurs **littérales**, comme le jeu de couvertures des publications et pour la même raison — c'est une gamme dessinée, non une teinte d'interface — avec un jeu propre au Cuir. ⚠️ **Sur un sol sombre, un carton se détache en MONTANT** : ses valeurs sont plus claires que le sol, non plus sombres.

⚠️ **L'état PRESSÉ d'un aplat a besoin de son propre jeton.** `--cs-vert-fonce` est le survol de l'ENCRE et s'éclaircit avec elle : d'où `--cs-vert-aplat-fonce`.

⚠️ **Trente-sept knockouts se cachaient dans des ternaires**, invisibles au premier balayage, dont la pastille du chapitre actif de la page Bible.

⚠️ **Une MARQUE en image ne se transpose pas : elle se double.** Le monogramme de l'accueil est le vert d'encre, invisible sur le brun. Les deux planches existaient déjà (`monogramme-encre.png`, `monogramme-creme.png`) : on les superpose et le thème n'en montre qu'une, en CSS. ⛔ Ne pas choisir la planche en JavaScript : elle paraîtrait après la peinture.

⚠️ **Toutes les faiblesses de contraste ne sont pas des régressions.** La flèche de chapitre désactivée rend **1,40 au Clair comme au Cuir** : c'est un état désactivé, et la transposition est fidèle. Comparer les deux thèmes avant de corriger.

⛔ **Les GRAVURES restent à traiter, et c'est une décision d'auteur.** Mesurée au navigateur, l'encre de la tour de Babel vaut **52 de luminance sur un sol à 24**, soit un contraste de 1,5 : ce ne sont pas des négatifs, ce sont des encres devenues plus claires que leur papier. Le remède est celui du monogramme, que la charte énonce déjà (« le détourage ne sert que l'ALPHA : la couleur, on la repose »), mais il demande **une planche crème par ornement**, fabriquée depuis le même alpha par le patron de `scripts/logo-fabriquer.mjs`. Une autre voie serait de poser le PNG en `mask-image` et de peindre la forme au jeton, ce qui rendrait tout ornement thématique d'un coup ; elle n'a pas été retenue sans décision.

## Ce qui reste, et pourquoi on ne l'a pas fait

Le compte de **642** couleurs en dur était trompeur : il additionnait des choses qui ne se corrigent pas de la même façon. Après cette passe il en reste 352 hors quiz et hors périmètre exclu, dont **90 illisibles sur le sol du Cuir** (rapport < 3), réparties sur une trentaine de fichiers à raison d'une à six chacune.

- **Ce sont EXACTEMENT les résidus que la passe d'harmonie avait laissés à dessein** : chacune employée moins de huit fois et à plus de ΔE 30 de tout jeton. Les rabattre serait un changement de dessin, pas une harmonisation. Il faut donc les **transposer une par une**, ce qui demande une décision par cas.
- **Le chemin de LECTURE, lui, est sain** : plus aucune teinte illisible dans `TexteBible`, `NavLivres`, `PanneauPatristique`, `PageTitre`, `BibleBilingue`, la page Bible, la page d'œuvre, la péricope ni la Polyglotte. Le reste vit dans l'admin, les écrans d'exception et les pages de service.
- ✅ **Réglé le 2026-08-23** : le `#575048` d'`OeuvreClient.tsx` a disparu du dépôt, et la copie de `LABEL_VOLET`/`BTN_VOLET` est réunie dans `app/lib/stylesVoletLecture.ts`. Le chemin de lecture ne porte plus aucune teinte en dur illisible au Cuir — vérifié par relevé, contraste calculé contre les deux sols.
- ⛔ **Le résidu ne se rabat toujours pas, mais il est désormais GELÉ** : `app/lib/couleursEnDurInventaire.ts` en porte l'état (353 teintes, 68 fichiers, au 2026-08-23) et `couleursEnDur.test.ts` refuse tout ajout. La liste ne peut plus que décroître — voir la section « La garde chromatique » plus bas.
- **Hors périmètre pour toujours** : `EssaiPDF.tsx` (PDFKit ne résout aucune custom property) et `couverturesEssai.ts` (contraste testé). **Hors périmètre par décision** : `app/quiz/`, chantier Holy Guessr, dont les SVG sont une illustration à palette propre et non du chrome.

# Perf du chemin de lecture (audit, point 2)

- **Scroll-spy du sommaire (`OeuvreClient`)** : le `onScroll` qui lit `getBoundingClientRect()` en boucle est désormais **throttlé par `requestAnimationFrame`** (≤ 1 mesure par frame). Ne plus le déthrottler.
- **`FiletSignet` (`TexteBible`)** : le `ResizeObserver` sur le paragraphe suffit (il couvre les reflux, y compris au redimensionnement de fenêtre) ; le listener `window resize` redondant (un par verset prélevé) a été retiré. N.B. le filet n'est rendu que pour les versets **déjà prélevés** (peu nombreux), pas tous.
- **`SelecteurCitation`** : recharge à chaque changement de traduction et ne lit qu'une colonne → passe de `select('*')` à `select('id_verset, verset, ${trad}')` (colonne contrôlée TR000x, jamais de saisie libre).
- **`app/page.tsx` (Bible) — `versets_lecture.select('*')` est VOLONTAIRE** : il charge toutes les traductions d'un chapitre pour permettre le **basculement de traduction instantané côté client** (TexteBible lit `v[traduction]` dans les données déjà en mémoire, sans round-trip). Ne pas restreindre ce select : ce serait une régression UX, pas une optimisation. (Faux positif d'audit.)

# Accessibilité — focus clavier (audit, point 3a)

Anneau de focus **clavier** global dans `app/globals.css` (`:focus-visible`, couleur `--cs-vert`, `!important` pour couvrir les `outline: none` en ligne). Couvre tous les `input/textarea/select/[contenteditable]` + `a/button/[role=button]/[tabindex=0]`.
- **Ne plus** neutraliser le focus sans remplacement : `outline: none` inline reste toléré (l'aspect souris), la règle globale rétablit l'anneau au clavier.
- **Champ sur fond vert/sombre** : ajouter la classe `cs-focus-clair` (anneau clair, sinon le vert ne contraste pas). Déjà posée sur la recherche Navbar et l'input admin sombre.
- Reste à faire sur le point 3 : les `<div/span onClick>` non focusables (clavier), les interactions au survol seul, quelques contrastes de gris, et les 88 `set-state-in-effect`.

# Tests (audit, point 4) — socle vitest

Config `vitest.config.mts` : la suite ne ramasse que `app/**` et `scripts/**` (`include`), et **exclut** `work/`, `audit/`, `tmp/`, `.next/` — leurs tests jetables (assets manquants d'un lot d'import) faisaient échouer `npm test` sans rapport avec le code applicatif.
- Lancer : `npm test` (= `vitest run`). Environnement `node` par défaut ; pour un test qui a besoin du DOM, poser `// @vitest-environment jsdom` en tête de fichier.
- Imports **relatifs** dans les tests (`./referencesBibliques`), pas l'alias `@/` (pas de plugin tsconfig-paths).
- Premières suites sur la logique pure critique : `app/lib/referencesBibliques.test.ts` (formatage des références, utilisé partout) et `app/lib/classement.test.ts` (score/rangs). **Étendre en priorité** aux invariants sensibles : liens bibliques (`scripts/_liens-commun.mjs::verifierLienMecanique`), alignement `versets_v2`, dates historiques.

# Les gardes du dessin — un axe sans garde DÉRIVE (audit code & esthétique, 2026-08-23)

C'est la trouvaille de fond de l'audit, et elle explique tout le reste. Le site tient son dessin par des **tests qui balaient `app/` à chaque `npm test`**. Là où une garde existe, l'ordre règne ; là où il n'y en a pas, le désordre s'installe — et l'on croit à tort que c'est affaire de discipline.

| Axe | Garde | État au 2026-08-23 |
|---|---|---|
| Corps de texte | `echelleTypographique.test.ts` | 32 rangs tenus, 1 772 tailles en dur toutes sur la grille |
| Rayons d'angle | `formes.test.ts` | 5 rangs tenus |
| Titres de page | `titresPages.test.ts` | tenu |
| **Couleur** | `couleursEnDur.test.ts` (**neuf**) | 353 teintes gelées, la liste ne peut que décroître |
| **Illustrations** | `admin/illustrations/inventaire.test.ts` (**neuf, 2026-08-24**) | 58 images recensées, aucune oubliée, aucun fantôme |
| **Syntaxe CSS** | `cssValide.test.ts` (**neuve, 2026-08-28**) | 2 feuilles passées à `postcss.parse` à chaque exécution |
| **Empilement** | **aucune** | 147 déclarations de `z-index`, **40 valeurs distinctes**, de 0 à 9999 |

⚠️ **Les 1 772 `fontSize` écrites en dur ne sont PAS de la dette**, et un audit qui les signale produit un faux positif : elles sont sur la grille, et un test le vérifie à chaque exécution. Ce qui compte n'est pas qu'une valeur soit littérale, c'est qu'elle soit sous garde.

⛔ **L'empilement n'a jamais eu sa passe**, et c'est le dernier axe qui manque. Quarante valeurs pour un besoin qui en demande quatre ou cinq (page, flottant, volet, modale, alerte) : trait pour trait le désordre des 112 tailles et celui des rayons de 2 à 20. Il a déjà une conséquence consignée — la règle « fenêtres contextuelles, jamais sous la nav » est exactement le symptôme d'un empilement sans échelle.

## La garde du CSS — le seul axe que rien ne LISAIT (2026-08-28)

⛔ `app/globals.css` a été poussé avec **une accolade en moins** : une règle `@container` sans sa fermeture. PostCSS refuse alors le fichier ENTIER (« Unclosed block », ligne 1181), `next build` s'arrête, et **deux déploiements de suite ont échoué**. Le site est resté sur la version de la veille pendant une heure, sans que rien ne le signale côté dépôt — c'est le piège déjà consigné (« un déploiement qui échoue ne se voit NULLE PART »), rencontré une seconde fois.

⚠️ **Les trois gardes du dessin lisent le CSS comme du TEXTE**, à coups d'expressions régulières : elles auraient relevé sans broncher les tailles et les teintes d'un fichier que le navigateur refuse d'ouvrir. `tsc` ignore les feuilles, `eslint` aussi. Le seul outil qui PARSE est `next build`, qui coûte trois minutes et qu'on ne joue pas à chaque commit. D'où **`app/lib/cssValide.test.ts`** : il passe chaque feuille à `postcss.parse`, le même analyseur que la chaîne de construction. Il ne juge rien du dessin ; il vérifie que le fichier est du CSS, ce qui est le préalable de toutes les autres gardes.

⛔ **Et le défaut ne venait pas du code, mais de la MISE EN INDEX.** `globals.css` portait aussi un chantier d'autrui ; pour n'indexer que ma part, le morceau avait été découpé par recherche de chaîne, et la première accolade fermante trouvée après `.cs-volet-lien-court { display: inline; }` est celle de CETTE déclaration, non celle du bloc `@container`. L'arbre de travail était juste, l'index ne l'était pas, et rien ne le montrait : `git diff --cached --stat` disait le bon nombre de lignes.

**Règle** : quand on n'indexe qu'une partie d'un fichier, on relit le CONTENU indexé (`git diff --cached <fichier>`), jamais seulement son compte de lignes. Et une découpe par index de chaîne se borne à une ancre de FIN explicite, jamais au premier `}` rencontré.

## La garde chromatique — on GÈLE, on ne rabat pas

`app/lib/couleursEnDurInventaire.ts` porte l'état du 2026-08-23 ; `couleursEnDur.test.ts` refuse toute teinte **nouvelle** et exige qu'une teinte transposée soit **retirée** du registre. La dette devient donc visible dans chaque diff, et ne peut que décroître.

- ⛔ **Aucun script ne regénère l'inventaire, et c'est délibéré.** Une regénération automatique permettrait de re-geler la dette d'un geste, ce qui viderait la garde de son sens. On retire une ligne quand on a transposé la couleur, à la main, en le sachant.
- **Hors registre par NATURE** : un noir ou un blanc **translucide** (`rgba(0,0,0,0.4)`) est une ombre ou un calque — la forme que la charte prescrit, et elle rend la même chose sous les deux thèmes. Un noir ou un blanc **opaque** reste au registre : c'est une encre, et une encre se transpose.
- **La forme tokenisée n'entre jamais au registre** : `rgba(var(--cs-vert-rgb), 0.07)` commence par `var`, le motif ne retient que les fonctions dont le premier argument est un chiffre.
- **Les commentaires sont retirés avant la mesure** : un commentaire qui CITE une teinte n'en pose aucune, et la charte du dépôt en cite beaucoup.
- ⚠️ **Les CHAÎNES, elles, ne sont pas retirées**, et c'est un angle mort : une note de `inventaire.ts` qui NOMME une teinte en prose fait échouer la garde, alors qu'elle n'en pose aucune. Constaté le 2026-08-26. Écrire « à la luminance 33 » plutôt que la forme fonctionnelle, ou traiter le cas dans la garde — mais ne jamais inscrire au registre une teinte que rien ne pose.

## Une couleur posée sur une PHOTO s'écrit en littéral

⛔ Corollaire de « une marque en image ne se transpose pas ». `app/traductions/AllerPlusLoinClient.tsx` choisissait l'encre du titre selon la luminance mesurée de la photo, et écrivait `var(--cs-fond)` sur les photos sombres : le crème du site au Clair, mais **`#1c1813` en Cuir, du brun très sombre sur une photo sombre**. Le jeton s'est retourné avec le thème, la photo non. Le sol est une image, elle ne suit aucun thème : l'encre qu'on y pose n'a donc pas de jeton. Les deux lignes voisines (`couleurMeta`, `couleurChevron`) le faisaient déjà correctement en littéral — c'est la seule des trois qui prenait un jeton.

## Une suite de tests ne modifie JAMAIS l'arbre de travail

`app/lib/_gen.test.ts` n'était pas un test mais un générateur : il écrivait `latin-cesure.txt` **à la racine du dépôt** à chaque `npm test`. Exclu **nommément** dans `vitest.config.mts`.

⛔ **Ne pas l'exclure par un motif `**/_*.test.*`.** Le souligné en tête est bien la convention du dépôt pour ce qu'on écarte, mais dans `scripts/` il marque un module d'ATELIER, dont les tests sont de vrais tests : le motif général emportait `_liens-commun.test.mjs`, c'est-à-dire précisément l'invariant des liens bibliques que la charte demande de garder sous garde. Deux fichiers de test avaient disparu de la suite sans que rien ne le signale, le compte passant de 65 à 62. **Une exclusion se vérifie au COMPTE de fichiers, pas à la couleur du résultat.**

## Deux gardes voisines doivent s'accorder sur le même chantier

`titresPages.test.ts` exemptait `/quiz` (route neutralisée en production, chantier Holy Guessr non versionné) ; `echelleTypographique.test.ts` ne l'exemptait pas, et tenait donc **tout `npm test` en échec** sur un chantier qui n'est pas en ligne. Une suite durablement rouge cesse d'être un signal. Les trois gardes portent désormais la même exemption. La lever le jour où le quiz rejoindra le site, sa palette et son échelle avec.

## Une garde doit lire les DEUX formes d'écriture

⛔ `formes.test.ts` ne cherchait les rayons qu'à la forme JSX (`borderRadius: '4px'`, avec guillemets obligatoires) : tout ce qui s'écrit dans les **43 blocs `<style>`** du site lui échappait, c'est-à-dire la moitié du dessin. Sa sœur `echelleTypographique.test.ts` portait le doublet depuis l'origine (`TAILLE_EN_LIGNE` et `TAILLE_CSS`). Le motif CSS ajouté le 2026-08-23 a trouvé **trois échappées** que personne ne voyait :

- `.cc-note` du centre de contrôle, `0 6px 6px 0` — un encart, donc 8px ;
- `.ac-hover-choice` de l'accueil, `8px 10px 0 0` et `0 0 10px 10px` — deux coins hauts **inégaux dans la même déclaration**, sous une carte à 8px.

Les trois sont rabattues. Reste **une exception nommée** dans `RAYONS_DESSINES` : le `2px` du coin de cartonnage d'une couverture de publication, où le rayon appartient au dessin de l'objet comme sa gamme de couleurs. À trancher : le rabattre sur 4px, ou l'inscrire dans la charte comme valeur dessinée. ⚠️ Une exception qu'on VOIT vaut mieux qu'un angle mort qui n'en signale aucune.

## `npm run lint` ne rendait jamais la main, et la CI le CONTOURNAIT

`eslint.config.mjs` n'ignorait que `.next`, `out`, `build` et `next-env.d.ts`. `npm run lint` appelle `eslint` sans argument : il partait donc à l'assaut de l'arbre entier — `public/` (1,8 Gio de fac-similés), `work/`, `tmp/`, `audit/` (106 Mo), et les `node_modules` imbriqués sous `scripts/heptateuque/` et `outils/`. **Arrêté au bout de dix minutes sans une ligne de sortie.**

⚠️ **La CI ne voyait rien**, et c'est ce qui a fait durer le défaut : ces dossiers sont ignorés par git, donc absents d'un `checkout`, et `verification.yml` appelle de surcroît `npx eslint app` directement. Le contournement existait, la config est restée cassée — et c'est le **poste de travail**, là où l'on écrit le code, qui perdait son linter. Même remède que la suite de tests au point 4 : on borne. `npm run lint` répond maintenant en **69 secondes** : 364 erreurs, 171 avertissements.

⚠️ **Corollaire de méthode, et il vaut pour tout l'outillage** : la CI et le poste de travail ne voient pas le même arbre. La CI ignore les chantiers non versionnés et les dossiers d'atelier ; le poste les porte. Un outil vert en CI peut être inutilisable là où l'on travaille — les trois défauts ci-dessus (lint, garde typographique rouge, types cassés par `pixi.js`) sont tous de cette famille, et tous invisibles depuis GitHub.

## `pixi.js` n'est déclaré nulle part

Les 5 erreurs de `tsc --noEmit` viennent toutes d'`app/quiz/holyGuessrMoteur.ts` : la dépendance n'est ni dans `package.json`, ni installée. Sans conséquence en ligne aujourd'hui — les quatre fichiers Holy Guessr ne sont pas versionnés, donc absents de `master` — mais `npm run build` échoue en local, et il **échouera au déploiement** le jour où ces fichiers seront commités sans que `pixi.js` entre d'abord dans `package.json`. La vérification de `master` étant bloquante sur les types, la poussée serait refusée.

# Favoris — `ref_id` n’est PAS toujours un `id_oeuvre` (2026-08-21)

⚠️ `favoris.ref_id` est du **texte libre**, sans clé étrangère vers `oeuvres`. Une œuvre s’y range par son identifiant ; **le TEXTE ORIGINAL lu seul s’y range par `<id_oeuvre>#la`**. Toute lecture de la table doit passer par **`app/lib/refsFavoris.ts`** (`refFavoriOriginal`, `estRefOriginal`, `idOeuvreDeRef`, module pur testé, sans « use client » pour servir aussi le rendu serveur). Un `.in('id_oeuvre', refs)` posé sur les références brutes **laisse tomber en silence** tous les favoris de texte original.

- **Pourquoi un suffixe.** Dix œuvres portent leur latin ou leur grec dans la colonne `segments.texte_original` de la traduction : ce texte n’a **aucune ligne d’`oeuvres` à lui**, donc aucun identifiant à mettre en favori. Une édition en langue originale **autonome** (`langue_trad` vide, `langue_originale` renseignée — les *Confessions* en ont une, Tempsky 1896) garde au contraire son propre identifiant et n’emploie jamais le suffixe.
- **Trois surfaces à garder d’accord** : la ligne « Texte original latin » de la bibliothèque (`BibliothequeClient`), l’étoile du volet de lecture (`OeuvreClient`, qui range **ce qu’on lit** : le texte original si `modeTexte === 'la'` sur une traduction, l’œuvre sinon), et l’onglet Favoris, qui montre l’œuvre dès que **l’un des deux** est rangé.
- **Pas d’embed possible : deux requêtes, toujours.** `ref_id` n’ayant pas de clé étrangère, `favoris` ne peut pas embarquer `oeuvres`. On lit les références, puis les œuvres par `.in('id_oeuvre', …)` sur les identifiants RÉSOLUS. Quand la seconde requête embarque l’auteur, la qualifier : `auteurs!oeuvres_id_auteur_fkey(nom)` (voir le piège PGRST201, plus bas).
- ⚠️ **Un panneau qui se rend à `null` quand il n’a rien MASQUE l’échec de sa requête.** `app/compte/page.tsx` interrogeait `favoris_oeuvres`, une relation qui n’a jamais existé en base, et ne lisait pas `error` : la carte « Bibliothèque » du compte est restée vide depuis l’origine, et le point de progression « Mettre une œuvre en favori » ne se cochait jamais, alors que cinq favoris d’œuvre attendaient en base. Corrigé le 2026-08-21 (lecture de `favoris`, erreurs journalisées, œuvres dépubliées écartées comme sur le profil public). **Un panneau discret journalise son erreur** — sans quoi rien ne distingue « vide » de « cassé ».

# Compte requis pour interagir (commenter, signaler, prélever…)

Toute action d'ÉCRITURE de lecteur exige un compte PERSONNEL. Un visiteur sans compte personnel (compte de démonstration partagé, ou anonyme après l'ouverture) qui clique sur commenter, signaler, prélever, proposer un lien, apprécier ou mettre en favori voit une modale d'invitation à créer un compte, au lieu de l'action.

- **Repère du visiteur sans compte** : le compte de démo partagé est identifié par son adresse, exposée au navigateur via `NEXT_PUBLIC_EMAIL_INVITE` (miroir de `NEXT_PUBLIC_ADMIN_EMAIL` ; ce n'est pas un secret). ⚠️ **À renseigner AUSSI dans l'hébergeur (Vercel)**, sinon seul l'anonyme (aucune session) est tenu pour « sans compte ». Valeur bêta : `corpus-scriptura-invite@protonmail.com`.
- **Mécanisme central** : `app/lib/contexteCompte.tsx` (`ProvisionCompte` monté dans `app/layout.tsx`, hook `useCompte()`). `aUnCompte` = session ET adresse ≠ EMAIL_INVITE. `exigerCompte(contexte?)` renvoie `true` si compte personnel (l'action suit), sinon ouvre la modale partagée et renvoie `false`. Poser `if (!exigerCompte('…')) return` EN TÊTE de chaque écriture ; l'argument amorce la phrase (« Pour commenter ce passage… »).
- **Surfaces** : modale `app/components/ModaleCompteRequis.tsx` (portail, palette du site, boutons « Créer un compte » / « J'ai déjà un compte ») ; encart inline `app/components/InvitationCompteInline.tsx` qui remplace les composeurs de commentaire quand `!aUnCompte`.
- **Destination « Créer un compte »** : constante `ROUTE_INSCRIPTION` dans `ModaleCompteRequis.tsx`, aujourd'hui `/chantier` (connexion + liste d'attente). ⚠️ **La repointer vers `/inscription`** le jour où la page d'inscription libre existe (un seul endroit à changer).
- **Points gardés** : prélèvements (BoutonsSegment, BoutonsVerset, ActionsVerset, TexteBible, PanneauPatristique) ; signalements (tous les ouvreurs de `ModalSignalement` : segment, verset, Bible, patristique, polyglotte, bibliothèque, essai, œuvre, commentaires) ; commentaires (composeurs + votes + signalement de commentaire dans OngletCommentaires œuvre & patristique, EssaiCommentaires) ; ProposerLienBiblique ; appréciation d'essai ; favoris (`useFavoris.ts`, garde centrale). Les LECTURES (SelecteurCitation, profils, catalogue) ne sont pas gardées.
- **Admin & inscrits** : `aUnCompte=true` → comportement inchangé, aucune régression. Le garde est purement côté client (confort) ; la sécurité réelle des écritures reste la RLS + les gardes serveur.

# Citations (copier / coller et affichage des prélèvements)

Règles de mise en forme arrêtées par l'auteur, centralisées dans `app/lib/citation.ts` (testé : `citation.test.ts`). Ne plus dupliquer ni réimplémenter ailleurs.

- **Titre de l'œuvre en italiques** : le presse-papiers reçoit DEUX formes via `copierCitation()` : `text/html` (titre en `<em>`) pour un collage riche dans un traitement de texte, et `text/plain` en repli. Le collage garde l'italique dans Word / Docs / courriel.
- **Ponctuation finale** (avant le guillemet fermant) : `normaliserPonctuationFinale` remplace toute ponctuation finale par un point, SAUF `?` et `!` (conservés) ; ajoute un point s'il n'y en a pas ; conserve une parenthèse/un crochet fermant ET ajoute un point après.
- **Dates** : `resserrerTiretsAnnees` écrit les fourchettes « 1984-1986 » (jamais « 1984 – 1986 » ; `formaterDateHistorique` produit le tiret demi-cadratin espacé, qu'on resserre). Appliqué à la seule partie date.
- **Guillemets internes** : `convertirGuillemetsInternes` remplace les « … » français internes par des guillemets anglais “ … ” (la citation est déjà encadrée par « … »).
- **Majuscule initiale** : `capitaliserInitiale` met une capitale au premier mot si l'initiale est minuscule (citation extraite en cours de phrase). Saute les marques de tête (guillemets, parenthèses, balises `<i>`…) ; ne touche ni une initiale déjà capitale ni un début non alphabétique. Intégré à `preparerTexteCitation`, donc appliqué au copier/coller ET à l'affichage des prélèvements.
- **API** : `citationPatristique(texte, info)` → `{ texte, html }` (auteur, *titre*, trad., éditeur, collection, ville, année, « disponible sur le site Corpus Scriptura » : « … ») ; `citationBiblique(texte, ref)` → `« … » (ref)` ; `preparerTexteCitation(texte)` pour l'affichage seul (guillemets + ponctuation finale) ; `copierCitation(res)` pour le presse-papiers riche.
- **Unifications faites** : l'ordre est désormais **trad. avant éditeur**, la mention finale est « disponible sur le site Corpus Scriptura » partout, et les copies de `BoutonsSegment`, `BoutonsVerset`, `TexteBible`, `PanneauPatristique` et `app/prelevements/page.tsx` passent toutes par le module (5 copies de `convertirGuillemetsInternes` et 3 de `construireCitationPatristique` supprimées). L'affichage de `prelevements` applique `preparerTexteCitation` au passage montré (le titre y était déjà en italique).
- **Non touchés (volontaire)** : `ActionsVerset` (copie du texte brut d'un verset, sans encadrement) et `SelecteurCitation` (insertion d'une citation DANS un commentaire, autre flux).

## La citation favorite — une marque unique, le QUADRILOBE (2026-08-22)

⛔ **Le Sacré-Cœur est retiré**, décision de l'auteur. Il vivait en deux exemplaires qui ne se ressemblaient même pas : la vignette `public/icons/sacre-coeur.png` en tête de « Mes citations », et un dessin SVG à quatre pièces (croix, flamme, couronne d'épines, cœur) dans la gouttière d'actions. À 13 px les quatre pièces se confondaient en une tache, à 26 px la vignette matricielle se crénelait. Deux dessins pour un seul office, aucun des deux lisible. Le fichier est supprimé du dépôt, il n'était employé nulle part ailleurs.

Tout vit désormais dans **`app/components/CitationPreferee.tsx`** : le type `CitationPreferee`, la marque, le bouton et la fenêtre de remplacement. ⛔ Ne plus dessiner de marque de citation favorite ailleurs, et ne plus importer le type depuis `app/prelevements/page.tsx` (une page n'est pas un module de types ; le réexport n'y subsiste que par compatibilité).

- **La marque est un QUADRILOBE**, la rosace à quatre lobes du remplage gothique, en un seul tracé de quatre arcs (lobes de rayon 3,2 centrés à 3 du centre, dans une boîte de 16 : les points de rencontre tombent d'eux-mêmes aux quatre coins d'un carré, 4,81 et 11,19 — aucune courbe de Bézier à régler). Elle est **symétrique**, donc nette à 15 px comme à 30, et elle appartient à la grammaire ornementale du site plutôt qu'à un jeu de pictogrammes.
- ⛔ **Elle ne se confond avec aucune autre marque, et c'est le critère qui l'a choisie.** L'étoile dit « favori » partout ailleurs (`EtoileFavori` : œuvres et versets), le cœur disait « aimé ». Le quadrilobe dit « choisi ». Une même marque pour deux gestes distincts promet au lecteur une action qu'elle ne fait pas — c'est pourquoi l'étoile qui coiffait la citation favorite du **profil public** a cédé la place à la même marque qu'à « Mes citations ».
- **Un seul tracé sert les deux emplois** : l'emblème du filet en tête de page ET le bouton de choix dans la liste. La marque du titre EST le bouton qu'on ira chercher — c'est ce qui enseigne le geste sans une ligne de mode d'emploi. `plein` distingue les deux états : le lobe se remplit et la perle se creuse.
- ⚠️ **La couleur vient de `currentColor`**, jamais d'un attribut `fill=` tokenisé (charte, § Palette) : c'est le parent qui porte `color`. L'or de la marque (`--cs-or-doux` au repos, `--cs-or` au survol et à l'état choisi) ne prend jamais le vert des actions voisines : elle ne fait pas la même chose qu'elles.

**« Voulez-vous remplacer votre citation favorite ? »** — le geste a trois cas, et un seul pose une question. Reprendre la citation déjà portée la retire, sans rien demander. En désigner une **première** l'inscrit, sans rien demander. En désigner une autre alors qu'une place est occupée ouvre `ModaleRemplacerCitation`, qui met les **deux** citations en regard, l'actuelle et la nouvelle, avant de trancher. La raison n'est pas la prudence en général : on n'en porte qu'une à la fois et **elle paraît sur le profil public**, si bien qu'un clic de trop défaisait un choix que personne n'avait demandé de défaire. Gabarit imposé par la charte (§ Fenêtres contextuelles) : calque à partir de `HAUTEUR_NAVBAR`, qui ne défile pas, boîte à `maxHeight: 100%` qui défile en dedans.

⛔ **Cette fenêtre se compose EN LARGEUR, jamais en hauteur** (repris le 2026-08-22, elle ne s'ouvrait pas entière). Deux citations empilées sous un médaillon, un titre et un paragraphe de deux lignes faisaient une colonne de **près de 500 px** : la navbar déduite, la boîte se coupait sur un écran ordinaire et les boutons partaient sous le pli, c'est-à-dire précisément ce qu'on demande de lire avant de trancher. Trois corrections, et la mise en regard y gagne : les deux citations passent **côte à côte** (grille à deux colonnes, une seule sous **640px**, le seuil de la charte), le médaillon vient **sur la ligne du titre** au lieu de le surmonter, et le paragraphe tient en **une** phrase. La boîte s'élargit de 26 à **34rem** et tombe à **263 px**, mesurés — entière sous une fenêtre de 600 px de haut, qui n'en laisse que 353. ⚠️ La grille demande une règle CSS, qu'un style en ligne ne sait pas porter : d'où le bloc `<style>` embarqué dans la boîte.

**Ce que la page a repris au passage** (`app/prelevements/page.tsx`) :

- ⚠️ **Le menu de traduction listait TOUTES les traductions**, et construisait son `select` de `versets_lecture` sur leurs `trad_id` bruts — exactement le piège consigné plus bas. Choisir TR0009, dont le texte est recomposé ailleurs, faisait échouer la requête entière : le texte de chaque verset prélevé retombait **en silence** sur celui d'origine. Il passe par `codesTraductionsLecture`, et la traduction par défaut est retenue seulement si elle est lisible.
- **La gouttière d'actions ne paraissait qu'au survol** : hors d'atteinte au doigt, invisible au clavier. Elle vient désormais aussi au `:focus-within`, et reste posée en permanence sur un écran tactile (`useSansSurvol`, la capacité du pointeur et non la largeur de l'écran).
- **L'or de l'encadrement doré passe par le token** (`colorMix('var(--cs-or)', …)` au lieu de `rgba(154,122,56,…)`, qui EST `--cs-or` écrit en dur) : la teinte suit désormais le thème comme le reste de la page.

# Traductions lisibles vs colonnes de `versets_lecture` (piège d'apparat vide)

⚠️ `traductions` peut déclarer une traduction NON encore matérialisée dans la vue `versets_lecture` (transcription/alignement en cours). La nommer dans un `select('…, "TR0009"')` fait échouer TOUTE la requête PostgREST (« column versets_lecture.TR0009 does not exist » → 400, `data` nul).

**Symptôme observé (2026-08-06)** : `TR0009` (« Bible française du XIIIᵉ siècle », transcription à 8 %) était dans `traductions` mais absente des colonnes de `versets_lecture` (qui n'a que TR0001-TR0005). L'apparat biblique de TOUTES les œuvres (page œuvre + péricope) tombait en repli : chaque renvoi affichait son identifiant canonique brut (« JOB.1.7 ») sans texte, au lieu de « Jb 1, 7 ». La page Bible était épargnée car elle lit `versets_lecture.select('*')` (ne nomme aucune colonne).

**Règle** : ne jamais construire un `select` de `versets_lecture` à partir des `trad_id` bruts de `traductions`. Passer par `codesTraductionsLecture(client)` (`app/lib/traductions.ts`), qui **sonde une ligne de la vue** (`select('*').limit(1)`) et n'garde que les codes réellement présents comme colonnes. Auto-correcteur : dès qu'une traduction est matérialisée, elle est reprise ; tant qu'elle ne l'est pas, elle est écartée. Utilisé par `app/oeuvre/[id]/page.tsx` (SSR) et `OeuvreClient.tsx` (client).

**Reste à surveiller** : `SelecteurCitation` liste encore TOUTES les traductions ; y choisir une traduction non matérialisée échoue (sélecteur à colonne unique). Le menu de la page Bible, lui, filtre depuis le catalogue des capacités — voir le piège ci-dessous.

## ⛔ Une SOURCE indisponible ne retire pas la lecture CANONIQUE (2026-08-22)

`readingCapabilitiesByTranslation` (`bibleMultimode.ts`) sème d'abord les capacités canoniques — les colonnes réellement observées dans `versets_lecture` —, puis parcourt les lignes de `v_bible_reading_capabilities`. Chaque ligne REMPLAÇAIT la capacité du même mode, disponible ou non.

Or la vue déclare `verse · is_available = false` pour la source numérisée de Sacy, Segond, Crampon, de la Vulgate clémentine et de la Septante : elle dit qu'aucune SEGMENTATION ÉDITORIALE ne sert ces éditions, ce qui est vrai et n'a rien à voir avec leur colonne canonique. La ligne écrasait pourtant le repli, `selectableReadingModes` rendait une liste vide, et le filtre d'`app/page.tsx` **retirait les CINQ éditions historiques du menu de la page Bible**. Il n'y restait que la Bible 899, la Fillion et sa Vulgate. Pire, `BibleLayout` ne retrouvant pas la traduction lue dans la liste retombait sur l'index 0 : demander Sacy par l'URL affichait « Bible française du XIIIᵉ siècle » au-dessus d'un chapitre vide.

**Règle** : la vue décrit ce que chaque SOURCE propose, le repli canonique ce que la COLONNE propose. Ce sont deux faits distincts, et une absence n'efface jamais une présence. Une ligne indisponible ne peut donc que remplir un mode que rien d'autre ne déclare disponible — vaut aussi entre deux sources d'une même traduction, celle qui offre le mode l'emportant quel que soit l'ordre d'affichage.

⚠️ **Second garde-fou, dans `app/page.tsx`** : le menu ne liste que des bibles lisibles, **mais il liste toujours celle qu'on lit** (`estLisible(code) || code === trad`). Un catalogue en retard sur les données ne doit jamais faire mentir l'intitulé du menu.

# TR0009 « Bible française du XIIIᵉ siècle » (Bible 899) — lecture par versets recomposés

TR0009 est une traduction à **segmentation éditoriale** : son texte n'est PAS dans `versets_lecture` ni `versets_v2` (garde-fou : ne jamais l'y copier). Le texte des versets canoniques est **recomposé en direct** des tables éditoriales Bible 899 et aligné sur `canon_id`. Ainsi, toute nouvelle passe d'alignement importée par Codex apparaît **automatiquement**, sans copie ni intervention.

- **Vue `v_bible899_verse_recomposed`** (`sql/20260807_bible899_verse_recomposed.sql`) : recompose depuis `bible_editorial_segments` + `bible_editorial_segment_sources` + `bible_source_unit_texts` (offsets Unicode + `join_before`), en colonnes `texte_diplomatic` / `texte_expanded`, avec `canon_id` et les statuts. ⛔ **SECURITY DEFINER voulu, réservé à `authenticated`** : les RLS des tables de base filtrent `is_public`/`validated`/`verified`, or les segmentations « verse » de TR0009 sont NON PUBLIQUES (site privé → on doit les montrer). **Ne jamais la repasser en `security_invoker`** (elle se viderait) ni l'ouvrir à `anon` (l'anonyme reste bloqué par le proxy).
  - ⚡ **Piège de perf corrigé (2026-08-08) — CTE référencé deux fois.** La 1re version recomposait le texte dans un CTE `seg_text` référencé DEUX fois (une par couche) : un CTE utilisé plusieurs fois est **matérialisé** par Postgres, donc `string_agg` recomposait **tout le corpus** (~37 000 lignes, tri externe sur disque) à chaque requête, avant même le filtre livre/chapitre. Résultat : ~1,2 s pour un seul chapitre, et **timeout 8 s** (`statement_timeout` d'`authenticated`) sur un livre entier — d'où l'erreur « canceling statement due to statement timeout » de la Polyglotte en mode « livre entier » (Psaumes). **Corrigé** (migration `bible899_verse_recomposed_lateral_perf`) en remplaçant le CTE par une sous-requête **`LATERAL` corrélée sur `segment_id`**, les deux couches séparées par `FILTER (WHERE layer_code = …)` : le texte n'est recomposé que pour les segments filtrés (Gn 1 : 1226 → 12 ms ; Psaumes entiers : timeout → 113 ms). Sortie **identique**, vérifiée ligne à ligne sur les 18 919 alignements. ⛔ Ne pas revenir à un CTE référencé plusieurs fois pour les deux couches.
- **Les fac-similés ne sont PLUS dans le dépôt** (2026-08-19). Les 1 488 images pèsent 1,89 Go : Vercel les redéployait à chaque build, et 1 264 d’entre elles n’avaient jamais été versées, si bien qu’**en ligne, tout folio à partir du 57 renvoyait 404** — le fac-similé était amputé de 85 % sans que rien ne le signale. Elles vivent dans le seau Supabase **`manuscrits`**, sous `bible-899/<fichier>.png`, versées **telles quelles** : aucun octet n’a changé, les 1 484 empreintes du manifeste restent donc valables.
  - **Le dossier `public/manuscrits/bible-899` reste le MIROIR DE TRAVAIL local**, ignoré par git (`.gitignore`), là où tournent les scripts d’atelier. Ne pas le reverser dans le dépôt.
  - **Le manifeste garde des chemins RELATIFS** : un document scellé ne doit pas dépendre de l’hôte qui le sert. La base publique est appliquée au seul rendu, par `BASE_PUBLIQUE_FACSIMILES` (`_lib/manifest.ts`), surchargeable par `NEXT_PUBLIC_BIBLE899_IMAGES`. C’est pourquoi le `publicUrl` du manifeste ne l’emporte plus sur cette base dans `resolveFacsimiles`.
  - **Le contrôle des scellés s’est scindé.** À chaque chargement, `loadBible899Edition` vérifie toujours l’empreinte du TEI, les comptages, la concordance des références, et les empreintes des images **présentes localement** — leur absence n’est plus une erreur, puisqu’elles n’ont plus à être dans le dépôt. Le contrôle INTÉGRAL des 1 488 images contre le seau est `npm run bible899:verifier` (≈ 3 min, 1,89 Go), lancé à la demande, chaque dimanche par `.github/workflows/verification-facsimiles.yml`, et d’un clic depuis le centre de contrôle (carte « Fac-similé Bible 899 », qui contrôle présence et taille sur la totalité puis recalcule une vingtaine d’empreintes tirées au sort).
  - ⚠️ **Ne pas convertir les maîtres.** Ce sont des pièces d’archive, et les empreintes du manifeste existent pour attester qu’ils n’ont pas bougé : les réencoder romprait 1 484 scellés d’un coup, et le manifeste régénéré n’attesterait plus que « voici les fichiers que j’ai aujourd’hui ». Le plan Pro comprend 100 Go de stockage, la place n’est pas le sujet.
- **Lib partagée `app/lib/bible899.ts`** (client + serveur, testée `bible899.test.ts`) : `chargerVersets899(client, {livre, chapitre?}, couches?)`, `livresDisponibles899`, `couchesDisponibles899` (sonde les colonnes de la vue → couches réellement présentes, **piloté par les données**, jamais une constante frontend), `coucheDefaut899`/`normaliserCouche899` (repli propre sur `expanded` si couche indisponible), `adapterVersets899` (adapte au contrat ordinaire ; n'expose **aucun** statut technique), prédicats `rendu899` / `aRevoir899` (`aRevoir899` réservé désormais à la Polyglotte). Couche : `diplomatic` / `expanded` / **`modernized`** — cette dernière n'existe que si la vue expose une colonne `texte_modernized` ; défaut = `modernized` si disponible, sinon `expanded`. La capacité de mode `verse` (source `editorial-segments`) est **imposée SEULE** au catalogue pour les traductions éditoriales par `withEditorialVerseCapability` (`bibleMultimode.ts`) : plus aucun mode source sur la page Bible. Chemin **privé**, distinct des vues publiques `v_bible_reading_capabilities` / `v_bible_canonical_lookup`.
- **Règles d'affichage des statuts** : `CANONICAL_GAP` = lacune du témoin ; `MANUSCRIPT_EXTRA` (`canon_id` NULL, incipit/explicit/argument) = **jamais** transformé en faux verset (écarté par l'adaptateur).
  - **Mise en forme des lacunes (page Bible, 2026-08-12)** : plus de crochets `[…]`. Un **verset isolé** absent (chapitre par ailleurs porté) se rend « *Lacune du manuscrit* » en **serif italique** effacé (`--cs-texte-doux`), capitale initiale, avec infobulle « Lacune matérielle du manuscrit » (`TexteBible.tsx`). Un **chapitre entièrement lacunaire** (ex. 1 Samuel 1, 28 versets tous `CANONICAL_GAP`) n'aligne PLUS autant de mentions : `chapitreToutLacune` (`versets.every(v => _est899 && _estLacune)`) déclenche **une** mention centrée — filet interrompu `◦◦◦`, « *Lacune du manuscrit* », puis la précision « Ce chapitre — {livre} {n} — n'est pas conservé dans ce témoin ». Distinct de l'état « livre absent » (ruines fumantes). Les **lectures incertaines** (`[lecture incertaine : …]`) sont en **gris** (`--cs-texte-second`) **sans soulignement pointillé** (retiré) : la teinte seule signale, l'infobulle porte le sens savant. Marqueur inline `[Lacune]` capitalisé. ⚠️ **Page Bible (public) : AUCUN statut technique montré** — `MATCH`/`OFFSET`/`MERGED`/`SPLIT`/`review`/`verified`/`confidence` restent internes (base + admin) ; le marqueur « · à revoir » (`verification_status='review'`) a été **retiré** de la page Bible. Seuls les faits du témoin subsistent : lacune du manuscrit, et les marqueurs éditoriaux **inline** du texte (`[lecture incertaine : …]`, `[ajout marginal : …]`, `[lacune : …]`) rendus discrètement par `app/lib/marqueurs899.tsx` (`rendreMarqueurs899`). ⚠️ Ces marqueurs peuvent être **à cheval sur plusieurs versets** (la recomposition par créneau canonique ouvre le marqueur dans un verset et le ferme dans le suivant) : `rendreMarqueurs899` est un **tokeniseur** tolérant aux marqueurs non fermés / non ouverts, pour ne jamais laisser de crochet brut à l'écran. La **Polyglotte** conserve son propre affichage (`aRevoir899`).
- **Bible classique** (`app/page.tsx` → `BibleLayout`/`TexteBible`) : TR0009 se lit **comme une traduction ordinaire** (même sélecteur, même composant de verset, même notice). `page.tsx` charge via la lib puis **adapte** les lignes avec `adapterVersets899`, et calcule les couches lisibles via `couchesDisponibles899`. **Aucun sélecteur de mode** (TR0009 = `verse` seul). **Le choix de graphie a quitté le corps du texte** pour le menu « Lecture » du volet de gauche (voir la section suivante) ; il ne paraît qu'à partir de DEUX couches exposées par les données. `?couche=modernized` demandé sans la couche → repli `expanded`, sans erreur.
  - ⚠️ **`diplomatic` n'est plus écartée de la page Bible** (décision de l'auteur, 2026-08-22). La règle antérieure la réservait aux surfaces d'étude ; elle prend désormais sa place parmi les graphies, à égalité avec les autres. Le lecteur qui la demande sait ce qu'il demande, et le menu la nomme « Diplomatique ». ⛔ Ne pas la refiltrer dans `app/page.tsx` sans une nouvelle décision. Actions d'écriture masquées (id synthétique `899:canon_id`) ; lecture non comptée. Gardes conservées : `tradExplicite` (l'URL `?trad=` fait foi) et interdiction d'échange **en mémoire** vers/depuis une traduction éditoriale (`handleSetTraductionIndex` recharge le serveur). `BibleLayout` lit les livres via `livresDisponibles899`.
- **Polyglotte** (`app/polyglotte/page.tsx`) : **inchangée** — TR0009 est une **colonne synthétique** hors `versets_v2`, recomposée en `V2Row` clé `canon_id`, avec son propre choix de couche « BIBLE 899 · TEXTE » (Développée/Diplomatique) et son propre marqueur `aRevoir899`.
- **Garde-fous** : ne pas écrire dans `versets_canon` / TR0001–TR0005 ; ne pas copier TR0009 dans `versets_v2` ; ne **fabriquer** aucune graphie modernisée **côté frontend** — la couche `modernized` n'existe que si les DONNÉES l'exposent (colonne `texte_modernized` de la vue). Le jour où Codex l'ajoutera (couche validée), le contrôle « Graphie » apparaîtra **automatiquement** et Modernisée deviendra le défaut, sans changement frontend. Réutiliser les composants existants (pas de duplication de la grille ni du lecteur).

# Bible classique — le menu central choisit la BIBLE, le volet gauche la MANIÈRE (2026-08-22)

Deux gestes, deux endroits, et ils ne se mélangent jamais.

- **Le menu déroulant CENTRAL ne liste que des bibles**, et il les liste TOUTES. C'est `SelecteurTraductionBible` (`app/components/SelecteurTraductionBible.tsx`), le même composant dans toutes les vues de la page. ⛔ **Ne jamais y remettre une façon de lire.** « Latin-français » y figurait, détaché par un filet : le lecteur qui le choisissait croyait changer de bible. Et la lecture en regard n'avait PAS de menu du tout, si bien qu'on ne pouvait pas quitter la Fillion sans d'abord quitter les deux colonnes.
- **Les manières de lire vivent dans le volet de gauche**, entre la fiche de la traduction et la recherche des livres (`NavLivres`, props `modesLecture` / `onChoisirModeLecture`). Menu **occasionnel** : il ne paraît que lorsqu'un choix se pose vraiment, et sa forme est celle des menus de la page Œuvre (`app/lib/stylesVoletLecture.ts`, `LABEL_VOLET` / `BTN_VOLET`).

**La composition du menu est un module PUR** : `app/lib/bibleModesAlternatifs.ts` (`modesLectureAlternatifs`, testé). ⛔ Rien n'y est déduit d'un identifiant de traduction : il ne reçoit que des FAITS lus dans les données.

| Groupe | Choix | Le fait qui l'ouvre |
|---|---|---|
| **Lecture** | Français · Latin-français · Latin | la famille éditoriale porte au moins deux membres (`membresFamille`) |
| **Commentaires** | Avec les commentaires · Sans les commentaires | l'édition appartient à une famille (`paratexteDisponible`) |
| **Graphie** | Modernisée · Développées · Diplomatique | les couches réellement exposées par `v_bible899_verse_recomposed` |

⛔ **Un CHEVRON n'entre pas dans le centrage du libellé qu'il accompagne** (2026-08-28). Le menu central des bibles se centre sur l'axe du bloc de texte, comme le titre « Genèse ❧ Chapitre 1 » qui le surmonte ; mais son bouton se centrait CHEVRON COMPRIS, si bien que le nom de la bible tombait onze pixels à gauche de l'axe du titre. Deux lignes centrées qui ne partagent pas leur axe se voient tout de suite, et c'est ce que l'auteur a relevé. Le chevron est donc DOUBLÉ, le double de gauche invisible — le procédé de `.cs-onglet-libelle::after`, qui réserve d'avance la largeur d'un libellé en graisse 600. ⚠️ Vaut pour tout libellé centré flanqué d'une marque : une flèche, une croix, un compteur.

⚠️ **Le chevron prend l'encre du NOM, pâlie d'un rang** (`--cs-texte-doux` contre `--cs-texte-gris`), et non plus `--cs-vert-clair` : c'est une marque d'ouverture, pas un accent, et le vert y appelait l'œil avant le nom. Sa taille est en **`em`**, relative au nom : le glyphe ▼ remplit presque tout son cadratin et pèse donc bien plus qu'une lettre de même corps. ⚠️ `0.5625em` du nom vaut 6,5 px — l'échelle typographique n'a pas de rang sous 7 px, et c'est la raison de l'unité relative, que la garde exempte. Enfin `lineHeight: 1` et aucun décalage : le bouton aligne ses enfants sur leur milieu, et le `top: 1.5px` d'avant faisait descendre le chevron sous la ligne du nom.

⚠️ **Le titre et le menu restent centrés sur le BLOC DE TEXTE**, donc dix-neuf pixels à gauche du centre de la bande d'en-tête : c'est l'axe des versets, la colonne d'actions de 2,375 rem étant exclue du centrage. ⛔ Ne pas « corriger » ce décalage sans décision : il aligne le titre sur ce qu'on lit. ⚠️ La page Œuvre a fait le chemin inverse le 2026-08-25, mais parce que sa cellule d'actions avait cessé d'occuper une colonne ; celle de la Bible y est toujours.

⛔ **Les axes sont INDÉPENDANTS, jamais fondus en une liste exclusive** (décision de l'auteur, 2026-08-22). « Sans les commentaires » s'applique à ce qu'on lit, quel que soit ce qu'on lit : le latin seul, le français seul ou les deux en regard. Une liste unique obligerait à énumérer les combinaisons — six entrées pour deux choix — et le lecteur devrait la relire tout entière pour changer un seul réglage. Un choix est donc une **surcharge** (`CibleLectureAlternative`) appliquée à la lecture courante, non une adresse complète : ce qu'il ne nomme pas est repris tel quel. Deux exceptions explicites, et elles sont voulues — choisir un membre pose `bilingue: false` (on quitte les deux colonnes), et les entrées de commentaires ne nomment jamais le texte lu.

⚠️ **Le menu « Lecture » nomme les LANGUES, pas les traductions**, et il les tire de `v_bible_edition_catalog` (`language_code`, `member_role`). L'entrée en regard s'appelle « Latin-français » parce que la langue d'ORIGINE ouvre et que la traduction suit — l'ordre vient du rôle des membres, non de celui des colonnes (le français est à gauche chez Fillion). Une future édition grecque se nommera « Grec-français » sans qu'on y touche.

⚠️ **Il double en partie le menu central**, et c'est assumé : TR0010 et TR0011 y figurent aussi comme deux bibles. Le menu central les donne comme deux témoins ; le menu de gauche les donne comme les deux faces d'une même édition, et l'y atteindre garde le réglage des commentaires. La différence de comportement est voulue : passer par le menu CENTRAL repart d'une lecture neuve, passer par le volet conserve la manière.

⛔ **UNE OPTION PAR LIGNE, et toutes les options montrées** (décision de l'auteur, 2026-08-28 : « je veux qu'on distingue en un coup d'œil toutes les options ; je préfère que chaque option constitue une ligne »). L'axe se rend en liste verticale, l'option retenue sur la PASTILLE verte de la liste des livres (`OPTION_VOLET`, `RUBRIQUE_AXE` dans `stylesVoletLecture.ts`, règles de survol `.cs-option-volet` dans `globals.css`). ⚠️ La pastille déborde son bloc de 7 px de chaque côté, comme une rangée de livre déborde le sien : sans cela elle paraîtrait rentrée par rapport à la liste qui la suit.

⛔ **Deux formes ont précédé, et toutes deux CACHAIENT quelque chose.** Les CASES pleine largeur (jusqu'au 2026-08-27) pesaient 181 px en tête du volet. Le FIL — les états d'un axe posés en ligne, l'actif souligné de vert — imitait la barre d'onglets qu'il surmontait : le volet portait alors deux rangs de mots soulignés l'un sur l'autre, et l'auteur l'a relevé d'un mot, « pas gracieux ». Et la LIGNE D'ACTION d'un axe binaire (« Masquer les commentaires ») ne disait que le geste : l'état ne s'y lisait qu'à l'envers, et l'axe n'avait pas l'air d'un choix. `bascule` et `labelAction`, qui la servaient, sont retirés de `bibleModesAlternatifs.ts` avec elle.

⚠️ **La pastille n'introduit AUCUN marqueur de plus** : c'est déjà celui qui, à quelques pixels de là, dit quel livre on lit. Trois autres ont été mis en regard le même jour, à la largeur réelle du volet — filet vert à gauche, puce pleine, cases encadrées — et l'auteur a retenu celui-ci. Planche : `tmp/planche-options-volet.tsx`, et `tmp/planche-volet-retenu.tsx` pour le seul parti retenu, rendu avec les objets de style réels.

⚠️ **Les rubriques d'axe sont en casse ORDINAIRE** (« Lecture », « Commentaires »), dans la suite des capitales refusées sur la barre d'onglets. `LABEL_VOLET`, qui les porte encore en capitales, ne sert plus que la page Œuvre : **unifier les deux est une décision qui n'a pas été prise.**

⛔ **LE VOLET EST UN CONTENEUR : ce qu'il porte se règle sur SA largeur** (2026-08-28). Il se traîne de 120 à 400 px à la poignée, et sa largeur au repos suit l'écran — `clamp(200px, 14vw, 320px)`, soit 200 px sur un portable de 1280 et 320 sur un écran de 2286. Le volet porte donc `container-type: inline-size` et `container-name: volet` (branche DESKTOP seulement), et les règles sont des `@container volet` dans `globals.css`. ⚠️ **Une média-query ne pouvait pas servir**, et pas seulement parce qu'elle ignore la poignée : sous 900 px le volet devient un tiroir et la carte n'est plus rendue du tout, si bien qu'un seuil du tableau des média-queries (700, 640…) ne se déclencherait JAMAIS ici. C'est un AXE différent, et le tableau des seuils ne le gouverne pas.

⛔ **La RÉFÉRENCE D'ÉDITION s'efface sous 260 px de volet.** Relevé par l'auteur sur la Vulgate de Fillion : « Texte latin en regard dans Louis-Claude Fillion, La Sainte Bible (texte latin… ». Ces références comptent de 163 à 348 signes, et deux lignes ne les portent jamais en entier ; le seuil ne dit donc pas où elles TIENNENT, mais où elles cessent de dire quelque chose. Mesuré sur la plus longue (Fillion, 348 signes) : **76 signes à 200 px**, soit le titre coupé en son milieu, **100 à 240**, **115 à 280**. Sous 260, la phrase s'arrête avant d'avoir nommé l'ouvrage, et un moignon de titre vaut moins que rien. La fiche « En savoir plus » la donne entière, à toute largeur. Planche de mesure : `tmp/planche-volet-largeurs.tsx`, qui rend la VRAIE carte à sept largeurs.

⚠️ **Le libellé du lien se raccourcit sous 200 px** (« En savoir plus »), les deux formes étant écrites dans le balisage. ⛔ Un libellé ne se coupe pas en JavaScript : il faudrait mesurer à chaque rendu.

⛔ **Le repli d'une forme se pose AVANT sa requête de conteneur.** `@container` n'ajoute aucune spécificité : `.cs-volet-lien-court { display: none }` écrit APRÈS le bloc l'emportait sur lui, les deux formes du lien étaient masquées, et le lien disparaissait tout à fait. Vu et corrigé sur la planche, invisible aux types comme aux tests.

⚠️ **La carte a perdu son `minHeight` de 6,75 rem**, qui existait pour ne jamais faire bouger la mise en page : il laissait un blanc de deux lignes dès que la référence s'efface. Rien ne bouge pour autant, la référence ne paraissant ou ne disparaissant qu'au geste délibéré de redimensionner le volet.

⚠️ `container-type: inline-size` n'emporte PAS la containment de peinture : la poignée de redimensionnement, posée à `right: -4px`, déborde toujours du volet. Elle devient en revanche le bloc conteneur de ses descendants absolus, ce qu'elle était déjà par son `position: relative`.

⚠️ **Un groupe à un seul choix ne paraît pas.** C'est ce qui rend le menu occasionnel plutôt que permanent : tant que la couche modernisée n'existe pas et que `diplomatic` est seule en face d'`expanded`, la Bible 899 montre deux graphies ; une bible ordinaire ne montre aucun menu. Le jour où Codex publie `texte_modernized`, le choix paraît de lui-même, **sans qu'une ligne change ici**.

⚠️ **`paratexteDisponible` se juge sur la FAMILLE, jamais sur le chapitre affiché.** Un chapitre de Fillion sans commentaire ferait sinon disparaître le menu, et le lecteur passé en « texte seul » n'aurait plus aucun moyen d'en sortir.

- **Mode « Sans les commentaires »** (`?texte=seul`) : l'appareil éditorial n'est pas masqué à l'affichage, il **n'est pas chargé** — `app/page.tsx` saute `loadBibleEditionChapter`, passe `editionChapter` à `null` en une colonne, et sert un `payload` à trois listes vides en regard. Introductions, commentaires de plage, notes et illustrations disparaissent ensemble, puisqu'ils viennent tous de là.
- **La manière de lire voyage d'un bloc** : `ManiereDeLireBible` (`bibleNavigation.ts`) réunit graphie, lecture en regard et texte nu. `BibleLayout` la compose une fois et la passe à `NavLivres` et `TexteBible`, qui la reportent par `{ ...maniereDeLire }`. ⛔ Ne pas revenir à un report réglage par réglage : c'est ainsi qu'ils se perdaient un à un — les flèches de chapitre de `TexteBible` oubliaient déjà la graphie de la Bible 899.

✅ **Réuni le 2026-08-23.** `OeuvreClient.tsx` a porté une copie de `LABEL_VOLET`/`BTN_VOLET` du 2026-08-22 au 2026-08-23, le temps d'un chantier ; elle importe désormais `stylesVoletLecture`, **avant d'avoir dérivé** — les deux formes étaient encore mot pour mot identiques. ⛔ Il n'y a plus qu'une définition et il ne doit pas y en avoir d'autre : une forme recopiée à deux endroits ne reste identique que par accident. ⚠️ À savoir : `comparaisonTraductions.test.ts` vérifie la présence de la chaîne `<span style={LABEL_VOLET}>Lecture</span>` **dans le texte source**, il passe donc quelle que soit la copie employée — il ne protège pas de la dérive.

# Bible classique — le coût, c'est le NOMBRE d'allers-retours (audit du 2026-08-22)

Mesuré depuis le poste de travail : **un aller-retour vers Supabase coûte ~65 ms, quoi qu'il transporte** (`select` d'une ligne : 60 ms min, 74 méd). Le chapitre le plus lourd de `versets_lecture` en coûte 70. Aucune requête de la page n'est lente : c'est leur mise en CASCADE qui se voit.

| Lecture | Vagues avant | Vagues après | Local |
|---|---|---|---|
| Sacy / Segond / Crampon / Vulgate / Septante | 2 | 2 | ~150 ms |
| Bible 899 | 3 | 3 | ~220 ms |
| Fillion, une colonne, avec commentaires | 10 | **8** | ~790 ms |
| Fillion, une colonne, sans commentaires | — | **5** | ~430 ms |
| Fillion en regard | 19 | **8** | ~1,2 s (2,1 s avant) |

**Trois corrections, dans l'ordre de leur poids.**

1. ⛔ **La lecture en regard ne charge plus la lecture ordinaire.** `app/page.tsx` chargeait d'office les versets d'une colonne PUIS leur appareil, avant même de savoir si les deux colonnes prendraient la place : neuf allers-retours dont aucun n'était rendu. La lecture ordinaire est passée en **fonctions** (`chargerVersetsDuChapitre`, `chargerAppareilDuChapitre`), appelées **après** la décision du bilingue. ⚠️ L'ordre est obligatoire dans ce sens : la lecture en regard peut n'être pas servable (chapitre hors du lot aligné) et doit laisser la lecture ordinaire prendre le relais — c'est pourquoi on ne peut pas simplement mettre un `if` en tête.
2. **`loadBibleEditionChapter` passe de cinq vagues à trois** (~460 → ~314 ms, médiane sur sept). Les bornes canoniques ne conditionnent AUCUNE des trois requêtes de catalogue — elles ne servent qu'à filtrer leurs résultats — elles partent donc avec elles ; et les notes internes ne dépendent que de l'IDENTITÉ des blocs, connue dès le premier tour, elles n'ont donc pas à attendre leur texte.
3. ⛔ **Le menu ne bascule plus l'index en mémoire vers une traduction dont les colonnes ne sont pas chargées.** Les versets d'une segmentation éditoriale ne portent pas les colonnes canoniques, et réciproquement : choisir la Fillion depuis la Sacy affichait « cette traduction ne comporte pas ce livre », ruines fumantes comprises, le temps que le serveur réponde. La règle était écrite pour la préférence enregistrée, pas pour le menu. Corollaire nécessaire : `traductionIndex` se **recale sur `tradInitiale` pendant le rendu** (patron des états qui recopient une propriété), sans quoi refuser l'échange laisserait le menu sur la traduction précédente — et une arrivée par URL sur une autre traduction le faisait déjà.

## Ce qui reste, et qu'on ne corrige pas ici

⚠️ **`v_bible899_verse_recomposed` ne sait pas pousser le filtre livre/chapitre.** Son `livre` et son `chapitre` sont des `COALESCE` de `split_part(canon_id, '.', n)` et de champs `metadata` : aucun index ne s'y applique. `EXPLAIN` sur Genèse 1 : **19 497 lignes écartées par le filtre pour 31 rendues**, 60 279 tampons touchés, 83 ms d'exécution. C'est tenable aujourd'hui, mais le coût croît avec le corpus, alors même qu'on ne demande qu'un chapitre. Le remède est côté base (colonnes matérialisées `livre`/`chapitre`, ou index d'expression), donc hors de ce dépôt.

⚠️ **`versets_lecture.select('*')` reste VOLONTAIRE** (30 Ko pour Genèse 1, cinq traductions au lieu d'une). C'est le prix de l'échange de traduction instantané entre éditions canoniques, et le restreindre est un faux positif d'audit déjà consigné plus haut. Ne pas y revenir.

⚠️ **Il n'y a pas de `app/loading.tsx` à la racine, et c'est un choix à faire, pas un oubli.** La page étant dynamique, le routeur garde l'écran précédent jusqu'à ce que tout soit prêt : rien ne répond au clic. Un `loading.tsx` donnerait une réponse immédiate mais remplacerait TOUTE la page, volets compris, à chaque changement de chapitre — un clignotement pire que l'attente. La bonne réponse serait un état d'attente LOCAL sur les flèches et le menu (`useTransition`), pas un squelette de page.

⚠️ **En développement, la compilation à la demande domine tout le reste** et ne dit rien de la production. Mesurer sur le site en ligne avant de conclure : `/api/chiffres` (deux requêtes) y rend en 345 à 560 ms.

## Second audit (2026-08-27) — le coût, c'est aussi le VOLUME

Le premier audit avait raison sur les vagues et ne regardait pas ce qu'elles transportent. Mesuré à chaud, page complète, médiane sur cinq :

| Lecture | avant | après |
|---|---|---|
| Fillion, Matthieu 1 | 1 045 ms | **773 ms** |
| Fillion, Matthieu 12 | 1 081 ms | **780 ms** |
| Fillion, Genèse 1 | 1 149 ms | **797 ms** |
| Fillion en regard | 1 128 ms | **847 ms** |
| Fillion sans commentaires | 499 ms | 466 ms |
| Sacy, Bible 899 | 310 / 355 ms | inchangés |

⛔ **La page demandait les blocs éditoriaux du LIVRE ENTIER pour en afficher un chapitre.** Matthieu : 521 blocs, **744 Ko de JSON**, filtrés ensuite en mémoire. Le filtre passe en base sur les bornes d'ordre canonique du chapitre : 32 blocs, 26 Ko, et la requête tombe de 224 à 73 ms. ⚠️ Il ne REMPLACE pas `filterBodyBlocks` : les bornes du filtre SQL sont celles du chapitre canonique, le filtre en mémoire tranche sur les créneaux que l'édition porte vraiment. Éprouvé sur 26 chapitres de 10 livres — mêmes blocs retenus, 92 % de lignes rapatriées en moins.

⛔ **`select('*')` rapatriait dix-huit colonnes de travail que le rendu ne regarde jamais** (statuts de validation, confiance de classification, horodatages) : 40 % du transfert. D'où `COLONNES_BLOC`. ⚠️ Toute colonne nouvellement lue doit y être AJOUTÉE : le type de la ligne est déclaré, il n'est pas vérifié — et PostgREST n'infère plus rien, le `select` n'étant plus littéral (d'où les casts par `unknown`).

**Deux vagues retirées du chemin critique.** Le canon du chapitre était lu deux fois (une fois pour les bornes, une fois en tête de la cascade éditoriale) : il l'est une seule, dans la vague d'ouverture, et `chargerVersetsEditoriaux` le reçoit tout prêt. Et l'appareil ne suit plus les versets : `loadBibleEditionChapter` accepte une **promesse** de créneaux, si bien que ses blocs et ses illustrations partent pendant que le texte se charge. Seules les notes de verset et le calcul des bornes exactes attendent.

⚠️ **La lecture du canon est lancée sans être attendue** : une bible ordinaire n'en a pas l'usage et ne doit pas payer son aller-retour. ⛔ Le `catch` sur cette promesse n'est pas un ornement : une promesse rejetée que personne ne cueille fait tomber le processus.

**Contrôle de non-régression** : le TEXTE rendu (scripts et balises retirés) est comparé avant/après sur neuf pages — Matthieu 1 et 12, Genèse 1, Jean 1, Actes 2, Marc 3, la lecture en regard, le texte seul, la Sacy. Identique ligne pour ligne. ⚠️ Comparer le HTML BRUT ne prouve rien : les identifiants de la charge RSC changent à chaque rendu, et les neuf pages « diffèrent » toutes.

## Le clic est ACQUITTÉ — `app/lib/attenteNavigation.tsx` (2026-08-27)

Une page servie par le serveur ne change pas d'écran tant qu'elle n'est pas prête : le routeur garde l'ancienne, et rien ne bouge. Sur la Bible commentée, cela dure de sept à neuf dixièmes de seconde, pendant lesquelles on ne sait pas si le clic a porté. ⛔ Le `loading.tsx` de la route n'y paraît pas — seule la requête d'adresse change — et un squelette de page serait pire : il remplacerait tout, volets compris, à chaque changement de chapitre.

Le module tient l'attente pour une page entière : `ProvisionAttente` l'ouvre (elle enveloppe `BibleLayout`, dont le corps est passé dans un `PageBible` interne — ⛔ un contexte ne se lit que SOUS celui qui le pose), `useNaviguer` remplace `router.push` partout où l'on navigue, `useEnAttente` dit à la marque quand paraître, et `usePrecharger` demande la page au survol.

- **La marque ne paraît qu'au bout de 160 ms**, et seulement tant que l'attente dure. Une navigation préchargée revient plus vite qu'on ne la verrait, et une marque qui s'allume et s'éteint dans le même souffle se lit comme un défaut. ⛔ Rien ne s'éteint DANS le corps de l'effet : un `setState` synchrone y déclenche un rendu en cascade (le linter le refuse). L'extinction se lit sur `enAttente`, qui retombe seul ; le nettoyage rembobine le témoin.
- **Elle ne masque pas la page** : voile à 4 %, texte lisible dessous, `pointer-events: none`. ⛔ Jamais un jeton d'ENCRE pour ce voile — sur le Cuir il est presque blanc, et le voile deviendrait un rideau (charte). Elle se pose SOUS la barre, qui ne change pas.
- **Hors provision, `useNaviguer` rend une navigation ordinaire** : `NavLivres` sert aussi la Polyglotte, et un composant partagé n'a pas à savoir s'il est sous provision.
- **`kind: 'full'` sur le préchargement** : un préchargement ordinaire s'arrête au `loading.tsx` de la route et ne rapporte rien de ce qui coûte. Même règle que sur la page d'œuvre.

**Ce qui reste** : le chargement d'un chapitre éditorial est encore une cascade de trois vagues (alignements, puis segments et sources, puis texte des unités), chacune entre 63 et 91 ms. Aucune n'est lente ; les fondre demanderait une vue SQL qui rende le texte recomposé d'un chapitre en une fois, ce qui est un travail de BASE, non de dépôt. Les scripts d'atelier de cet audit sont dans `tmp/` (`audit-bible-perf.mjs`, `audit-bible-perf2.mjs`, `audit-versets.mjs`, `audit-bible-equivalence.mjs`).

# Page Bible — UN SEUL axe de lecture (2026-08-28)

⛔ La page en portait **trois**, mesurés au navigateur sur sa structure exacte : le titre du chapitre à **503 px**, le texte des versets à **495,5**, les blocs éditoriaux et les pièces liminaires à **514,5**. L'auteur l'a vu sur « Du même auteur », qui ne tombait pas sous « Genèse ». Deux causes indépendantes, qui s'additionnaient.

- **La gouttière d'actions, 19 px.** Le titre et les versets se centrent sur le BLOC DE TEXTE (`--mesure-bloc`), la colonne de 2,375 rem des boutons étant exclue du centrage. Les blocs éditoriaux, les pièces et les notes se centraient, eux, sur toute la colonne de lecture (`--mesure-page` moins ses marges). Ils passent désormais par `surAxeTexte` (`TexteBible`), le gabarit que le titre et la mention de lacune employaient déjà. ⚠️ Conséquence heureuse : le commentaire de Fillion, qui débordait les versets de 17 px à gauche et de 55 à droite, partage enfin leur mesure.
- **La barre de défilement, 7,5 px.** L'en-tête est HORS du défileur, tout le reste dedans. La barre mesure 15 px, elle rétrécit le défileur d'autant, et tout ce qui s'y centre glissait de la moitié vers la gauche. `scrollbar-gutter: stable both-edges` réserve la gouttière des DEUX côtés : le contenu reste centré, barre visible ou non. ⛔ `stable` seul ne suffit pas — il ne réserve qu'à droite, et le décalage demeurerait.

⚠️ **La géométrie vit dans l'enveloppe, jamais sur le bloc.** Un bloc éditorial porte ses propres marges horizontales — 12 % pour un préambule (`.cs-bible-info--i1.cs-bible-block--introduction`), zéro pour un sous-titre de partie — et les mêler aurait fait dépendre l'axe du GENRE du bloc.

⛔ **Les règles de voisinage de `globals.css` traversent l'enveloppe.** Un bloc éditorial n'est plus le frère direct d'une rangée de verset : `.verset-row + .cs-bible-bloc` est devenu `.verset-row + .cs-bible-axe > .cs-bible-bloc`, et de même pour le couple titre / sous-titre de partie. ⚠️ Sans ce report, le blanc de 2 rem qui cerne un bloc de versets (charte § 35.12) disparaissait **en silence** : aucun test ne le voit.

**Contrôle** : `tmp/planche-axes-bible.tsx` rejoue la structure et fait MESURER au navigateur le centre de chaque repère. Les quatre tombent sur 503,0.

# Page Œuvre — largeur de lecture et axe de centrage

La colonne de lecture est un conteneur centré dont la largeur est nommée : `largeurLecture` dans `OeuvreClient.tsx` — **31,25rem** en lecture, **35rem** en mobile, **52rem** en traductions parallèles. **Tout ce qui se centre se centre sur l'axe de ce bloc**, et rien ne porte de compensation latérale : page de titre, fleuron, barre de circulation, titres de rang 1 et 2 (texte suivi ET apparat), blocs de paragraphes, pagination.

⛔ **La gouttière d'actions est retirée (2026-08-25).** Elle réservait ~60px à droite du texte pour la colonne de boutons (prélever, copier, signaler, éditer), et tout ce qui se centrait portait `paddingRight: gouttiereTitre = '60px'` afin de se recentrer sur le corps du texte seul : le centre de la lecture tombait **trente pixels à gauche** du centre du bloc, et cela se voyait — d'autant que la cellule d'actions FLOTTE hors de la colonne depuis le 2026-08-22 (`app/lib/celluleActions.ts` : à droite de la ligne survolée, au-dessus d'elle si la droite est trop étroite). La gouttière ne servait donc plus à rien qu'à décaler. `gouttiereTitre` et le prop `sansGouttiere` de `PageTitre` n'existent plus ; `PageTitre` a un rembourrage symétrique (`80px 48px 40px`) dans tous les cas.

⚠️ **La justification, elle, n'a pas bougé** : les 60px sont retranchés de la COLONNE (35rem → 31,25rem) et non de chacun de ses blocs. Le texte garde exactement sa largeur, seul son axe se déplace. En rem et non en pixels : la racine grandit avec l'écran, la gouttière ne le faisait pas. Mobile : il n'y avait pas de gouttière, la largeur reste 35rem.

⚠️ **Les crayons d'administration ne se paient plus sur le texte.** Aux rangs 2, 3 et 4 ils s'ancraient dans la gouttière (`right: '52px'`) ou imposaient à leur bloc un `paddingRight: estAdmin ? '44px' : 0` — un rembourrage qui décentrait un titre centré, et pour l'administrateur seulement, si bien que le défaut ne se voyait que de l'intérieur. Ils sont désormais tous posés à `right: '-52px'`, dans la marge libérée, hors du texte.

⚠️ Antériorité, à ne pas rejouer : le 2026-08-06, le correctif inverse avait été appliqué — les blocs de paragraphes (vue texte ET vue apparat) avaient reçu `paddingRight: gouttiereTitre` pour s'aligner sur des titres eux-mêmes compensés. C'était juste tant que la gouttière existait. Ne pas remettre de `paddingRight` sur ces blocs : la largeur se règle sur la colonne, en un seul endroit.

# Page Œuvre — changer de TEXTE, c'est changer de PAGE (2026-08-25)

Le menu « Lecture » mêle deux gestes qui se ressemblent et ne coûtent pas la même chose. « Français » et « Français & latin » ne basculent qu'un état client (`basculerTexte`) : instantanés. « Latin » vise un autre `id_texte`, donc une autre adresse, donc un **rendu serveur entier**. `urlDuModeOuNull` dit lequel est lequel, et c'est la seule chose à consulter avant d'ajouter une entrée au menu.

**Ce que coûte ce rendu**, mesuré le 2026-08-25 sur les Questions sur l'Heptateuque (`A0010O0023`, texte latin `TXT_A0010O0023_LA_1895_ZYCHA`) : **cinq vagues dépendantes**, dix-huit requêtes, et **la division tout entière renvoyée** — 393 segments, 132 839 signes, **331 Ko de JSON** — quand le lecteur n'en voit que 15 000 signes (`CHARS_PAR_PAGE`). C'est la plus grosse première division latine du corpus : 132 839 signes contre 78 047 pour le premier livre de la Cité de Dieu et 33 292 pour celui des Confessions. Le coût suit la taille de l'œuvre, d'où « c'est lent surtout sur l'Heptateuque ».

⛔ **Ce n'est PAS le latin qui est lourd.** Écartés par la mesure, pour n'y pas revenir : le syllabage `cesurerLatin` (1,3 ms pour une page affichée, 11 ms pour le livre entier), les notes structurées (le texte de Zycha n'en a aucune, le français en a 900), l'apparat critique (0 ligne côté latin), les liens bibliques et les versets (0 côté latin, 1 777 liens pour le seul premier livre français). Sur la base de données, **la page latine est deux à trois fois plus légère que la française**.

**Les deux remèdes en place** (`OeuvreClient.tsx`, autour de `naviguer` / `precharger`) :
- le clic est **acquitté** — `useTransition` tient l'attente, le bouton la montre. Sans cela rien ne bouge : seule la requête d'adresse change, le routeur garde donc la page courante et le `loading.tsx` de la route n'entre jamais en jeu ;
- la page est **demandée au survol**. ⚠️ `router.prefetch(url, { kind: 'full' })` : un préchargement ordinaire s'arrête au `loading.tsx` et ne rapporte rien de ce qui coûte.

⚠️ **Le témoin ne se rembobine pas dans un effet.** `cibleEnCours` se lit toujours avec `navigation`, qui retombe seul ; une remise à zéro en `useEffect` n'ajouterait qu'un rendu en cascade, et le lint (`react-hooks/set-state-in-effect`) le refuse.

**Ce qui reste ouvert** : n'envoyer qu'une PAGE de lecture au lieu de la division entière. Le mécanisme existe (`chargerTrancheTexte`, `niv1InitialPartiel`, complété en tâche de fond par le client) mais son plafond est de mille segments ; le descendre diviserait la charge initiale par neuf sur l'Heptateuque, au prix d'un nombre de pages qui grandit sous les yeux du lecteur pendant que le fond se charge. Décision non prise. Accessoirement, la tranche lit 2 178 lignes pour en garder 393, faute d'index sur `(id_texte, ref_niv1, segment_numero)`.

# Traductions parallèles — calquées sur la lecture latin-français (2026-08-13)

Règle fixée : le mode « Traductions parallèles » (`ComparaisonTraductions.tsx`) doit **tout** reproduire de la lecture — jusqu'au frontispice. Ne JAMAIS revenir aux anciens `<select>` Livre/Division, ni à un titre héros / en-tête sobre à part.

- **Frontispice IDENTIQUE à la lecture** : le mode comparaison rend le **même composant `PageTitre`** que la lecture (auteur, titre, titre original, traducteur, marque d'imprimeur, colophon), pas un en-tête ad hoc. `PageTitre` a un rembourrage symétrique (`80px 48px 40px`) dans tous les cas depuis le retrait de la gouttière d'actions (2026-08-25, le prop `sansGouttiere` a disparu avec elle), et le titre se centre sur toute la largeur du bloc, en lecture comme en comparaison. Suivent le **fleuron** (sans compensation lui non plus), puis la barre de division, puis les colonnes.
- **Circulation identique au mode lecture** : l'état de navigation (livre, division, liste ordonnée des divisions) vit dans `OeuvreClient` (`comparaisonBook`, `comparaisonDivision`, `comparaisonDivisions`, `naviguerComparaison`), **pas** dans le composant enfant. Il alimente (a) le **sommaire de gauche** (arbre Livres → Divisions) et (b) une **barre `‹ … ›`** jumelle de `barre-nav-niv1` (id `barre-nav-division`). ⚠️ **Titres EXACTS** : le sommaire et la barre affichent `ref_niv1` / `ref_niv2` de la traduction de RÉFÉRENCE (ex. « LIVRE PREMIER » / « I »), chargés via `texte_alignement_membres` (role='reference') → `segments`, PAS les libellés génériques `LIVRES_COMPARAISON` / `ROMAINS_COMPARAISON` (qui ne servent que de repli). `DivisionAlignee` porte `niv1`/`niv2`. On sort de la comparaison par le volet « Lecture » (clic sur « Français »).
- **`ComparaisonTraductions` = rendu de la division courante** (props `book` / `division` / `userId` / `auteur`), **remonté par `key={set:book:division}`** (état initial `chargement=true`, pas de setState synchrone en tête d'effet).
- **Segments cliquables + prélèvement** (comme en lecture) : chaque segment est un `.seg-inline` (CSS hérité du `<style>` parent) ; survol/clic → **cellule d'actions flottante** (prélever / copier / signaler, composants `BoutonsSegment`). Le `select` des segments ajoute `id_oeuvre` ; les métadonnées de citation sont chargées PAR œuvre (chaque colonne = une traduction, donc sa propre attribution). Notes en **infobulle** (`AppelNote`, contenu via `ContenuNoteStructuree`) — plus de bloc `<details>` ni de renvois bibliques bruts en ligne.
- **Colonnes symétriques, container 52rem** : grille `repeat(2, minmax(0,1fr))`, gap 1.6rem, même police/teinte des deux côtés. La **prose** garde un filet fin sous chaque groupe (alignement empan par empan). Les **groupes de VERS consécutifs sont FUSIONNÉS** en un seul bloc à deux colonnes continues → interligne **rigoureusement constant**. Ne pas réintroduire un rendu vers-par-groupe (interlignes inégaux).
  - ⛔ **Rectification du 2026-08-23 : l'alinéa poétique n'est PLUS déduit de la parité du rang.** Cette ligne prescrivait « retrait des vers de rang pair », c'est-à-dire le second, plus court, du distique. Mesuré sur Boèce, c'était juste pour un dixième des vers et faux pour tout le reste — 954 sur 1 092 chez Mirandol et 1 123 sur 1 213 chez Ceriziers appartiennent à des strophes de mètre UNIFORME, que la règle faisait zigzaguer. Toute la composition vit désormais dans `app/lib/compositionVers.ts`, partagée avec la lecture ordinaire : alinéa de base sur toute ligne, alinéas poétiques LUS dans `segment_metadata.indent_inches`, retrait de continuation conservé. Voir « Composition des VERS » plus bas.
- **Étiquettes des deux traductions** : discrètes, **NON collantes, fond transparent** (petites capitales grises, filet fin). *(Le « bandeau noir » qui les guettait est éteint depuis le 2026-08-19 : `--background` ne portait plus sa propre valeur et virait au noir sur un poste en thème sombre. Il dérive maintenant de `--cs-fond`. Préférer quand même le token de rôle, `--cs-surface` ou `--cs-fond`, à ce nom hérité du gabarit Next.)*
- **Notes — vers cités** (`ContenuNoteStructuree`) : plus d'étiquette « Vers » ; un bloc `form==='verse'` se rend en **police réduite (0.9em) + léger retrait gauche**.
- **Apparat critique** : masqué dans le sommaire en mode comparaison.

# Fenêtres contextuelles — jamais sous la nav, jamais hors de l'écran

Règle d'auteur, fixée le 2026-08-17 : une fenêtre contextuelle garde **toujours** une marge sous la barre de navigation et au-dessus du bas de l'écran. Calcul pur et testé : `app/lib/fenetreContextuelle.ts` (13 tests), `MARGE_FENETRE = 12`.

- **Fenêtres ancrées** (aperçu au survol d'un auteur, infobulle de note) : `placerFenetre` rend `{ top, left, hauteurMax }`. Elle se pose sous l'ancre, **se retourne au-dessus** si le bas manque, et se borne à la bande utile pour défiler en dedans si la place manque des deux côtés. ⛔ Ne jamais replacer un seuil en dur du genre `rect.top > 180` : il ignore le bas de l'écran, et c'est précisément le défaut qui a été corrigé.
- ⚠️ **La barre ne mesure pas 56 px partout.** `HAUTEUR_NAVBAR` vaut `3.5rem` et la police racine est fluide (jusqu'à ×1,375 sur grand écran) : `hauteurNavbarPx()` la MESURE, on ne la suppose pas.
- **Modales centrées** : le calque part de `top: HAUTEUR_NAVBAR` et **ne défile pas** (`overflow: hidden`) ; la boîte porte `maxHeight: 100%` et `overflowY: auto`, si bien que c'est son CONTENU qui défile. ⚠️ Le défaut corrigé venait de l'inverse : un calque en `inset: 0` qui défilait laissait le contenu passer **sous** la barre, laquelle est peinte par-dessus ; et même sous la barre, un calque défilant fait remonter la boîte jusqu'à la couper au ras, sans marge. Un bouton de fermeture dans une boîte défilante doit être `sticky`, sinon il part avec le contenu.
- ⚠️ **Ce correctif existait sur la branche de travail sans avoir été porté** : la production restait en `inset: 0`. Vérifier le SITE, pas seulement le code de la branche courante (voir la mémoire sur le déploiement).

# Citation sortie — style en place, détection volontairement étroite

Doctrine : charte `parametres.charte_ia` **§3.8**, cinquième règle. Une citation longue se détache de la prose : elle perd ses guillemets encadrants, ses guillemets internes reviennent au français, et elle reçoit un retrait des deux côtés.

- **Module pur et testé** : `app/lib/citationSortie.ts` (19 tests). `SEUIL_CITATION_SORTIE = 400` signes, seuil arrêté avec l'auteur. `detecterCitationSortie(texte, options?)` rend `{ avant, citation }` ou `null`.
- **Trois conditions cumulées**, faute de quoi la mise en page se brise : la citation doit être **isolée** (un deux-points l'annonce), **longue** (≥ 400 signes) et **terminale** (rien après le guillemet fermant, sinon un appel de note). Une citation enchâssée sortie laisserait sa phrase d'accueil coupée en deux.
- **Un segment mixte se coupe en DEUX, jamais autrement** : `avant` (la prose d'annonce, deux-points compris) reste au fil du texte, `citation` seule part dans le bloc. La condition « terminale » garantit qu'il n'y a rien d'autre à replacer — d'où l'absence de bout de phrase orphelin.
- **Segment entièrement cité** (option `sansAnnonce`, ouverte le 2026-08-20 à la demande de l'auteur) : le segment OUVRE sur le guillemet et le deux-points qui l'annonçait appartient au texte cité — « Le Seigneur dit à Moïse : Prenez les encensoirs… ». Le motif d'origine ne pouvait pas l'atteindre, exigeant de la prose avant le guillemet ouvrant, et laissait donc passer le cas le plus net qui soit : rien à couper, donc rien à orphelin. `avant` vaut alors `''`, et le **numéro de segment entre DANS le bloc** (laissé dehors, il se retrouverait seul sur sa ligne).
  - ⚠️ **Réservé à `nature = 'texte'`.** Une réplique de dialogue est elle aussi entre guillemets : la sortir en ferait à tort une citation d'auteur. Constaté sur Boèce (segment 615, « O toi, lui dis-je, souveraine consolatrice des âmes découragées… »). Restent donc hors champ, faute d'une décision de l'auteur : ce `dialogue`, un `lemme` (Commentaire sur Jonas) et une `citation` (Du mépris du monde).
  - **Portée** : 8 segments de `nature = 'texte'`, dont 7 publics.
- **La surbrillance de survol atteint le bloc à part.** ⚠️ Le fond de `.seg-inline` ne peint QUE ses fragments EN LIGNE : un enfant en `display:block` sort de l'inline et resterait sans surbrillance, si bien qu'une citation sortie ne se désignait plus au survol comme n'importe quel autre segment. D'où `.seg-inline:hover .citation-sortie` et `.seg-inline--actif .citation-sortie`. Le retrait est porté par `margin: … calc(8mm - 4px)` **moins** le rembourrage, pour que le texte reste à 8mm tout en laissant la surbrillance déborder autour de lui. Et `.seg-inline:has(> .citation-sortie:first-child)` annule le rembourrage du fragment en ligne vide qui précède un segment entièrement cité, sans quoi il peignait un trait vert d'un demi-pixel, flottant seul dans la marge.
- **Style** : `.citation-sortie` dans le bloc `<style>` d'`OeuvreClient` — `display: block`, retrait `8mm` des deux côtés, corps `0.95em`, justifié, **ni guillemets ni filet**. Même mesure que la citation d'un essai (`texteEnrichiEssai.tsx`, `EssaiClient.tsx`), pour une seule forme sur le site.
- **Les DEUX modes de lecture**, par un rendu unique : `rendreCorpsSegment(s, estPremier)` dans `OeuvreClient`. La citation devient un `<span>` en `display:block`, si bien que le segment reste cliquable, numéroté et prélevable, sans rien changer à sa structure.
  - ⚠️ **Rectification du 2026-08-20.** Ce paragraphe réservait la règle au mode segments, en tenant pour acquis qu'un bloc posé dans le `<p>` partagé du mode paragraphes « couperait le paragraphe des voisins ». C'est **faux** : la citation étant TERMINALE par construction, le bloc ferme le segment, le navigateur scinde le `<p>` en boîtes anonymes et les segments suivants reprennent à la ligne, intacts. Vérifié sur les *Questions sur l'Heptateuque* (segment 2155, suivi de 2156-2157 dans le même paragraphe) : surlignage de survol conservé (`box-decoration-break: clone`), justification et numérotation intactes.
  - **Hors champ, volontairement** : l'**apparat** (les deux branches de `segMapApparat`) ne sort pas ses citations — c'est une vue de comparaison, pas la lecture suivie.
- **La lettrine garde la priorité** : un premier segment orné ne se coupe pas en deux. ⛔ **Sauf sur un VERS, qui n'en prend jamais** (2026-08-23) : le drop cap est un flottant, et posé dans la boîte d'une ligne il déborde sur les suivantes, qui sont des boîtes sœurs. Voir « L'OMBRE DE LA LETTRINE » plus bas.
- **Chiffres du relevé (2026-08-17)** : 214 citations dépassent 400 signes, 146 sont isolées, **61** sont en outre terminales. Ce sont ces 61 que la règle atteint aujourd'hui.
- ⛔ **Le LEMME d'un commentaire est hors d'atteinte de la règle, et aucun seuil ne l'y ramènera.** Question posée par l'auteur le 2026-08-20 sur le *Commentaire sur Joël* (segment 100, « Une nation forte et innombrable… ») : le lemme qui ouvre le paragraphe est bien un segment entièrement cité, mais il ne compte que **322 signes**. Baisser le seuil serait le mauvais outil, et les chiffres le disent :
  - ces lemmes sont **systématiques** — 13 dans le Joël (dont 12 suivis de leur variante « Les Septante : « … » »), 5 dans l'Abdias (dont 4 appariés) — et leurs longueurs vont de **57 à 359 signes** : aucune coupure ne les saisit comme classe ;
  - un seuil à 320 sortirait le lemme (322) en laissant sa Septante (293) au fil du texte, **coupant la paire en deux** — le pire résultat possible ;
  - portée d'un abaissement, sur le corpus public : 72 segments à 400, 160 à 320, 202 à 300, 264 à 275, 323 à 250.
  - Le lemme se détache par sa **fonction** (il ouvre le paragraphe qu'il commente), non par sa taille : ce serait une règle structurelle, pas un seuil. **Décision de l'auteur, 2026-08-20 : ne rien changer.** Le seuil reste à 400 et les lemmes se lisent au fil du texte.
- ⚠️ La francisation des guillemets internes est **l'inverse** de `convertirGuillemetsInternes` (`app/lib/citation.ts`), qui bascule les internes en anglais parce que le copier-coller ajoute un encadrement français. Symétriques, opposées : ne pas les confondre.

# Citation biblique DÉCOUPÉE EN VERSETS — nature `verset` (2026-08-28)

Doctrine : charte `parametres.charte_ia` **§3.8** (paragraphe « Une citation POSÉE VERSET PAR VERSET ne se recolle pas ») et **§7** (table des natures). Demande de l'auteur : « dans le style des citations sortie, mais sans grand espace entre paragraphes de même style ; un léger blanc suffit ; avec retrait gauche ».

- **Le nom du style est `verset`**, une nature de segment. **Un segment = un verset** ; la suite des segments consécutifs forme la citation. Ajouté à `chk_segments_nature` (migration `supabase/migrations/20260828120000_segments_nature_verset.sql`), à `NATURE_VALIDES` (importateurs), à `NATURES_CORPS` (sans quoi la page ne le chargerait pas) et au menu « Nature » du centre de contrôle.
- ⛔ **`verset` n'est PAS `citation`, et c'est tout l'objet.** Une `citation` sortie REJOINT ses segments en un seul bloc coulant (`regrouperCitationsStructurelles`), pour que la segmentation technique reste invisible. Ici la coupure est VOULUE par l'édition : l'effacer serait effacer le verset. Les deux natures se contredisent, on ne peut pas obtenir l'une avec l'autre.
- ⚠️ **Ne pas confondre avec `vers`**, la ligne de poésie : celle-là ne se justifie pas, ne se coupe pas, et lit ses alinéas dans `indent_inches`. Rien de commun, sinon d'être une boîte par ligne.
- **Module pur et testé** : `app/lib/compositionVersets.ts` (7 tests) — `NATURE_VERSET`, `estBlocVersets` (tout ou rien, comme pour les vers), et les trois mesures : `RETRAIT_VERSET` (8 mm, celui de la citation sortie), `RETRAIT_VERSET_ETROIT` (5 mm sous 980 px), `BLANC_ENTRE_VERSETS` (0,25 rem, le tiers du blanc de paragraphe).
- **Ce que le style reprend de la citation sortie** : corps `0.95em`, justification, ni guillemets ni filet, retrait de 8 mm. **Ce qu'il en change** : le retrait ne se pose qu'à GAUCHE (deux marges étrangleraient une suite de lignes déjà rentrées), et le blanc de paragraphe (0,72 rem) tombe à un léger blanc entre versets — il reste AUTOUR du bloc, car c'est la citation qui est un paragraphe, non chacun de ses versets.
- **Deux surfaces, une composition** : `OeuvreClient` (classes `.citation-versets` / `.citation-verset` de son bloc `<style>`, interpolées depuis le module) et `ComparaisonTraductions` (type de bloc `versets`, qui emprunte les mêmes classes au `<style>` parent). *Corollaire de méthode déjà payé sur les vers : une nature traitée sur UNE surface ne l'est nulle part.*
- ⚠️ **Les versets se réunissent sans regarder `paragraphe`**, exactement comme les vers : selon l'édition, un paragraphe porte toute la citation ou un verset chacun, et sans fusion le même style rendrait un bloc d'un côté et autant de blocs que de versets de l'autre. Le bloc est la CITATION. (Hors lecture en regard, où le groupe d'alignement commande.)
- ⛔ **Ni lettrine ni citation sortie sur un verset.** La lettrine est un flottant qui déborderait sur les boîtes sœurs (raison qui l'interdit déjà aux vers) ; et `rendreCorpsSegment` court-circuite `detecterCitationSortie` pour un `verset`, qui imbriquerait un retrait dans un retrait.
- **Portée au 2026-08-28 : zéro segment.** Le style est posé, la donnée reste à marquer — c'est un travail de lecture, œuvre par œuvre.

## Le NUMÉRO DE VERSET — écrit à la main, dans la face de la page Bible (2026-08-28)

- **La case est `segment_metadata.biblical_verse_number`** (`CLE_NUMERO_VERSET`), lue par `SELECT_SEGMENT` sous le nom `numero_verset` et relue par `numeroVersetLisible` (chaîne ou nombre, formes composées « 12-13 » et « 12a » admises, refus de ce qui ne porte aucun chiffre ou dépasse douze signes).
- ⛔ **PAS `verse_number` : la clé est déjà prise, et veut dire autre chose.** Chez Ceriziers, elle porte le rang du VERS dans son poème — 1 213 lignes, trente-neuf poèmes qui ont chacun leur ligne 1. Un vers n'est pas un verset ; réemployer la clé mêlerait la numérotation d'un mètre de Boèce à celle d'un chapitre d'Isaïe. (Voir aussi `verse_layout_pending`, six segments de la Cité de Dieu : encore des vers, pas des versets.)
- ⚠️ **Le numéro ne se DEVINE pas**, décision de l'auteur du 2026-08-28 : ni au nombre en tête du segment (un verset peut commencer par un nombre — « Quarante jours et quarante nuits… »), ni au lien biblique, qui relève d'un travail distinct et n'est pas toujours fait. Il est écrit à la main, verset par verset, par qui tient la donnée.
- **La face est celle de la page Bible** : graisse 600, `--cs-texte-faible`, et le corps dans le rapport qu'il y tient — 0,625 rem contre 0,875, soit **0,71**, d'où `font-size: 0.71em`. La page Bible pose le numéro dans une gouttière, qui se battrait ici avec le retrait gauche : il passe en exposant sans changer de face.
- ⚠️ **Exposant à la manière de la maison** (voir `siecles.tsx`) : `line-height: 0`, calage par `top: -0.5em`, **jamais** `vertical-align: super`, qui gonfle la boîte de ligne — et le blanc entre versets, qui est léger, s'en trouverait rouvert. Mesuré sur épreuve : boîte de ligne à 88,03 px avec numéro **comme sans**.
- **Le numéro de SEGMENT s'efface dans le bloc** (décision de l'auteur) : deux nombres en exposant sur la même ligne ne se lisent pas, et c'est le verset que le lecteur cherche. Le court-circuit `NATURE_VERSET` de `rendreCorpsSegment` rend l'un à la place de l'autre.

# Composition des VERS — l'alinéa de base, et les alinéas qui se lisent (2026-08-23)

Toute la règle vit dans **`app/lib/compositionVers.ts`** (module pur, 15 tests sur les mesures RÉELLES de Boèce). `OeuvreClient` et `ComparaisonTraductions` s'y rapportent tous les deux : une seule composition, deux surfaces.

⛔ **La lecture ordinaire rendait les poèmes en PROSE, et personne ne l'avait vu.** Les traductions parallèles traitaient les vers depuis longtemps ; la lecture — celle où tout le monde lit — les envoyait dans un `<p>` justifié, avec `hyphens: auto`. Les 1 092 vers de Boèce chez Mirandol et les 1 213 chez Ceriziers passaient par là. *Corollaire de méthode : une nature de segment traitée sur UNE surface ne l'est nulle part.*

## L'ALINÉA DE BASE

Tout vers est rentré de **1,5 em** par rapport à la prose qui l'entoure (`RETRAIT_BASE`). C'est ce retrait, et non la longueur des lignes, qui dit au lecteur qu'il change de régime avant qu'il ait lu un mot. Il ne dépend d'aucune donnée et ne se discute pas.

S'y ajoutent, pour toute ligne de vers : **pas de justification, pas de césure** (on ne coupe pas un alexandrin), interligne **1,4** au lieu du 1,62 de la prose, et un **retrait de suite** de 1,15 em qui distingue une ligne trop longue du vers d'après.

⛔ **Une ligne de vers est une BOÎTE, jamais un fragment en ligne.** Un seul `<p>` ne peut pas rentrer chaque ligne : `text-indent` ne s'applique qu'à la **première** ligne d'un bloc, et jamais après un saut forcé — donc jamais après un `\n` en `white-space: pre-line`. D'où une boîte par vers.

## ⛔ Les alinéas POÉTIQUES ne se devinent pas, ils se LISENT dans la source

La règle précédente les déduisait de la **parité du rang** : le second vers du distique est rentré. Mesuré sur Boèce, elle est juste pour un dixième des vers et fausse pour le reste.

| Édition | Strophes à mètre **uniforme** | Strophes **alternées** |
|---|---:|---:|
| Mirandol 1861 (par défaut) | 61 — **954 vers** | 10 — 123 vers |
| Ceriziers 1646 | 15 — **1 123 vers** | 4 — 90 vers |

Le mètre VI du Livre quatrième est en octosyllabes d'un bout à l'autre : la parité y faisait zigzaguer une strophe parfaitement régulière.

**L'océrisation, elle, les avait bien conservés.** `segment_metadata.indent_inches` porte la position du bord gauche de chaque ligne sur la page imprimée. ⚠️ C'est une **MESURE, non un rang** — 206 valeurs distinctes de 0,003 à 0,864 pouce pour le seul Ceriziers. Mais elle est **propre** : au mètre I du Livre premier, trois niveaux nets — 0,73 · 0,02 · 0,44, à ±0,02 près. Les 206 valeurs viennent de poèmes posés différemment sur la page, pas du bruit.

Elle se rabat donc, **comme les 112 tailles de texte sur 32 rangs et les rayons d'angle sur cinq**, par `niveauxAlinea`. ⚠️ **Poème par poème, jamais sur tout l'ouvrage** : deux poèmes n'ont pas la même origine, et ce qui compte est l'écart de chaque ligne au bord gauche de SON poème. Tolérance de 0,08 pouce, posée entre le bruit mesuré (±0,02) et le plus petit écart voulu qu'on ait vu (0,25).

## ⛔ La strophe s'écrit dans `stanza_before`, et nulle part ailleurs

⚠️ **C'est une règle de DONNÉES, pas d'affichage.** Deux éditions de la même œuvre encodaient la strophe de deux façons irréconciliables : Ceriziers 1646 portait `segment_metadata.stanza_before` sur ses 1 213 vers (81 à `true`) et laissait `paragraphe` **à 1 partout** ; Mirandol 1861, l'édition PAR DÉFAUT, ne portait aucune métadonnée et rangeait ses strophes de douze vers dans `paragraphe`. Le même fait, dit de deux manières, dans le même ouvrage.

**Uniformisé le 2026-08-23** : les 1 092 vers de Mirandol ont reçu `stanza_before` en booléen, dérivé du changement de `paragraphe` **à l'intérieur d'un même mètre** — 34 strophes ouvertes pour 41 blocs de vers, ce qui concorde avec les 72 strophes relevées à la mesure. Sauvegarde `internal.backup_vers_stanza_20260823` (2 305 lignes), reprise `sql/rollback_vers_stanza_20260823.sql`. Ceriziers n'a pas été touché, contrôlé ligne à ligne : zéro écart.

⚠️ **`stanza_before_source` dit d'où la valeur vient, quand elle ne vient pas de l'import.** Son ABSENCE est la marque du cas ordinaire : la strophe a été lue sur la page au moment de l'import (Ceriziers). Sa présence dit par quoi elle a été remplacée :

| Valeur | Ce qu'elle dit |
|---|---|
| *(absente)* | lue sur la page à l'import |
| `derive_paragraphe` | **déduite** d'une autre structure, faute de mieux (les 1 092 vers de Mirandol) |
| `corrige_facsimile_p19` | **corrigée** après contrôle du fac-similé, la valeur importée étant fausse (3 vers) |

⛔ **Toute valeur qui n'est pas celle de l'import porte sa marque.** Sans elle, rien ne distinguerait plus dans six mois ce qu'on a lu de ce qu'on a inféré ou corrigé — la charte §14.2 l'exige. Une nouvelle provenance se nomme, elle ne se glisse pas dans une existante.

⛔ **Un nouvel import de vers renseigne `stanza_before` sur CHAQUE ligne**, `false` compris. Le laisser à `paragraphe` rouvre exactement la divergence qu'on vient de fermer.

**Le repli reste, comme filet.** `ouvreStrophe` lit la métadonnée quand elle existe, le changement de `paragraphe` sinon. Il n'est plus exercé par le corpus ; il protège l'import qui oublierait la règle ci-dessus. ⛔ **D'où la distinction entre `false` et `null`**, qui porte tout le filet : `false` veut dire « l'édition a répondu non », `null` veut dire « l'édition n'a rien dit », et seul le second retombe sur le paragraphe. Une lecture en `Boolean(...)` les confondait.

## ⚠️ Le découpage par `paragraphe` est faux pour des vers — on refait le POÈME

Corollaire direct de ce qui précède, et il touche le RENDU. La lecture ordinaire découpe le texte par `paragraphe` : juste pour de la prose, faux pour un poème, puisque les deux éditions n'y mettent pas la même chose. Sans correctif, la même œuvre se composait en **un bloc par poème** chez Ceriziers et **un bloc par strophe** chez Mirandol — donc deux blancs de strophe différents, 0,72 rem contre 0,6.

`fusionnerBlocs` fond les blocs voisins entièrement composés de vers, et les strophes s'y marquent seules par `stanza_before`. ⛔ **La vraie raison est ailleurs** : `niveauxAlinea` se calcule sur le POÈME. Appliqué strophe par strophe, il prendrait pour origine la ligne la plus à gauche de CHAQUE strophe, et une strophe entièrement rentrée retomberait au fer à gauche.

⚠️ **Un bloc qui porte un texte ORIGINAL n'est jamais fondu** : la grille bilingue apparie un original par bloc.

## ⚠️ Dhuoda — un troisième modèle, qui est un DÉFAUT de segmentation

`TXT_A0176O0001_1887_BONDURAND` (« Manuel pour mon fils ») compte 20 segments de nature `vers`, et **aucun n'est une ligne** : chacun porte plusieurs vers courus ensemble (« Deus summe, lucis conditor poli Syderumque ductor, rex æterne, … »). Il n'a donc pas été uniformisé : y écrire une marque de strophe reviendrait à encoder une fiction par-dessus un défaut. C'est une **re-segmentation** qu'il lui faut, pas une métadonnée.

## Les colonnes de `segments` s'écrivent en UN seul endroit

**`app/lib/oeuvreSelects.ts`** porte `SELECT_SEGMENT` et `NATURES_CORPS`. Les deux étaient recopiés à **trois** endroits chacun — rendu serveur, rechargement de division, chargement de l'apparat — sans qu'aucun mécanisme n'oblige les six listes à rester d'accord. C'est exactement la dérive qui avait tenu la section « Opuscules » invisible en ligne pendant que ses neuf tests passaient. ⛔ Lire les colonnes d'un segment ailleurs qu'ici, c'est la rouvrir.

⚠️ **Les deux dernières entrées ne sont pas des colonnes mais des CHAMPS de `segment_metadata`**, tirés par leur nom (`alinea:segment_metadata->>indent_inches`). On ne prend pas la colonne `jsonb` entière : elle porte une trentaine de clés par segment pour une page qui en charge jusqu'à mille d'un coup. Corollaire : PostgREST les rend en **TEXTE**, quel que soit leur type en base — d'où `mesureAlinea` et `marqueStrophe`, qui les relisent.

## ⛔ L'OMBRE DE LA LETTRINE — une mesure qui n'est pas un alinéa (2026-08-23)

Une capitale ornée **pousse vers la droite** les premières lignes du poème, et l'océrisation mesure ce déplacement comme n'importe quel autre. Ce n'en est pas un : ces lignes ne sont pas rentrées, elles sont bornées par un ornement.

Vu sur le fac-similé de **Ceriziers 1646, page 19** (Livre premier, Poésie I) : un grand M gravé occupe quatre lignes, et les quatre premiers vers commencent à sa droite. Leurs mesures valent **0,73 quand le reste du poème vaut 0,02** — soit, rabattu, le rang le plus profond de l'échelle, pour des vers que l'édition compose au fer. `ombreDeLettrine` leur rend leur rang, à **deux conditions cumulées** : elles partagent toutes le même rang, et le poème revient ensuite **plus à gauche**. Sans la seconde, on confondrait l'ombre d'une lettrine avec un poème entièrement rentré.

⚠️ **Ce n'est pas un cas isolé : les 39 poèmes de Ceriziers ouvrent TOUS sur une capitale ornée**, déportant leur première ligne de **0,379 pouce en moyenne**. Sans cette correction, chaque poème du livre commencerait par un vers rentré de trois em que l'édition n'a jamais composé ainsi. La hauteur de l'ornement varie : le M de la page 19 couvre quatre vers, le H de la page 22 n'en couvre qu'un — d'où une règle qui lit la MESURE au lieu de compter les lignes.

⚠️ **Et la mesure a raison contre l'œil.** À la page 22, le second vers (« Qui brilloit au fond de nostre Ame: ») paraît rentré sous le H ; mesuré, il vaut 0,389 contre 0,386 pour le reste du poème. L'ornement est assez étroit pour que la ligne le franchisse presque au fer. Zoomer avant de conclure.

⛔ **Un VERS ne prend pas de lettrine.** Le drop cap est un **flottant** : posé dans la boîte d'une ligne, il déborde sur les suivantes, qui sont des boîtes sœurs. La capitale ornée d'un poème appartient au POÈME, pas à son premier vers, et la rendre demande de faire flotter l'ornement sur le bloc entier, les lignes coulant à sa droite comme dans l'imprimé. Chantier à part, pas un réglage.

## ⛔ Une strophe se sépare par un BLANC, jamais par un filet

Décision de l'auteur, 2026-08-23. Le filet de `.para-bilingue` marque l'appariement empan par empan de la **prose**. Or le latin d'une strophe vit sur son vers de rang 1 : **chaque strophe est donc un empan**, et le filet tirait un trait à chaque respiration du poème. `.para-bilingue--vers` le retire et donne un blanc, comme la page imprimée.

⚠️ **On ne fond les strophes que si l'original n'est PAS montré.** Fondre le poème en lecture bilingue ne garderait qu'un seul `texte_original` (le premier trouvé) et jetterait celui des autres strophes.

## ⛔ L'original d'un poème se compose EN VERS, lui aussi

Le latin d'une strophe entière vit sur le vers de rang 1, ses lignes séparées par des sauts. Rendu dans un paragraphe de prose, il se justifiait et se coupait à la césure pendant que le français d'en face était composé en vers : les deux colonnes ne disaient plus la même chose. `lignesDeVers` le découpe, et chaque ligne prend l'alinéa de base et le retrait de suite. ⚠️ **Aucun rang d'alinéa sur l'original** : la source ne mesure l'indentation que du texte TRADUIT.

## ⚠️ Regarder un fac-similé — la recette

`pdftoppm` **n'existe pas côté Windows**, mais **poppler-utils est dans WSL Ubuntu-24.04** (celui de Kraken). C'est la voie :

```
wsl.exe -d Ubuntu-24.04 -- bash -c 'cd "/mnt/c/…" && pdftoppm -png -r 150 -f 19 -l 19 fichier.pdf sortie'
```

⚠️ **Un chemin ACCENTUÉ passe mal** à travers WSL depuis ce shell : copier le PDF sous un chemin ASCII (`tmp/` du dépôt, ignoré par git) avant de rendre. ⚠️ Et **la page imprimée n'est pas la page du PDF** : le décalage se trouve en sondant deux ou trois pages. Il vaut **0 chez Ceriziers 1646** et **86 chez Mirandol 1861**, dont l'introduction est paginée en chiffres romains.

## Ce que le fac-similé a tranché

- ⛔ **Mirandol RENTRE ses vers courts.** Page 13, mètre V : « Soudain mes yeux, rendus à leur vigueur première, » au fer, « Se rouvrirent à la lumière. » nettement rentrée, et ainsi de suite. La règle de parité qu'on a retirée avait donc raison **sur ce poème-là** — et tort sur les 954 autres vers. Ce n'est pas une règle qu'il faut, c'est la mesure.
- ✅ **Les strophes de Ceriziers : question CLOSE.** Sur 81 ouvertures, 76 sont corroborées par un changement d'alinéa mesuré ; les 2 que l'écart ne confirmait pas ont été vérifiées à l'œil et sont **justes** (page 36, « Grand Gouuerneur de la Nature, » ; page 79, « Par fois il partageoit sa gloire » — blanc et retrait présents). Seules **3 étaient fausses**, au mètre I du Livre premier : le quatrain d'ouverture ne porte aucun blanc page 19. Corrigées en base, `stanza_before_source = 'corrige_facsimile_p19'`.
- ⚠️ **Un écart d'alinéa faible ne dément pas une strophe.** Les deux marques suspectes l'étaient parce que leur retrait passait sous le seuil de 0,08 pouce — mais le BLANC, lui, était bien là. Les deux signaux sont indépendants : l'un peut manquer sans que l'autre mente.
- ✅ **Ceriziers rentre la PREMIÈRE ligne de chaque strophe** (page 22, sizains de la Poésie II), et le site le rend fidèlement : c'est ce que dit `indent_inches`, et les deux signaux concordent.
- ✅ **Le retrait de SUITE est la convention imprimée** : chez Ceriziers, un vers trop long pour la mesure repart en retrait (« que de ioye, », « douleur, », « malheur ; »). C'est ce qui distingue un vers d'un simple retour à la ligne.

## Ce qui reste

⚠️ **Mirandol n'a aucune mesure d'alinéa.** Son import ne portait pas `indent_inches`, si bien que l'édition par défaut reçoit l'alinéa de base et rien d'autre. Le fac-similé prouve que **c'est faux pour ses 123 vers de mètre alterné**, et juste pour les 954 de mètre uniforme. Le remède est une correction de DONNÉES — relever les alinéas à la source —, pas d'affichage.

# `join_before` se MATÉRIALISE, il ne se concatène jamais (2026-08-24)

Doctrine : charte `parametres.charte_ia`, **§ 6.1.1**. Toute la matérialisation vit dans **`app/lib/jonctionSegments.ts`** (module pur, 16 tests) : `liantAvantSegment` pour `segments`, `liantSymbolique` pour la couche Bible 899, `recomposerSegments` pour recomposer une suite. ⛔ Ne pas recopier la table des jetons ailleurs.

⛔ **Le défaut se LISAIT à l'écran.** Le latin de Zycha des « Questions sur l'Heptateuque » (`TXT_A0010O0023_LA_1895_ZYCHA`) composait « ut multos gignerent?spacenon enim et Adam ipse » : le mot technique `space` s'imprimait au beau milieu d'Augustin, **neuf fois sur la seule première page**. Le rendu écrivait `{i > 0 ? (s.joinBefore ?? ' ') : null}`, c'est-à-dire qu'il tenait la valeur pour le séparateur lui-même. La donnée était juste, et `oeuvre_texte_unites.clean_text` portait la bonne recomposition.

⚠️ **La colonne mêle DEUX conventions, et aucune contrainte SQL ne les départage** : `segments.join_before` est du `text` libre, à la différence de `bible_editorial_segment_sources.join_before`, qui porte un CHECK sur les quatre jetons. Relevé du 2026-08-24 :

| Valeur | Lignes | Textes | Ce que c'est |
|---|---:|---:|---|
| `NULL` | 65 798 | 44 | rien de prescrit → espace simple |
| `' '` | 19 673 | 29 | séparateur littéral |
| `''` | 2 288 | 16 | soudure d'un mot coupé |
| `'\n'` / `'\n\n'` | 2 243 / 1 347 | 6 / 6 | séparateur littéral |
| `' — '` | 265 | 1 | Jeannin |
| U+00A0 | 1 | 1 | insécable |
| **`space`** | **1 913** | **2** | **JETON symbolique** |

Les deux se distinguent par une propriété qui ne trompe pas : **un séparateur littéral ne porte ni lettre ni chiffre**. Un jeton hors vocabulaire retombe donc sur le liant par défaut, et jamais sur son propre nom.

⚠️ **Les deux textes atteints l'étaient ENTIÈREMENT** : Zycha (1 525 jetons sur 2 178 segments) et la Dhuoda de Bondurand `TXT_A0176O0001_1887_BONDURAND` (388 sur 576). Dans les deux, `NULL` ne paraît qu'au premier segment de chaque unité et tout le reste porte `space`. Chercher le défaut sur une seule œuvre, c'est en laisser une seconde en ligne.

⛔ **`NULL` vaut l'espace simple, et il ne peut pas valoir autre chose.** 65 798 segments répartis sur 44 versions n'ont jamais eu la colonne renseignée : leur rendre la chaîne vide souderait les mots de tout ce fonds.

⛔ **Ne jamais poser de règle « on ne joint pas deux unités-source ».** Elle casse deux corpus, et c'est mesuré : Bondurand fait courir une phrase de l'unité `P0035` à `P0036` dans un même paragraphe (« …eripi possis, et in » puis « electorum consortio… », il FAUT l'espace), tandis que **475 premiers segments d'unité de Mirandol et 209 de Ceriziers** portent `''` pour recoller un mot coupé au passage (il FAUT la soudure). La règle juste est plus simple : **la jonction est celle du segment COURANT, rien ne s'hérite du précédent**, et le premier segment d'un bloc affiché ne reçoit aucun préfixe, quelle que soit sa valeur.

**Les quatre chaînes de recomposition**, toutes recâblées : `OeuvreClient.tsx` (texte suivi et apparat critique), `bilingueAlignement.ts::joindreSegmentsOriginaux` (colonne originale de la lecture en regard), `ComparaisonTraductions.tsx::ColonneLecture`, et `bibleEdition.ts::recomposerFragmentsMateriels`, qui tenait déjà la bonne table et la DÉLÈGUE désormais.

⚠️ **La copie et l'export ne sont pas concernés, vérifié** : `BoutonsSegment` cite UN segment, `join_before` n'y entre jamais ; `api/admin/export-segments` sort les colonnes brutes en CSV sans rien recomposer.

**L'ordre compte** : recomposition logique d'abord, typographie ensuite et segment par segment. Dans le lecteur, le liant est un enfant React posé ENTRE les `<span>` des segments, hors de `composerCorps` : aucune métadonnée n'atteint `cesurerLatin` ni `normaliserEspacesOriginal`.

# Césures du texte latin — aucun navigateur ne sait les faire

⛔ **`hyphens: auto` ne fait RIEN sur un `lang="la"`.** Aucun moteur ne livre de dictionnaire de coupure pour le latin. Mesuré dans le navigateur intégré, sur une colonne de 170 px et un extrait des *Confessions* : **23 lignes** avec `hyphens: auto`, **23** sans césure du tout, et **23** encore en déclarant `lang="it"` pour emprunter le dictionnaire italien. La déclaration était donc inerte depuis toujours, et la justification creusait les blancs faute de pouvoir couper.

Les points de coupe sont désormais **posés par nous**, en césures conditionnelles U+00AD (invisibles tant que la ligne n'a pas besoin d'être coupée). Module pur et testé : `app/lib/cesuresLatines.ts` (14 tests).

- **Deux notions distinctes, deux fonctions.** `syllabesLatines` est linguistique : « do-mi-ne » a trois syllabes, un point. `pointsDeCoupe` est typographique et n'en retient que certaines : au moins **2 lettres avant** la coupe et **3 après**, d'où « do-mine » et non « do-mi-ne ». Le second seuil est le seul curseur à toucher si l'on veut plus de coupes encore.
- **Règles classiques appliquées** : consonne simple à la syllabe suivante ; muette + liquide insécable (« pa-tris ») ; s + occlusive insécable (« ne-sci-ens », « in-spi-ra-sti ») ; `s` + muette + liquide d'un seul tenant (« ca-stra ») ; digrammes grecs et `gn` insécables (« chri-stus », « ma-gnus ») ; diphtongue jamais coupée (« lau-da-bunt ») ; hiatus coupé (« de-o-rum »).
- ⚠️ **Le `u` de `qu`/`gu` est consonantique** : sans cette règle, « loquitur » se coupe en « loq-ui-tur » et « quomodo » en « qu-omo-do ». `qu` et `gu` figurent donc dans les groupes insécables.
- **Posées au RENDU, jamais dans la donnée** (même doctrine que l'espacement, charte §3.2) : `cesurerLatin` s'applique au `texte_original` d'`OeuvreClient` et à la colonne en langue originale de `ComparaisonTraductions`. La fonction est idempotente et ne change pas une lettre : `sansCesures(cesurerLatin(t)) === t`, garanti par test.
- ⚠️ **Une césure ne doit jamais quitter la page.** `preparerTexteCitation` (`app/lib/citation.ts`) appelle `sansCesures` : sans quoi un copier-coller emporterait des caractères invisibles dans le presse-papiers.
- **La regex ne vise que les suites de lettres d'au moins 5 caractères**, ce qui laisse intacts les marqueurs de note `[[81]]`, les nombres et la ponctuation. `rendreTexteAvecNotes` continue donc de reconnaître ses appels.
- **Gain mesuré** (extrait des *Confessions*, sans-serif 0.79rem) : 170 px → 8,7 % de lignes en moins ; 220 px, largeur réelle de la colonne bilingue → 5,9 % ; 300 px → nul. Le gain en lignes sous-estime l'effet : à nombre de lignes égal, les blancs de justification se resserrent. L'espacement du latin a par ailleurs reçu le `wordSpacing: -0.025em` que portait déjà la colonne française.

# Police des textes d'œuvre — sérif toujours, sauf l'original en regard

Règle d'auteur, fixée le 2026-08-17 :

- **un texte d'œuvre se lit TOUJOURS en sérif** (`--font-source-serif`), corps comme titres, en mode segments comme en mode paragraphes, en lecture comme en apparat critique et en traductions parallèles. Le corps était en `--font-source-sans` depuis l'origine : quatre déclarations dans `OeuvreClient` et le gabarit de `ComparaisonTraductions` ;
- **le texte en langue originale (latin, grec) se lit en sérif lui aussi**, quand il paraît SEUL (mode « Latin ») ;
- **SEULE exception : mis EN REGARD du français, l'original passe en sans-serif.** La différence de police sépare les deux colonnes d'un coup d'œil, mieux qu'un filet.

Deux surfaces portent cette exception, et elles doivent rester d'accord :

- **lecture bilingue** : règle CSS `.para-bilingue > .texte-original` dans le bloc `<style>` d'`OeuvreClient`. La classe `.para-bilingue` n'est posée qu'en mode bilingue (`affichageBilingue && original`), jamais en « Latin seul » — c'est ce qui fait basculer la police au bon moment, sans condition en JS ;
- **traductions parallèles** : `ComparaisonTraductions` reçoit la langue de chaque colonne (`AlignementDisponible.referenceLangue` / `alignedLangue`, remplies dans `app/oeuvre/[id]/page.tsx` depuis `oeuvre_textes.langue`) et tranche par `estColonneOriginale` (pur, testé `polices.test.ts`). ⚠️ Le cas est réel, pas théorique : l'alignement `A0010O0002:VIVES:LA-FR:PARAGRAPH` (La Cité de Dieu) confronte un latin et un français, tandis que `ALNSET-A0064O0001-MIR1861-CER1646` (Boèce) confronte deux traductions françaises, qui restent toutes deux en sérif. Le composant écrivait `lang="fr"` en dur : il pose maintenant `lang="la"` sur une colonne en langue originale.
- **Langue inconnue → sérif.** Mieux vaut une colonne en sérif de trop qu'un texte français composé comme un original.

# Typographie du texte en langue originale (latin, grec)

⚠️ **Rectification du 2026-08-17.** Ce paragraphe affirmait que le corpus français portait déjà une fine U+202F autour des guillemets. C'est **faux**. Relevé sur 20 000 segments, autour du guillemet ouvrant comme du fermant : **~14 600 insécables pleine chasse U+00A0**, ~3 000 espaces ordinaires U+0020, ~1 530 fines U+202F. Trois caractères pour une seule intention, résidus de lots d'import successifs. L'insécable pleine chasse vaut **le double** d'une fine (mesuré dans Source Serif 4 : 21,9 % du cadratin contre 10,9 %), d'où une citation qui bâille. Ne pas se fier à la donnée : c'est le rendu qui fait la typographie.

Le texte en langue originale (`segments.texte_original`, latin/grec), lui, vient d'éditions à ponctuation **collée** (« valde: », « dixit: »).

Règle (charte §3.1-3.2, étendue au 2026-08-06) : on harmonise la langue originale sur le français, **au rendu, sans réécrire la donnée**. Fonction pure `normaliserEspacesOriginal` (`app/lib/typographie.ts`, testée `typographie.test.ts`) : **ajoute** une fine insécable U+202F avant `:` `;` `!` `?` et autour des guillemets ; idempotente ; ne touche pas `, . …`. Appliquée au seul rendu de `texte_original` dans `OeuvreClient` (modes bilingue et langue originale seule). Le français garde `normaliserEspaces` (qui ne fait que **convertir** le type d'espace déjà présent, jamais en ajouter).

- **Un seul point d'application, et il est central** : `normaliserEspaces` est appelée **à l'entrée de `rendreTexteEnrichi`** (`app/oeuvre/[id]/texteEnrichi.tsx`), par où passe TOUTE la lecture — Bible, œuvre, péricopes, panneau patristique, prélèvements, polyglotte, recherche, traductions parallèles. Auparavant elle n'était appelée que par `OeuvreClient`, si bien que la page d'œuvre rendait la fine pendant que tout le reste du site gardait l'espace pleine chasse. ⛔ Ne jamais rendre du texte de corpus sans passer par `rendreTexteEnrichi` : ce serait rouvrir le trou.
- **Le copier-coller passe par `preparerTexteCitation`** (`app/lib/citation.ts`), qui applique la même fonction : le presse-papiers emporte le texte brut, pas le rendu.
- **Longueur préservée, caractère pour caractère** (jamais de quantificateur `+` dans `normaliserEspaces`) : la page Recherche surligne en découpant par indices, une conversion qui raccourcirait le texte décalerait le surlignage.
- **Le deux-points reste à l'insécable pleine chasse** (règle de l'Imprimerie nationale, texte littéral de la charte §3.2) : il n'entre pas dans la conversion. La fine ne vaut que pour `;` `!` `?` et les guillemets.
- ⚠️ **Piège d'édition** : ce module est fait de caractères invisibles (U+0020, U+00A0, U+202F) qui se ressemblent tous à l'écran. Une réécriture du fichier a déjà remplacé les fines de `normaliserEspacesOriginal` par des espaces ordinaires, sans que rien ne le montre à la lecture ; seuls les tests l'ont attrapé. Passer par les constantes `ESPACES` / `FINE`, jamais par un littéral tapé à la main, et vérifier au besoin par `[...s].map(c => c.codePointAt(0))`.
- Les deux fonctions vivent désormais dans `app/lib/typographie.ts` (module pur, testable) et sont ré-exportées par `app/oeuvre/[id]/texteEnrichi.tsx` pour les appelants historiques.
- Périmètre : toutes les œuvres sont `langue_trad='Français'` — le latin/grec n'existe que comme `texte_original`. La Vulgate/Septante de la **Bible** est un autre contexte (page Bible), non couvert ici.

# Centre de contrôle admin — toujours regarder où l'on en est

⛔ **Avant toute séance de travail sur le corpus, consulter le centre de contrôle** (charte `parametres.charte_ia` **§30**). Page admin dédiée **`/admin/controle`** (`app/admin/controle/page.tsx`, Server Component gardé par `estAdmin()`, client service_role), liée depuis le menu « Administration » de la navbar (première entrée « Centre de contrôle », famille corpus). Six sections : Corpus, Qualité du texte, Catalogue, Péricopes, Bibliographie, Chronologie. Chacune : chiffres réels + barre d'avancement + note de synthèse + liste de tâches (à faire / fait).

- **Chiffres** : une seule RPC **`controle_tableau_bord()`** (SECURITY DEFINER, `search_path=public`, EXECUTE réservé au `service_role`) renvoie un `jsonb` de tous les compteurs, en direct. **Exception qualité** : `seg_bon/moyen/critique/total` sont lus sur la vue matérialisée `oeuvres_controle_stats_mat` (la vue en direct coûte ~10,5 s) ; recalcul à la demande via `rafraichir_controle_stats()`, date affichée (`controle_stats_meta.calcule_le`). Le total qualité doit coïncider avec `seg_controle_total` (segments `nature='texte'`) : si un écart apparaît, la matérialisée est périmée → la rafraîchir.
- **Notes et tâches** : table **`controle_sections`** (`cle` PK, `titre`, `ordre`, `commentaire_ia`, `todos` jsonb `[{texte, fait}]`, `maj_le`). RLS : lecture `authenticated` + `is_admin()` ; écriture par l'assistant (service_role). **Après une avancée notable, mettre à jour la note et cocher les tâches** de la section concernée, pour que la page reste fidèle à l'état réel.
- **Nombre de traductions bibliques lisibles** : via `codesTraductionsLecture()` (mêmes règles que l'accueil), jamais le simple `count(*)` de `traductions` (qui compte aussi les non matérialisées comme TR0009).

## ⚠️ Une note de section se RÉDIGE en paragraphes (2026-08-24)

`controle_sections.commentaire_ia` est de la prose, et six des neuf notes portaient déjà des retours à la ligne. Le rendu les écrasait : `.cc-note-txt` est en `white-space: pre-line` depuis le 2026-08-24, sans quoi la note de la Chronologie ouvrait sur « [AUDIT_CHRONOLOGIE_2026-08-12] » collé à sa première phrase, et une note un peu longue devenait illisible.

⛔ Et le commentaire de code qui accompagne une règle CSS vit DANS un gabarit de chaîne (`CSS_CONTROLE`) : y écrire un accent grave ferme la chaîne. Nommer les propriétés entre guillemets français, jamais entre accents graves.

## ⚠️ Une section nouvelle ne s'affiche pas toute seule (2026-08-20)

Les cartes du centre sont **codées en dur** dans `app/admin/controle/page.tsx` (`<Carte titre="…" cle="…">`), et `sec(cle)` va chercher la ligne correspondante. Ajouter une ligne à `controle_sections` ne fait donc **rien paraître** : il faut la carte avec. Neuf cartes au 2026-08-20, la dernière étant « Bible Fillion ».

## ⛔ Le service_role CONTOURNE la RLS : n'y comptez jamais ce qui est « public »

La page lit tout en `supabaseAdmin`. Interroger une vue publique depuis l'admin rend donc **aussi les brouillons**, et un compteur nommé « lignes au catalogue public » ment. Constaté le 2026-08-20 : la carte Fillion annonçait « 2 lignes au catalogue public » sous une note disant que rien n'était visible — les deux ne pouvaient pas être vraies, et c'est le chiffre qu'on croit.

**Règle** : ce que voit le lecteur se recalcule à la main, avec les mêmes conditions que les politiques (`is_public` **et** `validation_status = 'validated'`, **et** le statut de l'entité parente), ou se lit avec une clé anonyme. Jamais par un `count` en service_role sur une vue publique.

## Panne « Impossible de charger les indicateurs » (2026-08-11)

⚠️ **Ne jamais destructurer `data` sans `error`.** La page se contentait de `const [{ data: tbRaw }] = await Promise.all([...])` : l'erreur PostgREST était jetée, et tout échec se réduisait au message générique « Impossible de charger les indicateurs (RPC `controle_tableau_bord`) », indiagnosticable. Corrigé : `error` est destructurée, journalisée côté serveur (`console.error`), et rendue à l'écran par `EcranPanne` (code, message, détails, piste).

**Cause réelle : dépassement de délai, pas une erreur de droits.** `controle_tableau_bord()` agrège tout le corpus en direct. Coût mesuré : **~1,5 s en session chaude** (plan et cache chauds, 10 appels d'affilée) mais **~6 s au premier appel à froid**, pour un `statement_timeout` de **8 s** sur `service_role`. Le dépassement remonte en **57014 — `canceling statement due to statement timeout`**, `data` devient nul, d'où le message. Reproductible : `set statement_timeout='1500ms'; select controle_tableau_bord();`.

**Ce qui déclenche le dépassement** : le cron **`rafraichir_lecture` (jobid 4) tourne toutes les minutes** (`* * * * *`, `refresh materialized view concurrently versets_lecture`), **4,8 s en moyenne, jusqu'à 7 s** (`cron.job_run_details`). Un appel à froid qui tombe pendant un refresh franchit les 8 s. ⚠️ Cette fréquence contredit la doctrine du présent fichier, où le refresh de `versets_lecture` est une opération **manuelle après correction de corpus** : à reconsidérer (résidu probable d'une séance de travail).

**Correctif en place** : `chargerTableauBord()` réessaie **une seule fois**, après 1,2 s, et **uniquement sur le code 57014**. Une vraie erreur (droits, objet manquant) remonte immédiatement, sans reprise inutile. Ne pas élargir la reprise à tous les codes : elle masquerait les pannes réelles.

**Faux départs écartés lors du diagnostic** : la fonction existe bien et `EXECUTE` est accordé à `authenticated` et `service_role` ; le filtre `where controle='…'` sur `internal.v_dates_qualite_resume` **élague** correctement les branches de l'`UNION ALL` (38 / 33 / 757 ms au lieu des 3 s de la vue entière), donc les trois appels ne sont pas le goulot ; `qualite_overrides`, `couverture_patristique` et les comptes de `segments` sont tous sous 300 ms.

## La vue principale dit le CONTRÔLE, les statistiques ont leur page (2026-08-24)

`/admin/controle` lit **`public.controle_v2_admin_snapshot()`**, le contrat compact du backend v2. C'est un seul appel, et il porte tout ce qu'il faut pour savoir si l'on peut travailler : état général, sévérités du dernier run global, certifications d'invariants, file des postcontrôles de liens avec sa répartition par mission propriétaire, objets à propriétaire ambigu, spine AELF, liens bibliques, diagnostics d'alignement et leur fraîcheur, mémoire des revues humaines. ⛔ Ne pas reconstruire ces calculs côté frontend : le contrôle certifie, l'écran affiche.

L'ancien tableau de bord, `controle_tableau_bord()`, vit désormais sur **`/admin/controle/statistiques`**, avec ses cartes, ses notes et ses listes de tâches. Il agrège tout le corpus en direct et coûte deux à six secondes : il n'a pas sa place sur l'écran qu'on ouvre pour savoir si une écriture est permise.

⛔ **Dans le snapshot, `metrics` vient d'un CACHE, le reste est calculé en direct.** `live_guard`, `certifications`, `link_review_queue`, `postcheck_owners`, `routing_ambiguities` et `alignment_diagnostics` sont recalculés à l'appel ; `metrics.*` est servi par `internal.controle_v2_metrics_cache`, dont `cache_age_seconds` donne l'âge. Mesuré le 2026-08-24, une heure après le rerun des quatre livres : `alignment_diagnostics` disait quatre runs frais et 179 dossiers pendant que `metrics.alignment_tools` annonçait encore quatre runs périmés et 180 dossiers. Les deux venaient du même appel. **Les totaux d'« Outils alignements » se refont donc depuis `alignment_diagnostics`** (`totauxAlignements`), et ce qui reste tiré du cache porte la mention de son âge.

⛔ **Un run de diagnostic sans empreinte CAPTURÉE est périmé, et on ne lui prête jamais l'empreinte courante.** `estFrais` exige `captured_fingerprint === current_fingerprint` : lui attribuer l'empreinte du corpus reviendrait à certifier un calcul qu'on n'a pas fait. Un run legacy (`stale_reason = 'legacy_no_fingerprint'`) ne redevient frais que par un vrai rerun ; deux triggers capturent alors son empreinte tout seuls.

**Les décisions humaines sont un CONTEXTE, jamais un verdict.** La mémoire des revues est append-only et se retrouve par `segment_key` et type diagnostique, d'un run à l'autre. L'écran la nomme et dit qu'elle ne s'applique pas d'elle-même au nouveau résultat.

⚠️ **Le backend n'écrit que les sévérités rencontrées** : `findings_by_severity` valait `{REVIEW: 3}`, sans les trois autres. Une sévérité absente vaut zéro constat et doit se lire comme telle, sinon la ligne BLOCKER disparaît le jour où elle vaut zéro et l'on ne sait plus si elle a été vérifiée.

## Le centre de contrôle se lit dans un VOLET, pas dans une grille (2026-08-24)

Mesures prises sur la page servie en 1920, avant refonte : une valeur de tuile faisait **26,1 px**, un titre de carte **22,6**, et le mot qui porte le verdict **21,4**. Les trente-quatre chiffres formaient donc le deuxième rang de la page, au-dessus des huit titres qui les organisent, et le verdict était le plus petit des trois. ⛔ **Un chiffre ne passe jamais devant le titre qui l'organise** : les tuiles prennent trois rangs, `action`, `normal` et `contexte`, séparés par la taille ET par l'encre, sous un titre de section monté à 1,375 rem. Une seule différence de corps ne se voit pas dans une grille de trente tuiles.

⛔ **Deux sections voisines n'ont aucune raison d'avoir la même hauteur.** La grille à deux colonnes laissait **886 px de creux sur 2 637**, soit un tiers de la page, dont un trou de 551 px à droite d'« Outils alignements » (878 px) qui faisait face à « Spine AELF » (327). La colonne unique le supprime entièrement, mesuré à zéro après refonte. La page s'allonge en revanche de 2,9 à 3,9 écrans, et c'est le prix assumé : on n'y navigue plus en défilant.

**Le verdict vit dans un volet collant**, avec les quatre compteurs de sévérité et la liste des sections. Il ne survivait pas au défilement sur une page de trois écrans, alors que c'est la seule chose qu'on vient y chercher. Le volet est d'ailleurs la grammaire du site : la Bible, l'œuvre et le catalogue des péricopes en ont tous un, le centre de contrôle était le seul écran d'administration sans navigation.

⚠️ **L'ordre des sections est FIXE**, du plus actionnable au plus informatif, groupé en « à traiter », « ce qui tient » et « contexte ». Un écran qui se réordonne selon l'état ne s'apprend jamais : c'est la pastille qui dit la gravité du jour, pas la place. `sectionsControle` est la source unique du volet ET de la colonne, sinon le volet finit par annoncer une section que la page a déplacée.

⚠️ **Les liens du volet sont des ancres natives**, sans défilement doux, et les sections portent un `scroll-margin-top` composé sur `HAUTEUR_NAVBAR`. Le doux ne s'exécute pas sur certains postes, la charte l'a déjà consigné.

## ⛔ Le routage d'une mutation se cherche dans la PROSE des tâches (2026-08-24)

Le contrat compact a franchi son délai en pleine séance : **8 696 ms** pour un `statement_timeout` de 8 s, et la page est devenue inaccessible. La correction immédiate a été de n'interroger qu'une fois chacune des deux vues coûteuses, que le contrat lisait deux fois — `v_controle_v2_mutations_routage_effectif` pour la garde puis pour les ambiguïtés, `v_controle_v2_postchecks_ouverts` pour la file puis pour sa répartition. Deux CTE `as materialized`, résultat identique vérifié clé par clé, **6 354 ms** en direct et 5,8 s par PostgREST.

⚠️ **Mais la cause de fond demeure, et elle est structurelle.** Le plan de la vue de routage dit ceci :

```
Join Filter: (todo->>'texte') LIKE ('%' || id_oeuvre || '%')
Rows Removed by Join Filter: 133 827
```

Une mutation se rattache à sa mission propriétaire **en cherchant l'identifiant de l'œuvre dans le texte rédigé des tâches de `controle_sections`**. Le coût est donc le produit des mutations ouvertes par les tâches actives. Et c'est la même mécanique qui fabrique les ambiguïtés : deux tâches qui nomment la même œuvre revendiquent mécaniquement tous ses segments.

⛔ **D'où une règle qui n'était qu'éditoriale et qui devient technique : une seule tâche active par section.** La charte le prescrit depuis l'origine (§30.1) ; au 24 août 2026 il y en avait **37**, dont 24 dans « Qualité du texte » et 13 dans « Corpus ». Chaque tâche active laissée ouverte alourdit tout le système de contrôle et multiplie les propriétaires ambigus.

# Diagnostics d'alignement — le pipeline vit dans un WORKTREE, pas dans `master`

⚠️ `scripts/bible-alignment-audit/` n'existe pas sur `master` : le chantier vit sur la branche `agent/bible-alignment-audit`, sortie dans le worktree **`C:\Corpus Scriptura\bible-alignment-audit`** (`git worktree list` les nomme tous). Chercher le pipeline dans le dépôt principal ne rend rien, alors que les runs en base citent bien leurs commits.

Rejouer un livre, depuis ce worktree :

```
node scripts/bible-alignment-audit/run.mjs --book ACT --env "C:\Corpus Scriptura\bible-patristique\.env.local"
```

`--dry-run` calcule sans rien stocker. Le run inscrit le commit `HEAD` du worktree, suffixé `-dirty` si des fichiers suivis ont changé : rejouer sur un arbre propre est donc la condition d'un run reproductible.

⚠️ **L'extraction dépasse parfois le `statement_timeout` de 8 s à froid.** `v_bible899_verse_recomposed` ne sait pas pousser le filtre livre : elle écarte les dix-neuf mille alignements du corpus pour en rendre mille, et la première page coûte une seconde cache chaud, davantage à froid. Une tentative qui échoue là ne laisse **aucune trace** : `stockerRapport` n'est appelé qu'après la détection complète, la reprise est donc sûre. Sur les quatre reruns du 2026-08-24, une seule reprise a été nécessaire, sur JHN.

⛔ **Un diagnostic ne corrige rien.** L'autorité canonique est la spine AELF, et le système est en lecture seule sur le corpus : ses seules écritures sont son propre rapport et les revues humaines. Toute proposition philologique se signale, elle ne s'applique pas.

# La Gueule — métadonnées de la page de titre par IA

Outil local `outils/la-gueule` (hors site). Le bouton « IA titre » lit la page de titre par vision et remplit les champs `oeuvres` en **couche candidate** (charte §5.4 et §14 : jamais de donnée validée sans relecture). Détails et pièges complets dans la mémoire projet La Gueule. Points cardinaux :

- **Circuit abonnement, PAS l'API payante** : le fournisseur `claude-local` pilote le CLI Claude Code local (`claude -p`) authentifié par `claude setup-token` sur le compte **Pro**. ⚠️ **`ANTHROPIC_API_KEY` court-circuite l'abonnement** : le CLI l'utilise en priorité, d'où « Credit balance is too low » alors que le compte est bon. La Gueule la retire de l'environnement du CLI (`envSansCleApi`) ; la garder hors de l'environnement.
- **Modèle vision** (`LG_AI_MODEL_VISION`, Opus) pour lire, **jamais Haiku** (casse cassée, chiffres romains ratés, accents absents → échec du rapprochement catalogue).
- **Enrichissement « base d'abord, sinon vide »** : titre original, nom canonique et `id_auteur` viennent de `auteurs` / `oeuvres` / `catalogue_notices` en **lecture seule** (`SUPABASE_SERVICE_ROLE_KEY` du `.env.local`, jamais journalisée ni exportée), jamais de la connaissance générale du modèle.
- **Casse charte** garantie par une normalisation déterministe côté serveur (titres sans point final, jamais de champ tout en capitales).
- **Redémarrage** : recharger la page ≠ redémarrer le serveur (node détaché sur le port 4599, garde l'ancien code) → double-clic sur `outils/la-gueule/redemarrer-la-gueule.bat`.

# La Gueule — pipeline contrôle → correction → export (2026-08-10)

Rend le contrôle IA **réellement effectif** de bout en bout. Rapport : `outils/la-gueule/RAPPORT_CORRECTION_PIPELINE_LA_GUEULE.md`. Doctrine : couche **candidate** seulement, jamais d'écriture dans les tables actives ; fac-similé et OCR brut immuables ; graphie diplomatique conservée (ſ, u/v, i/j) ; le ground-truth exige une validation humaine explicite (§11.7).

- **Modèle de ligne** : `ocr0` = OCR immuable ; `dip` = état candidat courant (lu par TOUS les exports) ; `corrections[]` = historique (avant/après/provenance/statut/annulée) ; `suggestion.role_confirme` = rôle qui fait foi. Modules purs testés `src/corrections.mjs` (appliquer/annuler/reclasser, détection de CONFLIT jamais écrasé) et `src/perimetre.mjs`.
- **Relecture IA par page** (`controle.mjs::controlerPageIA`, modèle contrôle=Sonnet) : relit l'image de chaque page **océrisée** et propose corrections de texte + reclassements de rôle. Ne traite que les pages ayant des `lignes` (les coquilles du tri sont ignorées).
- **Corrections effectives** : accepter écrit `dip` → présent dans TXT/MD/DOCX/JSON/SQL ; `ocr0` intact ; annulable.
- **Périmètre de travail** (`S.perimetre`, persisté) : complétude « OCR local » mesurée sur le **lot traité**, pas sur le PDF entier (barre : `lot X/Y · doc Z/total`).
- **Reclassement de rôle** = pose `role_confirme` (vocabulaire `structure.mjs`) → exclu du corps (`estHorsCorpsConfirme`) mais gardé en source (ALTO/PAGE/JSON).
- **Validation** (`validation.mjs`) : chaque correction/reclassement est un OBJET individuel (plus de fausse famille « relecture_page ») ; page courte = **avertissement**, pas un blocage ; états `FINAL_CANDIDAT` / `…AVEC_RÉSERVES` / `CANDIDAT_INCOMPLET`.
- **Auto-application des corrections SIMPLES** (`estCorrectionSimple`, distance d'édition ≤ 2, ou ≤ 4 si confiant) → appliquées sans clic ; seuls les cas ambigus (grosse réécriture, reclassement, R3, familles) sont soumis à l'humain. Reste candidat/réversible.
- **Onglet « Contrôle »** (volet gauche) = seule surface de pilotage : badge du nb à faire, liste lisible avant→après, Valider/Refuser/Voir, clic → va à la page + surligne la ligne, « ✓ N appliquées automatiquement — revoir ».
- **« Trier les pages (IA) » retiré** du parcours (lent, semait des coquilles). Enrichissement métadonnées resserré (`choisirOeuvre` ≥2 jetons + recouvrement ≥50 % ; **sous-titre = page** ; **genre au format base** : minuscule, séparateur «  ; »).

# La Gueule — triage automatique des corrections OCR (2026-08-11)

Le contrôle produisait ~150 corrections pour 35 pages, toutes à relire une par une. Désormais chaque proposition est **confrontée à l'image** avant d'atteindre l'humain, qui n'est appelé que sur ce que l'image ne tranche pas. Modules : `src/ia/triage.mjs` (pur), `src/ia/verificateur.mjs` (orchestration), `src/ia/rapport-triage.mjs` (rapport). Tests : `triage`, `verificateur`, `rapport-triage`, `triage-integration`.

- **Un cas à risque ne part PAS à l'humain** : il part à une vérification renforcée. Chiffres, renvois bibliques, pagination, marques de cahier, ponctuation, césures, diacritiques, tildes abréviatifs, ligatures, casse, segmentation, distance élevée, caractère hors du jeu attendu → `HIGH_RISK_AUTO_CHECK`. Structure (reclassement, scission, ligne omise, ancrage, page exclue) → `STRUCTURAL`. Le reste → `LOW_RISK`.
- **Deux passes VISUELLES, réellement indépendantes** : passe 1 à l'échelle de la **page** (un appel pour toutes ses corrections, économe) ; passe 2 à l'échelle du **crop** de la ligne (réservée aux cas à risque). Granularité différente, formulation différente, **ordre A/B renversé**. Les deux sont **AVEUGLES** : on ne dit jamais au modèle quelle lecture vient de la machine et laquelle du correcteur, sinon il ratifie la proposition par complaisance. `assignerAveugle` fixe l'ordre de façon déterministe (le cache reste utile) et `verdictDepuisReponse` retraduit A/B en CANDIDATE/OCR0.
- **Règle de décision** : `LOW_RISK` = un verdict concluant suffit ; `HIGH_RISK_AUTO_CHECK` et `STRUCTURAL` = **deux verdicts concordants** exigés. Concluant = pas d'abstention, image exploitable (jamais `BAD`), confiance ≥ 0,97, ET lecture recopiée cohérente avec la cible désignée (un « CANDIDATE » qui recopie autre chose est une **lecture tierce**, donc un cas humain).
- ⛔ **La confiance du générateur n'entre JAMAIS dans le seuil.** Elle est conservée séparément (`generator_confidence`) pour l'audit ; ce n'est pas une « probabilité de vérité ». Seule la vérification visuelle décide.
- ⛔ **Le triage fait autorité sur les anciennes heuristiques.** Un cas `HUMAN_REVIEW` ne doit jamais repartir en application automatique par la règle du « petit changement » (`estAutoApplicable`) : « Deut.23. » → « Deut.22. » ne coûte qu'un caractère, et aucune distance d'édition ne peut juger un chiffre de renvoi. Garde en place dans `classerValidation` (`decideParTriage`), testée.
- ⛔ **Une décision automatique n'est jamais une validation humaine** (charte §11.7) : `AUTO_ACCEPT` écrit dans la couche candidate avec `validation_humaine: false`, forcé au point d'écriture (`entreeCorrection`/`traceCorr`). `ocr0` reste immuable ; tout est annulable.
- **Politique de couche préservée (§14.3)** : un candidat qui réintroduit une graphie ancienne (`ſ`, ligature typographique) sur un **imprimé** part en revue humaine quelle que soit la concordance visuelle. Sur un **manuscrit** (transcription diplomatique), la même correction est légitime.
- **Lignes de faible confiance non corrigées** : relues nûment sur l'image (« que lis-tu ? », jamais « est-ce juste ? »). Confirmées → elles sortent de la file ; relues autrement → un candidat naît et repasse par le même triage ; indécidables → revue humaine.
- **Vue par défaut = la file humaine seule**, ordonnée par `review_priority` (désaccord, crop mauvais, lecture tierce, chiffre illisible, segmentation, plusieurs mots, distance). Les décisions automatiques restent consultables par filtre (Auto-acceptées / OCR conservé / Réf. et nombres / Structure / Caractères spéciaux / Toutes) et **contredisables** d'un clic. Rapport : bouton « Rapport de contrôle » → `exports/<nom>.controle-triage.md` + `.json`, avec case « mode audit ».
- **Métriques** (`mesurerTriage`) : `human_review_rate` est le KPI. Le dénominateur est le total des candidats — on ne le fait jamais baisser en écartant des propositions.

# Schéma `public` = surface d’attaque (audit du 2026-08-19)

Tout ce qui vit dans `public` est servi par l’API REST. `anon` n’y a aucun droit (base fermée), mais **le rôle `authenticated` en a beaucoup par défaut** : un simple titulaire de compte interroge PostgREST directement, sans passer par le site.

- ⛔ **Aucune table de travail ni de sauvegarde dans `public`.** 48 tables `backup_*` y dormaient sans RLS, avec SELECT/INSERT/UPDATE/DELETE pour `authenticated` : n’importe quel compte pouvait les vider. Elles sont passées dans `internal`, que ni `anon` ni `authenticated` ne peuvent seulement parcourir (`USAGE` refusé). **Créer les sauvegardes directement dans `internal`.**
- ⛔ **Une donnée privée ne s’ajoute pas en colonne d’une table lue en `select('*')`.** La page de l’œuvre fait `from('oeuvres').select('*')` sous la session du lecteur : toute colonne ajoutée là part chez lui, quel que soit l’écran qui la montre. Une note d’administration se met dans une table à part, sans droit pour `anon` ni `authenticated` (modèle `oeuvres_commentaires_prives`, 2026-08-20).
- **Une vue de lecture ne porte pas de droit d’écriture.** Les dix vues publiques avaient INSERT/UPDATE/DELETE pour `authenticated`, sans usage. Révoqués.
- **`security_invoker = true` est la règle**, pour que la RLS de l’appelant s’applique. Deux exceptions assumées, écrites dans les migrations : `classement_utilisateurs` (la politique de `profils` est « soi-même » ; en invoker on ne verrait plus le score des AUTRES lecteurs) et `v_bible899_verse_recomposed` (chantier en cours, ses segmentations non publiées disparaîtraient).
- ⚠️ **Le passage en invoker a un COÛT, mesurer avant de basculer.** Les politiques de `segments` et `liens_bibliques` se réévaluent à l’intérieur des agrégats : `versets_plus_cites` est passée de quelques centaines de ms à 2,4 s cache chaud et a dépassé le délai d’attente à froid, la page /statistiques renvoyant une 500. Elle est revenue en DEFINER. Les vues d’agrégat sur `segments` (`oeuvres_controle_stats`, `oeuvres_liens_stats`, `avancement_liens`) coûtent 2,5 s à un lecteur ordinaire contre 1 s au propriétaire ; l’administrateur, lui, court-circuite par `is_admin()`. La bonne réponse pour une vue lourde est la MATÉRIALISATION (modèle `oeuvres_controle_stats_mat`), pas le DEFINER.


# Sauvegardes et vérification (GitHub Actions)

Trois workflows, et une leçon.

- `verification.yml` — à chaque poussée sur `master` : `tsc` et `vitest` BLOQUENT, le linter est informatif tant que ses 414 erreurs héritées n’ont pas été résorbées. Retirer `continue-on-error` le jour où le compte tombe à zéro. ⚠️ Il y appelle `npx eslint app`, ce qui **contournait** une config cassée au lieu de la corriger : voir « `npm run lint` ne rendait jamais la main » plus haut.
- `backup-supabase.yml` — quotidienne, format `custom`, privilèges CONSERVÉS.
- `sauvegarde-supabase.yml` — hebdomadaire (dimanche), format texte gzippé, `--no-owner --no-privileges`. ⚠️ Sans les GRANT, une base restaurée depuis CE vidage ne rendrait rien à PostgREST : les rôles `anon` et `authenticated` n’auraient plus aucun droit. C’est la raison d’être de la quotidienne.

⚠️ **Piège vécu : la sauvegarde quotidienne a échoué 21 nuits d’affilée, en silence** (du 30 juillet au 19 août 2026). Elle visait `db.<ref>.supabase.co`, qui ne publie **qu’un enregistrement AAAA** ; les exécuteurs GitHub sont en **IPv4 seul**, la connexion ne pouvait pas aboutir. L’hebdomadaire, elle, passait : elle emploie le secret `SUPABASE_DB_URL` (le pooler, joignable en IPv4). Les deux emploient désormais ce secret.

- **Un workflow programmé qui échoue ne prévient personne.** GitHub n’envoie de courriel qu’au propriétaire du workflow, et le silence ressemble au succès. Vérifier de temps en temps : `https://api.github.com/repos/sqdvcontact-lgtm/bible-patristique/actions/runs` rend les conclusions sans authentification, le dépôt étant public.

**Conventions tirées du linter** (414 erreurs au 2026-08-19, 364 après une première passe ; il reste surtout 216 `no-explicit-any` et 81 `set-state-in-effect`).

- **Apostrophe courbe `’` dans tout texte affiché**, jamais l’apostrophe droite : elle accorde le code à la typographie du site et éteint `react/no-unescaped-entities`. Dans le CODE (chaînes, clés), l’apostrophe droite reste la règle.
- **Le souligné en tête marque ce qu’on écarte volontairement** : `_err` qu’on n’inspecte pas, champ déstructuré seulement pour être retiré d’un objet. Déclaré dans `eslint.config.mjs` — sans quoi six faux positifs noyaient les vrais oublis.
- **Un état qui ne fait que recopier une propriété se recale PENDANT le rendu, pas dans un effet.** Motif documenté par React : `const [recu, setRecu] = useState(prop)` puis `if (recu !== prop) { setRecu(prop); setLocal(prop) }`. Dans un effet, React peint l’ancienne valeur avant la nouvelle : la première page de l’ancienne liste de recherche apparaissait un instant, comme la pagination de l’onglet précédent.
- ⚠️ **Tous les signalements ne sont pas des défauts.** Une lecture de `localStorage` dans un effet est correcte, l’effet étant le bon outil pour un système extérieur. Corriger `set-state-in-effect` en série casserait des comportements pour gagner un rendu : chaque cas demande de comprendre l’intention.


# Appels aux routes admin — le verrou renvoie une REDIRECTION, pas une erreur

⚠️ Quand la session n'est pas reconnue, `proxy.ts` ne répond pas par un 401 : il **redirige** vers `/chantier?suite=…`. Or `fetch` suit les redirections par défaut, si bien qu'un appel à `/api/admin/…` revient en **`200` porteur de HTML** et satisfait `res.ok`. Le seul symptôme est un « Unexpected token < » au `res.json()`, généralement avalé par un `catch`.

**Règle** : tout appel client à une route admin contrôle `res.redirected` et le `content-type` avant de parser, et **remonte l'échec à l'écran** (jamais un `break`/`catch` muet). Vérifiable : `curl -i "http://localhost:3000/api/admin/catalogue"` sans jeton renvoie `307 → /chantier`.

**Cas de contexte (2026-08-12)** : dans l'admin Bibliothèque, les filtres « Œuvres candidates », « non candidates », « critiques » et « non publiées » restaient vides (« Aucun auteur trouvé »), alors que la base contenait 349 notices candidates réparties sur 56 auteurs et que le filtre, rejoué hors interface, en retenait bien 55. Trompeur : « Publiées » et « Tout afficher » semblaient marcher, parce que ce sont précisément les deux seuls modes qui **n'ont pas besoin du catalogue** — « Tout afficher » liste tous les auteurs quoi qu'il arrive. Correctif dans `app/admin/SectionBibliotheque.tsx` : statut HTTP et réponse non-JSON remontés dans un encart rouge avec bouton « Réessayer », plus `console.error`.

# Un verset affiché SEUL hérite d’une ponctuation qui désigne un texte absent

Une traduction ponctue par-dessus les versets. Sorti de son contexte — dans le volet biblique d’une œuvre, dans un prélèvement, dans un sélecteur — un verset porte donc des signes qui renvoient à ce qu’on ne montre pas. Deux remèdes, et ils sont **de sens opposé** :

- **Le guillemet orphelin s’AJOUTE** (`app/lib/guillemets.ts`). Crampon ouvre au verset 1 et ferme au verset 3 ; chaque verset pris seul est déséquilibré. On le borne des deux côtés, car on sait de quel côté le signe manque. Relevé du 2026-08-17 : sur 7 221 versets de Crampon portant des guillemets, **3 468 sont déséquilibrés**, près d’un sur deux.
- **Le tiret d’incise se RETRANCHE** (`app/lib/tirets.ts`, 2026-08-22). Il ne peut pas être complété : on ne va pas inventer le segment auquel il renvoie.

⛔ **La règle du tiret est POSITIONNELLE, non arithmétique.** Crampon emploie le cadratin comme SÉPARATEUR de segments, non comme parenthèse — Gn 25 le montre : le verset 2 finit par « … Jesboc et Sué. — », le 3 par « … et les Laomim. — », et le 4 porte « … et Eldaa. — Ce sont là tous les fils de Cétura. » Donc : **un tiret au BORD de l’extrait sépare celui-ci de quelque chose qu’on ne montre pas, il ne sépare rien et il s’efface ; un tiret À L’INTÉRIEUR sépare deux segments tous deux présents, il fait son office et il reste.** « Gn 25, 1-2 » perd son tiret final, « Gn 25, 4 » garde le sien.

**Mesure** (2026-08-22, 35 588 versets de Crampon) : 1 293 portent un tiret — 497 en fin, 67 en tête, 27 aux deux bords, et **702 seulement à l’intérieur, qui ne bougent pas**. La règle touche 591 versets sur 1 293, et jamais les deux tiers qui ponctuent réellement quelque chose de visible.

⚠️ Le **trait d’union** est exclu : il appartient aux mots, non à la phrase. Seuls le cadratin (U+2014) et le demi-cadratin (U+2013) sont visés. Le `\s` de JavaScript couvrant la fine insécable (U+202F) et l’insécable (U+00A0), les espaces que la composition française pose autour du tiret partent avec lui.

**Où c’est appliqué** : pour l’instant au seul volet biblique de la page œuvre (`OeuvreClient.tsx`), là où un verset ou un groupe de versets est montré hors contexte, et **jamais sur la page Bible**, où le verset est dans son contexte et où le tiret ponctue ce qu’on lit. Les tirets passent AVANT le bornage des guillemets, sans quoi celui-ci poserait son guillemet derrière un tiret qui doit partir.

# Défilement doux — une politesse, jamais le seul moyen d’arriver

⛔ **`scrollIntoView({ behavior: 'smooth' })` peut ne RIEN faire du tout** — ni animer, ni même arriver. Constaté le 2026-08-22 sur le site EN LIGNE, dans Chrome 151 sous Windows : la même ancre, au même instant, ne bougeait pas d’un pixel en `'smooth'` et défilait de **2 486 px** en `'auto'`. Ni `prefers-reduced-motion` (inactif) ni une règle `scroll-behavior` (les deux à `auto`) n’y étaient pour quelque chose : c’est le défilement doux lui-même qui ne s’exécute pas, selon les réglages d’animation du système.

**La conséquence n’était pas cosmétique.** Le sommaire d’une œuvre lue en **texte entier** ne fait que cela : amener le lecteur à la section choisie, puisque tout est déjà chargé dans la page. Chaque entrée pointait vers une ancre qui existait bel et bien (`g0`…`g6` étaient dans le document, en face des sept titres), et le clic ne produisait rien. Le mode paraissait donc ne pas s’appliquer, **alors qu’il s’appliquait** : la barre « ‹ I › » avait bien disparu, les sept sections et leurs 28 segments étaient bien tous rendus. C’était la NAVIGATION qui était morte, non l’affichage — et rien ne le distinguait de l’extérieur.

**Règle** : une navigation FONCTIONNELLE (sommaire, ancre de note, retour à un segment, descente en bas d’une conversation) ne passe jamais par un `scrollIntoView` doux et nu. Elle passe par `allerAAncre` / `allerAElement` (`app/lib/defilement.ts`), qui demandent le glissement puis **vérifient** : si `scrollY` n’a pas bougé de 2 px après 150 ms, on y va d’un coup. L’animation est gardée là où elle fonctionne, la destination est atteinte partout. Si le lecteur a fait défiler lui-même entre-temps, `scrollY` a bougé et le rattrapage ne se déclenche pas : c’est lui qui commande.

⚠️ **Le même piège était déjà connu ailleurs, sous une autre cause.** `scrollNiveauDesYeux` (page œuvre) commente : « Défilement INSTANTANÉ (et non “smooth”) : un défilement animé était annulé dès la première frame par le re-rendu déclenché par la sélection du segment. » Deux raisons distinctes, une même conclusion — le doux ne tient pas ses promesses.

**Reste à convertir** (2026-08-22) : sept appels doux subsistent hors de la page œuvre, et ils sont morts sur les mêmes machines — `components/TexteBible.tsx` (navigation de verset), `messagerie/[pseudo]/page.tsx` et `components/ModaleMessagerie.tsx` (descente en bas de conversation), `polyglotte/page.tsx`, `traductions/AllerPlusLoinClient.tsx`, `essais/[id]/EssaiClient.tsx`, `chantier/page.tsx`. Repérage : `grep -rn "behavior: 'smooth'" app` ne doit plus renvoyer que ce qui est purement décoratif.

# Navbar à l'étroit — mesurer, jamais poser un seuil en pixels

⛔ **Aucun seuil en pixels ne peut dire si la barre tient.** La police racine GRANDIT avec la fenêtre au-delà de 1440px (jusqu'à ×1,375, cf. § Responsive) : le contenu de la barre s'élargit en même temps que l'écran. Un `max-width` figé (essai malheureux à 1299px) se trompe aux deux bouts.

**Mécanisme en place** (`app/components/Navbar.tsx`) : la barre compare `nav.scrollWidth` à `nav.clientWidth` au montage, au redimensionnement (une mesure par image via `requestAnimationFrame`) et à chaque changement qui l'allonge (session, pseudo, droits, pastilles). Quand elle déborde, elle retient la largeur de fenêtre à partir de laquelle la version complète tiendrait de nouveau — `innerWidth + débordement + 32px de marge` — car une fois repliée elle ne déborde plus et l'on n'aurait plus aucun repère pour la déplier. La marge évite l'oscillation au pixel près.

**Ordre de sacrifice (révisé le 2026-08-23) : les OUTILS cèdent, puis la MARQUE, jamais une section.** Quatre crans, du moins coûteux au plus coûteux : **1** « Soutenir le projet » → cœur seul et le mot « Admin » effacé ; **2** pseudonyme du bouton de compte effacé (c'est le seul élément dont la largeur ne se connaît pas d'avance, jusqu'à 6rem, donc celui qui rendait la tenue incalculable) ; **3** recherche → loupe, qui déploie un bandeau sous la barre, la même vue que sur téléphone ; **4** le nom « Corpus Scriptura » et sa mention de version s'effacent, le monogramme porte seul le retour à l'accueil, le nom revenant en infobulle.

**Deux pièces se resserrent PAR PALIERS au lieu de céder d'un coup (2026-08-23)** : ce sont les deux plus larges de la barre, et les faire disparaître d'un bloc laissait un grand vide entre l'écran très large et l'écran moyen.

*L'onglet des bibles* (`OngletBibles`) a un état par cran :

| cran | onglet | comment on choisit |
|---|---|---|
| 0 | « Bible classique » et « Bible polyglotte », chacune le sien | rien à survoler |
| 1 | « Les Saintes Écritures » | se fend SUR PLACE au survol |
| 2 | « La Bible » | menu déroulant |
| 3 | « Bible » | menu déroulant |

⛔ **Le passage au menu déroulant n'est pas cosmétique, il est imposé par la mesure.** Les deux faces de l'onglet fendu occupent la même cellule de grille (voir plus bas), donc le bloc prend la largeur de la PLUS LARGE. Tant que l'intitulé dit « Les Saintes Écritures », c'est lui qui mesure l'onglet et le raccourcir gagne quelque chose ; sous « La Bible », moitié moins large que « Classique | Polyglotte », ce sont les segments qui mesurent l'onglet et **raccourcir l'intitulé ne rend plus un pixel**. Le menu, lui, sort du flux : l'onglet ne pèse plus que son propre mot. Mesuré à 1 060 px, anonyme : 152 px en fendu, 79 px en menu.

*Le champ de recherche* suit les mêmes paliers avant de se replier en loupe au cran 3 : `clamp(11rem, 17vw, 22rem)`, puis `clamp(9.5rem, 13vw, 16rem)`, puis `clamp(7.5rem, 9vw, 11rem)`. Bornes en rem (accordées à la police racine), valeur préférée en vw (accordée à l'écran) : dans chaque palier le champ suit encore la fenêtre.

**Relevé sur `/contact`, visiteur anonyme** (page libre sans session, donc contrôlable) : 1920 px → cran 0, champ 326 px ; 1200 → cran 1, champ 156 px ; 1060 → cran 2, champ 120 px ; 1024 → cran 3, loupe.

⚠️ **Contrôler la barre demande un onglet qui RENDE DES IMAGES.** La mesure passe par `requestAnimationFrame` : dans un onglet caché (`document.visibilityState === 'hidden'`, le cas du panneau navigateur non affiché) elle **ne s'exécute jamais** et la barre reste au cran 0, débordante, quelle que soit la largeur. Rien n'est cassé pour autant — le pli reprend dès que l'onglet paraît. Pour contrôler sans fenêtre visible, rendre `requestAnimationFrame` synchrone puis émettre un `resize`, et lire l'état au TOUR SUIVANT (React rend en différé). ⚠️ Une capture `chrome --headless --virtual-time-budget` photographie parfois l'état d'AVANT le pli sous ~1 050 px : le défaut se reproduit à l'identique sur la version précédente du fichier, c'est donc un artefact de capture et non une régression.

⛔ **Aucune section ne descend dans le menu de compte, à aucune largeur.** « Aller plus loin » y descendait au cran 3, en groupe distinct sous son intertitre. Deux raisons de l'avoir défait. La première tient au sens : une rubrique de lecture rangée sous un nom d'utilisateur devient introuvable, car personne ne cherche les traductions ou l'histoire de l'Église dans son propre compte. La seconde tient à l'apprentissage : une entrée qui change de place selon la largeur de la fenêtre ne s'apprend jamais, et le lecteur qui redimensionne la voit disparaître sans comprendre où elle est passée. Une barre se replie en montrant moins, pas en déplaçant ce qu'elle montre. La place gagnée se prend désormais sur le champ de recherche, devenu fluide, et sur le bouton de recherche neuve, devenu carré.

⚠️ **Piège : un onglet qui rétrécit MASQUE le débordement.** `.cs-bible` est en `overflow:hidden` : la face se laissait tronquer en « Les Sain… » au lieu de déborder, si bien que le trop-plein disparaissait à la mesure tout en poussant le reste sur le bloc de compte. D'où `.cs-nav-principale > * { flex-shrink: 0 }` — le trop-plein doit se voir pour être mesuré.

⛔ **Une face en `position:absolute` est bornée par celle qui reste en flux — et l'`overflow:hidden` la rogne en silence.** Défaut relevé le 2026-08-22 : au survol de « La Bible », « Polyglotte » disparaissait, mais **seulement à certaines largeurs d'écran**. Le mécanisme : `.cs-bible` porte deux faces superposées, l'intitulé au repos et le couple « Classique | Polyglotte » au survol ; la première était en flux et dimensionnait le bloc, la seconde en `position:absolute; inset:0` et se trouvait donc bornée à la largeur de la première. Tant que la face disait « Les Saintes Écritures », elle était plus large que les deux segments réunis et rien ne se voyait. Au **cran 2**, elle se réduit à « La Bible », moitié moins large : le second segment sortait de la boîte et l'`overflow:hidden` le coupait. Un défaut de largeur de fenêtre, donc intermittent, et incompréhensible pour qui le rencontre.

**Correctif — la superposition se fait en GRILLE, jamais en `absolute`.** `.cs-bible { display: inline-grid }` et `.cs-bible > * { grid-area: 1 / 1 }` : les deux faces occupent la même cellule, se superposent toujours, mais **aucune ne sort du flux**. Le bloc prend la largeur de la plus large des deux, à tous les crans, et plus rien ne peut être rogné. Cette largeur ne dépendant pas de l'état de survol, la barre ne bouge pas davantage qu'avant. Règle générale : **pour superposer deux états d'un même élément sans figer sa largeur, la grille à une cellule est le bon outil ; `position:absolute` fait dépendre le plus large du plus étroit.**

**Le champ de recherche se mesure sur la FENÊTRE** (2026-08-22) : `clamp(8.75rem, 15vw, 20rem)` au lieu de `13.75rem`. Une largeur fixe était le même ruban à 1 024 px qu'à 2 400 : trop gourmande en bas, où elle précipitait le repli de toute la barre, trop courte en haut, où elle flottait au milieu du vide. Les bornes restent en **rem** (donc accordées à la police racine) et seule la valeur préférée est en **vw**. Le bouton de recherche neuve, à côté, a perdu son mot « Recherche » pour un carré de 1,875rem portant une loupe marquée d'une croix : le mot redisait le filigrane « Rechercher… » du champ voisin, et coûtait près de quatre rem dans la barre la plus disputée du site.

⛔ **Un menu déroulant se borne à la hauteur de la fenêtre et DÉFILE.** Relevé le 2026-08-22 : « Administration » compte dix-sept entrées en trois familles, et `.cs-plus-menu` était en `overflow: hidden`. Ce qui dépassait du bas de l'écran n'était donc pas seulement invisible, mais **inatteignable** — sur toute fenêtre de moins de 716 px de haut, les dernières familles n'existaient plus, sans que rien ne le signale. Correctif : `max-height: calc(100dvh - ${HAUTEUR_NAVBAR} - 1.5rem)` (composé sur la constante, jamais sur un nombre recopié) + `overflow-y: auto`. Le resserrement des rembourrages a rendu 128 px sur 636, soit un cinquième : rangée de 25,2 px au lieu de 33, et le menu ne défile plus qu'en dessous de 588 px de fenêtre au lieu de se faire couper dès 716.

⚠️ **`overscroll-behavior: contain` va avec, et n'est pas une politesse.** Un menu ouvert au SURVOL se referme dès que le curseur en sort. Sans cette règle, la molette poursuivie au bas de la liste emporte la page, le menu glisse sous le curseur resté immobile, et il se ferme au moment précis où l'on cherchait à en atteindre le bas.

**Deux entrées portent la graisse** (`principal: true` dans `LIENS_ADMIN`) : « Centre de contrôle » et « Bibliothèque », les deux portes par lesquelles on entre presque toujours. Ni couleur, ni puce, ni place à part, qui déferaient l'ordre des familles — la graisse seule les lève d'une liste de dix-sept.

**Même parti pour la sous-barre de l'admin** (`app/admin/AdminClient.tsx`, 2026-08-22) : borner et faire défiler, jamais replier. Ses quinze onglets étaient en `flex-wrap: wrap` et se posaient sur **deux rangées de 104 px** dans une fenêtre de 1 440. Cela coûte deux fois : la hauteur, prise à un bandeau `sticky` qui suit tout le défilement, et surtout la lecture, car une barre d'onglets sur deux rangées n'est plus une barre mais une grille, où l'œil ne sait plus si l'ordre se lit en lignes ou en colonnes. En `nowrap` + `overflow-x: auto`, elle rend **42,5 px de haut et 61,5 px à la page**.

⚠️ **En `nowrap`, chaque onglet veut `flex-shrink: 0`.** Sans lui il se laisse comprimer, et le `white-space: nowrap` qu'il porte déjà coupe alors l'intitulé sans que rien ne le dise — le pire des deux mondes, un texte tronqué dans une barre qui ne défile pas. Et `overflow-y` reste `hidden` : un conteneur de défilement horizontal se donne sinon une barre verticale pour trois pixels de soulignement.

**Ce qui a rendu le tiers de largeur** (2 042 px → 1 399, quinze onglets à racine 16) : le corps de 1rem à **0,8125rem**, les rembourrages de 12/14 à 9/8, et la **pastille de couleur retirée devant chaque intitulé** — sept pixels et leur gouttière sur quinze onglets, pour une couleur que l'onglet actif porte déjà dans son texte et son soulignement, et que les filets de famille disent pour les autres. La barre tient donc d'une pièce dès 1 440 px, la largeur où la police racine commence à croître ; au-delà les deux grandissent ensemble et l'écart ne se referme jamais.

⚠️ **Rectification du 2026-08-24** : l'entrée « Illustrations » ajoute **108 px mesurés** (66 pour le libellé, 11 pour sa flèche, le reste en rembourrage, gouttière et filet), portant la barre à **1 507 px**. Elle ne tient donc plus d'une pièce à 1 440, et défile d'une centaine de pixels. C'est assumé : la barre défile déjà par conception, molette comprise, et une page d'administration que sa propre barre ne nomme pas est une page qu'on ne trouve pas. ⛔ Mais la marge est désormais NÉGATIVE : la prochaine entrée se paie sur les quinze autres, non sur le blanc restant.

**La barre de défilement est une classe partagée, `.cs-defilement-discret`** (`app/globals.css`, 2026-08-22), portée par la sous-barre de l'admin et par les menus déroulants de la navbar. Deux paliers de couleur : à peine visible au repos, franche quand le curseur entre dans la zone, nette quand il vient sur le pouce.

⛔ **Deux écritures existent et une SEULE s'applique à la fois.** `scrollbar-width`/`scrollbar-color` sont la voie standard, `::-webkit-scrollbar` l'ancienne. Elles ne se cumulent pas et ne se départagent pas par la spécificité : dès qu'un navigateur comprend la première, il l'applique et **ignore les pseudo-éléments en bloc**. Mesuré dans Chrome sur une même boîte : pseudo-éléments seuls, la gouttière rend les **6 px** demandés ; qu'on ajoute `scrollbar-width: thin` et elle remonte à **10**, la valeur de `thin`, que rien ne permet d'affiner — le mot-clé n'a que trois valeurs et aucune n'est un nombre.

⛔ **La voie standard est donc CONFINÉE à `@supports (not selector(::-webkit-scrollbar)))`**, c'est-à-dire à Firefox. Sans cette garde, Chrome la préfère et la barre reprend ses 10 px, quelle que soit la hauteur déclarée plus bas. Corollaire : **les deux écritures doivent dire la même couleur**, car rien ne signalera jamais qu'elles ont divergé — un même navigateur n'en voit qu'une.

⛔ **Faire circuler une barre horizontale à la roulette demande un écouteur POSÉ À LA MAIN, en `passive: false`.** Une roulette de souris n'émet que du `deltaY` : sans traduction, il faudrait attraper le pouce ou connaître Maj+roulette. Or **React attache `wheel` sur la racine en passif** — un `onWheel={…}` en JSX ne peut donc pas appeler `preventDefault`, et la page défilerait sous la barre en même temps qu'elle, deux mouvements pour un seul geste. Le défaut serait discret et permanent. Voir `refOnglets` dans `app/admin/AdminClient.tsx`.

⚠️ **`deltaY` n'est pas toujours en pixels.** `deltaMode` vaut 1 pour des LIGNES (cas courant de Firefox sous Windows, où une crantée vaut 3) et 2 pour des PAGES. Pris tel quel, un cran ferait glisser la barre de trois pixels et l'on croirait le geste inopérant. Le rapport de comparaison avec `deltaX`, lui, reste juste : les deux axes partagent la même unité.

**Deux gardes, et chacune rend la main au navigateur plutôt que de la prendre** : quand la barre tient tout entière, rien à faire circuler, donc la page défile comme toujours ; quand le geste porte déjà de l'horizontal (pavé tactile, roulette inclinable), on ne s'en mêle pas. Éprouvé sur les quatre cas, plus la butée.

**Mesures (barre d'un admin connecté, 2026-08-12)** : version complète **94,9 rem** (1519px à 16px) → ne tient qu'au-delà de ~1700px ; version repliée **52,5 rem** (841px) → tient partout dès 1024px. Le seuil du hamburger reste donc `lg` (1024px) : c'est le repli qui fait le travail, pas un plancher plus haut.

**Vérification sans redimensionner la fenêtre** (Chrome maximisé refuse `resize_window`, les popups sont bloquées, `X-Frame-Options: DENY` interdit l'iframe) : rétrécir la RANGÉE de la barre (`rangee.style.width`) puis émettre un `resize` déclenche exactement la mesure et le repli. ⚠️ Dans un onglet en arrière-plan, `requestAnimationFrame` est gelé : la mesure ne s'exécute pas. Pour tester, remplacer temporairement `window.requestAnimationFrame` par un appel immédiat. En usage réel, l'image en attente se déclenche au retour sur l'onglet.

**Recette complète, sans session** (2026-08-22, panneau navigateur). Hors session tout redirige vers `/chantier`, où la barre EXISTE dans le document mais est masquée par `body:has(.cs-ouverture) [data-cs-navbar] { display: none !important }`. Trois écueils, dans l'ordre où on les rencontre :

1. **La démasquer demande plus de spécificité, pas seulement un `!important`.** Entre deux déclarations `!important`, c'est la plus spécifique qui l'emporte : `[data-cs-navbar]{display:block!important}` (0,1,0) perd contre (0,2,1). Il faut `html body:has(.cs-ouverture) [data-cs-navbar]`.
2. **Poser la règle dans une feuille, jamais en style inline.** Un `element.style.display` est effacé au premier rendu de React, et le rendu suivant arrive précisément parce qu'on vient de déclencher une mesure.
3. **Un événement `resize` = un cran, à condition de rendre `requestAnimationFrame` immédiat, puis de le RENDRE au natif.** L'effet se rejoue sur `cran` et reprogramme une mesure : tant que le rAF est immédiat, le repli cascade jusqu'au dernier cran. Pour s'arrêter au cran N : patcher le rAF, émettre N `resize`, restaurer le rAF natif (gelé dans un onglet d'arrière-plan, donc la cascade s'interrompt). Et **lire l'état dans un appel SÉPARÉ** : React n'a pas encore rendu au retour de la fonction qui a émis les événements.

⚠️ **Une capture d'écran exige que le panneau soit AFFICHÉ** : replié, la page ne compose aucune image et la demande expire au bout de cinq secondes. Les mesures par `getBoundingClientRect`, elles, restent exactes — c'est la voie sûre. Pour prouver un rognage, mesurer la part visible d'un segment : `min(seg.right, bloc.right) - seg.left`, comparée à `seg.width`.

# Portraits d'auteurs — format et emplacement

Le portrait d'un auteur vit dans le bucket Supabase **`auteurs`**, sous le nom **`<id_auteur>.jpg`** (ex. `A0047.jpg` pour Grégoire de Nazianze). C'est la seule source lue par le site : `ModaleAuteur`, `ApercuAuteur`, `BibliothequeClient` et l'admin composent tous l'URL `…/storage/v1/object/public/auteurs/<id>.jpg`. Le dossier `public/auteurs/` du dépôt est un reliquat d'un ancien lot, il n'est plus servi.

- **Proportion 4:5**, la même que le cadre de la fiche (`6.5rem × 130px`). Le portrait y est rendu en `object-fit: cover` : à proportion égale, rien n'est rogné et `photo_position` n'a pas à être réglée. Le cadre par défaut est `{x: 50, y: 24}` (centré, un peu haut), utile seulement pour une image d'une autre proportion.
- **Deux boîtes, parce que deux usages.** `BOITE_AUTEUR` = 600 × 750 : la vignette est haute et étroite, et le plus grand cadre (carte, 120 × 200) veut le double pour rester net en HiDPI sans peser sur une page qui affiche quinze portraits. `BOITE_TRADUCTION` = 1600 × 1200 : le portrait d’un traducteur remplit un **bandeau pleine largeur** (`AllerPlusLoinClient.tsx`, `width: 100%`, 92 px de haut) et une colonne de 8,75rem — là, c’est la LARGEUR qui commande, et 600 rendrait le bandeau flou sur un écran large. JPEG qualité 90 dans les deux cas.
- ⛔ **On ne rogne JAMAIS un portrait au dépôt** (corrigé le 2026-08-19). Il paraît sur trois surfaces dont les cadres n'ont pas les mêmes proportions — carte 0,60, fiche 0,80, aperçu 0,765 — et l'administrateur les cadre lui-même par `photo_position`, avec un zoom jusqu'à 3,5×. Rogner au dépôt jette définitivement ce que ce cadrage pourrait vouloir montrer. La bibliothèque le faisait pourtant, en 300 × 450 : moitié de la définition retenue, et proportion 2:3 que le cadre rognait une seconde fois.
- **Une seule définition de la préparation : `app/lib/preparerPortrait.ts`** (module partagé, géométrie pure et testée). Réduction à l’intérieur de la boîte SANS rognage, proportions conservées, orientation EXIF respectée (une photo verticale arrivait couchée), conversion en JPEG. Une image déjà petite n’est jamais agrandie. Les TROIS écrans qui déposent un portrait l’emploient — bibliothèque, auteurs, traductions — la dernière en passant `BOITE_TRADUCTION`. Ne pas recomposer un redimensionnement ailleurs : c’est ainsi que les trois avaient divergé.
- **La route refuse ce qui n’est pas du JPEG** plutôt que de le ranger sous une extension qui ment, et pose une heure de cache, accordée au `?v=` horaire que composent les pages.
- **Réencodage des anciens dépôts, fait le 2026-08-19.** Le seau `traductions` est passé de **24 Mo à 1,96 Mo** (sept portraits, dont quatre PNG déguisés en `.jpg`, l’un de 5797 × 3551 pour un bandeau de 92 px). Côté auteurs, `A0015` est passé de 3 032 à 95 Ko et `A0011` de 136 à 17 Ko, eux aussi des PNG déguisés. Les originaux sont conservés hors du dépôt dans `C:\Corpus Scriptura\portraits-originaux-20260819`. Tout le seau est désormais du vrai JPEG.
- ⚠️ **Jamais `accept="image/*"` sur le sélecteur de fichier.** Sous Windows, Chrome traduit ce joker en une longue liste de filtres et la boîte de dialogue se met à produire les vignettes du dossier courant : elle se fige quand ce dossier est synchronisé (OneDrive). Les trois entrées d’admin (`SectionBibliotheque`, `SectionAuteurs`, `SectionTraductions`) listent désormais les extensions : `.jpg,.jpeg,.png,.webp,.avif` (2026-08-19).

# Longueur d'une œuvre — `nb_signes` et la section « Opuscules » (2026-08-16)

⚠️ **`nb_signes` compte TOUS les segments d'une version, quelle que soit leur `nature`.** Ne jamais le confondre avec `sum(length(segment_texte)) where nature='texte'`, ni « corriger » la colonne sur cette base : le corps de plusieurs œuvres vit dans d'autres natures. Boèce est un **prosimètre** porté par `dialogue` et `vers` (s'en tenir à `texte` ne compterait que **3 178 signes sur 239 170**), les commentaires de Jérôme portent le lemme biblique en `citation` (Abdias : 24 927 au lieu de 59 534), Ratramne et Eucher de même. Cette confusion a produit un diagnostic erroné de « colonne fausse » avant d'être levée.

- **Deux échelons.** `oeuvre_textes.nb_signes` = la version (une ligne par édition ou traduction). `oeuvres.nb_signes` = **la version par défaut** (`is_default`), **jamais la somme des versions** : additionner le français et le latin de La Cité de Dieu doublerait une œuvre qui se lit une fois.
- **Recalcul** : fonction `recalculer_nb_signes()` (SECURITY DEFINER, `service_role` seul), à rejouer **après un import ou une correction de corpus**. Pas de trigger sur `segments` : les imports écrivent par lots de milliers de lignes. Sans ce rappel, la colonne dérive en silence (deux dérives constatées le 2026-08-16 : le Joël de Jérôme et la préface latine de Migne).
- **Piège** : une œuvre dont **aucune** version n'est marquée `is_default` n'a pas de source de recalcul et reste figée. C'était le cas du « Commentaire sur Joël ».

**Section « Opuscules »** (bibliothèque, `app/lib/opuscules.ts`, module pur testé `opuscules.test.ts`) : sous **40 000 signes**, une œuvre est un texte bref et se replie dans une section rétractée par défaut, sous les œuvres longues de l'auteur.

- **Le seuil vient du corpus, pas d'une idée de la longueur** : aucune œuvre publiée ne compte entre **38 824 et 58 044 signes**. La coupure tombe dans ce vide. Elle ne tombe pas sur la médiane (environ 59 000), qui rangerait **une œuvre sur deux** parmi les opuscules et couperait la série des commentaires de Jérôme sur les petits prophètes, Abdias (59 534) en sortant pendant que Jonas et Joël resteraient.
- **Deux conditions d'apparition** (`partagerOpuscules`) : au moins **trois** opuscules, ET au moins **une** œuvre longue. Sans la seconde, un auteur qui n'a que des textes brefs (Cyprien de Carthage, la Doctrine des Apôtres, Grégoire de Nazianze) verrait son étagère **vide**, repliée tout entière. Au 2026-08-19, elle se déclenche chez **Jean Chrysostome** (11 opuscules pour 11 œuvres longues) et chez **Cyrille de Jérusalem** (3 pour 2), et s'ouvrira d'elle-même chez les autres à mesure que la bibliothèque grossira. **Grégoire de Nazianze** en est proche (2 opuscules), mais il lui manque une œuvre longue.
- **Le classement porte sur le GROUPE DE TITRE, jamais sur la version isolée**, et retient la plus longue de ses versions : « La Cité de Dieu » a une édition latine de Migne dont seule la préface est intégrée (1 411 signes), qui quitterait sinon son titre pour tomber dans les opuscules.
- **Une œuvre non mesurée n'est jamais un opuscule** : on ne replie pas ce qu'on n'a pas mesuré, sous peine de cacher une œuvre entière sur une donnée manquante.
  - ⚠️ **Piège vécu (2026-08-19) : la section n’a jamais paru en ligne.** La page serveur `app/bibliotheque/page.tsx` lisait les œuvres SANS `nb_signes` ; seul le rechargement client demandait la colonne, sur une liste dupliquée qui avait dérivé. Toutes les œuvres arrivaient donc non mesurées, et la règle ci-dessus les gardait toutes en liste. Les deux listes vivent maintenant dans **`app/lib/bibliothequeSelects.ts`** : lire les colonnes de la bibliothèque ailleurs, c’est rouvrir la dérive.
  - Corollaire de méthode : un module pur testé ne prouve rien sur le rendu. Les 9 tests d’`opuscules.test.ts` passaient pendant que la section restait invisible en production. Vérifier la donnée qui entre, pas seulement la fonction qui la traite.
- **La recherche déplie la section d'office** quand elle tombe sur un opuscule, sinon le résultat trouvé resterait invisible.
- **Le champ `oeuvres.trad_auteur` porte une LISTE, séparée par un point-virgule** : « Prénom Nom ; Prénom Nom ». C'est la seule convention de saisie ; ni « et », ni virgule, ni « & ». La donnée reste brute, **toute la mise en forme se fait à l'affichage** — le champ n'est jamais recopié tel quel dans un texte. Les deux formulaires d'admin (dépôt et « Modifier l'œuvre ») portent le gabarit en indication.
- **Libellé du traducteur** : toute la mise en forme vit dans `app/lib/traducteurs.ts` (module pur, testé `traducteurs.test.ts`), ré-exportée par `PageTitre.tsx`. Elle sert la page de titre, la bibliothèque, les notices du catalogue et le sélecteur de version. Ne pas recomposer « Traduction par … » ailleurs.
  - **Trois sorties, une seule lecture du champ.** `nomsTraducteurs()` découpe et nettoie (c'est la primitive) ; `libelleTrad()` fait la phrase d'écran (« Traduction par A et B », « Traduction : abbé Martin », « Traduction de Bareille ») ; `mentionTraducteurs()` fait le fragment bibliographique d'une citation déjà tournée (« Augustin, *Titre*, **trad. A et B**, Paris, 1861 »), où « Traduction par… » ferait une phrase dans la phrase. Une mention collective y entre **sans** « trad. », initiale en bas de casse.
  - ⚠️ **Un point-virgule affiché est un bogue** : il signale un endroit qui imprime `trad_auteur` brut. Le 2026-08-20, quatre en restaient — le presse-papiers des citations (`app/lib/citation.ts`), la note et le menu de `SelecteurCitation.tsx`, la liste et l'aperçu de dépôt de l'admin.
  - ⚠️ **Une mention de responsabilité collective n'est pas un nom.** « Sous la direction de M. Jeannin ; traducteurs multiples » donnait « Traduction **par Sous** la direction de… ». Quand la mention porte « sous la direction », elle commande le libellé : « Traduction sous la direction de M. Jeannin ». Une formule qui se suffit déjà (« Traduction collective sous… », « Édition française sous… ») s'affiche telle quelle, une tête que la formule rend (« Équipe sous… ») est retirée, et les qualificatifs qui ne nomment personne (« traducteurs multiples ») sont écartés tant qu'il reste un vrai nom.
  - **Le catalogue (`catalogue_notices.traducteur`) N'EST PAS tenu par cette convention** : ses mentions viennent de notices lues par l'IA et sont de la prose (« Antoine Le Gras — traduction, publication et notes attribuées au volume », « Ancienne traduction française, revue et corrigée par J.-A.-C. Buchon »). Y remplacer « et » par « ; » en masse casserait les formules ; on les affiche telles quelles.
  - ⚠️ **Jamais `\b` pour borner un mot accentué en JavaScript** : `\b` n'y connaît que l'ASCII, donc `/^(Abbé|Père|Frère|Sœur|Mère)\b/` ne s'apparie **jamais** (la frontière tomberait entre « é » et l'espace, deux caractères non-mots). Les titres accentués restaient en capitale malgré la règle. Borner par lookahead : `(?=[\s.]|$)`.
- **La fiche auteur (`ModaleAuteur`) n'est PAS concernée** : sa liste est un catalogue **chronologique** de l'œuvre entière, œuvres seulement répertoriées comprises. Trier par taille y casserait la chronologie, qui en est le principe d'ordre.

# Notes structurées positionnelles — comment corriger un appel invisible (2026-08-21)

Doctrine : charte `parametres.charte_ia` **§13.6**. Une ancre structurée peut être complète alors que `segments.segment_texte` ne contient aucun `[[n]]`. Dans ce modèle, **l'absence du marqueur matériel n'est pas un défaut de donnée** : `texte_note_ancres.segment_offset_unicode` porte la frontière d'insertion et le site doit reconstruire la projection au rendu.

Cas témoin : texte latin des *Confessions*, `A0010O0001T0001` (identifiant `TXT_A0010O0102_LA_1896_KNOLL_CSEL33` jusqu'au 2026-08-23, voir la fusion ci-dessous). Au relevé du 2026-08-23 : 2 026 notes, 2 026 ancres et 2 026 blocs, mais 0 marqueur matériel dans les 932 segments. Les offsets et contextes sont exacts selon la convention ci-dessous. L'import couvre les livres I à V (506 + 269 + 363 + 473 + 415 notes) ; les livres VI à XIII restent sans notes structurées. Les ancres 1008–1183 importées avec `source_target = note_key` ont été réparées sous sauvegarde. Aucun bloc n'est validé : les 2 026 portent `needs_review = true`. `notes_json_sha256` reste nul. ⛔ Ne jamais présenter ce lot comme complet et ne jamais fabriquer la suite.

- **Convention exacte** : offset en **points de code Unicode**, indexé à partir de zéro, frontière comprise entre `0` et la longueur Unicode du segment. JavaScript indexe nativement en UTF-16 : employer `Array.from(texte)`, jamais `slice`/`splice` directement sur la chaîne avec l'offset Supabase.
- **Un seul module pur** : `app/lib/appelsNotesStructurees.ts`. `projeterAppelsNotesStructurees` insère de la fin vers le début, ordonne les appels qui partagent une frontière, ne duplique pas un marqueur ancien déjà matériel et ne touche jamais la donnée canonique.
- **Deux textes dans `SegData`** : `texte` reste canonique et sert à l'édition admin, à la copie et au signalement ; `texteAffichage` porte la projection reconstruite. ⛔ Ne jamais envoyer `texteAffichage` dans un `update` Supabase.
- **Chargeurs obligatoires** : demander `marker`, `source_target` et `segment_offset_unicode` avec les ancres. Vérifier le champ `error` des QUATRE requêtes (`texte_notes`, `texte_note_ancres`, `texte_note_blocs`, `texte_note_relations`) ; une erreur n'est jamais convertie en dictionnaire vide.
- **Toujours paginer** ces quatre tables avec `chargerToutesPagesSupabase` et un ordre stable. Les *Confessions* dépassent déjà 1 000 lignes : une requête unique soumise au plafond PostgREST en perdrait silencieusement une partie.
- **Toutes les surfaces** : appliquer la projection au SSR de `app/oeuvre/[id]/page.tsx`, aux rechargements de niveau et d'apparat dans `OeuvreClient`, et aux traductions parallèles dans `ComparaisonTraductions`. Le moteur final reste `rendreTexteAvecNotes` / `renderSegmentTexte` : la projection ne recrée pas une seconde forme d'infobulle.
- **Contrôle d'intégrité** : un marqueur mal formé, une cible `segment_texte` sans offset, un offset hors limites, une note sans bloc ou une ancre sans note est une erreur à remonter. `source_target` désigne le champ cible : il ne vaut jamais `note_key`. Si `anchor_id` se termine par `:segment_texte`, `source_target` doit valoir `segment_texte`. `anchor_text_left` et `anchor_text_right` doivent correspondre exactement aux deux côtés de l'offset ; ils servent au contrôle contextuel et jamais à chercher approximativement une autre position.
- **Compatibilité** : les anciens corpus qui portent déjà `[[n]]` dans le texte doivent rendre exactement une fois l'appel. Tester début, milieu, fin, emoji/non-BMP, plusieurs appels au même offset, idempotence et données corrompues.
- **Publication et sécurité** : `needs_review` ne masque pas une note par lui-même. Les tables de notes sont actuellement lisibles par `authenticated`, pas par `anon`; les `GRANT` et la RLS sont deux verrous distincts. ⛔ Ne pas ouvrir `anon` pour réparer un rendu sans décision explicite sur l'accès public.
- **Correction d'un lot importé fautif** : ne rien écrire tant que le nombre de notes continue de croître. Sur un instantané stable, sélectionner seulement les ancres dont `source_target = note_key` et dont `anchor_id` annonce `:segment_texte`; vérifier note, marqueur, bloc, segment, offset et phrase témoin ; sauvegarder les lignes complètes ; remplacer la cible par `segment_texte` et reconstruire les deux contextes à longueur constante ; relire chaque ligne. Une phrase témoin qui ne diffère que par la casse est recopiée depuis le segment, sans déplacer l'offset. Ne jamais changer le latin ni passer `validated_human` à vrai pendant cette réparation structurelle. En revanche, si l'audit séparé prouve qu'un bloc non validé a été importé avec `needs_review = false`, le remettre à `true` : c'est un signal de prudence, pas une validation.
- **Clôture d'import** : avant d'affirmer la complétude, contrôler les divisions couvertes et renseigner l'empreinte de la source structurée (`oeuvre_textes.notes_json_sha256` ou métadonnée équivalente). Une numérotation continue ne prouve que la continuité du lot importé. Un lot encore croissant n'est pas un état final.

# Appels de note — masqués au sommaire, actifs dans les titres (2026-08-16)

Doctrine : charte `parametres.charte_ia` **§13.7**. Tout le rendu des appels vit dans **`app/oeuvre/[id]/appelNote.tsx`** (info-bulle, `rendreTexteAvecNotes`, `rendreTitreColophonAvecNotes`, `preparerTitreColophon`, `titreSansAppelsDeNote`, `notesPourTexte`), extrait d'`OeuvreClient` pour que **`PageTitre` puisse l'importer sans cycle** — `OeuvreClient` importe `PageTitre`, l'inverse aurait bouclé.

- **Sommaire : `titreSansAppelsDeNote` sur TOUS les intitulés** (niveaux 1 à 3, chapeaux compris, sommaire des traductions parallèles inclus), et sur la barre de division de la comparaison, dont les intitulés viennent des segments de la traduction de référence sans leur banque de notes. Auparavant seuls les chapeaux de niveau 1 étaient nettoyés : « Livre cinquième[[81]] » s'affichait avec ses crochets. La regex emporte l'espace qui précède (`[ \t]*`, jamais `\s*`, sinon un appel en tête de ligne avalerait le retour du chapeau à deux lignes).
- **Corps : `variante` de l'appel** — `corps` (prose, chapeaux, titres de niveaux 3-4 : brun `#8a6a3e`, `0.60em`), `titre` (niveaux 1-2 : `currentColor` à 55 %, `0.42em`), `frontispice` (page de titre : `0.30em`). L'appel hérite `font-family` et le corps de son contexte. ⛔ **Il n'hérite PAS `font-style` : un appel de note est toujours en ROMAIN**, sur quelque page que ce soit, quoi que fasse le texte autour de lui (règle d'auteur du 2026-08-28, charte § 13.7). Un chapeau, un titre original, un sous-titre d'essai sont en italique ; l'appel qu'ils portent reste droit. ⚠️ La règle d'avant disait l'inverse et interdisait `fontStyle: 'normal'` : elle est abolie, `styleAppelNote` pose désormais `normal`. Le séparateur d'une suite d'appels le suit, y compris celui du panneau patristique, qui a sa propre écriture, et l'exposant de l'export PDF d'un essai, dont les sous-titres sont en italique. ⛔ **L'EXPOSANT est lui aussi dans le style**, et non dans la seule balise `<sup>` : le séparateur d'une suite est un `<span>` dans le paratexte biblique, il restait donc sur la ligne de base quand les appels qu'il sépare étaient remontés, l'esperluette de « 2 & 3 » en bas. Mesuré au navigateur : 0 px d'écart désormais, contre 5,2 à 8,3 selon le corps. ⛔ **Et cet exposant n'est PAS `vertical-align: super`** (2026-08-28) : le navigateur monte alors l'appel à 0,41 em au-dessus de la ligne de base, et le chiffre flotte au-dessus des hampes. `styleAppelNote` pose donc `verticalAlign: 'baseline'`, `position: 'relative'` et un `top` calculé — `REMONTEE_APPEL = 0.31`, en em du TEXTE PORTEUR, divisé par la taille de la variante, parce que `top` se compte en em de l'appel. C'est la hauteur exacte de l'ordinal des siècles (`siecles.tsx`, `HistoricalDate.tsx`) : un « XIIIᵉ » et un appel se lisent à la même hauteur dans la même ligne. Un décalage maîtrisé ne gonfle pas l'interligne, contrairement à `super` (charte § 13.7).
- ⛔ **JAMAIS de pointillé sous un appel de note**, ni aucun autre soulignement, nulle part. Règle d'auteur, sans exception ni cas particulier : l'exposant et la teinte suffisent à le signaler. `styleAppelNote()` est la SEULE définition de cette forme, et `ComparaisonTraductions` s'en sert aussi — ne pas recomposer un style d'appel ailleurs.
- ⛔ **Un appel ne se sépare JAMAIS du point qui le suit**, ni du mot qui le précède. L'appel est un `inline-block` : le navigateur y voit une occasion de couper la ligne, en aval comme en amont, et le point final tombait seul en tête de la ligne suivante. `rendreTexteAvecNotes` l'enveloppe donc dans un `white-space: nowrap` qui emporte le dernier mot d'avant et la ponctuation d'après (`lireSuiteAppels`, `detacherDernierMot`, testées).
- **Deux notes qui se suivent s'écrivent « 2 & 3 »**, esperluette entre deux insécables (deux exposants collés se liraient « vingt-trois ») ; au delà de deux, « 2, 3 & 4 ». Les espaces du séparateur sont insécables à dessein : une espace ordinaire en tête ou en queue d'un `inline-block` est supprimée par le navigateur. Les TROIS surfaces qui rendent des appels suivent la règle — page de lecture, `PanneauPatristique`, `ComparaisonTraductions`.
- ⚠️ **La note d'un titre n'est pas toujours sur le premier segment du groupe.** Dans les imports à notes structurées, `texte_note_ancres.segment_key` tombe quelques segments plus loin (Discours sur la Genèse : l'appel du chapeau du « Premier discours » est ancré au 8ᵉ segment, pas au 1ᵉʳ). D'où `notesSection` (banque memoïsée de `segments` + `segmentsApparat`) et `notesDuTitre(textes, locales)`, qui cherche dans la section entière à défaut du groupe. Sans cela, l'appel s'affichait mais ouvrait une note vide.
- `rendreTexteAvecNotes` reconnaît désormais les **`++petites capitales++`** comme `rendreTexteEnrichi` (ajoutées en FIN d'alternance pour ne pas renuméroter les groupes de capture) : la page de titre passe par ce moteur et y aurait perdu la petite capitale.
- Logique pure testée : `app/oeuvre/[id]/appelNote.test.ts`.

# Apparat critique — un rendu à part, et strictement neutre (2026-08-25)

L'apparat d'une édition savante n'est pas une note de prose. Tout ce qui le
concerne vit dans **`app/lib/apparatCritique.ts`** (module pur, 16 tests) et dans
**`app/oeuvre/[id]/ApparatCritique.tsx`** (composant pur, 17 tests). Les deux sont
écrits pour TOUTE édition critique du corpus : rien n'y connaît les Confessions ni
Knöll.

⛔ **La bifurcation tient à `metadata.editorial_role`, JAMAIS à `kind`.** `commentary`
couvre aussi bien les 7 266 entrées de l'apparat de Knöll que la note de prose d'un
traducteur du XIXe siècle, et c'est la seule valeur que prennent les six `kind` du
schéma pour cet apparat. `estNoteApparatCritique` exige en outre que **TOUS** les blocs
de la note en relèvent : une note mixte reste au rendu ordinaire, qui seul sait composer
les blocs rattachés. Au 2026-08-25, un seul texte porte ce rôle (`A0010O0001T0001`), et
les 33 autres textes à notes structurées ne le portent pas du tout.

⛔ **Un bloc d'apparat ne passe NI par `normaliserTypographieLecture`, NI par
`terminerNote`.** C'est la règle centrale, et elle se mesure : 3 596 entrées portent une
haute ponctuation, à qui la première glissait une fine insécable (« B; est] » devenait
« B ; est] ») ; **6 604 ne se terminent par aucune ponctuation forte**, et la seconde leur
ajoutait un point que l'éditeur n'a pas écrit (« om. F » devenait « om. F. »). Une notation
critique se rend telle quelle : aucune correction d'OCR, aucun astérisque retiré, aucune
abréviation développée, aucun sigle normalisé, aucune ponctuation recomposée.

⛔ **Le numéro de ligne imprimée quitte le texte lu, et lui seul.** La transcription a
laissé en tête de 7 265 blocs sur 7 266 le numéro de ligne de Knöll, que
`metadata.printed_line` porte déjà. `retirerLigneImprimee` ne l’ôte que si le texte
s'ouvre EXACTEMENT sur l'écriture décimale de `printed_line`, suivie d'UN séparateur
(espace, insécable ou fine), lui-même suivi d'autre chose qu'un blanc. « 13 uirtus » avec
`printed_line = 3` reste intact : la ligne annoncée n’est pas celle qui est écrite, et un
renderer n'a pas à trancher. ⚠️ Ne jamais élargir la règle à « un nombre en tête » : la
souscription du livre II (note 776) ne s'ouvre pas sur sa ligne et doit rester entière.

⚠️ **Le numéro de ligne ne PARAÎT nulle part dans la lecture** — pas de badge « l. 3 »,
pas de préfixe. Il reste disponible en métadonnée du document (`data-printed-line`), avec
l'état de collation (`data-needs-review`, `data-human-validated`, `data-controle-visuel`).
⛔ Ces attributs sont un REPORT, jamais une décision : `needs_review` et `human_validated`
sont lus et ne sont jamais écrits depuis le rendu.

⚠️ **La RAISON du contrôle visuel n'est pas publiée**, seul le fait qu'un contrôle soit
demandé l'est. Les 148 raisons sont des notes d'atelier (« lecture OCR “terminfls” à
contrôler sur le fac-similé »), et le DOM public n’est pas un carnet de travail.

⛔ **Le composant reste PUR : aucun contexte, aucun accès au compte.** Une première
version affichait la mention d'administration en lisant `useCompte`, ce qui tirait le
client Supabase du navigateur dans un composant jusque-là rendu par `renderToStaticMarkup` :
le module levait à l'import, et toute la suite de tests des notes tombait avec lui. Un
renderer de note ne prend pas de dépendance sur la session ; l'administration lit les
attributs `data-`.

**Ce que le lecteur voit qu'il n'a pas vu avant** : l'en-tête de l'infobulle dit « Apparat
critique N » au lieu de « Note N » (`appelNote.tsx` et `ComparaisonTraductions.tsx`, la
même règle des deux côtés). C'est le seul ajout, et il vit dans le CHROME de la bulle,
jamais dans le texte de la note.

**Chargement** : les deux chargeurs de notes prennent `metadata` dans leur `select` et le
projettent aussitôt par `lireMetadonneesBlocNote` sur quatre scalaires. ⛔ Ne jamais
passer le `jsonb` entier au client : il porte `pdf_page`, `apparatus_editor` et le reste,
pour 7 266 blocs.

⚠️ **Contrôle sans session** : le site étant fermé, la planche de contrôle se fabrique
avec le composant RÉEL et des entrées réelles (`tmp/planche-apparat-critique.tsx`), selon
la méthode déjà consignée plus haut pour les questions de mise en page.

## Le SOMMAIRE de l'édition — les pièces liminaires (2026-08-27)

Doctrine : charte `parametres.charte_ia`, **§ 35.14**. Ce qui dépasse le livre — page de titre, quinze notices « Du même auteur », deux imprimatur, dédicace, avant-propos, tableau de transcription, abréviations, introduction générale, introduction du Testament et du groupe de livres — ne se lit plus dans le fil d'un chapitre, mais par un onglet « Sommaire » du volet de gauche. Soixante-deux blocs pour le tome I, tous rattachés à `GEN`, tous imprimés avant le premier verset de la Bible jusqu'à cette date.

- **Le critère est la PORTÉE**, jamais une liste d'intitulés : `estPieceGenerale` retient `bible`, `testament`, `book_group`. ⛔ `blocSansAncreVisibleDansChapitre` (`bibleEdition.ts`) ne rend donc plus `true` que pour `book` : c'est le seul point qui décide qu'un liminaire paraît en tête d'un chapitre, et son test dit les deux moitiés de la règle.
- **Le groupement en pièces vit dans `app/lib/bibleSommaireEdition.ts`** (module PUR, 11 tests sur les intitulés réels). Deux blocs consécutifs font une pièce quand ils partagent leur portée ET leur nom (`nomDePiece`, ce qui précède le tiret), ou quand le second est un apparat portant la MÊME `printed_page_start` que le premier — c'est ainsi que trente-trois « Apparat de la page N » rejoignent l'introduction générale. Douze entrées pour soixante-deux blocs. ⚠️ Le nom se compare à celui de la PIÈCE, non à celui du bloc précédent : un apparat s'intercale entre deux pages d'une même pièce et romprait la chaîne.
- **`intituleDansPiece`** retire l'intitulé d'un bloc qui redit le nom de la pièce, et ne garde la queue que lorsqu'elle titre vraiment (« § I. Ce qu'est la Bible » reste, « page IX » et « notice 3 » s'en vont).
- **Deux chargeurs, dans `bibleEditionServer.ts`** : `chargerLiminairesEdition` (une requête, dans la MÊME vague que les versets, donc sans aller-retour de plus) et `chargerPieceLiminaire` (le texte de la seule pièce demandée). ⚠️ `BibleEditionBodyBlockRow` a gagné `scope_label` et `printed_page_start`, que la vue exposait déjà.
- **L'adresse porte `?piece=<block_key>`** (`urlLectureBible`). ⛔ Elle ne voyage PAS d'un chapitre à l'autre : c'est une cible, non une manière de lire. Le livre et le chapitre restent dans l'URL pour que le retour ramène à sa place.
- ⚠️ **`composerAffichage`** (`app/page.tsx`) est la transformation payload → affichage, désormais partagée par l'appareil d'un chapitre et par une pièce. Une seule écriture : c'est la règle déjà consignée pour les colonnes de `segments`.
- **L'onglet ne paraît que si le sommaire n'est pas vide** (`NavLivres`, `sommaireEdition`), et il remplace la recherche et la liste des livres.
- ✅ **La collision de « Sommaire » est ARBITRÉE (2026-08-28).** Sur téléphone, la page portait « Sommaire | Texte | Commentaires », et dans ce que cet onglet ouvre se trouve « Livres | Sommaire » : deux barres empilées, le même mot sur les deux, pour deux choses différentes dont l'une contient l'autre. ⛔ C'est la barre de la PAGE qui nommait mal — son onglet ouvre le volet des LIVRES, non un sommaire. Elle dit donc **« Livres | Texte | Commentaires »** (`BibleLayout`), et la barre intérieure garde « Sommaire », qui est juste là où il est. Les trois libellés y gagnent leur parallèle : tous trois nomment un CONTENU, quand « Sommaire » nommait un dispositif. ⚠️ « Livres » paraît deux fois, mais imbriqué et dans le même sens : le premier dit où l'on est, le second ce qu'on y montre.
- ⛔ **La barre intérieure n'a AUCUN fond.** Elle portait `--cs-fond` quand le volet est en `--cs-fond-clair` : mesuré, l'écart vaut 1,03 au Clair et ne se voit pas, mais **1,08 en Cuir**, où la barre devenait une bande sombre en travers du volet. Un filet la sépare déjà de ce qu'elle commande ; un second sol par-dessus est un objet que rien ne demande.


### Sa mise en forme est celle du sommaire d'une ŒUVRE (2026-08-28)

Décision de l'auteur. Le sommaire vit désormais dans **`app/components/SommaireEdition.tsx`**, sorti de `NavLivres`, et prend la composition du sommaire d'`OeuvreClient` : c'est le même objet, la table des matières d'un livre, et il n'avait pas à se présenter de deux façons. ⛔ Le sérif sur pastille verte qu'il portait venait de la liste des LIVRES, laquelle n'est pas une table des matières mais un index.

- ⚠️ **Les rangs s'apparient par la FONCTION, non par la profondeur.** La pièce est ce qu'on ouvre : elle prend le rang du NIVEAU 1 du sommaire d'une œuvre (0,71875 rem, `--cs-texte`, vert et demi-gras quand elle est ouverte). La portée ne s'ouvre pas, elle coiffe : elle prend le rang des rubriques du volet d'une œuvre (« Apparat critique », « Sommaire »), en 0,5625 rem espacé et `--cs-texte-faible`. Le premier essai les avait pris pour un niveau 1 et un niveau 2 ; les pièces, seul contenu de l'onglet, s'y lisaient comme des sous-entrées d'une rubrique qui n'existe pas.
- **Composant à part, et non un fragment de `NavLivres`** : il ne connaît ni la navigation ni l'adresse d'une pièce, seulement un `onOuvrir(cle)`. C'est ce qui permet à `tmp/planche-sommaire-bible.tsx` de le rendre hors session, l'ancien dessin en regard du nouveau.

### ⛔ La barre « Livres | Sommaire » vient du MODÈLE COMMUN (2026-08-28)

Les deux libellés étaient composés à la main, en **capitales espacées** : deux mots criés en tête d'un volet de lecture, quand aucune autre barre du site n'en porte. L'auteur les a refusés. La barre passe à **`OngletsPage`** (`.cs-onglets` dans globals.css), qui donne le sans du site à 0,71875 rem, la casse ordinaire, le filet séparateur, le trait vert sous l'onglet retenu, et la largeur réservée d'avance en graisse 600 pour que retenir un onglet ne déplace jamais son voisin.

⚠️ C'était la SIXIÈME barre d'onglets du site à être recomposée en styles en ligne, ce que l'en-tête d'`OngletsPage` proscrit depuis sa création. La règle vaut pour toute barre à venir : on prend le modèle, on ne le redessine pas.

⚠️ **La liste des LIVRES, elle, garde ses capitales** (« Ancien Testament », « Nouveau Testament », « Écrits non canoniques »), faute d'une décision : ce sont des rubriques de l'index, pas des onglets, et l'auteur n'a nommé que la barre.

### ⛔ « Du même auteur » se compose depuis les CHAMPS, non depuis une notice précomposée (2026-08-28)

Doctrine : charte **§ 35.6.1**, refondu ce jour. Règles de code :

- **Un module pur, `app/lib/bibleBibliographieOuvrages.ts`** (19 tests, plus 10 sur le rendu) : `grouperBibliographiesParPiece`, `bibliographieDesBlocs`, `segmentsReference`, `texteReference`. ⛔ Ne recomposer une référence nulle part ailleurs, et ne jamais y ajouter de découpe d'un ancien texte de lecture : ce qui n'est pas dans un champ n'est pas affiché.
- **La lecture passe par `v_bible_editorial_bibliography_entries`**, qui réunit déjà les quatre tables et **coalesce l'éditeur sur `editeurs_valeur.nom`**. ⛔ Ne pas recoder ici un dictionnaire d'éditeurs, ni une expression régulière pour décider d'un nom : c'est la vue qui apparie l'autorité. Chargeur : `chargerBibliographiesEdition` (`bibleEditionServer.ts`), qui ne part **que si une pièce est demandée**.
- ⛔ **La pièce ne se reconnaît pas à son titre passé au tamis d'une translittération.** Chaque entrée désigne le bloc matériel dont elle est issue (`source_body_block_id`), et `bibliographieDesBlocs` apparie les blocs de la pièce à cette appartenance. Un titre slugifié serait une heuristique de plus, sur une donnée qui porte déjà le lien. ⚠️ La pièce prend ensuite TOUTES les entrées de sa clé, y compris celles qu'aucun bloc ne porte : une bibliographie tronquée sans que rien ne le signale serait pire qu'une bibliographie absente.
- **`ouvrage_id` est l'identité**, donc la clé React (`key={ouvrage.id}`) et l'ancre (`id="ouvrage-<id>"`). ⛔ Jamais le rang du tableau.
- ⛔ **L'ORDRE se calcule, il ne se lit plus dans `display_order`** (charte § 35.6.3, 2026-08-28). `comparerOuvrages` range par vedette — nom de famille de l'auteur, ou titre pour une œuvre anonyme, qui se file DANS la même suite et non dans un bloc à part —, puis par prénom, titre, sous-titre, année, et enfin par rang imprimé. Les clés passent par `replier` (NFD, accents ôtés, bas de casse, apostrophe et trait d'union rendus à l'espace) puis, pour un titre seulement, par `clefDeTitre`, qui retire l'article ou le déterminant initial. ⚠️ Deux gardes à ne pas défaire : **le titre AFFICHÉ garde son article** — le retrait ne vaut que pour la clé — et **`ARTICLES_ET_DETERMINANTS` exclut à dessein `a`, `de`, `in`, `ex`, `ad`, `pro`, `una`, `uno`**, qui sont des mots LATINS : « A solis ortus cardine » se range à A, « De civitate Dei » à D. ⚠️ `display_order` sert encore à dédoublonner de façon stable (la première occurrence imprimée l'emporte) et à départager à égalité parfaite. ⛔ Ne pas s'en servir comme repère dans un test : `ouvrageDuRang` dit le rang IMPRIMÉ, `ouvrages[0]` ne dit plus rien.
- **La ponctuation vient du RENDU.** `segmentsReference` rend des fragments typés — `champ` (la colonne d'origine, `null` pour la ponctuation), `style` (la fonction bibliographique, `null` pour la ponctuation) et `composition` (`romain`, `italique`, `petites-capitales`) —, et `BibliographieOuvrages.tsx` ne fait que les baliser. ⚠️ Le `data-champ` posé sur chaque fragment n'est pas un ornement : c'est par lui que les tests vérifient qu'un titre et son sous-titre n'ont pas été fondus, et qu'aucune donnée matérielle n'est passée.
- ⛔ **Ou la liste structurée, ou le repli matériel, jamais un mélange.** `PieceLiminaire` compose les blocs quand `bibliographie` est vide, et eux seuls sinon. Les quinze blocs restent en base pour la provenance et le témoin source.
- **Le composant reste GÉNÉRIQUE** : c'est `auteurPorteParLeTitreDeLaPiece` — une liste NOMMÉE, non une devinette — qui dit que « du-meme-auteur » établit déjà son auteur commun. Ailleurs, le nom paraît, nom de famille en petites capitales tiré de `auteurs_valeur.nom_famille`, ⛔ jamais par découpe de la chaîne affichée.
- ⚠️ **Le joint titre / sous-titre a changé TROIS fois le 28 août 2026** : virgule, puis deux-points avec son insécable, puis **point** — `LIAISON_SOUS_TITRE = '. '`. C'est le point qui tient : un sous-titre EST un sous-titre, non une apposition. Il reste dans la séquence italique, et ⚠️ un titre déjà clos sur une ponctuation forte ne reçoit qu'une espace (`PONCTUATION_FORTE`), jamais un second point. ⛔ Ne pas réintroduire l'insécable ici — et partout où l'on en pose une, ⚠️ **l'écrire en ÉCHAPPEMENT** (`'\u00A0'`), jamais la taper : le dépôt a déjà perdu des fines de cette façon (voir `typographie.ts`).
- **Témoin partagé** : `app/lib/bibleBibliographieOuvrages.fixture.ts`, les quinze lignes recopiées de la base, sous-titres longs compris — c'est sur eux que se vérifie l'absence de toute description matérielle. Modèle de `couleursEnDurInventaire.ts` : donnée rédigée, employée par les tests, appelée par aucune page.

### ⛔ Un SEUL style bibliographique pour tout l'apparat (2026-08-28)

Doctrine : charte **§ 35.6.2**. Une seule famille sert « Du même auteur », toute pièce ou section « Bibliographie », et tout bloc que la donnée déclare bibliographique. Règles de code :

- **La famille se déclare UNE fois**, dans `app/lib/apparatBibliographie.ts` : `cs-apparat-bibliographie` (le bloc), `__liste`, `__entree`, `__auteur`, `__nom-auteur`, `__titre-ouvrage`, `__sous-titre`, `__donnees`, plus le seul modificateur `--sans-hote`. ⛔ Ne pas réécrire ces chaînes dans un composant : deux copies d'une famille divergent au premier ajout, et c'est précisément ce qui était arrivé — `.cs-bible-bibliographie` et `.cs-bibliographie-ouvrages` disaient la même chose de deux manières.
- ⛔ **Un rôle de caractère se pend AU BLOC, jamais à sa seule classe** : `.cs-apparat-bibliographie .cs-apparat-bibliographie__titre-ouvrage`, et non `.cs-apparat-bibliographie__titre-ouvrage`. Mesuré le 2026-08-28 en retirant chaque classe dans le navigateur : quatre des cinq ne changeaient RIEN, l'italique tenant par le `<em>` et le romain par le `<span>` — la feuille déclarait ce qu'elle ne décidait pas. Et sous une règle d'ambiance visant la balise (`.cs-notice-italique em`, spécificité (0,1,1)), le titre sortait en romain avec la classe comme sans elle. Le sélecteur à deux classes (0,2,0) l'emporte, et chaque rôle déclare désormais `font-style` ET `font-variant-caps` — ⚠️ `font-variant-caps` et non le raccourci `font-variant`, qui remettrait à zéro les chiffres elzéviriens d'un bloc de titre. Garde dans `apparatBibliographie.test.tsx`.
- **Le vocabulaire des styles de caractère est CLOS** (`STYLES_CARACTERE_BIBLIOGRAPHIE`) et porté par chaque fragment : `segmentsReference` rend `champ` (la colonne d'origine), `style` (la fonction bibliographique) et `composition` (romain, italique, petites capitales). ⛔ La ponctuation a `champ: null` ET `style: null` : elle n'a pas de classe, elle hérite de la séquence où elle tombe — d'où le deux-points du sous-titre, qui reste dans l'italique du titre.
- ⛔ **Aucune classe ne porte le nom d'une pièce, d'une édition ou d'un auteur.** « Du même auteur » nomme une pièce, pas une composition. Ce que la pièce établit — l'auteur commun, qu'on ne redit pas à chaque notice — passe par `auteurPorteParLeTitreDeLaPiece` et la CLÉ de la pièce, ⛔ jamais par son intitulé.
- ⛔ **`--sans-hote` ne veut pas dire « lue seule », mais « aucun ANCÊTRE ne porte la composition ».** La base descend d'un cran sous son hôte (`font-size: 0.96em`), ce qui suppose un ancêtre qui pose ce corps. La fenêtre d'une note le fait, sur son conteneur : elle se passe du modificateur, et le cran relatif y joue seul. ⚠️ **Un bloc d'apparat, lui, pose corps, police et encre sur ses PARAGRAPHES, en style inline** — et seuls `--notice`, `--excursus` et `--note` en portent un sur l'enveloppe. La bibliographie n'étant pas l'enfant de ces paragraphes mais leur sœur, son `em` se calculait sur la PAGE : mesurée dans un bloc `commentary`, elle sortait à 15,36 px contre 12,5 px pour le texte qu'elle accompagne — plus grosse, quand la règle la veut plus petite. `rendreBlocTexte` passe donc toujours `sansHote`, et une pièce liminaire aussi. Le modificateur pose 0,75 rem (le même cran appliqué au corps de l'apparat), la police sérif et l'encre `--cs-texte-second`. ⚠️ Il DOIT rester déclaré après la base : même spécificité, c'est l'ordre qui tranche, et le test le vérifie.
- **Le retrait est SUSPENDU**, non de première ligne : `padding-left` positif et `text-indent` de même valeur, négatif. Sous 700 px il se réduit (1,1 em → 0,7 em) ; ⛔ il ne disparaît pas, et le corps ne bouge pas.
- **Le repli historique garde le cadre.** `rendreBlocTexte` envoie à `BibliographieBible` dès que la donnée déclare `bibliographie` et que le bloc porte quelque chose ; sans marqueur d'entrée, la liste devient un paragraphe DANS la famille, au lieu de retomber en paragraphe d'apparat justifié. ⛔ Aucun parsing pour en tirer titre, auteur ou éditeur.
- **Garde : `app/components/apparatBibliographie.test.tsx`** (8 tests). Il lit `app/globals.css` et vérifie que la feuille ne fabrique ni puce ni tiret (aucun `::before`, aucun `content:`, aucun fond, aucune bordure), que le retrait suspendu existe des deux côtés de la requête média, et que les deux chemins de rendu ne portent aucune classe hors de la famille déclarée.

## L'intitulé d'une introduction de livre (2026-08-27)

Doctrine : charte **§ 35.13**. `introduction_livre` déclare désormais `heading_role: 'title'` et `heading_level: 'T2'` dans `work/fillion/semantic_display_hierarchy.json` : le rendu passe par la branche « cas mixte » de `BlocEditorialBible`, et l'intitulé prend la composition de « Première partie ». Le chapeau (`.cs-bible-chapeau`) reçoit sous les trois rangs HAUTS la composition du sous-titre de partie ; il garde le gris de l'apparat sous les rangs bas.

⛔ **`diviserIntitule` prend une option `genreEnTitre`**, posée sur les blocs de portée haute (`resolu.level === 'I1'`) : le GENRE remonte en titre quand il ferme l'intitulé, l'ordre imprimé tient quand il l'ouvre. La liste des genres est CLOSE. ⚠️ La règle ne porte pas sur la position : Fillion écrit « Évangile selon saint Matthieu — Introduction » et « Introduction — 1° La personne de l'auteur » dans le même livre.

## La manchette se ferre à gauche, et le texte s'écarte de son apparat (2026-08-27)

Doctrine : charte **§ 35.9 (rectifié)** et **§ 35.12**. Dans `globals.css` : `.cs-bible-info-label` d'un commentaire passe en `text-align: left` et en sérif ; `.verset-row + .cs-bible-bloc:not(.cs-bible-block--title)` et son symétrique en `:has(+ .verset-row)` portent le blanc de 2rem qui cerne un bloc de versets. ⚠️ Les marges verticales adjacentes fusionnent : la marge du verset n'est pas à retrancher.

# Propositions de GPT — le registre d’arbitrage (2026-08-25)

`/admin/propositions-gpt`. GPT propose, l’auteur arbitre, et ce que l’auteur écrit là
commande la mise en œuvre. La page réunit les deux faces : ce que GPT demande, et la
directive qui y répond.

⛔ **RIEN NE S'ENREGISTRE TOUT SEUL, et le premier jet avait tort.** Il posait une zone
de texte par proposition, enregistrée à la frappe : sans bouton, on ne sait jamais si
l'on a écrit ou seulement pensé, et l'auteur l'a relevé le jour même. Une directive se
pose désormais par un geste : on écrit, on clique « Ajouter l’instruction », et elle
rejoint la liste. Ctrl + Entrée fait le même office.

⛔ **Le registre porte DEUX VOIX, et elles ne se mêlent jamais** : `Directive.instructions`
est celle de l’auteur du site, qui commande ; `Directive.reponses` est celle de GPT, qui
éclaire. Elles paraissent en deux colonnes, nommées, séparées par un filet, et l’ordre ne
change pas d’un point à l’autre. La voix de GPT ne se distingue jamais par la seule couleur.

⚠️ **GPT n’a pas accès au site**, et sa colonne serait un champ que rien ne remplit sans le
passage de main : le bouton « Copier pour GPT » met dans le presse-papiers la proposition,
la mesure, le conflit, l’entrée réelle et les instructions déjà posées. ⛔ `texteAPorterAGpt`
n’emporte JAMAIS les réponses de GPT, et un test le vérifie : on ne relit pas à quelqu’un ses
propres mots. Les réponses se collent ensuite dans la colonne, à la main.

⚠️ Le filtre **« Attendent GPT »** isole les points instruits et sans réponse : c’est là que
le dialogue est en suspens. `avancement` compte `reponses` et `attendGpt` à part.

**Les instructions S'EMPILENT**, elles ne se remplacent pas : `Directive.instructions`
est un tableau, chaque entrée datée PAR LA ROUTE et supprimable. C'est un journal, et
l'on doit pouvoir relire comment une décision s'est formée. ⚠️ La date se pose côté
serveur, jamais côté client : une consigne ne s'antidate pas, et une liste renvoyée
entière à chaque ajout se redaterait tout entière.

⚠️ **La suppression se fait en DEUX temps**, le bouton s’armant au premier clic. Une
instruction est du texte que l'auteur a écrit ; et le bouton reste VISIBLE au repos,
une action qui ne paraît qu'au survol étant hors d'atteinte au doigt.

⛔ **Chaque proposition porte son AVANT-APRÈS, sur une entrée RÉELLE**, en trois états :
l’entrée telle qu’elle est en base, ce que le site en rend aujourd’hui, ce que la consigne
produirait. ⚠️ **L’état « aujourd’hui » est CALCULÉ** par `texteApparatAffiche`, le renderer
que le site emploie vraiment, jamais recopié à la main : une planche de comparaison dont la
colonne de gauche serait écrite de mémoire ne prouverait rien et se démentirait au premier
changement du rendu. L’état « avec la consigne » est une application LITTÉRALE, et `reserve`
nomme là où la consigne bute au lieu de combler le trou. C’est ce qui a fait paraître, sans
qu’on les cherche, que l’exemple phare de GPT emploie une forme qui ne paraît que trois fois
sur 7 266, qu’il prettifie un sigle que la base écrit autrement, et qu’il tronque l’entrée
qu’il cite.

⚠️ **Le rendu proposé se compose de FRAGMENTS typés** (`latin`, `sigle`, `gloss`), pour que
l’italique demandée se VOIE au lieu d’être décrite. Un exemple dont l’entrée ne vient pas de
cet apparat déclare `role` et `provenance` ; `roleExemple` rend l’apparat par défaut.

⛔ **Les propositions sont une SOURCE RÉDIGÉE**, dans `app/admin/propositions-gpt/registre.ts`,
comme l'inventaire des illustrations et pour la même raison : un relevé automatique rendrait
des phrases, jamais un arbitrage. Chaque entrée porte le texte de GPT dans SES termes, un fait
MESURÉ sur le corpus, et, s’il y a lieu, la consigne antérieure que la proposition heurte,
**citée des deux côtés**. `registre.test.ts` refuse un identifiant en double, un conflit
à un seul côté, un exemple sans après, et tient la liste des conflits sous garde.

⛔ **Le registre ne DÉCIDE rien.** Un drapeau `dejaEnPlace` constate ce que le dépôt sert
déjà ; ce n'est pas un arbitrage rendu, et la page ne coche aucun état d'elle-même.

⚠️ **`lireDirectives` relit encore la forme du premier jet** (`note` et `noteGenerale`,
une chaîne unique) et la reprend comme première instruction. Rien n'avait été écrit en
base au moment du changement, mais une lecture qui perd en silence ce qu'elle ne
reconnaît pas est une lecture dangereuse.

**Les directives vivent dans `parametres.directives_propositions_gpt`**, en JSON dans la
colonne `valeur`, qui est du TEXTE. C'est là qu'il faut aller les lire avant de mettre
une proposition en œuvre. ⚠️ Aucune migration : `parametres` existe déjà, et une clé de
plus ne coûte rien.

⚠️ **Un identifiant de proposition est une clé de stockage** : le renommer orpheline la
directive qui y pend. `lireDirectives` conserve l'orpheline sans la faire paraître, de
sorte qu'un renommage ne détruit rien, mais il fait disparaître la décision de l'écran.

⛔ **Un renommage se fait donc par la table `REPRISES`, à la LECTURE, jamais en base.**
Le lot est passé de dix-huit points à sept le 2026-08-25, cinq instructions étant déjà
posées : chaque ancien identifiant y désigne le point qui a absorbé le sien, et
`lireDirectives` fond les listes dans l'ordre où elles ont été écrites. ⚠️ Une réécriture
du paramètre aurait été irréversible et aurait fait perdre la trace de ce que l'auteur
avait répondu, et à quoi. Un test rejoue l'état réel d'avant le regroupement et vérifie
que les cinq instructions retombent sur le bon point.

⚠️ **Fondre deux points n'efface pas une décision** : un état déjà tranché l'emporte sur
« à arbitrer ». Et `heurts` est une LISTE : le point qui absorbe trois conflits les porte
tous les trois, cités des deux côtés, sans qu'aucun se perde.

⚠️ **Le bon grain, c'est la DÉCISION, pas la consigne.** Dix-huit points découpaient la
même décision en morceaux : refuser le parseur, c'est refuser du même coup le crochet
masqué, le « Texte : », la ligne par variante et l'italique, qui n'existent pas sans lui.
Les sept points suivent l'ordre des conséquences — ce qui commande, ce qu'il faut
trancher, ce qui en découle, ce qui est déjà tenu — et non l'ordre du texte reçu.

⚠️ **La page ne s'ouvre pas si la lecture du paramètre échoue**, et c'est délibéré : un
registre vierge servi sur une erreur de lecture ferait écrire l’auteur par-dessus ses
propres décisions. Même famille que « un panneau discret journalise son erreur ».

**Pour ajouter un lot** : une entrée de plus dans `LOTS`. La page, les filtres, les
compteurs et la garde suivent sans qu'on y touche.
# Une œuvre à plusieurs auteurs (2026-08-16)

Doctrine : charte `parametres.charte_ia` **§16.11**. Les auteurs sont **à égalité** ; l'œuvre paraît une fois sous le nom de chacun et porte les deux noms là où elle est nommée.

- **Modèle** : le PREMIER auteur reste `oeuvres.id_auteur` (les ~220 lectures qui s'y appuient sont inchangées), les suivants vivent dans **`oeuvres_auteurs`** (`rang` ≥ 2, PK `(id_oeuvre, id_auteur)`, trigger refusant un auteur déjà premier). La vue **`v_oeuvres_auteurs`** (security_invoker, donc soumise à la RLS de `oeuvres`) réconcilie les deux et **fait seule autorité** : ne jamais refaire cette union à la main.
- **Côté TS, tout passe par `app/lib/auteursOeuvre.ts`** (pur + testé `auteursOeuvre.test.ts`) : `chargerAuteursParOeuvre`, `chargerAuteursDOeuvre`, `libelleAuteurs` (« A et B », via `enumererNoms`), `separateurAuteurs` (quand chaque nom est rendu séparément, cliquable), `grouperOeuvresParAuteur` (dépose l'œuvre sur CHAQUE étagère). Le repli sur `oeuvres.id_auteur` est volontaire : si les couples ne se chargent pas, une œuvre ne doit pas disparaître de l'étagère.
- **Surfaces branchées** : bibliothèque (SSR + rechargement client + canal temps réel sur `oeuvres_auteurs`), fiche auteur (`ModaleAuteur`), page de lecture (frontispice, volet, « du même auteur », traductions sœurs, métadonnées SEO), admin (bloc « Auteurs » du formulaire « Modifier l'œuvre » + route `app/api/admin/oeuvre-auteurs`).
- **Pas encore branchées** (elles montrent le premier auteur seul) : recherche de la navbar, panneau patristique, prélèvements, quiz, page d'accueil, `SelecteurCitation`.

## ⚠️ Piège majeur : une table de liaison CASSE tous les `select` imbriqués PostgREST

⛔ Ajouter `oeuvres_auteurs` a créé une **deuxième relation** entre `auteurs` et `oeuvres` (la clé étrangère directe `oeuvres.id_auteur`, plus le nouveau many-to-many). PostgREST refuse alors TOUT embed `auteurs(...)` ou `oeuvres(...)` avec **PGRST201 — « Could not embed because more than one relationship was found »**, `data` nul.

Symptôme observé : l'admin Bibliothèque affichait « Aucun auteur trouvé » et le bandeau « Certaines données n'ont pas pu être chargées », alors que rien du chargement n'avait été touché.

**Règle** : dès qu'une table de liaison double une clé étrangère existante, **qualifier tous les embeds par le nom de la contrainte** — `auteurs!oeuvres_id_auteur_fkey(nom)`, `oeuvres!oeuvres_id_auteur_fkey(...)`. Corrigé dans `app/accueil`, `app/admin/page.tsx`, `SectionAjouterOeuvre`, `app/compte`, `SelecteurCitation`, `app/oeuvre/[id]/page.tsx`, `RechercheClient`. Vérification : `grep -rn "auteurs(\|oeuvres(" app/` ne doit plus rien renvoyer sans `!oeuvres_id_auteur_fkey`.

### La base est PARTAGÉE : une migration casse le site en ligne avant que le correctif ne soit déployé

⛔ Il n'y a qu'une base Supabase pour le poste de travail et pour le site en ligne. Créer `oeuvres_auteurs` a donc rendu ambigus, **à la seconde même**, les embeds du code **déjà déployé**, qui, lui, ne changeait pas. Le correctif restant en local, le site en ligne a servi pendant une nuit un « **Œuvre introuvable** » sur **toutes** les œuvres, alors que la même page était saine sur le serveur de développement. Le poste de travail ne pouvait pas voir la panne : c'est le décalage entre les deux qui la fabriquait.

**Règle** : une migration qui touche la forme des relations (table de liaison, clé étrangère, renommage, vue lue par le site) n'est appliquée qu'**une fois le correctif poussé**, ou bien elle est poussée dans la foulée, sans attendre le lendemain. Aucune séance ne se termine avec une migration en base et son correctif dans un commit non poussé.

⚠️ **Le site en ligne se déploie depuis `master`, pas depuis la branche de travail.** `confort-lecture` ne produit que des déploiements **Preview** : y pousser un correctif ne change rien à corpus-scriptura.fr. Les deux branches ont divergé (base commune du 2026-08-07), un correctif urgent se porte donc en petit commit ciblé **directement sur `master`**, jamais en fusionnant la branche de travail entière. Vérifier ce qui est réellement en ligne :

```
curl -s "https://api.github.com/repos/sqdvcontact-lgtm/bible-patristique/deployments?environment=Production&per_page=1"
```

**Repérer la panne** : `git status -sb` (« ahead N ») dit ce qui manque au site. Rejouer la requête telle que la sert le code EN LIGNE, pas le code local :

```
curl -s "$SUPABASE_URL/rest/v1/oeuvres?select=id_oeuvre,auteurs(nom)&limit=1" -H "apikey: $CLE" -H "Authorization: Bearer $CLE"
```

Un `PGRST201` (HTTP 300) répond de lui-même ; la clé `hint` nomme la qualification à écrire.

# Éditions bibliques commentées — famille Fillion (2026-08-20)

Le socle est **générique**, pas « fait pour Fillion » : une **famille éditoriale** (`bible_edition_families`) relie plusieurs traductions distinctes (`bible_edition_members`), et servira à toute autre édition bilingue ou apparentée. Pour Fillion, `TR0011` porte la Vulgate **telle qu’imprimée dans ses volumes** et `TR0010` son français. ⛔ **Ne jamais réutiliser `TR0004`** (Vulgate clémentine) comme Vulgate Fillion : ce sont deux témoins, pas deux vues d’un même texte.

## Clôture OCR d’un livre Fillion : nettoyage obligatoire

Quand l’OCR d’un livre est réellement terminé, exécuter la clôture `scripts/fillion/close-fillion-book-ocr.mjs`. « Terminé » comprend l’extraction, la structuration, la collation nécessaire, les contrôles aléatoires de lecture et l’absence de dépendance aval aux caches. Une passe Tesseract achevée ne suffit pas.

⛔ Ne supprimer que les répertoires explicitement déclarés dans le manifeste du livre et porteurs d’un marqueur `.fillion-ocr-disposable.json` concordant. Conserver les fac-similés, OCR bruts servant de témoin, résultats finaux, manifestes, rapports, empreintes, illustrations finales et preuves visuelles encore nécessaires. Jouer d’abord la simulation sans `--apply`, relire son rapport, puis appliquer. Le rapport final de suppression fait partie des preuves conservées du livre.

- **Les volumes ne sont pas uniformisés.** Les huit tomes viennent d'éditions et d'années différentes. Chaque volume est un `bible_edition_components` avec son année, sa mention d'édition, son éditeur et son empreinte de source. La notice affichée au lecteur nomme l'édition **de chaque volume**, sans laisser croire à une édition matérielle unique.
- **Cinq références coexistent, aucune n'écrase les autres** : la référence imprimée par Fillion, la numérotation native française, la numérotation native latine, la référence canonique interne, et l'alignement structurel. La référence canonique sert d'axe d'alignement ; elle ne remplace jamais la numérotation native, qui reste une donnée source.
- **Un commentaire n'est pas une note.** Une annotation attachée à un verset déterminé devient une **note de verset** (`bible_verse_notes`). Un développement de portée supérieure reste dans le **corps** (`bible_editorial_body_blocks`). ⛔ Ne jamais rattacher un commentaire de péricope, de section ou de chapitre à un seul verset pour le cacher dans une note. ⛔ Ne jamais verser l'apparat Fillion dans le champ libre `versets_v2.notes`.
- **Trois axes normalisés, un style dérivé.** Nature (`block_kind`), portée (`scope_kind`) et position (`placement`). Le style sémantique (`introduction_livre`, `commentaire_pericope`, `sommaire_chapitre`…) est **dérivé** par la vue et par `styleSemantiqueBloc`. Ne pas créer une table ni une énumération par combinaison. Le **sous-type de notice** (`notice_subtype` : historique, géographique, littéraire, doctrinal, chronologique, liturgique, apparat critique, bibliographie, sigles, tableau de transcription, matière éditoriale) qualifie la matière et non la place : il reste **hors des trois axes** et ne change pas le style dérivé. La base le refuse sur autre chose qu'une notice.
- **La reconnaissance automatique ne juge jamais sur le vocabulaire seul** : titre imprimé, typographie, mise en page, position matérielle, unité voisine et portée annoncée. Les cas douteux partent en validation humaine (`classification_confidence`, `requires_review`), ils ne se publient pas.
- **Exception de numérotation propre aux notes bibliques.** Le numéro **visible** d'une note recommence à chaque chapitre, pour rester lisible ; l'identifiant interne (`note_key`, uuid) demeure **global et stable**. C'est une exception assumée à la règle générale de numérotation continue des notes d'œuvre.
- **Une note peut appartenir au français, au latin, ou aux deux** (`applies_to` / `applies_to_member_id`). En lecture bilingue, les blocs communs à l'édition se rendent **pleine largeur**, avant ou après les deux colonnes ; ils ne sont jamais dupliqués dans chaque colonne.
- **Les références bibliques citées à l'intérieur des notes sont transcrites telles quelles.** Aucun lien biblique fabriqué automatiquement en première phase : le texte exact d'abord, la mise en lien seulement après vérification.
- **L'emplacement matériel d'une illustration est la donnée primaire** : tome, année, page, ordre, légende imprimée, fichier et empreinte. L'ancre sémantique (verset, péricope, chapitre, livre, introduction, commentaire, note) est **facultative et vérifiée humainement**, et elle ne remplace jamais l'emplacement matériel. Un ornement décoratif ne reçoit pas de portée exégétique. Le master PNG reste privé, seul le dérivé WebP validé est public, et une garde SQL refuse de publier une illustration sans ce dérivé.
- **Lecture « Latin-français » de la page Bible** (`?bilingue=1`). Elle ne passe pas par `TexteBible` : `BibleLayout` rend `LectureBilingueBible`, qui reprend le même châssis — en-tête, navigation de chapitre, zone de défilement — pour que le passage d'un mode à l'autre ne déplace rien à l'écran. Le corps est `BibleBilingue`, et toute la décision vit dans `app/lib/bibleEditionBilingue.ts`, module pur et testé.
  - **L'axe d'alignement est le créneau canonique, jamais la numérotation native.** Chaque colonne est chargée par le MÊME chemin que la lecture ordinaire (`chargerVersetsEditoriaux`), si bien qu'aucune synchronisation particulière n'a à être inventée : les deux colonnes portent les mêmes créneaux, dans le même ordre.
  - ⛔ **Un créneau qu'une édition ne porte pas reste VIDE.** Ni le texte de l'autre colonne, ni une traduction de fortune : la cellule est blanche, et le lecteur voit que l'édition s'arrête là. En revanche, un créneau qu'AUCUNE colonne ne porte ne fabrique pas de rangée vide.
  - **Le mode n'est offert que si la famille porte réellement deux membres** (`bilingueDisponible`), et l'entrée se détache des traductions par un filet dans le sélecteur : le bilingue n'est pas une traduction de plus, c'est une façon de lire les deux membres d'une même édition.
  - ⚠️ **Une note commune est appelée depuis les DEUX colonnes** : deux ancres du même `id` sur la page rendraient le retour de la note ambigu et le document invalide. D'où `ancreAppelNoteBible(noteId, memberId)` et la table `ancresRetour`, qui ramène la note à la première colonne qui l'appelle. Les notes des deux colonnes vont dans une **seule série** au bas du chapitre : un lecteur qui suit le latin et le français en regard ne doit pas chercher sa note dans deux listes.
  - **L'ordre des colonnes est une DONNÉE, jamais une constante du code** : `display_order`, `desktop_position` et `mobile_order` sur `bible_edition_members`. Pour Fillion, décision de l'auteur du 2026-08-20 : **français à gauche, latin à droite**, comme la page imprimée. Échanger deux membres demande des rangs temporaires, les deux ordres étant sous contrainte d'unicité.
  - **Le paratexte se compose comme le site, pas comme un encart.** Le corps prend la composition d'un verset de la page Bible — même police, même corps, même interligne, même justification — et les titres prennent les rangs de la page d'œuvre. Le rang n'est pas une taille par type de contenu : il vient de la PORTÉE du bloc (`rangTitreBloc`), si bien qu'une introduction de livre et son sommaire se composent ensemble. Le rang 1 reste sous le titre du chapitre, un paratexte ne prenant jamais le pas sur le nom de ce qu'on lit. Seuls une notice et un excursus gardent le filet de gauche des intertitres d'œuvre. ⛔ Pas de fond teinté ni d'encadré : un commentaire de Fillion n'est pas une alerte.
  - **Les étiquettes de colonne précèdent tout ce qui vit dans une colonne** : on doit savoir de quelle langue on lit avant de la lire. Ce qui est commun à l'édition les précède, n'appartenant à aucune des deux.
  - **Un contenu propre à un membre absent de la lecture n'est rendu nulle part** : le prêter à la famille le ferait paraître dans les deux colonnes.
  - ⛔ **Un bloc du corps IGNORE les colonnes** (décision de l'auteur, 2026-08-20). Commun à l'édition ou propre à une langue, il passe pleine largeur. Les introductions et commentaires de Fillion n'ont pas d'équivalent latin : les enfermer dans la colonne française laissait en face une colonne vide de leur hauteur. L'appartenance (`applies_to`) reste une donnée de PROVENANCE, elle n'est plus une consigne de mise en page.
  - **Les notes suivent le modèle du site : une fenêtre s'ouvre**, plus grande qu'ailleurs (460 × 420 contre 340 × 340 pour les œuvres) — une note de Fillion n'est pas une glose de trois mots. La forme de l'appel vient de `styleAppelNote`, seule définition du site ; ⛔ jamais de pointillé. La série au bas du chapitre subsiste : elle sert l'ancre, le repli sans script et les exports paginés.
  - ⛔ **La note d'un BLOC ÉDITORIAL s'ouvre elle aussi dans cette fenêtre** (2026-08-25). Introductions, commentaires et notices portent leur propre apparat : il s'imprimait au bas du développement, dans le corps même du texte, et l'appel n'était qu'un lien d'ancre qui y sautait. Le clic ouvre désormais la note, comme pour un verset — même exposant, même fenêtre, sur toute la page. ⚠️ La liste du bas ne disparaît pas pour autant : elle n'accueille plus que les notes dont la transcription n'a relevé AUCUN point d'appel (au 2026-08-25, les introductions de Marc, de Luc et de Jean, soit 144 des 207 notes internes ; celles de Matthieu et des Actes sont ancrées). Sans elle, ces notes seraient perdues. Le partage se calcule en rejouant `positionAppelDansTexte` sur les supports réellement rendus, jamais sur `anchorTarget` seul, qui vaut toujours `body` ou `heading`.
  - ⛔ **Un module « use client » ne prête pas ses fonctions au rendu SERVEUR**, il ne rend que des composants. Le paratexte biblique est rendu par `TexteBible` (client) mais AUSSI par `BibleBilingue` (serveur) : lui faire appeler `detacherDernierMot` depuis `app/oeuvre/[id]/appelNote.tsx` mettait la page en 500 — « Attempted to call detacherDernierMot() from the server ». D'où **`app/lib/appelsDeNote.ts`**, module NEUTRE qui porte la forme de l'appel, son séparateur et ce qui voyage avec lui ; la page d'œuvre le ré-exporte pour ses appelants historiques, tous clients. ⚠️ **Ni `tsc`, ni le linter, ni les 962 tests ne voient cette frontière** : elle n'existe qu'à l'exécution, sous Next. Une fonction partagée entre les deux mondes se met dans `app/lib/`, et l'on ouvre la page pour s'en assurer.
  - ⛔ **Aucun `text-transform` sur un titre biblique**, et surtout pas de capitales imposées. Les capitales de « PREMIÈRE PARTIE » viennent de l'ÉDITION ; celles que le rendu ajoutait à « 1° L'apparition… » écrasaient une casse que Fillion n'avait pas voulue. Pour marquer un rang sans crier, employer les **petites capitales vraies** (`font-variant-caps: small-caps`), qui préservent la casse de la source.
  - ⚠️ **Une introduction n'est pas une division, et ne se compose pas comme telle.** « Introduction » est le nom d'un GENRE éditorial, pas un titre de structure : rendu comme une division, il entrait en concurrence avec « Première partie », et son corps intermédiaire lui prêtait un rang qu'il n'a pas. Les repères d'information de large portée prennent donc la **rubrique** du site — très petite, largement chassée, grise, en petites capitales — celle qui coiffe déjà « TRADUCTION » ou « AU SOMMAIRE » ailleurs.
  - **Entre deux rangs structurels, la marche est FRANCHE** : partie et section vont de 1,4375 rem à 1,0625 rem, un rapport de 1,4. Deux rangs à un seizième de rem l'un de l'autre ne se distinguent pas, quoi qu'on ajoute par ailleurs.
  - ⚠️ **La composition d'une introduction dépend de sa PORTÉE, non de sa seule nature.** Celle du livre ou d'une partie est un **préambule** : centrée, en italique, largement margée, elle s'écarte du fil. Celle d'une section ou d'une péricope **appartient au fil** : au fer, en romain, dans la mesure ordinaire, sous son intertitre. Le même traitement pour les deux faisait flotter au milieu de la page un texte qui accompagne un passage précis.
  - ⚠️ **La coupure des polices sépare le LIVRE de son APPARAT, non les rangs hauts des rangs bas.** Les six rangs de titre appartiennent à la structure du livre et restent en **sérif** ; le **sans** est réservé aux repères éditoriaux — rubriques et marqueurs de commentaire. Mis en sans, un titre de péricope se lisait comme une étiquette d'interface et non comme un titre. Les rangs bas se distinguent alors par la POSITION — au fer, quand les hauts sont centrés — et par la casse.
  - ⛔ **Pas de gris sur les deux premiers rangs.** Une rubrique se distingue par sa petitesse et sa chasse, non en s'effaçant. Le gris appartient au seul apparat : les marqueurs de commentaire, rien au-dessus.
  - **Chaque rang change sur DEUX axes au moins.** Le premier jet donnait à quatre rangs le même signal — capitales, sérif, centré — et un signal employé partout ne distingue plus rien. Les trois rangs hauts restent en sérif et centrés, avec un vrai écart de corps ; les trois bas passent au **sans** et au fer à gauche, comme les intertitres de la page d'œuvre. Le change de caractère fait le gros du travail, la taille achève.
  - **Pas d'étiquette de colonne** (2026-08-20) : le change de caractère dit déjà laquelle est laquelle, et deux libellés en tête volaient de la place au texte.
  - **Le paratexte se compose DEUX CRANS SOUS le texte biblique** : `0.78125rem` (12,5 px), interligne **1,3**, encre `--cs-texte-second`. Une introduction de Fillion se lit AUTOUR du texte, non à sa place, et Fillion compose son commentaire DENSE — un apparat qui respire comme le texte qu'il commente lui dispute la page. ⚠️ Il valait 0,8125 rem / 1,4 jusqu'au 2026-08-25 ; la définition est unique (`STYLE_CORPS`), et la légende d'illustration comme les blocs discrets la suivent, sinon ils passeraient devant le commentaire. ⛔ **Aucun filet**, ni à gauche d'un bloc ni dessous : c'est la composition qui situe, pas un trait dans la marge.
  - ⚠️ **La taille de la liste bibliographique se pose sur le `<ol>` de l'apparat, pas sur les paragraphes**, qui portent la leur : elle ne gouverne donc QUE ce qui se compose en relatif. Elle était restée à 0,875 rem, si bien qu'en descendant le corps la note s'est mise à passer devant le commentaire. Et `0.96em` n'est pas un chiffre rond mais **le cran de l'échelle à cette taille** (pas de 0,5 px sous 14 px : 12,5 → 12 et 13 → 12,5) : c'est la seule écriture qui descende d'un cran sous ses DEUX hôtes, l'apparat d'un bloc et la fenêtre d'une note, dont les corps diffèrent.
  - **La référence native se rend en chiffres ARABES** : Fillion imprime « I, 5 », le site lit « 1, 5 ». Conversion au RENDU par `referenceNativeEnChiffres` ; la référence reste en base telle que l'édition l'imprime, et c'est elle qui fait foi. Un romain mal formé n'est pas deviné : il est rendu tel quel.
  - **La référence occupe sa propre colonne**, étroite et alignée à droite, comme le numéro de verset de la page Bible. Sans cela chaque ligne commençait après une référence de longueur variable, et les deux colonnes ne s'alignaient pas. Les rangées s'alignent sur la **première ligne de base**, non sur le haut de la boîte : les deux corps de caractère diffèrent.
  - **Le latin se compose en regard comme la colonne originale d'une œuvre** : sans empattements, un cran plus petit (0,8125 rem contre 0,875), encre `#575048`, chasse resserrée de `-0.025em`. C'est le change de caractère qui sépare les deux colonnes, mieux qu'un filet. Le texte est **resserré** : interligne 1,42 et gouttière de 0,12 rem entre versets.
  - ⛔ **Ce qui appartient à une langue ne se perd pas faute de place dans la grille** (défaut corrigé le 2026-08-20). La première version n'accueillait un contenu propre à un membre que s'il était ancré sur un verset ET placé avant lui : une introduction propre au français, une conclusion latine placée après son verset, et **toutes** les illustrations propres à une langue tombaient dans le vide sans rien signaler — leur index était calculé puis jamais lu. Ce qui n'a pas d'ancre de verset ouvre ou ferme désormais SA colonne. L'indexation passe par `indexerBlocsDeCorps` et `indexerIllustrations`, déjà testées, plutôt que d'être refaite à la main.
  - ⚠️ **Une illustration matériellement attachée à un bloc ou à une note suit CE bloc ou CETTE note**, quel que soit le membre à qui elle appartient : la charte veut que l'image d'une note reste dans sa note. Les index par bloc et par note sont donc fusionnés entre le commun et les membres, à la différence des ancres de verset, qui restent par colonne.

## La PRÉSENTATION vient de `metadata`, et le rendu n'en sort pas (2026-08-25)

Doctrine : charte `parametres.charte_ia`, **§§ 35.4 à 35.7**. Règles de code :

- ⛔ **Les métadonnées de présentation doivent être EXPOSÉES pour être lues.** `v_bible_editorial_body_blocks` ne rendait ni `metadata -> 'presentation'` ni `semantic_parent_key`, et `v_bible_editorial_body_block_notes` ne portait pas le `metadata` de ses blocs : la donnée était en base depuis la reprise éditoriale et **invisible au site**. Migration `20260825141500_fillion_presentation_metadata_visible`. ⚠️ Les deux vues restent en `security_invoker`, et `create or replace` conserve leurs grants — ne pas les recréer par `drop`.
- **Une seule lecture de ces métadonnées** : `presentationDeBloc` et `styleCompositionDeNote` (`app/lib/bibleEdition.ts`). Le vocabulaire est CLOS (`STYLES_COMPOSITION_BLOC`) et une valeur inconnue rend `null` : un style que le registre ignore n'est jamais appliqué.
- ⛔ **`text_alignment` n'est PAS repris tel quel.** Les six subdivisions de l'introduction de Matthieu le portent à `center` alors que leur corps est de la prose : l'appliquer centrerait des pages entières de commentaire. Seul `display_role` emporte son alignement. `presentationDeBloc` ne le lit donc pas du tout.
- **Le style d'un paragraphe se décide en UN point**, `compositionDuParagraphe` (`BibleEditionParatext.tsx`), de la déclaration la plus précise à la plus large : le style du bloc de note, puis le rôle d'affichage du bloc, puis le style imposé à son PREMIER paragraphe. ⛔ Jamais de détection par expression régulière : sans métadonnée, le paragraphe se compose comme les autres.
- **Le rôle d'affichage se pend à un `data-`**, jamais au style sémantique : `.cs-bible-bloc[data-display-role='part_subtitle']`. Une édition qui ne déclare rien n'est pas touchée, et aucune autre œuvre ne change parce que Fillion a précisé la sienne.
- ⚠️ **Le style d'un bloc de NOTE vit sur le bloc, pas sur la note** (`bible_editorial_body_block_note_blocks.metadata.presentation.style`). Chercher `bibliographie` sur `bible_editorial_body_block_notes` ne rend rien.
- **La bibliographie a sa matière** : `app/lib/bibleBibliographie.ts` (pur) découpe l'annonce et les entrées, `app/components/BibleBibliographie.tsx` les rend. Le composant sert le paratexte (serveur) ET la fenêtre de note (client) : il ne porte donc pas de « use client », et sa mesure est en `em` parce que les deux hôtes n'ont pas le même corps. ⛔ Le tiret de tête est un MARQUEUR de la couche de rendu, il ne s'imprime pas.
- ⚠️ **Un bloc sans corps ne rend plus de paragraphe.** `blocsTexteEditoriaux` retombait sur `[{ text: '' }]` : chaque titre posait un `<p>` vide à `margin: 0 0 0.6rem`, et c'est ce blanc fantôme qui écartait « Première partie » de son sous-titre. Le défaut était général, pas propre à Fillion.
- **Les deux axes de hiérarchie** vivent dans `empilerSelonAxe` (`bibleHierarchieSemantique.ts`), partagé par `construirePlan` et `baliserBlocs`. Un jeton d'axe `material` reçoit sa balise de la pile courante mais **ne s'y empile pas** ; un `semanticParentKey` connu **reprend la pile telle que ce parent l'a laissée**. `EntreePlan.axe` porte l'axe pour qu'un sommaire puisse les distinguer. ⚠️ `baliserPayload` (`app/page.tsx`) doit donc passer `blockKey`, `semanticParentKey` et l'axe : sans eux, « Chapitre II » redevient le parent de « 2° L'adoration des Mages » et la suite 1°/2°/3° casse d'un rang en plein milieu.
- ⛔ **L'axe et la redondance viennent du REGISTRE, pas de la métadonnée d'un bloc.** `work/fillion/semantic_display_hierarchy.json` porte `hierarchy_axis` et `redundant_with_reader_navigation` sur `titre_chapitre_livre` ; la présentation d'un bloc ne fait que confirmer ou infléchir. Mesuré le 2026-08-25 : **5 titres de chapitre sur 117** portent la métadonnée, tous dans les cinq premiers chapitres de Matthieu. Une règle tirée d'eux seuls s'appliquait à un cinquième d'un livre, et le lecteur voyait « Chapitre VI » sans avoir vu « Chapitre I ».
- **« Chapitre I » ne se rend pas** (charte §35.1, arbitré par l'auteur le 2026-08-25) : `BlocEditorialBible` sort sur `resolu.redondantAvecNavigation`, la barre de navigation nommant déjà le chapitre. ⚠️ Le masquer ne suffit PAS : il faut aussi l'axe matériel, sinon le bloc continue d'empiler et le 2° redescend d'un rang sous le 1°. Et `include_in_outline` passe à `false` — une entrée de sommaire vers un bloc non rendu serait une ancre sans cible ; `validate_semantic_display_hierarchy.mjs` refuse désormais les deux incohérences.
- **Les guillemets d'une citation en langue étrangère restent en ROMAIN** : `envelopperSpan` compose `«&#8239;<em lang>…</em>&#8239;»`, l'italique et la langue s'arrêtant au bord du guillemet. La forme précédente italisait le conteneur entier.

## ⚠️ Un comptage DOM sur la page Bible comptait DOUBLE — la cause n'était pas celle qu'on croyait

⛔ **Rectification du 2026-08-24. Ce paragraphe attribuait les 62 versets de Genèse 1 à « une variante mobile rendue puis masquée ». C'est faux, et il n'y a jamais eu de seconde variante** : `BibleLayout` ne rend qu'un seul `TexteBible`, la distinction mobile passant par une propriété. Mesuré dans la page servie : 31 versets dans `#cs-corps`, 31 dans un `<div hidden id="S:0">` enfant de `<body>`, et **zéro verset invisible ailleurs**.

Ce `S:0` était la charge que React diffuse HORS FLUX pour une frontière `Suspense`, et que le script de révélation ne reprenait pas : le document gardait un exemplaire complet du chapitre en pure perte — **136 458 signes et 849 nœuds sur 2 482**, soit un tiers de la page. Et le HTML du serveur était jeté au profit d'un rendu refait par le navigateur.

**La frontière était `<Suspense fallback={null}>` dans `app/page.tsx`, et elle n'avait rien à suspendre** : tout ce qu'elle enveloppait était attendu avant le `return`. Elle est retirée. ⛔ Ne pas la remettre : `useSearchParams` n'exige une frontière que sur une page **prérendue** (doc `use-search-params.md`), et la page Bible ne l'est jamais, puisqu'elle attend `searchParams` et lit un cookie. Contrôle après build : `/` doit être absente de `.next/prerender-manifest.json`.

⚠️ **Le même symptôme existait sur `/bibliotheque`** (50 Ko), pour la même raison, et jamais sur `/polyglotte` ni `/recherche`, dont la frontière n'enveloppe rien qui suspende.

**Règle de mesure, qui reste vraie** : pour compter ce que le lecteur voit, filtrer sur la visibilité (`offsetParent`, ou une boîte de largeur non nulle), ou compter dans le HTML **serveur** plutôt que dans le DOM. Et vérifier d'où vient un doublon avant de l'expliquer : `[...document.querySelectorAll('[id^="verset-"]')].filter(e => !e.offsetParent)` dit s'il est masqué ou orphelin.

⚠️ Et compter un nom de classe par sous-chaîne trompe aussi : `cs-bible-block--commentary` contient `cs-bible-bloc`.

## ⛔ La bible qu'on lit se décide sur le SERVEUR (2026-08-24)

La préférence vivait dans `localStorage`, donc après le rendu : le serveur composait un chapitre dans une bible et un effet de `BibleLayout` en substituait une autre. Cet effet avait `traduction` dans ses dépendances et c'est cette valeur qu'il modifiait : **il se rappelait donc lui-même**, et les deux préférences qu'il consultait se sont écrasées l'une l'autre sans fin.

Mesuré dans la page servie, sous session : **280 bascules entre Segond et Crampon en 23 secondes**, une toutes les 76 ms, avec **279 requêtes** `profils?select=traduction_defaut`. Aucune condition d'arrêt : le cycle n'était borné que par la latence du réseau. Trois circonstances l'éteignaient sans le corriger — un clic (qui met `?trad=` dans l'adresse), un onglet passé en arrière-plan (plus de `requestAnimationFrame`), ou une préférence désignant une bible à segmentation éditoriale, que le garde-fou refuse.

**Le choix se prend maintenant dans `app/page.tsx`, avant le premier rendu, et dans cet ordre** : l'adresse (`?trad=`), le cookie `cs_trad_bible`, puis `profils.traduction_defaut`. Tout est dans `app/lib/preferenceBible.ts` (module pur, testé). Le cookie est reposé à chaque lecture par `BibleLayout` et par l'enregistrement du compte, si bien que le profil n'est interrogé qu'à la toute première visite d'un navigateur, dans la même vague que les trois autres requêtes de la page.

⛔ **Ne jamais remettre une substitution côté client.** Ce qui décide de CE QU'ON REND doit être connu du rendu ; sinon il faut le défaire, et défaire un rendu se paie toujours deux fois — ici en HTML jeté, en requêtes, et en bibles qui défilent sous les yeux du lecteur.

## ⛔ Ne plus interroger `profils` depuis un composant (2026-08-24)

`ProvisionCompte` (`app/lib/contexteCompte.tsx`) lit la ligne UNE fois par session et expose `userId`, `email`, `pseudo`, `estAdmin`, `profilPret` et `rafraichirProfil`. La barre de navigation, le texte biblique, le volet patristique et la page Bible la demandaient chacun pour soi : **six requêtes par chargement pour deux informations**, dont trois pour le même `est_admin`, chacune en double parce que chaque composant enchaînait `getSession()` puis un abonnement `onAuthStateChange`, lequel émet aussitôt un événement de session initiale.

⚠️ Le profil est gardé AVEC l'identifiant auquel il appartient (`{ pour, pseudo, estAdmin }`) : `pseudo`, `estAdmin` et `profilPret` s'en DÉRIVENT pendant le rendu, au lieu d'être reposés dans le corps d'un effet.

⚠️ **Un effet qui ne dépend pas du chapitre ne se met pas dans ses dépendances.** `TexteBible` réinstallait son abonnement d'authentification et redemandait `est_admin` à chaque changement de chapitre, alors que seuls les prélèvements en dépendent.

## ⛔ `NaN` ne s'attrape pas avec `!==` — un chapitre non numérique faisait tomber la page

`parseInt('abc')` rend `NaN`, et un `NaN` n'est jamais égal à lui-même. Le recalage en phase de rendu de `NavLivres` s'écrivait `if (chapitreRecu !== chapitreActif)` : la condition restait donc VRAIE à chaque rendu, l'état se reposait sans fin, et React coupait la page entière (erreur 301, « Too many re-renders »). `/?livre=GEN&chapitre=abc` sortait ainsi le lecteur du site.

Deux gardes, et il faut les deux : le numéro se borne à l'entrée (`normaliserChapitreBible`, `bibleNavigation.ts`, testé), et la comparaison passe par **`Object.is`**, parce qu'un composant ne doit pas dépendre de la prudence de ses appelants. Même vigilance partout où le motif « ajuster l'état pendant le rendu » porte sur un nombre.

⚠️ **Corollaire** : le dépôt a désormais un `app/error.tsx` et un `app/not-found.tsx`, en français et avec la navigation. Il n'en avait aucun : toute panne de rendu servait l'écran par défaut de Next, en anglais et sans retour possible.

## ⚠️ On RELIT avant d'enregistrer, sinon on relit ce qu'on vient d'effacer

Les largeurs de volets de la page Bible étaient perdues à **chaque** chargement. Deux effets voisins : le premier ne PROGRAMMAIT la relecture de `localStorage` que pour l'image suivante (`requestAnimationFrame`), le second écrivait tout de suite. L'enregistrement précédait donc toujours la relecture, et l'on relisait le `{nav: null, pann: null}` qu'on venait de poser.

**Règle** : un effet qui relit un stockage se pose AVANT celui qui l'enregistre, et sans différer sa lecture ; l'effet d'enregistrement, lui, saute son premier tour, où il n'y a rien à enregistrer. ⚠️ Et une image d'animation ne s'exécute jamais dans un onglet d'arrière-plan : différer une lecture par `requestAnimationFrame`, c'est accepter qu'elle n'ait parfois pas lieu.

## L'adresse de la page Bible s'écrit en UN seul endroit

`urlLectureBible` (`app/lib/bibleNavigation.ts`, pur et testé) compose seule l'adresse de lecture. Elle était écrite à la main en **huit endroits, dans quatre fichiers**, et c'est ainsi que la lecture « Latin-français » se perdait : le volet des livres et les flèches mobiles reconstruisaient l'adresse sans reporter le mode, si bien que changer de chapitre ramenait le lecteur à une colonne sans qu'il l'ait demandé — sur l'action la plus courante de la page.

**Règle** : ce qui décrit la **manière** de lire voyage avec le chapitre (le mode, la graphie de Bible 899, la lecture en regard) ; ce qui décrit une **cible** ponctuelle ne voyage pas. Viser un verset quitte donc le bilingue, faute de pouvoir l'y désigner.

Les liens qui ENTRENT dans la Bible depuis ailleurs — recherche, statistiques, page d'œuvre, prélèvements, navbar — n'ont pas de mode à reporter et gardent leur propre composition.
- **Dette AELF, toujours ouverte.** `versets_canon` n'est pas démontré identique à l'ossature AELF (voir `AELF_CANONICAL_SPINE_AUDIT.md` : psaumes, Siracide, Baruch, Daniel, Suzanne, Bel). Le modèle n'emploie donc **jamais** « AELF » comme synonyme du canon interne. Les instantanés externes vivent dans `internal.bible_canonical_spine_*`, avec version, URL, empreinte, statut juridique et correspondance bidirectionnelle. ⛔ Ne pas extraire ni archiver le site AELF sans autorisation ; les consultations restent manuelles et ponctuelles.
- **Rien n'est public tant que rien n'est validé.** Toutes les tables ont RLS ; `anon` et `authenticated` n'obtiennent que `SELECT`, filtré par les statuts de publication ; les écritures sont réservées à `service_role`. Depuis le changement Supabase de 2026, une table nouvelle n'est plus exposée sans `GRANT` explicite : la migration les écrit toutes.

## ⚠️ Une migration appliquée hors du journal n'existe pas pour `supabase db push`

La migration `20260820093045_bible_fillion_editorial_model.sql` avait été appliquée par la fonction serveur `exec_sql` sans être enregistrée dans `supabase_migrations.schema_migrations` : le schéma était en place, mais le journal l'ignorait. Comme elle enchaîne seize `create table` **sans `if not exists`**, un `supabase db push` l'aurait rejouée et **aurait échoué** sur la première table déjà présente. Le défaut ne se voit ni en lisant le dépôt, ni en interrogeant la base : il ne paraît qu'au moment où l'on pousse. Régularisé le 2026-08-20, journal et schéma concordent.

⚠️ **La cause était dans le script d'application**, `scripts/fillion/apply-editorial-foundation.mjs`, qui appelait `exec_sql` puis vérifiait le schéma sans jamais écrire au journal. **Passer désormais par `scripts/fillion/apply-migration.mjs`**, qui applique, inscrit la version et le nom tirés du **nom de fichier**, joue les contrôles, et refuse de rejouer une version déjà journalisée. L'essai transactionnel préalable est `scripts/fillion/dry-run-migration.mjs`, générique lui aussi.

⚠️ Deux pièges d'`exec_sql`, rencontrés tous les deux : il passe par `EXECUTE`, qui **refuse `begin;` / `commit;`** (« EXECUTE of transaction commands is not implemented ») — les bornes se retirent, l'appel de fonction étant déjà une transaction ; et il **ne rend pas les lignes d'un `select`**, si bien qu'une garde doit lever elle-même côté base plutôt que d'espérer lire une réponse.

**Règle** : une migration appliquée par `exec_sql` est inscrite au journal dans la foulée, sinon le dépôt et la base racontent deux histoires différentes.

# Un chiffre public ne se compte pas avec les droits du lecteur (2026-08-21)

⛔ **Un compteur affiché sur une page publique ne doit jamais passer par le client de session.** La RLS s'applique au comptage : `select count(*)` rend alors un nombre DIFFÉRENT selon qui regarde. Le bandeau d'accueil annonçait ainsi 52 œuvres à l'administrateur et 35 au visiteur, sans que rien ne le signale.

Tous les chiffres du bandeau viennent désormais de **`statistiques_accueil()`** (SECURITY DEFINER, `search_path = public`, EXECUTE à `anon`/`authenticated`/`service_role`), qui ne rend que des agrégats : œuvres offertes, auteurs répertoriés, part de textes vérifiés, contributeurs. Aucune ligne, aucun nom n'en sort. Ajouter un chiffre au bandeau, c'est l'ajouter à cette fonction, pas rouvrir un comptage dans la page.

- **« Textes vérifiés » n'est plus une constante.** C'est la part des œuvres offertes dont le contrôle qualité ne relève aucun segment critique, lue sur la vue matérialisée `oeuvres_controle_stats_mat` (la vue en direct coûte ~10 s, elle est hors de question sur une page publique). ⚠️ **Le chiffre ne bouge donc qu'au recalcul** depuis le centre de contrôle : après un import ou une correction, rafraîchir, sinon l'accueil reste en arrière. Les œuvres **sans segment** sont écartées du dénominateur : une importation à venir ferait sinon chuter le pourcentage sans qu'un seul texte publié se soit dégradé.
- **« Contributeurs »** réunit les administrateurs et les auteurs d'un essai publié. ⚠️ `profils` ne se lit que « soi-même » : compter les administrateurs depuis une page est impossible sans passer par la fonction.
- **Une tuile dont le chiffre n'a pas de sens se retire** au lieu d'annoncer « 0 % ». Les filets venant de `.accueil-stat + .accueil-stat`, la barre se recompose d'elle-même.

## Deux verrous, pas un, pour retenir une œuvre

Une œuvre retenue porte **le marqueur `[Corpus Scriptura:depublie]` dans `note`** ET **`acces_public = false`**. Les deux sont indépendants : le premier filtre les listes du site, le second est la RLS. Juger de la publication sur un seul, c'est se tromper une fois sur deux. Les 17 œuvres retenues au 2026-08-21 les portaient toutes deux, et ont été ouvertes sur demande explicite (retour en arrière : `sql/rollback_publication_totale_oeuvres_20260821.sql`).

L'ouverture en bloc n'a rien vérifié : elle a rouvert des fiches retenues pour de bonnes raisons. La première refermée depuis est le latin de Migne de la Cité de Dieu (`A0010O0109`), dont l'importation s'arrêtait à la *Praefatio* : six segments et 1 411 signes, pour un ouvrage qui compte vingt-deux livres. Une version incomplète ne se propose pas à la lecture, et elle ne s'efface pas pour autant. Les deux verrous se reposent, les données restent en place : `sql/depublication_cite_de_dieu_migne_20260826.sql` (2026-08-26). Le latin complet de la Cité de Dieu est servi ailleurs, sous l'édition Vivès (`A0010O0002`), en regard du français.

## `/api/chiffres` comptait sans aucun filtre

⚠️ La page d'ouverture `/chantier` tire ses trois chiffres d'une route serveur qui interroge avec le **rôle de service** : elle ne voyait donc AUCUN des filtres du site. Elle annonçait toutes les œuvres, fermées comprises, et **onze traductions bibliques** — le `count(*)` brut de `traductions`, où cinq bibles voisinent avec des traductions d'œuvres patristiques et des bibles non matérialisées. Elle lit désormais `statistiques_accueil()` et `codesTraductionsLecture()`, comme l'accueil. Le rôle de service ne dispense pas des règles éditoriales : il les contourne, ce qui est précisément le danger.

# L'éditeur se RECONNAÎT, il ne se compte pas (2026-08-21)

La table `editeurs` tient le nom complet de chaque maison et les formes sous lesquelles le corpus la rencontre. Toute surface qui nomme un éditeur passe par elle : `normaliserNomEditeur` (module pur `app/lib/editeursNormalisation.ts`), alimenté côté serveur par `chargerIndexEditeurs` et côté navigateur par le cache d'`app/lib/editeurs.ts`. La donnée brute n'est jamais réécrite, et une maison non répertoriée garde sa forme.

⛔ **Ne jamais découper une mention d'édition PAR POSITION.** `decomposerEdition` prenait la première virgule pour la ville et le reste pour l'éditeur. Or les notices ne suivent pas toutes le même ordre : « Lyon, Pélagaud, 1844 » commence par la ville, « L. Guérin & Cie, Bar-le-Duc, 1865 » par l'éditeur. **Dix-neuf versions** annonçaient « l'édition de Bar-le-Duc, L. Guérin & Cie », ville et maison interverties, et « Pius Knöll, CSEL 33, Vienne, 1896 » donnait Pius Knöll pour une ville. On reconnaît maintenant les parties : le segment répertorié est l'éditeur, celui qui figure parmi les villes connues est la ville. Faute d'éditeur reconnu, l'ancien découpage sert encore, une notice approximative valant mieux qu'une notice vide.

- **Les villes viennent des DONNÉES**, jamais d'une liste écrite dans le code : celles des fiches d'éditeur, plus celles employées par les œuvres.
- ⚠️ **Un segment n'est un segment d'éditeur que si TOUTES ses parties le sont.** « J. Angé ; A. Cherest » est une co-édition ; « volume 1, Paris, J. Angé » est une bribe de notice où il s'en trouve un. Sans cette exigence, la moindre phrase contenant un nom de maison serait prise pour l'éditeur.
- **Trois notices restent hors d'atteinte**, et c'est une affaire de DONNÉES, non de règle : elles noient la maison dans une phrase bibliographique (« … Paris, Librairie de Louis Vivès ; texte latin et notes de l'édition des Bénédictins. », « … accurante J.-P. Migne, Paris, 1845. »), ou nomment une maison absente de la table (F. Tempsky, pour le CSEL). Les corriger demande de nettoyer `oeuvre_textes.edition_label` ou de compléter `editeurs`, pas d'élargir l'heuristique.
- **Une fourchette d'années est une année** : « 1984 – 1986 » partait dans l'éditeur, le test d'égalité stricte ne reconnaissant que quatre chiffres.

## Une version se donne comme une traduction, pas comme un nom

Dans le menu « Éditions de ce texte », une version en langue originale s'annonce « Texte latin » ; en face, la traduction française se donnait sous le seul nom de son traducteur, liste du catalogue et point-virgule compris : « H. Barreau ; M. Charpentier ». `libelleVersionComplet` emploie désormais `libelleTrad`, la formule du frontispice : « Traduction par H. Barreau et M. Charpentier, 1873 ». La mention « édition de » a disparu, la rubrique du menu annonçant déjà des éditions.

## La lecture bilingue se compose depuis l'ALIGNEMENT (2026-08-24)

Doctrine : charte `parametres.charte_ia`, **§ 12.1** (l'original embarqué est une forme héritée, en extinction) et **§ 12.2** (le groupe d'alignement est le paragraphe de la lecture bilingue). Corrigés le 2026-08-24 par `scripts/charte-corriger-bilingue-alignement-2026-08-24.mjs`, qui applique la même table de remplacements aux DEUX exemplaires de la charte et refuse d'écrire si l'un des motifs n'y figure pas exactement une fois.

⛔ **Un texte en langue originale n'existe qu'à UN SEUL endroit : dans ses propres `segments`, sous son propre `id_texte`.** Règle posée par l'auteur — « je veux une seule occurrence de chaque traduction ; il faut que chaque traduction latine soit considérée comme une œuvre, mais aussi qu'à partir d'un même texte on puisse aligner avec la traduction ». La correspondance vit dans `texte_alignement_ensembles` / `texte_alignements` / `texte_alignement_membres`, et le **groupe d'alignement est le paragraphe de la lecture bilingue** : c'est lui qui recoupe les deux colonnes.

Toute la règle vit dans `app/oeuvre/[id]/bilingueAlignement.ts` (module pur, 24 tests), employé par le rendu serveur ET par le rechargement client — un seul chargeur, `chargerProjectionBilingue`, sinon les deux dérivent.

- ⛔ **Le découpage suit le GROUPE, jamais `paragraphe`.** `paragraphe` ne vaut que dans UN texte à la fois : 28 des 57 groupes de la Didachè enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes. Découper au paragraphe remet les colonnes en désaccord, c'est-à-dire défait ce que l'alignement établit. Les segments qu'aucun groupe ne couvre retombent sur `paragraphesDe`, leur composition de toujours.
- ⛔ **Aucun tri par `rang` à l'intérieur d'un groupe**, à la différence de `paragraphesDe`. `rang` repart à 1 à chaque paragraphe : trier dessus mêlerait les deux moitiés d'un groupe à cheval. L'ordre de lecture reçu fait foi ; côté original, c'est `member_order`.
- ⚠️ **Les appels de note se matérialisent segment PAR segment, avant la jonction.** Les offsets d'ancre (`segment_offset_unicode`) se comptent depuis le début de LEUR segment : projetés sur le texte déjà joint, ils tombent d'autant plus loin que le groupe est long.
- **Le niveau d'ensemble se choisit `paragraph` > `segment` > `division`**, et seulement entre le texte lu et le texte en langue originale : l'alignement de Boèce confronte deux traductions FRANÇAISES, le retenir verserait du français dans une colonne de latin.
- **Un groupe de cardinalité `1:0`** (une addition du traducteur) détache son segment au lieu d'ouvrir une grille bilingue vide.

### ⚠️ `texte_original` est un REPLI qui s'éteint

La colonne recopie l'original dans chaque segment de la traduction. Elle sert encore **sept œuvres** dont l'original n'a pas de texte propre — Consolation de Mirandol, Ratramne, Hexaéméron, Discours 38, Jonas, Joël, Abdias — et tombera avec elles. **L'alignement l'emporte sans condition** quand les deux existent (les Confessions portent les deux) : le texte fait foi, jamais la copie, qui seule peut avoir dérivé.

⛔ **Et la colonne ne porte pas QUE des originaux.** La Somme théologique y range 5 179 entrées qui ne contiennent pas un seul caractère grec et dont 3 997 commencent par les quarante mêmes caractères que le français : c'est la traduction avec ses références scripturaires restituées (« S. Paul dit **(2 Tm 3, 16 Vg)** : … »). Ne jamais la promouvoir en texte original ; c'est une correction de données à part.

### ⚠️ Une œuvre alignée mais NON PUBLIÉE reste invisible au lecteur

La RLS des trois tables d'alignement exige que **les deux** textes soient `is_public`. Le grec de la Didachè (`A0012O0002T0001`) est en `statut = 'review'`, `is_public = false` : la lecture bilingue lui revient pour l'administrateur, et pour lui seul, tant que le texte n'est pas publié.

### ⛔ Un groupe qui enjambe deux sections ne compose son original QU'UNE fois

Relevé en ligne le 2026-08-24, sur la Didachè même. Les sections se rendent séparément, chacune sous son titre, et la découpe en blocs ne peut donc pas réunir deux paragraphes français que sépare un titre. Le groupe `PAR:003` couvre pourtant les deux : son grec se recomposait **dans chaque section traversée**, une fois en regard de « Et voici l'enseignement… », une fois en regard de « Abstiens-toi… ». Le lecteur voyait le même grec deux fois de suite.

`bornesDesGroupes` donne le PREMIER et le DERNIER segment de chaque groupe dans l’ordre de lecture, et il en faut bien deux :

- le **premier** porte l’original. Les blocs suivants gardent leur grille, colonne de droite vide : le français ne doit pas reprendre toute la largeur au milieu d’un empan, sans quoi la mise en regard se défait à l’œil. Même règle que la lecture bilingue de la Bible, où un créneau qu’une édition ne porte pas reste vide.
- le **dernier** porte le FILET. Celui-ci marque l’appariement empan par empan : tiré entre deux blocs d’un même groupe, il annonce une frontière que l’alignement ne reconnaît pas, et les deux moitiés d’un empan se lisent comme deux empans. `.para-bilingue--suite` l’ôte aux autres et resserre le blanc au lieu de l’ouvrir.

⚠️ **Le défaut ne se voyait ni aux types, ni aux tests, ni dans la donnée** : les 57 groupes sont complets et sans orphelin, et la projection est juste. Il naît de la rencontre entre l'alignement et le découpage en sections du RENDU, et il a fallu regarder la page.

# La planche des illustrations — /admin/illustrations (2026-08-24)

Toutes les images DESSINÉES du site sur une seule page, groupées par ce qu'elles font, montrées sur les fonds du site au choix, agrandissables, chacune avec un lien vers la page où elle paraît. Elle sert à juger l'harmonie du jeu, ce qu'aucune page du site ne permet : les gravures y sont dispersées sur douze écrans.

⛔ **Le recensement est une SOURCE rédigée, pas un scan de dossier.** `inventaire.ts` dit pour chaque image ce qu'elle fait là et comment la page la traite. Un scan de `public/` rendrait des noms de fichiers, jamais une fonction. `inventaire.test.ts` confronte la liste au disque dans les deux sens : une image ajoutée sans entrée fait échouer le test, une entrée sans fichier aussi. C'est ce qui empêche la planche de mentir par omission.

⚠️ **La planche montre l'image TELLE QU'ELLE EST SERVIE**, non telle qu'elle dort sur le disque : opacité, `mix-blend-mode`, filtre du Cuir, découpe en masque. Juger un fichier brut n'apprend rien sur ce que voit le lecteur — la moitié des ornements sont posés entre 0,42 et 0,5 d'opacité. Le bouton « Fichier brut » rend l'autre vue, et le fond « Damier » trahit ceux qui ont gardé un fond blanc au lieu d'être détourés.

⚠️ **Les quatre fonds sont les seules couleurs en dur légitimes de la page**, inscrites au registre avec leur raison : un jeton rendrait toujours le thème COURANT, c'est-à-dire un seul des quatre fonds d'épreuve, et l'on ne pourrait plus regarder une gravure sur le sol où elle jure.

**Les familles nombreuses se comptent, elles ne s'énumèrent pas** : fac-similés de la Bible 899, portraits d'auteurs, couvertures de traductions, gravures Fillion. Elles viennent de sources extérieures, leur harmonie ne se juge pas au regard. La planche en donne le volume et un échantillon pris AU LARGE (pas les dix premiers d'un dossier trié, qui ne sont que dix voisins).

⛔ **La pesée se fait dans le NAVIGATEUR, jamais sur le disque au rendu serveur — et une fonction de ce projet n'a que DIX mégaoctets de marge.**

`public/` est servi en statique : il n'est pas embarqué dans la fonction qui rend une page, et `fs.stat` n'y trouve donc rien en production. La réponse évidente est `outputFileTracingIncludes` ; elle est fausse. Essayée le 2026-08-24 sur les seuls dossiers d'ornements et d'icônes (19 Mo), elle a porté la fonction `/admin/illustrations` à **259 Mo pour un plafond Vercel de 250** :

```
The Vercel Function "admin/illustrations" is 259.08mb uncompressed
which exceeds the maximum uncompressed size limit of 250mb
```

⚠️ **Les fonctions de ce projet pèsent donc quelque 240 Mo À VIDE.** C'est le fait à retenir, bien au-delà de cette page : toute inclusion de fichiers dans une fonction se compte en unités de dix mégaoctets, et la prochaine fera sauter le build.

⛔ **Et un déploiement qui échoue ne se voit NULLE PART depuis le dépôt.** Le commit est poussé, `master` est à jour, la suite de tests est verte, et le site continue de servir la version d'avant. Deux commits ont vécu ainsi une demi-heure, l'auteur cherchant dans l'administration une page qui n'y était jamais montée. Après une poussée qui touche `next.config.ts` ou la taille du bundle, **vérifier le STATUT du déploiement, pas seulement son existence** :

```
curl -s ".../deployments/<id>/statuses" | grep state
```

La pesée passe maintenant par une requête `HEAD` par fichier, faite au montage de la planche : elle rend l'en-tête sans le corps, donc le poids sans le téléchargement, en local comme en ligne. La définition, elle, se lit sur l'image que la vignette affiche déjà (`naturalWidth`), et l'état reste DANS la vignette : remonté à la planche, chaque image chargée redessinerait les cinquante-sept autres. ⚠️ Un fichier compressible (les cinq SVG du gabarit) rend un `content-length` compressé, donc minoré ; sans conséquence, ce sont des résidus à supprimer.

⚠️ **`public/holy-guessr/` n'est pas versionné**, donc absent d'un `checkout` d'intégration continue alors qu'il est là sur le poste de travail. Le test saute un dossier manquant au lieu de l'exiger : sans quoi il serait vert ici et rouge là-bas, le piège d'outillage le plus coûteux du dépôt.

## ⛔ Le raccourci `background` mêlé aux propriétés détaillées — piège React

Un style en ligne qui écrit `background` (raccourci) sur un état et `backgroundImage` sur l'autre PERD `background-size` et `background-position` au changement d'état. React met à jour le style en DIFF : il efface `background`, ce qui réinitialise du même coup toutes les propriétés que le raccourci englobe, puis ne repose que ce qui a changé — or la taille du motif, elle, n'a pas changé, donc elle n'est pas reposée.

Constaté sur le damier de transparence : le motif rendait `background-size: auto, auto` au lieu de `18px 18px`, donc deux dégradés étirés à la place d'un damier. Le défaut ne paraît qu'au SECOND état, jamais au premier rendu.

**Règle** : dans un style en ligne dont le fond change avec l'état, n'employer que les propriétés détaillées — `backgroundColor`, `backgroundImage`, `backgroundSize`, `backgroundPosition` — jamais le raccourci `background`. Vaut pour tout raccourci CSS (`font`, `border`, `grid`, `flex`) posé conditionnellement.

## Ce que le recensement a trouvé, et qui reste à trancher

Chiffres du 2026-08-24, tous lus sur le disque par la planche elle-même :

- **20 images sur 58 ne paraissent nulle part**, et pèsent **13,4 Mo** — soit près de la moitié des 28,3 Mo d'images du dépôt. Ce sont des variantes écartées (quatre logos de librairie, un portrait d'auteur), trois livres en réserve à plus de 2 Mo pièce, trois palmes jamais employées, et les cinq SVG du gabarit `create-next-app`.
- **12 images dépassent 500 ko**, dont la tour de Babel à **2,1 Mo pour un écran d'attente**. `livre-miroir-detoure.png` pèse 2,6 Mo, soit PLUS que la version non détourée : le détourage l'a alourdi au lieu de l'alléger.
- **Deux portraits d'auteurs traînent dans `public/auteurs/`**, reste du temps où ils étaient servis depuis le dépôt. Le seau Supabase les porte déjà.
- `livre_pol.png` est le seul fichier du dépôt nommé avec un souligné au lieu d'un trait.

⛔ Rien de tout cela n'a été supprimé : ce sont des dessins de l'auteur, et la planche existe pour qu'il décide.

# Fiche « À propos de cette édition » — refonte du 2026-08-28

Elle vit désormais dans **`app/oeuvre/[id]/FicheEdition.tsx`**, sortie des 3 199 lignes d'`OeuvreClient`. Elle est composée **sur le modèle de la fiche d'auteur** (`ModaleAuteur`) et de la fiche de traduction (`ModaleTraduction`), décision de l'auteur : même cadre (52 rem au lieu de 33,75, `--cs-fond`, rayon 12 px, croix collante, Échap, défilement du CONTENU et non du calque), même en-tête, mêmes titres de section, mêmes deux colonnes. Les trois fiches disent la même chose d'objets voisins ; celle-ci était restée une paire de petites cartes à étiquettes.

⚠️ **Le CONTENU est séparé de la fenêtre** (`ContenuFicheEdition`), comme dans les deux autres : `createPortal` n'existe pas au rendu serveur, et sans cette coupure aucune planche de contrôle ne pourrait rendre la fiche hors session. `tmp/planche-fiche-edition.tsx` en tire les trois cas qui se distinguent (notice et collection, deux textes sans notice, opuscule) avec les données réelles.

- **Les pièces communes aux TROIS fiches vivent dans `ModaleAuteur`**, qui est le modèle : `TitreSection` y était déjà, `PortraitAuteur`, `LigneTech` et `Consulter` l'ont rejointe. La fiche de traduction les importe au lieu de les recopier. ⛔ Ne pas redéfinir ailleurs une rangée « étiquette · valeur » ni un portrait sous passe-partout : trois copies d'un même cadre finissent toujours par diverger, et c'est exactement ce qu'on venait de défaire.
- **En-tête** : le portrait du PREMIER auteur dans le cadre de la fiche d'auteur (6,5 rem × 130 px), puis le titre de catalogue en sérif 1,4375 rem, le sous-titre en italique, les auteurs cliquables, et une ligne de repères en capitales espacées (langue originale · date de composition). ⚠️ Le CADRAGE du portrait est la seule chose que la page de lecture n'a pas : elle connaît le nom et l'identifiant de ses auteurs, jamais leur `photo_position`. La fiche va le chercher à l'ouverture, et le portrait paraît sans l'attendre, son adresse se déduisant de l'identifiant.
- **Deux colonnes** (`1.35fr / 1fr`, filet entre elles) : à GAUCHE l'édition qu'on lit, à DROITE ce qui la documente. ⚠️ La prose n'y tient pas la place qu'elle occupe dans les deux autres fiches, et c'est la DONNÉE qui le commande : 15 œuvres sur 49 portent un commentaire public, une seule une note éditoriale secondaire. Les rangées de l'édition ouvrent donc la colonne de gauche, la prose les suit.
- ⛔ **« Édition de référence » n'est PAS repliable**, à la différence d'« Édition et état du texte » dans la fiche de traduction : ces rangées SONT le sujet d'une fiche qui s'appelle « À propos de cette édition », et l'on ne range pas derrière une flèche ce qu'on est venu chercher.
- **Éditeur, lieu et année sur trois lignes distinctes**, comme dans la fiche de traduction. La ligne « Publication » les recollait en une chaîne où l'on ne savait plus lequel des trois manquait ; les trois valeurs viennent des mêmes morceaux que `publicationLabel`, rien n'est perdu.
- **La colonne de droite EMPILE étiquette et valeur** au lieu de les poser côte à côte. La rangée partagée porte une colonne d'étiquettes de 8,5 rem, qui tient dans la colonne large et pas dans l'étroite. Deux formes, chacune pour la mesure qu'elle sert : c'est déjà ce que fait la fiche d'auteur, dont les deux colonnes ne se composent pas pareil. Sur téléphone, la classe `cs-fiche-cle` resserre l'étiquette partagée à 6 rem.

## Ce que la fiche dit de plus

- **La SOURCE retombe sur `oeuvres.url_source`.** Elle ne paraissait que si la version active portait un `source_url` : les cinquante œuvres du corpus ont toutes une `url_source`, et le lien n'était offert que par exception.
- **L'édition en ligne** (`date_mise_en_ligne`), au millésime. ⛔ Pas la date au jour : la colonne a été estampillée en lot sur une partie du corpus, et une date précise donnerait à croire à une précision qu'elle n'a pas. C'est le millésime du colophon du frontispice.
- **L'étendue du texte** (`oeuvres.nb_signes`), passée du serveur au client avec le reste de l'œuvre. ⚠️ Elle mesure le texte PAR DÉFAUT, et lui seul : sur une autre édition du même texte elle dirait la longueur d'un texte qu'on ne lit pas, et la fiche se tait alors.
- **Les autres éditions du même texte**, nommées par `libelleVersionComplet`, et la mention du texte original lu en regard.
- **Le genre et la date de composition**, qui ne paraissaient nulle part ailleurs que dans l'ancienne carte « Texte original ».

⚠️ **La garde du lien « En savoir plus sur cette édition » compte désormais CE QUE LA FICHE SAIT DIRE**, et non les seuls champs de l'édition imprimée : une œuvre sans éditeur ni collection a tout de même un genre, une date de composition et une étendue.

# Recherche — trois FAMILLES DE CORPUS, et des résultats groupés (2026-08-28)

Les quatre onglets de `app/recherche/RechercheClient.tsx` rendaient tout dans le seul `--cs-vert` : rien ne disait à l'œil d’où venait une carte. Trois familles désormais, en jetons (`app/globals.css`, § familles de corpus) : `--cs-ecriture` pour la Bible et la Polyglotte, `--cs-peres` pour les Pères, `--cs-communaute` pour les publications. Chacune tient en **deux valeurs**, une ENCRE et un APLAT.

⛔ **Le lavis d’un groupe et son filet ne sont PAS des jetons.** Ils se dérivent de l’encre par `color-mix` — 7 % et 22 % dans `--cs-surface` — depuis la variable `--fam` posée une seule fois par `styleFamille()`. Ils suivent donc les deux thèmes sans être nommés, et **montent tout seuls** sur le sol sombre du Cuir, comme la charte l’exige d’un carton posé sur un fond sombre. Nommer six jetons de plus n’aurait rien ajouté qu’une occasion de dérive.

⛔ **La teinte des Pères est un POURPRE DE RUBRIQUE (`#8a2846`), jamais un bleu.** La charte a essayé les teintes froides franches sur ce papier (§ La couleur appartient à l’auteur) et les a reprises le jour même. Il est à 162° du vert et à 36° de `--cs-danger`, ce qui suffit sur une page où le danger ne paraît que sur la ligne d’un verset absent.

⛔ **La Communauté ne peut pas prendre `--cs-or` tel quel** : mesuré, il ne rend que 3,79 sur le papier. C’est un rang plus profond de la MÊME famille, pas une couleur de plus.

⛔ **En Cuir, les ENCRES ne peuvent pas se rabattre sur `--cs-vert`**, qui y vaut `#dcc08a` : les trois familles y seraient identiques. Les APLATS, eux, redeviennent du **cuir profond** comme la barre de navigation, et pour la même raison — trois bandes claires répétées sur toute la hauteur d’une page en seraient la seule tache de couleur. Chacun garde le penchant de sa famille sans en avoir la clarté ; blanc mesuré dessus : 11,97 · 13,54 · 12,79. C’est la dérogation que la charte accorde déjà aux catégories encodées par la couleur.

⛔ **Le SURLIGNAGE sort du jeu des familles** et prend `--cs-vise-fond`, le jeton qui dit déjà « le verset que vous cherchiez », identique dans les quatre onglets. Vert, il aurait dit « Bible » dans un résultat patristique. Mesuré 13,63 au Clair, 12,59 en Cuir. ⚠️ Et il **ne se resserre pas** quand tout le reste se resserre : c’est le seul objet de la page qu’on cherche des yeux.

## Un GROUPE, pas des cartes

Un groupe est une rubrique en aplat (le livre, l’auteur et l'œuvre, la publication) puis un bloc lavé dont les lignes se séparent d’un filet. Ce qui était répété à chaque ligne est **remonté d’un cran** ; rien n’est retranché.

⛔ **Pas de liseré au flanc des lignes.** Essayé et refusé par l’auteur : un trait de trois pixels dit moins bien la famille qu’un fond qui la porte sur toute la hauteur du groupe, et il ajoute un objet là où l’on en retire.

⛔ **Aucun COMPTE dans la rubrique.** Aucun n’est vrai : celui de la page ment sur le livre, celui du livre ment sur la page, et celui du volet gauche est en OCCURRENCES, non en résultats. Les comptes complets vivent dans le volet, le total sous la pagination.

⚠️ **`grouperConsecutifs` groupe par tranches CONSÉCUTIVES, jamais par table de hachage** : les listes arrivent dans l’ordre canonique ou alphabétique d’auteur, et cet ordre est précisément ce qu’on montre. Un regroupement par clé le casserait en ramenant ensemble des tranches éloignées.

## Le SIGLE d’une bible se dérive — `app/lib/sigleTraduction.ts`

La ligne d’en-tête d’un verset énumérait EN TOUTES LETTRES les sept bibles qui portent le mot, sur chacun des vingt résultats. ⛔ Pas de table écrite à la main (la charte a déjà vu ce qu’il en advient pour les noms de livres) : le sigle se dérive du nom, les mots génériques écartés.

⛔ **Ne jamais employer `sigleTraduction` seul sur une LISTE.** « Vulgate clémentine » et « Vulgate latine (Fillion) » donnent tous deux « Vulgate », et un sigle ambigu désigne la mauvaise bible — pire que pas de sigle. `siglesTraductions` rallonge les seuls noms qui se heurtent et retombe sur le nom entier si cela ne suffit pas. 11 tests, sur les noms réels de la base. Le nom entier reste porté en `title`.

## Ce que la MESURE a démenti

⚠️ **Une planche de proposition n’est pas une mesure.** Elle affirmait que les sept noms entiers reviennent à la ligne sur un écran de 1 440 : **faux**. Mesuré au navigateur, ils n’enroulent qu’en dessous de **580 px** de zone de résultats, soit une fenêtre d’environ 1 030 px. Les sigles gagnent de la LARGEUR (278 px au lieu de 600), pas un rang.

⚠️ **Le groupement se paie, et le seuil se compte.** Un verset passe de 52,3 à 42,4 px, soit 18,9 % et 198 px sur une page de vingt. Mais une rubrique coûte 18 px et le blanc qui la précède 4 : **au delà de neuf rubriques sur une page de vingt, on perd de la hauteur au lieu d’en gagner**. Cela n’arrive en pratique que sur les Pères, où vingt passages peuvent venir de dix œuvres. Un groupe d’un SEUL résultat reste plus haut qu’une carte isolée (59 contre 52) : c’est le prix de la rubrique, et il ne se rattrape pas.

⛔ **`color-mix()` rend `color(srgb 0.96 0.95 0.93)`, pas `rgb(245, 243, 240)`.** Un lecteur de couleur qui divise par 255 se trompe de 255 fois et rend un contraste de 1,38 là où il vaut 13,8. Piège rencontré en mesurant cette passe : le premier relevé annonçait un corps de texte illisible sur le lavis, ce qui était un défaut de la SONDE, non de la page. Toute mesure de contraste sur une couleur dérivée doit reconnaître les deux formes.

## Trois teintes en dur retirées de l’inventaire

`#f6cfca` et `#8a1710` étaient le surlignage ROUGE, que **plus rien n’appelait** depuis que la ligne d’en-tête dit où le mot se trouve — le paramètre `rouge` n’était jamais passé à `true`. `#4a453f` est passé à `--cs-texte`. Parties avec eux : `refFr`, `abrevFr` et `nombreFr`, ce dernier mort depuis bien plus longtemps.

## La barre de recherche parle la MÊME langue que ses résultats (2026-08-28)

⛔ La liste déroulante de `app/components/Navbar.tsx` avait sa PROPRE table de couleurs, `DOMAINE` : la Bible y était **bleue** (`#3a5a8c`) quand elle est verte sur la page de résultats, les Pères **verts** quand ils y sont pourpres, et les publications portaient l’ocre de lacune. Deux codes de couleur contradictoires à quarante pixels l’un de l’autre, sur le même mot cherché : ce que la liste apprenait au lecteur, la page le démentait aussitôt.

Elle prend donc les jetons des trois familles et le dessin des groupes — rubrique en aplat, bloc lavé, lignes séparées d’un filet — le lavis, le filet et le survol se dérivant par `color-mix` depuis `--fam` (voir `styleDomaine`). ⛔ Plus de filet de trois pixels au flanc des sept sections : il a été essayé et refusé sur la page de résultats, il n’avait pas à survivre ici.

⚠️ **Sept rubriques pour TROIS familles**, et c’est voulu : la rubrique nomme le GENRE de résultat, la couleur dit le DOMAINE. L’Écriture porte Livres bibliques, Péricopes et Traductions ; les Pères portent Œuvres patristiques, Auteurs et Chronologie ; la Communauté porte les Essais. C’est exactement ce que font Bible et Polyglotte, qui partagent le vert sur la page de résultats.

⚠️ **La CHRONOLOGIE a perdu son violet**, qui faisait un quatrième domaine vivant dans cette seule liste. Elle rejoint les Pères, dont elle raconte le monde. ⛔ Ne pas la ressortir sans décision : ce serait une couleur de plus dans la palette pour une section qui paraît trois fois sur dix.

⚠️ **La rubrique garde sa TYPOGRAPHIE** — petites capitales espacées, même corps qu’avant. Ce n’est pas un titre : elle nomme un genre de résultat, non une œuvre. Seule la couleur a changé de place, du texte vers la bande. C’est la différence avec la page de résultats, où la rubrique porte un nom de livre ou d’auteur et se compose en sérif.

⚠️ **Le rang atteint au CLAVIER prend la teinte de SA famille**, et non plus un gris commun (`[data-nav-actif]` compose désormais sur `--fam`, avec repli). La flèche descend d’un domaine à l’autre, et le surlignage doit le dire.

**Dix teintes en dur** ont quitté l’inventaire avec cette passe. Il n’en reste qu’une dans la navbar.

### Le terme tapé ne porte AUCUNE couleur (2026-08-28)

⛔ Il portait une pastille VERTE — encre `--cs-vert` sur un fond translucide de la même teinte. Tant que la liste était bleue, verte et ocre, elle passait ; depuis que les sections prennent les trois familles, elle était une **quatrième couleur, et la seule qui se répète à CHAQUE rang**. La liste en devenait bariolée, et le vert disait « Bible » au milieu d’un groupe pourpre. Relevé par l’auteur le jour même de la bascule.

⚠️ **Elle ne prend pas non plus le jaune `--cs-vise-fond` de la page de résultats**, et la différence tient à ce qu’on FAIT dans chacune. Sur la page, on cherche un mot des yeux dans un paragraphe de prose, et le jaune est le repère qu’on y poursuit. Dans la liste, l’entrée fait trois mots, on vient de taper le début du premier, et l’on sait déjà ce qu’on a écrit : une pastille par ligne y serait un coup de surligneur sur un mot qu’on n’a pas besoin de retrouver. La graisse suffit, avec une encre d’un rang plus profonde (`--cs-encre-fonce` contre `--cs-encre` autour).

⛔ **Une seule définition, `STYLE_TERME_TAPE`, pour les DEUX surligneurs de la barre** (`surlignerMatch` et `extraireEtSurligner`) : ils portaient la même déclaration recopiée, et une forme recopiée à deux endroits ne reste identique que par accident.

⚠️ **Corollaire général, et il vaut au delà de cette liste** : quand une surface passe à un code de couleur, tout ce qui y était déjà coloré redevient une question. Le surlignage n’avait pas changé ; c’est son entourage qui a changé, et une teinte qui ne disait rien s’est mise à dire quelque chose de faux.

## L’onglet « Livres » EST le retour d’une pièce liminaire (2026-08-28)

⛔ Une pièce portait en pied un « Revenir à Luc 1 » ; il est retiré (décision de l’auteur). C’était un objet de plus pour un geste que le volet fait déjà, et il paraissait sous chaque apparat.

La bascule du volet est donc **locale dans un sens et navigante dans l’autre** :

- vers **« Sommaire »**, rien ne bouge dans la page. On regarde une table des matières, on n’a pas encore choisi d’y entrer, et le chapitre qu’on lisait reste à l’écran. ⛔ Ne pas y ajouter de navigation : ouvrir le sommaire n’est pas ouvrir une pièce.
- vers **« Livres »**, on ne navigue QUE si une pièce est ouverte. Sinon il n’y a rien à défaire, et une navigation gratuite rechargerait la page pour la rendre à l’identique.

⚠️ **La bible revient telle qu’on l’avait laissée sans qu’on mémorise rien** : `livre` et `chapitre` n’ont jamais quitté l’adresse pendant qu’une pièce s’affichait — c’est déjà la règle consignée plus haut, « la pièce est une CIBLE, non une manière de lire » — et `maniereDeLire` porte le reste.

⚠️ **Une seule chose ne revient pas : la lecture EN REGARD.** Ouvrir une pièce force `bilingue: false` (une pièce est commune aux deux membres, la mettre en face d’elle-même n’aurait pas de sens), et l’adresse perd donc l’information. Le retour rend une colonne. ⛔ Ce n’est pas une régression du présent changement — l’ancien lien de pied composait la même adresse — et le corriger demanderait d’apprendre à `LectureBilingueBible` à rendre une pièce, ce qui est un chantier, non un réglage.

⚠️ **`urlRetour` reste une propriété OPTIONNELLE de `PieceLiminaire`**, et son rendu est gardé par elle : ne rien passer suffit à ne rien rendre. ⛔ Ne pas retirer la propriété du composant en croyant faire le ménage.
