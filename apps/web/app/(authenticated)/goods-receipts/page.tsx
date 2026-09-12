import { apiClient } from '@/lib/apiClient';
import { GoodsReceiptTable } from '@/components/goods-receipts/GoodsReceiptTable';
import type { GoodsReceiptNote } from '@/components/goods-receipts/GoodsReceiptTypes';

async function getGoodsReceiptNotes(): Promise<GoodsReceiptNote[]> {
  try {
    return await apiClient.get<GoodsReceiptNote[]>('/procurement/goods-receipts?limit=100');
  } catch {
    return [];
  }
}

export default async function GoodsReceiptsPage() {
  const goodsReceiptNotes = await getGoodsReceiptNotes();
  return <GoodsReceiptTable goodsReceiptNotes={goodsReceiptNotes} />;
}
