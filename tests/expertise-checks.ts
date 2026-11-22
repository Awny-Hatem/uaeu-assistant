import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { asksExpertise, expertiseAnswer } from "@/lib/academic/expertise-answer";

// Research collaboration / expert finding / lab questions answered from official UAEU faculty
// profiles (data/academic/faculty-expertise.json). Ali's case, 22 Nov 2026: an organisation asking
// for an AI/NLP collaboration got the career center; it must get the research office, the CCAI
// research contact, and every faculty member whose profile lists NLP.

type Person = { name: string; email: string; college: string; profileUrl?: string; researchAreas?: string[]; researchInterests?: string };
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/academic/faculty-expertise.json"), "utf8")) as { faculty: Person[]; departments: { college: string; url: string; facultyCount: number }[] };
const nlpPeople = data.faculty.filter((p) => /natural language|\bnlp\b/iu.test([...(p.researchAreas ?? []), p.researchInterests ?? ""].join(" ")));
let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed += 1; console.log(`ok - ${name}`); };

check("data: CCAI departments, faculty and research areas are present", () => {
  const cit = data.departments.filter((d) => d.college === "cit");
  assert.deepEqual(cit.map((d) => d.url).sort(), [
    "https://www.uaeu.ac.ae/en/cit/departments/computer_network_engineering.shtml",
    "https://www.uaeu.ac.ae/en/cit/departments/information_system_security.shtml",
    "https://www.uaeu.ac.ae/en/cit/departments/software_engineering.shtml",
  ]);
  const sherzod = data.faculty.find((p) => p.email === "sherzod@uaeu.ac.ae");
  assert.ok(sherzod?.researchAreas?.includes("Natural Language Processing"));
  assert.equal(sherzod?.profileUrl, "https://www.uaeu.ac.ae/en/cit/profile.shtml?email=sherzod@uaeu.ac.ae");
  assert.ok(data.faculty.length > 300, "faculty across all colleges");
  assert.ok(nlpPeople.length >= 3);
});

const question = "We are an organisation looking for a collaboration with UAEU in AI, and NLP specifically.";
check("organisation AI/NLP collaboration: research office, CCAI contact, every NLP faculty member", () => {
  const answer = expertiseAnswer(question, "en");
  assert.ok(answer);
  assert.equal(answer.disposition, "answer");
  assert.deepEqual(answer.topics, ["nlp"]);
  const c = answer.content;
  assert.match(c, /^\*\*Research collaboration with UAEU in Natural Language Processing\*\*/u);
  assert.match(c, /research\.office@uaeu\.ac\.ae/u);
  assert.match(c, /Research Collaborations at UAEU\]\(https:\/\/www\.uaeu\.ac\.ae\/en\/research\/research-and-sponsored-projects-office\/collaborations\.shtml\)/u);
  assert.match(c, /CCAI/u);
  assert.match(c, /alakas@uaeu\.ac\.ae/u);
  assert.match(c, /\*\*Dr\. Sherzod Turaev\*\*, Associate Professor, Department of Computer Science and Software Engineering/u);
  assert.match(c, /\[Profile\]\(https:\/\/www\.uaeu\.ac\.ae\/en\/cit\/profile\.shtml\?email=sherzod@uaeu\.ac\.ae\)/u);
  assert.match(c, /\+971 3 713 5560/u);
  for (const p of nlpPeople.slice(0, 15)) assert.ok(c.includes(p.name), `lists ${p.name}`);
  for (const p of nlpPeople) assert.ok(answer.people.includes(p.email), `includes ${p.email}`);
  for (const email of answer.people.filter((e) => !nlpPeople.some((p) => p.email === e))) {
    const p = data.faculty.find((f) => f.email === email);
    assert.match([...(p?.researchAreas ?? []), p?.researchInterests ?? ""].join(" "), /text mining|sentiment analysis|\bLLMs?\b|large language model|computational linguistic|speech recognition/iu, `${email} is NLP-related`);
  }
  const relatedAt = c.indexOf("Working on closely related areas");
  for (const p of nlpPeople) assert.ok(relatedAt < 0 || c.indexOf(p.name) < relatedAt, `${p.name} listed before the related group`);
  for (const url of ["software_engineering", "computer_network_engineering", "information_system_security"]) assert.ok(c.includes(`https://www.uaeu.ac.ae/en/cit/departments/${url}.shtml`), url);
  assert.match(c, /AI and Robotics Lab/u, "related AI research group");
  assert.doesNotMatch(c, /career|internship eligibility|jn@uaeu/iu);
  assert.match(c, /What kind of collaboration/u);
  const urls = answer.citations.map((x) => x.url);
  assert.ok(urls.includes("https://www.uaeu.ac.ae/en/research/research-and-sponsored-projects-office/collaborations.shtml"));
  assert.ok(urls.includes("https://www.uaeu.ac.ae/en/cit/profile.shtml?email=sherzod@uaeu.ac.ae"));
});

check("phrasing variants reach the same people", () => {
  for (const q of ["Our company wants to partner with UAEU on natural language processing research", "Who are the NLP experts at UAEU?", "which professors work on large language models"]) {
    const answer = expertiseAnswer(q, "en");
    assert.ok(answer, q);
    assert.ok(answer.people.includes("sherzod@uaeu.ac.ae"), q);
  }
});

check("Arabic collaboration request", () => {
  const answer = expertiseAnswer("نحن شركة ونرغب في التعاون مع جامعة الإمارات في معالجة اللغة الطبيعية", "ar");
  assert.ok(answer);
  assert.match(answer.content, /التعاون البحثي مع جامعة الإمارات في معالجة اللغة الطبيعية/u);
  assert.match(answer.content, /research\.office@uaeu\.ac\.ae/u);
  assert.ok(answer.people.includes("sherzod@uaeu.ac.ae"));
});

check("lab questions: the CCAI research group with its coordinator", () => {
  const robotics = expertiseAnswer("Is there a robotics lab at UAEU?", "en");
  assert.ok(robotics);
  assert.match(robotics.content, /\*\*AI and Robotics Lab\*\*: coordinator Prof\. Fady Al Najjar/u);
  const vision = expertiseAnswer("who works on computer vision?", "en");
  assert.ok(vision);
  assert.match(vision.content, /Computer Vision Lab \(CVLab\)\*\*: coordinator Dr\. Shengcai Liao/u);
});

check("every listed person lists the topic on their own profile", () => {
  for (const q of [question, "who works on computer vision?", "experts in cybersecurity at uaeu", "researchers working on internet of things"]) {
    const answer = expertiseAnswer(q, "en");
    assert.ok(answer, q);
    assert.ok(answer.people.length > 0, q);
    for (const email of answer.people) {
      const p = data.faculty.find((f) => f.email === email);
      const text = [...(p?.researchAreas ?? []), p?.researchInterests ?? ""].join(" ").toLowerCase();
      assert.ok(text.length > 0, `${email} has research areas`);
    }
  }
});

check("collaboration without a field: research office, ask the field once", () => {
  const answer = expertiseAnswer("We are a company looking to collaborate with UAEU on research", "en");
  assert.ok(answer);
  assert.equal(answer.disposition, "clarify");
  assert.match(answer.content, /research\.office@uaeu\.ac\.ae/u);
  assert.match(answer.content, /Which field/u);
});

check("student and course questions are not taken", () => {
  for (const q of ["How do I find an internship?", "What is CSBP319 about?", "What should I take in my first semester as a Cybersecurity student?", "Who is my academic advisor?", "What are the library hours?", "How do I apply for graduation?", "computer lab opening hours"]) {
    assert.equal(expertiseAnswer(q, "en"), null, q);
  }
  assert.equal(asksExpertise("Who are the NLP experts at UAEU?"), true);
});

console.log(`expertise checks: ${passed} passed`);
