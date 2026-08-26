/**
 * Reprend le § 35.9 de la charte : le repère de commentaire ne se pose plus dans
 * un cadre carré mais en MANCHETTE — rien ne le délimite qu'un blanc, sa boîte
 * épouse son texte, et sa première ligne tombe sur celle du commentaire.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` : la doctrine n'a qu'une source, et
 * `charte/CHARTE_IA.md` s'en régénère (`synchroniser-charte-supabase.mjs --pull`).
 * Refuse d'écrire si un motif ne se trouve pas exactement une fois.
 *
 * Usage : node scripts/charte-manchette-repere-commentaire-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: 'titre du § 35.9',
    avant: '### 35.9. Le repère d’un commentaire se pose en cartouche',
    apres: '### 35.9. Le repère d’un commentaire se pose en manchette',
  },
  {
    nom: 'la disposition',
    avant: 'Il se pose dans un petit cadre carré, au fer à gauche, que le commentaire habille comme le texte habille une lettrine.',
    apres: 'Il se pose en manchette, au fer à gauche, et le commentaire l’habille comme le texte habille une lettrine.',
  },
  {
    nom: 'ni filet ni cadre, et la forme vient du texte',
    avant: 'Le cadre est un FILET, jamais un fond teinté ni une couleur d’alerte : un commentaire d’édition n’avertit de rien. Le repère s’y compose centré et sans césure — sur une ligne de dix-sept signes, elle le hacherait plus qu’elle ne le rangerait — dans l’encre du texte second : encadré, il n’a plus besoin de s’effacer pour tenir sa place.',
    apres: [
      '⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme. Le sans-serif et le demi-gras la détachent assez du serif justifié qui l’entoure, et elle se compose dans l’encre du texte second — détachée du fil, elle n’a plus besoin de s’effacer pour tenir sa place. ⛔ Aucune césure : sur une ligne de dix-sept signes, elle hacherait le repère plus qu’elle ne le rangerait.',
      '',
      'La boîte n’a pas de taille imposée : elle épouse son texte et ne s’arrête qu’à la colonne de manchette, si bien qu’un repère d’un mot n’ouvre aucun vide à sa droite et qu’un repère de six lignes descend d’autant. Sa première ligne tombe sur la première ligne du commentaire, parce qu’elle prend la GRILLE du corps du paratexte au lieu de sa propre conduite. ⚠️ Mesuré, non deviné : à hauteur de ligne égale, Source Sans et Source Serif partagent ici leur ligne de base, et il n’y a aucune descente à compenser ; toute autre valeur de conduite en demanderait une. La manchette n’a pas davantage de marge basse : elle occupe des lignes entières, et le texte reprend pleine mesure à la ligne suivante.',
    ].join('\n'),
  },
  {
    nom: 'les gardes-fous',
    avant: 'Deux gardes-fous. Sur une mesure étroite, où le carré ne laisserait qu’une vingtaine de signes par ligne et creuserait le justifié de lézardes, le repère reprend toute la mesure en bandeau et le texte le suit au lieu de l’habiller. Et le bloc contient son flottant, faute de quoi un commentaire plus court que le carré le laisserait déborder sur ce qui suit.',
    apres: 'Deux gardes-fous. Sur une mesure étroite, où la manchette ne laisserait au commentaire qu’une trentaine de signes par ligne et creuserait le justifié de lézardes, le repère reprend toute la mesure et le texte le suit au lieu de l’habiller. Et le bloc contient son flottant, faute de quoi un commentaire plus court que sa manchette la laisserait déborder sur ce qui suit.',
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

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error

const avant = data.valeur
const apres = appliquer(avant)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Le § 35.9 dit la manchette. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
