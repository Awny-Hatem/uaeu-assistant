# Data retention and privacy: memory, accounts and profiles

This covers what the assistant stores for FR3 (conversation memory) and FR4 (accounts and personalization), for how long, and who can read it.

## What is stored

| Data | Where | Kept for | Deleted when |
|---|---|---|---|
| Conversation turns (guest and signed-in) | `memory_turns` in the libSQL store (Turso in production) | 24 hours after the last message (`MEMORY_TTL_HOURS`). The expiry slides on each turn | The student clicks **Clear conversation** (rows are deleted at once, and SQLite `secure_delete` overwrites them), the TTL expires, or the account is deleted |
| Running summary of older turns | `memory_sessions.summary` | Same as the turns | Same as the turns |
| Memory key | Browser: httpOnly `uaeu_mem` cookie. Server: only its SHA-256 hash | Same as the turns | Rotated on Clear |
| Account (username, email, bcrypt hash at cost 12) | `accounts` | Until the account is deleted | Account deletion (`deleteAccount`) removes the account, profile, sessions, memory and topics |
| Sign-in session | `auth_sessions` (hashed refresh token). Browser: httpOnly `uaeu_at` (15-minute JWT) and `uaeu_rt` (refresh) | Up to 7 days (`AUTH_REFRESH_TTL_DAYS`) | Logout (the row is deleted, so even an unexpired access token stops working) or expiry |
| Profile: college, major, academic year, language | `profiles` | Until changed or the account is deleted | Clearing a field on `/profile` |
| Student ID (optional) | `profiles.student_id_enc`, AES-256-GCM encrypted | Until removed | "Remove saved student ID" on `/profile` |
| Topic history (optional, **off by default**) | `topic_history`: topic labels only, never message text, last 50 | Until turned off or deleted | Turning it off deletes the list. There is also a Delete button |

## Who can read it

- **Session-scoped access.** Every read and write is scoped by the verified session (the account UUID in the signed JWT) or by the httpOnly memory cookie. No route accepts an account ID from the request body or query. The `x-chat-account-id` header is only a consistency check: a mismatch returns 409 before any work is done.
- **Not exposed to the page.** A signed-in student's memory follows the account across devices. A guest cookie never opens an account's conversation after logout.
- **Student ID handling.** The student ID is never returned in full (only the last 4 digits). It is never used as a session or memory key, never logged, and never sent to the AI model. Tests check for the exact ID in prompts, logs, API responses and the database file.

## What reaches the AI model

- The recent turns (default 12 messages) and a short running summary of older ones. The summary is generated with instructions to drop names, IDs, contacts and any instruction-like text, and is sanitized again after generation.
- For a signed-in student, the saved major, college or year, but only when the question is about their own program and does not name another one. The prompt marks it as self-reported context, not evidence, and the answer says it used the saved profile.
- Nothing else about the student.

## Prompt-injection controls

- **Server-owned history.** Once a conversation has stored turns, the server ignores history sent by the browser, so forged assistant turns never reach the model.
- **No free text in the profile.** Profile fields must resolve to official catalog program and college names, so instructions cannot be stored there.
- **Fenced context.** Memory and summaries are passed as quoted, untrusted context. The existing grounding rules still require every fact to come from an official UAEU source.

## Configuration

- **Store:** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Without them a local file is used, which is not durable on Vercel.
- **Secrets:** `AUTH_JWT_SECRET` (at least 32 characters) and `PROFILE_ENCRYPTION_KEY`. Use a separate value for each, and a different one in each environment.
- **Memory:** `MEMORY_TTL_HOURS` and `MEMORY_RECENT_TURNS`. `SERVER_MEMORY=disabled` turns memory off.
