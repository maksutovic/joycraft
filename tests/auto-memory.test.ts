import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import {
  parseAutoMemoryAnswer,
  resolveAutoMemoryOffer,
  AUTO_MEMORY_KEY,
} from '../src/auto-memory';

describe('parseAutoMemoryAnswer', () => {
  it('reads an affirmative answer as accept', () => {
    for (const answer of ['y', 'Y', 'yes', 'YES', ' yes ']) {
      expect(parseAutoMemoryAnswer(answer)).toBe(true);
    }
  });

  it('reads a negative answer as decline', () => {
    for (const answer of ['n', 'N', 'no', 'NO', ' no ']) {
      expect(parseAutoMemoryAnswer(answer)).toBe(false);
    }
  });

  it('takes the no-change default on an empty answer', () => {
    expect(parseAutoMemoryAnswer('')).toBe(false);
    expect(parseAutoMemoryAnswer('   ')).toBe(false);
  });

  it('returns null on garbage so the caller can re-ask', () => {
    for (const answer of ['maybe', 'ja', '1', 'yep']) {
      expect(parseAutoMemoryAnswer(answer)).toBeNull();
    }
  });
});

describe('resolveAutoMemoryOffer', () => {
  /** Drive the offer with scripted answers on a fake TTY stdin. */
  async function drive(answers: string[]): Promise<{ accepted: boolean; output: string }> {
    const out: string[] = [];
    const fakeStdin = Readable.from(answers.map((a) => `${a}\n`)) as unknown as NodeJS.ReadStream & {
      isTTY?: boolean;
    };
    fakeStdin.isTTY = true;
    const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    const origLog = console.log;
    const origWrite = process.stdout.write.bind(process.stdout);
    console.log = (...args: unknown[]) => out.push(args.map(String).join(' '));
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    }) as typeof process.stdout.write;
    try {
      const accepted = await resolveAutoMemoryOffer(true);
      return { accepted, output: out.join('\n') };
    } finally {
      console.log = origLog;
      process.stdout.write = origWrite;
      Object.defineProperty(process, 'stdin', stdinDesc);
    }
  }

  it('is a no-op without a TTY — never asks, never accepts', async () => {
    expect(await resolveAutoMemoryOffer(false)).toBe(false);
  });

  it('accepts on yes and explains why before asking', async () => {
    const { accepted, output } = await drive(['y']);
    expect(accepted).toBe(true);
    expect(output).toMatch(/auto-memory/i);
    expect(output).toMatch(/one home/i);
  });

  it('declines on no and on an empty answer', async () => {
    expect((await drive(['n'])).accepted).toBe(false);
    expect((await drive([''])).accepted).toBe(false);
  });

  it('re-asks on an unrecognized answer rather than coercing it', async () => {
    const { accepted, output } = await drive(['maybe', 'y']);
    expect(accepted).toBe(true);
    expect(output).toMatch(/y.*n/i);
  });
});

describe('AUTO_MEMORY_KEY', () => {
  it('is the Claude Code project settings key', () => {
    expect(AUTO_MEMORY_KEY).toBe('autoMemoryEnabled');
  });
});
