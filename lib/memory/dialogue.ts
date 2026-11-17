type Turn = {
  role: string;
  content: string;
};
/** Conversation/app facts never go to university retrieval. */
export function dialogueReply(question: string, history: Turn[], language: 'ar' | 'en'): string | null {
  const ar = language === 'ar', q = question.trim();
  if (/^(?:(?:please|can you)\s+)?(?:what was|remind me(?: of)?) my first (?:question|message)[?.!\s]*$|(?:ما|شو|وش).{0,12}(?:اول|أول).{0,15}(?:سؤال|رسالة)/iu.test(q)) {
    const first = history.find(t => t.role === 'user');
    return first ? (ar ? `كانت رسالتك الأولى: «${first.content}»` : `Your first message was: “${first.content}”`) : (ar ? 'هذه أول رسالة متاحة لي في هذه المحادثة.' : 'This is the first message available to me in this conversation.');
  }
  if (/^(?:please )?(?:summari[sz]e|recap)(?: our| this| the)? (?:chat|conversation|discussion)[?.!\s]*$|(?:لخص|لخّص).{0,15}(?:المحادثة|محادثتنا|كلامنا)/iu.test(q)) {
    const users = history.filter(t => t.role === 'user');
    if (!users.length)
      return ar ? 'لم نناقش موضوعاً بعد.' : 'We have not discussed a topic yet.';
    return (ar ? 'الموضوعات التي سألت عنها في الرسائل المتاحة:' : 'You asked about these topics in the available messages:') + '\n' + users.slice(-8).map(t => '• ' + t.content).join('\n');
  }
  if (/^(?:who (?:created|made|built|developed) you|who (?:are|r) you|what are you|what is this (?:bot|assistant))[?!.\s]*$|(?:من|مين).{0,12}(?:صنعك|طورك|طوّرك|انت|أنت)|ما (?:هو|هي) هذا المساعد/iu.test(q))
    return ar ? 'أنا مساعد جامعة الإمارات للذكاء الاصطناعي، طوّرني فريق من طلبة كلية الحوسبة والذكاء الاصطناعي (CCAI) ضمن مشروع تخرجهم. أساعدك بالاعتماد على مصادر الجامعة الرسمية.' : "I'm the UAEU AI Assistant, built by UAEU students from the College of Computing and Artificial Intelligence (CCAI) as their Senior Graduation Project. As your UAEU student-services assistant, I help with admissions, courses, plans and services using official UAEU sources.";
  if (/^(?:where does your (?:info(?:rmation)?|knowledge) come from|what (?:are your sources|can you do)|how can you help(?: me)?)[?!.\s]*$|ما مصادرك|من وين معلوماتك|كيف تساعدني|شو تقدر تسوي/iu.test(q))
    return ar ? 'أساعدك في البرامج والخطط والمساقات والقبول والخدمات بالاعتماد على صفحات جامعة الإمارات ووثائقها الرسمية، وأرفق الروابط المناسبة. أستخدم ملفك المحفوظ عند الحاجة؛ ولا أستطيع الدخول إلى سجلك الجامعي المباشر.' : 'I can help with UAEU programs, study plans, courses, admissions and services using official university pages and documents, with source links. When relevant I can use your saved profile; I cannot access your live university record.';
  const introduction = /^(?:hi|hello|hey|مرحبا|مرحباً|السلام عليكم)[,!،\s]+/iu.test(q) && /\bmy name is\b|\bi(?: am|'m) (?:an? |in |studying)|اسمي|انا طالب|أنا طالب/iu.test(q) && !/[?؟]|\b(?:what|when|why|how|can you|could you|should|do i)\b|متى|كيف|كم|هل /iu.test(q);
  if (introduction) {
    const name = q.match(/\bmy name is\s+([\p{L}]{1,24})|اسمي\s+([\p{L}]{1,24})/iu);
    const n = name?.[1] ?? name?.[2];
    return ar ? `مرحباً${n ? ' ' + n : ''}! أنا مساعد جامعة الإمارات للذكاء الاصطناعي. أستطيع مساعدتك في خطتك الدراسية، متطلبات المساقات أو خدمات الجامعة. بماذا تحب أن نبدأ؟` : `Hi${n ? ' ' + n : ''}! I'm the UAEU AI Assistant. I can help with your study plan, course requirements or university services. What would you like to start with?`;
  }
  return null;
}
