import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { PurchaseOrderDetail } from '@/components/purchase-orders/PurchaseOrderDetail';
import type { PurchaseOrder } from '@/components/purchase-orders/PurchaseOrderTypes';

async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  try {
    return await apiClient.get<PurchaseOrder>(`/procurement/purchase-orders/${id}`);
  } catch {
    return null;
  }
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchaseOrder = await getPurchaseOrder(id);
  if (!purchaseOrder) notFound();

  return <PurchaseOrderDetail purchaseOrder={purchaseOrder} />;
}
