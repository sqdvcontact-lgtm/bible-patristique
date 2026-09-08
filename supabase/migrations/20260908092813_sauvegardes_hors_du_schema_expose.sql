-- LES SAUVEGARDES N'ONT RIEN À FAIRE DANS `public`.
--
-- Trois tables de sauvegarde s'étaient posées dans le schéma que PostgREST expose,
-- au lieu d'`internal` où vivent leurs dix mille sœurs. Créées par un simple
-- `create table … as select`, elles héritaient des privilèges par défaut : lisibles
-- ET modifiables (insert, update, delete) par n'importe quel compte connecté, sans
-- RLS pour les borner. Une sauvegarde qu'un tiers peut réécrire ne sauvegarde rien.
--
-- `internal` n'est pas dans les schémas exposés par PostgREST : y déplacer une
-- table la retire de l'API sans toucher à son contenu. Le déplacement conserve les
-- données, les index et les contraintes.
--
-- La cause est traitée à part, par les `alter default privileges` de la migration
-- « fermer_le_role_anonyme » : sans eux, la prochaine table créée ici rouvrirait
-- la même porte.

alter table if exists public.backup_a0044o0002_p5_nested_renderer_20260905 set schema internal;
alter table if exists public.backup_a0051o0045_fr_charte_20260907          set schema internal;
alter table if exists public.backup_a0051o0045_la_charte_20260907          set schema internal;

-- Et on retire à `authenticated` ce qu'il n'aurait jamais dû avoir dessus.
revoke all on internal.backup_a0044o0002_p5_nested_renderer_20260905 from authenticated;
revoke all on internal.backup_a0051o0045_fr_charte_20260907          from authenticated;
revoke all on internal.backup_a0051o0045_la_charte_20260907          from authenticated;
