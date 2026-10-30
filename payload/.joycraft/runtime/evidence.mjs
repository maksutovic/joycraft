const kinds = new Set(['runtime', 'visual', 'structural']);
const methods = new Set(['test', 'command', 'browser', 'manual', 'source']);
const results = new Set(['PASS', 'FAIL', 'UNVERIFIED']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const texts = value => Array.isArray(value) && value.every(text);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const relativePath = value => text(value) && !/[\\\0]/.test(value)
  && !value.startsWith('/') && !/^[a-z]:/i.test(value)
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');

/** Check declared evidence sufficiency, not observational truth or file contents.
 * Identity, receipt bytes, independent review and status writes belong to completion.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateEvidence(report, criteria) {
  const errors = [];
  const requirements = new Map();
  const covered = new Map();
  const fail = message => errors.push(message);

  if (!Array.isArray(criteria) || criteria.length === 0) {
    fail('criteria must be a nonempty array');
  } else {
    criteria.forEach((criterion, index) => {
      const label = `criteria[${index}]`;
      if (!record(criterion) || !text(criterion.id)) {
        fail(`${label} needs an id`);
        return;
      }
      if (requirements.has(criterion.id)) fail(`${label} duplicates criterion ${criterion.id}`);
      if (!record(criterion.requirement) || !relativePath(criterion.requirement.path)
        || !text(criterion.requirement.anchor)) fail(`${label} needs a project-relative requirement path and anchor`);
      if (!Array.isArray(criterion.requiredKinds) || criterion.requiredKinds.length === 0
        || criterion.requiredKinds.some(kind => !kinds.has(kind))
        || new Set(criterion.requiredKinds).size !== criterion.requiredKinds.length) {
        fail(`${label} needs distinct supported requiredKinds`);
        return;
      }
      requirements.set(criterion.id, criterion.requiredKinds);
      covered.set(criterion.id, new Set());
    });
  }

  if (!record(report) || report.schemaVersion !== 1) {
    fail('report must use schemaVersion 1');
    return { ok: false, errors };
  }
  if (!record(report.subject) || !hash(report.subject.identity)) {
    fail('report.subject.identity must be a SHA-256 identity');
  }
  if (!Array.isArray(report.flows)) {
    fail('report.flows must be an array');
    return { ok: false, errors };
  }

  const flowIds = new Set();
  report.flows.forEach((flow, index) => {
    const label = `flows[${index}]`;
    if (!record(flow)) { fail(`${label} must be an object`); return; }
    if (!text(flow.id)) fail(`${label} needs an id`);
    else if (flowIds.has(flow.id)) fail(`${label} duplicates flow ${flow.id}`);
    else flowIds.add(flow.id);
    if (!hash(flow.subjectIdentity) || flow.subjectIdentity !== report.subject?.identity) {
      fail(`${label} does not reference the report subject identity`);
    }
    if (!text(flow.representativeInput)) fail(`${label} needs representative input or initial state`);
    if (!text(flow.expected)) fail(`${label} needs expected behavior`);
    if (!texts(flow.limits)) fail(`${label}.limits must be an array of nonempty strings`);
    const references = Array.isArray(flow.criteria) ? flow.criteria : [];
    if (!texts(flow.criteria) || references.length === 0 || new Set(references).size !== references.length) {
      fail(`${label} needs distinct criterion references`);
    }
    for (const id of references) {
      if (!requirements.has(id)) fail(`${label} references undeclared criterion ${String(id)}`);
    }
    if (!Array.isArray(flow.observations) || flow.observations.length === 0) {
      fail(`${label} needs observations`);
      return;
    }

    flow.observations.forEach((observation, observationIndex) => {
      const at = `${label}.observations[${observationIndex}]`;
      const before = errors.length;
      if (!record(observation)) { fail(`${at} must be an object`); return; }
      if (!kinds.has(observation.kind)) fail(`${at} has an unsupported evidence kind`);
      if (!methods.has(observation.method)) fail(`${at} has an unsupported method`);
      if (!results.has(observation.result)) fail(`${at} has an unsupported result`);
      else if (observation.result !== 'PASS') fail(`${at} remains ${observation.result}`);
      if (!text(observation.actual)) fail(`${at} needs an actual observation`);
      if (observation.method === 'source' && observation.kind !== 'structural') {
        fail(`${at}: a source scan supports structural claims only`);
      }
      if (!Array.isArray(observation.receipts) || observation.receipts.length === 0) {
        fail(`${at} needs supporting receipt references`);
      } else {
        observation.receipts.forEach((receipt, receiptIndex) => {
          if (!record(receipt) || !relativePath(receipt.path) || !hash(receipt.sha256)) {
            fail(`${at}.receipts[${receiptIndex}] needs a project-relative path and SHA-256`);
          }
        });
      }
      if (observation.method === 'test' || observation.method === 'command'
        || observation.command !== undefined) {
        const command = observation.command;
        if (!record(command) || !texts(command.argv) || command.argv.length === 0) {
          fail(`${at} needs the executed command argv`);
        }
        if (!record(command) || !Number.isInteger(command.exitCode) || command.exitCode !== 0) {
          fail(`${at} needs actual successful command exitCode 0; unavailable or nonzero is insufficient`);
        }
      }
      if (observation.kind === 'visual') {
        const visual = observation.visual;
        if (!record(visual) || !text(visual.route) || !text(visual.state)) {
          fail(`${at} needs the rendered route and state`);
        }
        if (!record(visual?.viewport) || !Number.isInteger(visual.viewport.width)
          || !Number.isInteger(visual.viewport.height) || visual.viewport.width <= 0 || visual.viewport.height <= 0) {
          fail(`${at} needs a positive viewport width and height`);
        }
        if (visual?.inspected !== true) fail(`${at}: a saved but uninspected render is UNVERIFIED`);
        if (!texts(visual?.interactions)) fail(`${at} needs an array of observed interaction outcomes`);
      }
      if (errors.length === before) {
        for (const id of references) covered.get(id)?.add(observation.kind);
      }
    });
  });

  for (const [id, requiredKinds] of requirements) {
    for (const kind of requiredKinds) {
      if (!covered.get(id).has(kind)) fail(`criterion ${id} lacks PASS ${kind} evidence`);
    }
  }
  return { ok: errors.length === 0, errors };
}
