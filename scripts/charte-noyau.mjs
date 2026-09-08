/**
 * LE NOYAU DE LA CHARTE — la loi seule, extraite, jamais rédigée.
 *
 * ⛔ Ce fichier ne DÉCIDE rien. Il extrait de `charte/CHARTE_IA.md` l'impératif de chaque
 * énoncé marqué ⛔ ou ⚠️, et l'écrit dans `charte/NOYAU.md` sous le numéro et le titre de
 * sa section. Le noyau est au corps de la charte ce que le miroir est à la base : une
 * dérivation, incapable de diverger.
 *
 * ⚠️ Un résumé RÉDIGÉ dérive au premier ajustement de la règle qu'il résume ; un résumé
 * DÉRIVÉ ne le peut pas. C'est toute la raison de ce script.
 *
 *   node scripts/charte-noyau.mjs            # écrit charte/NOYAU.md
 *   node scripts/charte-noyau.mjs --mesurer  # ne rend que le relevé, n'écrit rien
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MESURER = process.argv.includes('--mesurer')
const racine = resolve(import.meta.dirname, '..')
const source = resolve(racine, 'charte', 'CHARTE_IA.md')
const cible = resolve(racine, 'charte', 'NOYAU.md')

const lignes = readFileSync(source, 'utf8').split('\n')

// ── La section qui porte chaque ligne ────────────────────────────────────────
const RE_TITRE = /^(#{2,6})\s+(\d+(?:\.\d+)*(?:\s+(?:bis|ter))?)[.)]?\s+(.*)$/
const titres = []
lignes.forEach((s, i) => {
  const m = RE_TITRE.exec(s)
  if (m) titres.push({ i, rang: m[1].length, num: m[2], titre: m[3].trim() })
})
const sectionDe = i => {
  let s = null
  for (const t of titres) { if (t.i <= i) s = t; else break }
  return s
}

// ── L'IMPÉRATIF d'un énoncé marqué ──────────────────────────────────────────
// ⛔ LA CHARTE A UNE CONVENTION, ET C'EST ELLE QU'ON SUIT : l'impératif s'écrit en GRAS,
// en tête de l'énoncé, et ce qui suit le démontre. On prend donc le gras de tête quand il
// y en a un ; sinon la première phrase. ⚠️ Jamais une coupe au DEUX-POINTS seul : il
// annonce l'explication au lieu de la clore, et la règle est alors ce qui vient après.
const CODE = /`[^`]*`/g
const masquerCode = s => s.replace(CODE, m => 'x'.repeat(m.length))

// ⚠️ TOUT POINT NE FERME PAS UNE PHRASE. « p. », « éd. », « trad. », « Mt. », un chiffre
// d'énumération : couper là rend un fragment qui ne dit rien. On cherche donc le premier
// point qui n'est PAS précédé d'une abréviation ni d'un chiffre.
const ABREV = /(?:^|[\s(«"'])(?:[A-Za-zÀ-ÿ]{1,2}|éd|trad|dir|coll|cf|ex|art|chap|vol|fig|env|etc|av|apr|ibid|op|cit|Mgr|St|Ste)$/u
function finDePhrase(s) {
  const m = masquerCode(s)
  for (let i = 0; i < m.length; i++) {
    if (!/[.!?]/.test(m[i])) continue
    if (i + 1 < m.length && !/\s/.test(m[i + 1])) continue
    if (m[i] === '.' && (ABREV.test(m.slice(0, i)) || /\d$/.test(m.slice(0, i)))) continue
    return i
  }
  return -1
}

function imperatif(brut) {
  const t = brut.replace(/^[-*\s]+/, '').trim()
  const marque = /^(⛔|⚠️)\s*/.exec(t)
  const tete = marque ? marque[0] : ''
  const corps = t.slice(tete.length)

  const gras = /^\*\*(.+?)\*\*/su.exec(corps)
  if (gras) {
    let g = gras[1].trim()
    // Un gras qui ne se clôt pas sur une ponctuation forte appelle la proposition
    // qui le suit : sans elle, on ne garderait qu'un titre.
    if (!/[.!?]$/.test(g)) {
      const suite = corps.slice(gras[0].length).replace(/^[\s:,;—-]+/, '')
      const f = finDePhrase(suite.slice(0, 240))
      // ⚠️ Le tiret ne se pose pas devant une parenthèse ni un deux-points : « TOUTES
      // LETTRES — (décision…) » se lit mal, quand « TOUTES LETTRES (décision…) » se lit.
      // ⚠️ Une suite qui n'est que ponctuation n'ajoute rien : « … — . » n'est pas une
      // phrase. On ne raccorde que si la suite porte réellement des mots.
      if (f >= 0) {
        const s = suite.slice(0, f + 1)
        if (s.replace(/[^\p{L}\p{N}]/gu, '').length >= 8) {
          g = g.replace(/[:,;]$/, '') + (/^[(«]/u.test(s) ? ' ' : ' — ') + s
        } else if (!/[.!?]$/.test(g)) g += '.'
      }
    }
    return tete + g
  }

  const f = finDePhrase(corps.slice(0, 420))
  if (f < 0) return tete + (corps.length > 420 ? corps.slice(0, 420).replace(/\s+\S*$/, '') + '…' : corps)
  return tete + corps.slice(0, f + 1)
}

// ── Extraction ───────────────────────────────────────────────────────────────
const enonces = []
lignes.forEach((s, i) => {
  if (!/⛔|⚠️/.test(s)) return
  const sec = sectionDe(i)
  if (!sec) return
  // Une ligne peut porter deux énoncés : « ⛔ … ⚠️ … ». On les sépare.
  for (const bout of s.split(/(?=⛔|⚠️)/).filter(x => /⛔|⚠️/.test(x))) {
    const p = imperatif(bout)
    // ⚠️ Un fragment trop court n'est pas une règle : « jamais 24e. » ne se tient pas
    // seul hors de sa phrase, et le noyau doit pouvoir se lire sans la charte ouverte.
    if (p.replace(/[⛔⚠️*\s]/g, '').length < 32) continue
    enonces.push({ num: sec.num, titre: sec.titre, rang: sec.rang, texte: p })
  }
})

// ── Rendu ────────────────────────────────────────────────────────────────────
const parSection = new Map()
for (const e of enonces) {
  if (!parSection.has(e.num)) parSection.set(e.num, { titre: e.titre, rang: e.rang, lignes: [] })
  parSection.get(e.num).lignes.push(e.texte)
}
const ordre = titres.filter(t => parSection.has(t.num)).map(t => t.num)

const sortie = [
  '# Noyau de la charte — la loi seule',
  '',
  '⛔ **Ce fichier est DÉRIVÉ, jamais édité.** Il est régénéré par `node scripts/charte-noyau.mjs` depuis `charte/CHARTE_IA.md`, dont il extrait l’impératif de chaque énoncé marqué ⛔ ou ⚠️. Une correction portée ici se perd à la première régénération : on corrige la charte.',
  '',
  '⚠️ **Il ne remplace pas la charte, il y mène.** Chaque énoncé porte le numéro de sa section : on lit le noyau pour savoir qu’une règle EXISTE, on ouvre la charte pour savoir ce qu’elle dit exactement, ce qu’elle excepte et ce qui la fonde.',
  '',
  '⚠️ **Ce que le noyau ne voit pas.** Il s’extrait sur les marques ⛔ et ⚠️. Un chapitre qui prescrit sans les employer y est sous-représenté, et cela ne veut PAS dire qu’il prescrit peu : voyez le relevé de couverture, en pied.',
  '',
  '---',
]
let chapitreCourant = null
for (const num of ordre) {
  const s = parSection.get(num)
  const chap = num.split('.')[0]
  if (chap !== chapitreCourant) {
    const tc = titres.find(t => t.num === chap)
    sortie.push('', `## § ${chap}. ${tc ? tc.titre : ''}`, '')
    chapitreCourant = chap
  }
  sortie.push(`**§ ${num} — ${s.titre}**`, '')
  for (const x of s.lignes) sortie.push(`- ${x}`)
  sortie.push('')
}

// ── Couverture : quels chapitres le noyau représente mal ─────────────────────
const chapitres = titres.filter(t => !t.num.includes('.'))
const couverture = chapitres.map((c, k) => {
  const fin = k + 1 < chapitres.length ? chapitres[k + 1].i : lignes.length
  const signes = lignes.slice(c.i, fin).join('\n').length
  const n = enonces.filter(e => e.num === c.num || e.num.startsWith(c.num + '.')).length
  return { num: c.num, titre: c.titre, signes, n, densite: signes ? n / (signes / 1000) : 0 }
}).filter(c => c.signes > 8000).sort((a, b) => a.densite - b.densite)

sortie.push('', '---', '', '## Couverture — les chapitres que le noyau représente le moins', '',
  'Un chapitre qui prescrit sans employer ⛔ ni ⚠️ passe sous le noyau. La colonne à surveiller est la dernière : elle mesure une CONVENTION D’ÉCRITURE, non une densité de règle.', '',
  '| § | chapitre | signes | énoncés | pour mille signes |', '|---|---|---:|---:|---:|')
for (const c of couverture.slice(0, 8))
  sortie.push(`| ${c.num} | ${c.titre.slice(0, 46)} | ${c.signes.toLocaleString('fr-FR')} | ${c.n} | **${c.densite.toFixed(1)}** |`)

const texte = sortie.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
const charte = lignes.join('\n').length

console.log('charte :', charte.toLocaleString('fr-FR'), 'signes')
console.log('noyau  :', texte.length.toLocaleString('fr-FR'), 'signes —',
  (texte.length / charte * 100).toFixed(1) + ' % —', Math.round(texte.length / 3.6).toLocaleString('fr-FR'), 'jetons environ')
console.log('énoncés extraits :', enonces.length, 'dans', parSection.size, 'sections')
console.log('\nles cinq chapitres les moins couverts (énoncés pour mille signes) :')
for (const c of couverture.slice(0, 5))
  console.log('  § ' + c.num.padStart(3) + '  ' + c.densite.toFixed(1).padStart(4) + '  ' + c.titre.slice(0, 52))

if (!MESURER) { writeFileSync(cible, texte, 'utf8'); console.log('\nécrit :', cible) }
else console.log('\n(--mesurer : rien écrit)')
