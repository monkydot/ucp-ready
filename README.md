# ucp-ready

[![CI](https://github.com/Monkydot/ucp-ready/actions/workflows/ci.yml/badge.svg)](https://github.com/Monkydot/ucp-ready/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Open-source readiness checker for **agentic commerce**. It audits a store's public
[UCP](https://ucp.dev/) (Universal Commerce Protocol) discovery profile — and,
where declared, its [AP2](https://ap2-protocol.org/) (Agent Payments Protocol)
mandate support — and reports how ready that store is for AI shopping agents to
browse, check out, and pay on a human's behalf.

Built and maintained by [Monkydot](https://github.com/Monkydot).

## Status

v0.1: static discovery-profile checks are implemented — this audits what a
store *publishes*, not a live checkout/payment flow. See "What it checks"
below for the exact scope, and `.ai/runs/` for the active execution plan.

## Usage

```bash
npx ucp-ready check https://store.example.com
# or, machine-readable:
npx ucp-ready check https://store.example.com --json
```

> Not on npm yet? Until the first npm release ships, install from source:
> `git clone https://github.com/Monkydot/ucp-ready.git && cd ucp-ready && npm install && npm run build`,
> then run `node dist/cli.js check <url>`.

Exit code is `0` when the verdict is `ready`, non-zero (`1`) for `partial` or
`not-ready` — safe to use as a CI gate.

```ts
import { checkReadiness } from 'ucp-ready';

const report = await checkReadiness('https://store.example.com');
// { url, verdict: 'ready' | 'partial' | 'not-ready', checks: CheckResult[], fetchedAt }
```

## What it checks

- **Discovery**: is `/.well-known/ucp` published, reachable over HTTPS, and valid JSON?
- **Profile shape**: required `ucp.version`, `ucp.services`, `ucp.payment_handlers`,
  and `keys[]` (JWK Set, RFC 7517) fields.
- **Schema authority binding**: every declared `schema` URL must be
  authority-bound to its capability/service name, per the UCP spec's binding
  algorithm.
- **Service & capability declarations**: each entry declares a valid
  `version`, `spec`, `schema`, and (for services) `transport`/`endpoint`.
- **AP2 readiness**: whether `dev.ucp.common.payment.ap2_mandate` is declared,
  correctly `extends`-ing `dev.ucp.shopping.checkout`, with a non-empty
  `vp_formats_supported` config.
- A scored, actionable verdict (`ready` / `partial` / `not-ready`) with
  remediation guidance per failed or warned check.

`partial` means the core UCP profile is valid but AP2 payment-mandate support
is missing or incomplete; `not-ready` means the UCP profile itself is missing
or broken.

**Not yet covered** (see the plan's Non-goals): the Lodging/Food UCP
verticals, exercising a live checkout/order flow, and cryptographic
verification of a live AP2 mandate — this tool checks that AP2 support is
*declared* correctly, not that a real transaction's signature verifies.

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for
the dev setup, validation gate, and the spec-grounding rule every check
follows. This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
See [`CHANGELOG.md`](./CHANGELOG.md) for release history.

## License

MIT
