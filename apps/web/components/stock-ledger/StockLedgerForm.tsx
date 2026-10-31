'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import {
  MOVEMENT_TYPE_LABEL,
  MOVEMENT_TYPES,
  type ItemOption,
  type MovementType,
  type UomOption,
  type WarehouseOption,
} from './StockLedgerTypes';

interface Props {
  itemOptions: ItemOption[];
  warehouseOptions: WarehouseOption[];
  uomOptions: UomOption[];
}

interface FormState {
  itemId: string;
  warehouseId: string;
  movementType: MovementType;
  quantity: number | null;
  uomId: string;
  unitCost: number | null;
  reasonCode: string;
}

function defaultForm(
  itemOptions: ItemOption[],
  warehouseOptions: WarehouseOption[],
  uomOptions: UomOption[],
): FormState {
  return {
    itemId: itemOptions[0]?.id ?? '',
    warehouseId: warehouseOptions[0]?.id ?? '',
    movementType: 'RECEIPT',
    quantity: null,
    uomId: uomOptions[0]?.id ?? '',
    unitCost: null,
    reasonCode: '',
  };
}

const MOVEMENT_TYPE_OPTIONS = MOVEMENT_TYPES.map((type) => ({
  value: type,
  label: MOVEMENT_TYPE_LABEL[type],
}));

export function StockLedgerForm({ itemOptions, warehouseOptions, uomOptions }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    defaultForm(itemOptions, warehouseOptions, uomOptions),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const missingMasterData =
    itemOptions.length === 0 || warehouseOptions.length === 0 || uomOptions.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.quantity || form.quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/inventory/stock-ledger', {
        itemId: form.itemId,
        warehouseId: form.warehouseId,
        movementType: form.movementType,
        quantity: form.quantity,
        uomId: form.uomId,
        unitCost: form.unitCost ?? undefined,
        reasonCode: form.reasonCode || undefined,
      });
      router.push('/inventory/stock-ledger');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post inventory transaction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link href="/inventory/stock-ledger" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Stock Ledger
        </Link>
        <Heading level={1}>New Inventory Transaction</Heading>
        <Text color="secondary">
          Posts an immutable entry to the stock ledger. Once posted, an entry can only be
          corrected by reversing it — never edited.
        </Text>
      </div>

      {missingMasterData ? (
        <Banner
          status="error"
          title="Items, warehouses, and units of measure are all required before posting an inventory transaction."
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding={8}>
            <Grid columns={{ minWidth: 240 }} gap={5}>
              <Selector
                label="Movement Type"
                options={MOVEMENT_TYPE_OPTIONS}
                value={form.movementType}
                onChange={(value) => setForm({ ...form, movementType: value as MovementType })}
                isRequired
              />
              <Selector
                label="Item"
                options={itemOptions.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
                value={form.itemId}
                onChange={(value) => setForm({ ...form, itemId: value as string })}
                isRequired
              />
              <Selector
                label="Warehouse"
                options={warehouseOptions.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
                value={form.warehouseId}
                onChange={(value) => setForm({ ...form, warehouseId: value as string })}
                isRequired
              />
              <Selector
                label="Unit of Measure"
                options={uomOptions.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))}
                value={form.uomId}
                onChange={(value) => setForm({ ...form, uomId: value as string })}
                isRequired
              />
              <NumberInput
                label="Quantity"
                value={form.quantity}
                onChange={(value) => setForm({ ...form, quantity: value })}
                min={0}
                isRequired
              />
              <NumberInput
                label="Unit Cost"
                value={form.unitCost}
                onChange={(value) => setForm({ ...form, unitCost: value })}
                min={0}
                step={0.01}
                isOptional
              />
              <TextInput
                label="Reason / Note"
                placeholder="e.g. Cycle count correction"
                value={form.reasonCode}
                onChange={(value) => setForm({ ...form, reasonCode: value })}
                isOptional
              />
            </Grid>
          </Card>

          {error && <Banner status="error" title={error} />}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Posting…' : 'Post Transaction'}
            </Button>
            <Button type="button" variant="ghost" href="/inventory/stock-ledger">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
