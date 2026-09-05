-- Contrôles de la migration « liens_bibliques — canon_livre, canon_chapitre ».
-- Rejoués après application réelle. Chaque assertion lève sur défaut.

do $controles$
declare
  n integer;
  m integer;
begin
  -- 1. Les colonnes engendrées disent EXACTEMENT ce que le motif disait.
  select count(*) into n from public.liens_bibliques where canon_id like 'GEN.1.%';
  select count(*) into m from public.liens_bibliques where canon_livre = 'GEN' and canon_chapitre = 1;
  if n <> m then
    raise exception 'ÉCHEC 1 : GEN 1 — % lien(s) par like, % par les colonnes engendrées.', n, m;
  end if;

  select count(*) into n from public.liens_bibliques where canon_id like 'PSA.119.%';
  select count(*) into m from public.liens_bibliques where canon_livre = 'PSA' and canon_chapitre = 119;
  if n <> m then
    raise exception 'ÉCHEC 1 bis : PSA 119 — % lien(s) par like, % par les colonnes engendrées.', n, m;
  end if;

  -- 2. Aucun lien au verset sans ses deux colonnes ; aucun lien au chapitre avec.
  select count(*) into n
  from public.liens_bibliques
  where canon_id is not null and (canon_livre is null or canon_chapitre is null);
  if n > 0 then
    raise exception 'ÉCHEC 2 : % lien(s) au verset sans livre ou chapitre engendré.', n;
  end if;

  select count(*) into n
  from public.liens_bibliques
  where canon_id is null and (canon_livre is not null or canon_chapitre is not null);
  if n > 0 then
    raise exception 'ÉCHEC 2 bis : % lien(s) au chapitre portent une colonne engendrée.', n;
  end if;

  -- 3. L'index existe.
  select count(*) into n
  from pg_indexes
  where schemaname = 'public' and tablename = 'liens_bibliques' and indexname = 'liens_bib_canon_chapitre_idx';
  if n <> 1 then
    raise exception 'ÉCHEC 3 : index liens_bib_canon_chapitre_idx absent.';
  end if;

  raise notice 'Contrôles liens_bibliques canon_livre/canon_chapitre : OK.';
end
$controles$;
