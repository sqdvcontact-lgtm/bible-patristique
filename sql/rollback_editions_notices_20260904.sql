-- Retour en arrière de la migration 20260904190000_editions_sources_notices_lisibles.
--
-- Elle a réécrit « source_nom » (six bibles) et « particularites » (cinq) pour qu'une
-- notice d'édition se lise sans connaître la base. L'état d'avant est intégral dans
-- internal.backup_editions_notices_20260904 : on le repose tel quel.
--
-- ⚠️ La table de sauvegarde n'est PAS supprimée : elle date la reprise, et une
-- sauvegarde qu'on efface après s'en être servi ne protège plus de la fois suivante.

begin;

update public.editions_sources e
   set source_nom = b.source_nom,
       particularites = b.particularites
  from internal.backup_editions_notices_20260904 b
 where b.trad_id = e.trad_id;

do $$
declare n int;
begin
  select count(*) into n
    from public.editions_sources e
    join internal.backup_editions_notices_20260904 b on b.trad_id = e.trad_id
   where e.source_nom is distinct from b.source_nom
      or e.particularites is distinct from b.particularites;
  if n > 0 then raise exception 'Restauration incomplète : % ligne(s)', n; end if;
end $$;

commit;
