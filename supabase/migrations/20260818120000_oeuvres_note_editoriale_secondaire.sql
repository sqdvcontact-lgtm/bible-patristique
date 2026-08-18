-- Notes éditoriales secondaires d'une œuvre : rubrique distincte du frontispice.
-- Le frontispice (oeuvres.commentaire_traduction) reste réservé aux informations
-- éditoriales factuelles ; les remarques secondaires vont dans cette colonne, rendue
-- dans la rubrique « Notes éditoriales » de la modale « À propos de cette édition ».
-- Colonne nullable additive : n'altère aucune relation, aucun embed PostgREST.
alter table public.oeuvres add column if not exists note_editoriale_secondaire text;

comment on column public.oeuvres.note_editoriale_secondaire is
  'Notes éditoriales secondaires d''une œuvre, affichées dans la rubrique dédiée de la modale « À propos de cette édition » — distinctes du frontispice (commentaire_traduction), réservé aux informations éditoriales factuelles.';
