import { notFound } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Link } from '@astryxdesign/core/Link';
import { apiClient } from '@/lib/apiClient';
import { GoodsReceiptForm } from '@/components/goods-receipts/GoodsReceiptForm';
import type { PurchaseOrderForReceiving } from '@/components/goods-receipts/GoodsReceiptTypes';

const RECEIVABLE_STATUSES = new Set(['APPROVED', 'PARTIALLY_RECEIVED']);

async function getPurchaseOrder(id: string): Promise<PurchaseOrderForReceiving | null> {
  try {
    return await apiClient.get<PurchaseOrderForReceiving>(`/procurement/purchase-orders/${id}`);
  } catch {
    return null;
  }
}

export default async function NewGoodsReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>;
}) {
  const { poId } = await searchParams;
  if (!poId) notFound();

  const purchaseOrder = await getPurchaseOrder(poId);
  if (!purchaseOrder) notFound();

  if (!RECEIVABLE_STATUSES.has(purchaseOrder.status)) {
    return (
      <div className="max-w-4xl">
        <Banner
          status="error"
          title={`${purchaseOrder.poNumber} is ${purchaseOrder.status} — goods can only be received against an APPROVED or PARTIALLY_RECEIVED purchase order.`}
        />
        <Link href={`/purchase-orders/${purchaseOrder.id}`} className="mt-4 inline-block">
          Back to {purchaseOrder.poNumber}
        </Link>
      </div>
    );
  }

  return <GoodsReceiptForm purchaseOrder={purchaseOrder} />;
}
