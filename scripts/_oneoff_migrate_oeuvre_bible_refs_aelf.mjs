import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

// ── 1. Références bibliques AELF par segment ────────────────────────────────
{
  const path = 'app/lib/liens.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { supabase } from '@/app/lib/supabase'`,
    `import { supabase } from '@/app/lib/supabase'\nimport { ABREV_FR } from '@/app/lib/bible'`,
    'liens.ts import ABREV_FR')
  s = replaceOnce(s,
`export type LienAelf = Lien & {\n  historical_canon_id: string | null`,
`export type LienAelf = Lien & {\n  historical_canon_id: string | null\n  aelf_version_id: string | null`,
    'LienAelf version')
  s = replaceOnce(s,
    `const COLS_AELF = \`${'${COLS}'}, historical_canon_id, aelf_entry_id,`,
    `const COLS_AELF = \`${'${COLS}'}, historical_canon_id, aelf_version_id, aelf_entry_id,`,
    'COLS_AELF version')

  const marker = `/** Recherche inverse : les segments qui renvoient à un verset donné.\n *`
  const helper = `export type ReferenceBibliqueAelf = {\n  id: string\n  label: string\n  textes: Record<string, string>\n  livre: string\n  chapitre: string\n  verset: string\n  aelfVersionId: string | null\n  aelfEntryId: string | null\n  aelfReference: string | null\n  historicalCanonId: string | null\n  resolutionStatus: LienAelf['resolution_status']\n  validationStatus: string | null\n  confidenceLevel: string | null\n  linkIds: number[]\n  natures: string[]\n  ordreAelf: number | null\n}\n\nconst NATURE_LIEN_AELF: Record<TypeLien, string> = {\n  1: 'citation',\n  2: 'reprise',\n  3: 'doctrine',\n  4: 'écho',\n}\n\nfunction labelNumeriqueAelf(value: string | null | undefined): string {\n  const v = String(value ?? '')\n  return /^0+\\d+$/.test(v) ? String(Number(v)) : v\n}\n\n/** Construit les cartes de versets affichées dans les œuvres patristiques.\n * L'axe normal est AELF ; les rares legacy_only sont lus dans la vue d'extras,\n * jamais forcés sur une entrée AELF. */\nexport async function referencesBibliquesAelfDeSegments(\n  segmentIds: number[],\n  codesTraductions: string[],\n  client: { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any } = supabase,\n): Promise<Map<number, ReferenceBibliqueAelf[]>> {\n  const sortie = new Map<number, ReferenceBibliqueAelf[]>()\n  if (!segmentIds.length) return sortie\n\n  const liensParSegment = await liensAelfDeSegments(segmentIds, client)\n  const tousLiens = [...liensParSegment.values()].flat()\n  const entryIds = [...new Set(tousLiens.map(l => l.aelf_entry_id).filter((v): v is string => Boolean(v)))]\n  const cellules = await cellulesLectureAelf(entryIds, client)\n  const textesParEntree = new Map<string, Record<string, string>>()\n  for (const c of cellules) {\n    if (!textesParEntree.has(c.aelf_entry_id)) textesParEntree.set(c.aelf_entry_id, {})\n    if (codesTraductions.includes(c.trad_id) && c.texte) textesParEntree.get(c.aelf_entry_id)![c.trad_id] = c.texte\n  }\n\n  const legacyIds = [...new Set(tousLiens\n    .filter(l => !l.aelf_entry_id && l.historical_canon_id)\n    .map(l => l.historical_canon_id as string))]\n  const extrasParCanon = new Map<string, Record<string, unknown>>()\n  const colonnesExtras = ['historical_canon_id', 'livre', 'chapitre_label', 'verset_label', 'ref', ...codesTraductions.map(c => \`"\${c}"\`)].join(', ')
  for (let i = 0; i < legacyIds.length; i += 200) {\n    const { data, error } = await client.from('v_aelf_bible_lecture_extras')\n      .select(colonnesExtras)\n      .in('historical_canon_id', legacyIds.slice(i, i + 200))\n    if (error) throw error\n    for (const row of (data ?? []) as Record<string, unknown>[]) {\n      const canon = typeof row.historical_canon_id === 'string' ? row.historical_canon_id : null\n      if (canon && !extrasParCanon.has(canon)) extrasParCanon.set(canon, row)\n    }\n  }\n\n  for (const segmentId of segmentIds) {\n    const refs = new Map<string, ReferenceBibliqueAelf>()\n    for (const lien of liensParSegment.get(segmentId) ?? []) {\n      if (!lien.aelf_entry_id && !lien.historical_canon_id) continue\n      const cle = lien.aelf_entry_id ? \`aelf:\${lien.aelf_entry_id}\` : \`legacy:\${lien.historical_canon_id}\`\n      let ref = refs.get(cle)\n      if (!ref) {\n        if (lien.aelf_entry_id) {\n          const livre = lien.aelf_book_code ?? lien.livre ?? ''\n          const chapitre = lien.aelf_chapter_label ?? (lien.chapitre == null ? '' : String(lien.chapitre))\n          const verset = labelNumeriqueAelf(lien.aelf_verse_label)\n          ref = {\n            id: \`AELF:\${lien.aelf_entry_id}\`,\n            label: verset ? \`\${livre} \${chapitre}, \${verset}\` : \`\${livre} \${chapitre}\`,\n            textes: { ...(textesParEntree.get(lien.aelf_entry_id) ?? {}) },\n            livre, chapitre, verset,\n            aelfVersionId: lien.aelf_version_id,\n            aelfEntryId: lien.aelf_entry_id,\n            aelfReference: lien.aelf_external_reference,\n            historicalCanonId: lien.historical_canon_id,\n            resolutionStatus: lien.resolution_status,\n            validationStatus: lien.validation_status,\n            confidenceLevel: lien.confidence_level,\n            linkIds: [], natures: [], ordreAelf: lien.aelf_sequence_no,\n          }\n        } else {\n          const canon = lien.historical_canon_id as string\n          const extra = extrasParCanon.get(canon)\n          const livre = String(extra?.livre ?? lien.livre ?? '')\n          const chapitre = String(extra?.chapitre_label ?? lien.chapitre ?? '')\n          const verset = labelNumeriqueAelf(typeof extra?.verset_label === 'string' ? extra.verset_label : '')\n          const textes = Object.fromEntries(codesTraductions.map(code => [code, typeof extra?.[code] === 'string' ? String(extra[code]) : '']))\n          ref = {\n            id: \`LEGACY:\${canon}\`,\n            label: verset ? \`\${ABREV_FR[livre] ?? livre} \${chapitre}, \${verset}\` : \`\${ABREV_FR[livre] ?? livre} \${chapitre}\`,\n            textes, livre, chapitre, verset,\n            aelfVersionId: null, aelfEntryId: null, aelfReference: null,\n            historicalCanonId: canon, resolutionStatus: lien.resolution_status,\n            validationStatus: lien.validation_status, confidenceLevel: lien.confidence_level,\n            linkIds: [], natures: [], ordreAelf: null,\n          }\n        }\n        refs.set(cle, ref)\n      }\n      if (!ref.linkIds.includes(lien.id)) ref.linkIds.push(lien.id)\n      const nature = NATURE_LIEN_AELF[lien.type]\n      if (!ref.natures.includes(nature)) ref.natures.push(nature)\n    }\n    sortie.set(segmentId, [...refs.values()].sort((a, b) =>\n      (a.ordreAelf ?? Number.MAX_SAFE_INTEGER) - (b.ordreAelf ?? Number.MAX_SAFE_INTEGER)\n      || a.label.localeCompare(b.label, 'fr')))\n  }\n  return sortie\n}\n\n`
  const i = s.indexOf(marker)
  if (i < 0) throw new Error('liens.ts: insertion helper références introuvable')
  s = s.slice(0, i) + helper + s.slice(i)
  fs.writeFileSync(path, s)
}

// ── 2. Premier rendu serveur d'une œuvre ────────────────────────────────────
{
  const path = 'app/oeuvre/[id]/page.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { hydraterLiensHerites } from '@/app/lib/liens'`,
    `import { hydraterLiensHerites, referencesBibliquesAelfDeSegments } from '@/app/lib/liens'`,
    'page.tsx import références AELF')

  const oldHelper = `async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {\n  const tousIds = new Set<string>()\n  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))\n  const tousIdsArray = Array.from(tousIds)\n  if (tousIdsArray.length === 0) return {}\n  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => \`"\${code}"\`)].join(', ')\n  const batchSize = 500\n  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>\n    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))\n  const results = await Promise.all(batches.map(batch =>\n    supabase.from('versets_lecture').select(selectVersets).in('id_verset', batch)))\n  const versetsData = results.flatMap(r => r.data ?? []) as any[]\n\n  const versetMap: Record<string,{label:string;textes:Record<string,string>}> = {}\n  versetsData.forEach(v => {\n    const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))\n    const ref = detailsRefBiblique(v.ref)\n    versetMap[v.id_verset] = {\n      ...ref,\n      textes,\n    }\n  })\n  return versetMap\n}`
  const newHelper = `async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {\n  const refs = await referencesBibliquesAelfDeSegments(segments.map(s => s.id), codesTraductions, supabase)\n  return Object.fromEntries(segments.map(s => [s.id, refs.get(s.id) ?? []]))\n}`
  s = replaceOnce(s, oldHelper, newHelper, 'page.tsx helper enrichissement')

  const oldInitial = `  // 4. Versets pour le premier livre seulement\n  const versetMap = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)\n\n  const versetParSegment: Record<number, any[]> = {}\n  segmentsTexte.forEach(s => {\n    versetParSegment[s.id] = extraireVersetsAvecNature(s).map(({ id: vid, natures }) => ({\n      id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {} })\n    }))\n  })`
  const newInitial = `  // 4. Références bibliques : axe AELF, avec fallback explicite legacy_only.\n  const versetParSegment = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)`
  s = replaceOnce(s, oldInitial, newInitial, 'page.tsx premier rendu AELF')
  fs.writeFileSync(path, s)
}

// ── 3. Chargements paresseux côté client + suppression par id de lien ────────
{
  const path = 'app/oeuvre/[id]/OeuvreClient.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { hydraterLiensHerites } from '@/app/lib/liens'`,
    `import { hydraterLiensHerites, referencesBibliquesAelfDeSegments } from '@/app/lib/liens'`,
    'OeuvreClient import références AELF')

  const oldBlock = `    const tousIds = new Set<string>()\n    const segsAffichables = segs.filter(segmentAffichable)\n\n    segsAffichables.forEach((s: any) => {\n      [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).forEach((v: string) =>\n        v.split(';').map((x: string) => x.trim()).filter(Boolean).forEach((x: string) => tousIds.add(x)))\n    })\n    const idsArr = Array.from(tousIds)\n      const versetMap: Record<string,{label:string;textes:Record<string,string>;livre:string;chapitre:string;verset:string}> = {}\n    if (idsArr.length > 0) {\n      const codesTraductions = await chargerCodesTraductions()\n      const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => \`"\${code}"\`)].join(', ')\n      const { data: vd } = await supabase.from('versets_lecture')\n        .select(selectVersets)\n        .in('id_verset', idsArr)\n      ;(vd ?? []).forEach((v: any) => {\n        const ref = detailsRefBiblique(v.ref)\n        const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))\n        versetMap[v.id_verset] = { ...ref, textes }\n      })\n    }`
  const newBlock = `    const segsAffichables = segs.filter(segmentAffichable)\n    const codesTraductions = await chargerCodesTraductions()\n    const versetsParSegment = await referencesBibliquesAelfDeSegments(\n      segsAffichables.map((s: any) => s.id),\n      codesTraductions,\n    )`
  s = replaceOnce(s, oldBlock, newBlock, 'OeuvreClient chargement versets AELF')
  s = replaceOnce(s,
`      const versets = extraireVersetsAvecNature(s)\n        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))`,
`      const versets = versetsParSegment.get(s.id) ?? []`,
    'OeuvreClient versets par segment')

  const oldDelete = `  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {\n    if (!estAdmin || !versetIds.length) return\n    const multiple = versetIds.length > 1\n    if (!confirm(multiple ? \`Supprimer ces \${versetIds.length} liens bibliques ?\` : 'Supprimer ce lien biblique ?')) return\n    const { error } = await supabase.from('liens_bibliques')\n      .delete().eq('segment_id', segId).in('canon_id', versetIds)\n    if (error) { alert('Suppression impossible : ' + error.message); return }\n    const aRetirer = new Set(versetIds)\n    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))\n  }`
  const newDelete = `  const supprimerLiensBibliques = async (segId: number, linkIds: number[]) => {\n    const ids = [...new Set(linkIds)]\n    if (!estAdmin || !ids.length) return\n    const multiple = ids.length > 1\n    if (!confirm(multiple ? \`Supprimer ces \${ids.length} liens bibliques ?\` : 'Supprimer ce lien biblique ?')) return\n    const { error } = await supabase.from('liens_bibliques')\n      .delete().eq('segment_id', segId).in('id', ids)\n    if (error) { alert('Suppression impossible : ' + error.message); return }\n    const aRetirer = new Set(ids)\n    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !(v.linkIds ?? []).some(id => aRetirer.has(id))) } : s))\n  }`
  s = replaceOnce(s, oldDelete, newDelete, 'OeuvreClient suppression par link id')
  s = replaceOnce(s,
    `supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))`,
    `supprimerLiensBibliques(segActifData.id, groupe.flatMap(v => v.linkIds ?? []))`,
    'OeuvreClient appel suppression')
  fs.writeFileSync(path, s)
}

// ── 4. Contrat VRef enrichi ─────────────────────────────────────────────────
{
  const path = 'app/oeuvre/[id]/oeuvreTypes.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`  aelfEntryId?: string | null\n  historicalCanonId?: string | null`,
`  aelfEntryId?: string | null\n  aelfReference?: string | null\n  historicalCanonId?: string | null`,
    'VRef aelfReference')
  s = replaceOnce(s,
`  confidenceLevel?: string | null\n}`,
`  confidenceLevel?: string | null\n  linkIds?: number[]\n  natures?: string[]\n}`,
    'VRef ids et natures')
  fs.writeFileSync(path, s)
}

// ── 5. Sélecteur de liens : spine AELF au lieu de versets_lecture ───────────
{
  const path = 'app/components/ModalLienBiblique.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`export type VersetLienBiblique = {\n  id: string\n  livre: string\n  chapitre: string\n  verset: string\n  texte: string\n  label: string\n}`,
`export type VersetLienBiblique = {\n  id: string\n  livre: string\n  chapitre: string\n  verset: string\n  texte: string\n  label: string\n  aelfVersionId: string\n  aelfEntryId: string\n  aelfReference: string\n  historicalCanonId: string | null\n}`,
    'Modal type verset AELF')
  s = replaceOnce(s,
`type LigneVerset = {\n  id_verset: string\n  livre: string\n  chapitre: number | string\n  verset: number | string\n  ref: string | null\n  TR0001: string | null\n}`,
`type LigneVerset = {\n  id_verset: string\n  aelf_version_id: string\n  aelf_entry_id: string\n  historical_canon_id: string | null\n  aelf_reference: string\n  livre: string\n  chapitre: number | string\n  verset: number | string\n  chapitre_label: string\n  verset_label: string\n  ref: string | null\n  TR0001: string | null\n}`,
    'Modal LigneVerset AELF')
  s = replaceOnce(s,
`function labelVerset(v: LigneVerset | VersetLienBiblique) {\n  return \`\${ABREV_FR[v.livre] ?? v.livre} \${v.chapitre}, \${v.verset}\`\n}\n\nfunction normaliserLigne(v: LigneVerset): VersetLienBiblique {\n  return {\n    id: v.id_verset,\n    livre: v.livre,\n    chapitre: String(v.chapitre),\n    verset: String(v.verset),\n    texte: v.TR0001 ?? '',\n    label: labelVerset(v),\n  }\n}`,
`function nettoyerLabel(value: string | number) {\n  const s = String(value)\n  return /^0+\\d+$/.test(s) ? String(Number(s)) : s\n}\n\nfunction comparerLabels(a: string, b: string) {\n  const ma = /^(\\d+)(.*)$/.exec(a), mb = /^(\\d+)(.*)$/.exec(b)\n  const na = ma ? Number(ma[1]) : Number.MAX_SAFE_INTEGER\n  const nb = mb ? Number(mb[1]) : Number.MAX_SAFE_INTEGER\n  return na - nb || (ma?.[2] ?? a).localeCompare(mb?.[2] ?? b, 'fr')\n}\n\nfunction labelVerset(v: LigneVerset | VersetLienBiblique) {\n  const chapitre = 'chapitre_label' in v ? v.chapitre_label : v.chapitre\n  const verset = 'verset_label' in v ? nettoyerLabel(v.verset_label) : v.verset\n  return \`\${ABREV_FR[v.livre] ?? v.livre} \${chapitre}, \${verset}\`\n}\n\nfunction normaliserLigne(v: LigneVerset): VersetLienBiblique {\n  return {\n    id: \`AELF:\${v.aelf_entry_id}\`,\n    livre: v.livre,\n    chapitre: v.chapitre_label,\n    verset: nettoyerLabel(v.verset_label),\n    texte: v.TR0001 ?? '',\n    label: labelVerset(v),\n    aelfVersionId: v.aelf_version_id,\n    aelfEntryId: v.aelf_entry_id,\n    aelfReference: v.aelf_reference,\n    historicalCanonId: v.historical_canon_id,\n  }\n}`,
    'Modal normalisation AELF')
  s = replaceOnce(s,
`    return valeurs.sort((a, b) => Number(a) - Number(b))`,
`    return valeurs.sort(comparerLabels)`,
    'Modal tri chapitres AELF')
  s = replaceOnce(s,
`    () => versetsLivre.filter(v => v.chapitre === chapitre).sort((a, b) => Number(a.verset) - Number(b.verset)),`,
`    () => versetsLivre.filter(v => v.chapitre === chapitre).sort((a, b) => comparerLabels(a.verset, b.verset)),`,
    'Modal tri versets AELF')
  s = s.replace(
    `    AT: LIVRES.filter(l => l.testament === 'AT'),\n    NT: LIVRES.filter(l => l.testament === 'NT'),`,
    `    AT: LIVRES.filter(l => l.testament === 'AT' && !['SUS', 'BEL'].includes(l.code)),\n    NT: LIVRES.filter(l => l.testament === 'NT'),`)
  s = s.replaceAll(`.from('versets_lecture')`, `.from('v_aelf_bible_lecture')`)
  s = s.replaceAll(
    `.select('id_verset, livre, chapitre, verset, ref, TR0001')`,
    `.select('id_verset, aelf_version_id, aelf_entry_id, historical_canon_id, aelf_reference, livre, chapitre, verset, chapitre_label, verset_label, ref, TR0001')`)
  fs.writeFileSync(path, s)
}

// ── 6. Écriture : liens_bibliques, jamais segments.lien_* ──────────────────
{
  const path = 'app/oeuvre/[id]/AssocierVerset.tsx'
  let s = fs.readFileSync(path, 'utf8')
  const oldBody = `  const enregistrer = async (champ: ChampLienBiblique, versets: VersetLienBiblique[]) => {\n    setEnregistrement(true)\n    setErreur(null)\n    try {\n      const { data: segActuel, error: e0 } = await supabase.from('segments').select(champ).eq('id', segId).single()\n      if (e0) throw e0\n      const valeurActuelle = (segActuel as Partial<Record<ChampLienBiblique, string | null>> | null)?.[champ] ?? ''\n      const existants = valeurActuelle.split(';').map(s => s.trim()).filter(Boolean)\n      const nouveaux = versets.map(v => v.id).filter(id => !existants.includes(id))\n      if (nouveaux.length === 0) {\n        setErreur('Ces versets figurent déjà dans ce type de lien.')\n        setEnregistrement(false)\n        return\n      }\n      const nouvelleValeur = [...existants, ...nouveaux].join('; ')\n      const { error } = await supabase.from('segments').update({ [champ]: nouvelleValeur }).eq('id', segId)\n      if (error) throw error\n\n      versets.forEach(v => {\n        if (!nouveaux.includes(v.id)) return\n        onAssocie(champ, {\n          id: v.id,\n          label: v.label,\n          textes: { TR0001: v.texte },\n          livre: v.livre,\n          chapitre: v.chapitre,\n          verset: v.verset,\n        })\n      })\n      setOuvert(false)\n    } catch {\n      setErreur(\"Erreur lors de l'enregistrement.\")\n    }\n    setEnregistrement(false)\n  }`
  const newBody = `  const enregistrer = async (champ: ChampLienBiblique, versets: VersetLienBiblique[]) => {\n    setEnregistrement(true)\n    setErreur(null)\n    try {\n      const typeParChamp: Record<ChampLienBiblique, 1 | 2 | 3 | 4> = { lien_1: 1, lien_2: 2, lien_3: 3, lien_4: 4 }\n      const entryIds = [...new Set(versets.map(v => v.aelfEntryId))]\n      const { data, error } = await supabase.rpc('add_biblical_links_aelf', {\n        p_segment_id: segId,\n        p_aelf_entry_ids: entryIds,\n        p_type: typeParChamp[champ],\n      })\n      if (error) throw error\n      const parEntree = new Map(((data ?? []) as { link_id: number; aelf_entry_id: string; historical_canon_id: string | null }[])\n        .map(row => [row.aelf_entry_id, row] as const))\n      versets.forEach(v => {\n        const row = parEntree.get(v.aelfEntryId)\n        if (!row) return\n        onAssocie(champ, {\n          id: \`AELF:\${v.aelfEntryId}\`,\n          label: v.label,\n          textes: { TR0001: v.texte },\n          livre: v.livre,\n          chapitre: v.chapitre,\n          verset: v.verset,\n          aelfVersionId: v.aelfVersionId,\n          aelfEntryId: v.aelfEntryId,\n          aelfReference: v.aelfReference,\n          historicalCanonId: row.historical_canon_id,\n          resolutionStatus: 'resolved',\n          validationStatus: 'verified',\n          linkIds: [row.link_id],\n        })\n      })\n      setOuvert(false)\n    } catch {\n      setErreur(\"Erreur lors de l'enregistrement.\")\n    }\n    setEnregistrement(false)\n  }`
  s = replaceOnce(s, oldBody, newBody, 'AssocierVerset insertion liens_bibliques')
  fs.writeFileSync(path, s)
}

// ── 7. Prélèvements : conserver les coordonnées AELF exactes ───────────────
{
  const path = 'app/oeuvre/[id]/BoutonsVerset.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),\n      texte, traduction: trad,`,
`      ref_chapitre: parseInt(verset.chapitre), ref_verset: parseInt(verset.verset),\n      ref_chapitre_label: verset.chapitre || null, ref_verset_label: verset.verset || null,\n      aelf_version_id: verset.aelfVersionId ?? null, aelf_entry_id: verset.aelfEntryId ?? null,\n      aelf_reference: verset.aelfReference ?? null,\n      texte, traduction: trad,`,
    'BoutonsVerset prélèvement AELF')
  fs.writeFileSync(path, s)
}

for (const path of [
  'app/oeuvre/[id]/page.tsx',
  'app/oeuvre/[id]/OeuvreClient.tsx',
  'app/components/ModalLienBiblique.tsx',
  'app/oeuvre/[id]/AssocierVerset.tsx',
]) {
  const s = fs.readFileSync(path, 'utf8')
  if (path !== 'app/oeuvre/[id]/OeuvreClient.tsx' && s.includes(".from('versets_lecture')")) {
    throw new Error(`${path}: lecture directe versets_lecture encore présente`)
  }
}

const associer = fs.readFileSync('app/oeuvre/[id]/AssocierVerset.tsx', 'utf8')
if (associer.includes(".from('segments').update") || associer.includes('nouvelleValeur')) {
  throw new Error('AssocierVerset écrit encore les colonnes legacy de segments')
}
console.log('Renvois des œuvres migrés vers la spine AELF ; écriture des liens déplacée vers liens_bibliques.')
