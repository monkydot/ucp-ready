import { describe, expect, it } from 'vitest';
import { validateDeclarations } from '../../src/checks/declarations.js';
import { clone, validProfile } from '../fixtures.js';

function idFor(kind: 'service' | 'capability', name: string, index = 0) {
  return `ucp.declarations.${kind}.${name}[${index}]`;
}

describe('validateDeclarations', () => {
  it('passes the checkout service and AP2 capability in the valid fixture', () => {
    const results = validateDeclarations(validProfile());
    expect(results.every((r) => r.severity !== 'fail')).toBe(true);
    expect(results.find((r) => r.id === idFor('service', 'dev.ucp.shopping.checkout'))?.severity).toBe('pass');
    expect(
      results.find((r) => r.id === idFor('capability', 'dev.ucp.common.payment.ap2_mandate'))?.severity,
    ).toBe('pass');
  });

  it('fails when a service entry has an invalid transport', () => {
    const profile = clone(validProfile()) as {
      ucp: { services: { 'dev.ucp.shopping.checkout': Record<string, unknown>[] } };
    };
    profile.ucp.services['dev.ucp.shopping.checkout'][0]!.transport = 'carrier-pigeon';
    const results = validateDeclarations(profile);
    const result = results.find((r) => r.id === idFor('service', 'dev.ucp.shopping.checkout'));
    expect(result?.severity).toBe('fail');
    expect(result?.message).toContain('transport');
  });

  it('does not require a schema for a2a-transport services', () => {
    const profile = clone(validProfile()) as {
      ucp: { services: { 'dev.ucp.shopping.checkout': Record<string, unknown>[] } };
    };
    const entry = profile.ucp.services['dev.ucp.shopping.checkout'][0]!;
    entry.transport = 'a2a';
    delete entry.schema;
    const results = validateDeclarations(profile);
    expect(results.find((r) => r.id === idFor('service', 'dev.ucp.shopping.checkout'))?.severity).toBe('pass');
  });

  it('fails when a capability schema is not authority-bound to its name', () => {
    const profile = clone(validProfile()) as {
      ucp: { capabilities: { 'dev.ucp.common.payment.ap2_mandate': Record<string, unknown>[] } };
    };
    profile.ucp.capabilities['dev.ucp.common.payment.ap2_mandate'][0]!.schema =
      'https://not-ucp.example/schemas/payment_ap2_mandate.json';
    const results = validateDeclarations(profile);
    const result = results.find((r) => r.id === idFor('capability', 'dev.ucp.common.payment.ap2_mandate'));
    expect(result?.severity).toBe('fail');
    expect(result?.message).toContain('authority-bound');
  });

  it('fails when a named group is not a non-empty array', () => {
    const profile = clone(validProfile()) as { ucp: { services: Record<string, unknown> } };
    profile.ucp.services['dev.ucp.shopping.checkout'] = [];
    const results = validateDeclarations(profile);
    expect(results.find((r) => r.id === 'ucp.declarations.service.dev.ucp.shopping.checkout')?.severity).toBe('fail');
  });

  it('returns no results for a profile with no ucp member', () => {
    expect(validateDeclarations({})).toEqual([]);
  });
});
