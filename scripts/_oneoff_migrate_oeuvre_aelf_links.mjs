import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

// ── Helper AELF : version active + référence externe exacte ─────────────────
{
  const path = 'app/oeuvre/[id]/versetsAelf.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `type VRefAvecNature = VRef & { natures: string[] }`,
    `type VRefAvecNature = VRef & { natures: string[]; aelfReference?: string | null }`,
    'VRef enrichi')
  s = replaceOnce(s,
`  const [cellulesAelf, cellulesLegacy] = await Promise.all([\n    cellulesLectureAelf(entryIds, client),\n    cellulesHistoriques(client, canonsLegacyOnly),\n  ])`,
`  const [cellulesAelf, cellulesLegacy, versionResult] = await Promise.all([\n    cellulesLectureAelf(entryIds, client),\n    cellulesHistoriques(client, canonsLegacyOnly),\n    client.from('v_aelf_spine_axis').select('version_id').limit(1),\n  ])\n  if (versionResult.error) throw new Error(\`Version AELF illisible : \${versionResult.error.message}\`)\n  const aelfVersionId = versionResult.data?.[0]?.version_id ?? null`,
    'version AELF active')
  s = replaceOnce(s,
`        aelfVersionId: (premier as LienAelf & { aelf_version_id?: string | null }).aelf_version_id ?? null,\n        aelfEntryId: entryId,`,
`        aelfVersionId,\n        aelfEntryId: entryId,\n        aelfReference: premier.aelf_external_reference ?? null,`,
    'identité AELF du VRef')
  s = replaceOnce(s,
`        aelfVersionId: null,\n        aelfEntryId: null,`,
`        aelfVersionId: null,\n        aelfEntryId: null,\n        aelfReference: null,`,
    'identité legacy_only')
  fs.writeFileSync(path, s)
}

// ── Rendu serveur des œuvres : plus de versets_lecture ──────────────────────
{
  const path = 'app/oeuvre/[id]/page.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'`,
    `import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'\nimport { chargerVersetsAelfSegments } from './versetsAelf'`,
    'import helper AELF serveur')

  const oldFnStart = s.indexOf(`async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {`)
  if (oldFnStart < 0) throw new Error('enrichirAvecVersets legacy introuvable')
  const oldFnEnd = s.indexOf(`\n}\n\nexport default async function OeuvrePage`, oldFnStart)
  if (oldFnEnd < 0) throw new Error('fin enrichirAvecVersets legacy introuvable')
  const newFn = `async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {\n  return chargerVersetsAelfSegments(supabase, segments.map(s => s.id), codesTraductions)\n}`
  s = s.slice(0, oldFnStart) + newFn + s.slice(oldFnEnd + 3)

  s = replaceOnce(s,
`  // 4. Versets pour le premier livre seulement\n  const versetMap = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)\n\n  const versetParSegment: Record<number, any[]> = {}\n  segmentsTexte.forEach(s => {\n    versetParSegment[s.id] = extraireVersetsAvecNature(s).map(({ id: vid, natures }) => ({\n      id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {} })\n    }))\n  })`,
`  // 4. Apparats bibliques : l'identité de lecture vient désormais de la spine AELF.\n  // Les liens historiques restent dans liens_bibliques et ne sont pas réécrits.\n  const versetsAelf = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)\n  const versetParSegment: Record<number, any[]> = Object.fromEntries(versetsAelf)`,
    'apparat serveur AELF')

  if (s.includes(".from('versets_lecture')")) throw new Error('page.tsx: versets_lecture résiduel')
  fs.writeFileSync(path, s)
}

// ── Client des œuvres : chargements dynamiques, problèmes, suppression ──────
{
  const path = 'app/oeuvre/[id]/OeuvreClient.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { hydraterLiensHerites } from '@/app/lib/liens'`,
    `import { hydraterLiensHerites, liensAelfDeSegments } from '@/app/lib/liens'`,
    'import liens AELF client')
  s = replaceOnce(s,
    `import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee, NoteAffichee } from './oeuvreTypes'`,
    `import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee, NoteAffichee, VRef } from './oeuvreTypes'\nimport { chargerVersetsAelfSegments } from './versetsAelf'`,
    'import helper AELF client')
  s = s.replace('Ne garde que les traductions matérialisées dans `versets_lecture`', 'Ne garde que les traductions matérialisées dans la lecture AELF')

  // Onglet Problèmes : le tableau de références vient du résolveur AELF,
  // tout en gardant le canon historique comme clé de compatibilité quand il existe.
  const problemStart = s.indexOf(`      const idsVersets = Array.from(new Set(liens.map(l => l.canon_id).filter(Boolean) as string[]))`)
  if (problemStart < 0) throw new Error('bloc problèmes versets_lecture introuvable')
  const problemEnd = s.indexOf(`\n    })()\n  }, [ongletDroit, idOeuvre, idTexte, problemesCharges])`, problemStart)
  if (problemEnd < 0) throw new Error('fin bloc problèmes introuvable')
  const problemReplacement = `      const refsProblemes = await chargerVersetsAelfSegments(\n        supabase,\n        [...parSegment.keys()],\n        ['TR0001', 'TR0002', 'TR0003'],\n      )\n      const map: Record<string, { ref: string; chapAlt: number | null; verAlt: number | null; texte: string | null }> = {}\n      for (const refs of refsProblemes.values()) {\n        for (const v of refs) {\n          if (!v.historicalCanonId) continue\n          const texte = v.textes.TR0003 || v.textes.TR0002 || v.textes.TR0001 || null\n          map[v.historicalCanonId] = {\n            ref: \`${'${v.livre}'} ${'${v.chapitre}'}:${'${v.verset}'}\`,\n            chapAlt: null,\n            verAlt: null,\n            texte,\n          }\n        }\n      }\n      setVersetsAltMap(map)`
  s = s.slice(0, problemStart) + problemReplacement + s.slice(problemEnd)

  // Chargement d'une nouvelle tranche de texte : les VRef sont construits par segment.
  const dynamicStart = s.indexOf(`    const tousIds = new Set<string>()\n    const segsAffichables = segs.filter(segmentAffichable)`)
  if (dynamicStart < 0) throw new Error('bloc dynamique legacy introuvable')
  const dynamicEnd = s.indexOf(`\n\n    let c = 0\n    const newSegs: SegData[] = segsAffichables.map`, dynamicStart)
  if (dynamicEnd < 0) throw new Error('fin bloc dynamique legacy introuvable')
  const dynamicReplacement = `    const segsAffichables = segs.filter(segmentAffichable)\n    const codesTraductions = await chargerCodesTraductions()\n    const versetsParSegment = await chargerVersetsAelfSegments(\n      supabase,\n      segsAffichables.map((seg: any) => seg.id),\n      codesTraductions,\n    )`
  s = s.slice(0, dynamicStart) + dynamicReplacement + s.slice(dynamicEnd)
  s = replaceOnce(s,
`      const versets = extraireVersetsAvecNature(s)\n        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))`,
`      const versets = versetsParSegment.get(s.id) ?? []`,
    'VRef dynamiques AELF')

  // La suppression admin part des cibles affichées et retrouve les ID réels de liens.
  const oldDelete = `  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {\n    if (!estAdmin || !versetIds.length) return\n    const multiple = versetIds.length > 1\n    if (!confirm(multiple ? \`Supprimer ces \${versetIds.length} liens bibliques ?\` : 'Supprimer ce lien biblique ?')) return\n    const { error } = await supabase.from('liens_bibliques')\n      .delete().eq('segment_id', segId).in('canon_id', versetIds)\n    if (error) { alert('Suppression impossible : ' + error.message); return }\n    const aRetirer = new Set(versetIds)\n    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))\n  }`
  const newDelete = `  const supprimerLiensBibliques = async (segId: number, versets: VRef[]) => {\n    if (!estAdmin || !versets.length) return\n    const multiple = versets.length > 1\n    if (!confirm(multiple ? \`Supprimer ces \${versets.length} liens bibliques ?\` : 'Supprimer ce lien biblique ?')) return\n    const parSegment = await liensAelfDeSegments([segId])\n    const liens = parSegment.get(segId) ?? []\n    const entryIds = new Set(versets.map(v => v.aelfEntryId).filter((v): v is string => Boolean(v)))\n    const legacyIds = new Set(versets.map(v => v.historicalCanonId).filter((v): v is string => Boolean(v)))\n    const linkIds = [...new Set(liens\n      .filter(l => (l.aelf_entry_id && entryIds.has(l.aelf_entry_id))\n        || (!l.aelf_entry_id && l.historical_canon_id && legacyIds.has(l.historical_canon_id)))\n      .map(l => l.id))]\n    if (!linkIds.length) { alert('Aucun lien historique correspondant à cette cible.'); return }\n    const { error } = await supabase.from('liens_bibliques').delete().in('id', linkIds)\n    if (error) { alert('Suppression impossible : ' + error.message); return }\n    const aRetirer = new Set(versets.map(v => v.id))\n    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))\n  }`
  s = replaceOnce(s, oldDelete, newDelete, 'suppression AELF')
  s = replaceOnce(s,
    `supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))`,
    `supprimerLiensBibliques(segActifData.id, groupe)`,
    'appel suppression AELF')

  if (s.includes(".from('versets_lecture')")) throw new Error('OeuvreClient: versets_lecture résiduel')
  fs.writeFileSync(path, s)
}

// ── Prélèvements bibliques depuis une œuvre ─────────────────────────────────
{
  const path = 'app/oeuvre/[id]/BoutonsVerset.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`      ref_livre: verset.label.split(' ')[0], ref_livre_abr: verset.label.split(' ')[0],\n      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),\n      texte, traduction: trad,`,
`      ref_livre: verset.livre || verset.label.split(' ')[0],\n      ref_livre_abr: verset.label.split(' ')[0],\n      ref_chapitre: parseInt(verset.chapitre) || null,\n      ref_verset: parseInt(verset.verset) || null,\n      ref_chapitre_label: verset.chapitre || null,\n      ref_verset_label: verset.verset || null,\n      aelf_version_id: verset.aelfVersionId ?? null,\n      aelf_entry_id: verset.aelfEntryId ?? null,\n      aelf_reference: (verset as VRef & { aelfReference?: string | null }).aelfReference ?? null,\n      texte, traduction: trad,`,
    'prélèvement AELF œuvre')
  fs.writeFileSync(path, s)
}

for (const path of ['app/oeuvre/[id]/page.tsx', 'app/oeuvre/[id]/OeuvreClient.tsx']) {
  const s = fs.readFileSync(path, 'utf8')
  if (s.includes(".from('versets_lecture')") || s.includes('.from("versets_lecture")')) {
    throw new Error(`${path}: lecture versets_lecture résiduelle`)
  }
}
console.log('Renvois bibliques des œuvres basculés sur AELF ; legacy_only conservé explicitement.')
