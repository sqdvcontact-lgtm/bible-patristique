import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const WORK = 'A0091O0001';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: segments, error: segmentError } = await db.from('segments')
  .select('id,segment_numero,segment_texte,notes,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK).order('segment_numero');
if (segmentError) throw segmentError;
const ids = segments.map((segment) => segment.id);
const links = [];
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('liens_bibliques')
    .select('id,segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', ids.slice(i, i + 200));
  if (error) throw error;
  links.push(...(data ?? []));
}
const linkedIds = new Set(links.map((link) => link.segment_id));
const targets = [...new Set(links.map((link) => link.canon_id))];
const { data: verses, error: verseError } = await db.from('versets_lecture').select('id_verset').in('id_verset', targets);
if (verseError) throw verseError;
const verseIds = new Set((verses ?? []).map((verse) => verse.id_verset));
const keyCounts = new Map();
for (const link of links) {
  const key = `${link.segment_id}|${link.canon_id}|${link.type}`;
  keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
}

const biblicalNote = /(?:Gen|Exod|Lev|Num|Deut|Jos|Jud|Reg|Paral|Esd|Neh|Tob|Esth|Job|Psal?m?|Prov|Eccl|Cant|Sap|Isa|Esai|Jer|Ier|Lam|Tren|Ezech|Dan|Osee|Joel|Amos|Abd|Jon|Mich|Nah|Hab|Soph|Agg|Zach|Mal|Matth|Marc|Luc|Joan|Jean|Act|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Tit|Philem|Heb|Jac|Petr|Jude|Apoc)\.?\s*\d/i;
const quoteMarker = /[«»]|\b(?:dit|ajoûte|paroles?|selon)\b.{0,45}\b(?:Ap[oô]tre|Seigneur|Sauveur|Proph[eè]te|Psalmiste|Evangile)/i;
const suspects = segments.filter((segment) => !linkedIds.has(segment.id)
  && (biblicalNote.test(segment.notes ?? '') || quoteMarker.test(segment.segment_texte ?? '')))
  .map((segment) => ({
    segment_numero: segment.segment_numero,
    rang: segment.rang,
    texte: (segment.segment_texte ?? '').slice(0, 240),
    notes: segment.notes,
    reason: biblicalNote.test(segment.notes ?? '') ? 'note_biblique' : 'formule_ou_guillemets',
  }));

const report = {
  work: WORK,
  segments: segments.length,
  reviewed: segments.filter((segment) => segment.liens_revus_le && segment.liens_revus_par === 'IA-lecture').length,
  links: links.length,
  linked_segments: linkedIds.size,
  unique_targets: targets.length,
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  invalid_reliability: links.filter((link) => link.fiabilite !== 'vérifié').length,
  invalid_provenance: links.filter((link) => link.provenance !== 'lecture').length,
  arbitration_pending: links.filter((link) => link.arbitrage_requis !== false).length,
  empty_motifs: links.filter((link) => !link.motif?.trim()).length,
  duplicate_keys: [...keyCounts.values()].filter((count) => count > 1).length,
  dead_targets: targets.filter((target) => !verseIds.has(target)),
  suspects,
};
console.log(JSON.stringify(report, null, 2));
if (segments.length !== 568 || report.reviewed !== 568 || links.length !== 139
  || report.invalid_reliability || report.invalid_provenance || report.arbitration_pending
  || report.empty_motifs || report.duplicate_keys || report.dead_targets.length) process.exitCode = 1;
