import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadProfile, loadProfiles } from "../src/core/catalog.mjs";
import { evaluate, plan, recommend } from "../src/core/evaluator.mjs";
import { inspectProject } from "../src/core/project.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "mestre-yoda-fixture-"));
  const files = {
    "MestreYoda.sln": "Microsoft Visual Studio Solution File",
    "src/Api/Program.cs": `
      builder.Services.AddOpenApi();
      builder.Services.AddProblemDetails();
      builder.Services.AddAuthentication().AddJwtBearer();
      builder.Services.AddAuthorization(options => {
        options.AddPolicy("orders.read", policy => policy.RequireAuthenticatedUser());
        options.FallbackPolicy = options.DefaultPolicy;
      });
      builder.Services.AddHealthChecks();
      app.MapOpenApi();
      app.MapHealthChecks("/health");
      ILogger<Program> logger;
    `,
    "src/Modules/Orders/Domain/Order.cs": "public sealed class Order {}",
    "src/Modules/Orders/Application/CreateOrder.cs": "public sealed class CreateOrder {}",
    "src/Modules/Orders/Infrastructure/OrdersDbContext.cs": "options.UseNpgsql(connectionString);",
    "src/Modules/Orders/Infrastructure/Migrations/Initial.cs": "public sealed class Initial {}",
    "src/Api/Endpoints/OrderEndpoints.cs": "app.MapGroup(\"/api/v1/orders\");",
    "src/Api/Api.csproj": "<PackageReference Include=\"Npgsql.EntityFrameworkCore.PostgreSQL\" Version=\"10.0.0\" />",
    "web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "tests/UnitTests/OrderTests.cs": "public sealed class OrderTests {}",
    "tests/IntegrationTests/ApiTests.cs": "public sealed class ApiTests {}",
    "tests/ArchitectureTests/LayerTests.cs": "public sealed class LayerTests {}",
  };
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(root, path);
    await mkdir(join(absolute, ".."), { recursive: true });
    await writeFile(absolute, content, "utf8");
  }
  return root;
}

test("a conforming project passes the initial profile", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));

  const profile = await loadProfile("dotnet-modular-react-postgresql");
  const inspection = await inspectProject(root);
  const report = evaluate(profile, inspection);

  assert.equal(report.compliant, true);
  assert.equal(report.score, 100);
  assert.equal(report.summary.failed, 0);
  assert.equal(inspection.signals.forbiddenNestAbsent, true);
  assert.equal(inspection.signals.forbiddenNextAbsent, true);
});

test("recommendation and plan are deterministic and never write", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));

  const profiles = await loadProfiles();
  const inspection = await inspectProject(root);
  const recommendation = recommend(profiles, inspection);
  const report = evaluate(profiles[0], inspection);
  const firstPlan = plan(profiles[0], inspection, report);
  const secondPlan = plan(profiles[0], inspection, report);

  assert.equal(recommendation.recommended.id, profiles[0].id);
  assert.equal(recommendation.recommended.confidence, 100);
  assert.deepEqual(firstPlan, secondPlan);
  assert.equal(firstPlan.readOnly, true);
  assert.deepEqual(firstPlan.effects, []);
  assert.deepEqual(firstPlan.tasks, []);
});

test("an empty project produces remediations without effects", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "mestre-yoda-empty-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  const profile = await loadProfile("dotnet-modular-react-postgresql");
  const inspection = await inspectProject(root);
  const report = evaluate(profile, inspection);
  const remediationPlan = plan(profile, inspection, report);

  assert.equal(report.compliant, false);
  assert.ok(remediationPlan.tasks.length > 0);
  assert.deepEqual(remediationPlan.effects, []);
  assert.equal(remediationPlan.readOnly, true);
});
