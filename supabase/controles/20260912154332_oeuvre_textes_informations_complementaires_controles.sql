-- CONTRÔLES de `20260912154332_oeuvre_textes_informations_complementaires`.
--
-- ⚠️ Ils s'exécutent dans une transaction ANNULÉE : rien n'est écrit. Le rapport revient
-- par l'exception finale, qui rembobine tout.
--
-- Usage (canal d'administration) : coller le bloc, lire le message de l'exception.

begin;

do $$
declare
  rapport text := '';
  n_col integer;
  n_comment integer;
  n_notnull integer;
  n_check integer;
  temoin text;
  relu text;
  public_avant boolean;
  public_apres boolean;
begin
  -- 1. La colonne existe, elle est du TEXTE, et elle est NULLABLE.
  select count(*) into n_col
  from information_schema.columns
  where table_schema = 'public' and table_name = 'oeuvre_textes'
    and column_name = 'informations_complementaires' and data_type = 'text';
  rapport := rapport || format('1. colonne texte présente : %s (attendu 1)%s', n_col, chr(10));

  select count(*) into n_notnull
  from information_schema.columns
  where table_schema = 'public' and table_name = 'oeuvre_textes'
    and column_name = 'informations_complementaires' and is_nullable = 'NO';
  rapport := rapport || format('2. contrainte NOT NULL : %s (attendu 0 — le vide veut dire « rien à déclarer »)%s', n_notnull, chr(10));

  -- 2. ⛔ Aucune contrainte de valeur : c'est de la prose éditoriale.
  select count(*) into n_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'oeuvre_textes' and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%informations_complementaires%';
  rapport := rapport || format('3. contraintes CHECK sur la colonne : %s (attendu 0)%s', n_check, chr(10));

  -- 3. Le commentaire dit à quoi elle sert : une colonne sans commentaire se devine.
  select count(*) into n_comment
  from pg_description d
  join pg_class t on t.oid = d.objoid
  join pg_attribute a on a.attrelid = t.oid and a.attnum = d.objsubid
  where t.relname = 'oeuvre_textes' and a.attname = 'informations_complementaires';
  rapport := rapport || format('4. commentaire de colonne : %s (attendu 1)%s', n_comment, chr(10));

  -- 4. Elle s'écrit et se relit au caractère près, accents et sauts de ligne compris.
  --    ⚠️ On relève `is_public` AVANT d'écrire : comparer une valeur à elle-même après
  --    coup serait une garde tautologique, qui occupe la place sans rien tenir.
  select id_texte, is_public into temoin, public_avant
    from public.oeuvre_textes order by id_texte limit 1;
  update public.oeuvre_textes
     set informations_complementaires = 'Manuscrits : B (Sessorianus), P (Parisinus).' || chr(10) || 'Sigles : « om. » = omisit.'
   where id_texte = temoin;
  select informations_complementaires, is_public into relu, public_apres
    from public.oeuvre_textes where id_texte = temoin;
  rapport := rapport || format('5. écriture relue à l’identique : %s (attendu t)%s',
    relu = 'Manuscrits : B (Sessorianus), P (Parisinus).' || chr(10) || 'Sigles : « om. » = omisit.', chr(10));

  -- 5. ⛔ Elle ne touche à AUCUNE décision de publication (charte § 52) : le déclencheur
  --    qui dérive `is_public` la voit passer sans rien changer.
  rapport := rapport || format('6. publication inchangée par l’écriture : %s → %s (attendu identiques)%s',
    public_avant, public_apres, chr(10));

  raise exception E'CONTRÔLES — informations complémentaires d\'une édition\n%', rapport;
end $$;

rollback;
