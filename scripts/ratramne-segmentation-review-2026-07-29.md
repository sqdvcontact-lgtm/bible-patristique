# Ratramne 1673 — procès-verbal de segmentation

Date de clôture de la passe : 29 juillet 2026.

## Périmètre relu

- Candidat : `tmp/ratramne-import-2026-07-29/ratramne-segments-candidate.json`.
- Empreinte SHA-256 du candidat : `A4988A73F66AF33F0A8E65DF5AA124388E552C5C986848AB9258D739599583C3`.
- Registre d'alertes : `tmp/ratramne-import-2026-07-29/ratramne-alerts.json`.
- Empreinte SHA-256 du registre : `0DD0A28A4C88D3BA007704EF3ECAD8745FF3DC1E76DABBB26DB7C387E37ED12E`.

Toute modification ultérieure du candidat ou du registre invalide le présent visa et impose une nouvelle passe.

## Décisions

- 103 frontières proposées après ponctuation ont été lues en contexte et retenues : 77 après point-virgule et 26 après deux-points.
- 13 frontières proposées ont été rejetées parce que la proposition suivante dépendait syntaxiquement de la précédente. Ces refus sont consignés dans `ratramne-transformations.json` et intégrés au constructeur.
- 47 segments dépassent le seuil d'alerte de longueur. Ils sont conservés volontairement : 13 contiennent une citation introduite ou complète qu'il ne faut pas morceler ; 34 correspondent à une phrase ancienne longue ou à une construction syntaxique indivisible selon la charte.
- Les guillemets français fermants et les appels de note restent attachés à leur ponctuation.
- Aucune coupure n'est pratiquée à l'intérieur d'une citation française ouverte.

## Exceptions structurelles documentées

- Les trois notes attachées aux titres sont conservées sur le premier groupe de la première partie, sans déplacement dans la première phrase.
- « Première partie » est une restitution structurelle minimale, déduite de l'intitulé imprimé « Seconde partie » et de l'annonce des deux questions de l'œuvre.
- Le latin aligné demeure entier sur le rang 1 de chaque paragraphe source ; il n'est ni réparti ni répété sur les rangs suivants.

## Conclusion

Il ne subsiste aucune alerte structurelle non résolue. Le registre d'alertes est conservé comme trace des décisions de lecture, non comme liste de corrections à effectuer. Le candidat peut passer au contrôle de préétat Supabase puis à l'import non publié.
