/** Pass/warn/fail outcome of a single UCP/AP2 readiness check. */
export type Severity = 'pass' | 'warn' | 'fail';

/**
 * Which readiness tier a check belongs to. `core` checks gate the overall
 * UCP verdict; `ap2` checks gate AP2 payment-mandate readiness specifically
 * and never by themselves make a report `not-ready` (see buildReport).
 */
export type CheckCategory = 'core' | 'ap2';

export interface CheckResult {
  /** Stable, dotted id, e.g. "ucp.profile.version". Safe to key off in tooling. */
  id: string;
  title: string;
  category: CheckCategory;
  severity: Severity;
  message: string;
  /** Actionable guidance for a `warn`/`fail` result. Omitted for `pass`. */
  remediation?: string;
}

export type Verdict = 'ready' | 'partial' | 'not-ready';

export interface ReadinessReport {
  url: string;
  verdict: Verdict;
  checks: CheckResult[];
  fetchedAt: string;
}
