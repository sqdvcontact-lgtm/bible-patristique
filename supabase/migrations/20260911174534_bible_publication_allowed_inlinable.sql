-- La règle de publication textuelle (charte § 52) doit s'INLINER.
--
-- Mesuré le 2026-09-11 : la migration 20260911151842 a reposé
-- `set search_path = pg_catalog` sur cette fonction. Une fonction SQL qui porte
-- une clause SET n'est jamais inlinée : appelée ligne à ligne dans les
-- politiques RLS et les vues de la chaîne Bible, elle coûte un vrai appel de
-- fonction (et la sauvegarde puis la restauration du paramètre) par ligne et
-- par politique. La vue v_bible_tr0013_gloss_note_targets, lue à chaque
-- chapitre d'une famille éditoriale, est passée à 12,3 s sous la session d'un
-- lecteur, au-delà des 8 s accordées à `authenticated` : toutes les pages de la
-- Bible de Fillion sont tombées en erreur. Sans clause SET : 1,1 s.
--
-- Sûreté : fonction INVOKER, immuable, qui ne lit aucune table et ne fait que
-- comparer une chaîne à deux littéraux. Un search_path mutable n'y ouvre aucune
-- escalade ; l'avis « function_search_path_mutable » du conseiller Supabase est
-- accepté en connaissance de cause. ⛔ Ne pas lui reposer de search_path.
--
-- Version choisie par le journal à l'application (MCP apply_migration), le
-- fichier nommé d'après elle.

alter function public.bible_technical_publication_allowed(text, jsonb) reset search_path;

comment on function public.bible_technical_publication_allowed(text, jsonb) is
  'Charte §52 : tout état textuel autre que rejected/retired est publiable. p_metadata est conservé pour compatibilité mais aucun override ne sert de gate. SANS clause SET, délibérément : la fonction doit s''inliner dans les politiques RLS et les vues (12,3 s contre 1,1 s mesurés le 2026-09-11 sur v_bible_tr0013_gloss_note_targets). Ne pas lui reposer de search_path.';

do $$
declare
  v_config text[];
begin
  select proconfig into v_config
  from pg_catalog.pg_proc
  where oid = 'public.bible_technical_publication_allowed(text,jsonb)'::regprocedure;
  if v_config is not null then
    raise exception 'bible_technical_publication_allowed porte encore une clause SET : %', v_config;
  end if;
  if not public.bible_technical_publication_allowed('draft', null)
     or not public.bible_technical_publication_allowed('review', null)
     or not public.bible_technical_publication_allowed('validated', null)
     or not public.bible_technical_publication_allowed('verified', null)
     or public.bible_technical_publication_allowed('rejected', null)
     or public.bible_technical_publication_allowed('retired', null) then
    raise exception 'table de vérité de bible_technical_publication_allowed incorrecte';
  end if;
end $$;
