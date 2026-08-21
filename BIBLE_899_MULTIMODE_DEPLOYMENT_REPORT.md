# BIBLE 899 — Rapport de déploiement du lecteur multimode

Date : 7 août 2026

## Résultat

Le lecteur multimode de TR0009 a été déployé en production. La suite globale est entièrement verte. Aucune migration Supabase et aucune modification de données Bible n'ont été effectuées pendant cette tâche. Aucun travail AELF, de segmentation en versets ou de modernisation n'a été commencé.

Révision applicative déployée : `2ee736abec2162eb6b7afba138f913003022c118`.

Déploiement Vercel : succès (`Deployment has completed`, 7 août 2026 à 14:48:36 UTC).

- environnement : `https://bible-patristique-6vxjzb865-sqdv-s-projects.vercel.app`
- suivi : `https://vercel.com/sqdv-s-projects/bible-patristique/AHJv6t1Harv5jtmqrwXPw1dnG6ee`

## Dernier verrou historique

L'échec de `app/lib/historicalDates.integration.test.ts` provenait uniquement du déplacement du rendu de `HistoricalDate` vers `HistoireClient` :

- le test avait été créé par `acbd734` le 4 août 2026 à 18:25 ;
- la séparation serveur/client avait été introduite par `1cea951` le même jour à 19:13 ;
- ces deux événements sont antérieurs au chantier multimode Bible 899, dont la base est `e430fb4` ;
- aucun des fichiers concernés n'avait changé entre `e430fb4` et le début de cette correction.

Le test vérifie désormais l'invariant réel de l'architecture actuelle : la page serveur charge les événements et les transmet à `HistoireClient`, tandis que `HistoireClient` rend `HistoricalDate`, la précision puis la note, sans réintroduire les anciens champs. Aucun comportement de `/histoire` n'a été modifié.

Commit : `7f3bd8b450ad51d06f51c2a7eac0fa5d62b33d5d` (`test: suivre le rendu client des dates historiques`).

## Validations

Après la correction finale du lien manuscrit :

| Contrôle | Résultat |
|---|---:|
| Vitest global | 19 fichiers, 162/162 tests réussis |
| Tests Bible, Bible 899, multimodes et garde-fou Giguet | 10 fichiers, 71/71 tests réussis |
| TypeScript | réussi |
| Lint ciblé | réussi |
| Build Next.js de production | réussi, 85 pages |
| Déploiement GitHub → Vercel | réussi |

La condition « suite globale = 100 % réussie » est satisfaite.

## Contrôle réel de TR0009 en production

Le contrôle dans une session de navigateur authentifiée a confirmé :

- « Bible française du XIIIe siècle » est proposée et TR0009 reste sélectionnée lors des changements de mode ;
- « Structure native », « Diplomatique » et « Abréviations développées » sont disponibles ;
- « Paragraphes », « Versets » et « Graphie modernisée » sont absents ;
- le passage du diplomatique au développé modifie réellement le contenu : 30 lignes sur les 80 de la division échantillonnée diffèrent, notamment `⁊` rendu `et` ;
- la structure native expose 672 chapitres ;
- un chapitre natif couvrant la rupture matérielle 295v → 297r s'affiche sans erreur et aucun folio 296 n'est créé ;
- la console de cette page ne contenait ni avertissement ni erreur.

## Lien vers le manuscrit

Le premier contrôle de production a révélé une erreur réelle : le lien utilisait la clé matérielle interne `b899-material-0295-r`, que la route du lecteur de manuscrit ne comprend pas. Le clic produisait une erreur serveur.

La correction minimale utilise désormais le `column_id` public, par exemple :

`/manuscrits/bible-899?colonne=f295r_a`

Elle est couverte par un test unitaire et constitue le commit déployé `2ee736abec2162eb6b7afba138f913003022c118` (`fix: relier le multimode à la colonne manuscrite`). Le build, le lint, TypeScript et les 162 tests globaux ont été rejoués après cette correction.

La reconnexion au navigateur s'est interrompue avant l'ultime clic de confirmation sur le second déploiement. Le lien corrigé est donc garanti par le code déployé, le test dédié et le build, mais ce dernier clic n'a pas été observé une seconde fois en production.

## Bible historique et absence de régression

Les parcours historiques TR0001–TR0005 sont couverts par la suite ciblée Bible et la suite globale, toutes deux intégralement vertes. Le contrôle visuel final d'un témoin historique n'a pas pu être répété après l'interruption de la connexion au navigateur ; aucune régression n'a toutefois été détectée par les tests ou le build.

## Logs et anomalies restantes

- Vercel signale le déploiement comme terminé avec succès.
- La console de la page TR0009 contrôlée ne signalait aucune erreur liée au lecteur multimode.
- L'unique anomalie applicative observée, le mauvais identifiant du lien manuscrit, a été corrigée et redéployée.
- Limitation de contrôle : la connexion à l'extension de navigateur s'est interrompue après le second déploiement. Elle n'affecte ni le site, ni les tests, ni le build, mais empêche de qualifier les deux derniers clics comme visuellement revérifiés après correction.

## Conclusion

Le front multimode est déployé, la suite globale est à 162/162 et les trois modes publics de TR0009 fonctionnent. Aucun mode interdit n'est exposé et aucune donnée Bible n'a été modifiée. Le déploiement applicatif est achevé ; la seule réserve documentaire porte sur la répétition du contrôle visuel post-correction, interrompue par la connexion au navigateur.
