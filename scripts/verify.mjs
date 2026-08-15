import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProfiles, validateCatalog } from "../src/core/catalog.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const forbiddenDirectories = new Set(["dist", "node_modules", ".next"]);

async function walk(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const absolute = join(directory, entry.name);
    const path = relative(root, absolute).split(sep).join("/");
    if (entry.isDirectory()) {
      assert.equal(
        forbiddenDirectories.has(entry.name),
        false,
        `A generated directory must not be committed: ${path}`,
      );
      await walk(absolute, files);
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
}

const files = [];
await walk(root, files);
for (const path of files.filter((value) => value.endsWith(".json"))) {
  JSON.parse(await readFile(join(root, path), "utf8"));
}

const packageManifest = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
const profiles = await loadProfiles();
const validation = await validateCatalog();
assert.equal(packageManifest.name, "mestre-yoda");
assert.equal(packageManifest.version, "0.1.0");
assert.equal(validation.valid, true);
assert.equal(validation.profileCount, profiles.length);
assert.equal(new Set(profiles.map(({ id }) => id)).size, profiles.length);

const cli = join(root, "bin", "mestre-yoda.mjs");
for (const command of ["handshake", "profiles", "validate"]) {
  const execution = spawnSync(process.execPath, [cli, command, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(JSON.parse(execution.stdout).status, "success");
}

process.stdout.write(
  `Verification complete: ${String(files.length)} files, ${String(profiles.length)} profile, zero generated artifacts.\n`,
);
