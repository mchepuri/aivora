'use client';

import { useRouter } from 'next/navigation';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import {
  formatCurrency,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  type SalesOrder,
} from './SalesOrderTypes';

interface Props {
  salesOrders: SalesOrder[];
}

export function SalesOrderTable({ salesOrders }: Props) {
  const router = useRouter();

  const columns: TableColumn<SalesOrder>[] = [
    {
      key: 'soNumber',
      header: 'SO Number',
      renderCell: (so) => <span className="font-mono font-medium text-ink">{so.soNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      renderCell: (so) => so.customer?.legalName ?? '—',
    },
    {
      key: 'customerPoRef',
      header: 'Customer PO',
      renderCell: (so) => so.customerPoRef ?? '—',
    },
    {
      key: 'warehouse',
      header: 'Ship From',
      renderCell: (so) => so.warehouse?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (so) => (
        <Badge variant={STATUS_BADGE_VARIANT[so.status]} label={STATUS_LABEL[so.status]} />
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'end',
      renderCell: (so) => formatCurrency(so.totalAmount, so.currency),
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      renderCell: (so) => new Date(so.orderDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (so) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-[13px]"
            onClick={() => router.push(`/sales-orders/${so.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Heading level={1}>Sales Orders</Heading>
          <Text color="secondary">
            {salesOrders.length === 0
              ? 'No sales orders yet.'
              : `${salesOrders.length} sales order${salesOrders.length === 1 ? '' : 's'} received from customers`}
          </Text>
        </div>
        <Button onClick={() => router.push('/sales-orders/new')}>+ New Sales Order</Button>
      </div>

      {salesOrders.length > 0 && (
        <Card padding={0}>
          <Table data={salesOrders} columns={columns} idKey="id" hasHover />
        </Card>
      )}
    </>
  );
}
