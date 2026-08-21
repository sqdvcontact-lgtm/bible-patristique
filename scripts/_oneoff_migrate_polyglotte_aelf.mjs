import fs from 'node:fs'

const path = 'app/polyglotte/page.tsx'
let s = fs.readFileSync(path, 'utf8')

function replaceOne(label, needle, replacement) {
  const i = s.indexOf(needle)
  if (i === -1) throw new Error(`Needle introuvable: ${label}`)
  if (s.indexOf(needle, i + needle.length) !== -1) throw new Error(`Needle non unique: ${label}`)
  s = s.slice(0, i) + replacement + s.slice(i + needle.length)
}

function replaceRegex(label, regex, replacement) {
  const matches = [...s.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))]
  if (matches.length !== 1) throw new Error(`Regex ${label}: ${matches.length} correspondances`)
  s = s.replace(regex, replacement)
}

replaceOne(
  'imports Bible899',
  'import { aRevoir899, chargerVersets899, rendu899, texteCouche899, TRAD_ID_BIBLE899, type Couche899 } from "@/app/lib/bible899";\n',
  'import { aRevoir899, texteCouche899, TRAD_ID_BIBLE899, type Couche899 } from "@/app/lib/bible899";\n' +
  'import { chargerAxeAelf, chargerBible899Aelf, chargerCellulesAelf, chargerExtrasAelf } from "@/app/lib/aelfPolyglotte";\n',
)

replaceOne(
  'types canon et cellule',
  'type CanonRow = { id: string; livre: string; ch_canon: number; v_canon: number; est_suscription: boolean };\n' +
  'type V2Row = { id: string; canon_id: string | null; livre: string; trad_id: string; ch_orig: number; v_orig: number; v_orig_suffixe: string | null; texte: string | null; notes: string | null; estLacune899?: boolean };',
  'type CanonRow = {\n' +
  '  id: string; aelf_version_id: string; livre: string; ch_canon: number; v_canon: number; ch_label: string; v_label: string;\n' +
  '  sequence_no: number; external_reference: string; entry_kind: string; est_suscription: boolean;\n' +
  '};\n' +
  'type V2Row = {\n' +
  '  id: string; canon_id: string | null; historical_canon_id?: string | null; livre: string; trad_id: string;\n' +
  '  ch_orig: number; v_orig: number; v_orig_suffixe: string | null; texte: string | null; notes: string | null;\n' +
  '  resolution_status?: "source_only" | "legacy_only" | "review"; mapping_validation_status?: string | null; estLacune899?: boolean;\n' +
  '};',
)

replaceRegex(
  'deuterocanonique',
  /function deuterocanonique\(canonId: string\): boolean \{[\s\S]*?\n\}/,
  `function deuterocanonique(livre: string, ch: number, v: number): boolean {\n  if (LIVRES_DEUTERO.has(livre)) return true;\n  // Daniel : le cantique des trois enfants, Suzanne et Bel.\n  if (livre === "DAN") return (ch === 3 && v >= 24 && v <= 90) || ch === 13 || ch === 14;\n  return false;\n}`,
)

replaceRegex(
  'bouton citer signature',
  /function BoutonCiterVerset\(\{ userId, saved, cle, refLivre, refAbr, chapitre, verset, texte, traductionLabel, onSaved, onRemoved \}: \{\n  userId: string \| null; saved: string \| null; cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number;\n  texte: string; traductionLabel: string; onSaved: \(cle: string, id: string\) => void; onRemoved: \(cle: string\) => void;\n\}\) \{/,
  `function BoutonCiterVerset({ userId, saved, cle, refLivre, refAbr, chapitre, verset, chapitreLabel, versetLabel, aelfVersionId, aelfEntryId, aelfReference, texte, traductionLabel, onSaved, onRemoved }: {\n  userId: string | null; saved: string | null; cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number;\n  chapitreLabel: string; versetLabel: string; aelfVersionId: string; aelfEntryId: string; aelfReference: string;\n  texte: string; traductionLabel: string; onSaved: (cle: string, id: string) => void; onRemoved: (cle: string) => void;\n}) {`,
)

replaceOne(
  'insert prélèvement AELF',
  '        ref_livre: refLivre, ref_livre_abr: refAbr,\n        ref_chapitre: chapitre, ref_verset: verset,\n        texte: texteSansEnrichissement(texte), traduction: traductionLabel,',
  '        ref_livre: refLivre, ref_livre_abr: refAbr,\n        ref_chapitre: chapitre, ref_verset: verset,\n        ref_chapitre_label: chapitreLabel, ref_verset_label: versetLabel,\n        aelf_version_id: aelfVersionId, aelf_entry_id: aelfEntryId, aelf_reference: aelfReference,\n        texte: texteSansEnrichissement(texte), traduction: traductionLabel,',
)

replaceRegex(
  'majNote AELF',
  /  const timersNotes = useRef<Map<string, ReturnType<typeof setTimeout>>>\(new Map\(\)\);\n  const majNote = useCallback\(\(canonId: string, texte: string\) => \{[\s\S]*?\n  \}, \[userId\]\);/,
  `  const timersNotes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());\n  const majNote = useCallback((entryId: string, versionId: string, reference: string, texte: string) => {\n    setNotes(m => new Map(m).set(entryId, texte));\n    if (!userId) return;\n    const timers = timersNotes.current;\n    const t0 = timers.get(entryId);\n    if (t0) clearTimeout(t0);\n    timers.set(entryId, setTimeout(() => {\n      timers.delete(entryId);\n      supabase.from("polyglotte_notes").upsert(\n        { user_id: userId, canon_id: null, aelf_version_id: versionId, aelf_entry_id: entryId, aelf_reference: reference, texte, updated_at: new Date().toISOString() },\n        { onConflict: "user_id,aelf_version_id,aelf_entry_id" },\n      ).then(() => {});\n    }, 700));\n  }, [userId]);`,
)

replaceRegex(
  'chargement runtime AELF',
  /  \/\/ Chargement de tout l'onglet \(canon \+ traductions migrées\)[\s\S]*?  useEffect\(\(\) => \{ charger\(\); \}, \[charger\]\);/,
  `  // Chargement runtime : l'axe de lecture est désormais la spine AELF/TOL. Les\n  // traductions conservent leur structure native ; seules leurs projections sont lues ici.\n  const charger = useCallback(async () => {\n    const tradIds = slots.filter(Boolean);\n    if (!livresAffiches.length || !tradIds.length) return;\n    const codes = livresAffiches.map(l => l.code);\n    const monoLivre = livresAffiches.length === 1;\n    const chScope = (!toutAfficher && !sensiblesOnly && !surnumOnly && monoLivre && chapitreChoisi != null) ? chapitreChoisi : null;\n    const tradIdsV2 = tradIds.filter(id => id !== TRAD_ID_BIBLE899);\n\n    const [axe, cellulesAelf, extrasAelf] = await Promise.all([\n      chargerAxeAelf(supabase, { livres: codes, chapitreBase: chScope }),\n      chargerCellulesAelf(supabase, { livres: codes, tradIds: tradIdsV2, chapitreBase: chScope }),\n      chScope == null\n        ? chargerExtrasAelf(supabase, { livres: codes, tradIds: tradIdsV2 })\n        : Promise.resolve([]),\n    ]);\n\n    const c: CanonRow[] = axe.map(a => ({\n      id: a.entry_id,\n      aelf_version_id: a.version_id,\n      livre: a.book_code,\n      ch_canon: a.chapter_base ?? 0,\n      v_canon: a.verse_base ?? 0,\n      ch_label: a.chapter_label,\n      v_label: a.verse_label,\n      sequence_no: a.sequence_no,\n      external_reference: a.external_reference,\n      entry_kind: a.entry_kind,\n      est_suscription: a.entry_kind !== "verse",\n    }));\n\n    const vv: V2Row[] = cellulesAelf.map(x => ({\n      id: x.id,\n      canon_id: x.aelf_entry_id,\n      historical_canon_id: x.historical_canon_id,\n      livre: x.aelf_book_code,\n      trad_id: x.trad_id,\n      ch_orig: x.ch_orig,\n      v_orig: x.v_orig,\n      v_orig_suffixe: x.v_orig_suffixe,\n      texte: x.texte,\n      notes: x.notes,\n      mapping_validation_status: x.mapping_validation_status,\n    }));\n\n    // Seules les matières réellement propres à une source deviennent des lignes hors axe.\n    // legacy_only/review restent consultables dans les vues d'audit mais ne sont jamais\n    // injectés comme de faux versets de lecture.\n    const extras: V2Row[] = extrasAelf\n      .filter(x => x.resolution_status === "source_only")\n      .map(x => ({\n        id: x.id, canon_id: null, historical_canon_id: x.historical_canon_id, livre: x.livre, trad_id: x.trad_id,\n        ch_orig: x.ch_orig, v_orig: x.v_orig, v_orig_suffixe: x.v_orig_suffixe, texte: x.texte, notes: x.notes,\n        resolution_status: x.resolution_status,\n      }));\n\n    let toutesLignes: V2Row[] = [...vv, ...extras];\n    if (tradIds.includes(TRAD_ID_BIBLE899)) {\n      const parLivre899 = await Promise.all(codes.map(code => chargerBible899Aelf(supabase, { livre: code, chapitreBase: chScope, couches: [couche899] })));\n      const rows899: V2Row[] = parLivre899.flat()\n        .filter(l => l.aelf_entry_id != null || l.manuscript_extra === true)\n        .map(l => {\n          const lacune = l.alignment_status === "CANONICAL_GAP";\n          return {\n            id: l.aelf_entry_id ? `899:${l.alignment_order}:${l.aelf_entry_id}` : `899:extra:${l.alignment_order}`,\n            canon_id: l.aelf_entry_id,\n            historical_canon_id: l.canon_id,\n            livre: l.aelf_book_code ?? l.livre ?? "",\n            trad_id: TRAD_ID_BIBLE899,\n            ch_orig: l.chapitre ?? 0,\n            v_orig: l.verset ?? 0,\n            v_orig_suffixe: null,\n            texte: lacune ? null : texteCouche899(l, couche899),\n            notes: aRevoir899(l) ? "Alignement à revoir" : null,\n            resolution_status: l.aelf_entry_id == null ? "source_only" : undefined,\n            mapping_validation_status: l.aelf_validation_status,\n            estLacune899: lacune,\n          };\n        });\n      toutesLignes = [...toutesLignes, ...rows899];\n    }\n\n    c.sort((a, b) => a.sequence_no - b.sequence_no);\n    setCanon(c);\n    setV2(toutesLignes);\n  }, [livresAffiches, slots, chapitreChoisi, toutAfficher, sensiblesOnly, surnumOnly, couche899]);\n  useEffect(() => { charger(); }, [charger]);`,
)

replaceOne(
  'chargement prélèvements select',
  '    supabase.from("prelevements").select("id, ref_livre_abr, ref_chapitre, ref_verset, traduction")',
  '    supabase.from("prelevements").select("id, ref_livre_abr, ref_chapitre, ref_verset, ref_chapitre_label, ref_verset_label, traduction, aelf_entry_id")',
)
replaceOne(
  'clé prélèvements',
  '        for (const p of data ?? []) m.set(`${p.ref_livre_abr}|${p.ref_chapitre}|${p.ref_verset}|${p.traduction}`, p.id);',
  '        for (const p of data ?? []) {\n          const ch = p.ref_chapitre_label ?? String(p.ref_chapitre ?? "");\n          const v = p.ref_verset_label ?? String(p.ref_verset ?? "");\n          m.set(`${p.ref_livre_abr}|${ch}|${v}|${p.traduction}`, p.id);\n        }',
)

replaceOne(
  'chargement notes select',
  '    supabase.from("polyglotte_notes").select("canon_id, texte").eq("user_id", userId)',
  '    supabase.from("polyglotte_notes").select("canon_id, aelf_entry_id, texte").eq("user_id", userId)',
)
replaceOne(
  'index notes',
  '        for (const n of data ?? []) if (n.texte) m.set(n.canon_id, n.texte);',
  '        for (const n of data ?? []) { const cle = n.aelf_entry_id ?? n.canon_id; if (cle && n.texte) m.set(cle, n.texte); }',
)

replaceRegex(
  'scroll cible',
  /    const id = `poly-\$\{livreChoisi\}-\$\{versetCible\.ch\}-\$\{versetCible\.v\}`;\n    const t = setTimeout\(\(\) => \{\n      document\.getElementById\(id\)\?\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\);\n    \}, 120\);/,
  '    const cible = `${livreChoisi}|${versetCible.ch}|${versetCible.v}`;\n    const t = setTimeout(() => {\n      document.querySelector<HTMLElement>(`[data-poly-base="${cible}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });\n    }, 120);',
)

replaceOne(
  'référence lisible',
  '                const refLisible = `${abr} ${r.ch_canon}, ${r.v_canon}`;',
  '                const refLisible = `${abr} ${r.ch_label}, ${r.v_label}`;',
)
replaceOne(
  'id ligne exact AELF',
  '                    <div className="poly-row" id={`poly-${l.code}-${r.ch_canon}-${r.v_canon}`}',
  '                    <div className="poly-row" id={`poly-${l.code}-${r.ch_label}-${r.v_label}`} data-poly-base={`${l.code}|${r.ch_canon}|${r.v_canon}`}',
)
replaceOne(
  'affichage référence AELF',
  '                        <div style={{ whiteSpace: "nowrap" }}>{r.ch_canon}, {r.v_canon}{signaler ? " ⚠" : ""}</div>',
  '                        <div style={{ whiteSpace: "nowrap" }}>{r.ch_label}, {r.v_label}{signaler ? " ⚠" : ""}</div>',
)
replaceOne(
  'clé citation labels',
  '                        const cleCite = `${abr}|${r.ch_canon}|${r.v_canon}|${t.nom}`;',
  '                        const cleCite = `${abr}|${r.ch_label}|${r.v_label}|${t.nom}`;',
)
replaceOne(
  'bouton citer props AELF',
  '<BoutonCiterVerset userId={userId} saved={prelevs.get(cleCite) ?? null} cle={cleCite} refLivre={l.nom_fr} refAbr={abr} chapitre={r.ch_canon} verset={r.v_canon} texte={texteCell} traductionLabel={t.nom} onSaved={marquerCite} onRemoved={retirerCite} />',
  '<BoutonCiterVerset userId={userId} saved={prelevs.get(cleCite) ?? null} cle={cleCite} refLivre={l.nom_fr} refAbr={abr} chapitre={r.ch_canon} verset={r.v_canon} chapitreLabel={r.ch_label} versetLabel={r.v_label} aelfVersionId={r.aelf_version_id} aelfEntryId={r.id} aelfReference={r.external_reference} texte={texteCell} traductionLabel={t.nom} onSaved={marquerCite} onRemoved={retirerCite} />',
)
replaceOne(
  'deutero call',
  '<CelluleAbsente deutero={deuterocanonique(r.id)} />',
  '<CelluleAbsente deutero={deuterocanonique(l.code, r.ch_canon, r.v_canon)} />',
)
replaceOne(
  'note AELF call',
  '<CelluleNote valeur={notes.get(r.id) ?? ""} refLisible={refLisible} onChange={t => majNote(r.id, t)} />',
  '<CelluleNote valeur={notes.get(r.id) ?? ""} refLisible={refLisible} onChange={t => majNote(r.id, r.aelf_version_id, r.external_reference, t)} />',
)

// La page ne doit plus lire les deux tables legacy qui portaient l'axe et les cellules.
if (s.includes('fetchPaged<CanonRow>("versets_canon"')) throw new Error('Lecture versets_canon encore présente dans le Polyglotte')
if (s.includes('fetchPaged<V2Row>("versets_v2"')) throw new Error('Lecture versets_v2 encore présente dans le chargeur du Polyglotte')
if (!s.includes('chargerAxeAelf(supabase')) throw new Error('Chargeur AELF absent après transformation')

fs.writeFileSync(path, s)
console.log('Polyglotte migré vers la spine AELF/TOL : transformation déterministe appliquée.')
