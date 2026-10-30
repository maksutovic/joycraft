import { createHash, randomBytes } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { questionsFromBrief, saveAnswers } from './decisions.mjs';
import { artifactTheme, checkedTheme, artifactColors } from './preferences.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const string = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

export function projectPath(value) {
  if (!string(value) || value.startsWith('/') || value.includes('\\') || value.split('/').some(part => !part || part === '.' || part === '..') || /[\x00-\x1f]/.test(value)) {
    throw new Error('Use a path relative to the project root, without dot segments.');
  }
  return value;
}

/** Deliberately read only explicitly named, plain project files. */
export async function checkedPath(root, path, { output = false } = {}) {
  projectPath(path);
  const base = await realpath(root);
  let current = base;
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    current = join(current, parts[i]);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (output && error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error(`Expected a plain project file: ${path}`);
  }
  if (!current.startsWith(base + sep)) throw new Error('Path escaped project root');
  return current;
}

export async function readProjectFile(root, path, limit = 1_000_000) {
  const absolute = await checkedPath(root, path);
  const stat = await lstat(absolute);
  if (stat.size > limit) throw new Error(`File exceeds artifact limit: ${path}`);
  return readFile(absolute);
}

function parseJSON(bytes, path) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`Invalid JSON: ${path}`); }
}

export async function loadArtifact({ root = process.cwd(), brief, view, mode = 'local', theme: themeOverride }) {
  projectPath(brief);
  if (!['local', 'claude', 'portable'].includes(mode)) throw new Error('Artifact mode must be local, claude or portable');
  const text = (await readProjectFile(root, brief)).toString('utf8');
  const definition = view ? parseJSON(await readProjectFile(root, view), view) : { schemaVersion: 1, title: 'Your decisions' };
  if (!object(definition) || definition.schemaVersion !== 1 || !string(definition.title)) throw new Error('View needs schemaVersion: 1 and a title');
  for (const field of ['title', 'summary']) if (definition[field] !== undefined && (typeof definition[field] !== 'string' || definition[field].length > 8_000)) throw new Error(`Invalid view ${field}`);
  if (definition.theme !== undefined) checkedTheme(definition.theme, 'View theme');
  if (themeOverride !== undefined) checkedTheme(themeOverride, 'Theme');
  const artifactId = definition.artifactId ?? `decisions-${hash(brief).slice(0, 16)}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(artifactId)) throw new Error('artifactId must be a short alphanumeric slug');
  const { revision, questions } = questionsFromBrief(text, definition.decisionIds);
  if (questions.length > 100) throw new Error('Select at most 100 decision IDs for one artifact');
  const comparisons = [], reviews = [], inputs = [];
  let imageBytes = 0;
  if (definition.comparisons !== undefined && !Array.isArray(definition.comparisons)) throw new Error('comparisons must be an array');
  for (const comparison of definition.comparisons ?? []) {
    if (!object(comparison) || !string(comparison.title) || !Array.isArray(comparison.images) || comparison.images.length < 1 || comparison.images.length > 4) throw new Error('Each comparison needs a title and one to four images');
    if (comparison.decisionId !== undefined && !questions.some(q => q.id === comparison.decisionId)) throw new Error('Comparison refers to a decision outside this view');
    const images = [];
    for (const input of comparison.images) {
      if (!object(input) || !string(input.label) || !string(input.alt) || (input.caption !== undefined && typeof input.caption !== 'string')) throw new Error('Images need a project path, label and descriptive alt text');
      const type = imageTypes[extname(projectPath(input.path)).toLowerCase()];
      if (!type) throw new Error('Use a PNG, JPEG, WebP or GIF screenshot');
      const bytes = await readProjectFile(root, input.path, 8_000_000);
      inputs.push({ path: input.path, sha256: hash(bytes) });
      imageBytes += bytes.length;
      if (imageBytes > 16_000_000) throw new Error('Artifact screenshots exceed 16 MB; select smaller images');
      images.push({ src: `data:${type};base64,${bytes.toString('base64')}`, label: input.label, alt: input.alt, ...(input.caption === undefined ? {} : { caption: input.caption }) });
    }
    comparisons.push({ title: comparison.title, ...(comparison.decisionId ? { decisionId: comparison.decisionId } : {}), images });
  }
  if (definition.reviews !== undefined && !Array.isArray(definition.reviews)) throw new Error('reviews must be an array');
  for (const input of definition.reviews ?? []) {
    if (!object(input) || (input.title !== undefined && !string(input.title))) throw new Error('Review needs a report path and optional title');
    const bytes = await readProjectFile(root, input.path);
    inputs.push({ path: input.path, sha256: hash(bytes) });
    const report = parseJSON(bytes, input.path);
    if (!object(report) || report.schemaVersion !== 1 || !['PASS', 'FAIL', 'UNVERIFIED'].includes(report.verdict) || !Array.isArray(report.flows) || !Array.isArray(report.unresolved) || !report.unresolved.every(item => typeof item === 'string')) throw new Error(`Not a verification report: ${input.path}`);
    const details = [...report.unresolved];
    for (const flow of report.flows) {
      if (!object(flow) || !string(flow.id) || !Array.isArray(flow.limits) || !flow.limits.every(item => typeof item === 'string')) throw new Error(`Invalid report flow: ${input.path}`);
      details.push(...flow.limits.map(limit => `${flow.id}: ${limit}`));
    }
    reviews.push({ title: input.title ?? 'Independent review', result: report.verdict, summary: `${report.flows.length} recorded flows; ${report.unresolved.length} unresolved findings. This view does not revalidate the report against current files.`, details, source: input.path });
  }
  // Theme is display-only. Retain the legacy hash bytes when a view has no theme.
  const { theme: _theme, ...semanticDefinition } = definition;
  const viewRevision = hash(JSON.stringify({ definition: semanticDefinition, inputs }));
  const theme = themeOverride ?? definition.theme ?? await artifactTheme(root) ?? 'light';
  // Colors are display-only too: they stay out of the view revision.
  const colors = (await artifactColors(root))?.[theme];
  return { model: { schemaVersion: 1, artifactId, title: definition.title, summary: definition.summary ?? '', theme, ...(colors ? { colors } : {}), source: { path: brief, revision, viewRevision }, questions, comparisons, reviews, mode }, text };
}

export function localState(model) {
  return { model, responses: model.questions.filter(q => q.answer !== null).map(q => ({ id: q.id, answer: q.answer, ...(q.note === undefined ? {} : { note: q.note }) })), writable: true, storage: 'brief', message: 'Answers save directly to your brief.' };
}

export function validateEnvelope(envelope, model) {
  if (!object(envelope) || envelope.schemaVersion !== 1 || envelope.kind !== 'joycraft-artifact-responses' || envelope.artifactId !== model.artifactId || !object(envelope.source) || envelope.source.path !== model.source.path || envelope.source.revision !== model.source.revision || envelope.source.viewRevision !== model.source.viewRevision) throw new Error('Responses do not match this artifact and current brief revision or view. Refresh the artifact and review the answers.');
  if (!Array.isArray(envelope.answers) || envelope.answers.length === 0 || envelope.answers.some(answer => !model.questions.some(q => q.id === answer?.id))) throw new Error('Responses must name only decisions displayed in this artifact');
  return { revision: model.source.revision, answers: envelope.answers };
}

/** Cooperative lock + compare before atomic replacement; no silent stale write. */
async function replaceBrief(root, path, before, after) {
  if (before === after) return;
  const absolute = await checkedPath(root, path);
  const lock = `${absolute}.joycraft-answer-lock`;
  let handle;
  try { handle = await open(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Another answer writer is active. Retry after it finishes; inspect a leftover .joycraft-answer-lock before removing it.'); throw error; }
  const temporary = `${absolute}.answers-${randomBytes(8).toString('hex')}`;
  try {
    await checkedPath(root, path);
    if ((await readFile(absolute, 'utf8')) !== before) throw new Error('Brief changed. Refresh before saving.');
    const mode = (await lstat(absolute)).mode;
    const output = await open(temporary, 'wx', mode);
    try { await output.writeFile(after); await output.sync(); } finally { await output.close(); }
    if ((await readFile(absolute, 'utf8')) !== before) throw new Error('Brief changed. Refresh before saving.');
    await rename(temporary, absolute);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await handle.close();
    await unlink(lock);
  }
}

export async function persistResponses({ root = process.cwd(), brief, view, envelope, apply = false }) {
  const { model, text } = await loadArtifact({ root, brief, view });
  const request = validateEnvelope(envelope, model);
  const updated = saveAnswers(text, request);
  if (apply) await replaceBrief(root, brief, text, updated);
  return { applied: apply, changed: updated !== text, source: model.source, answers: request.answers };
}

export async function saveLocal({ root = process.cwd(), brief, view, theme, request }) {
  const { model, text } = await loadArtifact({ root, brief, view, theme });
  if (request?.viewRevision !== model.source.viewRevision) throw new Error('Artifact view changed. Refresh the screenshots and questions before saving.');
  if (!request || !Array.isArray(request.answers) || request.answers.some(answer => !model.questions.some(q => q.id === answer?.id))) throw new Error('Responses must name only decisions displayed in this artifact');
  const updated = saveAnswers(text, request);
  await replaceBrief(root, brief, text, updated);
  return localState((await loadArtifact({ root, brief, view, theme })).model);
}

export async function writeArtifact({ root = process.cwd(), path, html }) {
  const target = await checkedPath(root, path, { output: true });
  await mkdir(dirname(target), { recursive: true });
  await checkedPath(root, path, { output: true });
  const file = await open(target, 'wx', 0o600);
  try { await file.writeFile(html); } finally { await file.close(); }
  return resolve(target);
}
