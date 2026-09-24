-- La colonne `apparait_dans` (migration 20260923181151) est entrée après la liste
-- blanche de colonnes posée le 19 septembre 2026 (20260919184034) : `authenticated`
-- ne pouvait pas la lire, et tout filtre sur elle rendait 42501. La fiche d'un auteur
-- (« Éditions savantes ») restait donc vide pour tout lecteur connecté.
-- Les politiques de lecture existent déjà (`ouvrages_bibliographiques_select_authenticated`,
-- bornée par `bibliography_engine_work_gate_restrictive`) : seul le GRANT manque.
-- Rien pour `anon`. `niveau` et `oeuvre_ouvrage_id` restent fermés : aucune surface
-- du lecteur ne les lit.
grant select (apparait_dans) on table public.ouvrages_bibliographiques to authenticated;

do $garde$
begin
  if not has_column_privilege('authenticated', 'public.ouvrages_bibliographiques', 'apparait_dans', 'SELECT') then
    raise exception 'authenticated ne lit toujours pas apparait_dans';
  end if;
  if has_column_privilege('anon', 'public.ouvrages_bibliographiques', 'apparait_dans', 'SELECT') then
    raise exception 'anon lit apparait_dans';
  end if;
  if has_table_privilege('authenticated', 'public.ouvrages_bibliographiques', 'SELECT') then
    raise exception 'authenticated a regagné le SELECT de table';
  end if;
end
$garde$;
