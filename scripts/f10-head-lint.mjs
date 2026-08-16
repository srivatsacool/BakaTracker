// F10a: lint HEAD versions of all src/ files vs working tree, per-file counts.
// Uses the repo eslint config via --stdin (config resolution needs repo cwd).
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', 'src/'], {
  encoding: 'utf8',
}).trim().split('\n');

const results = [];
for (const f of files) {
  const head = execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let count = -1;
  const eslintBin = new URL('../node_modules/eslint/bin/eslint.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  try {
    const out = execFileSync(
      process.execPath, [eslintBin, '--stdin', '--stdin-filename', f, '--format', 'json'],
      { input: head, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
    const j = JSON.parse(out);
    count = (j[0]?.errorCount) || 0;
  } catch (e) {
    // eslint exits non-zero on errors; stdout still has JSON
    try {
      const j = JSON.parse(e.stdout);
      count = (j[0]?.errorCount) || 0;
    } catch {
      count = -1;
    }
  }
  results.push({ f, count });
}

const total = results.reduce((a, r) => a + (r.count > 0 ? r.count : 0), 0);
console.log('HEAD total errors:', total);
for (const r of results.filter(r => r.count > 0).sort((a, b) => b.count - a.count)) {
  console.log(r.count, r.f);
}
console.log('--- files with count -1 (lint failed):', results.filter(r => r.count === -1).map(r => r.f).join(', ') || 'none');
