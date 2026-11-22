/** Serialize request-start reservations across a bounded worker pool. */
export function createRequestStartGate(gapMs, { now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  let nextStartAt = 0;
  let queue = Promise.resolve();
  return function reserveStart(shouldCancel = () => false) {
    const reservation = queue.then(async () => {
      while (nextStartAt > now()) {
        if (shouldCancel()) return null;
        await sleep(Math.min(100, nextStartAt - now()));
      }
      if (shouldCancel()) return null;
      const startedAt = now();
      nextStartAt = startedAt + gapMs;
      return startedAt;
    });
    queue = reservation.catch(() => {});
    return reservation;
  };
}

/** Run bounded workers; a stop signal prevents new assignments and drains active work. */
export async function runBoundedWorkers(items, concurrency, worker, onResult, shouldStop = () => false) {
  let next = 0;
  const run = async () => {
    while (!shouldStop()) {
      const index = next++;
      if (index >= items.length) return;
      const result = await worker(items[index], index);
      await onResult(result, items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

/** Parse committed JSONL rows and identify only an unterminated crash tail for safe truncation. */
export function parseJsonlForResume(text) {
  const bytes = Buffer.isBuffer(text) ? text : Buffer.from(text, "utf8");
  const lastNewline = bytes.lastIndexOf(0x0a);
  const committedText = lastNewline < 0 ? "" : bytes.subarray(0, lastNewline + 1).toString("utf8");
  const tail = bytes.subarray(lastNewline + 1);
  const rows = committedText.trim()
    ? committedText.trim().split(/\r?\n/u).map((line, index) => {
      try { return JSON.parse(line); }
      catch { throw new Error(`Invalid captured JSON at line ${index + 1}; preserve and inspect the partial run before resuming.`); }
    })
    : [];
  let discardedTailBytes = tail.byteLength;
  if (tail.byteLength) {
    try { rows.push(JSON.parse(tail.toString("utf8"))); discardedTailBytes = 0; }
    catch { /* An unterminated final record was interrupted mid-write; discard only this tail. */ }
  }
  return { rows, discardedTailBytes };
}
