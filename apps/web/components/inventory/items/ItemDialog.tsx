'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';

export const ITEM_TYPES = ['GOODS', 'SERVICE', 'ASSET'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const VALUATION_METHODS = ['FIFO', 'LIFO', 'WEIGHTED_AVG'] as const;
export type ValuationMethod = (typeof VALUATION_METHODS)[number];

export const ITEM_STATUSES = ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_TYPE_OPTIONS = ITEM_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0) + t.slice(1).toLowerCase(),
}));

export const ITEM_STATUS_OPTIONS = ITEM_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0) + s.slice(1).toLowerCase(),
}));

export const VALUATION_METHOD_OPTIONS = VALUATION_METHODS.map((v) => ({
  value: v,
  label: v === 'WEIGHTED_AVG' ? 'Weighted Average' : v,
}));

export interface UomOption {
  id: string;
  code: string;
  name: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  baseUomId: string;
  baseUom?: UomOption;
  itemType: ItemType;
  valuationMethod: ValuationMethod;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  status: ItemStatus;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  uomOptions: UomOption[];
}

interface FormState {
  sku: string;
  name: string;
  baseUomId: string;
  itemType: ItemType;
  valuationMethod: ValuationMethod;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  status: ItemStatus;
}

function defaultForm(uomOptions: UomOption[]): FormState {
  return {
    sku: '',
    name: '',
    baseUomId: uomOptions[0]?.id ?? '',
    itemType: 'GOODS',
    valuationMethod: 'FIFO',
    isBatchTracked: false,
    isSerialTracked: false,
    status: 'ACTIVE',
  };
}

export function ItemDialog({ open, onOpenChange, item, uomOptions }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm(uomOptions));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          sku: item.sku,
          name: item.name,
          baseUomId: item.baseUomId,
          itemType: item.itemType,
          valuationMethod: item.valuationMethod,
          isBatchTracked: item.isBatchTracked,
          isSerialTracked: item.isSerialTracked,
          status: item.status,
        });
      } else {
        setForm(defaultForm(uomOptions));
      }
      setError('');
    }
  }, [open, item, uomOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (item) {
        await apiClient.patch(`/master-data/items/${item.id}`, form);
      } else {
        await apiClient.post('/master-data/items', form);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(item);
  const uomSelectorOptions =
    uomOptions.length === 0
      ? [{ value: '', label: 'No units defined yet', disabled: true }]
      : uomOptions.map((uom) => ({ value: uom.id, label: `${uom.code} — ${uom.name}` }));

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Layout
          header={
            <DialogHeader
              title={isEdit ? 'Edit Item' : 'New Item'}
              subtitle={item ? `Editing ${item.sku}` : 'Add a new item to the master catalog.'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <TextInput
                label="SKU"
                placeholder="e.g. WIDGET-001"
                value={form.sku}
                onChange={(value) => setForm({ ...form, sku: value.toUpperCase() })}
                isRequired
              />
              <TextInput
                label="Name"
                placeholder="e.g. Stainless Steel Widget"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                isRequired
              />
              <Selector
                label="Base UOM"
                options={uomSelectorOptions}
                value={form.baseUomId}
                onChange={(value) => setForm({ ...form, baseUomId: value as string })}
                isRequired
              />
              <Selector
                label="Type"
                options={ITEM_TYPE_OPTIONS}
                value={form.itemType}
                onChange={(value) => setForm({ ...form, itemType: value as ItemType })}
              />
              <Selector
                label="Status"
                options={ITEM_STATUS_OPTIONS}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as ItemStatus })}
              />
              <Selector
                label="Valuation method"
                options={VALUATION_METHOD_OPTIONS}
                value={form.valuationMethod}
                onChange={(value) => setForm({ ...form, valuationMethod: value as ValuationMethod })}
              />
              <CheckboxInput
                label="Batch tracked"
                value={form.isBatchTracked}
                onChange={(checked) => setForm({ ...form, isBatchTracked: checked })}
              />
              <CheckboxInput
                label="Serial tracked"
                value={form.isSerialTracked}
                onChange={(checked) => setForm({ ...form, isSerialTracked: checked })}
              />
              {error && <Banner status="error" title={error} />}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uomOptions.length === 0}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Item'}
              </Button>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
