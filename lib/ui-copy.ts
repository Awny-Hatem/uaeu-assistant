export type UiLocale = "en" | "ar";

// The dominant script decides the direction: an English answer that quotes an
// Arabic term (e.g. "رفع سقف") stays left-to-right, and an Arabic answer that
// names an English menu item or "CRN" stays right-to-left. Link targets are ignored.
export function textLanguage(text: string): UiLocale {
  const plain = text.replace(/\]\([^)]*\)|https?:\/\/\S+/gu, " ");
  const arabic = (plain.match(/[\u0600-\u06ff]/gu) ?? []).length;
  const latin = (plain.match(/[A-Za-z]/gu) ?? []).length;
  return arabic > 0 && arabic >= latin ? "ar" : "en";
}

export const uiCopy = {
  en: {
    signIn: "Sign In", create: "Create Account", signOut: "Sign Out", clear: "Clear Conversation",
    saveHistory: "Save conversation on this device (and account history if enabled)",
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
    historyNotice: "Conversation is session-only by default. Turn on saving in your profile to keep it on this device; account history may also be saved when enabled. Avoid sharing passwords or sensitive personal records.",
    contact: "Contact UAEU staff", remaining: "questions remaining", used: "questions used", left: "left", of: "of",
    studentDocuments: "Student documents", academicDates: "Academic dates", library: "Library help", staff: "Talk to staff",
    conversation: "Conversation", faq: "Official-source answer", rag: "Source-based answer", web: "External grounding", guide: "Guided service", clarify: "Quick question", handoff: "Staff assistance", urgent: "Urgent assistance", error: "System notice",
    skipToConversation: "Skip to conversation", assistantSettings: "Assistant settings and account", yourMessage: "Your message", assistantMessage: "Assistant message",
  },
  ar: {
    skipToConversation: "الانتقال إلى المحادثة", assistantSettings: "إعدادات المساعد والحساب", yourMessage: "رسالتك", assistantMessage: "رسالة المساعد",
    signIn: "تسجيل الدخول", create: "إنشاء حساب", signOut: "تسجيل الخروج", clear: "مسح المحادثة",
    saveHistory: "حفظ المحادثة على هذا الجهاز (وسجل الحساب إذا كان مفعّلاً)",
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
    historyNotice: "تظل المحادثة مؤقتة حتى إغلاق الصفحة افتراضياً. فعّل الحفظ من ملفك الشخصي للاحتفاظ بها على هذا الجهاز؛ وقد يُحفظ سجل الحساب أيضاً إذا كان مفعّلاً. تجنب مشاركة كلمات المرور أو السجلات الشخصية الحساسة.",
    contact: "التواصل مع موظفي الجامعة", remaining: "أسئلة متبقية", used: "أسئلة مستخدمة", left: "متبقية", of: "من",
    studentDocuments: "وثائق الطلاب", academicDates: "المواعيد الأكاديمية", library: "مساعدة المكتبة", staff: "التحدث مع موظف",
    conversation: "محادثة", faq: "إجابة بمصدر رسمي", rag: "إجابة من المصادر", web: "مصادر خارجية", guide: "خطوات الخدمة", clarify: "سؤال سريع", handoff: "مساعدة الموظفين", urgent: "مساعدة عاجلة", error: "إشعار النظام",
  },
};
