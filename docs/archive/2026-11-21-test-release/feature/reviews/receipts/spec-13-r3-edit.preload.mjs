// Preload for the spec 13 round-3 probe: simulates a user saving a listed test while archive
// stages (PROBE_EDIT_AT=staging: at the move of the feature folder into the staging folder).
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const file = process.env.PROBE_EDIT_FILE;
if (process.env.PROBE_EDIT_AT === 'staging' && file) {
  const rename = fs.renameSync; let done = false;
  fs.renameSync = function (from, to) {
    if (!done && String(to).endsWith('/feature') && String(from).includes('/docs/features/')) {
      done = true;
      fs.appendFileSync(file, '// user edit saved while archive staged\n');
    }
    return rename.apply(this, arguments);
  };
  syncBuiltinESMExports();
}
