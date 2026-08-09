'use client';

import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Banner } from '@astryxdesign/core/Banner';
import { PurchaseOrderActions } from './PurchaseOrderActions';
import {
  formatCurrency,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from './PurchaseOrderTypes';

interface Props {
  purchaseOrder: PurchaseOrder;
}

export function PurchaseOrderDetail({ purchaseOrder: po }: Props) {
  const lineColumns: TableColumn<PurchaseOrderLine>[] = [
    { key: 'lineNo', header: '#', renderCell: (line) => line.lineNo },
    {
      key: 'item',
      header: 'Item',
      renderCell: (line) => (line.item ? `${line.item.sku} — ${line.item.name}` : '—'),
    },
    { key: 'uom', header: 'UOM', renderCell: (line) => line.uom?.code ?? '—' },
    { key: 'quantityOrdered', header: 'Qty Ordered', align: 'end' },
    { key: 'quantityReceived', header: 'Qty Received', align: 'end' },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      align: 'end',
      renderCell: (line) => formatCurrency(line.unitPrice, po.currency),
    },
    {
      key: 'lineTotal',
      header: 'Line Total',
      align: 'end',
      renderCell: (line) => formatCurrency(line.lineTotal, po.currency),
    },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Link href="/purchase-orders" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Purchase Orders
        </Link>
        <div className="flex items-center gap-3">
          <Heading level={1}>{po.poNumber}</Heading>
          <Badge variant={STATUS_BADGE_VARIANT[po.status]} label={STATUS_LABEL[po.status]} />
        </div>
        {po.rejectionReason && (
          <Banner status="warning" title={`Rejected: ${po.rejectionReason}`} className="mt-3" />
        )}
      </div>

      <Card padding={8} className="mb-6">
        <Grid columns={{ minWidth: 200 }} gap={5}>
          <div>
            <Text color="secondary">Supplier</Text>
            <Text>{po.supplier ? `${po.supplier.code} — ${po.supplier.legalName}` : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Warehouse</Text>
            <Text>{po.warehouse ? `${po.warehouse.code} — ${po.warehouse.name}` : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Order Date</Text>
            <Text>{new Date(po.orderDate).toLocaleDateString()}</Text>
          </div>
          <div>
            <Text color="secondary">Expected Date</Text>
            <Text>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Currency</Text>
            <Text>{po.currency}</Text>
          </div>
        </Grid>
      </Card>

      <Card padding={8} className="mb-6">
        <Heading level={3} className="mb-4">
          Line Items
        </Heading>
        <Table data={po.lines} columns={lineColumns} idKey="id" />

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between">
              <Text color="secondary">Subtotal</Text>
              <Text>{formatCurrency(po.subtotalAmount, po.currency)}</Text>
            </div>
            <div className="flex justify-between">
              <Text color="secondary">Tax</Text>
              <Text>{formatCurrency(po.taxAmount, po.currency)}</Text>
            </div>
            <div className="flex justify-between font-semibold">
              <Text>Total</Text>
              <Text>{formatCurrency(po.totalAmount, po.currency)}</Text>
            </div>
          </div>
        </div>
      </Card>

      <Card padding={8}>
        <Heading level={3} className="mb-4">
          Actions
        </Heading>
        <PurchaseOrderActions purchaseOrder={po} />
      </Card>
    </div>
  );
}
