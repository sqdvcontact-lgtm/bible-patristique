-- Ferme le dernier contournement de la modération des essais.
--
-- Un essai publié qu'on modifie repasse « en attente » ; mais son auteur pouvait
-- ensuite le mettre en brouillon puis le republier sans rien changer à ce
-- moment-là : la comparaison se faisait avec la ligne d'AVANT, déjà modifiée,
-- et l'essai reparaissait avec un texte que personne n'avait validé.
--
-- La comparaison se fait désormais avec une EMPREINTE du contenu validé,
-- posée chaque fois que l'essai est publié par l'administration (ou par une
-- route serveur). Un auteur ne republie seul que ce qui lui est identique ;
-- sinon l'essai part en modération. L'empreinte n'est écrite que par la base.
set local lock_timeout = '5s';

alter table public.essais add column if not exists empreinte_publiee text;

create or replace function public.empreinte_essai(e public.essais)
returns text
language sql
immutable
as $$
  select md5(row(e.titre, e.sous_titre, e.resume, e.categories, e.contenu,
                 e.couverture, e.embleme, e.verset_en_tete)::text)
$$;

create or replace function public.forcer_statut_essai()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  modifie boolean;
begin
  -- Routes serveur et rôles d'administration base : aucune contrainte.
  -- Une publication par eux fixe l'empreinte du contenu validé.
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    if new.statut = 'publie' then
      new.empreinte_publiee := public.empreinte_essai(new);
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un non-admin ne crée qu'un brouillon ou une soumission ; la date de validation et
    -- la note de la modération ne sont pas les siennes.
    if new.statut is null or new.statut not in ('brouillon', 'en_attente') then
      new.statut := 'brouillon';
    end if;
    new.publie_at := null;
    new.note_admin := null;
    new.nb_vues := 0;
    new.created_at := now();
    new.empreinte_publiee := null;
    return new;
  end if;

  -- UPDATE. Colonnes de la modération, compteurs et empreinte : figés.
  new.publie_at := old.publie_at;
  new.note_admin := old.note_admin;
  new.nb_vues := old.nb_vues;
  new.created_at := old.created_at;
  new.empreinte_publiee := old.empreinte_publiee;

  -- Ce que le lecteur voit d'un essai publié (vue essais_publies).
  modifie := (new.titre, new.sous_titre, new.resume, new.categories, new.contenu,
              new.couverture, new.embleme, new.verset_en_tete)
             is distinct from
             (old.titre, old.sous_titre, old.resume, old.categories, old.contenu,
              old.couverture, old.embleme, old.verset_en_tete);

  -- « À revoir » et « Refusé » se reçoivent de la modération ; un auteur ne les pose pas.
  if new.statut in ('a_reviser', 'refuse') and new.statut is distinct from old.statut then
    new.statut := old.statut;
  end if;
  if new.statut = 'publie' then
    if old.statut = 'publie' then
      -- Toujours publié : une retouche de ce qui se lit repasse par la modération.
      if modifie then
        new.statut := 'en_attente';
      end if;
    elsif old.statut = 'brouillon' and old.publie_at is not null then
      -- Republication d'un essai validé qu'il avait retiré : permise seulement si le
      -- contenu est celui qui a été validé ; sinon, il part en modération.
      if old.empreinte_publiee is null
         or public.empreinte_essai(new) is distinct from old.empreinte_publiee then
        new.statut := 'en_attente';
      end if;
    else
      -- Jamais validé, en attente, à revoir ou refusé : la publication n'est pas à lui.
      new.statut := old.statut;
    end if;
  end if;
  return new;
end $function$;

-- Les essais publiés aujourd'hui portent le contenu validé. Les deux essais retirés
-- après validation restent sans empreinte : leur republication passera par la
-- modération, faute de savoir si leur texte est encore celui qui avait été validé.
-- Sans déclencheurs : leur date de mise à jour ne doit pas bouger.
set local session_replication_role = replica;
update public.essais set empreinte_publiee = public.empreinte_essai(essais)
 where statut = 'publie';
set local session_replication_role = origin;
