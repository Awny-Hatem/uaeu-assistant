import { courseCodes } from "@/lib/query-understanding";

/** Explain common academic terms without selecting a policy for an unnamed course. */
export function explainPrerequisiteCorequisite(text: string, locale: "en" | "ar"): string | null {
  const mentionsBoth = /\bprerequisites?\b/i.test(text) && /\bcorequisites?\b/i.test(text);
  const asksForExplanation = /\b(?:difference|different|distinguish|compare|explain|mean|meaning)\b/i.test(text);
  if (!mentionsBoth || !asksForExplanation || courseCodes(text).length > 0) return null;

  if (locale === "ar") {
    return `**المتطلب السابق والمتطلب المتزامن**
- **المتطلب السابق:** مقرر يجب اجتيازه قبل التسجيل في مقرر آخر.
- **المتطلب المتزامن:** مقرر يجب دراسته في الفصل نفسه مع المقرر الآخر، أو قد يُسمح بإكماله مسبقاً وفقاً للكتالوج.

مثال افتراضي: قد يتطلب مقرر هياكل البيانات اجتياز البرمجة التمهيدية أولاً، بينما يمكن أن يُطلب تسجيل المحاضرة والمختبر معاً. هذا مثال توضيحي عام، وليس قاعدة لمقرر محدد في جامعة الإمارات. أرسل رمز المقرر للتحقق من شرطه المنشور.`;
  }

  return `**Prerequisite vs. corequisite**
- A **prerequisite** is a course you must complete successfully before enrolling in the target course.
- A **corequisite** is a course you must take at the same time as the target course; some catalogs also allow it to be completed earlier. The specific catalog rule controls.

Hypothetical example: Introductory Programming could be a prerequisite for Data Structures, while a lecture and its lab could be corequisites. These are general examples, not UAEU rules for a particular course. Share the course code if you want me to check its published requirement.`;
}
