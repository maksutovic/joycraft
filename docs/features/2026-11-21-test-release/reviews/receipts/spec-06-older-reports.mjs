import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const files = execFileSync('git', ['ls-files', '*.report.json'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const norm = t => String(t).replace(/\s+/g, ' ').trim();
const ran = a => (['sh','bash'].includes(path.posix.basename(a[0] ?? '')) && a[1] === '-c' && a.length === 3 ? norm(a[2]) : norm(a.join(' ')));
const gates = ['pnpm test && pnpm typecheck', 'pnpm test', 'pnpm typecheck'];
let n = 0, obs = 0; const hits = {};
for (const f of files) { let r; try { r = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; } n++;
  for (const fl of r.flows ?? []) for (const o of fl.observations ?? []) { const a = o?.command?.argv; if (!Array.isArray(a)) continue; obs++; const c = ran(a); if (gates.includes(c)) (hits[c] ??= []).push(f); } }
console.log(JSON.stringify({ reports: n, observationsWithArgv: obs, wouldMatchIfRecorded: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, [...new Set(v)].length])) }, null, 1));
