/** Shared fixture profiles for check/report tests. Deep-clone before mutating. */

export function validKeys(): unknown[] {
  return [
    {
      kid: 'store-2026',
      kty: 'EC',
      crv: 'P-256',
      use: 'sig',
      alg: 'ES256',
      x: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
      y: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM',
    },
  ];
}

/** A fully valid UCP profile with checkout + AP2 mandate support declared. */
export function validProfile(): Record<string, unknown> {
  return {
    ucp: {
      version: '2026-08-25',
      services: {
        'dev.ucp.shopping.checkout': [
          {
            version: '2026-08-25',
            spec: 'https://ucp.dev/2026-08-25/specification/shopping/checkout',
            transport: 'rest',
            schema: 'https://ucp.dev/2026-08-25/schemas/shopping/checkout.json',
            endpoint: 'https://store.example/ucp/checkout',
          },
        ],
      },
      capabilities: {
        'dev.ucp.common.payment.ap2_mandate': [
          {
            version: '2026-08-25',
            spec: 'https://ucp.dev/2026-08-25/specification/payment/extensions/ap2-mandates',
            schema: 'https://ucp.dev/2026-08-25/schemas/common/payment_ap2_mandate.json',
            extends: 'dev.ucp.shopping.checkout',
            config: { vp_formats_supported: { 'dc+sd-jwt': {} } },
          },
        ],
      },
      payment_handlers: {},
    },
    keys: validKeys(),
  };
}

/** Deep clone via JSON round-trip, sufficient for these plain-data fixtures. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
