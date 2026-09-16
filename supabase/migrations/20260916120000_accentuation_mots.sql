-- LE LEXIQUE D'ACCENTUATION : UN MOT PAR LIGNE, ET NON PLUS UN TEXTE.
--
-- Demande de l'auteur, 2026-09-16 : « Accentuation : revoir intégralement ; faire une liste
-- alphabétique des mots, avec possibilité d'ajout manuel, de suppression ». La « charte
-- d'accentuation » vivait en un seul texte dans `parametres.charte_accentuation`, qu'on ne
-- pouvait qu'éditer d'un bloc. Ses mots deviennent ici des lignes, repris un à un ; ses règles
-- qui n'étaient pas des mots rejoignent la charte, § 3.12. Le texte se sauvegarde et se retire
-- par la migration qui suit celle-ci.
--
-- Une entrée porte la forme JUSTE du mot. La forme fautive ne s'écrit pas : elle se déduit en
-- ôtant l'accent de l'initiale (`formeFautive`, `app/admin/accentuation.ts`). `faux_positif`
-- marque le mot qu'un contrôle croirait fautif et qu'il faut laisser tel quel.
--
-- ⛔ La table est FERMÉE à l'API, comme `moderation_lexique` : l'administration la lit et
-- l'écrit par sa route (`app/api/admin/accentuation`), sous la clé de service, après la
-- vérification de l'administrateur.
-- ⚠️ Les contraintes redisent la validation de la route (`lireEntree`) : un mot mal formé écrit
-- par un script ou par un autre assistant est refusé de la même façon. Les deux se changent
-- ensemble.

create table public.accentuation_mots (
  id bigint generated always as identity primary key,
  mot text not null,
  faux_positif boolean not null default false,
  note text,
  cree_le timestamptz not null default now(),
  mis_a_jour timestamptz not null default now(),
  constraint accentuation_mots_mot_unique unique (mot),
  constraint accentuation_mots_mot_forme check (
    mot is nfc normalized
    and char_length(mot) between 1 and 60
    and mot ~ '^[[:alpha:]]([[:alpha:]’ -]*[[:alpha:]])?$'
  ),
  constraint accentuation_mots_note_forme check (
    note is null
    or (note is nfc normalized and note = btrim(note) and char_length(note) between 1 and 500)
  )
);

alter table public.accentuation_mots enable row level security;
revoke all on public.accentuation_mots from anon, authenticated;

comment on table public.accentuation_mots is
  'Lexique d''accentuation (charte § 3.12) : la forme juste des mots dont une lettre prend un accent, et les faux positifs à laisser sans accent. Tenu dans l''administration, section « Accentuation ».';
comment on column public.accentuation_mots.mot is
  'La forme JUSTE, en NFC. La forme fautive se déduit en ôtant l''accent de l''initiale.';
comment on column public.accentuation_mots.faux_positif is
  'Vrai : le mot garde son initiale sans accent, et un contrôle ne doit pas l''accentuer.';
comment on column public.accentuation_mots.note is
  'Contexte et provenance : ce qui décide de l''accent, et où le mot a été relevé.';

-- Les mots de la charte d'accentuation, dans l'état du 2026-09-06 (dernière écriture du texte).
-- ⚠️ Les fusions d'espace relevées dans la Segond (« Etquiconque », « Etce », « Etsi ») n'étaient
-- pas des accents : elles restent dans la sauvegarde du texte, non dans le lexique.
insert into public.accentuation_mots (mot, faux_positif, note) values
  ('À', false, 'Préposition en tête de proposition. Une lettre ou une initiale reste sans accent (Iliade A, M. A. BOUCHERIE). Relevé dans la Segond 1910 (463 fois), les Annotations sur Job (18 fois) et le Commentaire sur les Psaumes de Chrysostome.'),
  ('âme', false, 'Relevé en minuscule dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écoute', false, 'Relevé dans les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écoutez', false, 'Relevé dans la Cité de Dieu, les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écoutons', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Éclairs', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écrions', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écriture', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Écritures', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Édom', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Également', false, 'Relevé dans la Cité de Dieu.'),
  ('Église', false, null),
  ('Égypte', false, 'Relevé dans la Segond 1910.'),
  ('Égyptien', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Élevé', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Élever', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Élie', false, 'Relevé dans la Cité de Dieu, les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Élisabeth', false, 'Relevé dans la Cité de Dieu.'),
  ('Élisée', false, 'Relevé dans la Cité de Dieu et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Éloigne', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Éloigner', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Éloignez', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Élyme', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Énos', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Énumérer', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Énumérez', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Épargnez', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Éphratha', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Épictète', false, 'Relevé dans la Cité de Dieu.'),
  ('Épicure', false, 'Relevé dans la Cité de Dieu.'),
  ('Épicuriens', false, 'Relevé dans la Cité de Dieu.'),
  ('Épiphane', false, 'Relevé dans la Cité de Dieu et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Épire', false, 'Relevé dans la Cité de Dieu.'),
  ('Épîtres', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Époux', false, 'Dans l’Époux. Relevé dans les Annotations sur Job.'),
  ('Épouvantés', false, 'Relevé dans la Segond 1910.'),
  ('Éprouvez', false, 'Relevé dans la Cité de Dieu et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Épuisons', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Ésaü', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Établissez', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Étaient', false, 'Relevé dans la Cité de Dieu.'),
  ('Était', false, 'Relevé dans la Cité de Dieu.'),
  ('Éthiopiens', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Étienne', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Étoiles', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Étrange', false, 'Relevé dans la Cité de Dieu.'),
  ('Étranglait', false, 'Relevé dans la Segond 1910.'),
  ('Étrusque', false, 'Relevé dans la Cité de Dieu.'),
  ('Être', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Évangéliste', false, 'Relevé dans les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Évangélistes', false, 'Relevé dans les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Ève', false, 'Relevé dans la Segond 1910.'),
  ('Évidemment', false, 'Relevé dans les Annotations sur Job et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Ézéchias', false, 'Relevé dans la Cité de Dieu et le Commentaire sur les Psaumes de Chrysostome.'),
  ('Ézéchiel', false, 'Relevé dans le Commentaire sur les Psaumes de Chrysostome.'),
  ('Îles', false, 'Relevé dans la Segond 1910.'),
  ('Ô', false, 'Interjection d’invocation (Ô Éternel, Ô Dieu, Ô roi). Relevé dans la Segond 1910 (108 fois) et les Annotations sur Job (une fois).'),
  ('Ôte', false, 'Relevé dans la Segond 1910.'),
  ('Ôter', false, 'Relevé dans la Segond 1910.'),
  ('Ôtez', false, 'Relevé dans la Segond 1910.'),
  ('Car', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Ecce', true, 'Mot latin. Une capitale latine ne s’accentue pas.'),
  ('Ecclésiaste', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Relevé dans la Segond 1910.'),
  ('Effrayés', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Elkana', true, 'Nom propre hébreu, sans accent en français. Relevé dans la Segond 1910.'),
  ('Elle', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Elles', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Emmanuel', true, 'Nom propre hébreu, sans accent en français. Relevé dans la Segond 1910.'),
  ('En', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Encore', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Enfin', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Ensuite', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Entier', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Entre', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Envers', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Environ', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Envoi', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Ergo', true, 'Mot latin. Une capitale latine ne s’accentue pas.'),
  ('Esdras', true, 'Nom propre hébreu, sans accent en français. Relevé dans la Segond 1910.'),
  ('Espère', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Relevé dans la Segond 1910, et écarté lors du contrôle des Annotations sur Job.'),
  ('Esprit', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Esrom', true, 'Nom propre hébreu, sans accent en français. Relevé dans la Segond 1910.'),
  ('Est', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Esther', true, 'Nom propre hébreu, sans accent en français. Relevé dans la Segond 1910.'),
  ('Esto', true, 'Mot latin. Une capitale latine ne s’accentue pas.'),
  ('Et', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.'),
  ('Eux', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule.'),
  ('Exalté', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Relevé dans la Segond 1910.'),
  ('Examinez', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Relevé dans la Segond 1910.'),
  ('Excepté', true, 'L’initiale ne porte pas d’accent en minuscule, ni donc en majuscule. Écarté lors du contrôle des Annotations sur Job.');

do $$
declare
  total integer;
  faux integer;
begin
  select count(*), count(*) filter (where faux_positif) into total, faux from public.accentuation_mots;
  if total <> 90 or faux <> 30 then
    raise exception 'Lexique d''accentuation : % mots dont % faux positifs, attendu 90 et 30.', total, faux;
  end if;
end $$;

-- RETOUR EN ARRIÈRE
--
-- ⚠️ Le code qui lit la table doit être retiré d'abord : la section « Accentuation » tomberait
-- en erreur. Le texte d'origine est dans `internal.backup_parametres_20260916`.
--   drop table public.accentuation_mots;
