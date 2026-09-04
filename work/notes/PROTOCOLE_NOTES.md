# Protocole de révision des NOTES — une œuvre à la fois

Écrit POUR LES IA qui produisent ou corrigent l'appareil de notes, sur le modèle de
`work/fillion/STYLES_BIBLIQUES.md`. La doctrine fait foi (charte `parametres.charte_ia`,
§§ 3.2, 3.5.1, 3.8, 8, 13) ; ce document dit **comment on s'y prend**, dans quel ordre,
et ce qu'on ne fait surtout pas.

⚠️ **État : v2, 5 septembre 2026.** Les quatre points qui commandaient le travail sont
**arbitrés** (numérotation, catalogue des œuvres citées, italique du latin, type de note) ;
ils sont marqués ✅ et datés. Le protocole est applicable en entier.

---

## 0. La règle qui commande toutes les autres

⛔ **LE SITE COMPOSE, LA BASE CONSERVE.** C'est la doctrine du projet partout ailleurs
(charte § 3.2 : la typographie se pose « au rendu, sans réécrire la donnée » ; § 35.6.1 :
une notice bibliographique « se compose depuis les CHAMPS, non depuis une notice
précomposée »), et elle vaut ici.

Avant de toucher à une note, se demander **où la règle s'applique** :

| | Ce que ça veut dire | Qui le fait |
|---|---|---|
| **(R)** | le site le compose à l'affichage, la donnée ne bouge pas | le code, déjà écrit |
| **(D)** | il faut l'écrire en base | GPT, selon ce protocole |

⚠️ **Mesuré le 5 septembre 2026 : une bonne moitié de ce qu'on croit à corriger est déjà
corrigé au rendu.** 6 431 notes sur 16 408 (39 %) n'ont aucune ponctuation finale dans la
donnée, et le site les termine toutes. 3 392 renvois bibliques sur 11 916 sont déjà
réécrits à l'affichage. **Les « corriger » en base serait du travail perdu, et pire : ce
serait effacer la leçon imprimée que la charte § 8.1 demande de conserver.**

⛔ **On ne réécrit une donnée que lorsque le rendu ne PEUT pas la composer** — parce que
l'information manque, parce qu'elle est fausse, ou parce qu'elle n'est pas là où le rendu
la cherche.

---

## 1. Ce qui est DÉJÀ FAIT au rendu — ne pas y toucher (R)

Ces règles sont tenues par `ContenuNoteStructuree` et les modules purs qu'il appelle.
Elles s'appliquent à toute note **hors apparat critique**.

| Règle | Fonction | État |
|---|---|---|
| Ponctuation finale forte (ou guillemet fermant) | `terminerNote` | ✅ 6 431 notes réglées sur 6 431 |
| Abréviation biblique normative, espacée | `normaliserReferencesDansTexte` | ✅ 3 392 renvois réécrits |
| Chapitre romain → arabe | idem | ✅ |
| Virgule entre chapitre et verset | idem | ✅ |
| Espaces de la charte § 3.2, ponctuation des citations § 3.8 | `normaliserTypographieLecture` | ✅ |
| Gras, italique, petites capitales, exposants | `rendreTexteEnrichi` | ✅ |

⛔ **L'APPARAT CRITIQUE est hors de tout cela, et il le reste** (charte § 22 ; 7 379 blocs
au 5 septembre 2026, soit 30 % de l'appareil). Une entrée d'apparat se rend **telle
quelle** : ni ponctuation ajoutée, ni référence normalisée, ni typographie de lecture.
`metadata.editorial_role = 'critical_apparatus'` est ce qui le dit, et il doit être posé
sur **TOUS** les blocs de la note. ⛔ Ne jamais faire entrer un apparat dans une passe de
normalisation.

---

## 2. L'ordre des opérations, œuvre par œuvre

On ne mélange pas les passes. Chacune se clôt par un contrôle avant d'ouvrir la suivante.

```
0. RELEVÉ        — on mesure avant de toucher                          (aucune écriture)
1. SAUVEGARDE    — l'appareil entier de l'œuvre, dans internal.        (aucune lecture publique)
2. PROPRETÉ      — le préfixe « Référence imprimée », les blancs       (mécanique, réversible)
3. TYPE          — qui parle : auteur, traducteur, éditeur, nous       (jugement, par lot)
4. LANGUE        — quel fragment est latin, grec                       (jugement, par lot)
5. RENVOIS       — ibid., id., et les références sans auteur           (recherche documentaire)
6. CATALOGUE     — les œuvres citées entrent dans le catalogue         (recherche documentaire)
7. NUMÉROTATION  — le numéro affiché                                   (calcul)
8. CLÔTURE       — contrôles, et on rend la main
```

⚠️ **Une passe se joue sur UNE œuvre**, jamais sur le corpus entier : une campagne qui
touche quarante-sept textes à la fois ne se relit pas, et la charte § 8.1 exige une
relecture depuis la base après chaque écriture.

---

## 3. Passe 0 — le RELEVÉ

Avant toute écriture, on établit l'état de l'œuvre. Le harnais existe :

```bash
npx tsx tmp/audit-notes.mts
```

⛔ Il fait passer le corpus par **les vraies fonctions du site**, jamais par une copie de
leurs règles. Un audit qui rejouerait la normalisation de mémoire mesurerait un site
imaginaire — c'est la règle déjà écrite pour le contrôle du grain d'alignement.

On relève, pour l'œuvre : le nombre de notes et de blocs ; la part d'apparat critique ; les
`kind` et `form` employés ; les langues déclarées ; le nombre de notes sans type ; le
résidu de références non conformes, classé ; le numéro le plus haut.

---

## 4. Passe 1 — la SAUVEGARDE

⛔ **Dans `internal`, jamais dans `public`** (AGENTS.md, « Schéma public = surface
d'attaque »). Une table de sauvegarde posée dans `public` est servie par l'API à tout
compte connecté.

```sql
create table internal.backup_notes_<id_texte>_<AAAAMMJJ> as
select * from public.texte_note_blocs where id_texte = '<id_texte>';
-- et de même pour texte_notes, texte_note_ancres, texte_note_relations
```

On écrit dans la même campagne le retour arrière (`sql/rollback_…`), et on le relit.

---

## 5. Passe 2 — la PROPRETÉ (D, mécanique)

### 5.1 Le préfixe « Référence imprimée : » n'est pas du texte de note

**3 622 blocs** le portent, et le lecteur le voit. C'est une mention de PROVENANCE — « ce
renvoi vient de la référence imprimée, déplacée hors du corps » — et une provenance vit
dans `metadata`, jamais dans le texte affiché.

- retirer `^Référence imprimée\s*:\s*` du `text` ;
- poser `metadata.provenance_note = 'reference_imprimee'` ;
- ⚠️ ne rien retirer d'autre : ce qui suit le préfixe est la référence, telle qu'imprimée.

### 5.2 Les blancs et les guillemets

Rien à faire : `normaliserTypographieLecture` s'en charge au rendu. ⛔ Ne pas poser de
fine insécable dans la donnée (charte § 3.2).

---

## 6. Passe 3 — le TYPE de la note (D, jugement)

Toute note dit **qui parle**. Le vocabulaire est CLOS et vit dans
`metadata.editorial_role` :

| Valeur | Ce que c'est | En base au 5 sept. 2026 |
|---|---|---|
| `author_note` | la note de l'auteur ancien lui-même | 0 |
| `translator_note` | la note du traducteur | 0 |
| `source_editorial_note` | la note de l'éditeur de l'édition source | 11 |
| `corpus_editorial_note` | la note de Corpus Scriptura | 1 |
| `critical_apparatus` | l'apparat critique | 7 379 |

⚠️ **16 873 blocs sur 24 264 (69 %) n'en portent aucun.** C'est le plus gros manque de
l'appareil, et rien ne peut l'afficher tant qu'il n'est pas posé.

**Comment on tranche.** La responsabilité RÉELLE du passage, jamais sa position (charte
§ 13.2, qui dit déjà la même chose des apparats).

- une note qui commente le texte dans la voix de l'auteur ancien → `author_note` ;
- une note qui explique un choix de traduction, qui dit « nous avons traduit », qui
  s'adresse au lecteur français → `translator_note` ;
- une note savante de l'édition (Migne, Vivès, Bareille, Faivre, Knöll…) → `source_editorial_note` ;
- une note que NOUS ajoutons → `corpus_editorial_note`.

⚠️ **136 notes disent déjà leur type dans leur texte** : « (Note du Traducteur.) »,
« (Note du Trad.) », « (Note du Traduct.) ». Elles amorcent le lot, et **la mention en
clair se retire du texte une fois le type posé** — sans quoi le lecteur la lira deux fois.

⛔ **Le doute ne se tranche pas au hasard.** Une note dont on ne sait pas qui la signe
reste **sans type** ; elle se signale, elle ne s'invente pas. Un type faux est pire qu'un
type absent : il attribue à un Père une remarque de son traducteur du XIXe siècle.

### 6.1 ✅ Le type paraît sur TOUTES les notes (arbitré le 5 septembre 2026)

Décision de l'auteur, contre la proposition de ne marquer que l'exception : **chaque note
dit qui la signe, sans exception**, y compris dans une œuvre dont les 1 830 notes sont
toutes du même traducteur.

⚠️ **Conséquence pour le rendu, et elle décide de la forme.** La mention se répète des
milliers de fois : elle doit donc être la chose la plus DISCRÈTE de la note — un rang
d'encre sous le texte, en petit, jamais une étiquette encadrée ni une ligne à elle. C'est
la règle que la charte pose déjà pour la manchette d'un commentaire (§ 35.15) : un repère
qu'on lit mille fois se retrouve d'un coup d'œil et ne se lit pas.

⛔ **Elle ne se met PAS dans le texte du bloc.** Le type est une donnée
(`metadata.editorial_role`) et le site la compose ; l'écrire dans `text` recopierait
l'information à deux endroits, et c'est exactement ce que les 136 « (Note du Traducteur.) »
déjà présents dans le corpus vont cesser d'être.

---

## 7. Passe 4 — la LANGUE (D, jugement)

⚠️ **3 805 blocs sur 3 808 déclarés latins (99,9 %) ne portent aucune marque d'italique.**
Deux cas, et ils ne se traitent pas pareil :

- **le bloc ENTIER est latin** — `language = 'la'` le dit déjà, et **c'est au rendu de
  l'italiser**. Rien à écrire. ✅ Arbitré le 5 septembre 2026 : **italique quelle que soit
  la longueur**, y compris sur les 27 blocs qui dépassent 900 signes. ⛔ Le grec ne suit
  pas : son alphabet le distingue déjà, et une italique grecque est une déformation de la
  lettre, non un changement de graisse.
  ⛔ **L'apparat critique reste hors de la règle** : il est latin de bout en bout, et
  l'italiser mettrait sept mille entrées en italique pour ne rien distinguer.
- **le latin est ENCHÂSSÉ dans une note française** — le cas le plus fréquent, et le plus
  coûteux : « Ac in primis quidem cùm baptizantur mulieres, diaconus tantùm… » au milieu
  d'un paragraphe français. Le bloc est `fr`, la langue du fragment n'est déclarée nulle
  part, et aucun rendu ne peut le deviner. C'est une écriture, par marqueur d'italique.

⛔ **On n'italise pas une CITATION FRANÇAISE** au passage : l'italique dit ici la langue,
non la citation. Les guillemets disent la citation (charte § 3.8).

---

## 8. Passe 5 — les RENVOIS INTERNES (D, recherche)

**692 renvois** de la forme `ibid.`, `Ibid. 25.`, `Ibidem. 7.`, `SALLUSTE, ibid.`,
`Id.` — plus les références qui ne nomment pas leur auteur.

⛔ **Un renvoi ne se résout pas de mémoire.** On remonte la chaîne :

1. trouver la note qui PRÉCÈDE, dans l'ordre de lecture (`note_number`, à défaut l'ordre
   des ancres) — c'est ce que `ibid.` désigne ;
2. si elle est elle-même un `ibid.`, remonter jusqu'à la première note qui NOMME l'œuvre ;
3. si la chaîne remonte hors de la division sans rien nommer, ou si le rattachement est
   douteux, **on s'arrête et on signale**. On n'écrit pas une référence qu'on n'a pas
   établie.
4. écrire la référence complète, et conserver la forme imprimée en `metadata`.

⚠️ **La chaîne se rompt souvent au changement de division** : `Ibid.` en tête d'une
homélie renvoie à la dernière note de la précédente, ce qui n'a plus de sens une fois
qu'on lit chapitre par chapitre. C'est précisément pourquoi l'auteur veut ces renvois
résolus.

**Exemple mesuré.** « Voir, Lettre 92, 6 ; CXLVII, 36. » ne dit ni l'auteur, ni l'édition,
ni même que les deux numéros désignent la même correspondance. Résoudre demande de savoir
QUELLE collection de lettres, dans QUELLE numérotation — la nôtre, ou celle de l'édition
citée ? Ce travail est documentaire, non typographique, et il se fait **une œuvre à la
fois, avec le fac-similé sous les yeux**.

---

## 9. Passe 6 — les ŒUVRES CITÉES entrent au CATALOGUE (D, recherche)

C'est la demande centrale de l'auteur : « il faut utiliser le gestionnaire-catalogue des
œuvres imprimées : les œuvres trouvées sont constituées en données dans la table adéquate,
puis le site appelle l'information pour constituer proprement une note bibliographiquement
propre sous la forme normalisée du site ».

**Le principe est celui de la bibliographie de Fillion** (charte § 35.6.1) : la référence
devient de la DONNÉE, et le site la COMPOSE. On ne rédige jamais « VIRGILE, *Énéide*,
livre I. » à la main dans un bloc de note.

### 9.1 ✅ La table est `ouvrages_bibliographiques` (arbitré le 5 septembre 2026)

Décision de l'auteur : les œuvres citées entrent dans le **catalogue des ouvrages**
existant, celui de l'onglet « Ouvrages » de l'administration. Un seul gestionnaire.

⛔ **DEUX GARDES, ET ELLES NE SE NÉGOCIENT PAS.**

1. **Un auteur ancien n'y reçoit JAMAIS de fiche notée** (charte § 29 : « un Père/auteur
   ancien ou collectif = source, jamais de fiche notée »). Virgile, Tite-Live et Platon
   entrent comme AUTEURS de l'ouvrage cité, sans passer par `auteurs_valeur`. Ouvrir une
   fiche non notée pour eux ferait basculer l'ouvrage en `a_verifier` par la branche
   `auteur_non_evalue` du calcul de statut scientifique — c'est-à-dire qu'inscrire
   l'Énéide dégraderait la valeur scientifique de la notice qui la cite.
2. **Les champs d'ÉDITION restent vides** quand on ne cite que l'œuvre. `lieu`, `editeur`,
   `annee`, `isbn` décrivent un exemplaire imprimé ; l'Énéide n'en a pas. On les renseigne
   seulement lorsque la note cite une ÉDITION précise (« trad. de V. Cousin », qui figure
   déjà dans plusieurs notes de Boèce).

⚠️ **Le `type_ouvrage` d'une œuvre ancienne est `source_primaire`** — la valeur existe et
porte déjà 146 notices, dont les plus anciennes remontent à 1346.

**Ce qu'on écrit :**
- l'œuvre citée, dans `ouvrages_bibliographiques`, sous les deux gardes ci-dessus ;
- sur le bloc de note : le renvoi vers cette fiche, et le **locus** (livre, chapitre,
  paragraphe, vers) ;
- la forme imprimée, conservée en `metadata`.

**Ce que le site compose :** l'auteur en petites capitales, le titre en italique, le locus
en toutes lettres, la ponctuation, et **une référence par ligne** quand la note en porte
plusieurs (« Cité de Dieu, liv. 16, ch. 3 ; Rétractations, liv. 2, ch. 16. » devient deux
lignes, chacune sous le nom d'Augustin).

⛔ **Les abréviations `liv.`, `ch.`, `chap.`, `cap.`, `lib.` disparaissent de l'affichage**
(339 blocs les portent). Elles ne se retirent pas du texte à la main : elles cessent
d'exister dès que le locus est une donnée, puisque c'est le site qui écrit « livre 16,
chapitre 3 ».

⛔ **Et l'auteur est TOUJOURS nommé.** 689 renvois portent un nom en capitales sans autre
contexte (« SOLIN., c. XLVII ; PLIN., lib. VIII, c. XLII. »), et beaucoup n'en portent
aucun (« cap. ix », « Géorg., II. »). Un renvoi qui ne nomme pas son auteur n'est pas une
référence : c'est une note pour quelqu'un qui a déjà le livre ouvert.

---

## 10. Passe 7 — la NUMÉROTATION

✅ **Le numéro AFFICHÉ recommence à chaque début de NIVEAU 1** (arbitré le 5 septembre
2026 : « CHAQUE début de niveau 1 »).

⛔ **Le numéro INTERNE ne bouge pas.** `note_key` et `note_number` portent l'identité et
l'ordre de lecture, et les 23 569 ancres en dépendent : c'est le numéro **affiché** qui
recommence, et lui seul. C'est exactement ce que la Bible fait depuis toujours
(AGENTS.md : « Le numéro visible d'une note recommence à chaque chapitre […] l'identifiant
interne demeure global et stable »), et la règle cesse donc d'être une exception biblique.

⚠️ **La charte § 13.3 dit aujourd'hui le contraire** (« La numérotation ne recommence ni à
une partie, ni à un livre, ni à un espace textuel ») : elle est à reprendre, en distinguant
les deux numéros — ce qu'elle ne fait pas.

⛔ **L'APPARAT CRITIQUE COMPTE À PART.** Il forme sa propre série : mêlé aux notes de
lecture, il les noie. Mesuré : les Confessions passent de **1 039** à moins de 90 par livre
dès qu'on l'en sort — leur gros numéro était l'apparat de Knöll, non l'appareil de lecture.

⚠️ **Ce qui reste à trois chiffres après le recommencement, et qu'il faut savoir** :
treize textes sur quarante-sept. Le pire est la **Cité de Dieu latine (731)**, puis le
**Manuel pour mon fils (443)**, les **Questions sur l'Heptateuque (241)**, les
**Catéchèses baptismales (222)**, les quatre commentaires de **Bareille (192 à 210, qui
n'ont qu'un seul niveau 1, donc rien ne change pour eux)**, la **Cité de Dieu française
(172)**, **Du corps et du sang du Seigneur (140)**. Recommencer au CHAPITRE les mettrait
tous sous cent sauf un ; c'est un arbitrage que l'auteur a tranché autrement, et qui peut
se rouvrir texte par texte.
- ⛔ Le numéro INTERNE ne doit pas bouger : `note_key` et `note_number` portent l'identité
  et l'ordre, et les ancres en dépendent. C'est le numéro **affiché** qui recommence —
  exactement ce que la Bible fait déjà (AGENTS.md : « Le numéro visible d'une note
  recommence à chaque chapitre […] l'identifiant interne demeure global et stable »).

---

## 11. Passe 8 — la CLÔTURE

Contrôles obligatoires (charte § 8.1), depuis la base, après écriture :

- même nombre de notes, d'ancres et de blocs qu'avant la passe ;
- aucune note sans ancre, aucune ancre sans note, aucun doublon de `note_key` ;
- ordre des blocs continu ;
- aucun bloc d'apparat critique touché ;
- la sauvegarde relue et le retour arrière éprouvé ;
- **l'œuvre ouverte à l'écran**, deux ou trois notes lues dans le texte servi.

⚠️ **Le dernier point n'est pas une politesse.** Ce dépôt a déjà vu une section entière
rester invisible en ligne pendant que ses neuf tests passaient.

---

## 12. Ce que le protocole NE couvre pas encore

- `segments.notes` (**2 456** segments) et `versets_v2.notes` (**3 641** versets) : notes
  libres, hors du modèle structuré. La charte § 8.1 les tient pour une dette explicite à
  migrer. Elles ne se normalisent pas avant d'être migrées.
- `bible_verse_notes` (**8 695**) et `bible_editorial_body_block_notes` (**371**) : ce sont
  les notes de Fillion, qui ont leur propre doctrine (charte § 35) et leur propre
  numérotation par chapitre. Hors de ce protocole.
- Les **métadonnées elles-mêmes** ont dérivé : `human_validated` (14 000) et
  `validated_human` (5 662) disent la même chose sous deux noms ; `reference_normalized`
  (1 682) et `normalised_reference` (1 032) aussi. À unifier, dans une passe à part.
