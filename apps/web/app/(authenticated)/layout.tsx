import Link from 'next/link';

const navLinks = [{ href: '/users', label: 'Users' }];

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-[17px] font-semibold tracking-tight text-ink">
            Aivora
          </Link>
          <nav className="flex items-center gap-6 text-[13px] text-ink/80">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-ink">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="transition hover:text-ink">
              Log out
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
