import assert from "node:assert/strict";
import { getOwnAcademicSnapshot, type StudentAcademicSnapshot, type StudentDataGateway, type StudentGatewayResult } from "../../lib/v3/student-data-gateway";

const now = Date.parse("2026-11-12T08:00:00.000Z");
const snapshot: StudentAcademicSnapshot = {
  programId: "computer-engineering",
  cohort: "2024",
  completedCourses: [{ courseCode: "MATH110", credits: 3, grade: "B", term: "2025-FALL" }],
  currentCourses: ["CENG202"],
  snapshotVersion: "mock-v1",
  retrievedAt: "2026-11-12T07:59:00.000Z",
};

function gateway(result: StudentGatewayResult, seenToken?: (value: string) => void): StudentDataGateway {
  return { async readOwnAcademicSnapshot(token) { seenToken?.(token); return result; } };
}

const verifiedIdentity = {
  subject: "opaque-verified-subject",
  issuer: "https://identity.example.invalid",
  authenticatedAt: "2026-11-12T07:58:00.000Z",
  scopes: ["student:academic:read"],
};
const authorized: StudentGatewayResult = {
  status: "FOUND",
  identity: verifiedIdentity,
  snapshot,
};

async function main() {
  assert.deepEqual(await getOwnAcademicSnapshot(gateway(authorized), undefined, now), { status: "AUTHENTICATION_REQUIRED" });

  let receivedToken = "";
  assert.deepEqual(
    await getOwnAcademicSnapshot(gateway(authorized, (token) => { receivedToken = token; }), "opaque-access-token", now),
    { status: "AUTHORIZED", snapshot },
  );
  assert.equal("studentId" in snapshot, false, "internal identifiers must not cross the gateway boundary");
  assert.equal(receivedToken, "opaque-access-token", "token is passed to the validating adapter; no student ID is accepted from the caller");

  const noScope: StudentGatewayResult = {
    status: "FOUND",
    identity: { ...verifiedIdentity, scopes: [] },
    snapshot,
  };
  assert.equal((await getOwnAcademicSnapshot(gateway(noScope), "token", now)).status, "SCOPE_REQUIRED");

  const stale: StudentGatewayResult = {
    status: "FOUND",
    identity: { ...verifiedIdentity, authenticatedAt: "2026-11-12T07:54:59.999Z" },
    snapshot,
  };
  assert.equal((await getOwnAcademicSnapshot(gateway(stale), "token", now)).status, "STALE_AUTHENTICATION");

  const malformed: StudentGatewayResult = {
    status: "FOUND",
    identity: verifiedIdentity,
    snapshot: { ...snapshot, completedCourses: [{ courseCode: "MATH110", credits: -3 }] },
  };
  assert.equal((await getOwnAcademicSnapshot(gateway(malformed), "token", now)).status, "INVALID_UPSTREAM_RESPONSE");

  assert.deepEqual(await getOwnAcademicSnapshot(gateway({ status: "UNAVAILABLE", retryable: true }), "token", now), { status: "UNAVAILABLE", retryable: true });
  assert.equal((await getOwnAcademicSnapshot(gateway({ status: "NOT_FOUND" }), "token", now)).status, "RECORD_NOT_AVAILABLE");

  console.log("Student gateway contract checks passed: authentication, scope, freshness, data validation, and fail-closed upstream behavior.");
}

void main();
