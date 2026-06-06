import Link from 'next/link';

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

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-canvas px-6 pt-28 pb-24 text-center sm:pt-36 sm:pb-32">
        <p className="text-[15px] font-semibold tracking-wide text-accent">Introducing Aivora</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-tight text-balance text-ink sm:text-6xl md:text-7xl">
          Supply chain management.
          <br />
          Reimagined with AI.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-muted sm:text-xl">
          Aivora unifies inventory, procurement, finance, and fulfillment into a
          single intelligent platform — so your team can spend less time
          reconciling spreadsheets and more time growing the business.
        </p>
        <div className="mt-9 flex items-center justify-center gap-6">
          <Link
            href="/register"
            className="rounded-full bg-accent px-7 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-accent/90"
          >
            Get started
          </Link>
          <Link
            href="#platform"
            className="group inline-flex items-center gap-1 text-[15px] font-medium text-accent"
          >
            Learn more
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        <div className="relative mx-auto mt-20 h-[360px] max-w-5xl overflow-hidden rounded-[28px] bg-ink shadow-2xl sm:h-[440px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,113,227,0.55),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(94,92,230,0.45),transparent_50%)]" />
          <div className="relative flex h-full items-center justify-center px-8">
            <p className="text-center text-2xl font-medium text-balance text-white/90 sm:text-3xl">
              One ledger. One source of truth.
              <br />
              Every warehouse, every branch, every currency.
            </p>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Everything your supply chain needs. Nothing it doesn&apos;t.
        </h2>
        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title}>
              <h3 className="text-xl font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="solutions" className="border-t border-black/5 bg-white px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Ready to see Aivora in action?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[17px] text-muted">
          Create a free account and explore the platform — no credit card required.
        </p>
        <div className="mt-7">
          <Link
            href="/register"
            className="rounded-full bg-ink px-7 py-3 text-[15px] font-medium text-white transition hover:bg-ink/85"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  );
}
