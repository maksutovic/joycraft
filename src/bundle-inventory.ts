import {
  CODEX_SKILLS,
  COPILOT_SKILLS,
  OMP_SKILLS,
  PI_AGENTS,
  PI_EXTENSIONS,
  PI_SCRIPTS,
  PI_SKILLS,
  SKILLS,
  TEMPLATES,
  CHECKER_SOURCE,
} from './bundled-files.js';
import { HARNESSES, sanitizeHarnesses, type Harness } from './harness.js';
import { generateDenyPatternsFile, generateHookScript } from './safeguard.js';

export type BundleEntryKind = 'vendor' | 'create-once' | 'config-patch';
export type BundleEntryHarness = Harness | 'shared';

/**
 * One declared artifact in the Joycraft bundle.
 *
 * `active`/`installable` deliberately distinguish a known future artifact
 * from content that this package can safely install today. Inactive entries
 * carry ownership and path information for the planner without shipping a
 * placeholder implementation.
 */
export interface BundleInventoryEntry {
  path: string;
  harness: BundleEntryHarness;
  kind: BundleEntryKind;
  ownership: 'managed';
  active: boolean;
  installable: boolean;
  content?: string;
  executable?: boolean;
  mode?: number;
  ownedKey?: string;
  ownedRegion?: string;
}

const vendor = (
  path: string,
  harness: BundleEntryHarness,
  content: string,
  options: Pick<BundleInventoryEntry, 'executable' | 'mode'> = {},
): BundleInventoryEntry => ({
  path,
  harness,
  kind: 'vendor',
  ownership: 'managed',
  active: true,
  installable: true,
  content,
  ...options,
});

const createOnce = (path: string): BundleInventoryEntry => ({
  path,
  harness: 'shared',
  kind: 'create-once',
  ownership: 'managed',
  active: true,
  installable: false,
});

const patch = (
  path: string,
  harness: Harness,
  ownedKey?: string,
  ownedRegion?: string,
): BundleInventoryEntry => ({
  path,
  harness,
  kind: 'config-patch',
  ownership: 'managed',
  active: true,
  installable: false,
  ...(ownedKey ? { ownedKey } : {}),
  ...(ownedRegion ? { ownedRegion } : {}),
});

const deferred = (path: string, harness: BundleEntryHarness, ownedRegion?: string): BundleInventoryEntry => ({
  path,
  harness,
  kind: 'vendor',
  ownership: 'managed',
  active: false,
  installable: false,
  ...(ownedRegion ? { ownedRegion } : {}),
});

function mapVendorFiles(
  harness: Harness,
  root: string,
  files: Record<string, string>,
  options: Pick<BundleInventoryEntry, 'executable' | 'mode'> | undefined = undefined,
): BundleInventoryEntry[] {
  return Object.entries(files).map(([name, content]) => {
    const relative = name.endsWith('.md') && root.endsWith('/skills')
      ? `${name.slice(0, -3)}/SKILL.md`
      : name;
    return vendor(`${root}/${relative}`, harness, content, options ?? (root.endsWith('/scripts/joycraft') && !name.endsWith('README.md')
      ? { executable: true, mode: 0o755 }
      : root.endsWith('/scripts/joycraft')
        ? { executable: false }
        : {}));
  });
}

/**
 * Return the canonical managed bundle inventory for the selected harnesses.
 * Unknown array members are sanitized using the same canonical harness list as
 * init and persisted installation state. A non-array selection is treated as
 * no recorded selection and therefore includes every harness for compatibility.
 */
export function getBundleInventory(selection: readonly Harness[] | unknown = HARNESSES): BundleInventoryEntry[] {
  const selected = sanitizeHarnesses(selection) ?? [...HARNESSES];
  const wants = (harness: Harness): boolean => selected.includes(harness);
  const entries: BundleInventoryEntry[] = [
    ...Object.entries(TEMPLATES).map(([path, content]) => vendor(`docs/templates/${path}`, 'shared', content)),
    createOnce('CLAUDE.md'),
    createOnce('AGENTS.md'),
    vendor('docs/.joycraft/check.mjs', 'shared', CHECKER_SOURCE, { executable: true, mode: 0o755 }),
  ];

  if (wants('claude')) {
    entries.push(...mapVendorFiles('claude', '.claude/skills', SKILLS));
    entries.push(
      vendor('.claude/hooks/joycraft/block-dangerous.sh', 'claude', generateHookScript(), { executable: true, mode: 0o755 }),
      vendor('.claude/hooks/joycraft/deny-patterns.txt', 'claude', generateDenyPatternsFile(), { executable: false }),
      // This legacy adapter remains declared for ownership; spec 10 wires its
      // delegating payload and SessionStart registration.
      deferred('.claude/hooks/joycraft-version-check.mjs', 'claude', 'joycraft-checker-adapter'),
      patch('.claude/settings.json', 'claude', undefined, 'hooks.SessionStart[command=node .claude/hooks/joycraft-version-check.mjs]'),
      patch('.claude/settings.json', 'claude', undefined, 'hooks.PreToolUse[command=.claude/hooks/joycraft/block-dangerous.sh]'),
      patch('.claude/settings.json', 'claude', 'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'),
      patch('.claude/settings.json', 'claude', undefined, 'permissions.allow[joycraft-generated]'),
      patch('.claude/settings.json', 'claude', undefined, 'permissions.deny[joycraft-generated]'),
      patch('.claude/settings.json', 'claude', 'autoMemoryEnabled'),
    );
  }
  if (wants('codex')) entries.push(...mapVendorFiles('codex', '.agents/skills', CODEX_SKILLS));
  if (wants('pi')) {
    entries.push(...mapVendorFiles('pi', '.pi/skills', PI_SKILLS));
    entries.push(...mapVendorFiles('pi', '.pi/scripts/joycraft', PI_SCRIPTS));
    entries.push(...mapVendorFiles('pi', '.pi/extensions', PI_EXTENSIONS));
    entries.push(...mapVendorFiles('pi', '.pi/agents', PI_AGENTS));
  }
  if (wants('copilot')) entries.push(...mapVendorFiles('copilot', '.github/skills', COPILOT_SKILLS));
  if (wants('omp')) entries.push(...mapVendorFiles('omp', '.omp/skills', OMP_SKILLS));

  return entries;
}
