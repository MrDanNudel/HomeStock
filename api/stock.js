import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { checkOrigin, json, user, db, failure } from '../server/common.js';
import { validateItem } from '../server/validation.js';
const hash = code => createHash('sha256').update(code).digest('hex');
export default async function handler(req, res) {
  try {
    checkOrigin(req);
    const person = await user(req, res);
    const sql = await db();
    const membership = await sql`SELECT h.id,h.name FROM homestock_members m JOIN homestock_households h ON h.id=m.household_id WHERE m.user_id=${person.id}`;
    const house = membership[0];
    if (req.method === 'GET') {
      if (!house) return json(res, 200, { household: null, items: [] });
      const rows = await sql`SELECT data,version FROM homestock_items WHERE household_id=${house.id} ORDER BY id`;
      return json(res, 200, { household: house, items: rows.map(r => ({ ...r.data, version: r.version })) });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'פעולה לא נתמכת' });
    const body = req.body || {};
    if (!house && body.action === 'create') {
      const id = randomUUID(), inviteCode = randomBytes(16).toString('hex');
      const name = typeof body.name === 'string' ? body.name.trim().slice(0,80) : '';
      if (!name) return json(res,400,{error:'יש להזין שם לבית'});
      const items = body.items || [];
      if (!Array.isArray(items) || items.length > 500) return json(res,400,{error:'ניתן להעביר עד 500 מוצרים'});
      const validated = items.map(validateItem).map(item => ({ ...item, updatedAt: new Date().toISOString(), updatedBy: person.name || person.email }));
      await sql.transaction([
        sql`INSERT INTO homestock_households(id,name,invite_hash) VALUES(${id},${name},${hash(inviteCode)})`,
        sql`INSERT INTO homestock_members(user_id,household_id) VALUES(${person.id},${id})`,
        ...validated.map(item => sql`INSERT INTO homestock_items(household_id,id,data) VALUES(${id},${item.id},${JSON.stringify(item)}::jsonb)`),
      ]);
      return json(res,200,{inviteCode});
    }
    if (!house && body.action === 'join') {
      if (typeof body.code !== 'string' || !/^[a-f0-9]{32}$/i.test(body.code.trim())) return json(res,400,{error:'קוד ההזמנה אינו תקין'});
      const joined = await sql`INSERT INTO homestock_members(user_id,household_id) SELECT ${person.id},id FROM homestock_households WHERE invite_hash=${hash(body.code.trim().toLowerCase())} RETURNING household_id`;
      if (!joined.length) return json(res,404,{error:'לא נמצא בית עם קוד ההזמנה הזה'});
      return json(res,200,{success:true});
    }
    if (!house) return json(res,403,{error:'יש ליצור בית או להצטרף לבית'});
    if (body.action === 'invite') {
      const inviteCode = randomBytes(16).toString('hex');
      await sql`UPDATE homestock_households SET invite_hash=${hash(inviteCode)} WHERE id=${house.id}`;
      return json(res,200,{inviteCode});
    }
    if (body.action === 'add' || body.action === 'update') {
      const clean = validateItem(body.item);
      const item = { ...clean, updatedAt: new Date().toISOString(), updatedBy: person.name || person.email };
      if (body.action === 'add') {
        const rows = await sql`INSERT INTO homestock_items(household_id,id,data) VALUES(${house.id},${item.id},${JSON.stringify(item)}::jsonb) ON CONFLICT DO NOTHING RETURNING version`;
        if (!rows.length) return json(res,409,{error:'המוצר כבר קיים. הרשימה תתרענן.'});
      } else {
        if (!Number.isInteger(body.item.version)) return json(res,400,{error:'גרסת המוצר חסרה'});
        const rows = await sql`UPDATE homestock_items SET data=${JSON.stringify(item)}::jsonb,version=version+1 WHERE household_id=${house.id} AND id=${item.id} AND version=${body.item.version} RETURNING version`;
        if (!rows.length) return json(res,409,{error:'המוצר השתנה במכשיר אחר. הרשימה תתרענן; פתח אותו שוב לעריכה.'});
      }
      return json(res,200,{success:true});
    }
    if (body.action === 'delete') {
      if (typeof body.id !== 'string' || !Number.isInteger(body.version)) return json(res,400,{error:'פרטי המחיקה אינם תקינים'});
      const rows = await sql`DELETE FROM homestock_items WHERE household_id=${house.id} AND id=${body.id} AND version=${body.version} RETURNING id`;
      if (!rows.length) return json(res,409,{error:'המוצר השתנה במכשיר אחר. בדוק אותו לפני המחיקה.'});
      return json(res,200,{success:true});
    }
    return json(res,400,{error:'פעולה לא נתמכת'});
  } catch(e) { return failure(res,e); }
}
