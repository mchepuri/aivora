import { Section } from '@astryxdesign/core/Section';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';

const features = [
  {
    title: 'Real-time inventory ledger',
    body: 'An immutable, append-only ledger gives you one source of truth for stock — across every warehouse, batch, and serial number.',
  },
  {
    title: 'AI-driven forecasting',
    body: 'Demand predictions, reorder suggestions, and anomaly detection are built into the platform from day one — not bolted on later.',
  },
  {
    title: 'Built for compliance',
    body: 'Double-entry accounting, GST/tax automation, and segregation-of-duties controls keep your books audit-ready at all times.',
  },
];

export function FeatureGrid() {
  return (
    <Section id="platform" variant="transparent" className="mx-auto max-w-6xl px-6 py-24">
      <Heading level={2} type="display-3" justify="center">
        Everything your supply chain needs. Nothing it doesn&apos;t.
      </Heading>
      {/* Grid's gap prop caps at spacing step 10 (40px) — closest to the
          original gap-12 (48px); Grid has no step matching 48px exactly. */}
      <Grid columns={3} gap={10} className="mt-16">
        {features.map((feature) => (
          <div key={feature.title}>
            <Heading level={3}>{feature.title}</Heading>
            <Text color="secondary" className="mt-2 leading-relaxed">
              {feature.body}
            </Text>
          </div>
        ))}
      </Grid>
    </Section>
  );
}
