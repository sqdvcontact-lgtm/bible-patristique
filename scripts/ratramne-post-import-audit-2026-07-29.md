# Ratramne 1673 — audit du postétat Supabase

Date : 29 juillet 2026.

## Résultat de l'import

- Œuvre : `A0091O0001`.
- Auteur : `A0091` — Ratramne de Corbie.
- Notice : `catalogue_notices.id = 1937`.
- Import réalisé dans une transaction unique, puis rejoué sans écriture pour vérifier son idempotence.
- Empreinte éditoriale du candidat : `09ED71415DC8FDDB814F50104763B076021879D7970D89196DD82F8653A758CE`.
- Empreinte éditoriale des lignes relues depuis Supabase : `09ED71415DC8FDDB814F50104763B076021879D7970D89196DD82F8653A758CE`.
- Publication : `false`.

## Contrôles SQL indépendants

| Contrôle | Résultat |
|---|---:|
| Segments | 568 |
| Numéro minimal / maximal / distincts | 1 / 568 / 568 |
| Apparat critique | 327 |
| Corps de l'œuvre | 241 |
| Lignes portant le latin | 101 |
| Latin placé après le rang 1 | 0 |
| Segments vides | 0 |
| Groupes aux rangs discontinus | 0 |
| Groupes bilingues ayant un nombre de lignes latines incorrect | 0 |
| Appels de notes | 184, tous distincts |
| Définitions de notes | 184, toutes distinctes |
| Appels sans définition / définitions sans appel | 0 / 0 |
| Signes français recalculés par le déclencheur | 174 133 |

Le premier comptage SQL limité à `segment_texte` et `texte_original` trouvait 183 appels : le 184e est, conformément au modèle, l'appel `[[78]]` du titre développé `ref_niv1_texte`. Le contrôle étendu à tous les champs affichables retrouve bien 184 appels et 184 définitions.

## Recette du lecteur

- Ajout d'une bascule `Français` / `Français · latin`, proposée uniquement lorsque l'œuvre contient un original.
- En mode bilingue, l'alignement se fait au paragraphe source : 48 couples dans la première partie et 53 dans la seconde, colophon `FIN.` compris.
- Sur petit écran, les deux colonnes deviennent une pile français puis latin ; le latin est signalé par un filet discret.
- Les appels numériques globaux restent globaux : `[[78]]` s'affiche `78` et non `1`.
- La note de titre est active dans le titre développé ; sa syntaxe de stockage est masquée dans le sommaire compact.
- Contrôle TypeScript : réussi (`tsc --noEmit`).

## État de sortie

L'import structurel et la recette bilingue sont validés. L'œuvre reste hors publication jusqu'à l'achèvement de la campagne de liens bibliques et de la recette finale.
