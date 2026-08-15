# Mestre Yoda contribution instructions

Keep the provider deterministic, dependency-free at runtime, and read-only
until the mutation contract is explicitly approved. Do not add NestJS or
Next.js profiles. Do not introduce a Kratos runtime dependency: integration is
through versioned JSON contracts only.

Run `npm run verify` after every behavior change. Profiles, rules, recipes, and
schemas are public contracts and require compatible versioning.
