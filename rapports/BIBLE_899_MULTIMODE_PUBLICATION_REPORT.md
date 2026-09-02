# BIBLE 899 — Rapport de publication multimode

Date du contrôle : 7 août 2026

## Résultat

La publication distante de TR0009 a réussi atomiquement. Les seuls modes publics sont `diplomatic`, `expanded` et `native`. Aucun verset, paragraphe, alignement canonique ou texte modernisé n'a été créé.

Le déploiement du front n'a pas été exécuté : la suite globale contient un test ancien en échec, extérieur au chantier. Le brief autorise le déploiement uniquement si tous les tests réussissent. Le build de production et les 70 tests ciblés/relevants réussissent.

## Gardes avant écriture

- Charte IA relue intégralement.
- TEI actif SHA-256 : `b081a252ea3a705a4575c790a8a01a22267d6c83be65a9be76bdad329d6a3ec3`.
- Manifeste SHA-256 : `aec437d1bbeecda804f5da3545dc5bd0c9694cc87eee9a590ee37c8a7e21c192`.
- Source initiale : `review`; 58 314 unités, 2 couches privées, 116 628 textes, 696 divisions privées, 1 493 provenances, 59 090 liens.
- Zéro alignement TR0009, zéro ligne TR0009 dans `versets_v2`, zéro couche modernisée.
- TR0001–TR0005 conformes aux comptages de référence.

## Durcissement générique

Migration appliquée : `bible_multimode_verified_alignments_only_20260807` (`20260807135108`).

- La politique publique de `bible_canonical_alignments` n'expose que `verification_status = 'verified'`.
- `v_bible_canonical_lookup` applique la même restriction et reste `security_invoker = true`.
- Les rôles `anon` et `authenticated` ont uniquement la lecture prévue ; `service_role` conserve ses droits de service.
- Aucun alignement TR0009 n'existait : aucune donnée éditoriale n'a été modifiée par ce durcissement.

L'advisor Supabase ne signale, pour les nouveaux objets Bible, que deux informations `RLS enabled, no policy` sur les tables de provenance volontairement non exposées et des index encore inutilisés sur ce modèle neuf. Aucun avertissement ou erreur propre au chantier ne bloque la publication.

## Publication atomique

- Source TR0009 : `published`.
- Couche `diplomatic` : `validated`, publique, 58 314 textes.
- Couche `expanded` : `validated`, publique, 58 314 textes.
- Divisions natives : 696 `validated` et publiques, dont 24 livres et 672 chapitres.
- Unités : 58 314 ; lignes `has_unclear` : 661 ; unités avec `gap` : 8.
- Provenances : 1 484 images `PRIMARY`, 4 images `ALTERNATIVE` et 5 autres enregistrements de provenance.

Capacités relues sous le rôle public `anon` :

| Mode | Disponible |
|---|---:|
| diplomatic | oui |
| expanded | oui |
| native | oui |
| paragraph | non |
| verse | non |
| modernized | non |

`statut_corpus_public` vaut exactement :

> Transcription intégrale du manuscrit. Première campagne de relecture achevée ; certaines lectures demeurent signalées comme incertaines. Les modes diplomatique, abréviations développées et structure native sont disponibles. L’alignement canonique en versets reste à établir.

`schema_numerotation` demeure `vulgate`.

## Recompositions

| Couche | Forme | SHA-256 |
|---|---|---|
| Diplomatique | avec séparateurs | `a7147e9144d71c32ff16c89a6dd1ec68dab816256250c53fcf6151e0de2fcd2b` |
| Diplomatique | continue | `ecbebcc3aab1adf840195df773d7fe3747f3f556ad8fb3c2d2470d16d2953b31` |
| Développée | avec séparateurs | `37cdba54b6be2d364536e31aca4cab64689430e7227ac55eb09b106b4cf2a751` |
| Développée | continue | `a86e08c240a5eb626016a08f3baaff827743caeaa23f5b8a60488cb16667635f` |

Les quatre empreintes correspondent au mandat.

## Foliotation et garde-fous

- Aucun folio natif 296.
- Succession matérielle : 295v → 297r.
- Dernière cote native : 372v.
- Dernière unité : `f371v_b_l40`.
- `versets_v2` TR0009 : 0.
- `bible_canonical_alignments` TR0009 : 0.
- `modernized` TR0009 : 0.
- Le garde-fou anti-collision TR0009/Giguet réussit.

## Compatibilité et intégration Git

Comptages inchangés : TR0001 36 290 ; TR0002 31 189 ; TR0003 35 594 ; TR0004 36 004 ; TR0005 26 728.

La branche `confort-lecture` a été avancée proprement par fast-forward jusqu'au commit `fc03551`, sans écraser les modifications étrangères présentes dans son arbre de travail. Les contrôles ciblés couvrent la lecture classique, le polyglotte, la navigation, `versets_lecture` et des échantillons répartis.

## Tests et build

- Tests ciblés/relevants après intégration : 70/70 réussis.
- Validation locale PGlite de la migration, RLS et du témoin `review`/`verified` : réussie.
- Validation distante post-publication : réussie.
- TypeScript : réussi.
- Lint ciblé : réussi.
- Build de production Next.js : réussi (85 pages).
- Suite globale : 160/161.

Échec global restant : `app/lib/historicalDates.integration.test.ts` attend encore l'emploi direct de `HistoricalDate` dans `app/histoire/page.tsx`, alors que le composant a été déplacé dans `HistoireClient`. Ni ce test ni les fichiers concernés n'ont changé entre le commit de base `e430fb4` et le chantier multimode. Conformément au brief, cette anomalie extérieure n'a pas été corrigée ici.

## Contrôle réel de la page

Sur le serveur local intégré, avec une session Chrome authentifiée :

- TR0009 apparaît sous « Bible française du XIIIe siècle » ;
- les boutons « Structure native », « Diplomatique » et « Abréviations développées » sont présents ;
- « Paragraphes », « Versets » et « Graphie modernisée » sont absents ;
- les changements de mode diplomatique et développé deviennent effectivement actifs (`aria-pressed=true`) sans changer TR0009 ;
- la structure native affiche les divisions du témoin.

Le contrôle après déploiement n'a logiquement pas été effectué, puisqu'aucun déploiement n'a été lancé.

## Conclusion

Les trois modes sont publiés et contrôlés dans Supabase. Le code correspondant est intégré localement et son build réussit. Le déploiement demeure volontairement bloqué par la condition « tous les tests réussis ». Aucun chantier AELF, aucun verset TR0009 et aucune graphie modernisée n'ont été entrepris.
