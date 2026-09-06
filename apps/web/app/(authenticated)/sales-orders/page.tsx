import { apiClient } from '@/lib/apiClient';
import { SalesOrderTable } from '@/components/sales-orders/SalesOrderTable';
import type { SalesOrder } from '@/components/sales-orders/SalesOrderTypes';

async function getSalesOrders(): Promise<SalesOrder[]> {
  try {
    return await apiClient.get<SalesOrder[]>('/sales/sales-orders?limit=100');
  } catch {
    return [];
  }
}

export default async function SalesOrdersPage() {
  const salesOrders = await getSalesOrders();
  return <SalesOrderTable salesOrders={salesOrders} />;
}
