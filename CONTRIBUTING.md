# Contributing

Changes should be small, deterministic, and covered by the built-in Node.js
test runner. A profile change must explain whether it is compatible, requires a
profile version bump, or needs an upgrade recipe.

Before opening a pull request:

```bash
npm run verify
```

The provider is read-only in the `0.1.x` line. Do not add filesystem mutation
behind an existing command.
