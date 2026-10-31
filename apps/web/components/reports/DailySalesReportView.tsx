'use client';

import { useEffect, useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Grid } from '@astryxdesign/core/Grid';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { DateRangePicker } from './DateRangePicker';
import { daysAgoDateString, todayDateString, type DailySalesDay, type DailySalesReport } from './ReportTypes';
import type { DateRange } from './DateRangePresets';

function formatCurrency(amount: string): string {
  const value = Number(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(value) ? value : 0,
  );
}

// The API's `to` is exclusive (see docs/sales/sales-orders/reporting-queries.md's
// half-open range note) — the date picker's "to" should feel inclusive to the
// user, so this adds one day before sending it.
function exclusiveEnd(inclusiveDate: string): string {
  const d = new Date(inclusiveDate);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function DailySalesReportView() {
  const [range, setRange] = useState<DateRange>({ from: daysAgoDateString(6), to: todayDateString() });
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runReport() {
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: range.from, to: exclusiveEnd(range.to) });
      const result = await apiClient.get<DailySalesReport>(`/reports/sales/daily?${params.toString()}`);
      setReport(result);
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

  const columns: TableColumn<DailySalesDay>[] = [
    { key: 'date', header: 'Date', renderCell: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'orderCount', header: 'Orders', align: 'end' },
    { key: 'revenue', header: 'Revenue', align: 'end', renderCell: (row) => formatCurrency(row.revenue) },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link href="/reports" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reports
        </Link>
        <Heading level={1}>Daily Sales Report</Heading>
        <Text color="secondary">
          Revenue and order count per day, counting only orders that have shipped (SHIPPED, INVOICED,
          or CLOSED) — draft and in-progress orders aren&apos;t sales yet.
        </Text>
      </div>

      <Card padding={8} className="mb-6">
        <DateRangePicker value={range} onChange={setRange} />
        <div className="mt-5">
          <Button onClick={runReport} disabled={loading}>
            {loading ? 'Running…' : 'Run Report'}
          </Button>
        </div>
      </Card>

      {error && <Banner status="error" title={error} className="mb-4" />}

      {report !== null && (
        <>
          <Card padding={8} className="mb-6">
            <Grid columns={{ minWidth: 200 }} gap={5}>
              <div>
                <Text color="secondary">Total Orders</Text>
                <Heading level={3}>{report.summary.orderCount}</Heading>
              </div>
              <div>
                <Text color="secondary">Total Revenue</Text>
                <Heading level={3}>{formatCurrency(report.summary.revenue)}</Heading>
              </div>
            </Grid>
          </Card>

          <Card padding={0}>
            {report.days.length === 0 ? (
              <div className="p-8">
                <Text color="secondary">No sales in this date range.</Text>
              </div>
            ) : (
              <Table data={report.days} columns={columns} idKey="date" hasHover />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
