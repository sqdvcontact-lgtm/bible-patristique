-- DEUX CLÉS DE `parametres` SE RETIRENT : PLUS RIEN NE LES LIT.
--
-- `directives_propositions_gpt` portait les directives de la page « Propositions de GPT »,
-- supprimée avec sa route et son registre le 2026-09-16 à la demande de l'auteur (« supprimer
-- intégralement, les données, le code »). Au jour du retrait, elle ne portait plus que des
-- listes vides.
--
-- `charte_accentuation` portait la charte d'accentuation en un seul texte. Ses mots vivent
-- désormais dans `accentuation_mots` (migration précédente), ses règles dans la charte,
-- § 3.12. Garder le texte en place laisserait deux sources pour la même doctrine, et la
-- charte est la seule (décision de l'auteur, 2026-08-24).
--
-- Rien ne les nomme plus : ni le site (relu dans `app/` et `scripts/`, le script
-- `charte-accentuation-maj.mjs` retiré avec le reste), ni une fonction, ni une vue (relu
-- dans le catalogue le jour même).
--
-- ⛔ ON SAUVEGARDE AVANT DE RETIRER, hors de portée des rôles du site, et l'on refuse de
-- retirer ce que la sauvegarde ne porte pas.

create table if not exists internal.backup_parametres_20260916 as
  select cle, valeur, mis_a_jour, now() as sauvegarde_le
    from public.parametres
   where cle in ('charte_accentuation', 'directives_propositions_gpt');

do $$
declare
  manquantes integer;
begin
  select count(*) into manquantes
    from public.parametres p
   where p.cle in ('charte_accentuation', 'directives_propositions_gpt')
     and not exists (
       select 1 from internal.backup_parametres_20260916 b
        where b.cle = p.cle and b.valeur = p.valeur
     );
  if manquantes > 0 then
    raise exception '% clé(s) diffèrent de leur sauvegarde (internal.backup_parametres_20260916) : rien n''est retiré.', manquantes;
  end if;
end $$;

delete from public.parametres
 where cle in ('charte_accentuation', 'directives_propositions_gpt');

-- RETOUR EN ARRIÈRE
--
-- ⚠️ Les deux pages qui lisaient ces clés n'existent plus : les rétablir ne rend que les
-- données. Le code d'avant le retrait est dans l'histoire du dépôt.
--   insert into public.parametres (cle, valeur, mis_a_jour)
--     select cle, valeur, mis_a_jour from internal.backup_parametres_20260916
--   on conflict (cle) do nothing;
