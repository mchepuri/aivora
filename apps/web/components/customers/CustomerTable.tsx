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
import { CustomerDialog, type Customer, type CustomerStatus } from './CustomerDialog';

const STATUS_BADGE_VARIANT: Record<CustomerStatus, BadgeVariant> = {
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
  customers: Customer[];
}

export function CustomerTable({ customers }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    router.push('/customers/new');
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/customers/${deletingCustomer.id}`);
      setDeletingCustomer(null);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete customer. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<Customer>[] = [
    {
      key: 'code',
      header: 'Code',
      renderCell: (customer) => (
        <span className="font-mono font-medium text-ink">{customer.code}</span>
      ),
    },
    { key: 'legalName', header: 'Legal Name' },
    { key: 'defaultCurrency', header: 'Currency' },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      align: 'end',
      renderCell: (customer) => customer.creditLimit ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (customer) => (
        <Badge variant={STATUS_BADGE_VARIANT[customer.status]} label={titleCase(customer.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (customer) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(customer)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-[13px] text-danger hover:bg-danger/10"
            onClick={() => setDeletingCustomer(customer)}
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
          <Heading level={1}>Customers</Heading>
          <Text color="secondary">
            {customers.length === 0
              ? 'No customers defined yet.'
              : `${customers.length} customer${customers.length === 1 ? '' : 's'} in the customer master`}
          </Text>
        </div>
        <Button onClick={openCreate}>+ New Customer</Button>
      </div>

      {customers.length > 0 && (
        <Card padding={0}>
          <Table data={customers} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />

      <AlertDialog
        isOpen={deletingCustomer !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingCustomer(null);
        }}
        title="Delete customer?"
        description={
          deletingCustomer
            ? `Delete "${deletingCustomer.code} — ${deletingCustomer.legalName}"? This cannot be undone.`
            : ''
        }
        actionLabel={isDeleting ? 'Deleting…' : 'Delete'}
        onAction={handleConfirmDelete}
      />
    </>
  );
}
