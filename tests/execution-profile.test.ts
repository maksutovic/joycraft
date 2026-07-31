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
  resolveExecutionProfile,
  SESSION_DEFAULT,
  type ExecutionProfile,
} from '../src/execution-profile';
import type { Harness } from '../src/harness';
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

/**
 * The `fix-model-question-skip` guarantee, on the CLI side: whenever the swarm
 * questions are asked, the model and effort questions are asked too. The skill
 * text lost them by bundling four questions into one paragraph; the readline
 * flow must never have the equivalent gap, including on the all-"no" path where
 * an early return would be a tempting shortcut.
 */
describe('interactive ask flow always asks model and effort', () => {
  /** Drive `resolveExecutionProfile` with scripted answers; capture every prompt written. */
  const driveAsk = async (harnesses: Harness[], answers: string[]) => {
    const prompts: string[] = [];
    const fakeStdin = Readable.from(answers.map((a) => `${a}\n`)) as unknown as NodeJS.ReadStream & {
      isTTY?: boolean;
    };
    fakeStdin.isTTY = true;
    const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    const origWrite = process.stdout.write.bind(process.stdout);
    const origLog = console.log;
    // readline renders its prompt through stdout.write, not console.log.
    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      prompts.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    }) as typeof process.stdout.write;
    console.log = (...args: unknown[]) => {
      prompts.push(args.map(String).join(' '));
    };
    try {
      const profileResult = await resolveExecutionProfile(harnesses, true);
      return { profile: profileResult, prompts: prompts.join('\n') };
    } finally {
      process.stdout.write = origWrite;
      console.log = origLog;
      Object.defineProperty(process, 'stdin', stdinDesc);
    }
  };

  it('asks decompose, implement, model and effort for a harness', async () => {
    const { prompts, profile: got } = await driveAsk(['claude'], ['y', 'y', 'my-model', 'high']);
    expect(prompts).toMatch(/swarms for decompose/i);
    expect(prompts).toMatch(/swarms for implement/i);
    expect(prompts).toMatch(/model/i);
    expect(prompts).toMatch(/effort/i);
    expect(got.entries[0].model).toBe('my-model');
    expect(got.entries[0].effort).toBe('high');
  });

  it('still asks model and effort when every swarm answer is no', async () => {
    const { prompts, profile: got } = await driveAsk(['claude'], ['n', 'n', 'slow-model', 'low']);
    expect(prompts).toMatch(/model/i);
    expect(prompts).toMatch(/effort/i);
    expect(got.entries[0]).toMatchObject({
      swarmDecompose: false,
      swarmImplement: false,
      model: 'slow-model',
      effort: 'low',
    });
  });

  it('offers the session default on the model and effort prompts', async () => {
    const { prompts } = await driveAsk(['claude'], ['n', 'n', '', '']);
    expect(prompts).toContain(`Model (${SESSION_DEFAULT})`);
    expect(prompts).toContain(`Effort (${SESSION_DEFAULT})`);
  });

  it('falls back to the session default when the answer is empty', async () => {
    const { profile: got } = await driveAsk(['claude'], ['n', 'n', '', '']);
    expect(got.entries[0].model).toBe(SESSION_DEFAULT);
    expect(got.entries[0].effort).toBe(SESSION_DEFAULT);
  });

  it('asks all four questions for every selected harness', async () => {
    const { profile: got } = await driveAsk(
      ['claude', 'pi'],
      ['y', 'n', 'model-a', 'medium', 'n', 'y', 'model-b', 'max'],
    );
    expect(got.entries).toHaveLength(2);
    expect(got.entries[0]).toMatchObject({ harness: 'claude', model: 'model-a', effort: 'medium' });
    expect(got.entries[1]).toMatchObject({ harness: 'pi', model: 'model-b', effort: 'max' });
  });

  it('degrades to the session default when stdin runs out mid-interview', async () => {
    // EOF after the swarm answers: the remaining questions must not hang or
    // throw, and the profile still lands with explicit values.
    const { profile: got } = await driveAsk(['claude'], ['y', 'y']);
    expect(got.entries[0].model).toBe(SESSION_DEFAULT);
    expect(got.entries[0].effort).toBe(SESSION_DEFAULT);
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
