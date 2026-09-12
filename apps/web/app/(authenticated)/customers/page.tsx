import { apiClient } from '@/lib/apiClient';
import { CustomerTable } from '@/components/customers/CustomerTable';
import type { Customer } from '@/components/customers/CustomerDialog';

async function getCustomers(): Promise<Customer[]> {
  try {
    return await apiClient.get<Customer[]>('/master-data/customers?limit=100');
  } catch {
    return [];
  }
}

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomerTable customers={customers} />;
}
