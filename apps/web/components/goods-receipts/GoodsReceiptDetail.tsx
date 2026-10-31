'use client';

import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { GoodsReceiptActions } from './GoodsReceiptActions';
import {
  GRN_STATUS_BADGE_VARIANT,
  type GoodsReceiptNote,
  type GoodsReceiptNoteLine,
} from './GoodsReceiptTypes';

interface Props {
  goodsReceiptNote: GoodsReceiptNote;
}

export function GoodsReceiptDetail({ goodsReceiptNote: grn }: Props) {
  const lineColumns: TableColumn<GoodsReceiptNoteLine>[] = [
    { key: 'item', header: 'Item', renderCell: (line) => (line.item ? `${line.item.sku} — ${line.item.name}` : '—') },
    { key: 'uom', header: 'UOM', renderCell: (line) => line.uom?.code ?? '—' },
    { key: 'quantityReceived', header: 'Qty Received', align: 'end' },
    { key: 'unitCost', header: 'Unit Cost', align: 'end' },
    { key: 'batch', header: 'Batch No', renderCell: (line) => line.batch?.batchNo ?? '—' },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      renderCell: (line) => (line.batch?.expiryDate ? new Date(line.batch.expiryDate).toLocaleDateString() : '—'),
    },
    {
      key: 'inventoryLedgerId',
      header: 'Ledger Entry',
      renderCell: (line) =>
        line.inventoryLedgerId ? (
          <Link href="/inventory/stock-ledger" className="font-mono text-[13px]">
            {line.inventoryLedgerId.slice(0, 8)}…
          </Link>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Link href="/goods-receipts" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Goods Receipts
        </Link>
        <div className="flex items-center gap-3">
          <Heading level={1}>{grn.grnNumber}</Heading>
          <Badge variant={GRN_STATUS_BADGE_VARIANT[grn.status]} label={grn.status} />
        </div>
      </div>

      <Card padding={8} className="mb-6">
        <Grid columns={{ minWidth: 200 }} gap={5}>
          <div>
            <Text color="secondary">Purchase Order</Text>
            <Text>
              {grn.purchaseOrder ? (
                <Link href={`/purchase-orders/${grn.purchaseOrderId}`}>{grn.purchaseOrder.poNumber}</Link>
              ) : (
                '—'
              )}
            </Text>
          </div>
          <div>
            <Text color="secondary">Warehouse</Text>
            <Text>{grn.warehouse ? `${grn.warehouse.code} — ${grn.warehouse.name}` : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Received Date</Text>
            <Text>{new Date(grn.receivedDate).toLocaleDateString()}</Text>
          </div>
          <div>
            <Text color="secondary">Posted At</Text>
            <Text>{grn.postedAt ? new Date(grn.postedAt).toLocaleString() : '—'}</Text>
          </div>
        </Grid>
      </Card>

      <Card padding={8} className="mb-6">
        <Heading level={3} className="mb-4">
          Lines
        </Heading>
        <Table data={grn.lines} columns={lineColumns} idKey="id" />
      </Card>

      <Card padding={8}>
        <Heading level={3} className="mb-4">
          Actions
        </Heading>
        <GoodsReceiptActions goodsReceiptNote={grn} />
      </Card>
    </div>
  );
}
