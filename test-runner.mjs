import fs from 'fs';

async function chat(messages, userContext = undefined) {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, userContext, locale: "auto" })
  });
  return await res.json();
}

async function run() {
  console.log("--- STARTING TESTS ---");

  // FR-1.1 English
  let r1 = await chat([{role: "user", content: "What are the contact office hours?"}]);
  console.log("FR-1.1 (English FAQ):", r1.content, "| Source:", r1.source);

  // FR-1.2 Arabic
  let r2 = await chat([{role: "user", content: "ساعات العمل والتواصل"}]);
  console.log("\nFR-1.2 (Arabic FAQ):", r2.content, "| Source:", r2.source);

  // FR-1.4 Mixed Language
  let r3 = await chat([{role: "user", content: "What are the شروط القبول for transfer students?"}]);
  console.log("\nFR-1.4 (Mixed):", r3.content, "| Source:", r3.source);

  // FR-3.1 Follow Up
  let msgs = [
    {role: "user", content: "What are the admission requirements?"},
    {role: "assistant", content: r3.content},
    {role: "user", content: "How long does it take?"}
  ];
  let r4 = await chat(msgs);
  console.log("\nFR-3.2 (Follow-up):", r4.content);

  // FR-4.2 Personalization
  let r5 = await chat([{role: "user", content: "What electives should I take?"}], { studentType: "Current Student", major: "IT" });
  console.log("\nFR-4.2 (IT Student Profile):", r5.content);

  // FR-5.1 No-source / Unknown
  let r6 = await chat([{role: "user", content: "Where can I buy a pet dinosaur at UAEU?"}]);
  console.log("\nFR-5.1 (Unknown query):", r6.content, "| Source:", r6.source);

  // FR-5.3 Human Escalation
  let r7 = await chat([{role: "user", content: "I want to speak to a human human advisor please"}]);
  console.log("\nFR-5.3 (Human request):", r7.content, "| Source:", r7.source);

  console.log("\n--- FINISHED ---");
}

run();
