'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { WarehouseDialog, type Warehouse, type WarehouseType } from './WarehouseDialog';

const TYPE_BADGE_VARIANT: Record<WarehouseType, BadgeVariant> = {
  DC: 'blue',
  RETAIL_BACKROOM: 'purple',
  MANUFACTURING: 'orange',
  BONDED: 'cyan',
  VIRTUAL: 'green',
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface Props {
  warehouses: Warehouse[];
}

export function WarehouseTable({ warehouses }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | undefined>(undefined);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(warehouse: Warehouse) {
    setEditing(warehouse);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingWarehouse) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/warehouses/${deletingWarehouse.id}`);
      setDeletingWarehouse(null);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete warehouse. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<Warehouse>[] = [
    {
      key: 'code',
      header: 'Code',
      renderCell: (warehouse) => <span className="font-mono font-medium text-ink">{warehouse.code}</span>,
    },
    { key: 'name', header: 'Name' },
    {
      key: 'warehouseType',
      header: 'Type',
      renderCell: (warehouse) => (
        <Badge
          variant={TYPE_BADGE_VARIANT[warehouse.warehouseType]}
          label={titleCase(warehouse.warehouseType)}
        />
      ),
    },
    { key: 'timezone', header: 'Timezone' },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (warehouse) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(warehouse)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-[13px] text-danger hover:bg-danger/10"
            onClick={() => setDeletingWarehouse(warehouse)}
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
          <Heading level={1}>Warehouses</Heading>
          <Text color="secondary">
            {warehouses.length === 0
              ? 'No warehouses defined yet.'
              : `${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'} in the site master`}
          </Text>
        </div>
        <Button onClick={openCreate}>+ New Warehouse</Button>
      </div>

      {warehouses.length > 0 && (
        <Card padding={0}>
          <Table data={warehouses} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <WarehouseDialog open={dialogOpen} onOpenChange={setDialogOpen} warehouse={editing} />

      <AlertDialog
        isOpen={deletingWarehouse !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingWarehouse(null);
        }}
        title="Delete warehouse?"
        description={
          deletingWarehouse
            ? `Delete "${deletingWarehouse.code} — ${deletingWarehouse.name}"? This cannot be undone.`
            : ''
        }
        actionLabel={isDeleting ? 'Deleting…' : 'Delete'}
        onAction={handleConfirmDelete}
      />
    </>
  );
}
