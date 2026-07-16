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
import { SupplierDialog, type Supplier, type SupplierStatus } from './SupplierDialog';

const STATUS_BADGE_VARIANT: Record<SupplierStatus, BadgeVariant> = {
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'success',
  BLOCKED: 'error',
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface Props {
  suppliers: Supplier[];
}

export function SupplierTable({ suppliers }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    router.push('/suppliers/new');
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingSupplier) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/suppliers/${deletingSupplier.id}`);
      setDeletingSupplier(null);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete supplier. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<Supplier>[] = [
    {
      key: 'code',
      header: 'Code',
      renderCell: (supplier) => <span className="font-mono font-medium text-ink">{supplier.code}</span>,
    },
    { key: 'legalName', header: 'Legal Name' },
    { key: 'defaultCurrency', header: 'Currency' },
    {
      key: 'ratingScore',
      header: 'Rating',
      renderCell: (supplier) => supplier.ratingScore ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (supplier) => (
        <Badge variant={STATUS_BADGE_VARIANT[supplier.status]} label={titleCase(supplier.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (supplier) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(supplier)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-[13px] text-danger hover:bg-danger/10"
            onClick={() => setDeletingSupplier(supplier)}
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
          <Heading level={1}>Suppliers</Heading>
          <Text color="secondary">
            {suppliers.length === 0
              ? 'No suppliers defined yet.'
              : `${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'} in the vendor master`}
          </Text>
        </div>
        <Button onClick={openCreate}>+ New Supplier</Button>
      </div>

      {suppliers.length > 0 && (
        <Card padding={0}>
          <Table data={suppliers} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />

      <AlertDialog
        isOpen={deletingSupplier !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingSupplier(null);
        }}
        title="Delete supplier?"
        description={
          deletingSupplier
            ? `Delete "${deletingSupplier.code} — ${deletingSupplier.legalName}"? This cannot be undone.`
            : ''
        }
        actionLabel={isDeleting ? 'Deleting…' : 'Delete'}
        onAction={handleConfirmDelete}
      />
    </>
  );
}
