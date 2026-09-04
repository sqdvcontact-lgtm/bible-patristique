-- Contrôles de la migration « rechercher_pericopes — titre, appellations, référence ».
-- Joués DANS la transaction d'essai (`scripts/fillion/dry-run-migration.mjs`), puis
-- rejoués après application réelle. Chaque assertion lève sur défaut : `exec_sql`
-- ne rend pas les lignes d'un `select`, c'est donc l'exception qui parle.

do $controles$
declare
  n integer;
  m integer;
begin
  -- 1. La recherche par NOM ne rend plus que des noms qui portent le terme.
  select count(*) into n
  from public.rechercher_pericopes('noces', 12) r
  where btrim(regexp_replace(lower(extensions.unaccent(r.correspondance)), '[^[:alnum:]]+', ' ', 'g'))
        not like '%noces%';
  if n > 0 then
    raise exception 'ÉCHEC 1 : « noces » rend encore % résultat(s) qui ne portent pas le terme.', n;
  end if;

  select count(*) into n from public.rechercher_pericopes('noces', 12);
  if n < 2 then
    raise exception 'ÉCHEC 1 bis : « noces » ne rend plus que % résultat(s) — la voie stricte a été coupée.', n;
  end if;

  -- 2. Le SECOURS tient : une faute de frappe trouve encore sa péricope.
  select count(*) into n
  from public.rechercher_pericopes('nocse de cana', 8) r
  where r.titre = 'Noces de Cana';
  if n <> 1 then
    raise exception 'ÉCHEC 2 : « nocse de cana » ne retrouve plus « Noces de Cana » (% ligne(s)).', n;
  end if;

  -- 3. La RÉFÉRENCE trouve, et ne rend que le passage demandé.
  select count(*) into n from public.rechercher_pericopes('Mt 5', 12, 'MAT', 5, null);
  if n = 0 then
    raise exception 'ÉCHEC 3 : « Mt 5 » ne rend aucune péricope.';
  end if;

  select count(*) into m
  from public.rechercher_pericopes('Mt 5', 12, 'MAT', 5, null) r
  where not exists (
    select 1
    from jsonb_array_elements(r.occurrences) o
    where o->>'livre' = 'MAT'
      and 5 between (regexp_match(o->>'debut', '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[1]::int
                and (regexp_match(o->>'fin',   '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[1]::int
  );
  if m > 0 then
    raise exception 'ÉCHEC 3 bis : % péricope(s) rendues pour « Mt 5 » ne couvrent pas Matthieu 5.', m;
  end if;

  -- 4. Un verset précis resserre le résultat (Mt 5, 3 ⊂ Mt 5).
  select count(*) into m from public.rechercher_pericopes('Mt 5, 3', 12, 'MAT', 5, 3);
  if m = 0 then
    raise exception 'ÉCHEC 4 : « Mt 5, 3 » ne rend aucune péricope.';
  end if;
  if m > n then
    raise exception 'ÉCHEC 4 bis : « Mt 5, 3 » rend PLUS de péricopes (%) que « Mt 5 » (%).', m, n;
  end if;

  -- 5. Une péricope trouvée par sa référence l'est sous son TITRE : la ligne
  --    « Correspond à … » ne doit pas paraître.
  select count(*) into n
  from public.rechercher_pericopes('Mt 5', 12, 'MAT', 5, null) r
  where r.correspondance <> r.titre;
  if n > 0 then
    raise exception 'ÉCHEC 5 : % résultat(s) de référence portent une appellation au lieu du titre.', n;
  end if;

  -- 6. L'appel à DEUX arguments reste valide (la barre de recherche l'emploie).
  perform public.rechercher_pericopes('vigne', 8);

  -- 7. Un livre sans chapitre ne déclenche PAS la voie de la référence :
  --    « Jonas » reste une recherche par nom.
  select count(*) into n from public.rechercher_pericopes('jonas', 12, null, null, null);
  if n = 0 then
    raise exception 'ÉCHEC 7 : « jonas » ne rend plus rien.';
  end if;

  raise notice 'Contrôles rechercher_pericopes : tous passés.';
end
$controles$;
