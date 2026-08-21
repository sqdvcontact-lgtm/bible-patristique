-- Contrôles de
-- supabase/migrations/20260820150500_bible_editorial_notice_subtype.sql.
-- Les essais d'écriture portent sur une ligne existante et sont systématiquement
-- annulés : chaque bloc « begin … exception » forme sa propre sous-transaction,
-- et une exception y est levée dans tous les cas. Ce fichier ne laisse aucune
-- modification.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bible_editorial_body_blocks'
      and column_name = 'notice_subtype'
      and is_nullable = 'YES'
  ) then
    raise exception 'La colonne facultative notice_subtype manque au bloc de corps.';
  end if;
end
$$;

-- La vue développait « b.* » : sans reconstruction, la colonne resterait
-- invisible au lecteur.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'v_bible_editorial_body_blocks'
      and column_name = 'notice_subtype'
  ) then
    raise exception 'La vue des blocs de corps n expose pas notice_subtype.';
  end if;
end
$$;

do $$
declare
  missing_grants text[];
begin
  select array_agg(expected.grantee order by expected.grantee)
  into missing_grants
  from (values ('anon'), ('authenticated'), ('service_role')) as expected(grantee)
  where not exists (
    select 1 from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'v_bible_editorial_body_blocks'
      and g.grantee = expected.grantee
      and g.privilege_type = 'SELECT'
  );

  if missing_grants is not null then
    raise exception 'Lecture de la vue perdue pour : %', missing_grants;
  end if;
end
$$;

do $$
declare
  bloc_non_notice uuid;
  bloc_quelconque uuid;
  refuse boolean;
begin
  select id into bloc_quelconque from public.bible_editorial_body_blocks limit 1;
  if bloc_quelconque is null then
    raise notice 'Aucun bloc de corps : contrôles de contrainte non exécutés.';
    return;
  end if;

  select id into bloc_non_notice
  from public.bible_editorial_body_blocks
  where block_kind <> 'notice'
  limit 1;

  -- Un sous-type porté par autre chose qu'une notice trahit une classification
  -- fautive : la base doit le refuser.
  if bloc_non_notice is not null then
    refuse := false;
    begin
      update public.bible_editorial_body_blocks
      set notice_subtype = 'historical'
      where id = bloc_non_notice;
      -- L'écriture a été admise : on la défait en quittant la sous-transaction.
      raise exception 'ECRITURE_ADMISE';
    exception
      when check_violation then refuse := true;
      when raise_exception then refuse := false;
    end;
    if not refuse then
      raise exception 'Un bloc qui n est pas une notice a accepté un sous-type de notice.';
    end if;
  end if;

  refuse := false;
  begin
    update public.bible_editorial_body_blocks
    set notice_subtype = 'zoologique'
    where id = bloc_quelconque;
    raise exception 'ECRITURE_ADMISE';
  exception
    when check_violation then refuse := true;
    when raise_exception then refuse := false;
  end;
  if not refuse then
    raise exception 'Un sous-type hors vocabulaire a été accepté.';
  end if;
end
$$;
