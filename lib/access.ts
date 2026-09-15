export type UniversityAffiliation = "uaeu" | "general";
export type QuotaPlan = "guest" | "standard" | "uaeu";

const UAEU_EMAIL_DOMAINS = ["@uaeu.ac.ae"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const GUEST_QUESTION_LIMIT = readPositiveInt(
  process.env.NEXT_PUBLIC_GUEST_QUESTION_LIMIT,
  10,
);

export const STANDARD_ACCOUNT_QUESTION_LIMIT = readPositiveInt(
  process.env.NEXT_PUBLIC_STANDARD_ACCOUNT_QUESTION_LIMIT,
  50,
);

export const UAEU_ACCOUNT_QUESTION_LIMIT = readPositiveInt(
  process.env.NEXT_PUBLIC_UAEU_ACCOUNT_QUESTION_LIMIT,
  200,
);

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > 254) return null;
  if (!EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function isUniversityEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return UAEU_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
}

export function getUniversityAffiliation(email: unknown): UniversityAffiliation {
  return isUniversityEmail(email) ? "uaeu" : "general";
}

export function getQuotaPlan(user?: {
  email?: string | null;
  universityAffiliation?: UniversityAffiliation | null;
} | null): QuotaPlan {
  if (!user) return "guest";
  if (user.universityAffiliation === "uaeu" || isUniversityEmail(user.email)) {
    return "uaeu";
  }
  return "standard";
}

export function getQuotaLimit(plan: QuotaPlan): number {
  if (plan === "uaeu") return UAEU_ACCOUNT_QUESTION_LIMIT;
  if (plan === "standard") return STANDARD_ACCOUNT_QUESTION_LIMIT;
  return GUEST_QUESTION_LIMIT;
}
