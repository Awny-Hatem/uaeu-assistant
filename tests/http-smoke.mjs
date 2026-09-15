const baseUrl = process.argv[2] || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { response, data };
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const username = `codex_http_${stamp}`;
const email = `${username}@uea.ac.ae`;
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
assert(arabic.data.source === "guide", `Arabic chat source ${arabic.data.source}`);
assert(
  arabic.data.guide?.id === "to-whom-it-may-concern",
  `Arabic guide id ${arabic.data.guide?.id}`,
);
console.log("PASS Arabic guide request over HTTP");

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
assert(signup.data.user?.universityAffiliation === "uaeu", "Signup did not detect UAEU affiliation");
console.log("PASS Signup over HTTP");

const signupCookie = cookieFrom(signup.response);
assert(signupCookie, "Signup did not return a session cookie");

const logout = await request("/api/auth/logout", {
  method: "POST",
  headers: { Cookie: signupCookie },
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

const loginCookie = cookieFrom(login.response);
assert(loginCookie, "Login did not return a session cookie");

const session = await request("/api/auth/session", {
  headers: { Cookie: loginCookie },
});
assert(session.response.status === 200, `Session status ${session.response.status}`);
assert(session.data.user?.username === username, "Session did not return signed-in user");
assert(session.data.user?.universityAffiliation === "uaeu", "Session lost affiliation");
console.log("PASS Session over HTTP");

console.log(`SMOKE_ACCOUNT=${username}`);
