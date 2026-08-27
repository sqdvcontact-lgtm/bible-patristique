/**
 * § 37 : la notice publique d'une traduction porte DEUX images — un bandeau
 * horizontal, qui prend son cadre quand la notice se déplie, et un encart au
 * format portrait, qui flotte dans le texte sans toucher aucun bord.
 * Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-notice-traduction-deux-images-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

// La dernière phrase de la charte : le nouveau chapitre se pose après elle.
const ANCRE = 'De même la table des éditeurs, qui rend aux maisons leur nom répertorié : elle n’est lue qu’à la première œuvre trouvée qui porte un éditeur, la barre étant sur toutes les pages et n’ayant pas à charger une table de référence tant qu’on ne cherche rien.'

const SECTION = `

## 37. La notice d’une traduction — le bandeau et l’encart

Une notice de traduction porte DEUX images, et non une seule cadrée deux fois. Le bandeau est horizontal : il coiffe la carte, le titre s’y écrit par-dessus, et c’est lui que l’on voit quand la notice est fermée. L’encart est au format portrait : il ne paraît que dans le bloc déplié. ⛔ On ne dérive jamais l’un de l’autre. Une vue large de monastère serrée dans une boîte de deux tiers ne rend qu’une bande de ciel, et une image debout écrasée dans quatre-vingt-douze pixels de haut ne montre qu’un col : c’est exactement ce que faisait l’image unique jusqu’ici. Les deux vivent dans \`traductions.photo\` et \`traductions.photo_encart\`, se déposent séparément, se cadrent séparément — \`photo_position.bandeau\` et \`photo_position.encart\` — et se réduisent dans deux boîtes dont l’une est couchée et l’autre debout. Tant qu’une notice n’a pas reçu son portrait, le bandeau en tient lieu, cadré en portrait : elle ne se troue pas en attendant.

**Le bandeau prend son cadre en s’ouvrant.** Fermé, il tient toute la carte, bord à bord. Déplié, il recule de dix pixels sur ses quatre côtés : le fond de la carte passe derrière lui et lui tient lieu de passe-partout, un filet le borde, une ombre courte le décolle. La carte gagne alors exactement ces vingt pixels de haut, si bien que l’IMAGE ne change pas de taille — elle recule, elle ne rétrécit pas. ⚠️ Le titre et le chevron entrent avec elle : laissés à leur place ancienne, ils se seraient trouvés à cheval sur le passe-partout, moitié sur l’image, moitié sur le fond de la carte. Et le voile dégradé qui porte le titre vit DANS le cadre : posé par-dessus toute la carte, il grisait aussi le passe-partout, et le cadre se perdait dans une tache au lieu de se détacher.

**L’encart flotte dans le texte ; il ne tient pas une colonne.** ⛔ Le volet déplié n’est pas deux colonnes. L’image y a tenu une colonne entière, collée à trois bords et séparée du texte par un filet : sa forme dépendait alors de la longueur de la notice — une bande de cent quarante sur six cents quand le commentaire était long — et il restait sous elle une bande blanche que rien ne venait remplir. L’encart a donc une proportion FIXE, deux tiers, il ne touche aucun bord, et le texte l’entoure puis reprend toute la mesure sous lui. Le bloc de texte est un contexte de formatage à lui seul, faute de quoi une notice plus courte que l’encart le laisserait dépasser hors de la carte.

⚠️ **Sous sept cents pixels, l’encart s’efface.** Sur un téléphone de trois cent soixante-quinze, la carte dispose de trois cent vingt-sept pixels : l’encart en prenait cent quarante et un, et il restait cent quarante-quatre pixels de texte JUSTIFIÉ, soit dix-sept signes par ligne. C’est la règle déjà posée pour la carte d’auteur. Le bandeau, lui, demeure : le téléphone voit donc une image des deux, et non aucune.`

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
if (avant.includes('## 37.')) throw new Error('La charte porte déjà un § 37 : rien n’est écrit.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
