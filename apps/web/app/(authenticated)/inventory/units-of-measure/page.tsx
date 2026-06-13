import { apiClient } from '@/lib/apiClient';
import { UomTable } from '@/components/inventory/uom/UomTable';
import type { Uom } from '@/components/inventory/uom/UomDialog';

async function getUoms(): Promise<Uom[]> {
  try {
    return await apiClient.get<Uom[]>('/master-data/uom?limit=100');
  } catch {
    return [];
  }
}

export default async function UnitsOfMeasurePage() {
  const uoms = await getUoms();
  return <UomTable uoms={uoms} />;
}
