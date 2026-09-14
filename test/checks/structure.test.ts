import { describe, expect, it } from 'vitest';
import { validateProfileStructure } from '../../src/checks/structure.js';
import { clone, validProfile } from '../fixtures.js';

function severityOf(results: ReturnType<typeof validateProfileStructure>, id: string) {
  return results.find((r) => r.id === id)?.severity;
}

describe('validateProfileStructure', () => {
  it('passes every check for a fully valid profile', () => {
    const results = validateProfileStructure(validProfile());
    expect(results.every((r) => r.severity !== 'fail')).toBe(true);
    expect(severityOf(results, 'ucp.profile.shape')).toBe('pass');
    expect(severityOf(results, 'ucp.profile.version')).toBe('pass');
    expect(severityOf(results, 'ucp.profile.services')).toBe('pass');
    expect(severityOf(results, 'ucp.profile.payment_handlers')).toBe('pass');
    expect(severityOf(results, 'ucp.profile.capabilities')).toBe('pass');
    expect(severityOf(results, 'ucp.profile.keys')).toBe('pass');
  });

  it('fails fast on a profile with no `ucp` member', () => {
    const results = validateProfileStructure({ notUcp: true });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'ucp.profile.shape', severity: 'fail' });
  });

  it('fails on a malformed ucp.version', () => {
    const profile = clone(validProfile()) as { ucp: Record<string, unknown> };
    profile.ucp.version = '08-25-2026';
    const results = validateProfileStructure(profile);
    expect(severityOf(results, 'ucp.profile.version')).toBe('fail');
  });

  it('fails when ucp.services is missing', () => {
    const profile = clone(validProfile()) as { ucp: Record<string, unknown> };
    delete profile.ucp.services;
    const results = validateProfileStructure(profile);
    expect(severityOf(results, 'ucp.profile.services')).toBe('fail');
  });

  it('warns when ucp.capabilities is absent', () => {
    const profile = clone(validProfile()) as { ucp: Record<string, unknown> };
    delete profile.ucp.capabilities;
    const results = validateProfileStructure(profile);
    expect(severityOf(results, 'ucp.profile.capabilities')).toBe('warn');
  });

  it('fails on a disallowed key type', () => {
    const profile = clone(validProfile()) as { keys: Record<string, unknown>[] };
    profile.keys[0]!.kty = 'RSA';
    const results = validateProfileStructure(profile);
    expect(severityOf(results, 'ucp.profile.keys')).toBe('fail');
  });

  it('warns on an empty keys array', () => {
    const profile = clone(validProfile()) as { keys: unknown[] };
    profile.keys = [];
    const results = validateProfileStructure(profile);
    expect(severityOf(results, 'ucp.profile.keys')).toBe('warn');
  });
});
