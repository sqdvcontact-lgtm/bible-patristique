-- LA DÉCISION DE PASSER UNE VISITE SUIT LE LECTEUR, NON SON NAVIGATEUR.
--
-- Demande de l'auteur, 2026-09-10 : « une fois que l'utilisateur a passé un tutoriel,
-- s'en souvenir, et associer cette décision à sa session (une décision par tutoriel) ».
-- Le passage ne vivait que dans `localStorage` (clé `cs_visites`) : un lecteur qui
-- ouvrait le site sur un second poste revoyait ses six visites, et vider les données
-- du site les rendait toutes. C'est le parti déjà pris pour le THÈME DE LECTURE
-- (`profils.theme_lecture`, 2026-08-24) : la préférence vit sur le COMPTE, le stockage
-- local n'en est que le miroir de ce poste — lui seul répond avant la première peinture.
--
-- ⛔ UNE DÉCISION PAR VISITE, donc un TABLEAU de clés et non un drapeau : les six
-- visites du site sont indépendantes, et avoir passé celle de l'accueil ne dit rien de
-- celle de la Bible. C'est aussi ce qui distingue cette colonne d'`onboarding_vu`.
--
-- ⛔ NULLABLE ET SANS CONTRAINTE `CHECK` : la liste des visites est ÉDITORIALE, elle
-- bougera, et une visite retirée ne doit ni bloquer une écriture ni vider un profil.
-- La validation vit dans le code (`accorderVisites`), qui tolère une clé inconnue.
alter table public.profils add column if not exists visites_faites text[];

comment on column public.profils.visites_faites is
  'Les visites (tutoriels de première ouverture) que ce lecteur a déjà vues, une clé par visite : accueil, bible-classique, polyglotte, bibliotheque, oeuvre, recherche. Miroitée dans le stockage local sous la clé cs_visites. Nullable et sans CHECK : la liste est éditoriale.';

-- ⛔ ELLE EST ÉCRITE PAR LE NAVIGATEUR DU LECTEUR, sur sa propre ligne : la garde la
-- RANGE au lieu de lui faire confiance. Un tableau est la seule colonne non bornée
-- qu'un compte puisse écrire ici, et un profil n'est pas un dépôt de données.
-- ⚠️ Elle RANGE, elle ne REFUSE pas : lever sur un tableau trop long empêcherait le
-- lecteur d'enregistrer son pseudonyme, pour un stockage local corrompu qui n'est pas
-- de son fait. Blancs ôtés, doublons fondus, vides écartés, clés bornées à quarante
-- signes, tableau borné à quarante clés — six aujourd'hui, la marge est large.
-- ⛔ Le reste de la fonction ne bouge pas d'un caractère : contrôlé en transaction
-- annulée, la définition d'après privée de ce seul bloc rend celle d'avant.
create or replace function public.profils_garde_colonnes()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  reserves constant text[] := array['admin','administrateur','moderateur','superadmin',
                                    'corpus','scriptura','system','support','contact','aide'];
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.est_admin := false;
    new.acces_beta := false;
    new.points := 0;
    new.mecene_depuis := null;
  else
    new.est_admin := old.est_admin;
    new.acces_beta := old.acces_beta;
    new.points := old.points;
    new.mecene_depuis := old.mecene_depuis;
  end if;
  if new.pseudo is not null and (tg_op = 'INSERT' or new.pseudo is distinct from old.pseudo) then
    if new.pseudo !~ '^[a-zA-Z0-9_-]{3,30}$' then
      raise exception 'Le pseudo doit contenir entre 3 et 30 caractères (lettres, chiffres, tirets, underscores).'
        using errcode = 'check_violation';
    end if;
    if lower(new.pseudo) = any (reserves) then
      raise exception 'Ce pseudo est réservé.' using errcode = 'check_violation';
    end if;
    if public.terme_interdit(new.pseudo, true) is not null then
      raise exception 'Ce pseudonyme n’est pas admis.' using errcode = 'ZL001';
    end if;
  end if;
  if new.visites_faites is not null then
    new.visites_faites := (
      select coalesce(array_agg(v order by v), array[]::text[])
      from (select distinct btrim(x) as v
              from unnest(new.visites_faites) as x
             where x is not null and btrim(x) <> '' and length(btrim(x)) <= 40
             order by 1 limit 40) t);
  end if;
  return new;
end $function$;

-- RETOUR EN ARRIÈRE
--
-- ⚠️ La colonne se retire SANS PERTE pour le site : le miroir local reste, et la
-- mémoire des visites retombe simplement sur ce qu'elle était avant le 2026-09-10.
-- Reposer d'abord la fonction sans son dernier bloc (voir
-- `internal.backup_profils_garde_colonnes_20260910`), puis :
--   alter table public.profils drop column visites_faites;
