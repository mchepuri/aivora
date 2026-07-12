import { Section } from '@astryxdesign/core/Section';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';

const columns = [
  {
    title: 'Platform',
    links: ['Inventory', 'Procurement', 'Finance & GL', 'Warehousing', 'Analytics'],
  },
  {
    title: 'Solutions',
    links: ['Manufacturing', 'Retail & distribution', 'Logistics', '3PL'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API reference', 'Status', 'Support'],
  },
];

export function Footer() {
  return (
    <Section variant="transparent" dividers={['top']}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Grid columns={{ minWidth: 140, max: 4 }} gap={8}>
          {columns.map((column) => (
            <div key={column.title}>
              <Text type="label" weight="semibold">
                {column.title}
              </Text>
              <div className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <Link key={link} href="#" type="supporting" color="secondary">
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </Grid>

        <Divider className="mt-10" />

        <div className="mt-6 flex flex-col items-start justify-between gap-4 text-[12px] text-muted md:flex-row md:items-center">
          <Text type="supporting" color="secondary">
            Copyright © {new Date().getFullYear()} Aivora Inc. All rights reserved.
          </Text>
          <div className="flex gap-6">
            <Link href="#" type="supporting" color="secondary">
              Privacy Policy
            </Link>
            <Link href="#" type="supporting" color="secondary">
              Terms of Use
            </Link>
            <Link href="#" type="supporting" color="secondary">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
