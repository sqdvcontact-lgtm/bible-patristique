-- Retour en arrière du développement éditorial de la note de titre des
-- « Annotations sur le livre de Job » (A0010O0100), posé le 2026-09-09.
--
-- Mission : A0010O0100|note-titre-developpement-20260909
--
-- Ce que la passe a fait : la note 1, ancrée sur `work_title` et jusque-là réduite
-- au seul renvoi de l'édition Raulx 1866 (« Voir Augustin, *Rétractations*, II, 13. »),
-- reçoit trois blocs de Corpus Scriptura — un développement, le texte latin du
-- chapitre visé, et sa traduction par M. de Riancey (Bar-le-Duc, L. Guérin, 1864).
--
-- ⛔ Le bloc de rang 1, qui est celui de l'édition, n'a pas été touché.
-- Sauvegardes : internal.backup_note_job_titre_blocs_20260909 (1 ligne)
--               internal.backup_note_job_titre_ancre_20260909 (1 ligne)

begin;

delete from texte_note_blocs
where id_texte = 'TXT_A0010O0100_LEGACY'
  and note_key = 'A0010O0100-RAULX1866-N0001'
  and block_id in (
    'A0010O0100-CORPUS2026-N0001-B0002',
    'A0010O0100-CORPUS2026-N0001-B0003',
    'A0010O0100-CORPUS2026-N0001-B0004'
  );

update texte_note_ancres a
set structured_block_count = s.structured_block_count,
    metadata = s.metadata
from internal.backup_note_job_titre_ancre_20260909 s
where a.id_texte = s.id_texte and a.note_key = s.note_key;

-- Postcheck : un seul bloc, celui de l'édition, et l'ancre rendue à son état.
do $$
declare n integer; c integer;
begin
  select count(*) into n from texte_note_blocs
   where note_key = 'A0010O0100-RAULX1866-N0001';
  select structured_block_count into c from texte_note_ancres
   where note_key = 'A0010O0100-RAULX1866-N0001';
  if n <> 1 or c <> 1 then
    raise exception 'retour en arriere incomplet : % blocs, structured_block_count = %', n, c;
  end if;
end $$;

commit;
