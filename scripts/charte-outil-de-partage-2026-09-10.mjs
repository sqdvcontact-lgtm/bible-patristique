/**
 * Consigne dans la charte, § 51.8 : L'OUTIL DE PARTAGE.
 *
 * Demande de l'auteur du 10 septembre 2026 : « construire l'outil de partage ; il faut
 * que ce soit simple, peu de texte ; simplement, par exemple “CS – Augustin d'Hippone,
 * Les Confessions” ; doit être prévu pour mail, whatsapp, twitter, facebook ».
 *
 * ⛔ Elle RENVERSE une règle que la page d'œuvre portait en commentaire depuis son
 * partage natif — « aucun réseau nommé ici : un site qui envoie chez l'un d'eux choisit
 * à la place du lecteur ». Elle n'a jamais figuré dans la charte ; elle y entre pour
 * dire ce qui la remplace, et pourquoi.
 *
 * ⚠️ Le texte s'AJOUTE par la fin, comme les 139 scripts qui l'ont précédé, et
 * l'invariant l'exige : ce qu'on écrit doit COMMENCER par ce que l'exemplaire porte
 * déjà. Impossible, donc, de tronquer un million de signes par accident.
 * ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-outil-de-partage-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 51.8 L'OUTIL DE PARTAGE — une ligne, et des canaux NOMMÉS

Demande de l'auteur du 10 septembre 2026 : « il faut que ce soit simple, peu de texte ;
simplement, par exemple “CS – Augustin d'Hippone, Les Confessions” ; doit être prévu pour
mail, whatsapp, twitter, facebook ».

⛔ **UNE SEULE LIGNE, LA MÊME PARTOUT, ET COURTE : « CS — QUI, QUOI ».** L'auteur puis son
œuvre, le livre puis son chapitre, la péricope puis sa référence. Elle ne dit que deux
choses — d'où cela vient, et ce que c'est — parce que tout le reste est porté par l'APERÇU
DU LIEN, que chaque messagerie compose elle-même depuis les balises Open Graph de la page.
Le redire dans le message serait l'écrire deux fois. ⛔ Et une formule par genre de page
ferait autant de messages différents pour un seul geste : on ne reconnaîtrait plus la
maison au premier coup d'œil.

⚠️ **Aucun guillemet dans la ligne, pas même autour d'un titre de publication** : la
virgule sépare déjà le qui du quoi, et les guillemets français demandent des fines
insécables qu'aucune messagerie ne garantit de rendre.

⛔ **LES CANAUX SONT NOMMÉS, ET LE LIEN NU GARDE LA PREMIÈRE PLACE.** La page d'une œuvre
s'interdisait jusqu'ici de nommer un réseau — « un site qui envoie chez l'un d'eux choisit
à la place du lecteur » — et se contentait du partage natif du système, ou de la copie du
lien. La règle tombe par décision de l'auteur : le site ne choisit pas à la place du
lecteur, il OUVRE une fenêtre où celui-ci choisit, et le lien nu, qui n'envoie nulle part,
y vient en tête. Six canaux nommés — copier le lien, courriel, WhatsApp, Facebook, X,
Telegram — et, sur un appareil qui en a une, la feuille de partage du système, qui porte
tout ce que cette liste ne nomme pas.

⛔ **LES MARQUES SE DESSINENT AU TRAIT, DANS L'IDIOME DU SITE**, jamais six logos pleins
sur un fond crème : chaque tuile étant NOMMÉE EN TOUTES LETTRES, la reconnaissance est
portée par le mot, et le glyphe n'a plus qu'à seconder. ⛔ Et elles se jugent RASTÉRISÉES
à leur taille servie, agrandies au plus proche voisin : c'est là, et là seulement, qu'on a
vu la croix de X, posée dans un carré arrondi, se lire « fermer » — le contraire de ce que
la tuile propose. Elle est devenue le glyphe nu, épais, d'angle à angle, à bouts francs ;
Facebook garde son carré, un « f » nu ne disant rien.

⚠️ **La fenêtre montre CE QU'ELLE VA ENVOYER** — la ligne, puis l'adresse — et rien
d'autre : ni phrase d'invitation, ni mode d'emploi. Un partage dont on ne voit pas le
message se donne à l'aveugle.

⚠️ **L'adresse partagée est celle qu'on LIT, habits de lecture compris.** On partage la
page telle qu'on l'a sous les yeux ; c'est la canonique, non le partage, qui dit laquelle
fait foi.

⚠️ **FACEBOOK NE PREND QUE L'ADRESSE**, son partageur ayant cessé d'accepter un texte
prérempli en 2017 : la ligne y est perdue, et c'est l'aperçu qui parle seul. Rien à
corriger — c'est à savoir avant de croire à un défaut.

⛔ **ET L'ADRESSE MONTRÉE PORTE SEULE SON INFORMATION : le seuil de 4,5 s'y applique.**
Elle a d'abord été composée dans le gris de l'appareil, qui rend 3,79 sur la surface
blanche de la fenêtre, à onze pixels. Elle prend l'encre du rang au-dessus (5,74 au Clair,
9,27 en Cuir) et se distingue de la ligne par sa taille, sa police et son rang, non par sa
faiblesse. C'est la règle de la mention d'absence de la Polyglotte, prise sur un autre
objet.
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
  if (texte.includes('### 51.8 ')) throw new Error(`[${source}] le § 51.8 y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + SECTION
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = ajouter(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = ajouter(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 51.8.')
}
console.log('Les deux exemplaires portent le § 51.8, et la relecture le confirme.')
