// Analyse des anomalies Giguet → liste de revue manuelle lisible.
import { readFileSync, writeFileSync } from 'node:fs'
const anos = JSON.parse(readFileSync('scripts/giguet-anomalies.json','utf8'))
const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))

function decrire(seq){
  const notes = []
  const vus = new Set()
  let attendu = 1
  for (let i=0;i<seq.length;i++){
    const n = seq[i]
    if (n === attendu) { vus.add(n); attendu++; continue }
    if (n < attendu) notes.push(`position ${i+1} : n° « ${n} » (attendu ${attendu}) — étiquette erronée`)
    else if (n > attendu) { notes.push(`saut : « ${attendu} » à « ${n-1} » manquant(s) (… ${seq[i-1]} → ${n})`); attendu = n+1; continue }
    attendu = n+1
  }
  return notes
}

const lignes = []
lignes.push('# Giguet (Septante) — points à vérifier à la main')
lignes.push('')
lignes.push('Chaque entrée = un chapitre dont la numérotation des versets présente un accroc dans la source Wikisource (souvent un saut de page). Le texte est extrait ; seule la **numérotation d’origine** est à confirmer contre le scan.')
lignes.push('')

// regrouper par livre
const parLivre = {}
for (const a of anos) { (parLivre[a.code] ??= []).push(a) }
for (const [code, list] of Object.entries(parLivre)) {
  lignes.push(`## ${code}`)
  for (const a of list) {
    if (a.erreur) { lignes.push(`- **ch ${a.ch}** : ERREUR extraction — ${a.erreur}`); continue }
    const chObj = gig[code]?.find(c=>c.ch===a.ch)
    const nbV = chObj?.versets.length ?? '?'
    const notes = decrire(a.seq)
    lignes.push(`- **ch ${a.ch}** (${nbV} paragraphes numérotés, dernier n° ${a.max}) :`)
    for (const n of notes.slice(0,6)) lignes.push(`    - ${n}`)
  }
  lignes.push('')
}

// anomalies structurelles connues
lignes.push('## Points structurels à trancher')
lignes.push('- **ISA** : 67 chapitres extraits (Isaïe en a 66) → marqueur « CHAPITRE » parasite à localiser.')
lignes.push('- **PRO** : 32 chapitres extraits (Proverbes en a 31) → idem ; la LXX réordonne Pr 24-31.')
lignes.push('- **PSA** : 151 psaumes (le Ps 151 grec ; hors canon catholique → à router en apocryphe).')
lignes.push('- **Suscriptions des Psaumes** : à vérifier (certaines numérotées v.1, d’autres non) pour l’alignement AELF.')

const md = lignes.join('\n')
writeFileSync('scripts/giguet-revue.md', md)
console.log(md)
console.log(`\n\n[${anos.length} anomalies, ${Object.keys(parLivre).length} livres concernés → scripts/giguet-revue.md]`)
