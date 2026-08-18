import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['input', 'output']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}

function extractJson(value) {
  const text = String(value ?? '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  try { return JSON.parse(text.slice(first, last + 1)); } catch { return null; }
}

function validate(output, input) {
  const errors = [];
  const expand = range => {
    if (range == null) return [];
    if (!Array.isArray(range) || range.length === 0 || range.some(value => !Number.isInteger(value))) return null;
    if (range.length === 1) return range;
    if (range.length === 2) return Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index);
    if (range.some((value, index) => index > 0 && value !== range[index - 1] + 1)) return null;
    return range;
  };
  if (output?.batch_id !== input.batch_id) errors.push('batch_id');
  if (!Array.isArray(output?.divisions) || output.divisions.length !== input.divisions.length) errors.push('divisions');
  for (const source of input.divisions) {
    const reviewed = output?.divisions?.find(item => item.division_key === source.division_key);
    if (!reviewed || !Array.isArray(reviewed.groups)) { errors.push(`missing:${source.division_key}`); continue; }
    for (const [side, expected] of [['left', source.left.length], ['right', source.right.length]]) {
      const covered = [];
      for (const group of reviewed.groups) {
        const range = group[side];
        if (range == null) continue;
        const expanded = expand(range);
        if (!expanded?.length) {
          errors.push(`range:${source.division_key}:${side}`); continue;
        }
        covered.push(...expanded);
        if (!['reviewed_ai', 'uncertain'].includes(group.status)) errors.push(`status:${source.division_key}`);
        if (typeof group.reason !== 'string' || group.reason.length < 18) errors.push(`reason:${source.division_key}`);
      }
      const target = Array.from({ length: expected }, (_, index) => index + 1);
      if (covered.length !== target.length || covered.some((value, index) => value !== target[index])) errors.push(`coverage:${source.division_key}:${side}`);
    }
    const limit = source.kind === 'poesie' ? 4 : 5;
    for (const group of reviewed.groups) {
      const leftCount = expand(group.left)?.length ?? 0;
      const rightCount = expand(group.right)?.length ?? 0;
      const over = leftCount > limit || rightCount > limit;
      if (over !== Boolean(group.exception_to_size_rule)) errors.push(`exception:${source.division_key}`);
      if (source.kind === 'poesie' && over && leftCount === source.left.length && rightCount === source.right.length) {
        errors.push(`whole_poem_exception:${source.division_key}`);
      }
      const mandatoryException = source.division_key === 'LIVRE QUATRIÈME|XIII' && leftCount === 1 && rightCount === 6;
      if (over && !mandatoryException) errors.push(`oversize_forbidden:${source.division_key}`);
    }
  }
  return [...new Set(errors)];
}

const options = args();
const input = JSON.parse(fs.readFileSync(options.input, 'utf8'));
const prompt = `Tu effectues une collation sémantique éditoriale entre deux traductions françaises de Boèce. Voici le paquet JSON complet à lire :\n${JSON.stringify(input)}\n\nRègles impératives :\n- Pour chacune des divisions, aligne tous les segments left (Ceriziers 1646) avec tous les segments right (Mirandol 1861).\n- Un groupe représente le plus petit mouvement sémantique défendable, jamais une simple proportion de positions.\n- Respecte strictement l'ordre, la consécutivité et la couverture exacte une seule fois de chaque indice.\n- Identifie les locuteurs, questions, réponses, exemples, transitions et conclusions.\n- Poésie : maximum absolu de 4 indices par côté. Prose : maximum absolu de 5 par côté. La seule exception autorisée est le cas obligatoire LIVRE QUATRIÈME|XIII décrit ci-dessous, exactement 1 indice left contre 6 right. Pour toute condensation, inversion ou redistribution ailleurs, emploie de petits groupes et des côtés null explicites marqués uncertain plutôt qu'un groupe surdimensionné.\n- Un poème entier dépassant ces bornes ne peut jamais former un seul groupe.\n- Marque status="uncertain" quand la traduction libre ne permet pas de certifier la limite ; sinon status="reviewed_ai". N'écris jamais validated_human.\n- Chaque reason doit être propre au passage, en français, bref, et nommer l'idée ou l'image alignée.\n- Les groupes 1:0 ou 0:1 sont admis pour un développement réellement sans correspondant ou un motif redistribué qu'un alignement monotone ne peut rattacher honnêtement.\n- Cas obligatoire LIVRE QUATRIÈME|XIII : la question Mirandol "Veux-tu que je me rapproche un moment du langage vulgaire ? ..." doit être groupée avec le segment Ceriziers suivant "P. Ie suis contente de m’accommoder à leur humeur..." et avec "Comme tu voudras" ; elle ne doit pas rester avec le segment Ceriziers précédent sur la mauvaise Fortune. Ce groupe précis porte exception_to_size_rule=true. Tous les autres groupes portent false.\n\nRéponds UNIQUEMENT par un objet JSON strict de cette forme :\n{"batch_id":"${input.batch_id}","divisions":[{"division_key":"...","groups":[{"left":[1,2],"right":[1,3],"status":"reviewed_ai","exception_to_size_rule":false,"reason":"étiquette sémantique spécifique"}]}]}\nUne plage est inclusive. Utilise null pour le côté vide. N'ajoute aucune clé hors de ce schéma.`;

const environment = { ...process.env };
delete environment.ANTHROPIC_API_KEY;
delete environment.ANTHROPIC_AUTH_TOKEN;
const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'claude';
const cli = process.platform === 'win32' ? path.join(process.env.APPDATA, 'npm', 'claude.cmd') : 'claude';
const argv = process.platform === 'win32'
  ? ['/c', cli, '-p', '--output-format', 'json', '--model', 'sonnet']
  : ['-p', '--output-format', 'json', '--model', 'sonnet'];
const child = spawn(command, argv, { cwd: path.dirname(options.input), windowsHide: true, env: environment });
let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => { stdout += chunk; });
child.stderr.on('data', chunk => { stderr += chunk; });
child.stdin.write(prompt);
child.stdin.end();
const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('close', resolve);
});
if (exitCode !== 0) {
  const diagnostic = stderr.trim() || extractJson(stdout)?.result || stdout.trim() || 'aucun diagnostic retourné';
  throw new Error(`Claude CLI code ${exitCode}: ${String(diagnostic).slice(0, 500)}`);
}
const envelope = extractJson(stdout);
if (!envelope || envelope.is_error) throw new Error(`Enveloppe Claude invalide : ${envelope?.result ?? stdout.slice(0, 500)}`);
const result = extractJson(envelope.result);
if (!result) throw new Error('Réponse Claude sans JSON exploitable.');
const errors = validate(result, input);
const record = {
  schema: 'ceriziers-mirandol-semantic-review-result-v1',
  provider: 'claude-local',
  model: envelope.modelUsage ? Object.keys(envelope.modelUsage).join(',') : 'sonnet',
  subscription_mode: true,
  api_keys_removed: true,
  candidate_only: true,
  validated_human: false,
  batch_id: input.batch_id,
  validation: { status: errors.length ? 'FAIL' : 'PASS', errors },
  result,
};
fs.writeFileSync(options.output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
if (errors.length) throw new Error(`Réponse sémantique invalide : ${errors.join(', ')}`);
console.log(JSON.stringify({ batch_id: input.batch_id, divisions: result.divisions.length, groups: result.divisions.reduce((sum, division) => sum + division.groups.length, 0), validation: 'PASS' }));
