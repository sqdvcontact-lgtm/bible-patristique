// Normalisation des références bibliques DANS les notes (texte libre hérité
// d'éditions anciennes). Conventions arrêtées par l'auteur (2026-08-18) :
//   • abréviation ESPACÉE : « 1Co. » → « 1 Co », « 2P » → « 2 P » ;
//   • VIRGULE entre chapitre et verset : « Ps 65. 29 » → « Ps 65, 29 » ;
//   • chapitre en chiffres arabes : « Gen. II, 7 » → « Gn 2, 7 » ;
//   • une note se termine par un POINT (ou une ponctuation forte déjà présente),
//     géré à part par `terminerNote`.
//
// Principe de prudence : on ne réécrit QUE ce qu'on identifie sans ambiguïté. Un
// renvoi non reconnu (référence patristique « De civ. Dei II, 7 », abréviation
// équivoque comme « Reg. » ou « Eccl. ») est laissé TEL QUEL. Fonctions pures,
// testées dans `referenceNote.test.ts`.

import { ABREV_FR, LIVRES } from './bible'

function normaliserJeton(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.\s]/g, '')
}

// Abréviation « espacée » : un espace après le chiffre de tête. « 1Co » → « 1 Co ».
export function abrevEspacee(code: string): string {
  const a = ABREV_FR[code] ?? code
  return a.replace(/^(\d)(\p{L})/u, '$1 $2')
}

// Chiffres romains → entier (lecture indulgente : « IIII » = 4 est accepté).
export function romainVersEntier(s: string): number | null {
  const t = s.toUpperCase()
  if (!t || !/^[IVXLCDM]+$/.test(t)) return null
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  let total = 0, suivant = 0
  for (let i = t.length - 1; i >= 0; i--) {
    const v = val[t[i]]
    if (v < suivant) total -= v
    else { total += v; suivant = v }
  }
  return total > 0 ? total : null
}

// Table source → code canonique. Peuplée d'office depuis les noms français et les
// abréviations `ABREV_FR`, puis complétée des abréviations latines et variantes
// fréquentes de la patristique. Les cas équivoques sont VOLONTAIREMENT absents.
const SOURCE_VERS_CODE: Record<string, string> = {}
for (const l of LIVRES) SOURCE_VERS_CODE[normaliserJeton(l.nom)] = l.code
for (const [code, ab] of Object.entries(ABREV_FR)) SOURCE_VERS_CODE[normaliserJeton(ab)] = code

function aj(code: string, ...formes: string[]) {
  for (const f of formes) SOURCE_VERS_CODE[normaliserJeton(f)] = code
}
aj('GEN', 'gen', 'genes', 'genesis')
aj('EXO', 'ex', 'exod', 'exodus')
aj('LEV', 'lev', 'levit', 'leviticus')
aj('NUM', 'num', 'numeri')
aj('DEU', 'deut', 'deuter', 'deuteronome', 'deuteronomium')
aj('JOS', 'jos', 'josue', 'iosue', 'ios')
aj('JDG', 'judic', 'iudic', 'judicum', 'iudicum') // « Jud »/« Iud » seul = équivoque (Jude), écarté
aj('RUT', 'ruth')
aj('1SA', '1sam', '1samuel')
aj('2SA', '2sam', '2samuel')
aj('1KI', '1rois')
aj('2KI', '2rois')
aj('1CH', '1par', '1chron', '1paral', '1paralip')
aj('2CH', '2par', '2chron', '2paral', '2paralip')
aj('EZR', 'esd', 'esdras') // « Esdr » numéroté = équivoque (Néhémie), écarté
aj('NEH', 'neh', 'nehem', 'nehemie')
aj('TOB', 'tob', 'tobie', 'tobias', 'tobit')
aj('JDT', 'judith', 'judit', 'iudith')
aj('EST', 'esth', 'esther')
aj('1MA', '1mach', '1macc', '1maccabees', '1maccab')
aj('2MA', '2mach', '2macc', '2maccabees', '2maccab')
aj('JOB', 'job', 'iob')
aj('PSA', 'ps', 'psal', 'psalm', 'psaume', 'psaumes', 'psalmus', 'psalmi')
aj('PRO', 'prov', 'prv', 'proverbes', 'proverbia')
aj('ECC', 'eccle', 'ecclesiaste', 'qoheleth', 'qohelet') // « Eccl » seul = équivoque (Siracide), écarté
aj('SNG', 'cant', 'canticum', 'cantique')
aj('WIS', 'sap', 'sapientia', 'sagesse')
aj('SIR', 'eccli', 'ecclesiastique', 'siracide', 'sirach', 'sir')
aj('ISA', 'is', 'isa', 'isai', 'isaie', 'isaias')
aj('JER', 'jer', 'ier', 'jerem', 'jeremie', 'jeremias')
aj('LAM', 'lam', 'thren', 'threni', 'lamentations')
aj('BAR', 'bar', 'baruch')
aj('EZK', 'ez', 'ezech', 'ezechiel', 'ezekiel')
aj('DAN', 'dan', 'daniel')
aj('HOS', 'ose', 'osee', 'osea')
aj('JOL', 'joel', 'ioel')
aj('AMO', 'am', 'amos')
aj('OBA', 'abd', 'abdias', 'abdiam')
aj('JON', 'jon', 'ion', 'jonas', 'ionas')
aj('MIC', 'mich', 'michee', 'michaeas')
aj('NAM', 'nah', 'nahum')
aj('HAB', 'hab', 'habacuc', 'habakuk')
aj('ZEP', 'soph', 'sophonie', 'sophonias')
aj('HAG', 'agg', 'aggee', 'aggeus')
aj('ZEC', 'zach', 'zacharie', 'zacharias')
aj('MAL', 'mal', 'malachie', 'malachias')
aj('MAT', 'mat', 'matt', 'matth', 'matthieu', 'matthaeus')
aj('MRK', 'marc', 'marcus')
aj('LUK', 'luc', 'lucas')
aj('JHN', 'jean', 'joh', 'ioh', 'ioan', 'joan', 'joann', 'joannes')
aj('ACT', 'act', 'actes', 'actus')
aj('ROM', 'rom', 'romains', 'romanos')
aj('1CO', '1cor', '1corinthiens')
aj('2CO', '2cor', '2corinthiens')
aj('GAL', 'gal', 'galates', 'galatas')
aj('EPH', 'eph', 'ephesiens', 'ephesios')
aj('PHP', 'phil', 'phili', 'philipp', 'philippiens', 'philippenses')
aj('COL', 'col', 'colossiens', 'colossenses')
aj('1TH', '1thess', '1thessaloniciens')
aj('2TH', '2thess', '2thessaloniciens')
aj('1TI', '1tim', '1timothee')
aj('2TI', '2tim', '2timothee')
aj('TIT', 'tit', 'tite', 'titum')
aj('PHM', 'philem', 'philemon', 'phlm')
aj('HEB', 'heb', 'hebr', 'hebreux', 'hebraeos')
aj('JAS', 'jac', 'jacques', 'iac', 'jacobi')
aj('1PE', '1pet', '1pierre', '1petr')
aj('2PE', '2pet', '2pierre', '2petr')
aj('1JN', '1joh', '1jean', '1ioh', '1ioan')
aj('2JN', '2joh', '2jean', '2ioh', '2ioan')
aj('3JN', '3joh', '3jean', '3ioh', '3ioan')
aj('JUD', 'jude', 'iudae', 'judae') // épître de Jude (distincte des Juges)
aj('REV', 'apoc', 'apocalypse', 'apocalypsis', 'revelation')

function resoudreLivre(numTete: string | undefined, mot: string): string | null {
  let prefixe = ''
  if (numTete && numTete.trim()) {
    const brut = numTete.trim()
    const n = /^\d+$/.test(brut) ? parseInt(brut, 10) : romainVersEntier(brut)
    if (n == null) return null
    prefixe = String(n)
  }
  return SOURCE_VERS_CODE[prefixe + normaliserJeton(mot)] ?? null
}

// Un renvoi = [numéro de livre ?] [mot du livre] [chapitre] [, ou .] [verset(s)].
// Le numéro de tête (1-4, ou I-IV) et le chapitre romain sont pris en charge. La
// réécriture n'a lieu que si le livre est reconnu ; sinon la portion reste intacte.
const RE_RENVOI = /(?<![\p{L}\d])((?:[1-4]|IV|III|II|I)\s*)?([A-Za-zÀ-ÿ]+)\.?\s*(\d{1,3}|[IVXLCDM]{1,6})\s*[.,]\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)\.?/gu

// Réécrit toutes les références reconnues d'un texte, en laissant le reste intact.
export function normaliserReferencesDansTexte(texte: string): string {
  if (!texte) return texte
  return texte.replace(RE_RENVOI, (match, numTete: string | undefined, mot: string, chap: string, verset: string) => {
    const code = resoudreLivre(numTete, mot)
    if (!code) return match
    const chapNum = /^\d+$/.test(chap) ? parseInt(chap, 10) : romainVersEntier(chap)
    if (chapNum == null) return match
    const v = verset.replace(/\s*[-–]\s*/g, '-')
    return `${abrevEspacee(code)} ${chapNum}, ${v}`
  })
}

// Une note se termine par un point, sauf si elle porte déjà une ponctuation forte
// finale (? ! …), éventuellement suivie d'un guillemet ou d'une parenthèse fermante.
export function terminerNote(note: string): string {
  const t = (note ?? '').replace(/\s+$/u, '')
  if (!t) return note
  // On juge la ponctuation RÉELLE en écartant les guillemets/parenthèses fermants
  // et les espaces finaux (« citation. » est déjà terminée).
  const noyau = t.replace(/[\s»”"’')\]]+$/u, '')
  if (/[.!?…]$/u.test(noyau)) return t
  return `${t}.`
}
