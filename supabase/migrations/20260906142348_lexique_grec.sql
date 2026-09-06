-- ⛔ LE LEXIQUE GREC (décision de l'auteur, 2026-09-06 : « Fais ce travail »).
--
-- La Septante est cherchable depuis toujours, et l'autocomplétion de la recherche
-- n'avait aucun lexique à lui offrir : elle retombait sur le français, si bien qu'un
-- lecteur qui cherchait dans le grec se voyait proposer « miséricorde ».
--
-- ⛔ ET LE LEXIQUE NE SUFFIT PAS : un lecteur français n'a pas de clavier grec.
-- Chaque forme porte donc TROIS clés — la forme ATTESTÉE (accents compris, celle qu'on
-- insère dans la requête et qui, seule, retrouve le texte), la forme DÉSACCENTUÉE
-- (pour qui tape en grec sans polytonique), et une CLÉ LATINE réduite, qui fait que
-- « theos » propose θεός.
--
-- ⚠️ La clé latine est une RÉDUCTION, non une translittération savante : les deux côtés
-- — le mot grec et ce que le lecteur tape — passent par la MÊME fonction, et c'est tout
-- ce qu'on lui demande. θ, φ, χ, ψ, ξ y perdent leur h ; υ et y se confondent en u ;
-- c, q, k se confondent ; γγ et ng aussi. Elle ne s'affiche jamais.

-- ── 1. La normalisation grecque ──────────────────────────────────────────────
-- ⚠️ NFD puis retrait des signes combinants U+0300–U+036F : esprits, accents, tréma et
-- iota souscrit s'en vont ensemble, ce qu'aucune table de correspondance n'aurait fait
-- aussi proprement. Éprouvé : « Ὁ Λόγος ἦν πρὸς τὸν Θεόν » rend « ο λογος ην προς τον θεον ».
-- ⛔ Le sigma FINAL se ramène au sigma ordinaire : « λόγος » et « λόγου » doivent partager
-- leur préfixe, et `lower()` ne connaît pas la règle contextuelle du grec.
create or replace function public.norm_gr(t text)
 returns text language sql immutable parallel safe
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select trim(regexp_replace(
    translate(
      regexp_replace(normalize(lower(coalesce(t, '')), NFD),
                     '[' || chr(768) || '-' || chr(879) || ']', '', 'g'),
      'ς', 'σ'),
    '[^[:alnum:]]+', ' ', 'g'));
$$;

-- ── 2. La translittération ───────────────────────────────────────────────────
-- ⚠️ Les sorties à DEUX lettres passent par `replace`, `translate` ne sachant
-- remplacer qu'un caractère par un caractère. Elle laisse les lettres latines
-- intactes : on peut la passer sur ce que le lecteur tape sans rien y abîmer.
create or replace function public.translit_grec(t text)
 returns text language sql immutable parallel safe
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select translate(
    replace(replace(replace(replace(replace(
      lower(coalesce(t, '')),
      'ψ', 'ps'), 'ξ', 'x'), 'θ', 't'), 'φ', 'f'), 'χ', 'k'),
    'αβγδεζηικλμνοπρσςτυω',
    'abgdezeiklmnoprsstuo');
$$;

-- ── 3. La clé de frappe ──────────────────────────────────────────────────────
-- ⛔ Les digrammes AVANT le retrait des « h » restants, sinon « th » devient « t » deux
-- fois de suite et « hagios » ne rejoint plus ἅγιος.
create or replace function public.cle_grec_latine(t text)
 returns text language sql immutable parallel safe
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select trim(regexp_replace(
    replace(
      translate(
        replace(replace(replace(replace(replace(replace(
          f_unaccent(public.translit_grec(public.norm_gr(t))),
          'th', 't'), 'ph', 'f'), 'kh', 'k'), 'ch', 'k'), 'rh', 'r'), 'ng', 'gg'),
        'ycqw', 'ukko'),
      'h', ''),
    '[^a-z0-9]+', ' ', 'g'));
$$;

-- ── 4. Le lexique ────────────────────────────────────────────────────────────
-- ⛔ `text_pattern_ops` sur les deux clés de préfixe : sous la collation en_US.UTF-8,
-- un « like 'préfixe%' » ignore un btree ordinaire (charte, LIKE préfixe et index).
create table if not exists public.concordance_lexique_grec (
  mot        text primary key,
  mot_norm   text not null,
  cle_latine text not null,
  freq       integer not null
);
create index if not exists lexique_grec_norm_idx   on public.concordance_lexique_grec (mot_norm text_pattern_ops);
create index if not exists lexique_grec_latin_idx  on public.concordance_lexique_grec (cle_latine text_pattern_ops);
create index if not exists lexique_grec_freq_idx   on public.concordance_lexique_grec (freq desc);

-- ⛔ Fermée comme `concordance_lexique` : la lecture passe par la fonction, qui est
-- SECURITY DEFINER. Un lexique ne se vide pas depuis un navigateur.
alter table public.concordance_lexique_grec enable row level security;
revoke all on public.concordance_lexique_grec from anon, authenticated;

-- ── 5. Ce que l'autocomplétion demande ───────────────────────────────────────
-- ⚠️ Cette première écriture est REMPLACÉE par la migration 20260906142650 : le motif
-- venait d'un CTE, donc d'une autre relation, et aucun index de préfixe ne pouvait
-- servir — 11 897 ms mesurés. Elle est gardée telle quelle pour que le journal des
-- migrations dise ce qui a réellement été appliqué.
create or replace function public.suggestions_concordance_gr(p_prefixe text, p_limit integer default 12)
 returns table(mot text, freq integer)
 language sql stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
  with q as (
    select public.norm_gr(p_prefixe) as grec, public.cle_grec_latine(p_prefixe) as latin
  )
  select l.mot, l.freq
  from public.concordance_lexique_grec l, q
  where (q.grec  <> '' and l.mot_norm   like q.grec  || '%')
     or (q.latin <> '' and l.cle_latine like q.latin || '%')
  order by l.freq desc, l.mot
  limit greatest(coalesce(p_limit, 12), 1);
$$;

revoke all on function public.suggestions_concordance_gr(text, integer) from public;
grant execute on function public.suggestions_concordance_gr(text, integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
