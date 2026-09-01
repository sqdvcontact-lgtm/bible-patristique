-- LES HAUTS FAITS DU LECTEUR.
--
-- Deux tables et un partage net : la base dit COMBIEN et COMMENT ça s'appelle, le
-- code sait seulement COMPTER (app/lib/hautsFaits.ts). Les seuils et les textes
-- vivent donc ici, où ils se corrigent sans déploiement — avec six comptes, aucune
-- rareté ne se calibre encore, et ce calibrage se fera sur la distribution réelle
-- après l'ouverture.

create table if not exists public.hauts_faits (
  code         text primary key,
  serie        text not null,
  serie_nom    text not null,
  degre        int  not null check (degre between 1 and 6),
  nom          text not null,
  -- Ce que le haut fait ENSEIGNE au moment où il tombe. Ce n'est pas une félicitation :
  -- c'est le seul retour qui soit de la même étoffe que l'activité, et donc le seul qui
  -- ne se substitue pas à l'envie de lire (Deci, Koestner et Ryan, 1999).
  notice       text not null,
  -- Ce qu'on compte. Le code connaît la liste ; la base n'en retient que le nom, pour
  -- que le référentiel reste lisible sans ouvrir le dépôt.
  mesure       text not null,
  -- L'un OU l'autre. `seuil_part` exprime le dernier degré en PART du corpus, et se
  -- recalcule donc seul à mesure que la bibliothèque grandit : un palier à cinquante
  -- Pères n'est pas rare aujourd'hui, il est impossible — il n'y en a que quinze.
  seuil        int,
  seuil_part   numeric(4,3),
  ordre        int not null default 0,
  actif        boolean not null default true,
  constraint hauts_faits_un_seul_seuil check (num_nonnulls(seuil, seuil_part) = 1),
  constraint hauts_faits_seuil_positif  check (seuil is null or seuil > 0),
  constraint hauts_faits_part_bornee    check (seuil_part is null or (seuil_part > 0 and seuil_part <= 1)),
  constraint hauts_faits_degre_unique   unique (serie, degre)
);

-- ⛔ Une obtention ne se REPREND jamais, même si le compteur redescend : un lecteur
-- qui supprime un prélèvement ne perd pas ce qu'il avait acquis. Une perte démotive
-- plus qu'un gain ne motive, et c'est pourquoi l'obtention se fige ici au lieu de se
-- déduire à chaque affichage, comme le fait le parcours d'entrée.
create table if not exists public.hauts_faits_obtenus (
  user_id   uuid not null references auth.users(id) on delete cascade,
  code      text not null references public.hauts_faits(code) on delete cascade,
  obtenu_le timestamptz not null default now(),
  primary key (user_id, code)
);

create index if not exists hauts_faits_obtenus_code_idx on public.hauts_faits_obtenus (code);

alter table public.hauts_faits enable row level security;
alter table public.hauts_faits_obtenus enable row level security;

-- Le référentiel se lit par tout compte : c'est la liste de ce qu'il y a à obtenir,
-- et la cacher n'aurait aucun sens — on ne vise pas ce qu'on ignore.
drop policy if exists hauts_faits_lecture on public.hauts_faits;
create policy hauts_faits_lecture on public.hauts_faits
  for select to authenticated using (actif);

-- ⛔ AUCUNE politique d'écriture pour `authenticated` sur les obtentions : elles sont
-- constatées par le serveur, avec la clé de service. La leçon est celle du portrait —
-- RLS borne la LIGNE qu'un lecteur peut modifier, jamais la valeur qu'il y écrit, et
-- un client qui pourrait insérer ici s'attribuerait le haut fait le plus rare.
drop policy if exists hauts_faits_obtenus_lecture on public.hauts_faits_obtenus;
create policy hauts_faits_obtenus_lecture on public.hauts_faits_obtenus
  for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.hauts_faits is
  'Référentiel des hauts faits. Les seuils et les textes vivent ici pour se corriger sans déploiement ; le code ne sait que compter (app/lib/hautsFaits.ts).';
comment on table public.hauts_faits_obtenus is
  'Obtentions figées. Ne jamais supprimer une ligne : un haut fait acquis ne se reprend pas, même si le compteur redescend.';
