-- LES POINTS et LE TON d'un haut fait — décisions de l'auteur, 1er septembre 2026 :
-- « chaque haut fait, en fonction de difficulté, vaut des points » et « un grand
-- tableau de cases dans différents tons harmonieux ».
--
-- ⛔ LES POINTS NE S'ÉCHANGENT CONTRE RIEN. Aucun droit, aucun accès, aucune fonction
-- du site ne s'achète en points, et rien ne se déverrouille. C'est la condition qui
-- les rend compatibles avec la charte § 40 : Deci, Koestner et Ryan mesurent l'effet
-- destructeur d'une récompense SÉPARABLE de l'activité, celle qui s'échange. Un score
-- qui ne s'échange pas n'est pas une monnaie, c'est la mesure agrégée d'un parcours.
--
-- Le barème suit le DEGRÉ, meilleur indicateur simple de la difficulté : un premier
-- degré s'obtient d'un geste, un dernier demande une part du corpus. ⚠️ Il vit en base,
-- comme les seuils et les notices, pour se corriger sans déploiement.
--
-- ⛔ LE TON N'INVENTE AUCUNE TEINTE. Le site en porte déjà trois, chartées et éprouvées
-- dans les deux thèmes : les familles de corpus (`--cs-ecriture`, `--cs-peres`,
-- `--cs-communaute`). Une série prend la famille du corpus qu'elle fait fréquenter, et
-- la variété se prend ensuite sur le degré, dont l'aplat se fonce à mesure qu'on monte.

alter table public.hauts_faits add column if not exists points int not null default 0;

alter table public.hauts_faits drop constraint if exists hauts_faits_points_positifs;
alter table public.hauts_faits add constraint hauts_faits_points_positifs check (points >= 0);

update public.hauts_faits
set points = case degre when 1 then 5 when 2 then 10 when 3 then 25 when 4 then 50 else 0 end;

alter table public.hauts_faits add column if not exists famille text;

update public.hauts_faits set famille = case serie
  when 'glane'   then 'ecriture'    -- les passages retenus, bibliques et patristiques
  when 'livres'  then 'peres'       -- la bibliothèque patristique
  when 'peres'   then 'peres'
  when 'siecles' then 'peres'
  when 'parole'  then 'communaute'  -- les commentaires
  when 'ecrit'   then 'communaute'  -- les essais
end
where famille is null;

alter table public.hauts_faits alter column famille set not null;

alter table public.hauts_faits drop constraint if exists hauts_faits_famille_connue;
alter table public.hauts_faits add constraint hauts_faits_famille_connue
  check (famille in ('ecriture', 'peres', 'communaute'));

-- ⛔ UNE SÉRIE NE PORTE QU'UNE SEULE FAMILLE, et c'est une contrainte ENTRE LIGNES :
-- ni un CHECK ni un index unique ne savent la dire. Un index sur (serie, famille)
-- dirait même l'INVERSE — il interdirait à deux degrés d'une même série de partager
-- leur ton, ce qui est précisément ce qu'on veut. Essayé puis écarté le jour même.
create or replace function public.hauts_faits_famille_unique()
returns trigger language plpgsql as $$
declare autre text;
begin
  select famille into autre
  from public.hauts_faits
  where serie = new.serie and code is distinct from new.code and famille is distinct from new.famille
  limit 1;

  if autre is not null then
    raise exception 'La série « % » porte déjà la famille « % » : une série n''a qu''un ton.', new.serie, autre
      using errcode = 'ZH001';
  end if;
  return new;
end $$;

drop trigger if exists trg_hauts_faits_famille_unique on public.hauts_faits;
create trigger trg_hauts_faits_famille_unique
  before insert or update of serie, famille on public.hauts_faits
  for each row execute function public.hauts_faits_famille_unique();

comment on column public.hauts_faits.points is
  'Ce que vaut le haut fait. ⛔ Ne s''échange contre RIEN : ni droit, ni accès, ni fonction. C''est une mesure, jamais une monnaie (charte § 40).';
comment on column public.hauts_faits.famille is
  'Famille de corpus qui donne son TON à la case : ecriture, peres, communaute. Ce sont les trois jetons chartés du site ; on n''en invente pas d''autre.';
