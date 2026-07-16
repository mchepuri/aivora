import { apiClient } from '@/lib/apiClient';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import type { Supplier } from '@/components/suppliers/SupplierDialog';

async function getSuppliers(): Promise<Supplier[]> {
  try {
    return await apiClient.get<Supplier[]>('/master-data/suppliers?limit=100');
  } catch {
    return [];
  }
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();
  return <SupplierTable suppliers={suppliers} />;
}
