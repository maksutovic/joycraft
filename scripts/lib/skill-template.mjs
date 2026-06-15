// Pure (no I/O) template transform for single-source skills.
// Spec: docs/features/2026-06-11-single-source-skills/specs/substitution-engine.md
//
// Three primitives:
//   1. {{var}} substitution from a fixed 4-variable per-harness lookup.
//   2. <!-- harness:NAME -->...<!-- /harness --> conditional blocks
//      (NAME is `claude`, `codex`, `pi`, or pipe-list like `claude|codex`).
//   3. Frontmatter strip: drop `instructions:` for codex and pi; keep for claude.

const LOOKUP = {
  claude: {
    skill_prefix: '/joycraft-',
    clear: '/clear',
    skills_dir: '.claude/skills',
    boundary_file: 'CLAUDE.md',
  },
  codex: {
    skill_prefix: '$joycraft-',
    clear:
      'run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app',
    skills_dir: '.agents/skills',
    boundary_file: 'AGENTS.md',
  },
  pi: {
    skill_prefix: '/skill:joycraft-',
    clear: '/new',
    skills_dir: '.pi/skills',
    boundary_file: 'AGENTS.md',
  },
};

const STRIP_INSTRUCTIONS = { claude: false, codex: true, pi: true };

/**
 * Transform a canonical skill markdown into a per-harness variant.
 *
 * @param {string} source   Canonical markdown (optional YAML frontmatter + body).
 * @param {'claude'|'codex'|'pi'} harness
 * @param {string} [filename]  Used only in error messages.
 * @returns {string}
 */
export function applyTemplate(source, harness, filename) {
  const vars = LOOKUP[harness];
  if (!vars) throw new Error(`unknown harness: ${harness}`);

  // 1. Split frontmatter from body.
  const { frontmatter, body } = splitFrontmatter(source);

  // 2. Apply frontmatter strip per harness, then substitute vars in the
  //    frontmatter values (e.g. {{boundary_file}} in description).
  let transformedFm = frontmatter
    ? stripFrontmatterFields(frontmatter, harness)
    : null;
  if (transformedFm !== null) {
    transformedFm = substituteVars(transformedFm, vars, filename);
  }

  // 3. Process harness blocks (before variable substitution so vars inside
  //    a stripped block don't trigger unknown-variable errors).
  const afterBlocks = processHarnessBlocks(body, harness, filename);

  // 4. Substitute {{var}}.
  const afterVars = substituteVars(afterBlocks, vars, filename);

  // 5. Reassemble.
  if (transformedFm === null) return afterVars;
  return `---\n${transformedFm}---\n${afterVars}`;
}

// ---------- frontmatter ----------

function splitFrontmatter(source) {
  // Detect leading `---\n...\n---\n` (or `---\r\n...`).
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
    return { frontmatter: null, body: source };
  }
  // Find the closing `---` on its own line after the opening.
  const rest = source.slice(4);
  const closeMatch = rest.match(/^---\r?\n?/m);
  if (!closeMatch) return { frontmatter: null, body: source };
  const closeIdx = rest.indexOf(closeMatch[0]);
  // Sanity: must be preceded by a newline (or be at position 0, which means
  // empty frontmatter — still valid).
  if (closeIdx > 0 && rest[closeIdx - 1] !== '\n') {
    // Not a real closing fence.
    return { frontmatter: null, body: source };
  }
  const fm = rest.slice(0, closeIdx);
  const body = rest.slice(closeIdx + closeMatch[0].length);
  return { frontmatter: fm, body };
}

function stripFrontmatterFields(fm, harness) {
  if (!STRIP_INSTRUCTIONS[harness]) return fm;
  // Parse as ordered key/value pairs (shallow scalar YAML).
  const lines = fm.split('\n');
  const out = [];
  for (const line of lines) {
    // Match a top-level scalar key (no leading whitespace).
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):/);
    if (m && m[1] === 'instructions') continue; // drop this line entirely
    out.push(line);
  }
  // Avoid leftover blank lines: strip any empty lines that appear where the
  // dropped line used to be. We do this by collapsing consecutive empty lines
  // and trimming trailing empties.
  const collapsed = [];
  let prevEmpty = false;
  for (const line of out) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevEmpty) continue;
    collapsed.push(line);
    prevEmpty = isEmpty;
  }
  // Trim trailing empty lines (keep a single trailing newline via join).
  while (collapsed.length && collapsed[collapsed.length - 1].trim() === '') {
    collapsed.pop();
  }
  return collapsed.join('\n') + '\n';
}

// ---------- harness blocks ----------

function processHarnessBlocks(body, harness, filename) {
  const openRe = /<!--\s*harness:([^>]+?)\s*-->/g;
  let result = '';
  let cursor = 0;
  let m;
  while ((m = openRe.exec(body)) !== null) {
    const openStart = m.index;
    const openEnd = openRe.lastIndex;
    const nameRaw = m[1];
    // Find matching `<!-- /harness -->` after openEnd.
    const closeRe = /<!--\s*\/harness\s*-->/g;
    closeRe.lastIndex = openEnd;
    const closeM = closeRe.exec(body);
    if (!closeM) {
      throw new Error(
        `unclosed harness block: ${nameRaw.trim()}${filename ? ' in ' + filename : ''}`,
      );
    }
    const closeStart = closeM.index;
    let closeEnd = closeRe.lastIndex;
    // Decide keep vs strip.
    const names = nameRaw.split('|').map((s) => s.trim());
    const keep = names.includes(harness);
    // Block-line behavior: when the open/close tags occupy their own line,
    // consume the surrounding newlines so a stripped block leaves no blank-
    // line residue and a kept block doesn't gain extra blanks.
    let effectiveOpenStart = openStart;
    let effectiveOpenEnd = openEnd;
    let effectiveCloseStart = closeStart;
    let effectiveCloseEnd = closeEnd;
    const openOnOwnLine =
      (openStart === 0 || body[openStart - 1] === '\n') &&
      (openEnd >= body.length || body[openEnd] === '\n');
    const closeOnOwnLine =
      (closeStart === 0 || body[closeStart - 1] === '\n') &&
      (closeEnd >= body.length || body[closeEnd] === '\n');
    if (openOnOwnLine) {
      // Eat trailing newline after open tag (inside the block).
      if (body[openEnd] === '\n') effectiveOpenEnd = openEnd + 1;
    }
    if (closeOnOwnLine) {
      // Eat trailing newline after close tag.
      if (body[closeEnd] === '\n') {
        effectiveCloseEnd = closeEnd + 1;
        closeEnd = effectiveCloseEnd;
      }
    }
    // Append everything before the open tag.
    result += body.slice(cursor, effectiveOpenStart);
    if (keep) {
      result += body.slice(effectiveOpenEnd, effectiveCloseStart);
    }
    // else: strip entirely, including delimiters and surrounding newlines.
    cursor = effectiveCloseEnd;
    // Reset openRe to scan from new cursor.
    openRe.lastIndex = cursor;
  }
  result += body.slice(cursor);
  return result;
}

// ---------- variable substitution ----------

function substituteVars(text, vars, filename) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_match, name) => {
    const key = name.trim();
    if (!(key in vars)) {
      throw new Error(
        `unknown template variable: {{${key}}}${filename ? ' in ' + filename : ''}`,
      );
    }
    return vars[key];
  });
}
