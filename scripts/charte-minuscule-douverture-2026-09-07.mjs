/**
 * Ajoute à la charte le § 3.10 : une minuscule d’ouverture — émendation ou défaut d’import.
 *
 * Décision de l’auteur du 7 septembre 2026 : les minuscules d’ouverture d’une édition
 * ancienne ne se conservent pas, elles se corrigent, cas par cas, par la capitale ou par
 * le point-virgule. La règle porte AUSSI ce que la mesure a établi le même jour — que la
 * même forme, ailleurs dans le corpus, n’est pas la ponctuation d’un imprimé de 1604 mais
 * un défaut d’import, où corriger effacerait la trace du défaut (§ 12.2).
 *
 * Le § 12.2 est amendé du même geste, pour que les deux ne se contredisent pas.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia` —
 * avec la même table de remplacements. ⛔ Le script REFUSE d’écrire si un motif ne se
 * trouve pas exactement une fois dans chacun.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains.
 *
 * Usage : node scripts/charte-minuscule-douverture-2026-09-07.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = [
  '### 3.10 Une minuscule d’ouverture : émendation ou défaut d’import',
  '',
  'Décision de l’auteur, 7 septembre 2026. Une édition ancienne ouvre souvent une phrase par une minuscule, le point y marquant une respiration rhétorique plutôt qu’une fin de période. **Cette forme ne se conserve pas.** Elle se corrige, de deux façons et jamais d’une troisième : la CAPITALE portée à l’initiale, ou le POINT-VIRGULE mis à la place du point, la minuscule étant alors gardée. C’est une émendation typographique au sens du § 14.3, non une modernisation de la langue au sens du § 1.1 : ni le vocabulaire, ni les désinences, ni la syntaxe, ni l’orthographe historique ne sont touchés.',
  '',
  '⛔ **L’arbitrage est CAS PAR CAS, jamais une règle passée sur un texte entier.** Aucun critère mécanique ne distingue la période qui s’achève de celle qui se poursuit ; seule la lecture le fait. Un relevé peut proposer, il ne décide pas.',
  '',
  '⛔ **Après `?` ou `!`, seule la capitale est possible** : un point-virgule y ferait perdre l’interrogation ou l’exclamation.',
  '',
  '⚠️ **On ne touche pas à une minuscule qui suit une ponctuation FAIBLE.** Après une virgule, un deux-points ou un point-virgule, la minuscule est correcte, en 1604 comme aujourd’hui : la phrase continue, et il n’y a rien à corriger. Relevé sur le *Discours 38* (Morel 1604) : des 60 segments qui ouvrent en minuscule, **30 sont dans ce cas**, soit la moitié du relevé brut. Un chantier qu’on ne borne pas d’abord est deux fois plus gros qu’il n’est.',
  '',
  '⛔ **Un point d’abréviation n’est pas une fin de phrase.** « ceste victime esgalle d’aage à N. S. sacrifié auparavant la nouvelle hostie » : `N. S.` est *Nostre Seigneur*, et « sacrifié » un participe ; capitaliser y casserait la phrase. ⚠️ Et la garde se borne à la CAPITALE ISOLÉE : un mot court capitalisé — « se cacha de devant Dieu. », « le retour au premier Adam. » — ferme une vraie phrase, et l’écarter ferait manquer trois corrections légitimes sur le seul *Discours 38*.',
  '',
  '**Une émendation n’est pas une réparation d’import.** Avant de corriger, on établit lequel des deux on regarde, et cela ne se devine pas au premier segment venu.',
  '',
  'Le test est INTERNE au segment : on compte ce que l’édition fait, à l’intérieur d’un même segment, après une ponctuation forte. Si elle y met tantôt la capitale et tantôt la minuscule, c’est son habitude, la minuscule d’ouverture est attestée, et l’émendation est un choix éditorial. Mesuré sur le *Discours 38* : **14 capitales contre 15 minuscules** sur 29 occurrences internes. L’édition fait les deux, délibérément.',
  '',
  '⛔ **Si l’édition met la capitale à l’intérieur et jamais en tête de segment, la minuscule ne vient pas d’elle.** C’est l’import qui a retiré quelque chose, et corriger effacerait la trace du défaut au lieu de le réparer — ce que le § 12.2 interdit. Relevé le 7 septembre 2026, la *Somme théologique* porte **1 757** segments dans ce cas, pour une traduction de 1984 qui n’a aucune raison d’avoir la ponctuation d’un imprimé de 1604 : c’est la formule du *sed contra* qui a sauté à l’import, et le compte le prouve — **103 segments portent encore « En sens contraire » ou « Cependant », 1 815 ouvrent en minuscule**. Ces cas se RÉPARENT, ils ne se capitalisent pas.',
  '',
  '⚠️ **Le corpus porte les deux familles ensemble**, et il faut les séparer avant tout geste. Au 7 septembre 2026, minuscules ouvrant après une ponctuation forte : *Somme théologique* 1 757, Heptateuque latin de Zycha 289, Homélies sur la Genèse (Jeannin) 157, Confessions françaises 35, Cité de Dieu latine 32, *Discours 38* (Morel) 30. Un même geste passé sur les six serait juste une fois et faux cinq fois.',
  '',
  '**La leçon d’origine se conserve**, selon le § 14.3 : la correction retenue et la leçon imprimée restent distinctes, et une émendation discutable porte sa note éditoriale. ⛔ Une passe de correction qui ne laisserait aucune trace de ce qu’elle a changé n’est pas une émendation, c’est une perte.',
  '',
  '',
]

const REMPLACEMENTS = [
  {
    nom: '§ 3.10 — une minuscule d’ouverture (section neuve)',
    avant: '## 4. Lacunes, absences et alignement biblique',
    apres: SECTION.join('\n') + '## 4. Lacunes, absences et alignement biblique',
  },
  {
    nom: '§ 12.2 — renvoi vers le § 3.10',
    avant: 'l’effacer détruirait la preuve au lieu du défaut.',
    apres: 'l’effacer détruirait la preuve au lieu du défaut. ⚠️ Une fois le rendu juste, corriger cette même minuscule redevient possible ; mais c’est alors une émendation délibérée, arbitrée cas par cas, et elle relève du § 3.10.',
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

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

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
for (const { nom, apres } of REMPLACEMENTS) {
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
