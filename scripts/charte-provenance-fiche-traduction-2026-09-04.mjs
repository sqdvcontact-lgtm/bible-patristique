/**
 * § 38.4 : la PROVENANCE d'un texte biblique — la phrase de la carte, la fiche
 * sans dépli, la chronologie, et la fenêtre du livre absent.
 *
 * Six demandes de l'auteur du 4 septembre 2026, en seconde passe sur la page
 * « Bible classique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-provenance-fiche-traduction-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.4 La PROVENANCE d’un texte biblique'

// Ancre : la dernière phrase du § 38.3, recopiée de `parametres.charte_ia`.
const ANCRE = 'Avant de retirer un état visible, mesurer celui qui est censé le remplacer.'

const SECTION = `

${MARQUE} — la carte, la fiche, la chronologie

Six demandes de l’auteur du 4 septembre 2026, en seconde passe sur la page « Bible classique ».

⛔ **DANS UNE PHRASE, TOUT SE SÉPARE PAR DES VIRGULES, ET RIEN D’AUTRE** (« il faut utiliser la version normalisée ; on doit avoir “Jean Desessartz et Guillaume Desprez” ; tout séparé par des virgules »). La carte du volet rendait la co-édition telle que la base l’écrit — « Paris, Jean Desessartz ; Guillaume Desprez, 1667-1696 » —, et le point-virgule y ouvrait au milieu de la phrase un second niveau de ponctuation où l’on ne voyait plus où l’éditeur commence. Chaque maison se résout POUR SON PROPRE COMPTE dans la table de référence, et « et » les joint ; trois maisons font une énumération française. ⛔ Le point-virgule reste le séparateur normatif dans une COLONNE et dans une notice de catalogue (§ 5) : la règle ne le remplace pas partout, elle compose une énumération là où l’on écrit une phrase. ⚠️ La résolution se fait CÔTÉ SERVEUR : l’index des éditeurs n’a pas à voyager jusqu’au navigateur pour composer deux mots.

⚠️ **LA DATE D’UNE ADRESSE EST CELLE DE LA FICHE D’ÉDITION, non de la première parution.** Le lieu et l’éditeur viennent de la fiche d’édition : y prendre aussi la date est la seule façon que les trois mentions parlent du même livre. La carte de Sacy datait de 1667-1696 l’adresse de l’édition de 1730, si bien que deux maisons qui ne se sont associées qu’au siècle suivant s’y trouvaient nommées ensemble soixante ans trop tôt. ⚠️ Le champ est un TEXTE et porte parfois le détail des volumes — « vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912 » : une phrase de carte en retient les deux bornes, l’énumération n’apprenant rien à qui veut savoir de quand date ce qu’il lit.

⛔ **UN TÉMOIN MANUSCRIT N’A PAS D’ÉDITION : il a un dépôt et une cote** (« aucun texte pour la bible du XIIIe siècle ; à corriger, d’après le manuscrit machin machin »). La carte se taisait pour lui, une garde de la veille refusant de nommer une « édition » là où la fiche ne porte qu’un lieu de copie. La garde était juste et la conclusion trop courte : ce n’est pas la phrase qu’il fallait taire, c’est l’autre phrase qu’il fallait écrire — « D’après le manuscrit Paris, Bibliothèque nationale de France, Français 899, vers 1260 », qui est la forme savante d’une cote. ⛔ Elle ne se DÉDUIT PAS de la prose : l’intitulé de l’édition et le nom de la source numérique portent bien la cote, mais l’en tirer par découpe serait lire une donnée dans un titre. Deux champs de plus, et c’est la COTE qui décide — pas un type à interpréter, pas une mention à reconnaître. ⚠️ Un manuscrit se nomme même sans date : sa cote l’identifie à elle seule, quand une édition sans année n’a rien à annoncer.

⛔ **UNE FICHE NE REPLIE PAS CE QU’ON VIENT Y LIRE** (« “Édition et état du texte” doit être visible sans être développé ; revoir l’ensemble avec cette nouvelle donne »). C’était la seule section repliée de la fiche « À propos de cette traduction », et le dépli cachait une REDONDANCE autant qu’un contenu : le titre, l’année, le lieu et l’éditeur y reparaissaient en rangées un cran sous une référence qui venait de les composer, et la notice rédigée de la base les disait une troisième fois. La référence devient la TÊTE de la rubrique — ce que l’édition EST —, et les rangées ne portent plus que ce qu’elle ne dit pas : ce qui a établi le texte, d’où vient sa copie numérique, sa graphie, ses particularités, son état de vérification. ⛔ La notice rédigée ne paraît plus : elle était la seconde vérité, celle qu’on avait cessé de composer. ⚠️ Trois rubriques ferment la fiche, dans cet ordre : l’édition, les ouvrages qu’elle cite, les conditions d’usage. On va de ce que l’édition EST à ce qu’on peut en faire.

⚠️ **UNE MENTION D’ÉDITION NE SE COMPOSE QUE SI ELLE APPREND QUELQUE CHOSE.** « Édition révisée » est une vraie mention de page de titre et prend sa place après l’intitulé. Deux cas la font taire, et tous deux sont dans la donnée réelle : un TÉMOIN MANUSCRIT n’en a pas — « Témoin manuscrit » est une classification, et la cote suit deux mots plus loin —, et une mention que le TITRE contient déjà ne se répète pas (« La Bible : traduction officielle liturgique »). C’est la règle du complément qui redit son titre, appliquée à l’adresse d’une édition.

⚠️ **UNE BIBLIOGRAPHIE PREND LE RETRAIT SUSPENDU, où qu’elle paraisse** (« pour la bibliographie, il faut un retrait négatif pour les secondes lignes d’un paragraphe »). Les listes que portent les notices éditoriales sont des bibliographies — « Études sur cette traduction », cinq références chez la Bible du XIIIe siècle —, et une référence de deux lignes ne se lit que si la seconde rentre : c’est ce qui sépare deux notices à l’œil. Même mesure que toutes les bibliographies du site (§ 35.6.2), et la puce part avec le retrait : une liste à puces et une bibliographie ne sont pas la même chose.

**LA CHRONOLOGIE D’UNE BIBLE SE COMPOSE COMME CELLE D’UN AUTEUR** (« ajouter une chronologie assez petite inspirée du modèle de la page auteur ; composer pour l’occasion des liens chronologiques »). ⛔ Composer une chronologie, ce n’est PAS inventer des faits datés : c’est CHOISIR et ORDONNER ce que le corpus sait déjà. On ne rattache que des événements existants, datés, sourcés et validés, et le lien porte « à contrôler » — l’interface choisit, l’auteur valide. Inventer un événement pour garnir une frise serait une décision philologique prise par une décision d’interface. ⚠️ Trois brins pour une bible : ce qui l’a FORMÉE, l’ÉDITION servie, sa RÉCEPTION, plus le CONTEXTE qui l’explique ; cinq entrées suffisent, et l’ordre est chronologique.

⛔ **DEUX VUES QUI NOMMENT LA MÊME CHOSE DOIVENT SE RÉPONDRE.** La chronologie des auteurs écrit ses types d’affichage sans accents, celle des traductions écrit « édition » et « réception » avec les leurs : DEUX brins sur trois ne trouvaient donc ni couleur ni libellé, et leurs puces tombaient sur le gris de repli. La frise ne distinguait plus ce qu’elle range, et c’est pour cela que sa légende avait été éteinte sur les traductions. ⚠️ On replie la CLÉ, on ne renomme pas la donnée : la vue dit ce qu’elle dit, et le rendu s’y accorde. La légende revient avec les couleurs — trois brins ne se devinent pas plus pour une bible que pour un Père.

⛔ **NI DÉGRADÉ, NI EMBLÈME, NI BOUTONS dans une petite fenêtre d’explication** (« je n’aime guère la mise en forme, surtout le dégradé ; le site n’a aucun dégradé ; fais simple, élégant, propre, proportionné »). La fenêtre du livre absent avait pris le cadre de la fenêtre « compte requis » : un bandeau teinté qui s’éteignait vers le bas, un livre fermé dessiné dans son anneau, et autant de cartouches bordés que de bibles proposées — trois ornements pour dire une phrase et nommer deux titres. Reste la composition que la fiche emploie déjà : une rubrique en capitales espacées, le nom en sérif, un filet, la phrase, puis une LISTE où chaque rangée n’est qu’un nom et sa flèche. ⚠️ Une fenêtre de la page Bible ne s’invente pas un dessin : elle prend celui de la page.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_provenance'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
