// UCP schema authority binding:
// https://ucp.dev/latest/specification/overview/
//
// "A declared schema URL's origin must match the namespace authority in its
// name." Validation algorithm: parse the schema URL (HTTPS, no userinfo);
// its host must be a registered domain (>= 2 labels, no IP literal); reverse
// the hostname's labels to form `authority_prefix`; the declared name must
// either equal that prefix or extend it as `authority_prefix.<labels>`.

export interface AuthorityBindingResult {
  ok: boolean;
  reason?: string;
}

export function checkSchemaAuthority(name: string, schemaUrl: string): AuthorityBindingResult {
  let url: URL;
  try {
    url = new URL(schemaUrl);
  } catch {
    return { ok: false, reason: `"${schemaUrl}" is not a valid URL.` };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: `schema URL must be HTTPS; got "${url.protocol}".` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'schema URL must not contain userinfo (username/password).' };
  }

  const hostname = url.hostname;
  if (isIpLiteral(hostname)) {
    return { ok: false, reason: `schema URL host "${hostname}" must be a registered domain name, not an IP literal.` };
  }

  const labels = hostname.split('.');
  if (labels.length < 2) {
    return { ok: false, reason: `schema URL host "${hostname}" must be a registered domain with at least two labels.` };
  }

  const authorityPrefix = [...labels].reverse().join('.');
  if (name === authorityPrefix || name.startsWith(`${authorityPrefix}.`)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `name "${name}" is not authority-bound to schema host "${hostname}" (expected "${authorityPrefix}" or "${authorityPrefix}.<labels>").`,
  };
}

function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith('[') || hostname.includes(':')) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}
