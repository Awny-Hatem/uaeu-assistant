/** Provider-resilience fault injection; fetch is fully replaced, no external calls. */
import assert from 'node:assert/strict';
import { AiProviderError, describeAiProviderError, generateAssistantResponse } from '../lib/ai-provider';

const originals = { fetch: globalThis.fetch, now: Date.now, timeout: AbortSignal.timeout, random: Math.random, setTimeout: globalThis.setTimeout };
const keys = ['AI_PROVIDER', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'AI_PROVIDER_FALLBACK', 'AI_PROVIDER_TIMEOUT_MS'] as const;
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const args = { system: 'Synthetic retry test', messages: [{ role: 'user' as const, content: 'Synthetic question only' }] };
const success = () => new Response(JSON.stringify({ status: 'completed', output_text: 'Synthetic answer' }));
const failure = (status: number, code?: string, retryAfter?: string, type?: string) => new Response(JSON.stringify({ error: {
  code, type, message: 'SYNTHETIC_PRIVATE_DIAGNOSTIC_MUST_NOT_ESCAPE', status: 'SYNTHETIC_PRIVATE_STATUS_MUST_NOT_ESCAPE',
} }), { status, headers: retryAfter === undefined ? {} : { 'Retry-After': retryAfter } });
let now = 1_000;
let waits: number[] = [];
let signals: number[] = [];
let requests: { url: string; body: unknown }[] = [];
let handler: (attempt: number, init?: RequestInit) => Response | Promise<Response>;
let timerOvershoot = 0;
let checks = 0;

async function check(name: string, run: () => void | Promise<void>) {
  now = 1_000; waits = []; signals = []; requests = []; timerOvershoot = 0;
  process.env.AI_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'synthetic-retry-key';
  process.env.GEMINI_API_KEY = 'synthetic-unused-key';
  delete process.env.AI_PROVIDER_FALLBACK;
  delete process.env.AI_PROVIDER_TIMEOUT_MS;
  await run(); checks += 1;
  console.log(`PASS ${name}`);
}

async function main() {
  Date.now = () => now;
  Math.random = () => 0.5;
  AbortSignal.timeout = milliseconds => { signals.push(milliseconds); return new AbortController().signal; };
  globalThis.setTimeout = ((callback: () => void, delay?: number) => {
    waits.push(delay ?? 0); now += (delay ?? 0) + timerOvershoot;
    queueMicrotask(callback);
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    assert.equal(url, 'https://api.openai.com/v1/responses', 'Network and cross-provider calls are forbidden in retry tests');
    assert.ok(init?.signal instanceof AbortSignal);
    requests.push({ url, body: JSON.parse(String(init?.body)) });
    return handler(requests.length, init);
  };
  try {
    await check('a successful response has no retry or extra provider request', async () => {
      handler = () => success();
      assert.equal((await generateAssistantResponse(args)).text, 'Synthetic answer');
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('temporary rate limit retries same unchanged request after server minimum plus jitter', async () => {
      handler = attempt => attempt === 1 ? failure(429, 'rate_limit_exceeded', '2') : success();
      assert.equal((await generateAssistantResponse({ ...args, deadlineAt: 11_000 })).text, 'Synthetic answer');
      assert.deepEqual(waits, [2125]); assert.deepEqual(signals, [10_000, 7875]);
      assert.deepEqual(requests[0], requests[1]);
    });
    await check('repeated overload stops at three attempts with exponential backoff', async () => {
      handler = () => failure(503, 'server_is_overloaded');
      await assert.rejects(generateAssistantResponse(args), error => error instanceof AiProviderError && error.providerStatus === 'OPENAI_UNAVAILABLE');
      assert.equal(requests.length, 3); assert.deepEqual(waits, [625, 1125]);
    });
    await check('HTTP-date retry hints are honored instead of exponential fallback', async () => {
      handler = attempt => attempt === 1 ? failure(503, 'server_is_overloaded', new Date(6000).toUTCString()) : success();
      await generateAssistantResponse(args); assert.deepEqual(waits, [5125]);
    });
    await check('fractional-second and zero delay hints retain nonnegative jitter', async () => {
      handler = attempt => attempt === 1 ? failure(429, 'slow_down', '0.25') : attempt === 2 ? failure(429, 'slow_down', '0') : success();
      await generateAssistantResponse(args); assert.deepEqual(waits, [375, 125]);
    });
    await check('invalid negative retry hints use bounded fallback, not a parsed historical date', async () => {
      handler = attempt => attempt === 1 ? failure(429, 'slow_down', '-1') : success();
      await generateAssistantResponse(args); assert.deepEqual(waits, [625]);
    });
    await check('long valid server hints are declined, never shortened into early retries', async () => {
      for (const hint of ['56', '9'.repeat(400), new Date(3_601_000).toUTCString()]) {
        requests = []; waits = []; handler = () => failure(429, 'rate_limit_exceeded', hint);
        await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 55_000 }));
        assert.equal(requests.length, 1); assert.deepEqual(waits, []);
      }
    });
    await check('insufficient quota and every documented billing/usage code are never retried', async () => {
      for (const code of ['insufficient_quota', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded', 'billing_hard_limit_reached']) {
        requests = []; waits = []; handler = () => failure(429, code, '0');
        await assert.rejects(generateAssistantResponse(args), error => error instanceof AiProviderError && error.providerStatus === 'OPENAI_QUOTA_EXHAUSTED');
        assert.equal(requests.length, 1); assert.deepEqual(waits, []);
      }
    });
    await check('quota type suppresses retries even under HTTP503 or an unfamiliar error code', async () => {
      handler = () => failure(503, 'new_billing_code', '0', 'insufficient_quota');
      await assert.rejects(generateAssistantResponse(args), error => error instanceof AiProviderError && error.providerStatus === 'OPENAI_QUOTA_EXHAUSTED');
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('auth permissions malformed requests and other nontransient4xx are not retried', async () => {
      for (const status of [400, 401, 403, 404, 422]) {
        requests = []; waits = []; handler = () => failure(status);
        await assert.rejects(generateAssistantResponse(args));
        assert.equal(requests.length, 1); assert.deepEqual(waits, []);
      }
    });
    await check('safe machine-readable errors distinguish known rate limits from unclassified429', async () => {
      for (const [code, expected] of [['rate_limit_exceeded', 'OPENAI_RATE_LIMITED'], [undefined, 'OPENAI_429_UNCLASSIFIED']] as const) {
        handler = () => failure(429, code, '56');
        await assert.rejects(generateAssistantResponse(args), error => {
          assert.ok(error instanceof AiProviderError);
          assert.equal(error.providerStatus, expected);
          assert.equal(error.cause, undefined);
          assert.equal(JSON.stringify(describeAiProviderError(error)).includes('PRIVATE'), false);
          assert.equal(error.message.includes('PRIVATE'), false);
          return true;
        });
      }
    });
    await check('transient network failure can recover without changing provider or request body', async () => {
      handler = attempt => { if (attempt === 1) throw new TypeError('Synthetic connection reset'); return success(); };
      await generateAssistantResponse(args); assert.equal(requests.length, 2); assert.deepEqual(waits, [625]);
      assert.deepEqual(requests[0], requests[1]);
    });
    await check('body-consumption network failure is covered by the same bounded retry', async () => {
      handler = attempt => attempt === 1 ? new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('Synthetic interrupted body')); } })) : success();
      await generateAssistantResponse(args); assert.equal(requests.length, 2); assert.deepEqual(waits, [625]);
    });
    await check('timeout or cancellation is not replayed as a transient network error', async () => {
      handler = () => { throw new DOMException('Synthetic timeout', 'TimeoutError'); };
      await assert.rejects(generateAssistantResponse(args), error => error instanceof AiProviderError && error.providerStatus === 'OPENAI_TIMEOUT');
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('malformed successful model output is not retried as a transport failure', async () => {
      handler = () => new Response(JSON.stringify({ output_text: '{broken' }));
      await assert.rejects(generateAssistantResponse({ ...args, evidenceIds: ['E1'] }), error => error instanceof AiProviderError && error.providerStatus === 'INVALID_GROUNDING_OUTPUT');
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('null or nonJSON server error body still uses the bounded status classification', async () => {
      handler = attempt => attempt === 1 ? new Response('null', { status: 500 }) : attempt === 2 ? new Response('<bad gateway>', { status: 502 }) : success();
      await generateAssistantResponse(args); assert.equal(requests.length, 3); assert.deepEqual(waits, [625, 1125]);
    });
    await check('retry requires both its delay and a minimum remaining attempt budget', async () => {
      handler = () => failure(429, 'slow_down', '2');
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 4000 }));
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('a timer that wakes beyond the deadline cannot allocate another request', async () => {
      timerOvershoot = 60_000; handler = () => failure(503);
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 55_000 }), error => error instanceof AiProviderError && error.providerStatus === 'ANSWER_DEADLINE_EXCEEDED');
      assert.equal(requests.length, 1); assert.deepEqual(waits, [625]);
    });
    await check('standalone calls share one20s budget instead of restarting it for each retry', async () => {
      handler = attempt => { now += attempt === 1 ? 10_000 : 1_000; return attempt === 1 ? failure(503) : success(); };
      await generateAssistantResponse(args);
      assert.deepEqual(signals, [20_000, 9375]);
    });
    await check('late response is rejected even if the transport ignores its abort signal', async () => {
      handler = () => { now = 55_001; return success(); };
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 55_000 }), error => error instanceof AiProviderError && error.providerStatus === 'ANSWER_DEADLINE_EXCEEDED');
      assert.equal(requests.length, 1); assert.deepEqual(waits, []);
    });
    await check('response-body consumption is actually aborted by the remaining deadline', async () => {
      const fakeNow = Date.now; const fakeTimer = globalThis.setTimeout; const fakeTimeout = AbortSignal.timeout;
      Date.now = originals.now; globalThis.setTimeout = originals.setTimeout; AbortSignal.timeout = originals.timeout;
      let keepAlive: ReturnType<typeof setTimeout> | undefined;
      try {
        handler = (_attempt, init) => new Response(new ReadableStream({ start(controller) {
          init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Body timeout', 'TimeoutError')), { once: true });
        } }));
        keepAlive = originals.setTimeout(() => {}, 500);
        await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: Date.now() + 20 }), error => error instanceof AiProviderError && error.providerStatus === 'OPENAI_TIMEOUT');
        assert.equal(requests.length, 1); assert.deepEqual(waits, []);
      } finally {
        if (keepAlive) clearTimeout(keepAlive);
        Date.now = fakeNow; globalThis.setTimeout = fakeTimer; AbortSignal.timeout = fakeTimeout;
      }
    });
  } finally {
    globalThis.fetch = originals.fetch; Date.now = originals.now; AbortSignal.timeout = originals.timeout;
    Math.random = originals.random; globalThis.setTimeout = originals.setTimeout;
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
  console.log(`${checks}/${checks} provider retry checks passed (synthetic; zero external network)`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
