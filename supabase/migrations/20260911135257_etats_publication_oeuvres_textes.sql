-- Charte § 52 (11 septembre 2026) : deux états de publication (publié, non publié)
-- et quatre états de validation (valide, termine, en_cours, invalide).
-- Validé, terminé et travail en cours sont publiés ; l'invalide ne l'est jamais ;
-- un motif consigné retient ce qui serait publiable. La publication se DÉRIVE :
-- `oeuvre_textes.is_public` et `oeuvres.acces_public` ne s'écrivent plus.

-- 1. Les exceptions ont une colonne.
alter table public.oeuvres add column if not exists motif_non_publication text;
alter table public.oeuvre_textes add column if not exists motif_non_publication text;

-- 2. Les gardes d'avant cèdent la place à la dérivation.
drop trigger if exists oeuvre_textes_publication_parent on public.oeuvre_textes;
drop trigger if exists oeuvres_depublication_textes on public.oeuvres;
drop function if exists public.verifier_publication_texte();
drop function if exists public.verifier_depublication_oeuvre();
alter table public.oeuvre_textes drop constraint if exists oeuvre_textes_statut_check;
alter table public.oeuvre_textes drop constraint if exists oeuvre_textes_public_published_ck;
alter table public.oeuvre_textes drop constraint if exists oeuvre_textes_default_not_retired_ck;
alter table public.oeuvre_textes drop constraint if exists oeuvre_textes_retired_inactive_ck;

-- 3. Le vocabulaire.
update public.oeuvre_textes
   set motif_non_publication = 'Doublon : grec embarqué d''avant l''import, remplacé par le texte A0017O0001T0002.'
 where id_texte = 'TXT_A0017O0001_GR_LEGACY_EMBEDDED';
update public.oeuvre_textes set statut = case statut
    when 'published' then 'termine'
    when 'review' then 'termine'
    when 'draft' then 'en_cours'
    when 'retired' then 'invalide'
    else statut end;
-- Validés explicitement par l'éditeur (notes du 7 septembre ; « validée humainement » pour Auger).
update public.oeuvre_textes set statut = 'valide'
 where id_texte in ('TXT_A0047O0034_FR_1604_MOREL', 'A0047O0034T0001', 'TXT_A0017O0001_LEGACY');
-- Travail en cours déclaré dans les notes de l'administration.
update public.oeuvre_textes set statut = 'en_cours'
 where statut <> 'invalide'
   and (id_oeuvre in ('A0091O0001', 'A0012O0003', 'A0010O0002')
        or (id_oeuvre = 'A0176O0001' and id_texte <> 'TXT_A0176O0001_1887_BONDURAND'));
alter table public.oeuvre_textes alter column statut set default 'en_cours';
alter table public.oeuvre_textes add constraint oeuvre_textes_statut_check
  check (statut in ('valide', 'termine', 'en_cours', 'invalide'));
alter table public.oeuvre_textes add constraint oeuvre_textes_invalide_motive_ck
  check (statut <> 'invalide' or nullif(btrim(coalesce(motif_non_publication, '')), '') is not null);

-- 4. La règle, écrite une seule fois.
create or replace function public.texte_publiable(p_statut text, p_motif text, p_nb_signes integer, p_id_oeuvre text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_statut is distinct from 'invalide'
     and nullif(btrim(coalesce(p_motif, '')), '') is null
     and coalesce(p_nb_signes, 0) > 0
     and not exists (
       select 1 from public.oeuvres o
        where o.id_oeuvre = p_id_oeuvre
          and nullif(btrim(coalesce(o.motif_non_publication, '')), '') is not null)
$$;

create or replace function public.oeuvre_publiable(p_id_oeuvre text, p_motif text)
returns boolean language sql stable security definer set search_path = public as $$
  select nullif(btrim(coalesce(p_motif, '')), '') is null
     and exists (select 1 from public.oeuvre_textes t where t.id_oeuvre = p_id_oeuvre and t.is_public)
$$;

create or replace function public.deriver_publication_texte()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Une chaîne d'import qui écrit encore l'ancien vocabulaire est traduite, jamais refusée.
  if new.statut = 'retired' and nullif(btrim(coalesce(new.motif_non_publication, '')), '') is null then
    new.motif_non_publication := 'Version retirée (écrite « retired » par une chaîne d''import).';
  end if;
  new.statut := case new.statut
      when 'published' then 'termine'
      when 'review' then 'termine'
      when 'draft' then 'en_cours'
      when 'retired' then 'invalide'
      else new.statut end;
  new.is_public := public.texte_publiable(new.statut, new.motif_non_publication, new.nb_signes, new.id_oeuvre);
  return new;
end $$;

create or replace function public.recalculer_publication_oeuvre()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ids text[];
begin
  v_ids := case tg_op
      when 'INSERT' then array[new.id_oeuvre]
      when 'DELETE' then array[old.id_oeuvre]
      else array[old.id_oeuvre, new.id_oeuvre] end;
  update public.oeuvres o
     set acces_public = public.oeuvre_publiable(o.id_oeuvre, o.motif_non_publication)
   where o.id_oeuvre = any(v_ids)
     and o.acces_public is distinct from public.oeuvre_publiable(o.id_oeuvre, o.motif_non_publication);
  return null;
end $$;

create or replace function public.deriver_publication_oeuvre()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.acces_public := public.oeuvre_publiable(new.id_oeuvre, new.motif_non_publication);
  if tg_op = 'UPDATE' and new.acces_public is distinct from old.acces_public then
    new.acces_public_modifie_le := now();
  end if;
  if new.acces_public and new.date_mise_en_ligne is null then
    new.date_mise_en_ligne := now();
  end if;
  return new;
end $$;

create or replace function public.propager_motif_oeuvre()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.oeuvre_textes t
     set is_public = public.texte_publiable(t.statut, t.motif_non_publication, t.nb_signes, t.id_oeuvre)
   where t.id_oeuvre = new.id_oeuvre
     and t.is_public is distinct from public.texte_publiable(t.statut, t.motif_non_publication, t.nb_signes, t.id_oeuvre);
  update public.oeuvres o
     set acces_public = public.oeuvre_publiable(o.id_oeuvre, o.motif_non_publication)
   where o.id_oeuvre = new.id_oeuvre
     and o.acces_public is distinct from public.oeuvre_publiable(o.id_oeuvre, o.motif_non_publication);
  return null;
end $$;

create trigger oeuvre_textes_publication_derivee
  before insert or update on public.oeuvre_textes
  for each row execute function public.deriver_publication_texte();
create trigger oeuvre_textes_publication_oeuvre
  after insert or delete on public.oeuvre_textes
  for each row execute function public.recalculer_publication_oeuvre();
create trigger oeuvre_textes_publication_oeuvre_maj
  after update on public.oeuvre_textes
  for each row when (old.is_public is distinct from new.is_public or old.id_oeuvre is distinct from new.id_oeuvre)
  execute function public.recalculer_publication_oeuvre();
create trigger oeuvres_publication_derivee
  before insert or update on public.oeuvres
  for each row execute function public.deriver_publication_oeuvre();
create trigger oeuvres_motif_propage
  after update on public.oeuvres
  for each row when (old.motif_non_publication is distinct from new.motif_non_publication)
  execute function public.propager_motif_oeuvre();

-- 5. L'exception demandée pour la synopse, puis le recalcul de tout le reste.
-- (L'apparat critique des Catéchèses baptismales reste retenu par
--  metadata.publication.apparat_critique = false, que lit la politique des segments.)
update public.oeuvres
   set motif_non_publication = 'Retirée de la lecture à la demande de l''éditeur le 11 septembre 2026 : fragment interrompu après Nahum, sans la suite prophétique ni le Nouveau Testament annoncé.'
 where id_oeuvre = 'A0566O0001';
update public.oeuvre_textes t set statut = t.statut
 where t.is_public is distinct from public.texte_publiable(t.statut, t.motif_non_publication, t.nb_signes, t.id_oeuvre);
update public.oeuvres o set acces_public = o.acces_public
 where o.acces_public is distinct from public.oeuvre_publiable(o.id_oeuvre, o.motif_non_publication);

alter table public.oeuvre_textes add constraint oeuvre_textes_publication_regle_ck
  check (not is_public or (statut <> 'invalide'
    and nullif(btrim(coalesce(motif_non_publication, '')), '') is null
    and nb_signes > 0));

-- 6. Le carnet de l'administration garde la trace de la décision.
update public.oeuvres_commentaires_prives
   set note_acces_public = coalesce(note_acces_public || E'\n\n', '') || '11 septembre 2026 : publiée sur décision de l''éditeur. Validé, terminé et travail en cours sont publiés ; seul l''invalide ou un motif consigné retient (charte § 52).',
       modifie_le = now()
 where id_oeuvre in ('A0010O0109','A0012O0003','A0014O0049','A0014O0089','A0044O0002','A0044O0003',
                     'A0044O0004','A0044O0005','A0044O0006','A0047O0034','A0091O0001');
update public.oeuvres_commentaires_prives
   set note_acces_public = coalesce(note_acces_public || E'\n\n', '') || '11 septembre 2026 : retirée de la lecture à la demande de l''éditeur ; le motif est consigné dans oeuvres.motif_non_publication.',
       modifie_le = now()
 where id_oeuvre = 'A0566O0001';
update public.oeuvres_commentaires_prives
   set note_acces_public = coalesce(note_acces_public || E'\n\n', '') || '11 septembre 2026 : travail en cours, donc publiable ; elle paraîtra d''elle-même au premier segment importé, ses deux versions n''en portant encore aucun.',
       modifie_le = now()
 where id_oeuvre = 'A0051O0044';

-- 7. Descriptions et droits.
comment on column public.oeuvre_textes.statut is 'État de validation (charte § 52) : valide, termine, en_cours, invalide.';
comment on column public.oeuvre_textes.is_public is 'Publié (charte § 52). Dérivé par oeuvre_textes_publication_derivee : ne s''écrit pas.';
comment on column public.oeuvre_textes.motif_non_publication is 'Motif qui retient un texte publiable, ou qui fait un invalide (charte § 52).';
comment on column public.oeuvres.acces_public is 'Publiée (charte § 52). Dérivé : vrai quand l''œuvre porte au moins un texte publié et aucun motif. Ne s''écrit pas.';
comment on column public.oeuvres.motif_non_publication is 'Motif qui retient une œuvre et tous ses textes (charte § 52).';
revoke execute on function public.texte_publiable(text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.oeuvre_publiable(text, text) from public, anon, authenticated;
revoke execute on function public.deriver_publication_texte() from public, anon, authenticated;
revoke execute on function public.recalculer_publication_oeuvre() from public, anon, authenticated;
revoke execute on function public.deriver_publication_oeuvre() from public, anon, authenticated;
revoke execute on function public.propager_motif_oeuvre() from public, anon, authenticated;
