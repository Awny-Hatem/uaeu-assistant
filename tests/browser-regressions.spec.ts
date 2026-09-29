import { test, expect, type Page } from '@playwright/test';

// Isolated browser-state and lifecycle tests. Mocked text here tests UI mechanics,
// not chatbot answer quality; the independent HTTP evaluation uses real answers.
const guestKey = 'uaeu-chatbot-guest-v4';
const user = { id: 'qa-account-a', username: 'QA account A', email: 'qa@example.invalid', studentType: 'Current Student', major: 'Computer Science', universityAffiliation: 'general' };
const otherUser = { ...user, id: 'qa-account-b', username: 'QA account B' };
const accountKey = 'uaeu-chatbot-account-messages-v1';
const answer = { content: 'The current-student document service is free.', source: 'faq', disposition: 'answer', citations: [] };

type DeferredChatWindow = typeof window & { __deferredChat: { started: boolean; bodyRead: boolean; abortObserved: boolean; release: () => void } };

// Deliberately ignore AbortSignal in this fault injection. The response must be
// discarded by conversation ownership even when transport cancellation fails.
async function deferredChat(page: Page, payload: typeof answer) {
  await page.addInitScript(({ payload }) => {
    const runtime = window as DeferredChatWindow;
    const originalFetch = window.fetch.bind(window);
    const probe = { started: false, bodyRead: false, abortObserved: false, release: () => {} };
    runtime.__deferredChat = probe;
    window.fetch = (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname !== '/api/chat') return originalFetch(input, init);
      probe.started = true;
      init?.signal?.addEventListener('abort', () => { probe.abortObserved = true; });
      return new Promise<Response>(resolve => {
        probe.release = () => {
          const response = new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
          const json = response.json.bind(response);
          response.json = async () => {
            const body = await json();
            probe.bodyRead = true;
            return body;
          };
          resolve(response);
        };
      });
    };
  }, { payload });
}

async function releaseAndFlushResponse(page: Page) {
  await page.evaluate(() => (window as DeferredChatWindow).__deferredChat.release());
  await expect.poll(() => page.evaluate(() => (window as DeferredChatWindow).__deferredChat.bodyRead)).toBe(true);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => (window as DeferredChatWindow).__deferredChat.abortObserved)).toBe(true);
}

async function guest(page: Page, state?: unknown) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: null } }));
  if (state) await page.addInitScript(({key,value}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, {key:guestKey,value:state});
}
async function submit(page: Page, question: string) {
  const input = page.getByTestId('chat-input');
  await expect(input).toBeVisible();
  await input.fill(question);
  await input.press('Enter');
}

for (const hungPath of ['/api/auth/session', '/api/history']) {
  test(`never-settling ${hungPath} stops loading at its bounded timeout`, async ({ page }) => {
    await page.addInitScript(({ hungPath, user }) => {
      const originalFetch = window.fetch.bind(window);
      const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
      const runtime = window as typeof window & { __deadlineProbe: { deadlines: number[]; aborted: number } };
      runtime.__deadlineProbe = { deadlines: [], aborted: 0 };
      // Keep the real timeout/abort mechanism, shorten only wall time for this
      // synthetic test, and assert the application requested its full10s bound.
      AbortSignal.timeout = milliseconds => {
        runtime.__deadlineProbe.deadlines.push(milliseconds);
        return originalTimeout(Math.min(milliseconds, 100));
      };
      window.fetch = (input, init) => {
        const pathname = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
        if (pathname === hungPath) return new Promise<Response>((_resolve, reject) => {
          const abort = () => { runtime.__deadlineProbe.aborted += 1; reject(new DOMException('Synthetic timed-out request', 'AbortError')); };
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener('abort', abort, { once: true });
        });
        if (pathname === '/api/auth/session') return Promise.resolve(new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        return originalFetch(input, init);
      };
    }, { hungPath, user });
    await page.goto('/');
    await expect(page.getByTestId('chat-input')).toBeEnabled();
    const probe = await page.evaluate(() => (window as typeof window & { __deadlineProbe: { deadlines: number[]; aborted: number } }).__deadlineProbe);
    expect(probe.deadlines).toContain(10_000);
    expect(probe.aborted).toBeGreaterThan(0);
    if (hungPath === '/api/auth/session') await expect(page.getByText(/session.*could not|session.*unavailable|could not.*session/i)).toBeVisible();
    else await expect(page.getByTestId('sign-out')).toBeVisible();
  });
}

test('startup session failure sends guest chat without a lingering authenticated cookie', async ({ page, context }) => {
  await context.addCookies([{ name: 'chat_session', value: 'synthetic-account-b', url: test.info().project.use.baseURL as string, httpOnly: true }]);
  await page.route('**/api/auth/session', route => route.fulfill({ status: 503, json: { error: 'synthetic unavailable' } }));
  let requestHeaders: Record<string, string> | undefined;
  await page.route('**/api/chat', async route => {
    requestHeaders = await route.request().allHeaders();
    await route.fulfill({ json: answer });
  });
  await page.goto('/');
  await submit(page, 'Synthetic guest question after a failed session check');
  await expect(page.getByText(answer.content, { exact: true })).toBeVisible();
  expect(requestHeaders?.['x-chat-account-id']).toBe('guest');
  expect(requestHeaders?.cookie || '').not.toContain('chat_session');
  expect((await context.cookies()).find(cookie => cookie.name === 'chat_session')?.value).toBe('synthetic-account-b');
});

test('cross-tab account change pauses on failed reconciliation then loads only the new owner history', async ({ page, context }) => {
  const origin = test.info().project.use.baseURL as string;
  await context.addCookies([{ name: 'chat_session', value: 'synthetic-account-a', url: origin, httpOnly: true }]);
  await page.addInitScript(({ key, userId }) => localStorage.setItem(key, JSON.stringify({
    [userId]: { messages: [{ id: 'a-history', role: 'assistant', content: 'ACCOUNT A PRIVATE HISTORY', source: 'faq' }] },
  })), { key: accountKey, userId: user.id });
  let sessionUnavailable = false;
  await page.route('**/api/auth/session', async route => {
    if (sessionUnavailable) return route.fulfill({ status: 503, json: { error: 'synthetic unavailable' } });
    const cookie = (await route.request().allHeaders()).cookie || '';
    return route.fulfill({ json: { user: cookie.includes('synthetic-account-b') ? otherUser : user } });
  });
  await page.route('**/api/history', async route => {
    expect(route.request().headers()['x-chat-account-id']).toBe(otherUser.id);
    await route.fulfill({ json: { messages: [{ id: 'b-history', role: 'assistant', content: 'ACCOUNT B ONLY HISTORY', source: 'faq' }] } });
  });
  let rejectedRequests = 0;
  await page.route('**/api/chat', async route => {
    expect(route.request().headers()['x-chat-account-id']).toBe(user.id);
    expect((await route.request().allHeaders()).cookie).toContain('synthetic-account-b');
    rejectedRequests += 1;
    await route.fulfill({ status: 409, json: { code: 'account_changed', error: 'Account changed' } });
  });
  await page.goto('/');
  await expect(page.getByText('ACCOUNT A PRIVATE HISTORY', { exact: true })).toBeVisible();
  const secondTab = await context.newPage();
  await secondTab.route('**/api/auth/session', route => route.fulfill({ json: { user } }));
  await secondTab.route('**/api/auth/login', route => route.fulfill({ headers: { 'Set-Cookie': 'chat_session=synthetic-account-b; Path=/; HttpOnly; SameSite=Lax' }, json: { user: otherUser } }));
  await secondTab.goto('/');
  await secondTab.evaluate(async () => { await fetch('/api/auth/login', { method: 'POST' }); });
  sessionUnavailable = true;
  await submit(page, 'ACCOUNT A PRIVATE FOLLOW-UP');
  await expect(page.getByRole('button', { name: 'Check sign-in status', exact: true })).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeDisabled();
  await expect(page.getByText('ACCOUNT A PRIVATE HISTORY', { exact: true })).toHaveCount(0);
  sessionUnavailable = false;
  await page.getByRole('button', { name: 'Check sign-in status', exact: true }).click();
  await expect(page.getByText('ACCOUNT B ONLY HISTORY', { exact: true })).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeEnabled();
  await expect(page.getByText('ACCOUNT A PRIVATE FOLLOW-UP', { exact: true })).toHaveCount(0);
  expect(rejectedRequests).toBe(1);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), accountKey);
  expect(JSON.stringify(stored[otherUser.id])).not.toContain('ACCOUNT A');
  expect(JSON.stringify(stored[user.id])).toContain('ACCOUNT A PRIVATE HISTORY');
  expect(await page.evaluate(() => localStorage.getItem('uaeu-chatbot-account-usage-v1'))).toBeNull();
  await secondTab.close();
});

test('history GET ownership conflict cannot import another account into the stale owner', async ({ page }) => {
  let conflictSeen = false;
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: conflictSeen ? otherUser : user } }));
  const owners: string[] = [];
  await page.route('**/api/history', route => {
    const owner = route.request().headers()['x-chat-account-id'];
    owners.push(owner);
    if (owner === user.id) conflictSeen = true;
    return owner === user.id
      ? route.fulfill({ status: 409, json: { code: 'account_changed' } })
      : route.fulfill({ json: { messages: [{ id: 'b', role: 'assistant', content: 'ONLY B SERVER HISTORY', source: 'faq' }] } });
  });
  await page.goto('/');
  await expect(page.getByText('ONLY B SERVER HISTORY', { exact: true })).toBeVisible();
  expect(owners).toContain(user.id);
  expect(owners).toContain(otherUser.id);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), accountKey);
  expect(JSON.stringify(stored[user.id] || {})).not.toContain('ONLY B SERVER HISTORY');
  expect(JSON.stringify(stored[otherUser.id])).toContain('ONLY B SERVER HISTORY');
});

for (const operation of ['clear', 'logout'] as const) {
  test(`stale-account ${operation} is reconciled without changing the new account`, async ({ page }) => {
    let switched = false;
    await page.addInitScript(({ key, userId }) => localStorage.setItem(key, JSON.stringify({
      [userId]: { messages: [{ id: 'a', role: 'user', content: 'ACCOUNT A SAVED QUESTION' }] },
    })), { key: accountKey, userId: user.id });
    await page.route('**/api/auth/session', route => route.fulfill({ json: { user: switched ? otherUser : user } }));
    let mutations = 0;
    const rejectMutation = async (route: import('@playwright/test').Route) => {
      expect(route.request().headers()['x-chat-account-id']).toBe(user.id);
      mutations += 1;
      await route.fulfill({ status: 409, json: { code: 'account_changed' } });
    };
    await page.route('**/api/auth/logout', rejectMutation);
    await page.route('**/api/history', route => route.request().method() === 'DELETE' ? rejectMutation(route) : route.fulfill({ json: { messages: [{ id: 'b', role: 'assistant', content: 'NEW ACCOUNT HISTORY PRESERVED', source: 'faq' }] } }));
    await page.goto('/');
    await expect(page.getByText('ACCOUNT A SAVED QUESTION', { exact: true })).toBeVisible();
    switched = true;
    await page.getByRole('button', { name: operation === 'clear' ? /clear conversation/i : /sign out/i }).first().click();
    await expect(page.getByText('NEW ACCOUNT HISTORY PRESERVED', { exact: true })).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeEnabled();
    expect(mutations).toBe(1);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), accountKey);
    expect(JSON.stringify(stored[otherUser.id])).not.toContain('ACCOUNT A');
  });
}

test('clearing an in-flight conversation does not restore its delayed answer', async ({ page }) => {
  await guest(page);
  await deferredChat(page, { ...answer, content: 'DELAYED OLD CONVERSATION RESPONSE' });
  await page.goto('/');
  await submit(page, 'Please explain transcript requests');
  await expect.poll(() => page.evaluate(() => (window as DeferredChatWindow).__deferredChat.started)).toBe(true);
  await page.getByRole('button', {name:/clear conversation/i}).first().click();
  await releaseAndFlushResponse(page);
  await expect(page.getByText('Please explain transcript requests', {exact:true})).toHaveCount(0);
  await expect(page.getByText('DELAYED OLD CONVERSATION RESPONSE', {exact:true})).toHaveCount(0);
  await expect(page.getByRole('textbox').last()).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').questionsUsed, guestKey)).toBe(0);
});

test('tenth guest answer remains readable without a blocking dialog', async ({ page }) => {
  await guest(page, { messages: [], questionsUsed: 9 });
  await page.route('**/api/chat', route => route.fulfill({ json: answer }));
  await page.goto('/');
  await submit(page, 'What does a transcript cost?');
  await expect(page.getByText(answer.content, {exact:true})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').questionsUsed, guestKey)).toBe(10);
  await page.reload();
  await expect(page.getByText(answer.content, {exact:true})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('canonical mode and complete generated-source audit survive local history reload', async ({ page }) => {
  await guest(page);
  const payloads = [
    { ...answer, content: 'SYNTHETIC CANONICAL ANSWER', responseMode: 'canonical', evidenceIds: ['answer:synthetic'] },
    { ...answer, content: 'SYNTHETIC GENERATED ANSWER WITH ITS CONDITION', responseMode: 'grounded_generation',
      claims: [{ text: 'SYNTHETIC GENERATED ANSWER WITH ITS CONDITION', evidenceIds: ['synthetic#E1S1'] }],
      grounding: { status: 'checked', rewriteCount: 0, reasonCodes: [] } },
  ];
  let next = 0;
  await page.route('**/api/chat', route => route.fulfill({ json: payloads[next++] }));
  await page.goto('/');
  for (const [index, payload] of payloads.entries()) {
    await submit(page, `Synthetic metadata transport question ${index}`);
    await expect(page.getByText(payload.content, { exact: true })).toBeVisible();
  }
  await page.reload();
  for (const payload of payloads) {
    await expect(page.getByText(payload.content, { exact: true })).toBeVisible();
    const stored = await page.evaluate(({ key, content }) => JSON.parse(localStorage.getItem(key) || '{}').messages?.find((message: { content: string }) => message.content === content), { key: guestKey, content: payload.content });
    expect(stored.responseMode).toBe(payload.responseMode);
    if ('claims' in payload) expect(stored.claims).toEqual(payload.claims);
    if ('evidenceIds' in payload) expect(stored.evidenceIds).toEqual(payload.evidenceIds);
  }
});

test('restored long Arabic history is bounded before transport', async ({ page }) => {
  const messages = Array.from({length:80}, (_,i) => ({ id:`long-${i}`, role:i%2 ? 'assistant' : 'user', content:'معلومات اختبار طويلة '.repeat(280), source:'faq' }));
  await guest(page, { messages, questionsUsed: 1 });
  let body = '';
  await page.route('**/api/chat', route => {
    body = route.request().postData() || '';
    return route.fulfill({ json: answer });
  });
  await page.goto('/');
  await submit(page, 'Newest question must survive the history budget');
  await expect.poll(() => body.length).toBeGreaterThan(0);
  expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(96 * 1024);
  const sent = JSON.parse(body);
  expect(sent.messages.at(-1).content).toBe('Newest question must survive the history budget');
  expect(sent.messages.length).toBeLessThan(80);
});

test('failed session lookup preserves local guest history', async ({ page }) => {
  await page.addInitScript(({key}) => localStorage.setItem(key, JSON.stringify({questionsUsed:1,messages:[{id:'saved',role:'assistant',content:'PRESERVED LOCAL ANSWER',source:'faq'}]})), {key:guestKey});
  await page.route('**/api/auth/session', route => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByText('PRESERVED LOCAL ANSWER', {exact:true})).toBeVisible();
  await expect(page.getByRole('textbox').last()).toBeEnabled();
});

test('a clarification does not acquire an unrelated contact action', async ({ page }) => {
  await guest(page);
  await page.route('**/api/chat', route => route.fulfill({json:{content:'Which intake year are you applying for?',source:'escalated',disposition:'clarify',citations:[]}}));
  await page.goto('/');
  await submit(page, 'When is the deadline?');
  await expect(page.getByText('Which intake year are you applying for?',{exact:true})).toBeVisible();
  await expect(page.getByRole('log').getByRole('link', { name: /contact UAEU staff|open UAEU contact page/i })).toHaveCount(0);
  await expect(page.getByRole('log').locator('a[href="https://www.uaeu.ac.ae/en/contact/index.shtml"]')).toHaveCount(0);
});

test('failed logout does not claim that the account has signed out', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({json:{user}}));
  await page.route('**/api/history', route => route.fulfill({json:{messages:[],enabled:false}}));
  await page.route('**/api/auth/logout', route => route.fulfill({status:503,json:{error:'Sign-out temporarily unavailable'}}));
  await page.goto('/');
  await page.getByRole('button',{name:/sign out/i}).first().click();
  await expect(page.getByRole('button',{name:/sign out/i}).first()).toBeVisible();
  await expect(page.getByText(/sign.out.*(failed|unavailable)|could not sign out/i).first()).toBeVisible();
});

test('mobile language selection and Arabic answer direction are available', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await guest(page);
  await page.route('**/api/chat', route => route.fulfill({json:{...answer,content:'خدمة كشف الدرجات للطالب الحالي مجانية.'}}));
  await page.goto('/');
  const selector = page.getByRole('combobox').filter({visible:true}).first();
  await selector.selectOption('ar');
  await submit(page, 'كم رسوم كشف الدرجات؟');
  await expect(page.getByText('خدمة كشف الدرجات للطالب الحالي مجانية.',{exact:true})).toBeVisible();
  const arabicAnswer = page.getByText('خدمة كشف الدرجات للطالب الحالي مجانية.', { exact: true });
  expect(await arabicAnswer.evaluate(element => element.closest('[dir]')?.getAttribute('dir'))).toBe('rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('authentication dialog is labelled and supports Escape and focus restoration', async ({ page }) => {
  await guest(page);
  await page.goto('/');
  const trigger = page.getByRole('button',{name:/^sign in$/i}).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Native showModal() supplies modality without a redundant aria-modal attribute.
  await expect.poll(() => dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  await expect(dialog.getByLabel(/username|email/i).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('a delayed account answer cannot appear after logout and a different login', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({json:{user}}));
  await page.route('**/api/history', route => route.fulfill({json:{messages:[],enabled:false}}));
  await page.route('**/api/auth/logout', route => route.fulfill({json:{ok:true}}));
  await page.route('**/api/auth/login', route => route.fulfill({json:{user:{...user,id:'qa-account-b',username:'QA account B'}}}));
  await deferredChat(page, { ...answer, content: 'PRIVATE ACCOUNT A RESPONSE' });
  await page.goto('/');
  await submit(page,'Account A question');
  await expect.poll(() => page.evaluate(() => (window as DeferredChatWindow).__deferredChat.started)).toBe(true);
  await page.getByTestId('sign-out').click();
  await page.getByRole('button',{name:/^sign in$/i}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel(/^username/i).fill('qa-account-b');
  await dialog.getByLabel(/^password$/i).fill('SyntheticPass123');
  await dialog.getByRole('button',{name:/^sign in$/i}).last().click();
  await expect(dialog).toHaveCount(0);
  const usageBefore = await page.evaluate(() => localStorage.getItem('uaeu-chatbot-account-usage-v1'));
  await releaseAndFlushResponse(page);
  await expect(page.getByText('PRIVATE ACCOUNT A RESPONSE',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Account A question',{exact:true})).toHaveCount(0);
  await expect(page.getByTestId('chat-input')).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('uaeu-chatbot-account-usage-v1'))).toBe(usageBefore);
  const stored = await page.evaluate(() => localStorage.getItem('uaeu-chatbot-account-messages-v1') || '');
  expect(stored).not.toContain('PRIVATE ACCOUNT A RESPONSE');
});

test('pending logout blocks new account work and cannot leak a late answer into guest history', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({json:{user}}));
  await page.route('**/api/history', route => route.fulfill({json:{messages:[
    {id:'pending-logout-question',role:'user',content:'Earlier synthetic account question'},
    {id:'pending-logout-answer',role:'assistant',content:'Earlier synthetic account answer',source:'faq'},
  ],enabled:true}}));
  let releaseLogout!: () => void;
  let logoutStarted!: () => void;
  const logoutGate = new Promise<void>(resolve => { releaseLogout = resolve; });
  const logoutRequest = new Promise<void>(resolve => { logoutStarted = resolve; });
  await page.route('**/api/auth/logout', async route => {
    logoutStarted();
    await logoutGate;
    await route.fulfill({json:{success:true}});
  });
  await deferredChat(page, { ...answer, content: 'SYNTHETIC ACCOUNT RESPONSE SENT DURING LOGOUT' });
  await page.goto('/');
  await page.getByTestId('sign-out').click();
  await logoutRequest;
  const input = page.getByTestId('chat-input');
  const allowedDuringLogout = await input.isEnabled();
  const clearAllowedDuringLogout = await page.getByTestId('clear-conversation').isEnabled();
  // Reproduce the inverse race on an unfixed client, without hanging a fixed
  // client whose transition lock correctly prevents creating this request.
  if (allowedDuringLogout) {
    await submit(page, 'Synthetic account question during pending sign-out');
    await expect.poll(() => page.evaluate(() => (window as DeferredChatWindow).__deferredChat.started)).toBe(true);
  }
  releaseLogout();
  await expect(page.getByRole('button',{name:/^sign in$/i}).first()).toBeVisible();
  if (allowedDuringLogout) {
    await page.evaluate(() => (window as DeferredChatWindow).__deferredChat.release());
    await expect.poll(() => page.evaluate(() => (window as DeferredChatWindow).__deferredChat.bodyRead)).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  await expect(page.getByText('SYNTHETIC ACCOUNT RESPONSE SENT DURING LOGOUT',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key) || '', guestKey)).not.toContain('SYNTHETIC ACCOUNT RESPONSE SENT DURING LOGOUT');
  expect(allowedDuringLogout).toBe(false);
  expect(clearAllowedDuringLogout).toBe(false);
  await expect(input).toBeEnabled();
});

test('an open account tab refreshes its quota at UAE midnight', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-29T19:59:50Z'));
  await page.addInitScript(({userId})=>localStorage.setItem('uaeu-chatbot-account-usage-v1',JSON.stringify({[userId]:{date:'2026-09-29',used:50}})),{userId:user.id});
  await page.route('**/api/auth/session',route=>route.fulfill({json:{user}}));
  await page.route('**/api/history',route=>route.fulfill({json:{messages:[],enabled:false}}));
  await page.route('**/api/chat',route=>route.fulfill({json:answer}));
  await page.goto('/');
  await expect(page.getByTestId('chat-input')).toBeDisabled();
  await page.clock.setFixedTime(new Date('2026-09-29T20:00:10Z'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('chat-input')).toBeEnabled();
  await submit(page,'First question on the new UAE day');
  await expect(page.getByText(answer.content,{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(userId=>JSON.parse(localStorage.getItem('uaeu-chatbot-account-usage-v1')||'{}')[userId],user.id)).toEqual({date:'2026-09-30',used:1});
});

test('failed server deletion is disclosed and cleared history stays cleared after reload', async ({ page }) => {
  await page.route('**/api/auth/session',route=>route.fulfill({json:{user}}));
  await page.route('**/api/history',route=> route.request().method()==='DELETE'
    ? route.fulfill({status:503,json:{error:'Synthetic deletion failure'}})
    : route.fulfill({json:{enabled:true,messages:[{id:'old-1',role:'user',content:'OLD SERVER QUESTION'},{id:'old-2',role:'assistant',content:'OLD SERVER ANSWER',source:'faq'}]}}));
  await page.goto('/');
  await expect(page.getByText('OLD SERVER ANSWER',{exact:true})).toBeVisible();
  await page.getByTestId('clear-conversation').click();
  await expect(page.getByText(/server deletion failed/i)).toBeVisible();
  await expect(page.getByText('OLD SERVER ANSWER',{exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('chat-input')).toBeVisible();
  await expect(page.getByText('OLD SERVER ANSWER',{exact:true})).toHaveCount(0);
});

test('authentication cannot be dismissed after its session cookie arrives but before UI ownership changes', async ({ page, context }) => {
  type PendingAuthWindow = typeof window & { __pendingAuth: { headersReceived: boolean; release: () => void } };
  await page.route('**/api/auth/session', route => route.fulfill({ json: {
    user: route.request().headers().cookie?.includes('chat_session=synthetic-auth-transition') ? user : null,
  } }));
  await page.route('**/api/history', route => route.fulfill({ json: { messages: [] } }));
  await page.route('**/api/auth/login', route => route.fulfill({
    json: { user },
    headers: { 'Set-Cookie': 'chat_session=synthetic-auth-transition; HttpOnly; Path=/; SameSite=Strict' },
  }));
  // Headers (and their Set-Cookie mutation) are real browser semantics. Only
  // application consumption of this synthetic JSON is delayed; no real auth
  // handler, account or provider is used.
  await page.addInitScript(() => {
    const runtime = window as unknown as PendingAuthWindow;
    const originalFetch = window.fetch.bind(window);
    runtime.__pendingAuth = { headersReceived: false, release: () => {} };
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname === '/api/auth/login') {
        const data = await response.json();
        runtime.__pendingAuth.headersReceived = true;
        response.json = () => new Promise(resolve => { runtime.__pendingAuth.release = () => resolve(data); });
      }
      return response;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^sign in$/i }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^username/i).fill('qa-account-a');
  await dialog.getByLabel(/^password$/i).fill('SyntheticPass123');
  await dialog.getByRole('button', { name: /^sign in$/i }).last().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as PendingAuthWindow).__pendingAuth.headersReceived)).toBe(true);
  expect((await context.cookies()).some(cookie => cookie.name === 'chat_session' && cookie.value === 'synthetic-auth-transition')).toBe(true);
  try {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('auth-close')).toBeDisabled();
  } finally {
    await page.evaluate(() => (window as unknown as PendingAuthWindow).__pendingAuth.release());
  }
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('sign-out')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeEnabled();
});

for (const recoverAfterRetry of [false, true]) {
  test(`malformed auth response reconciles its issued cookie${recoverAfterRetry ? ' after an explicit status retry' : ''}`, async ({ page }) => {
    let allowRecovery = !recoverAfterRetry;
    await page.route('**/api/auth/session', route => {
      const signedIn = route.request().headers().cookie?.includes('chat_session=synthetic-auth-transition');
      return signedIn && !allowRecovery
        ? route.fulfill({ status: 503, json: { error: 'Synthetic session failure' } })
        : route.fulfill({ json: { user: signedIn ? user : null } });
    });
    await page.route('**/api/history', route => route.fulfill({ json: { messages: [] } }));
    await page.route('**/api/auth/login', route => route.fulfill({
      status: 200,
      body: '{invalid synthetic JSON',
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'chat_session=synthetic-auth-transition; HttpOnly; Path=/; SameSite=Strict' },
    }));
    await page.goto('/');
    await page.getByRole('button', { name: /^sign in$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^username/i).fill('qa-account-a');
    await dialog.getByLabel(/^password$/i).fill('SyntheticPass123');
    await dialog.getByRole('button', { name: /^sign in$/i }).last().click();
    if (recoverAfterRetry) {
      await expect(dialog.getByText(/account status could not be confirmed/i)).toBeVisible();
      await expect(dialog.getByTestId('auth-close')).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      allowRecovery = true;
      await dialog.getByRole('button', { name: 'Check sign-in status' }).click();
    }
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('sign-out')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeEnabled();
  });
}
