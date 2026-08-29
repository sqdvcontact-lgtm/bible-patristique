/**
 * RÉPARATION du § 35.14 — le reste de l'écrasement du 28 août.
 *
 * La première passe (`charte-reparer-2026-08-29.mjs`) a rendu les sauts de ligne et
 * restitué la queue perdue — § 36 à 38 et leurs voisines. La comparaison paragraphe
 * par paragraphe avec l'état d'avant l'écrasement en montre deux autres :
 *
 * 1. SIX PARAGRAPHES DU SOMMAIRE DE L'ÉDITION, perdus eux aussi : l'onglet
 *    « Sommaire », ce qui y entre, le groupement des blocs en pièces, le nom écrit
 *    une seule fois, le chargement dans la même vague que les versets, et la
 *    composition au modèle du sommaire d'une œuvre. Ils vivaient en queue du
 *    § 35.14.5 et sont tombés avec sa réécriture.
 *
 * 2. LE § 35.14.5 EST ÉCRIT SANS ACCENTS. « Une liste d’abreviations est une table
 *    de correspondance… » — dans une charte qui prescrit la typographie française.
 *    ⚠️ On rend les accents, et RIEN D'AUTRE : la doctrine de la réécriture est
 *    conservée telle quelle, y compris l'exclusion de la description matérielle,
 *    qui contredit la version d'avant. Réparer une graphie n'est pas arbitrer une
 *    règle.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia`, après sauvegarde sous clé propre.
 * Usage : node scripts/charte-reparer-35-14-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')
const CLE_SAUVEGARDE = 'charte_ia_sauvegarde_20260829_avant_reparation_35_14'

const ANCRE = '### 35.14.6.'

const SOMMAIRE_PERDU = `Elles se lisent désormais par un onglet « Sommaire », dans le volet de gauche, à côté des livres. ⛔ Il ne paraît que pour une édition qui porte un apparat général : une bible ordinaire n’a rien à y mettre, et l’on ne montre pas un onglet qui ouvrirait sur du blanc. Ouvrir une pièce la met À LA PLACE du texte biblique — on ouvre un volume à sa page de garde, on ne lit pas les deux à la fois — avec son nom en titre, la portée qu’elle coiffe en rubrique au-dessus, et le retour au chapitre en pied.

⛔ Ce qui entre au sommaire se reconnaît à la PORTÉE du bloc, Bible, Testament ou groupe de livres, jamais à une liste d’intitulés tenue à la main. L’introduction d’un LIVRE n’en est pas : elle ouvre son livre, et c’est là qu’on la lit.

⚠️ Les blocs se groupent en PIÈCES, sans quoi le sommaire compterait soixante-deux lignes, dont quinze pour la seule bibliographie de l’auteur. Deux blocs consécutifs font une pièce quand ils partagent leur portée et leur NOM — ce qui précède le tiret, la queue ne disant que la pagination de l’imprimé — ou quand le second est un apparat de bas de page portant la MÊME PAGE IMPRIMÉE que le premier. C’est ainsi que trente-trois « Apparat de la page N » rejoignent les dix pages d’introduction générale qu’ils annotent. Douze entrées pour soixante-deux blocs. ⚠️ La consécution compte : deux pièces homonymes séparées par d’autres matières restent distinctes.

Le nom de la pièce s’écrit UNE fois, en tête. Les blocs qui le redisent perdent leur intitulé ; ceux dont la queue titre vraiment, « Introduction générale — § I. Ce qu’est la Bible », gardent le leur.

⚠️ Le sommaire part dans la MÊME vague que les versets : il ne coûte pas un aller-retour de plus, et le texte d’une pièce ne se charge qu’à son ouverture.

`

const SANS_ACCENTS = `### 35.14.5. Listes d’abreviations — references bibliographiques normalisees

Une liste d’abreviations est une table de correspondance dont chaque ligne se termine par un point. Lorsqu’un sigle renvoie a un ouvrage, l’expansion est traitee par le normalisateur bibliographique commun : auteurs sous leurs formes d’autorite, titre et sous-titre selon la norme bibliographique active, lieu, editeur, mention d’edition lorsqu’elle est necessaire pour identifier l’edition citee, puis date. Le rendu s’arrete a la date ; si aucune date fiable n’est etablie, il s’arrete au dernier champ bibliographique verifie.

⛔ Les donnees de description materielle ne paraissent pas dans cette liste : nombre de volumes, format (\`in-4°\`, \`in-12\`, etc.), pagination, planches, figures, cartes, dimensions, mention de texte explicatif ou toute autre description d’exemplaire restent conservees dans la source ou la notice bibliographique, mais sont exclues de l’affichage. La transcription source demeure inchangée.

Chaque entree reste une ligne autonome au fer a gauche, sous la forme \`sigle — reference.\` ; \`LXX\` n’est pas une reference bibliographique et se rend simplement \`LXX — Les Septante.\``

const AVEC_ACCENTS = `### 35.14.5. Listes d’abréviations — références bibliographiques normalisées

Une liste d’abréviations est une table de correspondance dont chaque ligne se termine par un point. Lorsqu’un sigle renvoie à un ouvrage, l’expansion est traitée par le normalisateur bibliographique commun : auteurs sous leurs formes d’autorité, titre et sous-titre selon la norme bibliographique active, lieu, éditeur, mention d’édition lorsqu’elle est nécessaire pour identifier l’édition citée, puis date. Le rendu s’arrête à la date ; si aucune date fiable n’est établie, il s’arrête au dernier champ bibliographique vérifié.

⛔ Les données de description matérielle ne paraissent pas dans cette liste : nombre de volumes, format (\`in-4°\`, \`in-12\`, etc.), pagination, planches, figures, cartes, dimensions, mention de texte explicatif ou toute autre description d’exemplaire restent conservées dans la source ou la notice bibliographique, mais sont exclues de l’affichage. La transcription source demeure inchangée.

Chaque entrée reste une ligne autonome au fer à gauche, sous la forme \`sigle — référence.\` ; \`LXX\` n’est pas une référence bibliographique et se rend simplement \`LXX — Les Septante.\``

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
let texte = avant
const journal = []

// ── 1. Les six paragraphes du Sommaire ───────────────────────────────────────
if (!texte.includes('Elles se lisent désormais par un onglet')) {
  const n = texte.split(ANCRE).length - 1
  if (n !== 1) throw new Error(`ancre du § 35.14.6 : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(ANCRE).join(SOMMAIRE_PERDU + ANCRE)
  journal.push('six paragraphes du Sommaire de l’édition restitués au § 35.14')
}

// ── 2. Les accents du § 35.14.5 ──────────────────────────────────────────────
if (texte.includes(SANS_ACCENTS)) {
  texte = texte.split(SANS_ACCENTS).join(AVEC_ACCENTS)
  journal.push('§ 35.14.5 réaccentué, sa doctrine inchangée')
} else if (texte.includes('Listes d’abreviations')) {
  throw new Error('Le § 35.14.5 a encore changé : le réaccentuer demande de le relire.')
}

const titres = t => (t.match(/^#{1,4} /gm) ?? []).length
console.log(JSON.stringify({
  avant: { signes: avant.length, titres: titres(avant) },
  apres: { signes: texte.length, titres: titres(texte) },
  journal,
  essai_seul: essaiSeul,
}, null, 2))

if (journal.length === 0) { console.log('Rien à réparer.'); process.exit(0) }
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: errSauvegarde } = await db.from('parametres')
  .upsert({ cle: CLE_SAUVEGARDE, valeur: avant }, { onConflict: 'cle' })
if (errSauvegarde) throw errSauvegarde
console.log(`État d’avant sauvegardé sous « ${CLE_SAUVEGARDE} ».`)

const { error: errEcriture } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (errEcriture) throw errEcriture
console.log('§ 35.14 réparé. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
