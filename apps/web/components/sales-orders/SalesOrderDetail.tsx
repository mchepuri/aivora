'use client';

import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Banner } from '@astryxdesign/core/Banner';
import { SalesOrderActions } from './SalesOrderActions';
import {
  formatCurrency,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  type SalesOrder,
  type SalesOrderLine,
} from './SalesOrderTypes';

interface Props {
  salesOrder: SalesOrder;
}

export function SalesOrderDetail({ salesOrder: so }: Props) {
  const lineColumns: TableColumn<SalesOrderLine>[] = [
    { key: 'lineNo', header: '#', renderCell: (line) => line.lineNo },
    {
      key: 'item',
      header: 'Item',
      renderCell: (line) => (line.item ? `${line.item.sku} — ${line.item.name}` : '—'),
    },
    { key: 'uom', header: 'UOM', renderCell: (line) => line.uom?.code ?? '—' },
    { key: 'quantityOrdered', header: 'Qty Ordered', align: 'end' },
    { key: 'quantityShipped', header: 'Qty Shipped', align: 'end' },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      align: 'end',
      renderCell: (line) => formatCurrency(line.unitPrice, so.currency),
    },
    {
      key: 'lineTotal',
      header: 'Line Total',
      align: 'end',
      renderCell: (line) => formatCurrency(line.lineTotal, so.currency),
    },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Link href="/sales-orders" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sales Orders
        </Link>
        <div className="flex items-center gap-3">
          <Heading level={1}>{so.soNumber}</Heading>
          <Badge variant={STATUS_BADGE_VARIANT[so.status]} label={STATUS_LABEL[so.status]} />
          {so.status === 'DRAFT' && (
            <Link
              href={`/sales-orders/${so.id}/edit`}
              aria-label={`Edit ${so.soNumber}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-ink transition-colors hover:bg-surface-subtle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM14.71 6.04a1 1 0 0 1 1.42 0l2.34 2.34a1 1 0 0 1 0 1.42l-1.41 1.41-3.75-3.75 1.4-1.42Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </div>
        {so.cancellationReason && (
          <Banner status="warning" title={`Cancelled: ${so.cancellationReason}`} className="mt-3" />
        )}
      </div>

      <Card padding={8} className="mb-6">
        <Grid columns={{ minWidth: 200 }} gap={5}>
          <div>
            <Text color="secondary">Customer</Text>
            <Text>{so.customer ? `${so.customer.code} — ${so.customer.legalName}` : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Customer PO Reference</Text>
            <Text>{so.customerPoRef ?? '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Ship From</Text>
            <Text>{so.warehouse ? `${so.warehouse.code} — ${so.warehouse.name}` : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Order Date</Text>
            <Text>{new Date(so.orderDate).toLocaleDateString()}</Text>
          </div>
          <div>
            <Text color="secondary">Requested Delivery</Text>
            <Text>{so.requestedDate ? new Date(so.requestedDate).toLocaleDateString() : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Shipped</Text>
            <Text>{so.shippedAt ? new Date(so.shippedAt).toLocaleDateString() : '—'}</Text>
          </div>
          <div>
            <Text color="secondary">Currency</Text>
            <Text>{so.currency}</Text>
          </div>
        </Grid>
      </Card>

      <Card padding={8} className="mb-6">
        <Heading level={3} className="mb-4">
          Line Items
        </Heading>
        <Table data={so.lines} columns={lineColumns} idKey="id" />

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between">
              <Text color="secondary">Subtotal</Text>
              <Text>{formatCurrency(so.subtotalAmount, so.currency)}</Text>
            </div>
            <div className="flex justify-between">
              <Text color="secondary">Tax</Text>
              <Text>{formatCurrency(so.taxAmount, so.currency)}</Text>
            </div>
            <div className="flex justify-between font-semibold">
              <Text>Total</Text>
              <Text>{formatCurrency(so.totalAmount, so.currency)}</Text>
            </div>
          </div>
        </div>
      </Card>

      <Card padding={8}>
        <Heading level={3} className="mb-4">
          Actions
        </Heading>
        <SalesOrderActions salesOrder={so} />
      </Card>
    </div>
  );
}
