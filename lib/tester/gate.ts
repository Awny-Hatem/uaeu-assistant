/** One-click test identities are never available on a hosted instance or remote database. */
export function testerEnabled() {
  return process.env.UAEU_TESTER_ENABLED === 'true' && process.env.VERCEL !== '1' && !process.env.TURSO_DATABASE_URL?.trim() && Boolean(process.env.APP_STORE_URL?.startsWith('file:'));
}
export function testerRequestAllowed(req: Request) { return testerEnabled() && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(req.url).hostname); }
