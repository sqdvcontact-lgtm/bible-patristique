/**
 * § 13.12 : les arbitrages de l'auteur sur la normalisation des notes
 * (5 septembre 2026), les CINQ TYPES de note, l'italique du latin enchâssé,
 * et ce qui reste ouvert.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-arbitrages-notes-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 13.12 Ce que l’auteur a TRANCHÉ'

// Ancre : la dernière phrase du § 13.11.1, recopiée de `parametres.charte_ia`.
const ANCRE = 'Il s\'écrit par marqueur, dans le texte, à la passe 5.'

const SECTION = `


${MARQUE} le 5 septembre 2026

Douze questions posées dans \`work/notes/QUESTIONS_NOTES_20260905.txt\`, toutes MESURÉES sur le corpus réel avant d’être posées, et par les fonctions du site elles-mêmes plutôt que par une copie de leurs règles. Ce qui suit est la réponse de l’auteur : elle commande les passes du protocole. ⚠️ Aucune donnée n’a été écrite le jour de l’arbitrage — la charte d’abord (§ 7.6), la donnée ensuite.

**1. LES ITALIQUES DE L’OCR DEVIENNENT DES MARQUEURS.** 420 blocs de cinq textes portent dans \`metadata.enrichments\` les italiques, petites capitales et exposants relevés sur la page imprimée : **3 569 empans ancrés par offset**, et **aucune ligne du site ne les lit**. Ils se convertissent en \`*italique*\`, \`++petites capitales++\` et \`^^exposant^^\`, écrits dans le texte, que \`rendreTexteEnrichi\` compose déjà. ⚠️ Mesuré : **406 blocs sur 420 (96,7 %)** se convertissent sans réserve ; aucun de ces textes ne porte déjà \`*\`, \`+\`, \`^\` ni \`<i>\` ; **14 blocs** ont des empans qui se chevauchent et se relisent un par un. ⛔ C’est le § 13.11.1 pris par l’autre bout : *un champ que rien ne lit n’est pas une réserve pour plus tard, c’est une seconde vérité qui attend de contredire la première* — et celle-ci est le SEUL témoin des italiques de Faivre.

**2. UN RENVOI « RÉFÉRENCE IMPRIMÉE : » SE NORMALISE COMME LES AUTRES.** 4 883 blocs de 27 textes ouvrent sur ce préfixe (le protocole en annonçait 3 622, et le chiffre est rectifié) ; il se retire, \`metadata.provenance_note\` dit d’où vient le renvoi, et le texte passe par le normaliseur comme le reste du corpus. ⛔ **La provenance dit d’OÙ vient un renvoi, jamais qu’il doive garder sa graphie** : sans quoi le site écrirait « Ps. 5, 8. » ici et « Ps 5, 8 » partout ailleurs, pour la même référence. La leçon imprimée se conserve en \`metadata\`, ce qui rend la provenance vérifiable au lieu d’en faire une étiquette.

**3. LA LEÇON IMPRIMÉE SE CONSERVE QUAND LE CHANGEMENT DÉPASSE LA TYPOGRAPHIE**, et seulement alors : ponctuation finale ajoutée, abréviation développée, référence recomposée. ⛔ Jamais pour une espace fine. \`normaliserTypographieLecture\` ne change pas la longueur d’un texte, elle convertit un type d’espace ; conserver une leçon pour cela ferait de \`metadata\` un double du champ \`text\` sur des milliers de blocs, sans qu’aucune preuve y gagne. ⚠️ Repères mesurés : 6 431 notes sur 16 408 (39 %) reçoivent une ponctuation finale, 3 392 renvois sur 11 916 sont recomposés — ce sont ces blocs-là qui gardent leur leçon.

**4. UN RENVOI INTERNE SE RECONNAÎT À LA LECTURE, JAMAIS À SON MOT D’OUVERTURE.** Sur les 79 blocs qui ouvrent par « Voy. », « Voir » ou « Consulter », les uns renvoient à Paul Monceaux et à la *Revue d’histoire ecclésiastique*, donc hors de l’œuvre ; les autres à « la note L, tome I, p. 131 ». **Sept seulement nomment une note.** ⛔ « Il faut systématiquement faire un contrôle logique. Il faut que l’IA regarde de près ce qui est écrit et réfléchisse. On ne peut pas automatiser » (l’auteur). D’autant moins que ce renvoi devra un jour DÉSIGNER un segment de la même œuvre, parfois lointain : une cible fausse coûte plus qu’une cible absente.

**5. LE TYPE DE NOTE S’ATTRIBUE AU CAS PAR CAS**, et la charte porte la liste des types pour que l’identification ait une ligne directrice (§ 13.12.1). ⚠️ 16 873 blocs sur 24 264 (69 %) n’en portent aucun : c’est le plus gros manque de l’appareil.

**6. LA MENTION « (NOTE DU TRADUCTEUR.) » ÉCRITE EN CLAIR SE RETIRE** dès que le type est posé — 136 notes. « On transpose cette information dans la case dédiée » (l’auteur, confirmant le § 13.8). ⛔ Sans quoi le lecteur la lit deux fois, l’en-tête de la fenêtre l’annonçant déjà.

**7. LE LATIN ENCHÂSSÉ SE MET EN ITALIQUE** (§ 13.12.2).

**8. UN « IBID. » SANS AMONT SE DÉPUBLIE, PUIS SE CHERCHE.** 116 blocs ouvrent sur « ibid. » ou « id. » ; en remontant l’ordre de lecture, 43 trouvent leur œuvre dans la note qui précède, 60 en remontant de deux à douze notes, et **13 ne se résolvent par aucun moyen mécanique**. La marche arrêtée par l’auteur, dans cet ordre : **on les dépublie ; on cherche ensuite au cas par cas, au besoin dans le fac-similé ; on corrige si la réponse est trouvée, on reconstitue avec une note éditoriale si on le peut, on supprime si on ne le peut pas.** ⚠️ « Dépublier » n’existe pas encore pour une note : voir § 13.12.3.

**9. UN « IBID. » RÉSOLU SE COMPOSE ENTIER.** Le lecteur lira « Augustin, *La Cité de Dieu*, XI, 25 » et ne lira plus jamais « Ibid., 25 ». La forme imprimée se conserve en \`metadata\`, la règle 3 s’appliquant : le changement dépasse de loin la typographie.

**10. DES DEUX NOMS D’UNE MÊME MÉTADONNÉE, LE PLUS RÉPANDU SURVIT.** \`human_validated\` (14 000 blocs) contre \`validated_human\` (5 662) ; \`reference_normalized\` (1 682) contre \`normalised_reference\` (1 032). ⚠️ L’unification est sans risque, et c’est mesuré : les **901 blocs qui portent les deux premiers s’accordent tous**, sans une seule contradiction, et les deux seconds ne se rencontrent jamais sur un même bloc. ⛔ Et le nom retenu est déjà celui que le code lit (\`lireMetadonneesBlocNote\`) : le plus répandu n’est pas le plus régulier, mais il est le seul qui ne demande pas de toucher au rendu.

**11. LE MOTIF DU NORMALISEUR RECONNAÎT LE CHAPITRE ROMAIN EN MINUSCULES.** ⚠️ **Le § 13.8.1 annonce 1 716 renvois : le chiffre est FAUX**, et la mesure du 5 septembre 2026 le rectifie — **355 occurrences** de la forme « <mot>. <romain minuscule>, <nombre> », dans 355 blocs et 14 textes, dont **223 seulement seraient réécrites**. ⛔ Le risque est borné par le motif lui-même : il n’agit que si le mot qui précède résout vers un livre du référentiel, et « Cor. » (58 occurrences), « Ibid. » (26), « Thess. » et « Eccl. » en sont volontairement absents comme équivoques. Vérifié sur la vraie fonction : « Cor. XV, 22 » et « Ibid. V, 12 » ne bougent pas. ⚠️ Chaque bloc touché se signale, pour un contrôle par sondage.

**12. LE RÉFÉRENTIEL D’ABRÉVIATIONS ACCUEILLE LES VARIANTES NON ÉQUIVOQUES**, une à une, chacune vérifiée sur ses occurrences réelles : « Ephés. », « Ephes. », « Math. », « Galat. », « Apocal. », « Nomb. », « Sag. ». ⛔ Les équivoques restent dehors, et la charte l’a déjà tranché : « Cor. », « Thess. », « Eccl. », « Tim. », « Par. ».

**13. LE JOURNAL D’ATELIER DE \`metadata\` RESTE EN BASE, MAIS LA PAGE CESSE DE LE TRANSPORTER.** \`metadata\` porte plus de 150 clés distinctes, pour l’essentiel un journal de travail daté (\`facsimile_pixel_review_20260903\`, \`p3_canonicalization_audit_20260904\`…), et **554 blocs y portent une copie complète d’un bloc** — \`text\`, \`kind\`, \`form\`, \`rank\`, \`language\` et le reste, tous à 554. Le site n’en lit que quatre scalaires, mais le \`jsonb\` ENTIER voyage jusqu’au navigateur, pour 24 264 blocs. ⛔ **On restreint donc la LECTURE aux clés qu’on projette** : gain sans arbitrage, sans toucher une donnée. ⚠️ Le journal lui-même appartient à GPT, et l’auteur ajoute qu’**il faut le supprimer s’il ne sert à rien** : la décision lui revient. ⛔ Les 554 copies de bloc, elles, sont une seconde vérité au sens de la charte et se regardent à part.

### 13.12.1 Les CINQ TYPES de note, et comment les reconnaître

Demandé par l’auteur le 5 septembre 2026 : « Il faut évidemment lister les types de notes dans la charte pour que GPT, qui fera ce travail d’identification, ait une ligne directrice. » Le type vit dans \`metadata.editorial_role\`, jamais dans le texte du bloc.

| \`editorial_role\` | Ce qu’il dit | Ce que le lecteur voit |
|---|---|---|
| \`author_note\` | la note est de l’AUTEUR ancien lui-même | Note de l’auteur |
| \`translator_note\` | elle est du TRADUCTEUR | Note du traducteur |
| \`source_editorial_note\` | elle est de l’ÉDITION dont le texte est tiré | Note de l’édition |
| \`corpus_editorial_note\` | elle est de NOUS | Note de Corpus Scriptura |
| \`critical_apparatus\` | c’est une entrée d’apparat critique (§ 22) | Apparat critique |
| *(absent)* | on ne sait pas | Note |

**Les repères, dans l’ordre où ils tranchent :**

- \`translator_note\` — elle parle de la LANGUE et de son propre travail : « nous avons traduit », « le mot grec », « notre version », « littéralement ». C’est la seule voix qui se justifie d’un choix de mot.
- \`source_editorial_note\` — elle DOCUMENTE : elle date, situe, identifie un personnage, renvoie à la littérature savante, cite une édition. C’est le cas ORDINAIRE d’une édition du XIXe siècle, et donc le lot par défaut d’un texte entier.
- \`author_note\` — elle parle depuis le temps de l’ŒUVRE : elle renvoie à un autre endroit du même ouvrage, elle ne peut nommer aucun auteur postérieur. ⛔ Ne pas la confondre avec le fait que l’auteur parle dans le TEXTE : ce qui est en cause est qui a écrit la NOTE.
- \`corpus_editorial_note\` — **elle n’existe que si nous l’avons écrite.** ⛔ Jamais attribuée à une note importée, si utile soit-elle.
- \`critical_apparatus\` — la notation philologique, hors de toute passe de normalisation (§ 13.9, § 22).

**La méthode, arrêtée avec l’auteur : EN LOT PAR TEXTE, SAUF EXCEPTIONS NOMMÉES.** Une édition a un responsable, et ses notes sont de lui. Mesuré en cherchant les notes qui trahissent une seconde voix : **34 textes (10 348 blocs) n’en portent aucune** et se traitent d’un coup ; **10 textes (6 525 blocs) en portent au moins une** et demandent la lecture. Sortent du lot pour être jugés à part : les blocs qui disent « nous », ceux qui nomment le traducteur, ceux qui portent déjà leur type en clair. Un sondage de contrôle ferme chaque texte.

⛔ **UN TYPE FAUX EST PIRE QU’UN TYPE ABSENT** : il attribue à un Père une remarque de son traducteur du XIXe siècle. Le doute laisse la note sans type, et se signale.

⚠️ **Le type se pose sur le BLOC ; la note ne l’ANNONCE que si tous ses blocs s’accordent** (§ 13.11.1). Une note mixte — le commentaire de l’édition, puis le renvoi que nous ajoutons — n’annonce rien, et vaut mieux ainsi.

⚠️ **« Note de l’édition », et non « note de l’éditeur »** : le libellé nomme une RESPONSABILITÉ, et « éditeur » se dispute en français entre la maison qui publie et le savant qui établit.

### 13.12.2 L’ITALIQUE du latin enchâssé

⛔ **Le latin cité DANS une note française se compose en italique.** Décision de l’auteur du 5 septembre 2026 : « Il faut simplement le mettre en italique. GPT s’en chargera. » Le § 13.8 réglait le bloc entièrement latin ; celui-ci règle le cas le plus fréquent, et le plus coûteux.

- ⛔ **Il s’écrit par MARQUEUR, dans le texte** (\`*…*\`), jamais par un offset ni par une devinette au rendu. Aucune donnée ne dit où le latin commence : le deviner italiserait du français, et la charte a déjà écarté cette voie (§ 13.11.1).
- ⛔ **C’est une LECTURE, non une passe mécanique.** On ne reconnaît pas une langue à un dictionnaire de mots courts, et une phrase française porte assez de mots d’origine latine pour qu’un automate s’y trompe à chaque page.
- ⚠️ **Une abréviation de renvoi n’est pas du latin CITÉ** : « ibid. », « id. », « op. cit. », « cf. », « passim » sont des conventions bibliographiques et ne s’italisent pas. Ce qui s’italise est ce que l’auteur ou l’éditeur CITE en latin.
- ⛔ **Ne pas cumuler avec l’italique de la langue.** Un bloc entièrement latin est italisé au RENDU, sur \`language = 'la'\`, et son texte ne porte aucun marqueur : l’écrire des deux façons ne se verrait pas à l’écran et laisserait deux vérités.
- ⚠️ **Le grec ne suit pas** : son alphabet le distingue déjà, et l’italique y déforme la lettre au lieu de changer la graisse (§ 13.8).
- ⚠️ **Sur les cinq textes enrichis, l’imprimeur a déjà fait le travail** : la règle 1 rend l’italique de Faivre, dont une part est du latin — 2 341 empans dans le seul \`A0044O0003TFR-V11\`. Ailleurs, il faut lire.

### 13.12.3 Ce qui reste OUVERT

⚠️ **LA FENTE DU BLOC À TROIS TÊTES ATTEND UNE SÉANCE À PART.** 396 blocs de Faivre agglomèrent dans un seul paragraphe une coordonnée imprimée, un lemme et un commentaire : « (V) pag. 178. — Avec les démons les plus féroces. On peut consulter… ». La passe 3 les fend en trois blocs, et la question est de savoir SUR QUOI. Fendre sur la PONCTUATION est une supposition : on parie que la première phrase après le tiret est le lemme. Fendre sur l’ITALIQUE est un fait relevé : Faivre imprime son lemme en italique, et l’OCR en a gardé les bornes. Mesuré : **une italique ouvre juste après le tiret dans 378 blocs sur 396 (95,5 %)** ; et une fois rejoints les empans que l’OCR coupe en fin de LIGNE IMPRIMÉE (24 blocs sont dans ce cas), **345 sur 378 (91,3 %) se ferment sur une ponctuation forte, celle-ci comprise DANS l’italique**, comme l’imprimeur l’a composée. ⛔ Rien ne s’écrit tant que l’auteur n’a pas tranché : « C’est un cas particulier. On va en discuter spécialement ensemble. »

⚠️ **« DÉPUBLIER » N’EXISTE PAS ENCORE POUR UNE NOTE**, et la décision 8 le demande. \`texte_note_blocs\` porte \`needs_review\`, que la charte tient pour un signal de prudence et qui ne masque rien par lui-même ; aucune colonne, aucune métadonnée lue par le site ne retire un bloc de la lecture. ⛔ Le mécanisme se pose AVANT la passe, non pendant, et il vaudra pour tout bloc qu’on voudra retenir — non pour les seuls treize « ibid. » orphelins.

⚠️ **Le RENVOI INTERNE reste un texte, non un lien.** La nature \`internal_cross_reference\` existe (§ 13.10) et sépare déjà ce qui pointe au dedans de ce qui pointe au dehors ; mais rien ne DÉSIGNE encore le segment ou la note visés. La décision 4 le prépare — on lit, on juge, on range — et la cible se posera quand le modèle saura la porter.`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_13_12'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
