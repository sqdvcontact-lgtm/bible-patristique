-- Contrôles de 20260924140008_atelier_alignement.sql.
-- Se rejouent par `execute_sql` : c'est l'exception, ou son absence, qui parle.

-- ⛔ Les fonctions de l'atelier écrivent dans les tables d'alignement : aucun rôle
-- connecté ne les exécute, la clé de service seule.
do $$
declare f text;
begin
  foreach f in array array[
    'public.atelier_alignement_mesures(text, text)',
    'public.atelier_alignement_poser_membres(text, text, text, text, text[], jsonb)',
    'public.atelier_alignement_memes_cles(text[], text[])',
    'public.atelier_alignement_couper(text, text, text, text[], text[], text[], text[], text, text, jsonb)',
    'public.atelier_alignement_fusionner(text, text, text, text[], text[], text, jsonb)'
  ] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception '% est exécutable par anon', f;
    end if;
    if has_function_privilege('authenticated', f, 'execute') then
      raise exception '% est exécutable par authenticated', f;
    end if;
    if not has_function_privilege('service_role', f, 'execute') then
      raise exception '% n''est pas exécutable par service_role', f;
    end if;
  end loop;
end $$;

-- Une coupe puis la fusion qui la défait rendent le groupe à l'identique (annulé).
do $$
declare s text := 'A0010O0055:MIGNE1841-RAULX1868:LA-FR:PARAGRAPH';
        g text := 'A0010O0055:MIGNE1841-RAULX1868:S01-P03';
        avant text; apres text;
begin
  select string_agg(role || member_order || segment_key || metadata::text, ',' order by role, member_order)
    into avant from public.texte_alignement_membres where alignment_id = g;
  perform public.atelier_alignement_couper(s, g, g || '-CTRL',
    array['AUG-SYM-LA-S01-S007'], array['AUG-SYM-FR-S01-P03-S01', 'AUG-SYM-FR-S01-P03-S02'],
    array['AUG-SYM-LA-S01-S008', 'AUG-SYM-LA-S01-S009'],
    array['AUG-SYM-FR-S01-P03-S03', 'AUG-SYM-FR-S01-P03-S04', 'AUG-SYM-FR-S01-P03-S05'],
    'n:1', 'n:m', '{"op":"controle"}'::jsonb);
  perform public.atelier_alignement_fusionner(s, g, g || '-CTRL',
    array['AUG-SYM-LA-S01-S007', 'AUG-SYM-LA-S01-S008', 'AUG-SYM-LA-S01-S009'],
    array['AUG-SYM-FR-S01-P03-S01', 'AUG-SYM-FR-S01-P03-S02', 'AUG-SYM-FR-S01-P03-S03',
          'AUG-SYM-FR-S01-P03-S04', 'AUG-SYM-FR-S01-P03-S05'],
    'n:m', '{"op":"controle"}'::jsonb);
  select string_agg(role || member_order || segment_key || metadata::text, ',' order by role, member_order)
    into apres from public.texte_alignement_membres where alignment_id = g;
  if avant is distinct from apres then
    raise exception 'coupe puis fusion ne rendent pas le groupe à l''identique';
  end if;
  raise exception using errcode = 'P0002', message = 'annulation voulue';
exception when sqlstate 'P0002' then
  null;
end $$;

select 'controles ok';
