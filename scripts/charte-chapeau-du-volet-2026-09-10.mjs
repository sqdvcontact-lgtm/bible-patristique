/**
 * Consigne dans la charte deux décisions de l'auteur du 10 septembre 2026 :
 *   § 38.26.2  L'ŒUVRE est en TÊTE du volet, et son TITRE ouvre la fiche.
 *   § 38.27    Le mode de lecture par DÉFAUT est le FRANÇAIS SEUL.
 *
 * La première vient d'un choix fait sur planche, cinq présentations du chapeau mises en
 * regard : « Le D. Mais sans la flèche à côté du nom de l'auteur ; et le titre de l'œuvre
 * doit être cliquable. » La seconde d'une demande du même jour : « j'aimerais que le texte
 * par défaut soit français seul ».
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-chapeau-du-volet-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
#### 38.26.2 L'ŒUVRE est en TÊTE du volet, et son TITRE ouvre la fiche

Choix de l'auteur, le 10 septembre 2026, cinq présentations du chapeau mises en regard sur
planche : « Le D. Mais sans la flèche à côté du nom de l'auteur ; et le titre de l'œuvre doit
être cliquable. »

⛔ **CE QU'ON LIT PASSE AVANT QUI L'A ÉCRIT.** Le chapeau empilait trois lignes — le nom de
l'auteur, le titre de l'œuvre, un lien « À propos de cette édition » — et la première était le
seul mot coloré de l'écran : l'œil tombait sur « Augustin d'Hippone » quand on venait lire *La
Cité de Dieu*. Il en reste DEUX : le titre, puis l'auteur en ligne de crédit, en petit corps.

⛔ **LE TITRE PORTE LA FICHE, ET LE LIEN S'EFFACE.** Une ligne entière de phrase soulignée
n'a plus à dire ce que le titre dit déjà : c'est lui qu'on clique. ⚠️ La règle du 3 septembre
— « un lien nomme sa destination » — n'est pas défaite pour autant, elle passe dans
l'infobulle, le libellé du lien étant devenu le titre même de l'œuvre. ⛔ Une édition dont il
n'y a rien à dire n'ouvre aucune fiche : le titre se compose alors à l'identique, sans clic ni
soulignement.

⚠️ **Le titre se compose comme un TITRE, jamais comme un lien** : la serif du site, l'encre du
texte, rien de vert. Ce qui annonce le clic est le SURVOL, qui souligne — la même annonce, et
la seule, que porte le nom d'auteur depuis le 31 août.

⛔ **PLUS DE FLÈCHE SOUS LE TITRE.** Elle avait été demandée le 4 septembre pour dire qu'une
fiche se tenait derrière un nom, et elle demeure là où elle a été posée : en TÊTE, sur la page
Bible, où la traduction est bien ce que le volet nomme d'abord. Elle quitte le crédit d'auteur,
qui n'est plus en tête : une flèche annonce au premier regard, elle n'annonce plus rien sous
une ligne de crédit.

⚠️ **La mesure de la rangée d'actions ne bouge pas** (§ 38.26 et § 38.26.1) : ce qui dispute la
place au chapeau est désormais le TITRE, et la règle vaut pour lui comme elle valait pour le nom
de l'auteur — le texte ne se coupe pas, c'est la rangée qui cède tout entière sous le ⋮ quand la
place manque. L'écrêtage par la fin ne sert que le cas extrême, où même la rangée condensée ne
laisse pas de quoi lire.

⚠️ **Et la VISITE se relit avec l'écran** : elle nommait « un lien, sous le titre », qui
n'existe plus. Une refonte de surface se paie d'une relecture du scénario qui la montre.

### 38.27 Le mode de lecture par DÉFAUT est le FRANÇAIS SEUL, et un choix ne survit pas à la visite

Demande de l'auteur, le 10 septembre 2026 : « j'aimerais que le texte par défaut soit français
seul ».

⛔ **UNE PRÉFÉRENCE SANS FIN N'EST PLUS UNE PRÉFÉRENCE.** Le mode de lecture d'une œuvre se
gardait dans \`localStorage\`, c'est-à-dire sans terme : une œuvre ouverte une fois en « Français
& Latin » se rouvrait en deux colonnes des semaines plus tard, et rien à l'écran ne disait d'où
venait ce choix — le volet montrait un mode que le lecteur n'avait pas demandé ce jour-là. Le
choix vit désormais dans \`sessionStorage\` : il tient le temps qu'on lit, d'un chapitre à l'autre
et d'une page du site à l'autre, il tombe quand le navigateur se referme.

⚠️ **Un lien qui NOMME le mode l'emporte toujours.** \`?mt=bilingue\` et \`?mt=la\` ouvrent l'œuvre
exactement dans le mode demandé : un favori posé sur le texte original ne se retrouve pas
autrement.

⛔ **ET UNE CLÉ QUE PLUS RIEN N'ÉCRIT NE SE LIT PLUS.** \`cs_bilingue_<œuvre>\`, vestige d'une
écriture antérieure, dormait encore dans les navigateurs qui l'avaient reçue et y rouvrait le
bilingue à elle seule, sans que le lecteur pût la défaire autrement qu'en choisissant
« Français » une fois de plus.
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
  if (texte.includes('#### 38.26.2 ')) throw new Error(`[${source}] le § 38.26.2 y est déjà.`)
  if (texte.includes('### 38.27 ')) throw new Error(`[${source}] le § 38.27 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 38.27.')
}
console.log('Les deux exemplaires portent les § 38.26.2 et 38.27, et la relecture le confirme.')
