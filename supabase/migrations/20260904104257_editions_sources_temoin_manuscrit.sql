-- ── LE TÉMOIN MANUSCRIT SE NOMME PAR SON DÉPÔT ET SA COTE ────────────────────
--
-- La carte du volet de lecture compose la provenance du texte : « D'après
-- l'édition de Paris, Letouzey et Ané, 1888-1904 ». La Bible française du
-- XIIIe siècle n'a pas d'édition — elle a un TÉMOIN —, et la carte se taisait
-- donc pour elle (demande de l'auteur, 2026-09-04 : « aucun texte pour la bible
-- du XIIIe siècle ; à corriger, d'après le manuscrit machin machin »).
--
-- ⛔ La phrase ne se DÉDUIT PAS de la prose. « Bible française du XIIIe siècle —
-- manuscrit Français 899 » (titre_edition) et « Gallica / Bibliothèque nationale
-- de France — Français 899 » (source_nom) portent bien la cote, mais l'en tirer
-- par découpe serait lire une donnée dans un intitulé : la charte compose une
-- référence CHAMP PAR CHAMP, et un champ qui manque s'ajoute.
--
-- Deux colonnes, nullables, et c'est la COTE qui dit qu'on tient un manuscrit :
-- pas de type à interpréter, pas de mention à reconnaître.

alter table public.editions_sources
  add column if not exists depot_manuscrit text,
  add column if not exists cote_manuscrit  text;

comment on column public.editions_sources.depot_manuscrit is
  'Institution qui conserve le témoin manuscrit (« Bibliothèque nationale de France »). Nulle pour une édition imprimée.';
comment on column public.editions_sources.cote_manuscrit is
  'Cote du témoin dans son dépôt (« Français 899 »). Sa PRÉSENCE dit que la provenance du texte est un manuscrit, non une édition.';

-- Le seul témoin manuscrit du corpus au 2026-09-04.
update public.editions_sources
   set depot_manuscrit = 'Bibliothèque nationale de France',
       cote_manuscrit  = 'Français 899'
 where trad_id = 'TR0009';
