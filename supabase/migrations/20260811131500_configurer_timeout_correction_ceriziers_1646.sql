begin;

alter function public.corriger_ceriziers_1646_texte_alignement_fin(jsonb, text)
  set statement_timeout = '120s';

alter function public.restaurer_ceriziers_1646_avant_correction(jsonb, text)
  set statement_timeout = '120s';

commit;
