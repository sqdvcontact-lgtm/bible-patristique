-- LE TEXTE D'ACCOMPAGNEMENT DE CHAQUE HAUT FAIT (1er septembre 2026)
--
-- « IL FAUT UN TEXTE POUR CHAQUE NOTIFICATION de haut fait » — l'auteur. Les
-- quarante-quatre en portent donc un, et la colonne `notice` redevient obligatoire :
-- c'est ce texte que la belle annonce affiche au moment où la case tombe.
--
-- ⛔ LES TEXTES SONT LES SIENS, à DIX exceptions près, et chacune tient à la même
-- raison : le texte annonçait une condition que le haut fait ne mesure PAS. La charte
-- l'interdit — « on n'annonce QUE ce que la page porte » — et un lecteur à qui l'on
-- dit « vous avez lu toute la Genèse » parce qu'il a gardé un verset apprend d'abord
-- que le site se paie de mots. Dans chaque cas la SECONDE phrase, qui porte le trait,
-- est conservée mot pour mot ; seule la première, qui porte la CLAIM, est ramenée à
-- ce qui est vrai.
--
--   Première traversée   « une œuvre lue jusqu'au bout »  → un premier passage gardé
--   Habitué des lieux    « sept jours de lecture »        → sept jours à marquer
--   Lecteur au long cours idem
--   Veilleur de nuit     « vous avez lu »                 → vous gardiez un passage
--   Avant l'aurore       « une lecture commencée »        → un passage gardé
--   Au commencement      « toute la Genèse lue »          → le premier verset gardé
--   Par le désert        « l'Exode lu jusqu'au bout »     → l'Exode et les Nombres
--   Une soirée avec…     « une œuvre entière lue »        → dix passages en un jour
--   Bibliothèque en…     « dix œuvres achevées »          → dix œuvres rangées
--   Grand lecteur        « cinquante œuvres lues »        → les trois cinquièmes du fonds
--
-- ⛔ Et une correction qui n'est pas de mesure mais de DOCTRINE : « À côté du canon »
-- disait « premier texte apocryphe ». Tobie, Judith, la Sagesse, le Siracide, Baruch
-- et les Maccabées sont CANONIQUES pour l'Église catholique — ils sont à côté du canon
-- hébraïque, non du sien, et c'est tout le sens du nom. Sur ce site, les appeler
-- apocryphes serait une faute.
--
-- ⚠️ SEPT hauts faits n'avaient pas de texte dans la table : Alpha, les trois degrés
-- des Siècles et les trois de L'écrit. Ils en reçoivent un, dans le même registre —
-- une phrase qui constate, une phrase qui sourit — en attendant les siens.

begin;

update public.hauts_faits set notice = case code

  -- ── Commencements ─────────────────────────────────────────────────────────
  when 'comm-1' then 'Il fallait bien commencer quelque part. Vous voici entré dans le corpus.'
  when 'comm-2' then 'Le premier verset que vous gardez. Il y en aura d''autres.'
  when 'comm-3' then 'Un premier passage gardé chez les Pères. Première traversée accomplie.'
  when 'comm-4' then 'Premier passage mis de côté. Certains textes méritent qu''on revienne les chercher.'

  -- ── Le tour de la Bible ───────────────────────────────────────────────────
  when 'bib-1' then 'Dix livres bibliques parcourus. La bibliothèque commence à prendre forme.'
  when 'bib-2' then 'Vous avez franchi la frontière entre l''Ancien et le Nouveau Testament.'
  when 'bib-3' then 'Matthieu, Marc, Luc et Jean : les quatre Évangiles ont été parcourus.'
  when 'bib-4' then 'Vous avez parcouru les épîtres pauliniennes. Beaucoup de kilomètres, quelques controverses.'
  when 'bib-5' then 'Vous avez laissé une marque dans chacun des livres de la Bible. Peu de rayons vous sont désormais étrangers.'

  -- ── Passages nommés ───────────────────────────────────────────────────────
  when 'nom-1' then 'Vous avez gardé le tout premier verset. Le commencement, au moins, n''a plus de secrets pour vous.'
  when 'nom-2' then 'L''Exode et les Nombres. Vous en êtes sorti, ce qui est déjà quelque chose.'
  when 'nom-3' then 'Premier livre deutérocanonique. Toutes les bibliothèques ont leurs rayons latéraux.'
  when 'nom-4' then 'Cent cinquante psaumes. De la plainte, de la joie, de la colère — et beaucoup de chant.'

  -- ── Les langues ───────────────────────────────────────────────────────────
  when 'lng-1' then 'Vous avez quitté la traduction pour remonter au texte source.'
  when 'lng-2' then 'Un même verset gardé dans deux traductions. Vous voilà en lecture parallèle.'
  when 'lng-3' then 'Soixante-dix passages grecs. « Un peu » commence à devenir discutable.'
  when 'lng-4' then 'Cent passages latins. La déclinaison est désormais votre affaire.'
  when 'lng-5' then 'Cinq traductions différentes vous ont retenu. Elles n''étaient évidemment pas toutes d''accord.'
  when 'lng-6' then 'Un même verset gardé dans quatre traductions. Cette fois, tout le monde se comprend.'

  -- ── Les Pères ─────────────────────────────────────────────────────────────
  when 'per-1' then 'Trois auteurs anciens réunis autour d''un même passage. Ils n''avaient pas nécessairement la même lecture.'
  when 'per-2' then 'Cinq Pères gardés sur un même passage. Une certaine unanimité n''est toujours pas garantie.'
  when 'per-3' then 'Dix auteurs patristiques parcourus. Vous commencez à reconnaître les voix.'
  when 'per-4' then 'Les trois quarts des auteurs que la bibliothèque donne à lire. À ce stade, quelques-uns doivent commencer à vous sembler de vieilles connaissances.'

  -- ── La bibliothèque ───────────────────────────────────────────────────────
  when 'lib-1' then 'Vingt-cinq passages conservés. Votre propre petite bibliothèque dans la bibliothèque.'
  when 'lib-2' then 'Dix œuvres rangées dans votre bibliothèque. Vous avancez désormais par volumes entiers.'
  when 'lib-3' then 'Un passage des Confessions. La phrase vient de là : une voix d''enfant, par-dessus le mur d''un jardin de Milan.'
  when 'lib-4' then 'Dix passages d''Augustin gardés dans la même journée. La soirée a pu être longue.'
  when 'lib-5' then 'Les trois cinquièmes des œuvres que le site publie. Il devient difficile de parler de simple curiosité.'

  -- ── Les siècles ───────────────────────────────────────────────────────────
  when 'sie-1' then 'Deux siècles réunis dans vos marques. Ils ne se seraient pas rencontrés autrement.'
  when 'sie-2' then 'Quatre siècles. L''écart commence à se voir.'
  when 'sie-3' then 'Tous les siècles que la bibliothèque couvre. Braudel appelait cela la longue durée ; il ne parlait pas des Pères, mais le mot tient.'

  -- ── La communauté ─────────────────────────────────────────────────────────
  when 'cnq-1' then 'Vous avez publié votre premier commentaire. Le silence est rompu.'
  when 'cnq-2' then 'Une première contribution a été validée. Quelqu''un d''autre a regardé — et approuvé.'
  when 'cnq-3' then 'Vous avez répondu à un autre lecteur. La discussion commence.'
  when 'cnq-4' then 'Dix validations obtenues. Vos marges commencent à être fréquentées.'
  when 'cnq-5' then 'Vous avez signalé votre première erreur. Merci d''avoir regardé de près.'

  -- ── L'assiduité ───────────────────────────────────────────────────────────
  when 'ass-1' then 'Sept jours à marquer quelque chose. Vous commencez à connaître la maison.'
  when 'ass-2' then 'Vous gardiez un passage pendant que le reste du monde avait probablement de meilleures raisons de dormir.'
  when 'ass-3' then 'Un passage gardé avant le lever du jour. Les textes étaient déjà là.'
  when 'ass-4' then 'Trente jours à marquer quelque chose. Ce n''est plus tout à fait une visite.'
  when 'ass-5' then 'Douze mois de présence dans le corpus. Les textes sont restés ; vous aussi.'

  -- ── L'écrit ───────────────────────────────────────────────────────────────
  when 'ecr-1' then 'Votre première publication. Le mot désigne un texte bref, ce qui n''est pas un reproche.'
  when 'ecr-2' then 'Trois publications. On appelle ainsi les volumes qu''on offre à un savant ; le vôtre s''écrit tout seul.'
  when 'ecr-3' then 'Dix publications. Ce n''est plus une série de textes, c''est une œuvre.'

  else notice
end
where true;

-- ⛔ Un haut fait SANS texte ne peut plus entrer : c'est lui que l'annonce affiche, et
-- une notification muette n'a pas lieu d'être. La colonne redevient obligatoire, et
-- l'on refuse en outre la chaîne vide, qu'un « not null » laisserait passer.
alter table public.hauts_faits alter column notice set not null;
alter table public.hauts_faits drop constraint if exists hauts_faits_notice_non_vide;
alter table public.hauts_faits add constraint hauts_faits_notice_non_vide
  check (length(btrim(notice)) > 0);

commit;
