import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("the package declares no NestJS, Next.js, or runtime dependencies", async () => {
  const manifest = JSON.parse(await readFile(`${root}/package.json`, "utf8"));
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.devDependencies, undefined);
  assert.doesNotMatch(JSON.stringify(manifest), /@nestjs|"next"/u);
});

test("the protocol and the plan preserve the Kratos boundary", async () => {
  const protocol = await readFile(`${root}/src/core/protocol.mjs`, "utf8");
  const evaluator = await readFile(`${root}/src/core/evaluator.mjs`, "utf8");
  assert.match(protocol, /mutations: false/u);
  assert.match(evaluator, /readOnly: true/u);
  assert.match(evaluator, /effects: Object\.freeze\(\[\]\)/u);
});
