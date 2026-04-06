# UAEU Chatbot System Report

## 1. The Overall System Overview

**What we did:** 
We built a full-screen, smart chatbot application for the United Arab Emirates University (UAEU). 

**How we built it:** 
We used a web framework called Next.js (a tool to build fast web applications) and styled it using Tailwind CSS (a design tool to easily decorate the app). The interface features a big sidebar on the left with the official UAEU logo, and user profile settings (like choosing if you are a "Visitor" or "Current Student"). The right side features a massive chat window where the user talks to the AI.

**Why this is needed:** 
A full-screen layout with user settings gives the student an easy, distraction-free environment to get immediate academic help, while letting the AI adjust its tone based on the student's profile.

---

## 2. How the AI Chatbot Does Its Research (Checking Resources)

When a student asks a question, the chatbot does not blindly answer. It goes through a strict 3-layer checking process to ensure accuracy.

**What we did:** 
We created a "Multi-Layer Search System" that prioritizes the university's official rules first, and only looks at the internet if it cannot find the answer locally.

**How we do it:**
1. **Layer 1: The FAQ Cache (Instant Answers):** 
   - The system first checks a file named `faq.json` (a small database of frequently asked questions). If the student's question closely matches a pre-written keyword (like "hours" or "contact"), the AI instantly replies with the hardcoded English or Arabic answer.
2. **Layer 2: The Vector RAG Search (Internal Database):** 
   - If the question is not a simple FAQ, it searches `data/knowledge`, which holds all the official university readable files. 
   - We use a technology called **Vector Embeddings** (a way for the AI to turn words into numbers) to find paragraphs that have the exact same *meaning* as the student's question, even if the student used different words.
   - If the main math-based search fails, a backup text-search engine (Lexical Fallback) scans the documents for the exact words the user typed.
3. **Layer 3: Live Google Search (External Data):** 
   - If both Layer 1 and Layer 2 find absolutely nothing inside the local system, the chatbot is programmed to attach a special tool telling the AI, "Go search Google for this". The AI will pull public information from the actual live web to answer the question, keeping the student from hitting a dead end.

**Why this is needed:** 
This tiered system forces the AI to heavily trust official university documents first—preventing it from hallucinating or giving the wrong academic policies—while remaining smart enough to answer general web queries when allowed.

---

## 3. How the System Updates the Database with Common Questions

Administrators need to know what questions students are asking that the chatbot struggles to answer.

**What we did:** 
We built an automatic logging system that tracks every conversation and flags the failing ones.

**How we do it:**
- Every time a user sends a message, a function called `logMasterQueryDatabase` writes the student's profile type and their exact question into a file named `master_query_database.log`. 
- When the AI searches the internal documents (Layer 2) and finds **zero results**, it automatically triggers a function called `logUnansweredQuery`. 
- This function writes the failing question directly into a file called `unanswered.log`. 

**Why this is needed:** 
University staff can regularly open `unanswered.log` to see exactly what students are searching for that isn't in the database yet. They can then manually add those answers to the FAQ or knowledge base, constantly improving the chatbot over time.

---

## 4. How the Testing Was Done

Before signing off on the system, we ran automated tests to prove it handles tricky scenarios intelligently.

**What we did:** 
We created a testing script file called `test-runner.mjs` that simulates a user talking to the bot. 

**How we do it:** 
We launched the chatbot inside the terminal without the visual screen, and threw 7 specific testing scenarios at it to verify the results:
- **Test 1 & 2 (Bilingual Support):** We asked about contact hours in plain English and in Arabic. The bot replied in the correct language instantly.
- **Test 3 (Mixed Language):** We asked a sentence blending English and Arabic ("What are the شروط القبول for transfer students?"). It successfully understood the context regardless of the language mixing.
- **Test 4 (Follow-up Memory):** We asked "How long does it take?" immediately after an admission question. The AI successfully remembered the previous message and knew we were asking about the admission timeline.
- **Test 5 (Personalization):** We tested simulating a "Current IT Student". The bot correctly used this hidden profile data to offer IT-specific advice.
- **Test 6 (Unknown Handling):** We asked a nonsense question ("Where can I buy a pet dinosaur?"). The AI safely informed the user it only handles university questions.
- **Test 7 (Human Escalation):** We typed "I want to speak to a human". The AI correctly outputted a special tag `[ESCALATE]`, which the website turns into a giant red "Connect to UAEU Human Advisor" button for the user to click.

**Why this is needed:** 
Running these fake conversations proves that our AI safeguards work, that Arabic works flawlessly alongside English, and that frustrated students have an immediate escape hatch to a real human.

---

## 5. Project Demonstration (How to Use the Chatbot)

To completely understand the final product, here is a step-by-step breakdown of how a user interacts with the UAEU chatbot.

**What we did:** 
We designed a seamless front-to-back user experience.

**How we do it:**
1. **Launch the Interface:** The user opens the web page and is greeted by a clean, full-screen interface featuring the official UAEU logo.
2. **Set the Profile (Sidebar):** On the left side, the user selects their background (e.g., "Visitor" or "Current Student") and optionally types their major. They can also force the AI to speak Arabic or English using the language dropdown.
3. **Ask a Question:** The user types a question into the large chat box at the bottom, mimicking an experience similar to ChatGPT.
4. **Read the Response:** The AI analyzes the query and replies in seconds. If the AI pulled information from a specific university document, a small block will highlight the source so the student can verify it.
5. **Human Escalation:** If the user gets frustrated or types "help me talk to a real person", the AI stops answering and instantly presents a large, red "Connect to UAEU Human Advisor" button to take over the conversation via email or live chat.

**Why this is needed:** 
A robust demonstration confirms the system is not just code, but an approachable, accessible tool for non-technical university members to find information quickly.

---

## 6. Functional and Non-Functional Requirements

This section maps out exactly what the AI was built to do, and the quality standards it must uphold.

**What we did:** 
We met the core software engineering definitions for the chatbot project.

**How we do it:**
- **Functional Requirements (What the system MUST DO):**
  - Instantly answer frequently asked questions by reading a cached database.
  - Understand context from a massive internal database using math-based embeddings.
  - Automatically translate and communicate smoothly in both Arabic and English.
  - Personalize responses based on the student's selected background and major.
  - Gracefully hand the conversation over to a human staff member when appropriately asked.
- **Non-Functional Requirements (How the system MUST BEHAVE):**
  - **Speed & Performance:** Initial FAQ answers return instantly. Deep search answers return in seconds.
  - **Accuracy & Reliability:** The AI restricts itself strictly to verified UAEU documents before relying on Google.
  - **Usability:** The UI works beautifully on large screens and collapses into a neat, clean interface for mobile phones.
  - **Scalability:** We keep track of unanswered questions in an automated text log, naturally scaling the database as the student population grows.

**Why this is needed:** 
Defining these requirements proves that our final deliverable successfully checked off every architectural goal initially set for the product's MVP (Minimum Viable Product).

---

## 7. Comparison with Other UAE University Chatbots

When judging this system against existing legacy chatbots used across other universities in the UAE, the differences are drastic.

**What we did:** 
We built an adaptive "Generative AI" system, replacing the outdated "Decision Tree" bots used by most institutions.

**How we do it:**
- **Legacy UAE University Bots (e.g. older versions of campus bots):** Most regional university chatbots rely on strict programmed menus (e.g., "Press 1 for Admissions, Press 2 for Fees"). If a student types a complex or slightly misspelled question, the old bots simply error out with "I did not understand your message." 
- **The UAEU Chatbot Alternative:** Because our chatbot uses **Vector Embeddings**, it understands *intent* regardless of spelling, phrasing, or language. If an ancient bot is asked "how much is school next year", it breaks because the keyword isn't "fees". Our AI understands "how much is school" is synonymous with "fees" and delivers the document gracefully. 
- **Google Search Fallback:** When a question isn't local, other platforms dead-end. Our UAEU Chatbot connects directly to Google securely to fetch external information as an absolute last resort, practically eliminating the "I don't understand" dead-ends standard regional bots suffer from.

**Why this is needed:** 
This comparison highlights that our UAEU Chatbot is fundamentally smarter, more resilient, and much closer to a real human advisor than standard legacy menu bots.
