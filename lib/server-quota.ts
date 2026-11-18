import type { QuotaPlan } from "@/lib/access";

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Server-enforced caps. These variables are intentionally never NEXT_PUBLIC. */
export function getEnforcedQuotaLimit(plan: QuotaPlan): number {
  if (plan === "uaeu") return readPositiveInt(process.env.CHATBOT_UAEU_QUESTION_LIMIT, 200);
  if (plan === "standard") return readPositiveInt(process.env.CHATBOT_STANDARD_QUESTION_LIMIT, 50);
  return readPositiveInt(process.env.CHATBOT_GUEST_QUESTION_LIMIT, 10);
}
