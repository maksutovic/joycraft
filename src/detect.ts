import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface StackInfo {
  language: string;
  packageManager: string;
  commands: {
    build?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
    deploy?: string;
  };
  framework?: string;
}

function readFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function detectNodeFramework(pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): string | undefined {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps['next']) return 'Next.js';
  if (allDeps['nuxt']) return 'Nuxt';
  if (allDeps['@remix-run/node'] || allDeps['@remix-run/react']) return 'Remix';
  if (allDeps['express']) return 'Express';
  if (allDeps['fastify']) return 'Fastify';
  if (allDeps['react']) return 'React';
  if (allDeps['vue']) return 'Vue';
  if (allDeps['svelte']) return 'Svelte';
  return undefined;
}

function detectNodeTestFramework(pkg: { devDependencies?: Record<string, string>; dependencies?: Record<string, string> }): string | undefined {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps['vitest']) return 'vitest';
  if (allDeps['jest']) return 'jest';
  if (allDeps['mocha']) return 'mocha';
  return undefined;
}

function detectNodePackageManager(dir: string): string {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun';
  return 'npm';
}

function detectNode(dir: string): StackInfo | null {
  const raw = readFile(join(dir, 'package.json'));
  if (raw === null) return null;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw);
  } catch {
    return null;
  }

  const pm = detectNodePackageManager(dir);
  const run = pm === 'npm' ? 'npm run' : pm;
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const framework = detectNodeFramework(pkg as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> });
  const testFramework = detectNodeTestFramework(pkg as { devDependencies?: Record<string, string>; dependencies?: Record<string, string> });

  const commands: StackInfo['commands'] = {};
  if (scripts.build) commands.build = `${run} build`;
  else commands.build = `${run} build`;
  if (scripts.test) commands.test = `${run} test`;
  else if (testFramework) commands.test = `${run} test`;
  else commands.test = `${pm === 'npm' ? 'npm' : pm} test`;
  if (scripts.lint) commands.lint = `${run} lint`;
  if (scripts.typecheck) commands.typecheck = `${run} typecheck`;
  else if ((pkg.devDependencies as Record<string, string> | undefined)?.['typescript']) {
    commands.typecheck = 'tsc --noEmit';
  }

  return {
    language: 'node',
    packageManager: pm,
    commands,
    framework,
  };
}

function detectPythonFramework(content: string): string | undefined {
  if (/fastapi/i.test(content)) return 'FastAPI';
  if (/django/i.test(content)) return 'Django';
  if (/flask/i.test(content)) return 'Flask';
  return undefined;
}

function detectPython(dir: string): StackInfo | null {
  const pyproject = readFile(join(dir, 'pyproject.toml'));
  if (pyproject !== null) {
    const isPoetry = /\[tool\.poetry\]/.test(pyproject);
    const isUv = existsSync(join(dir, 'uv.lock'));

    let pm: string;
    let run: string;
    if (isUv) {
      pm = 'uv';
      run = 'uv run';
    } else if (isPoetry) {
      pm = 'poetry';
      run = 'poetry run';
    } else {
      pm = 'pip';
      run = 'python -m';
    }

    const framework = detectPythonFramework(pyproject);
    const hasPytest = /pytest/i.test(pyproject);

    return {
      language: 'python',
      packageManager: pm,
      commands: {
        build: `${pm === 'poetry' ? 'poetry' : pm} build`,
        test: hasPytest ? `${run} pytest` : `${run} pytest`,
        lint: `${run} ruff check .`,
      },
      framework,
    };
  }

  const requirements = readFile(join(dir, 'requirements.txt'));
  if (requirements !== null) {
    const framework = detectPythonFramework(requirements);
    return {
      language: 'python',
      packageManager: 'pip',
      commands: {
        build: 'pip install -e .',
        test: 'python -m pytest',
        lint: 'python -m ruff check .',
      },
      framework,
    };
  }

  return null;
}

function detectRust(dir: string): StackInfo | null {
  const cargo = readFile(join(dir, 'Cargo.toml'));
  if (cargo === null) return null;

  let framework: string | undefined;
  if (/actix-web/.test(cargo)) framework = 'Actix';
  else if (/axum/.test(cargo)) framework = 'Axum';
  else if (/rocket/.test(cargo)) framework = 'Rocket';

  return {
    language: 'rust',
    packageManager: 'cargo',
    commands: {
      build: 'cargo build',
      test: 'cargo test',
      lint: 'cargo clippy',
    },
    framework,
  };
}

function detectGo(dir: string): StackInfo | null {
  const gomod = readFile(join(dir, 'go.mod'));
  if (gomod === null) return null;

  let framework: string | undefined;
  if (/github\.com\/gin-gonic\/gin/.test(gomod)) framework = 'Gin';
  else if (/github\.com\/gofiber\/fiber/.test(gomod)) framework = 'Fiber';
  else if (/github\.com\/labstack\/echo/.test(gomod)) framework = 'Echo';

  return {
    language: 'go',
    packageManager: 'go',
    commands: {
      build: 'go build ./...',
      test: 'go test ./...',
      lint: 'golangci-lint run',
    },
    framework,
  };
}

function detectSwift(dir: string): StackInfo | null {
  const pkg = readFile(join(dir, 'Package.swift'));
  if (pkg === null) return null;

  return {
    language: 'swift',
    packageManager: 'swift',
    commands: {
      build: 'swift build',
      test: 'swift test',
    },
  };
}

function detectMakefile(dir: string): StackInfo | null {
  const makefile = readFile(join(dir, 'Makefile'));
  if (makefile === null) return null;

  const commands: StackInfo['commands'] = {};
  commands.build = 'make build';
  if (/^test:/m.test(makefile)) commands.test = 'make test';
  if (/^lint:/m.test(makefile)) commands.lint = 'make lint';

  return {
    language: 'unknown',
    packageManager: 'make',
    commands,
  };
}

function detectDockerfile(dir: string): StackInfo | null {
  if (!existsSync(join(dir, 'Dockerfile'))) return null;

  return {
    language: 'unknown',
    packageManager: 'docker',
    commands: {
      build: 'docker build .',
    },
  };
}

export async function detectStack(dir: string): Promise<StackInfo> {
  const detectors = [
    detectNode,
    detectPython,
    detectRust,
    detectGo,
    detectSwift,
    detectMakefile,
    detectDockerfile,
  ];

  for (const detect of detectors) {
    const result = detect(dir);
    if (result) return result;
  }

  return { language: 'unknown', packageManager: '', commands: {} };
}
