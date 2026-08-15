# Mestre Yoda

A declarative Golden Path for .NET, React, and PostgreSQL systems. The standard
lives in a versioned catalog, the evaluation is deterministic, and nothing is
ever written to the repository you point it at.

[![CI](https://github.com/thiagocorreanet/mestre-yoda/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagocorreanet/mestre-yoda/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 24](https://img.shields.io/badge/node-24-brightgreen.svg)](https://nodejs.org)
[![Runtime dependencies: 0](https://img.shields.io/badge/runtime%20dependencies-0-success.svg)](package.json)

Most teams keep their architecture standard in a wiki page, and then have no
way to tell whether any repository still follows it. Mestre Yoda turns that
standard into a catalog a machine can read, points it at a repository, and
answers three questions with evidence rather than opinion.

Which Golden Path fits this repository? How far is the code from that standard,
and which gaps block a release? What is the ordered set of changes that would
close the gap?

## Why it exists

An architecture standard usually fails in one of two ways. It drifts, because
nothing checks it. Or somebody wires it into a generator that rewrites your
repository, and after the first bad run nobody trusts it near production code.

Mestre Yoda keeps those concerns apart. The standard is a signed, versioned
catalog. The evaluation reads the repository and reports what it found.
Deciding to apply a change stays with a human, or later with an orchestrator
that has explicitly approved the plan.

## What it does today

Version `0.1.0` is the read-only phase, and it is finished:

- a versioned catalog of Golden Paths, with policies, recipes, and quality gates;
- the `dotnet-modular-react-postgresql` profile, carrying 21 rules that cover
  architecture, API, security, database, frontend, testing, and operations;
- deterministic inspection of a repository through 21 objective signals;
- profile recommendation ranked by stack confidence and by conformity;
- a compliance report with a weighted score and an explicit list of blocking failures;
- a remediation plan of ordered tasks that produces no file effects;
- a stable JSON protocol (`1.0.0`) for programmatic consumers;
- SHA-256 digests over every profile and every plan;
- zero runtime dependencies, and no build output committed to the repository.

It does not generate code, does not use NestJS or Next.js, and never executes
anything from the repository it reads.

## Install

Requires Node.js 24.

```bash
git clone https://github.com/thiagocorreanet/mestre-yoda.git
cd mestre-yoda
npm ci
npm run verify
```

To expose the command globally from the clone:

```bash
npm install --global .
mestre-yoda handshake
```

You can also run it straight from the clone with `node bin/mestre-yoda.mjs`. The
package installs nothing into the project you analyze.

## Quick start

Point it at any repository and ask what it sees:

```bash
mestre-yoda inspect    --root /path/to/project
mestre-yoda recommend  --root /path/to/project
mestre-yoda check dotnet-modular-react-postgresql --root /path/to/project
mestre-yoda plan  dotnet-modular-react-postgresql --root /path/to/project
```

A compliance report reads like this:

```text
Profile: dotnet-modular-react-postgresql@1.0.0
Status: not compliant
Score: 77%
Rules: 16 passed, 5 pending, 2 blocking
- [blocking] api.version-v1: Version public routes under /api/v1 and document the evolution policy.
- [blocking] security.default-deny: Set an authenticated FallbackPolicy and grant anonymous access only where it is declared.
- [required] database.migrations: Add versioned migrations and validate them before deployment.
- [required] quality.integration-tests: Add integration tests for the API and for PostgreSQL persistence.
- [recommended] quality.architecture-tests: Add architecture tests that prevent unwanted dependencies between layers.
```

The plan turns those failures into ordered tasks, blocking ones first, and
stamps the result with a digest so you can store it as evidence:

```text
Plan: sha256:e58b0438750d3f3a8be336f57f383f24d36c7b67c3028912428be06f53f7aa84
Mode: read-only
Tasks: 5
1. [blocking] Version public routes under /api/v1 and document the evolution policy.
2. [blocking] Set an authenticated FallbackPolicy and grant anonymous access only where it is declared.
...
```

## Commands

| Command | What it answers |
|---|---|
| `handshake` | Protocol version, mode, and declared capabilities |
| `profiles` | Available Golden Paths with version and digest |
| `describe <id>` | The full public manifest of one profile |
| `inspect --root <dir>` | File inventory and the signals detected |
| `recommend --root <dir>` | Profiles ranked by stack confidence and conformity |
| `check <id> --root <dir>` | Compliance report, weighted score, blocking failures |
| `plan <id> --root <dir>` | Ordered remediation tasks, always with `effects: []` |
| `validate` | Internal integrity of the catalog |

Add `--json` to any command to get the integration envelope instead of human
output. Failures go to `stderr` with exit code `2`, and they never carry local
paths, stack traces, or content from the project.

## The initial profile

`dotnet-modular-react-postgresql` prescribes:

- a modular monolith on ASP.NET Core .NET 10;
- modules split into Domain, Application, and Infrastructure;
- thin controllers or endpoints, with use cases stated explicitly;
- REST under `/api/v1`, plus OpenAPI and Problem Details;
- JWT Bearer/OIDC, policy-based authorization, and default deny;
- EF Core, PostgreSQL, and versioned migrations;
- React on the web, without Next.js;
- unit, integration, and architecture tests;
- health checks, correlation, and structured logging;
- SignalR only for real-time updates, never as a stand-in for the command API.

PostGIS, Row Level Security, Flutter, and external identity providers are
optional capabilities. Row Level Security should be enabled only after somebody
has actually decided on a multi-tenancy model.

## The read-only guarantee

The guarantee is mechanical rather than editorial:

- `handshake.result.mutations` is `false`;
- `plan.readOnly` is `true`, and `plan.effects` is always empty;
- the inspector refuses symbolic links, skips dependency and build directories,
  and caps how many files and bytes it will read;
- no file from the analyzed repository is ever imported or executed;
- a test in `tests/boundary.test.mjs` fails the build if any of that changes.

Tasks in a plan are written for a human reviewer. Consumers must not read
executable operations out of their text.

## Determinism

The same repository against the same catalog always produces the same bytes.
Directories, files, rules, and tasks all have a stable ordering. Every profile
carries a SHA-256 digest over its canonical content, and every plan carries a
SHA-256 identifier computed over the profile, the signals, and the tasks. That
is what makes a report safe to store as evidence and safe to diff over time.

## Roadmap

Version 0.1 delivers the catalog, inspection, recommendation, check, and the
read-only plan. Version 0.2 adds versioned detectors, per-rule evidence,
justified exceptions with an expiry date, and SARIF output for pipelines.
Version 0.3 adds versioned templates rendered into a temporary directory with a
declarative diff, still without touching the target repository. Version 1.0
introduces typed operations with pre- and post-conditions, so an orchestrator
can pin a profile digest, review a plan, and apply it transactionally.

Details in [the roadmap](docs/roadmap.md).

## Documentation

- [Architecture](docs/architecture.md): components, evaluation flow, integrity boundary
- [Provider protocol](docs/provider-protocol.md): envelopes, capabilities, compatibility rules
- [Profile reference](docs/profile-dotnet-react-postgresql.md): the .NET, React, and PostgreSQL standard
- [Roadmap](docs/roadmap.md): phases, and what is deliberately out of scope
- [Wiki](https://github.com/thiagocorreanet/mestre-yoda/wiki): guides, rule reference, integration walkthroughs

## Contributing

Changes should be small, deterministic, and covered by the built-in Node.js test
runner. Run `npm run verify` before opening a pull request. Profiles, rules,
recipes, and schemas are public contracts, so they need compatible versioning.
See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE).
