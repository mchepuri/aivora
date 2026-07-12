import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { Button } from '@/components/ui/Button';

const navLinks = [
  { href: '#platform', label: 'Platform' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#about', label: 'About' },
];

export function Header() {
  return (
    <div className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur-md">
      <TopNav
        label="Site navigation"
        heading={<TopNavHeading heading="Aivora" headingHref="/" />}
        startContent={navLinks.map((link) => (
          <TopNavItem key={link.href} label={link.label} href={link.href} />
        ))}
        endContent={
          <>
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
