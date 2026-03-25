import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../src/bundled-files';

describe('scenario evolution templates: presence', () => {
  it('TEMPLATES contains spec-dispatch.yml', () => {
    expect(TEMPLATES).toHaveProperty('workflows/spec-dispatch.yml');
  });

  it('TEMPLATES contains scenarios-rerun.yml', () => {
    expect(TEMPLATES).toHaveProperty('workflows/scenarios-rerun.yml');
  });

  it('TEMPLATES contains scenarios/workflows/generate.yml', () => {
    expect(TEMPLATES).toHaveProperty('scenarios/workflows/generate.yml');
  });

  it('TEMPLATES contains scenarios/prompts/scenario-agent.md', () => {
    expect(TEMPLATES).toHaveProperty('scenarios/prompts/scenario-agent.md');
  });
});

describe('scenario evolution templates: content', () => {
  it('spec-dispatch.yml contains $JOYCRAFT_APP_ID placeholder', () => {
    expect(TEMPLATES['workflows/spec-dispatch.yml']).toContain('$JOYCRAFT_APP_ID');
  });

  it('spec-dispatch.yml contains $SCENARIOS_REPO placeholder', () => {
    expect(TEMPLATES['workflows/spec-dispatch.yml']).toContain('$SCENARIOS_REPO');
  });

  it('generate.yml contains spec-pushed dispatch type', () => {
    expect(TEMPLATES['scenarios/workflows/generate.yml']).toContain('spec-pushed');
  });

  it('scenarios-rerun.yml contains scenarios-updated dispatch type', () => {
    expect(TEMPLATES['workflows/scenarios-rerun.yml']).toContain('scenarios-updated');
  });

  it('scenario-agent.md contains "QA engineer"', () => {
    expect(TEMPLATES['scenarios/prompts/scenario-agent.md']).toContain('QA engineer');
  });

  it('scenario-agent.md contains cannot access source code', () => {
    const content = TEMPLATES['scenarios/prompts/scenario-agent.md'].toLowerCase();
    expect(content).toContain('cannot access');
    expect(content).toContain('source code');
  });

  it('scenarios/workflows/run.yml contains run-scenarios dispatch type', () => {
    expect(TEMPLATES['scenarios/workflows/run.yml']).toContain('run-scenarios');
  });
});
