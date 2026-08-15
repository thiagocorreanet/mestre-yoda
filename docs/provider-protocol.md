# Provider protocol

Protocol `1.0.0` lets a consumer use Mestre Yoda without depending on internal
modules. Every command accepts `--json` and answers with an envelope on
`stdout`. Failures are written to `stderr` and exit with code `2`.

## Handshake

```bash
mestre-yoda handshake --json
```

```json
{
  "protocolVersion": "1.0.0",
  "provider": "mestre-yoda",
  "providerVersion": "0.1.0",
  "command": "handshake",
  "status": "success",
  "result": {
    "protocolVersion": "1.0.0",
    "provider": "mestre-yoda",
    "providerVersion": "0.1.0",
    "mode": "read-only",
    "capabilities": [
      "profiles.list",
      "profiles.describe",
      "project.inspect",
      "project.recommend",
      "project.check",
      "project.plan",
      "catalog.validate"
    ],
    "mutations": false
  }
}
```

## Commands

| Command | Capability | Result |
|---|---|---|
| `profiles` | `profiles.list` | Identity, version, and digest of each profile |
| `describe <id>` | `profiles.describe` | The complete public manifest |
| `inspect --root <dir>` | `project.inspect` | Inventory and detected signals |
| `recommend --root <dir>` | `project.recommend` | Profiles ranked by confidence and conformity |
| `check <id> --root <dir>` | `project.check` | Compliance report |
| `plan <id> --root <dir>` | `project.plan` | Ordered tasks, without effects |
| `validate` | `catalog.validate` | Internal integrity of the catalog |

## Success envelope

```json
{
  "protocolVersion": "1.0.0",
  "provider": "mestre-yoda",
  "providerVersion": "0.1.0",
  "command": "check",
  "status": "success",
  "result": {}
}
```

## Failure envelope

```json
{
  "protocolVersion": "1.0.0",
  "provider": "mestre-yoda",
  "providerVersion": "0.1.0",
  "command": "check",
  "status": "failure",
  "error": {
    "code": "INVALID_REQUEST",
    "summary": "A description that is safe to log"
  }
}
```

## Compatibility

- an incompatible change requires a new major of `protocolVersion`;
- an incompatible change to a manifest, a report, or a plan requires a new major
  of `contractVersion` and a new schema;
- changing the content of a profile changes its version and its digest;
- consumers should reject unknown majors and digests they have not approved;
- local paths, error stacks, and project content are never part of a failure
  envelope.

## Read-only guarantee

In the current protocol, `handshake.result.mutations` is `false`,
`plan.readOnly` is `true`, and `plan.effects` is always empty. Consumers must
not infer operations from the text of `tasks`. Those tasks are guidance for
human review, not executable commands.
