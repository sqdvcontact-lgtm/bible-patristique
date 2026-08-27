/**
 * § 37 : le fond d'une fiche prend la TEINTE de son encart, jamais sa CLARTÉ —
 * celle-ci appartient au thème. Le ton complet, mêlé au fond par color-mix, est
 * écarté après essai. Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-ton-clair-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = `**Le fond de la fiche prend un TON de son encart.** Le volet déplié n’est plus le crème uni de la carte : il en garde quatre-vingt-huit pour cent et reçoit, pour le reste, la couleur dominante de l’image en portrait. ⛔ Cette dominante n’est PAS la moyenne des pixels : la moyenne d’un paysage est une boue grise, les complémentaires s’y annulant. Les teintes se rangent en vingt-quatre seaux de quinze degrés, pondérées par leur saturation, gris, noirs et blancs écartés d’avance — ils sont les plus nombreux dans une photographie ancienne et n’ont pas de teinte à donner ; le seau le plus lourd donne le ton, par moyenne CIRCULAIRE, faute de quoi le milieu de deux rouges à 350° et à 10° tomberait sur le cyan. Sa saturation est bornée entre trente-huit et soixante-deux pour cent : au-dessous le ton ne paraît pas, au-dessus il crie.

⚠️ **Le ton se MÊLE au jeton de fond, il ne le remplace pas.** Écrit en valeur absolue, il aurait allumé une fiche crème au milieu du Cuir. Mêlé, il éclaircit le crème au Clair et fonce le brun au sombre, de la même teinte et de la même quantité : la couleur vient de l’image, la clarté du thème. C’est l’exact inverse de la règle qui gouverne l’encre écrite SUR une photographie, et pour la même raison — ce qui a un sol thématique se compose en jeton, ce qui n’en a pas se compose en dur.

⚠️ **La part se mesure sur le cas le plus terne, non sur le plus vif.** À quatre-vingt-douze pour cent de crème, l’intérieur d’église de la Crampon — un hsl(34 34 % 50 %), chaud et sourd — donnait un fond que rien ne distinguait de la page, le crème étant déjà chaud lui-même. Douze pour cent le font paraître sans que la Vulgate clémentine, la plus colorée des six, se mette à crier. Le calcul n’a lieu qu’à la PREMIÈRE ouverture d’une notice et son résultat est retenu : six décodages au chargement d’une page dont on n’ouvrira qu’une fiche ne se justifieraient pas.`

const APRES = `**Le fond de la fiche prend la TEINTE de son encart — et rien d’autre.** Le volet déplié n’est plus le blanc uni de la carte : il reçoit la teinte dominante de l’image en portrait, et sa saturation. ⛔ Il n’en reçoit PAS la clarté. La clarté appartient au THÈME, et à lui seul : très haute au Clair, très basse au Cuir, où la saturation est de surcroît divisée — à clarté basse, une même saturation pousse beaucoup plus de couleur, et le brun du thème tournait au roux. Une fiche se lit sur un fond CLAIR au Clair, quelle que soit la couleur du tableau qui la surmonte : le tableau n’a de droit que sur la teinte. La teinte se pose en ligne, en deux propriétés personnalisées ; les deux clartés sont écrites une fois pour toutes dans la feuille globale, une par thème.

⛔ **Un ton COMPLET a été essayé, puis écarté le même jour.** Teinte, saturation ET clarté prises à l’image, puis mêlées au fond par color-mix : les peintures étant sombres — elles le sont presque toutes —, le blanc de la fiche se salissait d’un beige sourd au lieu de se teinter, et la dose qui faisait paraître la plus terne des six assombrissait toutes les autres. C’est le même partage que pour l’encre écrite SUR une photographie, pris par l’autre bout : là, une couleur qui n’a pas de sol thématique se compose en dur ; ici, une clarté qui en a un se compose en jeton.

**La dominante n’est pas la moyenne des pixels** : la moyenne d’un paysage est une boue grise, les complémentaires s’y annulant. Les teintes se rangent en vingt-quatre seaux de quinze degrés, pondérées par leur saturation, gris, noirs et blancs écartés d’avance — ils sont les plus nombreux dans une photographie ancienne et n’ont pas de teinte à donner ; le seau le plus lourd donne le ton, par moyenne CIRCULAIRE, faute de quoi le milieu de deux rouges à 350° et à 10° tomberait sur le cyan. Sa saturation est bornée entre trente-deux et soixante pour cent : au-dessous le ton ne paraît pas, au-dessus il crie. Le calcul n’a lieu qu’à la PREMIÈRE ouverture d’une notice et son résultat est retenu : six décodages au chargement d’une page dont on n’ouvrira qu’une fiche ne se justifieraient pas.`

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
const n = avant.split(AVANT).length - 1
if (n !== 1) throw new Error(`motif : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(AVANT).join(APRES)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
