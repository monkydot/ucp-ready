import { describe, expect, it } from 'vitest';
import { checkAp2Readiness } from '../../src/checks/ap2.js';
import { clone, validProfile } from '../fixtures.js';

describe('checkAp2Readiness', () => {
  it('passes for the valid fixture', () => {
    const results = checkAp2Readiness(validProfile());
    expect(results.every((r) => r.severity === 'pass')).toBe(true);
    expect(results.find((r) => r.id === 'ap2.mandate.declared')?.severity).toBe('pass');
    expect(results.find((r) => r.id === 'ap2.mandate[0]')?.severity).toBe('pass');
  });

  it('warns when AP2 is not declared at all', () => {
    const profile = clone(validProfile()) as { ucp: { capabilities: Record<string, unknown> } };
    delete profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'];
    const results = checkAp2Readiness(profile);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'ap2.mandate.declared', severity: 'warn' });
  });

  it('warns when there is no ucp.capabilities object at all', () => {
    const profile = clone(validProfile()) as { ucp: Record<string, unknown> };
    delete profile.ucp.capabilities;
    const results = checkAp2Readiness(profile);
    expect(results[0]?.severity).toBe('warn');
  });

  it('fails when the entry does not extend the checkout capability', () => {
    const profile = clone(validProfile()) as {
      ucp: { capabilities: { 'dev.ucp.common.payment.ap2_mandate': Record<string, unknown>[] } };
    };
    profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'][0]!.extends = 'dev.ucp.shopping.something-else';
    const results = checkAp2Readiness(profile);
    expect(results.find((r) => r.id === 'ap2.mandate[0]')?.severity).toBe('fail');
  });

  it('fails when config.vp_formats_supported is missing or empty', () => {
    const profile = clone(validProfile()) as {
      ucp: { capabilities: { 'dev.ucp.common.payment.ap2_mandate': Record<string, unknown>[] } };
    };
    profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'][0]!.config = { vp_formats_supported: {} };
    const results = checkAp2Readiness(profile);
    const result = results.find((r) => r.id === 'ap2.mandate[0]');
    expect(result?.severity).toBe('fail');
    expect(result?.message).toContain('vp_formats_supported');
  });
});
