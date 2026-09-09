-- UNE SEULE POLITIQUE D'ÉCRITURE SUR « oeuvres_auteurs »
--
-- ⛔ La table en portait DEUX, identiques mot pour mot :
--   « admins ecrivent les liaisons d'auteurs »  →  is_admin()
--   « ecriture admin des co-signatures »        →  (select is_admin())
-- Même table, même rôle, même commande (ALL), même règle. Les politiques
-- permissives s'additionnent (OU) : le doublon ne changeait rien au résultat,
-- il faisait seulement évaluer deux fois la même fonction et laissait croire à
-- deux règles là où il n'y en a qu'une.
--
-- ⚠️ C'est la SECONDE moitié d'un défaut à demi corrigé : la migration
-- 20260909082157 avait retiré le doublon de LECTURE et laissé celui d'écriture.
-- Un contrôle qui ne relève qu'une commande ne relève pas la table.
--
-- ⚠️ On ne garde pas l'une des deux telle quelle : on garde le NOM de la
-- première, qui suit la nomenclature de sa voisine sur « oeuvres », et la FORME
-- de la seconde — `(select is_admin())` fait évaluer la fonction UNE FOIS par
-- requête, quand `is_admin()` nu la fait évaluer une fois PAR LIGNE.

drop policy if exists "admins ecrivent les liaisons d'auteurs" on public.oeuvres_auteurs;
drop policy if exists "ecriture admin des co-signatures" on public.oeuvres_auteurs;

create policy "admins ecrivent les liaisons d'auteurs" on public.oeuvres_auteurs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ── Contrôle ──────────────────────────────────────────────────────────────────
do $ctrl$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname='public' and tablename='oeuvres_auteurs' and cmd='ALL';
  if n <> 1 then raise exception 'Une seule politique d''ecriture attendue, % trouvee(s).', n; end if;

  select count(*) into n from pg_policies
   where schemaname='public' and tablename='oeuvres_auteurs' and cmd='SELECT';
  if n <> 2 then raise exception 'Deux politiques de lecture attendues (anon + authenticated), % trouvee(s).', n; end if;
end $ctrl$;
