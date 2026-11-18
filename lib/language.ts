export type Locale = "ar" | "en" | "unknown";
export type ResolvedLocale = Exclude<Locale, "unknown">;

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;

export function detectLocale(text: string): Locale {
  const trimmed = text.trim();
  if (!trimmed) return "en";
  const colon = trimmed.indexOf(":");
  const afterPreamble = colon >= 0 && colon < 120 ? trimmed.slice(colon + 1).trim() : "";
  const substantive = /^[\s"'([{*-]*[\u0600-\u08ff]/u.test(afterPreamble) ? afterPreamble : trimmed;
  const firstLetter = substantive.match(/[\p{L}]/u)?.[0];
  if (firstLetter && /[\u0600-\u08ff]/u.test(firstLetter)) return "ar";
  const ar = (substantive.match(ARABIC_RANGE) ?? []).length;
  const lat = (substantive.match(/[A-Za-z]/g) ?? []).length;
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
