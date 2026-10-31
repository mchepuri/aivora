'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import {
  formatQuantity,
  MOVEMENT_TYPE_BADGE_VARIANT,
  MOVEMENT_TYPE_LABEL,
  type InventoryLedgerEntry,
} from './StockLedgerTypes';

interface Props {
  entries: InventoryLedgerEntry[];
}

export function StockLedgerTable({ entries }: Props) {
  const router = useRouter();
  const [reversing, setReversing] = useState<InventoryLedgerEntry | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmReverse() {
    if (!reversing) return;
    setIsReversing(true);
    setError(null);
    try {
      await apiClient.post(`/inventory/stock-ledger/${reversing.id}/reverse`, {});
      setReversing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse this entry. Please try again.');
    } finally {
      setIsReversing(false);
    }
  }

  const columns: TableColumn<InventoryLedgerEntry>[] = [
    {
      key: 'entryNo',
      header: '#',
      renderCell: (entry) => <span className="font-mono font-medium text-ink">{entry.entryNo}</span>,
    },
    {
      key: 'occurredAt',
      header: 'Date',
      renderCell: (entry) => new Date(entry.occurredAt).toLocaleString(),
    },
    {
      key: 'movementType',
      header: 'Type',
      renderCell: (entry) => (
        <Badge
          variant={MOVEMENT_TYPE_BADGE_VARIANT[entry.movementType]}
          label={MOVEMENT_TYPE_LABEL[entry.movementType]}
        />
      ),
    },
    {
      key: 'item',
      header: 'Item',
      renderCell: (entry) => (entry.item ? `${entry.item.sku} — ${entry.item.name}` : '—'),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      renderCell: (entry) => entry.warehouse?.name ?? '—',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'end',
      renderCell: (entry) => (
        <span className={Number(entry.quantity) < 0 ? 'text-danger' : 'text-ink'}>
          {formatQuantity(entry)}
        </span>
      ),
    },
    {
      key: 'sourceDocumentType',
      header: 'Source',
      renderCell: (entry) => entry.sourceDocumentType ?? '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (entry) =>
        entry.reversesEntryId ? null : (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-[13px] text-danger hover:bg-danger/10"
              onClick={() => setReversing(entry)}
            >
              Reverse
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      {error && <Banner status="error" title={error} className="mb-4" />}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Heading level={1}>Stock Ledger</Heading>
          <Text color="secondary">
            {entries.length === 0
              ? 'No inventory transactions posted yet.'
              : `${entries.length} inventory transaction${entries.length === 1 ? '' : 's'}`}
          </Text>
        </div>
        <Button onClick={() => router.push('/inventory/stock-ledger/new')}>
          + New Transaction
        </Button>
      </div>

      {entries.length > 0 && (
        <Card padding={0}>
          <Table data={entries} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <AlertDialog
        isOpen={reversing !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReversing(null);
        }}
        title="Reverse this transaction?"
        description={
          reversing
            ? `This posts a new offsetting entry for #${reversing.entryNo} (${MOVEMENT_TYPE_LABEL[reversing.movementType]}, ${formatQuantity(reversing)}). The original entry is never edited — this cannot be undone.`
            : ''
        }
        actionLabel={isReversing ? 'Reversing…' : 'Reverse'}
        onAction={handleConfirmReverse}
      />
    </>
  );
}
