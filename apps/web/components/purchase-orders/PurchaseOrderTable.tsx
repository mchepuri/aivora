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
  type PurchaseOrder,
} from './PurchaseOrderTypes';

interface Props {
  purchaseOrders: PurchaseOrder[];
}

export function PurchaseOrderTable({ purchaseOrders }: Props) {
  const router = useRouter();

  const columns: TableColumn<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      renderCell: (po) => <span className="font-mono font-medium text-ink">{po.poNumber}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      renderCell: (po) => po.supplier?.legalName ?? '—',
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      renderCell: (po) => po.warehouse?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (po) => (
        <Badge variant={STATUS_BADGE_VARIANT[po.status]} label={STATUS_LABEL[po.status]} />
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'end',
      renderCell: (po) => formatCurrency(po.totalAmount, po.currency),
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      renderCell: (po) => new Date(po.orderDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (po) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-[13px]"
            onClick={() => router.push(`/purchase-orders/${po.id}`)}
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
          <Heading level={1}>Purchase Orders</Heading>
          <Text color="secondary">
            {purchaseOrders.length === 0
              ? 'No purchase orders yet.'
              : `${purchaseOrders.length} purchase order${purchaseOrders.length === 1 ? '' : 's'}`}
          </Text>
        </div>
        <Button onClick={() => router.push('/purchase-orders/new')}>+ New Purchase Order</Button>
      </div>

      {purchaseOrders.length > 0 && (
        <Card padding={0}>
          <Table data={purchaseOrders} columns={columns} idKey="id" hasHover />
        </Card>
      )}
    </>
  );
}
