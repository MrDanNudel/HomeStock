import { starterItems } from './data'
import type { HouseholdItem } from './types'

const STORAGE_KEY = 'homestock-items-v1'

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
