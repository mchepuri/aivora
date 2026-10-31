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
import { TextInput } from '@/lib/astryxCompat';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { SalesOrderLinesEditor } from './SalesOrderLinesEditor';
import {
  emptyDraftLine,
  type CustomerOption,
  type DraftLine,
  type ItemOption,
  type SalesOrder,
  type UomOption,
  type WarehouseOption,
} from './SalesOrderTypes';

interface Props {
  customerOptions: CustomerOption[];
  warehouseOptions: WarehouseOption[];
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  salesOrder?: SalesOrder;
}

interface HeaderState {
  customerId: string;
  warehouseId: string;
  customerPoRef: string;
  currency: string;
  orderDate: string;
  requestedDate: string;
}

function defaultHeader(
  customerOptions: CustomerOption[],
  warehouseOptions: WarehouseOption[],
  salesOrder?: SalesOrder,
): HeaderState {
  return {
    customerId: salesOrder?.customerId ?? customerOptions[0]?.id ?? '',
    warehouseId: salesOrder?.warehouseId ?? warehouseOptions[0]?.id ?? '',
    customerPoRef: salesOrder?.customerPoRef ?? '',
    currency: salesOrder?.currency ?? 'USD',
    orderDate: salesOrder?.orderDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    requestedDate: salesOrder?.requestedDate?.slice(0, 10) ?? '',
  };
}

function lineFromSalesOrderLine(line: SalesOrder['lines'][number]): DraftLine {
  return {
    key: line.id,
    itemId: line.itemId,
    uomId: line.uomId,
    quantityOrdered: Number(line.quantityOrdered),
    unitPrice: Number(line.unitPrice),
  };
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'INR'].map((c) => ({ value: c, label: c }));

export function SalesOrderForm({
  customerOptions,
  warehouseOptions,
  itemOptions,
  uomOptions,
  salesOrder,
}: Props) {
  const router = useRouter();
  const isEditMode = Boolean(salesOrder);
  const [header, setHeader] = useState<HeaderState>(() =>
    defaultHeader(customerOptions, warehouseOptions, salesOrder),
  );
  const [lines, setLines] = useState<DraftLine[]>(() =>
    salesOrder ? salesOrder.lines.map(lineFromSalesOrderLine) : [emptyDraftLine()],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const missingMasterData =
    customerOptions.length === 0 || warehouseOptions.length === 0 || itemOptions.length === 0;

  async function persistSalesOrder() {
    const payload = {
      customerId: header.customerId,
      warehouseId: header.warehouseId,
      customerPoRef: header.customerPoRef || undefined,
      currency: header.currency,
      orderDate: header.orderDate,
      requestedDate: header.requestedDate || undefined,
      lines: lines.map((line) => ({
        itemId: line.itemId,
        uomId: line.uomId,
        quantityOrdered: line.quantityOrdered,
        unitPrice: line.unitPrice,
      })),
    };

    if (isEditMode && salesOrder) {
      await apiClient.patch(`/sales/sales-orders/${salesOrder.id}`, payload);
      return;
    }

    await apiClient.post('/sales/sales-orders', payload);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await persistSalesOrder();
      router.push('/sales-orders');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? 'Failed to update sales order'
            : 'Failed to create sales order',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndReturn() {
    if (!isEditMode || !salesOrder) {
      return;
    }

    const confirmed = window.confirm(
      `Save changes to sales order ${salesOrder.soNumber} and return to the sales order details?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setSaving(true);

    try {
      await persistSalesOrder();
      router.push(`/sales-orders/${salesOrder.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update sales order',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancelAndReturn() {
    if (!isEditMode || !salesOrder) {
      router.push('/sales-orders');
      return;
    }

    const confirmed = window.confirm(
      `Discard unsaved changes to sales order ${salesOrder.soNumber} and return to the sales order details?`,
    );

    if (confirmed) {
      router.push(`/sales-orders/${salesOrder.id}`);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link href="/sales-orders" className="mb-4 inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M9 11L5 7l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sales Orders
          </Link>
          <Heading level={1}>{isEditMode ? 'Edit Sales Order' : 'New Sales Order'}</Heading>
          <Text color="secondary">
            {isEditMode ? 'Update the draft order details.' : 'Record an order received from a customer.'}
          </Text>
        </div>

        {isEditMode && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelAndReturn}
              disabled={saving}
              aria-label="Cancel and return"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 14 4 9l5-5M4 9h10a5 5 0 0 1 0 10h-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndReturn}
              disabled={saving}
              aria-label={saving ? 'Saving sales order' : 'Save and return'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="m5 12 4 4L19 2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {missingMasterData ? (
        <Banner
          status="error"
          title="Customers, warehouses, and items are all required before creating a sales order."
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding={8}>
            <Grid columns={{ minWidth: 240 }} gap={5}>
              <Selector
                label="Customer"
                options={customerOptions.map((c) => ({
                  value: c.id,
                  label: `${c.code} — ${c.legalName}`,
                }))}
                value={header.customerId}
                onChange={(value) => setHeader({ ...header, customerId: value as string })}
                isRequired
              />
              <Selector
                label="Ship From Warehouse"
                options={warehouseOptions.map((w) => ({
                  value: w.id,
                  label: `${w.code} — ${w.name}`,
                }))}
                value={header.warehouseId}
                onChange={(value) => setHeader({ ...header, warehouseId: value as string })}
                isRequired
              />
              <TextInput
                label="Customer PO Reference"
                placeholder="e.g. 4500012345"
                value={header.customerPoRef}
                onChange={(value) => setHeader({ ...header, customerPoRef: value })}
                isOptional
              />
              <DateInput
                label="Order Date"
                value={header.orderDate as ISODateString}
                onChange={(value) => setHeader({ ...header, orderDate: value ?? '' })}
                isRequired
              />
              <DateInput
                label="Requested Delivery Date"
                value={(header.requestedDate || undefined) as ISODateString | undefined}
                onChange={(value) => setHeader({ ...header, requestedDate: value ?? '' })}
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
            <SalesOrderLinesEditor
              lines={lines}
              onChange={setLines}
              itemOptions={itemOptions}
              uomOptions={uomOptions}
              currency={header.currency}
            />
          </Card>

          {error && <Banner status="error" title={error} />}

          {!isEditMode && (
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </Button>
              <Button type="button" variant="ghost" href="/sales-orders">
                Cancel
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
