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

export const WAREHOUSE_TYPES = [
  'DC',
  'RETAIL_BACKROOM',
  'MANUFACTURING',
  'BONDED',
  'VIRTUAL',
] as const;
export type WarehouseType = (typeof WAREHOUSE_TYPES)[number];

export const WAREHOUSE_TYPE_OPTIONS = WAREHOUSE_TYPES.map((t) => ({
  value: t,
  label: t
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  addressLine: string | null;
  warehouseType: WarehouseType;
  timezone: string;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
}

interface FormState {
  code: string;
  name: string;
  warehouseType: WarehouseType;
  timezone: string;
}

function defaultForm(): FormState {
  return {
    code: '',
    name: '',
    warehouseType: 'DC',
    timezone: 'UTC',
  };
}

export function WarehouseDialog({ open, onOpenChange, warehouse }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (warehouse) {
        setForm({
          code: warehouse.code,
          name: warehouse.name,
          warehouseType: warehouse.warehouseType,
          timezone: warehouse.timezone,
        });
      } else {
        setForm(defaultForm());
      }
      setError('');
    }
  }, [open, warehouse]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (warehouse) {
        await apiClient.patch(`/master-data/warehouses/${warehouse.id}`, form);
      } else {
        await apiClient.post('/master-data/warehouses', form);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(warehouse);

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Layout
          header={
            <DialogHeader
              title={isEdit ? 'Edit Warehouse' : 'New Warehouse'}
              subtitle={warehouse ? `Editing ${warehouse.code}` : 'Add a new warehouse to the site master.'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <TextInput
                label="Code"
                placeholder="e.g. DC-01"
                value={form.code}
                onChange={(value) => setForm({ ...form, code: value.toUpperCase() })}
                isRequired
              />
              <TextInput
                label="Name"
                placeholder="e.g. East Coast Distribution Center"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                isRequired
              />
              <Selector
                label="Type"
                options={WAREHOUSE_TYPE_OPTIONS}
                value={form.warehouseType}
                onChange={(value) => setForm({ ...form, warehouseType: value as WarehouseType })}
                isRequired
              />
              <TextInput
                label="Timezone"
                placeholder="UTC"
                value={form.timezone}
                onChange={(value) => setForm({ ...form, timezone: value })}
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
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Warehouse'}
              </Button>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
