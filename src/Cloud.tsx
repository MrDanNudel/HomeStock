import { useEffect, useRef, useState } from 'react'
import { loadSavedItems } from './storage'
import type { HouseholdItem } from './types'
export type Person = { id: string; name: string; email: string }
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}
export async function request(path: string, body?: unknown) {
  let response: Response
  try { response = await fetch(`/api/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) }) }
  catch(e) { throw new Error((e as Error).name === 'TimeoutError' ? 'השרת לא ענה בזמן. נסה שוב בעוד רגע.' : 'לא ניתן להגיע לשרת. בדוק את החיבור לאינטרנט ונסה שוב.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error || 'השרת אינו זמין כרגע. נסה שוב בעוד רגע.', response.status, data?.code)
  if (!data) throw new Error('השרת החזיר תשובה לא צפויה. רענן את הדף ונסה שוב.')
  return data
}
export function CloudGate({ children }: { children: (person: Person, logout: () => void) => React.ReactNode }) {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState(true)
  useEffect(() => { let active = true; request('auth?action=config').then(async config => {
    if (!active) return
    setConfigured(config.configured)
    if (config.configured) { try { const data = await request('auth?action=session'); if(active) setPerson(data.user) } catch(e) { if(active && !(e instanceof ApiError && e.status === 401)) setError((e as Error).message) } }
  }).catch(() => { if(active) setError('לא ניתן להתחבר לשרת. נסה לרענן את הדף.') }).finally(() => { if(active) setLoading(false) }); return () => { active = false } }, [])
  const logout = async () => { try { await request('auth?action=signout', {}); setPerson(null) } catch(e) { setError((e as Error).message) } }
  if (loading) return <main className="auth-shell"><p>מתחברים לבית…</p></main>
  if (person) return <>{error && <div className="cloud-error" role="alert">{error}</div>}{children(person, logout)}</>
  return <main className="auth-shell"><form className="auth-card" onSubmit={async e => {
    e.preventDefault(); if(busy) return; setBusy(true); setError(''); setNotice('')
    const form = new FormData(e.currentTarget)
    try {
      const result = await request(`auth?action=${mode}`, { email: form.get('email'), password: form.get('password'), name: form.get('name') })
      try { const session = await request('auth?action=session'); setPerson(session.user) }
      catch(e) {
        if(e instanceof ApiError && e.status === 401) {
          if(mode === 'signup' && result.needsVerification) { setMode('signin'); setNotice('בקשת ההרשמה התקבלה. בדוק אם נשלחה אליך הודעת אימות (גם בספאם), אשר את האימייל ואז התחבר. אם כבר יש לך חשבון, התחבר עם הסיסמה הקיימת.') }
          else setError('פרטי הכניסה אושרו, אבל החיבור לחשבון לא נשמר בדפדפן. רענן ונסה שוב; אם הבעיה נמשכת, שלח לנו את ההודעה הזאת.')
        } else throw e
      }
    }
    catch(e) { setError((e as Error).message) } finally { setBusy(false) }
  }}><h1>מה יש בבית?</h1><p>המלאי שלכם, יחד ובכל מכשיר</p>
    {!configured ? <p role="alert">החיבור לענן עדיין לא הושלם. יש להגדיר ב־Vercel את NEON_AUTH_BASE_URL ואת DATABASE_URL.</p> : <>
    <h2>{mode === 'signin' ? 'כניסה לבית' : 'יצירת חשבון'}</h2>
    {mode === 'signup' && <label className="form-field"><span>השם שלך</span><input name="name" required maxLength={80} autoComplete="name" /></label>}
    <label className="form-field"><span>אימייל</span><input name="email" type="email" required dir="ltr" autoComplete="email" autoCapitalize="none" spellCheck={false} /></label>
    <label className="form-field"><span>סיסמה{mode === 'signup' && <small> — לפחות 8 תווים</small>}</span><input name="password" type={showPassword ? 'text' : 'password'} required minLength={mode === 'signup' ? 8 : 1} maxLength={128} dir="ltr" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
    <label className="password-visibility"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> הצגת הסיסמה</label>
    <button className="primary-button" disabled={busy}>{busy ? 'רגע…' : mode === 'signin' ? 'כניסה' : 'הרשמה'}</button>
    <button type="button" className="secondary-button" disabled={busy} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}>{mode === 'signin' ? 'אין לי חשבון — הרשמה' : 'יש לי חשבון — כניסה'}</button></>}
    {notice && <p role="status" className="auth-notice">{notice}</p>}
    {error && <p role="alert" className="cloud-error">{error}</p>}
  </form></main>
}
export function HouseholdSetup({ onReady }: { onReady: (invite?: string) => void }) {
  const [join, setJoin] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [savedItems] = useState(loadSavedItems)
  return <main className="auth-shell"><form className="auth-card" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError(''); const form = new FormData(e.currentTarget)
    try { const data = await request('stock', join ? { action: 'join', code: form.get('code') } : { action: 'create', name: form.get('name'), items: form.get('import') ? savedItems : [] }); onReady(data.inviteCode) }
    catch(e) { setError((e as Error).message) } finally { setBusy(false) }
  }}><h1>{join ? 'מצטרפים לבית' : 'הבית המשותף שלנו'}</h1>
    {join ? <label className="form-field"><span>קוד ההזמנה שקיבלת</span><input name="code" required dir="ltr" autoComplete="off" /></label> : <>
      <label className="form-field"><span>שם הבית</span><input name="name" defaultValue="הבית שלנו" required maxLength={80} /></label>
      {savedItems.length > 0 && <label><input type="checkbox" name="import" /> נמצאה רשימה ישנה בדפדפן הזה ({savedItems.length} מוצרים). להעתיק אותה לבית החדש</label>}
    </>}
    <button className="primary-button" disabled={busy}>{busy ? 'רגע…' : join ? 'הצטרפות לבית' : 'יצירת בית'}</button>
    <button type="button" className="secondary-button" disabled={busy} onClick={() => { setJoin(!join); setError('') }}>{join ? 'יצירת בית חדש' : 'יש לי קוד הזמנה'}</button>
    {error && <p role="alert" className="cloud-error">{error}</p>}
  </form></main>
}
export function useStock() {
  const [items, setItems] = useState<HouseholdItem[]>([])
  const [household, setHousehold] = useState<{id: string; name: string} | null | undefined>(undefined)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [syncing, setSyncing] = useState(false)
  const sequence = useRef(0), active = useRef(true), locked = useRef(false)
  async function refresh() {
    const current = ++sequence.current
    setSyncing(true)
    try { const data = await request('stock'); if(active.current && current === sequence.current) { setHousehold(data.household); setItems(data.items); setError('') }; return true }
    catch(e) { if(active.current && current === sequence.current) setError((e as Error).message); return false }
    finally { if(active.current && current === sequence.current) setSyncing(false) }
  }
  useEffect(() => {
    active.current = true
    const poll = () => { if(!document.hidden && !locked.current) void refresh() }
    poll(); const timer = setInterval(poll, 12000); window.addEventListener('focus', poll)
    return () => { active.current = false; ++sequence.current; clearInterval(timer); window.removeEventListener('focus', poll) }
  }, [])
  async function mutate(body: unknown) {
    if(locked.current) return false
    locked.current = true; ++sequence.current; setBusy(true)
    try { await request('stock', body); await refresh(); return true }
    catch(e) { const message = (e as Error).message; await refresh(); if(active.current) setError(message); return false }
    finally { locked.current = false; if(active.current) setBusy(false) }
  }
  return { items, household, error, busy, syncing, refresh, mutate }
}
