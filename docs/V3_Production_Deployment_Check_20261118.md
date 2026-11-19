# V3 deployment check — 2026-11-18

## Branch preview

- URL: https://uaeu-assistant-ab459fh2n-awnyhatem40-gmailcoms-projects.vercel.app
- Vercel state: `READY`, target `preview`; built from the current local working tree at commit `eddd706`.
- `/api/health`: HTTP 200, `ok=true`, `mode=prototype`, `v3Enabled=true`, `architecture=v3-evidence-first`, provider `openai`, model `gpt-6.1-sol`.
- Chat smoke request (“Where can I check UAEU academic calendar deadlines?”) returned the official UAEU calendar link and a matching citation.
- Readiness remains false: durable server storage, shared Redis quotas/rate limits, and managed UAEU identity are not configured in this preview environment.

## Production

- Production alias: https://uaeu-assistant.vercel.app
- Latest Vercel production deployment inspected on 2026-11-18 was created 2026-11-11 and was `READY`; no production deployment was made in this check.
- `/api/health`: `mode=prototype`, `productionReady=false`, provider `openai`, model `gpt-4.1-mini`; health response has no V3 agent status. This confirms production is still on the older app build.
- Production Vercel environment variable inventory has no `UAEU_AGENT_V3_ENABLED`, `UPSTASH_REDIS_REST_URL`, or `UPSTASH_REDIS_REST_TOKEN`. No Vercel Marketplace resources are connected to this project.
- The branch preview setting `UAEU_AGENT_V3_ENABLED` does not enable V3 in production. The health flag is not a provider-credit indicator.

## Work completed during this check

- Corrected `runtimeContract()` so health reports `quotas=shared-upstash` when the same valid shared Redis configuration used for rate limiting is present. Without those credentials, it continues to report browser-local quotas and blocks production readiness.
- Added a security regression for the shared-quota readiness label and focused tests for atomic quota increment, cap enforcement, usage reads, fail-closed backend errors, HTTPS-only Redis, and HMAC-obscured identities.
- Verified `npm run test:security`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass on the current worktree.

## Release decision

This decision refers to the older snapshot above and is superseded by the current-state recheck below. The standalone public-information assistant does not require university SSO, personal student-record access, or durable chat history. Production is still not ready to promote because its active deployment is the legacy build, while the V3 worktree is dirty and not a pinned release candidate. The shared Redis resource is now configured for both Vercel environments; the active legacy production runtime still reports instance-local limits.

## Current-state recheck — 2026-11-18

The earlier preview and production observations above are historical snapshots. A later read-only health check found:

- Current branch Preview: `https://uaeu-assistant-ivwuw2yo9-awnyhatem40-gmailcoms-projects.vercel.app` returns `ok=true`, `mode=prototype`, V3 enabled, `quotas=shared-upstash`, and `rateLimits=shared-upstash`. Its revision is `eddd7069950833f0304c5d6b9f94ef2fe43e4245`; this does not include the latest uncommitted worktree changes.
- `productionReady=false` on that Preview because it is deliberately in `prototype` mode. The code now reports `Deployment mode is prototype` as a readiness blocker so the false flag has an explicit explanation. This health-message change is local and still needs a refreshed Preview deployment.
- Production alias: `https://uaeu-assistant.vercel.app` is still an older legacy build. Its health reports `mode=prototype`, legacy architecture, browser-local quotas, and instance-local rate limits. The production deployment has not been changed.
- Vercel's variable-name listing confirms the Upstash REST URL/token variables are assigned to both Preview and Production. Their presence alone does not switch the old production build to V3 or shared quotas; production needs a new build containing the shared-store implementation and V3 runtime, followed by health verification.
- The V3 standalone runtime contract does not require UAEU SSO, personal student-record access, or server-side chat history for a public-information assistant. Those capabilities remain explicitly unavailable. Production readiness still requires production mode, V3, reviewed knowledge, configured auth-cookie secret and answer provider, and shared Redis controls.

The acceptance action enabled the Redis resource/configuration; it did not set the application question caps or deploy code. Server-side caps remain configured in the app (`CHATBOT_GUEST_QUESTION_LIMIT`, `CHATBOT_STANDARD_QUESTION_LIMIT`, `CHATBOT_UAEU_QUESTION_LIMIT`, defaults 10/50/200), while Upstash holds the shared counters. No production deployment was made during this recheck.
