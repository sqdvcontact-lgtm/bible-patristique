# État final de l’Heptateuque

Date de clôture : 2 août 2026  
Œuvre : `A0010O0023`

## Travail achevé

- OCR contrôlé sur les sept livres et segmentation importée en base.
- **3 262 / 3 262 segments relus : 100,00 %.**
- **9 633 liens** : type 1, 2 959 ; type 2, 159 ; type 3, 6 274 ; type 4,
  241.
- Répartition : Genèse 1 829 ; Exode 2 671 ; Lévitique 1 263 ; Nombres
  1 068 ; Deutéronome 984 ; Josué 610 ; Juges 1 208.
- 157 références sans cible explicitement marquées `à constituer`.
- 10 segments légitimement sans lien : 1-5, 64, 1296, 1396, 1593 et 3262.
- Audit final : aucun doublon, aucune cible invalide, aucun motif vide et
  aucun arbitrage inattendu.
- Typographie : aucune marque brute `[sic]`, 115 occurrences
  `[<i>sic</i>]` dans 110 segments, aucune balise `<i>` déséquilibrée.

## Règle *sic* désormais applicable

- Une coquille orthographique réellement imprimée est conservée avec
  `[<i>sic</i>]`.
- Une erreur introduite par l’OCR est corrigée sans *sic*.
- Une anomalie de syntaxe, d’accord, de ponctuation ou de numérotation ne
  reçoit pas automatiquement de *sic*.
- En cas de doute, contrôler le fac-similé avant toute mutation.

## Dettes distinctes et facultatives

- Contrôle visuel final du rendu dans l’application.
- Régénération du Word maître dans « Nuages » avec les dernières corrections.
- Constitution éventuelle des 157 références externes ou non résolues.
- Arbitrage éditorial des 118 groupes d’écarts typographiques préexistants
  entre la base et les candidats ; aucune différence de segmentation.
- Vérification explicite de la publication de la notice dans le catalogue.

## Sources de vérité

- Charte : `scripts/_charte.md`.
- Journal détaillé : `scripts/heptateuque/audit-reprise/JOURNAL-LIENS.md`.
- Audit : `scripts/heptateuque/audit-passes-paralleles-genese.mjs`.
- Candidats : `scripts/heptateuque/segmentation-candidate/`.
