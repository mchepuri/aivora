'use client';

import { useRouter } from 'next/navigation';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { GRN_STATUS_BADGE_VARIANT, type GoodsReceiptNote } from './GoodsReceiptTypes';

interface Props {
  goodsReceiptNotes: GoodsReceiptNote[];
}

export function GoodsReceiptTable({ goodsReceiptNotes }: Props) {
  const router = useRouter();

  const columns: TableColumn<GoodsReceiptNote>[] = [
    {
      key: 'grnNumber',
      header: 'GRN Number',
      renderCell: (grn) => <span className="font-mono font-medium text-ink">{grn.grnNumber}</span>,
    },
    {
      key: 'purchaseOrder',
      header: 'Purchase Order',
      renderCell: (grn) => grn.purchaseOrder?.poNumber ?? '—',
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      renderCell: (grn) => grn.warehouse?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (grn) => <Badge variant={GRN_STATUS_BADGE_VARIANT[grn.status]} label={grn.status} />,
    },
    {
      key: 'receivedDate',
      header: 'Received Date',
      renderCell: (grn) => new Date(grn.receivedDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (grn) => (
        <div className="flex justify-end">
          <Button variant="ghost" className="text-[13px]" onClick={() => router.push(`/goods-receipts/${grn.id}`)}>
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
          <Heading level={1}>Goods Receipts</Heading>
          <Text color="secondary">
            {goodsReceiptNotes.length === 0
              ? 'No goods receipt notes yet.'
              : `${goodsReceiptNotes.length} goods receipt note${goodsReceiptNotes.length === 1 ? '' : 's'}`}
          </Text>
        </div>
      </div>

      {goodsReceiptNotes.length > 0 && (
        <Card padding={0}>
          <Table data={goodsReceiptNotes} columns={columns} idKey="id" hasHover />
        </Card>
      )}
    </>
  );
}
