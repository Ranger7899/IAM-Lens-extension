// Bundle budget check. Zero dependencies; run with `node scripts/check-bundle.ts`.
// Reads <IAM_OUT_DIR ?? '.output'>/chrome-mv3. Fails (exit 1) if:
//  - total size excluding assets/roles.snapshot-<hash>.json exceeds 1.5 MB
//  - any .js chunk exceeds 400 KB
//  - the manifest CSP script-src allows a remote URL
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const TOTAL_BUDGET = 1.5 * 1024 * 1024;
const CHUNK_BUDGET = 400 * 1024;
const SNAPSHOT_RE = /^assets\/roles\.snapshot-[0-9a-f]+\.json$/;

const dir = path.resolve(process.env.IAM_OUT_DIR ?? '.output', 'chrome-mv3');

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );
}

let files: { rel: string; size: number }[];
try {
  files = walk(dir).map((f) => ({
    rel: path.relative(dir, f).split(path.sep).join('/'),
    size: statSync(f).size,
  }));
} catch {
  console.error(`check-bundle: cannot read ${dir} (run npm run build first)`);
  process.exit(1);
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const failures: string[] = [];

files.sort((a, b) => b.size - a.size);
const counted = files.filter((f) => !SNAPSHOT_RE.test(f.rel));
const total = counted.reduce((s, f) => s + f.size, 0);
const snapshotTotal = files.length ? files.reduce((s, f) => s + f.size, 0) - total : 0;

console.log(`Bundle: ${dir}`);
console.log('size'.padStart(12), ' file');
for (const f of files) {
  const note = SNAPSHOT_RE.test(f.rel) ? '  (snapshot, excluded)' : '';
  console.log(kb(f.size).padStart(12), '', f.rel + note);
}
console.log(`\nTotal (excl. snapshot): ${kb(total)} / ${kb(TOTAL_BUDGET)}; snapshot: ${kb(snapshotTotal)}`);

if (total > TOTAL_BUDGET) failures.push(`total ${kb(total)} exceeds ${kb(TOTAL_BUDGET)}`);
for (const f of counted) {
  if (f.rel.endsWith('.js') && f.size > CHUNK_BUDGET) {
    failures.push(`${f.rel} is ${kb(f.size)}, over the ${kb(CHUNK_BUDGET)} chunk budget`);
  }
}

// Remote URLs in script-src (manifest CSP and any HTML <script src>).
const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as {
  content_security_policy?: Record<string, string> | string;
};
const csp = manifest.content_security_policy;
const policies = typeof csp === 'string' ? [csp] : Object.values(csp ?? {});
for (const p of policies) {
  for (const d of p.split(';')) {
    const [name, ...srcs] = d.trim().split(/\s+/);
    if (name === 'script-src' || name === 'script-src-elem') {
      for (const s of srcs) {
        if (/^(https?:)?\/\//i.test(s) || /^https?:$/i.test(s) || s === '*') {
          failures.push(`remote script-src source "${s}" in manifest CSP`);
        }
      }
    }
  }
}
for (const f of files.filter((x) => x.rel.endsWith('.html'))) {
  const html = readFileSync(path.join(dir, f.rel), 'utf8');
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']?((?:https?:)?\/\/[^"'\s>]+)/gi)) {
    failures.push(`remote script ${m[1]} in ${f.rel}`);
  }
}

if (failures.length) {
  console.error('\nFAIL');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK: within budgets');
