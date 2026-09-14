# Execution plan: UCP + AP2 static readiness checker (MVP)

## Goal

Ship v0.1 of `ucp-ready`'s core engine: fetch a store's public `/.well-known/ucp`
discovery profile, validate it against the UCP specification (structural
fields, signing keys, schema-authority binding, service/capability
declarations), evaluate AP2 payment-mandate readiness, and produce a scored,
actionable CLI + library report.

## Scope

**In scope:**

- HTTPS fetch of `/.well-known/ucp` with a timeout and a bounded response size.
- Structural validation of the profile: `ucp.version` (`YYYY-MM-DD`),
  `ucp.services` (object), `ucp.payment_handlers` (object), `keys[]` (JWK Set
  per RFC 7517: `kid`/`kty`/`crv`/`use`/`alg`, restricted to EC P-256/P-384 and
  OKP Ed25519 per spec).
- Per-entry validation of declared services/capabilities: `version`
  (`YYYY-MM-DD`), `spec` (HTTPS URL), `schema` (HTTPS URL, required for
  rest/mcp/embedded transports), `transport` (enum), `endpoint` (HTTPS URL).
- The UCP schema-authority binding algorithm exactly as specified: parse the
  schema URL (WHATWG parser, HTTPS, no userinfo), require a registered domain
  host, reverse its labels into an `authority_prefix`, and require the
  capability name to equal that prefix or extend it with `.`-separated labels.
- AP2 readiness: detect the `dev.ucp.common.payment.ap2_mandate` capability,
  confirm it `extends: dev.ucp.shopping.checkout`, has a `YYYY-MM-DD` version,
  an authority-bound `schema` URL, and a non-empty `config.vp_formats_supported`.
- A `ReadinessReport` (overall verdict `ready` / `partial` / `not-ready`,
  per-check pass/fail/warn with a remediation message) exposed via a library
  function and a CLI command with a `--json` mode and CI-friendly exit codes.
- Fixture-based unit tests (valid profile, and one failure fixture per rule) —
  no live network calls in the test suite.

**Non-goals (this PR):**

- The Lodging and Food UCP verticals.
- Exercising a live checkout/order flow (Checkout/Order object runtime
  behavior, the quantity/amount integer-arithmetic rules) — those need an
  active agent session against the store, not a static discovery-document
  scan, and are a separate future capability.
- Cryptographic verification of live AP2 mandates (SD-JWT/JWS signature
  checks against a real transaction) — this PR only checks that AP2 support
  is *declared* correctly in the profile, not that a live mandate exchange is
  cryptographically sound.
- HTTP Message Signature verification of live requests.
- A hosted web UI, a GitHub Action wrapper, or an npm publish.

Source doc: none (no repo design doc exists yet — this plan is derived
directly from the UCP spec at https://ucp.dev/latest/specification/overview/
and the AP2 mandates extension at
https://ucp.dev/latest/specification/payment/extensions/ap2-mandates/).

## Risks

- UCP is a young, actively evolving spec (calendar-versioned, 99+ open issues
  upstream at the time of writing) — fields may shift. Every check cites the
  spec section it encodes in a code comment so a future spec-version bump is
  easy to audit against.
- AP2 mandate cryptographic verification is out of scope for this PR (see
  Non-goals); the AP2 check here is declaration-shape only, not a live-mandate
  trust check. This is called out in the CLI's report language so users don't
  read "AP2 ready" as "cryptographically verified."
- Schema-authority binding has a precise, easy-to-get-subtly-wrong algorithm;
  it gets dedicated fixture tests for both a matching and a mismatched
  authority.

## Implementation plan

### Phase 1: Core types & UCP profile fetcher

- Define `ReadinessReport`, `CheckResult`, `Severity` types.
- Implement fetching `/.well-known/ucp` (HTTPS-only, timeout via
  `AbortController`, bounded response size, JSON parse with typed errors).
- Fixture-backed tests: success, non-HTTPS rejection, timeout, oversized
  body, invalid JSON, non-200 response.

### Phase 2: UCP profile structural validation

- Validate top-level profile shape (`ucp.version`, `ucp.services`,
  `ucp.payment_handlers` presence/shape).
- Validate `keys[]` as an RFC 7517 JWK Set restricted to the spec's allowed
  key types.
- Fixture tests: valid profile, missing required fields, bad date format,
  disallowed key type.

### Phase 3: Schema-authority binding + capability/service declarations

- Implement the schema-authority binding algorithm.
- Validate declared services and capabilities against their per-entry
  required fields and transport-specific `schema` requirement.
- Fixture tests: matching authority, mismatched authority, missing schema on
  a REST-transport service, invalid transport enum value.

### Phase 4: AP2 readiness check + report assembly

- Implement the AP2 mandate-extension readiness check.
- Aggregate all individual `CheckResult`s into one `ReadinessReport` with an
  overall verdict.
- Fixture tests: full valid profile → `ready`; UCP-valid but no AP2 →
  `partial`; broken UCP structure → `not-ready`.

### Phase 5: CLI + library wiring

- Wire `checkReadiness(url)` as the public library entry point.
- Implement the `ucp-ready check <url>` CLI command (human-readable output,
  `--json` mode, exit code 0 for `ready`/non-zero otherwise).
- Update `README.md`'s "Status"/"What it will check" sections to reflect what
  now actually works.
- End-to-end test: spin up a local fixture HTTP server (`node:http`) serving
  a `/.well-known/ucp` document and invoke the built CLI against it, covering
  the `ready`/`partial`/`not-ready` paths.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Core types & UCP profile fetcher

- [x] 1.1 Define core types (`ReadinessReport`, `CheckResult`, `Severity`) — c4f5e05
- [x] 1.2 Implement HTTPS profile fetcher with timeout + size cap — c4f5e05
- [x] 1.3 Fetcher unit tests (success, non-HTTPS, timeout, oversized, invalid JSON, non-200) — c4f5e05

### Phase 2: UCP profile structural validation

- [x] 2.1 Validate top-level profile shape — 3bf25bc
- [x] 2.2 Validate `keys[]` JWK Set — 3bf25bc
- [x] 2.3 Structural validation unit tests — 3bf25bc

### Phase 3: Schema-authority binding + declarations

- [x] 3.1 Implement schema-authority binding algorithm — 3bf25bc
- [x] 3.2 Validate services/capabilities per-entry fields — 88ef451
- [x] 3.3 Authority binding + declaration unit tests — 88ef451

### Phase 4: AP2 readiness check + report assembly

- [ ] 4.1 Implement AP2 mandate-extension readiness check
- [ ] 4.2 Implement report aggregation (`buildReport`)
- [ ] 4.3 Report assembly unit tests (ready / partial / not-ready)

### Phase 5: CLI + library wiring

- [ ] 5.1 Public `checkReadiness(url)` library entry point
- [ ] 5.2 `ucp-ready check <url>` CLI command with `--json` and exit codes
- [ ] 5.3 README update reflecting real behavior
- [ ] 5.4 End-to-end CLI test against a local fixture server
