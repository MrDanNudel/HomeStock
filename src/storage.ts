import { starterItems } from './data'
import type { HouseholdItem } from './types'

const STORAGE_KEY = 'homestock-items-v1'

export function loadSavedItems(): HouseholdItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items: unknown = JSON.parse(raw)
    if (!Array.isArray(items)) return []
    return items.filter((item): item is HouseholdItem => item !== null && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.name === 'string'
      && ['groceries', 'hygiene', 'laundry', 'cleaning', 'household', 'snacks', 'dishwasher'].includes(item.categoryId)
      && ['available', 'low', 'missing'].includes(item.status))
  } catch {
    return []
  }
}

export function loadItems(): HouseholdItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : starterItems
  } catch {
    return starterItems
  }
}

export function saveItems(items: HouseholdItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}
