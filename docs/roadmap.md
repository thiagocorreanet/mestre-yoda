# Roadmap

The roadmap keeps the Golden Path and the harness apart. Every phase ships with
a versioned contract, tests, and an explicit compatibility statement.

## 0.1, catalog and diagnosis

- declarative catalog;
- the .NET modular, React, and PostgreSQL profile;
- inspection, recommendation, check, and read-only plan;
- JSON protocol and digests;
- contract and safety tests.

## 0.2, extensible detection

- versioned detectors per technology;
- per-rule evidence, carrying origin and confidence;
- configurable exceptions with a justification and an expiry date;
- SARIF or an equivalent format for pipelines;
- compatibility tests across profile versions.

## 0.3, templates and preview

- versioned templates for a system, a module, an endpoint, and a feature;
- rendering into a temporary directory;
- a declarative diff that leaves the project untouched;
- validation of collisions, idempotency, and upgrades;
- still no direct mutation of the target repository.

## 1.0, safe integration with Kratos

- Kratos discovers the provider through `handshake`;
- selection and pinning of profile, version, and digest;
- a plan of typed operations with pre- and post-conditions;
- review and approval inside Kratos;
- transactional application, evidence, and rollback by Kratos;
- contract tests between the two repositories.

## Out of scope

- folding the Kratos engine into Mestre Yoda;
- installing harness skills into generated projects;
- executing code from the analyzed repository during inspection;
- adopting NestJS or Next.js;
- imposing Row Level Security without an explicit multi-tenancy decision.
