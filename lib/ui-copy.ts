export type UiLocale = "en" | "ar";

export function textLanguage(text: string): UiLocale {
  return /[\u0600-\u06ff]/u.test(text) ? "ar" : "en";
}

export const uiCopy = {
  en: {
    signIn: "Sign In", create: "Create Account", signOut: "Sign Out", clear: "Clear Conversation",
    language: "Response language", auto: "Auto-detect", english: "English", arabic: "العربية",
    visitor: "Visitor", account: "Prototype account", visitorAccess: "Visitor access", browserSession: "Local browser session",
    signInTitle: "Sign in to continue", accountNotice: "Create a prototype account with any email. University affiliation is self-reported and is not verified.",
    allowanceTitle: "Question allowance used", allowanceNotice: "Your answers remain available. Sign in or create an account to ask more questions.",
    dailyLimit: "Today's local allowance is used. It resets at midnight UAE time.",
    signedOut: "Signed out. Visitor access is available on this device.", logoutFailed: "Sign-out failed. You are still signed in; please retry.",
    cleared: "Conversation history cleared.", clearFailed: "Browser history cleared, but server deletion failed. Use Clear Conversation again to retry.",
    sessionFailed: "Session check is temporarily unavailable. Your saved visitor conversation is available; retry by refreshing.",
    checkingSession: "Checking session…", checkingSources: "Checking UAEU source records…", historyLoading: "Loading conversation…",
    heading: "What can I help you with?", askLabel: "Your UAEU question", send: "Send message", cancel: "Stop response",
    networkError: "Network error. Please try again.", requestError: "The assistant could not answer this request. Please retry.",
    historyNotice: "Up to 80 messages stay in this browser until cleared. Do not paste passwords, IDs, medical records, visa files, or case evidence.",
    contact: "Contact UAEU staff", remaining: "questions remaining", used: "questions used", left: "left", of: "of",
    studentDocuments: "Student documents", academicDates: "Academic dates", library: "Library help", staff: "Talk to staff",
    conversation: "Conversation", faq: "Official-source answer", rag: "Source-based answer", web: "External grounding", guide: "Guided service", clarify: "More detail needed", handoff: "Staff assistance", urgent: "Urgent assistance", error: "System notice",
  },
  ar: {
    signIn: "تسجيل الدخول", create: "إنشاء حساب", signOut: "تسجيل الخروج", clear: "مسح المحادثة",
    language: "لغة الإجابة", auto: "تلقائي", english: "English", arabic: "العربية",
    visitor: "زائر", account: "حساب تجريبي", visitorAccess: "وصول الزائر", browserSession: "جلسة محلية في المتصفح",
    signInTitle: "سجل الدخول للمتابعة", accountNotice: "أنشئ حساباً تجريبياً بأي بريد إلكتروني. الانتماء للجامعة يحدده المستخدم ولم يتم التحقق منه.",
    allowanceTitle: "استهلكت عدد الأسئلة المتاح", allowanceNotice: "تبقى إجاباتك متاحة للقراءة. سجل الدخول أو أنشئ حساباً لطرح أسئلة إضافية.",
    dailyLimit: "استهلكت العدد اليومي المحلي. يتجدد عند منتصف الليل بتوقيت الإمارات.",
    signedOut: "تم تسجيل الخروج. يمكنك استخدام وصول الزائر على هذا الجهاز.", logoutFailed: "تعذر تسجيل الخروج. ما زلت مسجلاً؛ حاول مرة أخرى.",
    cleared: "تم مسح سجل المحادثة.", clearFailed: "تم مسح سجل المتصفح، لكن تعذر حذفه من الخادم. اضغط مسح المحادثة مجدداً لإعادة المحاولة.",
    sessionFailed: "تعذر التحقق من الجلسة مؤقتاً. محادثة الزائر المحفوظة متاحة؛ أعد تحميل الصفحة للمحاولة.",
    checkingSession: "جارٍ التحقق من الجلسة…", checkingSources: "جارٍ مراجعة مصادر جامعة الإمارات…", historyLoading: "جارٍ تحميل المحادثة…",
    heading: "كيف يمكنني مساعدتك؟", askLabel: "سؤالك عن جامعة الإمارات", send: "إرسال السؤال", cancel: "إيقاف الإجابة",
    networkError: "تعذر الاتصال. حاول مرة أخرى.", requestError: "تعذر تقديم إجابة لهذا الطلب. حاول مرة أخرى.",
    historyNotice: "تُحفظ آخر 80 رسالة في هذا المتصفح حتى مسحها. لا ترسل كلمات مرور أو هويات أو سجلات طبية أو ملفات تأشيرة أو أدلة قضايا.",
    contact: "التواصل مع موظفي الجامعة", remaining: "أسئلة متبقية", used: "أسئلة مستخدمة", left: "متبقية", of: "من",
    studentDocuments: "وثائق الطلاب", academicDates: "المواعيد الأكاديمية", library: "مساعدة المكتبة", staff: "التحدث مع موظف",
    conversation: "محادثة", faq: "إجابة بمصدر رسمي", rag: "إجابة من المصادر", web: "مصادر خارجية", guide: "خطوات الخدمة", clarify: "نحتاج تفاصيل إضافية", handoff: "مساعدة الموظفين", urgent: "مساعدة عاجلة", error: "إشعار النظام",
  },
};
