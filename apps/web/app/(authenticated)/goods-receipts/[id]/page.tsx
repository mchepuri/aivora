import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { GoodsReceiptDetail } from '@/components/goods-receipts/GoodsReceiptDetail';
import type { GoodsReceiptNote } from '@/components/goods-receipts/GoodsReceiptTypes';

async function getGoodsReceiptNote(id: string): Promise<GoodsReceiptNote | null> {
  try {
    return await apiClient.get<GoodsReceiptNote>(`/procurement/goods-receipts/${id}`);
  } catch {
    return null;
  }
}

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goodsReceiptNote = await getGoodsReceiptNote(id);
  if (!goodsReceiptNote) notFound();

  return <GoodsReceiptDetail goodsReceiptNote={goodsReceiptNote} />;
}
