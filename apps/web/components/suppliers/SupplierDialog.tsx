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

export const SUPPLIER_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'BLOCKED'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_STATUS_OPTIONS = SUPPLIER_STATUSES.map((s) => ({
  value: s,
  label: s
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

export interface Supplier {
  id: string;
  code: string;
  legalName: string;
  defaultCurrency: string;
  ratingScore: string | null;
  status: SupplierStatus;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

interface FormState {
  code: string;
  legalName: string;
  defaultCurrency: string;
  status: SupplierStatus;
}

function defaultForm(): FormState {
  return {
    code: '',
    legalName: '',
    defaultCurrency: 'USD',
    status: 'PENDING_APPROVAL',
  };
}

export function SupplierDialog({ open, onOpenChange, supplier }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (supplier) {
        setForm({
          code: supplier.code,
          legalName: supplier.legalName,
          defaultCurrency: supplier.defaultCurrency,
          status: supplier.status,
        });
      } else {
        setForm(defaultForm());
      }
      setError('');
    }
  }, [open, supplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (supplier) {
        await apiClient.patch(`/master-data/suppliers/${supplier.id}`, form);
      } else {
        await apiClient.post('/master-data/suppliers', form);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(supplier);

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Layout
          header={
            <DialogHeader
              title={isEdit ? 'Edit Supplier' : 'New Supplier'}
              subtitle={supplier ? `Editing ${supplier.code}` : 'Add a new supplier to the vendor master.'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <TextInput
                label="Code"
                placeholder="e.g. ACME-01"
                value={form.code}
                onChange={(value) => setForm({ ...form, code: value.toUpperCase() })}
                isRequired
              />
              <TextInput
                label="Legal Name"
                placeholder="e.g. Acme Supply Co."
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
                options={SUPPLIER_STATUS_OPTIONS}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as SupplierStatus })}
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
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Supplier'}
              </Button>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
