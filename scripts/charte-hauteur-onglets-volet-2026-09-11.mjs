/**
 * Consigne dans la charte le § 38.29 — LA BARRE D'ONGLETS D'UN VOLET, et sa hauteur.
 *
 * Relevé de l'auteur du 11 septembre 2026, sur la barre « Bible | Commentaires | Notes »
 * du volet de droite d'une œuvre : « ça me paraît un peu trop petit ; tu peux augmenter
 * un peu la hauteur de cette ligne ? »
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-hauteur-onglets-volet-2026-09-11.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 38.29 La barre d'onglets d'un VOLET : le modèle commun, resserré, et 31 px de haut

Relevé de l'auteur du 11 septembre 2026, sur la barre « Bible | Commentaires | Notes » du
volet de droite d'une œuvre : « ça me paraît un peu trop petit ; tu peux augmenter un peu la
hauteur de cette ligne ? »

⛔ **UNE BARRE D'ONGLETS DE VOLET N'EST PAS UNE BARRE DE PLUS : C'EST LE MODÈLE COMMUN À LA
MESURE D'UNE COLONNE ÉTROITE** (\`OngletsPage\`, § 36 ; variante \`cs-onglets--volet\`, depuis le
30 août 2026). Mêmes libellés centrés à parts égales, même trait vert sous l'onglet retenu,
même largeur réservée d'avance en graisse 600. Seuls changent le séparateur, qui s'en va, les
marges automatiques, qui s'annulent pour que la barre reprenne la largeur de la colonne, et le
rembourrage. ⛔ On ne la recompose jamais en styles en ligne.

⛔ **SON REMBOURRAGE VAUT 6 PX, ET ELLE MESURE 31 PX.** Le resserrement du 30 août l'avait
descendue à 4 px et 27 px, depuis les 8 px et 35 px du modèle de page. Le principe était
juste, un modèle dessiné pour 46 à 52 rem ne se posant pas tel quel dans deux cents pixels ;
la mesure était trop forte. Six pixels la portent à mi-chemin, le trait vert descend de six à
huit pixels sous le mot, et le corps du libellé ne bouge pas.

⛔ **LA HAUTEUR APPARTIENT À LA VARIANTE, DONC À TOUTES LES BARRES QUI LA PORTENT** : « Bible |
Commentaires | Notes », « Livres | Sommaire » dans le volet de la page Bible, « Niveaux |
Fleuron ». C'est un seul objet, et un objet n'a qu'une hauteur. Hausser une barre seule ferait
reparaître la divergence que le modèle commun a fermée.

⚠️ **Le rembourrage reste SYMÉTRIQUE** : la flèche de repli du volet d'une œuvre est posée sur
toute la hauteur de la barre et s'y centre, et un rembourrage inégal écarterait le mot de sa
flèche. ⚠️ Au doigt rien ne change : le plancher tactile de l'onglet (2,75 rem) l'emportait
déjà.

⚠️ **Ce qui reste ouvert** : les deux volets de la page Bible n'ont pas la même première ligne,
31 px à gauche et 42 à droite, où la barre des Pères porte un compte sous son libellé. Question
posée, non tranchée.
`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

/** ⛔ L'INVARIANT : on n'écrit QUE par la fin, et jamais sur ce qui est déjà là. */
function ajouter(texte, source) {
  if (texte.includes('### 38.29 ')) throw new Error(`[${source}] le § 38.29 y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + SECTION
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = ajouter(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = ajouter(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
if (!relue.valeur.trimEnd().endsWith(SECTION.trimEnd())) {
  throw new Error('Relecture : la charte distante ne se termine pas par le § 38.29.')
}
console.log('Les deux exemplaires portent le § 38.29, et la relecture le confirme.')
