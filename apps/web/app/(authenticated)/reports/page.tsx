import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@/components/ui/Button';

const REPORTS = [
  {
    href: '/reports/opening-stock',
    title: 'Opening Stock Report',
    description: 'Stock on hand at the start of a given date, by item and warehouse.',
  },
  {
    href: '/reports/closing-stock',
    title: 'Closing Stock Report',
    description: 'Stock on hand at the end of a given date, by item and warehouse.',
  },
  {
    href: '/reports/daily-sales',
    title: 'Daily Sales Report',
    description: 'Orders and revenue per day for a date range, counting only shipped orders.',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <Heading level={1}>Reports</Heading>
        <Text color="secondary">Stock and sales reports derived from the ledger and sales orders.</Text>
      </div>

      <Grid columns={{ minWidth: 260 }} gap={5}>
        {REPORTS.map((report) => (
          <Card key={report.href} padding={8}>
            <Heading level={3} className="mb-2">
              {report.title}
            </Heading>
            <Text color="secondary" className="mb-5">
              {report.description}
            </Text>
            <Button href={report.href}>View Report</Button>
          </Card>
        ))}
      </Grid>
    </div>
  );
}
