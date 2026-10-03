import { authUrl, databaseUrl, checkOrigin, json, upstream, relayCookies, user, failure } from '../server/common.js';
import { authError } from '../server/auth-errors.js';
export default async function handler(req, res) {
  try {
    checkOrigin(req);
    const action = req.query.action;
    if (req.method === 'GET' && action === 'config') return json(res, 200, { configured: !!(authUrl() && databaseUrl()) });
    if (req.method === 'GET' && action === 'session') return json(res, 200, { user: await user(req, res) });
    const paths = { signup: 'sign-up/email', signin: 'sign-in/email', signout: 'sign-out' };
    if (req.method !== 'POST' || !paths[action]) return json(res, 405, { error: 'פעולה לא נתמכת' });
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (action !== 'signout' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return json(res, 400, { code: 'INVALID_EMAIL', error: 'כתובת האימייל אינה תקינה. הזן כתובת מלאה, למשל name@example.com.' });
    if (action !== 'signout' && (typeof body.password !== 'string' || !body.password.length)) return json(res, 400, { code: 'PASSWORD_REQUIRED', error: 'יש להזין סיסמה.' });
    if (action === 'signup' && body.password.length < 8) return json(res, 400, authError({code:'PASSWORD_TOO_SHORT'},400));
    if (action !== 'signout' && body.password.length > 128) return json(res, 400, authError({code:'PASSWORD_TOO_LONG'},400));
    if (action === 'signup' && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80)) return json(res, 400, { error: 'יש להזין שם' });
    const response = await upstream(req, paths[action], action === 'signout' ? {} : { email, password: body.password, ...(action === 'signup' ? { name: body.name.trim() } : {}) });
    relayCookies(response, res);
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const details = authError(result, response.status);
      console.warn('HomeStock auth rejected:', action, response.status, details.code);
      return json(res, response.status >= 300 && response.status < 400 ? 502 : response.status, details);
    }
    if (action !== 'signout' && !result?.user) return json(res, 502, { code: 'INVALID_AUTH_RESPONSE', error: 'שירות ההתחברות החזיר תשובה לא צפויה. נסה שוב בעוד רגע.' });
    return json(res, 200, { success: true, ...(action === 'signup' ? { needsVerification: !result.token } : {}) });
  } catch (e) { return failure(res, e); }
}
