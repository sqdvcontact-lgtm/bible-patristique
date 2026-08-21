// INVENTAIRE DES MARQUEURS DE CITATION — analyse empirique du corpus.
//
// On ne devine pas les formules : on les compte. Le script balaie tous les
// segments et classe ce qui, dans le texte, annonce ou désigne une citation :
// références en parenthèses, formules d'introduction, marques typographiques,
// renvois non bibliques. Il ne modifie rien.
//
//   node scripts/inventaire-marqueurs.mjs              (tout le corpus)
//   node scripts/inventaire-marqueurs.mjs A0013O0002   (une œuvre)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))

// Abréviations françaises du projet (app/lib/bible.ts), plus quelques variantes
// anciennes rencontrées dans les éditions du XIXe.
const ABREV = ['Gn','Ex','Lv','Nb','Dt','Jos','Jg','Rt','1S','2S','1R','2R','1Ch','2Ch','Esd','Né','Est','Jb','Ps','Pr','Qo','Ec','Ct','Sg','Si','Is','Jr','Lm','Ba','Ez','Dn','Os','Jl','Am','Ab','Jon','Mi','Na','Ha','So','Ag','Za','Ml','Tb','Jdt','1M','2M','Mt','Mc','Mr','Lc','Jn','Ac','Rm','1Co','2Co','Ga','Ep','Ph','Col','1Th','2Th','1Tm','2Tm','Tt','Phm','He','Jc','1P','2P','1Jn','2Jn','3Jn','Jude','Ap','Apoc','Matth','Marc','Luc','Rom','Coloss','Hébr','Galat','Éphés','Philip','Thess','Tim','Cor']

const MARQUEURS = [
  // ── Références explicites ──────────────────────────────────────────────────
  { cat: 'référence', nom: 'abréviation biblique entre parenthèses',
    re: new RegExp('\\((?:[1-4]\\s?)?(?:' + ABREV.join('|') + ')\\.?\\s+[0-9ivxlcdm]+\\s*[,.]\\s*[0-9]+', 'gi') },
  { cat: 'référence', nom: 'abréviation biblique hors parenthèses',
    re: new RegExp('(?<![(\\w])(?:[1-4]\\s?)?(?:' + ABREV.join('|') + ')\\.\\s+[0-9ivxlcdm]+\\s*,\\s*[0-9]+', 'g') },
  { cat: 'référence', nom: 'livre en toutes lettres + chiffres',
    re: /\b(Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|Samuel|Rois|Chroniques|Esdras|Néhémie|Esther|Job|Psaumes?|Proverbes|Ecclésiaste|Cantique|Sagesse|Ecclésiastique|Isaïe|Jérémie|Lamentations|Baruch|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Tobie|Judith|Maccabées|Matthieu|Marc|Luc|Jean|Actes|Romains|Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|Thessaloniciens|Timothée|Tite|Philémon|Hébreux|Jacques|Pierre|Jude|Apocalypse)[,\s]+(chap\.?\s*)?[0-9ivxlcdm]{1,3}\b/gi },
  { cat: 'référence', nom: 'chapitre en romain (chap. XII)',
    re: /\bchap(itre)?\.?\s+[IVXLCDM]{1,6}\b/g },
  { cat: 'référence', nom: 'appel de note [[N]]', re: /\[\[[0-9]+\]\]/g },
  { cat: 'référence', nom: 'appel de note (n) ou [n]', re: /(?:\[[0-9]{1,3}\]|\([0-9]{1,3}\))/g },

  // ── Formules d'introduction : disent qu'une citation suit ─────────────────
  { cat: 'formule', nom: 'il est écrit',        re: /il\s+est\s+[ée]crit/gi },
  { cat: 'formule', nom: 'l’Écriture / la Bible', re: /l['’](?:[ÉE]criture|[ÉE]vangile)|la\s+Bible|les\s+[ÉE]critures/gi },
  { cat: 'formule', nom: 'comme dit / selon',   re: /(?:comme\s+(?:le\s+)?di[st]|selon\s+(?:ce\s+qu|la\s+parole|le\s+mot))/gi },
  { cat: 'formule', nom: 'ces paroles / ce mot', re: /(?:ces\s+paroles|ce\s+mot|cette\s+parole|ces\s+mots)/gi },
  { cat: 'formule', nom: 'dit le Seigneur',     re: /dit\s+(?:le\s+Seigneur|Dieu|le\s+Christ)/gi },
  { cat: 'formule', nom: 'suivant / d’après',   re: /(?:suivant\s+(?:ce|la|le)|d['’]après\s+(?:ce|saint|l))/gi },
  { cat: 'formule', nom: 'à ce propos / de là', re: /(?:à\s+ce\s+(?:propos|sujet)|de\s+là\s+(?:ce|cette|vient))/gi },

  // ── Désignation de l’auteur cité : dit OÙ chercher ───────────────────────
  { cat: 'autorité biblique', nom: 'l’Apôtre / saint Paul', re: /(?:l['’][AÀ]p[oô]tre|saint\s+Paul|S\.\s?Paul)/gi },
  { cat: 'autorité biblique', nom: 'le Psalmiste / David',  re: /(?:le\s+[Pp]salmiste|David)/g },
  { cat: 'autorité biblique', nom: 'le Prophète',           re: /le\s+[Pp]roph[eè]te/g },
  { cat: 'autorité biblique', nom: 'l’Évangéliste / le Sauveur', re: /(?:l['’][ÉE]vang[ée]liste|le\s+Sauveur|Notre-Seigneur)/g },
  { cat: 'autorité biblique', nom: 'Salomon / la Sagesse',  re: /(?:Salomon|la\s+Sagesse)/g },

  // ── Renvois NON bibliques : à signaler, jamais à rattacher ───────────────
  { cat: 'non biblique', nom: 'auteur profane',
    re: /\b(Platon|Aristote|Cic[ée]ron|S[ée]n[eè]que|Virgile|Hom[eè]re|Plotin|Porphyre|Varron|Salluste|T[ée]rence|Ovide|Horace|Épicure|Pythagore|Socrate)\b/g },
  { cat: 'non biblique', nom: 'Père de l’Église',
    re: /\b(Cyprien|Ambroise|Tertullien|Origène|J[ée]r[ôo]me|Ir[ée]n[ée]e|Chrysostome|Basile|Gr[ée]goire|Augustin|Athanase|Hilaire|Denys|Bo[eè]ce|Anselme)\b/g },
  { cat: 'non biblique', nom: 'écrit hors canon',
    re: /\b(H[ée]noch|Esdras\s+(?:III|IV|3|4)|Odes\s+de\s+Salomon|Pasteur\s+d['’]Hermas|Didach[èe])\b/g },
  { cat: 'non biblique', nom: 'Glose / autorité scolastique',
    re: /\b(la\s+Glose|le\s+Philosophe|le\s+Ma[iî]tre\s+des\s+Sentences)\b/g },

  // ── Marques typographiques ───────────────────────────────────────────────
  { cat: 'typographie', nom: 'guillemets français « »', re: /«/g },
  { cat: 'typographie', nom: 'guillemets droits "',     re: /"/g },
  { cat: 'typographie', nom: 'italiques <i>',           re: /<i>/g },
  { cat: 'typographie', nom: 'deux-points + majuscule', re: /:\s+[A-ZÉÈÀÎÔ]/g },
]

// ── Balayage ─────────────────────────────────────────────────────────────────
const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, id_oeuvre, segment_texte').eq('nature', 'texte').range(from, from + 999)
  if (OEUVRE) q = q.eq('id_oeuvre', OEUVRE)
  const { data } = await q
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}
console.log(`${segs.length} segments analysés${OEUVRE ? ' (' + OEUVRE + ')' : ' (tout le corpus)'}\n`)

const res = MARQUEURS.map(m => ({ ...m, occ: 0, seg: 0, exemples: [] }))
for (const s of segs) {
  const t = s.segment_texte || ''
  for (const m of res) {
    const trouves = [...t.matchAll(m.re)]
    if (!trouves.length) continue
    m.occ += trouves.length
    m.seg++
    if (m.exemples.length < 3) m.exemples.push(trouves[0][0].slice(0, 40))
  }
}

let cat = ''
for (const m of res.sort((a, b) => a.cat.localeCompare(b.cat) || b.occ - a.occ)) {
  if (m.cat !== cat) { cat = m.cat; console.log(`\n── ${cat.toUpperCase()}`) }
  if (!m.occ) { console.log(`  ${'—'.padEnd(9)} ${m.nom}`); continue }
  console.log(`  ${String(m.occ).padStart(7)}  ${m.nom.padEnd(42)} ${m.seg} seg.  ex. ${m.exemples.map(e => JSON.stringify(e)).join(' ')}`)
}
