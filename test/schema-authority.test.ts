import { describe, expect, it } from 'vitest';
import { checkSchemaAuthority } from '../src/schema-authority.js';

describe('checkSchemaAuthority', () => {
  it('accepts a name equal to the reversed host', () => {
    const result = checkSchemaAuthority('dev.ucp', 'https://ucp.dev/schemas/root.json');
    expect(result.ok).toBe(true);
  });

  it('accepts a name that extends the reversed host with additional labels', () => {
    const result = checkSchemaAuthority(
      'dev.ucp.common.payment.ap2_mandate',
      'https://ucp.dev/2026-08-25/schemas/common/payment_ap2_mandate.json',
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a name that does not extend the reversed host', () => {
    const result = checkSchemaAuthority('dev.ucp.shopping.checkout', 'https://example.com/schemas/checkout.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('not authority-bound');
  });

  it('rejects a non-HTTPS schema URL', () => {
    const result = checkSchemaAuthority('dev.ucp', 'http://ucp.dev/schemas/root.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('HTTPS');
  });

  it('rejects a schema URL with userinfo', () => {
    const result = checkSchemaAuthority('dev.ucp', 'https://user:pass@ucp.dev/schemas/root.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('userinfo');
  });

  it('rejects an IPv4 literal host', () => {
    const result = checkSchemaAuthority('1.2.3.4', 'https://1.2.3.4/schemas/root.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('IP literal');
  });

  it('rejects an IPv6 literal host', () => {
    const result = checkSchemaAuthority('whatever', 'https://[::1]/schemas/root.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('IP literal');
  });

  it('rejects a single-label host', () => {
    const result = checkSchemaAuthority('localhost', 'https://localhost/schemas/root.json');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('at least two labels');
  });

  it('rejects an unparseable URL', () => {
    const result = checkSchemaAuthority('dev.ucp', 'not a url');
    expect(result.ok).toBe(false);
  });
});
