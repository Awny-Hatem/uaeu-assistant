/**
 * Server-only boundary for personalized UAEU data.
 *
 * This is an integration contract, not an implementation of UAEU SSO. An
 * adapter must validate the bearer token with UAEU's approved identity
 * provider, map the verified subject to one student, enforce the requested
 * scope on the server, and return only this minimum academic snapshot.
 * Never accept a student ID supplied by the chat/model as the lookup key.
 */

export const STUDENT_DATA_SCOPES = ["student:academic:read"] as const;
export type StudentDataScope = (typeof STUDENT_DATA_SCOPES)[number];

export type VerifiedStudentIdentity = {
  /** Opaque subject returned by the verified institutional identity provider. */
  subject: string;
  issuer: string;
  authenticatedAt: string;
  scopes: readonly string[];
};

export type StudentAcademicSnapshot = {
  /** Internal record identifiers are intentionally excluded from this snapshot. */
  programId: string;
  curriculumVersionId?: string;
  cohort?: string;
  completedCourses: Array<{
    courseCode: string;
    grade?: string;
    credits: number;
    term?: string;
  }>;
  currentCourses: string[];
  academicStatus?: string;
  snapshotVersion: string;
  retrievedAt: string;
};

export type StudentGatewayResult =
  | { status: "FOUND"; identity: VerifiedStudentIdentity; snapshot: StudentAcademicSnapshot }
  | { status: "NOT_FOUND" }
  | { status: "UNAVAILABLE"; retryable: boolean };

/** Adapter owns token validation and server-side subject-to-record mapping. */
export interface StudentDataGateway {
  readOwnAcademicSnapshot(accessToken: string): Promise<StudentGatewayResult>;
}

export type StudentGatewayResolution =
  | { status: "AUTHORIZED"; snapshot: StudentAcademicSnapshot }
  | { status: "AUTHENTICATION_REQUIRED" }
  | { status: "SCOPE_REQUIRED"; scope: StudentDataScope }
  | { status: "STALE_AUTHENTICATION" }
  | { status: "RECORD_NOT_AVAILABLE" }
  | { status: "UNAVAILABLE"; retryable: boolean }
  | { status: "INVALID_UPSTREAM_RESPONSE" };

const MAX_AUTH_AGE_MS = 5 * 60 * 1000;

function validDate(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validSnapshot(value: StudentAcademicSnapshot): boolean {
  return typeof value.programId === "string" && value.programId.length > 0 &&
    typeof value.snapshotVersion === "string" && value.snapshotVersion.length > 0 &&
    validDate(value.retrievedAt) !== null &&
    Array.isArray(value.currentCourses) && value.currentCourses.every((code) => typeof code === "string") &&
    Array.isArray(value.completedCourses) && value.completedCourses.every((course) =>
      typeof course.courseCode === "string" && course.courseCode.length > 0 &&
      Number.isFinite(course.credits) && course.credits >= 0 &&
      (course.grade === undefined || typeof course.grade === "string") &&
      (course.term === undefined || typeof course.term === "string"));
}

/**
 * Resolve the signed-in student's own minimum academic snapshot.
 * The caller supplies a bearer token; the adapter must independently verify
 * it. No caller-supplied student identifier is accepted anywhere in the API.
 */
export async function getOwnAcademicSnapshot(
  gateway: StudentDataGateway,
  accessToken: string | undefined,
  now = Date.now(),
): Promise<StudentGatewayResolution> {
  if (!accessToken?.trim()) return { status: "AUTHENTICATION_REQUIRED" };

  const result = await gateway.readOwnAcademicSnapshot(accessToken);
  if (result.status === "UNAVAILABLE") return result;
  if (result.status === "NOT_FOUND") return { status: "RECORD_NOT_AVAILABLE" };

  const identity = result.identity;
  if (!identity.subject || !identity.issuer || !Array.isArray(identity.scopes)) {
    return { status: "INVALID_UPSTREAM_RESPONSE" };
  }
  if (!identity.scopes.includes("student:academic:read")) {
    return { status: "SCOPE_REQUIRED", scope: "student:academic:read" };
  }

  const authenticatedAt = validDate(identity.authenticatedAt);
  if (authenticatedAt === null || authenticatedAt > now || now - authenticatedAt > MAX_AUTH_AGE_MS) {
    return { status: "STALE_AUTHENTICATION" };
  }
  if (!validSnapshot(result.snapshot)) return { status: "INVALID_UPSTREAM_RESPONSE" };

  return { status: "AUTHORIZED", snapshot: result.snapshot };
}
