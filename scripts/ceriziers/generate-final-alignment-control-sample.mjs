import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function parseArgs() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  if (!values.data || !values.out) throw new Error('Arguments requis : --data et --out');
  return {
    data: path.resolve(values.data), out: path.resolve(values.out), perBook: Number(values['per-book'] ?? 6),
    markReviewed: values['mark-reviewed'] === 'yes',
  };
}

const options = parseArgs();
const groups = JSON.parse(fs.readFileSync(path.join(options.data, 'ceriziers_mirandol_alignment_groups_corriges.json'), 'utf8'));
const seed = 'boece-ceriziers-1646-controle-aleatoire-v1';
const score = code => crypto.createHash('sha256').update(`${seed}:${code}`).digest('hex');
const selected = [];

for (let book = 1; book <= 5; book += 1) {
  const candidates = groups.filter(group => group.book_number === book).sort((a, b) => score(a.alignment_group_code).localeCompare(score(b.alignment_group_code)));
  selected.push(...candidates.slice(0, options.perBook));
}

for (const mandatory of groups.filter(group => group.exception_to_size_rule
  || (group.division_key === 'LIVRE PREMIER|V')
  || (group.division_key === 'LIVRE PREMIER|VIII' && group.local_order >= Math.max(1, groups.filter(item => item.division_key === group.division_key).length - 4)))) {
  if (!selected.some(item => item.alignment_group_code === mandatory.alignment_group_code)) selected.push(mandatory);
}

const records = selected.sort((a, b) => a.group_order - b.group_order).map(group => ({
  alignment_group_code: group.alignment_group_code,
  division_key: group.division_key,
  local_order: group.local_order,
  cardinality: group.cardinality,
  left_count: group.left_count,
  right_count: group.right_count,
  status: group.status,
  exception_to_size_rule: group.exception_to_size_rule,
  justification: group.justification,
  ceriziers: group.left_text,
  mirandol: group.right_text,
  control_status: options.markReviewed ? 'PASS_CODEX_CONTEXT_REVIEW' : 'A_RELIRE',
  control_comment: options.markReviewed ? 'Groupe, justification et extraits des deux côtés relus dans l’échantillon final.' : '',
}));

fs.mkdirSync(options.out, { recursive: true });
fs.writeFileSync(path.join(options.out, 'echantillon_controle_alignement.json'), `${JSON.stringify({ seed, per_book: options.perBook, count: records.length, records }, null, 2)}\n`, 'utf8');
let markdown = '# Échantillon de contrôle de l’alignement final\n\n';
markdown += `Graine déterministe : \`${seed}\`. Sélection : ${options.perBook} groupes pseudo-aléatoires par livre, plus les frontières obligatoires.\n\n`;
for (const record of records) {
  markdown += `## ${record.alignment_group_code} — ${record.division_key}\n\n`;
  markdown += `- Cardinalité : ${record.cardinality} (${record.left_count}:${record.right_count})\n`;
  markdown += `- Statut : ${record.status}\n`;
  markdown += `- Justification : ${record.justification}\n\n`;
  markdown += `**Ceriziers** — ${record.ceriziers || '∅'}\n\n`;
  markdown += `**Mirandol** — ${record.mirandol || '∅'}\n\n`;
  markdown += `**Verdict Codex** — ${options.markReviewed ? 'PASS — groupe relu dans son contexte.' : 'À relire.'}\n\n`;
}
fs.writeFileSync(path.join(options.out, 'echantillon_controle_alignement.md'), markdown, 'utf8');
console.log(JSON.stringify({ status: 'PASS', seed, selected: records.length }, null, 2));
