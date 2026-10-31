'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { remainingQuantity, type DraftReceiptLine, type PurchaseOrderForReceiving } from './GoodsReceiptTypes';

interface Props {
  purchaseOrder: PurchaseOrderForReceiving;
}

function initialLines(po: PurchaseOrderForReceiving): DraftReceiptLine[] {
  return po.lines
    .filter((line) => remainingQuantity(line) > 0)
    .map((line) => ({
      poLineId: line.id,
      lineNo: line.lineNo,
      itemLabel: line.item ? `${line.item.sku} — ${line.item.name}` : line.itemId,
      uomCode: line.uom?.code ?? line.uomId,
      remaining: remainingQuantity(line),
      quantityReceived: remainingQuantity(line),
      isBatchTracked: line.item?.isBatchTracked ?? false,
      batchNo: '',
      manufacturedDate: '',
      expiryDate: '',
    }));
}

export function GoodsReceiptForm({ purchaseOrder: po }: Props) {
  const router = useRouter();
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<DraftReceiptLine[]>(initialLines(po));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateLine(poLineId: string, patch: Partial<DraftReceiptLine>) {
    setLines(lines.map((line) => (line.poLineId === poLineId ? { ...line, ...patch } : line)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const toReceive = lines.filter((line) => (line.quantityReceived ?? 0) > 0);
    if (toReceive.length === 0) {
      setError('Enter a quantity greater than zero for at least one line.');
      return;
    }
    const overReceived = toReceive.find((line) => (line.quantityReceived ?? 0) > line.remaining);
    if (overReceived) {
      setError(`Line ${overReceived.lineNo}: cannot receive more than the ${overReceived.remaining} remaining.`);
      return;
    }
    const missingBatch = toReceive.find((line) => line.isBatchTracked && line.batchNo.trim() === '');
    if (missingBatch) {
      setError(`Line ${missingBatch.lineNo}: this item is batch-tracked — enter a batch number.`);
      return;
    }

    setSaving(true);
    try {
      const grn = await apiClient.post<{ id: string }>('/procurement/goods-receipts', {
        purchaseOrderId: po.id,
        receivedDate,
        lines: toReceive.map((line) => ({
          poLineId: line.poLineId,
          quantityReceived: line.quantityReceived,
          ...(line.isBatchTracked && {
            batch: {
              batchNo: line.batchNo.trim(),
              manufacturedDate: line.manufacturedDate || undefined,
              expiryDate: line.expiryDate || undefined,
            },
          }),
        })),
      });
      router.push(`/goods-receipts/${grn.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goods receipt note');
    } finally {
      setSaving(false);
    }
  }

  const hasBatchTrackedLine = lines.some((line) => line.isBatchTracked);

  const columns: TableColumn<DraftReceiptLine>[] = [
    { key: 'lineNo', header: '#', renderCell: (line) => line.lineNo },
    { key: 'itemLabel', header: 'Item' },
    { key: 'uomCode', header: 'UOM' },
    { key: 'remaining', header: 'Remaining', align: 'end' },
    {
      key: 'quantityReceived',
      header: 'Receive Qty',
      align: 'end',
      renderCell: (line) => (
        <NumberInput
          label="Receive quantity"
          isLabelHidden
          value={line.quantityReceived}
          onChange={(value) => updateLine(line.poLineId, { quantityReceived: value })}
          min={0}
          max={line.remaining}
        />
      ),
    },
    ...(hasBatchTrackedLine
      ? ([
          {
            key: 'batchNo',
            header: 'Batch No',
            renderCell: (line: DraftReceiptLine) =>
              line.isBatchTracked ? (
                <TextInput
                  label="Batch number"
                  isLabelHidden
                  placeholder="e.g. B-2026-001"
                  value={line.batchNo}
                  onChange={(value) => updateLine(line.poLineId, { batchNo: value })}
                  isRequired
                />
              ) : (
                '—'
              ),
          },
          {
            key: 'manufacturedDate',
            header: 'Mfg Date',
            renderCell: (line: DraftReceiptLine) =>
              line.isBatchTracked ? (
                <DateInput
                  label="Manufactured date"
                  isLabelHidden
                  value={(line.manufacturedDate || undefined) as ISODateString | undefined}
                  onChange={(value) => updateLine(line.poLineId, { manufacturedDate: value ?? '' })}
                  isOptional
                />
              ) : (
                '—'
              ),
          },
          {
            key: 'expiryDate',
            header: 'Expiry Date',
            renderCell: (line: DraftReceiptLine) =>
              line.isBatchTracked ? (
                <DateInput
                  label="Expiry date"
                  isLabelHidden
                  value={(line.expiryDate || undefined) as ISODateString | undefined}
                  onChange={(value) => updateLine(line.poLineId, { expiryDate: value ?? '' })}
                  isOptional
                />
              ) : (
                '—'
              ),
          },
        ] satisfies TableColumn<DraftReceiptLine>[])
      : []),
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Link href={`/purchase-orders/${po.id}`} className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {po.poNumber}
        </Link>
        <Heading level={1}>Receive Goods</Heading>
        <Text color="secondary">
          Posting this will create an immutable RECEIPT entry in the stock ledger for each line and roll the
          quantity into {po.poNumber}.
        </Text>
      </div>

      {lines.length === 0 ? (
        <Banner status="info" title="Every line on this purchase order has already been fully received." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding={8}>
            <DateInput
              label="Received Date"
              value={receivedDate as ISODateString}
              onChange={(value) => setReceivedDate(value ?? receivedDate)}
              isRequired
            />
          </Card>

          <Card padding={8}>
            <Heading level={3} className="mb-4">
              Lines
            </Heading>
            <Table data={lines} columns={columns} idKey="poLineId" />
          </Card>

          {error && <Banner status="error" title={error} />}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save as Draft'}
            </Button>
            <Button type="button" variant="ghost" href={`/purchase-orders/${po.id}`}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
