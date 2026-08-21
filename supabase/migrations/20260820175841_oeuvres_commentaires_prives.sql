-- « Commentaires privés » d'une œuvre : notes de travail de l'administration.
-- Elles vivent dans une table à part et NON dans une colonne de `oeuvres` :
-- la page publique de l'œuvre lit `oeuvres` avec select('*') sous la session du
-- lecteur, une colonne de plus y aurait donc été servie à tout compte connecté.
create table if not exists public.oeuvres_commentaires_prives (
  id_oeuvre  text primary key references public.oeuvres(id_oeuvre) on delete cascade,
  commentaire text,
  modifie_le timestamptz not null default now()
);

comment on table public.oeuvres_commentaires_prives is
  'Notes de travail privées sur une œuvre (admin seul). Aucun droit pour anon/authenticated : la lecture passe par la clé de service.';

alter table public.oeuvres_commentaires_prives enable row level security;

-- Double verrou : RLS sans aucune politique + retrait des droits accordés par
-- défaut aux rôles publics. Seule la clé de service (service_role) y accède.
revoke all on public.oeuvres_commentaires_prives from anon, authenticated;
