import { randomBytes } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { join, sep } from 'node:path';

const preferencePath = '.joycraft/preferences.json';
const themes = new Set(['light', 'dark']);
export const colorTokens = Object.freeze(['canvas', 'paper', 'surface', 'ink', 'muted', 'line', 'control-line', 'accent', 'accent-hover', 'accent-text', 'accent-soft', 'focus', 'error', 'error-bg', 'caution', 'input']);
const textPairs = [['ink', 'paper'], ['ink', 'surface'], ['ink', 'input'], ['ink', 'accent-soft'], ['muted', 'paper'], ['muted', 'surface'], ['muted', 'input'], ['muted', 'accent-soft'], ['accent', 'paper'], ['accent', 'accent-soft'], ['accent-text', 'accent'], ['accent-text', 'accent-hover'], ['error', 'error-bg']];
const controlPairs = [['control-line', 'paper'], ['control-line', 'input'], ['focus', 'paper'], ['focus', 'accent-soft']];

export function checkedTheme(value, source = 'theme') {
  if (!themes.has(value)) throw new Error(`${source} must be light or dark`);
  return value;
}

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

export function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

/** The kit's built-in palettes, read from kit.css so there is one source. */
export async function defaultPalettes() {
  const css = await readFile(new URL('../../assets/artifacts/kit.css', import.meta.url), 'utf8');
  const tokens = block => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1], match[2]]));
  const light = tokens(css.split('}')[0]);
  const dark = { ...light, ...tokens(css.slice(css.indexOf('[data-jca-theme="dark"]')).split('}')[0]) };
  return { light, dark };
}

/** Override shape is { light?: { token: "#rrggbb" }, dark?: { ... } }; each merged palette keeps the kit's contrast floor. */
export async function checkedColors(colors, source = 'Artifact colors') {
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) throw new Error(`${source} must be an object with light and/or dark palettes`);
  const defaults = await defaultPalettes();
  const result = {};
  for (const [theme, palette] of Object.entries(colors)) {
    if (!themes.has(theme)) throw new Error(`${source} theme must be light or dark: ${theme}`);
    if (!palette || typeof palette !== 'object' || Array.isArray(palette)) throw new Error(`${source} ${theme} must be an object of colors`);
    const checked = {};
    for (const [token, value] of Object.entries(palette)) {
      if (!colorTokens.includes(token)) throw new Error(`${source} ${theme} has an unknown color: ${token}. Use: ${colorTokens.join(', ')}`);
      if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`${source} ${theme}.${token} must be a #rrggbb color`);
      checked[token] = value.toLowerCase();
    }
    const merged = { ...defaults[theme], ...checked };
    const low = [...textPairs.map(pair => [...pair, 4.5]), ...controlPairs.map(pair => [...pair, 3])]
      .filter(([fg, bg, floor]) => contrast(merged[fg], merged[bg]) < floor)
      .map(([fg, bg, floor]) => `${fg} on ${bg} is ${contrast(merged[fg], merged[bg]).toFixed(2)}:1 (needs ${floor}:1)`);
    if (low.length) throw new Error(`${source} ${theme} is hard to read: ${low.join('; ')}`);
    if (Object.keys(checked).length) result[theme] = checked;
  }
  return result;
}

async function checkedPreferencePath(root, { output = false } = {}) {
  const base = await realpath(root);
  let current = base;
  for (const part of preferencePath.split('/')) {
    current = join(current, part);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (output && error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || (part === 'preferences.json' ? !stat.isFile() : !stat.isDirectory())) throw new Error(`Expected a plain project file: ${preferencePath}`);
  }
  if (!current.startsWith(base + sep)) throw new Error('Path escaped project root');
  return current;
}

function parsePreferences(bytes) {
  let preferences;
  try { preferences = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`Invalid JSON: ${preferencePath}`); }
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw new Error(`${preferencePath} must contain an object`);
  if (preferences.artifacts !== undefined && (!preferences.artifacts || typeof preferences.artifacts !== 'object' || Array.isArray(preferences.artifacts))) throw new Error(`${preferencePath} artifacts must be an object`);
  if (preferences.questions !== undefined) checkedQuestionStyle(preferences.questions, `${preferencePath} questions`);
  return preferences;
}

export async function artifactTheme(root) {
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  const preferences = parsePreferences(await readFile(path));
  return preferences.artifacts?.theme === undefined ? undefined : checkedTheme(preferences.artifacts.theme, 'Artifact preference theme');
}

async function updatePreferences(root, change, section = 'artifacts') {
  const base = await realpath(root);
  const directory = join(base, '.joycraft');
  await mkdir(directory, { recursive: true });
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code !== 'ENOENT') throw error; path = await checkedPreferencePath(root, { output: true }); }
  let preferences;
  try { preferences = parsePreferences(await readFile(path)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; preferences = { schemaVersion: 1 }; }
  const updated = { ...preferences, [section]: change({ ...(preferences[section] ?? {}) }) };
  const temporary = `${path}.prefs-${randomBytes(8).toString('hex')}`;
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(`${JSON.stringify(updated, null, 2)}\n`); await file.sync(); }
  finally { await file.close(); }
  try { await checkedPreferencePath(root, { output: true }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return updated;
}

export async function setArtifactTheme(root, theme) {
  checkedTheme(theme, 'Theme');
  return updatePreferences(root, artifacts => ({ ...artifacts, theme }));
}

export async function artifactColors(root) {
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  const preferences = parsePreferences(await readFile(path));
  return preferences.artifacts?.colors === undefined ? undefined : checkedColors(preferences.artifacts.colors, 'Artifact preference colors');
}

/** Replace the project's color overrides; null removes them and restores the kit palettes. */
export async function setArtifactColors(root, colors) {
  const checked = colors === null ? null : await checkedColors(colors);
  return updatePreferences(root, ({ colors: _colors, ...artifacts }) => checked && Object.keys(checked).length ? { ...artifacts, colors: checked } : artifacts);
}

// How an agent asks the user: how many decisions at once, and where.
const questionValues = Object.freeze({ pacing: ['one-at-a-time', 'page'], surface: ['chat', 'artifact'] });
/** With no recorded style, Joycraft asks as it always has (decision `unset-default`). */
export const DEFAULT_QUESTION_STYLE = Object.freeze({ pacing: 'page', surface: 'artifact' });
const styleLine = /^question-style:[ \t]*([^\r\n]*)/gm;

export function checkedQuestionStyle(style, source = 'Question style') {
  if (!style || typeof style !== 'object' || Array.isArray(style)) throw new Error(`${source} must be an object with pacing and/or surface`);
  for (const [key, value] of Object.entries(style)) {
    if (!Object.hasOwn(questionValues, key)) throw new Error(`${source} has an unknown key: ${key}. Use: ${Object.keys(questionValues).join(', ')}`);
    if (!questionValues[key].includes(value)) throw new Error(`${source} ${key} must be ${questionValues[key].join(' or ')}`);
  }
  return style;
}

/** Parse `pacing=one-at-a-time,surface=chat` from the command line. */
export function parseQuestionStyle(value) {
  const style = {};
  for (const pair of String(value).split(',')) {
    const [key, choice, extra] = pair.split('=').map(part => part.trim());
    if (!key || choice === undefined || extra !== undefined || Object.hasOwn(style, key)) throw new Error('Use --set key=value[,key=value], for example pacing=one-at-a-time,surface=chat');
    style[key] = choice;
  }
  return checkedQuestionStyle(style, 'Question style');
}

function frontmatterBounds(text) {
  const match = /^(---\r?\n)([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('Brief needs YAML frontmatter');
  const start = match[1].length;
  return { start, end: start + match[2].length };
}

function styleLines(text) {
  const { start, end } = frontmatterBounds(text);
  return [...text.slice(start, end).matchAll(styleLine)].map(match => ({ index: start + match.index, length: match[0].length, value: match[1] }));
}

/** The brief's own question style, or undefined when it keeps the project's. */
export function briefQuestionStyle(text) {
  const lines = styleLines(text);
  if (lines.length > 1) throw new Error('Expected at most one question-style: line');
  if (!lines.length) return undefined;
  let style;
  try { style = JSON.parse(lines[0].value); }
  catch { throw new Error('question-style: must be a JSON object, for example {"pacing":"one-at-a-time"}'); }
  return checkedQuestionStyle(style, 'Brief question-style');
}

/** Replace, add or (with null) remove only the brief's question-style line. */
export function withBriefQuestionStyle(text, style) {
  const current = briefQuestionStyle(text);
  const [line] = styleLines(text);
  if (style === null) {
    if (!line) return text;
    // Remove the line with its own ending, whatever the rest of the file uses.
    const next = text.indexOf('\n', line.index + line.length);
    return text.slice(0, line.index) + text.slice(next + 1);
  }
  const merged = checkedQuestionStyle({ ...(current ?? {}), ...style }, 'Brief question-style');
  const replacement = `question-style: ${JSON.stringify(merged)}`;
  if (line) return text.slice(0, line.index) + replacement + text.slice(line.index + line.length);
  // The new line takes the ending of the last frontmatter line, so --clear gives the same bytes back.
  const { end } = frontmatterBounds(text);
  const newline = text.startsWith('\r\n', end) ? '\r\n' : '\n';
  return text.slice(0, end) + newline + replacement + text.slice(end);
}

export async function projectQuestionStyle(root) {
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  return parsePreferences(await readFile(path)).questions;
}

export async function setQuestionStyle(root, style) {
  checkedQuestionStyle(style);
  return updatePreferences(root, questions => ({ ...questions, ...style }), 'questions');
}

/** Each key from the brief first, then the project, then the default; `source` says which. */
export function effectiveQuestionStyle({ project, brief } = {}) {
  const result = {};
  const source = {};
  for (const key of Object.keys(questionValues)) {
    [result[key], source[key]] = brief?.[key] !== undefined ? [brief[key], 'brief'] : project?.[key] !== undefined ? [project[key], 'project'] : [DEFAULT_QUESTION_STYLE[key], 'default'];
  }
  result.source = source;
  if (project === undefined || Object.keys(project).length === 0) result.unset = true;
  return result;
}
