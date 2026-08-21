-- Boèce, Consolation de la philosophie : libellés des traductions, correction
-- fac-similaire de la lettrine « Moy » et mémoire éditoriale du menu commun.

do $$
declare
  v_charte text;
begin
  select valeur into strict v_charte from public.parametres where cle = 'charte_ia';
  if encode(digest(convert_to(v_charte, 'UTF8'), 'sha256'), 'hex')
     <> '20eae71a735e0bc80b59b31be1adf4ffb1516ee0e582c3954109775b692e324e' then
    raise exception 'charte_ia a changé depuis l audit préparatoire';
  end if;
  if regexp_count(v_charte, 'Changer la version par défaut, publier, retirer ou remplacer une version est une opération explicite\.') <> 1 then
    raise exception 'ancre de charte absente ou ambiguë';
  end if;
  if exists (select 1 from public.parametres where cle = 'charte_ia_backup_20260821_menu_commun_traductions') then
    raise exception 'la sauvegarde de charte existe déjà';
  end if;
  if (select count(*) from public.oeuvre_textes where id_oeuvre = 'A0064O0001') <> 2 then
    raise exception 'les deux versions attendues de Boèce ne sont pas seules';
  end if;
  if (select count(*) from public.segments where id = 560523
        and id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
        and segment_key = 'TXT_A0064O0001_FR_1646_CERIZIERS:CER-B01-D01-U001-POEM:s001'
        and segment_texte = 'MOY dont les premiers Vers n’ont parlé que de ioye,'
        and segment_metadata->>'segment_text_clean' = 'MOY dont les premiers Vers n’ont parlé que de ioye,'
        and source_start_offset_unicode = 0 and source_end_offset_unicode = 51) <> 1 then
    raise exception 'le segment Ceriziers visé ne correspond plus à l état audité';
  end if;
  if (select count(*) from public.oeuvre_texte_unites
        where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
          and source_unit_id = 'CER-B01-D01-U001-POEM'
          and left(clean_text, 51) = 'MOY dont les premiers Vers n’ont parlé que de ioye,'
          and upper(encode(digest(convert_to(clean_text, 'UTF8'), 'sha256'), 'hex')) = clean_text_sha256) <> 1 then
    raise exception 'l unité Ceriziers visée ne correspond plus à l état audité';
  end if;
  if (select count(*) from public.texte_alignements
        where alignment_id = 'ALN-A0064O0001-B01-D01-STRICT-G0001'
          and metadata::text like '%MOY%'
          and justification like '%MOY%') <> 1 then
    raise exception 'le groupe d alignement Ceriziers visé ne correspond plus à l état audité';
  end if;
  if (select count(*) from pg_trigger
        where tgrelid = 'public.segments'::regclass
          and tgname = 'trg_guard_boece_source_immutability_v3'
          and tgenabled = 'O') <> 1 then
    raise exception 'le verrou d immutabilité de Boèce n est pas dans son état attendu';
  end if;
end $$;

create table internal.backup_a0064o0001_lecteur_20260821 (
  objet text primary key,
  snapshot jsonb not null,
  sauvegarde_le timestamptz not null default now()
);
revoke all on internal.backup_a0064o0001_lecteur_20260821 from public, anon, authenticated;

insert into internal.backup_a0064o0001_lecteur_20260821 (objet, snapshot)
select 'oeuvre_textes', jsonb_agg(to_jsonb(t) order by t.id_texte)
from public.oeuvre_textes t where t.id_oeuvre = 'A0064O0001';

insert into internal.backup_a0064o0001_lecteur_20260821 (objet, snapshot)
select 'segment_560523', to_jsonb(s) from public.segments s where s.id = 560523;

insert into internal.backup_a0064o0001_lecteur_20260821 (objet, snapshot)
select 'unite_cer_b01_d01_u001_poem', to_jsonb(u)
from public.oeuvre_texte_unites u
where u.id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  and u.source_unit_id = 'CER-B01-D01-U001-POEM';

insert into internal.backup_a0064o0001_lecteur_20260821 (objet, snapshot)
select 'alignement_aln_a0064o0001_b01_d01_strict_g0001', to_jsonb(a)
from public.texte_alignements a
where a.alignment_id = 'ALN-A0064O0001-B01-D01-STRICT-G0001';

insert into internal.backup_a0064o0001_lecteur_20260821 (objet, snapshot)
select 'charte_ia', to_jsonb(p) from public.parametres p where p.cle = 'charte_ia';

insert into public.parametres (cle, valeur)
select 'charte_ia_backup_20260821_menu_commun_traductions', valeur
from public.parametres where cle = 'charte_ia';

update public.oeuvre_textes
set metadata = coalesce(metadata, '{}'::jsonb)
  || case id_texte
       when 'TXT_A0064O0001_FR_1646_CERIZIERS' then jsonb_build_object(
         'traducteur_naissance', 1603,
         'traducteur_mort', 1662,
         'traducteur_dates_source', 'https://catalogue.bnf.fr/rechercher.do?index=AUT3&numNotice=12087606',
         'correction_source_20260821_moy', jsonb_build_object(
           'avant', 'MOY dont les premiers Vers n’ont parlé que de ioye,',
           'apres', 'Moy dont les premiers Vers n’ont parlé que de ioye,',
           'page', 19,
           'source', 'https://archive.org/details/bub_gb_j51V661mEw0C',
           'motif', 'lettrine M suivie de oy en bas de casse; la capitale de Vers est conservée'
         )
       )
       when 'TXT_A0064O0001_FR_1861_MIRANDOL' then jsonb_build_object(
         'traducteur_naissance', 1816,
         'traducteur_mort', 1893,
         'traducteur_dates_source', 'https://catalogue.bnf.fr/ark:/12148/cb12443204m'
       )
       else '{}'::jsonb
     end
where id_oeuvre = 'A0064O0001';

-- L'immutabilité protège l'import établi. La correction fac-similaire demandée
-- est la seule exception : le verrou exact est levé pour cette instruction puis
-- rétabli immédiatement, dans la même transaction gardée et sauvegardée.
alter table public.segments disable trigger trg_guard_boece_source_immutability_v3;
update public.segments
set segment_texte = 'Moy dont les premiers Vers n’ont parlé que de ioye,',
    segment_metadata = jsonb_set(
      coalesce(segment_metadata, '{}'::jsonb),
      '{segment_text_clean}',
      to_jsonb('Moy dont les premiers Vers n’ont parlé que de ioye,'::text),
      true
    )
where id = 560523;
alter table public.segments enable trigger trg_guard_boece_source_immutability_v3;

update public.oeuvre_texte_unites
set clean_text = regexp_replace(clean_text, '^MOY', 'Moy'),
    clean_text_sha256 = upper(encode(digest(convert_to(regexp_replace(clean_text, '^MOY', 'Moy'), 'UTF8'), 'sha256'), 'hex'))
where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  and source_unit_id = 'CER-B01-D01-U001-POEM';

update public.texte_alignements
set metadata = replace(metadata::text, 'MOY', 'Moy')::jsonb,
    justification = replace(justification, 'MOY', 'Moy'),
    updated_at = now()
where alignment_id = 'ALN-A0064O0001-B01-D01-STRICT-G0001';

update public.parametres
set valeur = replace(
      valeur,
      'Changer la version par défaut, publier, retirer ou remplacer une version est une opération explicite. Aucune version n’est supprimée ni retirée automatiquement du seul fait qu’une nouvelle version existe.',
      'Changer la version par défaut, publier, retirer ou remplacer une version est une opération explicite. Aucune version n’est supprimée ni retirée automatiquement du seul fait qu’une nouvelle version existe.'
      || chr(10) || chr(10)
      || '**Menu commun des traductions.** Toutes les versions rattachées au même `id_oeuvre` reçoivent le même menu, quel que soit l’`id_texte` actif. La rubrique s’intitule « Traductions ». Une traduction française s’y donne sous la forme exacte `Nom du traducteur (dates de vie), édition de AAAA` ; les dates proviennent d’une donnée structurée et l’année de `oeuvre_textes.annee_edition`. Le texte original reste dans le menu de langue : lorsqu’il existe mais n’est pas aligné avec la portée affichée, son choix demeure visible et grisé. Le mode « Traductions parallèles » n’est pas proposé tant que son parcours de lecture n’est pas réactivé explicitement.'
    ),
    mis_a_jour = now()
where cle = 'charte_ia';

do $$
declare
  v_recompose text;
  v_unite text;
  v_hash text;
  v_hash_stocke text;
begin
  select string_agg(coalesce(join_before, '') || segment_texte, '' order by source_start_offset_unicode, segment_numero)
    into v_recompose
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and source_unit_id = 'CER-B01-D01-U001-POEM';

  select clean_text, upper(encode(digest(convert_to(clean_text, 'UTF8'), 'sha256'), 'hex')), clean_text_sha256
    into strict v_unite, v_hash, v_hash_stocke
  from public.oeuvre_texte_unites
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and source_unit_id = 'CER-B01-D01-U001-POEM';

  if v_recompose <> v_unite or v_hash <> v_hash_stocke then
    raise exception 'échec de recomposition ou d empreinte de l unité Ceriziers';
  end if;
  if left(v_unite, 51) <> 'Moy dont les premiers Vers n’ont parlé que de ioye,' then
    raise exception 'la correction Moy n est pas présente dans l unité';
  end if;
  if (select count(*) from public.segments where id = 560523
        and segment_texte = 'Moy dont les premiers Vers n’ont parlé que de ioye,'
        and segment_metadata->>'segment_text_clean' = 'Moy dont les premiers Vers n’ont parlé que de ioye,'
        and texte_norm = 'moy dont les premiers vers n ont parle que de ioye') <> 1 then
    raise exception 'les couches du segment Ceriziers divergent';
  end if;
  if (select count(*) from public.texte_alignements
        where alignment_id = 'ALN-A0064O0001-B01-D01-STRICT-G0001'
          and metadata::text not like '%MOY%'
          and justification not like '%MOY%'
          and metadata::text like '%Moy%'
          and justification like '%Moy%') <> 1 then
    raise exception 'le miroir d alignement Ceriziers diverge';
  end if;
  if (select count(*) from public.oeuvre_textes
        where id_oeuvre = 'A0064O0001'
          and metadata ? 'traducteur_naissance'
          and metadata ? 'traducteur_mort') <> 2 then
    raise exception 'les dates structurées des traducteurs manquent';
  end if;
  if (select regexp_count(valeur, '\*\*Menu commun des traductions\.\*\*')
        from public.parametres where cle = 'charte_ia') <> 1 then
    raise exception 'la règle du menu commun manque ou est dupliquée';
  end if;
  if (select count(*) from internal.backup_a0064o0001_lecteur_20260821) <> 5 then
    raise exception 'la sauvegarde interne est incomplète';
  end if;
  if (select count(*) from pg_trigger
        where tgrelid = 'public.segments'::regclass
          and tgname = 'trg_guard_boece_source_immutability_v3'
          and tgenabled = 'O') <> 1 then
    raise exception 'le verrou d immutabilité de Boèce n a pas été rétabli';
  end if;
end $$;
