import { neon } from '@neondatabase/serverless';
export const authUrl = () => process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL;
export const databaseUrl = () => process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL;
export function json(res, status, data) { res.setHeader('Cache-Control', 'no-store'); return res.status(status).json(data); }
export function checkOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && new URL(origin).host !== host) throw Object.assign(new Error('הבקשה נחסמה'), { status: 403 });
  if (req.headers['sec-fetch-site'] === 'cross-site') throw Object.assign(new Error('הבקשה נחסמה'), { status: 403 });
}
export async function upstream(req, path, body) {
  const base = authUrl();
  if (!base) throw Object.assign(new Error('שירות ההתחברות עדיין לא הוגדר'), { status: 503 });
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  if (req.headers.origin) headers.Origin = req.headers.origin;
  return fetch(`${base.replace(/\/$/, '')}/${path}`, {
    method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000), redirect: 'manual',
  });
}
export function relayCookies(response, res) {
  const cookies = response.headers.getSetCookie().map(c => c.replace(/;\s*Domain=[^;]+/ig, '').replace(/;\s*Path=[^;]+/ig, '; Path=/'));
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
}
export async function user(req, res) {
  const response = await upstream(req, 'get-session?disableCookieCache=true');
  relayCookies(response, res);
  if (!response.ok) throw Object.assign(new Error('יש להתחבר מחדש'), { status: 401 });
  const session = await response.json();
  if (!session?.user?.id || !session?.session) throw Object.assign(new Error('יש להתחבר כדי לגשת למלאי'), { status: 401 });
  return session.user;
}
let ready;
export async function db() {
  if (!databaseUrl()) throw Object.assign(new Error('מסד הנתונים עדיין לא חובר'), { status: 503 });
  const sql = neon(databaseUrl());
  if (!ready) ready = sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS homestock_households (id uuid PRIMARY KEY, name text NOT NULL, invite_hash text UNIQUE NOT NULL)`,
    sql`CREATE TABLE IF NOT EXISTS homestock_members (user_id text PRIMARY KEY, household_id uuid NOT NULL REFERENCES homestock_households(id))`,
    sql`CREATE TABLE IF NOT EXISTS homestock_items (household_id uuid NOT NULL REFERENCES homestock_households(id), id text NOT NULL, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1, PRIMARY KEY (household_id,id))`,
  ]).catch(e => { ready = undefined; throw e; });
  await ready;
  return sql;
}
export function failure(res, e) {
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return json(res, 504, { code: 'AUTH_TIMEOUT', error: 'השרת לא ענה בזמן. בדוק את החיבור ונסה שוב.' });
  if (!e.status) console.error('HomeStock request failed:', e.code || e.name);
  return json(res, e.status || 500, { error: e.status ? e.message : 'לא ניתן להשלים את הפעולה כרגע. נסה שוב.' });
}
