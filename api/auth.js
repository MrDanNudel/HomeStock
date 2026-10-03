import { authUrl, databaseUrl, checkOrigin, json, upstream, relayCookies, user, failure } from '../server/common.js';
export default async function handler(req, res) {
  try {
    checkOrigin(req);
    const action = req.query.action;
    if (req.method === 'GET' && action === 'config') return json(res, 200, { configured: !!(authUrl() && databaseUrl()) });
    if (req.method === 'GET' && action === 'session') return json(res, 200, { user: await user(req, res) });
    const paths = { signup: 'sign-up/email', signin: 'sign-in/email', signout: 'sign-out' };
    if (req.method !== 'POST' || !paths[action]) return json(res, 405, { error: 'פעולה לא נתמכת' });
    const body = req.body || {};
    if (action !== 'signout' && (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128)) return json(res, 400, { error: 'יש להזין אימייל וסיסמה של 8–128 תווים' });
    if (action === 'signup' && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80)) return json(res, 400, { error: 'יש להזין שם' });
    const response = await upstream(req, paths[action], action === 'signout' ? {} : { email: body.email, password: body.password, ...(action === 'signup' ? { name: body.name.trim() } : {}) });
    relayCookies(response, res);
    const result = await response.json();
    if (!response.ok) return json(res, response.status, { error: result.code === 'USER_ALREADY_EXISTS' ? 'האימייל כבר רשום. עבור להתחברות.' : 'ההתחברות לא הושלמה. בדוק את הפרטים; אם נשלח אימייל אימות, אשר אותו.' });
    return json(res, 200, { success: true });
  } catch (e) { return failure(res, e); }
}
