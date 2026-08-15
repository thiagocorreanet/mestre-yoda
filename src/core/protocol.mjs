import {
  PROTOCOL_VERSION,
  PROVIDER_ID,
  PROVIDER_VERSION,
} from "../version.mjs";

export function envelope(command, result) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    provider: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    command,
    status: "success",
    result,
  };
}

export function failure(command, code, summary) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    provider: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    command,
    status: "failure",
    error: { code, summary },
  };
}

export function handshake() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    provider: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    mode: "read-only",
    capabilities: [
      "profiles.list",
      "profiles.describe",
      "project.inspect",
      "project.recommend",
      "project.check",
      "project.plan",
      "catalog.validate",
    ],
    mutations: false,
  };
}
