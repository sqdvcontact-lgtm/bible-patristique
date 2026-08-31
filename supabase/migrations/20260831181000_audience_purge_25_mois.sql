-- Purge de la mesure d'audience à 25 mois (2026-08-31).
--
-- La page Confidentialité annonce cette durée, il faut donc qu'elle soit tenue par
-- la base et non par une intention. La CNIL borne à 25 mois les données d'une
-- mesure d'audience dispensée de consentement. L'identifiant, lui, est déjà bien
-- en deçà de la borne des 13 mois : l'empreinte de `vues_pages` tourne CHAQUE JOUR,
-- si bien que deux vues séparées d'une nuit ne se rapprochent plus.
--
-- ⚠️ Le travail se demande d'abord s'il a du travail. C'est la leçon de la panne du
-- 29 août : `rafraichir_lecture` reconstruisait une vue matérialisée toutes les
-- minutes sans jamais regarder si quelque chose avait changé, et la base n'avait
-- plus de marge. Ici, un `delete` sur un index de date ne trouve presque jamais
-- rien à faire, et il ne s'exécute qu'une fois par mois.

begin;

create or replace function public.purger_vues_pages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  supprimees integer;
begin
  delete from public.vues_pages where vu_le < now() - interval '25 months';
  get diagnostics supprimees = row_count;
  return supprimees;
end;
$$;

-- ⛔ PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction nouvelle. Sur un
-- SECURITY DEFINER qui SUPPRIME des lignes, cela ouvrirait la purge au premier
-- venu muni de la seule clé publique.
revoke all on function public.purger_vues_pages() from public;
grant execute on function public.purger_vues_pages() to service_role;

comment on function public.purger_vues_pages() is
  'Retire les vues de plus de 25 mois. Appelée par le travail cron « purger_audience », le 1er de chaque mois.';

-- `cron.schedule` remplace un travail de même nom : la migration se rejoue sans
-- créer de doublon.
select cron.schedule('purger_audience', '0 3 1 * *', 'select public.purger_vues_pages();');

commit;
