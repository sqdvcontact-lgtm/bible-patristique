/**
 * Corrige la charte, § 13.15 : L'ENCART S'ARRÊTE AU VOLET.
 *
 * La règle posée le matin même autorisait l'encart d'une note à déborder sur un volet,
 * au motif qu'un volet est une navigation et non ce qu'on lit. L'auteur l'a renversée le
 * soir : « il faut que l'encart de la note s'arrête au volet de droite (ou de gauche) ».
 * Une fenêtre posée sur un volet le RECOUVRE, et le lecteur qui l'a ouvert l'a ouvert
 * pour le voir.
 *
 * Trois passages : la règle du volet, le choix du côté (que la borne rend dissymétrique
 * dès qu'un seul volet se replie), et les mesures, refaites au navigateur sur la
 * structure des deux pages de lecture.
 *
 * Les DEUX exemplaires sont corrigés — charte/CHARTE_IA.md et parametres.charte_ia —
 * avec la même table de remplacements. Le script REFUSE d'écrire si un motif ne se
 * trouve pas exactement une fois dans chacun : mieux vaut ne rien corriger que corriger
 * à moitié.
 *
 * Usage : node scripts/charte-encart-borne-au-volet-2026-09-08.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 13.15 — le côté',
    avant: '⚠️ **Le côté est celui où il reste le plus de place ; à égalité, la droite.** La marge de gauche porte la manchette des renvois, et l’encart la couvrirait.',
    apres: '⛔ **LA DROITE L’EMPORTE DÈS QU’ELLE PORTE LA LARGEUR PLANCHER**, et la gauche ne sert que faute de mieux : la marge de gauche porte la manchette des renvois, et l’encart la couvrirait. ⚠️ La règle d’avant prenait le côté le plus large, ce qui suffisait tant que la marge se comptait jusqu’au bord de la fenêtre et restait presque symétrique. Bornée au volet, elle l’est EXACTEMENT tant que les deux volets sont ouverts, et elle devient franchement dissymétrique dès qu’un seul se replie : la gauche l’emporterait alors sur un écran où rien ne l’exige.',
  },
  {
    nom: '§ 13.15 — la borne',
    avant: '⚠️ **Elle peut déborder sur un VOLET, et c’est voulu** : un volet est une navigation, non ce qu’on est en train de lire. Seule la colonne de texte est sacrée.',
    apres: [
      '⛔ **ELLE S’ARRÊTE AU VOLET.** La marge se compte jusqu’au bord du BLOC DE LECTURE — ce qui reste entre les deux volets —, non jusqu’au bord de la fenêtre. Un volet est bien une navigation, mais une fenêtre posée dessus le RECOUVRE, et le lecteur qui l’a ouvert l’a ouvert pour le voir.',
      '',
      '⚠️ La règle inverse a valu quelques heures le 8 septembre 2026, et l’auteur l’a renversée le soir même. ⛔ Le prix en est lourd, et il faut le connaître : les deux volets OUVERTS, la lecture d’une œuvre ne laisse plus que six rem de marge sur un portable, dix sur un écran ordinaire et quinze sur un grand écran, quand le plancher en demande vingt. L’encart repasse donc sous son appel presque partout. ⛔ Ce n’est pas une raison de baisser le plancher : un encart de dix rem porterait douze signes par ligne, et ce ne serait plus une note. **C’est le VOLET qui rend la place** — replié à son rail, il en laisse vingt dès le portable et trente-deux sur un grand écran — et le repli est un geste que le lecteur a déjà sous la main.',
    ].join('\n'),
  },
  {
    nom: '§ 13.15 — les mesures',
    avant: '⛔ **Elle SE RESSERRE plutôt que de renoncer.** La colonne de lecture d’une œuvre laisse près de sept cents pixels de marge sur un grand écran et moins de quatre cents sur un portable, quand l’encart en demande quatre cent soixante-quatre : exiger la mesure pleine l’aurait renvoyé par-dessus le texte sur la plupart des écrans. ⛔ Ce n’est pas la largeur qui suit le CONTENU, que le § 13.13 proscrit : elle suit la PLACE, elle est la même pour toutes les notes d’une même page, et elle ne change que si le lecteur ouvre un volet lui-même.',
    apres: '⛔ **Elle SE RESSERRE plutôt que de renoncer**, et la place qui lui reste se MESURE, elle ne se suppose pas. Relevé au navigateur le 8 septembre 2026, en répliquant la structure des deux pages de lecture, les deux volets ouverts : la lecture d’une œuvre laisse 98 px de chaque côté à 1280, 169 à 1440, 281 à 1920 et 475 à 2560 ; la page Bible, 68 · 136 · 238 · 432 ; la lecture en regard, 12 · 83 · 179 · 356. Les deux volets repliés à leur rail, la même œuvre en laisse 329 dès 1280 et 603 à 1920. ⛔ Ce n’est pas la largeur qui suit le CONTENU, que le § 13.13 proscrit : elle suit la PLACE, elle est la même pour toutes les notes d’une même page, et elle ne change que si le lecteur touche à un volet lui-même.',
  },
]

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
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

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

// ⛔ Les DEUX d'abord, l'écriture ensuite : si l'un des deux exemplaires ne porte pas
// exactement les motifs attendus, on n'en corrige aucun.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

// ⚠️ Pas de `process.exit()` : le client Supabase garde des handles, et Windows lève
// une assertion libuv à la sortie forcée (piège déjà consigné).
if (essaiSeul) console.log('Essai seul : rien n’a été écrit.')
else {

writeFileSync(cheminCharte, localApres)

// Verrou optimiste : la ligne ne doit pas avoir bougé depuis la lecture.
const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase. Le fichier local, lui, est corrigé — relancer après avoir tiré le miroir.')
}

// Double relecture : on vérifie que la correction est bien celle qu'on voulait.
const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, avant, apres } of REMPLACEMENTS) {
  if (relue.valeur.includes(avant)) throw new Error(`Relecture : « ${nom} » porte encore l’ancien texte.`)
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
}
