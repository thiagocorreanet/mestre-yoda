import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);
const catalogRoot = join(repositoryRoot, "catalog");

export const SUPPORTED_SIGNALS = Object.freeze([
  "apiVersioning",
  "applicationLayer",
  "architectureTests",
  "authorizationPolicies",
  "defaultDeny",
  "domainLayer",
  "endpointLayer",
  "forbiddenNestAbsent",
  "forbiddenNextAbsent",
  "healthChecks",
  "infrastructureLayer",
  "integrationTests",
  "jwtBearer",
  "migrations",
  "modularDotnet",
  "openApi",
  "postgresEfCore",
  "problemDetails",
  "reactWeb",
  "structuredLogging",
  "unitTests",
]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function validateProfile(profile) {
  const errors = [];
  for (const field of ["contractVersion", "id", "name", "version"]) {
    if (typeof profile[field] !== "string" || profile[field].length === 0) {
      errors.push(`Profile field ${field} must be a non-empty string.`);
    }
  }
  for (const field of ["policies", "recipes", "gates"]) {
    if (!Array.isArray(profile[field]) || profile[field].length === 0) {
      errors.push(`Profile field ${field} must be a non-empty array.`);
    }
  }
  if (!Array.isArray(profile.rules) || profile.rules.length === 0) {
    errors.push("Profile rules must be a non-empty array.");
  } else {
    const identifiers = new Set();
    for (const rule of profile.rules) {
      if (typeof rule.id !== "string" || rule.id.length === 0) {
        errors.push("Every rule must have an identifier.");
      } else if (identifiers.has(rule.id)) {
        errors.push(`Duplicate rule identifier: ${rule.id}.`);
      } else {
        identifiers.add(rule.id);
      }
      if (!SUPPORTED_SIGNALS.includes(rule.signal)) {
        errors.push(`Rule ${String(rule.id)} uses an unsupported signal.`);
      }
      if (typeof rule.expected !== "boolean") {
        errors.push(`Rule ${String(rule.id)} has no boolean expectation.`);
      }
      if (!["blocking", "required", "recommended"].includes(rule.severity)) {
        errors.push(`Rule ${String(rule.id)} has an invalid severity.`);
      }
      if (typeof rule.remediation !== "string" || rule.remediation.length === 0) {
        errors.push(`Rule ${String(rule.id)} has no remediation.`);
      }
    }
  }
  return errors;
}

async function assertReferences(profileDirectory, profile) {
  const contents = {};
  const references = [
    ...(profile.policies ?? []),
    ...(profile.recipes ?? []),
    ...(profile.gates ?? []),
  ].sort((left, right) => (left < right ? -1 : 1));
  for (const reference of references) {
    if (
      typeof reference !== "string" ||
      !/^(?:policies|recipes|gates)\/[a-z0-9-]+\.json$/u.test(reference)
    ) {
      throw new Error(`Profile ${profile.id} has an unsafe reference.`);
    }
    contents[reference] = JSON.parse(
      await readFile(join(profileDirectory, reference), "utf8"),
    );
  }
  return contents;
}

export async function loadProfiles() {
  const profilesRoot = join(catalogRoot, "profiles");
  const directories = (await readdir(profilesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => (left.name < right.name ? -1 : 1));
  const profiles = [];
  for (const directory of directories) {
    const profileDirectory = join(profilesRoot, directory.name);
    const profile = JSON.parse(
      await readFile(join(profileDirectory, "manifest.json"), "utf8"),
    );
    const errors = validateProfile(profile);
    if (errors.length > 0) {
      throw new Error(`Invalid profile ${directory.name}: ${errors.join(" ")}`);
    }
    const references = await assertReferences(profileDirectory, profile);
    profiles.push(
      Object.freeze({
        ...profile,
        digest: `sha256:${digest({ manifest: profile, references })}`,
        directory: profileDirectory,
      }),
    );
  }
  return Object.freeze(profiles);
}

export async function loadProfile(identifier) {
  const profile = (await loadProfiles()).find(({ id }) => id === identifier);
  if (profile === undefined) {
    throw new Error(`Unknown Golden Path profile: ${identifier}.`);
  }
  return profile;
}

export async function validateCatalog() {
  const profiles = await loadProfiles();
  return {
    valid: true,
    profileCount: profiles.length,
    profiles: profiles.map(({ id, version, digest: profileDigest }) => ({
      id,
      version,
      digest: profileDigest,
    })),
  };
}
