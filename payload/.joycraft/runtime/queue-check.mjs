import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readConfig } from './config.mjs';
import { briefDecisionRecords, featureFolderMatches, isObject, localPath, parseJson, readLocal, relativePath, validateQueue } from './identity.mjs';

// Before the first dispatch, find the queue gaps a program can decide, so each
// goes back to the brief as a question while the user is present. It reports;
// it never blocks dispatch by itself. Checks that need judgment stay with the
// decompose skill. Dependencies are checked for the whole queue. A done spec
// is checked only for missing inputs, and only while the queue has a spec that
// is not done: an archived queue cites paths that have since moved.

const nextStep = 'Add it to the brief as an open decision and ask the user now.';
// A gate in a spec is the decomposer's to fix, not a question for the user.
const gateNextStep = "Use the spec's own test command instead.";

function legacySchema(queue) {
  if (!isObject(queue)) return false;
  const version = queue.schemaVersion;
  if (version === undefined || version === null) return true;
  if (typeof version === 'number') return version < 1;
  return typeof version === 'string' && version.trim() !== '' && Number(version) < 1;
}

// The heading id rule of identity.mjs: an explicit {#id}, else the slug of the title.
function heading(line) {
  const match = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
  if (!match) return null;
  const explicit = /\s+\{#([^}\s]+)\}\s*$/.exec(match[2]);
  const title = (explicit ? match[2].slice(0, explicit.index) : match[2]).trim();
  const slug = title.toLowerCase().replace(/[`*_~]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return { level: match[1].length, id: explicit?.[1] ?? slug };
}

const indentOf = line => line.replace(/\t/g, '    ').search(/\S/);
// A line with its first `column` columns of indentation removed.
const strip = (line, column) => line.replace(/\t/g, '    ').slice(Math.min(column, Math.max(indentOf(line), 0)));
// The opening run of a fence, as CommonMark reads it: up to three spaces of
// indentation, and no backtick after a backtick run (that is inline code).
function fenceMarker(line) {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  return match && !(match[1][0] === '`' && match[2].includes('`')) ? match[1] : null;
}
const listItem = line => /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)/.exec(line.replace(/\t/g, '    '));
const contentColumn = item => item[1].length + item[2].length + (item[3].length > 4 || item[3].length === 0 ? 1 : item[3].length);

/**
 * Whether `Check:` appears in a bullet's plain text: not in a hidden line
 * (fenced or indented code, a comment block), an inline code span or an HTML
 * comment.
 * Code spans follow CommonMark: a run of n backticks closes only at the next
 * run of exactly n backticks in the same paragraph, and an unclosed run is
 * plain text. A comment runs from `<!--` to `-->` across lines of one
 * paragraph; an unclosed `<!--` is plain text. Whichever of the two opens
 * first wins. Removed parts become a space.
 */
function plainCheck(lines) {
  const text = lines.map(item => (item.hidden ? '\0' : item.line)).join('\n');
  // A code span or an inline comment ends at a blank line or a hidden line.
  const paragraphEnd = from => {
    const blank = /\n[ \t]*\n/.exec(text.slice(from));
    const ends = [text.indexOf('\0', from), blank ? from + blank.index : -1].filter(end => end >= 0);
    return ends.length ? Math.min(...ends) : text.length;
  };
  let plain = '';
  let at = 0;
  while (at < text.length) {
    // A backslash escape keeps the next character plain text.
    if (text[at] === '\\' && /[!-\/:-@\[-`{-~]/.test(text[at + 1] ?? '')) { plain += text.slice(at, at + 2); at += 2; continue; }
    if (text.startsWith('<!--', at)) {
      const close = text.indexOf('-->', at + 2);
      if (close >= 0 && close < paragraphEnd(at)) { at = close + 3; plain += ' '; continue; }
      plain += '<!--';
      at += 4;
      continue;
    }
    if (text[at] === '`') {
      const run = /^`+/.exec(text.slice(at))[0];
      const limit = paragraphEnd(at);
      const closer = new RegExp(`(?<!\`)${run}(?!\`)`, 'g');
      closer.lastIndex = at + run.length;
      const close = closer.exec(text);
      if (close && close.index < limit) { at = close.index + run.length; plain += ' '; continue; }
      plain += run;
      at += run.length;
      continue;
    }
    plain += text[at];
    at += 1;
  }
  return /\bCheck:/.test(plain);
}

/**
 * The bullets of a spec's acceptance section, each with its first line,
 * whether `Check:` appears anywhere in it (`hasCheck`) and whether it appears
 * in plain text (`plainCheck`), which is what the queue check counts. The
 * section is the first ATX heading outside fenced code whose id is
 * `acceptance` (any level), up to the next heading of the same or a higher
 * level; sub-headings inside it are part of it. A bullet is a top-level `-`,
 * `*`, `+` or `1.` list item in that section. It holds the lines indented to
 * its content column (nested bullets and code included), blank lines, and
 * unindented text lines that directly follow one of its lines (lazy
 * continuation). It ends at a sibling item, a heading, an unindented fence or
 * comment block, or an unindented line after a blank line. A plain `Check:`
 * anywhere in the bullet, nested items included, counts for it; a nested item
 * needs no `Check:` of its own.
 *
 * Fenced code, comment blocks (a line that starts with `<!--` and has no
 * `-->`) and indented code (four columns past the content column of the item
 * it is in, after a blank line or a block) are hidden: no heading or bullet
 * starts there, and a `Check:` there does not count. As in CommonMark, a block
 * opened inside a bullet ends with the item it is in, closed or not, so it
 * never hides a later bullet or heading. A block opened outside a bullet runs
 * to its closing line or to the end of the file; when it is not closed, its
 * line is returned as `unclosed`, because it hides the rest of the section.
 */
export function acceptanceBullets(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  // Each takes a line stripped to its container's content column.
  const opener = line => fenceMarker(line) ?? (/^ {0,3}<!--/.test(line) && line.indexOf('-->', line.indexOf('<!--') + 2) < 0 ? '<!--' : null);
  const closes = (marker, line) => {
    if (marker === '<!--') return line.includes('-->');
    const found = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line)?.[1];
    return Boolean(found) && found[0] === marker[0] && found.length >= marker.length;
  };
  let section = null;
  let current = null; // a bullet; `nest` holds the content columns of its open items
  let block = null; // { marker, line, column }: column is the item's, or null outside a bullet
  let previousBlank = false;
  let afterBlock = false;
  let indented = false;
  const bullets = [];
  const hide = line => current.lines.push({ line, hidden: true });
  // A fence or comment block can open on an item's own line.
  const openOnItem = (content, column) => {
    const marker = opener(content);
    if (marker) block = { marker, column };
    return Boolean(marker);
  };
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    const blank = line.trim() === '';
    const indent = indentOf(line);
    if (block && !(block.column !== null && !blank && indent < block.column)) {
      if (closes(block.marker, strip(line, block.column ?? 0))) { block = null; afterBlock = true; }
      if (current) hide(line);
      continue;
    }
    // A less indented line ends the item, and the block opened inside it.
    if (block) { block = null; if (current && indent < current.column) current = null; }
    if (blank) { if (current) current.lines.push({ line, hidden: indented }); previousBlank = true; continue; }
    const inside = current && indent >= current.column;
    if (inside) while (current.nest.length > 1 && indent < current.nest.at(-1)) current.nest.pop();
    const base = inside ? current.nest.at(-1) : 0;
    indented = Boolean(inside && indent >= base + 4 && (previousBlank || afterBlock || indented));
    afterBlock = false;
    if (indented) { hide(line); previousBlank = false; continue; }
    const stripped = strip(line, base);
    const marker = opener(stripped);
    if (marker) {
      block = { marker, line: index + 1, column: inside ? base : null };
      if (inside) hide(line); else current = null;
      previousBlank = false;
      continue;
    }
    const found = heading(line);
    if (found) {
      if (section && found.level <= section.level) break;
      if (!section && found.id === 'acceptance') section = found;
      current = null;
      previousBlank = false;
      continue;
    }
    const item = listItem(line);
    if (item && !inside) {
      const column = contentColumn(item);
      const content = line.slice(item[0].length);
      current = { line: index + 1, column, nest: [column], lines: [] };
      current.lines.push({ line: content, hidden: openOnItem(content, column) });
      if (section) bullets.push(current);
    } else if (inside) {
      const nested = listItem(stripped);
      if (nested) current.nest.push(base + contentColumn(nested));
      current.lines.push({ line, hidden: Boolean(nested) && openOnItem(stripped.slice(nested[0].length), current.nest.at(-1)) });
    } else if (current && !previousBlank && !item) current.lines.push({ line, hidden: false });
    else current = null;
    previousBlank = false;
  }
  if (!section) return { section: false, bullets: [] };
  return {
    section: true,
    unclosed: block && block.column === null ? block.line : null,
    bullets: bullets.map(bullet => {
      const joined = bullet.lines.map(item => item.line).join(' ').replace(/\s+/g, ' ').trim();
      // The lines inside a fence in the bullet, without the fence lines.
      const fenced = [];
      let fence = null;
      for (const item of bullet.lines) {
        const marker = item.hidden ? /^\s*(`{3,}|~{3,})/.exec(item.line)?.[1] : null;
        if (fence) { if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(item.line)) fence = null; else if (item.hidden) fenced.push(item.line); else fence = null; }
        else if (marker) fence = marker;
      }
      return { line: bullet.line, text: joined, fenced, hasCheck: /\bCheck:/.test(joined), plainCheck: plainCheck(bullet.lines) };
    }),
  };
}

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = text => String(text).replace(/\s+/g, ' ').trim();

/**
 * Whether `text` names `command` as a whole command, whitespace-normalized.
 * In a code span (CommonMark backtick runs; a fenced block joined into the
 * text reads as one) the command must end the span, after the span start, a
 * space, a quote or a bracket. In plain text it starts after the text start,
 * a space, a code span, a quote or a bracket, and ends at the text end, a code
 * span, punctuation followed by a space or the end, a plain word of letters
 * only that whitespace, the end, a code span or such punctuation closes ("run
 * pnpm verify before merging"), or a dash (`—` or `–`, spaced or not, or ` - `).
 * More arguments make it a different command: a next word holding `/`, `.`,
 * `:`, `-` or `=` (as in `pnpm test tests/x.test.ts`, `pnpm test x.test.ts`,
 * `cargo test a::b` or `pnpm test -- --run`) does not name the gate.
 */
export function namesCommand(text, command) {
  const wanted = normalize(command);
  if (!wanted) return false;
  const source = String(text);
  const code = [];
  let plain = '';
  let at = 0;
  while (at < source.length) {
    if (source[at] !== '`') { plain += source[at]; at += 1; continue; }
    const run = /^`+/.exec(source.slice(at))[0];
    const closer = new RegExp(`(?<!\`)${run}(?!\`)`, 'g');
    closer.lastIndex = at + run.length;
    const close = closer.exec(source);
    if (!close) { plain += run; at += run.length; continue; }
    code.push(source.slice(at + run.length, close.index));
    plain += '\u0001';
    at = close.index + run.length;
  }
  const command_ = escape(wanted);
  const inCode = new RegExp(`(?:^|(?<=[\\s"'(\\[]))${command_}[.,;:!?)\\]"']*$`, 'u');
  if (code.some(span => inCode.test(normalize(span)))) return true;
  // Punctuation ends a word only when whitespace, a code span or the text end follows it, so a
  // `.`, `:` or `'` inside the next token (x.test.ts, a::b, test's) never counts as an ending.
  const stop = `(?:\\s|$|\\u0001|[.,;:!?)\\]"']+(?:\\s|$|\\u0001))`;
  const end = `$|\\u0001|[.,;:!?)\\]"']+(?:\\s|$|\\u0001)|\\s\\p{L}+(?=${stop})|\\s?[—–]|\\s-(?=\\s|$)`;
  const inPlain = new RegExp(`(?:^|(?<=[\\s\\u0001"'(\\[]))${command_}(?=${end})`, 'u');
  return inPlain.test(normalize(plain));
}

function label(text) {
  const sentence = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
  return sentence.length > 80 ? `${sentence.slice(0, 79)}…` : sentence;
}

// Strongly connected groups of two or more specs, or one spec that names itself.
function dependencyCycles(edges) {
  const order = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];
  let counter = 0;
  const visit = id => {
    order.set(id, counter); low.set(id, counter); counter += 1;
    stack.push(id); onStack.add(id);
    for (const next of edges.get(id)) {
      if (!order.has(next)) { visit(next); low.set(id, Math.min(low.get(id), low.get(next))); }
      else if (onStack.has(next)) low.set(id, Math.min(low.get(id), order.get(next)));
    }
    if (low.get(id) !== order.get(id)) return;
    const group = [];
    let member;
    do { member = stack.pop(); onStack.delete(member); group.push(member); } while (member !== id);
    if (group.length > 1 || edges.get(id).includes(id)) cycles.push(group.sort((a, b) => a - b));
  };
  for (const id of [...edges.keys()].sort((a, b) => a - b)) if (!order.has(id)) visit(id);
  return cycles.sort((a, b) => a[0] - b[0]);
}

// One path around a cycle, from its lowest spec id, for the message.
function cyclePath(group, edges) {
  const members = new Set(group);
  const walk = [group[0]];
  for (;;) {
    const next = edges.get(walk.at(-1)).filter(id => members.has(id)).sort((a, b) => a - b)[0];
    const seen = walk.indexOf(next);
    if (seen >= 0) return [...walk.slice(seen), next];
    walk.push(next);
  }
}

const list = ids => ids.length === 1 ? `${ids[0]}` : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`;

/** The gaps in one queue that a program can decide; `skipped` when the queue predates schemaVersion 1. */
export function checkQueue({ root = process.cwd(), queuePath }) {
  queuePath = relativePath(queuePath);
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  if (legacySchema(queue)) {
    return { queuePath, skipped: true, gaps: [],
      message: `Joycraft queue check: skipped ${queuePath}; ${queue.schemaVersion == null ? 'it has no schemaVersion' : `its schemaVersion ${JSON.stringify(queue.schemaVersion)} predates 1`}.` };
  }
  const gaps = [];
  const gap = (kind, specId, item, text) => gaps.push({ kind, specId, item, message: `Joycraft queue check: ${queuePath} ${text} ${kind === 'gate-in-spec' ? gateNextStep : nextStep}` });

  // Unknown and circular dependencies are gaps, not a broken queue: report them
  // and validate the rest of the queue without them.
  const specs = Array.isArray(queue?.specs) ? queue.specs : [];
  const ids = new Set(specs.filter(isObject).map(spec => spec.id));
  const edges = new Map();
  const checked = { ...queue, specs: specs.map(spec => {
    if (!isObject(spec) || !Array.isArray(spec.depends_on)) return spec;
    for (const id of spec.depends_on) {
      if (Number.isSafeInteger(id) && !ids.has(id)) gap('unknown-dependency', spec.id, id, `spec ${spec.id} depends on spec ${id}, which is not in the queue.`);
    }
    edges.set(spec.id, spec.depends_on.filter(id => ids.has(id)));
    return { ...spec, depends_on: spec.depends_on.filter(id => !Number.isSafeInteger(id) || (ids.has(id) && id !== spec.id)) };
  }) };
  validateQueue(checked, { select: spec => spec.status !== 'done' });
  for (const group of dependencyCycles(edges)) {
    gap('dependency-cycle', group[0], group, group.length === 1 ? `spec ${group[0]} depends on itself.`
      : `specs ${list(group)} depend on each other in a cycle (${cyclePath(group, edges).join(' -> ')}).`);
  }

  const folder = path.posix.dirname(queuePath);
  const featureFolder = path.posix.dirname(folder);
  // Session-end archive finds a feature by its folder name, so a working queue
  // whose folder is named for something else can never be archived.
  let config = null;
  try { config = readConfig(root); } catch { /* A broken joycraft.yaml is reported by config.mjs. */ }
  const featuresHome = config?.paths.features ?? null;
  // The recorded gate and full commands belong to the wave or the owner, not to one spec.
  const gateCommands = [...new Set([config?.tests.gate, config?.tests.full].filter(Boolean).map(normalize))];
  if (queuePath === `${featuresHome}/${path.posix.basename(featureFolder)}/specs/.joycraft-spec-queue.json` && !featureFolderMatches(path.posix.basename(featureFolder), queue.feature)) {
    gap('feature-folder', null, featureFolder, `has feature "${queue.feature}", but its folder is ${featureFolder}; session-end archive finds a feature only in a folder named ${queue.feature} or YYYY-MM-DD-${queue.feature}.`);
  }
  const briefPath = path.posix.join(featureFolder, 'brief.md');
  const decisions = existsSync(localPath(root, briefPath, true)) ? briefDecisionRecords(readLocal(root, briefPath), briefPath) : [];
  const open = decisions.filter(record => isObject(record) && record.status === 'open' && typeof record.id === 'string');

  const unfinished = queue.specs.some(spec => spec.status !== 'done');
  for (const spec of queue.specs) {
    if (spec.status === 'done' && !unfinished) continue;
    for (const input of spec.verification.inputs) {
      const inputPath = relativePath(input.path);
      // A declared check folder is a valid input, so this tests existence only.
      if (input.state === 'absent' || existsSync(path.join(root, inputPath))) continue;
      // As in implementer dispatch, a todo spec's missing code, check or
      // fixture input is planned work, not a gap. A requirement must exist.
      if (spec.status === 'todo' && input.kind !== 'requirement') continue;
      gap('missing-input', spec.id, inputPath, `spec ${spec.id}: verification input ${inputPath} does not exist and is not declared state: 'absent'.`);
    }
    if (spec.status === 'done') continue;
    const file = path.posix.join(folder, spec.file);
    const at = `spec ${spec.id} (${file}`;
    if (existsSync(localPath(root, file, true))) {
      const { section, bullets, unclosed } = acceptanceBullets(readLocal(root, file).toString('utf8'));
      if (!section || bullets.length === 0) gap('missing-check', spec.id, null, `${at}) has no acceptance bullet under an acceptance heading.`);
      if (unclosed) gap('missing-check', spec.id, unclosed, `${at}:${unclosed}): a code fence or HTML comment opened here is never closed, so it hides the rest of the acceptance section.`);
      for (const bullet of bullets) {
        if (!bullet.hasCheck) gap('missing-check', spec.id, bullet.line, `${at}:${bullet.line}): the acceptance bullet "${label(bullet.text)}" has no \`Check:\`.`);
        else if (!bullet.plainCheck) gap('missing-check', spec.id, bullet.line, `${at}:${bullet.line}): the acceptance bullet "${label(bullet.text)}" has a \`Check:\` only in code or a comment.`);
        for (const command of gateCommands) {
          if (namesCommand(bullet.text, command) || bullet.fenced.some(line => normalize(line) === command)) gap('gate-in-spec', spec.id, bullet.line, `${at}:${bullet.line}): the acceptance bullet names the recorded gate or full command \`${command}\`; a spec checks with its own test files, and the gate runs at the review boundary or wave end.`);
        }
      }
    }
    // The brief headings and decisions this spec cites: criterion anchors on
    // the brief, and the anchors and decision ids of its scoped brief inputs.
    // A brief input with no scope cites the whole brief.
    const anchors = new Set();
    const decisionIds = new Set();
    let wholeBrief = false;
    for (const criterion of spec.verification.criteria) {
      if (relativePath(criterion.requirement.path) !== briefPath) continue;
      const decision = /^frontmatter\.decisions\.([^.\s]+)$/.exec(criterion.requirement.anchor);
      if (decision) decisionIds.add(decision[1]); else anchors.add(criterion.requirement.anchor);
    }
    for (const input of spec.verification.inputs) {
      if (input.kind !== 'requirement' || relativePath(input.path) !== briefPath) continue;
      if (input.scope === undefined) wholeBrief = true;
      for (const anchor of input.scope?.anchors ?? []) anchors.add(anchor);
      for (const id of input.scope?.decisionIds ?? []) decisionIds.add(id);
    }
    for (const decision of open) {
      const affected = (Array.isArray(decision.affected) ? decision.affected : []).filter(anchor => anchors.has(anchor));
      if (affected.length) gap('open-decision', spec.id, decision.id, `spec ${spec.id} cites heading ${list(affected.map(anchor => `"${anchor}"`))} of ${briefPath}, which open decision ${decision.id} affects.`);
      else if (decisionIds.has(decision.id)) gap('open-decision', spec.id, decision.id, `spec ${spec.id} cites open decision ${decision.id} of ${briefPath}.`);
      else if (wholeBrief) gap('open-decision', spec.id, decision.id, `spec ${spec.id} cites all of ${briefPath} (a brief input with no scope), which has open decision ${decision.id}.`);
    }
  }
  return { queuePath, skipped: false, gaps };
}

export function main(argv = process.argv.slice(2)) {
  const usage = 'Usage: queue-check.mjs --queue <queue> [--root <project>]';
  const flags = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!['--queue', '--root'].includes(name) || flags[name] !== undefined || typeof value !== 'string' || value.startsWith('--')) throw new Error(usage);
    flags[name] = value;
  }
  if (flags['--queue'] === undefined) throw new Error(usage);
  const result = checkQueue({ root: path.resolve(flags['--root'] ?? '.'), queuePath: flags['--queue'] });
  const lines = result.skipped ? [result.message] : result.gaps.map(item => item.message);
  if (lines.length) process.stderr.write(`${lines.join('\n')}\n`);
  process.exitCode = result.gaps.length ? 2 : 0;
  return result;
}

// Node runs the main module from its real path; compare with the real path of argv[1].
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  try { main(); } catch (error) { process.stderr.write(`Queue check stopped: ${error.message}\n`); process.exitCode = 1; }
}
