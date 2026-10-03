import type { Category, HouseholdItem } from './types'

export const categories: Category[] = [
  { id: 'groceries', name: 'מצרכים', icon: 'shopping-basket', exampleName: 'חלב', exampleNote: 'חלב 3%' },
  { id: 'snacks', name: 'שוקולד, חטיפים ושתייה', icon: 'cup-soda', exampleName: 'שוקולד', exampleNote: 'שוקולד מריר 70%' },
  { id: 'hygiene', name: 'מוצרי טיפוח והיגיינה', icon: 'sparkles', exampleName: 'שמפו', exampleNote: 'לעור רגיש' },
  { id: 'laundry', name: 'מוצרי כביסה', icon: 'shirt', exampleName: 'מרכך כביסה', exampleNote: 'לכביסה צבעונית' },
  { id: 'cleaning', name: 'מוצרי ניקוי', icon: 'spray-can', exampleName: 'נוזל רצפות', exampleNote: 'בריח לימון' },
  { id: 'dishwasher', name: 'מוצרי מדיח כלים', icon: 'utensils', exampleName: 'טבליות למדיח', exampleNote: 'טבליות הכוללות נוזל הברקה' },
  { id: 'household', name: 'ציוד כללי לבית', icon: 'package', exampleName: 'סוללות', exampleNote: 'סוללות AA' },
]

const now = new Date().toISOString()

export const starterItems: HouseholdItem[] = [
  { id: 'milk', categoryId: 'groceries', name: 'חלב', status: 'low', quantity: 1, unit: 'בקבוק', updatedAt: now, updatedBy: 'דן' },
  { id: 'bread', categoryId: 'groceries', name: 'לחם', status: 'missing', updatedAt: now, updatedBy: 'דן' },
  { id: 'eggs', categoryId: 'groceries', name: 'ביצים', status: 'available', quantity: 8, unit: 'יחידות', updatedAt: now, updatedBy: 'דן' },
  { id: 'rice', categoryId: 'groceries', name: 'אורז', status: 'available', quantity: 2, unit: 'חבילות', updatedAt: now, updatedBy: 'דן' },
  { id: 'shampoo', categoryId: 'hygiene', name: 'שמפו', status: 'low', updatedAt: now, updatedBy: 'דן' },
  { id: 'toothpaste', categoryId: 'hygiene', name: 'משחת שיניים', status: 'available', quantity: 2, unit: 'יחידות', updatedAt: now, updatedBy: 'דן' },
  { id: 'toilet-paper', categoryId: 'hygiene', name: 'נייר טואלט', status: 'missing', updatedAt: now, updatedBy: 'דן' },
  { id: 'softener', categoryId: 'laundry', name: 'מרכך כביסה', status: 'low', quantity: 1, unit: 'בקבוק', updatedAt: now, updatedBy: 'דן' },
  { id: 'detergent', categoryId: 'laundry', name: 'אבקת כביסה', status: 'available', updatedAt: now, updatedBy: 'דן' },
  { id: 'floor-cleaner', categoryId: 'cleaning', name: 'נוזל רצפות', status: 'missing', updatedAt: now, updatedBy: 'דן' },
  { id: 'dish-soap', categoryId: 'cleaning', name: 'סבון כלים', status: 'available', quantity: 1, unit: 'בקבוק', updatedAt: now, updatedBy: 'דן' },
]
