/**
 * § 35.6.5 : UN moteur de rendu bibliographique, et la base est la source.
 *
 * Mission de l'auteur du 5 septembre 2026 (« moteur centralisé de rendu bibliographique
 * automatique ») : la référence se compose depuis la base, jamais depuis un texte
 * précomposé ; un seul moteur pour toutes les surfaces ; données, rôles et présentation
 * séparés ; typographie générée ; formes de notice ; rien d'inventé ; le rendu précomposé
 * en base n'est au mieux qu'un cache. Le paragraphe s'insère AVANT le § 35.7, en fin de
 * la famille 35.6.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-moteur-bibliographique-2026-09-05.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'

const essaiSeul = process.argv.includes('--dry')
const LF = String.fromCharCode(10)

const MARQUE = '### 35.6.5. UN moteur de rendu bibliographique, et la base est la source'
const ANCRE = '### 35.7. Les guillemets d’une citation en langue étrangère restent en romain'

const NOUVEAU = [
  MARQUE,
  '',
  '**Décision de l’auteur du 5 septembre 2026** (mission « moteur centralisé de rendu bibliographique automatique »). Une référence bibliographique se COMPOSE depuis la base, jamais depuis un texte précomposé. Dès qu’une notice est liée à un `ouvrage_id`, le `segment_texte` qui la portait cesse d’être la source du rendu : il reste la projection de secours, la matière de la recherche et de l’export, et l’on n’y écrit rien pour l’affichage.',
  '',
  '⛔ **Un seul moteur pour toutes les surfaces** : la liste « Du même auteur » et les bibliographies de Fillion, l’apparat d’une œuvre (la bibliographie de Mirandol chez Boèce), la bibliographie d’une péricope, la fiche d’un ouvrage dans l’administration, les introductions bibliques. Six écritures coexistaient et divergeaient ; il n’en reste qu’une, et une règle qui change là change partout. ⛔ Ne pas créer un système de plus à côté. ⛔ Ne pas recopier une référence composée dans un segment. ⛔ Ne pas enregistrer de HTML ni d’astérisques d’italique dans `ouvrages_bibliographiques`.',
  '',
  '**Trois plans séparés.** La DONNÉE : les champs de la notice, ses contributeurs et ses éditeurs résolus sur leurs autorités, servis par la vue `v_references_bibliographiques`, que tout lecteur peut lire avec les autorités jointes. Les RÔLES : chaque fragment dit ce qu’il EST (prénom, nom de famille, titre, sous-titre, titre hôte, tomaison, pages, éditeur scientifique, traducteur, directeur, collection, lieu, éditeur, date), et la ponctuation, les liants et les guillemets n’ont pas de rôle : ils appartiennent à la séquence où ils tombent. La PRÉSENTATION : la feuille compose chaque rôle, et ses règles se pendent à l’enveloppe de la référence (`.cs-reference-bibliographique`), quelle que soit la surface qui la porte.',
  '',
  '**La FORME d’une notice** (monographie, article de périodique, contribution à un collectif, entrée de dictionnaire) décide de sa composition, non de sa valeur scientifique. Cinq champs la portent : `forme_notice`, `titre_hote`, `tomaison`, `pages`, `date_affichee`. Une forme absente se déduit : un titre hôte fait un article ; sans hôte, une monographie. ⛔ Jamais de ville, de date ni d’éditeur inventés pour obtenir une notice « complète » : un champ absent emporte son séparateur, et la notice dit ce que la base sait.',
  '',
  '**Typographie générée, jamais tapée.** Auteur moderne : prénom en romain, NOM DE FAMILLE en petites capitales, tiré de `auteurs_valeur.prenom` et `nom_famille` ; ⛔ jamais par découpe de la chaîne affichée, et une autorité sans rubriques, un auteur ancien, se compose ENTIER en petites capitales. Un nom en texte libre reste en romain. Titre de monographie en italique ; titre d’article ou de contribution en romain entre guillemets français à fines, puis l’hôte en italique, « dans » devant un collectif ou un dictionnaire, jamais devant un périodique. « éd. Nom », « trad. Nom », « dir. Nom ». Coéditeurs joints par la barre à fines du § 35.6.4. « p. » suivi d’une insécable, tiret demi-cadratin entre deux pages. Insécables et fines devant la haute ponctuation, apostrophe courbe, un seul point final, jamais deux espaces. Les petites capitales s’écrivent `font-variant-caps: small-caps`, ⛔ jamais par `text-transform`.',
  '',
  '⚠️ **La police servie ne dessine pas les petites capitales.** Source Serif 4, telle que Google Fonts la livre au site (version 4.004), n’a ni `smcp` ni `c2sc` : le navigateur les synthétise en capitales réduites. L’amont Adobe (4.005) les dessine, en romain seulement ; les avoir vraies demande d’auto-héberger la police. Décision d’auteur en attente.',
  '',
  '⚠️ **Un rendu précomposé en base est au mieux un cache, jamais une source.** `segment_metadata.bibliography_render`, que 136 segments de Boèce portent, n’est plus lu par rien : il ne peut plus contredire la base. La projection SQL qui écrit une bibliographie en texte dans les couches de lecture sert la recherche et l’export, non le rendu.',
  '',
  '**Écriture.** Le moteur ne modifie aucun texte source. Quand la donnée se corrige, on ne touche qu’aux colonnes qui changent, en transaction, avec sauvegarde et retour en arrière ; `texte_norm` est généré depuis `segment_texte` et ne s’écrit jamais.',
  '',
].join(LF)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) throw new Error('Lancer avec node --env-file=.env.local : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent.')
const db = createClient(url, cle, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre 35.7 : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(NOUVEAU + LF + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_moteur_bibliographique'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
