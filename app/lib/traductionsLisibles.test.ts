import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// La garde des COLONNES DE TRADUCTION — le cinquième axe.
//
// `versets_lecture` porte une colonne par bible matérialisée. Nommer dans un `select`
// une colonne qui n'existe pas fait échouer la requête ENTIÈRE : PostgREST rend 400,
// « column versets_lecture.TR0009 does not exist », et `data` est nul. Rien ne paraît,
// rien ne se journalise, et la page se vide en silence.
//
// Ce n'est pas une hypothèse, c'est arrivé DEUX fois :
//   · en août 2026, l'apparat biblique de toutes les œuvres — chaque renvoi retombait
//     sur son identifiant canonique brut (« JOB.1.7 »), sans texte ;
//   · et, du 3 août au 28 août 2026, les onglets Bible et Polyglotte de la RECHERCHE,
//     qui n'ont plus rendu un seul verset le jour où TR0009 est entrée dans
//     `traductions`. Personne ne l'a vu, parce qu'une recherche sans résultat ressemble
//     à une recherche sans résultat.
//
// Le remède existe depuis la première fois : `codesTraductionsLecture` (app/lib/
// traductions.ts) sonde les colonnes réelles de la vue et n'en garde que ce qui s'y
// trouve. Il se corrige tout seul quand une bible est matérialisée. Il n'était
// simplement pas appelé partout.
//
// La garde : tout `select` de `versets_lecture` dont la liste de colonnes est
// CALCULÉE — une variable, ou un gabarit qui interpole — doit venir d'un fichier qui
// emploie ce filtre. Un `select` à colonnes ÉCRITES (`'id_verset, ref, TR0001'`) ne
// risque rien : une colonne fausse s'y verrait à la lecture.

const RACINE = join(import.meta.dirname, '..')
const DOSSIERS_EXEMPTS = ['quiz']

/**
 * Les lectures à colonnes calculées qui ne passent PAS encore par le filtre, chacune
 * avec sa raison. ⛔ On GÈLE, on ne rabat pas : cette liste ne peut que DÉCROÎTRE, et
 * un fichier corrigé doit en être RETIRÉ, faute de quoi le registre ment sur la dette.
 * ⛔ N'y ajouter une ligne qu'en sachant ce qu'on accepte : une page qui se vide.
 */
export const LECTURES_NON_FILTREES: Record<string, string> = {
  // `tradCode` vient de TRADUCTIONS_BIBLE, une table ÉCRITE À LA MAIN de cinq codes
  // (app/lib/pericopes.ts). Elle ne peut donc pas nommer TR0009 aujourd'hui — mais
  // c'est exactement le genre de table dont la charte dit qu'elle dérive, et le jour
  // où l'on y ajoutera une bible sans vérifier la vue, la page de péricope se videra.
  'lib/pericopes.ts': 'liste écrite à la main (TRADUCTIONS_BIBLE), à dériver de la vue',
  // ⚠️ Celui-ci est un défaut RÉEL, déjà consigné dans AGENTS.md (« Reste à
  // surveiller ») : le menu liste TOUTES les traductions, et en choisir une qui n'est
  // pas matérialisée fait échouer la requête. Il attend sa correction.
  'lib/SelecteurCitation.tsx': 'liste toutes les traductions, sans filtrer par la vue',
  // Écran d'ATELIER : on y désigne délibérément la traduction sur laquelle on travaille,
  // et la boucle lit son `error`, donc l'échec se voit. Le risque n'est pas le même que
  // sur une page de lecture, où la requête tombe en silence.
  'admin/SectionTraductions.tsx': 'admin, traduction désignée à la main et erreur lue',
}

function fichiersSource(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersSource(complet, chemins)
    else if (/\.tsx?$/.test(entree) && !/\.test\./.test(entree)) chemins.push(complet)
  }
  return chemins
}

function surveilles(): { relatif: string; source: string }[] {
  return fichiersSource(RACINE)
    .map(chemin => ({ relatif: relative(RACINE, chemin).split(/[\\/]/).join('/'), chemin }))
    .filter(({ relatif }) => !DOSSIERS_EXEMPTS.includes(relatif.split('/')[0]))
    .map(({ relatif, chemin }) => ({ relatif, source: readFileSync(chemin, 'utf8') }))
}

/**
 * Les `select` de `versets_lecture` dont la liste de colonnes est CALCULÉE.
 *
 * ⚠️ La chaîne peut être coupée par des appels intercalés et par des retours à la
 * ligne (`.from(…)\n  .select(…)`), d'où la fenêtre permissive entre les deux.
 */
export function selectsCalcules(source: string): string[] {
  const trouves: string[] = []
  const re = /from\(\s*['"]versets_lecture['"]\s*\)([\s\S]{0,400}?)\.select\(\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    const apres = source.slice(m.index + m[0].length)
    const ouvrant = apres[0]
    // Une chaîne à guillemets ne peut rien interpoler : ses colonnes sont écrites.
    if (ouvrant === "'" || ouvrant === '"') continue
    if (ouvrant === '`') {
      const fin = apres.indexOf('`', 1)
      const gabarit = fin === -1 ? apres : apres.slice(1, fin)
      if (gabarit.includes('${')) trouves.push('`' + gabarit + '`')
      continue
    }
    // Ni l'un ni l'autre : c'est une variable, donc une liste construite ailleurs.
    trouves.push(apres.slice(0, apres.indexOf(')')).trim())
  }
  return trouves
}

describe('colonnes de traduction', () => {
  it('reconnaît une liste calculée et laisse passer une liste écrite', () => {
    expect(selectsCalcules(`from('versets_lecture').select('id_verset, ref, TR0001')`)).toEqual([])
    expect(selectsCalcules('from(\'versets_lecture\').select(`id_verset, ${trad}`)')).toHaveLength(1)
    expect(selectsCalcules(`from('versets_lecture').select(selVersets)`)).toEqual(['selVersets'])
    // La chaîne coupée par un retour à la ligne reste reconnue.
    expect(selectsCalcules("from('versets_lecture')\n    .select(selectVersets)")).toEqual(['selectVersets'])
    // Une autre table ne regarde pas cette garde.
    expect(selectsCalcules(`from('segments').select(colonnes)`)).toEqual([])
  })

  it('⛔ une liste de colonnes CALCULÉE passe par codesTraductionsLecture', () => {
    const fautifs: string[] = []
    for (const { relatif, source } of surveilles()) {
      if (!selectsCalcules(source).length) continue
      if (source.includes('codesTraductionsLecture')) continue
      if (relatif in LECTURES_NON_FILTREES) continue
      fautifs.push(relatif)
    }
    expect(
      fautifs,
      'Ce fichier compose les colonnes de `versets_lecture` sans filtrer par les colonnes\n' +
        'RÉELLES de la vue. Une bible déclarée mais non matérialisée (TR0009…) fera échouer\n' +
        'la requête ENTIÈRE, et la page se videra SANS erreur visible.\n' +
        'Remède : `codesTraductionsLecture(client)` (app/lib/traductions.ts).',
    ).toEqual([])
  })

  it('garde le registre à jour : rien n’y reste après avoir été corrigé', () => {
    const encoreFautifs = new Set(
      surveilles()
        .filter(({ source }) => selectsCalcules(source).length && !source.includes('codesTraductionsLecture'))
        .map(({ relatif }) => relatif),
    )
    const perimees = Object.keys(LECTURES_NON_FILTREES).filter(f => !encoreFautifs.has(f))
    expect(
      perimees,
      'La dette a DIMINUÉ : retirer ces lignes de LECTURES_NON_FILTREES.\n' +
        'Un registre qu’on ne tient pas ment sur ce qui reste à faire.',
    ).toEqual([])
  })
})
