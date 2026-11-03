import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// One catalog for detection, the setup plan and the public docs.
export const catalog = JSON.parse(readFileSync(new URL('./review-tools.json', import.meta.url), 'utf8'));
const sectionHeading = '## Review loop';
const marker = /<!-- joycraft:review-loop v(\d+) (\{.*\}) -->/;
// The host's own tools (its browser, simulator, computer use) are per machine, never in the shared AGENTS.md.
const localFile = '.joycraft/local/review-loop.json';
const webDeps = ['next', 'vite', 'react-dom', 'vue', 'svelte', '@sveltejs/kit', 'astro', 'nuxt', '@remix-run/react', 'solid-js', '@angular/core', 'gatsby'];
const apiDeps = ['express', 'fastify', 'koa', 'hono', '@nestjs/core', '@hapi/hapi'];
const devServer = /\b(vite|next dev|nuxt dev|astro dev|webpack serve|react-scripts start|ng serve)\b/;

const read = file => { try { return readFileSync(file, 'utf8'); } catch { return null; } };
const isDir = dir => { try { return lstatSync(dir).isDirectory(); } catch { return false; } };
const json = text => { try { return JSON.parse(text); } catch { return null; } };
const listDir = dir => { try { return readdirSync(dir); } catch { return []; } };

function workspaceDirs(root) {
  const manifest = json(read(path.join(root, 'package.json')));
  const globs = [...(Array.isArray(manifest?.workspaces) ? manifest.workspaces : manifest?.workspaces?.packages ?? [])];
  const pnpm = read(path.join(root, 'pnpm-workspace.yaml'));
  // Only the top-level `packages:` list; other keys hold unrelated lists.
  const block = pnpm && /^packages:\s*\n((?:[ \t]+.*\n?|[ \t]*\n)*)/m.exec(pnpm);
  if (block) for (const match of block[1].matchAll(/^\s*-\s*['"]?([^'"\n#]+?)['"]?\s*$/gm)) globs.push(match[1]);
  const dirs = [];
  for (const glob of globs.filter(item => !item.startsWith('!') && !['.', './'].includes(item))) {
    if (glob.endsWith('/*')) {
      const parent = glob.slice(0, -2);
      for (const name of listDir(path.join(root, parent)).sort()) if (isDir(path.join(root, parent, name))) dirs.push(path.posix.join(parent, name));
    } else if (!glob.includes('*') && isDir(path.join(root, glob))) dirs.push(glob);
  }
  return [...new Set(dirs)];
}

const manifestFile = /(^|\/)(package\.json|pubspec\.yaml|Package\.swift|build\.gradle(\.kts)?|pyproject\.toml|requirements\.txt|setup\.py|Cargo\.toml|go\.mod)$/;
const skipDir = name => name.startsWith('.') || ['node_modules', 'vendor', 'Pods', 'dist', 'build', 'target'].includes(name);

/** Project files below the root: git's view when it has one (so .gitignore holds), else a bounded walk. */
function projectFiles(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter(Boolean);
  } catch {
    const files = [];
    const walk = (rel, depth) => {
      for (const name of listDir(path.join(root, rel))) {
        const file = rel ? `${rel}/${name}` : name;
        if (isDir(path.join(root, file))) { if (depth < 6 && !skipDir(name)) walk(file, depth + 1); } else files.push(file);
      }
    };
    walk('', 0);
    return files;
  }
}

/** Folders holding a manifest when no workspaces are declared. The shallowest wins; an Android `app/` belongs to its parent. */
function nestedPackageDirs(root) {
  const dirs = new Set();
  for (const file of projectFiles(root)) {
    if (!manifestFile.test(file) || file.split('/').some(skipDir)) continue;
    let dir = path.posix.dirname(file);
    if (/build\.gradle/.test(file) && path.posix.basename(dir) === 'app') dir = path.posix.dirname(dir);
    if (dir !== '.') dirs.add(dir);
  }
  const sorted = [...dirs].sort();
  return sorted.filter(dir => !sorted.some(other => other !== dir && dir.startsWith(`${other}/`)));
}

/** Categories for one package directory, from its manifests and project files only. */
export function classifyPackage(dir) {
  const found = new Set();
  const manifest = json(read(path.join(dir, 'package.json')));
  const deps = { ...manifest?.dependencies, ...manifest?.devDependencies };
  const has = name => Object.hasOwn(deps, name);
  if (has('expo')) found.add('expo');
  else if (has('react-native')) found.add('react-native');
  if (has('electron')) found.add('electron');
  if (!found.has('expo') && !found.has('react-native') && !found.has('electron')
    && (webDeps.some(has) || Object.values(manifest?.scripts ?? {}).some(script => devServer.test(String(script))))) found.add('web');
  if (apiDeps.some(has)) found.add('api');
  const pubspec = read(path.join(dir, 'pubspec.yaml'));
  if (pubspec && /^\s*flutter\s*:/m.test(pubspec)) found.add('flutter');
  const names = listDir(dir);
  const swift = read(path.join(dir, 'Package.swift'));
  if (!found.has('flutter') && !found.has('react-native') && !found.has('expo')
    && (names.some(name => /\.(xcodeproj|xcworkspace)$/.test(name)) || (swift && /\.(iOS|macOS)\s*\(/.test(swift)))) found.add('ios');
  const gradle = ['build.gradle', 'build.gradle.kts', 'app/build.gradle', 'app/build.gradle.kts'].map(file => read(path.join(dir, file))).filter(Boolean).join('\n');
  if (!found.has('flutter') && !found.has('react-native') && !found.has('expo') && /com\.android\./.test(gradle)) found.add('android');
  const python = ['pyproject.toml', 'requirements.txt', 'setup.py'].map(file => read(path.join(dir, file))).filter(Boolean).join('\n');
  if (/\b(fastapi|flask|django|starlette)\b/i.test(python)) found.add('api');
  const cargo = read(path.join(dir, 'Cargo.toml')) ?? '';
  if (/^\s*(axum|actix-web|rocket|warp)\s*=/m.test(cargo)) found.add('api');
  const go = read(path.join(dir, 'go.mod')) ?? '';
  if (/(gin-gonic\/gin|labstack\/echo|gofiber\/fiber|go-chi\/chi)/.test(go)) found.add('api');
  const anyManifest = manifest || python || cargo || go || swift || pubspec || gradle;
  if (!found.size && anyManifest) found.add('cli-library');
  return [...found];
}

/**
 * Each package of a project with its categories. A workspace root without its own app is not a package.
 * `packages` names the folders outright; with no workspaces and no root manifest, nested manifests are scanned.
 */
export function detectProjects(root, { packages: named = null } = {}) {
  const outside = (named ?? []).find(dir => path.isAbsolute(dir) || dir.split(/[\\/]/).includes('..'));
  if (outside) throw new Error(`--packages takes folders inside the project; ${outside} is not`);
  const own = classifyPackage(root);
  const declared = named ?? workspaceDirs(root);
  const dirs = named || declared.length || own.length ? declared : nestedPackageDirs(root);
  const packages = dirs.map(dir => ({ path: dir, categories: classifyPackage(path.join(root, dir)) }))
    .filter(entry => entry.categories.length);
  if (named) return packages;
  const workspaceOnly = packages.length && own.every(category => category === 'cli-library');
  return [...(workspaceOnly || !own.length ? [] : [{ path: '.', categories: own }]), ...packages];
}

export function packageManager(dir, root = dir) {
  for (const base of [dir, root]) {
    if (existsSync(path.join(base, 'pnpm-lock.yaml'))) return { name: 'pnpm', add: ['pnpm', 'add', '-D'], exec: ['pnpm', 'exec'] };
    if (existsSync(path.join(base, 'yarn.lock'))) return { name: 'yarn', add: ['yarn', 'add', '-D'], exec: ['yarn'] };
    if (existsSync(path.join(base, 'bun.lockb')) || existsSync(path.join(base, 'bun.lock'))) return { name: 'bun', add: ['bun', 'add', '-d'], exec: ['bunx'] };
  }
  return { name: 'npm', add: ['npm', 'install', '-D'], exec: ['npx'] };
}

function startCommand(dir, root, categories) {
  const scripts = json(read(path.join(dir, 'package.json')))?.scripts ?? {};
  const pm = packageManager(dir, root).name;
  const script = ['dev', 'start', 'ios', 'android'].find(name => scripts[name]);
  if (script) return `${pm} run ${script} (package.json, unrun)`;
  if (categories.includes('android')) return './gradlew installDebug (unrun)';
  if (categories.includes('ios')) return 'xcodebuild build (scheme not established)';
  if (categories.includes('flutter')) return 'flutter run (unrun)';
  return 'not established';
}

/** Read-only probe: run a version or list command with no shell. Never installs. */
export function defaultRun(command, args) {
  try { return { ok: true, stdout: execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }) }; }
  catch { return { ok: false, stdout: '' }; }
}

const firstVersion = text => /\d+(?:\.\d+)+/.exec(text)?.[0] ?? null;
const hints = new Map(catalog.hints.map(hint => [hint.id, hint]));
const hintLabel = id => hints.get(id)?.label ?? id;
const scriptPattern = hint => (hint.detect.scripts ? new RegExp(hint.detect.scripts) : null);
const roleOf = id => hints.get(id)?.role ?? null;
// A picked hint covers the detected tools of its role; a picked tool outside the hint list covers the package's missing tools.
const covers = (pick, tool) => (roleOf(pick.id) ? roleOf(pick.id) === roleOf(tool.id) : tool.status !== 'present');

/** Is a downloaded Playwright Chromium in the browser cache? A directory listing only. */
export function playwrightBrowsers(env, home) {
  const roots = env.PLAYWRIGHT_BROWSERS_PATH ? [env.PLAYWRIGHT_BROWSERS_PATH]
    : [path.join(home, 'Library/Caches/ms-playwright'), path.join(home, '.cache/ms-playwright')];
  return roots.some(dir => listDir(dir).some(name => name.startsWith('chromium')));
}

const brandedBrowsers = {
  chrome: { label: 'Chrome', apps: ['Google Chrome.app'], commands: ['google-chrome', 'google-chrome-stable'] },
  msedge: { label: 'Microsoft Edge', apps: ['Microsoft Edge.app'], commands: ['microsoft-edge', 'microsoft-edge-stable'] },
};

/** Read-only: a branded browser is installed when its macOS app bundle exists or its command answers `--version`. */
export function browserInstalled(browser, { run = defaultRun, exists = existsSync, home = homedir() } = {}) {
  const spec = brandedBrowsers[browser];
  if (spec.apps.some(app => exists(path.join('/Applications', app)) || exists(path.join(home, 'Applications', app)))) return true;
  return spec.commands.some(command => run(command, ['--version']).ok);
}

/** The bracketed or braced block that opens at `start`, by depth; strings are not parsed (a text read, not a run). */
function block(code, start) {
  const open = code[start]; const close = open === '[' ? ']' : '}';
  let depth = 0;
  for (let index = start; index < code.length; index += 1) {
    if (code[index] === open) depth += 1;
    else if (code[index] === close && --depth === 0) return code.slice(start, index + 1);
  }
  return code.slice(start);
}

const channelOf = text => /\bchannel\s*:\s*['"`]([\w.-]+)['"`]/.exec(text)?.[1] ?? null;

/**
 * The browser channel each Playwright project uses, read as text from `playwright.config.*`; null is the
 * bundled Chromium. `projects[].use.channel` overrides the top-level `use.channel`. The config is never run.
 */
export function playwrightChannels(dir) {
  const channels = [];
  for (const ext of ['ts', 'js', 'mjs', 'cjs']) {
    const text = read(path.join(dir, `playwright.config.${ext}`));
    if (!text) continue;
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const at = /\bprojects\s*:\s*\[/.exec(code);
    if (!at) { channels.push(channelOf(code)); continue; }
    const list = block(code, at.index + at[0].length - 1);
    const top = channelOf(code.replace(list, '[]'));
    const projects = [];
    for (let index = 1; index < list.length; index += 1) {
      if (list[index] !== '{') continue;
      const item = block(list, index);
      projects.push(channelOf(item) ?? top);
      index += item.length - 1;
    }
    channels.push(...(projects.length ? projects : [top]));
  }
  return channels.length ? [...new Set(channels)] : [null];
}

/** Playwright is present only when every project's browser is here: the downloaded Chromium, or the branded browser a channel names. */
function playwrightBrowser(found, ctx) {
  const needs = new Set(playwrightChannels(ctx.dir).map(channel => (!channel ? 'bundled'
    : /^chrome(-|$)/.test(channel) ? 'chrome' : /^msedge(-|$)/.test(channel) ? 'msedge' : 'bundled')));
  const absent = [...needs].filter(need => !(need === 'bundled' ? playwrightBrowsers(ctx.env, ctx.home) : browserInstalled(need, ctx)));
  if (!absent.length) {
    const branded = [...needs].filter(need => need !== 'bundled');
    return branded.length ? { ...found, note: `${branded.map(need => brandedBrowsers[need].label).join(' and ')} channel` } : found;
  }
  const branded = absent.filter(need => need !== 'bundled').map(need => brandedBrowsers[need].label);
  const note = [...(absent.includes('bundled') ? ['browser not downloaded'] : []), ...(branded.length ? [`${branded.join(' and ')} not installed`] : [])].join('; ');
  if (absent.includes('bundled')) {
    return { ...found, status: 'missing', note,
      install: { scope: 'project', commands: [[...ctx.pm.exec, 'playwright', 'install', 'chromium']], size: 'about 150 MB', sudo: false } };
  }
  return { ...found, status: 'missing', note,
    install: { scope: 'user', steps: [`Install ${branded.join(' and ')}, or point use.channel at a browser on this machine`], size: 'about 500 MB', sudo: false } };
}

function installedVersion(name, { dir, root }) {
  return [dir, root].map(base => json(read(path.join(base, 'node_modules', name, 'package.json')))?.version).find(Boolean) ?? null;
}

function commandVersion(hint, run) {
  for (const [command, ...args] of hint.detect.commands ?? []) {
    const out = run(command, args);
    if (out.ok) return firstVersion(out.stdout);
  }
  return null;
}

function declaredTestCommand({ dir, root, manifest }) {
  return manifest?.scripts?.test ? `${packageManager(dir, root).name} test`
    : existsSync(path.join(dir, 'Cargo.toml')) ? 'cargo test'
      : existsSync(path.join(dir, 'go.mod')) ? 'go test ./...'
        : ['pyproject.toml', 'requirements.txt', 'setup.py'].some(file => existsSync(path.join(dir, file))) ? 'python3 -m pytest' : null;
}

/** A project hint is in use when the package declares its dependency, holds its config file, or has a script that runs it. File reads only. */
function inPackage(hint, ctx) {
  const { detect } = hint;
  if (detect.testCommand) {
    const declared = declaredTestCommand(ctx);
    return declared ? { status: 'present', version: null, note: `${declared} (declared, unrun)` } : null;
  }
  const dependency = (detect.dependencies ?? []).find(name => Object.hasOwn(ctx.deps, name));
  const config = (detect.configFiles ?? []).find(file => (file.startsWith('*')
    ? ctx.names.some(name => name.endsWith(file.slice(1))) : existsSync(path.join(ctx.dir, file))));
  const pattern = scriptPattern(hint);
  const script = pattern && Object.entries(ctx.scripts).find(([, command]) => pattern.test(String(command)));
  const job = !script ? ctx.ci.find(item => runsHint(hint, item)) : null;
  if (!dependency && !config && !script && !job) return null;
  const version = dependency ? installedVersion(dependency, ctx) ?? String(ctx.deps[dependency]) : commandVersion(hint, ctx.run);
  const found = { status: 'present', version, via: `${hint.label} (already in the project)`,
    signal: dependency ? `dependency ${dependency}` : config ? `file ${config}` : script ? `script ${script[0]}` : `CI ${job.source}` };
  return hint.id === 'playwright' ? playwrightBrowser(found, ctx) : found;
}

/** A machine hint is present when one of its version or list commands answers (and matches, when it names a line). */
function onMachine(hint, run) {
  for (const [command, ...args] of hint.detect.commands ?? []) {
    const out = run(command, args);
    if (!out.ok) continue;
    if (!hint.detect.match) return { status: 'present', version: firstVersion(out.stdout) };
    const line = out.stdout.split('\n').map(row => row.trim()).find(row => new RegExp(hint.detect.match).test(row));
    if (!line) continue;
    const version = firstVersion(line);
    return { status: 'present', version, ...(version ? {} : { note: line }) };
  }
  return null;
}

function plannedInstall(hint, pm) {
  const spec = hint.install;
  if (spec.scope === 'project' && spec.packages) {
    const then = (spec.then ?? []).map(command => command.flatMap(part => (part === '{exec}' ? pm.exec : [part])));
    return { scope: 'project', commands: [[...pm.add, ...spec.packages], ...then], size: spec.size, sudo: false };
  }
  return { scope: 'user', steps: spec.steps, size: spec.size, sudo: spec.sudo,
    ...(spec.commands ? { commands: spec.commands } : {}), ...(spec.licence ? { licence: true } : {}), ...(spec.signIn ? { signIn: true } : {}) };
}

/** A user-scope install Joycraft may run after a yes: commands, no sudo, no licence, no sign-in. Anything else is the user's steps. */
const runnable = install => install?.scope === 'user' && Boolean(install.commands?.length) && install.sudo === false && !install.licence && !install.signIn;
const runsHere = install => install?.scope === 'project' || runnable(install);
const commandText = install => install.commands.map(command => command.join(' ')).join(' && ');

function row(hint, result, ctx, label = hint.label) {
  const install = result.install ?? (result.status === 'missing' ? plannedInstall(hint, ctx.pm) : null);
  const { install: _ignored, ...rest } = result;
  return { id: hint.id, label, ...rest, canShow: hint.canShow, ...(install ? { install } : {}),
    evidence: hint.evidence ? hint.evidence.replace('{exec}', ctx.pm.exec.join(' ')) : null };
}

/**
 * Fill one role of one kind: tools the package already uses win; then tools on this machine; then the
 * host's own tools; only then a gap, which names the recommended hint.
 */
function fillRole(kind, role, ctx) {
  const candidates = catalog.hints.filter(hint => hint.role === role && hint.kinds.includes(kind));
  const used = candidates.filter(hint => hint.foundBy !== 'host').map(hint => [hint, inPackage(hint, ctx)]).filter(([, result]) => result);
  // A working tool fills the role: another declared tool of that role plans no install, only a note.
  const working = used.filter(([, result]) => result.status === 'present');
  if (working.length) {
    const others = used.filter(([, result]) => result.status !== 'present')
      .map(([hint, result]) => ({ id: hint.id, label: hint.label, status: result.status, ...(result.note ? { note: result.note } : {}) }));
    return working.map(([hint, result], index) => row(hint, { ...result, ...(index === 0 && others.length ? { alsoDeclared: others } : {}) }, ctx));
  }
  if (used.length) return used.map(([hint, result]) => row(hint, result, ctx));
  for (const hint of candidates.filter(item => item.foundBy === 'machine')) {
    const result = onMachine(hint, ctx.run);
    if (result) return [row(hint, result, ctx)];
  }
  for (const hint of candidates) {
    const host = (hint.detect.hostTools ?? []).find(tool => ctx.hostTools.includes(tool));
    if (host) return [row(hint, { status: 'present', version: null, via: `the host's built-in ${host}`, host }, ctx)];
  }
  const hint = hints.get(catalog.categories[kind].recommend[role]);
  return [{ ...row(hint, { status: 'missing', ...(hint.missingNote ? { note: hint.missingNote } : {}) }, ctx, hint.install.label ?? hint.label), gap: `${kind}:${role}` }];
}

/** Each kind of app with each role its review needs; a mobile framework adds the platforms it targets. */
function slotsFor(categories, dir) {
  const kinds = [];
  for (const category of categories) {
    kinds.push(category);
    if (catalog.categories[category].mobile) {
      const ios = isDir(path.join(dir, 'ios')); const android = isDir(path.join(dir, 'android'));
      if (ios || !android) kinds.push('ios');
      if (android || !ios) kinds.push('android');
    }
  }
  return [...new Set(kinds)].flatMap(kind => catalog.categories[kind].needs.map(role => [kind, role]));
}

// Open-input rule (`check-detection`: `name-or-command`): a script or CI job that matches no hint is proposed
// when its name OR its command looks like a check. Missing a real check costs more than one extra line.
const checkName = name => /(^|[:_.\-\s/])(e2e|smoke|checks?|integration|visual|acceptance|ui|browser|screenshots?|a11y|lighthouse|regression)([:_.\-\s/]|$)/i.test(name)
  || /^tests?[:_.-]\w/i.test(name) || /\b(e2e|smoke|integration|acceptance|end[- ]to[- ]end)\b/i.test(name);
const checkCommand = command => /\b(tests?|checks?|e2e|smoke|curl|jest|vitest|mocha|ava|pytest)\b/i.test(command) || /\bnode\s+--test\b/.test(command);
// A CI step that only runs a package script (`npm run e2e`) is judged as that script.
const runsPackageScript = /^(npm|pnpm|yarn|bun)\s+(run\s+)?([\w:.-]+)\s*$/;
const setupCommand = /^(npm\s+(ci|install|i)|pnpm\s+(i|install)|yarn(\s+install)?|bun\s+install|(npm|pnpm|yarn|bun)\s+(run\s+)?build|pip\s+install|apt-get|sudo\s+apt-get|brew)\b/;
const isSetup = command => command.split('\n').filter(line => line.trim()).every(line => setupCommand.test(line.trim()));
const runsHint = (hint, item) => Boolean((item.command && scriptPattern(hint)?.test(item.command))
  || (item.uses && (hint.detect.actions ?? []).some(action => item.uses.startsWith(action))));
// Known for this package: a hint of a kind the package is; with no kinds (a step tied to no package), any hint.
const knownHint = (item, kinds = null) => catalog.hints.find(hint => (!kinds || hint.kinds.some(kind => kinds.includes(kind))) && runsHint(hint, item)) ?? null;
// Lint, format and type checks are static checks, not a way to look at the work.
const staticCheck = /^\s*((npx|pnpm\s+exec|yarn|bunx)\s+)?(tsc|eslint|prettier|biome|stylelint|markdownlint|oxlint)\b/;
const proposal = (source, command) => ({ status: 'found, not in the hint list', source, command });

const yamlValue = raw => raw.replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');

/** A block scalar (`|` literal, `>` folded) after `index` is one command: literal lines joined by newlines, folded by spaces. */
function blockScalar(lines, index, keyIndent, indicator) {
  const body = [];
  let next = index + 1;
  for (; next < lines.length; next += 1) {
    const line = lines[next];
    if (line.trim() && /^\s*/.exec(line)[0].length <= keyIndent) break;
    body.push(line.trim());
  }
  while (body.length && !body.at(-1)) body.pop();
  return { command: indicator.startsWith('>') ? body.filter(Boolean).join(' ') : body.join('\n'), end: next - 1 };
}

/** GitHub Actions: each job (id, name, working-directory) and each step (name, run, uses, working-directory). Text read only. */
function githubJobs(text, source) {
  const lines = text.split('\n');
  const jobs = [];
  let jobsIndent = null; let jobIndent = null; let job = null; let step = null; let stepIndent = null; let inSteps = false; let stepsIndent = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = /^\s*/.exec(line)[0].length;
    if (jobsIndent === null) { if (/^jobs\s*:\s*$/.test(line.trim())) jobsIndent = indent; continue; }
    if (indent <= jobsIndent) break;
    jobIndent ??= indent;
    if (indent === jobIndent) {
      job = { source, id: /^([^:\s]+)\s*:/.exec(line.trim())?.[1] ?? '', name: null, where: null, steps: [] };
      jobs.push(job); step = null; inSteps = false;
      continue;
    }
    let body = line.trim();
    let keyIndent = indent;
    if (inSteps && /^-\s+/.test(body) && (stepIndent === null || indent === stepIndent)) {
      stepIndent = indent; step = { name: null, run: null, uses: null, where: null }; job.steps.push(step);
      body = body.replace(/^-\s+/, ''); keyIndent = indent + 2;
    } else if (step && indent <= stepIndent) step = null;
    if (inSteps && !step && indent <= stepsIndent) inSteps = false;
    const pair = /^([\w-]+)\s*:\s*(.*)$/.exec(body);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = yamlValue(raw);
    if (key === 'steps' && !step) { inSteps = true; stepsIndent = indent; stepIndent = null; continue; }
    const target = step ?? (indent === jobIndent + 2 || keyIndent === jobIndent + 2 ? job : null);
    if (key === 'working-directory') (step ?? job).where = value;
    if (!target) continue;
    if (key === 'name') target.name = value;
    if (step && key === 'uses') step.uses = value;
    if (step && key === 'run') {
      if (/^[|>][-+]?$/.test(value)) { const block = blockScalar(lines, index, keyIndent, value); step.run = block.command; index = block.end; }
      else step.run = value;
    }
  }
  return jobs;
}

const gitlabReserved = new Set(['stages', 'variables', 'default', 'include', 'image', 'workflow', 'cache', 'services', 'before_script', 'after_script', 'pages_root']);

/** GitLab CI: each top-level job and the commands in its `script:` list (a `- |` item is one command). Text read only. */
function gitlabJobs(text, source) {
  const lines = text.split('\n');
  const jobs = [];
  let job = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = /^\s*/.exec(line)[0].length;
    if (indent === 0) {
      const id = /^([^:\s][^:]*)\s*:/.exec(line)?.[1]?.trim();
      job = id && !id.startsWith('.') && !gitlabReserved.has(id) ? { source, id, name: id, where: null, steps: [] } : null;
      if (job) jobs.push(job);
      continue;
    }
    const pair = job && /^(\s*)script\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    const keyIndent = pair[1].length; const inline = yamlValue(pair[2]);
    if (inline && !inline.startsWith('[')) { job.steps.push({ name: null, run: inline, uses: null, where: null }); continue; }
    for (let next = index + 1; next < lines.length; next += 1) {
      const item = lines[next];
      if (!item.trim()) continue;
      const depth = /^\s*/.exec(item)[0].length;
      if (depth < keyIndent || (depth === keyIndent && !/^\s*-\s+/.test(item))) { index = next - 1; break; }
      const dash = /^(\s*)-\s+(.*)$/.exec(item);
      if (dash) {
        const value = yamlValue(dash[2]);
        if (/^[|>][-+]?$/.test(value)) { const block = blockScalar(lines, next, dash[1].length, value); job.steps.push({ name: null, run: block.command, uses: null, where: null }); next = block.end; }
        else job.steps.push({ name: null, run: value, uses: null, where: null });
      }
      index = next;
    }
  }
  return jobs;
}

/** CI steps at the project root, each with its job: GitHub Actions workflows and `.gitlab-ci.yml`. Read-only. */
function ciSteps(root) {
  const files = listDir(path.join(root, '.github/workflows')).filter(name => /\.ya?ml$/.test(name)).sort().map(name => `.github/workflows/${name}`);
  const jobs = files.flatMap(file => githubJobs(read(path.join(root, file)) ?? '', file));
  const gitlab = read(path.join(root, '.gitlab-ci.yml'));
  if (gitlab) jobs.push(...gitlabJobs(gitlab, '.gitlab-ci.yml'));
  return jobs.flatMap(job => job.steps.map(step => ({ source: job.source, job: job.id, jobName: job.name, name: step.name,
    command: step.run, uses: step.uses, where: [job.where, step.where].filter(Boolean).join(' ') })));
}

/** Scripts and CI jobs that look like a check by name or command but run no tool in the hint list: proposals, never counted present. */
function unknownChecks(ctx) {
  const scripts = Object.entries(ctx.scripts)
    .filter(([name, command]) => name !== 'test' && !staticCheck.test(String(command)) && (checkName(name) || checkCommand(String(command)))
      && !knownHint({ command: String(command) }, ctx.kinds))
    .map(([name, command]) => proposal(`package.json script "${name}"`, String(command)));
  return [...scripts, ...ciProposals(ctx.ci, ctx.kinds, ctx.scripts)];
}

/**
 * A CI step that runs no known tool is proposed when its job name, its step name or its command looks like a check.
 * A step that only runs a package script of this package is judged as that script, so it is not listed twice.
 */
function ciProposals(steps, kinds = null, scripts = {}) {
  const out = [];
  for (const item of steps) {
    if (!item.command || knownHint(item, kinds) || isSetup(item.command) || staticCheck.test(item.command)) continue;
    const script = runsPackageScript.exec(item.command)?.[3];
    if (script && Object.hasOwn(scripts, script)) continue;
    const named = [item.job, item.jobName, item.name].some(name => name && checkName(name));
    if (named || checkCommand(item.command)) out.push(proposal(`CI ${item.source} job "${item.job}"`, item.command));
  }
  return out;
}

const mentions = (command, dir) => command.split(/[\s=;&|"'`()]+/).map(token => token.replace(/^\.\//, ''))
  .some(token => token === dir || token.startsWith(`${dir}/`));

/**
 * The Review loop plan: each package, the tools it already uses, and one gap line per kind of package with none. Probes only.
 * `chosen` holds the tools the user picked at record time, per package: a tool they cover plans no install and no gap.
 */
export function reviewLoopPlan(root, { run = defaultRun, hostTools = [], env = process.env, home = homedir(), exists = existsSync, packages: named = null, chosen = {} } = {}) {
  const detected = detectProjects(root, { packages: named });
  // A CI command belongs to the package whose folder it names, else to the root package.
  const ci = new Map(detected.map(entry => [entry.path, []]));
  const unplaced = [];
  for (const item of ciSteps(root)) {
    const owner = detected.filter(entry => entry.path !== '.' && mentions(`${item.command ?? ''} ${item.where}`, entry.path))
      .sort((a, b) => b.path.length - a.path.length)[0]?.path ?? (ci.has('.') ? '.' : null);
    if (owner) ci.get(owner).push(item); else unplaced.push(item);
  }
  const packages = detected.map(entry => {
    const dir = path.join(root, entry.path);
    const manifest = json(read(path.join(dir, 'package.json')));
    const ctx = { dir, root, run, env, home, exists, hostTools, manifest, pm: packageManager(dir, root),
      deps: { ...manifest?.dependencies, ...manifest?.devDependencies }, scripts: manifest?.scripts ?? {}, names: listDir(dir), ci: ci.get(entry.path),
      kinds: [...new Set(slotsFor(entry.categories, dir).map(([kind]) => kind))] };
    const tools = [];
    for (const [kind, role] of slotsFor(entry.categories, dir)) {
      for (const tool of fillRole(kind, role, ctx)) if (!tools.some(other => other.id === tool.id)) tools.push(tool);
    }
    for (const tool of tools) {
      const pick = (chosen[entry.path] ?? []).find(item => covers(item, tool));
      if (pick) { delete tool.install; delete tool.gap; tool.covered = { label: pick.label ?? hintLabel(pick.id), canShow: pick.canShow ?? [] }; }
    }
    const proposals = unknownChecks(ctx);
    return { path: entry.path, categories: entry.categories, start: startCommand(dir, root, entry.categories), tools, ...(proposals.length ? { proposals } : {}) };
  });
  // Packages of the same kind with no tool share one gap line and one question, never one install each.
  const groups = new Map();
  for (const entry of packages) for (const tool of entry.tools) if (tool.gap) groups.set(tool.gap, [...(groups.get(tool.gap) ?? []), { path: entry.path, tool }]);
  const gaps = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    const [kind, role] = key.split(':');
    const { tool } = items[0];
    for (const item of items) { delete item.tool.install; item.tool.shared = true; }
    const hint = hints.get(tool.id);
    gaps.push({ kind, role, packages: items.map(item => item.path),
      recommend: { id: tool.id, label: tool.label, canShow: tool.canShow, ...plannedInstall(hint, packageManager(root)) } });
  }
  // CI steps that name no package in a workspace with no root package are reported, never dropped.
  const proposals = ciProposals(unplaced);
  const ciTools = unplaced.filter(item => knownHint(item)).map(item => ({ id: knownHint(item).id, label: knownHint(item).label,
    source: `CI ${item.source} job "${item.job}"`, command: item.command ?? `uses: ${item.uses}` }));
  return { schemaVersion: 2, packages, gaps, ...(proposals.length ? { proposals } : {}), ...(ciTools.length ? { ciTools } : {}) };
}

const statusText = tool => tool.status === 'recorded' ? 'recorded choice' : tool.status === 'present' ? `present${tool.version ? ` ${tool.version}` : ''}${tool.via ? ` (${tool.via})` : ''}`
  : tool.status === 'skipped' ? 'skipped' : `missing${tool.note ? ` (${tool.note})` : ''}`;
const roleText = { ui: 'tool that can show the UI', request: 'HTTP check', tests: 'test command', toolchain: 'build toolchain' };

/** One table and at most one question, decision first. */
export function renderPlan(plan, changes = null) {
  if (!plan.packages.length) {
    return ['Review loop plan', '', 'No packages found: no workspaces are declared and no project manifest was found below the root.',
      '', 'Which folders hold the apps? Name them with `--packages <dir,dir>` on plan, install and record.'].join('\n');
  }
  const lines = ['Review loop plan', '', '| Package | Kind | Tool | Status | To install | Can show |', '|---|---|---|---|---|---|'];
  for (const entry of plan.packages) for (const item of entry.tools.filter(tool => !tool.shared)) {
    // A tool the recorded choice covers shows that choice instead.
    const tool = item.covered ? { label: item.covered.label, status: 'recorded', canShow: item.covered.canShow } : item;
    if (item.covered && entry.tools.some(other => other !== item && other.covered?.label === item.covered.label && entry.tools.indexOf(other) < entry.tools.indexOf(item))) continue;
    const install = runsHere(tool.install) ? `\`${commandText(tool.install)}\` (${tool.install.size}${tool.install.scope === 'user' ? ', for this machine' : ''})`
      : tool.install ? `you: ${tool.install.steps.join('; ')} (${tool.install.size}${tool.install.sudo ? ', needs sudo' : ''})` : '';
    lines.push(`| ${entry.path} | ${entry.categories.map(category => catalog.categories[category].label).join(', ')} | ${tool.label} | ${statusText(tool)}${tool.alsoDeclared ? `; also declared: ${tool.alsoDeclared.map(other => `${other.label} (${other.note ?? other.status}), no install planned`).join(', ')}` : ''} | ${install} | ${(tool.canShow ?? []).join(', ')} |`);
  }
  const gaps = plan.gaps ?? [];
  for (const gap of gaps) {
    const how = gap.recommend.scope === 'project' ? `one install, ${gap.recommend.size}`
      : runnable(gap.recommend) ? `one install for this machine, \`${commandText(gap.recommend)}\`, ${gap.recommend.size}` : `you: ${gap.recommend.steps.join('; ')} (${gap.recommend.size})`;
    lines.push('', `${catalog.categories[gap.kind].label}: no ${roleText[gap.role]} found in ${gap.packages.length} packages (${gap.packages.join(', ')}). Recommended: ${gap.recommend.label} (${how}; shows ${gap.recommend.canShow.join(', ')}).`);
  }
  for (const [where, item] of [...plan.packages.flatMap(entry => (entry.proposals ?? []).map(item => [`${entry.path} `, item])), ...(plan.proposals ?? []).map(item => ['', item])]) {
    lines.push('', `Found, not in the hint list: ${where}${item.source} runs \`${item.command.replace(/\n+/g, '; ')}\`. It does not count as a review tool until it is recorded.`);
  }
  for (const item of plan.ciTools ?? []) {
    lines.push('', `Found in CI, not tied to one package: ${item.label} (${item.source} runs \`${item.command.replace(/\n+/g, '; ')}\`). Say which packages it reviews.`);
  }
  if (changes) lines.push('', `Changed since the recorded Review loop: ${changes.join('; ')}.`);
  const local = [...missingProjectTools(plan), ...machineInstalls(plan).filter(item => item.path).map(item => ({ path: item.path, tool: item }))];
  const shared = gaps.filter(gap => runsHere(gap.recommend));
  const asked = shared.length || local.length;
  if (shared.length) {
    const items = [...local.map(item => `${item.tool.label} in ${item.path}`), ...shared.map(gap => `${gap.recommend.label} once for the ${gap.packages.length} ${catalog.categories[gap.kind].label} packages`)];
    lines.push('', `Install ${items.join(', ')}, name a tool these packages already use, skip them, or choose per tool?`);
  } else if (local.length) lines.push('', `Install the missing tools (${local.map(item => `${item.tool.label} in ${item.path}`).join(', ')}), skip them, or choose per tool?`);
  if (!asked && changes?.length) lines.push('', 'Record the Review loop again with these tools?');
  if (plan.packages.some(entry => entry.tools.some(tool => tool.install && !runsHere(tool.install))) || gaps.some(gap => !runsHere(gap.recommend))) {
    lines.push('', 'The tools marked "you" need your own install; Joycraft will not run them.');
  }
  return lines.join('\n');
}

/** Per-package project installs. A shared gap is one question, so it adds no per-package install here. */
export function missingProjectTools(plan) {
  return plan.packages.flatMap(entry => entry.tools.filter(tool => tool.install?.scope === 'project').map(tool => ({ path: entry.path, tool })));
}

/**
 * User-scope installs, once per machine: the plan's missing tools and gaps, plus any hint `tools` names (the user's pick
 * from the hint list). `runs` says whether Joycraft may run it; otherwise its steps are the user's.
 */
function userInstalls(plan, tools = null) {
  const out = new Map();
  const add = (id, label, install, where = null) => {
    if (install?.scope !== 'user' || out.has(id) || (tools && !tools.includes(id))) return;
    out.set(id, { id, label, install, runs: runnable(install), ...(where ? { path: where } : {}) });
  };
  for (const entry of plan.packages) for (const tool of entry.tools) add(tool.id, tool.label, tool.install, entry.path);
  for (const gap of plan.gaps ?? []) add(gap.recommend.id, gap.recommend.label, gap.recommend);
  for (const hint of (tools ?? []).map(id => hints.get(id)).filter(Boolean)) if (hint.install.scope === 'user') add(hint.id, hint.label, plannedInstall(hint, null));
  return [...out.values()];
}

/** The user-scope installs Joycraft may run after a yes. */
export function machineInstalls(plan, tools = null) {
  return userInstalls(plan, tools).filter(item => item.runs);
}

/** What the user installs themselves: sudo, a licence, a sign-in, or no command. Joycraft prints these, never runs them. */
export function installSteps(plan, tools = null) {
  return userInstalls(plan, tools).filter(item => !item.runs)
    .map(({ id, label, install }) => ({ id, label, steps: install.steps, size: install.size,
      ...(install.sudo ? { sudo: true } : {}), ...(install.licence ? { licence: true } : {}), ...(install.signIn ? { signIn: true } : {}) }));
}

/**
 * Run the installs the user approved: project-local tools with the project's package manager, and user-scope CLIs
 * (`npm install -g`, `brew install`) whose hint marks no sudo, licence or sign-in. Never sudo, a licence or a sign-in.
 */
export function installProjectTools(root, plan, { approved, tools = null, run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' }) }) {
  if (approved !== true) throw new Error('Install needs the user\'s yes in this conversation');
  const ran = [];
  const exec = (commands, cwd) => { for (const [command, ...args] of commands) { run(command, args, cwd); ran.push([command, ...args].join(' ')); } };
  for (const { path: dir, tool } of missingProjectTools(plan)) if (!tools || tools.includes(tool.id)) exec(tool.install.commands, path.join(root, dir));
  for (const item of machineInstalls(plan, tools)) exec(item.install.commands, root);
  return ran;
}


/** The recorded marker with its version, or null. A v1 marker still reads, so its statuses are kept. */
function recorded(root) {
  const text = read(path.join(root, 'AGENTS.md'));
  const match = text && marker.exec(text);
  const data = match && json(match[2]);
  return data ? { ...data, version: Number(match[1]) } : null;
}

/** What detection found per package. The host's own tools are not shared, so they are not compared. */
const summary = plan => Object.fromEntries(plan.packages.map(entry => [entry.path, {
  categories: entry.categories,
  tools: Object.fromEntries(entry.tools.filter(tool => !tool.host).map(tool => [tool.id, tool.status])),
}]));

/** The tools the user picked per package in the recorded v2 marker, for the next plan. */
export function recordedChoices(root) {
  const before = recorded(root);
  if (!before || before.version < 2) return {};
  return Object.fromEntries(Object.entries(before.packages ?? {})
    .map(([pkg, entry]) => [pkg, (entry.chosen ?? []).filter(item => item.picked)]).filter(([, picks]) => picks.length));
}

/** Differences between this detection and the recorded Review loop; null when nothing is recorded. */
export function reviewLoopChanges(root, plan) {
  const before = recorded(root);
  if (!before) return null;
  const now = summary(plan);
  const changes = before.version < 2 ? ['recorded with v1; re-record to keep it'] : [];
  for (const [pkg, entry] of Object.entries(now)) {
    const old = before.packages?.[pkg];
    if (!old) { changes.push(`new ${entry.categories.join(', ')} package ${pkg}`); continue; }
    for (const category of entry.categories) if (!(old.categories ?? []).includes(category)) changes.push(`${pkg} is now also ${category}`);
    for (const [id, status] of Object.entries(entry.tools)) {
      const was = old.tools?.[id];
      if (was === undefined) changes.push(`${pkg} needs ${hintLabel(id)}`);
      else if (was !== status && !(was === 'skipped' && status === 'missing')) changes.push(`${hintLabel(id)} in ${pkg}: ${was} -> ${status}`);
    }
  }
  for (const pkg of Object.keys(before.packages ?? {})) if (!now[pkg]) changes.push(`package ${pkg} is gone`);
  return changes;
}

/** Plan only what changed: an unchanged recorded loop asks nothing. */
export function planForSetup(root, options) {
  const plan = reviewLoopPlan(root, { chosen: recordedChoices(root), ...options });
  const changes = reviewLoopChanges(root, plan);
  return { plan, changes, ask: changes === null || changes.length > 0, text: changes && !changes.length ? 'Review loop unchanged.' : renderPlan(plan, changes) };
}

const pair = (value, flag) => {
  const at = value.indexOf('=');
  if (at <= 0) throw new Error(`${flag} takes <package>=<value>; got ${value}`);
  return [value.slice(0, at), value.slice(at + 1)];
};
const globPattern = spec => new RegExp(`^${spec.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
/** The packages a `<package>` spec names: the exact folder, or every folder a `*` glob matches. */
function named(spec, paths, flag) {
  const found = paths.includes(spec) ? [spec] : spec.includes('*') ? paths.filter(dir => globPattern(spec).test(dir)) : [];
  if (!found.length) throw new Error(`${flag} ${spec} names no package; the packages are ${paths.join(', ')}`);
  return found;
}

/** `--choose`, `--command` and `--can-show` per package. An exact package spec wins over a glob. */
function picksFor(root, plan, { choose, commands, canShow }) {
  const paths = plan.packages.map(entry => entry.path);
  const spread = (values, flag) => {
    const out = new Map();
    for (const value of values) {
      const [spec, rest] = pair(value, flag);
      for (const pkg of named(spec, paths, flag)) out.set(pkg, [...(out.get(pkg) ?? []), { spec, exact: spec === pkg, value: rest }]);
    }
    for (const [pkg, items] of out) if (items.some(item => item.exact)) out.set(pkg, items.filter(item => item.exact));
    return out;
  };
  const picks = spread(choose, '--choose'); const extra = { command: spread(commands, '--command'), canShow: spread(canShow, '--can-show') };
  for (const [key, flag] of [['command', '--command'], ['canShow', '--can-show']]) {
    for (const [pkg, items] of extra[key]) if (!picks.has(pkg)) throw new Error(`${flag} ${items[0].spec} needs a --choose for ${pkg}`);
  }
  const out = new Map();
  for (const [pkg, items] of picks) {
    const entry = plan.packages.find(item => item.path === pkg);
    const pm = packageManager(path.join(root, pkg), root);
    out.set(pkg, items.map(({ spec, value: id }) => {
      // A per-pick value: the same spec, else the package's only value when it has one pick.
      const take = key => {
        const values = extra[key].get(pkg) ?? [];
        return (values.find(item => item.spec === spec) ?? (items.length === 1 && values.length === 1 ? values[0] : null))?.value ?? null;
      };
      const hint = hints.get(id);
      const proposal = !hint && [...(entry.proposals ?? []), ...(plan.proposals ?? [])].find(item => item.source.endsWith(`"${id}"`));
      const command = take('command') ?? (proposal ? proposal.command : null);
      if (!hint && !command) throw new Error(`--choose ${spec}=${id} is not in the hint list; give its command with --command ${spec}=<command>`);
      const shows = take('canShow')?.split(',').filter(Boolean) ?? hint?.canShow ?? ['run'];
      const unknown = shows.find(item => !catalog.canShow.includes(item));
      if (unknown) throw new Error(`--can-show ${unknown} is not one of ${catalog.canShow.join(', ')}`);
      return { id, label: hint?.label ?? id, canShow: shows, picked: true, ...(command ? { command } : {}),
        ...(proposal ? { source: proposal.source } : {}), ...(spec.includes('*') ? { shared: spec } : {}),
        evidence: command ?? (hint.evidence ? hint.evidence.replace('{exec}', pm.exec.join(' ')) : 'not established') };
    }));
  }
  return out;
}

/** `--skip <tool>` skips that tool where it is missing (all packages); `--skip <package>:<tool>` skips it in that package; `--skip <package>` skips the package. */
function skipsFor(plan, skipped) {
  const paths = plan.packages.map(entry => entry.path);
  const all = []; const perPackage = new Map();
  for (const value of skipped) {
    const at = value.lastIndexOf(':');
    const [spec, id] = at > 0 ? [value.slice(0, at), value.slice(at + 1)] : paths.includes(value) ? [value, '*'] : [null, value];
    if (!spec) { all.push(id); continue; }
    for (const pkg of named(spec, paths, '--skip')) {
      const entry = plan.packages.find(item => item.path === pkg);
      if (id !== '*' && !entry.tools.some(tool => tool.id === id)) throw new Error(`--skip ${value}: ${pkg} has no ${id}; its tools are ${entry.tools.map(tool => tool.id).join(', ')}`);
      perPackage.set(pkg, new Set([...(perPackage.get(pkg) ?? []), id]));
    }
  }
  return { all, perPackage };
}

/** Write the host's own tools to the git-ignored `.joycraft/local/review-loop.json`, under its name. Other hosts' records stay. */
export function recordHostTools(root, { host, tools = [] }) {
  if (!host) throw new Error('--host-tools needs --host <name>, the host these tools belong to');
  const dir = path.join(root, path.dirname(localFile));
  mkdirSync(dir, { recursive: true });
  if (!existsSync(path.join(dir, '.gitignore'))) writeFileSync(path.join(dir, '.gitignore'), '*\n');
  const file = path.join(root, localFile);
  const current = json(read(file));
  const entry = { tools: tools.map(name => {
    const hint = catalog.hints.find(item => (item.detect.hostTools ?? []).includes(name));
    return { name, ...(hint ? { canShow: hint.canShow, evidence: `the host's ${name} tool` } : {}) };
  }) };
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, hosts: { ...(current?.hosts ?? {}), [host]: entry } }, null, 2)}\n`);
  return localFile;
}

const cellSafe = text => String(text).replace(/\|/g, '\\|').replace(/\n+/g, '; ');

/**
 * Write the chosen setup to AGENTS.md under `## Review loop`, replacing only that section: one row per package.
 * Earlier picks and skips stay for the packages this call does not name. Host tools go to the local record only.
 */
export function recordReviewLoop(root, plan, { skipped = [], choose = [], commands = [], canShow = [], host = null, hostTools = [] } = {}) {
  if (!plan.packages.length) throw new Error('No packages found, so there is nothing to record; name them with --packages <dir,dir>');
  if (hostTools.length && !host) throw new Error('--host-tools needs --host <name>, the host these tools belong to');
  const picks = picksFor(root, plan, { choose, commands, canShow });
  const skips = skipsFor(plan, skipped);
  const before = recorded(root);
  const prior = before?.version >= 2 ? before.packages ?? {} : {};
  const rows = ['| Package | Tool | Can show | Start the app | Take the evidence |', '|---|---|---|---|---|'];
  const packages = {};
  for (const entry of plan.packages) {
    const detected = entry.tools.filter(tool => !tool.host);
    const fresh = picks.has(entry.path) || skips.perPackage.has(entry.path);
    const old = fresh ? null : prior[entry.path];
    const chosen = picks.get(entry.path) ?? (old?.chosen ?? []).filter(item => item.picked);
    const own = skips.perPackage.get(entry.path) ?? new Set();
    // A carried skip holds while detection still sees that tool as it was when the user skipped it.
    const skip = tool => own.has('*') || own.has(tool.id) || (skips.all.includes(tool.id) && tool.status === 'missing')
      || Boolean(old?.skipped?.includes(tool.id) && old.tools?.[tool.id] === tool.status);
    const items = [
      ...detected.filter(tool => !chosen.some(pick => covers(pick, tool))).map(tool => ({ tool, skipped: skip(tool) })),
      ...chosen.map(pick => ({ pick, skipped: own.has('*') })),
    ];
    const cell = ({ tool, pick, skipped: off }) => {
      if (tool) return `${tool.label}: ${off ? 'not reviewed (user skipped)' : statusText(tool)}`;
      const same = detected.find(item => item.id === pick.id && item.status === 'present');
      return `${pick.label}: ${off ? 'not reviewed (user skipped)' : same ? statusText(same) : 'chosen by the user'}${pick.shared ? `, shared harness for ${pick.shared}` : ''}${pick.source ? ` (${pick.source})` : ''}`;
    };
    const used = items.filter(item => !item.skipped);
    const shows = [...new Set(used.flatMap(item => (item.tool ?? item.pick).canShow ?? []))];
    const evidence = used.map(({ tool, pick }) => (tool ? tool.evidence ?? tool.note ?? 'not applicable' : pick.evidence));
    rows.push(`| ${entry.path} | ${cellSafe(items.map(cell).join('; '))} | ${shows.join(', ') || 'none'} | ${entry.start} | ${cellSafe(evidence.join('; ') || 'not reviewed (user skipped)')} |`);
    const off = items.filter(item => item.skipped && item.tool).map(item => item.tool.id);
    packages[entry.path] = { ...summary({ packages: [entry] })[entry.path],
      chosen: used.map(({ tool, pick }) => (tool ? { id: tool.id, canShow: tool.canShow ?? [] }
        : { id: pick.id, label: pick.label, canShow: pick.canShow, picked: true, evidence: pick.evidence,
          ...(pick.command ? { command: pick.command } : {}), ...(pick.source ? { source: pick.source } : {}), ...(pick.shared ? { shared: pick.shared } : {}) })),
      ...(off.length ? { skipped: off } : {}) };
  }
  const section = [sectionHeading, '',
    'Recorded by Joycraft setup. The implementer, reviewer and UI checks use these tools and commands.',
    `Tools a host brings itself are recorded per machine in \`${localFile}\`, not here.`, '',
    ...rows,
    '', `<!-- joycraft:review-loop v2 ${JSON.stringify({ packages })} -->`, ''].join('\n');
  const file = path.join(root, 'AGENTS.md');
  const text = read(file);
  let created = false;
  if (text === null) { writeFileSync(file, `${section}`); created = true; } else {
    const start = text.indexOf(`\n${sectionHeading}\n`);
    if (start < 0 && !text.startsWith(`${sectionHeading}\n`)) writeFileSync(file, `${text}${text.endsWith('\n') ? '' : '\n'}\n${section}`);
    else {
      const from = text.startsWith(`${sectionHeading}\n`) ? 0 : start + 1;
      const next = text.slice(from + sectionHeading.length).search(/\n## /);
      const end = next < 0 ? text.length : from + sectionHeading.length + next + 1;
      writeFileSync(file, `${text.slice(0, from)}${section}${end < text.length ? `\n${text.slice(end)}` : ''}`);
    }
  }
  return { created, ...(host ? { local: recordHostTools(root, { host, tools: hostTools }) } : {}) };
}

function sharedSection(root) {
  const text = read(path.join(root, 'AGENTS.md'));
  if (!text) return null;
  const start = text.startsWith(`${sectionHeading}\n`) ? 0 : text.indexOf(`\n${sectionHeading}\n`) + 1;
  if (start === 0 && !text.startsWith(`${sectionHeading}\n`)) return null;
  const next = text.slice(start + sectionHeading.length).search(/\n## /);
  return text.slice(start, next < 0 ? undefined : start + sectionHeading.length + next).trim();
}

/** For worker and reviewer packets: the shared section and, when this machine has one, the local host record. Null when neither exists. */
export function reviewLoopSection(root) {
  const section = sharedSection(root);
  const local = json(read(path.join(root, localFile)));
  if (!section && !local) return null;
  return { ...(section ? { path: 'AGENTS.md', section } : {}), ...(local ? { local: { path: localFile, record: local } } : {}) };
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const flags = {};
  const repeated = new Set(['--choose', '--command', '--can-show', '--skip']);
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--yes') { flags['--yes'] = true; continue; }
    if (repeated.has(rest[index])) (flags[rest[index]] ??= []).push(rest[index + 1]);
    else flags[rest[index]] = rest[index + 1];
    index += 1;
  }
  const root = path.resolve(flags['--root'] ?? '.');
  const list = value => (value ? value.split(',').filter(Boolean) : []);
  // `--choose` and `--skip` take comma lists; a `--command` or `--can-show` value is one item, so repeat the flag.
  const many = (name, split = true) => (flags[name] ?? []).flatMap(value => (split ? list(value) : value ? [value] : []));
  const options = { hostTools: list(flags['--host-tools']), packages: flags['--packages'] ? list(flags['--packages']) : null };
  if (command === 'plan') {
    const { text, ask } = planForSetup(root, options);
    process.stdout.write(`${text}\n`);
    return { ask };
  }
  if (command === 'install') {
    const plan = reviewLoopPlan(root, { ...options, chosen: recordedChoices(root) });
    const tools = flags['--tools'] ? list(flags['--tools']) : null;
    const ran = installProjectTools(root, plan, { approved: flags['--yes'] === true, tools });
    const steps = installSteps(plan, tools);
    process.stdout.write(`${JSON.stringify({ ran, ...(steps.length ? { steps } : {}) }, null, 2)}\n`);
    return ran;
  }
  if (command === 'record') {
    // The shared record is detected without the host's tools; those go to the local record.
    const result = recordReviewLoop(root, reviewLoopPlan(root, { ...options, hostTools: [] }), {
      skipped: many('--skip'), choose: many('--choose'), commands: many('--command', false), canShow: many('--can-show', false),
      host: flags['--host'] ?? null, hostTools: options.hostTools });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  }
  throw new Error('Usage: review-tools.mjs plan|install|record --root <project> [--packages apps/web,apps/api] [--host-tools browser,simulator] [--tools playwright --yes]'
    + ' [record: --choose <package>=<tool> --command <package>=<command> --can-show <package>=picture,run --skip <tool>|<package>:<tool>|<package> --host <name>]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Review tools stopped: ${error.message}\n`); process.exitCode = 1; });
}
