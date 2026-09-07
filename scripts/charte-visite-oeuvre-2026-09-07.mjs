/**
 * § 46 : la visite d'une page d'ŒUVRE, la cinquième. Demande de l'auteur du
 * 7 septembre 2026 (« maintenant, pour une page de lecture d'œuvre »).
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-visite-oeuvre-2026-09-07.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'La visite d’une ŒUVRE'

const ANCRE = '**La visite de la Bibliothèque** — la page que la barre appelle « Patristique » —'

const TEXTE = [
  '**La visite d’une ŒUVRE** compte sept arrêts, et c’est la première page à TROIS colonnes qui en reçoive une : le volet de gauche entier, du haut vers le bas, puis la colonne de lecture, puis le volet de droite. ⛔ Jamais par bandes horizontales — les trois colonnes ouvrent toutes à la même hauteur, et les ranger par ordonnée ferait sauter le regard d’un bord de l’écran à l’autre à chaque arrêt. Elle dit ce qu’aucune page voisine ne dit : que le nom de l’auteur ouvre sa fiche, qu’une œuvre se lit dans plusieurs langues quand l’édition les porte et qu’on ne perd pas sa place en changeant, que l’apparat critique est une seconde lecture tenue à part, qu’un passage se CLIQUE et que le volet de droite répond.',
  '',
  '⚠️ **DEUX ARRÊTS SUR SEPT DISPARAISSENT D’EUX-MÊMES, et c’est voulu.** « Dans quelle langue » n’existe que si l’édition offre plus d’une langue, « L’apparat critique » que si l’éditeur en a laissé un ; la plupart des œuvres n’ont ni l’un ni l’autre. Le dispositif y pourvoit sans qu’on ait rien à déclarer : une étape dont le sujet reste introuvable s’efface au bout d’un délai, et la suivante prend sa place. ⛔ C’est aussi ce qui interdit d’écrire une visite qui promettrait ce que toutes les œuvres ne portent pas.',
  '',
  '⛔ **ON NE MONTRE PAS DEUX FOIS LA MÊME ACTION.** La cellule qui paraît au survol d’un passage — prélever, copier, signaler — n’a pas d’arrêt : c’est un geste offert partout où le site donne un texte, et la visite de la Bible classique le présente déjà. La montrer ici demanderait en outre de simuler un survol, donc de poser sous les yeux du lecteur une cellule qu’il n’a pas appelée. Même raison que pour le signalement, écarté de la visite de la Bibliothèque.',
  '',
  '⛔ **UNE VISITE NE S’OUVRE PAS SUR UNE PAGE QU’ELLE NE DÉCRIT PAS.** Sur téléphone, les deux volets d’une œuvre sont des TIROIRS, fermés à l’ouverture : quatre arrêts sur sept y cerneraient des sujets absents, et la visite ne serait plus qu’une attente entre deux cases. Elle ne s’y ouvre donc pas, et la barre n’y offre pas non plus le bouton qui la rappelle — un bouton qui ouvrirait une visite dégradée vaut moins que pas de bouton. C’est la règle déjà posée pour la Polyglotte, qui attend l’écran large, et pour l’accueil, qui attend la barre déployée.',
  '',
  ANCRE,
].join('\n')

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
if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue.')
const apres = avant.split(ANCRE).join(TEXTE)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260907_avant_visite_oeuvre'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.split(ANCRE).length - 1 !== 1) throw new Error('relecture : l’ancre a bougé.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
