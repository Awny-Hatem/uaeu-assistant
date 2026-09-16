import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "data");
const APPROVED_HOSTS = ["uaeu.ac.ae", "u.ae", "moe.gov.ae", "mohesr.gov.ae"];

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

function isApproved(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    APPROVED_HOSTS.some((approved) => host === approved || host.endsWith(`.${approved}`))
  );
}

async function checkUrl(value: string): Promise<string | null> {
  const url = new URL(value);
  if (!isApproved(url)) return "not an approved official HTTPS host";
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "UAEU-Chatbot-Source-Check/1.0" },
    });
    await response.body?.cancel();
    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : "request failed";
  }
}

async function main() {
  const urls = new Set<string>();
  for (const filename of filesUnder(DATA_ROOT)) {
    if (!/\.(?:json|md)$/i.test(filename)) continue;
    const content = fs.readFileSync(filename, "utf8");
    for (const match of content.matchAll(/https:\/\/[^\s"')\]>]+/g)) {
      urls.add(match[0].replace(/[.,;:]+$/, ""));
    }
  }

  const ordered = [...urls].sort();
  const failures: { url: string; reason: string }[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(8, ordered.length) }, async () => {
    while (cursor < ordered.length) {
      const index = cursor;
      cursor += 1;
      const url = ordered[index];
      const reason = await checkUrl(url);
      if (reason) failures.push({ url, reason });
    }
  });
  await Promise.all(workers);

  console.log(`Checked ${ordered.length} unique official source URLs.`);
  console.log(`Passed: ${ordered.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  for (const failure of failures) console.log(`- ${failure.url}: ${failure.reason}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
