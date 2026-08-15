import { lstat, readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".idea",
  ".next",
  ".vscode",
  "bin",
  "coverage",
  "dist",
  "node_modules",
  "obj",
]);
const TEXT_EXTENSIONS = new Set([
  ".cs",
  ".csproj",
  ".json",
  ".js",
  ".jsx",
  ".md",
  ".mjs",
  ".props",
  ".sln",
  ".toml",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_CORPUS_BYTES = 8 * 1024 * 1024;

function portable(path) {
  return path.split(sep).join("/");
}

async function walk(root, directory, files, skippedSymlinks) {
  const entries = (await readdir(directory, { withFileTypes: true })).sort(
    (left, right) => (left.name < right.name ? -1 : 1),
  );
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    const path = portable(relative(root, absolute));
    if (entry.isSymbolicLink()) {
      skippedSymlinks.push(path);
      continue;
    }
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        await walk(root, absolute, files, skippedSymlinks);
      }
      continue;
    }
    if (entry.isFile()) files.push(path);
    if (files.length > MAX_FILES) {
      throw new Error(`Project inventory exceeds ${String(MAX_FILES)} files.`);
    }
  }
}

async function corpus(root, files) {
  const documents = [];
  let bytes = 0;
  for (const path of files) {
    if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const absolute = join(root, path);
    const details = await stat(absolute);
    if (details.size > MAX_FILE_BYTES || bytes + details.size > MAX_CORPUS_BYTES) {
      continue;
    }
    const content = await readFile(absolute, "utf8");
    if (content.includes("\0")) continue;
    bytes += details.size;
    documents.push({ path, content });
  }
  return { documents, bytes };
}

function packageDependencies(documents) {
  const dependencies = new Set();
  for (const { path, content } of documents) {
    if (!path.endsWith("package.json")) continue;
    try {
      const manifest = JSON.parse(content);
      for (const section of [
        manifest.dependencies,
        manifest.devDependencies,
        manifest.peerDependencies,
      ]) {
        if (section !== null && typeof section === "object") {
          Object.keys(section).forEach((name) => dependencies.add(name));
        }
      }
    } catch {
      // A malformed package manifest is evidence of absence, never code to run.
    }
  }
  return dependencies;
}

function containsPath(files, pattern) {
  return files.some((path) => pattern.test(path));
}

function containsText(documents, pattern, extension = null) {
  return documents.some(
    ({ path, content }) =>
      (extension === null || path.endsWith(extension)) && pattern.test(content),
  );
}

function signalMap(files, documents) {
  const dependencies = packageDependencies(documents);
  const csharp = documents.filter(({ path }) => path.endsWith(".cs"));
  const dotnet = containsPath(files, /(?:^|\/)[^/]+\.sln$/u) ||
    containsPath(files, /(?:^|\/)[^/]+\.csproj$/u);
  const domainLayer = containsPath(files, /(?:^|\/)Domain\//iu);
  const applicationLayer = containsPath(files, /(?:^|\/)Application\//iu);
  const infrastructureLayer = containsPath(files, /(?:^|\/)Infrastructure\//iu);
  return Object.freeze({
    apiVersioning: containsText(csharp, /["']\/api\/v1(?:[\/"'])/u),
    applicationLayer,
    architectureTests: containsPath(files, /(?:^|\/)(?:Architecture|Arch)Tests?\//iu),
    authorizationPolicies: containsText(csharp, /AddPolicy|IAuthorizationHandler/u),
    defaultDeny: containsText(csharp, /FallbackPolicy/u),
    domainLayer,
    endpointLayer: containsPath(files, /(?:^|\/)(?:Controllers|Endpoints)\//iu),
    forbiddenNestAbsent: ![...dependencies].some((name) => name.startsWith("@nestjs/")),
    forbiddenNextAbsent: !dependencies.has("next") && !containsPath(files, /next\.config\.[cm]?[jt]s$/u),
    healthChecks: containsText(csharp, /AddHealthChecks|MapHealthChecks/u),
    infrastructureLayer,
    integrationTests: containsPath(files, /(?:^|\/)IntegrationTests?\//iu),
    jwtBearer: containsText(csharp, /AddJwtBearer|JwtBearerDefaults/u),
    migrations: containsPath(files, /(?:^|\/)Migrations\//u),
    modularDotnet: dotnet && domainLayer && applicationLayer && infrastructureLayer,
    openApi: containsText(csharp, /AddOpenApi|MapOpenApi|AddSwaggerGen|UseSwagger/u),
    postgresEfCore: containsText(documents, /Npgsql\.EntityFrameworkCore\.PostgreSQL|UseNpgsql/u),
    problemDetails: containsText(csharp, /AddProblemDetails|ProblemDetails/u),
    reactWeb: dependencies.has("react") && !dependencies.has("next"),
    structuredLogging: containsText(documents, /Serilog|ILogger</u),
    unitTests: containsPath(files, /(?:^|\/)UnitTests?\//iu),
  });
}

export async function inspectProject(requestedRoot) {
  const root = resolve(requestedRoot);
  const rootDetails = await lstat(root);
  if (!rootDetails.isDirectory() || rootDetails.isSymbolicLink()) {
    throw new Error("Project root must be a real directory.");
  }
  const files = [];
  const skippedSymlinks = [];
  await walk(root, root, files, skippedSymlinks);
  const { documents, bytes } = await corpus(root, files);
  const signals = signalMap(files, documents);
  return Object.freeze({
    contractVersion: "1.0.0",
    root,
    inventory: {
      files: files.length,
      inspectedTextFiles: documents.length,
      inspectedBytes: bytes,
      skippedSymlinks: Object.freeze(skippedSymlinks),
    },
    signals,
  });
}
