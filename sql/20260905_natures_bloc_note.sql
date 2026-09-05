-- NATURES D'UN BLOC DE NOTE — élargissement du vocabulaire à huit valeurs.
-- Charte § 13.10, arbitré le 5 septembre 2026.
--
-- Deux natures entrent, l'une et l'autre MESURÉES sur le corpus avant d'être
-- nommées — c'est la règle du § 7.6, et l'inverse de ce que le dépôt a fait quatre
-- fois avec `NATURES_CORPS` :
--
--   source_locator            ~396 blocs. La coordonnée de la note dans le LIVRE
--                             IMPRIMÉ : « (V) pag. 178. ». Chez Faivre, elle est
--                             aujourd'hui agglomérée avec le lemme et le
--                             commentaire dans un unique bloc `commentary`, que la
--                             passe 3 du protocole fendra en trois.
--
--   internal_cross_reference  ~116 blocs. Le renvoi à une AUTRE NOTE, ou ailleurs
--                             dans la même œuvre : « Voyez la note I, p. 150 ».
--                             Rangé sous `reference`, il se ferait composer comme
--                             un renvoi bibliographique — avec l'auteur et le titre
--                             qu'il n'a pas — et son « I », qui est un numéro de
--                             note, serait converti en chapitre arabe par
--                             `normaliserReferencesDansTexte`.
--
-- ⛔ ORDRE OBLIGATOIRE (charte § 7.6) : la charte, puis CETTE contrainte, puis le
-- vocabulaire du code (`app/lib/naturesNote.ts`), puis la composition, puis
-- l'épreuve à l'écran — et SEULEMENT ENSUITE on sème. Un `insert` qui poserait une
-- nature que rien ne sait rendre ferait disparaître le bloc de la page, en silence.
--
-- ⚠️ Cette migration n'écrit AUCUNE donnée. Elle élargit ce que la table accepte :
-- les 24 264 blocs existants satisfont la nouvelle contrainte comme l'ancienne, et
-- le retour arrière (`sql/rollback_natures_bloc_note_20260905.sql`) est sans perte
-- tant qu'aucune des deux natures neuves n'a été semée.

begin;

alter table public.texte_note_blocs
  drop constraint texte_note_blocs_kind_check;

alter table public.texte_note_blocs
  add constraint texte_note_blocs_kind_check
  check (kind = any (array[
    -- ANCRAGE — ce à quoi la note tient
    'lemma'::text,
    'source_locator'::text,
    -- PROPOS — ce qu'elle dit d'elle-même
    'commentary'::text,
    -- TÉMOIGNAGE — ce qu'elle rapporte d'un tiers
    'quotation'::text,
    'translation'::text,
    'attribution'::text,
    -- RENVOI — ce vers quoi elle envoie
    'reference'::text,
    'internal_cross_reference'::text
  ]));

commit;
