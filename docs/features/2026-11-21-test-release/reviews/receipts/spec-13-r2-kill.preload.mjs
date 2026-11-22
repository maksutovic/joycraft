// Preload for the spec 13 round-2 probe: SIGKILLs the archive process at one named point.
// PROBE_KILL_AT = before-move | between-renames | before-rewrite | mid-rewrite | mid-test | after-green | after-clear
import fs from 'node:fs';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

const at = process.env.PROBE_KILL_AT;
const die = () => { try { fs.writeSync(2, `probe: SIGKILL at ${at}\n`); } catch {} process.kill(process.pid, 'SIGKILL'); };
if (at) {
  const rename = fs.renameSync, write = fs.writeFileSync, rm = fs.rmSync, spawn = cp.spawn;
  let testWrites = 0;
  fs.renameSync = function (from, to) {
    const f = String(from), t = String(to);
    if (at === 'before-move' && t.endsWith('/feature') && f.includes('/docs/features/')) die();
    if (at === 'between-renames' && f.includes('.staging-') && !t.includes('.staging-')) die();
    return rename.apply(this, arguments);
  };
  fs.writeFileSync = function (file) {
    const f = String(file);
    if (f.includes('/tests/') && (at === 'before-rewrite' || at === 'mid-rewrite')) {
      testWrites += 1;
      if (at === 'before-rewrite' && testWrites === 1) die();
      if (at === 'mid-rewrite' && testWrites === 2) die();
    }
    return write.apply(this, arguments);
  };
  fs.rmSync = function (file) {
    const f = String(file);
    if (at === 'after-green' && f.includes('archive-pending')) die();
    const out = rm.apply(this, arguments);
    if (at === 'after-clear' && f.includes('archive-pending')) die();
    return out;
  };
  cp.spawn = function () {
    const child = spawn.apply(this, arguments);
    if (at === 'mid-test') setTimeout(die, 400);
    return child;
  };
  syncBuiltinESMExports();
}
