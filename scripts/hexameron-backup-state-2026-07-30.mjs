import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const OUT_DIR = 'audit/hexameron-2026-07-30';
const OUT_NAME = process.argv[2] ?? 'before.json';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function paginer(table, select, configurer, ordre = null) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    query = configurer(query);
    if (ordre) query = query.order(ordre);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const { data: oeuvre, error: oeuvreError } = await db.from('oeuvres').select('*')
  .eq('id_oeuvre', OEUVRE).single();
if (oeuvreError) throw oeuvreError;

const segments = await paginer('segments', '*', (q) => q.eq('id_oeuvre', OEUVRE), 'segment_numero');
const segmentIds = segments.map(({ id }) => id);
const liens = [];
for (let offset = 0; offset < segmentIds.length; offset += 200) {
  const { data, error } = await db.from('liens_bibliques').select('*')
    .in('segment_id', segmentIds.slice(offset, offset + 200)).order('segment_id');
  if (error) throw error;
  liens.push(...data);
}

const hash = (value) => createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase();
const hashes = {
  texte_segments: hash(segments.map((s) => `${s.id}\t${s.segment_numero}\t${s.segment_texte ?? ''}`).join('\n')),
  structure: hash(segments.map((s) => [s.id, s.ref_niv1, s.ref_niv2, s.ref_niv3, s.ref_niv4,
    s.ref_niv5, s.paragraphe, s.rang, s.nature].join('\t')).join('\n')),
  texte_original: hash(segments.map((s) => `${s.id}\t${s.texte_original ?? ''}`).join('\n')),
  notes: hash(segments.map((s) => `${s.id}\t${s.notes ?? ''}`).join('\n')),
  liens: hash(JSON.stringify(liens)),
};

mkdirSync(OUT_DIR, { recursive: true });
const payload = {
  cree_le: new Date().toISOString(),
  oeuvre,
  segments,
  liens,
  hashes,
  compteurs: {
    segments: segments.length,
    liens: liens.length,
    notes: segments.filter((s) => s.notes?.trim()).length,
    texte_original: segments.filter((s) => s.texte_original?.trim()).length,
    paragraphes_renseignes: segments.filter((s) => s.paragraphe != null).length,
    rangs_renseignes: segments.filter((s) => s.rang != null).length,
    liens_revus: segments.filter((s) => s.liens_revus_le != null).length,
  },
};
const out = `${OUT_DIR}/${OUT_NAME}`;
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ out, hashes, compteurs: payload.compteurs }, null, 2));
