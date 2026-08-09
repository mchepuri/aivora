'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import type { PurchaseOrder } from './PurchaseOrderTypes';

interface Props {
  purchaseOrder: PurchaseOrder;
}

export function PurchaseOrderActions({ purchaseOrder }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  async function runAction(action: string, path: string, body?: unknown) {
    setError('');
    setPending(action);
    try {
      await apiClient.post(`/procurement/purchase-orders/${purchaseOrder.id}/${path}`, body ?? {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} purchase order`);
    } finally {
      setPending(null);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    await runAction('reject', 'reject', { reason: rejectReason });
    setRejectOpen(false);
    setRejectReason('');
  }

  const { status } = purchaseOrder;

  return (
    <div>
      {error && <Banner status="error" title={error} className="mb-4" />}

      <div className="flex gap-3">
        {status === 'DRAFT' && (
          <>
            <Button disabled={pending !== null} onClick={() => runAction('submit', 'submit')}>
              {pending === 'submit' ? 'Submitting…' : 'Submit for Approval'}
            </Button>
            <Button
              variant="ghost"
              className="text-danger"
              disabled={pending !== null}
              onClick={() => runAction('cancel', 'cancel')}
            >
              {pending === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </Button>
          </>
        )}

        {status === 'PENDING_APPROVAL' && (
          <>
            <Button disabled={pending !== null} onClick={() => runAction('approve', 'approve')}>
              {pending === 'approve' ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              variant="ghost"
              disabled={pending !== null}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              className="text-danger"
              disabled={pending !== null}
              onClick={() => runAction('cancel', 'cancel')}
            >
              {pending === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </Button>
          </>
        )}
      </div>

      <Dialog isOpen={rejectOpen} onOpenChange={setRejectOpen}>
        <form onSubmit={handleReject}>
          <Layout
            header={
              <DialogHeader
                title="Reject purchase order"
                subtitle={`Send ${purchaseOrder.poNumber} back to draft with a reason.`}
                onOpenChange={setRejectOpen}
              />
            }
            content={
              <LayoutContent>
                <TextArea
                  label="Reason"
                  value={rejectReason}
                  onChange={setRejectReason}
                  isRequired
                  maxLength={500}
                  placeholder="e.g. Unit price exceeds the approved supplier rate"
                />
              </LayoutContent>
            }
            footer={
              <LayoutFooter hasDivider>
                <Button type="button" variant="ghost" onClick={() => setRejectOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending !== null || rejectReason.trim() === ''}>
                  {pending === 'reject' ? 'Rejecting…' : 'Reject'}
                </Button>
              </LayoutFooter>
            }
          />
        </form>
      </Dialog>
    </div>
  );
}
