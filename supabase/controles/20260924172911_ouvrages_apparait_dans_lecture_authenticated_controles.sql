-- Contrôles de 20260924172911 : un lecteur connecté (non administrateur) lit
-- apparait_dans et filtre dessus ; anon ne lit rien. Se rejoue par execute_sql,
-- la transaction étant annulée par l'exception finale.
do $$
declare u uuid; n int;
begin
  select p.id into u from public.profils p where not coalesce(p.est_admin, false) limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.ouvrages_bibliographiques where apparait_dans @> array['bibliographie'];
  reset role;
  if n = 0 then raise exception 'aucune référence bibliographique lisible sous authenticated'; end if;
  if has_column_privilege('anon', 'public.ouvrages_bibliographiques', 'apparait_dans', 'SELECT') then
    raise exception 'anon lit apparait_dans';
  end if;
  raise exception 'controles ok (% références)', n;
end $$;
