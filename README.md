# ucp-ready

Open-source readiness checker for **agentic commerce**. It audits a store's public
[UCP](https://ucp.dev/) (Universal Commerce Protocol) discovery profile — and,
where declared, its [AP2](https://ap2-protocol.org/) (Agent Payments Protocol)
mandate support — and reports how ready that store is for AI shopping agents to
browse, check out, and pay on a human's behalf.

Built and maintained by [Monkydot](https://github.com/Monkydot).

## Status

Early scaffold — the checks themselves are not implemented yet. See the
`runs/` directory for the active execution plan.

## Planned usage

```bash
npx ucp-ready check https://store.example.com
```

```ts
import { checkReadiness } from 'ucp-ready';

const report = await checkReadiness('https://store.example.com');
```

## What it will check

- **Discovery**: is `/.well-known/ucp` published, reachable over HTTPS, and valid JSON?
- **Profile shape**: required `ucp.version`, `ucp.services`, `ucp.payment_handlers`,
  and `keys[]` (JWK Set, RFC 7517) fields.
- **Schema authority binding**: every declared `schema`/`spec` URL must be
  authority-bound to the capability's namespace, per the UCP spec's binding
  algorithm.
- **Capability declarations**: services and capabilities (e.g. checkout,
  identity linking, order) declare valid transports, versions, and schemas.
- **AP2 readiness**: whether `dev.ucp.common.payment.ap2_mandate` is declared,
  correctly `extends`-ing `dev.ucp.shopping.checkout`, with a valid
  `vp_formats_supported` config.
- A scored, actionable report (`ready` / `partial` / `not-ready`) with
  remediation guidance per failed check.

## License

MIT
