'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import * as stylex from '@stylexjs/stylex';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Divider } from '@astryxdesign/core/Divider';
import { Text } from '@astryxdesign/core/Text';
import { logoutAction } from '@/app/(public)/login/actions';

const navLinks = [
  { href: '/inventory/units-of-measure', label: 'Units of Measure' },
  { href: '/inventory/items', label: 'Items' },
  { href: '/users', label: 'Users' },
];

// The avatar trigger button is icon-only + ghost, but should stay a full
// circle (matching the round Avatar inside it) rather than the theme's
// default 12px element radius.
const styles = stylex.create({
  round: { borderRadius: 'var(--radius-full)' },
  sectionLabel: { paddingInline: 'var(--spacing-3)', paddingBlock: 'var(--spacing-1)' },
});

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const navRef = useRef<HTMLElement>(null);

  // Publishes the nav's real rendered height as a CSS var so fixed-position
  // overlays (the AI chat side panel) can sit below it instead of covering
  // it — Astryx's TopNav sizes itself from content + padding, so there's no
  // single reliable constant to hard-code here.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--app-nav-height', `${entry.contentRect.height}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <TopNav
      ref={navRef}
      label="Main navigation"
      heading={<TopNavHeading heading="Aivora" headingHref="/dashboard" />}
      startContent={navLinks.map((link) => (
        <TopNavItem
          key={link.href}
          label={link.label}
          href={link.href}
          isSelected={pathname === link.href}
        />
      ))}
      endContent={
        <DropdownMenu
          button={{
            label: 'My account',
            isIconOnly: true,
            variant: 'ghost',
            icon: <Avatar name="U" size="small" />,
            xstyle: styles.round,
          }}
        >
          <Text type="supporting" color="secondary" xstyle={styles.sectionLabel}>
            My Account
          </Text>
          <DropdownMenuItem label="Profile" onClick={() => router.push('/profile')} />
          <DropdownMenuItem label="Settings" onClick={() => router.push('/settings')} />
          <Divider />
          <DropdownMenuItem
            label="Log out"
            className="text-danger"
            onClick={() => startTransition(() => { void logoutAction(); })}
          />
        </DropdownMenu>
      }
    />
  );
}
