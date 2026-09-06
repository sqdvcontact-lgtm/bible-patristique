// « AUTRES » : les écrits que le canon ne reçoit pas mais que la Polyglotte compare — ils
// figurent désormais dans le MÊME volet de navigation que les deux Testaments, sur la page
// Bible comme sur la Polyglotte. Les tenir à l'écart obligeait à deux navigations distinctes,
// alors que le lecteur circule d'un ensemble à l'autre sans changer de geste.
/**
 * ⚠️ `testament` dit la PLACE, `canonique` dit le STATUT, et les deux ne se confondent
 * plus (2026-09-06, demande de l'auteur : « je veux bien que les non canoniques soient à
 * leur place traditionnelle, mais il faut simplement indiquer non canonique en petit à
 * côté »). Un écrit que le canon catholique ne reçoit pas se range donc auprès du livre
 * dont il relève — le Psaume 151 après le Psautier, la Lettre de Jérémie après Baruch —
 * et porte sa mention. `canonique` absent vaut VRAI : seuls les écrits qu'il faut
 * signaler le déclarent.
 */
export type LivreBible = {
  code: string; nom: string; testament: 'AT' | 'NT' | 'AUTRES'; nbVersets: number
  canonique?: boolean
}

export const LIVRES: LivreBible[] = [
  { code: 'GEN', nom: 'Genèse',                   testament: 'AT', nbVersets: 1533 },
  { code: 'EXO', nom: 'Exode',                    testament: 'AT', nbVersets: 1213 },
  { code: 'LEV', nom: 'Lévitique',                testament: 'AT', nbVersets:  859 },
  { code: 'NUM', nom: 'Nombres',                  testament: 'AT', nbVersets: 1288 },
  { code: 'DEU', nom: 'Deutéronome',              testament: 'AT', nbVersets:  959 },
  { code: 'JOS', nom: 'Josué',                    testament: 'AT', nbVersets:  658 },
  { code: 'JDG', nom: 'Juges',                    testament: 'AT', nbVersets:  618 },
  { code: 'RUT', nom: 'Ruth',                     testament: 'AT', nbVersets:   85 },
  { code: '1SA', nom: '1 Samuel',                 testament: 'AT', nbVersets:  810 },
  { code: '2SA', nom: '2 Samuel',                 testament: 'AT', nbVersets:  695 },
  { code: '1KI', nom: '1 Rois',                   testament: 'AT', nbVersets:  816 },
  { code: '2KI', nom: '2 Rois',                   testament: 'AT', nbVersets:  719 },
  { code: '1CH', nom: '1 Chroniques',             testament: 'AT', nbVersets:  942 },
  { code: '2CH', nom: '2 Chroniques',             testament: 'AT', nbVersets:  822 },
  { code: 'EZR', nom: 'Esdras',                   testament: 'AT', nbVersets:  280 },
  { code: 'NEH', nom: 'Néhémie',                  testament: 'AT', nbVersets:  406 },
  // ⚠️ Non canoniques, mais à leur PLACE : chacun auprès du livre dont il relève.
  { code: '1ES', nom: '1 Esdras (3 Esdras)',      testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'TOB', nom: 'Tobie',                    testament: 'AT', nbVersets:  248 },
  { code: 'JDT', nom: 'Judith',                   testament: 'AT', nbVersets:  340 },
  { code: 'EST', nom: 'Esther',                   testament: 'AT', nbVersets:  167 },
  { code: '1MA', nom: '1 Maccabées',              testament: 'AT', nbVersets:  925 },
  { code: '2MA', nom: '2 Maccabées',              testament: 'AT', nbVersets:  556 },
  { code: '3MA', nom: '3 Maccabées',              testament: 'AT', nbVersets: 0, canonique: false },
  { code: '4MA', nom: '4 Maccabées',              testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'JOB', nom: 'Job',                      testament: 'AT', nbVersets: 1070 },
  { code: 'PSA', nom: 'Psaumes',                  testament: 'AT', nbVersets: 2461 },
  { code: 'PS2', nom: 'Psaume 151',               testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'ODA', nom: 'Odes',                     testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'PSS', nom: 'Psaumes de Salomon',       testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'PRO', nom: 'Proverbes',                testament: 'AT', nbVersets:  915 },
  { code: 'ECC', nom: 'Ecclésiaste ou Qohélet',  testament: 'AT', nbVersets:  222 },
  { code: 'SNG', nom: 'Cantique des cantiques',   testament: 'AT', nbVersets:  117 },
  { code: 'WIS', nom: 'Sagesse',                  testament: 'AT', nbVersets:  437 },
  { code: 'SIR', nom: 'Siracide (Ecclésiastique)', testament: 'AT', nbVersets: 1407 },
  { code: 'ISA', nom: 'Isaïe',                    testament: 'AT', nbVersets: 1292 },
  { code: 'JER', nom: 'Jérémie',                  testament: 'AT', nbVersets: 1364 },
  { code: 'LAM', nom: 'Lamentations',             testament: 'AT', nbVersets:  154 },
  { code: 'BAR', nom: 'Baruch',                   testament: 'AT', nbVersets:  213 },
  { code: 'LJE', nom: 'Lettre de Jérémie',        testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'EZK', nom: 'Ézéchiel',                 testament: 'AT', nbVersets: 1273 },
  { code: 'DAN', nom: 'Daniel',                   testament: 'AT', nbVersets:  357 },
  { code: 'DAG', nom: 'Daniel (vieux grec)',      testament: 'AT', nbVersets: 0, canonique: false },
  { code: 'HOS', nom: 'Osée',                     testament: 'AT', nbVersets:  197 },
  { code: 'JOL', nom: 'Joël',                     testament: 'AT', nbVersets:   73 },
  { code: 'AMO', nom: 'Amos',                     testament: 'AT', nbVersets:  146 },
  { code: 'OBA', nom: 'Abdias',                   testament: 'AT', nbVersets:   21 },
  { code: 'JON', nom: 'Jonas',                    testament: 'AT', nbVersets:   48 },
  { code: 'MIC', nom: 'Michée',                   testament: 'AT', nbVersets:  105 },
  { code: 'NAM', nom: 'Nahum',                    testament: 'AT', nbVersets:   47 },
  { code: 'HAB', nom: 'Habacuc',                  testament: 'AT', nbVersets:   56 },
  { code: 'ZEP', nom: 'Sophonie',                 testament: 'AT', nbVersets:   53 },
  { code: 'HAG', nom: 'Aggée',                    testament: 'AT', nbVersets:   38 },
  { code: 'ZEC', nom: 'Zacharie',                 testament: 'AT', nbVersets:  211 },
  { code: 'MAL', nom: 'Malachie',                 testament: 'AT', nbVersets:   55 },
  { code: 'MAT', nom: 'Matthieu',                 testament: 'NT', nbVersets: 1071 },
  { code: 'MRK', nom: 'Marc',                     testament: 'NT', nbVersets:  678 },
  { code: 'LUK', nom: 'Luc',                      testament: 'NT', nbVersets: 1151 },
  { code: 'JHN', nom: 'Jean',                     testament: 'NT', nbVersets:  879 },
  { code: 'ACT', nom: 'Actes',                    testament: 'NT', nbVersets: 1007 },
  { code: 'ROM', nom: 'Romains',                  testament: 'NT', nbVersets:  433 },
  { code: '1CO', nom: '1 Corinthiens',            testament: 'NT', nbVersets:  437 },
  { code: '2CO', nom: '2 Corinthiens',            testament: 'NT', nbVersets:  257 },
  { code: 'GAL', nom: 'Galates',                  testament: 'NT', nbVersets:  149 },
  { code: 'EPH', nom: 'Éphésiens',                testament: 'NT', nbVersets:  155 },
  { code: 'PHP', nom: 'Philippiens',              testament: 'NT', nbVersets:  104 },
  { code: 'COL', nom: 'Colossiens',               testament: 'NT', nbVersets:   95 },
  { code: '1TH', nom: '1 Thessaloniciens',        testament: 'NT', nbVersets:   89 },
  { code: '2TH', nom: '2 Thessaloniciens',        testament: 'NT', nbVersets:   47 },
  { code: '1TI', nom: '1 Timothée',               testament: 'NT', nbVersets:  113 },
  { code: '2TI', nom: '2 Timothée',               testament: 'NT', nbVersets:   83 },
  { code: 'TIT', nom: 'Tite',                     testament: 'NT', nbVersets:   46 },
  { code: 'PHM', nom: 'Philémon',                 testament: 'NT', nbVersets:   25 },
  { code: 'HEB', nom: 'Hébreux',                  testament: 'NT', nbVersets:  303 },
  { code: 'JAS', nom: 'Jacques',                  testament: 'NT', nbVersets:  108 },
  { code: '1PE', nom: '1 Pierre',                 testament: 'NT', nbVersets:  105 },
  { code: '2PE', nom: '2 Pierre',                 testament: 'NT', nbVersets:   61 },
  { code: '1JN', nom: '1 Jean',                   testament: 'NT', nbVersets:  105 },
  { code: '2JN', nom: '2 Jean',                   testament: 'NT', nbVersets:   13 },
  { code: '3JN', nom: '3 Jean',                   testament: 'NT', nbVersets:   14 },
  { code: 'JUD', nom: 'Jude',                     testament: 'NT', nbVersets:   25 },
  { code: 'REV', nom: 'Apocalypse',               testament: 'NT', nbVersets:  404 },

  // Écrits que le canon ne reçoit pas ET qui n'ont pas de place dans l'ordre catholique :
  // ni l'Ancien ni le Nouveau Testament ne les range. Ils ferment la navigation, à part.
  // ⚠️ Ceux que la Septante porte se lisent à LEUR RANG, plus haut, marqués « non
  // canonique » : c'est la place qui a changé le 2026-09-06, jamais le statut.
  // Le nombre de versets reste à 0 tant qu'aucune édition n'est chargée — la navigation
  // les grisera d'elle-même, comme tout livre sans texte.
  { code: '2ES', nom: '2 Esdras (4 Esdras)',      testament: 'AUTRES', nbVersets: 0, canonique: false },
  { code: 'EZA', nom: "Apocalypse d'Esdras",      testament: 'AUTRES', nbVersets: 0, canonique: false },
  { code: 'MAN', nom: 'Prière de Manassé',        testament: 'AUTRES', nbVersets: 0, canonique: false },
  { code: 'ENO', nom: 'Hénoch',                   testament: 'AUTRES', nbVersets: 0, canonique: false },
  { code: 'JUB', nom: 'Jubilés',                  testament: 'AUTRES', nbVersets: 0, canonique: false },
]

/**
 * Les écrits que le CANON CATHOLIQUE ne reçoit pas, et qu'il faut donc dire tels au
 * lecteur. ⛔ Ils ne se reconnaissent PLUS à leur testament : depuis le 2026-09-06 ils
 * se rangent à leur place traditionnelle, auprès du livre dont ils relèvent, et c'est
 * `canonique: false` qui les désigne. Confondre les deux remettrait le Psaume 151 au bas
 * de la liste.
 * ⚠️ La marque se lit vis-à-vis de ce canon-là, non des autres traditions — un orthodoxe
 * compte autrement, et la marque le dit sans prétendre trancher pour lui.
 * ⚠️ La base a son propre juge, `livres_lisibles.canonique`, qu'elle rend au volet de
 * navigation. Cette liste-ci sert le RENDU SERVEUR, qui ne peut pas attendre une
 * requête pour savoir dans quelle vue chercher un chapitre.
 */
export const LIVRES_NON_CANONIQUES: ReadonlySet<string> = new Set(
  LIVRES.filter(l => l.canonique === false).map(l => l.code),
)
export function estLivreNonCanonique(code: string): boolean {
  return LIVRES_NON_CANONIQUES.has(code)
}

export const ABREV_FR: Record<string, string> = {
  GEN:'Gn',  EXO:'Ex',  LEV:'Lv',  NUM:'Nb',  DEU:'Dt',
  JOS:'Jos', JDG:'Jg',  RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R',
  '1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd', NEH:'Né',  TOB:'Tb',  JDT:'Jdt', EST:'Est',
  '1MA':'1M','2MA':'2M',
  JOB:'Jb',  PSA:'Ps',
  PRO:'Pr',  ECC:'Qo',  SNG:'Ct',  WIS:'Sg',  SIR:'Si',
  ISA:'Is',  JER:'Jr',  LAM:'Lm',  BAR:'Ba',  EZK:'Ez',  DAN:'Dn',
  HOS:'Os',  JOL:'Jl',  AMO:'Am',  OBA:'Ab',  JON:'Jon',
  MIC:'Mi',  NAM:'Na',  HAB:'Ha',  ZEP:'So',  HAG:'Ag',
  ZEC:'Za',  MAL:'Ml',
  MAT:'Mt',  MRK:'Mc',  LUK:'Lc',  JHN:'Jn',  ACT:'Ac',
  ROM:'Rm',
  '1CO':'1Co','2CO':'2Co',
  GAL:'Ga',  EPH:'Ep',  PHP:'Ph',  COL:'Col',
  '1TH':'1Th','2TH':'2Th','1TI':'1Tm','2TI':'2Tm',
  TIT:'Tt',  PHM:'Phm', HEB:'He',  JAS:'Jc',
  '1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',
  JUD:'Jude',REV:'Ap',
}
