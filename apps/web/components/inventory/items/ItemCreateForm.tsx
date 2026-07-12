'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import {
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  VALUATION_METHOD_OPTIONS,
  type ItemStatus,
  type ItemType,
  type UomOption,
  type ValuationMethod,
} from './ItemDialog';

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

interface Props {
  uomOptions: UomOption[];
}

export function ItemCreateForm({ uomOptions }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm(uomOptions));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/master-data/items', form);
      router.push('/inventory/items');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  }

  const uomSelectorOptions = uomOptions.map((uom) => ({
    value: uom.id,
    label: `${uom.code} — ${uom.name}`,
  }));

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link href="/inventory/items" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Items
        </Link>
        <Heading level={1}>New Item</Heading>
        <Text color="secondary">Add a new item to the master catalog.</Text>
      </div>

      <Card padding={8}>
        {uomOptions.length === 0 ? (
          <Text color="secondary">
            No units of measure exist yet.{' '}
            <Link href="/inventory/units-of-measure/new">Create one first</Link> — items require a
            base UOM.
          </Text>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="flex gap-6">
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
            </div>

            {error && <Banner status="error" title={error} />}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create Item'}
              </Button>
              <Button type="button" variant="ghost" href="/inventory/items">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
