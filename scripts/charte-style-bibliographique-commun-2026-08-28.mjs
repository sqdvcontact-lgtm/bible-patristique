/**
 * § 35.6 : un SEUL style bibliographique, et il vient de la donnée.
 *
 * Décisions de l'auteur du 28 août 2026, valant pour toutes les bibliographies
 * de l'apparat — « Du même auteur », toute pièce « Bibliographie », tout bloc
 * déclaré bibliographique :
 *
 *  1. le retrait de première ligne devient un RETRAIT SUSPENDU : la première
 *     ligne part du bord, les suivantes rentrent légèrement ;
 *  2. le corps se règle sur le texte de l'apparat, non sur le corps courant ;
 *  3. le genre ne se lit JAMAIS dans le texte du titre, et aucun style ne porte
 *     le nom d'une pièce, d'une édition ou d'un auteur ;
 *  4. le vocabulaire des styles de caractère est nommé et clos, la ponctuation
 *     n'en a aucun ;
 *  5. une bibliographie déclarée mais non structurée garde le même cadre, et
 *     l'on n'en déduit rien par analyse de son contenu.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-style-bibliographique-commun-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const SECTION = [
  '### 35.6.2. Un seul style bibliographique, et il vient de la donnée',
  'Toutes les bibliographies de l’apparat se composent de la même manière : la pièce « Du même auteur », toute pièce ou section « Bibliographie », et tout bloc que la donnée déclare bibliographique. Une seule famille de styles les sert, et l’édition, l’auteur et l’intitulé de la pièce n’y changent rien.',
  '⛔ **Le genre ne se lit jamais dans le texte du titre.** « Du même auteur », « Bibliographie », « Ouvrages consultés » nomment des PIÈCES, non des compositions : le style vient de `presentation.style = bibliographie`, de la liste bibliographique structurée que la pièce porte, ou d’un rôle équivalent déjà présent dans la donnée. ⛔ Aucun style ne prend le nom d’une pièce, d’une édition ni d’un auteur — ni `du-meme-auteur`, ni `bibliographie-fillion`, ni `bibliographie-genese`.',
  '**Le titre de la pièce n’est pas concerné.** « Du même auteur » ou « Bibliographie » reste un véritable titre de pièce ou de section et garde son rang dans la hiérarchie de l’apparat. ⛔ Il ne reçoit pas le style `bibliographie`, réservé aux notices placées dessous.',
  '**Le vocabulaire de la donnée est court, stable et CLOS.** `bibliographie` désigne le paragraphe d’une notice bibliographique. Pour les fragments d’une notice structurée, et seulement lorsqu’ils répondent d’une fonction bibliographique réelle : `bibliographie-titre-ouvrage` pour le titre de l’ouvrage (italique), `bibliographie-sous-titre` pour le sous-titre (italique), `bibliographie-auteur` pour l’auteur affiché (romain) avec `bibliographie-nom-auteur` pour le nom de famille en petites capitales, et `bibliographie-donnees` pour le lieu, l’éditeur, l’année et les autres données retenues (romain). ⛔ **La ponctuation n’a aucun style propre** : elle appartient à la séquence où elle tombe et en hérite — le deux-points qui joint le titre au sous-titre reste ainsi dans l’italique du titre.',
  '**Une bibliographie se distingue du texte courant sans devenir un encadré** : un corps légèrement inférieur au texte de l’apparat, un interligne modérément resserré, l’alignement à gauche, un blanc discret entre deux notices, le retrait suspendu, et la largeur normale de la colonne — ⛔ jamais un bloc artificiellement étroit. ⛔ Aucun fond, aucune bordure, aucune puce, aucun tiret ajouté par la feuille : la ponctuation et les séparateurs sont produits à partir des champs structurés, jamais par le style.',
  '**Sur une mesure étroite**, le retrait suspendu se réduit pour ne pas comprimer la ligne ; ⛔ il ne disparaît pas, et le corps ne rapetisse pas davantage : la hiérarchie bibliographique tient à l’un et à l’autre.',
  '**Repli historique.** Une bibliographie que la donnée déclare mais qui n’est pas encore structurée prend le même cadre typographique général. ⛔ On n’en déduit ni titre, ni auteur, ni éditeur par analyse de son contenu : elle reste un paragraphe, dans le cadre de la famille, et l’on se contente de lui attribuer `presentation.style = bibliographie`.',
].join('\n\n')

const REMPLACEMENTS = [
  {
    nom: 'retrait suspendu (§ 35.6)',
    avant: 'avec le retrait de première ligne des bibliographies imprimées, un blanc très fin entre l’annonce et la première entrée',
    apres: 'avec le retrait suspendu des bibliographies imprimées — la première ligne au bord, les suivantes légèrement rentrées —, un blanc très fin entre l’annonce et la première entrée',
  },
  {
    nom: 'retrait suspendu et corps (§ 35.6.1)',
    avant: 'alignement à gauche, retrait de première ligne des bibliographies imprimées, blanc léger entre deux références, et un corps légèrement inférieur au corps courant.',
    apres: 'alignement à gauche, retrait suspendu, blanc léger entre deux références, et un corps légèrement inférieur au texte de l’apparat. ⚠️ Le retrait suspendu remplace le retrait de première ligne prescrit jusque-là (décision de l’auteur du 28 août 2026).',
  },
  {
    nom: 'section 35.6.2',
    avant: '### 35.7. Les guillemets d’une citation en langue étrangère restent en romain',
    apres: `${SECTION}\n\n### 35.7. Les guillemets d’une citation en langue étrangère restent en romain`,
  },
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
for (const { nom, avant, apres } of REMPLACEMENTS) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`motif « ${nom} » : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(avant).join(apres)
}
console.log(JSON.stringify({
  avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length,
  essai_seul: essaiSeul,
}, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
