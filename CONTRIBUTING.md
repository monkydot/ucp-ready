# Contributing to ucp-ready

Thanks for considering a contribution. This project audits stores against the
[UCP](https://ucp.dev/) and [AP2](https://ap2-protocol.org/) specifications,
so accuracy against those specs matters more than almost anything else here —
see "Grounding changes in the spec" below before touching a check.

## Getting started

```bash
git clone https://github.com/Monkydot/ucp-ready.git
cd ucp-ready
npm install
```

```bash
npm run lint     # eslint, zero warnings required
npm run build    # tsc — also the type-check
npm test         # vitest; the CLI e2e test needs a build first, hence the order below
```

Run the full gate, in this order, before opening a PR:

```bash
npm run lint && npm run build && npm test
```

(`npm test` includes an end-to-end test that spawns the compiled
`dist/cli.js`, so `npm run build` must run first.)

## Project layout

- `src/fetch-profile.ts` — fetches a store's `/.well-known/ucp` profile (HTTPS-only, timeout, bounded response size).
- `src/checks/structure.ts` — top-level profile shape and `keys[]` (JWK Set) validation.
- `src/schema-authority.ts` + `src/checks/declarations.ts` — the schema-authority binding algorithm and per-entry service/capability validation.
- `src/checks/ap2.ts` — AP2 mandate-extension readiness.
- `src/report.ts` — aggregates individual checks into a `ready`/`partial`/`not-ready` verdict.
- `src/index.ts` — the public library entry point (`checkReadiness`).
- `src/cli.ts` — the `ucp-ready` CLI.
- `test/` mirrors `src/`, plus `test/fixtures.ts` (shared fixture profiles) and `test/cli.e2e.test.ts` (end-to-end CLI test against a local HTTPS fixture server).

## Grounding changes in the spec

Every check exists to encode a specific rule from the UCP or AP2
specification. When you add or change a check:

- Cite or quote the relevant spec section in a code comment (see the existing
  files for the pattern — a link plus a short quote at the top of the
  module).
- Add fixture-based tests: at least one passing case and one failure case per
  rule, in `test/`. No live network calls in tests — see
  `test/cli.e2e.test.ts` for how the end-to-end test fakes an HTTPS origin
  with a local, throwaway self-signed certificate instead.
- If the spec is ambiguous or you're inferring behavior, say so explicitly in
  the PR description rather than presenting a guess as settled spec text.

## Security-sensitive areas

This tool fetches and parses untrusted, network-supplied JSON. See
[`CODE_REVIEW.md`](./CODE_REVIEW.md) for the specific rules (bounded fetch
size/timeout, no following of discovered URLs into new requests, no logging
of signing-key material). Changes to `src/fetch-profile.ts` in particular
get extra scrutiny.

## Pull requests

- Keep PRs scoped to one change; note explicitly if something is out of
  scope rather than folding it in.
- Update `CHANGELOG.md` under "Unreleased" for any user-facing change (new
  check, CLI flag, or behavior change).
- See [`BACKWARD_COMPATIBILITY.md`](./BACKWARD_COMPATIBILITY.md) before
  changing an exported library function or CLI flag — those are protected
  surfaces.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
