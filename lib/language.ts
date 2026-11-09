export type Locale = "ar" | "en" | "unknown";
export type ResolvedLocale = Exclude<Locale, "unknown">;

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;

export function detectLocale(text: string): Locale {
  const trimmed = text.trim();
  if (!trimmed) return "en";
  const normalized = trimmed.normalize("NFKD").replace(/\p{M}/gu, "");
  if (/\b(?:answer|reply|respond)\s+(?:to me\s+)?in\s+Arabic\b/i.test(normalized)) return "ar";
  if (/بالانجليزي|بالانجليزيه|باللغة الانجليزية/u.test(normalized)) return "en";
  const englishFrame = /^(?:please\s+)?(?:what|when|where|which|how|does|do|is|are|can|could|should|tell|give|explain)\b/i.test(normalized);
  const arabicFrame = /(?:^|[\s:،])(?:كم|ما|ماذا|كيف|هل|مت[ىي]|اين|وين|شو|ليش|لماذا|اريد|اعطني|اشرح|ارجو|اخبرني|خبرني|حدثني|عرفني|قل لي|ابي|ابغى|ممكن)(?=\s|[؟:،]|$)/u.test(normalized);
  // The request frame carries more language signal than a long English proper
  // program name or a course code embedded in an Arabic question.
  if (arabicFrame && !englishFrame) return "ar";
  const ar = (trimmed.match(ARABIC_RANGE) ?? []).length;
  const lat = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  if(ar === lat) return "unknown";
  return ar > lat ? "ar" : "en";
}

export function resolveLocale(
  lastUserMessage: string,
  preference: "auto" | Locale,
): ResolvedLocale {
  if (preference === "auto") {
    const detected = detectLocale(lastUserMessage);
    return detected === "unknown" ? "en" : detected;
  }
  return preference === "unknown" ? "en" : preference;
}
