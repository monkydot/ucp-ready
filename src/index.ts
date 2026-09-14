import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkAp2Readiness } from './checks/ap2.js';
import { validateDeclarations } from './checks/declarations.js';
import { validateProfileStructure } from './checks/structure.js';
import { fetchUcpProfile, type FetchProfileOptions } from './fetch-profile.js';
import { buildReport } from './report.js';
import type { CheckResult, ReadinessReport } from './types.js';

/**
 * Read from package.json at runtime rather than hardcoded, so it can't
 * silently drift from the actual published version at each release.
 * package.json sits one level up from this compiled dist/index.js.
 */
export const VERSION: string = (
  JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {
    version: string;
  }
).version;

export { fetchUcpProfile } from './fetch-profile.js';
export type { FetchProfileError, FetchProfileOptions, FetchProfileResult } from './fetch-profile.js';
export { buildReport } from './report.js';
export type { CheckCategory, CheckResult, ReadinessReport, Severity, Verdict } from './types.js';

/**
 * Fetches `storeUrl`'s `/.well-known/ucp` profile and checks it against the
 * UCP specification and the AP2 mandate extension, returning a scored
 * readiness report. Never throws for a reachable-but-invalid or
 * unreachable profile — those become a `not-ready` report with an
 * explanatory check instead.
 */
export async function checkReadiness(storeUrl: string, options: FetchProfileOptions = {}): Promise<ReadinessReport> {
  const fetched = await fetchUcpProfile(storeUrl, options);

  if (!fetched.ok) {
    const check: CheckResult = {
      id: 'ucp.profile.fetch',
      title: 'Profile is published and reachable',
      category: 'core',
      severity: 'fail',
      message: fetched.error.message,
      remediation: 'Publish a valid UCP profile at https://<store>/.well-known/ucp.',
    };
    return buildReport(storeUrl, [check]);
  }

  const checks = [
    ...validateProfileStructure(fetched.profile),
    ...validateDeclarations(fetched.profile),
    ...checkAp2Readiness(fetched.profile),
  ];
  return buildReport(fetched.sourceUrl, checks);
}
