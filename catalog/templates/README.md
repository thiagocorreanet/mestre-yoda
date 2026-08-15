# Templates

This directory will hold generation templates only after the mutation contract
is approved. Version 0.1 is deliberately read-only: it describes, inspects,
recommends, checks, and plans, but it never copies files into the analyzed
project.

Future templates must be idempotent, versioned, and paired with an upgrade
strategy. Once Mestre Yoda is integrated with Kratos, no template will write
directly into a project. Each one will produce declarative operations for the
harness to validate and apply transactionally.
