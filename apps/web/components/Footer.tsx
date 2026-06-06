import Link from 'next/link';

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
    <footer className="border-t border-black/5 bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[12px] font-semibold text-ink">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-[12px] text-muted transition hover:text-ink">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-black/5 pt-6 text-[12px] text-muted md:flex-row md:items-center">
          <p>Copyright © {new Date().getFullYear()} Aivora Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="transition hover:text-ink">
              Privacy Policy
            </Link>
            <Link href="#" className="transition hover:text-ink">
              Terms of Use
            </Link>
            <Link href="#" className="transition hover:text-ink">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
