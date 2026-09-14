import { describe, expect, it } from 'vitest';
import { checkAp2Readiness } from '../src/checks/ap2.js';
import { validateDeclarations } from '../src/checks/declarations.js';
import { validateProfileStructure } from '../src/checks/structure.js';
import { buildReport } from '../src/report.js';
import type { CheckResult } from '../src/types.js';
import { clone, validProfile } from './fixtures.js';

function runAllChecks(profile: unknown): CheckResult[] {
  return [...validateProfileStructure(profile), ...validateDeclarations(profile), ...checkAp2Readiness(profile)];
}

describe('buildReport', () => {
  it('is ready for a fully valid profile with AP2 declared', () => {
    const report = buildReport('https://store.example', runAllChecks(validProfile()));
    expect(report.verdict).toBe('ready');
    expect(report.url).toBe('https://store.example');
    expect(new Date(report.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  it('is partial when UCP is valid but AP2 is not declared', () => {
    const profile = clone(validProfile()) as { ucp: { capabilities: Record<string, unknown> } };
    delete profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'];
    const report = buildReport('https://store.example', runAllChecks(profile));
    expect(report.verdict).toBe('partial');
  });

  it('is not-ready when the core UCP structure is broken, regardless of AP2', () => {
    const profile = clone(validProfile()) as { ucp: Record<string, unknown> };
    delete profile.ucp.services;
    const report = buildReport('https://store.example', runAllChecks(profile));
    expect(report.verdict).toBe('not-ready');
  });

  it('is not-ready for a profile fetch failure represented as a single core fail check', () => {
    const report = buildReport('https://store.example', [
      { id: 'ucp.fetch', title: 'Profile is reachable', category: 'core', severity: 'fail', message: 'timed out' },
    ]);
    expect(report.verdict).toBe('not-ready');
  });
});
