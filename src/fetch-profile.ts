// UCP discovery: https://ucp.dev/latest/specification/overview/
// "Well-Known Profile: /.well-known/ucp - Required publication point for
// business profile (GET, HTTPS only)."
const WELL_KNOWN_PATH = '/.well-known/ucp';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;

export interface FetchProfileOptions {
  timeoutMs?: number;
  maxBytes?: number;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export type FetchProfileError =
  | { type: 'invalid-url'; message: string }
  | { type: 'non-https'; message: string }
  | { type: 'network'; message: string }
  | { type: 'timeout'; message: string }
  | { type: 'http-error'; status: number; message: string }
  | { type: 'too-large'; message: string }
  | { type: 'invalid-json'; message: string };

export type FetchProfileResult =
  | { ok: true; profile: unknown; sourceUrl: string }
  | { ok: false; error: FetchProfileError };

/**
 * Fetches a store's `/.well-known/ucp` discovery profile.
 *
 * Treats the response as untrusted input: HTTPS is required, the request is
 * bounded by a timeout, and the body is bounded by a byte limit so a
 * malicious or misbehaving origin cannot hang the check or exhaust memory.
 */
export async function fetchUcpProfile(
  storeUrl: string,
  options: FetchProfileOptions = {},
): Promise<FetchProfileResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const doFetch = options.fetchImpl ?? fetch;

  let target: URL;
  try {
    target = new URL(WELL_KNOWN_PATH, storeUrl);
  } catch {
    return { ok: false, error: { type: 'invalid-url', message: `"${storeUrl}" is not a valid URL.` } };
  }

  if (target.protocol !== 'https:') {
    return {
      ok: false,
      error: { type: 'non-https', message: `UCP requires HTTPS; "${storeUrl}" resolved to "${target.protocol}".` },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await doFetch(target.toString(), {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    if (controller.signal.aborted) {
      return { ok: false, error: { type: 'timeout', message: `Timed out after ${timeoutMs}ms fetching ${target.toString()}.` } };
    }
    return { ok: false, error: { type: 'network', message: err instanceof Error ? err.message : String(err) } };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return {
      ok: false,
      error: { type: 'http-error', status: response.status, message: `${target.toString()} responded with HTTP ${response.status}.` },
    };
  }

  const body = await readBoundedText(response, maxBytes);
  if (body === undefined) {
    return { ok: false, error: { type: 'too-large', message: `Response body exceeded the ${maxBytes}-byte limit.` } };
  }

  try {
    return { ok: true, profile: JSON.parse(body) as unknown, sourceUrl: target.toString() };
  } catch {
    return { ok: false, error: { type: 'invalid-json', message: describeInvalidJson(response, target) } };
  }
}

/**
 * A body that fails to parse as JSON is usually a store with no UCP profile
 * at all, not an almost-valid document — most often the server redirected
 * `/.well-known/ucp` to an unrelated page (its homepage, a login page, a
 * catch-all 404) and that page's ordinary HTML got parsed as JSON. Naming
 * that case explicitly is much clearer than a bare "invalid JSON".
 */
function describeInvalidJson(response: Response, target: URL): string {
  const contentType = response.headers.get('content-type') ?? '';
  const describedType = contentType ? `"${contentType}"` : 'an unknown content type';

  let finalUrl: URL | undefined;
  try {
    finalUrl = response.url ? new URL(response.url) : undefined;
  } catch {
    finalUrl = undefined;
  }

  if (response.redirected && finalUrl && finalUrl.pathname !== target.pathname) {
    return (
      `${target.toString()} redirected to ${finalUrl.toString()} instead of returning a UCP profile ` +
      `(got ${describedType}, not JSON) — this store likely does not publish a UCP profile at this path.`
    );
  }

  if (!contentType.includes('json')) {
    return (
      `${target.toString()} responded with ${describedType} instead of JSON — ` +
      'this store likely does not publish a UCP profile at this path.'
    );
  }

  return `${target.toString()} did not return valid JSON.`;
}

/** Reads `response.body` up to `maxBytes`, returning `undefined` if exceeded. */
async function readBoundedText(response: Response, maxBytes: number): Promise<string | undefined> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? undefined : text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}
