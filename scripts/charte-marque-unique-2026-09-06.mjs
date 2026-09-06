/**
 * § 34 : le site n'a plus qu'UNE marque, et c'est le CHIFFRE. La barre de navigation
 * portait la lettrine gothique, le pied de l'accueil le chiffre didone ; deux marques
 * ne font pas une identité. Décision de l'auteur du 6 septembre 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-marque-unique-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LE SITE N’A QU’UNE MARQUE, ET C’EST LE CHIFFRE'

const REMPLACEMENTS = [
  [
    '**Un CHIFFRE ferme la page d’accueil, et ce n’est pas le monogramme.** Sous le colophon — « en l’An de grâce MMXXVI » — se tenait le fleuron ❧. C’était un CARACTÈRE : son dessin dépendait de la police que le système voulait bien lui donner, il changeait d’une machine à l’autre, et il ne disait rien du site. À sa place vient le chiffre de Corpus Scriptura : le C et le S entrelacés, en capitales didones, gravés pour lui. ⚠️ Ce chiffre n’est PAS le monogramme du frontispice — celui-là est une lettrine gothique, celui-ci une capitale moderne. Deux dessins, deux emplois, deux fichiers, et l’on ne substitue pas l’un à l’autre. Il garde l’or que portait le fleuron : seul le dessin change.',
    [
      '**Un CHIFFRE ferme la page d’accueil.** Sous le colophon — « en l’An de grâce MMXXVI » — se tenait le fleuron ❧. C’était un CARACTÈRE : son dessin dépendait de la police que le système voulait bien lui donner, il changeait d’une machine à l’autre, et il ne disait rien du site. À sa place vient le chiffre de Corpus Scriptura : le C et le S entrelacés, en capitales didones, gravés pour lui. Il garde l’or que portait le fleuron : seul le dessin change.',
      '',
      '⛔ **LE SITE N’A QU’UNE MARQUE, ET C’EST LE CHIFFRE** (décision de l’auteur, 6 septembre 2026). Ce paragraphe disait l’inverse jusqu’à cette date — « ce chiffre n’est PAS le monogramme du frontispice, deux dessins, deux emplois, deux fichiers, et l’on ne substitue pas l’un à l’autre » — et c’était la description exacte du défaut. La lettrine gothique ouvrait chaque page en tête de la barre, le chiffre didone fermait l’accueil ; or deux marques ne font pas une identité, et aucune des deux ne pouvait devenir celle qu’on reconnaît. La barre porte donc le chiffre, et la lettrine passe en réserve, sans quitter le dépôt.',
      '',
      '⚠️ **Une seule planche, deux ENCRES, et rien d’autre ne les distingue.** Au pied de l’accueil le chiffre est d’or sur le papier et ferme un colophon ; en tête de la barre il prend l’encre du NOM et ouvre la page. C’est « on la repose » pris au pied de la lettre, et c’est ce qui permet à une marque unique de vivre sur deux sols sans être redessinée : elle suit le Cuir, dont la barre est maroquin, sans qu’on la décline. ⛔ Jamais une teinte écrite là où l’encre du texte voisin fait l’affaire — la marque appartient alors à la LIGNE au lieu d’y trancher, ce que la charte disait déjà du monogramme lacé dans le titre.',
      '',
      '⚠️ **Une marque LARGE ne se pose pas à la hauteur d’une marque HAUTE.** La lettrine mesure 464 sur 671, le chiffre 535 sur 512 : à hauteur égale, le second pèse un tiers de plus dans la barre la plus disputée du site, qui se replie déjà en quatre crans. Il descend donc d’un cran, et le contrôle est de voir sa hauteur de capitale répondre à celle du nom posé contre elle. ⛔ Cela se juge à l’ŒIL et à la taille RÉELLE, sur une planche qui rejoue la vraie cascade et les deux sols, jamais sur un rapport de dimensions.',
      '',
      '⚠️ **L’ICÔNE D’ONGLET n’a PAS suivi, et c’est une décision qui reste à prendre.** L’onglet, le favori et l’écran d’accueil montrent toujours la lettrine sur son aplat vert. La divergence est réelle ; mais l’aplat tient à seize pixels une silhouette que le chiffre, tout en déliés, n’a pas, et refabriquer une icône est un geste d’auteur.',
    ].join('\n'),
  ],
  [
    '⚠️ Ce qui vaut pour le frontispice ne vaut pas pour la barre de navigation, où la planche crème reste une image : elle y est peinte sur un aplat vert, et non sur le papier.',
    '⚠️ La barre de navigation a fait exception jusqu’au 6 septembre 2026, la planche crème y restant une IMAGE peinte sur un aplat vert ; elle porte depuis lors le chiffre, en masque comme partout ailleurs, et l’exception n’a plus d’objet. Le masque écarte du même coup le piège de l’optimiseur, qui aplatit par intermittence une couche alpha sur du blanc : il n’y a plus d’image du tout.',
  ],
  [
    'elle en est retirée, et il ne lui reste qu’une pose, la barre de navigation.',
    'elle en est retirée, et il ne lui reste alors qu’une pose, la barre de navigation — laquelle lui échappe à son tour le 6 septembre 2026, au profit du chiffre.',
  ],
]

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

let apres = avant
for (const [ancre, texte] of REMPLACEMENTS) {
  const n = apres.split(ancre).length - 1
  if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue — ' + JSON.stringify(ancre.slice(0, 60)))
  apres = apres.split(ancre).join(texte)
}

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_marque_unique'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
// ⚠️ Le contrôle vise la phrase d'AVANT, non les mots que le texte neuf reprend pour
// dire d'où l'on vient : un contrôle réglé sur eux s'alarmerait de sa propre écriture.
if (relu.valeur.includes('**Un CHIFFRE ferme la page d’accueil, et ce n’est pas le monogramme.**')) throw new Error('relecture : la règle d’avant subsiste.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
