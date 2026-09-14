# Code review standards

Applied by `om-code-review` (and therefore `om-auto-review-pr`) in addition to
its built-in checklist.

## Review priorities, in order

1. **Correctness against the spec.** This project's entire value is accurately
   reflecting the UCP (`https://ucp.dev/`) and AP2 (`https://ap2-protocol.org/`)
   specifications. A check that is subtly wrong (e.g. a mis-implemented
   schema-authority binding algorithm, a wrong required-field list) is worse
   than no check at all, because it produces a confidently wrong readiness
   verdict. Any PR touching a check must cite or quote the relevant spec
   section it encodes, and a reviewer should be able to trace each assertion
   back to the spec text.
2. **Security.** This tool fetches and parses untrusted, network-supplied JSON
   (a store's own `/.well-known/ucp` document) and may resolve schema/spec
   URLs it discovers there. Treat every fetched document as hostile input:
   - No `eval`/dynamic code execution on fetched content.
   - Bound response size and request timeouts on any network fetch.
   - Never follow a fetched URL to a non-HTTPS origin or to `localhost`/private
     IP ranges (SSRF) unless the target store URL was itself given explicitly
     by the caller.
   - Never log or echo signing-key material (the profile's `keys[]` JWK Set)
     beyond what's needed for the report.
3. **Contracts.** Changes to the CLI's flags/output shape or the library's
   exported API are breaking-change candidates — see
   `BACKWARD_COMPATIBILITY.md`.
4. **Quality.** Idiomatic, strict TypeScript; no `any` without justification;
   errors surfaced as typed results/exceptions rather than swallowed.

## Repo-specific checks

- All external HTTP fetches use `fetch` with an explicit timeout/abort and a
  bounded response size — no unbounded reads of attacker-controlled input.
- New protocol checks come with fixture-based unit tests in `test/`
  (valid case, and at least one failure case per rule) rather than relying on
  live network calls.
- `npm run lint` passes with zero warnings and `npm run build` (which
  type-checks under `strict`) passes before a PR is marked ready.
- CLI output changes (flags, exit codes, report format) are called out
  explicitly in the PR description, since scripts/CI may depend on them.

## Severity guidance

- **Blocker**: a check that misrepresents the UCP/AP2 spec (false positive or
  false negative in the readiness verdict), a security issue (SSRF, unbounded
  fetch, code execution on fetched content), or a breaking API/CLI change made
  without following `BACKWARD_COMPATIBILITY.md`.
- **Major**: missing tests for new/changed check logic, an unhandled network
  failure mode (timeout, malformed JSON, non-200 response) that would crash
  the CLI instead of reporting a clean failure.
- **Minor**: naming, structure, or documentation nits that don't affect
  correctness or the public contract.
