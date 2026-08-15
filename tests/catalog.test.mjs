import assert from "node:assert/strict";
import { test } from "node:test";

import {
  loadProfile,
  loadProfiles,
  validateCatalog,
} from "../src/core/catalog.mjs";

test("the catalog loads valid and unique profiles", async () => {
  const profiles = await loadProfiles();
  assert.equal(profiles.length, 1);
  assert.equal(new Set(profiles.map(({ id }) => id)).size, profiles.length);
  assert.equal(profiles[0].id, "dotnet-modular-react-postgresql");
  assert.match(profiles[0].digest, /^sha256:[a-f0-9]{64}$/u);
});

test("the initial profile references policies, recipes, and gates", async () => {
  const profile = await loadProfile("dotnet-modular-react-postgresql");
  assert.equal(profile.policies.length, 6);
  assert.equal(profile.recipes.length, 4);
  assert.equal(profile.gates.length, 1);
  assert.ok(profile.rules.length >= 20);
});

test("catalog validation is deterministic", async () => {
  const first = await validateCatalog();
  const second = await validateCatalog();
  assert.deepEqual(first, second);
  assert.equal(first.valid, true);
});
