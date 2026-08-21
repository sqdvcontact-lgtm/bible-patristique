// Peuplement de `abreviations_bibliques`.
//
// Trois systèmes, dans cet ordre de confiance :
//   canonique      — le système français classique (charte §3.11, Wikipédia,
//                    ABREV_FR du projet) ;
//   variante       — les graphies rencontrées dans les éditions anciennes ;
//   toutes_lettres — le nom du livre écrit en entier.
//
// `forme` est normalisée : minuscules, sans accents, sans espace ni point.
//
//   node scripts/abreviations-peupler.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export const normaliser = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s.]/g, '')

// [code, canoniques…] — la première est celle de la charte §3.11 ; les suivantes
// sont d'autres graphies du même système (Wikipédia écrit « Ép », « Ne », « Da »,
// « La » là où le projet écrit « Ep », « Né », « Dn », « Lm »).
const CANONIQUES = [
  ['GEN','Gn'], ['EXO','Ex'], ['LEV','Lv'], ['NUM','Nb'], ['DEU','Dt'],
  ['JOS','Jos'], ['JDG','Jg'], ['RUT','Rt'],
  ['1SA','1S'], ['2SA','2S'], ['1KI','1R'], ['2KI','2R'], ['1CH','1Ch'], ['2CH','2Ch'],
  ['EZR','Esd'], ['NEH','Né','Ne'], ['EST','Est'], ['JOB','Jb'], ['PSA','Ps'],
  ['PRO','Pr'], ['ECC','Qo','Ec','Qoh'], ['SNG','Ct'], ['WIS','Sg'], ['SIR','Si','Sir'],
  ['ISA','Is'], ['JER','Jr'], ['LAM','Lm','La'], ['BAR','Ba'], ['EZK','Ez'], ['DAN','Dn','Da'],
  ['HOS','Os'], ['JOL','Jl'], ['AMO','Am'], ['OBA','Ab'], ['JON','Jon'], ['MIC','Mi'],
  ['NAM','Na'], ['HAB','Ha'], ['ZEP','So'], ['HAG','Ag'], ['ZEC','Za'], ['MAL','Ml'],
  ['TOB','Tb'], ['JDT','Jdt'], ['1MA','1M'], ['2MA','2M'],
  ['MAT','Mt'], ['MRK','Mc'], ['LUK','Lc'], ['JHN','Jn'], ['ACT','Ac'],
  ['ROM','Rm'], ['1CO','1Co'], ['2CO','2Co'], ['GAL','Ga'], ['EPH','Ep','Ép'],
  ['PHP','Ph'], ['COL','Col'], ['1TH','1Th'], ['2TH','2Th'], ['1TI','1Tm'], ['2TI','2Tm'],
  ['TIT','Tt'], ['PHM','Phm'], ['HEB','He'],
  ['JAS','Jc'], ['1PE','1P'], ['2PE','2P'], ['1JN','1Jn'], ['2JN','2Jn'], ['3JN','3Jn'],
  ['JUD','Jude','Jd'], ['REV','Ap'],
]

// Graphies des éditions anciennes, relevées dans le corpus (L'Échelle du Paradis,
// Cyrille, Contre Celse) ou usuelles au XIXe siècle.
const VARIANTES = [
  ['GEN','Gen','Gén','Genes'], ['EXO','Exod','Ex.'], ['LEV','Levit','Lévit'],
  ['NUM','Num','Nomb'], ['DEU','Deut'], ['JOS','Josué','Jos'],
  // LES ROIS SELON LA VULGATE — piège à ne pas manquer. Le système latin compte
  // 1-2 Rois pour nos 1-2 Samuel, et 3-4 Rois pour nos 1-2 Rois. « 4 Rois 4, 39 »
  // (la coloquinte d'Élisée) est donc 2 Rois 4, 39. Une forme `Reg` isolée serait
  // ambiguë : on n'enregistre que les formes numérotées, sans exception.
  ['1SA','1Sam','1Reg','1Rg'], ['2SA','2Sam','2Reg','2Rg'],
  ['1KI','3Reg','3Rois','3Rg'], ['2KI','4Reg','4Rois','4Rg'],
  ['1CH','1Par','1Chron'], ['2CH','2Par','2Chron'],
  ['JOB','Job'], ['PSA','Psal','Psaum','Ps.'], ['PRO','Prov'], ['ECC','Eccl','Eccle'],
  ['SNG','Cant'], ['WIS','Sap','Sag'], ['SIR','Eccli','Ecclesiastique'],
  ['ISA','Isa','Isaïe','Isai'], ['JER','Jer','Jér','Jerem'], ['LAM','Lament','Thren'],
  ['EZK','Ezech','Ézéch'], ['DAN','Dan'], ['HOS','Osee','Osée'], ['JOL','Joel','Joël'],
  ['AMO','Amos'], ['MIC','Mich'], ['NAM','Nah'], ['HAB','Habac'], ['ZEP','Soph'],
  ['HAG','Agg'], ['ZEC','Zach'], ['MAL','Malach'],
  ['TOB','Tob'], ['JDT','Judith'], ['1MA','1Machab','1Mach'], ['2MA','2Machab','2Mach'],
  // Formes latines relevées par scripts/abreviations-inconnues.mjs : les éditions
  // du XIXe citent souvent la Vulgate dans sa langue.
  ['MAT','Matth','Math','Matt'], ['MRK','Marc','Mr','Marci'], ['LUK','Luc','Luc.','Lc.'],
  ['JHN','Jean','Joh','Joan','Johan'], ['1JN','1Joh'], ['2JN','2Joh'], ['3JN','3Joh'],
  ['1PE','1Petr','1Pet','1Pier'], ['2PE','2Petr','2Pet','2Pier'],
  ['1TI','1Timoth'], ['2TI','2Timoth'], ['NUM','Nm'], ['MAL','Malach'],
  ['ACT','Act','Actes'], ['ROM','Rom'], ['1CO','1Cor'], ['2CO','2Cor'],
  ['GAL','Gal','Galat'], ['EPH','Eph','Éphés','Ephes'], ['PHP','Phil','Philip'],
  ['COL','Coloss'], ['1TH','1Thes','1Thess'], ['2TH','2Thes','2Thess'],
  ['1TI','1Tim'], ['2TI','2Tim'], ['TIT','Tit'], ['PHM','Philem'],
  ['HEB','Hebr','Hébr','Heb'], ['JAS','Jac','Jacq'], ['1PE','1Pier','1Petr'],
  ['2PE','2Pier','2Petr'], ['1JN','1Jean'], ['2JN','2Jean'], ['3JN','3Jean'],
  ['REV','Apoc','Apocal'],
]

const TOUTES_LETTRES = [
  ['GEN','Genèse'], ['EXO','Exode'], ['LEV','Lévitique'], ['NUM','Nombres'],
  ['DEU','Deutéronome'], ['JOS','Josué'], ['JDG','Juges'], ['RUT','Ruth'],
  ['EZR','Esdras'], ['NEH','Néhémie'], ['EST','Esther'], ['JOB','Job'],
  ['PSA','Psaumes','Psaume'], ['PRO','Proverbes'], ['ECC','Ecclésiaste'],
  ['SNG','Cantique'], ['WIS','Sagesse'], ['SIR','Ecclésiastique','Siracide'],
  ['ISA','Isaïe'], ['JER','Jérémie'], ['LAM','Lamentations'], ['BAR','Baruch'],
  ['EZK','Ézéchiel'], ['DAN','Daniel'], ['HOS','Osée'], ['JOL','Joël'],
  ['AMO','Amos'], ['OBA','Abdias'], ['JON','Jonas'], ['MIC','Michée'],
  ['NAM','Nahum'], ['HAB','Habacuc'], ['ZEP','Sophonie'], ['HAG','Aggée'],
  ['ZEC','Zacharie'], ['MAL','Malachie'], ['TOB','Tobie'], ['JDT','Judith'],
  ['MAT','Matthieu'], ['MRK','Marc'], ['LUK','Luc'], ['JHN','Jean'],
  ['ACT','Actes'], ['ROM','Romains'], ['GAL','Galates'], ['EPH','Éphésiens'],
  ['PHP','Philippiens'], ['COL','Colossiens'], ['TIT','Tite'], ['PHM','Philémon'],
  ['HEB','Hébreux'], ['JAS','Jacques'], ['JUD','Jude'], ['REV','Apocalypse'],
]

const lignes = new Map()   // forme normalisée → ligne (la première l'emporte)
const ajouter = (systeme, table) => {
  for (const [livre, ...formes] of table) {
    for (const f of formes) {
      const n = normaliser(f)
      if (!n || lignes.has(n)) continue
      lignes.set(n, { forme: n, livre, systeme, commentaire: `écrit « ${f} »` })
    }
  }
}
ajouter('canonique', CANONIQUES)
ajouter('variante', VARIANTES)
ajouter('toutes_lettres', TOUTES_LETTRES)

// Contrôle : tout code de livre doit exister dans l'ossature.
// Paginer est indispensable — un `select` simple s'arrête à 1 000 lignes, et
// l'ossature en compte 35 000 : le contrôle n'aurait vu qu'un seul livre et
// déclaré tous les autres inconnus.
const livresReels = new Set()
for (let from = 0; ; from += 1000) {
  // `.order()` est indispensable : sans tri explicite, la pagination n'a aucun
  // ordre stable et laisse échapper des lignes d'une page à l'autre.
  const { data } = await sb.from('versets_canon').select('livre').order('id').range(from, from + 999)
  if (!data?.length) break
  for (const r of data) livresReels.add(r.livre)
  if (data.length < 1000) break
}
const orphelins = [...new Set([...lignes.values()].map(l => l.livre))].filter(l => !livresReels.has(l))
if (orphelins.length) { console.error('✗ codes inconnus de l’ossature :', orphelins.join(', ')); process.exit(1) }

const { error } = await sb.from('abreviations_bibliques')
  .upsert([...lignes.values()], { onConflict: 'forme' })
if (error) throw error

const parSysteme = {}
for (const l of lignes.values()) parSysteme[l.systeme] = (parSysteme[l.systeme] ?? 0) + 1
console.log(`✓ ${lignes.size} formes enregistrées`, parSysteme)
console.log(`  livres couverts : ${new Set([...lignes.values()].map(l => l.livre)).size} / ${livresReels.size}`)
