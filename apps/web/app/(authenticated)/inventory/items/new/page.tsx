import { apiClient } from '@/lib/apiClient';
import { ItemCreateForm } from '@/components/inventory/items/ItemCreateForm';
import type { UomOption } from '@/components/inventory/items/ItemDialog';

async function getUomOptions(): Promise<UomOption[]> {
  try {
    return await apiClient.get<UomOption[]>('/master-data/uom?limit=100');
  } catch {
    return [];
  }
}

export default async function NewItemPage() {
  const uomOptions = await getUomOptions();
  return <ItemCreateForm uomOptions={uomOptions} />;
}
