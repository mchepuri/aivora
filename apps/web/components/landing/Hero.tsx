import { Section } from '@astryxdesign/core/Section';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <Section
      variant="transparent"
      className="relative overflow-hidden bg-gradient-to-b from-white to-canvas px-6 pt-28 pb-24 text-center sm:pt-36 sm:pb-32"
    >
      <Text type="label" color="accent" weight="semibold" justify="center">
        Introducing Aivora
      </Text>
      <Heading level={1} type="display-1" justify="center" className="mx-auto mt-3 max-w-4xl text-balance">
        Supply chain management.
        <br />
        Reimagined with AI.
      </Heading>
      <Text color="secondary" justify="center" className="mx-auto mt-6 max-w-2xl text-lg text-balance sm:text-xl">
        Aivora unifies inventory, procurement, finance, and fulfillment into a
        single intelligent platform — so your team can spend less time
        reconciling spreadsheets and more time growing the business.
      </Text>
      <div className="mt-9 flex items-center justify-center gap-6">
        <Button variant="accent" href="/register">
          Get started
        </Button>
        <Link href="#platform" className="group inline-flex items-center gap-1">
          Learn more
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      <div className="relative mx-auto mt-20 h-[360px] max-w-5xl overflow-hidden rounded-[28px] bg-ink shadow-2xl sm:h-[440px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,113,227,0.55),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(94,92,230,0.45),transparent_50%)]" />
        <div className="relative flex h-full items-center justify-center px-8">
          {/* Reversed on this dark panel only — text-white/90 (utilities
              layer) wins over Text's default ink color (astryx-theme layer). */}
          <Text justify="center" className="text-2xl font-medium text-balance text-white/90 sm:text-3xl">
            One ledger. One source of truth.
            <br />
            Every warehouse, every branch, every currency.
          </Text>
        </div>
      </div>
    </Section>
  );
}
