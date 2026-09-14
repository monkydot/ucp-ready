# Backward compatibility

What this project treats as a protected contract surface, and how changes to
it must be handled. Checked by review skills; implementation skills warn
when a change violates this file.

## Protected surfaces

### 1. Published npm package: `ucp-ready`

- **Public library exports** (`package.json` `exports` field, currently just
  `.` → `dist/index.js` + `dist/index.d.ts`, backed by `src/index.ts`).
  Removing an export, changing an exported function's signature, or changing
  the shape of a returned object is a **breaking change**.
- **CLI binary** (`package.json` `bin.ucp-ready` → `dist/cli.js`, backed by
  `src/cli.ts`). Removing a flag, changing a flag's meaning, changing the exit
  code contract (0 = success, non-zero = failure/violations found), or
  changing the machine-readable report shape (once one exists, e.g. `--json`
  output) is a **breaking change**.
- **Node engine support** (`package.json` `engines.node`, currently `>=20`).
  Raising the minimum is a breaking change for consumers on older runtimes.

### 2. Required path for a breaking change

1. Call it out explicitly in the PR description under a "Breaking change"
   heading, with the old and new behavior.
2. Bump the **major** version per semver (this package is pre-1.0, so a
   breaking change bumps the minor version instead, per semver's `0.y.z`
   convention, until `1.0.0` ships).
3. Note the change in a changelog entry (once `CHANGELOG.md` exists —
   currently not yet created).
4. Prefer an additive/deprecation path when feasible: add the new shape
   alongside the old one, mark the old one deprecated in its docstring, and
   remove it in a later release rather than the same one.

## Not yet a protected surface

- The internal check/report logic (`src/` modules other than the two exports
  above) is free to change as long as the public exports and CLI contract
  keep their meaning. Once specific check modules exist, add them here if
  they grow their own external contract (e.g. a plugin API for custom
  checks).
- There is no stable on-disk config file format or database schema yet.

This file should be revisited once the package ships its first `1.0.0` and
once a JSON report format / plugin API is designed, since those will become
protected surfaces in their own right.
