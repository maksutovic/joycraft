// Reviewer probe for test-release spec 20 (SOTA testing page). Read-only.
// Usage: node spec-20-probe.mjs <project-root>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const ref = f => readFileSync(join(root, 'payload/.joycraft/references', f), 'utf8');
const page = ref('testing-page.md');
const flat = t => t.replace(/\s+/g, ' ');
let bad = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : name.includes('(informational)') ? 'NOTE' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); if (!ok && !name.includes('(informational)')) bad++; };

// 1. Nine numbered principles, in order, each inside the fenced page.
const fence = page.match(/```markdown\n([\s\S]*?)\n```/);
check('page has one fenced markdown template', !!fence);
const body = fence ? fence[1] : '';
const nums = [...body.matchAll(/^(\d+)\. \*\*([^*]+)\*\*/gm)].map(m => `${m[1]} ${m[2]}`);
check('nine numbered principles inside the template', nums.length === 9, nums.join(' | '));
const fillSlots = [...body.matchAll(/`<[^>]+>`/g)].map(m => m[0]);
check('template has project fill-in slots', fillSlots.length >= 6, fillSlots.join(' '));

// 2. Runner names: the spec check set plus a wider set the spec does not list.
const specSet = ['vitest', 'jest', 'mocha', 'pytest', 'unittest', 'go test', 'cargo test', 'rspec', 'minitest', 'junit', 'gradle', 'maven', 'phpunit', 'playwright', 'cypress', 'xctest'];
const wider = ['nextest', 'bazel', 'xdist', 'stryker', 'hypothesis', 'pnpm', 'npm ', 'yarn', 'bun ', 'deno', 'node ', 'tap ', 'ava', 'karma', 'jasmine', 'nunit', 'xunit', 'testng', 'kotest', 'exunit', 'mix test', 'dotnet test', 'ctest', 'catch2', 'gtest', 'sqlite', 'postgres', 'pglite'];
const lower = page.toLowerCase();
check('spec check set: no runner names', specSet.filter(n => lower.includes(n)).length === 0, specSet.filter(n => lower.includes(n)).join(','));
const hits = wider.filter(n => new RegExp(`\\b${n.trim()}\\b`).test(lower));
check('wider set: no tool names (informational)', hits.length === 0, hits.join(','));

// 3. Load order and benefit.
check('load order in the page body', /Run less first.*cap workers per run.*slot/is.test(flat(body)));
check('benefit sentence', /fewer slow and flaky reruns/.test(flat(page)));

// 4. Flaky handling: the map row says "slow or flaky"; does the page tell what to do with a flaky test?
check('page says what to do with a flaky test (informational)', /flak[ey]/i.test(body.replace(/slow or flaky/g, '')) , 'only the read-when line mentions flaky');

// 5. Setup and test review wiring.
for (const f of ['setup.md', 'testing-review.md']) {
  const t = flat(ref(f));
  check(`${f}: links testing-page.md`, t.includes('(testing-page.md)'));
  check(`${f}: writes <context>/testing.md`, t.includes('`<context>/testing.md`'));
  check(`${f}: map row text`, t.includes('"A test run is slow or flaky"'));
}
const setup = ref('setup.md');
const propose = setup.indexOf('3. **Propose.**');
const pageAt = setup.indexOf('**The testing page**');
const nextStep = setup.indexOf('\n4. ', propose);
check('setup: testing page is a drafted change inside the Propose step', propose > 0 && pageAt > propose && (nextStep < 0 || pageAt < nextStep), `propose@${propose} page@${pageAt} next@${nextStep}`);
check('setup: only when the project has none (re-run stays unchanged)', /The testing page\*\*, when the project has none/.test(setup));
check('testing-review: only when missing', /when the project has no testing page/.test(flat(ref('testing-review.md'))));

// 6. JOYCRAFT_EVIDENCE is real in the runtime the page keys on.
const evidence = readFileSync(join(root, 'payload/.joycraft/runtime/evidence.mjs'), 'utf8');
check('evidence.mjs sets JOYCRAFT_EVIDENCE=1 for the child', /JOYCRAFT_EVIDENCE: '1'/.test(evidence));

// 7. Default context path matches config.
const config = readFileSync(join(root, 'payload/.joycraft/runtime/config.mjs'), 'utf8');
check('config default paths.context is docs/context', /context: 'docs\/context'/.test(config));

// 8. Word count of the new reference.
console.log(`words testing-page.md: ${page.split(/\s+/).filter(Boolean).length}`);
process.exit(bad ? 1 : 0);
