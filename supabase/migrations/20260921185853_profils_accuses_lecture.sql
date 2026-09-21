-- Accusés de lecture de la messagerie : un réglage du lecteur (audit d'ergonomie
-- du 2026-09-21, constat 20). Réciprocité : qui n'en envoie pas n'en reçoit pas.
-- Le réglage se lit dans la route /api/messagerie/[pseudo], seule à rendre « lu ».
alter table public.profils
  add column if not exists accuses_lecture boolean not null default true;

comment on column public.profils.accuses_lecture is
  'Vrai : le lecteur signale à ses correspondants qu''il a lu leurs messages, et voit s''ils ont lu les siens. Faux : ni l''un ni l''autre.';

-- La colonne « lu » ne se lit plus directement par l'API publique : l'expéditeur y
-- verrait l'accusé que son correspondant a refusé. Les routes de la messagerie
-- lisent avec la clé de service. Le destinataire garde le droit d'écrire « lu ».
revoke select on public.messages from authenticated;
grant select (id, expediteur_id, destinataire_id, contenu, created_at) on public.messages to authenticated;
