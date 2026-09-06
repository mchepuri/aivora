'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Banner } from '@astryxdesign/core/Banner';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { CANCELLABLE_STATUSES, NEXT_ACTION, type SalesOrder } from './SalesOrderTypes';

interface Props {
  salesOrder: SalesOrder;
}

export function SalesOrderActions({ salesOrder }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  async function runAction(action: string, path: string, body?: unknown) {
    setError('');
    setPending(action);
    try {
      await apiClient.post(`/sales/sales-orders/${salesOrder.id}/${path}`, body ?? {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} sales order`);
    } finally {
      setPending(null);
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    await runAction('cancel', 'cancel', { reason: cancelReason });
    setCancelOpen(false);
    setCancelReason('');
  }

  const { status } = salesOrder;
  const next = NEXT_ACTION[status];
  const canCancel = CANCELLABLE_STATUSES.includes(status);

  return (
    <div>
      {error && <Banner status="error" title={error} className="mb-4" />}

      {!next && !canCancel && (
        <Text color="secondary">
          {status === 'CANCELLED'
            ? 'This order was cancelled — no further actions are available.'
            : 'This order is closed — no further actions are available.'}
        </Text>
      )}

      <div className="flex gap-3">
        {next && (
          <Button
            disabled={pending !== null}
            onClick={() => runAction(next.path, next.path)}
          >
            {pending === next.path ? next.pendingLabel : next.label}
          </Button>
        )}

        {canCancel && (
          <Button
            variant="ghost"
            className="text-danger"
            disabled={pending !== null}
            onClick={() => setCancelOpen(true)}
          >
            Cancel Order
          </Button>
        )}
      </div>

      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <form onSubmit={handleCancel}>
          <Layout
            header={
              <DialogHeader
                title="Cancel sales order"
                subtitle={`Cancel ${salesOrder.soNumber}. This cannot be undone.`}
                onOpenChange={setCancelOpen}
              />
            }
            content={
              <LayoutContent>
                <TextArea
                  label="Reason"
                  value={cancelReason}
                  onChange={setCancelReason}
                  isRequired
                  maxLength={500}
                  placeholder="e.g. Customer withdrew the order"
                />
              </LayoutContent>
            }
            footer={
              <LayoutFooter hasDivider>
                <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)}>
                  Keep Order
                </Button>
                <Button type="submit" disabled={pending !== null || cancelReason.trim() === ''}>
                  {pending === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
                </Button>
              </LayoutFooter>
            }
          />
        </form>
      </Dialog>
    </div>
  );
}
