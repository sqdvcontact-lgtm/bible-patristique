# Audit de l’ossature canonique AELF

Date du contrôle : 2026-08-07

Projet Supabase contrôlé en lecture seule : `oucotpxcjalwgetylfbz`
Portée : diagnostic préalable seulement ; aucune table distante n’a été modifiée.

## Conclusion

La compatibilité exacte de `public.versets_canon` avec l’ossature AELF finale n’est **pas démontrée**.

La table est cohérente en interne et plusieurs corrections documentées la rapprochent explicitement de la numérotation AELF. Cependant, son origine n’est pas un export AELF versionné et indépendant : `scripts/import-ossature-crampon.mjs` a construit simultanément l’ossature et TR0003 depuis `FreCrampon.json`. `scripts/travaux-verse.mjs` documente ensuite que cette origine commune a été découverte lors du contrôle du Siracide et qu’une bascule corrective vers l’AELF a été engagée. Le dépôt ne contient ni photographie complète de la structure AELF ayant servi de référence, ni version/date de cette structure, ni provenance ligne par ligne dans `versets_canon`.

Conséquence bloquante : aucune ligne TR0009 ne doit être créée dans `bible_canonical_alignments` avant un audit indépendant, reproductible et versionné de toute l’ossature. Le présent chantier laisse donc cette table vide pour TR0009.

## Contrôles effectués

### État de la table distante

- 35 560 créneaux ;
- 75 codes de livres ;
- aucune clé `(livre, ch_canon, v_canon)` dupliquée ;
- ordre global présent et strictement exploitable ;
- 0 ligne marquée `est_suscription` ;
- 107 lignes portent un commentaire éditorial : une correction de Néhémie et les migrations de Daniel 13/14 vers `SUS` et `BEL` ;
- 2 527 créneaux de psaumes, répartis sur 150 chapitres ;
- 1 406 créneaux du Siracide, répartis sur 51 chapitres.

Ces contrôles établissent la cohérence technique de l’ossature, pas son identité exhaustive avec l’AELF.

### Provenance dans le dépôt

- `scripts/import-ossature-crampon.mjs` décrit une création de `versets_canon` et de TR0003 depuis le même fichier Crampon ;
- le même script applique une conversion spéciale des psaumes hébreux vers une numérotation dite AELF ;
- `scripts/aelf-correspondance.mjs` vérifie la présence des livres et deux points de couture du psautier, mais ne compare pas l’ensemble des chapitres et versets à une source AELF figée ;
- `scripts/travaux-verse.mjs` indique explicitement que l’ossature et TR0003 n’étaient pas des témoins indépendants et décrit des corrections manuelles du Siracide ;
- plusieurs scripts postérieurs documentent encore des créneaux surnuméraires, absents ou corrigés selon les livres.

### Source AELF consultée

L’index public et des pages de structure AELF ont été consultés sans copier le texte biblique :

- https://www.aelf.org/bible
- https://www.aelf.org/bible/Si/0
- https://www.aelf.org/bible/Si/1

Ces pages confirment notamment l’existence d’un prologue `Si 0` et de particularités structurelles internes que la simple plage `SIR.1` à `SIR.51` ne suffit pas à décrire. Une consultation ponctuelle du site ne constitue toutefois pas un jeu de référence complet ni stable.

## Écarts et incertitudes à lever

1. Aucune source AELF structurelle complète, datée et hachée n’est archivée.
2. L’absence totale de `est_suscription = true` empêche d’affirmer que les titres de psaumes sont modélisés comme dans la référence attendue.
3. Le prologue AELF du Siracide (`Si 0`) n’est pas représenté comme chapitre canonique dans la plage distante observée.
4. Les traitements de `SUS` et `BEL`, autrefois `DAN.13` et `DAN.14`, résultent d’une migration locale documentée, sans preuve d’un export AELF complet associé.
5. Les corrections ponctuelles du Siracide et d’autres livres ne prouvent pas que tous les créneaux non touchés ont été comparés.
6. Les deux coutures du psautier contrôlées par `scripts/aelf-correspondance.mjs` ne couvrent pas toutes les différences possibles de titres, versets et subdivisions A/B.

## Audit requis avant alignement

Le prochain chantier devra :

1. figer une source structurelle AELF licitement exploitable, avec URL, date, version et SHA-256 ;
2. relever pour chaque livre la suite complète `(livre, chapitre, verset, suscription/subdivision)` sans importer le texte sous droits ;
3. comparer les 35 560 créneaux courants à cette source, dans les deux sens ;
4. produire un journal exhaustif des absences, surplus, décalages, fusions, scissions et prologues ;
5. arbitrer séparément les psaumes, le Siracide, Daniel/Suzanne/Bel et tout livre hors de la liste AELF adressable ;
6. ajouter une provenance et une version d’ossature avant toute insertion dans `bible_canonical_alignments`.

## Décision pour le chantier multimode

- `versets_canon` : lecture seule, inchangée ;
- `versets_v2` : inchangée ; aucune ligne TR0009 ;
- `bible_canonical_alignments` : schéma préparé, aucune donnée TR0009 ;
- alignement AELF : **NON COMMENCÉ** ;
- dette : consignée et bloquante pour le futur mode canonique de TR0009.
