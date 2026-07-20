-- Travaux d'alignement : mémoire durable du travail de collation.
--
-- POURQUOI CETTE TABLE. Les relevés qui servent à aligner les traductions — structure de
-- l'AELF, découpage imprimé de Crampon, tables verset par verset, diagnostics de lacunes —
-- vivaient jusqu'ici dans des fichiers JSON d'un répertoire temporaire. Ils sont coûteux à
-- produire (des heures de collation) et faciles à perdre. Les mettre en base les rend
-- durables, interrogeables, et évite de refaire deux fois le même travail.
--
-- Chaque ligne = un relevé, identifié par sa clé, avec son contenu en JSON et sa provenance.

create table if not exists public.travaux_alignement (
  id          bigint generated always as identity primary key,
  cle         text not null unique,           -- ex. « aelf_SIR_structure »
  livre       text,                           -- code du livre concerné, ex. « SIR »
  categorie   text not null,                  -- structure | decoupage | table_alignement | diagnostic
  source      text,                           -- d'où vient le relevé (URL, édition, fac-similé)
  contenu     jsonb not null,
  note        text,                           -- ce qu'il faut savoir avant de s'en servir
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);

create index if not exists travaux_alignement_livre_idx     on public.travaux_alignement (livre);
create index if not exists travaux_alignement_categorie_idx on public.travaux_alignement (categorie);

-- Lecture publique interdite : ce sont des données de travail, pas du contenu éditorial.
alter table public.travaux_alignement enable row level security;

comment on table public.travaux_alignement is
  'Relevés de collation servant à aligner les traductions sur l''ossature canonique. '
  'Produits par lecture en regard des éditions ; coûteux à refaire, à ne pas supprimer.';
comment on column public.travaux_alignement.note is
  'Avertissements d''usage : réserves du collationneur, témoins à ne pas utiliser, pièges connus.';
