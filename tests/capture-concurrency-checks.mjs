import assert from "node:assert/strict";
import { createRequestStartGate, parseJsonlForResume, runBoundedWorkers } from "../scripts/capture-concurrency.mjs";

let checks = 0;
const check = async (name, fn) => { await fn(); checks += 1; console.log(`PASS ${name}`); };

await check("global request-start gate serializes reservations at the minimum gap", async () => {
  let clock = 0;
  const starts = [];
  const reserve = createRequestStartGate(10, {
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
  });
  await Promise.all(Array.from({ length: 8 }, async () => starts.push(await reserve())));
  assert.equal(starts.length, 8);
  assert.deepEqual([...starts].sort((a, b) => a - b), starts);
  for (let index = 1; index < starts.length; index += 1) assert.ok(starts[index] - starts[index - 1] >= 10);
});

await check("worker pool respects concurrency and single callback writer", async () => {
  const items = Array.from({ length: 30 }, (_, index) => ({ id: `id-${index}` }));
  let active = 0;
  let maximum = 0;
  const written = [];
  await runBoundedWorkers(items, 3, async (item) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, item.id.endsWith("0") ? 3 : 1));
    active -= 1;
    return { id: item.id };
  }, (row) => {
    assert.ok(!written.some((existing) => existing.id === row.id));
    written.push(row);
  });
  assert.equal(maximum, 3);
  assert.equal(written.length, items.length);
  assert.equal(new Set(written.map(({ id }) => id)).size, items.length);
});

await check("stop prevents new assignments and drains already active answers", async () => {
  const items = Array.from({ length: 10 }, (_, index) => index);
  let stop = false;
  let started = 0;
  const completed = [];
  await runBoundedWorkers(items, 3, async (item) => {
    started += 1;
    if (started === 3) stop = true;
    await new Promise((resolve) => setTimeout(resolve, 2));
    return item;
  }, (result) => completed.push(result), () => stop);
  assert.equal(started, 3);
  assert.equal(completed.length, 3);
});

await check("resume parser preserves committed rows and drops only an incomplete final JSONL tail", async () => {
  const first = JSON.stringify({ id: "a" });
  const second = JSON.stringify({ id: "b" });
  const parsed = parseJsonlForResume(`${first}\n${second.slice(0, 8)}`);
  assert.deepEqual(parsed.rows, [{ id: "a" }]);
  assert.equal(parsed.discardedTailBytes, Buffer.byteLength(second.slice(0, 8), "utf8"));
  const completeNoNewline = parseJsonlForResume(first);
  assert.deepEqual(completeNoNewline.rows, [{ id: "a" }]);
  assert.equal(completeNoNewline.discardedTailBytes, 0);
  assert.throws(() => parseJsonlForResume(`${first}\nnot-json\n`), /Invalid captured JSON/u);
});

await check("rate gate cancels requests still waiting after stop is requested", async () => {
  let clock = 0;
  let stopped = false;
  const reserve = createRequestStartGate(100, {
    now: () => clock,
    sleep: async (ms) => { clock += ms; stopped = true; },
  });
  await reserve();
  assert.equal(await reserve(() => stopped), null);
});

console.log(`Passed ${checks} focused capture-concurrency checks.`);
