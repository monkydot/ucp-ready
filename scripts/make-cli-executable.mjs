// tsc does not preserve or set the executable bit on emitted files, so the
// packed npm tarball stored dist/cli.js as non-executable — `npx ucp-ready`
// failed with "Permission denied" on install. Run after every build so the
// bit is always set going into `npm publish` and local/CI runs alike.
import { chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
chmodSync(join(scriptDir, '..', 'dist', 'cli.js'), 0o755);
