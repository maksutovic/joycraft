import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The vendored Joycraft bundle that ships in this package (payload/PIN pins its source). */
export interface Pin {
  schemaVersion: 1;
  source: string;
  tag: string;
  commit: string;
  files: Record<string, string>;
}

export const HOSTS = ['claude', 'codex', 'pi', 'omp', 'copilot', 'opencode'] as const;
export type Host = (typeof HOSTS)[number];

export const HOST_LABELS: Record<Host, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  pi: 'Pi',
  omp: 'Oh My Pi',
  copilot: 'GitHub Copilot CLI',
  opencode: 'OpenCode',
};

export const sha256 = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');

/** payload/ beside dist/ in the package, or beside src/ in a checkout. */
export function payloadRoot(start = dirname(fileURLToPath(import.meta.url))): string {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'payload', 'PIN'))) return join(dir, 'payload');
    if (dirname(dir) === dir) throw new Error('This Joycraft package has no payload/PIN');
  }
}

export function readPin(root = payloadRoot()): Pin {
  const pin = JSON.parse(readFileSync(join(root, 'PIN'), 'utf8')) as Pin;
  if (pin.schemaVersion !== 1 || typeof pin.commit !== 'string' || !pin.files) throw new Error('Unsupported payload PIN');
  return pin;
}

export interface PlannedFile { path: string; source: string; bytes: Buffer }

/**
 * Where each payload file goes for the chosen hosts. Every host but Claude Code
 * reads `.agents/skills/`; Claude Code reads `.claude/skills/` and its agents.
 */
export function filesForHosts(hosts: readonly Host[], root = payloadRoot(), pin = readPin(root)): PlannedFile[] {
  const claude = hosts.includes('claude');
  const shared = hosts.some((host) => host !== 'claude');
  const out: PlannedFile[] = [];
  for (const source of Object.keys(pin.files).sort()) {
    const bytes = readFileSync(join(root, source));
    if (source.startsWith('.joycraft/')) out.push({ path: source, source, bytes });
    else if (source.startsWith('.agents/skills/')) {
      if (shared) out.push({ path: source, source, bytes });
      if (claude) {
        const path = source.replace(/^\.agents\/skills\//, '.claude/skills/');
        const text = source.endsWith('.md') ? Buffer.from(bytes.toString('utf8').replaceAll('.agents/skills/', '.claude/skills/')) : bytes;
        out.push({ path, source, bytes: text });
      }
    } else if (source.startsWith('.claude/agents/')) {
      if (claude) out.push({ path: source, source, bytes });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** The host this CLI is running inside, from variables each host sets for its tools. */
export function detectHost(env: NodeJS.ProcessEnv = process.env): Host | null {
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return 'claude';
  if (Object.keys(env).some((name) => name.startsWith('CODEX_'))) return 'codex';
  if (env.OPENCODE || Object.keys(env).some((name) => name.startsWith('OPENCODE_'))) return 'opencode';
  if (Object.keys(env).some((name) => name.startsWith('COPILOT_'))) return 'copilot';
  if (env.OMP_CODING_AGENT || Object.keys(env).some((name) => name.startsWith('OMP_'))) return 'omp';
  if (env.PI_CODING_AGENT) return 'pi';
  return null;
}

export function parseHosts(value: string): Host[] {
  const tokens = value.split(/[\s,]+/).map((token) => token.trim().toLowerCase()).filter(Boolean)
    .map((token) => (token === 'github-copilot' ? 'copilot' : token));
  const unknown = tokens.filter((token) => !(HOSTS as readonly string[]).includes(token));
  if (unknown.length) throw new Error(`Unknown host: ${unknown.join(', ')}. Use ${HOSTS.join(', ')}`);
  return HOSTS.filter((host) => tokens.includes(host));
}
