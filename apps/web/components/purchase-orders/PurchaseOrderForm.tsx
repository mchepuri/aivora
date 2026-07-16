'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { PurchaseOrderLinesEditor } from './PurchaseOrderLinesEditor';
import {
  emptyDraftLine,
  type DraftLine,
  type ItemOption,
  type SupplierOption,
  type UomOption,
  type WarehouseOption,
} from './PurchaseOrderTypes';

interface Props {
  supplierOptions: SupplierOption[];
  warehouseOptions: WarehouseOption[];
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
}

interface HeaderState {
  supplierId: string;
  warehouseId: string;
  currency: string;
  orderDate: string;
  expectedDate: string;
}

function defaultHeader(supplierOptions: SupplierOption[], warehouseOptions: WarehouseOption[]): HeaderState {
  return {
    supplierId: supplierOptions[0]?.id ?? '',
    warehouseId: warehouseOptions[0]?.id ?? '',
    currency: 'USD',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: '',
  };
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'INR'].map((c) => ({ value: c, label: c }));

export function PurchaseOrderForm({
  supplierOptions,
  warehouseOptions,
  itemOptions,
  uomOptions,
}: Props) {
  const router = useRouter();
  const [header, setHeader] = useState<HeaderState>(
    defaultHeader(supplierOptions, warehouseOptions),
  );
  const [lines, setLines] = useState<DraftLine[]>([emptyDraftLine()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const missingMasterData =
    supplierOptions.length === 0 || warehouseOptions.length === 0 || itemOptions.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/procurement/purchase-orders', {
        supplierId: header.supplierId,
        warehouseId: header.warehouseId,
        currency: header.currency,
        orderDate: header.orderDate,
        expectedDate: header.expectedDate || undefined,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          uomId: line.uomId,
          quantityOrdered: line.quantityOrdered,
          unitPrice: line.unitPrice,
        })),
      });
      router.push('/purchase-orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Link href="/purchase-orders" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Purchase Orders
        </Link>
        <Heading level={1}>New Purchase Order</Heading>
        <Text color="secondary">Create a draft purchase order for a supplier.</Text>
      </div>

      {missingMasterData ? (
        <Banner
          status="error"
          title="Suppliers, warehouses, and items are all required before creating a purchase order."
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding={8}>
            <Grid columns={{ minWidth: 240 }} gap={5}>
              <Selector
                label="Supplier"
                options={supplierOptions.map((s) => ({ value: s.id, label: `${s.code} — ${s.legalName}` }))}
                value={header.supplierId}
                onChange={(value) => setHeader({ ...header, supplierId: value as string })}
                isRequired
              />
              <Selector
                label="Warehouse"
                options={warehouseOptions.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
                value={header.warehouseId}
                onChange={(value) => setHeader({ ...header, warehouseId: value as string })}
                isRequired
              />
              <DateInput
                label="Order Date"
                value={header.orderDate as ISODateString}
                onChange={(value) => setHeader({ ...header, orderDate: value ?? '' })}
                isRequired
              />
              <DateInput
                label="Expected Date"
                value={(header.expectedDate || undefined) as ISODateString | undefined}
                onChange={(value) => setHeader({ ...header, expectedDate: value ?? '' })}
                isOptional
              />
              <Selector
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={header.currency}
                onChange={(value) => setHeader({ ...header, currency: value as string })}
              />
            </Grid>
          </Card>

          <Card padding={8}>
            <Heading level={3} className="mb-4">
              Line Items
            </Heading>
            <PurchaseOrderLinesEditor
              lines={lines}
              onChange={setLines}
              itemOptions={itemOptions}
              uomOptions={uomOptions}
              currency={header.currency}
            />
          </Card>

          {error && <Banner status="error" title={error} />}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save as Draft'}
            </Button>
            <Button type="button" variant="ghost" href="/purchase-orders">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
