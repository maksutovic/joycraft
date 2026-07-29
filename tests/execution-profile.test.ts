import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { init } from '../src/init';
import {
  EXECUTION_PROFILE_OPEN,
  EXECUTION_PROFILE_CLOSE,
  hasExecutionProfile,
  defaultExecutionProfile,
  renderExecutionProfileSection,
  type ExecutionProfile,
} from '../src/execution-profile';
import { generateAgentsMd, improveAgentsMd } from '../src/agents-md';
import { generateCLAUDEMd, improveCLAUDEMd } from '../src/improve-claude-md';
import type { StackInfo } from '../src/detect';

const ROOT = join(__dirname, '..');

const nodeStack: StackInfo = {
  language: 'node',
  packageManager: 'pnpm',
  commands: { build: 'pnpm build', test: 'pnpm test' },
};

const profile: ExecutionProfile = {
  entries: [
    { harness: 'claude', swarmDecompose: true, swarmImplement: true, model: 'opus-5', effort: 'medium' },
    { harness: 'codex', swarmDecompose: false, swarmImplement: true, model: 'gpt-5.6-terra', effort: 'high' },
  ],
};

describe('execution profile rendering', () => {
  it('renders a sentinel-delimited section with a Swarms line per harness', () => {
    const section = renderExecutionProfileSection(profile);
    expect(section).toContain('## Execution Profile');
    expect(section).toContain(EXECUTION_PROFILE_OPEN);
    expect(section).toContain(EXECUTION_PROFILE_CLOSE);
    expect(section).toContain('Swarms: decompose yes · implement yes');
    expect(section).toContain('opus-5');
    expect(section).toContain('effort medium');
    expect(section).toContain('gpt-5.6-terra');
    expect(section).toContain('Swarms: decompose no · implement yes');
  });

  it('non-interactive default answers no to swarms and uses "session default" for the model', () => {
    const section = renderExecutionProfileSection(defaultExecutionProfile(['claude']));
    expect(section).toContain('Swarms: decompose no · implement no');
    expect(section).toContain('session default');
  });

  it('only writes lines for the harnesses that were selected', () => {
    const section = renderExecutionProfileSection(defaultExecutionProfile(['pi']));
    expect(section).toContain('pi');
    expect(section).not.toContain('claude');
    expect(section).not.toContain('codex');
  });

  it('hasExecutionProfile detects the sentinel and nothing else', () => {
    expect(hasExecutionProfile(renderExecutionProfileSection(profile))).toBe(true);
    expect(hasExecutionProfile('## Execution Profile\n\nno sentinels here\n')).toBe(false);
    expect(hasExecutionProfile('')).toBe(false);
  });

  it('hardcodes no model names in the source', () => {
    const src = readFileSync(join(ROOT, 'src', 'execution-profile.ts'), 'utf-8');
    expect(src).not.toMatch(/\b(opus|sonnet|haiku|gpt-\d|claude-\d)\b/i);
  });
});

describe('generateAgentsMd with an execution profile', () => {
  it('writes the sentinel-delimited section when a profile is supplied', () => {
    const result = generateAgentsMd('proj', nodeStack, false, profile);
    expect(result).toContain(EXECUTION_PROFILE_OPEN);
    expect(result).toContain(EXECUTION_PROFILE_CLOSE);
    expect(result).toContain('Swarms: decompose yes · implement yes');
  });

  it('omits the section entirely when no profile is supplied', () => {
    const result = generateAgentsMd('proj', nodeStack);
    expect(hasExecutionProfile(result)).toBe(false);
  });
});

describe('generateCLAUDEMd (multi-tool AGENTS.md) with an execution profile', () => {
  it('writes the sentinel-delimited section', () => {
    const result = generateCLAUDEMd('proj', nodeStack, [], { multiTool: true, executionProfile: profile });
    expect(hasExecutionProfile(result)).toBe(true);
    expect(result).toContain('Swarms: decompose yes · implement yes');
  });
});

describe('merge: preserve-if-present / insert-if-absent', () => {
  const handEdited = [
    '## Execution Profile',
    '',
    EXECUTION_PROFILE_OPEN,
    '- Swarms: decompose yes · implement no',
    '- my hand-written note, malformed on purpose: !!!',
    EXECUTION_PROFILE_CLOSE,
  ].join('\n');

  function inner(doc: string): string {
    const start = doc.indexOf(EXECUTION_PROFILE_OPEN);
    const end = doc.indexOf(EXECUTION_PROFILE_CLOSE);
    return doc.slice(start, end + EXECUTION_PROFILE_CLOSE.length);
  }

  it('improveAgentsMd leaves an existing profile byte-identical', () => {
    const existing = `# Proj\n\nintro\n\n${handEdited}\n`;
    const result = improveAgentsMd(existing, nodeStack, false, profile);
    expect(inner(result)).toBe(inner(existing));
    expect(result.match(new RegExp(EXECUTION_PROFILE_OPEN, 'g'))).toHaveLength(1);
  });

  it('improveAgentsMd inserts the section when the sentinels are absent', () => {
    const existing = '# Proj\n\nintro\n';
    const result = improveAgentsMd(existing, nodeStack, false, profile);
    expect(hasExecutionProfile(result)).toBe(true);
    expect(result).toContain('## Execution Profile');
  });

  it('improveAgentsMd adds nothing when no profile is supplied', () => {
    const existing = '# Proj\n\nintro\n';
    const result = improveAgentsMd(existing, nodeStack);
    expect(hasExecutionProfile(result)).toBe(false);
  });

  it('improveCLAUDEMd leaves an existing profile byte-identical', () => {
    const existing = `# Proj\n\nintro\n\n${handEdited}\n`;
    const result = improveCLAUDEMd(existing, nodeStack, [], { executionProfile: profile });
    expect(inner(result)).toBe(inner(existing));
    expect(result.match(new RegExp(EXECUTION_PROFILE_OPEN, 'g'))).toHaveLength(1);
  });

  it('improveCLAUDEMd inserts the section when absent', () => {
    const result = improveCLAUDEMd('# Proj\n\nintro\n', nodeStack, [], { executionProfile: profile });
    expect(hasExecutionProfile(result)).toBe(true);
  });
});

describe('interactive init captures the answers', () => {
  it('writes the answered swarm/model/effort values into AGENTS.md', async () => {
    const dir = join(tmpdir(), `joycraft-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });

    // harness menu, then 4 profile answers for the single selected harness,
    // then the gitignore-profile prompt.
    const answers = ['claude', 'y', 'n', 'my-model-x', 'high', 'shared'];
    const fakeStdin = Readable.from(answers.map((a) => `${a}\n`)) as unknown as NodeJS.ReadStream & {
      isTTY?: boolean;
    };
    fakeStdin.isTTY = true;
    const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    const origLog = console.log;
    console.log = () => {};
    try {
      await init(dir, { force: false });
    } finally {
      console.log = origLog;
      Object.defineProperty(process, 'stdin', stdinDesc);
    }

    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('- claude: Swarms: decompose yes · implement no · model my-model-x · effort high');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('joycraft-tune offers the profile when missing', () => {
  const tune = () => readFileSync(join(ROOT, 'src', 'skills', 'joycraft-tune.md'), 'utf-8');

  it('references the execution-profile sentinel', () => {
    expect(tune()).toContain('joycraft:execution-profile');
  });

  it('offers the questions rather than overwriting an existing profile', () => {
    const body = tune();
    expect(body).toMatch(/execution profile/i);
    expect(body).toMatch(/never overwrite an existing profile without asking/i);
  });
});
