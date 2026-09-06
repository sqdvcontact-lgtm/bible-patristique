-- ⛔ LES MOTIFS ENTRENT EN CONSTANTES, jamais depuis une autre relation.
--
-- La première écriture calculait les deux préfixes dans un CTE d'une ligne, puis
-- comparait le mot normalisé au motif porté par ce CTE. Le motif n'étant alors pas connu
-- du planificateur, AUCUN des deux index de préfixe ne pouvait servir : parcours complet
-- des 51 078 formes, et surtout norm_gr et cle_grec_latine réévaluées à chaque ligne.
-- Mesuré : 11 897 ms, pour un délai d'attente de 8 s côté authenticated — l'autocomplétion
-- aurait échoué à chaque frappe. Après : 6,4 ms.
--
-- C'est la règle déjà payée sur les trois RPC de recherche (charte § 43) : format avec %L
-- pose la valeur DANS la requête, le planificateur la voit, et les deux index
-- text_pattern_ops reprennent leur office.
create or replace function public.suggestions_concordance_gr(p_prefixe text, p_limit integer default 12)
 returns table(mot text, freq integer)
 language plpgsql stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  grec  text := public.norm_gr(p_prefixe);
  latin text := public.cle_grec_latine(p_prefixe);
  n     integer := greatest(coalesce(p_limit, 12), 1);
  ou    text := '';
begin
  if coalesce(grec, '') = '' and coalesce(latin, '') = '' then return; end if;
  if grec <> '' then
    ou := format('l.mot_norm like %L', grec || '%');
  end if;
  if latin <> '' then
    ou := case when ou = '' then '' else ou || ' or ' end
          || format('l.cle_latine like %L', latin || '%');
  end if;
  return query execute
    'select l.mot, l.freq from public.concordance_lexique_grec l where '
    || ou || ' order by l.freq desc, l.mot limit ' || n;
end $$;

revoke all on function public.suggestions_concordance_gr(text, integer) from public;
grant execute on function public.suggestions_concordance_gr(text, integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
