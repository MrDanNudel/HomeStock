import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Fish,
  Carrot,
  CircleAlert,
  CupSoda,
  House,
  Minus,
  PackageCheck,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  SprayCan,
  Shirt,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { categories } from './data'
import { CloudGate, HouseholdSetup, request, useStock, type Person } from './Cloud'
import { STATUS_META, type Category, type HouseholdItem, type ItemStatus } from './types'

const unitOptions = ['יחידות', 'בקבוקים', 'חבילות', 'ק״ג', 'ליטר', 'גלילים', 'אחר']

const iconForCategory = (category: Category) => {
  const props = { size: 20, strokeWidth: 1.9 }
  if (category.icon === 'fish') return <Fish {...props} />
  if (category.icon === 'carrot') return <Carrot {...props} />
  if (category.icon === 'utensils') return <Utensils {...props} />
  if (category.icon === 'cup-soda') return <CupSoda {...props} />
  if (category.icon === 'package') return <Package {...props} />
  if (category.icon === 'sparkles') return <Sparkles {...props} />
  if (category.icon === 'shirt') return <Shirt {...props} />
  if (category.icon === 'spray-can') return <SprayCan {...props} />
  return <ShoppingBasket {...props} />
}

function App() {
  return <CloudGate>{(person, logout) => <StockApp key={person.id} person={person} logout={logout} />}</CloudGate>
}
function StockApp({ person, logout }: { person: Person; logout: () => void }) {
  const { items, household, error, busy, syncing, refresh, mutate } = useStock()
  const [invite, setInvite] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [shoppingMode, setShoppingMode] = useState(false)
  const [editingItem, setEditingItem] = useState<HouseholdItem | null>(null)
  const [newItemCategory, setNewItemCategory] = useState<string | null>(null)
  const [toast, setToast] = useState('')


  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const missingCount = items.filter((item) => item.status === 'missing').length
  const lowCount = items.filter((item) => item.status === 'low').length

  const updateItem = async (next: HouseholdItem) => {
    if (await mutate({ action: 'update', item: next })) { setEditingItem(null); setToast('השינויים נשמרו בענן') }
  }
  const addItem = async (item: HouseholdItem) => {
    if (await mutate({ action: 'add', item })) { setNewItemCategory(null); setToast(`${item.name} נוסף לרשימה`) }
  }
  const removeItem = async (id: string) => {
    const item = items.find(item => item.id === id)
    if (item && window.confirm(`למחוק את ${item.name}?`) && await mutate({ action: 'delete', id, version: editingItem?.version ?? item.version })) { setEditingItem(null); setToast(`${item.name} נמחק`) }
  }
  const markPurchased = async (item: HouseholdItem) => {
    if(await mutate({ action: 'update', item: { ...item, status: 'available', urgent: false } })) setToast(`${item.name} סומן כקיים`)
  }
  if (household === undefined) return <main className="auth-shell"><div className="auth-card"><p>{error || 'טוענים את המלאי…'}</p><button className="secondary-button" onClick={refresh}>ניסיון נוסף</button><button className="secondary-button" onClick={logout}>יציאה</button></div></main>
  if (household === null) return <><HouseholdSetup onReady={() => { void refresh() }} /><button className="setup-logout secondary-button" onClick={logout}>יציאה מהחשבון</button></>

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><House size={21} /></span>
          <div>
            <h1>מה יש בבית?</h1>
            <p>{household.name} · {person.name}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="secondary-button" disabled={busy || inviteLoading} onClick={async () => { setInviteOpen(true); setInviteLoading(true); try { const data = await request('stock', { action: 'invite' }); setInvite(data.inviteCode) } catch(e) { setToast((e as Error).message) } finally { setInviteLoading(false) } }}>{inviteLoading ? 'יוצר קוד…' : 'הזמנה לבית'}</button>
          <button className="secondary-button" onClick={logout}>יציאה</button>
          <span className={`sync-pill ${!error && !syncing ? 'online' : ''}`}>
            <span className="sync-dot" />
            {error ? 'אין חיבור' : syncing ? 'מסנכרן…' : 'מחובר לענן'}
          </span>
          <button className={`shopping-button ${shoppingMode ? 'active' : ''}`} onClick={() => setShoppingMode((value) => !value)}>
            <ShoppingBasket size={19} />
            {shoppingMode ? 'חזרה לבית' : 'מצב קניות'}
            {(missingCount + lowCount) > 0 && <b>{missingCount + lowCount}</b>}
          </button>
        </div>
      </header>

      {error && <div className="cloud-error" role="alert">{error}</div>}
      {inviteOpen && invite && <section className="invite-panel"><strong>קוד הזמנה לבית</strong><p>בת הזוג נרשמת באתר ובוחרת ״יש לי קוד הזמנה״. יצירת קוד חדש מבטלת את הקודם.</p><code dir="ltr">{invite}</code><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(invite); setToast('הקוד הועתק') } catch { setToast('אפשר לסמן ולהעתיק את הקוד') } }}>העתקה</button><button className="secondary-button" onClick={() => { setInviteOpen(false); setInvite('') }}>סגירה</button></section>}
      <div className={busy ? 'stock-content saving' : 'stock-content'} aria-busy={busy}>
      <section className="summary-strip" aria-label="סיכום מלאי">
        <div><span className="summary-dot missing" /><strong>{missingCount}</strong><small>חסרים</small></div>
        <div><span className="summary-dot low" /><strong>{lowCount}</strong><small>עומדים להיגמר</small></div>
        <div><span className="summary-dot available" /><strong>{items.length - missingCount - lowCount}</strong><small>קיימים בבית</small></div>
      </section>

      {shoppingMode ? (
        <ShoppingView items={items} onEdit={setEditingItem} onPurchased={markPurchased} />
      ) : (
        <section className="category-grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              items={items.filter((item) => item.categoryId === category.id)}
              onEdit={setEditingItem}
              onAdd={() => setNewItemCategory(category.id)}
            />
          ))}
        </section>
      )}

      {(editingItem || newItemCategory) && (
        <ItemDialog
          item={editingItem}
          categoryId={editingItem?.categoryId ?? newItemCategory!}
          onClose={() => { setEditingItem(null); setNewItemCategory(null) }}
          onSave={editingItem ? updateItem : addItem}
          onDelete={editingItem ? () => removeItem(editingItem.id) : undefined}
        />
      )}

      </div>
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </main>
  )
}

function CategoryCard({ category, items, onEdit, onAdd }: { category: Category; items: HouseholdItem[]; onEdit: (item: HouseholdItem) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'urgent' | ItemStatus>('all')
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = useMemo(() => items
    .filter((item) => item.name.includes(query.trim()))
    .filter((item) => filter === 'all' || (filter === 'urgent' ? item.urgent === true && item.status !== 'available' : item.status === filter))
    .sort((a, b) => a.name.localeCompare(b.name, 'he')),
  [items, query, filter])

  const alerts = items.filter((item) => item.status !== 'available').length

  return (
    <article className={`category-card ${collapsed ? 'mobile-collapsed' : ''}`} data-category={category.id}>
      <div className="card-heading">
        <div className="category-title">
          <span className="category-icon">{iconForCategory(category)}</span>
          <div><h2>{category.name}</h2><p>{items.length} מוצרים{alerts ? ` · ${alerts} דורשים תשומת לב` : ''}</p></div>
        </div>
        <button type="button" className="card-toggle" aria-expanded={!collapsed} aria-controls={`category-content-${category.id}`} aria-label={`${collapsed ? 'פתיחת' : 'סגירת'} ${category.name}`} onClick={() => setCollapsed(value => !value)}><ChevronDown size={18} /></button>
        <button className="add-button" onClick={() => { setCollapsed(false); onAdd() }} aria-label={`הוספת מוצר אל ${category.name}`}><Plus size={20} /></button>
      </div>

      <div className="card-content" id={`category-content-${category.id}`}>
      <div className="card-tools">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ברשימה" /></label>
        <div className="select-wrap"><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="סינון לפי סטטוס">
          <option value="all">כל הסטטוסים</option><option value="missing">חסר</option><option value="low">עומד להיגמר</option><option value="available">קיים</option><option value="urgent">דחוף</option>
        </select></div>
      </div>

      <div className="item-list">
        {visibleItems.length ? visibleItems.map((item) => <ItemRow key={item.id} item={item} onEdit={() => onEdit(item)} />) : (
          <div className="empty-state"><Search size={22} /><span>לא נמצאו מוצרים</span></div>
        )}
      </div>
      </div>
    </article>
  )
}

function ItemRow({ item, onEdit }: { item: HouseholdItem; onEdit: () => void }) {
  return (
    <button className="item-row" onClick={onEdit}>
      <span className="item-main"><strong>{item.name}</strong>{item.urgent && item.status !== 'available' && <span className="urgent-badge"><CircleAlert size={13} />דחוף</span>}{item.quantity !== undefined && <small>{item.quantity} {item.unit ?? ''}</small>}</span>
      <span className={`status-badge ${item.status}`}><i />{STATUS_META[item.status].label}</span>
      <Pencil className="row-edit" size={15} />
    </button>
  )
}

function ShoppingView({ items, onEdit, onPurchased }: { items: HouseholdItem[]; onEdit: (item: HouseholdItem) => void; onPurchased: (item: HouseholdItem) => void }) {
  const shoppingItems = items.filter((item) => item.status !== 'available').sort((a, b) => a.name.localeCompare(b.name, 'he'))
  return (
    <section className="shopping-panel">
      <div className="shopping-heading">
        <div><span className="category-icon warm"><ShoppingBasket size={22} /></span><div><h2>רשימת הקניות</h2><p>{shoppingItems.length} מוצרים חסרים או עומדים להיגמר</p></div></div>
      </div>
      {shoppingItems.length ? [
        { urgent: true, items: shoppingItems.filter(item => item.urgent) },
        { urgent: false, items: shoppingItems.filter(item => !item.urgent) },
      ].filter(group => group.items.length > 0).map(group => <section key={String(group.urgent)} className={group.urgent ? 'urgent-shopping' : undefined} aria-label={group.urgent ? 'קניות דחופות' : 'יתר הקניות'}>
        {group.urgent && <h3 className="urgent-heading"><CircleAlert size={19} />דחוף — לקנות קודם</h3>}
        {categories.map((category) => {
        const categoryItems = group.items.filter((item) => item.categoryId === category.id)
        if (!categoryItems.length) return null
        return <div className="shopping-group" key={category.id}><h3>{iconForCategory(category)}{category.name}</h3>{categoryItems.map((item) => (
          <div className="shopping-row" key={item.id}>
            <button className="purchase-check" onClick={() => onPurchased(item)} aria-label={`סימון ${item.name} כנקנה`}><Check size={17} /></button>
            <button className="shopping-name" onClick={() => onEdit(item)}><strong>{item.name}</strong>{item.urgent && item.status !== 'available' && <span className="urgent-badge"><CircleAlert size={13} />דחוף</span>}{item.quantity !== undefined && <small>{item.quantity} {item.unit ?? ''}</small>}</button>
            <span className={`status-badge ${item.status}`}><i />{STATUS_META[item.status].label}</span>
          </div>
        ))}</div>
      })}</section>) : <div className="shopping-empty"><PackageCheck size={46} /><h3>הכול נמצא בבית</h3><p>אין כרגע מוצרים שחסרים או עומדים להיגמר.</p></div>}
    </section>
  )
}

function ItemDialog({ item, categoryId, onClose, onSave, onDelete }: { item: HouseholdItem | null; categoryId: string; onClose: () => void; onSave: (item: HouseholdItem) => void; onDelete?: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState(categoryId)
  const [name, setName] = useState(item?.name ?? '')
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? 'available')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(item?.unit ?? 'יחידות')
  const [urgent, setUrgent] = useState(item?.status !== 'available' && item?.urgent === true)
  const [note, setNote] = useState(item?.note ?? '')
  const category = categories.find((entry) => entry.id === selectedCategory)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({
      id: item?.id ?? crypto.randomUUID(),
      categoryId: selectedCategory,
      name: name.trim(),
      status,
      urgent: status !== 'available' && urgent,
      quantity: quantity === '' ? undefined : Math.max(0, Number(quantity)),
      unit: quantity === '' ? undefined : unit,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: item?.updatedBy ?? '',
      version: item?.version,
    })
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="dialog" onSubmit={submit}>
      <div className="dialog-heading"><div><span className="eyebrow">{category?.name}</span><h2>{item ? `עריכת ${item.name}` : 'הוספת מוצר חדש'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20} /></button></div>
      <label className="form-field"><span>קטגוריה</span><select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>{categories.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label className="form-field"><span>שם המוצר</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={`לדוגמה: ${category?.exampleName ?? 'מוצר לבית'}`} /></label>
      <fieldset className="status-picker"><legend>מה הסטטוס שלו?</legend>{(['available', 'low', 'missing'] as ItemStatus[]).map((value) => <button type="button" key={value} className={`${value} ${status === value ? 'selected' : ''}`} onClick={() => { setStatus(value); if(value === 'available') setUrgent(false) }}><i />{STATUS_META[value].label}</button>)}</fieldset>
      {status !== 'available' && <label className="urgent-option"><input type="checkbox" checked={urgent} onChange={event => setUrgent(event.target.checked)} /><span><strong>דחוף</strong><small>יופיע בראש רשימת הקניות</small></span><CircleAlert size={19} /></label>}
      <div className="quantity-section"><div className="section-label"><span>כמות נוכחית</span><small>לא חובה</small></div><div className="quantity-controls"><button type="button" onClick={() => setQuantity(String(Math.max(0, Number(quantity || 0) - 1)))}><Minus size={18} /></button><input type="number" min="0" step="0.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="—" /><button type="button" onClick={() => setQuantity(String(Number(quantity || 0) + 1))}><Plus size={18} /></button><select value={unit} onChange={(event) => setUnit(event.target.value)}>{unitOptions.map((value) => <option key={value}>{value}</option>)}</select></div></div>
      <label className="form-field"><span>הערה <small>לא חובה</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder={`לדוגמה: ${category?.exampleNote ?? 'מותג מועדף'}`} /></label>
      {quantity === '0' && status !== 'missing' && <button type="button" className="zero-hint" onClick={() => setStatus('missing')}><CircleAlert size={17} />הכמות היא 0 — לשנות את הסטטוס לחסר?</button>}
      <div className="dialog-footer">{onDelete && <button type="button" className="delete-button" onClick={onDelete}><Trash2 size={17} />מחיקה</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>ביטול</button><button className="primary-button" disabled={!name.trim()}>{item ? 'שמירת שינויים' : 'הוספת מוצר'}</button></div>
    </form>
  </div>
}

export default App
