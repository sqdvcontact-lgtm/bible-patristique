import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

const path = 'app/recherche/RechercheClient.tsx'
let s = fs.readFileSync(path, 'utf8')

if (!s.includes("from '@/app/lib/rechercheBibleAelf'")) {
  s = replaceOnce(s,
`import { cesurerGrec, codeLangue, copierSansCesuresGrecques } from '@/app/lib/grec'`,
`import { cesurerGrec, codeLangue, copierSansCesuresGrecques } from '@/app/lib/grec'
import {
  projeterResultatsRechercheBibleAelf,
  urlResultatRechercheBible,
  type ResultatRechercheBibleAelf,
} from '@/app/lib/rechercheBibleAelf'`,
    'import projection AELF')
}

s = replaceOnce(s,
`function refFr(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  return cv[1] ? \`${'${abrevFr(p[0])} ${cv[0]}, ${cv[1]}'}\` : \`${'${abrevFr(p[0])} ${cv[0]}'}\`
}`,
`function nettoyerLabelAelfRecherche(value: string | number | null | undefined): string {
  const brut = String(value ?? '')
  const nettoye = brut.replace(/^0+(?=\\d)/, '')
  return nettoye || brut
}
function refFr(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const chapitre = nettoyerLabelAelfRecherche(cv[0])
  const verset = cv[1] ? nettoyerLabelAelfRecherche(cv[1]) : ''
  return verset ? \`${'${abrevFr(p[0])} ${chapitre}, ${verset}'}\` : \`${'${abrevFr(p[0])} ${chapitre}'}\`
}
function refResultatBible(v: VersetResult): string {
  const chapitre = nettoyerLabelAelfRecherche(v.chapitre_label ?? v.chapitre)
  const verset = nettoyerLabelAelfRecherche(v.verset_label ?? v.verset)
  return verset ? \`${'${abrevFr(v.livre)} ${chapitre}, ${verset}'}\` : \`${'${abrevFr(v.livre)} ${chapitre}'}\`
}`,
  'référence AELF exacte')

s = replaceOnce(s,
`function comparerVersets(a: VersetResult, b: VersetResult): number {
  return (ORDRE_LIVRE[a.livre] ?? 9999) - (ORDRE_LIVRE[b.livre] ?? 9999)
    || a.chapitre - b.chapitre || a.verset - b.verset
}`,
`function comparerVersets(a: VersetResult, b: VersetResult): number {
  const rangLivre = (ORDRE_LIVRE[a.livre] ?? 9999) - (ORDRE_LIVRE[b.livre] ?? 9999)
  if (rangLivre) return rangLivre
  if (a.hors_axe_aelf !== true && b.hors_axe_aelf !== true
      && typeof a.ordre === 'number' && typeof b.ordre === 'number') {
    return a.ordre - b.ordre
  }
  const chapitre = a.chapitre - b.chapitre
  if (chapitre) return chapitre
  const chapitreLabel = String(a.chapitre_label ?? a.chapitre)
    .localeCompare(String(b.chapitre_label ?? b.chapitre), 'fr', { numeric: true })
  if (chapitreLabel) return chapitreLabel
  return a.verset - b.verset
    || String(a.verset_label ?? a.verset).localeCompare(String(b.verset_label ?? b.verset), 'fr', { numeric: true })
}`,
  'tri AELF exact')

s = replaceOnce(s,
`type VersetResult = {
  id_verset: string; ref: string; livre: string; chapitre: number; verset: number
  [key: string]: any
}`,
`type VersetResult = ResultatRechercheBibleAelf & {
  [key: string]: any
}`,
  'type résultat Bible AELF')

s = replaceOnce(s,
`      const selVersets = \`id_verset, ref, livre, chapitre, verset, ${'${tradCodes.join(\', \')}'}, ${'${tradCodes.map(c => \'num_\' + c).join(\', \')}'}` + '`',
`      const selVersets = \`id_verset, ref, livre, chapitre, verset, est_suscription, est_surnumeraire, ordre, ${'${tradCodes.join(\', \')}'}, ${'${tradCodes.map(c => \'num_\' + c).join(\', \')}'}` + '`',
  'colonnes index de recherche')

s = replaceOnce(s,
`      const versetsRaw = versetsArr as unknown as VersetResult[]
      const colsFiltre = chercheTout ? tradCodes : [scopeActif]
      const versets = versetsRaw.filter(v => colsFiltre.some(c => contientTerme(String(v[c] ?? ''), q, modeActif)))
      setVersetsRes(versets)`,
`      const versetsRaw = versetsArr as unknown as VersetResult[]
      const colsFiltre = chercheTout ? tradCodes : [scopeActif]
      const hitsIndex = versetsRaw.filter(v => colsFiltre.some(c => contientTerme(String(v[c] ?? ''), q, modeActif)))
      // `versets_lecture` reste ici un INDEX historique performant, jamais la référence
      // de sortie : tous les hits sont résolus vers la spine AELF avant affichage.
      const versets = await projeterResultatsRechercheBibleAelf(hitsIndex, signal)
      if (signal.aborted) return
      setVersetsRes(versets)`,
  'projection des hits vers AELF')

s = s.replaceAll(
  `href={\`/?livre=${'${encodeURIComponent(v.livre)}'}&chapitre=${'${v.chapitre}'}&verset=${'${v.verset}'}&trad=${'${tradBible}'}#verset-${'${v.verset}'}\`}`,
  `href={urlResultatRechercheBible(v, tradBible)}`,
)

s = s.replaceAll(`>{refFr(v.ref)}</span>`, `>{refResultatBible(v)}</span>`)
s = s.replaceAll(
  `<div className="poly-num">{v.chapitre}, {v.verset}</div>`,
  `<div className="poly-num">{nettoyerLabelAelfRecherche(v.chapitre_label ?? v.chapitre)}, {nettoyerLabelAelfRecherche(v.verset_label ?? v.verset)}</div>`,
)

// Les références sans cible AELF restent visibles mais sont explicitement qualifiées.
const refSpan = `<span style={{ fontSize:'0.65625rem', fontWeight:600, color:'#5a5248', letterSpacing:'0.01em' }}>{refResultatBible(v)}</span>`
if (s.includes(refSpan) && !s.includes(`hors axe AELF</span>`)) {
  s = s.replace(refSpan, refSpan + `\n                            {v.hors_axe_aelf && <span style={{ fontSize:'0.5625rem', color:'var(--cs-texte-faible)', fontStyle:'italic' }}>hors axe AELF</span>}`)
}

if (s.includes(`href={\`/?livre=${'${encodeURIComponent(v.livre)}'}`)) throw new Error('URL biblique legacy restante dans les résultats')
if (!s.includes('await projeterResultatsRechercheBibleAelf(hitsIndex, signal)')) throw new Error('projection AELF absente')
if (!s.includes('urlResultatRechercheBible(v, tradBible)')) throw new Error('navigation AELF absente')

fs.writeFileSync(path, s)
console.log('Recherche biblique projetée vers la spine AELF.')
