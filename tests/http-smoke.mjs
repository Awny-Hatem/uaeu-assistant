const baseUrl = process.argv[2] || "http://localhost:3000";
const cookieJar = new Map();

function splitSetCookie(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,=]+=[^;,]*)/g).map((value) => value.trim());
}

function storeCookies(response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : splitSetCookie(response.headers.get("set-cookie"));

  for (const cookie of cookies) {
    const pair = cookie.split(";")[0];
    const separator = pair.indexOf("=");
    if (separator === -1) continue;

    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!value) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookies = cookieHeader();
  if (cookies && !headers.has("Cookie")) {
    headers.set("Cookie", cookies);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  storeCookies(response);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { response, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const username = `codex_http_${stamp}`;
const email = `${username}@uaeu.ac.ae`;
const password = "TestPass123!";
const arabicDocumentQuestion =
  "\u0627\u0628\u0627 \u0634\u0647\u0627\u062f\u0629 \u0644\u0645\u0646 \u064a\u0647\u0645\u0647 \u0627\u0644\u0623\u0645\u0631";

const arabic = await request("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    locale: "auto",
    messages: [{ role: "user", content: arabicDocumentQuestion }],
  }),
});

assert(arabic.response.status === 200, `Arabic chat status ${arabic.response.status}`);
assert(/[\u0600-\u06ff]/u.test(arabic.data.content || ""), "Arabic request lost its response language");
if (arabic.data.source === "guide") {
  assert(arabic.data.guide?.id === "to-whom-it-may-concern", `Arabic guide id ${arabic.data.guide?.id}`);
} else {
  assert(arabic.data.source === "faq" && arabic.data.responseMode === "canonical", `Arabic document route ${arabic.data.source}`);
  for (const fact of ["TWIMC", "وثائق الطلبة الحاليين", "My Requests", "مجانية"]) assert(arabic.data.content.includes(fact), `Arabic document procedure is missing ${fact}`);
  assert(arabic.data.citations?.some(source => source.url?.includes("serviceId=92")), "Missing current-student service source");
  assert(arabic.data.citations?.some(source => source.url?.endsWith("current-students-docs.pdf")), "Missing document-guide procedure source");
}
console.log("PASS Arabic document procedure over HTTP");

const signup = await request("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    username,
    email,
    password,
    studentType: "Current Student",
    major: "Computer Science",
  }),
});

assert(signup.response.status === 200, `Signup status ${signup.response.status}`);
assert(signup.data.user?.username === username, "Signup returned wrong user");
assert(signup.data.user?.universityAffiliation === "uaeu", "Signup did not preserve the self-reported university email category");
console.log("PASS Signup over HTTP (email category is self-reported, not verified membership)");

assert(cookieJar.has("chat_session"), "Signup did not return a session cookie");
assert(cookieJar.has("chat_local_accounts"), "Signup did not return a local account cookie");
assert(cookieJar.get("chat_session")?.startsWith("sealed3."), "Session cookie is not encrypted");
assert(
  cookieJar.get("chat_local_accounts")?.startsWith("sealed3."),
  "Local account cookie is not encrypted",
);
console.log("PASS Auth cookies use authenticated encryption");

const swappedCookieSession = await request("/api/auth/session", {
  headers: { Cookie: `chat_session=${cookieJar.get("chat_local_accounts")}` },
});
assert(swappedCookieSession.response.status === 200, "Swapped-cookie session request failed");
assert(swappedCookieSession.data.user === null, "Local-account cookie was accepted as a session");
assert(
  !JSON.stringify(swappedCookieSession.data).includes("passwordHash"),
  "Swapped cookie exposed a password hash",
);
console.log("PASS Auth cookie purposes cannot be substituted");

const logout = await request("/api/auth/logout", {
  method: "POST",
  headers: { 'x-chat-account-id': signup.data.user.id },
});
assert(logout.response.status === 200, `Logout status ${logout.response.status}`);
console.log("PASS Logout over HTTP");

const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ username: email, password }),
});

assert(login.response.status === 200, `Login status ${login.response.status}`);
assert(login.data.user?.username === username, "Login returned wrong user");
console.log("PASS Login over HTTP");

assert(cookieJar.has("chat_session"), "Login did not return a session cookie");

const session = await request("/api/auth/session");
assert(session.response.status === 200, `Session status ${session.response.status}`);
assert(session.data.user?.username === username, "Session did not return signed-in user");
assert(session.data.user?.universityAffiliation === "uaeu", "Session lost the self-reported email category");
console.log("PASS Session over HTTP");

const clearHistory = await request("/api/history", { method: "DELETE", headers: { 'x-chat-account-id': session.data.user.id } });
assert(clearHistory.response.status === 200, `History delete status ${clearHistory.response.status}`);
assert(clearHistory.data.cleared === true, "History delete did not confirm clearing");
console.log("PASS Conversation history deletion over HTTP");

const health = await request("/api/health");
assert(health.response.status === 200, `Health status ${health.response.status}`);
assert(health.data.ok === true, `Health not ready: ${JSON.stringify(health.data)}`);
assert(health.data.knowledge?.answerPacks?.complete === true, "Answer packs are incomplete");
assert(health.data.auth?.dedicatedSecretConfigured === true, "Auth secret is not configured");
assert(health.data.deployment?.identity === "self-reported-unverified", "Health must not claim managed or verified identity");
assert(health.data.deployment?.productionReady === false, "Prototype must not claim production readiness");
assert(health.data.deployment?.quotas === "browser-local", "Health must disclose prototype quota enforcement");
assert(health.data.deployment?.rateLimits === "instance-local", "Health must disclose instance-local rate limits");
console.log("PASS Health completeness over HTTP");
console.log("PASS Prototype identity and enforcement limits are disclosed");

console.log(`SMOKE_ACCOUNT=${username}`);
