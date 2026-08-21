-- Restrict ordinary authenticated readers to links whose owning text and work
-- are both public. The existing liens_bibliques_admin_all policy is preserved.

drop policy if exists "liens lisibles par tous"
on public.liens_bibliques;

create policy "liens_bibliques_lecture_textes_publics"
on public.liens_bibliques
for select
to authenticated
using (
  exists (
    select 1
    from public.segments s
    join public.oeuvre_textes t
      on t.id_texte = s.id_texte
    join public.oeuvres o
      on o.id_oeuvre = t.id_oeuvre
    where s.id = liens_bibliques.segment_id
      and t.is_public
      and o.acces_public
  )
);
