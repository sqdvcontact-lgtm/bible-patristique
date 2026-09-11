/**
 * Consigne le § 13.18 de la charte — CE QUE LE RENDU D'UNE NOTE LIT, ET LA LIGNE DE LA
 * CITATION VISÉE — et, au carnet, le relevé qui l'a fondé.
 *
 * Mission de l'auteur du 11 septembre 2026, sur la note I-02 de la Consolation : la base
 * portait déjà la bonne structure, et le rendu fusionnait encore la citation visée avec
 * la référence d'Ovide. La RÈGLE va à la charte ; la MESURE, le récit et ce qui reste vont
 * au carnet (AGENTS.md, « le journal de chantier ne va pas dans la charte »).
 *
 * ⚠️ Les deux textes s'AJOUTENT par la fin, et l'invariant l'exige : ce qu'on écrit doit
 * COMMENCER par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 * ⛔ Rien ne s'écrit si un miroir diffère de Supabase : ajouter aux deux ne ferait que
 * conserver leur écart.
 *
 * Usage : node scripts/charte-citation-visee-2026-09-11.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 13.18 Ce que le RENDU d'une note lit, et la ligne de la citation visée

Mission de l'auteur du 11 septembre 2026, sur la note I-02 de la *Consolation de la
philosophie* : la base portait déjà la bonne structure, et le rendu fusionnait encore la
citation visée avec la référence d'Ovide. Le relevé est au carnet.

⛔ **LE TEXTE LU EST LA COLONNE \`text\`, ET ELLE SEULE.** \`metadata.text\`,
\`source_text_preserved\`, \`pass10_previous_text\`, \`citation_reference_previous_fused_text\`
et \`source_reference_original\` sont des traces documentaires : ils gardent ce que le bloc
disait avant une correction. Le chargeur ne les projette pas vers l'affichage, et aucun ne
sert jamais de texte à l'écran. Le rendu lit \`text\`, \`kind\`, \`form\`, \`language\`,
\`rendering\` et la disposition déclarée (\`metadata.citation_layout\`), dans l'ordre de
\`rank\`.

⛔ **LA CITATION VISÉE N'OUVRE QUE LA LIGNE D'UN PROPOS.** C'est la lecture que le rendu fait
des §§ 13.11 et 13.16.3, et elle ne laisse aucun cas au hasard :

- en prose, devant un commentaire, elle ouvre sa ligne, à la teinte et à la mesure du
  texte : « « Mais quoi ! celui-ci ? » C'est-à-dire un disciple de Zénon et de Platon. » se
  lit d'un trait ;
- devant une référence, une attribution ou une citation, elle fait unité à elle seule, et
  ce qui la suit descend d'une ligne. Collée à « ++Ovide++, *Pontiques*, I, 4 : », la phrase
  de Boèce se lisait comme une phrase d'Ovide ;
- en vers, elle fait toujours unité : ses retours à la ligne ne tiennent pas dans la ligne
  d'un propos. Elle garde ses lignes, en boîtes, avec leur retrait de suite, mais part du
  FER de la note : elle n'est pas une citation sortie.

⛔ **L'ITALIQUE D'UN BLOC DIT LA LANGUE, ET RIEN D'AUTRE**, comme le § 13.16.3 le prescrit :
latin en italique, toute autre langue en romain, quelles que soient la nature et la
disposition. **Ce paragraphe remplace ce que le § 13.11.2 disait encore de l'italique de
la reprise.** ⚠️ Un renvoi posé en ligne dans un bloc latin ne prend pas son italique : un
nom d'auteur n'est pas du latin. La même règle vaut pour l'extraction en document Word.

⛔ **LA DISPOSITION SE LIT DANS LA DONNÉE, AVANT LA FORME ET LA NATURE.**
\`citation_layout = block\` sort la citation du fil, \`inline\` l'y garde. Une traduction qui
ne déclare rien prend la disposition de son original : les deux forment un même groupe
citationnel. Sans déclaration, un vers se détache, une traduction aussi. Une citation
visée n'est jamais sortie.

⛔ **LA NATURE ET LA DISPOSITION SONT DEUX AXES.** On ne change pas un \`lemma\`, une
\`translation\` ou une \`reference\` d'une autre nature pour obtenir un style : on déclare la
disposition.

⛔ **UN CONTRÔLE DE NOTE SE FAIT SUR LE RENDU, JAMAIS SUR LA SEULE BASE.** La donnée juste
ne prouve rien de ce qu'on lit : le contrôle charge chaque note par le chargeur de la page,
la rend par le composant de la page, relit ce qui en sort, et se termine dans l'interface
réellement servie.
`

const ENTREE = `
### 2026-09-11 — Boèce, note I-02 : la citation visée que le rendu fusionnait, et ce que la mesure a compté

La base portait déjà la bonne structure de la note I-02 : la citation visée, la référence
d'Ovide, le latin d'Ovide, sa traduction. La page montrait pourtant « « Hélas ! avant le
temps, le malheur m'a fait vieux. » Ovide, *Pontiques*, I, 4, vers 1-2 et 19-20 : » sur une
seule ligne, et la phrase de Boèce en italique. La donnée était juste : c'est le composant
de rendu des notes (\`ContenuNoteStructuree\`) qui posait toute citation visée en tête du
bloc suivant, l'italisait pour sa nature, et ignorait \`citation_layout\`.

**Le chemin de lecture, tracé.** \`texte_note_blocs\` est lu par \`chargerNotesStructurees\`,
trié par \`note_key\` puis \`rank\`, paginé ; \`metadata\` n'en sort que projetée sur des
scalaires (\`lireMetadonneesBlocNote\`), et aucune trace documentaire n'atteint le
composant. La page d'une œuvre n'a ni cache ni rendu statique. La fusion était dans le
composant, et nulle part ailleurs.

**Ce que suivent les 126 citations visées de la Consolation** : un commentaire 97 fois
(75 en prose, 22 en vers), une référence 28 fois (21 en prose, 7 en vers), une attribution
une fois (III-05).

**Relevé du rendu avant correction**, par le vrai chargeur et le vrai composant
(\`tmp/controle-rendu-notes-boece.mts\`) : 29 citations visées fondues dans une référence ou
une attribution, dont les sept notes que la mission nommait (I-02, I-15, II-15, III-08,
IV-22, V-02, V-17) ; les 29 citations visées en vers privées de leurs retours à la ligne ;
les 126 en italique alors qu'elles sont françaises ; 51 citations en prose déclarées
sorties (35 grecques, 16 latines) laissées au fil quand leur traduction sortait.

**Après correction** : 235 notes, 693 blocs, 609 unités rendues, 75 groupes original et
traduction, aucune anomalie. Ordre de \`rank\` partout, aucune trace documentaire à l'écran,
aucun guillemet extérieur autour d'une citation sortie, aucune capitale pleine. Les
citations documentaires de l'Introduction (Cassiodore, Virgile, Raynouard) gardent leur
référence en tête, terminée par deux-points.

⚠️ **Un premier jet avait séparé les 126 citations visées**, et c'était aller au-delà de la
mission et contre le § 13.11 : devant un commentaire, la charte garde la citation visée sur
la ligne du propos. Seules faisaient défaut les 29 qui précèdent une référence ou une
attribution, et les 29 en vers.

⚠️ **Ce qui reste, et c'est de la donnée** : III-16 range ses deux originaux grecs avant
leurs deux traductions ; le rendu suit \`rank\` et ne réordonne pas.
`

const EXEMPLAIRES = [
  { cle: 'charte_ia', fichier: resolve(racine, 'charte', 'CHARTE_IA.md'), ajout: SECTION, marque: '### 13.18 ' },
  { cle: 'carnet_ia', fichier: resolve(racine, 'charte', 'CARNET_IA.md'), ajout: ENTREE, marque: '### 2026-09-11 — Boèce, note I-02' },
]

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/** ⛔ L'INVARIANT : on n'écrit QUE par la fin, et jamais sur ce qui est déjà là. */
function ajouter(texte, ajout, marque, source) {
  if (texte.includes(marque)) throw new Error(`[${source}] « ${marque.trim()} » y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + ajout
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const plans = []
for (const ex of EXEMPLAIRES) {
  const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', ex.cle).single()
  if (error) throw error
  const localAvant = readFileSync(ex.fichier, 'utf8')
  plans.push({
    ...ex,
    data,
    identiques: localAvant.trimEnd() === data.valeur.trimEnd(),
    localApres: ajouter(localAvant, ex.ajout, ex.marque, `${ex.cle}, fichier local`),
    distantApres: ajouter(data.valeur, ex.ajout, ex.marque, `${ex.cle}, Supabase`),
    tailles: { local: localAvant.length, supabase: data.valeur.length },
  })
}

console.log(JSON.stringify(plans.map(p => ({
  cle: p.cle, identiques_avant: p.identiques, avant: p.tailles,
  apres: { local: p.localApres.length, supabase: p.distantApres.length }, mis_a_jour: p.data.mis_a_jour,
})), null, 2))

if (plans.some(p => !p.identiques)) {
  throw new Error('Un miroir diffère de Supabase : le tirer d’abord (synchroniser-charte-supabase.mjs --pull). Rien n’a été écrit.')
}

if (essaiSeul) {
  console.log('Essai seul : rien n’a été écrit.')
} else {
  for (const p of plans) {
    const { data: ecrite, error } = await db
      .from('parametres')
      .update({ valeur: p.distantApres, mis_a_jour: new Date().toISOString() })
      .eq('cle', p.cle)
      .eq('mis_a_jour', p.data.mis_a_jour)
      .select('mis_a_jour')
    if (error) throw error
    if (!ecrite || ecrite.length !== 1) {
      throw new Error(`[${p.cle}] a changé entre la lecture et l’écriture : rien n’a été écrit pour lui.`)
    }
    writeFileSync(p.fichier, p.localApres)
    const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', p.cle).single()
    if (erreurRelecture) throw erreurRelecture
    if (!relue.valeur.trimEnd().endsWith(p.ajout.trimEnd())) {
      throw new Error(`[${p.cle}] relecture : l’exemplaire distant ne se termine pas par l’ajout.`)
    }
    console.log(`[${p.cle}] écrit dans Supabase et dans le miroir, et relu.`)
  }
}
