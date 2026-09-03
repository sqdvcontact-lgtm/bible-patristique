-- LES MÉCÈNES — le registre des dons, et la marque qui en découle.
--
-- ⛔ CE N'EST PAS UN HAUT FAIT, et cela n'entrera jamais dans `hauts_faits`. Les vingt
-- et un degrés se déduisent tous de marques de LECTURE, et la charte § 40.4 tranche :
-- « un haut fait est un nom, pas une monnaie ». Une case qui s'achète ferait perdre au
-- tableau entier ce qui le rend lisible, car plus personne ne saurait dire quelles
-- cases se lisent et quelles cases se paient. La marque de mécène vit donc à côté :
-- aucun point, aucune série, aucune rareté, aucun effet sur le rang, et elle n'ouvre
-- ni droit, ni accès, ni fonction.
--
-- Sa forme est celle du COLOPHON DU BIENFAITEUR : les manuscrits nomment qui a payé la
-- copie. C'est une gratitude, jamais un grade.

-- ── LE REGISTRE ──────────────────────────────────────────────────────────────
--
-- ⛔ AUCUN MONTANT. PayPal tient déjà ce livre-là, et un montant en base serait une
-- donnée financière à garder pour rien : le site n'a besoin que du FAIT du don. C'est
-- aussi ce qui rend la marque indivisible — il n'y a qu'un signe, et il ne se gradue
-- pas, donc aucune page ne peut laisser deviner ce qu'un lecteur a donné.
--
-- ⚠️ `reference` porte l'identifiant de transaction et elle est UNIQUE : c'est ce qui
-- empêchera de compter deux fois le même don, le jour où le rattachement s'automatisera
-- par la notification de PayPal.
create table if not exists public.dons (
  id             uuid primary key default gen_random_uuid(),
  -- Nul tant que le don n'est pas rattaché à un compte : un donateur peut n'en avoir
  -- aucun, et la fermeture d'un compte ne doit pas effacer le don reçu.
  user_id        uuid references public.profils(id) on delete set null,
  email_donateur text,
  nom_donateur   text,
  reference      text unique,
  recu_le        date not null default current_date,
  source         text not null default 'paypal',
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists dons_user_idx on public.dons (user_id);
create index if not exists dons_email_idx on public.dons (lower(email_donateur));

-- ⛔ RLS active et AUCUNE politique : la table ne se lit et ne s'écrit qu'avec la clé
-- de service, depuis le serveur. Un registre nominatif de dons n'a rien à faire dans un
-- navigateur, fût-ce celui de l'administrateur.
alter table public.dons enable row level security;

-- ── LA MARQUE ────────────────────────────────────────────────────────────────
--
-- Une DATE, non un booléen : elle se lit « Mécène depuis 2026 », et le libellé n'a rien
-- à déduire d'ailleurs. `pub_mecene` reste au lecteur, qui peut retirer sa marque.
alter table public.profils
  add column if not exists mecene_depuis date,
  add column if not exists pub_mecene    boolean not null default true;

-- ── LA COLONNE ÉPINGLÉE ──────────────────────────────────────────────────────
--
-- ⛔ Sans cette ligne, n'importe quel lecteur se décerne la marque par un `update` sur
-- sa propre ligne : la politique RLS de `profils` borne la LIGNE qu'on modifie, jamais
-- la VALEUR qu'on y écrit. C'est déjà pour cela que `est_admin`, `acces_beta` et
-- `points` sont retenus ici. `pub_mecene`, lui, reste libre : le lecteur doit pouvoir
-- se taire.
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
  return new;
end $function$;

-- ── QUI PORTE LA MARQUE ──────────────────────────────────────────────────────
--
-- La seule porte par laquelle le site apprend qu'un lecteur est mécène. Elle ne rend
-- QUE des identifiants : ni date, ni don, ni adresse. Toutes les surfaces qui nomment un
-- lecteur — commentaires d'un verset, d'une œuvre, d'un essai — s'y adressent de la même
-- manière, si bien qu'aucune ne peut se mettre à en juger autrement.
--
-- ⚠️ `pub_mecene` filtre ICI, jamais à l'affichage : le lecteur qui retire sa marque
-- doit sortir de la source, et non compter sur chaque écran pour se taire.
create or replace view public.mecenes_publics as
  select id as user_id
  from public.profils
  where mecene_depuis is not null and pub_mecene;

grant select on public.mecenes_publics to anon, authenticated;
