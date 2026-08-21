import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

const path = 'app/components/TexteBible.tsx'
let s = fs.readFileSync(path, 'utf8')

if (!s.includes("const chapitreCible = searchParams.get('chapitre')")) {
  s = replaceOnce(s,
`  useEffect(() => {
    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    const v = versets.find(v => nettoyerLabelAelf(v.verset_label ?? v.verset) === nettoyerLabelAelf(versetCible))`,
`  useEffect(() => {
    const chapitreCible = searchParams.get('chapitre')
    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    // Le chapitre brut de l'URL conserve les suffixes AELF (9A/9B, etc.).
    // `app/page.tsx` le ramène à sa base numérique pour charger le chapitre,
    // mais la sélection du verset doit rester exacte afin de ne jamais confondre
    // deux sous-chapitres qui portent le même numéro de verset.
    const v = versets.find(v => {
      const memeVerset = nettoyerLabelAelf(v.verset_label ?? v.verset) === nettoyerLabelAelf(versetCible)
      if (!memeVerset) return false
      if (!chapitreCible) return true
      return nettoyerLabelAelf(v.chapitre_label ?? v.chapitre) === nettoyerLabelAelf(chapitreCible)
    })`,
    'sélection exacte du chapitre AELF')
}

if (!s.includes('aelf_reference: verset.aelf_reference ?? null')) {
  s = replaceOnce(s,
`      aelf_version_id: verset.aelf_version_id ?? null,
      aelf_entry_id: verset.aelf_entry_id ?? null,
      texte, traduction: traductionLabel,`,
`      aelf_version_id: verset.aelf_version_id ?? null,
      aelf_entry_id: verset.aelf_entry_id ?? null,
      aelf_reference: verset.aelf_reference ?? null,
      ref_chapitre_label: verset.chapitre_label ?? String(chapitreActif),
      ref_verset_label: verset.verset_label ?? String(verset.verset),
      texte, traduction: traductionLabel,`,
    'provenance AELF du prélèvement')
}

if (!s.includes("return nettoyerLabelAelf(v.chapitre_label ?? v.chapitre) === nettoyerLabelAelf(chapitreCible)")) {
  throw new Error('sélection AELF exacte absente après transformation')
}
if (!s.includes('aelf_reference: verset.aelf_reference ?? null')) {
  throw new Error('aelf_reference absent du prélèvement après transformation')
}

fs.writeFileSync(path, s)
console.log('Navigation AELF exacte et prélèvements de la Bible classique sécurisés.')
