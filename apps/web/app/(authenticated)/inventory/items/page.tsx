import { apiClient } from '@/lib/apiClient';
import { ItemTable } from '@/components/inventory/items/ItemTable';
import type { Item, UomOption } from '@/components/inventory/items/ItemDialog';

async function getItems(): Promise<Item[]> {
  try {
    return await apiClient.get<Item[]>('/master-data/items?limit=100');
  } catch {
    return [];
  }
}

async function getUomOptions(): Promise<UomOption[]> {
  try {
    return await apiClient.get<UomOption[]>('/master-data/uom?limit=100');
  } catch {
    return [];
  }
}

export default async function ItemsPage() {
  const [items, uomOptions] = await Promise.all([getItems(), getUomOptions()]);
  return <ItemTable items={items} uomOptions={uomOptions} />;
}
