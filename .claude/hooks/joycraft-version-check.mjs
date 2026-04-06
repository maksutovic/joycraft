// Joycraft version check — runs on Claude Code session start
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
try {
  const data = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
  const res = await fetch('https://registry.npmjs.org/joycraft/latest', { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const latest = (await res.json()).version;
    if (data.version !== latest) console.log('Joycraft ' + latest + ' available (you have ' + data.version + '). Run: npx joycraft upgrade');
  }
} catch {}
