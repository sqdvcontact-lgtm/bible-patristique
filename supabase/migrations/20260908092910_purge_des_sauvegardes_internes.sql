-- LA RÈGLE DE RÉTENTION QUI MANQUAIT.
--
-- La charte veut qu'on sauvegarde une table avant d'y toucher (§1.4). Elle ne
-- disait pas quand jeter la sauvegarde. Résultat au 8 septembre 2026 : le schéma
-- `internal` portait 10 735 tables pour 4 465 Mo, quand tout le site (`public`)
-- en pèse 3 316 — plus de la moitié de la base était de la sauvegarde de travail,
-- accumulée à raison de 200 à 630 tables par jour depuis le 28 juillet. La base
-- atteignait 8 094 Mo, c'est-à-dire le plafond du palier. Et le `pg_dump` de
-- chaque nuit emportait tout cela dans son artefact.
--
-- ⛔ NE PORTE QUE SUR `internal`, et seulement sur les noms qui commencent par
-- `backup_` ou `stage_` ET portent une date valide. Une table sans date dans le
-- nom n'est JAMAIS touchée : on ne sait pas de quand elle date, donc on la garde.
-- C'est délibérément trop prudent plutôt que trop zélé.
--
-- La fonction rend le nombre de tables supprimées. `p_max` borne chaque appel :
-- supprimer cinq mille tables d'un coup dépasse le délai d'une instruction.
-- `p_essai` (défaut : vrai) fait un tour à blanc, qui compte sans rien détruire.
--
-- Passage du 8 septembre 2026, fenêtre de quinze jours : 5 300 tables supprimées,
-- 1 898 Mo rendus (8 094 Mo -> 6 196 Mo). Les tables supprimées restent dans les
-- vidages nocturnes conservés 90 jours (.github/workflows/backup-supabase.yml).
--
-- À REJOUER de temps en temps :
--   select internal.purger_sauvegardes(15, 100000, true);        -- à blanc
--   select internal.purger_sauvegardes(15, 1500, false);         -- pour de bon

create or replace function internal.purger_sauvegardes(
  p_jours int  default 15,
  p_max   int  default 500,
  p_essai bool default true
) returns int
language plpgsql
as $$
declare
  t   record;
  n   int := 0;
begin
  for t in
    select (quote_ident(ns.nspname) || '.' || quote_ident(c.relname)) as nom
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'internal'
      and c.relkind  = 'r'
      and (c.relname like 'backup\_%' or c.relname like 'stage\_%')
      and c.relname ~ '20[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])'
      and to_date(
            substring(c.relname from '(20[0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01]))'),
            'YYYYMMDD'
          ) < current_date - p_jours
    order by c.relname
    limit p_max
  loop
    if not p_essai then
      execute format('drop table if exists %s cascade', t.nom);
    end if;
    n := n + 1;
  end loop;
  return n;
end
$$;

comment on function internal.purger_sauvegardes(int, int, bool) is
  'Supprime les sauvegardes de travail d''internal plus vieilles que p_jours. '
  'Tour à blanc par défaut : appeler avec p_essai => false pour supprimer réellement. '
  'Ne touche ni à public, ni aux tables dont le nom ne porte pas de date valide.';

-- Personne d'autre que le propriétaire de la base n'a à l'appeler.
revoke all on function internal.purger_sauvegardes(int, int, bool) from public;
