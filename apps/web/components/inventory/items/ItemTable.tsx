'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { ItemDialog, type Item, type ItemStatus, type ItemType, type UomOption } from './ItemDialog';

const TYPE_BADGE_VARIANT: Record<ItemType, BadgeVariant> = {
  GOODS: 'blue',
  SERVICE: 'cyan',
  ASSET: 'purple',
};

const STATUS_BADGE_VARIANT: Record<ItemStatus, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  DISCONTINUED: 'error',
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface Props {
  items: Item[];
  uomOptions: UomOption[];
}

export function ItemTable({ items, uomOptions }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | undefined>(undefined);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    router.push('/inventory/items/new');
  }

  function openEdit(item: Item) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/items/${deletingItem.id}`);
      setDeletingItem(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      renderCell: (item) => <span className="font-mono font-medium text-ink">{item.sku}</span>,
    },
    { key: 'name', header: 'Name' },
    {
      key: 'baseUom',
      header: 'Base UOM',
      renderCell: (item) => item.baseUom?.code ?? '—',
    },
    {
      key: 'itemType',
      header: 'Type',
      renderCell: (item) => <Badge variant={TYPE_BADGE_VARIANT[item.itemType]} label={titleCase(item.itemType)} />,
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (item) => <Badge variant={STATUS_BADGE_VARIANT[item.status]} label={titleCase(item.status)} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (item) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(item)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-[13px] text-danger hover:bg-danger/10"
            onClick={() => setDeletingItem(item)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {deleteError && <Banner status="error" title={deleteError} className="mb-4" />}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Heading level={1}>Items</Heading>
          <Text color="secondary">
            {items.length === 0
              ? 'No items defined yet.'
              : `${items.length} item${items.length === 1 ? '' : 's'} in the master catalog`}
          </Text>
        </div>
        <Button onClick={openCreate}>+ New Item</Button>
      </div>

      {items.length > 0 && (
        <Card padding={0}>
          <Table data={items} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <ItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} uomOptions={uomOptions} />

      <AlertDialog
        isOpen={deletingItem !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingItem(null);
        }}
        title="Delete item?"
        description={
          deletingItem ? `Delete "${deletingItem.sku} — ${deletingItem.name}"? This cannot be undone.` : ''
        }
        actionLabel={isDeleting ? 'Deleting…' : 'Delete'}
        onAction={handleConfirmDelete}
      />
    </>
  );
}
