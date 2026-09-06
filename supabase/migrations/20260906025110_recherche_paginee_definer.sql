-- ═══════════════════════════════════════════════════════════════════════════════
-- LA RECHERCHE DES PÈRES PASSE EN `security definer`, LA GARDE DE PUBLICATION ÉCRITE
-- EN CLAIR (2026-09-06, une heure après `recherche_paginee`).
--
-- ⛔ CE QUE LA MESURE A DIT. Sous le rôle `postgres` du canal d'administration, la
-- répartition de « dieu » rend en 310 ms ; en ligne, sous le rôle `authenticated`, la
-- page a mesuré 5 371 ms sur la même fonction. Le plan sous la politique de lecture de
-- `segments` (« Lecture des segments accessibles » : `is_admin()` OU un EXISTS sur
-- `oeuvre_textes` ⋈ `oeuvres`) n'est plus celui du parcours par l'index trigramme : le
-- planificateur part des 35 textes publics par défaut, relit leurs 77 507 segments par
-- l'index (id_texte, id_oeuvre), et évalue sur CHAQUE ligne l'expression rationnelle
-- ET la politique — un sous-plan à trois tables par segment. Mesuré : 1 180 ms à chaud
-- sur le seul parcours, 505 000 tampons touchés contre 14 000 par l'index trigramme.
--
-- ✅ CE QUI ENTRE. Les trois fonctions des passages s'exécutent avec les droits de leur
-- propriétaire, et écrivent elles-mêmes ce que la politique garantit au lecteur :
-- l'œuvre est publique (`acces_public`), le texte est celui par défaut ET public
-- (`is_default`, `is_public`). Rien de plus, rien de moins — la page de recherche ne
-- montre que le corpus public, à l'administrateur compris, ce qui est son office.
-- ⚠️ Sous le rôle `postgres`, la version d'avant comptait 18 072 passages pour « dieu » ;
-- sous le lecteur, 16 887 : la différence est celle des textes par défaut non publics,
-- que la politique retirait. La garde `is_public` les retire de même.
--
-- ⚠️ Un `security definer` demande deux précautions, prises ici : le chemin de
-- recherche est fixé (`set search_path`), et tout ce qui entre dans la requête
-- dynamique passe par `%L`. L'exécution reste réservée à `authenticated` et
-- `service_role`. Les fonctions des VERSETS ne changent pas : les vues matérialisées
-- qu'elles lisent n'ont pas de politique, et elles rendent en 360 ms en ligne.
-- ═══════════════════════════════════════════════════════════════════════════════
begin;

create or replace function public.recherche_segments_v2_corresp(
  p_termes text[],
  p_mode text default 'prefixe'
)
returns table(id bigint, match_fr boolean, match_orig boolean)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[] := public.termes_normalises(p_termes);
  bruts text[];
  motifs text[];
  motifs_orig text[];
  tsq tsquery;
  cond_fr text := 'false';
  cond_orig text := 'false';
begin
  -- Le texte original se cherche en minuscules, sans normalisation d'accent : le grec
  -- en a besoin, et « λόγος » disparaîtrait de la normalisation française.
  select coalesce(array(select distinct btrim(lower(x)) from unnest(coalesce(p_termes, '{}')) x where btrim(x) <> ''), '{}') into bruts;
  if coalesce(array_length(bruts, 1), 0) = 0 then return; end if;
  select array_agg(public.motif_recherche_original(x, p_mode = 'exact')) into motifs_orig from unnest(bruts) x;
  cond_orig := format(
    '(s.texte_original is not null and lower(s.texte_original) ~ %L and lower(s.texte_original) ~ all(%L::text[]))',
    motifs_orig[1], motifs_orig);

  if coalesce(array_length(termes, 1), 0) > 0 then
    if p_mode = 'famille' then
      tsq := plainto_tsquery('french', array_to_string(termes, ' '));
      if tsq::text <> '' then
        cond_fr := format('(to_tsvector(''french'', s.texte_norm) @@ %L::tsquery)', tsq);
      end if;
    else
      select array_agg(public.motif_recherche(x, p_mode = 'exact')) into motifs from unnest(termes) x;
      cond_fr := format('(s.texte_norm ~ %L and s.texte_norm ~ all(%L::text[]))', motifs[1], motifs);
    end if;
  end if;

  -- ⛔ LA GARDE DE PUBLICATION EST ÉCRITE ICI, parce que la politique de lecture ne
  -- s'applique plus (definer) : œuvre publique, texte par défaut ET public.
  return query execute format($q$
    select s.id, %1$s as match_fr, %2$s as match_orig
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default and t.is_public
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and (%1$s or %2$s)
  $q$, cond_fr, cond_orig);
end
$$;

-- Les deux lectures publiques rejoignent `segments` par identifiant, sur ce que la
-- fonction ci-dessus a déjà gardé : elles passent en definer pour la même raison.
alter function public.recherche_segments_v2(text[], text, text, integer, integer) security definer;
alter function public.recherche_segments_v2_repartition(text[], text) security definer;

revoke execute on function public.recherche_segments_v2_corresp(text[], text) from public;
revoke execute on function public.recherche_segments_v2(text[], text, text, integer, integer) from public;
revoke execute on function public.recherche_segments_v2_repartition(text[], text) from public;
grant execute on function public.recherche_segments_v2_corresp(text[], text) to authenticated, service_role;
grant execute on function public.recherche_segments_v2(text[], text, text, integer, integer) to authenticated, service_role;
grant execute on function public.recherche_segments_v2_repartition(text[], text) to authenticated, service_role;

commit;
