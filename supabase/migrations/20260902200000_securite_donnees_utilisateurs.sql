-- Sécurité des données des utilisateurs (audit du 2026-09-02).
--
-- 1. `profils` : les colonnes de DROIT ne s'écrivent qu'avec la clé de service.
--    Éprouvé le 2026-09-02, transaction annulée : un compte ordinaire pouvait se
--    donner est_admin, acces_beta et un pseudo réservé par PostgREST, la politique
--    UPDATE ne bornant que la ligne, jamais les colonnes. Or estAdmin() (verifAdmin)
--    et le verrou de bêta (proxy) lisent précisément ces colonnes.
-- 2. Un commentaire SUPPRIMÉ par son auteur perd son texte : la ligne reste (fil
--    des réponses), mais rien ne doit rester lisible par l'API sous « supprimé ».
-- 3. `essais_commentaires` : lecture alignée sur `commentaires` (validé, ou le sien,
--    ou administrateur) au lieu de `true`, qui livrait les commentaires en attente.
-- 4. `signalements` : un signalement ne se pose qu'en son propre nom, ou anonyme.
-- 5. `lecture_utilisateurs` / `classement_utilisateurs` : le réglage « Rang » du
--    compte (pub_rang) est respecté par les vues elles-mêmes, et une vue de lecture
--    ne porte aucun droit d'écriture.
-- 6. `messages_contact` : plus d'adresse IP en clair, une empreinte salée du jour à
--    la place (comme la mesure d'audience) ; tables fermées sans aucun GRANT.

-- 1 ───────────────────────────────────────────────────────────────────────────
create or replace function public.profils_garde_colonnes() returns trigger
language plpgsql set search_path to 'public' as $$
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
  else
    new.est_admin := old.est_admin;
    new.acces_beta := old.acces_beta;
    new.points := old.points;
  end if;
  if new.pseudo is not null and (tg_op = 'INSERT' or new.pseudo is distinct from old.pseudo) then
    if new.pseudo !~ '^[a-zA-Z0-9_-]{3,30}$' then
      raise exception 'Le pseudo doit contenir entre 3 et 30 caractères (lettres, chiffres, tirets, underscores).'
        using errcode = 'check_violation';
    end if;
    if lower(new.pseudo) = any (reserves) then
      raise exception 'Ce pseudo est réservé.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profils_garde_colonnes on public.profils;
create trigger trg_profils_garde_colonnes
  before insert or update on public.profils
  for each row execute function public.profils_garde_colonnes();

-- 2 ───────────────────────────────────────────────────────────────────────────
create or replace function public.effacer_texte_commentaire_supprime() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if new.supprime is true and old.supprime is not true then
    new.texte := '';
  end if;
  return new;
end $$;

drop trigger if exists trg_effacer_texte_supprime on public.commentaires;
create trigger trg_effacer_texte_supprime
  before update on public.commentaires
  for each row execute function public.effacer_texte_commentaire_supprime();

drop trigger if exists trg_effacer_texte_supprime on public.essais_commentaires;
create trigger trg_effacer_texte_supprime
  before update on public.essais_commentaires
  for each row execute function public.effacer_texte_commentaire_supprime();

update public.commentaires set texte = '' where supprime is true and texte <> '';
update public.essais_commentaires set texte = '' where supprime is true and texte <> '';

-- 3 ───────────────────────────────────────────────────────────────────────────
drop policy if exists essais_commentaires_lecture on public.essais_commentaires;
create policy essais_commentaires_lecture on public.essais_commentaires
  for select to public
  using (valide = true or (select auth.uid()) = user_id or (select public.is_admin()));

-- 4 ───────────────────────────────────────────────────────────────────────────
drop policy if exists "Signaler une erreur" on public.signalements;
create policy signalements_insertion on public.signalements
  for insert to authenticated
  with check (user_id is null or user_id = (select auth.uid()));
revoke insert on public.signalements from anon;

-- 5 ───────────────────────────────────────────────────────────────────────────
create or replace view public.lecture_utilisateurs as
 with lisibles as (
   select o.id_oeuvre, o.id_auteur
   from oeuvres o
   where o.note is distinct from '[Corpus Scriptura:depublie]'::text and coalesce(o.nb_signes, 0) > 0
 ), corpus as (
   select count(distinct lisibles.id_auteur) as total_auteurs from lisibles
 ), marques as (
   select p.user_id, l.id_auteur
   from prelevements p join lisibles l on l.id_oeuvre = p.id_oeuvre
   where p.type = 'patristique'::text
   union
   select f.user_id, l.id_auteur
   from favoris f join lisibles l on l.id_oeuvre = split_part(f.ref_id, '#'::text, 1)
   where f.type = 'oeuvre'::text
 )
 select pr.id as user_id,
        pr.pseudo,
        count(distinct m.id_auteur)::integer as nb_auteurs,
        ((select corpus.total_auteurs from corpus))::integer as total_auteurs
 from profils pr
 left join marques m on m.user_id = pr.id
 where coalesce(pr.pub_rang, true) or pr.id = auth.uid()
 group by pr.id, pr.pseudo;

create or replace view public.classement_utilisateurs as
 select p.id as user_id,
        p.pseudo,
        count(distinct c.id) as nb_commentaires,
        count(distinct c.id) filter (where c.valide = true) as nb_valides,
        count(distinct cl.id) as nb_likes_recus,
        count(distinct e.id) filter (where e.statut = 'publie'::text) as nb_essais_publies,
        count(distinct c.id) + count(distinct c.id) filter (where c.valide = true) * 4
          + count(distinct cl.id) * 2 + count(distinct e.id) filter (where e.statut = 'publie'::text) * 15 as score
 from profils p
 left join commentaires c on c.user_id = p.id and c.supprime is not true
 left join commentaires_likes cl on cl.id_commentaire = c.id
 left join essais e on e.user_id = p.id
 where coalesce(p.pub_rang, true) or p.id = auth.uid()
 group by p.id, p.pseudo;

revoke insert, update, delete on public.lecture_utilisateurs from anon, authenticated;
revoke insert, update, delete on public.classement_utilisateurs from anon, authenticated;

-- 6 ───────────────────────────────────────────────────────────────────────────
alter table public.messages_contact add column if not exists empreinte text;
alter table public.messages_contact drop column if exists ip;
revoke all on public.messages_contact from anon, authenticated;
revoke all on public.inscriptions_attente from anon, authenticated;
