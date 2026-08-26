/**
 * Reprend le § 35.9 : la manchette se compose en PAVÉ — justifiée, dernière ligne
 * ferrée à droite, conduite serrée, césure admise — et son blanc du bas rejoint
 * celui de sa droite, à ceci près que la grille le quantifie.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; `charte/CHARTE_IA.md` s'en régénère
 * (`synchroniser-charte-supabase.mjs --pull`).
 *
 * Usage : node scripts/charte-manchette-pave-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: 'la césure n’est plus refusée',
    avant: ' ⛔ Aucune césure : sur une ligne de dix-sept signes, elle hacherait le repère plus qu’elle ne le rangerait.',
    apres: '',
  },
  {
    nom: 'le pavé, sa ligne de base et son blanc',
    avant: 'Manchette de gauche, elle se ferre à DROITE, contre la gouttière : son bord net longe ainsi le fer du commentaire, et ce sont ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas. Ses lignes s’égalisent enfin, pour ne pas laisser une veuve d’un mot contre ce bord. Sa première ligne tombe sur la première ligne du commentaire, parce qu’elle prend la GRILLE du corps du paratexte au lieu de sa propre conduite. ⚠️ Mesuré, non deviné : à hauteur de ligne égale, Source Sans et Source Serif partagent ici leur ligne de base, et il n’y a aucune descente à compenser ; toute autre valeur de conduite en demanderait une. La manchette n’a pas davantage de marge basse : elle occupe des lignes entières, et le texte reprend pleine mesure à la ligne suivante.',
    apres: [
      'Elle se compose en PAVÉ : justifiée comme le commentaire qu’elle ouvre, sa dernière ligne ferrée à droite pour que son bord longe le fer du texte, et d’une conduite serrée, plus courte que celle du commentaire, qui la fait tenir en bloc au lieu de s’étaler. Ce sont alors ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas. ⚠️ La césure entre ici pour la raison même qui la faisait refuser ailleurs : sur dix-sept signes, c’est elle qui rend ce justifié tenable, là où elle hacherait un repère ferré.',
      '',
      'Sa première ligne tombe sur la première ligne du commentaire. La conduite serrée lui prenait cette ligne de base ; une marge haute la lui rend, ⚠️ mesurée et non calculée — deux pixels à cette conduite, zéro lorsque les deux conduites sont égales.',
      '',
      'Le blanc du bas vaut celui de la droite : la manchette est cernée du même blanc sur ses deux côtés libres. ⚠️ Il ne se règle pas à la même valeur pour autant. En bas, c’est la GRILLE qui fait le blanc — le texte laisse une ligne entière avant de reprendre pleine mesure — et la marge ne sert qu’à la déclencher. Portée à la valeur de la gouttière, elle en déclenchait deux partout où la conduite serrée du repère tombait juste sous une ligne du commentaire.',
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

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error

const avant = data.valeur
const apres = appliquer(avant)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Le § 35.9 dit le pavé. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
