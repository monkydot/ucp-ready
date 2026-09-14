import { execFile, execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as https from 'node:https';
import type { AddressInfo } from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clone, validProfile } from './fixtures.js';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve(process.cwd(), 'dist/cli.js');

interface Cert {
  key: string;
  cert: string;
}

/** Generates a throwaway self-signed cert via the system `openssl` so the
 * CLI (which requires HTTPS) can be exercised end-to-end against a local
 * fixture server. */
function generateSelfSignedCert(): Cert {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ucp-ready-cert-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    '1',
    '-nodes',
    '-subj',
    '/CN=localhost',
  ]);
  return { key: fs.readFileSync(keyPath, 'utf8'), cert: fs.readFileSync(certPath, 'utf8') };
}

function startFixtureServer(profile: unknown, cert: Cert): Promise<https.Server> {
  return new Promise((resolve) => {
    const server = https.createServer({ key: cert.key, cert: cert.cert }, (req, res) => {
      if (req.url === '/.well-known/ucp') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(profile));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function closeServer(server: https.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function runCli(args: string[]): Promise<{ code: number; stdout: string }> {
  try {
    const { stdout } = await execFileAsync('node', [CLI_PATH, ...args], {
      // Test-only: the fixture server uses a throwaway self-signed cert;
      // this relaxation is scoped to this spawned child process, never to
      // the library/CLI's own default behavior.
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    });
    return { code: 0, stdout };
  } catch (err) {
    const failure = err as { code?: number; stdout?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '' };
  }
}

describe('ucp-ready CLI (end-to-end)', () => {
  it('dist/cli.js has the executable bit set', () => {
    // tsc does not preserve/set the executable bit on emitted files, so a
    // packed npm tarball can silently ship a non-executable bin target —
    // `npx ucp-ready` then fails with "Permission denied" despite `node
    // dist/cli.js` working fine. Regression coverage for that failure.
    const mode = fs.statSync(CLI_PATH).mode;
    expect(mode & 0o111).not.toBe(0);
  });

  // Only `execFile`-ing the path directly (not `node <path>`) actually goes
  // through the OS's shebang + execute-bit resolution, the same way `npx`
  // and a global install invoke it. Not supported on Windows.
  it.skipIf(process.platform === 'win32')(
    'is directly executable via its shebang, the way npx invokes it',
    async () => {
      const { stdout } = await execFileAsync(CLI_PATH, ['--version']);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    },
  );

  let cert: Cert;
  let server: https.Server | undefined;

  beforeAll(() => {
    cert = generateSelfSignedCert();
  }, 20_000);

  afterEach(async () => {
    if (server) {
      await closeServer(server);
      server = undefined;
    }
  });

  it('exits 0 and reports READY for a fully valid profile', async () => {
    server = await startFixtureServer(validProfile(), cert);
    const { port } = server.address() as AddressInfo;

    const { code, stdout } = await runCli(['check', `https://127.0.0.1:${port}`]);

    expect(stdout).toContain('READY');
    expect(code).toBe(0);
  });

  it('exits non-zero and reports PARTIAL when AP2 is not declared', async () => {
    const profile = clone(validProfile()) as { ucp: { capabilities: Record<string, unknown> } };
    delete profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'];
    server = await startFixtureServer(profile, cert);
    const { port } = server.address() as AddressInfo;

    const { code, stdout } = await runCli(['check', `https://127.0.0.1:${port}`, '--json']);

    const report = JSON.parse(stdout) as { verdict: string };
    expect(report.verdict).toBe('partial');
    expect(code).toBe(1);
  });

  it('exits non-zero and reports NOT-READY for a broken profile', async () => {
    server = await startFixtureServer({ not: 'a ucp profile' }, cert);
    const { port } = server.address() as AddressInfo;

    const { code, stdout } = await runCli(['check', `https://127.0.0.1:${port}`]);

    expect(stdout).toContain('NOT-READY');
    expect(code).toBe(1);
  });
});
