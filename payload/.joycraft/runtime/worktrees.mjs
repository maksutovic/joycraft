import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureLocal, mainTree, withLock } from './coordinator.mjs';
import { isObject, parseJson, readLocal, relativePath, requireValue, validateQueue } from './identity.mjs';

// Worker worktrees have one home and one ledger, so a later session can tell
// its own trees from someone else's and release them once their work is in.
export const ledgerPath = '.joycraft/local/worktrees.json';
export const treeHome = '.joycraft/local/worktrees';

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gitOk = (cwd, args) => { try { git(cwd, args); return true; } catch { return false; } };

// The ledger and tree home live in the main checkout, so a coordinator in any
// linked tree reads and writes the same records.
function gitRoot(root) {
  try { git(root, ['rev-parse', '--show-toplevel']); } catch { throw new Error(`Not a Git working tree: ${root}`); }
  return mainTree(root);
}

export function readLedger(root) {
  const file = path.join(root, ledgerPath);
  if (!existsSync(file)) return { schemaVersion: 1, trees: [] };
  const ledger = parseJson(readFileSync(file), ledgerPath);
  requireValue(isObject(ledger) && ledger.schemaVersion === 1 && Array.isArray(ledger.trees), `Unsupported worktree ledger: ${ledgerPath}`);
  return ledger;
}

function writeLedger(root, ledger) {
  ensureLocal(root);
  writeFileSync(path.join(root, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
}

function readQueueFile(root, queuePath) {
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  validateQueue(queue, { select: () => false });
  return queue;
}

/** Create a worker tree for one spec from a captured base revision and record its owner. */
export function createWorktree({ root = process.cwd(), queuePath, specId, session, base = 'HEAD' }) {
  root = gitRoot(root);
  queuePath = relativePath(queuePath);
  requireValue(typeof session === 'string' && session.trim(), 'Creating a worker tree needs the coordinator --session');
  const queue = readQueueFile(root, queuePath);
  requireValue(/^[a-z0-9][a-z0-9-]*$/.test(queue.feature), 'Worker trees need a queue feature that is a lowercase slug');
  requireValue(queue.specs.some(spec => spec.id === specId), `Spec ${specId} does not exist in queue`);
  const name = `${queue.feature}-${specId}`;
  const treePath = `${treeHome}/${name}`;
  const branch = `joycraft/${name}`;
  let baseRevision;
  try { baseRevision = git(root, ['rev-parse', '--verify', `${base}^{commit}`]).trim(); } catch { throw new Error(`Unknown base revision: ${base}`); }
  ensureLocal(root);
  return withLock(path.join(root, ledgerPath), () => {
    const ledger = readLedger(root);
    requireValue(!ledger.trees.some(tree => tree.path === treePath), `A worker tree for spec ${specId} is already recorded: ${treePath}; run prune or list first`);
    requireValue(!existsSync(path.join(root, treePath)), `Worker tree path already exists: ${treePath}`);
    mkdirSync(path.join(root, treeHome), { recursive: true });
    git(root, ['worktree', 'add', '-b', branch, treePath, baseRevision]);
    const entry = { path: treePath, branch, feature: queue.feature, queuePath, specId, baseRevision, coordinatorSession: session, createdAt: new Date().toISOString() };
    ledger.trees.push(entry);
    writeLedger(root, ledger);
    return { ...entry, next: 'Run the project bootstrap in this tree before any edit.' };
  });
}

function linkedTrees(root, here = root) {
  const blocks = git(root, ['worktree', 'list', '--porcelain']).split(/\n\n+/).filter(Boolean);
  const trees = blocks.map(block => {
    const tree = {};
    for (const line of block.split('\n')) {
      const [key, ...rest] = line.split(' ');
      tree[key] = rest.join(' ') || true;
    }
    return tree;
  });
  // The first entry is the main working tree; the tree prune runs from is never listed.
  return trees.slice(1).filter(tree => !existsSync(tree.worktree) || realpathSync(tree.worktree) !== here);
}

function sizeOf(target) {
  let total = 0;
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    let stat;
    try { stat = lstatSync(current); } catch { continue; }
    if (stat.isDirectory()) for (const name of readdirSync(current)) stack.push(path.join(current, name));
    else total += stat.size;
  }
  return total;
}

function queueSpec(root, entry, queues) {
  try {
    if (!queues.has(entry.queuePath)) queues.set(entry.queuePath, readQueueFile(root, entry.queuePath));
    return queues.get(entry.queuePath).specs.find(spec => spec.id === entry.specId) ?? { status: 'missing' };
  } catch { return { status: 'unknown' }; }
}

// Ignored files are not "uncommitted changes", so git removes them with the tree.
// List them, and name accepted evidence that exists only in this tree.
function ignoredEntries(tree) {
  return git(tree, ['status', '--ignored', '--porcelain']).split('\n').filter(line => line.startsWith('!! ')).map(line => line.slice(3));
}

function evidenceOnlyHere(root, tree, spec) {
  return [spec.acceptedReport?.path, spec.ownerAcceptance?.path].filter(Boolean)
    .filter(file => existsSync(path.join(tree, file)) && !existsSync(path.join(root, file)));
}

/** Every linked tree with its owner, spec status, merged and clean state. */
export function listWorktrees({ root = process.cwd(), into = 'HEAD', sizes = true } = {}) {
  const main = gitRoot(root);
  const here = realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim());
  root = main;
  const ledger = readLedger(root);
  const owned = new Map(ledger.trees.map(entry => [path.resolve(root, entry.path), entry]));
  const queues = new Map();
  const seen = new Set();
  const trees = linkedTrees(root, here).map(tree => {
    const absolute = existsSync(tree.worktree) ? realpathSync(tree.worktree) : tree.worktree;
    const entry = owned.get(absolute) ?? owned.get(tree.worktree);
    if (entry) seen.add(entry.path);
    const exists = existsSync(absolute);
    const spec = entry ? queueSpec(root, entry, queues) : null;
    const record = {
      path: path.relative(root, absolute) || '.',
      branch: typeof tree.branch === 'string' ? tree.branch.replace(/^refs\/heads\//, '') : null,
      owner: entry ? 'joycraft' : 'unknown-owner',
      ...(entry ? { feature: entry.feature, specId: entry.specId, coordinatorSession: entry.coordinatorSession, ledgerBranch: entry.branch, specStatus: spec.status } : {}),
      ...(entry && exists ? { ignored: ignoredEntries(absolute), evidenceOnlyHere: evidenceOnlyHere(root, absolute, spec) } : {}),
      merged: typeof tree.HEAD === 'string' && gitOk(root, ['merge-base', '--is-ancestor', tree.HEAD, into]),
      clean: exists && gitOk(absolute, ['diff', '--quiet', 'HEAD']) && git(absolute, ['status', '--porcelain']).trim() === '',
      exists,
    };
    if (sizes) record.bytes = exists ? sizeOf(absolute) : 0;
    return record;
  });
  const missing = ledger.trees.filter(entry => !seen.has(entry.path) && path.resolve(root, entry.path) !== here).map(entry => ({ path: entry.path, branch: entry.branch, owner: 'joycraft', feature: entry.feature, specId: entry.specId, exists: false, missing: true }));
  return { root, into, trees: [...trees, ...missing] };
}

export function decide(tree) {
  if (tree.owner === 'joycraft' && !tree.exists) return { action: 'forget', reason: 'Recorded tree no longer exists; drop the ledger entry.' };
  if (tree.owner !== 'joycraft') return { action: 'keep', reason: 'Not created by worktrees.mjs; inspect it, then remove it with git worktree remove if it is yours.' };
  if (tree.specStatus !== 'done') return { action: 'keep', reason: `Spec ${tree.specId} is ${tree.specStatus}; keep the tree until it is done.` };
  if (!tree.clean) return { action: 'keep', reason: 'The tree has uncommitted changes; commit or discard them first.' };
  if (!tree.merged) return { action: 'keep', reason: 'The branch has commits that are not in the integration ref.' };
  if (tree.evidenceOnlyHere.length) return { action: 'keep', reason: `Accepted evidence exists only in this tree: ${tree.evidenceOnlyHere.join(', ')}; copy it to the main checkout first.` };
  return { action: 'remove', reason: 'Spec done, tree clean, branch integrated.', ...(tree.ignored.length ? { deletesIgnored: tree.ignored } : {}) };
}

/** Preview by default; apply removes only owned, clean, integrated trees of done specs. */
export function pruneWorktrees({ root = process.cwd(), into = 'HEAD', apply = false } = {}) {
  const listing = listWorktrees({ root, into, sizes: false });
  root = listing.root;
  const plan = listing.trees.map(tree => ({ path: tree.path, branch: tree.branch, specId: tree.specId, ...decide(tree), ledgerBranch: tree.ledgerBranch }));
  const strip = items => items.map(({ ledgerBranch, ...item }) => item);
  if (!apply) return { applied: false, into, plan: strip(plan) };
  ensureLocal(root);
  return withLock(path.join(root, ledgerPath), () => {
    const ledger = readLedger(root);
    for (const item of plan.filter(item => item.action !== 'keep')) {
      if (item.action === 'remove') {
        try { git(root, ['worktree', 'remove', item.path]); } catch (error) {
          item.action = 'keep'; item.reason = `git worktree remove refused: ${String(error.stderr ?? error.message).trim()}`; continue;
        }
        // Delete only the branch Joycraft created, and only if it is merged (-d).
        item.branchDeleted = item.branch !== null && item.branch === item.ledgerBranch && gitOk(root, ['branch', '-d', item.branch]);
      }
      ledger.trees = ledger.trees.filter(entry => entry.path !== item.path);
    }
    gitOk(root, ['worktree', 'prune']);
    writeLedger(root, ledger);
    return { applied: true, into, plan: strip(plan) };
  });
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    if (['--apply', '--no-size'].includes(rest[index])) { flags[rest[index]] = true; continue; }
    flags[rest[index]] = rest[index + 1]; index += 1;
  }
  const root = path.resolve(flags['--root'] ?? '.');
  let result;
  if (command === 'create') {
    requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec'] ?? ''), 'Spec ID must be a nonnegative integer');
    result = createWorktree({ root, queuePath: flags['--queue'], specId: Number(flags['--spec']), session: flags['--session'], base: flags['--base'] ?? 'HEAD' });
  } else if (command === 'list') result = listWorktrees({ root, into: flags['--into'] ?? 'HEAD', sizes: flags['--no-size'] !== true });
  else if (command === 'prune') result = pruneWorktrees({ root, into: flags['--into'] ?? 'HEAD', apply: flags['--apply'] === true });
  else throw new Error('Usage: worktrees.mjs create --queue <queue> --spec <id> --session <coordinator> [--base <rev>] | list [--into <ref>] [--no-size] | prune [--into <ref>] [--apply] [--root <project>]');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Worktrees stopped: ${error.message}\n`); process.exitCode = 1; });
}
