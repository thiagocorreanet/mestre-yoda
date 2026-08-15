import { cwd } from "node:process";

import {
  loadProfile,
  loadProfiles,
  validateCatalog,
} from "./core/catalog.mjs";
import { evaluate, plan, recommend } from "./core/evaluator.mjs";
import { inspectProject } from "./core/project.mjs";
import { envelope, failure, handshake } from "./core/protocol.mjs";
import { PROVIDER_VERSION } from "./version.mjs";

const HELP = `Mestre Yoda, a declarative Golden Path

Usage:
  mestre-yoda help
  mestre-yoda version [--json]
  mestre-yoda handshake [--json]
  mestre-yoda profiles [--json]
  mestre-yoda describe <profile> [--json]
  mestre-yoda inspect [--root <directory>] [--json]
  mestre-yoda recommend [--root <directory>] [--json]
  mestre-yoda check <profile> [--root <directory>] [--json]
  mestre-yoda plan <profile> [--root <directory>] [--json]
  mestre-yoda validate [--json]

Every command is read-only. Use --json for integration.`;

function parseArguments(values) {
  const options = { json: false, root: cwd() };
  const positionals = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--json") {
      options.json = true;
    } else if (value === "--root") {
      const root = values[index + 1];
      if (root === undefined || root.startsWith("--")) {
        throw new Error("The --root option requires a directory.");
      }
      options.root = root;
      index += 1;
    } else if (value === "--help" || value === "-h") {
      options.help = true;
    } else if (value.startsWith("--")) {
      throw new Error(`Unknown option: ${value}.`);
    } else {
      positionals.push(value);
    }
  }
  return { options, positionals };
}

function publicProfile(profile) {
  const { directory: ignoredDirectory, ...contract } = profile;
  void ignoredDirectory;
  return contract;
}

function human(command, result) {
  switch (command) {
    case "version":
      return `Mestre Yoda ${result.version}`;
    case "handshake":
      return [
        `Provider: ${result.provider}@${result.providerVersion}`,
        `Protocol: ${result.protocolVersion}`,
        `Mode: ${result.mode}`,
        `Capabilities: ${result.capabilities.join(", ")}`,
      ].join("\n");
    case "profiles":
      return result.length === 0
        ? "No profile available."
        : result
            .map(
              ({ id, name, version }) => `${id}@${version}: ${name}`,
            )
            .join("\n");
    case "describe":
      return [
        `${result.name} (${result.id}@${result.version})`,
        result.description,
        `Rules: ${String(result.rules.length)}`,
        `Digest: ${result.digest}`,
      ].join("\n");
    case "inspect":
      return [
        `Project: ${result.root}`,
        `Files: ${String(result.inventory.files)}`,
        ...Object.entries(result.signals).map(
          ([name, present]) => `${present ? "✓" : "·"} ${name}`,
        ),
      ].join("\n");
    case "recommend":
      return result.recommended === null
        ? "No profile recommended."
        : [
            `Profile: ${result.recommended.id}@${result.recommended.version}`,
            `Stack confidence: ${String(result.recommended.confidence)}%`,
            `Conformity: ${String(result.recommended.conformity)}%`,
          ].join("\n");
    case "check":
      return [
        `Profile: ${result.profile.id}@${result.profile.version}`,
        `Status: ${result.compliant ? "compliant" : "not compliant"}`,
        `Score: ${String(result.score)}%`,
        `Rules: ${String(result.summary.passed)} passed, ${String(result.summary.failed)} pending, ${String(result.summary.blocking)} blocking`,
        ...result.rules
          .filter(({ passed }) => !passed)
          .map(
            ({ id, severity, remediation }) =>
              `- [${severity}] ${id}: ${remediation}`,
          ),
      ].join("\n");
    case "plan":
      return [
        `Plan: ${result.planId}`,
        `Mode: ${result.readOnly ? "read-only" : "mutation"}`,
        `Tasks: ${String(result.summary.taskCount)}`,
        ...result.tasks.map(
          ({ order, severity, action }) =>
            `${String(order)}. [${severity}] ${action}`,
        ),
      ].join("\n");
    case "validate":
      return `Catalog is valid: ${String(result.profileCount)} profile(s).`;
    default:
      return JSON.stringify(result, null, 2);
  }
}

function assertPositionals(command, positionals, count) {
  if (positionals.length !== count) {
    throw new Error(
      `The ${command} command expects ${String(count)} positional argument(s).`,
    );
  }
}

async function execute(command, positionals, options) {
  if (options.help === true || command === "help") return HELP;
  switch (command) {
    case "version":
      assertPositionals(command, positionals, 0);
      return { version: PROVIDER_VERSION };
    case "handshake":
      assertPositionals(command, positionals, 0);
      return handshake();
    case "profiles": {
      assertPositionals(command, positionals, 0);
      return (await loadProfiles()).map(({ id, name, version, digest }) => ({
        id,
        name,
        version,
        digest,
      }));
    }
    case "describe":
      assertPositionals(command, positionals, 1);
      return publicProfile(await loadProfile(positionals[0]));
    case "inspect":
      assertPositionals(command, positionals, 0);
      return inspectProject(options.root);
    case "recommend": {
      assertPositionals(command, positionals, 0);
      const [profiles, inspection] = await Promise.all([
        loadProfiles(),
        inspectProject(options.root),
      ]);
      return recommend(profiles, inspection);
    }
    case "check": {
      assertPositionals(command, positionals, 1);
      const [profile, inspection] = await Promise.all([
        loadProfile(positionals[0]),
        inspectProject(options.root),
      ]);
      return evaluate(profile, inspection);
    }
    case "plan": {
      assertPositionals(command, positionals, 1);
      const [profile, inspection] = await Promise.all([
        loadProfile(positionals[0]),
        inspectProject(options.root),
      ]);
      const report = evaluate(profile, inspection);
      return plan(profile, inspection, report);
    }
    case "validate":
      assertPositionals(command, positionals, 0);
      return validateCatalog();
    default:
      throw new Error(`Unknown command: ${command}.`);
  }
}

async function main() {
  const raw = process.argv.slice(2);
  const command = raw[0] ?? "help";
  const jsonRequested = raw.includes("--json");
  try {
    const { options, positionals } = parseArguments(raw.slice(1));
    const result = await execute(command, positionals, options);
    if (typeof result === "string") {
      const output = options.json
        ? JSON.stringify(envelope(command, { help: result }), null, 2)
        : result;
      process.stdout.write(`${output}\n`);
      return;
    }
    const output = options.json ? envelope(command, result) : human(command, result);
    process.stdout.write(
      `${typeof output === "string" ? output : JSON.stringify(output, null, 2)}\n`,
    );
  } catch (error) {
    const summary = error instanceof Error ? error.message : String(error);
    if (jsonRequested) {
      process.stderr.write(
        `${JSON.stringify(failure(command, "INVALID_REQUEST", summary), null, 2)}\n`,
      );
    } else {
      process.stderr.write(`Error: ${summary}\n\n${HELP}\n`);
    }
    process.exitCode = 2;
  }
}

await main();
