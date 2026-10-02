export type ItemStatus = 'available' | 'low' | 'missing'

export type HouseholdItem = {
  id: string
  categoryId: string
  name: string
  status: ItemStatus
  quantity?: number
  unit?: string
  note?: string
  updatedAt: string
  updatedBy: string
}

export type Category = {
  id: string
  name: string
  icon: string
}

export type SortMode = 'alphabetical' | 'status'

export const STATUS_META: Record<ItemStatus, { label: string; shortLabel: string }> = {
  available: { label: 'קיים', shortLabel: 'קיים' },
  low: { label: 'עומד להיגמר', shortLabel: 'כמעט נגמר' },
  missing: { label: 'חסר', shortLabel: 'חסר' },
}
