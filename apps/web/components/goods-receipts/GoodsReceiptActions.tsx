'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import type { GoodsReceiptNote } from './GoodsReceiptTypes';

interface Props {
  goodsReceiptNote: GoodsReceiptNote;
}

export function GoodsReceiptActions({ goodsReceiptNote: grn }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reversing, setReversing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function runAction(action: string, path: string) {
    setError('');
    setPending(action);
    try {
      await apiClient.post(`/procurement/goods-receipts/${grn.id}/${path}`, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} goods receipt note`);
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    setError('');
    setPending('delete');
    try {
      await apiClient.delete(`/procurement/goods-receipts/${grn.id}`);
      router.push(`/purchase-orders/${grn.purchaseOrderId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goods receipt note');
    } finally {
      setPending(null);
      setDeleting(false);
    }
  }

  return (
    <div>
      {error && <Banner status="error" title={error} className="mb-4" />}

      <div className="flex gap-3">
        {grn.status === 'DRAFT' && (
          <>
            <Button disabled={pending !== null} onClick={() => runAction('post', 'post')}>
              {pending === 'post' ? 'Posting…' : 'Post to Inventory'}
            </Button>
            <Button
              variant="ghost"
              className="text-danger"
              disabled={pending !== null}
              onClick={() => setDeleting(true)}
            >
              Delete
            </Button>
          </>
        )}

        {grn.status === 'POSTED' && (
          <Button variant="ghost" className="text-danger" disabled={pending !== null} onClick={() => setReversing(true)}>
            Reverse
          </Button>
        )}
      </div>

      <AlertDialog
        isOpen={reversing}
        onOpenChange={setReversing}
        title="Reverse this goods receipt?"
        description={`This reverses every line's inventory ledger entry and backs the quantity out of ${grn.purchaseOrder?.poNumber ?? 'the purchase order'}. This cannot be undone.`}
        actionLabel={pending === 'reverse' ? 'Reversing…' : 'Reverse'}
        onAction={async () => {
          await runAction('reverse', 'reverse');
          setReversing(false);
        }}
      />

      <AlertDialog
        isOpen={deleting}
        onOpenChange={setDeleting}
        title="Delete this draft?"
        description={`Delete ${grn.grnNumber}? Nothing has posted yet, so this has no effect on inventory. This cannot be undone.`}
        actionLabel={pending === 'delete' ? 'Deleting…' : 'Delete'}
        onAction={handleDelete}
      />
    </div>
  );
}
