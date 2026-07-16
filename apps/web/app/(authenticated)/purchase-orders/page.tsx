import { apiClient } from '@/lib/apiClient';
import { PurchaseOrderTable } from '@/components/purchase-orders/PurchaseOrderTable';
import type { PurchaseOrder } from '@/components/purchase-orders/PurchaseOrderTypes';

async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    return await apiClient.get<PurchaseOrder[]>('/procurement/purchase-orders?limit=100');
  } catch {
    return [];
  }
}

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await getPurchaseOrders();
  return <PurchaseOrderTable purchaseOrders={purchaseOrders} />;
}
