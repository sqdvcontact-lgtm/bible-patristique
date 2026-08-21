-- Des sauvegardes créées après le durcissement du 19 août ont de nouveau hérité
-- des droits du schéma public. Elles n'ont aucun consommateur : on les remet dans
-- `internal`, sans suppression et sans perte de possibilité de restauration.

do $$
declare
  v_attendues text[] := array[
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_anchors',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_blocks',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_control',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_links',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_notes',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_segments',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_unit',
    'backup_a0014o0038_h14_structure_20260820_2352_control',
    'backup_a0014o0038_h14_structure_20260820_2352_links',
    'backup_a0014o0038_h14_structure_20260820_2352_segments',
    'backup_a0014o0038_h14_structure_20260820_2352_unit',
    'backup_cyr_faivre_liminaires_cat10_unit_20260819',
    'backup_cyr_faivre_liminaires_cat11_unit_20260819',
    'backup_cyr_faivre_liminaires_cat12_unit_20260819',
    'backup_cyr_faivre_liminaires_cat13_unit_20260819',
    'backup_cyr_faivre_liminaires_cat14_unit_20260819'
  ];
begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relname=any(v_attendues)) <> cardinality(v_attendues) then
    raise exception 'la liste des sauvegardes publiques a changé depuis l audit';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='internal' and c.relname=any(v_attendues)) then
    raise exception 'une table homonyme existe déjà dans internal';
  end if;
end $$;

alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_anchors set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_blocks set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_control set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_links set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_notes set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_segments set schema internal;
alter table public.backup_a0014o0038_h14_apparatus_global_20260820_2210_unit set schema internal;
alter table public.backup_a0014o0038_h14_structure_20260820_2352_control set schema internal;
alter table public.backup_a0014o0038_h14_structure_20260820_2352_links set schema internal;
alter table public.backup_a0014o0038_h14_structure_20260820_2352_segments set schema internal;
alter table public.backup_a0014o0038_h14_structure_20260820_2352_unit set schema internal;
alter table public.backup_cyr_faivre_liminaires_cat10_unit_20260819 set schema internal;
alter table public.backup_cyr_faivre_liminaires_cat11_unit_20260819 set schema internal;
alter table public.backup_cyr_faivre_liminaires_cat12_unit_20260819 set schema internal;
alter table public.backup_cyr_faivre_liminaires_cat13_unit_20260819 set schema internal;
alter table public.backup_cyr_faivre_liminaires_cat14_unit_20260819 set schema internal;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_anchors',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_blocks',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_control',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_links',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_notes',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_segments',
    'backup_a0014o0038_h14_apparatus_global_20260820_2210_unit',
    'backup_a0014o0038_h14_structure_20260820_2352_control',
    'backup_a0014o0038_h14_structure_20260820_2352_links',
    'backup_a0014o0038_h14_structure_20260820_2352_segments',
    'backup_a0014o0038_h14_structure_20260820_2352_unit',
    'backup_cyr_faivre_liminaires_cat10_unit_20260819',
    'backup_cyr_faivre_liminaires_cat11_unit_20260819',
    'backup_cyr_faivre_liminaires_cat12_unit_20260819',
    'backup_cyr_faivre_liminaires_cat13_unit_20260819',
    'backup_cyr_faivre_liminaires_cat14_unit_20260819'
  ] loop
    execute format('revoke all on table internal.%I from public, anon, authenticated', v_table);
  end loop;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relkind='r' and c.relname like 'backup_%') then
    raise exception 'une sauvegarde demeure dans le schéma public';
  end if;
end $$;
