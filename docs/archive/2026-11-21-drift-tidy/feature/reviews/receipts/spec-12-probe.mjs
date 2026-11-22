// Spec 12 reviewer probe: payload words at several revisions, counted as
// tests/payload-guard.test.ts counts them (skills, agent files, references; wc -w).
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
const isPayloadText = (path) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$/.test(path)
  || /^\.claude\/agents\/[^/]+\.md$/.test(path)
  || /^\.joycraft\/references\/.+\.md$/.test(path);

function words(rev) {
  const files = git('ls-tree', '-r', '--name-only', rev, '--', 'payload/').split('\n').filter(Boolean)
    .map((file) => file.slice('payload/'.length)).filter(isPayloadText);
  const perFile = {};
  let sum = 0;
  for (const file of files) {
    const count = git('show', `${rev}:payload/${file}`).split(/\s+/).filter(Boolean).length;
    perFile[file] = count;
    sum += count;
  }
  return { sum, perFile };
}

const revs = process.argv.slice(2);
const results = revs.map((rev) => ({ rev, ...words(rev) }));
for (const { rev, sum } of results) console.log(`${rev}\t${sum}`);
const [first, ...rest] = results;
for (const other of rest) {
  console.log(`\nper-file change ${first.rev} -> ${other.rev}:`);
  const names = new Set([...Object.keys(first.perFile), ...Object.keys(other.perFile)]);
  for (const name of [...names].sort()) {
    const delta = (other.perFile[name] ?? 0) - (first.perFile[name] ?? 0);
    if (delta) console.log(`${delta > 0 ? '+' : ''}${delta}\t${name}`);
  }
}
