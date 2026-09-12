import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { SalesOrderDetail } from '@/components/sales-orders/SalesOrderDetail';
import type { SalesOrder } from '@/components/sales-orders/SalesOrderTypes';

async function getSalesOrder(id: string): Promise<SalesOrder | null> {
  try {
    return await apiClient.get<SalesOrder>(`/sales/sales-orders/${id}`);
  } catch {
    return null;
  }
}

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const salesOrder = await getSalesOrder(id);
  if (!salesOrder) notFound();

  return <SalesOrderDetail salesOrder={salesOrder} />;
}
