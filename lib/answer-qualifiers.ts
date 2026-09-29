import type { Citation } from "@/lib/prototype-types";
import type { EvidenceRow } from "@/lib/knowledge-files";
import type { GroundedAnswer } from "@/lib/provider-response";

type SourceReference = { id: string; row: EvidenceRow; citation: Citation; text?: string };

/** Keep a governed claim self-contained. A neighboring caveat is easy for a
 * reader or an isolated verifier to misapply to a different statement. */
export function preserveEvidenceQualifications(answer: GroundedAnswer, sources: SourceReference[], locale: "ar" | "en"): GroundedAnswer {
  return { ...answer, claims: answer.claims.map((claim) => {
    const source = sources.find(({ id }) => claim.evidenceIds.includes(id));
    if (!source) return claim;
    const evidence = source.text ?? source.row.text;
    let text = claim.text;
    if (/(?:exclud\w*|except|outside|non[- ])[^.\n]{0,100}(?:medicine|cmhs)|(?:medicine and health sciences|cmhs)[^.\n]{0,100}(?:excluded|not covered)/i.test(evidence) && !/medicine|cmhs|الطب|الطبية/i.test(text)) {
      text = locale === "ar"
        ? `لطلبة البكالوريوس باستثناء كلية الطب والعلوم الصحية: ${text}`
        : `For undergraduates, excluding the College of Medicine and Health Sciences: ${text}`;
    }
    if (/season unspecified/i.test(source.citation.sourceVersion ?? "") && !/season|holiday|موسم|موسمي|موسمية|الموسم/i.test(text)) {
      text += locale === "ar"
        ? " هذا هو الجدول المنشور؛ لا تحدد الصفحة موسمه، وقد تتغير الساعات بحسب الموسم."
        : " This is the published schedule; its season is unspecified and hours may change seasonally.";
    }
    // The source explicitly makes both eligibility routes conditional on these
    // preliminary requirements. A shortened paraphrase must not erase them.
    if (/After completing Foundation and with good academic standing/i.test(evidence) &&
      /\b(?:either|qualifying routes|two.*routes|up to 22)\b|مسارين|أحد المسار|احد المسار|حتى 22/iu.test(text) &&
      !(/Foundation|التأسيس|التاسيس/i.test(text) && /good academic standing|وضع أكاديمي جيد|وضع اكاديمي جيد/i.test(text))) {
      text += locale === "ar"
        ? " يشترط المساران إكمال البرنامج التأسيسي والوضع الأكاديمي الجيد."
        : " Both qualifying routes require completion of Foundation and good academic standing.";
    }
    return { ...claim, text };
  }) };
}
