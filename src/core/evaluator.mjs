import { createHash } from "node:crypto";

const SEVERITY_ORDER = Object.freeze({ blocking: 0, required: 1, recommended: 2 });
const SEVERITY_WEIGHT = Object.freeze({ blocking: 5, required: 3, recommended: 1 });

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function score(rules) {
  const possible = rules.reduce(
    (total, { severity }) => total + SEVERITY_WEIGHT[severity],
    0,
  );
  const earned = rules
    .filter(({ passed }) => passed)
    .reduce((total, { severity }) => total + SEVERITY_WEIGHT[severity], 0);
  return possible === 0 ? 100 : Math.round((earned / possible) * 100);
}

export function evaluate(profile, inspection) {
  const rules = profile.rules.map((rule) => {
    const observed = inspection.signals[rule.signal] === true;
    const expected = rule.expected !== false;
    return Object.freeze({
      id: rule.id,
      severity: rule.severity,
      description: rule.description,
      passed: observed === expected,
      signal: rule.signal,
      expected,
      observed,
      remediation: rule.remediation,
    });
  });
  const blockingFailures = rules.filter(
    ({ passed, severity }) => !passed && severity === "blocking",
  );
  return Object.freeze({
    contractVersion: "1.0.0",
    profile: {
      id: profile.id,
      version: profile.version,
      digest: profile.digest,
    },
    compliant: blockingFailures.length === 0,
    score: score(rules),
    summary: {
      passed: rules.filter(({ passed }) => passed).length,
      failed: rules.filter(({ passed }) => !passed).length,
      blocking: blockingFailures.length,
      total: rules.length,
    },
    rules: Object.freeze(rules),
  });
}

export function recommend(profiles, inspection) {
  const ranked = profiles
    .map((profile) => {
      const report = evaluate(profile, inspection);
      const stackSignals = [
        inspection.signals.modularDotnet,
        inspection.signals.reactWeb,
        inspection.signals.postgresEfCore,
      ].filter(Boolean).length;
      return {
        id: profile.id,
        version: profile.version,
        digest: profile.digest,
        confidence: Math.round((stackSignals / 3) * 100),
        conformity: report.score,
      };
    })
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.conformity - left.conformity ||
        compareText(left.id, right.id),
    );
  return Object.freeze({
    contractVersion: "1.0.0",
    recommended: ranked[0] ?? null,
    candidates: Object.freeze(ranked),
  });
}

export function plan(profile, inspection, report) {
  const tasks = report.rules
    .filter(({ passed }) => !passed)
    .sort(
      (left, right) =>
        SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
        compareText(left.id, right.id),
    )
    .map((rule, index) =>
      Object.freeze({
        order: index + 1,
        ruleId: rule.id,
        severity: rule.severity,
        action: rule.remediation,
        requiresHumanDecision: rule.severity === "blocking",
      }),
    );
  const fingerprint = createHash("sha256")
    .update(profile.digest)
    .update(JSON.stringify(inspection.signals))
    .update(JSON.stringify(tasks))
    .digest("hex");
  return Object.freeze({
    contractVersion: "1.0.0",
    planId: `sha256:${fingerprint}`,
    profile: report.profile,
    readOnly: true,
    effects: Object.freeze([]),
    tasks: Object.freeze(tasks),
    summary: {
      taskCount: tasks.length,
      blockingDecisions: tasks.filter(
        ({ requiresHumanDecision }) => requiresHumanDecision,
      ).length,
    },
  });
}
