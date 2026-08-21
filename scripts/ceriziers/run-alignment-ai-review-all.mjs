import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  if (!values.dir) throw new Error('Argument manquant : --dir');
  return { dir: path.resolve(values.dir), concurrency: Number(values.concurrency ?? 3) };
}

const options = args();
const index = JSON.parse(fs.readFileSync(path.join(options.dir, 'index.json'), 'utf8'));
const runner = path.resolve('scripts/ceriziers/run-alignment-ai-review-batch.mjs');
let cursor = 0;
let active = 0;
let failures = 0;
let completed = 0;

function validExisting(outputPath) {
  try { return JSON.parse(fs.readFileSync(outputPath, 'utf8')).validation?.status === 'PASS'; } catch { return false; }
}

await new Promise((resolve, reject) => {
  function launch() {
    while (active < options.concurrency && cursor < index.length) {
      const item = index[cursor++];
      const number = item.file.match(/(\d+)/u)?.[1];
      const inputPath = path.join(options.dir, item.file);
      const outputPath = path.join(options.dir, `review_${number}.json`);
      if (validExisting(outputPath)) {
        completed += 1;
        console.log(JSON.stringify({ event: 'skip_valid', batch_id: item.batch_id, completed, total: index.length }));
        continue;
      }
      active += 1;
      const child = spawn(process.execPath, [runner, '--input', inputPath, '--output', outputPath], {
        cwd: process.cwd(), windowsHide: true, env: process.env,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => {
        active -= 1;
        completed += 1;
        if (code !== 0) failures += 1;
        console.log(JSON.stringify({
          event: code === 0 ? 'completed' : 'failed', batch_id: item.batch_id, code,
          completed, total: index.length, failures,
          detail: code === 0 ? stdout.trim().slice(-400) : stderr.trim().slice(-700),
        }));
        if (completed === index.length) resolve(); else launch();
      });
    }
    if (completed === index.length) resolve();
  }
  launch();
});
if (failures) throw new Error(`${failures} lot(s) en échec sur ${index.length}.`);
console.log(JSON.stringify({ status: 'PASS', completed, failures }));
