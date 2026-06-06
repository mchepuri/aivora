import Link from 'next/link';

const navLinks = [
  { href: '#platform', label: 'Platform' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#about', label: 'About' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-[19px] font-semibold tracking-tight text-ink">
          Aivora
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] text-ink/80 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-[13px]">
          <Link href="/login" className="text-ink/80 transition hover:text-ink">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-ink px-4 py-1.5 font-medium text-white transition hover:bg-ink/85"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
