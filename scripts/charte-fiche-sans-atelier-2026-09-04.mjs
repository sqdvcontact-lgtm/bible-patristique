/**
 * § 38.15 : une fiche dit ce que le LECTEUR peut en faire, jamais ce que l'atelier
 * en sait.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-fiche-sans-atelier-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.15 Une FICHE dit ce que le LECTEUR peut en faire'

// Ancre : la dernière phrase du § 38.14, recopiée de `parametres.charte_ia`.
const ANCRE = "Elles ne tombent donc ni à la lecture ni à l'affichage."

const SECTION = `

${MARQUE}, jamais ce que l’ATELIER en sait

Quatre demandes de l’auteur du 2026-09-04, sur la fiche « En savoir plus sur cette traduction ». Elles disent toutes la même chose par quatre bouts : **une fiche publique n’est pas un carnet de travail**, et ce qu’un lecteur ne peut pas employer ne doit pas lui être montré.

⛔ **UN ÉTAT DE TRAVAIL N’EST PAS UN RENSEIGNEMENT** (« VérificationContrôle en cours // ne pas afficher »). La rangée disait « Contrôle en cours » sur **six bibles sur neuf**, et il fallait cliquer un mot souligné de pointillés pour apprendre ce qu’elle recouvrait : « Corpus intégralement aligné ; collation imprimée à poursuivre ». C’est l’état de NOTRE travail, pas une propriété du texte qu’on lit. ⚠️ Conséquence assumée : \`statut_corpus_public\` et \`lacunes_publiques\` ne paraissent désormais NULLE PART sur le site. Le seul de leurs contenus qui soit un fait de lecteur — l’Ecclésiaste absent de la Septante — a été porté dans la notice de l’édition, où il ouvre le propos.

⛔ **UN RENVOI À UN ARTICLE NUMÉROTÉ N’EST PAS UNE EXPLICATION** (« Conditions d’utilisation, § 6 // supprimer »). Il envoyait chercher ailleurs ce que les deux paragraphes venaient de dire en clair, et il le disait dans la langue d’un acte. La page des conditions reste au pied du site, où on la cherche quand on la cherche.

⛔ **UNE ADRESSE, UN OBJET** (« Source numériqueeBible.org / BibleNLP corpus (fra-fraLSG) · Voir la source // remettre en forme pour faire au plus clair »). La rangée en alignait trois pour une seule adresse : le nom, un point médian, et un lien dont le libellé — « Voir la source » — redisait l’étiquette de sa propre rangée. On hésitait donc sur ce qu’on cliquait. **Le nom EST la source : il mène à elle**, et rien ne l’accompagne. ⚠️ Le nom se rend toujours, lien ou pas : un composant qui ne rend rien sur une adresse malformée emporterait le nom avec elle.

⛔ **UNE NOTICE NE NOMME AUCUN OBJET DE LA BASE.** Celle de la Segond disait : « Numérotation hébraïque/protestante (alignée sur versets_canon via ch_heb/v_heb) […] Texte aligné verset par verset sur le vref eBible. » Trois noms d’objets internes en deux phrases, dans une fiche que le lecteur ouvre pour savoir quelle Bible il lit. Partent avec eux : la balise \`<i>\` de la Sacy, et les « 75 codes techniques dans la base » de la Crampon.

⛔ **ET ELLE NE PORTE PAS DE JOURNAL DE TRAVAIL.** La Vulgate publiait ses comptes d’alignement — « 36 004 lignes ; 35 721 rattachées à l’ossature ; […] 36 004 alignements vérifiés » —, la Septante une décision datée avec son motif juridique et son renvoi à la charte, plus deux voies de rattrapage. Ce sont des pièces d’atelier ; elles se tiennent à l’atelier.

⚠️ **HIÉRARCHISER, C’EST METTRE EN TÊTE CE QUI SERT LE LECTEUR.** La notice de la Septante ouvrait sur son format d’import — « un mot par ligne dans la source, réassemblé au verset » — et gardait pour la fin, après un tiret cadratin, la seule chose qui change sa lecture : **l’Ecclésiaste manque**. Elle ouvre maintenant dessus. L’ordre d’une notice suit l’importance, jamais l’ordre où l’import a rencontré les faits.

⛔ **CE QU’UNE RANGÉE DIT DÉJÀ NE SE REDIT PAS.** La Segond annonçait sa numérotation hébraïque dans sa notice, deux centimètres sous la rangée « Numérotation — Hébraïque ». Une notice ne porte que ce qui n’a pas de rangée à soi. C’est la règle du complément de titre (§ 3.8) transposée à une fiche.

⚠️ **RIEN DU FOND N’EST PERDU, et c’est la condition.** Chaque fait éditorial est conservé : les deux recensions de Daniel, Suzanne et Bel, la lacune de l’Ecclésiaste et son motif, les italiques de la Sacy relevées sur le fac-similé, les deux cent quatre-vingt-trois lignes de la Vulgate hors du découpage canonique, les suscriptions de la Crampon comptées comme premier verset. On a réécrit la formulation, jamais le fond. Mesuré : la Septante passe de 897 à 519 signes, la Segond de 198 à 159, la Vulgate de 399 à 379 ; la Sacy MONTE de 208 à 320, parce qu’expliquer une italique coûte plus de mots que de nommer une balise.

⚠️ **UNE PROSE NE SE COMPOSE PAS COMME UNE ÉTIQUETTE.** « Particularités » porte quatre phrases dans une rangée dessinée pour un mot : la valeur y prend l’interligne et la césure d’un paragraphe, non celui d’une étiquette de 0,5 rem. ⛔ Sans justification : la colonne fait environ 314 px, soit quarante-cinq signes par ligne, et le justifié y creuse les blancs que le § 38.9 apprend à fermer.

⚠️ **ET LA NORME FRANÇAISE SE POSE AU RENDU, ici comme partout** (§ 3.2). Mesuré le même jour : les cinq notices bibliques ne portaient QUE des espaces ordinaires (U+0020), guillemets et deux-points compris — la fiche les servait telles quelles, faute de passer par la normalisation. Les champs de prose y passent désormais. ⛔ On n’écrit donc pas de fine dans la donnée : elle resterait la seule table du site à en porter.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_fiche_sans_atelier'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
