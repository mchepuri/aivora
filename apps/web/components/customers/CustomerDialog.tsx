'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';

export const CUSTOMER_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'BLOCKED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_OPTIONS = CUSTOMER_STATUSES.map((s) => ({
  value: s,
  label: s
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

export interface Customer {
  id: string;
  code: string;
  legalName: string;
  defaultCurrency: string;
  creditLimit: string | null;
  status: CustomerStatus;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

interface FormState {
  code: string;
  legalName: string;
  defaultCurrency: string;
  status: CustomerStatus;
}

function defaultForm(): FormState {
  return {
    code: '',
    legalName: '',
    defaultCurrency: 'USD',
    status: 'PENDING_APPROVAL',
  };
}

export function CustomerDialog({ open, onOpenChange, customer }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (customer) {
        setForm({
          code: customer.code,
          legalName: customer.legalName,
          defaultCurrency: customer.defaultCurrency,
          status: customer.status,
        });
      } else {
        setForm(defaultForm());
      }
      setError('');
    }
  }, [open, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (customer) {
        await apiClient.patch(`/master-data/customers/${customer.id}`, form);
      } else {
        await apiClient.post('/master-data/customers', form);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(customer);

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Layout
          header={
            <DialogHeader
              title={isEdit ? 'Edit Customer' : 'New Customer'}
              subtitle={
                customer ? `Editing ${customer.code}` : 'Add a new customer to the customer master.'
              }
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <TextInput
                label="Code"
                placeholder="e.g. NORTHWIND-01"
                value={form.code}
                onChange={(value) => setForm({ ...form, code: value.toUpperCase() })}
                isRequired
              />
              <TextInput
                label="Legal Name"
                placeholder="e.g. Northwind Traders Inc."
                value={form.legalName}
                onChange={(value) => setForm({ ...form, legalName: value })}
                isRequired
              />
              <TextInput
                label="Default Currency"
                placeholder="USD"
                value={form.defaultCurrency}
                onChange={(value) => setForm({ ...form, defaultCurrency: value.toUpperCase() })}
              />
              <Selector
                label="Status"
                options={CUSTOMER_STATUS_OPTIONS}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as CustomerStatus })}
              />
              {error && <Banner status="error" title={error} />}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Customer'}
              </Button>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
