-- ⛔ UN PRÉLÈVEMENT BIBLIQUE NOMME LA TRADUCTION QU'IL A PRISE, PAR SON CODE (2026-09-23).
--
-- Demande de l'auteur : « on doit pouvoir identifier la langue et la traduction du
-- prélèvement, et le prélèvement doit apparaître sous sa forme prélevée telle qu'elle était
-- au clic ; dans une bible bilingue, quand je coche un verset, le signet du texte latin et
-- le signet du texte français se valident ; il faudrait n'en valider qu'un. »
--
-- La table ne portait que le NOM de la traduction (`traduction`), écrit par cinq surfaces
-- sous des formes qui ont varié (« Vulgate publiée par Fillion », « TR0003 »…), et la
-- clé d'un prélèvement était le seul créneau canonique : prélever le latin cochait donc le
-- français d'en face. `trad_id` porte le CODE, que la page lit pour savoir QUELLE colonne
-- est prélevée ; `traduction` reste le nom montré, et `texte` le texte tel qu'au clic.
--
-- ⚠️ Nullable, et seulement pour les prélèvements bibliques : un passage des Pères se
-- désigne par son texte (`id_texte`). Aucune contrainte de clé étrangère : la liste des
-- bibles est éditoriale, et une traduction retirée ne doit ni bloquer une écriture ni
-- effacer une citation.

set local lock_timeout = '5s';

create table if not exists internal.backup_prelevements_trad_id_20260923 as
  select id, traduction from public.prelevements where type = 'biblique';

alter table public.prelevements add column if not exists trad_id text;

alter table public.prelevements drop constraint if exists prelevements_trad_id_forme;
alter table public.prelevements add constraint prelevements_trad_id_forme
  check (trad_id is null or trad_id ~ '^TR[0-9]{4}$');

comment on column public.prelevements.trad_id is
  'Code de la traduction biblique prélevée (TR0001…). La page Bible marque le signet de CETTE colonne, et les autres en « prélevé ailleurs ». Nul pour un passage des Pères.';

-- Le remplissage : par le nom exact, par le code écrit à la place du nom, puis les deux
-- noms que la base a portés avant d'être renommés.
update public.prelevements p
   set trad_id = t.trad_id
  from public.traductions t
 where p.type = 'biblique' and p.trad_id is null
   and (p.traduction = t.nom or p.traduction = t.trad_id);

update public.prelevements set trad_id = 'TR0011'
 where type = 'biblique' and trad_id is null and traduction = 'Vulgate publiée par Fillion';
update public.prelevements set trad_id = 'TR0013'
 where type = 'biblique' and trad_id is null
   and traduction = 'Bible française du XIIIe siècle — traduction critique moderne';

-- Contrôle : aucun prélèvement biblique ne reste sans code.
do $$
declare restants integer;
begin
  select count(*) into restants from public.prelevements where type = 'biblique' and trad_id is null;
  if restants > 0 then raise exception 'prelevements bibliques sans trad_id : %', restants; end if;
end $$;
