export function validateItem(item) {
  const bad = () => { throw Object.assign(new Error('פרטי המוצר אינם תקינים'), { status: 400 }); };
  if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 100) bad();
  if (!['groceries','hygiene','laundry','cleaning','household','snacks'].includes(item.categoryId)) bad();
  if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120) bad();
  if (!['available','low','missing'].includes(item.status)) bad();
  if (item.urgent !== undefined && typeof item.urgent !== 'boolean') bad();
  if (item.quantity !== undefined && (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > 1000000)) bad();
  for (const field of ['unit','note']) if (item[field] !== undefined && (typeof item[field] !== 'string' || item[field].length > (field === 'note' ? 500 : 40))) bad();
  return { id: item.id, categoryId: item.categoryId, name: item.name.trim(), status: item.status, urgent: item.status !== 'available' && item.urgent === true, ...(item.quantity !== undefined ? { quantity: item.quantity } : {}), ...(item.unit ? { unit: item.unit } : {}), ...(item.note ? { note: item.note } : {}) };
}
