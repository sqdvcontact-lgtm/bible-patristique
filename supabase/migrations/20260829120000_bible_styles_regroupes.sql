-- LE REGROUPEMENT DU VOCABULAIRE DES STYLES SÉMANTIQUES (2026-08-29).
--
-- Le registre portait 48 styles, dont quarante étaient un produit croisé
-- NATURE × PORTÉE — `commentaire_pericope`, `introduction_livre`, `notice_chapitre`.
-- Or le rendu ne compose que sur le couple `niveau × nature` : le suffixe répétait
-- ce que la portée disait déjà, et ce qui se répète dérive (charte § 7.1). La dérive
-- s'était produite — le Pentateuque et le Nouveau Testament employaient des
-- vocabulaires disjoints pour des fonctions voisines.
--
-- Ils sont quatre : `introduction_titree`, `introduction`, `commentaire`, `notice`.
-- Les sept titres ne bougent pas : chez eux le rang EST l'identité, un code par rang,
-- et il n'y avait aucun produit croisé à défaire.
--
-- ⚠️ Les anciens codes vivent comme NOMS HÉRITÉS, chacun portant le rang qu'il disait.
-- La donnée n'a donc rien à migrer pour continuer de paraître.

begin;

-- ── 1. Une NATURE canonique ne porte plus de rang ───────────────────────────────
--
-- C'est tout l'objet du regroupement : le nom dit la nature, le rang se déclare sur
-- le bloc. La contrainte exigeait `niveau is not null` sur tout style de plein droit,
-- ce qui interdisait précisément les quatre natures neuves.
--
-- ⚠️ Elle reste exigée des TITRES et de la note, qui sont un code par rang.
alter table public.bible_styles_semantiques
  drop constraint if exists bible_styles_semantiques_forme;

alter table public.bible_styles_semantiques
  add constraint bible_styles_semantiques_forme check (
    (alias_de is not null and kind is null)
    or (alias_de is null and kind is not null and nature is not null
        and (niveau is not null or kind = 'info'))
  );

comment on column public.bible_styles_semantiques.niveau is
  'Le rang du style. NUL sur une nature d''information depuis le regroupement du 2026-08-29 : le rang s''y déclare sur le bloc (metadata.semantic_level). Un nom HÉRITÉ le porte, parce qu''il le disait dans son propre nom, et ce rang-là fait foi.';

-- ── 2. Le verrou exige désormais que le RANG soit atteignable ───────────────────
--
-- ⛔ Sans quoi la base accepterait un bloc que le rendu ne sait pas composer, ce qui
-- est exactement ce que ce déclencheur existe pour empêcher. Un style d'information
-- canonique — `commentaire` — n'a de rang que celui que le bloc déclare ; un nom
-- hérité — `commentaire_pericope` — porte le sien.
create or replace function public.bible_style_semantique_connu()
returns trigger language plpgsql as $$
declare
  v_code    text;
  v_alias   text;
  v_niveau  text;
  v_kind    text;
begin
  v_code := public.bible_style_semantique_effectif(new.metadata, new.block_kind, new.scope_kind);

  select s.alias_de, s.niveau, s.kind into v_alias, v_niveau, v_kind
    from public.bible_styles_semantiques s where s.code = v_code;

  if not found then
    raise exception
      'Style sémantique inconnu : « % ». Le vocabulaire est CLOS (voir bible_styles_semantiques et work/fillion/semantic_display_hierarchy.json). Un style inconnu ne serait pas rendu du tout — le lecteur refuse ce qu''il ne sait pas composer, au lieu de l''aplatir.',
      v_code
      using errcode = 'check_violation';
  end if;

  -- Un nom hérité renvoie à sa nature, et lui prête le rang qu'il portait.
  if v_alias is not null then
    select s.kind into v_kind from public.bible_styles_semantiques s where s.code = v_alias;
  end if;

  -- Une nature d'information sans rang ne se compose pas.
  if v_kind = 'info' and coalesce(v_niveau, new.metadata ->> 'semantic_level') is null then
    raise exception
      'Style « % » sans RANG. Depuis le regroupement du 2026-08-29, un style d''information dit une NATURE ; le rang se déclare dans metadata.semantic_level (I1 à I6). Un bloc qui n''en déclare aucun ne s''en invente pas un.',
      v_code
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.bible_style_semantique_connu() is
  'Refuse un bloc dont le style effectif est hors du vocabulaire, ou dont la nature d''information ne reçoit aucun rang. Le vocabulaire vient de bible_styles_semantiques, copie en base de work/fillion/semantic_display_hierarchy.json.';

commit;
