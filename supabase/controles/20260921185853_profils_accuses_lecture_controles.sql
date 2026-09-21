-- Contrôles de la migration 20260921185853_profils_accuses_lecture.
-- Se rejouent par execute_sql ; c'est l'exception (ou son absence) qui parle.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profils' and column_name = 'accuses_lecture'
      and is_nullable = 'NO' and column_default = 'true'
  ) then
    raise exception 'profils.accuses_lecture absente, nullable ou sans défaut vrai';
  end if;
end $$;

do $$
begin
  if has_column_privilege('authenticated', 'public.messages', 'lu', 'SELECT') then
    raise exception 'authenticated lit encore messages.lu';
  end if;
  if not has_column_privilege('authenticated', 'public.messages', 'contenu', 'SELECT') then
    raise exception 'authenticated ne lit plus messages.contenu';
  end if;
  if not has_column_privilege('authenticated', 'public.messages', 'lu', 'UPDATE') then
    raise exception 'authenticated ne peut plus marquer un message lu';
  end if;
  if has_table_privilege('anon', 'public.messages', 'SELECT') then
    raise exception 'anon lit messages';
  end if;
end $$;

select 'controles ok';
