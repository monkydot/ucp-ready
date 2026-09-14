# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/) (pre-1.0: a breaking change bumps
the minor version, per semver's `0.y.z` convention).

## [Unreleased]

## [0.1.1] - 2026-09-14

### Added

- OSS contribution hygiene: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
  (Contributor Covenant), a `CHANGELOG.md` (this file), a CI/npm-version
  README badge, and links to roadmap issues for the documented Non-goals.

### Changed

- Clearer diagnostics when `/.well-known/ucp` doesn't return JSON: names
  the specific reason (redirected to an unrelated page, or the wrong
  content-type) instead of a bare "did not return valid JSON" — the common
  real-world case is a store with no UCP profile at all, whose server
  redirects unknown paths to its homepage.
- `VERSION` is now read from `package.json` at runtime instead of being
  hardcoded a second time in `src/index.ts`, removing a source of version
  drift at release time.

## [0.1.0] - 2026-09-14

### Added

- Core readiness-checking engine: fetches a store's `/.well-known/ucp`
  discovery profile over HTTPS (bounded timeout and response size) and
  validates it against the UCP specification — profile shape, `keys[]`
  (JWK Set, RFC 7517), the schema-authority binding algorithm, and
  per-entry service/capability declarations.
- AP2 payment-mandate readiness check: detects `dev.ucp.common.payment.ap2_mandate`,
  verifies it `extends`-es `dev.ucp.shopping.checkout` with a valid
  `vp_formats_supported` config.
- A scored, actionable `ready` / `partial` / `not-ready` report with
  remediation guidance per failed or warned check.
- `ucp-ready check <url> [--json]` CLI with CI-friendly exit codes, and a
  `checkReadiness(url)` library entry point.
- Project scaffold: TypeScript/ESM, Vitest, ESLint flat config, GitHub
  Actions CI.

### Fixed

- `package.json`'s `bin` field used a `./`-prefixed path (`./dist/cli.js`),
  which npm's publish validation silently strips, dropping the entire `bin`
  mapping — the published package would have installed with no `ucp-ready`
  command at all. Caught via `npm publish --dry-run` before the first
  release.

[Unreleased]: https://github.com/Monkydot/ucp-ready/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Monkydot/ucp-ready/releases/tag/v0.1.1
[0.1.0]: https://github.com/Monkydot/ucp-ready/releases/tag/v0.1.0
