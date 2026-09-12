'use client';

import { useEffect, useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { DateRangePicker } from './DateRangePicker';
import { todayDateString, type ItemOption, type StockReportRow, type WarehouseOption } from './ReportTypes';
import type { DateRange } from './DateRangePresets';

interface Props {
  kind: 'opening' | 'closing';
  title: string;
  description: string;
  itemOptions: ItemOption[];
  warehouseOptions: WarehouseOption[];
}

/** Opening balance is as-of the range's start; closing is as-of the range's end — same
 * relationship as an accounting period's opening/closing stock. */
function asOfDate(kind: Props['kind'], range: DateRange): string {
  return kind === 'opening' ? range.from : range.to;
}

function formatMoney(amount: string | null): string {
  if (amount === null) return '—';
  const value = Number(amount);
  return Number.isFinite(value) ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) : '—';
}

export function StockReportView({ kind, title, description, itemOptions, warehouseOptions }: Props) {
  const [range, setRange] = useState<DateRange>({ from: todayDateString(), to: todayDateString() });
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [stockOnly, setStockOnly] = useState(false);
  const [rows, setRows] = useState<StockReportRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runReport() {
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: asOfDate(kind, range) });
      if (itemId) params.set('itemId', itemId);
      if (warehouseId) params.set('warehouseId', warehouseId);
      const result = await apiClient.get<StockReportRow[]>(`/reports/stock/${kind}?${params.toString()}`);
      setRows(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void runReport();
  }, []);

  const columns: TableColumn<StockReportRow>[] = [
    { key: 'item', header: 'Item', renderCell: (row) => (row.item ? `${row.item.sku} — ${row.item.name}` : '—') },
    { key: 'warehouse', header: 'Warehouse', renderCell: (row) => row.warehouse?.name ?? '—' },
    { key: 'batch', header: 'Batch', renderCell: (row) => row.batch?.batchNo ?? '—' },
    {
      key: 'manufacturedDate',
      header: 'Mfg Date',
      renderCell: (row) => (row.batch?.manufacturedDate ? new Date(row.batch.manufacturedDate).toLocaleDateString() : '—'),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      renderCell: (row) => (row.batch?.expiryDate ? new Date(row.batch.expiryDate).toLocaleDateString() : '—'),
    },
    { key: 'quantity', header: 'Quantity', align: 'end' },
    { key: 'mrp', header: 'MRP', align: 'end', renderCell: (row) => formatMoney(row.item?.mrp ?? null) },
    { key: 'costPrice', header: 'Cost Price', align: 'end', renderCell: (row) => formatMoney(row.costPrice) },
    { key: 'netCost', header: 'Net Cost', align: 'end', renderCell: (row) => formatMoney(row.netCost) },
  ];

  const displayRows = stockOnly ? (rows ?? []).filter((row) => Number(row.quantity) !== 0) : rows;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link href="/reports" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reports
        </Link>
        <Heading level={1}>{title}</Heading>
        <Text color="secondary">{description}</Text>
      </div>

      <Card padding={8} className="mb-6">
        <div className="mb-2">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <Text color="secondary" className="mb-5 text-[13px]">
          {kind === 'opening'
            ? 'Opening balance is as of the start of the "From" date.'
            : 'Closing balance is as of the end of the "To" date.'}
        </Text>
        <Grid columns={{ minWidth: 200 }} gap={5}>
          <Selector
            label="Item"
            options={[{ value: '', label: 'All items' }, ...itemOptions.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))]}
            value={itemId}
            onChange={(value) => setItemId(value as string)}
          />
          <Selector
            label="Warehouse"
            options={[{ value: '', label: 'All warehouses' }, ...warehouseOptions.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))]}
            value={warehouseId}
            onChange={(value) => setWarehouseId(value as string)}
          />
        </Grid>
        <div className="mt-5">
          <RadioList label="Report Mode" value={stockOnly ? 'stockOnly' : 'all'} onChange={(v) => setStockOnly(v === 'stockOnly')}>
            <RadioListItem label="Show All Items" value="all" />
            <RadioListItem label="Show Item with Stock Only" value="stockOnly" />
          </RadioList>
        </div>
        <div className="mt-5">
          <Button onClick={runReport} disabled={loading}>
            {loading ? 'Running…' : 'Run Report'}
          </Button>
        </div>
      </Card>

      {error && <Banner status="error" title={error} className="mb-4" />}

      {displayRows !== null && (
        <Card padding={0}>
          {displayRows.length === 0 ? (
            <div className="p-8">
              <Text color="secondary">
                No stock activity found for these filters as of {asOfDate(kind, range)}.
              </Text>
            </div>
          ) : (
            <Table
              data={displayRows}
              columns={columns}
              idKey={(row) => `${row.item?.id}-${row.warehouse?.id}-${row.batch?.id ?? 'none'}`}
              hasHover
            />
          )}
        </Card>
      )}
    </div>
  );
}
