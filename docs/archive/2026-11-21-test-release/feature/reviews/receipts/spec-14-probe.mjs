// Reviewer probe for test-release spec 14 (tier text). Usage: node spec-14-probe.mjs <project-root>
import { execFileSync } from 'node:child_process';
const root = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
const files = ['.agents/skills/joycraft-implement/SKILL.md', '.agents/skills/joycraft-verify/SKILL.md', '.agents/skills/joycraft-decompose/SKILL.md', '.agents/skills/joycraft-testing/SKILL.md', '.claude/agents/joycraft-implementer.md', '.claude/agents/joycraft-reviewer.md', '.joycraft/references/testing.md', '.joycraft/references/workflow.md', '.joycraft/references/dispatch.md', '.joycraft/references/completion.md', '.joycraft/references/gates.md', '.joycraft/references/worktrees.md'];
const words = (rev, f) => { try { return git('show', `${rev}:payload/${f}`).split(/\s+/).filter(Boolean).length; } catch { return 0; } };
const total = (rev) => files.reduce((s, f) => s + words(rev, f), 0);
for (const rev of ['28ee6ed', '58f2c69', 'dcd5476']) console.log(`every-spec words at ${rev}: ${total(rev)}`);
console.log(`spec-14 every-spec growth (58f2c69 - 28ee6ed): ${total('58f2c69') - total('28ee6ed')}`);
for (const f of files) { const d = words('58f2c69', f) - words('28ee6ed', f); if (d) console.log(`  ${f}: ${d > 0 ? '+' : ''}${d}`); }
console.log('\n--- payload lines naming the gate / full suite / run the tests (HEAD) ---');
let out = '';
try { out = git('grep', '-n', '-i', '-E', 'project gate|full suite|run the tests|run all tests|pnpm test|pnpm verify|pnpm:verify|gate one time|gate before|run the gate|the gate runs|gateRuns|commands\\.focused|focused test', 'HEAD', '--', 'payload/'); } catch (e) { out = e.stdout || ''; }
console.log(out.replaceAll('HEAD:', ''));
