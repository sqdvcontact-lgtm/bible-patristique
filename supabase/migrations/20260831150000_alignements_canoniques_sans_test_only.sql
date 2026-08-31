-- ⛔ DEUX POLITIQUES EXIGEAIENT DU MÊME DRAPEAU DES VALEURS OPPOSÉES.
--
-- `bible_canonical_alignments_public_read` ouvre une seconde branche pour les
-- alignements encore en revue : elle les sert au lecteur quand l'édition est
-- publiée TECHNIQUEMENT, validation éditoriale non revendiquée. C'est la bonne
-- intention. Mais elle exigeait en outre `metadata->>'test_only' = 'true'` sur la
-- source, quand `bible_technical_publication_allowed` — dont dépendent les
-- illustrations, les blocs de corps et les sources elles-mêmes — refuse
-- précisément un `test_only`. Aucun état ne pouvait donc satisfaire les deux :
-- le drapeau posé, rien ne paraissait ; le drapeau retiré, les alignements en
-- revue tombaient.
--
-- ⚠️ Relevé le 31 août 2026, après l'ouverture de l'édition : les livres
--    s'annonçaient disponibles et n'ouvraient sur aucun texte. La Genèse et
--    Josué portent 6 539 alignements en revue par membre ; les Évangiles, dont
--    les 4 767 alignements sont VÉRIFIÉS, passaient sans encombre. C'est cet
--    écart qui a nommé la cause.
--
-- La condition sur `test_only` est retirée, et RIEN D'AUTRE : la branche reste
-- bornée aux deux membres de la famille Fillion, exige toujours l'autorisation
-- technique explicite, et refuse toujours qu'on revendique une validation
-- éditoriale. C'est exactement l'état que le § 35.16.21 décrit pour les actifs.
--
-- Retour en arrière : sql/rollback_alignements_canoniques_test_only_20260831.sql

drop policy if exists bible_canonical_alignments_public_read on public.bible_canonical_alignments;

create policy bible_canonical_alignments_public_read
on public.bible_canonical_alignments for select
using (
  exists (
    select 1
    from public.bible_editorial_segmentations x
    join public.bible_text_sources s on s.id = x.source_id
    where x.id = bible_canonical_alignments.segmentation_id
      and x.is_public
      and x.status = 'validated'
      and s.status = 'published'
      and (
        bible_canonical_alignments.verification_status = 'verified'
        or (
          bible_canonical_alignments.verification_status = 'review'
          and s.trad_id = any (array['TR0010', 'TR0011'])
          and coalesce(s.metadata ->> 'technical_publication_override', 'false') = 'true'
          and coalesce(s.metadata ->> 'editorial_validation_claimed', 'false') = 'false'
        )
      )
  )
);

do $$
declare n_pent int; n_jos int; n_ev int;
begin
  -- On rejoue le prédicat de la politique, source par source.
  select count(*) into n_pent from public.bible_canonical_alignments a
    join public.bible_editorial_segmentations x on x.id = a.segmentation_id
    join public.bible_text_sources s on s.id = x.source_id
   where s.source_code = 'fillion-t01-pentateuch-test' and x.is_public and x.status = 'validated'
     and s.status = 'published'
     and (a.verification_status = 'verified'
          or (a.verification_status = 'review' and s.trad_id = any (array['TR0010','TR0011'])
              and coalesce(s.metadata ->> 'technical_publication_override','false') = 'true'
              and coalesce(s.metadata ->> 'editorial_validation_claimed','false') = 'false'));
  select count(*) into n_jos from public.bible_canonical_alignments a
    join public.bible_editorial_segmentations x on x.id = a.segmentation_id
    join public.bible_text_sources s on s.id = x.source_id
   where s.source_code = 'fillion-t02-joshua-test' and x.is_public and x.status = 'validated'
     and s.status = 'published'
     and (a.verification_status = 'verified'
          or (a.verification_status = 'review' and s.trad_id = any (array['TR0010','TR0011'])
              and coalesce(s.metadata ->> 'technical_publication_override','false') = 'true'
              and coalesce(s.metadata ->> 'editorial_validation_claimed','false') = 'false'));
  select count(*) into n_ev from public.bible_canonical_alignments a
    join public.bible_editorial_segmentations x on x.id = a.segmentation_id
    join public.bible_text_sources s on s.id = x.source_id
   where s.source_code = 'fillion-t07-gospels-acts-test' and a.verification_status = 'verified';
  if n_pent <> 11758 then raise exception 'Pentateuque : % alignements lisibles au lieu de 11758', n_pent; end if;
  if n_jos <> 1320 then raise exception 'Josué : % alignements lisibles au lieu de 1320', n_jos; end if;
  if n_ev <> 9534 then raise exception 'Évangiles : % alignements vérifiés au lieu de 9534', n_ev; end if;
  raise notice 'alignements lisibles : Pentateuque %, Josué %, Évangiles %', n_pent, n_jos, n_ev;
end $$;
