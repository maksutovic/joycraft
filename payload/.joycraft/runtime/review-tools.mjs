import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// One catalog for detection, the setup plan and the public docs.
export const catalog = JSON.parse(readFileSync(new URL('./review-tools.json', import.meta.url), 'utf8'));
const sectionHeading = '## Review loop';
const marker = /<!-- joycraft:review-loop v1 (\{.*\}) -->/;
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

/** Each package of a project with its categories. A workspace root without its own app is not a package. */
export function detectProjects(root) {
  const packages = workspaceDirs(root).map(dir => ({ path: dir, categories: classifyPackage(path.join(root, dir)) }))
    .filter(entry => entry.categories.length);
  const own = classifyPackage(root);
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

/** Read-only probe: run a version or list command with no shell. Never installs. */
export function defaultRun(command, args) {
  try { return { ok: true, stdout: execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }) }; }
  catch { return { ok: false, stdout: '' }; }
}

const firstVersion = text => /\d+(?:\.\d+)+/.exec(text)?.[0] ?? null;

function playwrightBrowsers(env, home) {
  const roots = env.PLAYWRIGHT_BROWSERS_PATH ? [env.PLAYWRIGHT_BROWSERS_PATH]
    : [path.join(home, 'Library/Caches/ms-playwright'), path.join(home, '.cache/ms-playwright')];
  return roots.some(dir => listDir(dir).some(name => name.startsWith('chromium')));
}

function probe(id, { dir, root, run, env, home }) {
  const manifest = json(read(path.join(dir, 'package.json')));
  const deps = { ...manifest?.dependencies, ...manifest?.devDependencies };
  switch (id) {
    case 'playwright': {
      if (deps.cypress) return { status: 'present', version: String(deps.cypress), via: 'Cypress (already in the project)' };
      const names = ['@playwright/test', 'playwright'];
      const installed = names.flatMap(name => [dir, root].map(base => json(read(path.join(base, 'node_modules', name, 'package.json'))))).find(Boolean);
      const declared = names.map(name => deps[name]).find(Boolean);
      if (!declared && !installed) return { status: 'missing' };
      if (!playwrightBrowsers(env, home)) return { status: 'missing', version: installed?.version ?? null, note: 'browser not downloaded' };
      return { status: 'present', version: installed?.version ?? String(declared) };
    }
    case 'xcode': { const out = run('xcodebuild', ['-version']); return out.ok ? { status: 'present', version: firstVersion(out.stdout) } : { status: 'missing' }; }
    case 'ios-simulator': {
      const out = run('xcrun', ['simctl', 'list', 'runtimes']);
      const line = out.ok ? out.stdout.split('\n').find(row => /^iOS \d/.test(row.trim())) : null;
      return line ? { status: 'present', version: firstVersion(line) } : { status: 'missing' };
    }
    case 'android-sdk': { const out = run('adb', ['version']); return out.ok ? { status: 'present', version: firstVersion(out.stdout) } : { status: 'missing' }; }
    case 'android-emulator': {
      const out = run('emulator', ['-list-avds']);
      return out.ok && out.stdout.trim() ? { status: 'present', version: null, note: out.stdout.trim().split('\n')[0] } : { status: 'missing' };
    }
    case 'flutter': { const out = run('flutter', ['--version']); return out.ok ? { status: 'present', version: firstVersion(out.stdout) } : { status: 'missing' }; }
    case 'react-native-cli': case 'expo-cli': {
      const name = catalog.tools[id].package;
      return deps[name] ? { status: 'present', version: String(deps[name]) } : { status: 'missing' };
    }
    case 'curl': { const out = run('curl', ['--version']); return out.ok ? { status: 'present', version: firstVersion(out.stdout) } : { status: 'missing' }; }
    case 'test-runner': {
      const declared = manifest?.scripts?.test ? `${packageManager(dir, root).name} test`
        : existsSync(path.join(dir, 'Cargo.toml')) ? 'cargo test'
          : existsSync(path.join(dir, 'go.mod')) ? 'go test ./...'
            : ['pyproject.toml', 'requirements.txt', 'setup.py'].some(file => existsSync(path.join(dir, file))) ? 'python3 -m pytest' : null;
      return declared ? { status: 'present', version: null, note: `${declared} (declared, unrun)` } : { status: 'missing', note: 'no test command declared' };
    }
    default: return { status: 'not-needed' };
  }
}

function toolsFor(categories, dir) {
  const ids = new Set();
  for (const category of categories) {
    for (const id of catalog.categories[category].tools) ids.add(id);
    if (catalog.categories[category].mobile) {
      const ios = isDir(path.join(dir, 'ios')); const android = isDir(path.join(dir, 'android'));
      if (ios || !android) for (const id of catalog.categories.ios.tools) ids.add(id);
      if (android || !ios) for (const id of catalog.categories.android.tools) ids.add(id);
    }
  }
  return [...ids];
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

/** The Review loop plan: each package, each tool it needs, and that tool's status. Probes only. */
export function reviewLoopPlan(root, { run = defaultRun, hostTools = [], env = process.env, home = homedir() } = {}) {
  const packages = detectProjects(root).map(entry => {
    const dir = path.join(root, entry.path);
    const tools = toolsFor(entry.categories, dir).map(id => {
      const spec = catalog.tools[id];
      let result = probe(id, { dir, root, run, env, home });
      if (result.status === 'missing' && spec.hostAlternative && hostTools.includes(spec.hostAlternative)) {
        result = { status: 'present', version: null, via: `the host's built-in ${spec.hostAlternative}` };
      }
      const pm = packageManager(dir, root);
      const install = result.status !== 'missing' ? null : spec.scope === 'project' && id === 'playwright'
        ? { scope: 'project', commands: [[...pm.add, '@playwright/test'], [...pm.exec, 'playwright', 'install', 'chromium']], size: spec.size, sudo: false }
        : spec.scope === 'project' && spec.package ? { scope: 'project', commands: [[...pm.add, spec.package]], size: spec.size, sudo: false }
          : spec.scope === 'project' ? { scope: 'user', steps: ['Declare a test command for this package'], size: spec.size, sudo: false }
            : { scope: 'user', steps: spec.steps, size: spec.size, sudo: spec.sudo };
      return { id, label: spec.label, ...result, ...(install ? { install } : {}),
        evidence: spec.evidence ? spec.evidence.replace('{exec}', pm.exec.join(' ')) : null };
    });
    return { path: entry.path, categories: entry.categories, start: startCommand(dir, root, entry.categories), tools };
  });
  return { schemaVersion: 1, packages };
}

const statusText = tool => tool.status === 'present' ? `present${tool.version ? ` ${tool.version}` : ''}${tool.via ? ` (${tool.via})` : ''}`
  : tool.status === 'skipped' ? 'skipped' : `missing${tool.note ? ` (${tool.note})` : ''}`;

/** One table and at most one question, decision first. */
export function renderPlan(plan, changes = null) {
  const lines = ['Review loop plan', '', '| Package | Kind | Tool | Status | To install |', '|---|---|---|---|---|'];
  for (const entry of plan.packages) for (const tool of entry.tools) {
    const install = tool.install?.commands ? `\`${tool.install.commands.map(command => command.join(' ')).join(' && ')}\` (${tool.install.size})`
      : tool.install ? `you: ${tool.install.steps.join('; ')} (${tool.install.size}${tool.install.sudo ? ', needs sudo' : ''})` : '';
    lines.push(`| ${entry.path} | ${entry.categories.map(category => catalog.categories[category].label).join(', ')} | ${tool.label} | ${statusText(tool)} | ${install} |`);
  }
  if (changes) lines.push('', `Changed since the recorded Review loop: ${changes.join('; ')}.`);
  const local = missingProjectTools(plan);
  if (local.length) lines.push('', `Install the missing project-local tools (${local.map(item => `${item.tool.label} in ${item.path}`).join(', ')}), skip them, or choose per tool?`);
  if (plan.packages.some(entry => entry.tools.some(tool => tool.install?.scope === 'user'))) lines.push('', 'The tools marked "you" need your own install; Joycraft will not run them.');
  return lines.join('\n');
}

export function missingProjectTools(plan) {
  return plan.packages.flatMap(entry => entry.tools.filter(tool => tool.install?.scope === 'project').map(tool => ({ path: entry.path, tool })));
}

/** Run project-local installs the user approved. System tools are never installed here. */
export function installProjectTools(root, plan, { approved, tools = null, run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' }) }) {
  if (approved !== true) throw new Error('Install needs the user\'s yes in this conversation');
  const ran = [];
  for (const { path: dir, tool } of missingProjectTools(plan)) {
    if (tools && !tools.includes(tool.id)) continue;
    for (const [command, ...args] of tool.install.commands) { run(command, args, path.join(root, dir)); ran.push([command, ...args].join(' ')); }
  }
  return ran;
}

function recorded(root) {
  const text = read(path.join(root, 'AGENTS.md'));
  const match = text && marker.exec(text);
  return match ? json(match[1]) : null;
}

const summary = (plan, skipped = []) => Object.fromEntries(plan.packages.map(entry => [entry.path, {
  categories: entry.categories,
  tools: Object.fromEntries(entry.tools.map(tool => [tool.id, skipped.includes(tool.id) && tool.status === 'missing' ? 'skipped' : tool.status])),
}]));

/** Differences between this detection and the recorded Review loop; null when nothing is recorded. */
export function reviewLoopChanges(root, plan) {
  const before = recorded(root);
  if (!before) return null;
  const now = summary(plan);
  const changes = [];
  for (const [pkg, entry] of Object.entries(now)) {
    const old = before.packages?.[pkg];
    if (!old) { changes.push(`new ${entry.categories.join(', ')} package ${pkg}`); continue; }
    for (const category of entry.categories) if (!old.categories.includes(category)) changes.push(`${pkg} is now also ${category}`);
    for (const [id, status] of Object.entries(entry.tools)) {
      const was = old.tools[id];
      if (was === undefined) changes.push(`${pkg} needs ${catalog.tools[id].label}`);
      else if (was !== status && !(was === 'skipped' && status === 'missing')) changes.push(`${catalog.tools[id].label} in ${pkg}: ${was} -> ${status}`);
    }
  }
  for (const pkg of Object.keys(before.packages ?? {})) if (!now[pkg]) changes.push(`package ${pkg} is gone`);
  return changes;
}

/** Plan only what changed: an unchanged recorded loop asks nothing. */
export function planForSetup(root, options) {
  const plan = reviewLoopPlan(root, options);
  const changes = reviewLoopChanges(root, plan);
  return { plan, changes, ask: changes === null || changes.length > 0, text: changes && !changes.length ? 'Review loop unchanged.' : renderPlan(plan, changes) };
}

/** Write the chosen setup to AGENTS.md under `## Review loop`, replacing only that section. */
export function recordReviewLoop(root, plan, { skipped = [] } = {}) {
  const rows = ['| Package | Tool | Start the app | Take the evidence |', '|---|---|---|---|'];
  const unverified = [];
  for (const entry of plan.packages) {
    for (const tool of entry.tools) {
      const skip = skipped.includes(tool.id) && tool.status === 'missing';
      if ((skip || tool.status === 'missing') && entry.categories.some(category => catalog.categories[category].ui)) unverified.push(entry.path);
      rows.push(`| ${entry.path} | ${tool.label}: ${skip ? 'skipped' : statusText(tool)} | ${entry.start} | ${tool.evidence ?? (tool.note ?? 'not applicable')} |`);
    }
  }
  const section = [sectionHeading, '',
    'Recorded by Joycraft setup. The implementer, reviewer and UI checks use these tools and commands.', '',
    ...rows,
    ...([...new Set(unverified)].length ? ['', `UI claims in ${[...new Set(unverified)].join(', ')} stay UNVERIFIED in review reports until the missing tools are set up.`] : []),
    '', `<!-- joycraft:review-loop v1 ${JSON.stringify({ packages: summary(plan, skipped) })} -->`, ''].join('\n');
  const file = path.join(root, 'AGENTS.md');
  const text = read(file);
  if (text === null) { writeFileSync(file, `${section}`); return { created: true }; }
  const start = text.indexOf(`\n${sectionHeading}\n`);
  if (start < 0 && !text.startsWith(`${sectionHeading}\n`)) {
    writeFileSync(file, `${text}${text.endsWith('\n') ? '' : '\n'}\n${section}`);
    return { created: false };
  }
  const from = text.startsWith(`${sectionHeading}\n`) ? 0 : start + 1;
  const next = text.slice(from + sectionHeading.length).search(/\n## /);
  const end = next < 0 ? text.length : from + sectionHeading.length + next + 1;
  writeFileSync(file, `${text.slice(0, from)}${section}${end < text.length ? `\n${text.slice(end)}` : ''}`);
  return { created: false };
}

/** The recorded section text, for worker and reviewer packets. */
export function reviewLoopSection(root) {
  const text = read(path.join(root, 'AGENTS.md'));
  if (!text) return null;
  const start = text.startsWith(`${sectionHeading}\n`) ? 0 : text.indexOf(`\n${sectionHeading}\n`) + 1;
  if (start === 0 && !text.startsWith(`${sectionHeading}\n`)) return null;
  const next = text.slice(start + sectionHeading.length).search(/\n## /);
  return text.slice(start, next < 0 ? undefined : start + sectionHeading.length + next).trim();
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--yes') { flags['--yes'] = true; continue; }
    flags[rest[index]] = rest[index + 1]; index += 1;
  }
  const root = path.resolve(flags['--root'] ?? '.');
  const list = value => (value ? value.split(',').filter(Boolean) : []);
  const options = { hostTools: list(flags['--host-tools']) };
  if (command === 'plan') {
    const { text, ask } = planForSetup(root, options);
    process.stdout.write(`${text}\n`);
    return { ask };
  }
  if (command === 'install') {
    const ran = installProjectTools(root, reviewLoopPlan(root, options), { approved: flags['--yes'] === true, tools: flags['--tools'] ? list(flags['--tools']) : null });
    process.stdout.write(`${JSON.stringify({ ran }, null, 2)}\n`);
    return ran;
  }
  if (command === 'record') {
    const result = recordReviewLoop(root, reviewLoopPlan(root, options), { skipped: list(flags['--skip']) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  }
  throw new Error('Usage: review-tools.mjs plan|install|record --root <project> [--host-tools browser,simulator] [--tools playwright --yes] [--skip playwright]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Review tools stopped: ${error.message}\n`); process.exitCode = 1; });
}
