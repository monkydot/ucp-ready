// UCP profile shape and signing keys:
// https://ucp.dev/latest/specification/overview/
import type { CheckResult } from '../types.js';
import { isCalendarVersion, isPlainObject } from '../util.js';

const ALLOWED_KTY_CRV: Record<string, string[]> = {
  EC: ['P-256', 'P-384'],
  OKP: ['Ed25519'],
};

/**
 * Validates the profile's top-level shape: a `ucp` object with `version`,
 * `services`, `payment_handlers` (all required — the latter two "must be
 * present even if empty"), an optional-but-recommended `capabilities`, and a
 * top-level `keys[]` JWK Set (RFC 7517) restricted to the spec's allowed key
 * types.
 */
export function validateProfileStructure(profile: unknown): CheckResult[] {
  if (!isPlainObject(profile) || !isPlainObject(profile.ucp)) {
    return [
      {
        id: 'ucp.profile.shape',
        title: 'Profile has a `ucp` member',
        category: 'core',
        severity: 'fail',
        message: 'The /.well-known/ucp document must be a JSON object with a required "ucp" member.',
        remediation: 'Publish { "ucp": { ... }, "keys": [...] } at /.well-known/ucp.',
      },
    ];
  }

  const ucp = profile.ucp;
  return [
    {
      id: 'ucp.profile.shape',
      title: 'Profile has a `ucp` member',
      category: 'core',
      severity: 'pass',
      message: 'Profile is a JSON object with a "ucp" member.',
    },
    checkVersion(ucp),
    checkRequiredObjectField(ucp, 'services'),
    checkRequiredObjectField(ucp, 'payment_handlers'),
    checkCapabilities(ucp),
    ...checkKeys(profile),
  ];
}

function checkVersion(ucp: Record<string, unknown>): CheckResult {
  if (isCalendarVersion(ucp.version)) {
    return {
      id: 'ucp.profile.version',
      title: '`ucp.version` is a valid calendar version',
      category: 'core',
      severity: 'pass',
      message: `ucp.version is "${ucp.version}".`,
    };
  }
  return {
    id: 'ucp.profile.version',
    title: '`ucp.version` is a valid calendar version',
    category: 'core',
    severity: 'fail',
    message: `ucp.version must be a "YYYY-MM-DD" calendar version; got ${JSON.stringify(ucp.version)}.`,
    remediation: 'Set ucp.version to the UCP protocol version this profile implements, e.g. "2026-08-25".',
  };
}

function checkRequiredObjectField(ucp: Record<string, unknown>, field: 'services' | 'payment_handlers'): CheckResult {
  const value = ucp[field];
  const id = `ucp.profile.${field}`;
  const label = `ucp.${field}`;
  if (isPlainObject(value)) {
    const count = Object.keys(value).length;
    return {
      id,
      title: `\`${label}\` is present`,
      category: 'core',
      severity: 'pass',
      message: `${label} is present (${count} ${count === 1 ? 'entry' : 'entries'}).`,
    };
  }
  return {
    id,
    title: `\`${label}\` is present`,
    category: 'core',
    severity: 'fail',
    message: `${label} must be present, even if empty ({}).`,
    remediation: `Add "${field}": {} to the ucp object if this store declares none yet.`,
  };
}

function checkCapabilities(ucp: Record<string, unknown>): CheckResult {
  if (!('capabilities' in ucp)) {
    return {
      id: 'ucp.profile.capabilities',
      title: '`ucp.capabilities` is declared',
      category: 'core',
      severity: 'warn',
      message: 'ucp.capabilities is not present. It is optional but recommended by the spec.',
      remediation: 'Declare ucp.capabilities so agents can discover extensions such as AP2 mandate support.',
    };
  }
  if (isPlainObject(ucp.capabilities)) {
    return {
      id: 'ucp.profile.capabilities',
      title: '`ucp.capabilities` is declared',
      category: 'core',
      severity: 'pass',
      message: 'ucp.capabilities is present.',
    };
  }
  return {
    id: 'ucp.profile.capabilities',
    title: '`ucp.capabilities` is declared',
    category: 'core',
    severity: 'fail',
    message: 'ucp.capabilities must be an object when present.',
  };
}

function checkKeys(profile: Record<string, unknown>): CheckResult[] {
  const keys = profile.keys;
  const id = 'ucp.profile.keys';
  const title = '`keys` is a valid JWK Set';

  if (!Array.isArray(keys)) {
    return [
      {
        id,
        title,
        category: 'core',
        severity: 'fail',
        message: 'The profile must publish a top-level "keys" array (a JWK Set, RFC 7517) for HTTP message signatures.',
        remediation: 'Add "keys": [...] with the store\'s signing keys.',
      },
    ];
  }

  if (keys.length === 0) {
    return [
      {
        id,
        title,
        category: 'core',
        severity: 'warn',
        message: 'keys[] is empty — no signing keys are published.',
        remediation: 'Publish at least one signing key if this store signs requests or authorizations.',
      },
    ];
  }

  const issues: string[] = [];
  keys.forEach((key, index) => {
    if (!isPlainObject(key)) {
      issues.push(`keys[${index}] is not an object.`);
      return;
    }
    const { kid, kty, crv, use, alg } = key;
    if (typeof kid !== 'string' || kid.length === 0) {
      issues.push(`keys[${index}].kid must be a non-empty string.`);
    }
    if (typeof kty !== 'string' || !(kty in ALLOWED_KTY_CRV)) {
      issues.push(`keys[${index}].kty must be one of ${Object.keys(ALLOWED_KTY_CRV).join(', ')}; got ${JSON.stringify(kty)}.`);
    } else if (typeof crv !== 'string' || !ALLOWED_KTY_CRV[kty]?.includes(crv)) {
      issues.push(`keys[${index}].crv must be one of ${ALLOWED_KTY_CRV[kty]?.join(', ')} for kty "${kty}"; got ${JSON.stringify(crv)}.`);
    }
    if (use !== 'sig') issues.push(`keys[${index}].use must be "sig"; got ${JSON.stringify(use)}.`);
    if (typeof alg !== 'string' || alg.length === 0) {
      issues.push(`keys[${index}].alg must be a non-empty string.`);
    }
  });

  if (issues.length > 0) {
    return [
      {
        id,
        title,
        category: 'core',
        severity: 'fail',
        message: `keys[] has ${issues.length} issue(s): ${issues.join(' ')}`,
        remediation:
          'Each key must be a JWK with kid, kty (EC or OKP), a matching crv (P-256/P-384 for EC, Ed25519 for OKP), use: "sig", and alg.',
      },
    ];
  }

  return [
    {
      id,
      title,
      category: 'core',
      severity: 'pass',
      message: `keys[] has ${keys.length} valid signing key(s).`,
    },
  ];
}
