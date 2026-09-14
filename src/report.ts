import type { CheckResult, ReadinessReport, Verdict } from './types.js';

/**
 * Aggregates individual checks into an overall verdict:
 * - any `core` `fail` → `not-ready` (the profile itself is broken);
 * - otherwise any `ap2` `fail`/`warn` → `partial` (UCP-valid, AP2 incomplete);
 * - otherwise → `ready`.
 */
export function buildReport(url: string, checks: CheckResult[]): ReadinessReport {
  const coreFailed = checks.some((check) => check.category === 'core' && check.severity === 'fail');
  const ap2Incomplete = checks.some(
    (check) => check.category === 'ap2' && (check.severity === 'fail' || check.severity === 'warn'),
  );

  let verdict: Verdict;
  if (coreFailed) {
    verdict = 'not-ready';
  } else if (ap2Incomplete) {
    verdict = 'partial';
  } else {
    verdict = 'ready';
  }

  return { url, verdict, checks, fetchedAt: new Date().toISOString() };
}
