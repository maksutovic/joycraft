import { describe, expect, it } from 'vitest';
import {
  applyOwnedContent,
  readOwnedContent,
  type PatchSelector,
} from '../src/update-patches';

describe('owned JSON patches', () => {
  const selector: PatchSelector = { ownedKey: 'managed.settings' };

  it('reads a dotted JSON value canonically', () => {
    const current = '{\n  "user": true,\n  "managed": { "settings": { "b": 2, "a": 1 } }\n}\n';

    expect(readOwnedContent(current, selector)).toEqual({
      status: 'present',
      content: '{"b":2,"a":1}',
    });
  });

  it('patches only the owned value and preserves unrelated object and array data', () => {
    const current = '{\n  "user": "keep",\n  "items": [1, 2],\n  "managed": {\n    "settings": { "old": true },\n    "other": "keep"\n  }\n}\n';
    const result = applyOwnedContent(current, selector, '{"new":true}');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.ok ? result.content : '')).toEqual({
      user: 'keep',
      items: [1, 2],
      managed: { settings: { new: true }, other: 'keep' },
    });
    expect(result.ok ? result.content : '').toContain('\n');
  });

  it('keeps the existing CRLF and final-newline conventions', () => {
    const current = '{\r\n\t"managed": {\r\n\t\t"old": true\r\n\t}\r\n}';
    const result = applyOwnedContent(current, { ownedKey: 'managed' }, '{"new":true}');

    expect(result).toEqual({
      ok: true,
      content: '{\r\n\t"managed": {\r\n\t\t"new": true\r\n\t}\r\n}',
    });
  });

  it('reports missing and invalid JSON paths without replacing the document', () => {
    expect(readOwnedContent('{"user":true}', selector)).toEqual({ status: 'missing' });
    expect(readOwnedContent('{"managed":[]}', selector).status).toBe('invalid');
    expect(applyOwnedContent('{"managed":[]}', selector, 'true').ok).toBe(false);
    expect(applyOwnedContent(undefined, { ownedKey: 'managed' }, 'true').ok).toBe(false);
  });

  it.each(['__proto__.polluted', 'constructor', 'managed.__proto__', 'managed..value', ''])(
    'rejects unsafe or malformed JSON key path %s',
    (ownedKey) => {
      expect(readOwnedContent('{}', { ownedKey }).status).toBe('invalid');
      expect(applyOwnedContent('{}', { ownedKey }, 'true').ok).toBe(false);
    },
  );

  it('rejects invalid JSON target values and selector combinations', () => {
    expect(applyOwnedContent('{"managed":true}', { ownedKey: 'managed' }, 'undefined')).toEqual({
      ok: false,
      reason: expect.stringContaining('JSON'),
    });
    expect(readOwnedContent('{}', {})).toEqual({ status: 'invalid', reason: expect.any(String) });
    expect(readOwnedContent('{}', { ownedKey: 'managed', ownedRegion: 'joycraft:x' })).toEqual({
      status: 'invalid',
      reason: expect.any(String),
    });
  });
});

describe('owned marked regions', () => {
  const selector: PatchSelector = { ownedRegion: 'joycraft:managed' };
  const current = 'before\n<!-- joycraft:managed -->\nold\n<!-- /joycraft:managed -->\nafter\n';

  it('reads and replaces only the marked body while preserving surrounding prose', () => {
    expect(readOwnedContent(current, selector)).toEqual({ status: 'present', content: 'old\n' });
    expect(applyOwnedContent(current, selector, 'new\n')).toEqual({
      ok: true,
      content: 'before\n<!-- joycraft:managed -->\nnew\n<!-- /joycraft:managed -->\nafter\n',
    });
  });

  it('uses the current region newline convention when target omits a final newline', () => {
    const crlf = 'before\r\n<!-- joycraft:managed -->\r\nold\r\n<!-- /joycraft:managed -->\r\nafter\r\n';
    expect(applyOwnedContent(crlf, selector, 'new')).toEqual({
      ok: true,
      content: 'before\r\n<!-- joycraft:managed -->\r\nnew\r\n<!-- /joycraft:managed -->\r\nafter\r\n',
    });
  });

  it.each([
    ['missing opening', 'before\nold\n<!-- /joycraft:managed -->\nafter\n'],
    ['missing closing', 'before\n<!-- joycraft:managed -->\nold\nafter\n'],
    ['duplicate opening', `${current}<!-- joycraft:managed -->\n`],
    ['duplicate closing', `${current}<!-- /joycraft:managed -->\n`],
    ['wrong order', 'before\n<!-- /joycraft:managed -->\nold\n<!-- joycraft:managed -->\nafter\n'],
  ])('rejects %s markers', (_name, malformed) => {
    expect(readOwnedContent(malformed, selector).status).toBe('invalid');
    expect(applyOwnedContent(malformed, selector, 'new').ok).toBe(false);
  });

  it('rejects unsafe identifiers and marker injection', () => {
    expect(readOwnedContent(current, { ownedRegion: 'hooks.SessionStart[command=x]' }).status).toBe('invalid');
    expect(applyOwnedContent(current, selector, '<!-- joycraft:managed -->')).toEqual({
      ok: false,
      reason: expect.stringContaining('marker'),
    });
  });

  it('reports an absent well-formed region as missing', () => {
    expect(readOwnedContent('before\nafter\n', selector)).toEqual({ status: 'missing' });
    expect(applyOwnedContent('before\nafter\n', selector, 'new')).toEqual({
      ok: false,
      reason: expect.stringContaining('missing'),
    });
  });
});
