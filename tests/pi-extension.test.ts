import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Pi extension template (spec #7)', () => {
  const ROOT = join(__dirname, '..');
  const templatePath = join(ROOT, 'src', 'templates', 'pi-extensions', 'joycraft-pipeline.ts');
  const stubPath = join(ROOT, 'src', 'types', 'pi-extension-sdk.d.ts');
  const bundledPath = join(ROOT, 'src', 'bundled-files.ts');
  const packageJsonPath = join(ROOT, 'package.json');

  it('template file exists', () => {
    expect(existsSync(templatePath)).toBe(true);
  });

  it('does not import from fictional pi-extension-sdk', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).not.toContain('pi-extension-sdk');
  });

  it('imports from the real @earendil-works/pi-coding-agent package', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).toContain('@earendil-works/pi-coding-agent');
  });

  it('default export is a function, not an object literal', () => {
    const content = readFileSync(templatePath, 'utf-8');
    // Default export should be a function declaration, not an object
    expect(content).toMatch(/export default function/);
  });

  it('registers a /joycraft-next-spec command', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).toContain('joycraft-next-spec');
    expect(content).toContain('registerCommand');
  });

  it('uses ctx.newSession with withSession callback', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).toContain('newSession');
    expect(content).toContain('withSession');
  });

  it('does not call newSession with a string argument (old API)', () => {
    const content = readFileSync(templatePath, 'utf-8');
    // Old code used ctx.newSession(messageString) — this must not appear
    expect(content).not.toMatch(/newSession\(['"]/);
    expect(content).not.toMatch(/newSession\(kickoffMessage\)/);
  });

  it('fictional type stub does not exist', () => {
    expect(existsSync(stubPath)).toBe(false);
  });

  it('devDependency @earendil-works/pi-coding-agent is present', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies['@earendil-works/pi-coding-agent']).toBeDefined();
  });

  it('bundled-files.ts contains the real API import', () => {
    const content = readFileSync(bundledPath, 'utf-8');
    expect(content).toContain('@earendil-works/pi-coding-agent');
    expect(content).not.toContain('pi-extension-sdk');
  });

  it('uses ctx.cwd not ctx.projectDir', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).not.toContain('projectDir');
  });

  // The LLM-callable joycraft_next_spec TOOL was retired by the
  // pi-implement-loop spec (the autonomous loop is now the
  // `joycraft-implement-loop` script — process-boundary isolation — so the
  // in-process tool is dead). Only the human-typable COMMAND remains. Assert
  // the tool is gone; the former tool-internals tests (spec_path required,
  // mark-done catch block) no longer apply.
  it('no longer registers the LLM-callable joycraft_next_spec tool', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).not.toMatch(/registerTool\s*\(/);
    expect(content).not.toContain('"joycraft_next_spec"');
    expect(content).not.toContain('spec_path');
  });
});
