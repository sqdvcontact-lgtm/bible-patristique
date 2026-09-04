/**
 * §§ 3.2, 38, 38.1 et 38.2 : la mention d'édition en toutes lettres, la fiche
 * « À propos de cette traduction » sans gravures ni repères, ses deux rubriques
 * bibliographiques et ses conditions d'usage, l'adresse de l'édition dans la carte
 * du volet, et le volet de gauche — recherche effacée, livre grisé qui s'explique.
 *
 * Demandes de l'auteur du 4 septembre 2026, sur la page « Bible classique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-fiche-traduction-volet-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**La mention d’édition s’écrit en TOUTES LETTRES**'

// ── Ancres, recopiées de `parametres.charte_ia` ──────────────────────────────
const A_NOMBRES = '**Nombres, dates, siècles et unités.** Dans le texte d’une édition source, la graphie des nombres est conservée, sauf règle explicite de normalisation. Dans les textes éditoriaux composés par Corpus Scriptura, une quantité ordinaire intégrée à la phrase s’écrit en lettres : `trois jours`, non `3 jours`. Les références, dates, mesures, pourcentages, tableaux et données techniques conservent naturellement leur notation chiffrée lorsqu’elle est requise.'

const A_PORTRAIT = '**Elle s’ouvre sur un PORTRAIT.** C’est l’encart, l’image debout de la section 37, et jamais le bandeau : une image couchée serrée dans un cadre debout ne montre pas ce qu’un portrait montre, et le cadre est celui de la fiche d’auteur, au trait près. Les repères de la traduction, la langue, la confession et la première publication, s’écrivent sous le nom en capitales espacées, comme les dates, la langue et les traditions d’un auteur. ⛔ Ils vivaient jusqu’ici dans la section repliable : on ne range pas derrière un dépli ce qui identifie l’objet qu’on lit. Une notice sans portrait ouvre sur son seul nom, sans cadre vide.'

const A_GRAVURES = '**Les GRAVURES d’une édition paraissent dans sa fiche.** Une édition illustrée ne se dit pas seulement en prose, et le lecteur qui demande à en savoir plus a le droit de voir de quoi elle est faite. La colonne de droite en porte six, sous la chronologie quand il y a les deux. ⛔ Elles appartiennent à la FAMILLE éditoriale et non à la traduction : une édition bilingue les publie une fois pour ses deux textes, et les rattacher au français les retirerait au latin. ⛔ Six prises en échantillon RÉGULIER, jamais les six premières : les gravures suivent l’ordre du livre, et les six premières d’une bible entière ne montreraient que la Genèse. Le compte total est dit sous la mosaïque, et la fiche renvoie au texte pour les autres : une planche qu’on montre en partie se dit telle. Chaque gravure paraît ENTIÈRE dans son passe-partout, jamais recadrée, leurs formats allant du carré au double folio ; un clic l’ouvre en grand, dans un cadre clair et non sur le calque sombre, pour que sa légende garde l’encre du site.'

const A_TITRE_38_1 = '### 38.1 La carte du volet de lecture — trois repères, jamais une bibliographie'

const A_CARTE = 'La carte qui coiffe le volet de gauche de la Bible dit CE QU’EST la bible qu’on lit, et rien de plus : son nom, qui ouvre la fiche, le traducteur avec ses dates, puis les trois mêmes repères que la fiche — la langue, la confession, l’année. ⛔ Elle ne porte pas la référence de l’édition utilisée. Celle de Fillion dénombrait huit volumes et six millésimes ; dans un volet de deux cent cinquante pixels, elle faisait un pavé au bas duquel la liste des livres commençait. Verdict de l’auteur, 3 septembre 2026 : « je veux seulement des informations sur la bible ; généralistes ». Le relevé des tomes reste dans la fiche « En savoir plus », où l’on va le chercher quand on le cherche.'

const A_REPERE_MESURE = '⚠️ Un repère se mesure : il tient en un mot ou deux. Les champs de la base y mêlent parfois la précision d’un érudit — une révision annoncée après un point-virgule, une composition datée en une phrase. La carte garde la tête de la valeur et ne la retient que si elle tient dans trente-deux signes ; sinon elle se tait, et aucune bible n’impose sa longueur aux autres.'

const A_FORME_VOLET = '⚠️ La forme se prend au volet des pages patristiques, qui est le modèle : le nom en vert qui ouvre la fiche, puis ce qu’on lit, puis les repères, à une seule interligne (1,35). Deux volets de lecture ne se composent pas chacun à sa façon.'

// ── Remplacements ────────────────────────────────────────────────────────────
const R_NOMBRES = `${A_NOMBRES}

⚠️ ${MARQUE} (décision de l’auteur, 4 septembre 2026) : \`deuxième édition\`, jamais \`2e édition\` — et l’abréviation s’ouvre avec l’ordinal, \`2e éd.\` et \`2e édit.\` étant proscrits au même titre. La règle vaut pour tout ce que Corpus Scriptura compose : notices publiques, libellés d’administration, couches de LECTURE d’un apparat. ⛔ Elle ne vaut pas pour la couche SOURCE, où la graphie du témoin est conservée : « p. 510 de la 2e édit. » reste tel quel dans le texte transcrit, et ne se corrige que dans la lecture qui le double. ⚠️ Corriger un ordinal dans une couche de lecture ALLONGE la chaîne : les empans d’italique qui l’indexent (\`inline_spans\`) se recalculent DANS LA MÊME ÉCRITURE, depuis les intitulés eux-mêmes et non par un décalage arithmétique, puis se vérifient en relisant chaque empan. La table des ordinaux vit dans \`app/lib/mentionEdition.ts\`, avec ses tests ; au-delà du vingtième rang elle écrit \`édition n° 24\`, ⛔ jamais \`24e\`.`

const R_PORTRAIT = `**Elle s’ouvre sur un PORTRAIT.** C’est l’encart, l’image debout de la section 37, et jamais le bandeau : une image couchée serrée dans un cadre debout ne montre pas ce qu’un portrait montre, et le cadre est celui de la fiche d’auteur, au trait près. Une notice sans portrait ouvre sur son seul nom, sans cadre vide.

⛔ **IL N’Y A PLUS DE REPÈRES SOUS LE NOM** — « Français · Catholique · 1888 - 1904 » (décision de l’auteur, 4 septembre 2026 : « ne pas afficher »). Ils avaient été montés là le 28 août depuis la section repliable, au motif qu’on ne range pas derrière un dépli ce qui identifie l’objet qu’on lit ; c’était vrai de la langue et de la confession, moins de la date, qui était la date RÉDIGÉE de la base, avec ses points-virgules et ses annonces. Ils disaient en télégramme ce que la notice dit en prose deux centimètres plus bas, et langue comme confession se lisent entières dans le dépli.

⚠️ **LE CADRE DU PORTRAIT EST UN FLEX, et la zone d’image s’y étire.** Le bord bas du cadre se pose sur la dernière ligne qui l’habille, et la mesure lui écrit une HAUTEUR ; la zone d’image, qui tenait la sienne de son seul rapport 2/3, ne suivait pas, et la rallonge se voyait en passe-partout sous l’image — un bandeau blanc en bas là où les trois autres côtés portent cinq pixels (l’auteur, 4 septembre 2026 : « comme si elle n’entrait pas dans le bloc »). ⛔ La leçon est générale : une boîte dont on écrit la hauteur DU DEHORS doit pouvoir la transmettre à ce qu’elle contient, sans quoi la mesure se voit au lieu de se lire.`

const R_GRAVURES = `⛔ **LA FICHE NE MONTRE PAS LES GRAVURES DE L’ÉDITION** (décision de l’auteur, 4 septembre 2026 : « ne pas afficher la famille “Gravures” »). Six planches prises en échantillon régulier y ouvraient, du 28 août au 4 septembre, une mosaïque que deux requêtes portaient et qu’un clic agrandissait par-dessus la fiche. Une gravure se regarde À SA PLACE, dans le texte, où l’édition l’a mise ; une vignette en tête de fiche apprend qu’il y en a, elle n’en montre aucune. Sont partis avec la rubrique l’échantillon régulier, le passe-partout des vignettes, la planche agrandie et les deux allers-retours qu’elles coûtaient à chaque ouverture.

**L’ÉDITION UTILISÉE A SA RUBRIQUE, et ce n’est pas une bibliographie sélective** (décision de l’auteur, 4 septembre 2026 : « ce n’est pas une bibliographie sélective, mais la référence bibliographique des volumes utilisés »). La fiche portait, dans le HTML de sa notice, une liste titrée « Bibliographie sélective » dont la première entrée redisait à la main l’édition d’où le texte est tiré. La référence se compose désormais CHAMP PAR CHAMP depuis \`editions_sources\` — titre, sous-titre, lieu, éditeur, millésimes, nombre de tomes —, aux normes de toutes les bibliographies du site (§ 35.6.1) et dans leur famille de styles. ⛔ Sans titre d’édition en base, la rubrique ne paraît pas. ⛔ Aucun AUTEUR en tête : la fiche le nomme deux lignes plus haut, et c’est la règle déjà écrite pour « Du même auteur » — une rubrique qui établit son auteur ne le répète pas sous elle. ⚠️ Le nombre de tomes est la seule donnée matérielle admise, parce que la rubrique répond des VOLUMES ; le format, la pagination, les planches et les dimensions en restent exclus. ⚠️ Les millésimes sont un TEXTE — « 1888-1904 », « vol. I : 1909 ; vol. II : 1907 » —, et c’est pourquoi la référence ne passe pas par \`ouvrages_bibliographiques\`, dont l’année est un entier : un catalogue d’œuvres ne sait pas dire une collection multivolume.

**LES OUVRAGES QUE L’ÉDITION CITE ont leur rubrique, et elle ne paraît pas si elle est vide** (même décision : « une nouvelle rubrique contenant, proprement, tous les ouvrages cités dans l’édition utilisée ; c’est surtout utile pour Fillion »). Elle lit \`v_bible_editorial_bibliography_entries\`, la source des bibliographies de l’apparat, et se compose par le même composant : une édition ne dit pas ses auteurs de deux façons. ⚠️ Toutes pièces confondues, dédoublonnées par \`ouvrage_id\`, rangées par auteur puis par titre — une bibliographie d’édition ne se range pas dans l’ordre d’apparition des volumes. ⛔ Aucun repli sur le texte des blocs matériels : ce qui n’est pas catalogué n’est pas affiché, et c’est ce silence-là qui appelle le catalogage (§ 35.6.4).

**LA LICENCE DIT AUSSI CE QU’ELLE NE DONNE PAS** (même décision : « ajouter les restrictions de licence ; expliquer que le travail éditorial est protégé »). La fiche affichait « Domaine public » en une rangée d’étiquette, ce dont un lecteur conclut que tout est libre ; ce qui l’est est le TEXTE. Une rubrique « Conditions d’usage » dit désormais les deux : la licence du texte servi, avec sa mention obligatoire s’il en porte une ; puis que la transcription, la structuration des données, la segmentation, les alignements et les liens établis entre versets et textes patristiques constituent un travail éditorial original, protégé par le droit d’auteur, dont la reproduction substantielle à des fins commerciales demande une autorisation préalable, et qu’une citation reprise publiquement garde la mention de sa source. ⛔ La formule ne s’invente pas dans la fiche : elle dit en trois phrases le § 6 des conditions d’utilisation, et renvoie à cette page, qui fait foi.`

const R_TITRE_38_1 = '### 38.1 La carte du volet de lecture — le nom, le traducteur, l’adresse de l’édition'

const R_CARTE = `La carte qui coiffe le volet de gauche de la Bible porte trois lignes, et trois seulement : le NOM de la bible, qui ouvre sa fiche ; le TRADUCTEUR, avec ses dates ; l’ADRESSE de l’édition servie. ⛔ Elle ne porte pas le relevé des tomes. Celui de Fillion dénombrait huit volumes et six millésimes ; dans un volet de deux cent cinquante pixels, il faisait un pavé au bas duquel la liste des livres commençait. Verdict de l’auteur, 3 septembre 2026 : « je veux seulement des informations sur la bible ; généralistes ». Le relevé reste dans la fiche « En savoir plus », où l’on va le chercher quand on le cherche.`

const R_ADRESSE = `**L’ADRESSE EST UNE PHRASE, et elle nomme le lieu, l’éditeur et les dates** : « D’après l’édition de Paris, Letouzey et Ané, 1888-1904 » (décision de l’auteur, 4 septembre 2026 : « doit mentionner l’éditeur, le lieu d’édition et les dates d’édition »). C’est la forme normative du libellé court d’édition, \`Ville, éditeur, année\` (§ 5), et l’interface y ajoute seule la formule « D’après l’édition de ». Le lieu et l’éditeur viennent d’\`editions_sources\` ; ⛔ ils ne se devinent jamais du nom de la bible, et un champ absent emporte son séparateur. ⚠️ C’est la DATE qui décide qu’il y a une édition à nommer : sans elle, rien ne paraît, quand bien même le lieu serait connu — la fiche d’édition du manuscrit Français 899 porte « Paris », qui est le lieu du MANUSCRIT, et la carte annoncerait sans cette garde « l’édition de Paris » là où il n’y a pas d’édition du tout.

⛔ IL N’Y A PLUS DE REPÈRES — la langue, la confession et l’année alignées derrière des points médians. Ils disaient en télégramme ce qu’EST la bible, et jamais d’où vient le texte qu’on a sous les yeux ; la phrase d’édition le dit, et se lit. Langue et confession se lisent entières dans la fiche.

⚠️ **UNE FLÈCHE COURTE SUIT LE NOM**, et c’est elle qui dit qu’il y a une fiche derrière (décision de l’auteur, 4 septembre 2026 : « ajouter un petit symbole à côté du titre pour suggérer l’existence de “À propos de cette traduction” ; une flèche propre, épurée, courte »). Rien ne l’annonçait : le nom se composait comme un titre vert, et le survol ne le soulignait qu’une fois la souris dessus. ⚠️ Elle vit dans \`NomVolet\`, donc aussi sous le nom d’AUTEUR des pages patristiques : c’est le même geste, et il ne s’annonce pas de deux façons. ⛔ Elle ne paraît pas quand le bouton est inactif — une œuvre sans auteur identifié n’ouvre aucune fiche, et la flèche promettrait une page qui n’existe pas. ⚠️ Elle reste HORS de l’écrêtage du nom : c’est le nom qui se coupe par la fin, jamais la flèche, sans quoi l’annonce disparaîtrait sur les noms longs — les seuls où l’on hésite. ⚠️ Le soulignement de survol se pose sur le NOM et non sur le bouton : porté par le bouton, il courait sous la flèche et la barrait par le milieu.`

const R_FORME_VOLET = `⚠️ La forme se prend au volet des pages patristiques, qui est le modèle : le nom en vert qui ouvre la fiche, puis ce qu’on lit, puis l’adresse de l’édition, à une seule interligne (1,35). Deux volets de lecture ne se composent pas chacun à sa façon.

### 38.2 Le volet de gauche — la recherche s’efface, le livre grisé s’explique

**LA RECHERCHE D’UN LIVRE N’EST PAS UNE BOÎTE : elle EST son bloc** (décision de l’auteur, 4 septembre 2026 : « la barre de recherche doit être plus claire, moins visible spontanément, et occuper l’ensemble du bloc où le bloc d’écriture existe actuellement »). Le champ portait un filet, un fond plus sombre que le volet et un rayon de quatre pixels, posés dans un bloc rembourré : quatre traits pour l’objet le moins employé du volet, et il se lisait avant la liste des livres qu’il commande. Le rembourrage du bloc est passé DANS le champ — même blanc, même gouttière —, si bien que rien n’a bougé de place ; ce sont le filet, le fond et le rayon qui sont partis. ⚠️ Il se donne à voir quand on s’en sert, et alors seulement : au foyer, un fond léger paraît sous lui. ⛔ Pas de filet au foyer non plus, qui redessinerait la boîte qu’on vient d’ôter. Le filet du BAS reste : c’est la séparation d’avec la liste, non l’encadrement du champ.

**UN LIVRE GRISÉ, CLIQUÉ, S’EXPLIQUE** (même décision). Le clic se perdait dans un \`return\` : la rangée était bien un bouton, elle répondait au survol, et son geste ne faisait rien du tout — le lecteur en concluait ce qu’il pouvait, que le site était cassé le plus souvent, puisqu’un gris n’explique rien. Une fenêtre dit maintenant que le livre ne figure pas dans la bible qu’on lit, et propose celles qui le portent ; le choix d’une autre bible mène au chapitre 1 du LIVRE DEMANDÉ, non au chapitre qu’on lisait ailleurs, qui n’a rien à voir avec lui. ⛔ Elle ne dit PAS pourquoi le livre manque : une édition partielle, un tome qui n’est pas encore importé et un livre qu’une confession ne reçoit pas se ressemblent de l’extérieur, et mieux vaut une phrase vraie qu’une raison inventée. ⚠️ Les bibles proposées se cherchent aux DEUX sources — \`livres_par_traduction\` pour celles qui se lisent au verset, la structure éditoriale pour les autres —, faute de quoi Fillion et la Bible 899 seraient tues. ⚠️ La fenêtre s’ouvre TOUT DE SUITE, avec ce qu’on sait déjà, et la liste arrive ensuite : un clic qui n’ouvre rien pendant une requête serait le défaut qu’on vient de corriger.

**L’EN-TÊTE DU VOLET DE DROITE NE REDIT PLUS LA RÉFÉRENCE** — « Genèse 13, 5 » (même décision : « supprimer cette indication redondante »). Le volet commente le verset qu’on vient de désigner d’un clic, à trois centimètres de là, dans une colonne qui porte déjà le nom du livre, le numéro du chapitre et le verset en surbrillance : la ligne ne disait rien que l’écran ne montrât. ⚠️ Une référence REÇUE se montre, elle : la page d’une péricope donne au volet une PLAGE canonique (« Gn 12, 1-9 ») que rien d’autre n’écrit à l’écran. Une référence qu’on DÉDUIT de ce qu’on affiche déjà ne se montre pas. ⚠️ L’en-tête vidé ne laissait qu’une bande de trente-huit pixels et son filet : il ne paraît plus que s’il a quelque chose à porter — une référence reçue, ou la flèche de repli.`

// ── Écriture ─────────────────────────────────────────────────────────────────
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

const remplacements = [
  ['nombres', A_NOMBRES, R_NOMBRES],
  ['portrait', A_PORTRAIT, R_PORTRAIT],
  ['gravures', A_GRAVURES, R_GRAVURES],
  ['titre 38.1', A_TITRE_38_1, R_TITRE_38_1],
  ['carte', A_CARTE, R_CARTE],
  ['repère mesuré', A_REPERE_MESURE, R_ADRESSE],
  ['forme du volet', A_FORME_VOLET, R_FORME_VOLET],
]
for (const [nom, ancre] of remplacements) {
  const n = avant.split(ancre).length - 1
  if (n !== 1) throw new Error(`ancre « ${nom} » : ${n} occurrence(s), 1 attendue.`)
}
const apres = remplacements.reduce((texte, [, ancre, neuf]) => texte.split(ancre).join(neuf), avant)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_fiche_traduction_volet'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (!relu.valeur.includes('### 38.2 Le volet de gauche')) throw new Error('relecture : le § 38.2 est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
