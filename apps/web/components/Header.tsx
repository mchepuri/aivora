import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { Button } from '@/components/ui/Button';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

const navLinks = [
  { href: '#platform', label: 'Platform' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#about', label: 'About' },
];

export function Header() {
  return (
    <div className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[light-dark(rgba(255,255,255,0.7),rgba(30,30,30,0.7))] backdrop-blur-md">
      <TopNav
        label="Site navigation"
        heading={<TopNavHeading heading="Aivora" headingHref="/" />}
        startContent={navLinks.map((link) => (
          <TopNavItem key={link.href} label={link.label} href={link.href} />
        ))}
        endContent={
          <>
            <ThemeSwitcher />
            <Button variant="ghost" href="/login">
              Log in
            </Button>
            <Button variant="primary" href="/register">
              Sign up
            </Button>
          </>
        }
      />
    </div>
  );
}
