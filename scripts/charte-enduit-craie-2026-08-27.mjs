/**
 * § 37 : le fond d'une fiche est un LAIT DE CHAUX, non un aplat teinté. La
 * saturation descend à 14-28 %, et c'est la nuée large — non le grain — qui
 * porte l'irrégularité. Décision de l'auteur du 27 août 2026, qui jugeait le
 * fond « encore trop uniforme et vif ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-enduit-craie-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  [
    'Sa saturation est bornée entre trente-deux et soixante pour cent : au-dessous le ton ne paraît pas, au-dessus il crie.',
    '⛔ Sa saturation est bornée TRÈS BAS, et l’écart entre les bornes est étroit : quatorze à vingt-huit pour cent. Un fond de fiche n’est pas un aplat de couleur, c’est un LAIT DE CHAUX — il porte une teinte sans porter une couleur. Les bornes ont d’abord été posées à trente-deux et soixante ; l’auteur a jugé le résultat trop vif, et il l’était : la même image y donnait un pastel là où il faut une craie teintée.',
  ],
  [
    'À 91 % le ton se voyait enfin ; il est remonté à 94 % le jour où l’enduit est venu, le gris de celui-ci assombrissant déjà le fond de son côté. La Bible de Sacy y donne un ivoire chaud, rgb(245 241 234), qui s’accorde à la terre cuite de son portrait.',
    'À 91 % le ton se voyait enfin ; il est remonté à 95 % à mesure que l’enduit s’est épaissi, le gris de celui-ci assombrissant déjà le fond de son côté. La Bible Crampon y donne rgb(246 242 239) contre le #fff de la carte : une craie chaude, et non plus un ivoire.',
  ],
  [
    '**Le fond porte un ENDUIT.** Deux bruits fractals gris se posent sur le ton : un grain serré, qui donne le sable de l’enduit, et une nuée large, qui donne les inégalités de la pose. ⛔ Un seul ne suffit pas — le grain seul fait du bruit de capteur, la nuée seule fait une tache. Tous deux sont désaturés, la couleur venant de la teinte et jamais de la texture, et posés autour de cinq pour cent : au-delà, ce n’est plus une fresque, c’est du papier peint. ⚠️ Le bruit étant gris, il assombrit un fond clair et ÉCLAIRCIT un fond sombre, et il se voit deux fois plus au Cuir pour la même opacité : l’enduit y est donc dessiné à part, deux fois plus discret. Aucun fichier image n’est déposé pour cela — le motif est un SVG écrit en ligne, de deux cents octets, qui se répète sans couture.',
    '**Le fond porte un ENDUIT.** Deux bruits gris se posent sur le ton : un grain serré, qui donne le sable de l’enduit, et une NUÉE très large, qui donne les inégalités de la pose. ⛔ Un seul ne suffit pas — le grain seul fait du bruit de capteur, la nuée seule fait une tache. Tous deux sont désaturés, la couleur venant de la teinte et jamais de la texture.\n\n⛔ **C’est la NUÉE qui porte le travail, non le grain.** Posée d’abord à une fréquence de 0,014 et à six pour cent, elle laissait le fond « encore trop uniforme » : ses taches étaient plus petites que le bloc, et leur moyenne redonnait un aplat. Il faut des plaques PLUS LARGES QUE LA COLONNE DE TEXTE — la fréquence est descendue à 0,006, soit deux cents pixels — et une amplitude franche, treize pour cent, en `turbulence` plutôt qu’en `fractalNoise`, qui veine au lieu de nuager. Le grain, lui, redescend à quatre et demi : il n’est là que pour le sable. ⚠️ Le bruit étant gris, il assombrit un fond clair et ÉCLAIRCIT un fond sombre, et il se voit deux fois plus au Cuir pour la même opacité : l’enduit y est donc dessiné à part, deux fois plus discret. Aucun fichier image n’est déposé pour cela — le motif est un SVG écrit en ligne qui se répète sans couture.',
  ],
]

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
let texte = data.valeur
for (const [avant, apres] of REMPLACEMENTS) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`motif « ${avant.slice(0, 50)}… » : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(avant).join(apres)
}
console.log(JSON.stringify({ avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
