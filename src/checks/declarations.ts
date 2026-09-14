// Per-entry validation of ucp.services / ucp.capabilities declarations:
// https://ucp.dev/latest/specification/overview/
import { checkSchemaAuthority } from '../schema-authority.js';
import type { CheckResult } from '../types.js';
import { isCalendarVersion, isHttpsUrl, isPlainObject } from '../util.js';

const SERVICE_TRANSPORTS = ['rest', 'mcp', 'a2a', 'embedded'];

type DeclarationKind = 'service' | 'capability';

/**
 * Validates every version-declaration entry under `ucp.services` and
 * `ucp.capabilities`: required `version`/`spec` fields, service-only
 * `transport`/`endpoint`, and a `schema` URL that is authority-bound to the
 * declaring name (required for services except `a2a` transport, and always
 * required for capabilities).
 */
export function validateDeclarations(profile: unknown): CheckResult[] {
  if (!isPlainObject(profile) || !isPlainObject(profile.ucp)) return [];
  const ucp = profile.ucp;

  const results: CheckResult[] = [];
  if (isPlainObject(ucp.services)) {
    for (const [name, entries] of Object.entries(ucp.services)) {
      results.push(...validateNamedGroup('service', name, entries));
    }
  }
  if (isPlainObject(ucp.capabilities)) {
    for (const [name, entries] of Object.entries(ucp.capabilities)) {
      results.push(...validateNamedGroup('capability', name, entries));
    }
  }
  return results;
}

function validateNamedGroup(kind: DeclarationKind, name: string, entries: unknown): CheckResult[] {
  const id = `ucp.declarations.${kind}.${name}`;
  if (!Array.isArray(entries) || entries.length === 0) {
    return [
      {
        id,
        title: `\`${name}\` declares at least one version`,
        category: 'core',
        severity: 'fail',
        message: `${kind} "${name}" must be an array with at least one version declaration.`,
        remediation: `Declare "${name}": [{ "version": ..., "spec": ..., ... }].`,
      },
    ];
  }
  return entries.flatMap((entry, index) => validateEntry(kind, name, index, entry));
}

function validateEntry(kind: DeclarationKind, name: string, index: number, entry: unknown): CheckResult[] {
  const id = `ucp.declarations.${kind}.${name}[${index}]`;
  const label = `${kind} "${name}" (entry ${index})`;

  if (!isPlainObject(entry)) {
    return [
      { id, title: `${label} is a valid declaration`, category: 'core', severity: 'fail', message: `${label} must be an object.` },
    ];
  }

  const issues: string[] = [];

  if (!isCalendarVersion(entry.version)) {
    issues.push(`version must be a "YYYY-MM-DD" calendar version; got ${JSON.stringify(entry.version)}.`);
  }
  if (!isHttpsUrl(entry.spec)) {
    issues.push(`spec must be an HTTPS URL; got ${JSON.stringify(entry.spec)}.`);
  }

  let transport: string | undefined;
  if (kind === 'service') {
    if (typeof entry.transport === 'string' && SERVICE_TRANSPORTS.includes(entry.transport)) {
      transport = entry.transport;
    } else {
      issues.push(`transport must be one of ${SERVICE_TRANSPORTS.join(', ')}; got ${JSON.stringify(entry.transport)}.`);
    }
    if (!isHttpsUrl(entry.endpoint)) {
      issues.push(`endpoint must be an HTTPS URL; got ${JSON.stringify(entry.endpoint)}.`);
    }
  }

  // Spec: "schema (URL to JSON Schema, required for REST/MCP/embedded)".
  // Capabilities always require a schema.
  const schemaRequired = kind === 'capability' || transport !== 'a2a';
  if (schemaRequired || entry.schema !== undefined) {
    if (!isHttpsUrl(entry.schema)) {
      if (schemaRequired) issues.push(`schema must be an HTTPS URL; got ${JSON.stringify(entry.schema)}.`);
    } else {
      const authority = checkSchemaAuthority(name, entry.schema);
      if (!authority.ok) issues.push(authority.reason ?? 'schema is not authority-bound to its declared name.');
    }
  }

  if (issues.length > 0) {
    return [{ id, title: `${label} is a valid declaration`, category: 'core', severity: 'fail', message: issues.join(' ') }];
  }
  return [{ id, title: `${label} is a valid declaration`, category: 'core', severity: 'pass', message: `${label} declares a valid ${kind}.` }];
}
