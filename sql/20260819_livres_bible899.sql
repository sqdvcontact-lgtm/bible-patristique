-- Liste des livres réellement portés par TR0009, calquée sur `livres_par_traduction`.
--
-- POURQUOI. `livresDisponibles899` (app/lib/bible899.ts) demandait à la vue de
-- recomposition TOUTES les valeurs de `livre`, sans borne, pour n'en tirer que
-- vingt-quatre valeurs distinctes. L'API de données plafonne à 1000 lignes : sur les
-- 18 957 lignes alignées, la fonction ne voyait donc que les livres tombant dans cette
-- fenêtre — RUT, TOB, MRK, 1PE, JAS — et marquait « vides » les dix-neuf autres, Genèse
-- comprise. Or un livre marqué vide est INERTE dans `NavLivres` : `handleLivre` sort
-- immédiatement, le clic ne fait rien. D'où le symptôme rapporté le 2026-08-19 : « la
-- Bible du XIIIᵉ ne s'affiche pas, Genèse est grisée ».
--
-- Le défaut est apparu EN SILENCE quand le corpus d'alignement a dépassé les mille
-- lignes ; en dessous, tout marchait. Il date du 2026-08-08 (intégration de TR0009).
--
-- Le même piège avait déjà été rencontré et corrigé pour les traductions ordinaires :
-- c'est la raison d'être de `livres_par_traduction`, et le commentaire qui surplombe
-- l'appel dans `BibleLayout` le dit mot pour mot. La branche TR0009, ajoutée après,
-- l'avait rouvert. On ne demande pas tous les versets pour en déduire la liste des
-- livres : on demande la liste des livres.
--
-- DROITS. Mêmes que son aînée : `security_invoker`, SELECT réservé aux authentifiés.
-- L'anonyme n'y a rien — la segmentation « verse » de TR0009 n'est pas publique, et
-- c'est pourquoi la vue sous-jacente est SECURITY DEFINER (choix assumé, cf. charte).

create or replace view public.livres_bible899
with (security_invoker = true) as
select
  trad_id,
  livre,
  count(*) as nb_versets
from public.v_bible899_verse_recomposed
where canon_id is not null
  and livre is not null
group by trad_id, livre;

revoke all on public.livres_bible899 from anon;
grant select on public.livres_bible899 to authenticated;

notify pgrst, 'reload schema';
