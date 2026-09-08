# Carnet de chantier — Corpus Scriptura

Ce carnet reçoit ce que la charte refuse. Il **n'est pas normatif** : en cas de divergence, la charte prévaut, toujours.

Il vit dans **`parametres.carnet_ia`**, comme la charte vit dans `parametres.charte_ia`. `charte/CARNET_IA.md` n'en est qu'un miroir, tiré et poussé par `node scripts/synchroniser-charte-supabase.mjs --carnet --pull` (ou `--push`).

## Ce qui s'écrit ici

Les journaux de séance, les bilans chiffrés, les listes d'œuvres traitées, les mesures datées, les relevés d'audit, le récit d'une correction, les anciennes décisions et ce qui a été essayé puis écarté.

## ⛔ Ce qui ne s'écrit PAS ici

Une **règle**. Elle se reconnaît à ce qu'elle vaut pour la PROCHAINE séance : elle prescrit, elle interdit, elle nomme un invariant, elle dit ce qu'un contrôle doit refuser. Sa place est dans la charte, et nulle part ailleurs.

⚠️ **Une trouvaille de carnet peut FONDER une règle, et c'est le chemin ordinaire** : on écrit alors la règle dans la charte, courte, et l'on garde ici la mesure qui la soutient, avec sa date. Le carnet porte la preuve, la charte porte la loi.

## Entrées

### 2026-09-08 — Ouverture du carnet

La charte interdisait le journal de chantier dès son préambule, et depuis l'origine : « Les journaux de chantier, bilans chiffrés, listes d'œuvres traitées et anciennes décisions ne lui appartiennent pas. » Elle en portait pourtant 925 336 signes, dont le § 38 (166 714) et le § 35 (132 499) sont en grande part des journaux, sous des titres qui ne les décrivent plus.

**Une interdiction sans destination ne s'applique pas.** Le carnet est la destination.

Relevé du jour, avant remise en ordre :

| ce qui a été mesuré | valeur |
|---|---|
| charte | 925 336 signes, 6 322 lignes, 50 chapitres, 417 titres |
| sous-sections loin de leur chapitre (> 300 lignes) | **96**, soit **235 600 signes — 26,1 %** |
| pire écart | § 12.4, à 4 787 lignes du § 12 |
| bloc le plus disloqué | § 13.8 à § 13.12.3, onze sous-sections, à ~3 900 lignes du § 13 |
| numéros portés deux fois | 12.3, 43.1, 43.2 — corrigés le jour même |
| chapitres de premier rang sans numéro | 1 (« Césures de mots entre unités source », 10 832 signes) |
| endroits où vit la règle typographique | 7 |
| `parametres` | 708 clés, ~239 Mo, dont **234 Mo de sauvegardes (98 %)** |
| dont copies complètes de la charte | **180, pour 82 Mo** |

**La cause de la dislocation n'est pas un relâchement, c'est un invariant.** Les 139 scripts `charte-*.mjs` portent tous `if (!attendu.startsWith(distant.trimEnd())) throw` : le garde-fou rend impossible de tronquer 900 000 signes par accident, et impossible d'insérer une section à sa place. Toute doctrine nouvelle s'est donc posée en queue, et une section neuve a fini par tomber sur un numéro déjà pris — ce qui bloquait `--push` depuis le 25 août, et forçait à écrire directement en base, ce qui aggravait la dislocation. La boucle est fermée le 2026-09-08.
