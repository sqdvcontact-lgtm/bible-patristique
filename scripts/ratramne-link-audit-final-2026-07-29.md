# Ratramne — audit final des liens bibliques (29 juillet 2026)

## État publié

- Œuvre : `A0091O0001` — *Du Corps et du Sang du Seigneur*.
- Notice : `1937` — `presence_sur_le_site = true`.
- Segments : **568/568 relus**, avec `liens_revus_par = IA-lecture`.
- Liens bibliques : **139** sur **81 segments**, vers **52 versets distincts**.
- Répartition : type 1 = **64** ; type 2 = **30** ; type 3 = **45** ; type 4 = **0**.
- Tous les liens ont `fiabilite = vérifié`, `provenance = lecture`, un motif non vide et `arbitrage_requis = false`.
- Doublons de clé `(segment, canon_id, type)` : **0**.
- Cibles canoniques absentes : **0**.

## Principales corrections des indications imprimées

- `[[99]] 1 Cor. 10.6` : le passage commente en réalité 1 Co 10,1-2.
- `[[152]] Rom. 6.4` : « la mort n’a plus d’empire » cible Rm 6,9.
- `[[167]] Jean 6.36` : « les paroles que je vous dis sont esprit et vie » cible Jn 6,63.
- `[[180]] 1 Cor. 11.24` : « vous annoncerez la mort du Seigneur » cible 1 Co 11,26.
- `[[182]] 2 Cor. 12` : « face à face » cible 1 Co 13,12.
- `[[183]] Jér. 6` : « l’Esprit vivifie, la chair ne profite de rien » cible Jn 6,63.
- Les psaumes suivent les identifiants canoniques locaux : Ps 77,25 ; Ps 33,9 ; Ps 103,15.

Les fichiers Word n’ont pas été modifiés : ces corrections ne concernent que les liens structurés en base.

## Passe d’oubli

Les détections restantes sans lien ont été relues et écartées :

- segment 39 : faux positif sur `Lib. 1`, référence bibliographique ;
- segment 175 : citation de Ratramne lui-même ;
- segments 274, 530 et 536 : prières liturgiques, non versets ;
- segments 310 et 313 : discours sur les « paroles du Seigneur », sans passage déterminable ;
- segment 340 : notes bibliques déplacées typographiquement ; leurs citations sont au segment 341, dûment lié ;
- segments 422, 435, 437, 443, 445, 446, 457 et 461 : citations ou développements patristiques, sans verset biblique précis à attribuer ;
- segment 503 : note générale « Matthieu 27 », sans verset déterminable par le contenu.

Cette décision suit la règle de prudence de la charte : une omission vaut mieux qu’un faux lien.

## Contrôles techniques

- Écriture en trois passes transactionnelles, chacune réexécutable sans duplication.
- Passe finale de publication transactionnelle et idempotente.
- `npx.cmd tsc --noEmit` : succès.
- `git diff --check` ciblé : aucune erreur (simple avertissement de fin de ligne sur un fichier existant).
- Les trois DOCX, le JSON maître et le fac-similé PDF conservent leurs empreintes SHA-256 visées avant import.

Scripts de contrôle et de reprise :

- `ratramne-apply-links-pass1-2026-07-29.mjs`
- `ratramne-apply-links-pass2-2026-07-29.mjs`
- `ratramne-apply-final-link-gaps-2026-07-29.mjs`
- `ratramne-final-link-audit-readonly-2026-07-29.mjs`
- `ratramne-publish-2026-07-29.mjs`
