import { describe, expect, it } from 'vitest';
import { fetchUcpProfile } from '../src/fetch-profile.js';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('fetchUcpProfile', () => {
  it('fetches and parses a valid profile from /.well-known/ucp', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://store.example/.well-known/ucp');
      return jsonResponse({ ucp: { version: '2026-08-25' } });
    }) as typeof fetch;

    const result = await fetchUcpProfile('https://store.example', { fetchImpl });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile).toEqual({ ucp: { version: '2026-08-25' } });
      expect(result.sourceUrl).toBe('https://store.example/.well-known/ucp');
    }
  });

  it('rejects non-HTTPS store URLs', async () => {
    const result = await fetchUcpProfile('http://store.example');
    expect(result).toEqual({
      ok: false,
      error: { type: 'non-https', message: expect.stringContaining('HTTPS') },
    });
  });

  it('rejects an unparseable store URL', async () => {
    const result = await fetchUcpProfile('not a url');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('invalid-url');
  });

  it('reports a timeout when the request does not settle in time', async () => {
    const fetchImpl = ((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;

    const result = await fetchUcpProfile('https://store.example', { fetchImpl, timeoutMs: 20 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('timeout');
  });

  it('reports a bounded-size failure for an oversized body', async () => {
    const fetchImpl = (async () => jsonResponse('x'.repeat(100))) as typeof fetch;
    const result = await fetchUcpProfile('https://store.example', { fetchImpl, maxBytes: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('too-large');
  });

  it('reports invalid JSON', async () => {
    const fetchImpl = (async () => new Response('not json', { status: 200 })) as typeof fetch;
    const result = await fetchUcpProfile('https://store.example', { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('invalid-json');
  });

  it('reports a non-2xx HTTP response', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 404 })) as typeof fetch;
    const result = await fetchUcpProfile('https://store.example', { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('http-error');
      if (result.error.type === 'http-error') expect(result.error.status).toBe(404);
    }
  });
});
