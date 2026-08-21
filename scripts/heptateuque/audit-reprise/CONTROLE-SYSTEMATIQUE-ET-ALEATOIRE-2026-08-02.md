# Contrôle systématique et passe aléatoire — 2 août 2026

Œuvre : `A0010O0023`  
Avancement : **3 262 / 3 262 = 100,00 %**

## Contrôle systématique des segments sans lien

Les 16 segments initialement sans lien ont été relus avec leur contexte. Six
contenaient des omissions certaines :

- segment 65 : `ACT.7.2`, `ACT.7.3`, `ACT.7.4` (type 1) ;
- segment 94 : renvoi externe à Aulu-Gelle (type 4, cible à constituer) ;
- segments 1397 et 1406 : `EXO.26.12`, et `EXO.26.13` au segment 1406 ;
- segment 1633 : `LEV.8.28`, `LEV.8.29` ;
- segment 1655 : `EXO.27.1`, `EXO.20.26`.

Onze liens ont été ajoutés. Les dix segments encore sans lien sont justifiés :
**1-5, 64, 1296, 1396, 1593 et 3262**. Aucun ne contient de marqueur de
référence exploitable.

## Passe aléatoire reproductible

- Échantillon : 42 segments, six par livre.
- Graine : `2026-08-02|heptateuque|controle-aleatoire-v1`.
- Tirage conservé dans `controle-aleatoire-2026-08-02.json`.
- Lecture humaine du texte, du contexte et des liens existants.

Corrections certaines appliquées :

- 21 liens ajoutés ;
- 5 liens supprimés parce qu'ils ne faisaient que reproduire la rubrique sans
  être mobilisés dans le segment ;
- 1 lien retypé ;
- 7 motifs précisés ;
- 5 corrections de texte et 1 correction de note.

Trois observations seulement probables n'ont pas été mutées : fusion italique
et motif au segment 2114, portée de `NUM.30.5-6` au segment 2324, et éventuel
type 1 `DEU.24.17` au segment 2576.

## Audit intégral après corrections

- **9 633 liens** : type 1, 2 959 ; type 2, 159 ; type 3, 6 274 ; type 4,
  241.
- 157 références sans cible, toutes marquées `à constituer`.
- Aucun doublon, aucune cible invalide, aucun motif vide, aucun arbitrage
  inattendu.
- 115 occurrences conformes `[<i>sic</i>]` dans 110 segments, aucune
  occurrence brute `[sic]`, aucune balise `<i>` déséquilibrée.
- Base et candidats : 3 262 segments chacun, aucune différence de découpage.

Scripts :

- `controle-aleatoire-liens.mjs` ;
- `corrige-omissions-segments-sans-liens.mjs` ;
- `corrige-controle-aleatoire-2026-08-02.mjs` ;
- `audit-passes-paralleles-genese.mjs` ;
- `audit-sic-integral.mjs`.
