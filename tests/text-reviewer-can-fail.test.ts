import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const flat = (text: string) => text.replace(/\s+/g, ' ');
const verify = flat(readFileSync(join(__dirname, '..', 'payload', '.agents', 'skills', 'joycraft-verify', 'SKILL.md'), 'utf8'));

describe('the reviewer checks that each added test can fail (spec 9)', () => {
  it('[AC:spec-9-1] "Can the test fail?" keeps its key-criterion revert, and a test that cannot fail is blocking', () => {
    expect(verify).toContain('**Can the test fail?** For the key criterion, revert the change (or its key line) in a scratch copy and run its test.');
    expect(verify).toContain('A test that stays green is `blocking`.');
    expect(verify).toContain('`blocking` is only a failing stated criterion, a test you showed cannot fail, or a defect');
  });
});
