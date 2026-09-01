/**
 * Charte § 40 : le tableau de cases remplace la carte « Ce que j'ai retenu »,
 * les points disent la difficulté, et les annonces se règlent.
 *
 * Décisions de l'auteur du 1er septembre 2026, prises après que le § 40 eut été
 * écrit le matin même : la carte en prose est refusée (« en l'état, ça ne
 * fonctionnerait pas du tout »), remplacée par « un grand tableau de cases à
 * collectionner, dans différents tons harmonieux » à deux états, la case non
 * validée portant son avancement chiffré ; chaque haut fait vaut des points selon
 * sa difficulté ; et deux formes de notification accompagnent la progression.
 *
 * ⛔ On n'écrit QUE dans Supabase, source unique. Le miroir se régénère ensuite
 * par `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * ⛔ Le script REFUSE d'écrire si un motif ne se trouve pas exactement une fois :
 * mieux vaut ne rien corriger que corriger à moitié.
 *
 * Usage : node scripts/charte-tableau-hauts-faits-2026-09-01.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§40.3 — le titre : ce n’est plus une carte, c’est une règle de mesure',
    avant: [
      '### 40.3 La carte dit ce qui est RETENU, jamais ce qui est lu',
      '',
      '⛔ **On ne trace RIEN** (décision de l’auteur, 1er septembre 2026). La carte se bâtit sur ce que le lecteur MARQUE de lui-même : un passage prélevé, une œuvre mise en bibliothèque. Quatre raisons, dans l’ordre où elles pèsent. Une ouverture de page ne prouve pas une lecture, et une carte qu’on sait imméritée dévalue tout le reste ; un geste volontaire, lui, prouve. Une carte remplie toute seule se comble sans qu’on ait creusé aucun écart, et la curiosité s’éteint avec eux. Une trace automatique fait qu’on se sait observé, et l’on finit par lire pour la carte — sur un corpus religieux, le temps passé sur un passage est en outre une donnée intime. Enfin elle ne coûte rien : aucune table, aucune écriture, aucun chantier préalable.',
    ].join('\n'),
    apres: [
      '### 40.3 On ne TRACE rien : ce qui se compte est ce qu’on MARQUE',
      '',
      '⛔ **On ne trace RIEN** (décision de l’auteur, 1er septembre 2026). Tout ce qui se compte se bâtit sur ce que le lecteur MARQUE de lui-même : un passage prélevé, une œuvre mise en bibliothèque, un commentaire validé. Quatre raisons, dans l’ordre où elles pèsent. Une ouverture de page ne prouve pas une lecture, et une case qu’on sait imméritée dévalue tout le tableau ; un geste volontaire, lui, prouve. Un tableau qui se remplit tout seul se comble sans qu’on ait creusé aucun écart, et la curiosité s’éteint avec eux. Une trace automatique fait qu’on se sait observé, et l’on finit par lire pour le compteur — sur un corpus religieux, le temps passé sur un passage est en outre une donnée intime. Enfin elle ne coûte rien : aucune table, aucune écriture, aucun chantier préalable.',
    ].join('\n'),
  },
  {
    nom: '§40.3 — la carte en prose est retirée, sa règle de nom demeure',
    avant: [
      '⛔ **ELLE SE NOMME « CE QUE J’AI RETENU », jamais « ce que j’ai lu ».** Ainsi nommée elle ne ment jamais, et elle dit mieux : retenir vaut plus que parcourir. Un lecteur qui lit sans rien marquer a une carte vide, et c’est juste.',
      '',
      '⚠️ **Elle ne montre JAMAIS l’immensité de ce qui reste**, mais le siècle où il manque le moins d’auteurs. Loewenstein (1994) : la curiosité naît d’un écart perçu entre ce qu’on sait et ce qu’on veut savoir, et les PETITS écarts l’excitent quand les grands l’éteignent. « Il vous en manque un » ouvre ; « il vous en manque douze » ferme.',
      '',
      '⚠️ Le choix ne ferme aucune porte : si une vraie mesure de lecture devient nécessaire, on ajoutera la trace et la carte se nourrira des deux sources.',
    ].join('\n'),
    apres: [
      '⛔ **AUCUN LIBELLÉ NE DIT « LU ».** Une case se gagne en retenant, non en parcourant : elle se nomme par ce qu’on a fait, jamais par ce qu’on a vu passer. Un lecteur qui lit sans rien marquer a un tableau vide, et c’est juste.',
      '',
      '⚠️ Le choix ne ferme aucune porte : si une vraie mesure de lecture devient nécessaire, on ajoutera la trace et le tableau se nourrira des deux sources.',
      '',
      '⛔ **La carte « Ce que j’ai retenu » est RETIRÉE**, le jour même où elle fut écrite (« en l’état, ça ne fonctionnerait pas du tout », mot de l’auteur). Elle rendait en prose ce qu’un lecteur avait marqué, siècle par siècle, en ne montrant jamais que le plus petit écart ; le tableau de cases dit la même matière, et la dit mieux. ⛔ On ne remet pas une seconde vue par-dessus : deux surfaces qui décrivent le même fait divergent au premier réglage, et la seconde finit par faire autorité contre la première.',
    ].join('\n'),
  },
  {
    nom: '§40.4 — le titre et la forme : un tableau, non une liste',
    avant: [
      '### 40.4 Les HAUTS FAITS : des séries décalées, jamais une liste finie',
      '',
      'Six séries, vingt et un degrés.',
    ].join('\n'),
    apres: [
      '### 40.4 Les HAUTS FAITS : un TABLEAU DE CASES à collectionner',
      '',
      '⛔ **La forme est un TABLEAU, jamais une liste en prose** (décision de l’auteur, 1er septembre 2026 : « un grand tableau de cases à collectionner, dans différents tons harmonieux »). Une case par degré, rangée sous sa série, et **deux états seulement** : validée, non validée. On voit d’un regard ce qu’on tient et ce qu’on n’a pas, ce qu’aucune liste ne montre.',
      '',
      'Six séries, vingt et un degrés.',
    ].join('\n'),
  },
  {
    nom: '§40.4 — les deux états, les tons, les points, la notice, et les annonces',
    avant: [
      '⛔ **Une obtention ne se REPREND jamais**, même si le compteur redescend : une perte démotive plus qu’un gain ne motive. Elle se constate côté serveur, la table n’ayant aucune politique d’écriture pour un compte ordinaire — c’est la leçon du portrait, prise par l’autre bout.',
      '',
      '### 40.5',
    ].join('\n'),
    apres: [
      '⛔ **Une obtention ne se REPREND jamais**, même si le compteur redescend : une perte démotive plus qu’un gain ne motive. Elle se constate côté serveur, la table n’ayant aucune politique d’écriture pour un compte ordinaire — c’est la leçon du portrait, prise par l’autre bout.',
      '',
      '⛔ **UNE CASE NON VALIDÉE EST SOBRE ET LAIDE**, et c’est le mot de l’auteur. Fond de page, encre grise, aucun ton, aucun relief : elle n’a rien de la case gagnée et ne cherche pas à plaire. C’est le contraste qui fait la collection ; une grille où tout se ressemble ne donne rien à compléter.',
      '',
      '**Elle porte en revanche son AVANCEMENT chiffré** — « 55 / 100 » — sous un filet mince qui le redouble. C’est ce qui réconcilie le tableau avec Loewenstein (1994), pour qui la curiosité naît d’un écart PERÇU et s’éteint quand l’écart est trop grand : vingt et une cases vides découragent, mais on ne les regarde pas ensemble, on regarde l’écart d’UNE case, petit et dénombrable. ⚠️ Le compte se BORNE à son seuil : une case gagnée n’affiche jamais « 143 / 100 », qui ferait du dépassement un accomplissement de plus.',
      '',
      '**Les TONS viennent des trois familles du corpus** — `--cs-ecriture`, `--cs-peres`, `--cs-communaute` — et non d’une gamme inventée pour l’occasion : c’est la palette qui range déjà les résultats de recherche et les rubriques de la barre. Une case gagnée prend un lavis de l’encre de sa famille, d’autant plus soutenu que le degré est haut, obtenu par `color-mix` et non par quatre jetons de plus. ⛔ Le ton dit DE QUOI la case est faite, jamais sa rareté : une couleur qui encoderait la difficulté ferait un second classement par-dessus les points.',
      '',
      '⛔ **Les POINTS disent la difficulté, ils ne s’échangent contre rien.** Chaque haut fait en vaut selon son degré, et le total se lit en tête du tableau. ⚠️ Ce n’est pas une monnaie, et ce n’en deviendra pas une : le § 40.6 le tranche, et un point qui ouvrirait un droit rendrait TANGIBLE une récompense qui doit rester informationnelle (Deci, Koestner et Ryan, 1999). Ils servent à comparer deux cases entre elles, et à rien d’autre.',
      '',
      '⛔ **La NOTICE ne se lit qu’une fois la case gagnée.** C’est ce qui en fait une récompense et non une consigne : lisible d’avance, elle deviendrait la description d’une tâche à accomplir, et le haut fait cesserait d’être un nom pour devenir un devoir.',
      '',
      '#### 40.4.1 Les ANNONCES : deux formes, et l’on n’annonce pas chaque pas',
      '',
      'Demande de l’auteur, 1er septembre 2026 : « de petites notifications quand on avance vers l’accomplissement d’un objectif ; et une belle notification quand on termine un haut fait ».',
      '',
      '⛔ **DEUX PALIERS PAR CASE AU PLUS** — la moitié du chemin, puis le dernier pas — et jamais deux fois le même. Une vignette à chaque prélèvement serait insupportable, et une notification qu’on subit cesse d’être lue, comme une garde durablement rouge (§ 30). ⚠️ Sous un seuil de quatre, la moitié ne s’annonce pas : « 2 sur 4 » n’est pas une nouvelle.',
      '',
      '**L’obtention l’emporte sur le palier** : une case qui vient de tomber ne s’annonce pas comme étant à mi-chemin. La belle annonce porte le nom du haut fait, ses points et sa NOTICE — le retour de fond arrive au moment où la case tombe, non plus tard dans un tableau qu’il faudrait aller ouvrir.',
      '',
      '⚠️ **Rien ne s’écrit en base pour cela.** Ce qui a déjà été annoncé vit dans le stockage local du navigateur, comme les notifications archivées du site : une annonce est un fait d’ÉCRAN, pas un fait de corpus, et le pire qu’un stockage vidé puisse faire est de la remontrer une fois. ⛔ On retient AVANT de montrer, sans quoi une annonce interrompue — page fermée, onglet changé — reviendrait à chaque chargement.',
      '',
      '⛔ **La vérification ne part pas à chaque page tournée** : une fois par session, puis sur le GESTE d’un lecteur. Sept points d’écriture l’émettent, les six prélèvements et l’ajout d’un favori. ⚠️ Le RETRAIT d’un favori ne signale rien : aucune case ne recule, une obtention étant acquise pour de bon.',
      '',
      '### 40.5',
    ].join('\n'),
  },
]

function appliquer(texte) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`« ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  return sortie
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur, mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

const avant = data.valeur
const apres = appliquer(avant)

console.log(JSON.stringify({
  avant: avant.length, apres: apres.length, delta: apres.length - avant.length,
  verrou: data.mis_a_jour, essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// ⚠️ Verrou optimiste : on refuse d'écrire si la ligne a bougé depuis la lecture.
const { data: ecrit, error: erreurEcriture } = await db
  .from('parametres').update({ valeur: apres })
  .eq('cle', 'charte_ia').eq('mis_a_jour', data.mis_a_jour)
  .select('valeur')
if (erreurEcriture) throw erreurEcriture
if (!ecrit?.length) throw new Error('La charte a changé depuis la lecture : rien n’a été écrit.')
if (ecrit[0].valeur !== apres) throw new Error('Relecture discordante après écriture.')
console.log('Charte corrigée dans Supabase. Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
