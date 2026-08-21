import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

// ── Accès AELF aux liens ───────────────────────────────────────────────────
{
  const path = 'app/lib/liens.ts'
  let s = fs.readFileSync(path, 'utf8')
  const marker = `/** Recherche inverse : les segments qui renvoient à un verset donné.\n *`
  const insertion = `export type LienAelf = Lien & {\n  historical_canon_id: string | null\n  aelf_entry_id: string | null\n  aelf_external_reference: string | null\n  aelf_book_code: string | null\n  aelf_chapter_label: string | null\n  aelf_verse_label: string | null\n  aelf_sequence_no: number | null\n  resolution_status: 'resolved' | 'review' | 'legacy_only' | 'chapter_only' | 'unresolved'\n  relation_kind: string | null\n  validation_status: string | null\n  confidence_level: string | null\n}\n\nconst COLS_AELF = \`${'${COLS}'}, historical_canon_id, aelf_entry_id, aelf_external_reference, aelf_book_code, aelf_chapter_label, aelf_verse_label, aelf_sequence_no, resolution_status, relation_kind, validation_status, confidence_level\`\n\n/** Projection AELF des liens d'un lot de segments. Filtrer par segment_id est indexé ;\n *  le résolveur n'est appelé que pour les liens des segments demandés. */\nexport async function liensAelfDeSegments(\n  segmentIds: number[],\n  client: { from: (t: string) => any } = supabase,\n): Promise<Map<number, LienAelf[]>> {\n  const parSegment = new Map<number, LienAelf[]>()\n  if (!segmentIds.length) return parSegment\n  const lots: number[][] = []\n  for (let i = 0; i < segmentIds.length; i += 500) lots.push(segmentIds.slice(i, i + 500))\n  const resultats = await Promise.all(lots.map(lot =>\n    client.from('v_aelf_biblical_links').select(COLS_AELF).in('segment_id', lot)))\n  for (const { data, error } of resultats) {\n    if (error) throw error\n    for (const l of (data ?? []) as LienAelf[]) {\n      if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])\n      parSegment.get(l.segment_id)!.push(l)\n    }\n  }\n  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type || (a.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER) - (b.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER))\n  return parSegment\n}\n\n/** Recherche inverse depuis UNE entrée de la spine AELF. */\nexport async function segmentsLiesAEntreeAelf(entryId: string): Promise<LienAelf[]> {\n  const { data, error } = await supabase.rpc('bible_links_for_aelf_entry', { p_entry_id: entryId })\n  if (error) throw error\n  return (data ?? []) as LienAelf[]\n}\n\n/** Apparat d'un chapitre AELF. La RPC conserve aussi les livres historiques sans\n *  entrée autonome dans la spine (par ex. SUS/BEL) via leur référence ancienne. */\nexport async function segmentsLiesAuChapitreAelf(livre: string, chapitre: number): Promise<LienAelf[]> {\n  const { data, error } = await supabase.rpc('bible_links_for_aelf_chapter', { p_book_code: livre, p_chapter_base: chapitre })\n  if (error) throw error\n  return (data ?? []) as LienAelf[]\n}\n\nexport type CelluleLectureAelf = {\n  id: string\n  aelf_entry_id: string\n  aelf_external_reference: string\n  aelf_book_code: string\n  aelf_chapter_label: string\n  aelf_verse_label: string\n  aelf_sequence_no: number\n  historical_canon_id: string | null\n  trad_id: string\n  ch_orig: number\n  v_orig: number\n  v_orig_suffixe: string | null\n  texte: string | null\n  mapping_relation_kind: string\n  mapping_validation_status: string\n  mapping_confidence_level: string\n  mapping_source: string\n}\n\n/** Textes publics TR0001–TR0005 pour des cibles AELF précises. La RPC est conçue\n *  pour les lots et ne peut jamais exposer TR0012. */\nexport async function cellulesLectureAelf(\n  entryIds: string[],\n  client: { rpc: (fn: string, args: Record<string, unknown>) => any } = supabase,\n): Promise<CelluleLectureAelf[]> {\n  if (!entryIds.length) return []\n  const uniques = [...new Set(entryIds)]\n  const lots: string[][] = []\n  for (let i = 0; i < uniques.length; i += 200) lots.push(uniques.slice(i, i + 200))\n  const resultats = await Promise.all(lots.map(lot => client.rpc('bible_reading_cells_for_aelf_entries', { p_entry_ids: lot })))\n  const out: CelluleLectureAelf[] = []\n  for (const { data, error } of resultats) {\n    if (error) throw error\n    out.push(...((data ?? []) as CelluleLectureAelf[]))\n  }\n  return out\n}\n\n`
  const i = s.indexOf(marker)
  if (i < 0) throw new Error('liens.ts: point insertion AELF introuvable')
  s = s.slice(0, i) + insertion + s.slice(i)
  fs.writeFileSync(path, s)
}

// ── Volet patristique de la Bible ──────────────────────────────────────────
{
  const path = 'app/components/PanneauPatristique.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    `import { segmentsLiesAuVerset, segmentsLiesAuChapitre, segmentsLiesAPlage, type TypeLien } from '@/app/lib/liens'`,
    `import { segmentsLiesAuVerset, segmentsLiesAEntreeAelf, segmentsLiesAuChapitreAelf, segmentsLiesAPlage, type TypeLien } from '@/app/lib/liens'`,
    'import liens AELF')
  s = replaceOnce(s,
    `type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }`,
    `type Verset = { id_verset: string; ref: string; verset: number; chapitre: number; aelf_entry_id?: string | null; historical_canon_id?: string | null }`,
    'type Verset AELF')
  s = replaceOnce(s,
`  plage, refAffichee,\n}: {\n  verset: Verset | null`,
`  plage, refAffichee, historicalCanonId = null,\n}: {\n  verset: Verset | null`,
    'prop historicalCanonId entrée')
  s = replaceOnce(s,
`  chapitreActif: number\n  panelWidth?: number | null`,
`  chapitreActif: number\n  historicalCanonId?: string | null\n  panelWidth?: number | null`,
    'prop historicalCanonId type')
  s = replaceOnce(s,
`      const liens = plage\n        ? await segmentsLiesAPlage(plage.livre, plage.canonDebut, plage.canonFin)\n        : verset\n        ? await segmentsLiesAuVerset(verset.id_verset)\n        : await segmentsLiesAuChapitre(livreActif, chapitreActif)`,
`      const liens = plage\n        ? await segmentsLiesAPlage(plage.livre, plage.canonDebut, plage.canonFin)\n        : verset?.aelf_entry_id\n        ? await segmentsLiesAEntreeAelf(verset.aelf_entry_id)\n        : verset && historicalCanonId\n        ? await segmentsLiesAuVerset(historicalCanonId)\n        : await segmentsLiesAuChapitreAelf(livreActif, chapitreActif)`,
    'recherche inverse AELF')
  s = s.replace(
    `  }, [verset, livreActif, chapitreActif, plage?.livre, plage?.canonDebut, plage?.canonFin])`,
    `  }, [verset, historicalCanonId, livreActif, chapitreActif, plage?.livre, plage?.canonDebut, plage?.canonFin])`)
  fs.writeFileSync(path, s)
}

// ── Passage du canon historique spécifique à la traduction ─────────────────
{
  const path = 'app/components/BibleLayout.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`      <PanneauPatristique\n        verset={versetSelectionneCourant}\n        livreActif={livreActif}`,
`      <PanneauPatristique\n        verset={versetSelectionneCourant}\n        historicalCanonId={versetSelectionneCourant\n          ? (typeof versetSelectionneCourant[\`canon_\${traduction}\`] === 'string'\n            ? String(versetSelectionneCourant[\`canon_\${traduction}\`])\n            : typeof versetSelectionneCourant.historical_canon_id === 'string'\n              ? versetSelectionneCourant.historical_canon_id\n              : null)\n          : null}\n        livreActif={livreActif}`,
    'BibleLayout canon historique')
  fs.writeFileSync(path, s)
}

// ── Traductions lisibles : contrat AELF, plus sonde de versets_lecture ──────
{
  const path = 'app/lib/traductions.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = s.replace('// enregistrés dans `traductions` ET présents comme colonnes de la vue matérialisée\n// `versets_lecture`.', '// enregistrés dans `traductions` ET réellement présents dans la lecture AELF\n// (spine ou matières historiques hors axe).')
  s = replaceOnce(s,
`  // Sonde une ligne de la vue pour connaître ses colonnes réelles.\n  const { data: echantillon } = await client.from('versets_lecture').select('*').limit(1)\n  const ligne = (echantillon ?? [])[0]\n  if (!ligne) return demandes.length ? demandes : REPLI\n\n  const colonnes = new Set(Object.keys(ligne))\n  const filtres = demandes.filter((code: string) => colonnes.has(code))`,
`  // La disponibilité vient de la projection AELF + hors axe. La vue security_invoker\n  // respecte en outre la confidentialité : TR0012 n'apparaît qu'à un administrateur.\n  const { data: disponibilites, error } = await client\n    .from('v_aelf_bible_books_by_translation')\n    .select('trad_id')\n    .limit(1000)\n  if (error) throw error\n  const materialisees = new Set((disponibilites ?? []).map((r: { trad_id: string }) => r.trad_id))\n  const filtres = demandes.filter((code: string) => materialisees.has(code))`,
    'traductions.ts contrat AELF')
  s = s.replaceAll('`versets_lecture`', '`v_aelf_bible_books_by_translation`')
  fs.writeFileSync(path, s)
}

for (const path of ['app/components/PanneauPatristique.tsx','app/components/BibleLayout.tsx','app/lib/traductions.ts']) {
  const s = fs.readFileSync(path, 'utf8')
  if (s.includes(".from('versets_lecture')")) throw new Error(`${path}: lecture directe versets_lecture encore présente`)
}
console.log('Volet patristique de la Bible migré vers les résolveurs AELF.')
