import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const cli = join(root, "bin", "mestre-yoda.mjs");

function run(...arguments_) {
  return spawnSync(process.execPath, [cli, ...arguments_], {
    cwd: root,
    encoding: "utf8",
  });
}

test("handshake publishes the read-only contract", () => {
  const execution = run("handshake", "--json");
  assert.equal(execution.status, 0, execution.stderr);
  const response = JSON.parse(execution.stdout);
  assert.equal(response.status, "success");
  assert.equal(response.result.mode, "read-only");
  assert.equal(response.result.mutations, false);
  assert.ok(response.result.capabilities.includes("project.plan"));
});

test("profiles and validate work through the JSON interface", () => {
  const profiles = run("profiles", "--json");
  const validation = run("validate", "--json");
  assert.equal(profiles.status, 0, profiles.stderr);
  assert.equal(validation.status, 0, validation.stderr);
  assert.equal(JSON.parse(profiles.stdout).result.length, 1);
  assert.equal(JSON.parse(validation.stdout).result.valid, true);
});

test("failures carry a stable envelope and a non-zero exit code", () => {
  const execution = run("describe", "missing-profile", "--json");
  assert.equal(execution.status, 2);
  const response = JSON.parse(execution.stderr);
  assert.equal(response.status, "failure");
  assert.equal(response.error.code, "INVALID_REQUEST");
  assert.doesNotMatch(response.error.summary, /\n\s+at /u);
});

test("help lists the main commands", () => {
  const execution = run("help");
  assert.equal(execution.status, 0, execution.stderr);
  assert.match(execution.stdout, /mestre-yoda check/u);
  assert.match(execution.stdout, /read-only/u);
});
