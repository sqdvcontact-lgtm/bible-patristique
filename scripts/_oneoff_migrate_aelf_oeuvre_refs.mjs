import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

function replaceBetween(source, start, end, replacement, label) {
  const i = source.indexOf(start)
  if (i < 0) throw new Error(`${label}: début introuvable`)
  const j = source.indexOf(end, i + start.length)
  if (j < 0) throw new Error(`${label}: fin introuvable`)
  if (source.indexOf(start, i + start.length) >= 0) throw new Error(`${label}: début non unique`)
  return source.slice(0, i) + replacement + source.slice(j)
}

// ── Rendu serveur d'une œuvre : les références affichées viennent de la projection AELF.
{
  const path = 'app/oeuvre/[id]/page.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(
    s,
    `import { hydraterLiensHerites } from '@/app/lib/liens'\n`,
    `import { hydraterLiensHerites } from '@/app/lib/liens'\nimport { referencesBibliquesAelfParSegment } from '@/app/lib/referencesBibliquesAelf'\n`,
    'page.tsx import projection AELF',
  )
  s = replaceBetween(
    s,
    `async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {`,
    `\n\nexport default async function OeuvrePage`,
    `async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {\n  return referencesBibliquesAelfParSegment(\n    supabase,\n    segments.map(segment => segment.id),\n    codesTraductions,\n  )\n}\n`,
    'page.tsx enrichissement AELF',
  )
  s = replaceOnce(
    s,
`  const versetMap = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)\n\n  const versetParSegment: Record<number, any[]> = {}\n  segmentsTexte.forEach(s => {\n    versetParSegment[s.id] = extraireVersetsAvecNature(s).map(({ id: vid, natures }) => ({\n      id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {} })\n    }))\n  })`,
`  const refsAelfParSegment = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)\n\n  const versetParSegment: Record<number, any[]> = {}\n  segmentsTexte.forEach(s => {\n    versetParSegment[s.id] = refsAelfParSegment.get(s.id) ?? []\n  })`,
    'page.tsx références par segment',
  )
  s = s.replace(
    '// N\'expose que les traductions réellement matérialisées dans `versets_lecture` :\n// une colonne inexistante dans le select fait échouer toute la requête (voir\n// app/lib/traductions.ts).',
    '// Traductions réellement accessibles dans la lecture AELF ; `codesTraductionsLecture`\n// respecte la visibilité de TR0012 et ne rend donc jamais son texte public.',
  )
  if (s.includes(".from('versets_lecture')")) throw new Error('page.tsx: lecture versets_lecture encore présente')
  fs.writeFileSync(path, s)
}

// ── Chargements client des niveaux d'une œuvre + navigation/suppression.
{
  const path = 'app/oeuvre/[id]/OeuvreClient.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(
    s,
    `import { hydraterLiensHerites } from '@/app/lib/liens'\n`,
    `import { hydraterLiensHerites } from '@/app/lib/liens'\nimport { referencesBibliquesAelfParSegment } from '@/app/lib/referencesBibliquesAelf'\n`,
    'OeuvreClient import projection AELF',
  )
  const marker = `function detailsRefBiblique(ref: string): { label: string; livre: string; chapitre: string; verset: string } {`
  const insertion = `function urlReferenceBiblique(v: { livre: string; chapitre: string; chapitreBase?: number | null; verset: string; aelfReference?: string | null }, trad: string): string {\n  const params = new URLSearchParams()\n  params.set('livre', v.livre)\n  const chapitreBase = v.chapitreBase ?? Number.parseInt(v.chapitre, 10)\n  params.set('chapitre', String(Number.isFinite(chapitreBase) ? chapitreBase : 1))\n  if (v.verset) params.set('verset', v.verset)\n  if (v.aelfReference) params.set('aelf', v.aelfReference)\n  params.set('trad', trad)\n  return \`/?\${params.toString()}\`\n}\n\n`
  const markerPos = s.indexOf(marker)
  if (markerPos < 0) throw new Error('OeuvreClient: point insertion URL AELF introuvable')
  s = s.slice(0, markerPos) + insertion + s.slice(markerPos)

  s = replaceBetween(
    s,
    `    const tousIds = new Set<string>()\n    const segsAffichables = segs.filter(segmentAffichable)`,
    `\n\n    let c = 0`,
    `    const segsAffichables = segs.filter(segmentAffichable)\n    const codesTraductions = await chargerCodesTraductions()\n    const refsAelfParSegment = await referencesBibliquesAelfParSegment(\n      supabase,\n      segsAffichables.map((segment: any) => segment.id),\n      codesTraductions,\n    )`,
    'OeuvreClient chargeur AELF',
  )
  s = replaceOnce(
    s,
`      const versets = extraireVersetsAvecNature(s)\n        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))`,
`      const versets = refsAelfParSegment.get(s.id) ?? []`,
    'OeuvreClient versets projetés',
  )

  s = replaceBetween(
    s,
    `  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {`,
    `\n  //`,
    `  const supprimerLiensBibliques = async (segId: number, versetsCibles: SegData['versets']) => {\n    if (!estAdmin || !versetsCibles.length) return\n    const linkIds = Array.from(new Set(versetsCibles.flatMap(v => v.linkIds ?? [])))\n    const canonsHistoriques = Array.from(new Set(versetsCibles.flatMap(v => v.historicalCanonId ? [v.historicalCanonId] : [])))\n    if (!linkIds.length && !canonsHistoriques.length) return\n    const multiple = versetsCibles.length > 1 || linkIds.length > 1\n    if (!confirm(multiple ? 'Supprimer ces liens bibliques ?' : 'Supprimer ce lien biblique ?')) return\n    const requete = supabase.from('liens_bibliques').delete().eq('segment_id', segId)\n    const { error } = linkIds.length\n      ? await requete.in('id', linkIds)\n      : await requete.in('canon_id', canonsHistoriques)\n    if (error) { alert('Suppression impossible : ' + error.message); return }\n    const idsSupprimes = new Set(linkIds)\n    const canonsSupprimes = new Set(canonsHistoriques)\n    setSegments(prev => prev.map(s => s.id === segId ? {\n      ...s,\n      versets: s.versets.filter(v => {\n        if ((v.linkIds ?? []).some(id => idsSupprimes.has(id))) return false\n        return !(v.historicalCanonId && canonsSupprimes.has(v.historicalCanonId))\n      }),\n    } : s))\n  }\n`,
    'OeuvreClient suppression par lien',
  )
  s = replaceOnce(
    s,
    `href={\`/?livre=\${encodeURIComponent(premier.livre)}&chapitre=\${encodeURIComponent(premier.chapitre)}&verset=\${encodeURIComponent(premier.verset)}&trad=\${encodeURIComponent(trad)}\`}`,
    `href={urlReferenceBiblique(premier, trad)}`,
    'OeuvreClient lien profond AELF',
  )
  s = replaceOnce(
    s,
    `const natures = Array.from(new Set(groupe.flatMap(v => (v as any).natures ?? []))) as string[]`,
    `const natures = Array.from(new Set(groupe.flatMap(v => v.natures ?? []))) as string[]`,
    'OeuvreClient natures typées',
  )
  s = replaceOnce(
    s,
    `onClick={() => supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))}`,
    `onClick={() => supprimerLiensBibliques(segActifData.id, groupe)}`,
    'OeuvreClient suppression groupe',
  )
  s = replaceOnce(
    s,
    `<BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />`,
    `<BoutonSignalerVerset versetId={premier.aelfReference ?? premier.historicalCanonId ?? premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />`,
    'OeuvreClient signalement AELF',
  )
  // Le panneau « Problèmes » demeure volontairement historique : c'est une surface
  // d'audit éditorial (catégorie B), pas l'axe actif du lecteur.
  s = s.replace(
    `      const idsVersets = Array.from(new Set(liens.map(l => l.canon_id).filter(Boolean) as string[]))`,
    `      // B — historique éditorial : on montre ici la référence ancienne examinée.\n      const idsVersets = Array.from(new Set(liens.map(l => l.canon_id).filter(Boolean) as string[]))`,
  )
  fs.writeFileSync(path, s)
}

// ── Contrat VRef : identités AELF + ids de liens, sans retirer l'identité historique.
{
  const path = 'app/oeuvre/[id]/oeuvreTypes.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(
    s,
`  aelfVersionId?: string | null\n  aelfEntryId?: string | null\n  historicalCanonId?: string | null`,
`  aelfVersionId?: string | null\n  aelfEntryId?: string | null\n  aelfReference?: string | null\n  historicalCanonId?: string | null\n  chapitreBase?: number | null\n  linkIds?: number[]\n  natures?: string[]`,
    'oeuvreTypes métadonnées AELF',
  )
  fs.writeFileSync(path, s)
}

// ── Prélèvements depuis une œuvre : conserver la référence AELF exacte.
{
  const path = 'app/oeuvre/[id]/BoutonsVerset.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(
    s,
`    const texte = verset.textes[trad] || verset.textes['TR0001'] || ''\n    const { data, error } = await supabase.from('prelevements').insert({\n      user_id: userId, type: 'biblique',\n      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],\n      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),\n      texte, traduction: trad,\n    }).select('id').single()`,
`    const texte = verset.textes[trad] || verset.textes['TR0001'] || ''\n    const chapitreBase = verset.chapitreBase ?? Number.parseInt(verset.chapitre, 10)\n    const versetBase = Number.parseInt(verset.verset, 10)\n    const { data, error } = await supabase.from('prelevements').insert({\n      user_id: userId, type: 'biblique',\n      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],\n      ref_chapitre: Number.isFinite(chapitreBase) ? chapitreBase : null,\n      ref_verset: Number.isFinite(versetBase) ? versetBase : null,\n      ref_chapitre_label: verset.chapitre || null,\n      ref_verset_label: verset.verset || null,\n      aelf_version_id: verset.aelfVersionId ?? null,\n      aelf_entry_id: verset.aelfEntryId ?? null,\n      aelf_reference: verset.aelfReference ?? null,\n      texte, traduction: trad,\n    }).select('id').single()`,
    'BoutonsVerset prélèvement AELF',
  )
  fs.writeFileSync(path, s)
}

// ── Bible classique : lien profond AELF exact + provenance complète des prélèvements.
{
  const path = 'app/components/TexteBible.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(
    s,
`  useEffect(() => {\n    const versetCible = searchParams.get('verset')\n    if (!versetCible) return\n    const v = versets.find(v => nettoyerLabelAelf(v.verset_label ?? v.verset) === nettoyerLabelAelf(versetCible))\n    if (v) setVersetSelectionne(v)\n    const el = v ? document.getElementById(\`verset-\${v.aelf_entry_id ?? v.id_verset}\`) : null`,
`  useEffect(() => {\n    const aelfCible = searchParams.get('aelf')\n    const versetCible = searchParams.get('verset')\n    if (!aelfCible && !versetCible) return\n    const v = aelfCible\n      ? versets.find(v => v.aelf_reference === aelfCible)\n      : versets.find(v => nettoyerLabelAelf(v.verset_label ?? v.verset) === nettoyerLabelAelf(versetCible))\n    if (v) setVersetSelectionne(v)\n    const el = v ? document.getElementById(\`verset-\${v.aelf_entry_id ?? v.id_verset}\`) : null`,
    'TexteBible sélection AELF exacte',
  )
  s = replaceOnce(
    s,
`      aelf_version_id: verset.aelf_version_id ?? null,\n      aelf_entry_id: verset.aelf_entry_id ?? null,\n      texte, traduction: traductionLabel,`,
`      aelf_version_id: verset.aelf_version_id ?? null,\n      aelf_entry_id: verset.aelf_entry_id ?? null,\n      aelf_reference: verset.aelf_reference ?? null,\n      ref_chapitre_label: verset.chapitre_label ?? String(chapitreActif),\n      ref_verset_label: verset.verset_label ?? String(verset.verset),\n      texte, traduction: traductionLabel,`,
    'TexteBible prélèvement provenance AELF',
  )
  fs.writeFileSync(path, s)
}

// Garde-fous : les surfaces de lecture ordinaires d'une œuvre ne doivent plus
// recharger le texte biblique par l'ancien axe. Le seul `versets_lecture` autorisé
// dans OeuvreClient est l'onglet Problèmes, explicitement historique.
{
  const page = fs.readFileSync('app/oeuvre/[id]/page.tsx', 'utf8')
  if (page.includes(".from('versets_lecture')")) throw new Error('page.tsx dépend encore de versets_lecture')
  const client = fs.readFileSync('app/oeuvre/[id]/OeuvreClient.tsx', 'utf8')
  const occurrences = client.match(/\.from\('versets_lecture'\)/g)?.length ?? 0
  if (occurrences !== 1) throw new Error(`OeuvreClient: ${occurrences} lectures legacy, attendu 1 (audit historique)`) 
}

console.log('Affichage des références des œuvres migré vers la spine AELF/TOL.')
