-- Migration non destructive pour les retours de moderation.
-- A executer dans Supabase SQL Editor avant d'utiliser les messages utilisateur.

alter table public.commentaires
  add column if not exists message_admin text,
  add column if not exists message_admin_at timestamptz;

alter table public.signalements
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists message_admin text,
  add column if not exists message_admin_at timestamptz;

alter table public.essais
  add column if not exists note_admin text;

alter table if exists public.quiz_signalements
  add column if not exists traite boolean not null default false;

alter table public.segments
  drop constraint if exists segments_fiabilite_check;

update public.segments
set fiabilite = null
where fiabilite in ('vérifié', 'verifie');

update public.segments
set fiabilite = 'probable'
where fiabilite is not null
  and fiabilite not in ('probable', 'Lien à constituer');

alter table public.segments
  add constraint segments_fiabilite_check
  check (fiabilite is null or fiabilite in ('probable', 'Lien à constituer'));

create index if not exists idx_commentaires_message_admin_user
  on public.commentaires(user_id, message_admin_at)
  where message_admin is not null;

create index if not exists idx_signalements_user_message_admin
  on public.signalements(user_id, message_admin_at)
  where message_admin is not null;

create index if not exists idx_essais_note_admin_user
  on public.essais(user_id, updated_at)
  where note_admin is not null;

create index if not exists idx_segments_verifications
  on public.segments(fiabilite)
  where fiabilite in ('probable', 'Lien à constituer');
