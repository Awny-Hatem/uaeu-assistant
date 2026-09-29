import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function selectEvaluationCases(fixture, requestedIds) {
  if (!Array.isArray(fixture.cases) || fixture.cases.length !== 100 ||
      new Set(fixture.cases.map(c => c.id)).size !== 100) {
    throw new Error('Acceptance fixture must contain exactly 100 unique cases');
  }
  if (requestedIds === undefined) return fixture.cases;
  const ids = requestedIds.split(',').map(id => id.trim());
  if (!ids.length || ids.some(id => !id)) throw new Error('Partial selection must contain nonempty case IDs');
  if (new Set(ids).size !== ids.length) throw new Error('Partial selection contains duplicate case IDs');
  const knownIds = new Set(fixture.cases.map(c => c.id));
  if (ids.some(id => !knownIds.has(id))) throw new Error('Partial selection contains unknown case IDs');
  const selected = new Set(ids);
  const cases = fixture.cases.filter(c => selected.has(c.id));
  const conversations = new Set(cases.map(c => c.conversation).filter(Boolean));
  if (fixture.cases.some(c => conversations.has(c.conversation) && !selected.has(c.id))) {
    throw new Error('Partial runs must not split conversational groups');
  }
  return cases;
}

export function sourceSnapshotHash(root = process.cwd()) {
  const hash = crypto.createHash('sha256');
  function add(relative) {
    const content = fs.readFileSync(path.join(root, relative));
    hash.update(relative.replaceAll('\\', '/'));
    hash.update(`\0${content.length}\0`);
    hash.update(content);
  }
  function visit(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })
      .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (/\.(?:tsx?|json|md|css)$/.test(entry.name) && !/embeddings\.json$/.test(entry.name)) add(filename);
    }
  }
  for (const directory of ['app', 'components', 'lib', 'data']) visit(directory);
  for (const filename of ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs']) add(filename);
  return hash.digest('hex');
}

export function endpointIdentity(health, responseUrl) {
  return {
    url: responseUrl,
    revision: health.build?.revision ?? null,
    contentFingerprint: health.knowledge?.contentFingerprint ?? null,
    provider: health.provider?.name ?? health.provider?.provider ?? null,
    model: health.provider?.model ?? null,
    crossProviderFallback: health.provider?.crossProviderFallback ?? null,
    retrieval: health.knowledge?.retrieval ?? null,
    deploymentMode: health.deployment?.mode ?? null,
  };
}

export function compareEndpointIdentity(start, end) {
  if (!end) return { unchanged: null, verifiable: false, reason: 'Final health identity is unavailable' };
  const unchanged = JSON.stringify(start) === JSON.stringify(end);
  const verifiable = Boolean(start.revision && start.revision !== 'unknown' && start.contentFingerprint &&
    end.revision && end.revision !== 'unknown' && end.contentFingerprint);
  return { unchanged, verifiable, reason: !unchanged ? 'Endpoint build/content/provider/configuration changed' :
    !verifiable ? 'Endpoint lacks a known build revision or content fingerprint' : 'Reported endpoint identity stayed stable' };
}

export function captureResponseBody(text) {
  try { return { payload: JSON.parse(text), capture: { kind: 'json', truncated: false } }; }
  catch {
    const limit = 1000;
    return {
      payload: { error: 'Non-JSON response', raw: text.slice(0, limit) },
      capture: {
        kind: 'non-json', truncated: text.length > limit, originalCharacters: text.length,
        retainedCharacters: Math.min(text.length, limit), originalSha256: crypto.createHash('sha256').update(text).digest('hex'),
      },
    };
  }
}
