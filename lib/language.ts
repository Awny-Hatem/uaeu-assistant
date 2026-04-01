export type Locale = "ar" | "en" | "unknown";

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;

export function detectLocale(text: string): Locale {
  const trimmed = text.trim();
  if (!trimmed) return "en";
  const ar = (trimmed.match(ARABIC_RANGE) ?? []).length;
  const lat = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  if(ar === lat) return "unknown";
  return ar > lat ? "ar" : "en";
}

export function resolveLocale(
  lastUserMessage: string,
  preference: "auto" | Locale,
): Locale {
  if (preference === "auto") {
    const detected = detectLocale(lastUserMessage);
    return detected;
  }
  return preference;
}
