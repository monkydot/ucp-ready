// AP2 mandate extension readiness (declaration shape only — this does not
// verify a live, signed mandate; see the plan's Non-goals):
// https://ucp.dev/latest/specification/payment/extensions/ap2-mandates/
import type { CheckResult } from '../types.js';
import { isPlainObject } from '../util.js';

const AP2_CAPABILITY_NAME = 'dev.ucp.common.payment.ap2_mandate';
const REQUIRED_EXTENDS = 'dev.ucp.shopping.checkout';

/**
 * Checks whether the profile declares AP2 payment-mandate support: the
 * `dev.ucp.common.payment.ap2_mandate` capability, `extends`-ing the base
 * checkout capability, with a non-empty `config.vp_formats_supported`.
 *
 * This validates the *declaration*, not a live, cryptographically verified
 * mandate exchange — see the AP2 mandates extension spec for the runtime
 * `merchant_authorization`/`checkout_mandate` JWS/SD-JWT contract, which is
 * out of scope for a static discovery-document scan.
 */
export function checkAp2Readiness(profile: unknown): CheckResult[] {
  if (!isPlainObject(profile) || !isPlainObject(profile.ucp)) {
    return [notDeclared('Profile has no `ucp` object to inspect for AP2 support.')];
  }

  const capabilities = profile.ucp.capabilities;
  const entries = isPlainObject(capabilities) ? capabilities[AP2_CAPABILITY_NAME] : undefined;

  if (!Array.isArray(entries) || entries.length === 0) {
    return [notDeclared(`ucp.capabilities does not declare "${AP2_CAPABILITY_NAME}".`)];
  }

  return [
    {
      id: 'ap2.mandate.declared',
      title: 'AP2 mandate support is declared',
      category: 'ap2',
      severity: 'pass',
      message: `ucp.capabilities declares "${AP2_CAPABILITY_NAME}" (${entries.length} version(s)).`,
    },
    ...entries.flatMap((entry, index) => checkEntry(entry, index)),
  ];
}

function notDeclared(message: string): CheckResult {
  return {
    id: 'ap2.mandate.declared',
    title: 'AP2 mandate support is declared',
    category: 'ap2',
    severity: 'warn',
    message,
    remediation: `Declare "${AP2_CAPABILITY_NAME}" under ucp.capabilities, extending "${REQUIRED_EXTENDS}", to support AP2 agent payments.`,
  };
}

function checkEntry(entry: unknown, index: number): CheckResult[] {
  const id = `ap2.mandate[${index}]`;
  const title = 'AP2 mandate entry is a valid declaration';

  if (!isPlainObject(entry)) {
    return [{ id, title, category: 'ap2', severity: 'fail', message: `${AP2_CAPABILITY_NAME}[${index}] must be an object.` }];
  }

  const issues: string[] = [];

  if (entry.extends !== REQUIRED_EXTENDS) {
    issues.push(`extends must be "${REQUIRED_EXTENDS}"; got ${JSON.stringify(entry.extends)}.`);
  }

  const formats = isPlainObject(entry.config) ? entry.config.vp_formats_supported : undefined;
  if (!isPlainObject(formats) || Object.keys(formats).length === 0) {
    issues.push(
      'config.vp_formats_supported must be a non-empty object naming the supported verifiable-presentation formats (e.g. "dc+sd-jwt").',
    );
  }

  if (issues.length > 0) {
    return [{ id, title, category: 'ap2', severity: 'fail', message: issues.join(' ') }];
  }

  return [
    {
      id,
      title,
      category: 'ap2',
      severity: 'pass',
      message: `${AP2_CAPABILITY_NAME}[${index}] correctly extends "${REQUIRED_EXTENDS}" with supported VP formats: ${Object.keys(
        formats as Record<string, unknown>,
      ).join(', ')}.`,
    },
  ];
}
