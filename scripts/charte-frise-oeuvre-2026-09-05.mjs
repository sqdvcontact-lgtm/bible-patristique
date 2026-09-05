/**
 * § 38.24 : la fiche d'une œuvre porte une FRISE ; un sommaire vide ne paraît pas ;
 * une source numérique ne donne que le nom du site.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-frise-oeuvre-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '38.24 La fiche d’une ŒUVRE porte une FRISE, et un sommaire vide ne paraît pas'

const ANCRE = 'Le chemin réseau est le même que celui du lecteur, puisque c’est son navigateur qui parle à la base — à la différence d’une page servie, où il faut mesurer en ligne (§ 18).'

const SECTION = `

### ${MARQUE}

Trois demandes de l’auteur, 2026-09-05.

⛔ **LA FICHE D’UNE ŒUVRE PORTE UNE CHRONOLOGIE, ET C’EST CELLE DE SON AUTEUR.** Il n’y en a pas d’autre : douze événements sur 1 346 nomment une œuvre, **un seul par œuvre**, et une frise d’un point n’est pas une frise. Mais la question qu’on pose à cette fenêtre — *où ce livre tombe-t-il ?* — se répond précisément là, entre la naissance et la mort de celui qui l’a écrite.

⚠️ **La ligne qui nomme l’œuvre lue s’y DÉTACHE**, à l’accent et à la graisse — le marqueur de l’entrée active d’un sommaire, et rien de plus. Sans elle, la fiche de l’œuvre montrerait la fiche de l’auteur et ne répondrait à rien. ⛔ La chronologie OUVRE la colonne de droite, comme dans la fiche d’une traduction : on situe avant de documenter ; et elle ne paraît pas quand l’auteur n’en a pas.

⚠️ **Le champ existait et rien ne le lisait.** Les deux vues de chronologie portent \`oeuvre_id\` depuis l’origine ; aucune ligne du site ne l’avait jamais demandé. *Un champ qu’aucune surface ne lit n’est pas une réserve pour plus tard : c’est une porte qu’on a oublié d’ouvrir.*

⛔ **UN SOMMAIRE QUI N’A RIEN À SOMMER NE PARAÎT PAS.** Le volet de lecture posait la rubrique « SOMMAIRE » et, dessous, la mention « Texte complet » : une rubrique qui annonce une table des matières, et une ligne qui dit qu’il n’y en a pas. Deux objets pour rien, et ils s’en vont ensemble. L’apparat critique prend alors toute la hauteur du volet, son plafond de moitié ne partageant plus avec personne.

⚠️ **La règle porte sur le CONTENU, non sur le mode de lecture**, et la distinction n’est pas de forme. Le cas se rencontre aujourd’hui en TEXTE ENTIER — une seule œuvre publique, « De la vanité des idoles » — mais un texte sans niveaux le rendrait tout aussi absurde ailleurs. ⛔ Et l’on ne retire pas le sommaire du mode « texte entier » : **vingt-trois œuvres s’y lisent AVEC le leur**, dont l’Apologétique (52 chapitres) et les Homélies sur la Genèse (68), où il est la seule navigation — c’est même son unique office là, puisque tout est déjà chargé dans la page.

⛔ **UNE SOURCE NUMÉRIQUE NE DONNE QUE LE NOM DU SITE** (« toujours illisible ; se contenter de donner le nom du site »). Le champ n’est pas un nom mais une PHRASE — le site, puis ce qu’on y a pris : « eBible.org — corpus BibleNLP, édition fra-fraLSG » —, et dans la colonne étroite d’une fiche elle ne se lit pas.

⛔ **Et ce nom n’est PAS l’hôte de l’adresse.** Trois des sept sources du corpus sont hébergées sur un même dépôt public, où le lecteur ne reconnaîtrait aucun des trois sites. C’est le DÉBUT du nom qui nomme, la suite qui précise ; l’hôte ne sert que de dernier repli, quand aucun nom n’est écrit. ⚠️ La coupe se fait sur un séparateur EXPLICITE — le tiret, ou l’incise « , d’après … » —, jamais sur une position ni sur la première virgule : « Gallica, Bibliothèque nationale de France » porte la sienne dans son nom même.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_frise_oeuvre'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
