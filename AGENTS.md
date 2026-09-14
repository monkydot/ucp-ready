# Agent instructions

## Project overview

`ucp-ready` is an open-source, MIT-licensed Node/TypeScript CLI and library that
audits whether an e-commerce store is ready for **agentic shopping** — it
checks a store's public [UCP](https://ucp.dev/) discovery profile
(`/.well-known/ucp`) and, where declared, its
[AP2](https://ap2-protocol.org/) payment-mandate support, then reports a
scored, actionable readiness result. Maintained by
[Monkydot](https://github.com/Monkydot). See `README.md` for the product
scope and `.ai/runs/` for active execution plans.

## Task-routing table

| When the task involves… | Read first | Key rules |
|---|---|---|
| The CLI entry point | `src/cli.ts` | Keep this a thin wrapper — it should call into `src/index.ts` exports rather than embed logic directly. |
| The public library API | `src/index.ts`, `package.json` (`exports` field) | Anything exported here is a protected surface — see `BACKWARD_COMPATIBILITY.md` before changing a signature or removing an export. |
| UCP/AP2 protocol logic (profile fetching, schema validation, capability checks) | `README.md` ("What it will check" section) for the intended scope; no implementation exists yet — TODO: update this row once `src/checks/` or equivalent lands. | Ground every check in the actual UCP (`https://ucp.dev/`) and AP2 (`https://ap2-protocol.org/`) specs, not assumptions — quote the spec section in code comments or PR descriptions when a check encodes a non-obvious rule (e.g. the schema-authority binding algorithm). |
| Tests | `test/` (Vitest, `*.test.ts`) | Every behavior change needs a matching test; use fixture UCP profiles (valid, missing keys, bad authority binding, etc.) rather than hitting real network endpoints in unit tests. |
| Build/type config | `tsconfig.json`, `package.json` (`scripts`) | ESM only (`"type": "module"`), strict TypeScript. `npm run build` both type-checks and emits `dist/`. |
| Lint rules | `eslint.config.js` | Flat config, `typescript-eslint` recommended rules. `npm run lint` must pass with zero warnings. |
| CI / pipeline behavior | `.ai/agentic.config.json`, `SDLC.md` | This is the source of truth for validation commands, label taxonomy, and the tracker/browser descriptors under `.ai/trackers/` and `.ai/browsers/`. |

## Validation gate

```bash
npm run lint
npm test
npm run build
```

All three must pass before a PR is review-ready. See `SDLC.md` for the full
ticket-to-merge process and `CODE_REVIEW.md` for review standards.

## Related documents

- `SDLC.md` — ticket flow, label state machine, QA gate, claim protocol.
- `CODE_REVIEW.md` — review priorities and repo-specific checks.
- `BACKWARD_COMPATIBILITY.md` — protected contract surfaces (CLI flags, library exports).
- `.ai/agentic.config.json` — machine-readable pipeline configuration.
