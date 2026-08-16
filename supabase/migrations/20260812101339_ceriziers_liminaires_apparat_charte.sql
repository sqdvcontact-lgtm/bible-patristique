-- Correction éditoriale Ceriziers 1646 : liminaires vers apparat critique.
-- Script transactionnel, gardé et réversible ; aucune donnée textuelle ni relationnelle n'est modifiée.


begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $correction$
declare
  v_count integer;
  v_charte text;
  v_charte_corrigee text;
  v_sha text;
begin
  select count(*) into v_count
  from public.oeuvre_textes
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and is_public = false
    and statut = 'review'
    and is_default = false;
  if v_count <> 1 then
    raise exception 'Garde Ceriziers privé/review/non-default refusée: % ligne(s)', v_count;
  end if;

  select encode(digest(convert_to(string_agg(segment_numero::text || E'\x1f' || segment_texte, E'\x1e' order by segment_numero), 'UTF8'), 'sha256'), 'hex')
  into v_sha
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS';
  if v_sha <> '3d87d278725d96e3c2263597492da47342bc304a7ce5b2af3618ac79b30ca356' then
    raise exception 'Empreinte textuelle Ceriziers divergente: %', v_sha;
  end if;

  select count(*) into v_count
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and segment_numero between 1 and 54
    and nature = 'introduction'
    and espace_textuel = 'introduction'
    and ref_niv1 is null
    and paragraphe = 1
    and segment_metadata->>'nature' = 'introduction'
    and segment_metadata->>'espace_textuel' = 'introduction'
    and segment_metadata->'ref_niv1' = 'null'::jsonb
    and segment_metadata->>'paragraphe' = '1'
    and segment_metadata->>'alignment_scope' = 'false';
  if v_count <> 54 then
    raise exception 'Garde des 54 liminaires classés introduction refusée: %', v_count;
  end if;

  select count(*) into v_count
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and segment_numero between 55 and 57
    and nature = 'apparat_critique'
    and espace_textuel = 'apparat_critique'
    and ref_niv1 is null
    and paragraphe = 1
    and segment_metadata->>'nature' = 'apparat_critique'
    and segment_metadata->>'espace_textuel' = 'apparat_critique'
    and segment_metadata->'ref_niv1' = 'null'::jsonb
    and segment_metadata->>'paragraphe' = '1'
    and segment_metadata->>'alignment_scope' = 'false';
  if v_count <> 3 then
    raise exception 'Garde des 3 approbations déjà classées apparat refusée: %', v_count;
  end if;

  select count(*) into v_count
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and segment_numero between 1 and 57
    and segment_metadata->>'source_parent_id' in (
      'CER-FRONT-LIMINAIRE-EPITRE-DEDICATOIRE-B001',
      'CER-FRONT-LIMINAIRE-ESCLAIRCISSEMENT-AU-LECTEUR-B001',
      'CER-FRONT-LIMINAIRE-APPROBATION-DOZET-B001',
      'CER-FRONT-LIMINAIRE-APPROBATION-GODINOT-B001'
    );
  if v_count <> 57 then
    raise exception 'Garde des quatre pièces liminaires refusée: % segment(s)', v_count;
  end if;

  select count(*) into v_count
  from public.parametres
  where cle = 'charte_ia_backup_20260812_liminaires_apparat';
  if v_count <> 0 then
    raise exception 'La sauvegarde de Charte existe déjà';
  end if;

  select valeur into strict v_charte
  from public.parametres
  where cle = 'charte_ia';
  if encode(digest(convert_to(v_charte, 'UTF8'), 'sha256'), 'hex') <> '02ee719aa6fc981690c80d9b3292aff1947e86a6e60accb7564b107c6e04ace5' then
    raise exception 'Empreinte de la Charte active divergente';
  end if;

  if position('| `introduction` | texte liminaire conservé avant le corps |' in v_charte) = 0
     or position('| `apparat_critique` | préface éditoriale, avertissement, approbation, note longue ou autre paratexte conservé |' in v_charte) = 0
     or position('L’apparat critique, les préfaces éditoriales, approbations et avertissements conservés sont segmentés selon les mêmes principes que le corps. Ils utilisent leur propre espace de paragraphes et de rangs.' in v_charte) = 0 then
    raise exception 'Les formulations attendues de la Charte sont absentes';
  end if;

  insert into public.parametres(cle, valeur, mis_a_jour)
  values ('charte_ia_backup_20260812_liminaires_apparat', v_charte, now());

  v_charte_corrigee := replace(
    replace(
      replace(
        v_charte,
        '| `introduction` | texte liminaire conservé avant le corps |',
        '| `introduction` | brève introduction ou argument placé en tête d’une division du corps, par exemple au début d’un chapitre |'
      ),
      '| `apparat_critique` | préface éditoriale, avertissement, approbation, note longue ou autre paratexte conservé |',
      '| `apparat_critique` | partie liminaire conservée, préface, avertissement, épître dédicatoire, approbation, note longue ou autre paratexte |'
    ),
    'Les introductions et l’apparat restent de vrais segments : ils ont un `segment_numero`, un `paragraphe` et un `rang`. Leur numérotation de paragraphes vit dans un espace distinct du corps. L’interface peut les rendre hors de la pagination ordinaire, mais leur stockage obéit aux mêmes invariants.',
    'Les introductions et l’apparat restent de vrais segments : ils ont un `segment_numero`, un `paragraphe` et un `rang`. Leur numérotation de paragraphes vit dans un espace distinct du corps. L’interface peut les rendre hors de la pagination ordinaire, mais leur stockage obéit aux mêmes invariants.' || E'\n\n' ||
    'Les parties liminaires conservées forment un apparat critique et ne paraissent jamais dans le flux du texte. La nature `introduction` est réservée aux courts arguments ou chapeaux qui introduisent une division du corps et restent rattachés à celle-ci.'
  );
  v_charte_corrigee := replace(
    v_charte_corrigee,
    'L’apparat critique, les préfaces éditoriales, approbations et avertissements conservés sont segmentés selon les mêmes principes que le corps. Ils utilisent leur propre espace de paragraphes et de rangs.',
    'L’apparat critique, les parties liminaires, préfaces, épîtres dédicatoires, approbations et avertissements conservés sont segmentés selon les mêmes principes que le corps. Ils utilisent leur propre espace de paragraphes et de rangs et ne sont pas rendus dans le flux du texte.'
  );

  update public.parametres
  set valeur = v_charte_corrigee,
      mis_a_jour = now()
  where cle = 'charte_ia'
    and valeur = v_charte;
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'Mise à jour gardée de la Charte refusée';
  end if;

  update public.segments
  set nature = 'apparat_critique',
      espace_textuel = 'apparat_critique',
      ref_niv1 = 'LIMINAIRES',
      paragraphe = case segment_metadata->>'source_parent_id'
        when 'CER-FRONT-LIMINAIRE-EPITRE-DEDICATOIRE-B001' then 1
        when 'CER-FRONT-LIMINAIRE-ESCLAIRCISSEMENT-AU-LECTEUR-B001' then 2
        when 'CER-FRONT-LIMINAIRE-APPROBATION-DOZET-B001' then 3
        when 'CER-FRONT-LIMINAIRE-APPROBATION-GODINOT-B001' then 4
      end,
      segment_metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              segment_metadata,
              '{nature}', to_jsonb('apparat_critique'::text), true
            ),
            '{espace_textuel}', to_jsonb('apparat_critique'::text), true
          ),
          '{ref_niv1}', to_jsonb('LIMINAIRES'::text), true
        ),
        '{paragraphe}', to_jsonb(case segment_metadata->>'source_parent_id'
          when 'CER-FRONT-LIMINAIRE-EPITRE-DEDICATOIRE-B001' then 1
          when 'CER-FRONT-LIMINAIRE-ESCLAIRCISSEMENT-AU-LECTEUR-B001' then 2
          when 'CER-FRONT-LIMINAIRE-APPROBATION-DOZET-B001' then 3
          when 'CER-FRONT-LIMINAIRE-APPROBATION-GODINOT-B001' then 4
        end), true
      )
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and segment_numero between 1 and 57
    and ref_niv1 is null
    and segment_metadata->>'alignment_scope' = 'false';
  get diagnostics v_count = row_count;
  if v_count <> 57 then
    raise exception 'Nombre de segments liminaires modifiés inattendu: %', v_count;
  end if;

  select count(*) into v_count
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and segment_numero between 1 and 57
    and nature = 'apparat_critique'
    and espace_textuel = 'apparat_critique'
    and ref_niv1 = 'LIMINAIRES'
    and segment_metadata->>'nature' = 'apparat_critique'
    and segment_metadata->>'espace_textuel' = 'apparat_critique'
    and segment_metadata->>'ref_niv1' = 'LIMINAIRES'
    and segment_metadata->>'alignment_scope' = 'false';
  if v_count <> 57 then
    raise exception 'Contrôle après écriture des liminaires refusé: %', v_count;
  end if;

  select encode(digest(convert_to(string_agg(segment_numero::text || E'\x1f' || segment_texte, E'\x1e' order by segment_numero), 'UTF8'), 'sha256'), 'hex')
  into v_sha
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS';
  if v_sha <> '3d87d278725d96e3c2263597492da47342bc304a7ce5b2af3618ac79b30ca356' then
    raise exception 'Le texte Ceriziers a changé pendant la correction';
  end if;

  select count(*) into v_count
  from public.texte_alignements
  where alignment_set_id = 'ALNSET-A0064O0001-MIR1861-CER1646';
  if v_count <> 938 then
    raise exception 'Les groupes d’alignement ont changé: %', v_count;
  end if;

  select count(*) into v_count
  from public.texte_alignement_membres
  where alignment_set_id = 'ALNSET-A0064O0001-MIR1861-CER1646';
  if v_count <> 3802 then
    raise exception 'Les membres d’alignement ont changé: %', v_count;
  end if;

  select count(*) into v_count
  from public.liens_bibliques l
  join public.segments s on s.id = l.segment_id
  where s.id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS';
  if v_count <> 20 then
    raise exception 'Les liens bibliques Ceriziers ont changé: %', v_count;
  end if;
end
$correction$;

commit;

select
  count(*) filter (where nature = 'apparat_critique' and espace_textuel = 'apparat_critique' and ref_niv1 = 'LIMINAIRES') as liminaires_en_apparat,
  count(*) filter (where nature = 'introduction') as introductions_restantes
from public.segments
where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  and segment_numero between 1 and 57;



