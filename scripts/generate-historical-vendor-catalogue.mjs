#!/usr/bin/env node

/**
 * Generate the trusted vendor-byte catalogue used when adopting a legacy
 * installation.
 *
 * The input is the published Joycraft bundle, never a checked-out source tree.
 * The tarball's registry integrity is checked before it is extracted. The
 * extracted JavaScript is parsed as data with TypeScript's AST API; it is never
 * imported or executed.
 */

import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const PACKAGE_NAME = 'joycraft';
const DEFAULT_VERSION = '0.7.13';
const DEFAULT_INTEGRITY =
  'sha512-xJsCIYS7gu7PiAfSY0m2QTZ4Tdy1PRw82QDCMujP1ZG5ZIMplOQzLXFe0G35JjtemU3ACafDmElz7gLOXtWy0A==';
const REGISTRY_BASE = 'https://registry.npmjs.org';
const RECORD_OBJECTS = [
  'SKILLS',
  'CODEX_SKILLS',
  'PI_SKILLS',
  'COPILOT_SKILLS',
  'OMP_SKILLS',
  'TEMPLATES',
  'PI_SCRIPTS',
  'PI_EXTENSIONS',
  'PI_AGENTS',
];

function usage() {
  console.error(
    'Usage: node scripts/generate-historical-vendor-catalogue.mjs [--version VERSION] [--tarball FILE] [--integrity SHA512] [--output FILE]'
  );
}

function parseArgs(argv) {
  const options = {
    version: DEFAULT_VERSION,
    integrity: DEFAULT_INTEGRITY,
    output: 'src/historical-vendor-catalogue.ts',
    tarball: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--version') options.version = argv[++index];
    else if (argument === '--tarball') options.tarball = argv[++index];
    else if (argument === '--integrity') options.integrity = argv[++index];
    else if (argument === '--output') options.output = argv[++index];
    else if (argument === '--help' || argument === '-h') {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.version || !options.integrity || !options.output) {
    throw new Error('Version, integrity, and output are required');
  }
  if (!/^sha512-[A-Za-z0-9+/]+=*$/.test(options.integrity)) {
    throw new Error(`Expected a base64 SHA-512 integrity value, got: ${options.integrity}`);
  }
  return options;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Registry metadata request failed: HTTP ${response.status}`);
  return response.json();
}

async function fetchBytes(url) {
  const response = await fetch(url, { headers: { accept: 'application/octet-stream' } });
  if (!response.ok) throw new Error(`Tarball request failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function verifyIntegrity(bytes, expectedIntegrity) {
  const actual = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (actual !== expectedIntegrity) {
    throw new Error(`Tarball integrity mismatch: expected ${expectedIntegrity}, got ${actual}`);
  }
  return actual;
}

async function obtainTarball(options, workspace) {
  let tarballUrl = `${REGISTRY_BASE}/${PACKAGE_NAME}/-/${PACKAGE_NAME}-${options.version}.tgz`;
  let registryIntegrity = options.integrity;

  if (!options.tarball) {
    const metadata = await fetchJson(`${REGISTRY_BASE}/${PACKAGE_NAME}/${options.version}`);
    if (metadata.name !== PACKAGE_NAME || metadata.version !== options.version) {
      throw new Error('Registry metadata did not identify the requested Joycraft version');
    }
    if (metadata.dist?.tarball) tarballUrl = metadata.dist.tarball;
    if (metadata.dist?.integrity !== options.integrity) {
      throw new Error(
        `Registry integrity changed for ${PACKAGE_NAME}@${options.version}: expected ${options.integrity}, got ${metadata.dist?.integrity ?? 'missing'}`
      );
    }
    const parsed = new URL(tarballUrl);
    if (parsed.hostname !== 'registry.npmjs.org') {
      throw new Error(`Refusing tarball from unexpected registry host: ${parsed.hostname}`);
    }
    const bytes = await fetchBytes(parsed.href);
    verifyIntegrity(bytes, registryIntegrity);
    const tarball = join(workspace, `${PACKAGE_NAME}-${options.version}.tgz`);
    await writeFile(tarball, bytes);
    return { tarball, integrity: registryIntegrity, tarballUrl };
  }

  const bytes = await readFile(resolve(options.tarball));
  verifyIntegrity(bytes, registryIntegrity);
  const tarball = join(workspace, `${PACKAGE_NAME}-${options.version}.tgz`);
  await writeFile(tarball, bytes);
  return { tarball, integrity: registryIntegrity, tarballUrl: undefined };
}

async function extractTarball(tarball, workspace) {
  const extractDir = join(workspace, 'package');
  const result = spawnSync('tar', ['-xzf', tarball, '-C', workspace], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Could not extract verified tarball: ${result.stderr || 'tar failed'}`);
  }
  return extractDir;
}

function literalValue(node, sourceFile) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return literalValue(node.expression, sourceFile);
  throw new Error(
    `Unsupported non-literal bundle value at ${sourceFile.fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`
  );
}

function objectValue(node, sourceFile) {
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`Expected a static object literal in ${sourceFile.fileName}`);
  }
  const value = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(`Unsupported computed or spread property in ${sourceFile.fileName}`);
    }
    const name = property.name;
    const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
    if (!key) throw new Error(`Unsupported object key in ${sourceFile.fileName}`);
    value[key] = literalValue(property.initializer, sourceFile);
  }
  return value;
}

async function locateBundle(packageDir) {
  const distDir = join(packageDir, 'dist');
  const result = spawnSync('find', [distDir, '-type', 'f', '-name', '*.js'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`Could not inspect extracted package: ${result.stderr}`);
  const files = result.stdout
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .sort();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (RECORD_OBJECTS.every((name) => new RegExp(`(?:var|const|let) ${name}\\s*=`).test(source))) {
      return file;
    }
  }
  throw new Error('No static Joycraft bundle containing the managed file objects was found');
}

async function parseBundle(bundlePath) {
  const source = await readFile(bundlePath, 'utf8');
  const sourceFile = ts.createSourceFile(bundlePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const objects = {};
  sourceFile.forEachChild((statement) => {
    if (!ts.isVariableStatement(statement)) return;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && RECORD_OBJECTS.includes(declaration.name.text)) {
        objects[declaration.name.text] = objectValue(declaration.initializer, sourceFile);
      }
    }
  });
  for (const name of RECORD_OBJECTS) {
    if (!objects[name]) throw new Error(`Bundle did not contain static ${name}`);
  }
  return objects;
}

function normalizedLfHash(content) {
  return createHash('sha256').update(content.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
}

function pathFor(group, name) {
  const skillRoots = {
    SKILLS: '.claude/skills/',
    CODEX_SKILLS: '.agents/skills/',
    PI_SKILLS: '.pi/skills/',
    COPILOT_SKILLS: '.github/skills/',
    OMP_SKILLS: '.omp/skills/',
  };
  if (skillRoots[group]) return `${skillRoots[group]}${name.replace(/\.md$/, '')}/SKILL.md`;
  if (group === 'TEMPLATES') return `docs/templates/${name}`;
  if (group === 'PI_SCRIPTS') return `.pi/scripts/joycraft/${name}`;
  if (group === 'PI_EXTENSIONS') return `.pi/extensions/${name}`;
  if (group === 'PI_AGENTS') return `.pi/agents/${name}`;
  throw new Error(`No path mapping for ${group}`);
}

function buildRecords(objects, version) {
  const records = [];
  for (const group of RECORD_OBJECTS) {
    for (const [name, content] of Object.entries(objects[group])) {
      records.push({
        path: pathFor(group, name),
        version,
        vendorHash: normalizedLfHash(content),
      });
    }
  }
  // Use code-unit ordering so output does not depend on the host locale.
  records.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  const paths = new Set();
  for (const record of records) {
    if (paths.has(record.path)) throw new Error(`Duplicate catalogue path: ${record.path}`);
    paths.add(record.path);
  }
  return records;
}

function render(records, source) {
  const lines = [
    '// @generated — run: node scripts/generate-historical-vendor-catalogue.mjs',
    `// Source: ${PACKAGE_NAME}@${source.version} from ${source.tarballUrl ?? 'a locally supplied tarball'}`,
    `// Registry integrity: ${source.integrity}`,
    '// Content is parsed from static bundle literals after integrity verification; the historical package is never executed.',
    '',
    'export type HistoricalVendorRecord = Readonly<{',
    '  path: string;',
    '  version: string;',
    '  vendorHash: string;',
    '}>;',
    '',
    'export const HISTORICAL_VENDOR_CATALOGUE: readonly HistoricalVendorRecord[] = [',
  ];
  for (const record of records) {
    lines.push(
      `  { path: ${JSON.stringify(record.path)}, version: ${JSON.stringify(record.version)}, vendorHash: ${JSON.stringify(record.vendorHash)} },`
    );
  }
  lines.push('] as const;', '');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workspace = await mkdtemp(join(tmpdir(), 'joycraft-historical-catalogue-'));
  try {
    const source = await obtainTarball(options, workspace);
    const packageDir = await extractTarball(source.tarball, workspace);
    const bundlePath = await locateBundle(packageDir);
    const objects = await parseBundle(bundlePath);
    const records = buildRecords(objects, options.version);
    const output = resolve(options.output);
    await writeFile(output, render(records, { ...source, version: options.version }), 'utf8');
    console.log(`Generated ${output} (${records.length} verified ${PACKAGE_NAME}@${options.version} records)`);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  usage();
  process.exitCode = 1;
});
