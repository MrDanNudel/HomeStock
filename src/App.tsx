import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  CircleAlert,
  House,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  SprayCan,
  Shirt,
  Trash2,
  X,
} from 'lucide-react'
import { categories } from './data'
import { loadItems, saveItems } from './storage'
import { isCloudConfigured } from './supabase'
import { STATUS_META, type Category, type HouseholdItem, type ItemStatus, type SortMode } from './types'

const statusOrder: Record<ItemStatus, number> = { missing: 0, low: 1, available: 2 }
const unitOptions = ['יחידות', 'בקבוקים', 'חבילות', 'ק״ג', 'ליטר', 'גלילים', 'אחר']

const iconForCategory = (category: Category) => {
  const props = { size: 20, strokeWidth: 1.9 }
  if (category.icon === 'sparkles') return <Sparkles {...props} />
  if (category.icon === 'shirt') return <Shirt {...props} />
  if (category.icon === 'spray-can') return <SprayCan {...props} />
  return <ShoppingBasket {...props} />
}

function App() {
  const [items, setItems] = useState<HouseholdItem[]>(loadItems)
  const [shoppingMode, setShoppingMode] = useState(false)
  const [editingItem, setEditingItem] = useState<HouseholdItem | null>(null)
  const [newItemCategory, setNewItemCategory] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => saveItems(items), [items])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const missingCount = items.filter((item) => item.status === 'missing').length
  const lowCount = items.filter((item) => item.status === 'low').length

  const updateItem = (next: HouseholdItem) => {
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)))
    setEditingItem(null)
    setToast('השינויים נשמרו')
  }

  const addItem = (item: HouseholdItem) => {
    setItems((current) => [...current, item])
    setNewItemCategory(null)
    setToast(`${item.name} נוסף לרשימה`)
  }

  const removeItem = (id: string) => {
    const name = items.find((item) => item.id === id)?.name
    setItems((current) => current.filter((item) => item.id !== id))
    setEditingItem(null)
    setToast(`${name ?? 'המוצר'} נמחק`)
  }

  const markPurchased = (item: HouseholdItem) => {
    updateItem({ ...item, status: 'available', updatedAt: new Date().toISOString(), updatedBy: 'דן' })
    setToast(`${item.name} סומן כקיים`)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><House size={21} /></span>
          <div>
            <h1>מה יש בבית?</h1>
            <p>המלאי המשותף שלנו</p>
          </div>
        </div>
        <div className="header-actions">
          <span className={`sync-pill ${isCloudConfigured ? 'online' : ''}`}>
            <span className="sync-dot" />
            {isCloudConfigured ? 'מסונכרן' : 'מצב מקומי'}
          </span>
          <button className={`shopping-button ${shoppingMode ? 'active' : ''}`} onClick={() => setShoppingMode((value) => !value)}>
            <ShoppingBasket size={19} />
            {shoppingMode ? 'חזרה לבית' : 'מצב קניות'}
            {(missingCount + lowCount) > 0 && <b>{missingCount + lowCount}</b>}
          </button>
        </div>
      </header>

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

      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </main>
  )
}

function CategoryCard({ category, items, onEdit, onAdd }: { category: Category; items: HouseholdItem[]; onEdit: (item: HouseholdItem) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | ItemStatus>('all')
  const [sort, setSort] = useState<SortMode>('alphabetical')

  const visibleItems = useMemo(() => items
    .filter((item) => item.name.includes(query.trim()))
    .filter((item) => filter === 'all' || item.status === filter)
    .sort((a, b) => sort === 'alphabetical'
      ? a.name.localeCompare(b.name, 'he')
      : statusOrder[a.status] - statusOrder[b.status] || a.name.localeCompare(b.name, 'he')),
  [items, query, filter, sort])

  const alerts = items.filter((item) => item.status !== 'available').length

  return (
    <article className="category-card">
      <div className="card-heading">
        <div className="category-title">
          <span className="category-icon">{iconForCategory(category)}</span>
          <div><h2>{category.name}</h2><p>{items.length} מוצרים{alerts ? ` · ${alerts} דורשים תשומת לב` : ''}</p></div>
        </div>
        <button className="add-button" onClick={onAdd} aria-label={`הוספת מוצר אל ${category.name}`}><Plus size={20} /></button>
      </div>

      <div className="card-tools">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ברשימה" /></label>
        <div className="select-wrap"><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="סינון לפי סטטוס">
          <option value="all">כל הסטטוסים</option><option value="missing">חסר</option><option value="low">עומד להיגמר</option><option value="available">קיים</option>
        </select><ChevronDown size={15} /></div>
        <button className="sort-button" onClick={() => setSort((value) => value === 'alphabetical' ? 'status' : 'alphabetical')}>{sort === 'alphabetical' ? 'א׳–ב׳' : 'לפי סטטוס'}</button>
      </div>

      <div className="item-list">
        {visibleItems.length ? visibleItems.map((item) => <ItemRow key={item.id} item={item} onEdit={() => onEdit(item)} />) : (
          <div className="empty-state"><Search size={22} /><span>לא נמצאו מוצרים</span></div>
        )}
      </div>
    </article>
  )
}

function ItemRow({ item, onEdit }: { item: HouseholdItem; onEdit: () => void }) {
  return (
    <button className="item-row" onClick={onEdit}>
      <span className="item-main"><strong>{item.name}</strong>{item.quantity !== undefined && <small>{item.quantity} {item.unit ?? ''}</small>}</span>
      <span className={`status-badge ${item.status}`}><i />{STATUS_META[item.status].label}</span>
      <Pencil className="row-edit" size={15} />
    </button>
  )
}

function ShoppingView({ items, onEdit, onPurchased }: { items: HouseholdItem[]; onEdit: (item: HouseholdItem) => void; onPurchased: (item: HouseholdItem) => void }) {
  const shoppingItems = items.filter((item) => item.status !== 'available').sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  return (
    <section className="shopping-panel">
      <div className="shopping-heading">
        <div><span className="category-icon warm"><ShoppingBasket size={22} /></span><div><h2>רשימת הקניות</h2><p>{shoppingItems.length} מוצרים חסרים או עומדים להיגמר</p></div></div>
      </div>
      {shoppingItems.length ? categories.map((category) => {
        const categoryItems = shoppingItems.filter((item) => item.categoryId === category.id)
        if (!categoryItems.length) return null
        return <div className="shopping-group" key={category.id}><h3>{iconForCategory(category)}{category.name}</h3>{categoryItems.map((item) => (
          <div className="shopping-row" key={item.id}>
            <button className="purchase-check" onClick={() => onPurchased(item)} aria-label={`סימון ${item.name} כנקנה`}><Check size={17} /></button>
            <button className="shopping-name" onClick={() => onEdit(item)}><strong>{item.name}</strong>{item.quantity !== undefined && <small>{item.quantity} {item.unit ?? ''}</small>}</button>
            <span className={`status-badge ${item.status}`}><i />{STATUS_META[item.status].label}</span>
          </div>
        ))}</div>
      }) : <div className="shopping-empty"><PackageCheck size={46} /><h3>הכול נמצא בבית</h3><p>אין כרגע מוצרים שחסרים או עומדים להיגמר.</p></div>}
    </section>
  )
}

function ItemDialog({ item, categoryId, onClose, onSave, onDelete }: { item: HouseholdItem | null; categoryId: string; onClose: () => void; onSave: (item: HouseholdItem) => void; onDelete?: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? 'available')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(item?.unit ?? 'יחידות')
  const [note, setNote] = useState(item?.note ?? '')
  const category = categories.find((entry) => entry.id === categoryId)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({
      id: item?.id ?? crypto.randomUUID(),
      categoryId,
      name: name.trim(),
      status,
      quantity: quantity === '' ? undefined : Math.max(0, Number(quantity)),
      unit: quantity === '' ? undefined : unit,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: 'דן',
    })
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="dialog" onSubmit={submit}>
      <div className="dialog-heading"><div><span className="eyebrow">{category?.name}</span><h2>{item ? `עריכת ${item.name}` : 'הוספת מוצר חדש'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20} /></button></div>
      <label className="form-field"><span>שם המוצר</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="לדוגמה: חלב" /></label>
      <fieldset className="status-picker"><legend>מה הסטטוס שלו?</legend>{(['available', 'low', 'missing'] as ItemStatus[]).map((value) => <button type="button" key={value} className={`${value} ${status === value ? 'selected' : ''}`} onClick={() => setStatus(value)}><i />{STATUS_META[value].label}</button>)}</fieldset>
      <div className="quantity-section"><div className="section-label"><span>כמות נוכחית</span><small>לא חובה</small></div><div className="quantity-controls"><button type="button" onClick={() => setQuantity(String(Math.max(0, Number(quantity || 0) - 1)))}><Minus size={18} /></button><input type="number" min="0" step="0.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="—" /><button type="button" onClick={() => setQuantity(String(Number(quantity || 0) + 1))}><Plus size={18} /></button><select value={unit} onChange={(event) => setUnit(event.target.value)}>{unitOptions.map((value) => <option key={value}>{value}</option>)}</select></div></div>
      <label className="form-field"><span>הערה <small>לא חובה</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="לדוגמה: חלב 3%" /></label>
      {quantity === '0' && status !== 'missing' && <button type="button" className="zero-hint" onClick={() => setStatus('missing')}><CircleAlert size={17} />הכמות היא 0 — לשנות את הסטטוס לחסר?</button>}
      <div className="dialog-footer">{onDelete && <button type="button" className="delete-button" onClick={onDelete}><Trash2 size={17} />מחיקה</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>ביטול</button><button className="primary-button" disabled={!name.trim()}>{item ? 'שמירת שינויים' : 'הוספת מוצר'}</button></div>
    </form>
  </div>
}

export default App
